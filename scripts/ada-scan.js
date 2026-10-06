#!/usr/bin/env node
'use strict';

/**
 * ada-scan.js — zero-dependency ADA / WCAG 2.1 AA scanner for the playbook's
 * static output pages.
 *
 * It parses each HTML file's inline <style> blocks and inline style="" attrs,
 * resolves design-system tokens (the brand :root custom properties), builds a
 * lightweight DOM + a small CSS cascade, and reports accessibility findings.
 *
 * Headline check: COLOR CONTRAST — including the common red-on-dark failure
 * (saturated red text over dark heroes / scrims / overlays). A good default
 * rule is "red on light, pure white on dark", so red text on a dark/overlay
 * background is flagged.
 *
 * It also runs structural ADA checks: page language, document title, image alt
 * text, accessible names on links/buttons, labels on form controls, heading
 * order, duplicate ids, and disabled zoom.
 *
 * Usage:
 *   node scripts/ada-scan.js [globs/paths...]   # default: demos/<brand>/output/*.html
 *   node scripts/ada-scan.js --staged           # only files staged in git
 *   node scripts/ada-scan.js --json             # machine-readable output
 *   node scripts/ada-scan.js --quiet            # only print failures
 *
 * Exit code is 0 when there are no ERROR-level findings, 1 otherwise. WARN-level
 * findings never fail the build (so the pre-commit gate stays actionable).
 *
 * Limitations (documented honestly): this is a static analyzer, not a browser.
 * It approximates the cascade (rightmost simple selector + ancestor matching,
 * standard specificity ordering) and cannot see JS-applied styles or sample the
 * actual pixels behind text set over a photo. Where a background can't be
 * resolved to a solid color it is treated using the dark-overlay heuristic
 * described below, and otherwise assumed to inherit down to the page's base
 * surface (white). Findings point at file + selector/snippet so they're easy to
 * confirm by eye.
 */

const fs = require('fs');

/**
 * Pull in same-directory <link rel="stylesheet"> files.
 *
 * Without this the scanner only ever sees inline <style>, so a page that keeps
 * its :root design tokens in a linked tokens.css resolves every var() to
 * nothing and reports a clean bill of health having tested almost none of it —
 * a false negative in a gate that blocks merges. Local relative hrefs only; a
 * remote stylesheet is not fetched (and is noted as unresolved).
 */
function inlineLinkedStylesheets(html, file) {
  const dir = path.dirname(file);
  return html.replace(
    /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi,
    (tag) => {
      const href = (/href=["']([^"']+)["']/i.exec(tag) || [])[1];
      if (!href || /^(https?:)?\/\//i.test(href) || href.startsWith('data:')) return tag;
      try {
        return `<style data-from="${href}">\n${fs.readFileSync(path.resolve(dir, href), 'utf8')}\n</style>`;
      } catch {
        return tag; // missing file — leave it; the var()s simply stay unresolved
      }
    }
  );
}
const path = require('path');
const { execSync } = require('child_process');

/* ------------------------------------------------------------------ *
 * Thresholds
 * ------------------------------------------------------------------ */
const AA_NORMAL = 4.5; // WCAG 2.1 AA, normal text
const AA_LARGE = 3.0; // WCAG 2.1 AA, large text (>=24px, or >=18.66px bold)
// Representative composited color for a dark image/scrim/overlay background.
// A typical dark scrim (a mostly-opaque dark tint over a dark photo) leaves the
// effective surface behind the text very dark; this is a fair stand-in.
const OVERLAY_DARK = '#1a1a1a';
// A token counts as "dark" (light text expected on it) below this luminance.
const DARK_LUM = 0.18;

/* ------------------------------------------------------------------ *
 * Color math (WCAG)
 * ------------------------------------------------------------------ */
const NAMED = {
  black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000',
  blue: '#0000ff', gray: '#808080', grey: '#808080', silver: '#c0c0c0',
  transparent: 'transparent', currentcolor: 'currentcolor',
};

// Parse a CSS color (hex / rgb[a] / hsl[a] / named) -> {r,g,b,a} (0-255, a 0-1)
// or null when not a determinable solid color.
function parseColor(input) {
  if (!input) return null;
  let s = String(input).trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (s === 'currentcolor' || s === 'inherit') return null;

  if (s[0] === '#') {
    let h = s.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length === 6 || h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      if ([r, g, b].every((n) => !Number.isNaN(n))) return { r, g, b, a };
    }
    return null;
  }

  let m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[,\/\s]+/).filter(Boolean);
    if (parts.length >= 3) {
      const r = chan(parts[0]); const g = chan(parts[1]); const b = chan(parts[2]);
      const a = parts[3] != null ? alpha(parts[3]) : 1;
      if ([r, g, b].every((n) => n != null)) return { r, g, b, a };
    }
    return null;
  }

  m = s.match(/^hsla?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[,\/\s]+/).filter(Boolean);
    if (parts.length >= 3) {
      const h = parseFloat(parts[0]);
      const sat = parseFloat(parts[1]) / 100;
      const lig = parseFloat(parts[2]) / 100;
      const a = parts[3] != null ? alpha(parts[3]) : 1;
      const rgb = hslToRgb(h, sat, lig);
      if (rgb) return { ...rgb, a };
    }
    return null;
  }
  return null;

  function chan(v) {
    if (v.endsWith('%')) return Math.round((parseFloat(v) / 100) * 255);
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : Math.max(0, Math.min(255, n));
  }
  function alpha(v) {
    if (v.endsWith('%')) return parseFloat(v) / 100;
    const n = parseFloat(v);
    return Number.isNaN(n) ? 1 : Math.max(0, Math.min(1, n));
  }
}

function hslToRgb(h, s, l) {
  if ([h, s, l].some((n) => Number.isNaN(n))) return null;
  h = ((h % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const t = (tc) => {
    if (tc < 0) tc += 1; if (tc > 1) tc -= 1;
    if (tc < 1 / 6) return p + (q - p) * 6 * tc;
    if (tc < 1 / 2) return q;
    if (tc < 2 / 3) return p + (q - p) * (2 / 3 - tc) * 6;
    return p;
  };
  return {
    r: Math.round(t(h + 1 / 3) * 255),
    g: Math.round(t(h) * 255),
    b: Math.round(t(h - 1 / 3) * 255),
  };
}

// Composite a (possibly translucent) color over an opaque backdrop.
function flatten(fg, bg) {
  if (!fg) return bg;
  if (fg.a >= 1) return { r: fg.r, g: fg.g, b: fg.b, a: 1 };
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

function relLuminance({ r, g, b }) {
  const lin = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a, b) {
  const la = relLuminance(a); const lb = relLuminance(b);
  const hi = Math.max(la, lb); const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

// Is this a saturated red (the red/danger family)?
function isReddish({ r, g, b }) {
  return r >= 120 && r - g >= 60 && r - b >= 60;
}

/* ------------------------------------------------------------------ *
 * CSS: token + value helpers
 * ------------------------------------------------------------------ */
function resolveVars(value, tokens, depth = 0) {
  if (!value || depth > 12) return value;
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g,
    (_, name, fallback) => {
      if (tokens[name] != null) return resolveVars(tokens[name], tokens, depth + 1);
      if (fallback != null) return resolveVars(fallback.trim(), tokens, depth + 1);
      return 'transparent';
    });
}

// Interpret a resolved `background` / `background-color` value.
// Returns { kind: 'solid'|'image'|'none', color? }
function interpretBackground(value) {
  if (!value) return { kind: 'none' };
  const v = value.trim().toLowerCase();
  if (v === 'none' || v === 'transparent' || v === 'inherit') return { kind: 'none' };
  if (/\burl\(|gradient\(/.test(v)) {
    // A layered background; capture a trailing solid color if present (the
    // fallback under the image), else just mark it an image.
    const tail = lastColorToken(v);
    return { kind: 'image', color: tail ? parseColor(tail) : null };
  }
  const c = parseColor(v) || (lastColorToken(v) && parseColor(lastColorToken(v)));
  if (c && c.a > 0) return { kind: 'solid', color: c };
  if (c && c.a === 0) return { kind: 'none' };
  return { kind: 'none' };
}

function lastColorToken(v) {
  const tokens = v.match(/#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|\b[a-z]+\b/gi) || [];
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (parseColor(tokens[i])) return tokens[i];
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Tiny HTML parser -> tree
 * ------------------------------------------------------------------ */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'template', 'textarea']);

function parseHTML(html) {
  const styleBlocks = [];
  const root = { tag: '#root', attrs: {}, children: [], parent: null, text: '' };
  let cur = root;
  let i = 0;
  const len = html.length;

  while (i < len) {
    if (html[i] === '<') {
      if (html.startsWith('<!--', i)) {
        const end = html.indexOf('-->', i + 4);
        i = end === -1 ? len : end + 3;
        continue;
      }
      if (html[i + 1] === '!') { // doctype / declarations
        const end = html.indexOf('>', i);
        i = end === -1 ? len : end + 1;
        continue;
      }
      const close = html.indexOf('>', i);
      if (close === -1) break;
      const raw = html.slice(i + 1, close);
      i = close + 1;

      if (raw[0] === '/') { // end tag
        const name = raw.slice(1).trim().toLowerCase();
        let n = cur;
        while (n && n.tag !== name) n = n.parent;
        if (n && n.parent) cur = n.parent;
        continue;
      }

      const m = raw.match(/^([a-zA-Z][\w:-]*)/);
      if (!m) continue;
      const tag = m[1].toLowerCase();
      const selfClose = /\/\s*$/.test(raw);
      const node = {
        tag, attrs: parseAttrs(raw.slice(m[1].length)),
        children: [], parent: cur, text: '',
      };
      cur.children.push(node);

      if (RAW.has(tag)) {
        const closeTag = `</${tag}`;
        const idx = html.toLowerCase().indexOf(closeTag, i);
        const inner = html.slice(i, idx === -1 ? len : idx);
        node.text = inner;
        if (tag === 'style') styleBlocks.push(inner);
        i = idx === -1 ? len : html.indexOf('>', idx) + 1;
        continue;
      }
      if (!VOID.has(tag) && !selfClose) cur = node;
    } else {
      const next = html.indexOf('<', i);
      const text = html.slice(i, next === -1 ? len : next);
      if (text.trim()) cur.text += ' ' + text.trim();
      i = next === -1 ? len : next;
    }
  }
  return { root, styleBlocks };
}

function parseAttrs(s) {
  const attrs = {};
  const re = /([a-zA-Z_:][-\w:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s">]+))?/g;
  let m;
  while ((m = re.exec(s))) {
    let v = m[2] || '';
    if (v && (v[0] === '"' || v[0] === "'")) v = v.slice(1, -1);
    attrs[m[1].toLowerCase()] = v;
  }
  return attrs;
}

function walk(node, fn, ancestors = []) {
  for (const c of node.children) {
    fn(c, ancestors);
    walk(c, fn, [...ancestors, c]);
  }
}

/* ------------------------------------------------------------------ *
 * CSS parser -> flat rule list + token map
 * ------------------------------------------------------------------ */
function parseCSS(cssText) {
  const css = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const tokens = {};
  parseBlock(css, 0, css.length);
  return { rules, tokens };

  function parseBlock(str, start, end) {
    let i = start;
    while (i < end) {
      // skip whitespace
      while (i < end && /\s/.test(str[i])) i++;
      if (i >= end) break;
      if (str[i] === '}') { i++; continue; }

      if (str[i] === '@') {
        const brace = str.indexOf('{', i);
        const semi = str.indexOf(';', i);
        if (semi !== -1 && (brace === -1 || semi < brace)) { i = semi + 1; continue; }
        if (brace === -1) break;
        const prelude = str.slice(i, brace).trim();
        const bodyEnd = matchBrace(str, brace);
        if (/^@media|^@supports/i.test(prelude)) {
          parseBlock(str, brace + 1, bodyEnd); // nested rules apply (assume active)
        }
        i = bodyEnd + 1;
        continue;
      }

      const brace = str.indexOf('{', i);
      if (brace === -1 || brace >= end) break;
      const selectorText = str.slice(i, brace).trim();
      const bodyEnd = matchBrace(str, brace);
      const body = str.slice(brace + 1, bodyEnd);
      const decls = parseDecls(body);
      const selectors = selectorText.split(',').map((s) => s.trim()).filter(Boolean);

      // capture custom props from :root / html / * for the token map
      for (const sel of selectors) {
        if (/(^|\s|,)(:root|html|\*)\b/.test(sel) || sel === ':root') {
          for (const [k, v] of Object.entries(decls)) {
            if (k.startsWith('--')) tokens[k] = v;
          }
        }
      }
      rules.push({ selectors, decls });
      i = bodyEnd + 1;
    }
  }

  function matchBrace(str, open) {
    let depth = 0;
    for (let j = open; j < str.length; j++) {
      if (str[j] === '{') depth++;
      else if (str[j] === '}') { depth--; if (depth === 0) return j; }
    }
    return str.length;
  }

  function parseDecls(body) {
    const decls = {};
    for (const part of body.split(';')) {
      const idx = part.indexOf(':');
      if (idx === -1) continue;
      const prop = part.slice(0, idx).trim().toLowerCase();
      const val = part.slice(idx + 1).trim();
      if (prop) decls[prop] = val;
    }
    return decls;
  }
}

/* ------------------------------------------------------------------ *
 * Selector matching + specificity (approximate)
 * ------------------------------------------------------------------ */
// Parse a complex selector into compound parts (split on descendant/child/etc).
function compoundParts(selector) {
  return selector.split(/\s*[>+~]\s*|\s+/).filter(Boolean);
}

function parseCompound(part) {
  // returns { tag, classes:[], id, pseudo:bool } or null if unusable
  const pseudo = /::|:(?!root\b)/.test(part.replace(/^:root$/, ''));
  const tag = (part.match(/^[a-zA-Z][\w-]*/) || [null])[0];
  const classes = (part.match(/\.[\w-]+/g) || []).map((c) => c.slice(1));
  const id = (part.match(/#[\w-]+/) || [null, null])[0];
  return {
    tag: tag ? tag.toLowerCase() : null,
    classes,
    id: id ? id.slice(1) : null,
    pseudo,
  };
}

function compoundMatches(node, cmp) {
  if (!node || node.tag === '#root') return false;
  if (cmp.tag && cmp.tag !== '*' && cmp.tag !== node.tag) return false;
  if (cmp.id && node.attrs.id !== cmp.id) return false;
  if (cmp.classes.length) {
    const cls = (node.attrs.class || '').split(/\s+/);
    for (const c of cmp.classes) if (!cls.includes(c)) return false;
  }
  return true;
}

// Does `selector` match `node` (with `ancestors` outermost-first)?
function selectorMatches(selector, node, ancestors) {
  const parts = compoundParts(selector).map(parseCompound);
  if (!parts.length) return false;
  // pseudo-states/elements: ignore these rules for base styling
  if (parts.some((p) => p.pseudo)) return false;

  const last = parts[parts.length - 1];
  if (!compoundMatches(node, last)) return false;

  // ancestor parts must each match some ancestor, in order (treat all
  // combinators as descendant — a safe over-match for these pages)
  let ai = ancestors.length - 1;
  for (let pi = parts.length - 2; pi >= 0; pi--) {
    const cmp = parts[pi];
    let found = false;
    while (ai >= 0) {
      if (compoundMatches(ancestors[ai], cmp)) { found = true; ai--; break; }
      ai--;
    }
    if (!found) return false;
  }
  return true;
}

function specificity(selector) {
  const parts = compoundParts(selector).map(parseCompound);
  let a = 0; let b = 0; let c = 0;
  for (const p of parts) {
    if (p.id) a++;
    b += p.classes.length;
    if (p.tag && p.tag !== '*') c++;
  }
  return a * 10000 + b * 100 + c;
}

// Gather the winning declarations for a node from the rule set + inline style.
// Cached per node (a node's ancestor chain is fixed within a document).
function computedDecls(node, ancestors, rules) {
  if (node._cdecls) return node._cdecls;
  const matched = [];
  rules.forEach((rule, order) => {
    for (const sel of rule.selectors) {
      if (selectorMatches(sel, node, ancestors)) {
        matched.push({ spec: specificity(sel), order, decls: rule.decls });
        break;
      }
    }
  });
  matched.sort((x, y) => (x.spec - y.spec) || (x.order - y.order));
  const out = {};
  for (const m of matched) Object.assign(out, m.decls);
  if (node.attrs.style) {
    for (const part of node.attrs.style.split(';')) {
      const idx = part.indexOf(':');
      if (idx === -1) continue;
      out[part.slice(0, idx).trim().toLowerCase()] = part.slice(idx + 1).trim();
    }
  }
  node._cdecls = out;
  return out;
}

/* ------------------------------------------------------------------ *
 * Background resolution (the cascade + dark-overlay heuristic)
 * ------------------------------------------------------------------ */
// Decide whether a container paints a dark image/scrim/overlay BEHIND its own
// text (the hero pattern). Deliberately narrow to avoid false positives: a
// section that merely *contains* a dark card is not itself a dark surface.
// True only when:
//   (a) the element's own background is an image, or
//   (b) a ::before/::after on it is a covering dark/image scrim, or
//   (c) a direct child is an absolutely-positioned dark/image background layer.
// Relies on the _cdecls pre-pass having populated computed declarations.
function paintsDarkOverlay(node, rules, tokens) {
  if (!node || node.tag === '#root') return false;

  // (a) own background is an image
  const own = dget(node);
  const ownBg = interpretBackground(resolveVars(own['background'] || own['background-color'], tokens));
  if (ownBg.kind === 'image') return true;

  // (b) ::before / ::after covering scrim
  for (const rule of rules) {
    for (const s of rule.selectors) {
      if (!/::?(before|after)\b/.test(s)) continue;
      const base = s.replace(/::?(before|after).*$/, '').trim();
      const cmp = parseCompound(compoundParts(base).pop() || '');
      if (!compoundMatches(node, cmp)) continue;
      const d = rule.decls;
      const pos = (d.position || '').toLowerCase();
      if ((pos !== 'absolute' && pos !== 'fixed') || !coversFully(d)) continue;
      const bg = interpretBackground(resolveVars(d['background'] || d['background-color'], tokens));
      if (bg.kind === 'image') return true;
      if (bg.kind === 'solid' && relLuminance(bg.color) < 0.4) return true; // dark / dark-translucent scrim
    }
  }

  // (c) a direct child that is an absolutely-positioned dark/image layer
  // covering the element (the .hero__bg pattern)
  for (const child of node.children) {
    const d = dget(child);
    const pos = (resolveVars(d.position, tokens) || '').toLowerCase();
    if ((pos !== 'absolute' && pos !== 'fixed') || !coversFully(d)) continue;
    const bg = interpretBackground(resolveVars(d['background'] || d['background-color'], tokens));
    if (bg.kind === 'image') return true;
    if (bg.kind === 'solid' && relLuminance(bg.color) < DARK_LUM) return true;
  }
  return false;
}

// Does this positioned layer cover its containing block (a full scrim/backdrop),
// as opposed to a small accent bar or badge?
function coversFully(d) {
  const v = (p) => (d[p] || '').trim().toLowerCase();
  const inset = v('inset');
  if (inset && /^0(px|%)?(\s+0(px|%)?){0,3}$/.test(inset)) return true;
  const isZero = (p) => ['0', '0px', '0%'].includes(v(p));
  if (isZero('top') && isZero('left') && isZero('right') && isZero('bottom')) return true;
  const isFull = (p) => ['100%', '100vw', '100vh'].includes(v(p));
  if (isZero('top') && isZero('left') && isFull('width') && isFull('height')) return true;
  return false;
}

/* ------------------------------------------------------------------ *
 * Findings
 * ------------------------------------------------------------------ */
function makeReporter(file) {
  const findings = [];
  return {
    findings,
    add(level, rule, message, where) {
      findings.push({ file, level, rule, message, where: where || '' });
    },
  };
}

/* ------------------------------------------------------------------ *
 * The checks
 * ------------------------------------------------------------------ */
function scanFile(file) {
  const html = inlineLinkedStylesheets(fs.readFileSync(file, 'utf8'), file);
  const rep = makeReporter(file);
  const { root, styleBlocks } = parseHTML(html);

  // merge all <style> blocks
  let rules = []; let tokens = {};
  for (const css of styleBlocks) {
    const parsed = parseCSS(css);
    rules = rules.concat(parsed.rules);
    tokens = Object.assign(tokens, parsed.tokens);
  }

  structuralChecks(root, html, rep);
  contrastChecks(root, rules, tokens, rep);

  return rep.findings;
}

function structuralChecks(root, html, rep) {
  // 1. <html lang>
  let htmlNode = null; let titleText = null; let viewport = null;
  const ids = new Map();
  const headings = [];

  walk(root, (node, ancestors) => {
    const t = node.tag;
    if (t === 'html') htmlNode = node;
    if (t === 'title') titleText = (node.text || '').trim();
    if (t === 'meta' && (node.attrs.name || '').toLowerCase() === 'viewport') {
      viewport = node.attrs.content || '';
    }
    if (node.attrs.id) {
      ids.set(node.attrs.id, (ids.get(node.attrs.id) || 0) + 1);
    }

    // duplicate / positive tabindex
    if (node.attrs.tabindex && parseInt(node.attrs.tabindex, 10) > 0) {
      rep.add('WARN', 'tabindex', `Positive tabindex="${node.attrs.tabindex}" disrupts focus order`, snippet(node));
    }

    // images need alt
    if (t === 'img') {
      if (node.attrs.alt == null) {
        rep.add('ERROR', 'img-alt', 'Image is missing an alt attribute', snippet(node));
      }
    }
    // inputs that take user data need a name
    if (t === 'input') {
      const type = (node.attrs.type || 'text').toLowerCase();
      const exempt = ['hidden', 'submit', 'button', 'reset', 'image'];
      if (!exempt.includes(type)) {
        if (!labeled(node, root)) {
          rep.add('ERROR', 'form-label', `<input type="${type}"> has no associated label / aria-label`, snippet(node));
        }
      }
    }
    if (t === 'select' || t === 'textarea') {
      if (!labeled(node, root)) {
        rep.add('ERROR', 'form-label', `<${t}> has no associated label / aria-label`, snippet(node));
      }
    }

    // links / buttons need an accessible name
    if (t === 'a' || t === 'button') {
      const name = accessibleName(node);
      if (!name) {
        rep.add('ERROR', 'control-name', `<${t}> has no accessible name (empty text and no aria-label/title)`, snippet(node));
      }
      if (t === 'a' && node.attrs.href == null && node.attrs.role == null) {
        rep.add('WARN', 'link-href', '<a> without href is not keyboard focusable; use a <button>', snippet(node));
      }
    }

    if (/^h[1-6]$/.test(t)) headings.push({ level: +t[1], node });
  });

  if (!htmlNode || !htmlNode.attrs.lang) {
    rep.add('ERROR', 'html-lang', '<html> is missing a lang attribute', '');
  }
  if (!titleText) {
    rep.add('ERROR', 'doc-title', 'Document has no non-empty <title>', '');
  }
  if (viewport && /user-scalable\s*=\s*no|maximum-scale\s*=\s*(1|1\.0)\b/.test(viewport)) {
    rep.add('ERROR', 'zoom-disabled', `viewport meta disables zoom: "${viewport}"`, '');
  }
  for (const [id, count] of ids) {
    if (count > 1) rep.add('ERROR', 'dup-id', `id="${id}" used ${count} times (must be unique)`, '');
  }
  // heading order
  let prev = 0;
  const h1s = headings.filter((h) => h.level === 1).length;
  if (headings.length && h1s === 0) {
    rep.add('WARN', 'heading-order', 'Page has headings but no <h1>', '');
  }
  for (const h of headings) {
    if (prev && h.level > prev + 1) {
      rep.add('WARN', 'heading-order', `Heading level jumps from h${prev} to h${h.level}`, snippet(h.node));
    }
    prev = h.level;
  }
}

function contrastChecks(root, rules, tokens, rep) {
  // Pre-pass: compute the winning declarations for every node WITH its real
  // ancestor chain, so descendant selectors (e.g. `.footer a`) only apply where
  // they should. All later lookups read this cache via dget().
  walk(root, (node, ancestors) => { computedDecls(node, ancestors, rules); });

  // cache overlay-darkness per element to avoid recompute
  const overlayCache = new Map();
  const darkOverlay = (node) => {
    if (overlayCache.has(node)) return overlayCache.get(node);
    const v = paintsDarkOverlay(node, rules, tokens);
    overlayCache.set(node, v);
    return v;
  };

  walk(root, (node, ancestors) => {
    if (!hasOwnText(node)) return; // only check elements that render text directly
    if (['script', 'style', 'title', 'head', 'noscript'].includes(node.tag)) return;

    const chain = [...ancestors, node];
    const fgRaw = resolveVars(declColor(chain), tokens);
    const fg = parseColor(fgRaw);
    if (!fg) return; // can't determine text color -> skip
    if (fg.a === 0) return;

    const { bgColor, bgKind, explicit } = effectiveBackground(chain, darkOverlay, tokens);

    const { size, bold } = fontInfo(chain, tokens);
    const large = size >= 24 || (size >= 18.66 && bold);
    const threshold = large ? AA_LARGE : AA_NORMAL;
    const fgLight = relLuminance(fg) >= DARK_LUM; // pale text expects a dark surface

    if (bgKind === 'overlay') {
      // text over a dark image/scrim — require light text (brand rule)
      const ratio = contrast(fg, parseColor(OVERLAY_DARK));
      if (ratio < threshold) {
        const lbl = isReddish(fg) ? 'Red text on a dark image/overlay' : 'Low-contrast text on a dark image/overlay';
        rep.add('ERROR', 'contrast', `${lbl} — ~${ratio.toFixed(2)}:1 over a dark surface (needs ${threshold}:1). ${brandHint(fg)}`, selOf(node));
      } else if (isReddish(fg)) {
        rep.add('WARN', 'contrast', `Red text over a dark image/overlay passes large-text (~${ratio.toFixed(2)}:1) but the brand rule is white-on-dark`, selOf(node));
      }
      return;
    }

    if (bgKind === 'solid') {
      // Confidence guard: if we never found a real background and fell through to
      // the page's white base, pale text almost certainly sits on a dark section
      // we couldn't resolve statically — skip rather than emit a phantom finding.
      if (!explicit && fgLight) return;
      const flatFg = flatten(fg, bgColor);
      const ratio = contrast(flatFg, bgColor);
      // near-identical fg/bg is a resolution artifact, not a real design — skip.
      if (ratio < 1.2 && !explicit) return;
      if (ratio < threshold) {
        rep.add('ERROR', 'contrast',
          `Text contrast ~${ratio.toFixed(2)}:1 (needs ${threshold}:1${large ? ', large text' : ''}) — ${hex(flatFg)} on ${hex(bgColor)}. ${brandHint(fg)}`,
          selOf(node));
      }
    }
    // bgKind 'unknown' -> not enough info, skip (documented limitation)
  });
}

// chain is outermost-first, ending with the text element.
function effectiveBackground(chain, darkOverlay, tokens) {
  for (let k = chain.length - 1; k >= 0; k--) {
    const n = chain[k];
    if (darkOverlay(n)) return { bgColor: parseColor(OVERLAY_DARK), bgKind: 'overlay', explicit: true };
    const d = dget(n);
    const raw = resolveVars(d['background'] || d['background-color'], tokens);
    const bg = interpretBackground(raw);
    if (bg.kind === 'image') return { bgColor: parseColor(OVERLAY_DARK), bgKind: 'overlay', explicit: true };
    if (bg.kind === 'solid') {
      if (bg.color.a >= 1) return { bgColor: bg.color, bgKind: 'solid', explicit: true };
      // translucent solid: composite over whatever is behind it
      const behind = effectiveBackground(chain.slice(0, k), darkOverlay, tokens);
      if (behind.bgKind === 'solid') return { bgColor: flatten(bg.color, behind.bgColor), bgKind: 'solid', explicit: true };
      return behind;
    }
  }
  return { bgColor: { r: 255, g: 255, b: 255, a: 1 }, bgKind: 'solid', explicit: false }; // page base = white
}

function dget(node) {
  return node._cdecls || {};
}

function declColor(chain) {
  // nearest declared `color` up the chain
  for (let k = chain.length - 1; k >= 0; k--) {
    const d = dget(chain[k]);
    if (d.color) return d.color;
  }
  return null;
}

function fontInfo(chain, tokens) {
  let size = 16; let bold = false; let gotSize = false; let gotWeight = false;
  for (let k = chain.length - 1; k >= 0; k--) {
    const d = dget(chain[k]);
    if (!gotSize && d['font-size']) {
      const px = parseFontSize(resolveVars(d['font-size'], tokens));
      if (px) { size = px; gotSize = true; }
    }
    if (!gotWeight && d['font-weight']) {
      const w = resolveVars(d['font-weight'], tokens).trim();
      if (/^\d+$/.test(w)) { bold = +w >= 700; gotWeight = true; }
      else if (w === 'bold' || w === 'bolder') { bold = true; gotWeight = true; }
      else if (w === 'normal' || w === 'lighter') { bold = false; gotWeight = true; }
    }
    if (gotSize && gotWeight) break;
  }
  return { size, bold };
}

function parseFontSize(v) {
  if (!v) return null;
  v = v.trim();
  const clamp = v.match(/clamp\(([^,]+),[^,]+,([^)]+)\)/);
  if (clamp) { // use the preferred upper bound as a fair estimate
    return parseFontSize(clamp[2].trim()) || parseFontSize(clamp[1].trim());
  }
  let m = v.match(/^([\d.]+)px$/); if (m) return parseFloat(m[1]);
  m = v.match(/^([\d.]+)rem$/); if (m) return parseFloat(m[1]) * 16;
  m = v.match(/^([\d.]+)em$/); if (m) return parseFloat(m[1]) * 16;
  m = v.match(/^([\d.]+)pt$/); if (m) return parseFloat(m[1]) * (96 / 72);
  m = v.match(/^([\d.]+)%$/); if (m) return (parseFloat(m[1]) / 100) * 16;
  return null;
}

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */
function hasOwnText(node) {
  return !!(node.text && node.text.replace(/\s+/g, ' ').trim().length);
}
function hex(c) {
  const h = (n) => n.toString(16).padStart(2, '0');
  return `#${h(c.r)}${h(c.g)}${h(c.b)}`;
}
function brandHint(fg) {
  return isReddish(fg) ? 'Use white (or a light token) for text on dark; keep saturated red for light surfaces.'
    : 'Increase contrast (lighten text on dark, or darken text on light).';
}
function selOf(node) {
  const id = node.attrs.id ? `#${node.attrs.id}` : '';
  const cls = (node.attrs.class || '').split(/\s+/).filter(Boolean).map((c) => `.${c}`).join('');
  const txt = (node.text || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return `${node.tag}${id}${cls}${txt ? `  “${txt}${node.text.length > 40 ? '…' : ''}”` : ''}`;
}
function snippet(node) {
  const attrs = Object.entries(node.attrs).slice(0, 4)
    .map(([k, v]) => (v ? `${k}="${String(v).slice(0, 30)}"` : k)).join(' ');
  return `<${node.tag}${attrs ? ' ' + attrs : ''}>`;
}
function accessibleName(node) {
  if (node.attrs['aria-label'] && node.attrs['aria-label'].trim()) return true;
  if (node.attrs['aria-labelledby']) return true;
  if (node.attrs.title && node.attrs.title.trim()) return true;
  if (hasOwnText(node)) return true;
  // image child with alt, or any nested text
  let named = false;
  walk(node, (c) => {
    if (named) return;
    if (c.tag === 'img' && (c.attrs.alt || '').trim()) named = true;
    if (c.tag === 'svg' && (c.attrs['aria-label'] || c.attrs.title)) named = true;
    if (hasOwnText(c)) named = true;
  });
  return named;
}
function labeled(node, root) {
  if (node.attrs['aria-label'] && node.attrs['aria-label'].trim()) return true;
  if (node.attrs['aria-labelledby']) return true;
  if (node.attrs.title && node.attrs.title.trim()) return true;
  // wrapped in a <label>
  let p = node.parent;
  while (p) { if (p.tag === 'label') return true; p = p.parent; }
  // <label for="id">
  if (node.attrs.id) {
    let found = false;
    walk(root, (n) => { if (n.tag === 'label' && n.attrs.for === node.attrs.id) found = true; });
    if (found) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * File discovery
 * ------------------------------------------------------------------ */
function defaultFiles() {
  const demos = path.join(process.cwd(), 'demos');
  const out = [];
  if (!fs.existsSync(demos)) return out;
  for (const brand of fs.readdirSync(demos)) {
    const dir = path.join(demos, brand, 'output');
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith('.html')) out.push(path.join(dir, f));
      }
    }
  }
  return out;
}

function stagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
    return out.split('\n').map((s) => s.trim()).filter((f) => f.endsWith('.html'))
      .map((f) => path.join(process.cwd(), f))
      .filter((f) => fs.existsSync(f));
  } catch {
    return [];
  }
}

function expandArgs(args) {
  const files = [];
  for (const a of args) {
    if (fs.existsSync(a)) {
      const st = fs.statSync(a);
      if (st.isDirectory()) {
        for (const f of fs.readdirSync(a)) if (f.endsWith('.html')) files.push(path.join(a, f));
      } else if (a.endsWith('.html')) files.push(a);
    }
  }
  return files;
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */
function main() {
  const argv = process.argv.slice(2);
  // --flag or --flag=value; everything else is a path/glob to scan.
  const opts = {};
  const positional = [];
  for (const a of argv) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq === -1) opts[a.slice(2)] = true;
      else opts[a.slice(2, eq)] = a.slice(eq + 1);
    } else {
      positional.push(a);
    }
  }

  let files;
  if (opts.staged) files = stagedFiles();
  else if (positional.length) files = expandArgs(positional);
  else files = defaultFiles();

  const all = [];
  for (const f of files.sort()) {
    try {
      all.push(...scanFile(f));
    } catch (e) {
      all.push({ file: f, level: 'ERROR', rule: 'scanner', message: `scanner crashed: ${e.message}`, where: '' });
    }
  }

  const errors = all.filter((f) => f.level === 'ERROR');
  const warns = all.filter((f) => f.level === 'WARN');

  // Always write the HTML report when asked — even on an empty/passing run —
  // so CI can upload it as an artifact unconditionally.
  if (typeof opts.html === 'string') {
    const title = typeof opts.title === 'string' ? opts.title : 'ADA / WCAG 2.1 AA report';
    fs.writeFileSync(opts.html, renderHtml(files, all, errors, warns, title));
  }

  if (!files.length) {
    if (opts.json) console.log(JSON.stringify({ files: 0, errors: 0, warnings: 0, findings: [] }));
    else console.log('ADA scan: no output HTML files to check.');
    process.exit(0);
  }

  if (opts.json) {
    console.log(JSON.stringify({ files: files.length, errors: errors.length, warnings: warns.length, findings: all }, null, 2));
    process.exit(errors.length ? 1 : 0);
  }

  report(files, all, errors, warns, !!opts.quiet);
  process.exit(errors.length ? 1 : 0);
}

function report(files, all, errors, warns, quiet) {
  const C = process.stdout.isTTY
    ? { red: (s) => `\x1b[31m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m` }
    : { red: (s) => s, yellow: (s) => s, green: (s) => s, dim: (s) => s, bold: (s) => s };

  const byFile = new Map();
  for (const f of all) {
    if (quiet && f.level !== 'ERROR') continue;
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }

  console.log(C.bold('\nADA / WCAG 2.1 AA scan'));
  console.log(C.dim(`Scanned ${files.length} file(s) · ${errors.length} error(s) · ${warns.length} warning(s)\n`));

  for (const [file, list] of byFile) {
    const rel = path.relative(process.cwd(), file);
    console.log(C.bold(rel));
    for (const f of list) {
      const tag = f.level === 'ERROR' ? C.red('✗ ERROR') : C.yellow('! WARN ');
      console.log(`  ${tag} ${C.dim('[' + f.rule + ']')} ${f.message}`);
      if (f.where) console.log(`         ${C.dim(f.where)}`);
    }
    console.log('');
  }

  if (errors.length === 0) {
    console.log(C.green('✓ No blocking ADA issues.') + (warns.length ? C.dim(` (${warns.length} warning(s) to review)`) : ''));
  } else {
    console.log(C.red(`✗ ${errors.length} blocking ADA issue(s). Fix these before committing.`));
  }
}

/* ------------------------------------------------------------------ *
 * Self-contained HTML report (uploaded as a CI artifact, never committed)
 * ------------------------------------------------------------------ */
function renderHtml(files, all, errors, warns, title) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let generated = '';
  try { generated = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC'; } catch { /* ignore */ }

  const byFile = new Map();
  for (const f of files.sort()) byFile.set(path.relative(process.cwd(), f), []);
  for (const f of all) {
    const rel = path.relative(process.cwd(), f.file);
    if (!byFile.has(rel)) byFile.set(rel, []);
    byFile.get(rel).push(f);
  }
  // files with findings first (errors before warnings), then clean files
  const order = [...byFile.entries()].sort((a, b) => {
    const ea = a[1].some((x) => x.level === 'ERROR'); const eb = b[1].some((x) => x.level === 'ERROR');
    if (ea !== eb) return ea ? -1 : 1;
    return (b[1].length - a[1].length) || a[0].localeCompare(b[0]);
  });

  const fileSections = order.map(([rel, list]) => {
    if (!list.length) {
      return `<section class="file clean"><h2>${esc(rel)} <span class="ok">clean</span></h2></section>`;
    }
    const rows = list
      .sort((x, y) => (x.level === y.level ? 0 : x.level === 'ERROR' ? -1 : 1))
      .map((f) => `
        <li class="f ${f.level.toLowerCase()}">
          <span class="badge ${f.level.toLowerCase()}">${f.level}</span>
          <span class="rule">${esc(f.rule)}</span>
          <div class="msg">${esc(f.message)}</div>
          ${f.where ? `<div class="where">${esc(f.where)}</div>` : ''}
        </li>`).join('');
    const ec = list.filter((f) => f.level === 'ERROR').length;
    const wc = list.filter((f) => f.level === 'WARN').length;
    return `<section class="file"><h2>${esc(rel)} <span class="counts">${ec} error${ec === 1 ? '' : 's'} · ${wc} warning${wc === 1 ? '' : 's'}</span></h2><ul>${rows}</ul></section>`;
  }).join('\n');

  const verdict = errors.length
    ? `<span class="v-fail">${errors.length} blocking issue${errors.length === 1 ? '' : 's'}</span>`
    : `<span class="v-pass">No blocking issues</span>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root{--err:#c62828;--warn:#b26a00;--ok:#1e7d4f;--ink:#1a1a1a;--mut:#6b7280;--line:#e5e7eb;--bg:#f7f7f8}
  *{box-sizing:border-box}
  body{margin:0;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg)}
  header{background:#0d1b2a;color:#fff;padding:28px 24px}
  header h1{margin:0 0 6px;font-size:20px}
  header .meta{color:#aab4c2;font-size:13px}
  .summary{display:flex;flex-wrap:wrap;gap:10px;padding:18px 24px;border-bottom:1px solid var(--line);background:#fff}
  .chip{border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-size:13px;background:#fff}
  .chip b{font-weight:700}
  .v-fail{color:var(--err);font-weight:700}.v-pass{color:var(--ok);font-weight:700}
  .note{padding:14px 24px;color:var(--mut);font-size:13px;background:#fff;border-bottom:1px solid var(--line)}
  main{padding:8px 24px 48px;max-width:1000px}
  .file{background:#fff;border:1px solid var(--line);border-radius:10px;margin:16px 0;overflow:hidden}
  .file h2{margin:0;font-size:15px;padding:12px 16px;border-bottom:1px solid var(--line);background:#fafafa;display:flex;justify-content:space-between;gap:12px;align-items:center;word-break:break-all}
  .file.clean h2{border-bottom:0}
  .counts{color:var(--mut);font-weight:500;font-size:12px;white-space:nowrap}
  .ok{color:var(--ok);font-weight:700;font-size:12px}
  ul{list-style:none;margin:0;padding:0}
  li.f{padding:12px 16px;border-bottom:1px solid var(--line)}
  li.f:last-child{border-bottom:0}
  .badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;padding:2px 8px;border-radius:6px;color:#fff;vertical-align:middle}
  .badge.error{background:var(--err)}.badge.warn{background:var(--warn)}
  .rule{display:inline-block;margin-left:8px;font-size:12px;color:var(--mut);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  .msg{margin-top:6px}
  .where{margin-top:4px;color:var(--mut);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;word-break:break-word}
</style></head>
<body>
<header>
  <h1>${esc(title)}</h1>
  <div class="meta">Full audit of ${files.length} output page${files.length === 1 ? '' : 's'}${generated ? ` · generated ${esc(generated)}` : ''}</div>
</header>
<div class="summary">
  <span class="chip">Verdict: ${verdict}</span>
  <span class="chip">Pages: <b>${files.length}</b></span>
  <span class="chip">Errors: <b style="color:var(--err)">${errors.length}</b></span>
  <span class="chip">Warnings: <b style="color:var(--warn)">${warns.length}</b></span>
</div>
<div class="note">
  WCAG 2.1 AA. <b>ERROR</b> blocks merge for changed pages; <b>WARN</b> is advisory.
  Static analysis — it can't sample pixels behind text over a photo, so spot-check hero/photo sections by eye.
  Fix with the brand's existing tokens (white-on-dark for the red-on-dark cases); see the <code>ada-compliance-scan</code> skill.
</div>
<main>
${fileSections || '<p>No output pages found.</p>'}
</main>
</body></html>
`;
}

main();
