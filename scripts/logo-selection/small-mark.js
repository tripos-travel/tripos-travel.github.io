#!/usr/bin/env node
// A second Banana Stand study per direction, purpose-built for sizes the main
// approved concept can't survive — see traced.js's TRACE_FLOOR_PX. The main
// concept's halftone is dozens of dots per ray; below 28px those dots go
// sub-pixel and the mark washes into a blur (measured, and printed on the
// pages themselves). Rather than falling back to a differently-drawn
// construction at small sizes — which is a DIFFERENT mark, not a small version
// of the chosen one — this generates the same sunburst subject with a
// deliberately coarse, few-dot halftone: still Banana Stand, still the chosen
// composition, just built to hold up small.
//
//   BANANASTAND_TOKEN=… npm run logos:small
//
// Pipeline, all in one script because each step only exists for this one job:
// generate (Banana Stand) -> cut the background to transparent (corner-relative
// flood fill, same tolerance approach used on the original studies) -> trace to
// vector (potrace, identical method to trace.js) -> merge into traced.json
// under 'a-small' / 'b-small' so tracedSvg(mark, {small:true}) can find them.
//
// The raw webp is kept in logo-selection-assets alongside the six treatment
// studies, in case a future round wants to look at what was actually drawn.

const fs = require('fs'), path = require('path'), https = require('https');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { SUBJECT } = require('./designs.js');

const ROOT = path.join(__dirname, '..', '..');
const ASSETS = path.join(ROOT, 'demos', 'rodwell-tuohy', 'logo-selection-assets');
const TRACED_JSON = path.join(__dirname, 'traced.json');
const rawHost = process.env.BANANA_STAND_HOST || process.env.BANANA_STAND_URL
             || process.env.BANANASTAND_URL || 'https://www.bananastandai.com';
const HOST = /^https?:\/\//.test(rawHost) ? rawHost : `https://${rawHost}`;
const TOKEN = process.env.BANANA_STAND_TOKEN || process.env.BANANASTAND_TOKEN;
const EXE = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const TMP = process.env.TMPDIR || '/tmp';

// Same BASE suffix as designs.js, same subject icons — this is a coarseness
// instruction layered on the existing brief, not a new brand direction.
const BASE = 'professional brand identity logo design, flat vector, crisp clean edges, '
  + 'perfectly centred with generous even margin, solid flat background with no gradient '
  + 'and no texture, no photographic elements, no drop shadow, no mockup, no frame, '
  + 'no watermark, no signature';

const COARSE = 'drawn as a halftone gradient of dots, but using very few, very large, bold '
  + 'dots — no more than four or five dots per ray, each dot large and clearly a distinct '
  + 'solid circle, minimal tapering, no fine detail or small dots anywhere, designed to '
  + 'stay legible when shrunk down to a tiny icon';

function promptFor(mark) {
  const s = SUBJECT[mark];
  return `${s.icon}, ${COARSE}, ${s.palette}, ${s.noText}, ${BASE}`.replace(/\s+/g, ' ').trim();
}

function get(url, headers, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('too many redirects'));
    https.get(url, { headers, timeout: 240000 }, res => {
      const { statusCode, headers: h } = res;
      if (statusCode >= 300 && statusCode < 400 && h.location) {
        res.resume();
        return resolve(get(h.location, {}, redirects + 1));
      }
      if (statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${statusCode} for ${url.split('?')[0]}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('timeout', function () { this.destroy(new Error('timed out')); })
      .on('error', reject);
  });
}

async function generate(mark, dest) {
  if (fs.existsSync(dest)) { console.log('  kept   ', path.basename(dest)); return; }
  if (!TOKEN) throw new Error('no Banana Stand token (BANANA_STAND_TOKEN / BANANASTAND_TOKEN)');
  const prompt = promptFor(mark);
  const url = `${HOST}/i/800x800?prompt=${encodeURIComponent(prompt)}&style=web`;
  process.stdout.write(`  fetch   ${path.basename(dest)} … `);
  let buf;
  for (let attempt = 1; ; attempt++) {
    try { buf = await get(url, { 'X-Gen-Token': TOKEN }); break; }
    catch (e) {
      if (attempt >= 6) throw e;
      process.stdout.write(`${e.message.split(' for ')[0]}, retrying … `);
      await new Promise(r => setTimeout(r, attempt * 12000));
    }
  }
  if (buf.length < 1000) throw new Error(`suspiciously small (${buf.length} bytes)`);
  fs.writeFileSync(dest, buf);
  console.log(`${(buf.length / 1024).toFixed(0)} KB`);
}

// Corner-relative flood fill: sample the actual corner pixel (the generated
// ground colour, not assumed) and clear every pixel connected to a corner
// within a small tolerance of it. Fixed-brightness thresholds destroyed a
// near-white tile background earlier in this project for exactly this reason —
// tolerance has to be relative to what the model actually drew, not a guess.
async function makeTransparent(page, srcPath, destPath) {
  const b64 = fs.readFileSync(srcPath).toString('base64');
  const png = await page.evaluate(async data => {
    const img = new Image(); img.src = 'data:image/webp;base64,' + data; await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const { data: d, width: w, height: h } = id;
    const idx = (x, y) => (y * w + x) * 4;
    const corner = idx(0, 0);
    const cr = d[corner], cg = d[corner + 1], cb = d[corner + 2];
    const tol = 8;
    const close = i => Math.abs(d[i] - cr) <= tol && Math.abs(d[i + 1] - cg) <= tol
                     && Math.abs(d[i + 2] - cb) <= tol;
    const seen = new Uint8Array(w * h);
    const stack = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const p = y * w + x;
      if (seen[p]) continue;
      const i = p * 4;
      if (!close(i)) continue;
      seen[p] = 1;
      d[i + 3] = 0;
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    ctx.putImageData(id, 0, 0);
    return c.toDataURL('image/png').slice('data:image/png;base64,'.length);
  }, b64);
  fs.writeFileSync(destPath, Buffer.from(png, 'base64'));
}

function toPBM(page, pngPath, destPath) {
  return page.evaluate(async data => {
    const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const alpha = [];
    for (let i = 3; i < d.length; i += 4) alpha.push(d[i]);
    return { w: c.width, h: c.height, bits: alpha.map(a => a > 128 ? 1 : 0) };
  }, fs.readFileSync(pngPath).toString('base64')).then(({ w, h, bits }) => {
    const stride = Math.ceil(w / 8);
    const buf = Buffer.alloc(stride * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
      if (bits[y * w + x]) buf[y * stride + (x >> 3)] |= 0x80 >> (x & 7);
    fs.writeFileSync(destPath, Buffer.concat([Buffer.from(`P4\n${w} ${h}\n`), buf]));
  });
}

function extractPotrace(svgText) {
  const ds = [...svgText.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
  if (!ds.length) throw new Error('potrace produced no path');
  const tr = /transform="([^"]+)"/.exec(svgText);
  return { d: ds.join(' '), transform: tr ? tr[1] : null };
}

async function traceOne(page, pngPath, id) {
  const pbm = path.join(TMP, `solas-${id}.pbm`);
  await toPBM(page, pngPath, pbm);
  const svgPath = path.join(TMP, `solas-${id}.svg`);
  execFileSync('potrace', [pbm, '-s', '-o', svgPath,
    '--turdsize', '18', '--alphamax', '1.0', '--opttolerance', '0.15']);
  const raw = extractPotrace(fs.readFileSync(svgPath, 'utf8'));

  await page.setContent(`<svg id="s" xmlns="http://www.w3.org/2000/svg">`
    + `<g id="outer"><g${raw.transform ? ` transform="${raw.transform}"` : ''}>`
    + `<path d="${raw.d}"/></g></g></svg>`);
  const bb = await page.evaluate(() => {
    const b = document.getElementById('outer').getBBox();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });

  const PAD = 2, targetH = 100;
  const k = (targetH - PAD * 2) / bb.h;
  const outW = bb.w * k + PAD * 2;
  const tx = PAD - bb.x * k, ty = PAD - bb.y * k;
  return {
    d: raw.d,
    width: +outW.toFixed(2),
    height: +targetH.toFixed(2),
    transform: `translate(${tx.toFixed(4)} ${ty.toFixed(4)}) scale(${k.toFixed(6)})`
      + (raw.transform ? ` ${raw.transform}` : ''),
    source: path.basename(pngPath).replace('.png', '.webp'),
  };
}

async function main() {
  fs.mkdirSync(ASSETS, { recursive: true });
  const raw = { a: path.join(ASSETS, 'design-a-small.webp'), b: path.join(ASSETS, 'design-b-small.webp') };
  for (const [mark, dest] of Object.entries(raw)) await generate(mark, dest);

  const browser = await chromium.launch({ executablePath: EXE });
  const traced = JSON.parse(fs.readFileSync(TRACED_JSON, 'utf8'));
  try {
    const page = await browser.newPage();
    for (const [mark, srcPath] of Object.entries(raw)) {
      const transparentPng = path.join(TMP, `solas-${mark}-small.png`);
      await makeTransparent(page, srcPath, transparentPng);
      traced[`${mark}-small`] = await traceOne(page, transparentPng, `${mark}-small`);
      console.log(`${mark}-small: ${traced[mark + '-small'].d.length} chars, `
        + `${traced[mark + '-small'].width}x100 units`);
    }
  } finally { await browser.close(); }

  fs.writeFileSync(TRACED_JSON, JSON.stringify(traced, null, 2) + '\n');
  console.log(`wrote ${path.relative(ROOT, TRACED_JSON)}`);
}

if (require.main === module) main().catch(e => { console.error('\n' + e.message); process.exit(1); });
module.exports = { promptFor };
