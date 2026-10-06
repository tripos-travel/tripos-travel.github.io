#!/usr/bin/env node
// One page per direction — the whole thing a reviewer opens for Option A or B.
//
//   npm run logos:build     (or node scripts/logo-selection/review.js)
//
// Structure, and the reason for it. The Beyond Infinity round that produced this
// shape was briefed bluntly: "a super simplified experience for both options.
// I'm talking little to no text. this needs to be heavily visual… limit it to six
// logos, polished versions… explain the brand in one paragraph and then talk
// about the mark, show off the typography." So the page is:
//
//   one paragraph → the mark at the sizes that decide it → six treatments
//   → the name in six faces → the brand's own two faces → four colourways
//   → the final lockup → what is honest about it → the sheet → one question
//
// and nothing else. Spec tables and measured cuts live on the sheet, which is
// where a printer or an illustrator reads them.
//
// WHERE THIS WRITES, AND WHY IT MATTERS
// -------------------------------------
// demos/rodwell-tuohy/logo-selection-a.html — NOT index.html.
//
// The Beyond Infinity generator wrote each option straight over
// demos/<brand>/index.html, which is the brand's playbook front door. Doing that
// to Solas would replace the proposal walkthrough the client is already reading.
// Everything this flow produces is namespaced under `logo-selection*` and touches
// no page, manifest or asset belonging to the playbook.

const fs = require('fs'), path = require('path');
const { DIRECTIONS, COLOURWAYS, TYPE, DISPLAY_FACES, hexOf, measured } = require('./directions.js');
const { TREATMENTS, markSvg } = require('./marks.js');
const { onDisk } = require('./designs.js');
const { tracedSvg, traceKeyFor } = require('./traced.js');
const { TOKENS, CSS, SHEET_ICON, DECK_ICON, esc } = require('./shell.js');
const { ratio } = require('./color.js');

const ROOT = path.join(__dirname, '..', '..');
const BRAND = 'rodwell-tuohy';
const DEMO = path.join(ROOT, 'demos', BRAND);
const ASSETS = 'logo-selection-assets';

const tidy = s => String(s).replace(/\s+/g, ' ').trim();
const pageFor = d => `logo-selection-${d.id}.html`;

// The wordmark is LIVE TYPE in a real licensed face, never a generated image.
// Generated letterforms are subtly wrong and cannot be re-set — and both Solas
// faces are SIL OFL, so there is no licence question to defer here.
const WORDMARK = 'Solas';
const SUBLOCK = 'Women’s Health';


// A treatment rendered at a size, with the right two colours for it.
//
// The two contained treatments need a ground that is not the card they sit on.
// Rendered with `ground` set to the card colour they were invisible — a disc the
// same shade as the surface behind it is not a disc. So they carry their own
// pair, both measured: cream on terracotta is
// 6.4:1 and terracotta on peach is 5.01:1, and the roundel being genuinely
// REVERSED is also what its own caption claims it is.
const CONTAINED = {
  roundel: { color: '#' + hexOf('Cream'),      ground: '#' + hexOf('Berry') },
  tile:    { color: '#' + hexOf('Berry'), ground: '#' + hexOf('Peach') },
};
const cut = (d, treatment, height, extra = {}) =>
  markSvg(d.mark, { height, treatment, ...(CONTAINED[treatment] || {}), ...extra });


// ── hero ──────────────────────────────────────────────────────────────────────
// The approved concept, traced to vector (see traced.js) — the same artwork the
// client chose, not a redrawn interpretation of it and not a raster stand-in.
function hero(d) {
  const art = tracedSvg(d.mark, { height: 132, color: '#' + hexOf('Sunburst Rose'),
    label: `The Solas ${d.name} mark` });
  return `
  <section class="wrap hero">
    <div>
      <p class="eyebrow">Option ${d.option} of two</p>
      <h1>${esc(d.name)}</h1>
      <p class="hero__p">${tidy(d.para)}</p>
      <blockquote class="hero__q">“${esc(d.answersTo)}”
        <span>The line this direction answers to</span></blockquote>
    </div>
    <div class="hero__mk">
      ${art}
    </div>
  </section>`;
}

// ── the mark at the sizes that decide it ──────────────────────────────────────
// Sized by HEIGHT, not width. Option A is a wide mark and Option B is square, so
// a shared width would show them at two different optical sizes and the
// comparison would be quietly unfair.
//
// Two Banana Stand traces, never the drawn construction. Rendered at true
// device resolution rather than a browser's own forgiving zoom, the main
// approved concept's halftone (~40 dots per ray) goes sub-pixel below 28px and
// washes into a pale fuzz — measured, not assumed, and that measurement is why
// an earlier pass fell back to the drawn six-ray sun here instead. But that
// swaps in a DIFFERENT mark at small sizes, not a small version of the chosen
// one. small-mark.js generates a second study of the same composition with a
// deliberately coarse, few-dot halftone built to hold up that small, traced the
// same way (see traced.js's traceKeyFor) — so every size in this ramp is still
// the mark that was actually chosen.
function theMark(d) {
  const sizes = [96, 56, 40, 24, 16];
  return `
  <section class="s" id="mark">
    <div class="wrap">
      <div class="s__h"><span class="s__n">01 · The mark</span>
        <div><h2>At the sizes that decide it.</h2>
        <p class="s__l">Same artwork every time — one set of coordinates, not five files. The one
          that matters is the last: 16&nbsp;px is a browser tab, and a mark that closes up there
          needs a second cut for small sizes. All five are the ${esc(TREATMENTS.find(t => t.id === d.recommend).name.toLowerCase())}
          treatment, the one recommended below.</p>
        <p class="s__l">Rendered at true device resolution rather than a browser&rsquo;s own zoom, the
          concept&rsquo;s halftone goes sub-pixel below 28&nbsp;px and washes into a blur rather than a
          sunburst &mdash; checked, not assumed. The last two sizes here switch to a second Banana
          Stand study built for exactly that: same composition, a few large bold dots instead of dozens
          of fine ones, so it is still the chosen mark rather than a different, plainer one.</p></div>
      </div>
      <div class="ramp">
        ${sizes.map(h => `<figure>
          ${tracedSvg(traceKeyFor(d.mark, h), { height: h, color: '#' + hexOf('Sunburst Rose') })}
          <figcaption>${h} px tall</figcaption>
        </figure>`).join('')}
      </div>
    </div>
  </section>`;
}

// ── the six ───────────────────────────────────────────────────────────────────
// Each card shows the generated concept image when one is on disk and the drawn
// vector cut when it is not — checked against the filesystem at build time, so
// running the generator later needs no edit here. Cards no longer say which:
// the client feedback was that a "Study" badge read as unfinished/placeholder
// on a page meant to present two finished-looking options to choose between.
// The distinction still exists for the illustrator (see the call-out below and
// the VisID sheet's provenance table); it just isn't stamped on every card.
function theSix(d) {
  const have = onDisk(d);
  const anyGen = TREATMENTS.some(t => have[t.id]);

  const cards = TREATMENTS.map(t => {
    const rec = t.id === d.recommend;
    const gen = have[t.id];
    const art = gen
      ? `<img src="${ASSETS}/${gen}" width="800" height="800" loading="lazy"
           alt="The Solas ${esc(d.name)} mark, ${esc(t.name.toLowerCase())} treatment.">`
      : cut(d, t.id, 210, { frame: 'square' });
    return `
    <figure${rec ? ' data-rec' : ''}>
      <div class="six__art">
        ${art}
        ${rec ? `<span class="six__badge">Recommended${d.clientPick ? " · Nancy's pick" : ''}</span>` : ''}
      </div>
      <figcaption>
        <span class="six__n">${esc(t.name)}</span>
        <p class="six__d">${esc(t.short)}</p>
      </figcaption>
    </figure>`;
  }).join('');

  return `
  <section class="s" id="six">
    <div class="wrap">
      <div class="s__h"><span class="s__n">02 · Six ways to draw it</span>
        <div><h2>One shape, six treatments.</h2>
        <p class="s__l">The same mark drawn six ways, lightest to heaviest and then the two
          contained forms. Pick the row you like and the rest of the identity follows from it.
          We recommend <strong>${esc(TREATMENTS.find(t => t.id === d.recommend).name)}</strong> for
          this direction &mdash; ${esc(recWhy(d))}</p></div>
      </div>
      <div class="six">${cards}</div>
      <div class="call">
        <p><strong>${anyGen
          ? 'These six are concept images, not final artwork.'
          : 'Every card here is drawn artwork.'}</strong>
          ${anyGen
            ? `They exist to settle a direction in one round instead of five. An image model draws a
               shape that reads correctly; it does not draw one with a known stroke width, a known
               ray count, or known behaviour at 16&nbsp;px. Whichever treatment is chosen ships as
               the drawn vector, which stays the reference for the illustrator.`
            : `Each one is generated from the same coordinates at every size and in every colour on
               this page. Concept renders can be drawn through Banana Stand to push a direction
               further before it goes to the illustrator &mdash; they are references, never the
               deliverable, and none has been drawn for Solas yet.`}</p>
        <p>Your playbook records the logo as <em>in progress with an artist, going in its own
          direction</em>. Nothing here replaces that. This is the launch-safe set: enough to build
          and ship on, and a precise brief for the artist when that track lands.</p>
      </div>
    </div>
  </section>`;
}

const recWhy = d => d.recommend === 'solid'
  ? 'it is the only cut that keeps the horizon readable once the mark gets small.'
  : 'it is the cut that still reads at 16 px, which is where this mark has to work hardest.';

// ── the name in six faces ─────────────────────────────────────────────────────
// The mark is held constant and only the face changes. That is the whole point:
// six settings of the same fallback serif would be a choice between six identical
// things, which is why every face on this page ships with it.
function theFaces(d) {
  return `
  <section class="s" id="faces">
    <div class="wrap">
      <div class="s__h"><span class="s__n">03 · The name</span>
        <div><h2>Set in six faces.</h2>
        <p class="s__l">The mark stays the same in every card; only the face changes. Ordered
          finest to sturdiest, because that is the real trade &mdash; the finer the hairline, the
          less of it survives at a small size or in one colour. All six are free and self-hosted,
          so any of them can be committed to today, with no licence to buy.</p></div>
      </div>
      <div class="faces">
        ${DISPLAY_FACES.map(f => `
        <figure${(f.current || f.clientPick) ? ' data-cur' : ''}>
          <div class="faces__set">
            ${f.clientPick ? '<span class="faces__badge">Nancy\'s pick</span>' : ''}
            ${tracedSvg(d.mark, { height: 60, color: '#' + hexOf('Sunburst Rose') })}
            <p class="faces__wm" style="font-family:'${esc(f.name)}',Georgia,serif;
              font-weight:${f.weight}">${esc(WORDMARK)}</p>
          </div>
          <figcaption>
            <span class="faces__n">${esc(f.name)}${f.current ? ' · in use today' : ''}${f.clientPick ? ' · confirmed' : ''}</span>
            <p class="faces__w">${esc(f.note)}</p>
          </figcaption>
        </figure>`).join('')}
      </div>
    </div>
  </section>`;
}

// ── the brand's own two faces ─────────────────────────────────────────────────
function theType() {
  const spec = f => `
    <div${f.clientPick ? ' data-picked' : ''}>
      ${f.clientPick ? '<span class="faces__badge">Nancy\'s pick</span>' : ''}
      <p style="font-family:'${esc(f.name)}',${f.generic};font-size:46px;font-weight:400;margin:0 0 6px;
        line-height:1.1;letter-spacing:-0.02em;color:var(--ink)">Aa Gg</p>
      <p style="font-family:'${esc(f.name)}',${f.generic};font-size:17px;margin:0 0 14px;
        color:var(--ink-2);line-height:1.7;max-width:40ch">Hormones, metabolic health, and sexual
        health &mdash; with the time to get it right.</p>
      <p class="faces__n">${esc(f.name)}</p>
      <p class="faces__w">${esc(f.note)}</p>
      <p class="ways__m" style="margin-top:10px">Weights ${esc(f.weights.join(' · '))}<br>
        Fallbacks &mdash; macOS ${esc(f.mac)} · Windows ${esc(f.win)} · Android ${esc(f.android)}</p>
    </div>`;
  return `
  <section class="s" id="type">
    <div class="wrap">
      <div class="s__h"><span class="s__n">04 · Everything else</span>
        <div><h2>The two faces already in the system.</h2>
        <p class="s__l">Nothing changes here whichever direction wins. Both are SIL OFL, both are
          already set across the homepage, the packages page and the design system, and both are
          self-hosted on this page so what you see is what ships.</p></div>
      </div>
      <div class="pair">
        ${spec(TYPE.display)}
        ${spec(TYPE.body)}
      </div>
    </div>
  </section>`;
}

// ── the four colourways ───────────────────────────────────────────────────────
// Four real options, each with its measured contrast printed on it. The Beyond
// Infinity sheet shipped one option printed three times because that brand's ink
// and accent were the same swatch; here the four grounds are genuinely different
// surfaces, and the numbers say so.
function theWays(d) {
  return `
  <section class="s" id="colour">
    <div class="wrap">
      <div class="s__h"><span class="s__n">05 · Colour</span>
        <div><h2>Four surfaces, one mark.</h2>
        <p class="s__l">The palette does not change between the two directions &mdash; it is
          settled, and the mark is what is open. Every ratio below is measured, not asserted. The
          mark is artwork and is held to 3:1; the name is type and is held to 4.5:1, because this
          lockup ends up on a business card.</p></div>
      </div>
      <div class="ways">
        ${COLOURWAYS.map(w => {
          const rm = ratio(w.mark, w.ground), rw = ratio(w.word, w.ground);
          // This section prints a measured ratio under each card, so the card has to
          // show the artwork the number was computed from. A traced path has no colour
          // of its own - it is filled with the exact hex the card names - so unlike the
          // raw raster study (measured at the time: darkest pixel #E27B7C, not Sunburst
          // Rose; a near-white wash on the anchor instead of a clean reversal) every
          // card here is genuinely that colour, exactly.
          return `
        <figure>
          <div class="ways__box" style="background:#${w.ground}">
            ${tracedSvg(d.mark, { height: 44, color: '#' + w.mark })}
            <p class="ways__wm" style="color:#${w.word}">${esc(WORDMARK)}</p>
          </div>
          <figcaption>
            <span class="ways__n">${esc(w.label)}</span>
            <p class="ways__m">Mark #${w.mark} &middot; ${rm}:1<br>Name #${w.word} &middot; ${rw}:1</p>
          </figcaption>
        </figure>`; }).join('')}
      </div>
      <div class="call">
        <p><strong>The two-accent rule, and why it is not optional.</strong>
          Sunburst Rose is the brand&rsquo;s colour and measures
          ${ratio(hexOf('Sunburst Rose'), hexOf('Cream'))}:1 on cream &mdash; enough for artwork,
          short of the 4.5:1 that small text needs. Berry measures
          ${ratio(hexOf('Berry'), hexOf('Cream'))}:1 and carries every link, label and button.
          That split is what lets this palette stay as bright as it is and still clear WCAG AA, and
          it is why the name is never set in Sunburst Rose.</p>
        <p><strong>No Pantone numbers appear anywhere in this package.</strong> Pantone is a
          licensed system and a number has to come from a physical guide or your own swatch cards.
          A guessed one is worse than none, because a printer will simply run it. Hex, RGB and CMYK
          are on the sheet and are exact.</p>
      </div>
    </div>
  </section>`;
}

// ── the final lockup ──────────────────────────────────────────────────────────
// The page ENDS on the recommendation rather than mentioning it in the middle of
// a grid. Everything above is options; this is the one thing to react to.
function theFinal(d) {
  const t = TREATMENTS.find(x => x.id === d.recommend);
  const wmFace = d.clientPick ? DISPLAY_FACES.find(f => f.clientPick) : null;
  const wmStyle = wmFace ? ` style="font-family:'${esc(wmFace.name)}',Georgia,serif"` : '';
  return `
  <section class="s" id="final">
    <div class="wrap">
      <p class="eyebrow">The recommendation</p>
      <div class="s__h"><span class="s__n">06 · The lockup</span>
        <div><h2>${esc(d.name)}, ${esc(t.name.toLowerCase())} &mdash; as one signature.</h2>
        <p class="s__l">The mark and the name locked up, at the size it will actually be seen ${
          wmFace ? `&mdash; mark, ${esc(wmFace.name)} wordmark and Hanken Grotesk body, all three confirmed` : ''
        }. This is the artwork that goes on the site header, the superbill, the intake forms and the
          front of the practice.</p></div>
      </div>
      <div class="fin">
        ${d.clientPick ? '<span class="six__badge">Nancy\'s pick</span>' : ''}
        ${tracedSvg(d.mark, { height: 104, color: '#' + hexOf('Sunburst Rose') })}
        <p class="fin__wm"${wmStyle}>${esc(WORDMARK)}</p>
        <p class="fin__sub">${esc(SUBLOCK)}</p>
        <p class="fin__body">Hormones, metabolic health, and sexual health &mdash; with the time to
          get it right.</p>
      </div>
      <div class="fin__set">
        <figure class="fin__v">
          <div class="fin__box">
            ${tracedSvg(d.mark, { height: 40, color: '#' + hexOf('Sunburst Rose') })}
            <p class="fin__wm--in"${wmStyle}>${esc(WORDMARK)}</p>
          </div>
          <figcaption>Horizontal &mdash; site header, footer, email signature</figcaption>
        </figure>
        <figure class="fin__v">
          <div class="fin__box">
            ${tracedSvg(d.mark, { height: 74, color: '#' + hexOf('Sunburst Rose'),
              contain: 'rect', ground: '#' + hexOf('Peach') })}
          </div>
          <figcaption>App tile &mdash; favicon, phone, appointment email</figcaption>
        </figure>
        <figure class="fin__v">
          <div class="fin__box fin__box--peach">
            ${tracedSvg(d.mark, { height: 40, color: '#' + hexOf('Sunburst Rose') })}
            <p class="fin__wm--in"${wmStyle}>${esc(WORDMARK)}</p>
          </div>
          <figcaption>On peach &mdash; unchanged, no second cut</figcaption>
        </figure>
      </div>
    </div>
  </section>`;
}

// ── what is honest about it ───────────────────────────────────────────────────
// Included because the sheet is for deciding, and a client deciding on flattery
// decides badly. Both directions carry three of these.
function theHonest(d) {
  const other = DIRECTIONS.find(x => x.id !== d.id);
  return `
  <section class="s" id="honest">
    <div class="wrap">
      <div class="s__h"><span class="s__n">07 · Straight answer</span>
        <div><h2>What this direction costs you.</h2>
        <p class="s__l">Its strength is one line: <strong>${esc(d.strength)}</strong>
          Here is the other side of it &mdash; the same three questions are answered on
          Option ${other.option}.</p></div>
      </div>
      <ul class="hon">${d.honest.map(h => `<li>${esc(h)}</li>`).join('')}</ul>
    </div>
  </section>`;
}

// ── take it with you ──────────────────────────────────────────────────────────
// One artefact, not two, and it is an HTML sheet rather than a PDF on purpose.
// The Beyond Infinity round shipped two committed PDFs that the preview host
// answered 404 for on every route, including the immutable per-deploy alias — so
// a dead download button reached the client. The sheet is print-styled Letter
// portrait: Print → Save as PDF produces the same document, and it cannot 404.
function downloads(d) {
  const other = DIRECTIONS.find(x => x.id !== d.id);
  return `
  <section class="s" id="sheet">
    <div class="wrap">
      <div class="s__h"><span class="s__n">08 · Take it with you</span>
        <div><h2>One sheet, everything specified.</h2>
        <p class="s__l">Letter portrait and print-styled &mdash; Print, then Save as PDF, and hand
          it to an illustrator, a printer or a sign shop.</p></div>
      </div>
      <div class="dl">
        <a href="logo-selection-visid-${d.id}.html">
          ${SHEET_ICON}<span><strong>The ${esc(d.name)} sheet</strong>
          <span>Lockup, mark at size, clear space, colour with RGB and CMYK, type per platform,
            reproduction and misuse.</span></span></a>
        <a href="logo-selection-visid-${other.id}.html">
          ${SHEET_ICON}<span><strong>The ${esc(other.name)} sheet</strong>
          <span>The same page for Option ${other.option}, so the two can be compared on paper
            rather than on screen.</span></span></a>
        <a class="dl__wide" href="Solas-VisID.pptx">
          ${DECK_ICON}<span><strong>PowerPoint deck</strong>
          <span>Both options in one file &mdash; cover, Daybreak, Radiance, colour, type and a
            sign-off slide with a signature line. For sending or presenting rather than
            printing.</span></span></a>
      </div>
    </div>
  </section>`;
}

// ── the question ──────────────────────────────────────────────────────────────
function ask(d) {
  const other = DIRECTIONS.find(x => x.id !== d.id);
  const picked = DIRECTIONS.find(x => x.clientPick);
  if (!picked) return `
  <section class="ask">
    <div class="wrap">
      <h2>${esc(d.name)}, or ${esc(other.name)}?</h2>
      <p>Name one direction and one treatment and the rest of the identity follows &mdash; the full
        file set, the favicon, the social avatar and the one-colour version all come off the same
        geometry. A ranking is not needed; one answer is.</p>
      <a class="btn" href="${pageFor(other)}">See Option ${other.option} &middot; ${esc(other.name)} &rarr;</a>
    </div>
  </section>`;

  // A pick exists — this section shows it in full, identically on both option
  // pages, rather than still asking the question. See the matching hub.js ask().
  const notPicked = DIRECTIONS.find(x => x !== picked);
  const t = TREATMENTS.find(x => x.id === picked.recommend);
  const wm = DISPLAY_FACES.find(f => f.clientPick);
  const wmStyle = ` style="font-size:32px${wm ? `;font-family:'${esc(wm.name)}',Georgia,serif` : ''}"`;
  const body = TYPE.body;
  return `
  <section class="ask" id="decision">
    <div class="wrap">
      <p class="eyebrow">The decision</p>
      <h2>${esc(picked.name)}, confirmed.</h2>
      <p>The client review came back unanimous: Option ${esc(picked.option)} &middot;
        ${esc(picked.name)}, the ${esc(t.name)} treatment${wm ? `, ${esc(wm.name)} for the wordmark and
        every heading` : ''}${body ? ` and ${esc(body.name)} for body copy` : ''}. Option
        ${esc(notPicked.option)} &middot; ${esc(notPicked.name)} stays on this page for the record;
        everything downstream builds from ${esc(picked.name)}.</p>
      <div class="fin" style="margin:24px 0;max-width:420px">
        <span class="six__badge">Nancy's pick</span>
        ${tracedSvg(picked.mark, { height: 72, color: '#' + hexOf('Sunburst Rose') })}
        <p class="fin__wm"${wmStyle}>${esc(WORDMARK)}</p>
        <p class="fin__sub">${esc(SUBLOCK)}</p>
      </div>
      <a class="btn" href="${pageFor(picked)}">Open Option ${esc(picked.option)} &middot; ${esc(picked.name)} &rarr;</a>
    </div>
  </section>`;
}

// ── page ──────────────────────────────────────────────────────────────────────
function page(d) {
  const other = DIRECTIONS.find(x => x.id !== d.id);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Option ${d.option} · ${esc(d.name)} — Solas Women’s Health logo selection</title>
<meta name="description" content="Solas Women’s Health, Option ${d.option}: ${esc(d.name)}. ${esc(d.thesis)} The mark at size, six treatments, the name in six faces, four colourways and the sheet."/>
<!-- Self-hosted, never linked. A webfont that fails to load does not throw — it
     renders the fallback, and on a page whose subject IS a comparison between six
     display serifs that silently becomes six cards of the same face. See
     scripts/logo-selection/fonts.js. -->
<link href="${ASSETS}/fonts/fonts.css" rel="stylesheet"/>
<style>:root{${TOKENS}}${CSS}</style>
</head>
<body>
<a class="skip" href="#mark">Skip to content</a>

<nav class="top" aria-label="The two directions">
  <div class="wrap top__in">
    <a class="top__lock" href="logo-selection.html">
      ${tracedSvg(traceKeyFor(d.mark, 26), { height: 26 })}
      <span class="top__wm">${esc(WORDMARK)}</span>
    </a>
    <a class="tab" href="logo-selection.html">Both</a>
    ${DIRECTIONS.map(x => `<a class="tab" href="${pageFor(x)}"${x.id === d.id ? ' aria-current="page"' : ''}>Option ${x.option} &middot; ${esc(x.name)}</a>`).join('')}
  </div>
</nav>

<main>
${hero(d)}
${theMark(d)}
${theSix(d)}
${theFaces(d)}
${theType()}
${theWays(d)}
${theFinal(d)}
${theHonest(d)}
${downloads(d)}
${ask(d)}
</main>

<footer class="ftr">
  <div class="wrap">
    <p>Solas Women’s Health &middot; logo selection, prepared by YohDev &middot;
      <a href="logo-selection.html">Both directions</a> &middot;
      <a href="index.html">Back to the proposal</a></p>
  </div>
</footer>
</body>
</html>
`;
}

function build() {
  const written = [];
  for (const d of DIRECTIONS) {
    const out = path.join(DEMO, pageFor(d));
    fs.writeFileSync(out, page(d));
    written.push(path.relative(ROOT, out));
  }
  return written;
}

module.exports = { build, page, pageFor, WORDMARK, SUBLOCK };
if (require.main === module) for (const f of build()) console.log('wrote', f);
