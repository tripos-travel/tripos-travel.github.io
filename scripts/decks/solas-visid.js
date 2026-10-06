#!/usr/bin/env node
// Solas — the six-slide deck. Cover, one slide per direction, colour, type,
// and a sign-off slide — pulled from the same framework Beyond Infinity's
// round used (PR #55, scripts/decks/beyond-infinity-visid.js): a short deck
// built from the same content and artwork the VisID sheet already specifies,
// not a second, hand-typed description of it.
//
// Beyond Infinity's own round cut a nineteen-slide deck down to five with one
// note: "Give me one version of each. And then that way we can choose." Solas
// never had the nineteen-slide version, so this starts at the short one —
// but adds a sixth slide Beyond Infinity's didn't need, because that round's
// ask was a decision made on a call and this one is a document a boss signs.
//
// Every mark and every wordmark placed here is artwork from scripts/decks/art/
// (run: npm run deck:art) — PowerPoint has no path primitive and the client
// will not have Newsreader or Hanken Grotesk installed, so nothing whose shape
// or face has to be exact is typed as a font request.

const pptxgen = require('pptxgenjs');
const fs = require('fs'), path = require('path');
const { A, B, PALETTE, COLOURWAYS, TYPE, hexOf } = require('../logo-selection/directions.js');
const { TREATMENTS } = require('../logo-selection/marks.js');
const { ratio } = require('../logo-selection/color.js');

const ART = path.join(__dirname, 'art');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'demos', 'rodwell-tuohy', 'Solas-VisID.pptx');

const art = n => {
  const p = path.join(ART, n + '.png');
  if (!fs.existsSync(p)) throw new Error(`missing artwork ${n}.png — run: npm run deck:art`);
  return p;
};
const treatmentName = id => TREATMENTS.find(t => t.id === id).name;
const stripHtml = s => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const hex = name => '#' + hexOf(name);

// The deck's own shell. Cream, not the void Beyond Infinity's brand used — the
// Solas palette comment is explicit that the system is light-first "because
// the name means light", and a deck for a light-first brand that opens on a
// dark slide is arguing with its own brief before slide one.
const BG = hex('Cream'), CARD = hex('Peach Soft'), HAIR = hex('Peach');
const FG = hex('Ink'), FG2 = hex('Berry'), ACCENT = hex('Sunburst Rose'), DEEP = hex('Anchor');
// Newsreader/Hanken Grotesk are shipped as artwork wherever the face itself is
// the point; live, editable slide text uses the same fallback chains the
// pages already document for those two faces (directions.js's TYPE), so a
// caption on a machine without either font still lands in the same family.
const HEAD = 'Georgia', UI = 'Helvetica Neue';

const P = new pptxgen();
P.layout = 'LAYOUT_WIDE';           // 13.33 x 7.5in — NOT 'LAYOUT_16x9' (10in wide)
P.author = 'YohDev'; P.company = 'YohDev';
P.title = 'Solas Women’s Health — VisID';
P.subject = 'Two logo directions, one palette, one face, and a decision to sign';

const W = 13.33, H = 7.5, M = 0.72;
const slide = (bg = BG) => { const s = P.addSlide(); s.background = { color: bg }; return s; };

const eyebrow = (s, t, x, y) => s.addText(t.toUpperCase(), { x, y, w: W - x - M, h: 0.26,
  fontFace: UI, fontSize: 10.5, bold: true, charSpacing: 2.2, color: ACCENT });
const heading = (s, t, x, y, size = 30, color = FG) => s.addText(t, { x, y, w: W - x - M, h: size / 46,
  fontFace: HEAD, fontSize: size, bold: true, color });
const body = (s, t, x, y, w, size = 13.5, color = FG2) => s.addText(t, { x, y, w, h: 0.9,
  fontFace: UI, fontSize: size, color, lineSpacingMultiple: 1.32, valign: 'top' });
const footer = (s, t) => s.addText(t, { x: M, y: H - 0.5, w: W - M * 2, h: 0.3,
  fontFace: UI, fontSize: 9.5, color: FG2, charSpacing: 0.6 });

// ── 1 · cover ─────────────────────────────────────────────────────────────────
{
  const s = slide();
  s.addImage({ path: art('wm-ink'), x: M, y: 1.7, w: 4.86, h: 0.79 });
  s.addImage({ path: art('wm-sub'), x: M + 0.02, y: 2.56, w: 3.37, h: 0.34 });
  s.addShape(P.ShapeType.rect, { x: M, y: 3.28, w: 1.5, h: 0.035, fill: { color: ACCENT } });
  s.addText('Two directions. One version of each.', { x: M, y: 3.52, w: 7.2, h: 0.5,
    fontFace: HEAD, fontSize: 21, bold: true, color: FG });
  body(s, 'Daybreak and Radiance, each reduced to the mark, the palette and the face that ships — so one can be signed off and sent to build.', M, 4.14, 7.0, 14);
  // the two marks, small, as a promise of what the next two slides hold
  s.addImage({ path: art('mark-a-rose'), x: 9.55, y: 2.15, w: 1.55, h: 1.55 });
  s.addImage({ path: art('mark-b-rose'), x: 11.25, y: 2.15, w: 1.55, h: 1.55 });
  s.addText('Daybreak', { x: 9.4, y: 3.78, w: 1.85, h: 0.25, fontFace: UI, fontSize: 10, bold: true, color: FG2, align: 'center', charSpacing: 1.2 });
  s.addText('Radiance', { x: 11.1, y: 3.78, w: 1.85, h: 0.25, fontFace: UI, fontSize: 10, bold: true, color: FG2, align: 'center', charSpacing: 1.2 });
  footer(s, 'Solas Women’s Health  ·  Visual identity, options A and B  ·  YohDev');
}

// ── 2 & 3 · one slide per direction ───────────────────────────────────────────
function directionSlide(d, n) {
  const s = slide();
  eyebrow(s, `Option ${d.option} of two`, M, 0.56);
  heading(s, d.name, M, 0.88, 38);
  s.addText(`“${d.answersTo}”`, { x: M, y: 1.6, w: 5.2, h: 0.6,
    fontFace: HEAD, fontSize: 15, italic: false, color: FG2 });
  body(s, stripHtml(d.para), M, 2.34, 5.2, 12.5);

  // the mark, given the room a mark needs, on the quiet field the sheet uses
  s.addShape(P.ShapeType.roundRect, { x: 6.5, y: 0.9, w: 6.11, h: 3.5, rectRadius: 0.06,
    fill: { color: CARD }, line: { color: HAIR, width: 0.75 } });
  s.addImage({ path: art(`mark-${d.mark}-rose`), x: 8.05, y: 1.28, w: 2.9, h: 2.42 });
  s.addText(`The mark  ·  ${treatmentName(d.recommend).toLowerCase()} treatment`, { x: 6.5, y: 3.78, w: 6.11, h: 0.28,
    fontFace: UI, fontSize: 9.5, bold: true, color: FG2, align: 'center', charSpacing: 1.0 });

  // one honest trade-off, not the full three-item list — a deck slide, unlike
  // the VisID sheet, is read once and has room to make one thing land
  s.addShape(P.ShapeType.roundRect, { x: 6.5, y: 4.6, w: 6.11, h: 1.72, rectRadius: 0.06,
    fill: { color: 'FFFFFF' }, line: { color: HAIR, width: 0.75 } });
  s.addText('WORTH KNOWING', { x: 6.78, y: 4.78, w: 5.6, h: 0.24, fontFace: UI, fontSize: 9.5, bold: true, color: ACCENT, charSpacing: 1.8 });
  s.addText(d.honest[0], { x: 6.78, y: 5.06, w: 5.6, h: 1.15, fontFace: UI, fontSize: 11.5, color: FG, lineSpacingMultiple: 1.3 });

  footer(s, `${d.name}  ·  ${d.strength}`);
  return s;
}
directionSlide(A, 1);
directionSlide(B, 2);

// ── 4 · colour ────────────────────────────────────────────────────────────────
{
  const s = slide();
  eyebrow(s, 'Colour', M, 0.56);
  heading(s, 'One palette, both directions.', M, 0.88, 30);
  body(s, 'Both options share this palette rather than each getting its own — the choice on the next slide is the mark, not the brand. Sunburst Rose is decorative only: it carries the mark and never a sentence, which is why Berry sits beside it as the text-safe sibling.', M, 1.58, 11.6, 12.5);

  // the seven swatches
  const n7 = 7, gap7 = 0.12, cw7 = (W - M * 2 - gap7 * (n7 - 1)) / n7;
  PALETTE.forEach((c, i) => {
    const x = M + i * (cw7 + gap7), y = 2.62;
    s.addShape(P.ShapeType.rect, { x, y, w: cw7, h: 0.62, fill: { color: c.hex },
      line: { color: HAIR, width: 0.5 } });
    s.addText(c.name, { x, y: y + 0.7, w: cw7, h: 0.42, fontFace: UI, fontSize: 9.5, bold: true, color: FG });
    s.addText(`#${c.hex}`, { x, y: y + 1.06, w: cw7, h: 0.2, fontFace: UI, fontSize: 8.5, color: FG2 });
  });

  // the four colourways, shown on Daybreak — Radiance takes the same four
  s.addText('Four colourways  ·  shown here on Daybreak; Radiance takes the same four', { x: M, y: 4.28, w: 8, h: 0.26,
    fontFace: UI, fontSize: 10.5, bold: true, color: ACCENT, charSpacing: 1.0 });
  const n4 = 4, gap4 = 0.16, cw4 = (W - M * 2 - gap4 * (n4 - 1)) / n4;
  COLOURWAYS.forEach((w, i) => {
    const x = M + i * (cw4 + gap4), y = 4.62;
    const rm = ratio(w.mark, w.ground);
    s.addShape(P.ShapeType.roundRect, { x, y, w: cw4, h: 2.02, rectRadius: 0.05,
      fill: { color: w.ground }, line: { color: HAIR, width: 0.75 } });
    const markKey = w.mark === hexOf('Sunburst Rose') ? 'rose' : w.mark === hexOf('Berry') ? 'berry' : 'ink';
    s.addImage({ path: art(`mark-a-${markKey}`), x: x + cw4 / 2 - 0.42, y: y + 0.22, w: 0.84, h: 0.7 });
    s.addText('SOLAS', { x, y: y + 1.02, w: cw4, h: 0.24, fontFace: HEAD, fontSize: 12.5, bold: true,
      color: '#' + w.word, align: 'center', charSpacing: 1.4 });
    s.addText(w.label, { x: x + 0.14, y: y + 1.42, w: cw4 - 0.28, h: 0.4, fontFace: UI, fontSize: 9,
      bold: true, color: '#' + w.word, align: 'center' });
    s.addText(`mark ${rm}:1`, { x: x + 0.14, y: y + 1.72, w: cw4 - 0.28, h: 0.24, fontFace: UI, fontSize: 8.5,
      color: '#' + w.word, align: 'center' });
  });
  footer(s, 'Pantone deliberately absent — it is a licensed system and needs a physical guide reading or the client’s own swatch cards');
}

// ── 5 · type ──────────────────────────────────────────────────────────────────
{
  const s = slide();
  eyebrow(s, 'Type', M, 0.56);
  heading(s, 'Two faces, both free to use.', M, 0.88, 30);
  body(s, 'Both are SIL Open Font Licence — self-hosted, no licence to buy, and free to embed in a PDF or hand to a printer with no royalty owed.', M, 1.6, 11.6, 12.5);

  // display
  s.addShape(P.ShapeType.roundRect, { x: M, y: 2.36, w: 5.85, h: 4.34, rectRadius: 0.06,
    fill: { color: 'FFFFFF' }, line: { color: ACCENT, width: 1 } });
  s.addText('DISPLAY  ·  WORDMARK & HEADINGS', { x: M + 0.28, y: 2.58, w: 5.3, h: 0.24, fontFace: UI, fontSize: 9.5, bold: true, color: ACCENT, charSpacing: 1.4 });
  s.addImage({ path: art('type-display'), x: M + 0.28, y: 2.98, w: 5.3, h: 1.72 });
  s.addText(TYPE.display.name, { x: M + 0.28, y: 4.86, w: 5.2, h: 0.28, fontFace: HEAD, fontSize: 14, bold: true, color: FG });
  s.addText(TYPE.display.note, { x: M + 0.28, y: 5.2, w: 5.2, h: 1.4, fontFace: UI, fontSize: 10.5, color: FG2, lineSpacingMultiple: 1.28 });

  // body
  const x0 = M + 5.85 + 0.24, cw = W - M - x0;
  s.addShape(P.ShapeType.roundRect, { x: x0, y: 2.36, w: cw, h: 4.34, rectRadius: 0.06,
    fill: { color: CARD }, line: { color: HAIR, width: 0.75 } });
  s.addText('BODY  ·  COPY & LABELS', { x: x0 + 0.26, y: 2.58, w: cw - 0.5, h: 0.24, fontFace: UI, fontSize: 9.5, bold: true, color: ACCENT, charSpacing: 1.4 });
  s.addImage({ path: art('type-body'), x: x0 + 0.26, y: 2.98, w: cw - 0.5, h: 1.36 });
  s.addText(TYPE.body.name, { x: x0 + 0.26, y: 4.5, w: cw - 0.5, h: 0.28, fontFace: HEAD, fontSize: 14, bold: true, color: FG });
  s.addText(TYPE.body.note, { x: x0 + 0.26, y: 4.84, w: cw - 0.5, h: 1.0, fontFace: UI, fontSize: 10.5, color: FG2, lineSpacingMultiple: 1.28 });

  // per-OS fallback, small
  const rows = [[TYPE.display.name, TYPE.display.mac, TYPE.display.win, TYPE.display.android],
                [TYPE.body.name, TYPE.body.mac, TYPE.body.win, TYPE.body.android]];
  const headers = ['Face', 'macOS', 'Windows', 'Android'];
  const tbl = [headers.map(h => ({ text: h, options: { bold: true, fontFace: UI, fontSize: 9, color: FG2 } }))]
    .concat(rows.map(r => r.map(v => ({ text: v, options: { fontFace: UI, fontSize: 9.5, color: FG } }))));
  s.addTable(tbl, { x: x0 + 0.26, y: 6.0, w: cw - 0.5, h: 0.6, border: { type: 'solid', color: HAIR, pt: 0.5 },
    fill: { color: 'FFFFFF' }, autoPage: false });
  footer(s, `The wordmark is live ${TYPE.display.name} on every page and in this deck’s own artwork — never an image standing in for a font that could just be requested`);
}

// ── 6 · sign-off ──────────────────────────────────────────────────────────────
{
  const s = slide();
  eyebrow(s, 'Sign-off', M, 0.56);
  heading(s, 'Pick one, and it ships.', M, 0.88, 30);
  body(s, 'One direction, one colourway. Everything else on this deck and the full VisID sheet follows from those two choices — nothing further to decide before this goes to an illustrator, a printer or a sign shop.', M, 1.6, 11.6, 12.5);

  // the two options, as checkable cards
  const n2 = 2, gap2 = 0.2, cw2 = (7.6 - gap2) / n2;
  [A, B].forEach((d, i) => {
    const x = M + i * (cw2 + gap2), y = 2.5;
    s.addShape(P.ShapeType.roundRect, { x, y, w: cw2, h: 2.7, rectRadius: 0.06,
      fill: { color: CARD }, line: { color: HAIR, width: 0.75 } });
    s.addShape(P.ShapeType.rect, { x: x + 0.24, y: y + 0.24, w: 0.26, h: 0.26,
      fill: { color: 'FFFFFF' }, line: { color: FG2, width: 1 } });
    s.addText(`Option ${d.option}  ·  ${d.name}`, { x: x + 0.6, y: y + 0.2, w: cw2 - 0.8, h: 0.32,
      fontFace: HEAD, fontSize: 15, bold: true, color: FG });
    s.addImage({ path: art(`mark-${d.mark}-rose`), x: x + cw2 / 2 - 0.68, y: y + 0.66, w: 1.36, h: 1.14 });
    s.addText(treatmentName(d.recommend), { x, y: y + 1.94, w: cw2, h: 0.24, fontFace: UI, fontSize: 9.5,
      bold: true, color: FG2, align: 'center', charSpacing: 1.0 });
    s.addText(d.thesis, { x: x + 0.24, y: y + 2.22, w: cw2 - 0.48, h: 0.4, fontFace: UI, fontSize: 10,
      italic: true, color: FG2, align: 'center' });
  });

  // the ask, on its own ground so it reads as the action rather than a caption
  const ax = M + 7.6 + 0.24, aw = W - M - ax;
  s.addShape(P.ShapeType.roundRect, { x: ax, y: 2.5, w: aw, h: 4.12, rectRadius: 0.06,
    fill: { color: 'FFFFFF' }, line: { color: ACCENT, width: 1 } });
  s.addText('TO SIGN', { x: ax + 0.24, y: 2.7, w: aw - 0.48, h: 0.26, fontFace: UI, fontSize: 9.5, bold: true, color: ACCENT, charSpacing: 1.8 });
  [['Approved direction', 'Option ______   ·   ' + A.name + ' / ' + B.name],
   ['Approved colourway', 'One of the four on the colour slide'],
   ['Still open', 'The logo is in progress with an illustrator, in its own direction — this is the launch-safe mark and the brief for that work, not a replacement for it.'],
   ['Not specified here', 'Pantone — needs a physical guide reading or your own swatch cards.']]
   .forEach(([t, d], i) => {
     const y = 3.1 + i * 0.76;
     s.addText(t, { x: ax + 0.24, y, w: aw - 0.48, h: 0.24, fontFace: UI, fontSize: 11, bold: true, color: FG });
     s.addText(d, { x: ax + 0.24, y: y + 0.24, w: aw - 0.48, h: 0.5, fontFace: UI, fontSize: 9.5, color: FG2, lineSpacingMultiple: 1.24 });
   });
  s.addShape(P.ShapeType.line, { x: ax + 0.24, y: 6.24, w: aw - 0.48, h: 0, line: { color: HAIR, width: 1 } });
  s.addText('Signature', { x: ax + 0.24, y: 6.3, w: (aw - 0.48) / 2, h: 0.22, fontFace: UI, fontSize: 8.5, color: FG2 });
  s.addText('Date', { x: ax + 0.24 + (aw - 0.48) / 2, y: 6.3, w: (aw - 0.48) / 2, h: 0.22, fontFace: UI, fontSize: 8.5, color: FG2 });
  footer(s, 'Solas Women’s Health  ·  VisID sign-off  ·  full spec: the VisID sheet for the option chosen above');
}

P.writeFile({ fileName: OUT }).then(() => {
  console.log('wrote', path.relative(ROOT, OUT));
  console.log('slides: 6');
});
