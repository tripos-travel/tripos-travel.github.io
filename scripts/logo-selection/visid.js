#!/usr/bin/env node
// The VisID sheet — one per direction. The page handed to an illustrator, a
// printer or a sign shop, and the artefact the whole selection flow exists to
// produce.
//
// Order is fixed and is the order a designer reads in:
//
//   1 the lockup · 2 the mark at size · 3 clear space · 4 colour · 5 type
//   · 6 reproduction · 7 misuse · 8 provenance
//
// PRINT IS A FIRST-CLASS TARGET, NOT AN AFTERTHOUGHT
// ---------------------------------------------------
// Letter portrait at a 10 mm margin is about 750 px wide, which is UNDER the
// 820 px breakpoint the multi-column layouts here sit behind. So printing a
// three-column block collapsed it to one column and a six-page sheet, most of it
// half empty. The @media print block below restates the grids explicitly rather
// than lowering the breakpoint, because 820 is the right number on a phone.
//
// With that block, each sheet is 3.03 Letter pages of flow and lands on FOUR
// sides, because every section carries break-inside:avoid — a spec block split
// across a page fold is worse than a short page. That number is measured, and it
// is the number the sheet prints on itself; if the content grows, re-measure it
// rather than leaving the claim to rot.
//
// WHAT IS DELIBERATELY ABSENT
// ---------------------------
// Pantone. It is a licensed system and a number has to come from a physical guide
// or the client's own swatch cards; nobody has supplied one for Solas. A guessed
// Pantone is worse than none, because a printer will simply run it. The sheet
// says so where a Pantone column would otherwise sit.

const fs = require('fs'), path = require('path');
const { DIRECTIONS, COLOURWAYS, TYPE, ROLES, measured, hexOf } = require('./directions.js');
const { TREATMENTS } = require('./marks.js');
const { tracedSvg, traceKeyFor } = require('./traced.js');
const TRACED = require('./traced.json');
const { TOKENS, esc } = require('./shell.js');
const { ratio, aa } = require('./color.js');
const { WORDMARK, SUBLOCK, pageFor } = require('./review.js');

const ROOT = path.join(__dirname, '..', '..');
const DEMO = path.join(ROOT, 'demos', 'rodwell-tuohy');
const ASSETS = 'logo-selection-assets';

const CSS = `
*,*::before,*::after{box-sizing:border-box}
img{display:block;max-width:100%;height:auto}
html,body{margin:0;padding:0;background:#EFE9E2;color:var(--ink)}
body{font-family:var(--font-body);font-size:13.5px;line-height:1.6;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:var(--font-display);font-weight:500;margin:0;letter-spacing:-0.012em;
  line-height:1.15;color:var(--ink)}
p{margin:0 0 .85em}
a{color:var(--terracotta)}
em{font-style:normal;color:var(--terracotta)}
.skip{position:absolute;left:-9999px}
.skip:focus{left:8px;top:8px;background:var(--ink);color:var(--cream);padding:9px 13px;z-index:9}
:focus-visible{outline:2px solid var(--terracotta);outline-offset:2px}

/* The sheet itself — Letter portrait proportions on screen too, so what is on
   screen is what comes out of the printer. */
.sheet{width:8.5in;max-width:100%;margin:26px auto;background:var(--cream);
  box-shadow:0 2px 18px rgba(34,28,25,.13)}
.pad{padding:0 clamp(20px,5%,44px)}

.band{background:var(--anchor);color:var(--peach-soft);padding:30px clamp(20px,5%,44px);
  display:grid;gap:16px}
.band__lock{display:flex;align-items:center;gap:14px}
.band__lock svg{color:var(--coral)}
.band__wm{font-family:var(--font-display);font-size:25px;font-weight:500;letter-spacing:0.3em;
  text-transform:uppercase;line-height:1;color:var(--cream)}
.band__p{margin:0;font-size:12.5px;color:var(--peach-soft);max-width:64ch;line-height:1.65}
.band__p strong{color:#FFFFFF;font-weight:700}
.band__opt{font-family:var(--font-body);font-size:10px;font-weight:800;letter-spacing:0.2em;
  text-transform:uppercase;color:var(--peach-soft)}

.blk{padding:26px 0;border-top:1px solid var(--line)}
.blk:first-of-type{border-top:0}
.blk__n{font-family:var(--font-body);font-size:9.5px;font-weight:800;letter-spacing:0.18em;
  text-transform:uppercase;color:var(--terracotta);margin:0 0 7px}
.blk h2{font-size:21px;font-weight:400;margin:0 0 9px}
.blk__l{font-size:12.5px;color:var(--muted);margin:0 0 18px;max-width:66ch;line-height:1.62}

.g2,.g3,.g4{display:grid;gap:12px;grid-template-columns:1fr}
@media(min-width:820px){
  .g2{grid-template-columns:1fr 1fr}
  .g3{grid-template-columns:repeat(3,1fr)}
  .g4{grid-template-columns:repeat(4,1fr)}
}
.card{border:1px solid var(--line);background:var(--white);border-radius:3px;overflow:hidden}
.card__box{display:flex;align-items:center;justify-content:center;gap:11px;padding:24px 14px;
  min-height:104px;background:var(--peach-soft)}
.card__box svg{color:var(--coral)}
.card__cap{padding:9px 13px 11px;border-top:1px solid var(--line);font-size:11.5px;
  color:var(--muted);line-height:1.5}
.card__cap b{display:block;color:var(--ink);font-family:var(--font-body);font-size:10px;
  font-weight:800;letter-spacing:0.11em;text-transform:uppercase;margin-bottom:3px}
.wm--in{margin:0;font-family:var(--font-display);font-size:17px;font-weight:500;
  letter-spacing:0.25em;text-transform:uppercase;line-height:1;color:var(--ink)}

.ramp{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap;
  padding:24px 18px;border:1px solid var(--line);background:var(--white);border-radius:3px}
.ramp figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:9px}
.ramp svg{color:var(--coral)}
.ramp figcaption{font-family:var(--font-body);font-size:9px;font-weight:800;letter-spacing:0.11em;
  text-transform:uppercase;color:var(--muted)}

/* Clear space, drawn rather than described. Two boxes, and they have to be in
   two different places: the SOLID box is the mark's own bounds, the DASHED box is
   the keep-clear boundary one ray-length outside it. An earlier pass put the
   solid rule on a ::before at inset:0 of the padded element, which drew both
   outlines on the same rectangle and illustrated nothing. */
.clear{border:1px solid var(--line);background:var(--white);border-radius:3px;padding:34px;
  display:grid;place-items:center}
.clear__out{padding:var(--cs);outline:1px dashed var(--line-2)}
.clear__mk{outline:1px solid var(--coral);line-height:0}
.clear__mk svg{color:var(--coral)}
.clear__k{margin:14px 0 0;font-size:11px;color:var(--muted);text-align:center}
.clear__k span{display:inline-block;margin:0 9px}
.clear__k i{font-style:normal;display:inline-block;width:16px;border-top:1px solid var(--coral);
  vertical-align:3px;margin-right:5px}
.clear__k i.d{border-top:1px dashed var(--line-2)}

table{border-collapse:collapse;width:100%;font-size:11.5px}
caption{text-align:left;font-size:11.5px;color:var(--muted);padding-bottom:8px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top;
  line-height:1.5}
thead th{font-family:var(--font-body);font-size:9px;font-weight:800;letter-spacing:0.12em;
  text-transform:uppercase;color:var(--ink);background:var(--peach-soft);white-space:nowrap}
tbody td{color:var(--ink-2)}
.mono{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:10.5px;white-space:nowrap}
.chip{display:inline-block;width:13px;height:13px;border-radius:2px;border:1px solid var(--line-2);
  vertical-align:-2px;margin-right:7px}
.ok{color:var(--terracotta);font-weight:700}
.no{color:var(--muted)}

.rules{display:grid;gap:11px;grid-template-columns:1fr;margin:0;padding:0;list-style:none}
@media(min-width:820px){.rules{grid-template-columns:1fr 1fr}}
.rules li{background:var(--white);border:1px solid var(--line);border-left:2px solid var(--coral);
  border-radius:3px;padding:13px 15px;font-size:12px;color:var(--ink-2);line-height:1.58}
.rules li b{display:block;color:var(--ink);margin-bottom:3px}
.rules--no li{border-left-color:var(--muted)}

.note{background:var(--peach-soft);border:1px solid var(--line);border-radius:3px;
  padding:15px 17px;margin-top:14px}
.note p{margin:0;font-size:11.5px;color:var(--ink-2);line-height:1.6}
.note p+p{margin-top:8px}

.foot{font-size:11px;color:var(--muted);padding:20px 0 26px;border-top:1px solid var(--line);
  margin-top:6px}

/* ── print ────────────────────────────────────────────────────────────────────
   Letter at a 10mm margin is under the 820px breakpoint above, so every grid is
   restated here. Without this the sheet printed one column wide and ran to three
   pages, two of them nearly empty. */
@media print{
  @page{size:letter portrait;margin:10mm}
  html,body{background:#FFFFFF}
  body{font-size:10.5px;line-height:1.48}
  .sheet{width:auto;margin:0;box-shadow:none}
  .pad{padding:0}
  /* Every grid is restated. Letter at a 10mm margin is about 750px wide, which is
     UNDER the 820px breakpoint the columns sit behind — so without this the sheet
     printed one column wide and ran to six pages, most of them half empty. The
     breakpoint itself stays at 820, because that is the right number on a phone. */
  .g2{display:grid;grid-template-columns:1fr 1fr;gap:7px}
  .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
  .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
  .rules{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .blk{padding:11px 0;break-inside:avoid}
  .blk h2{font-size:15px;margin:0 0 5px}
  .blk__n{font-size:8px;margin:0 0 4px}
  .blk__l{font-size:10px;margin:0 0 9px}
  .band{padding:14px 0;background:var(--anchor)!important}
  .band__wm{font-size:19px}
  .band__p{font-size:10px}
  .card__box{min-height:74px;padding:13px 9px}
  .card__cap{padding:6px 9px 7px;font-size:9.5px}
  .wm--in{font-size:13px}
  .ramp{padding:13px 12px}
  .clear{padding:18px}
  table{font-size:9px}
  th,td{padding:4.5px 7px}
  thead th{font-size:8px}
  .mono{font-size:8.5px}
  caption{font-size:9px;padding-bottom:5px}
  .note{padding:9px 11px;margin-top:8px}
  .note p{font-size:9.5px;line-height:1.45}
  .rules li{padding:8px 10px;font-size:9.5px;line-height:1.42}
  .foot{padding:11px 0 0;font-size:9px}
  h3{font-size:13px!important;margin:13px 0 7px!important}
  /* No forced page break. The blocks are break-inside:avoid and fall where they
     fall; forcing one here left a page 13% full. */
  .card,.ramp,.clear,.note,.rules li,.chip,thead th{-webkit-print-color-adjust:exact;
    print-color-adjust:exact}
  .band{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  a{text-decoration:none;color:var(--ink)}
  .noprint{display:none}
}
`;

// ── 1 · the lockup ────────────────────────────────────────────────────────────
function blockLockup(d) {
  const t = TREATMENTS.find(x => x.id === d.recommend);
  return `
  <section class="blk">
    <p class="blk__n">01 · The lockup</p>
    <h2>${esc(d.name)}, ${esc(t.name.toLowerCase())}.</h2>
    <p class="blk__l">The primary signature. ${esc(d.thesis)} Every instance on this page is the same
      traced outline of the approved mark, so no two can drift apart. The wordmark is
      live ${esc(TYPE.display.name)} &mdash; never an image, so it can always be re-set.</p>
    <div class="g3">
      <figure class="card" style="margin:0">
        <div class="card__box" style="flex-direction:column;gap:13px;min-height:150px">
          ${tracedSvg(d.mark, { height: 58, color: '#' + hexOf('Sunburst Rose') })}
          <p class="wm--in">${esc(WORDMARK)}</p>
        </div>
        <div class="card__cap"><b>Primary · stacked</b>The default. Site header, stationery, signage.</div>
      </figure>
      <figure class="card" style="margin:0">
        <div class="card__box" style="min-height:150px">
          ${tracedSvg(d.mark, { height: 34, color: '#' + hexOf('Sunburst Rose') })}
          <p class="wm--in">${esc(WORDMARK)}</p>
        </div>
        <div class="card__cap"><b>Horizontal</b>Where height is tight — a header band, an email
          signature, a footer.</div>
      </figure>
      <figure class="card" style="margin:0">
        <div class="card__box" style="min-height:150px">
          ${tracedSvg(d.mark, { height: 62, color: '#' + hexOf('Sunburst Rose') })}
        </div>
        <div class="card__cap"><b>Mark alone</b>Only where the name is already present, or at sizes
          the name cannot survive.</div>
      </figure>
    </div>
  </section>`;
}

// ── 2 · the mark at size ──────────────────────────────────────────────────────
// Two Banana Stand traces, not a trace plus a fallback to the drawn
// construction. Down to 28px (TRACE_FLOOR_PX in traced.js) this is the main
// approved concept; rendered at true device resolution rather than a browser's
// own forgiving zoom, its halftone dots go sub-pixel below that and wash into a
// blur — verified, not assumed. Rather than switching to an unrelated drawn
// shape at that point, the smallest two steps switch to small-mark.js's
// purpose-built small-size study of the SAME composition, so every size on this
// ramp is still the mark that was actually chosen.
function blockMark(d) {
  const tr = TRACED[d.mark];
  const trSmall = TRACED[`${d.mark}-small`];
  const t = TREATMENTS.find(x => x.id === d.recommend);
  return `
  <section class="blk">
    <p class="blk__n">02 · The mark at size</p>
    <h2>Where it holds, and where it stops.</h2>
    <p class="blk__l">One artwork at every size &mdash; not a set of files. Sizes below are stated
      as HEIGHT, because ${d.mark === 'a'
        ? 'this is a wide mark and its width is the wrong thing to measure it by'
        : 'the mark is square and height is the only dimension that matters'}.</p>
    <div class="ramp">
      ${[96, 64, 44, 28, 20, 16].map(h => `<figure>
        ${tracedSvg(traceKeyFor(d.mark, h), { height: h, color: '#' + hexOf('Sunburst Rose') })}<figcaption>${h} px</figcaption></figure>`).join('')}
    </div>
    <div class="note">
      <p><strong>Construction.</strong> Down to 28&nbsp;px this is the client-approved
        ${esc(t.name.toLowerCase())} concept, traced into real vector path data (potrace, on the
        concept&rsquo;s own alpha channel) and filled with Sunburst Rose. It measures
        ${tr.width.toFixed(0)}&times;100 units${d.mark === 'a'
          ? ', roughly two units wide for every one tall' : ', near enough square'}. Below 28&nbsp;px
        its halftone goes sub-pixel and reads as a blur rather than a sunburst, so the smallest two
        steps switch to a second Banana Stand study instead &mdash; same composition, generated with
        a deliberately coarse, few-dot halftone built to hold up that small, then traced the same way.
        It measures ${trSmall.width.toFixed(0)}&times;100 units.</p>
      <p><strong>Holds cleanly to 16&nbsp;px, or 4.2&nbsp;mm</strong> &mdash; the smallest size shown
        above, and the smallest checked. Nothing here is a drawn simplification of the mark; both
        traces are the same chosen concept, calibrated for the size they render at.</p>
    </div>
  </section>`;
}

// ── 3 · clear space ───────────────────────────────────────────────────────────
// The old rule measured one ray length out from the drawn construction's own
// centre point — a number GEO could give but the trace can't, since a traced
// path has no logical "centre" the way a parametric ray does. Restated as a
// fraction of the mark's own height instead: still one rule instead of a table
// of margins, and it now holds for either kind of artwork.
function blockClear(d) {
  const h = 52, cs = Math.round(h / 2);
  return `
  <section class="blk">
    <p class="blk__n">03 · Clear space</p>
    <h2>Nothing inside the box.</h2>
    <p class="blk__l">Keep clear space equal to half the mark&rsquo;s own height on every side. It
      scales with the mark, so there is one rule rather than a table of margins.</p>
    <div class="clear" style="--cs:${cs}px">
      <div class="clear__out">
        <div class="clear__mk">${tracedSvg(d.mark, { height: h, color: '#' + hexOf('Sunburst Rose') })}</div>
      </div>
    </div>
    <p class="clear__k"><span><i></i>the mark</span><span><i class="d"></i>keep clear</span></p>
    <div class="note">
      <p><strong>Also inside the box:</strong> no type, no rules, no photograph edge, and no second
        logo. On a photograph, place the mark on a flat area or a solid panel &mdash; not over
        detail, which is the one misuse that happens by accident rather than on purpose.</p>
    </div>
  </section>`;
}

// ── 4 · colour ────────────────────────────────────────────────────────────────
function blockColour(d) {
  const rows = measured();
  return `
  <section class="blk">
    <p class="blk__n">04 · Colour</p>
    <h2>Measured, not asserted.</h2>
    <p class="blk__l">Hex, RGB and CMYK are exact. Every contrast figure is computed against the
      three surfaces the brand actually uses. The CMYK values are the naive device conversion every
      design tool shows before a colour profile is applied &mdash; the right figure for a spec sheet
      and the wrong one to send to a press without a proof.</p>
    <table>
      <caption>The Solas palette, with contrast against cream, peach and the anchor.</caption>
      <thead><tr>
        <th scope="col">Colour</th><th scope="col">Hex</th><th scope="col">RGB</th>
        <th scope="col">CMYK</th><th scope="col">On cream</th><th scope="col">On peach</th>
        <th scope="col">On anchor</th>
      </tr></thead>
      <tbody>
        ${rows.map(c => `<tr>
          <th scope="row" style="font-weight:600;color:var(--ink)">
            <span class="chip" style="background:#${c.hex}"></span>${esc(c.name)}</th>
          <td class="mono">#${c.hex}</td><td class="mono">${c.rgb}</td><td class="mono">${c.cmyk}</td>
          <td class="mono ${aa.body(c.onCream) ? 'ok' : 'no'}">${c.onCream}:1</td>
          <td class="mono ${aa.body(c.onPeach) ? 'ok' : 'no'}">${c.onPeach}:1</td>
          <td class="mono ${aa.body(c.onAnchor) ? 'ok' : 'no'}">${c.onAnchor}:1</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="note">
      <p><strong>Bold means it clears 4.5:1 and can carry text.</strong> Grey means it cannot, at
        any size that matters. Sunburst Rose reads
        ${ratio(hexOf('Sunburst Rose'), hexOf('Cream'))}:1 on cream: enough for the mark, which is
        artwork and is held to 3:1, and short of what small text needs. Berry reads
        ${ratio(hexOf('Berry'), hexOf('Cream'))}:1 and carries every link, label and button.
        The wordmark is never set in Sunburst Rose.</p>
      <p><strong>No Pantone number appears on this sheet.</strong> Pantone is a licensed system and
        a number has to come from a physical guide or your own swatch cards. A guessed one is worse
        than none, because a printer will run it. Send a guide reading or a swatch card and it gets
        added here. For an uncoated stock, ask the printer to match to
        #${hexOf('Sunburst Rose')} against a proof.</p>
    </div>
    <h3 style="margin:22px 0 12px;font-size:16px">The four colourways</h3>
    <div class="g4">
      ${COLOURWAYS.map(w => {
        const rm = ratio(w.mark, w.ground), rw = ratio(w.word, w.ground);
        return `
      <figure class="card" style="margin:0">
        <div class="card__box" style="background:#${w.ground};flex-direction:column;gap:10px">
          ${tracedSvg(d.mark, { height: 34, color: '#' + w.mark })}
          <p class="wm--in" style="color:#${w.word};font-size:13px">${esc(WORDMARK)}</p>
        </div>
        <div class="card__cap"><b>${esc(w.label)}</b>
          <span class="mono">Mark ${rm}:1 · name ${rw}:1</span></div>
      </figure>`; }).join('')}
    </div>
  </section>`;
}

// ── 5 · type ──────────────────────────────────────────────────────────────────
function blockType() {
  const row = (f, role) => `<tr>
    <th scope="row" style="font-weight:600;color:var(--ink)">${esc(f.name)}</th>
    <td>${esc(role)}</td>
    <td>${esc(f.weights.join(', '))}</td>
    <td class="mono">${esc(f.mac)}</td>
    <td class="mono">${esc(f.win)}</td>
    <td class="mono">${esc(f.android)}</td>
    <td class="mono">${esc(f.generic)}</td>
  </tr>`;
  return `
  <section class="blk">
    <p class="blk__n">05 · Type</p>
    <h2>Two faces, both free to use.</h2>
    <p class="blk__l">Both are SIL Open Font Licence, so they can be self-hosted, embedded in a PDF
      and handed to a printer with no licence to buy and nothing to clear. That is unusual and worth
      stating plainly: there is no font decision still open on this brand.</p>
    <table>
      <caption>Faces, weights, and the fallback on each platform.</caption>
      <thead><tr>
        <th scope="col">Face</th><th scope="col">Role</th><th scope="col">Weights</th>
        <th scope="col">macOS</th><th scope="col">Windows</th><th scope="col">Android</th>
        <th scope="col">Fallback</th>
      </tr></thead>
      <tbody>
        ${row(TYPE.display, 'Wordmark, headings')}
        ${row(TYPE.body, 'Body, labels, buttons')}
      </tbody>
    </table>
    <div class="note">
      <p><strong>The wordmark is live type, never an image.</strong> Set in
        ${esc(TYPE.display.name)} Regular, uppercase, 0.30em tracking. Generated or outlined
        letterforms are subtly wrong and cannot be re-set when a size or a medium changes.</p>
      <p><strong>No italics anywhere.</strong> Emphasis is upright ${esc(ROLES.text)} &mdash; a
        standing instruction from the last round of brand feedback, and it applies to the identity
        as much as to the site.</p>
    </div>
  </section>`;
}

// ── 6 · reproduction, 7 · misuse ──────────────────────────────────────────────
function blockRules(d) {
  const yes = [
    ['One colour', 'The whole mark in Ink, or reversed in Cream. No second cut is needed — the geometry is identical.'],
    ['Reversed', 'On the anchor, the mark is Sunburst Rose and the name is Cream. Berry is not usable there — it measures ' + ratio(hexOf('Berry'), hexOf('Anchor')) + ':1.'],
    ['Favicon and avatar', d.mark === 'a'
      ? 'Use the tile or the roundel. The bare mark is 2:1 and will be letterboxed or cropped in a square slot.'
      : 'The bare mark works in a square slot; the tile and roundel are there when a filled ground reads better.'],
    ['Embroidery and etching', 'Use the Bold cut. Anything finer loses its thinnest member first, and that is the ray tip.'],
  ];
  const no = [
    ['Do not recolour it', 'Outside the four colourways on this sheet. Not in blush, not in peach, not in a gradient.'],
    ['Do not set the name in Sunburst Rose', 'It is ' + ratio(hexOf('Sunburst Rose'), hexOf('Cream')) + ':1 on cream and fails WCAG AA for text at any size that matters.'],
    ['Do not rebuild it', 'Do not redraw, re-space, stretch, rotate' + (d.mark === 'a' ? ', or mirror the mark — the horizon gives it an up and a down' : ' the mark. It is 8-fold rotational; a rotation is a mistake, not a variant') + '.'],
    ['Do not add anything', 'No outline, no shadow, no glow, no container other than the roundel and the tile specified here.'],
    ['Do not use italics', 'In the wordmark or beside it, in any medium.'],
    ['Do not set it over detail', 'Place it on a flat area or a solid panel. On a photograph, use the reversed colourway on a panel.'],
  ];
  return `
  <section class="blk">
    <p class="blk__n">06 · Reproduction</p>
    <h2>How it survives each medium.</h2>
    <ul class="rules">
      ${yes.map(([b, t]) => `<li><b>${esc(b)}</b>${esc(t)}</li>`).join('')}
    </ul>
    <p class="blk__n" style="margin-top:26px">07 · Misuse</p>
    <h2>What breaks it.</h2>
    <ul class="rules rules--no">
      ${no.map(([b, t]) => `<li><b>${esc(b)}</b>${esc(t)}</li>`).join('')}
    </ul>
  </section>`;
}

// ── 8 · provenance ────────────────────────────────────────────────────────────
// Where the mark came from and what is drawn versus generated. The brand-identity
// rule this satisfies: show the concept beside the shipped vector and say which
// is which. Nothing on this sheet is generated, and that is stated rather than
// left to be assumed.
function blockProvenance(d) {
  const { onDisk } = require('./designs.js');
  const have = onDisk(d);
  const gen = Object.values(have).filter(Boolean).length;
  return `
  <section class="blk">
    <p class="blk__n">08 · Provenance</p>
    <h2>Where this mark came from.</h2>
    <table>
      <caption>The record behind this direction.</caption>
      <tbody>
        <tr><th scope="row" style="width:190px;color:var(--ink)">Source</th>
          <td>The Solas design system, §02 &ldquo;Logo directions&rdquo;, card
            &ldquo;${esc(d.from)}&rdquo;.</td></tr>
        <tr><th scope="row" style="color:var(--ink)">Brief it answers</th>
          <td>&ldquo;${esc(d.answersTo)}&rdquo; &mdash; from the discovery call and the brand
            playbook.</td></tr>
        <tr><th scope="row" style="color:var(--ink)">Status of the artwork</th>
          <td>Two Banana Stand traces, never the drawn construction. Every mark on this sheet &mdash;
            the header, &sect;01 the lockup, &sect;02 the mark at size, &sect;03 clear space and
            &sect;04 the colourways &mdash; is one of two vector traces of the client-approved concept
            (potrace, on the concept&rsquo;s own alpha channel), filled with the specified hex. Above
            28&nbsp;px (&sect;02, &sect;03, the header) that is the main approved concept; rendered at
            true device resolution, its halftone dots go sub-pixel below 28&nbsp;px and read as a blur
            rather than a sunburst, so &sect;02&rsquo;s smallest two steps and the nav icon on every page
            use a second Banana Stand study instead &mdash; the same composition, generated with a
            deliberately coarse, few-dot halftone built to hold up that small, then traced the same way.
            Neither is a redrawn interpretation of the chosen mark.</td></tr>
        <tr><th scope="row" style="color:var(--ink)">Generated concepts</th>
          <td>${gen
            ? `${gen} generated concept image${gen > 1 ? 's' : ''} for this direction, plus one more
               (small-mark.js) generated specifically for the small-size trace. The recommended
               treatment&rsquo;s concept is the one traced above; on the review page and the hub the
               six-treatment concepts appear as reference beside the drawn comparison grid. Both traces
               are committed as data (<code>traced.json</code>) rather than regenerated at build time,
               so this sheet never depends on Banana Stand or the tracing tool being available.`
            : `None. The Banana Stand step is wired but has not been run for Solas, so no generated
               image appears in this package at all.`}</td></tr>
        <tr><th scope="row" style="color:var(--ink)">Still open</th>
          <td>The logo is in progress with an illustrator, going in its own direction. This sheet
            is the launch-safe mark and the brief for that work &mdash; not a replacement for
            it.</td></tr>
        <tr><th scope="row" style="color:var(--ink)">Not specified here</th>
          <td>Pantone. See §04 &mdash; it needs a physical guide reading or your own swatch
            cards.</td></tr>
      </tbody>
    </table>
  </section>`;
}

function page(d) {
  const other = DIRECTIONS.find(x => x.id !== d.id);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>VisID sheet — Option ${d.option} · ${esc(d.name)} — Solas Women’s Health</title>
<meta name="description" content="The Solas Women’s Health visual identity sheet for Option ${d.option}, ${esc(d.name)} — lockup, mark at size, clear space, colour with measured contrast, type per platform, reproduction and misuse. Letter portrait."/>
<!-- Self-hosted rather than linked: this sheet is printed and saved as PDF, and a
     webfont that fails to fetch renders the fallback without erroring. See
     scripts/logo-selection/fonts.js. -->
<link href="${ASSETS}/fonts/fonts.css" rel="stylesheet"/>
<style>:root{${TOKENS}}${CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<main id="main" class="sheet">

  <header class="band">
    <div class="band__lock">
      ${tracedSvg(d.mark, { height: 44, color: '#' + hexOf('Sunburst Rose'),
        label: `The Solas ${d.name} mark` })}
      <span class="band__wm">${esc(WORDMARK)}</span>
    </div>
    <h1 class="band__wm" style="font-size:15px;letter-spacing:0.22em">${esc(SUBLOCK)} &middot; visual identity</h1>
    <p class="band__p">This sheet sets the standard for using the Solas logo, wordmark, colour and
      type &mdash; on the website, on printed forms and superbills, on signage and in anything the
      practice publishes. It is the one page to hand to a designer, a printer or a sign shop.
      <strong>Option ${d.option} of two: ${esc(d.name)}.</strong></p>
    <span class="band__opt">Option ${d.option} &middot; ${esc(d.name)} &middot; Letter portrait, four sides</span>
  </header>

  <div class="pad">
${blockLockup(d)}
${blockMark(d)}
${blockClear(d)}
${blockColour(d)}
${blockType()}
${blockRules(d)}
${blockProvenance(d)}
    <p class="foot">Solas Women’s Health &middot; prepared by YohDev &middot;
      <span class="noprint"><a href="${pageFor(d)}">Back to Option ${d.option}</a> &middot;
      <a href="logo-selection-visid-${other.id}.html">The ${esc(other.name)} sheet</a> &middot;
      <a href="logo-selection.html">Both directions</a> &middot; </span>
      Print or save as PDF from this page &mdash; styled for Letter portrait, four sides.</p>
  </div>

</main>
</body>
</html>
`;
}

function build() {
  const written = [];
  for (const d of DIRECTIONS) {
    const out = path.join(DEMO, `logo-selection-visid-${d.id}.html`);
    fs.writeFileSync(out, page(d));
    written.push(path.relative(ROOT, out));
  }
  return written;
}

module.exports = { build, page };
if (require.main === module) for (const f of build()) console.log('wrote', f);
