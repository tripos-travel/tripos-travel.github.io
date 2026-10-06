#!/usr/bin/env node
'use strict';
/* Scaffold a logo asset kit config for a brand that has none.
   Inspects the brand folder and answers the questions a teammate would otherwise
   have to dig for: which artwork is the mark, which font files exist, what
   colours are already in play.
   Usage: node scripts/logo-asset-kit/init.js <brand> [--force] */

const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const brand = args.find(a => !a.startsWith('--'));
if (!brand) { console.error('usage: logo-asset-kit/init.js <brand> [--force]'); process.exit(2); }

const brandDir = path.join(ROOT, 'demos', brand);
if (!fs.existsSync(brandDir)) { console.error(`No such brand: demos/${brand}`); process.exit(2); }
const outPath = path.join(brandDir, 'logo-asset-kit.config.json');
if (fs.existsSync(outPath) && !args.includes('--force')) {
  console.error(`demos/${brand}/logo-asset-kit.config.json already exists. Use --force to overwrite.`);
  process.exit(2);
}

const html = fs.readdirSync(brandDir).filter(f => f.endsWith('.html'));
console.log(`\nScaffolding a logo bundle config for demos/${brand}\n`);

// --- candidate marks: every labelled <svg> carrying real path data ---
const marks = [];
for (const f of html) {
  const s = fs.readFileSync(path.join(brandDir, f), 'utf8');
  const re = /<svg[^>]*aria-label="([^"]+)"[^>]*>/g;
  let m;
  while ((m = re.exec(s))) {
    const end = s.indexOf('</svg>', m.index);
    const body = s.slice(m.index, end);
    const paths = (body.match(/<path/g) || []).length;
    const bytes = end - m.index;
    if (bytes > 800) marks.push({ file: f, label: m[1], paths, bytes,
      fills: [...new Set(body.match(/fill="#[0-9A-Fa-f]{6}"/g) || [])].map(x => x.slice(6, 13)) });
  }
}
marks.sort((a, b) => b.bytes - a.bytes);
console.log('Candidate marks (largest artwork first — the real mark is usually the biggest):');
if (!marks.length) console.log('  none found. You need an <svg aria-label="..."> with path data.');
marks.slice(0, 8).forEach((m, i) =>
  console.log(`  ${i === 0 ? '→' : ' '} ${m.file}  "${m.label}"  ${m.paths} path(s), ${(m.bytes/1024).toFixed(1)}KB, fills: ${m.fills.join(' ') || 'none'}`));

// --- fonts on disk ---
const fontDirs = [];
(function walk(d, depth) {
  if (depth > 3) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) { if (e.name === 'logo-asset-kit' || e.name === 'node_modules') continue; walk(path.join(d, e.name), depth + 1); }
    else if (/\.(woff2|woff|ttf|otf)$/i.test(e.name)) fontDirs.push(path.relative(brandDir, path.join(d, e.name)));
  }
})(brandDir, 0);
console.log(`\nFont files found: ${fontDirs.length}`);
fontDirs.slice(0, 10).forEach(f => console.log(`    ${f}`));
if (fontDirs.length) console.log('  (run `python3 scripts/logo-asset-kit/lib/fontinfo.py demos/' + brand + '/<file>` to see family, weight axis and glyph coverage)');

// --- colours already in play ---
const counts = {};
for (const f of html) for (const hex of (fs.readFileSync(path.join(brandDir, f), 'utf8').match(/#[0-9A-Fa-f]{6}/g) || []))
  counts[hex.toUpperCase()] = (counts[hex.toUpperCase()] || 0) + 1;
const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log('\nMost-used colours in this brand (sanity-check against what the client approved):');
top.forEach(([h, n]) => console.log(`    ${h}  x${n}`));

// --- write the scaffold ---
const ex = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.example.json'), 'utf8'));
const pretty = brand.split(/[-_]/).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
ex.name = `TODO ${pretty} full legal/brand name`;
ex.shortName = pretty.split(' ')[0];
ex.direction = 'TODO the approved direction name';
ex.filePrefix = brand.split(/[-_]/)[0];
ex.mark = { from: marks[0] ? marks[0].file : 'TODO the page holding the approved mark',
            ariaLabel: marks[0] ? marks[0].label : 'TODO the aria-label on that <svg>' };
ex.expectedSourceFills = marks[0] ? marks[0].fills : [];
if (fontDirs.length) {
  ex.wordmark.font = fontDirs[0] + '   TODO confirm this is the wordmark face';
  if (ex.subline) ex.subline.font = (fontDirs[1] || fontDirs[0]) + '   TODO confirm';
}
ex.wordmark.text = 'TODO the wordmark, exactly as it should be set';
if (ex.subline) ex.subline.text = 'TODO the subline, or delete this whole block if there is none';
ex._TODO = [
  'Every value marked TODO must be replaced before this will build.',
  'Take wordmark/subline weight and tracking from the CSS of the APPROVED lockup — do not eyeball them.',
  'lockups: one entry per colourway, naming the colour of EVERY part. This is where a multi-tone logo is declared.',
  'Confirm the mark above is the approved direction, not an earlier one. The build cannot tell.',
  'Then: npm run kit ' + brand + '  &&  npm run kit:check ' + brand,
];
fs.writeFileSync(outPath, JSON.stringify(ex, null, 2) + '\n');
console.log(`\n✓ Wrote demos/${brand}/logo-asset-kit.config.json`);
console.log(`  Replace every TODO, then:  npm run kit ${brand}\n`);
