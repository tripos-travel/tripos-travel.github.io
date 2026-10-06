'use strict';
/* Rasterise + print the masters. One browser for the whole run. */
const fs = require('fs'); const path = require('path');

async function renderAll(jobs, svgDir, onProgress) {
  const { chromium } = require('playwright');
  const exe = process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium';
  const b = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
  const p = await b.newPage();
  let i = 0;
  try {
    for (const j of jobs) {
      const file = path.join(svgDir, `${j.svg}.svg`);
      if (!fs.existsSync(file)) throw new Error(`render job references a missing master: ${j.svg}.svg`);
      const svg = fs.readFileSync(file, 'utf8');
      const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      const [vw, vh] = [Number(m[1]), Number(m[2])];
      const w = j.w, h = Math.round(w * vh / vw);
      const bg = j.bg || 'transparent';
      const pad = j.pad || 0;
      const cw = Math.round(w * (1 + 2 * pad));
      const ch = j.square ? cw : Math.round(h + 2 * w * pad);
      const b64 = Buffer.from(svg).toString('base64');
      await p.setViewportSize({ width: Math.max(cw, 1), height: Math.max(ch, 1) });
      await p.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:${bg}}`
        + `.s{width:${cw}px;height:${ch}px;display:flex;align-items:center;justify-content:center}`
        + `img{width:${w}px;height:${h}px}</style><div class="s">`
        + `<img src="data:image/svg+xml;base64,${b64}"></div>`);
      await p.waitForTimeout(60);
      fs.mkdirSync(path.dirname(j.out), { recursive: true });
      if (j.out.endsWith('.pdf')) {
        await p.pdf({ path: j.out, width: `${cw}px`, height: `${ch}px`,
          printBackground: bg !== 'transparent', margin: { top: 0, bottom: 0, left: 0, right: 0 } });
      } else {
        await p.locator('.s').screenshot({ path: j.out, omitBackground: bg === 'transparent' });
      }
      if (onProgress && ++i % 20 === 0) onProgress(i, jobs.length);
    }
  } finally { await b.close(); }
  return jobs.length;
}

async function renderGuide(htmlPath, pdfPath) {
  const { chromium } = require('playwright');
  const exe = process.env.PLAYWRIGHT_CHROMIUM || '/opt/pw-browsers/chromium';
  const b = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
  const p = await b.newPage();
  await p.goto('file://' + htmlPath);
  await p.waitForTimeout(2500);               // let webfonts settle before printing
  await p.pdf({ path: pdfPath, format: 'Letter', printBackground: true,
    margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' } });
  await b.close();
}

module.exports = { renderAll, renderGuide };
