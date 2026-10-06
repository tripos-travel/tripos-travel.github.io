#!/usr/bin/env node
'use strict';
/* The gate. A logo bundle fails quietly — a font-dependent wordmark or a stale
   brand colour both look fine until they are on a client's letterhead. This
   checks the things that actually go wrong.
   Usage: node scripts/logo-asset-kit/check.js <brand> */

const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const brand = process.argv[2];
if (!brand) { console.error('usage: logo-asset-kit/check.js <brand>'); process.exit(2); }
const brandDir = path.join(ROOT, 'demos', brand);
const cfg = JSON.parse(fs.readFileSync(path.join(brandDir, 'logo-asset-kit.config.json'), 'utf8'));
cfg.filePrefix ||= cfg.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
cfg.version ||= 'v1';
cfg.folderName ||= `${cfg.shortName.replace(/[^A-Za-z0-9]+/g, '')}_Logo-Assets_${cfg.version}`;
const PKG = path.join(brandDir, 'logo-asset-kit', cfg.folderName);

const errors = [], warnings = [];
const fail = m => errors.push(m), warn = m => warnings.push(m);

if (!fs.existsSync(PKG)) { console.error(`No kit at ${path.relative(ROOT, PKG)} — run npm run kit ${brand}`); process.exit(1); }

const svgDir = path.join(PKG, '01_Master-Vector/SVG');
const svgs = fs.existsSync(svgDir) ? fs.readdirSync(svgDir).filter(f => f.endsWith('.svg')) : [];
if (!svgs.length) fail('01_Master-Vector/SVG is empty — nothing was composed');

// 1. no live text: a <text> element or a font-family means the logo changes on
//    a machine without the font installed.
for (const f of svgs) {
  const s = fs.readFileSync(path.join(svgDir, f), 'utf8');
  if (/<text[\s>]/.test(s)) fail(`${f}: contains <text> — lettering must be outlined`);
  if (/font-family/i.test(s)) fail(`${f}: references font-family — lettering must be outlined`);
  if (!/<path/.test(s)) fail(`${f}: no <path> data`);
  if (!/viewBox="/.test(s)) fail(`${f}: no viewBox — will not scale predictably`);
}

// 2. no stale palette: every fill must be a colour the config actually declares.
const allowed = new Set();
for (const v of Object.values(cfg.lockups)) for (const c of [v.mark, v.wordmark, v.subline]) if (c) allowed.add(c.toUpperCase());
for (const c of Object.values(cfg.markColours || {})) allowed.add(c.toUpperCase());
for (const c of Object.values(cfg.wordmarkColours || {})) allowed.add(c.toUpperCase());
for (const f of svgs) {
  const s = fs.readFileSync(path.join(svgDir, f), 'utf8');
  for (const m of s.match(/fill="#[0-9A-Fa-f]{6}"/g) || []) {
    const hex = m.slice(6, 13).toUpperCase();
    if (!allowed.has(hex)) fail(`${f}: fill ${hex} is not in the configured colourways — stale palette leaked from the source artwork`);
  }
}

// 3. the folders a client is told to look in must exist and be populated
for (const [dir, min] of [['01_Master-Vector/SVG', 4], ['01_Master-Vector/PDF', 4], ['02_Web/PNG', 12],
                          ['02_Web/Favicon', 5], ['03_Print/PNG-300dpi', 4],
                          ['04_Mobile-and-Social/App-Icon', 3], ['04_Mobile-and-Social/Social', 3],
                          ['05_Fonts', 1], ['06_Brand-Colors', 3]]) {
  const p = path.join(PKG, dir);
  const n = fs.existsSync(p) ? fs.readdirSync(p).filter(f => !f.startsWith('.')).length : 0;
  if (n < min) fail(`${dir}: ${n} file(s), expected at least ${min}`);
}
for (const f of ['00_READ-ME-FIRST.pdf', '02_Web/Favicon/site.webmanifest', '06_Brand-Colors/COLOUR-SPEC.txt'])
  if (!fs.existsSync(path.join(PKG, f))) fail(`missing ${f}`);
if (!fs.existsSync(path.join(PKG, '02_Web/Favicon/favicon.ico'))) warn('favicon.ico missing (pip install Pillow)');

// 4. zero-byte exports — a silent render failure
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const all = walk(PKG);
for (const f of all) if (fs.statSync(f).size === 0) fail(`${path.relative(PKG, f)}: zero bytes`);

// 5. a one-colour option must exist for single-ink printing
if (!Object.keys(cfg.lockups).some(k => /onecolour|one-colour|mono/i.test(k)))
  warn('no one-colour lockup configured — single-ink printing and engraving will have nothing to use');

console.log(`\nLogo asset kit check — ${cfg.name} ${cfg.version}`);
console.log(`Scanned ${all.length} file(s) · ${errors.length} error(s) · ${warnings.length} warning(s)\n`);
for (const w of warnings) console.log(`  ! WARN  ${w}`);
for (const e of errors) console.log(`  ✗ ERROR ${e}`);
if (errors.length) { console.log(`\n✗ Kit is not deliverable. Fix these before sending.\n`); process.exit(1); }
console.log(`\n✓ Kit is deliverable.\n`);
