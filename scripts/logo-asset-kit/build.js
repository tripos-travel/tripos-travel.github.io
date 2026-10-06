#!/usr/bin/env node
'use strict';
/* Build a client's logo asset bundle from demos/<brand>/logo-asset-kit.config.json.
   Usage: node scripts/logo-asset-kit/build.js <brand> [--no-zip] [--out <dir>] */

const fs = require('fs'); const path = require('path');
const { execFileSync } = require('child_process');
const { compose } = require('./lib/compose');
const { buildJobs } = require('./lib/jobs');
const { renderAll, renderGuide } = require('./lib/render');
const { guideHtml, colourSpec, cmyk } = require('./lib/guide');

const ROOT = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const brand = args.find(a => !a.startsWith('--'));
if (!brand) { console.error('usage: logo-asset-kit/build.js <brand> [--no-zip] [--out <dir>]'); process.exit(2); }
const outFlag = args.indexOf('--out');
const brandDir = path.join(ROOT, 'demos', brand);
const cfgPath = path.join(brandDir, 'logo-asset-kit.config.json');
if (!fs.existsSync(cfgPath)) {
  console.error(`No config at demos/${brand}/logo-asset-kit.config.json`);
  console.error(`Copy scripts/logo-asset-kit/config.example.json and fill it in.`);
  process.exit(2);
}
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
cfg.filePrefix ||= cfg.shortName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
cfg.version ||= 'v1';
cfg.folderName ||= `${cfg.shortName.replace(/[^A-Za-z0-9]+/g, '')}_Logo-Assets_${cfg.version}`;
for (const s of ['wordmark', 'subline']) if (cfg[s]) cfg[s].font = path.resolve(brandDir, cfg[s].font);

const OUT = outFlag >= 0 ? path.resolve(args[outFlag + 1]) : path.join(brandDir, 'logo-asset-kit');
const PKG = path.join(OUT, cfg.folderName);
fs.rmSync(PKG, { recursive: true, force: true });
const SVGDIR = path.join(OUT, '.masters');
fs.rmSync(SVGDIR, { recursive: true, force: true });
fs.mkdirSync(SVGDIR, { recursive: true });

(async () => {
  console.log(`\n${cfg.name} — logo bundle ${cfg.version}\n`);

  // 1. lettering to outlines
  console.log('1/6  outlining lettering');
  const tmpCfg = path.join(SVGDIR, '_textcfg.json');
  fs.writeFileSync(tmpCfg, JSON.stringify({ wordmark: cfg.wordmark, subline: cfg.subline }));
  const textJson = path.join(SVGDIR, '_text.json');
  try {
    execFileSync('python3', [path.join(__dirname, 'lib/outline.py'), tmpCfg, textJson], { stdio: 'inherit' });
  } catch {
    console.error('\n  Outlining failed. Install the dependency:  pip install fonttools brotli');
    process.exit(1);
  }
  const text = JSON.parse(fs.readFileSync(textJson, 'utf8'));

  // 2. masters
  console.log('2/6  composing master SVGs');
  const { files, meta } = compose(cfg, text, brandDir);
  for (const dir of ['01_Master-Vector/SVG', '02_Web/SVG'])
    fs.mkdirSync(path.join(PKG, dir), { recursive: true });
  for (const [k, v] of Object.entries(files)) {
    fs.writeFileSync(path.join(SVGDIR, `${cfg.filePrefix}_${k}.svg`), v);
    for (const dir of ['01_Master-Vector/SVG', '02_Web/SVG'])
      fs.writeFileSync(path.join(PKG, dir, `${cfg.filePrefix}_${k}.svg`), v);
  }
  console.log(`     ${Object.keys(files).length} masters`);
  if (cfg.expectedSourceFills) {
    const unexpected = meta.markSourceFills.filter(f => !cfg.expectedSourceFills.includes(f.slice(6, 13)));
    if (unexpected.length) console.log(`     ! source mark carried unexpected fills: ${unexpected.join(' ')} (recoloured anyway)`);
  }

  // 3. exports
  const { jobs } = buildJobs(cfg, PKG);
  console.log(`3/6  rendering ${jobs.length} exports`);
  await renderAll(jobs, SVGDIR, (i, n) => process.stdout.write(`     ${i}/${n}\r`));
  console.log(`     ${jobs.length}/${jobs.length} done`);

  // 4. favicon.ico + manifest
  console.log('4/6  favicon.ico, manifest, colour spec, fonts');
  const fav = path.join(PKG, '02_Web/Favicon');
  try {
    execFileSync('python3', ['-c',
      `from PIL import Image;Image.open(r"${path.join(fav,'favicon-48x48.png')}").convert("RGBA")` +
      `.save(r"${path.join(fav,'favicon.ico')}",sizes=[(16,16),(32,32),(48,48)])`], { stdio: 'pipe' });
  } catch { console.log('     ! favicon.ico skipped (pip install Pillow)'); }
  fs.writeFileSync(path.join(fav, 'site.webmanifest'), JSON.stringify({
    name: cfg.name, short_name: cfg.shortName,
    icons: [{ src: '/android-chrome-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/android-chrome-512.png', sizes: '512x512', type: 'image/png' }],
    theme_color: cfg.iconBackground || cfg.colors.deep, background_color: cfg.colors.cream || '#FFFFFF',
    display: 'standalone' }, null, 2));

  // colours
  const cdir = path.join(PKG, '06_Brand-Colors'); fs.mkdirSync(cdir, { recursive: true });
  fs.writeFileSync(path.join(cdir, 'COLOUR-SPEC.txt'), colourSpec(cfg));
  fs.writeFileSync(path.join(cdir, `${cfg.filePrefix}-palette.json`), JSON.stringify({
    logo: Object.fromEntries(Object.entries(cfg.lockups).map(([k, v]) => [k, v])),
    palette: Object.fromEntries(cfg.palette.map(p => [p.name, {
      hex: p.hex, rgb: [1, 3, 5].map(i => parseInt(p.hex.slice(i, i + 2), 16)),
      cmyk_reference: cmyk(p.hex), use: p.use }])) }, null, 2));
  fs.writeFileSync(path.join(cdir, `${cfg.filePrefix}-palette.css`), ':root{\n' +
    cfg.palette.map(p => `  --${p.name.split('(')[0].trim().toLowerCase().replace(/\s+/g, '-')}:${p.hex};`).join('\n') + '\n}\n');

  // fonts
  const fdir = path.join(PKG, '05_Fonts'); fs.mkdirSync(fdir, { recursive: true });
  for (const f of cfg.fonts || []) fs.copyFileSync(path.resolve(brandDir, f.file), path.join(fdir, f.as));
  fs.writeFileSync(path.join(fdir, 'FONTS-READ-ME.txt'),
    `${cfg.name.toUpperCase()} - TYPEFACES\n${'='.repeat(40)}\n\n` +
    (cfg.fonts || []).map(f => `${f.as.padEnd(34)} ${f.note}`).join('\n') +
    `\n\n${cfg.fontLicence || 'Check each typeface licence before distributing.'}\n\n` +
    `YOU DO NOT NEED THESE FONTS TO USE THE LOGO. Every logo file in this package\n` +
    `has the lettering converted to outlines, so the artwork renders identically on\n` +
    `a machine that has never had them installed. The fonts here are for setting NEW\n` +
    `material - headlines, documents, signage - not for rebuilding the logo.\n` +
    `Never retype the wordmark. Always place the supplied artwork.\n`);

  // 5. guide
  console.log('5/6  usage guide');
  const ghtml = path.join(OUT, '_guide.html');
  fs.writeFileSync(ghtml, guideHtml(cfg, PKG));
  await renderGuide(ghtml, path.join(PKG, '00_READ-ME-FIRST.pdf'));
  fs.rmSync(ghtml, { force: true });

  // 6. zip
  if (!args.includes('--no-zip')) {
    console.log('6/6  zipping');
    const zip = path.join(OUT, `${cfg.folderName}.zip`);
    fs.rmSync(zip, { force: true });
    execFileSync('zip', ['-rq', zip, cfg.folderName, '-x', '.*'], { cwd: OUT });
    const kb = (fs.statSync(zip).size / 1048576).toFixed(1);
    console.log(`\n✓ ${path.relative(ROOT, zip)}  (${kb} MB)`);
  } else { console.log('6/6  zip skipped'); }
  const count = execFileSync('bash', ['-c', `find "${PKG}" -type f | wc -l`]).toString().trim();
  console.log(`  ${count} files in ${cfg.folderName}/`);
  console.log(`\n  Now run:  npm run kit:check ${brand}\n`);
})().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
