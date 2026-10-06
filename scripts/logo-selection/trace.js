#!/usr/bin/env node
// Trace the two approved studies into vector, so the artwork this flow presents
// as final IS the artwork that was chosen. See traced.js for why.
//
//   npm run logos:trace
//
// Ported from Beyond Infinity's scripts/marks/trace.js (PR #55) — same method,
// simpler input: Beyond Infinity's studies were one bright mark on one dark
// ground and had to be thresholded on luminance. Solas's studies already carry
// a clean alpha channel (logo-selection-assets/design-a-solid.webp and
// design-b-bold.webp are the two study images that were approved, with their
// canvas background already cleared to transparent — see the commit that made
// them transparent), so this thresholds on alpha directly rather than guessing
// a luminance cutoff.
//
// The trace is committed as scripts/logo-selection/traced.json, so the build
// never depends on potrace being installed. Re-run this only when a newly
// approved study needs to replace the current trace.

const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', '..');
const ASSETS = path.join(ROOT, 'demos', 'rodwell-tuohy', 'logo-selection-assets');
const OUT = path.join(__dirname, 'traced.json');
const EXE = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const TMP = process.env.TMPDIR || '/tmp';

const STUDY = { a: 'design-a-solid.webp', b: 'design-b-bold.webp' };

// Chromium decodes the webp and reads back its alpha channel, because potrace
// wants a bitmap and there is no image library in this project on purpose.
async function toPBM(browser, file, dest) {
  const page = await browser.newPage();
  const b64 = fs.readFileSync(file).toString('base64');
  const { w, h, bits } = await page.evaluate(async data => {
    const img = new Image(); img.src = 'data:image/webp;base64,' + data; await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const alpha = [];
    for (let i = 3; i < d.length; i += 4) alpha.push(d[i]);
    return { w: c.width, h: c.height, bits: alpha.map(a => a > 128 ? 1 : 0) };
  }, b64);
  await page.close();
  const stride = Math.ceil(w / 8);
  const buf = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (bits[y * w + x]) buf[y * stride + (x >> 3)] |= 0x80 >> (x & 7);
  fs.writeFileSync(dest, Buffer.concat([Buffer.from(`P4\n${w} ${h}\n`), buf]));
  return { w, h };
}

function extract(svgText) {
  const ds = [...svgText.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
  if (!ds.length) throw new Error('potrace produced no path');
  const tr = /transform="([^"]+)"/.exec(svgText);
  return { d: ds.join(' '), transform: tr ? tr[1] : null };
}

async function main() {
  const browser = await chromium.launch({ executablePath: EXE });
  const out = {};
  try {
    for (const id of ['a', 'b']) {
      const src = path.join(ASSETS, STUDY[id]);
      if (!fs.existsSync(src)) throw new Error(`missing ${STUDY[id]}`);
      const pbm = path.join(TMP, `solas-${id}.pbm`);
      await toPBM(browser, src, pbm);
      const svgPath = path.join(TMP, `solas-${id}.svg`);
      execFileSync('potrace', [pbm, '-s', '-o', svgPath,
        '--turdsize', '18', '--alphamax', '1.0', '--opttolerance', '0.15']);
      const raw = extract(fs.readFileSync(svgPath, 'utf8'));

      const page = await browser.newPage();
      await page.setContent(`<svg id="s" xmlns="http://www.w3.org/2000/svg">`
        + `<g id="outer"><g${raw.transform ? ` transform="${raw.transform}"` : ''}>`
        + `<path d="${raw.d}"/></g></g></svg>`);
      const bb = await page.evaluate(() => {
        const b = document.getElementById('outer').getBBox();
        return { x: b.x, y: b.y, w: b.width, h: b.height };
      });
      await page.close();

      // Normalise into a 100-unit-tall box, padded, centred.
      const PAD = 2, targetH = 100;
      const k = (targetH - PAD * 2) / bb.h;
      const outW = bb.w * k + PAD * 2;
      const tx = PAD - bb.x * k, ty = PAD - bb.y * k;

      out[id] = {
        d: raw.d,
        width: +outW.toFixed(2),
        height: +targetH.toFixed(2),
        transform: `translate(${tx.toFixed(4)} ${ty.toFixed(4)}) scale(${k.toFixed(6)})`
          + (raw.transform ? ` ${raw.transform}` : ''),
        source: STUDY[id],
      };
      console.log(`${id}: ${raw.d.length} chars, ${outW.toFixed(1)}x${targetH} units`);
    }
  } finally { await browser.close(); }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
}

main().catch(e => { console.error('\n' + e.message); process.exit(1); });
