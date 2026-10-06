#!/usr/bin/env node
'use strict';

/**
 * craft-scan.js — zero-dependency "does this look designed, or generated?" check
 * for the playbook's static output pages.
 *
 * The ADA scan proves a page is usable; the structure scan proves it's on the
 * beaten trail. Neither says anything about whether it looks like a designer made
 * it. This one encodes the tells that make a page read as machine-made, learned
 * from the builds clients responded to (Element 47, Omni Mold & Die, Wilson &
 * Walker, IntualityAI — see docs/DESIGN-CRAFT.md), and turns them into findings a
 * builder has to answer rather than a vibe a reviewer has to notice.
 *
 * ERROR (blocks the commit gate — these are bugs, not taste):
 *   reveal-hidden     content hidden until JS runs (opacity:0 on a reveal hook)
 *                     with no `.js`/no-js gate: a failed script = a blank page
 *   motion-a11y       animations/transitions with no prefers-reduced-motion rule
 *   lorem             lorem ipsum in shipped copy
 *
 * WARN (a designer would push back — answer it or fix it):
 *   stock-copy        AI-stock phrases ("elevate", "seamless", "unlock", …)
 *   default-type      one family only, or a default face (Inter/Roboto/Poppins/
 *                     Montserrat/Open Sans/Lato/Arial) doing the display job
 *   generic-gradient  the indigo→violet/purple→blue "AI gradient"
 *   emoji-icon        emoji used as icons in headings, buttons, lists or icon slots
 *   card-monotony     most sections are the same N-up grid of look-alike cards
 *   static            no motion at all on a homepage/landing page
 *   default-easing    motion uses only `ease`/`linear`/`ease-in-out` — no curve of its own
 *   no-focus-style    no :focus-visible (or :focus) styling anywhere
 *   placeholder-heavy more than 3 labelled image placeholders
 *   em-dash           em/en dashes in copy, <title>, meta or alt text (the loudest machine-writing tell)
 *   drawer-tabbable   an off-canvas drawer hidden only by transform — its links stay in the tab order
 *   scroll-offset     a sticky/fixed header with no scroll-margin-top / scroll-padding-top
 *
 * Usage:
 *   node scripts/craft-scan.js [paths...]   # default: demos/<brand>/output/*.html
 *   node scripts/craft-scan.js --staged     # only staged output pages
 *   node scripts/craft-scan.js --json       # machine-readable
 *   node scripts/craft-scan.js --quiet      # only files with findings
 *
 * Exit 0 when there are no ERROR findings, 1 otherwise. WARNs never fail.
 * Limitations: a static read, not a browser — it reads inline <style>/<script>
 * and the markup. Linked stylesheets under the brand folder are read too.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

/* ---------------- tiny HTML parser (same shape as ada/structure scans) ---------------- */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'template', 'textarea']);
function parseAttrs(s) {
  const attrs = {}; const re = /([a-zA-Z_:][-\w:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s">]+))?/g; let m;
  while ((m = re.exec(s))) { let v = m[2] || ''; if (v && (v[0] === '"' || v[0] === "'")) v = v.slice(1, -1); attrs[m[1].toLowerCase()] = v; }
  return attrs;
}
function parseHTML(html) {
  const root = { tag: '#root', attrs: {}, children: [], parent: null, text: '' };
  let cur = root, i = 0; const len = html.length;
  while (i < len) {
    if (html[i] === '<') {
      if (html.startsWith('<!--', i)) { const e = html.indexOf('-->', i + 4); i = e === -1 ? len : e + 3; continue; }
      if (html[i + 1] === '!') { const e = html.indexOf('>', i); i = e === -1 ? len : e + 1; continue; }
      const close = html.indexOf('>', i); if (close === -1) break;
      const raw = html.slice(i + 1, close); i = close + 1;
      if (raw[0] === '/') { const name = raw.slice(1).trim().toLowerCase(); let n = cur; while (n && n.tag !== name) n = n.parent; if (n && n.parent) cur = n.parent; continue; }
      const m = raw.match(/^([a-zA-Z][\w:-]*)/); if (!m) continue;
      const tag = m[1].toLowerCase();
      const node = { tag, attrs: parseAttrs(raw.slice(m[1].length)), children: [], parent: cur, text: '' };
      cur.children.push(node);
      if (RAW.has(tag)) { const idx = html.toLowerCase().indexOf(`</${tag}`, i); node.text = html.slice(i, idx === -1 ? len : idx); i = idx === -1 ? len : html.indexOf('>', idx) + 1; continue; }
      if (!VOID.has(tag) && !/\/\s*$/.test(raw)) cur = node;
    } else {
      const next = html.indexOf('<', i); const t = html.slice(i, next === -1 ? len : next);
      if (t.trim()) cur.text += ' ' + t.trim(); i = next === -1 ? len : next;
    }
  }
  return root;
}
function walk(n, fn) { fn(n); n.children.forEach(c => walk(c, fn)); }
function textOf(n) { let s = n.text || ''; if (!RAW.has(n.tag)) n.children.forEach(c => { s += ' ' + textOf(c); }); return s; }
const cls = n => (n.attrs.class || '').trim().split(/\s+/).filter(Boolean);

/* ---------------- checks ---------------- */
const STOCK = [
  /\belevate (your|the|every)\b/i, /\bseamless(ly)?\b/i, /\bunlock (your|the|new)\b/i, /\bcutting[- ]edge\b/i,
  /\brevolutioni[sz]e/i, /\bgame[- ]chang/i, /\bin today['’]s (fast[- ]paced|digital)/i, /\bsupercharge/i,
  /\bnext[- ]level\b/i, /\bharness the power\b/i, /\bunleash\b/i, /\bempower(s|ing)? (you|your|businesses)\b/i,
  /\bdelve\b/i, /\btapestry\b/i, /\blook no further\b/i, /\bwelcome to (our|the)\b/i, /\bone[- ]stop shop\b/i,
  /\bstate[- ]of[- ]the[- ]art\b/i, /\btake (it|your \w+) to the next level\b/i, /\bembark\b/i, /\bin the realm of\b/i,
];
const DEFAULT_FACES = ['inter', 'roboto', 'poppins', 'montserrat', 'open sans', 'lato', 'arial', 'helvetica', 'system-ui', 'sans-serif'];
// Pictographic emoji only — typographic marks like ✓ ✗ ★ → are fine.
const EMOJI = /(?![\u2713\u2714\u2717\u2718\u2605\u2606\u2192\u2190])[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/u;
const GENERIC_GRADIENT = /gradient\([^)]*(#6366f1|#4f46e5|#8b5cf6|#7c3aed|#a855f7|#9333ea|indigo|blueviolet|rebeccapurple)[^)]*(#3b82f6|#2563eb|#06b6d4|#ec4899|#d946ef|#8b5cf6|#a855f7|violet|purple|blue)/i;

function linkedCss(file, root) {
  let css = '';
  walk(root, n => {
    if (n.tag === 'link' && /stylesheet/i.test(n.attrs.rel || '') && n.attrs.href && !/^https?:|^\/\//.test(n.attrs.href)) {
      const p = path.resolve(path.dirname(file), n.attrs.href.split(/[?#]/)[0]);
      if (p.startsWith(ROOT) && fs.existsSync(p)) css += '\n' + fs.readFileSync(p, 'utf8');
    }
  });
  return css;
}

function scanFile(file) {
  const html = fs.readFileSync(file, 'utf8');
  const root = parseHTML(html);
  const out = [];
  const add = (level, rule, msg, detail) => out.push({ level, rule, msg, detail });

  let css = '', js = '';
  walk(root, n => { if (n.tag === 'style') css += '\n' + n.text; if (n.tag === 'script' && !n.attrs.src) js += '\n' + n.text; });
  walk(root, n => { if (n.attrs.style) css += `\n[inline]{${n.attrs.style}}`; });
  css += linkedCss(file, root);
  const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const bodyNode = (() => { let b = null; walk(root, n => { if (!b && n.tag === 'body') b = n; }); return b || root; })();
  const copy = textOf(bodyNode).replace(/\s+/g, ' ');
  const base = path.basename(file);
  const isLanding = /home|landing|index/i.test(base);

  // ERROR: lorem ipsum
  if (/lorem ipsum|dolor sit amet/i.test(copy)) add('ERROR', 'lorem', 'Lorem ipsum in shipped copy.', 'Use real copy from the brief/source, or a labelled "[Copy pending: …]" slot.');

  // ERROR: reveal content hidden with no JS gate
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g; let m;
  const hiddenHooks = [];
  while ((m = ruleRe.exec(cssNoComments))) {
    const sel = m[1].trim(), decl = m[2];
    // A CSS-only entrance (opacity:0 + a forwards animation) runs without JS — not a trap.
    if (/opacity\s*:\s*0(\.0+)?\s*(;|!|$)/i.test(decl) && !/animation\s*:/i.test(decl) && /reveal|\[data-(reveal|animate|aos|inview)|\.(fade|anim|appear)/i.test(sel)) {
      const parts = sel.split(',').map(s => s.trim()).filter(s => !/^@/.test(s));
      const ungated = parts.filter(s => !/^(html)?\.(js|has-js|motion|motion-ok|anim|animate|no-reduced)\b|^:root\.(js|motion)\b|^html\[data-(js|motion)\]/i.test(s) && !/\.(in|is-in|visible|is-visible|revealed)\b/.test(s));
      if (ungated.length) hiddenHooks.push(ungated[0]);
    }
  }
  if (hiddenHooks.length) add('ERROR', 'reveal-hidden', 'Scroll-reveal content is hidden before JS runs, with no JS gate.',
    `Selector "${hiddenHooks[0]}" sets opacity:0 unconditionally. Scope it: \`.js [data-reveal]{opacity:0}\` and add the class from script (document.documentElement.classList.add('js')). A blocked or failed script must still show the page.`);

  // ERROR: motion without reduced-motion handling
  // Real motion = keyframes, running animations, rAF loops, or reveal/transform transitions.
  // A plain hover colour transition is not motion that needs a reduced-motion fallback.
  const hasMotion = /@keyframes|animation\s*:|animation-name\s*:|transition\s*:|requestAnimationFrame/i.test(css + js);
  const hasBigMotion = /@keyframes|animation\s*:|animation-name\s*:|requestAnimationFrame|IntersectionObserver/i.test(css + js);
  const handlesReduced = /prefers-reduced-motion/i.test(css + js);
  if (hasBigMotion && !handlesReduced) add('ERROR', 'motion-a11y', 'Page animates but never checks prefers-reduced-motion.',
    'Add `@media (prefers-reduced-motion: reduce)` that stops animation and shows revealed content, and gate rAF/canvas loops on matchMedia.');

  // WARN: stock copy
  const hits = [];
  STOCK.forEach(re => { const h = copy.match(re); if (h) hits.push(h[0]); });
  if (hits.length) add('WARN', 'stock-copy', `AI-stock phrasing: ${[...new Set(hits)].slice(0, 6).map(h => `"${h}"`).join(', ')}.`,
    'Say the specific thing instead: the client\'s own words, a number, a place, a name. See DESIGN-CRAFT.md → Copy.');

  // WARN: typography
  const fams = new Set();
  const famRe = /font-family\s*:\s*([^;}\n]+)/gi;
  while ((m = famRe.exec(cssNoComments))) {
    const first = m[1].split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
    if (first && !/^var\(/.test(first) && first !== 'inherit') fams.add(first);
  }
  const varFams = []; const vRe = /--[\w-]*(font|display|serif|sans|heading|body|mono|type)[\w-]*\s*:\s*([^;}\n]+)/gi;
  while ((m = vRe.exec(cssNoComments))) { const f = m[2].split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase(); if (f && !/^\d|^var\(|px|rem|em$/.test(f)) { fams.add(f); varFams.push(f); } }
  // Families also arrive via @font-face and Google Fonts <link>s.
  const ffRe = /@font-face\s*\{[^}]*font-family\s*:\s*["']?([^"';}]+)/gi;
  while ((m = ffRe.exec(cssNoComments))) fams.add(m[1].trim().toLowerCase());
  walk(root, n => {
    if (n.tag === 'link' && /fonts\.googleapis\.com/.test(n.attrs.href || '')) {
      (n.attrs.href.match(/family=([^:&]+)/g) || []).forEach(f => fams.add(decodeURIComponent(f.slice(7)).replace(/\+/g, ' ').toLowerCase()));
    }
  });
  const realFams = [...fams].filter(f => !['sans-serif', 'serif', 'monospace', 'system-ui', 'ui-monospace', 'inherit'].includes(f));
  const displayVar = (cssNoComments.match(/--[\w-]*(display|heading|serif)[\w-]*\s*:\s*["']?([^,;"'}\n]+)/i) || [])[2];
  const displayFace = (displayVar || '').trim().toLowerCase();
  // One variable family worked across its width axis (Element 47's Archivo) is a system, not a default.
  const usesWidthAxis = /font-stretch\s*:\s*\d|font-variation-settings\s*:[^;]*wdth/i.test(cssNoComments);
  if (realFams.length <= 1 && !(usesWidthAxis && realFams.length === 1 && !DEFAULT_FACES.includes(realFams[0]))) add('WARN', 'default-type', `One type family only (${realFams[0] || 'system default'}).`,
    'Pair a characterful display face with a workhorse text face (e.g. Cormorant Garamond + Jost, Sora + Inter + a mono for data). Type is the fastest tell.');
  else if (displayFace && DEFAULT_FACES.includes(displayFace)) add('WARN', 'default-type', `Display face is a default (${displayFace}).`,
    'Headlines carry the brand — give them a face with a point of view; keep the default for body text.');

  // WARN: generic gradient
  if (GENERIC_GRADIENT.test(cssNoComments)) add('WARN', 'generic-gradient', 'Indigo→violet / purple→blue gradient — the stock "AI" palette.',
    'Pull color from the brand (logo, product, place). If a gradient earns its place, build it from brand tokens.');

  // WARN: emoji as icons
  const emojiSpots = [];
  walk(bodyNode, n => {
    const own = (n.text || '').trim();
    if (!own || !EMOJI.test(own)) return;
    const iconish = /^h[1-6]$|^(button|li|dt)$/.test(n.tag) || cls(n).some(c => /icon|badge|feature|bullet/i.test(c)) || own.length <= 3;
    if (iconish) emojiSpots.push(own.slice(0, 20));
  });
  if (emojiSpots.length) add('WARN', 'emoji-icon', `Emoji used as icons (${emojiSpots.length}×, e.g. "${emojiSpots[0]}").`,
    'Use a drawn icon set consistent with the brand stroke, a number, or nothing — emoji icons read as template.');

  // WARN: card monotony — sections dominated by a uniform grid of ≥3 same-class siblings
  const sections = []; walk(bodyNode, n => { if (n.tag === 'section') sections.push(n); });
  let uniform = 0, maxRun = 0, run = 0;
  sections.forEach(s => {
    let found = false;
    walk(s, n => {
      if (found || n.children.length < 3) return;
      const kids = n.children.filter(c => ['div', 'article', 'a', 'li'].includes(c.tag));
      if (kids.length < 3 || kids.length !== n.children.filter(c => !RAW.has(c.tag)).length) return;
      const k0 = cls(kids[0])[0]; if (!k0) return;
      if (kids.every(k => cls(k)[0] === k0) && kids.every(k => k.children.some(c => /^h[2-4]$/.test(c.tag)))) found = true;
    });
    if (found) { uniform++; run++; maxRun = Math.max(maxRun, run); } else run = 0;
  });
  if (sections.length >= 4 && (uniform / sections.length > 0.5 || maxRun >= 3)) add('WARN', 'card-monotony',
    `${uniform} of ${sections.length} sections are uniform card grids (longest run: ${maxRun}).`,
    'Vary the composition: split/asymmetric layouts, a full-bleed image band, a numbered list, a stat row, an editorial quote, a gallery. Cards are one tool, not the page.');

  // WARN: static landing page
  if (isLanding && !hasMotion) add('WARN', 'static', 'A homepage with no motion at all.',
    'Add a restrained motion layer: staggered reveals, a hero entrance, hover states with a real easing curve. See DESIGN-CRAFT.md → Motion.');

  // WARN: default easing only
  if (hasMotion) {
    const custom = /cubic-bezier\(|--ease/i.test(css) || /easeOut|ease\w*\s*=|Math\.pow\(1\s*-/i.test(js);
    if (!custom) add('WARN', 'default-easing', 'Motion uses only built-in easing keywords.',
      'Define one or two easing tokens (e.g. --ease-out: cubic-bezier(.2,.7,.2,1)) and use them everywhere — consistent physics is what makes motion feel designed.');
  }

  // WARN: focus styles
  if (!/:focus-visible|:focus\b/i.test(css)) add('WARN', 'no-focus-style', 'No :focus-visible styling.',
    'Give keyboard focus a visible, on-brand ring (outline in an accent token with offset).');

  // WARN: placeholders
  let ph = 0; walk(bodyNode, n => { if (cls(n).some(c => /placeholder|img-ph|ph-slot/i.test(c))) ph++; });
  if (ph > 3) add('WARN', 'placeholder-heavy', `${ph} labelled image placeholders.`,
    'Pull real imagery from the source site, or generate on-brand via brand-imagery. Placeholders are fine in a draft; a page made of them isn\'t a design.');

  // WARN: em dashes in copy, title, meta description, alt text
  let dashText = copy;
  walk(root, n => {
    if (n.tag === 'title') dashText += ' ' + textOf(n);
    if (n.tag === 'meta' && /description|og:|twitter:/i.test((n.attrs.name || '') + (n.attrs.property || ''))) dashText += ' ' + (n.attrs.content || '');
    if (n.tag === 'img' && n.attrs.alt) dashText += ' ' + n.attrs.alt;
  });
  const dashes = (dashText.match(/\s[—–]\s|\w—\w/g) || []).length;
  if (dashes) add('WARN', 'em-dash', `${dashes} em/en dash${dashes > 1 ? 'es' : ''} in copy, title, meta or alt text.`,
    'Replace with a period, comma or colon. Clients read dashes as machine-written (Wilson & Walker v1 review).');

  // WARN: off-canvas drawer hidden only by transform
  const drawerRe = /([^{}]*(drawer|offcanvas|off-canvas|mobile-menu|nav-panel|flyout)[^{}]*)\{([^{}]*)\}/gi; let d; let tabbable = null;
  while ((d = drawerRe.exec(cssNoComments))) {
    const sel = d[1], decl = d[3];
    if (/is-open|open\]|\.open|\[open|active|:target/i.test(sel)) continue;
    if (/translate(X)?\(\s*(-)?100%/i.test(decl) && !/visibility\s*:\s*hidden|display\s*:\s*none/i.test(decl)) tabbable = sel.trim();
  }
  if (tabbable && !/\binert\b/.test(html) && !/\.inert\s*=/.test(js)) add('WARN', 'drawer-tabbable', `Closed drawer "${tabbable}" is only moved off-screen.`,
    'Add visibility:hidden (with a delayed visibility transition) or the inert attribute when closed, so its links leave the tab order.');

  // WARN: sticky/fixed header without scroll offset
  const stickyHeader = /(header|\.nav|\.site-header|\.topbar|\.masthead)[^{}]*\{[^{}]*position\s*:\s*(sticky|fixed)/i.test(cssNoComments);
  if (stickyHeader && !/scroll-margin-top|scroll-padding-top/i.test(cssNoComments)) add('WARN', 'scroll-offset', 'Sticky header but no scroll offset — anchor links land under it.',
    'Set html{scroll-padding-top:<header height>} or [id]{scroll-margin-top:…}.');

  return out;
}

/* ---------------- file selection ---------------- */
function defaultFiles() {
  const dir = path.join(ROOT, 'demos'); const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const b of fs.readdirSync(dir)) {
    const o = path.join(dir, b, 'output');
    if (fs.existsSync(o) && fs.statSync(o).isDirectory()) fs.readdirSync(o).filter(f => f.endsWith('.html')).forEach(f => files.push(path.join(o, f)));
  }
  return files;
}
function stagedFiles() {
  try {
    return execSync('git diff --cached --name-only --diff-filter=ACM', { cwd: ROOT, encoding: 'utf8' })
      .split('\n').filter(f => /^demos\/.+\/output\/.+\.html$/.test(f)).map(f => path.join(ROOT, f));
  } catch { return []; }
}

function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes('--json'), quiet = argv.includes('--quiet'), staged = argv.includes('--staged');
  const paths = argv.filter(a => !a.startsWith('--'));
  const files = staged ? stagedFiles() : paths.length ? paths.map(p => path.resolve(p)) : defaultFiles();
  const results = files.filter(f => fs.existsSync(f)).map(f => ({ file: path.relative(ROOT, f), findings: scanFile(f) }));
  const errors = results.reduce((a, r) => a + r.findings.filter(x => x.level === 'ERROR').length, 0);
  const warnings = results.reduce((a, r) => a + r.findings.filter(x => x.level === 'WARN').length, 0);

  if (json) { process.stdout.write(JSON.stringify({ files: results.length, errors, warnings, results }, null, 2) + '\n'); process.exit(errors ? 1 : 0); }

  console.log('Craft scan — does it look designed, or generated?');
  console.log(`Scanned ${results.length} file(s) · ${errors} error(s) · ${warnings} warning(s)\n`);
  for (const r of results) {
    if (!r.findings.length) { if (!quiet) console.log(`✓ ${r.file}`); continue; }
    console.log(r.file);
    for (const f of r.findings) {
      console.log(`  ${f.level === 'ERROR' ? '✗ ERROR' : '! WARN '} [${f.rule}] ${f.msg}`);
      if (f.detail) console.log(`         ${f.detail}`);
    }
    console.log('');
  }
  console.log(errors ? `✗ ${errors} blocking craft issue(s). Fix these before committing.` : `✓ No blocking craft issues.${warnings ? ` (${warnings} warning(s) — answer or fix; see docs/DESIGN-CRAFT.md)` : ''}`);
  process.exit(errors ? 1 : 0);
}

if (require.main === module) main();
module.exports = { scanFile };
