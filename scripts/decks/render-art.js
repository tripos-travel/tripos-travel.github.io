#!/usr/bin/env node
// Render the Solas deck's artwork — the two marks and the wordmark, set in the
// brand's own faces — as PNGs.
//
// PowerPoint has no path primitive and the client will not have the brand's
// display face or Hanken Grotesk installed, so anything whose shape or face
// has to be exact ships as pixels rather than a font request or a redrawn
// shape. The marks come straight from scripts/logo-selection/traced.json —
// the same trace the VisID sheets use (see traced.js) — so the deck and the
// sheet show the identical chosen artwork, never a redrawn approximation of
// it. The wordmark is rendered from TYPE.display (directions.js) via the same
// self-hosted font file the logo-selection pages already use, so it always
// matches the confirmed pick and is never a silent fallback substitute.
//
//   NODE_PATH=/opt/node22/lib/node_modules node scripts/decks/render-art.js
//
// (playwright is a global install in this environment, not a project
// dependency — same pattern as scripts/logo-selection/trace.js, and for the
// same reason: there is no image library in this project on purpose.)

const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { hexOf, TYPE } = require('../logo-selection/directions.js');
const { tracedSvg } = require('../logo-selection/traced.js');

const ROOT = path.join(__dirname, '..', '..');
const FONTS_DIR = path.join(ROOT, 'demos', 'rodwell-tuohy', 'logo-selection-assets', 'fonts');
const FONTS_CSS = path.join(FONTS_DIR, 'fonts.css');
const ART = path.join(__dirname, 'art');
const EXE = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium';
const SCALE = 4;   // a 200px placement still has 800px of pixels behind it

const hex = name => '#' + hexOf(name);

function plan() {
  const jobs = [];
  const push = (name, html, face) => jobs.push({ name, html, face });

  // The two marks, in every colour the deck actually places them in. Every one
  // of these is the traced study, never the drawn construction — the deck shows
  // the artwork that was chosen, the same rule the VisID sheet's lockup follows.
  for (const mark of ['a', 'b'])
    for (const [k, col] of [
      ['rose', hex('Sunburst Rose')], ['berry', hex('Berry')],
      ['ink', hex('Ink')], ['cream', hex('Cream')],
    ]) push(`mark-${mark}-${k}`,
      `<div style="width:480px;height:480px;display:grid;place-items:center">`
      + `${tracedSvg(mark, { size: 440, color: col })}</div>`);

  // The wordmark, set in the brand's confirmed display face (TYPE.display —
  // Lora as of the 2026-09-06 client review, superseding Newsreader) — never
  // typed as a font request, because the client's own machine will not have
  // it installed.
  const DISPLAY = TYPE.display.name;
  const wm = (col, size, weight = 500) => `font-family:'${DISPLAY}';font-weight:${weight};`
    + `color:${col};letter-spacing:.01em;font-size:${size}px;line-height:1;white-space:nowrap`;
  for (const [k, col] of [['ink', hex('Ink')], ['cream', hex('Cream')], ['berry', hex('Berry')]])
    push(`wm-${k}`, `<div style="${wm(col, 150)}">Solas</div>`, DISPLAY);
  push('wm-sub', `<div style="font-family:'${DISPLAY}';font-weight:400;color:${hex('Berry')};`
    + `font-size:52px;letter-spacing:.01em;white-space:nowrap">women&rsquo;s health</div>`, DISPLAY);

  // Type slide specimens — one strip per face, so the deck never has to ask
  // PowerPoint to render either.
  push('type-display', `<div style="width:900px;font-family:'${DISPLAY}';font-weight:500;`
    + `color:${hex('Ink')};font-size:96px;letter-spacing:.01em;line-height:1.05">Solas</div>`
    + `<div style="width:900px;margin-top:10px;font-family:'${DISPLAY}';font-weight:400;`
    + `color:${hex('Berry')};font-size:34px">abcdefghijklmnopqrstuvwxyz &amp; 1234567890</div>`,
    DISPLAY);
  push('type-body', `<div style="width:900px;font-family:'Hanken Grotesk';font-weight:700;`
    + `color:${hex('Ink')};font-size:36px;letter-spacing:0">Abcdefghij 0123456789</div>`
    + `<div style="width:900px;margin-top:12px;font-family:'Hanken Grotesk';font-weight:400;`
    + `color:${hex('Berry')};font-size:22px;line-height:1.4">Body copy, and the uppercase labels `
    + `that do most of the work.</div>`, 'Hanken Grotesk');

  return jobs;
}

async function main() {
  if (!fs.existsSync(FONTS_CSS)) throw new Error(`missing ${FONTS_CSS} — run: npm run logos:fonts`);
  fs.mkdirSync(ART, { recursive: true });
  const jobs = plan();
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: SCALE });
  // Written into the fonts directory itself, so the CSS's own relative woff2
  // URLs resolve without having to rewrite them.
  const tmp = path.join(FONTS_DIR, '_deck-render.html');
  try {
    for (const j of jobs) {
      fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8">`
        + `<link rel="stylesheet" href="fonts.css">`
        + `<style>html,body{margin:0;background:transparent}`
        + `#a{display:inline-block;padding:0}</style><div id="a">${j.html}</div>`);
      await page.goto('file://' + tmp);
      await page.evaluate(() => document.fonts.ready);

      // A missing webfont does not throw — it silently substitutes, and a
      // specimen set in the wrong face is worse than no specimen at all,
      // because it looks like an answer. document.fonts.check() reports false
      // for a face the page has not painted with yet, so ask whether the
      // family actually arrived instead.
      if (j.face) {
        const ok = await page.evaluate(f =>
          [...document.fonts].some(x => x.family === f && x.status === 'loaded'), j.face);
        if (!ok) throw new Error(`${j.name}: "${j.face}" did not load — artwork would show a fallback`);
      }
      const el = await page.$('#a');
      await el.screenshot({ path: path.join(ART, j.name + '.png'), omitBackground: true });
    }
  } finally {
    await browser.close();
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
  console.log(`rendered ${jobs.length} pieces of artwork at ${SCALE}x into scripts/decks/art/`);
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { ART };
