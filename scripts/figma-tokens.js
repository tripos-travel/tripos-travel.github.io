#!/usr/bin/env node
'use strict';

/**
 * figma-tokens.js — zero-dependency normalizer that turns a raw Figma MCP
 * capture into design tokens (JSON + CSS custom properties) and a component
 * inventory mapped to Figma node IDs.
 *
 * The sibling of ada-scan.js / structure-scan.js: same CLI shape, same
 * finding/exit contract, wired into the same pre-commit and CI story.
 *
 * WHY THIS IS A SCRIPT AND NOT AN MCP CALL
 * ----------------------------------------
 * The Figma MCP connector only exists inside an agent session, and its call
 * budget is tied to the operator's Figma seat/plan — a View seat exhausts in a
 * handful of calls. So the pipeline is split in two:
 *
 *   1. CAPTURE (agent, `figma-page-build` Phase 01) — calls the Figma MCP tools
 *      once and writes every raw response to disk under a capture directory.
 *   2. NORMALIZE (this script, deterministic, offline) — reads that capture and
 *      emits tokens. Re-runnable forever at zero Figma calls.
 *
 * That split is the rate-limit defense: you pay Figma once, then iterate on the
 * token model and the build as many times as you like.
 *
 * CAPTURE DIRECTORY CONTRACT
 * --------------------------
 *   00-figma-capture/
 *     capture.json              # required — file key, node ids, seat, call ledger
 *     variables.json            # optional — raw get_variable_defs response
 *     metadata.json             # optional — raw get_metadata response (node tree)
 *     design-context/<node>.json# optional — raw get_design_context per node
 *     renders/<breakpoint>.png  # optional — full-page PNG export of the design
 *     assets/manifest.json      # optional — asset export hand-off ledger
 *                               #   (assets are ALSO harvested from the
 *                               #    design-context `assets` maps, so a
 *                               #    missing manifest never reads all-clear)
 *     tokens.lock.json          # written by --init-lock, edited by a human
 *
 * Every file except capture.json is optional and the normalizer degrades
 * gracefully — a file that binds no Figma variables yields no variables.json,
 * and the tokens are then read out of design context as raw values instead.
 *
 * The renders are worth supplying even though they're optional. Design context
 * tells you a hex exists somewhere in the file; a render tells you it covers
 * 14% of the page. That is the difference between a stray value in a nested
 * vector and the band color, and it is what lets this script confirm inferred
 * colors from evidence instead of queueing them for a human to eyeball.
 *
 * CONFIDENCE + CONFIRM-AND-LOCK
 * -----------------------------
 * Every token carries a `confidence`:
 *   "bound"    — came from a real Figma variable. Trustworthy, name and all.
 *   "inferred" — scraped out of design context / raw values. A real value, but
 *                nobody named it and nobody said it was a system token.
 *
 * `inferred` tokens must be confirmed by a human before a final build. That is
 * the lock file (`tokens.lock.json`): generate a skeleton with --init-lock, a
 * human edits names / drops noise / sets "confirmed": true, and `--check` fails
 * until every inferred token is resolved. Use it as a build gate.
 *
 * USAGE
 *   node scripts/figma-tokens.js --capture=<dir> [--out=<dir>]
 *   node scripts/figma-tokens.js --capture=<dir> --init-lock   # write lock skeleton
 *   node scripts/figma-tokens.js --capture=<dir> --check       # gate: exit 1 if unconfirmed
 *   node scripts/figma-tokens.js --capture=<dir> --json        # machine-readable
 *   node scripts/figma-tokens.js --capture=<dir> --quiet
 *
 * Exit code is 0 unless --check finds unconfirmed inferred tokens, the capture
 * is unreadable, or the call ledger records a hard failure (rate/seat limit).
 */

const fs = require('fs');
const path = require('path');

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */
const ROOT = path.resolve(__dirname, '..');

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw new Error(`could not parse ${path.relative(ROOT, file)}: ${err.message}`);
  }
}

function listFiles(dir, ext) {
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).sort().map((f) => path.join(dir, f));
  } catch { return []; }
}

/**
 * Figma variables are usually already namespaced by category ("Color/Brand/Deep",
 * "Spacing/md"), and the emitter adds its own category prefix — so without this
 * you get `--color-color-brand-deep`. Strip the redundant leading segment.
 */
const CATEGORY_PREFIXES = {
  color: ['color', 'colour', 'colors', 'colours', 'palette'],
  space: ['space', 'spacing', 'gap', 'pad', 'padding'],
  radius: ['radius', 'radii', 'corner', 'rounding'],
  'font-family': ['font', 'fonts', 'type', 'typography', 'family'],
  'font-size': ['font', 'size', 'text', 'type', 'fontsize'],
  'font-weight': ['font', 'weight', 'fontweight'],
  'line-height': ['line', 'leading', 'lineheight'],
};

function stripCategoryPrefix(name, category) {
  const prefixes = CATEGORY_PREFIXES[category] || [];
  let out = name;
  // Peel repeatedly: "font-font-heading" and "color-colors-brand" both happen.
  for (let i = 0; i < 3; i++) {
    const hit = prefixes.find((p) => out.startsWith(`${p}-`) && out.length > p.length + 1);
    if (!hit) break;
    out = out.slice(hit.length + 1);
  }
  return out || name;
}

function slug(str) {
  return String(str)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'token';
}

function uniqSorted(nums) {
  return [...new Set(nums.map(Number))].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
}

/* ------------------------------------------------------------------ *
 * Color normalization — everything lands as lowercase #rrggbb(aa)
 * ------------------------------------------------------------------ */
function clamp255(n) { return Math.max(0, Math.min(255, Math.round(n))); }

function toHex(input) {
  if (input == null) return null;

  // Figma API object form: { r: 0..1, g, b, a }
  if (typeof input === 'object') {
    const { r, g, b } = input;
    if ([r, g, b].every((c) => typeof c === 'number')) {
      const a = typeof input.a === 'number' ? input.a : 1;
      const hex = '#' + [r, g, b].map((c) => clamp255(c * 255).toString(16).padStart(2, '0')).join('');
      return a >= 1 ? hex : hex + clamp255(a * 255).toString(16).padStart(2, '0');
    }
    return null;
  }

  const s = String(input).trim().toLowerCase();

  const hex = s.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length === 6 || h.length === 8) return '#' + h;
    return null;
  }

  const rgb = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.%]+))?\s*\)$/);
  if (rgb) {
    const [, r, g, b, a] = rgb;
    let alpha = 1;
    if (a != null) alpha = a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a);
    const base = '#' + [r, g, b].map((c) => clamp255(parseFloat(c)).toString(16).padStart(2, '0')).join('');
    return alpha >= 1 ? base : base + clamp255(alpha * 255).toString(16).padStart(2, '0');
  }

  return null;
}

function luminance(hex) {
  const h = hex.slice(1, 7);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function saturation(hex) {
  const h = hex.slice(1, 7);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

/**
 * A descriptive fallback name for an unnamed color. Deliberately descriptive
 * ("ink", "surface", "accent-3") rather than semantic ("primary") — naming a
 * color "primary" is exactly the judgment call the confirm-and-lock step exists
 * to put in front of a human.
 */
function describeColor(hex, index) {
  const lum = luminance(hex);
  const sat = saturation(hex);
  if (sat < 0.12) {
    if (lum > 0.85) return 'surface';
    if (lum > 0.55) return 'surface-alt';
    if (lum > 0.22) return 'muted';
    return 'ink';
  }
  return `accent-${index}`;
}

/* ------------------------------------------------------------------ *
 * Token store
 * ------------------------------------------------------------------ */
/**
 * A token is keyed "<category>:<value>" so the same value found via a bound
 * variable and again in design context collapses to one entry (bound wins).
 */
function createStore() {
  const map = new Map();
  return {
    add(category, value, opts = {}) {
      if (value == null || value === '') return;
      const key = `${category}:${value}`;
      const prev = map.get(key);
      if (prev) {
        prev.uses += 1;
        if (opts.name && (!prev.name || (opts.confidence === 'bound' && prev.confidence !== 'bound'))) prev.name = opts.name;
        if (opts.confidence === 'bound') prev.confidence = 'bound';
        if (opts.where && !prev.where.includes(opts.where)) prev.where.push(opts.where);
        return;
      }
      map.set(key, {
        category,
        value,
        name: opts.name || null,
        confidence: opts.confidence || 'inferred',
        uses: 1,
        where: opts.where ? [opts.where] : [],
      });
    },
    all() { return [...map.values()]; },
    byCategory(category) { return this.all().filter((t) => t.category === category); },
  };
}

/* ------------------------------------------------------------------ *
 * Source 1 — bound Figma variables (get_variable_defs)
 * ------------------------------------------------------------------ */
/**
 * Accepts the two shapes the connector has been seen to return: a flat
 * { "Color/Brand/Primary": "#0056B3" } map, or an array of
 * { name, value / resolvedValue, resolvedType } records.
 */
/**
 * Figma type styles come back as a single composite string, not a scalar:
 *   "Font(family: \"DM Sans\", style: Light, size: 50, weight: 300, lineHeight: 55, letterSpacing: -2)"
 * Explode it into the individual tokens it actually contains, named after the
 * style ("H2" → --text-h2 / --weight-h2 / --leading-h2). The family is emitted
 * unnamed so several styles sharing one family collapse to a single token.
 */
function ingestFontComposite(rawName, value, store) {
  const inner = /^Font\((.*)\)$/s.exec(String(value).trim());
  if (!inner) return false;

  const field = (key) => {
    const m = new RegExp(`${key}\\s*:\\s*"?([^,")]+)"?`, 'i').exec(inner[1]);
    return m ? m[1].trim() : null;
  };

  const style = slug(stripCategoryPrefix(slug(String(rawName).replace(/\//g, '-')), 'font-size'));
  const where = 'variable';
  const opts = { name: style, confidence: 'bound', where };

  const family = field('family');
  const size = parseFloat(field('size'));
  const weight = parseFloat(field('weight'));
  const lineHeight = parseFloat(field('lineHeight'));

  if (family) store.add('font-family', family, { name: slug(family), confidence: 'bound', where });
  if (Number.isFinite(size)) store.add('font-size', size, opts);
  if (Number.isFinite(weight)) store.add('font-weight', weight, opts);
  if (Number.isFinite(lineHeight)) store.add('line-height', lineHeight, opts);
  return true;
}

function ingestVariables(raw, store) {
  if (!raw) return 0;
  const entries = Array.isArray(raw)
    ? raw.map((v) => [v.name || v.id, v.value !== undefined ? v.value : v.resolvedValue])
    : Object.entries(raw);

  let count = 0;
  for (const [rawName, rawValue] of entries) {
    if (rawValue == null || typeof rawValue === 'object' && !('r' in rawValue)) continue;
    const name = slug(String(rawName).replace(/\//g, '-'));
    const hex = toHex(rawValue);
    const where = 'variable';
    const named = (category) => ({ name: stripCategoryPrefix(name, category), confidence: 'bound', where });

    if (hex) { store.add('color', hex, named('color')); count++; continue; }
    if (ingestFontComposite(rawName, rawValue, store)) { count++; continue; }

    const str = String(rawValue).trim();
    const num = parseFloat(str);

    if (/^(font|type|text)/i.test(rawName) && /[a-z]/i.test(str) && !Number.isFinite(num)) {
      store.add('font-family', str, named('font-family')); count++; continue;
    }
    if (Number.isFinite(num)) {
      if (/radius|corner|round/i.test(rawName)) { store.add('radius', num, named('radius')); count++; continue; }
      if (/space|spacing|gap|pad|margin/i.test(rawName)) { store.add('space', num, named('space')); count++; continue; }
      if (/weight/i.test(rawName)) { store.add('font-weight', num, named('font-weight')); count++; continue; }
      if (/line|leading/i.test(rawName)) { store.add('line-height', num, named('line-height')); count++; continue; }
      if (/size|scale|font/i.test(rawName)) { store.add('font-size', num, named('font-size')); count++; continue; }
    }
  }
  return count;
}

/* ------------------------------------------------------------------ *
 * Source 2 — design context (get_design_context)
 * ------------------------------------------------------------------ *
 * Files that don't bind variables return raw values only, so the tokens have
 * to be read out of the generated code/CSS. The response shape has changed
 * across connector versions, so rather than walking a schema we stringify the
 * whole payload and scan it. Ugly, deliberately robust.
 */
const SCAN = [
  { category: 'color', re: /#[0-9a-fA-F]{3,8}\b/g, map: (m) => toHex(m) },
  { category: 'color', re: /rgba?\([^)]{5,60}\)/g, map: (m) => toHex(m) },
  { category: 'font-family', re: /font-family\s*:\s*([^;}"']+)/gi, map: (m, g) => cleanFontStack(g) },
  { category: 'font-family', re: /"fontFamily"\s*:\s*"([^"]+)"/g, map: (m, g) => cleanFontStack(g) },
  { category: 'font-size', re: /font-size\s*:\s*([\d.]+)px/gi, map: (m, g) => parseFloat(g) },
  { category: 'font-size', re: /"fontSize"\s*:\s*([\d.]+)/g, map: (m, g) => parseFloat(g) },
  { category: 'font-weight', re: /font-weight\s*:\s*(\d{3})/gi, map: (m, g) => parseInt(g, 10) },
  { category: 'font-weight', re: /"fontWeight"\s*:\s*"?(\d{3})"?/g, map: (m, g) => parseInt(g, 10) },
  { category: 'line-height', re: /line-height\s*:\s*([\d.]+)px/gi, map: (m, g) => parseFloat(g) },
  { category: 'radius', re: /border-radius\s*:\s*([\d.]+)px/gi, map: (m, g) => parseFloat(g) },
  { category: 'radius', re: /"cornerRadius"\s*:\s*([\d.]+)/g, map: (m, g) => parseFloat(g) },
  { category: 'space', re: /(?:padding|margin|gap|row-gap|column-gap)[a-z-]*\s*:\s*([^;}]+)/gi, map: null },
  { category: 'space', re: /"(?:itemSpacing|padding(?:Left|Right|Top|Bottom))"\s*:\s*([\d.]+)/g, map: (m, g) => parseFloat(g) },

  // get_design_context returns React + TAILWIND, not CSS. Arbitrary values
  // carry the real numbers, so scan those too. NOTE: only padding/gap/margin
  // count as spacing — left-[100px] / top-[87px] / w-[1440px] are absolute
  // positions in a comp and would flood the scale with one-off junk.
  { category: 'color', re: /(?:bg|text|border|from|to|via|fill|stroke)-\[(#[0-9a-fA-F]{3,8})\]/g, map: (m, g) => toHex(g) },
  { category: 'color', re: /\b(?:bg|text|border)-(white|black)\b/g, map: (m, g) => (g === 'white' ? '#ffffff' : '#000000') },
  { category: 'radius', re: /rounded(?:-[a-z]+)?-\[([\d.]+)px\]/g, map: (m, g) => parseFloat(g) },
  { category: 'radius', re: /\brounded-(none|full)\b/g, map: (m, g) => (g === 'none' ? 0 : 9999) },
  { category: 'font-size', re: /\btext-\[([\d.]+)px\]/g, map: (m, g) => parseFloat(g) },
  { category: 'line-height', re: /\bleading-\[([\d.]+)px\]/g, map: (m, g) => parseFloat(g) },
  { category: 'font-family', re: /font-\['([A-Za-z0-9_ -]+?)(?::[A-Za-z]+)?'\]/g, map: (m, g) => cleanFontStack(g.replace(/_/g, ' ')) },
  { category: 'font-weight', re: /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g,
    map: (m, g) => TW_WEIGHTS[g] },
  { category: 'space', re: /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-\[([\d.]+)px\]/g,
    map: (m, g) => parseFloat(g) },
];

const TW_WEIGHTS = {
  thin: 100, extralight: 200, light: 300, normal: 400,
  medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900,
};

function cleanFontStack(stack) {
  const first = String(stack).split(',')[0].trim().replace(/^["']|["']$/g, '');
  return /^[a-z0-9 _-]{2,40}$/i.test(first) ? first : null;
}

function ingestDesignContext(payload, where, store) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);

  for (const rule of SCAN) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text)) !== null) {
      if (rule.category === 'space' && !rule.map) {
        // A shorthand like "16px 24px" is several spacing steps at once.
        for (const px of String(m[1]).matchAll(/([\d.]+)px/g)) {
          const n = parseFloat(px[1]);
          if (n > 0 && n <= 400) store.add('space', n, { where });
        }
        continue;
      }
      const value = rule.map(m[0], m[1]);
      if (value == null) continue;
      if (rule.category === 'font-size' && (value < 8 || value > 200)) continue;
      if (rule.category === 'radius' && value > 400) continue;
      store.add(rule.category, value, { where });
    }
  }
}

/* ------------------------------------------------------------------ *
 * Source 3 — node metadata (get_metadata) → component inventory + breakpoints
 * ------------------------------------------------------------------ */
function walkNodes(node, out, depth = 0, parent = null) {
  if (!node || typeof node !== 'object') return out;
  const id = node.id || node.nodeId;
  const name = node.name;
  if (id && name) {
    const box = node.absoluteBoundingBox || node.boundingBox || {};
    out.push({
      id,
      name,
      type: node.type || node.nodeType || 'NODE',
      x: box.x != null ? Number(box.x) : null,
      y: box.y != null ? Number(box.y) : null,
      width: Number(box.width) || Number(node.width) || null,
      height: Number(box.height) || Number(node.height) || null,
      hidden: node.hidden === true || node.visible === false,
      depth,
      parent,
    });
  }
  const kids = node.children || node.nodes || [];
  const list = Array.isArray(kids) ? kids : Object.values(kids);
  for (const kid of list) walkNodes(kid, out, depth + 1, id || parent);
  return out;
}

function collectNodes(metadata) {
  if (!metadata) return [];
  const roots = Array.isArray(metadata) ? metadata
    : metadata.document ? [metadata.document]
    : metadata.nodes ? Object.values(metadata.nodes).map((n) => n.document || n)
    : [metadata];
  const out = [];
  for (const root of roots) walkNodes(root, out);
  return out;
}

/**
 * Design width and breakpoints, read from FULL-BLEED BAND widths.
 *
 * The naive version of this — "every top-level frame wider than 320px" —
 * returned 22 breakpoints on a real file, because a flat comp is full of wide,
 * short section frames. What actually identifies a board width is the width
 * that repeats across elements pinned to x=0: headers, footers, background
 * bands. A file with a 1440 board and a 390 board shows two such widths.
 *
 * Still `inferred`: a band width is a canvas decision, not a declared
 * breakpoint, so it goes through confirm-and-lock like any other guess.
 */
function inferLayout(nodes) {
  const counts = new Map();
  for (const n of nodes) {
    if (!n.width || n.width < 320 || n.width > 2560) continue;
    if (n.x == null || n.x > 2) continue; // pinned to the left edge = full-bleed
    const w = Math.round(n.width);
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  if (!counts.size) return { designWidth: null, breakpoints: [] };

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const designWidth = ranked[0][0];
  // Keep widths that repeat AND are no wider than the design itself. A width
  // above the design width is a stray oversized element or the outer review
  // board, never a breakpoint — the widest layout IS the design width.
  const breakpoints = uniqSorted(
    ranked.filter(([w, n]) => n >= 2 && w <= designWidth).map(([w]) => w)
  );
  return { designWidth, breakpoints: breakpoints.length ? breakpoints : [designWidth] };
}

/* ------------------------------------------------------------------ *
 * Source 5 — geometry, for comps with no auto-layout
 * ------------------------------------------------------------------ *
 * A designer who positions everything absolutely leaves no spacing scale to
 * read: no padding, no gap, no itemSpacing. The first real file we ran was
 * exactly this, and spacing extraction returned zero.
 *
 * But the rhythm is still THERE, just implied — four cards sitting 17px apart
 * are telling you the gutter even though nothing declares it. So measure the
 * gaps between siblings and recover the scale from geometry.
 *
 * Everything this produces is `inferred` and goes through confirm-and-lock. It
 * is a reading of the design, not a declaration by it, and the difference
 * matters: a one-off 37px gap between two unrelated boxes is not a token.
 */

/** Snap to a 2px grid — comps are full of half-pixel drift. */
function snap2(v) { return Math.round(v / 2) * 2; }

function overlaps(aStart, aEnd, bStart, bEnd, minRatio = 0.5) {
  const overlap = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
  return overlap > minRatio * Math.min(aEnd - aStart, bEnd - bStart);
}

/**
 * Gaps between adjacent siblings, horizontally (same row) and vertically
 * (same column). Full-bleed bands are excluded — the space beside a
 * background rectangle is not a gutter.
 */
function deriveSpacing(nodes, designWidth, store) {
  const usable = nodes.filter((n) =>
    !n.hidden && n.x != null && n.y != null && n.width > 0 && n.height > 0 &&
    n.depth >= 1 && n.depth <= 3 &&
    (!designWidth || (n.x < designWidth && n.width < designWidth * 0.95)));

  const byParent = new Map();
  for (const n of usable) {
    const key = n.parent || 'root';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(n);
  }

  let found = 0;
  const record = (gap) => {
    const v = snap2(gap);
    if (v <= 0 || v > 320) return;
    store.add('space', v, { where: 'geometry' });
    found++;
  };

  for (const sibs of byParent.values()) {
    if (sibs.length < 2) continue;

    const row = [...sibs].sort((a, b) => a.x - b.x);
    for (let i = 0; i < row.length - 1; i++) {
      const a = row[i], b = row[i + 1];
      if (overlaps(a.y, a.y + a.height, b.y, b.y + b.height)) record(b.x - (a.x + a.width));
    }

    const col = [...sibs].sort((a, b) => a.y - b.y);
    for (let i = 0; i < col.length - 1; i++) {
      const a = col[i], b = col[i + 1];
      if (overlaps(a.x, a.x + a.width, b.x, b.x + b.width)) record(b.y - (a.y + a.height));
    }
  }
  return found;
}

/**
 * Page gutter and container width, from where content actually starts.
 * The modal left edge of on-canvas content IS the gutter; the container is
 * what's left of the design width once both gutters are removed.
 */
function deriveContainer(nodes, designWidth) {
  if (!designWidth) return null;
  const counts = new Map();
  for (const n of nodes) {
    if (n.hidden || n.x == null || !n.width) continue;
    if (n.depth < 1 || n.depth > 3) continue;
    if (n.x <= 0 || n.x > designWidth * 0.5) continue;
    if (n.width > designWidth * 0.95) continue;
    const edge = Math.round(n.x / 4) * 4; // gutters are round numbers
    counts.set(edge, (counts.get(edge) || 0) + 1);
  }
  if (!counts.size) return null;
  const [gutter, uses] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  if (uses < 3) return null; // one indented box is not a page gutter
  return { gutter, container: designWidth - gutter * 2, uses };
}

/* ------------------------------------------------------------------ *
 * Copy audit — placeholder text, and the override that replaces it
 * ------------------------------------------------------------------ *
 * Figma names text layers after their content, so the node tree carries the
 * real copy. It also carries the copy that ISN'T real yet. A comp in review
 * routinely ships with lorem ipsum in the slots nobody has written, and the
 * one rule the playbook will not bend on is that invented copy never reaches
 * a page.
 *
 * So: build anyway, but never silently. Every placeholder is reported here and
 * marked in the output, and a copy-overrides.json lets real copy — from a doc,
 * a CMS, wherever it actually lives — win over the comp.
 */
const PLACEHOLDER_RE = /(lorem\s+ipsum|dolor\s+sit\s+amet|consectetur\s+adipiscing|\blipsum\b|\bplaceholder\b|\bTBD\b|\bTK\b|\bxxx+\b)/i;

function auditCopy(nodes, designWidth, overrides) {
  const text = nodes.filter((n) =>
    /^TEXT$/i.test(n.type) && !n.hidden &&
    (!designWidth || (n.x != null && n.x < designWidth)));

  const map = overrides || {};
  const rows = text.map((n) => ({
    id: n.id,
    copy: n.name,
    placeholder: PLACEHOLDER_RE.test(n.name),
    overridden: Object.prototype.hasOwnProperty.call(map, n.id),
  }));

  return {
    total: rows.length,
    placeholders: rows.filter((r) => r.placeholder),
    unresolved: rows.filter((r) => r.placeholder && !r.overridden),
    overrides: rows.filter((r) => r.overridden),
    rows,
  };
}

function emitCopyReport(audit, meta) {
  const line = (r) => `| \`${r.id}\` | ${r.overridden ? '✅ overridden' : '⚠️ placeholder'} | ${String(r.copy).replace(/\|/g, '\\|').slice(0, 120)} |`;
  return [
    '# Copy Report',
    '',
    'Figma names text layers after their content, so this is the real copy the build',
    'draws from — and the placeholder copy it must never ship silently.',
    '',
    `- **File:** ${meta.fileKey || '(unknown)'}`,
    `- **Text nodes on canvas:** ${audit.total}`,
    `- **Placeholder:** ${audit.placeholders.length} · **overridden:** ${audit.overrides.length} · **unresolved:** ${audit.unresolved.length}`,
    '',
    '## Placeholder copy',
    '',
    ...(audit.placeholders.length
      ? ['| Node ID | Status | Text in the comp |', '|---|---|---|', ...audit.placeholders.map(line), '',
         'Unresolved placeholders are built as-is and **marked visibly in the page**, never',
         'passed off as real copy. Supply the real text to clear them (below).']
      : ['_None — every text node carries real copy._']),
    '',
    '## Supplying real copy',
    '',
    'Real copy usually lives somewhere other than the comp. Put it in',
    '`00-figma-capture/copy-overrides.json` as a node-id map and it wins over Figma:',
    '',
    '```json',
    '{',
    '  "1429:2015": "The headline as it will actually ship",',
    '  "I1429:2135;1055:5640": "The Latest: our real announcement"',
    '}',
    '```',
    '',
    'An override is applied verbatim. This is the only sanctioned way to put text on a',
    'page that is not in the design — writing it yourself is not.',
    '',
  ].join('\n');
}

/**
 * A node worth listing as a component: named, boxy, visible, on-canvas, and not
 * a raw glyph.
 *
 * The on-canvas test matters more than it sounds. A review board is commonly
 * WIDER than the design it contains — the extra margin holds sticky notes and
 * annotations. Those nodes are real, named, and boxy, and none of them are
 * build targets. Anything starting at or beyond the design width is comment
 * furniture, not the page.
 */
function isComponentish(node, designWidth) {
  if (/^(TEXT|VECTOR|LINE|ELLIPSE|RECTANGLE|BOOLEAN_OPERATION)$/i.test(node.type)) return false;
  if (node.depth > 4) return false;
  if (node.hidden) return false;
  if (designWidth && node.x != null && node.x >= designWidth) return false;
  return Boolean(node.width && node.height);
}

/* ------------------------------------------------------------------ *
 * Source 4 — page renders (PNG) as visual ground truth
 * ------------------------------------------------------------------ *
 * A full-page PNG export of the design is the cheapest, most reliable evidence
 * we get. Design context tells you a hex exists somewhere; the render tells you
 * that hex covers 14% of the page, which is the difference between "a stray
 * value in a nested vector" and "the band color".
 *
 * So renders do two jobs here:
 *   1. Corroborate inferred color tokens with real pixel coverage — a token
 *      the render actually shows gets promoted from `inferred` to `verified`
 *      and no longer needs a human to eyeball it in confirm-and-lock.
 *   2. Surface dominant colors the capture missed entirely (common when assets
 *      or effects didn't come through the connector).
 *
 * PNG decoding lives in scripts/lib/png.js — zero-dependency, on top of node's
 * own zlib, supporting the only thing Figma actually exports: non-interlaced,
 * 8-bit, gray/RGB/RGBA.
 */
const { decodePNG, dominantColors } = require('./lib/png');

/** Dominant colors in a render, as [{ hex, coverage }] sorted by coverage. */
function sampleRender(file) {
  const img = decodePNG(file);
  return {
    file: path.basename(file),
    width: img.width,
    height: img.height,
    colors: dominantColors(img),
  };
}

/**
 * Cross-reference the token set against the renders.
 * A color token the render actually shows is evidence-backed, so it graduates
 * out of the confirm-and-lock queue. Everything else still needs a human.
 */
const RENDER_CONFIRM_COVERAGE = 0.002; // 0.2% of sampled pixels
const RENDER_CANDIDATE_COVERAGE = 0.01; // a color big enough that missing it is a bug

function corroborateWithRenders(store, renders) {
  if (!renders.length) return { verified: 0, candidates: [] };

  const seen = new Map(); // hex -> best coverage across renders
  for (const r of renders) {
    for (const { hex, coverage } of r.colors) {
      if (!seen.has(hex) || seen.get(hex).coverage < coverage) seen.set(hex, { coverage, file: r.file });
    }
  }

  let verified = 0;
  const tokenHexes = new Set();
  for (const token of store.byCategory('color')) {
    const hex = String(token.value).slice(0, 7);
    tokenHexes.add(hex);
    const hit = seen.get(hex);
    if (hit && hit.coverage >= RENDER_CONFIRM_COVERAGE) {
      token.evidence = { render: hit.file, coverage: Number(hit.coverage.toFixed(4)) };
      if (token.confidence === 'inferred') { token.confidence = 'verified'; verified++; }
    }
  }

  const candidates = [...seen.entries()]
    .filter(([hex, hit]) => !tokenHexes.has(hex) && hit.coverage >= RENDER_CANDIDATE_COVERAGE)
    .map(([hex, hit]) => ({ hex, coverage: Number(hit.coverage.toFixed(4)), render: hit.file }))
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, 12);

  return { verified, candidates };
}

/* ------------------------------------------------------------------ *
 * Scale naming — t-shirt names, matching the house style in shared/system.css
 * ------------------------------------------------------------------ */
const DOWN = ['sm', 'xs', '2xs', '3xs', '4xs'];
const UP = ['lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'];

function tshirtScale(values, baseValue) {
  const sorted = uniqSorted(values);
  if (!sorted.length) return new Map();
  let baseIdx = 0, best = Infinity;
  sorted.forEach((v, i) => {
    const d = Math.abs(v - baseValue);
    if (d < best) { best = d; baseIdx = i; }
  });
  const names = new Map();
  sorted.forEach((v, i) => {
    const step = i - baseIdx;
    if (step === 0) names.set(v, 'base');
    else if (step < 0) names.set(v, DOWN[-step - 1] || `min-${Math.abs(step)}`);
    else names.set(v, UP[step - 1] || `max-${step}`);
  });
  return names;
}

const WEIGHT_NAMES = {
  100: 'thin', 200: 'extralight', 300: 'light', 400: 'regular',
  500: 'medium', 600: 'semibold', 700: 'bold', 800: 'extrabold', 900: 'black',
};

function radiusName(value, index, all) {
  if (value === 0) return 'none';
  if (value >= 500) return 'full';
  const scale = tshirtScale(all.filter((v) => v > 0 && v < 500), 8);
  return scale.get(value) || `r-${value}`;
}

function breakpointName(width) {
  if (width < 480) return 'mobile';
  if (width < 840) return 'tablet';
  if (width < 1280) return 'desktop';
  return 'wide';
}

/**
 * Spacing captured from design context is noisy — every one-off padding in the
 * file shows up. Snap to a 2px grid, then keep the steps that actually repeat
 * (or the biggest handful), so the emitted scale is a system rather than a log.
 */
function distillSpacing(tokens) {
  const byValue = new Map();
  for (const t of tokens) {
    const snapped = Math.round(Number(t.value) / 2) * 2;
    if (snapped <= 0 || snapped > 320) continue;
    const prev = byValue.get(snapped);
    if (prev) {
      prev.uses += t.uses;
      if (t.confidence === 'bound') { prev.confidence = 'bound'; prev.name = t.name || prev.name; }
    } else {
      byValue.set(snapped, { ...t, value: snapped });
    }
  }
  const all = [...byValue.values()];
  const repeated = all.filter((t) => t.confidence === 'bound' || t.uses >= 2);
  const pool = (repeated.length >= 4 ? repeated : all).sort((a, b) => b.uses - a.uses);

  // Cluster near-neighbours. Geometry-derived spacing arrives as a LOG, not a
  // system — 30 and 32 and 36 and 38 are one step measured four times, because
  // a hand-positioned comp never lands on exact multiples. Collapse each group
  // onto its most-used member so the human confirming this reviews a scale
  // rather than a transcript. Bound values are never absorbed: a designer who
  // declared a variable meant that exact number.
  const kept = [];
  for (const t of pool) {
    const near = kept.find((k) =>
      k.confidence !== 'bound' && t.confidence !== 'bound' &&
      Math.abs(k.value - t.value) <= Math.max(2, k.value * 0.08));
    if (near) { near.uses += t.uses; continue; }
    kept.push({ ...t });
  }
  return kept.slice(0, 12).sort((a, b) => a.value - b.value);
}

/* ------------------------------------------------------------------ *
 * Confirm-and-lock
 * ------------------------------------------------------------------ */
function tokenKey(token) { return `${token.category}:${token.value}`; }

function applyLock(tokens, lock) {
  const entries = (lock && lock.tokens) || {};
  const kept = [];
  for (const token of tokens) {
    const entry = entries[tokenKey(token)];
    if (entry && entry.drop) continue;
    if (entry) {
      if (entry.name) token.name = slug(entry.name);
      if (entry.confirmed) token.confirmed = true;
      if (entry.note) token.note = entry.note;
    }
    kept.push(token);
  }
  return kept;
}

/** Inferred tokens still awaiting a human. `bound` and `verified` don't queue. */
function unconfirmed(tokens) {
  return tokens.filter((t) => t.confidence === 'inferred' && !t.confirmed);
}

function buildLockSkeleton(tokens, existing) {
  const prev = (existing && existing.tokens) || {};
  const out = {
    _README: 'Confirm-and-lock gate. Review each entry, rename it to what the design system actually calls it, set drop:true for noise, then set confirmed:true. `npm run figma:check` fails while any inferred token is unconfirmed. Tokens marked bound (real Figma variable) or verified (corroborated by pixel coverage in a render) are listed for reference and need no action.',
    lockedAt: null,
    confirmedBy: null,
    tokens: {},
  };
  for (const token of tokens) {
    const key = tokenKey(token);
    out.tokens[key] = prev[key] || {
      name: token.name || null,
      confidence: token.confidence,
      uses: token.uses,
      confirmed: token.confidence !== 'inferred',
      drop: false,
      note: token.evidence ? `seen in ${token.evidence.render} (${(token.evidence.coverage * 100).toFixed(1)}% of pixels)` : '',
    };
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Assemble the token model
 * ------------------------------------------------------------------ */
function buildModel(tokens, nodes, renders) {
  const colorTokens = tokens.filter((t) => t.category === 'color')
    .sort((a, b) => (b.evidence?.coverage || 0) - (a.evidence?.coverage || 0) || b.uses - a.uses);

  let accent = 0;
  const colors = colorTokens.map((t) => {
    const hex = String(t.value);
    const name = t.name || describeColor(hex.slice(0, 7), ++accent);
    return {
      name, value: hex, cssVar: `--color-${name}`,
      confidence: t.confidence, uses: t.uses,
      ...(t.evidence ? { evidence: t.evidence } : {}),
      ...(t.note ? { note: t.note } : {}),
    };
  });
  dedupeNames(colors);

  const families = tokens.filter((t) => t.category === 'font-family')
    .sort((a, b) => b.uses - a.uses)
    .map((t) => ({ name: t.name || slug(t.value), value: String(t.value), cssVar: `--font-${t.name || slug(t.value)}`, confidence: t.confidence, uses: t.uses }));
  dedupeNames(families);

  const sizeTokens = tokens.filter((t) => t.category === 'font-size');
  const sizeNames = tshirtScale(sizeTokens.map((t) => t.value), 16);
  const sizes = uniqSorted(sizeTokens.map((t) => t.value)).map((v) => {
    const t = sizeTokens.find((x) => Number(x.value) === v);
    const name = t.name || sizeNames.get(v);
    return { name, value: `${v}px`, cssVar: `--text-${name}`, confidence: t.confidence, uses: t.uses };
  });

  const weightTokens = tokens.filter((t) => t.category === 'font-weight');
  const weights = uniqSorted(weightTokens.map((t) => t.value)).map((v) => {
    const t = weightTokens.find((x) => Number(x.value) === v);
    const name = t.name || WEIGHT_NAMES[v] || `w-${v}`;
    return { name, value: String(v), cssVar: `--weight-${name}`, confidence: t.confidence, uses: t.uses };
  });

  const lhTokens = tokens.filter((t) => t.category === 'line-height');
  const lhNames = tshirtScale(lhTokens.map((t) => t.value), 24);
  const lineHeights = uniqSorted(lhTokens.map((t) => t.value)).map((v) => {
    const t = lhTokens.find((x) => Number(x.value) === v);
    const name = t.name || lhNames.get(v);
    return { name, value: `${v}px`, cssVar: `--leading-${name}`, confidence: t.confidence, uses: t.uses };
  });

  const spaceTokens = distillSpacing(tokens.filter((t) => t.category === 'space'));
  const spaceNames = tshirtScale(spaceTokens.map((t) => t.value), 16);
  const spacing = spaceTokens.map((t) => {
    const name = t.name || spaceNames.get(Number(t.value));
    return { name, value: `${t.value}px`, cssVar: `--space-${name}`, confidence: t.confidence, uses: t.uses };
  });

  const radiusTokens = tokens.filter((t) => t.category === 'radius');
  const radiusValues = uniqSorted(radiusTokens.map((t) => t.value));
  const radii = radiusValues.map((v, i) => {
    const t = radiusTokens.find((x) => Number(x.value) === v);
    const name = t.name || radiusName(v, i, radiusValues);
    return { name, value: v >= 500 ? '9999px' : `${v}px`, cssVar: `--radius-${name}`, confidence: t.confidence, uses: t.uses };
  });
  dedupeNames(radii);

  const { breakpoints: bpWidths } = inferLayout(nodes);
  const layout = tokens.filter((t) => t.category === 'layout')
    .sort((a, b) => Number(b.value) - Number(a.value))
    .map((t) => ({
      name: t.name || 'layout', value: `${t.value}px`, cssVar: `--${t.name || 'layout'}`,
      confidence: t.confidence, uses: t.uses,
    }));
  dedupeNames(layout);

  const breakpoints = bpWidths.map((w) => ({
    name: breakpointName(w), value: `${w}px`, cssVar: `--bp-${breakpointName(w)}`, confidence: 'inferred', uses: 1,
  }));
  dedupeNames(breakpoints);

  return {
    colors,
    typography: { families, sizes, weights, lineHeights },
    spacing,
    radii,
    layout,
    breakpoints,
    renders: renders.map((r) => ({ file: r.file, width: r.width, height: r.height })),
  };
}

/** Two unnamed accents can collide; make CSS var names unique and stable. */
function dedupeNames(list) {
  const seen = new Map();
  for (const item of list) {
    const base = item.name;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    if (n > 1) {
      item.name = `${base}-${n}`;
      item.cssVar = item.cssVar.replace(/[^-]+$/, item.name);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Emitters
 * ------------------------------------------------------------------ */
function emitCSS(model, meta) {
  const pending = meta.unconfirmedCount;
  const lines = [
    '/*',
    ' * tokens.css — generated by scripts/figma-tokens.js. Do not hand-edit.',
    ` * Source: Figma ${meta.fileKey || '(unknown file)'}${meta.nodeIds?.length ? ` · nodes ${meta.nodeIds.join(', ')}` : ''}`,
    ` * Captured: ${meta.capturedAt || 'unknown'} · Normalized: ${meta.generatedAt}`,
    ` * Confidence: ${meta.counts.bound} bound · ${meta.counts.verified} verified against renders · ${meta.counts.inferred} inferred`,
    pending
      ? ` * WARNING: ${pending} inferred token${pending === 1 ? '' : 's'} not yet confirmed — this file is NOT build-ready.`
      : ' * All inferred tokens confirmed via tokens.lock.json — build-ready.',
    ' */',
    '',
    ':root {',
  ];

  const section = (title, items) => {
    if (!items.length) return;
    lines.push(`  /* ${title} */`);
    for (const item of items) {
      const flag = item.confidence === 'bound' ? '' : item.confidence === 'verified' ? ' /* verified */' : ' /* inferred */';
      lines.push(`  ${item.cssVar}: ${item.value};${flag}`);
    }
    lines.push('');
  };

  section('Color', model.colors);
  section('Type — family', model.typography.families);
  section('Type — size', model.typography.sizes);
  section('Type — weight', model.typography.weights);
  section('Type — line height', model.typography.lineHeights);
  section('Spacing', model.spacing);
  section('Radius', model.radii);
  section('Layout — page container (derived from where content starts)', model.layout);
  section('Breakpoints (reference only — media queries can not read a custom property)', model.breakpoints);

  while (lines[lines.length - 1] === '') lines.pop();
  lines.push('}', '');
  return lines.join('\n');
}

function emitInventory(nodes, meta) {
  const components = nodes.filter((n) => isComponentish(n, meta.designWidth));
  const rows = components.map((n) =>
    `| \`${n.id}\` | ${n.name.replace(/\|/g, '\\|')} | ${n.type} | ${n.width ? `${Math.round(n.width)}×${Math.round(n.height)}` : '—'} | ${n.depth} |`);

  return [
    '# Component Inventory',
    '',
    `Generated by \`scripts/figma-tokens.js\` from the Figma capture. Every row maps a build target to the Figma node it came from, so a reviewer can open the exact node.`,
    '',
    `- **File:** ${meta.fileKey || '(unknown)'}`,
    `- **Captured:** ${meta.capturedAt || 'unknown'}`,
    `- **Design width:** ${meta.designWidth ? `${meta.designWidth}px` : 'unknown'}`,
    `- **Nodes walked:** ${nodes.length} · **listed as components:** ${components.length}` +
      (meta.designWidth ? ` · **excluded as off-canvas annotation:** ${nodes.filter((n) => n.x != null && n.x >= meta.designWidth).length}` : ''),
    '',
    '| Node ID | Name | Type | Size | Depth |',
    '|---|---|---|---|---|',
    ...(rows.length ? rows : ['| — | _no metadata captured_ | — | — | — |']),
    '',
    '## How to read this',
    '',
    'Depth 0–1 are boards/sections; 2–3 are the components that usually map to a build',
    'component; anything deeper is normally an internal part. Text and vector nodes are',
    'omitted — they are content and iconography, not build targets.',
    '',
  ].join('\n');
}

/**
 * Assets the connector actually reported.
 *
 * `get_design_context` returns an `assets` map (constant name -> Figma CDN URL)
 * for every image and vector it could not inline. Those URLs expire in ~7 days
 * and figma.com is unreachable from a sandboxed shell, so each one is a file a
 * human has to export by hand — which is precisely what this ledger exists to
 * track.
 *
 * Reading only `assets/manifest.json` meant a capture with no manifest reported
 * "every asset is accounted for" while the design context sat there listing a
 * logo, two compliance badges and a set of social icons. A ledger whose job is
 * to flag what is missing must not default to all-clear.
 */
function harvestContextAssets(captureDir) {
  const out = [];
  for (const file of listFiles(path.join(captureDir, 'design-context'), '.json')) {
    const payload = readJSON(file);
    if (!payload || !payload.assets) continue;
    const code = typeof payload.code === 'string' ? payload.code : '';
    for (const [key, url] of Object.entries(payload.assets)) {
      if (!url) continue;
      out.push({
        name: assetLabel(code, key),
        key,
        nodeId: payload.nodeId || path.basename(file, '.json'),
        url,
        ext: /\.(\w+)(?:\?|$)/.test(url) ? RegExp.$1 : 'webp',
        source: 'design-context',
      });
    }
  }
  return out;
}

/**
 * Figma names the code constant `imgSoc2Badge2`, which tells an exporter
 * nothing. The layer name is carried on the nearest enclosing `data-name`, so
 * prefer that and fall back to the constant.
 */
function assetLabel(code, key) {
  const at = code.indexOf(`src="${key}"`);
  if (at === -1) return key;
  const before = code.slice(0, at);
  const names = (before.match(/data-name="([^"]+)"/g) || [])
    .map((m) => m.slice(11, -1));
  if (!names.length) return key;
  // Walk outwards from the image and take the first name that actually
  // identifies the asset. Figma wraps art in generic containers, so the
  // nearest name is routinely "Group" or "Mask group".
  for (let i = names.length - 1; i >= 0; i -= 1) {
    if (!GENERIC_LAYER_NAMES.has(names[i])) return names[i];
  }
  return names[names.length - 1];
}

const GENERIC_LAYER_NAMES = new Set([
  'Group', 'Clip path group', 'Mask group', 'contents', 'Frame', 'Rectangle',
]);

/**
 * Manifest entries win: if a human has already exported an asset, that record
 * carries the export path. Context-harvested entries fill in everything the
 * manifest does not mention, deduped by URL and then by label.
 */
function mergeAssetSources(manifest, harvested) {
  const list = Array.isArray(manifest) ? manifest.slice()
    : (manifest && manifest.assets) ? manifest.assets.slice() : [];
  // A URL is the asset's identity: the same file referenced from four places is
  // one export. A *label* is not identity — Figma hands out "Vector" and
  // "Main Navigation" repeatedly — so deduping on it loses real assets.
  // Dedupe on URL, then make any repeated label unique so the ledger stays
  // actionable for whoever does the exporting.
  const seenUrl = new Set();
  const seenLabel = new Set();
  const labelKey = (a) => `${a.nodeId || ''}:${a.name || ''}`;
  for (const a of list) {
    if (a.url) seenUrl.add(a.url);
    seenLabel.add(labelKey(a));
  }
  for (const a of harvested) {
    if (a.url && seenUrl.has(a.url)) continue;
    if (a.url) seenUrl.add(a.url);
    const entry = { ...a };
    if (seenLabel.has(labelKey(entry))) {
      entry.name = `${entry.name} (${a.key || a.name})`;
    }
    seenLabel.add(labelKey(entry));
    list.push(entry);
  }
  return list;
}

function emitAssetHandoff(assets, meta) {
  const list = Array.isArray(assets) ? assets : (assets && assets.assets) || [];
  const missing = list.filter((a) => a.status !== 'provided' && !a.exportPath);
  const provided = list.filter((a) => a.status === 'provided' || a.exportPath);

  return [
    '# Asset Hand-off',
    '',
    'Image bytes can not be pulled through the Figma MCP connector in a sandboxed',
    'environment, so assets are exported by hand from Figma and dropped into the build.',
    'This file is the ledger of what arrived and what is still outstanding.',
    '',
    `- **File:** ${meta.fileKey || '(unknown)'}`,
    `- **Provided:** ${provided.length} · **Outstanding:** ${missing.length}`,
    '',
    '## Provided',
    '',
    ...(provided.length
      ? ['| Asset | Node ID | Path |', '|---|---|---|',
         ...provided.map((a) => `| ${a.name || '—'} | \`${a.nodeId || '—'}\` | \`${a.exportPath || '—'}\` |`)]
      : ['_None yet._']),
    '',
    '## Outstanding — export these from Figma',
    '',
    ...(missing.length
      ? ['| Asset | Node ID | Suggested filename |', '|---|---|---|',
         ...missing.map((a) => `| ${a.name || '—'} | \`${a.nodeId || '—'}\` | \`assets/images/${slug(a.name || a.nodeId || 'asset')}.${a.ext || 'webp'}\` |`),
         '', 'Until these land, the build renders a **labeled placeholder** in each slot',
         '(never a hotlink, never a blank gray box) — per the playbook image rule.']
      : ['_None — every asset is accounted for._']),
    '',
  ].join('\n');
}

/* ------------------------------------------------------------------ *
 * Call ledger — the rate/seat-limit surface
 * ------------------------------------------------------------------ */
const LIMIT_RE = /rate.?limit|quota|too many requests|429|seat|plan|upgrade|not entitled/i;

function readLedger(meta) {
  const calls = Array.isArray(meta.calls) ? meta.calls : [];
  const failed = calls.filter((c) => c.ok === false);
  const limited = failed.filter((c) => LIMIT_RE.test(String(c.error || '')));
  return { calls, failed, limited, partial: failed.length > 0 };
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */
function parseArgs(argv) {
  const opts = { capture: null, out: null, json: false, quiet: false, initLock: false, check: false };
  for (const arg of argv) {
    if (arg.startsWith('--capture=')) opts.capture = arg.slice(10);
    else if (arg.startsWith('--out=')) opts.out = arg.slice(6);
    else if (arg === '--json') opts.json = true;
    else if (arg === '--quiet') opts.quiet = true;
    else if (arg === '--init-lock') opts.initLock = true;
    else if (arg === '--check') opts.check = true;
    else if (!arg.startsWith('--') && !opts.capture) opts.capture = arg;
  }
  return opts;
}

function fail(message) {
  console.error(`figma-tokens: ${message}`);
  process.exit(1);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.capture) {
    fail('need a capture directory — node scripts/figma-tokens.js --capture=demos/<brand>/output/00-figma-capture');
  }

  const captureDir = path.resolve(ROOT, opts.capture);
  if (!fs.existsSync(captureDir)) fail(`capture directory not found: ${path.relative(ROOT, captureDir)}`);

  const meta = readJSON(path.join(captureDir, 'capture.json'));
  if (!meta) fail(`no capture.json in ${path.relative(ROOT, captureDir)} — Phase 01 writes it; see the figma-page-build skill`);

  const outDir = path.resolve(ROOT, opts.out || path.dirname(captureDir));
  fs.mkdirSync(outDir, { recursive: true });

  const store = createStore();
  const warnings = [];

  // 1. Bound variables.
  const variables = readJSON(path.join(captureDir, 'variables.json'));
  const boundCount = ingestVariables(variables, store);
  if (!variables) {
    warnings.push('no variables.json — this file binds no Figma variables, so every token is read from design context as a raw value and needs confirm-and-lock');
  }

  // 2. Design context, one file per node.
  const contextFiles = listFiles(path.join(captureDir, 'design-context'), '.json');
  for (const file of contextFiles) {
    const payload = readJSON(file);
    if (payload) ingestDesignContext(payload, path.basename(file, '.json'), store);
  }
  if (!contextFiles.length) warnings.push('no design-context/*.json captured — token coverage will be thin');

  // 3. Node metadata.
  const metadata = readJSON(path.join(captureDir, 'metadata.json'));
  const nodes = collectNodes(metadata);
  if (!nodes.length) warnings.push('no metadata.json — no component inventory and no inferred breakpoints');

  // 4. Geometry — the fallback spacing source for comps with no auto-layout.
  const layoutHint = deriveContainer(nodes, inferLayout(nodes).designWidth);
  const derivedGaps = deriveSpacing(nodes, inferLayout(nodes).designWidth, store);
  if (layoutHint) {
    store.add('layout', layoutHint.container, { name: 'container', where: 'geometry' });
    store.add('layout', layoutHint.gutter, { name: 'gutter', where: 'geometry' });
  }
  if (!derivedGaps && !contextFiles.length) {
    warnings.push('no spacing found in design context and none derivable from geometry');
  }

  // 5. Renders.
  const renders = [];
  for (const file of listFiles(path.join(captureDir, 'renders'), '.png')) {
    try {
      renders.push(sampleRender(file));
    } catch (err) {
      warnings.push(`could not read render ${path.basename(file)}: ${err.message}`);
    }
  }
  if (!renders.length) {
    warnings.push('no renders/*.png — without a page render nothing corroborates the inferred colors, and there is no reference for the visual-diff step in Phase 03');
  }
  const { verified, candidates } = corroborateWithRenders(store, renders);

  // A render candidate is a colour the design demonstrably uses and the
  // connector never returned — on the first real file that was #eaf1fc at 28.2%
  // coverage, the entire hero panel. Reporting it and stopping there just means
  // a human retypes it into the build by hand. Adopt it as an inferred token so
  // it flows through confirm-and-lock like anything else.
  for (const c of candidates) {
    store.add('color', c.hex, { where: `render:${c.render}` });
  }

  // 6. Lock.
  const lockPath = path.join(captureDir, 'tokens.lock.json');
  const lock = readJSON(lockPath);
  const tokens = applyLock(store.all(), lock);
  const pending = unconfirmed(tokens);

  if (opts.initLock) {
    const skeleton = buildLockSkeleton(tokens, lock);
    fs.writeFileSync(lockPath, JSON.stringify(skeleton, null, 2) + '\n');
    console.log(`figma-tokens: wrote lock skeleton → ${path.relative(ROOT, lockPath)}`);
    console.log(`  ${Object.keys(skeleton.tokens).length} tokens, ${pending.length} awaiting confirmation.`);
    console.log('  Rename what the design system actually calls them, drop:true the noise, then confirmed:true.');
    return;
  }

  const counts = {
    bound: tokens.filter((t) => t.confidence === 'bound').length,
    verified: tokens.filter((t) => t.confidence === 'verified').length,
    inferred: tokens.filter((t) => t.confidence === 'inferred').length,
  };

  const ledger = readLedger(meta);
  const model = buildModel(tokens, nodes, renders);
  const layout = inferLayout(nodes);
  const outMeta = {
    designWidth: layout.designWidth,
    fileKey: meta.fileKey || null,
    fileName: meta.fileName || null,
    figmaUrl: meta.figmaUrl || null,
    nodeIds: meta.nodeIds || [],
    capturedAt: meta.capturedAt || null,
    generatedAt: new Date().toISOString(),
    counts,
    unconfirmedCount: pending.length,
    partialCapture: ledger.partial,
    rateLimited: ledger.limited.length > 0,
  };

  fs.writeFileSync(path.join(outDir, 'tokens.json'), JSON.stringify({
    meta: outMeta,
    tokens: model,
    unconfirmed: pending.map((t) => ({ key: tokenKey(t), value: t.value, uses: t.uses })),
    renderCandidates: candidates,
    warnings,
  }, null, 2) + '\n');

  fs.writeFileSync(path.join(outDir, 'tokens.css'), emitCSS(model, outMeta));
  fs.writeFileSync(path.join(outDir, '02-component-inventory.md'), emitInventory(nodes, outMeta));

  const assets = mergeAssetSources(
    readJSON(path.join(captureDir, 'assets', 'manifest.json')),
    harvestContextAssets(captureDir),
  );
  const outstandingAssets = assets.filter((a) => a.status !== 'provided' && !a.exportPath);
  if (outstandingAssets.length) {
    warnings.push(`${outstandingAssets.length} asset(s) referenced by the design context have no local export — the build would have to placeholder them. See 03-asset-handoff.md.`);
  }
  fs.writeFileSync(path.join(outDir, '03-asset-handoff.md'), emitAssetHandoff(assets, outMeta));

  const overrides = readJSON(path.join(captureDir, 'copy-overrides.json'));
  const copy = auditCopy(nodes, outMeta.designWidth, overrides);
  fs.writeFileSync(path.join(outDir, '05-copy-report.md'), emitCopyReport(copy, outMeta));

  if (opts.json) {
    console.log(JSON.stringify({ meta: outMeta, warnings, unconfirmed: pending.length, renderCandidates: candidates }, null, 2));
  } else if (!opts.quiet) {
    const rel = (p) => path.relative(ROOT, path.join(outDir, p));
    console.log(`figma-tokens: ${meta.fileName || meta.fileKey || 'capture'} → ${path.relative(ROOT, outDir)}`);
    const lockedCount = tokens.filter((t) => t.confidence === 'inferred' && t.confirmed).length;
    console.log(`  tokens      ${counts.bound} bound · ${counts.verified} verified · ${counts.inferred} inferred${lockedCount ? ` (${lockedCount} confirmed via lock)` : ''}`);
    console.log(`  colors ${model.colors.length} · type ${model.typography.sizes.length} sizes / ${model.typography.families.length} families · space ${model.spacing.length} · radius ${model.radii.length} · layout ${model.layout.length} · breakpoints ${model.breakpoints.length}`);
    const geomSpace = tokens.filter((t) => t.category === 'space' && t.where.includes('geometry')).length;
    if (geomSpace) console.log(`  spacing     ${geomSpace} step(s) derived from sibling geometry (no auto-layout in this file)`);
    console.log(`  renders     ${renders.length ? renders.map((r) => `${r.file} (${r.width}×${r.height})`).join(', ') : 'none'}`);
    console.log(`  wrote       ${rel('tokens.json')}, ${rel('tokens.css')}, ${rel('02-component-inventory.md')}, ${rel('03-asset-handoff.md')}, ${rel('05-copy-report.md')}`);
    console.log(`  copy        ${copy.total} text node(s)${copy.placeholders.length ? ` · ${copy.placeholders.length} placeholder, ${copy.unresolved.length} unresolved` : ' · no placeholder copy'}`);
    if (copy.unresolved.length) {
      console.log(`  WARN  ${copy.unresolved.length} placeholder string(s) will be built AND MARKED as placeholder. Supply real text in`);
      console.log('          00-figma-capture/copy-overrides.json — see 05-copy-report.md.');
    }
    for (const w of warnings) console.log(`  WARN  ${w}`);
    if (candidates.length) {
      console.log(`  NOTE  ${candidates.length} dominant render color(s) absent from the capture — likely inside an asset or effect:`);
      for (const c of candidates.slice(0, 5)) console.log(`          ${c.hex}  ${(c.coverage * 100).toFixed(1)}% of ${c.render}`);
    }
    if (ledger.limited.length) {
      console.log('');
      console.log('  FIGMA CALL LIMIT HIT during capture — the token set is INCOMPLETE.');
      console.log(`    ${ledger.limited.length} of ${ledger.calls.length} call(s) were refused by the connector:`);
      for (const c of ledger.limited.slice(0, 5)) console.log(`      ${c.tool}${c.node ? ` (${c.node})` : ''}: ${c.error}`);
      console.log('    Figma MCP call budget is tied to the seat/plan — a View seat exhausts in a handful of');
      console.log('    calls. Confirm the operator holds a Dev/Full seat, then re-run Phase 01 capture for the');
      console.log('    failed nodes only. Everything already captured is on disk and is not re-fetched.');
    } else if (ledger.failed.length) {
      console.log(`  WARN  ${ledger.failed.length} capture call(s) failed for non-limit reasons — capture is partial.`);
    }
    if (pending.length) {
      console.log('');
      console.log(`  ${pending.length} inferred token(s) NOT confirmed — not build-ready.`);
      console.log('    npm run figma:lock -- --capture=<dir>    # write/refresh the lock skeleton');
      console.log('    then edit tokens.lock.json and re-run.');
    }
  }

  if (opts.check && pending.length) {
    console.error(`figma-tokens: ${pending.length} inferred token(s) unconfirmed — run the confirm-and-lock step before building.`);
    process.exit(1);
  }
  if (opts.check && ledger.limited.length) {
    console.error('figma-tokens: capture is incomplete (Figma call limit) — re-capture before building.');
    process.exit(1);
  }
}

main();
