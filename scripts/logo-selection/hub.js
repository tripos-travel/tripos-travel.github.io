#!/usr/bin/env node
// The hub — logo-selection.html. The one page to send, and the only thing that
// has to be opened before a decision can be made.
//
// It is deliberately NOT a third option page. Its whole job is to put the two
// directions next to each other, state what each claims and what each costs, and
// then get out of the way. Everything that takes more than a glance lives one
// click deeper.
//
// The five-axis table is here rather than on the option pages because it only
// means anything as a comparison: it is the evidence that these are two
// directions and not one direction shown twice. check.js asserts the same thing
// before this page is built.

const fs = require('fs'), path = require('path');
const { DIRECTIONS, TREATMENTS_UNUSED, hexOf, DISPLAY_FACES } = require('./directions.js');
const { TREATMENTS } = require('./marks.js');
const { tracedSvg, traceKeyFor } = require('./traced.js');
const { TOKENS, CSS, SHEET_ICON, DECK_ICON, esc } = require('./shell.js');
const { pageFor, WORDMARK, SUBLOCK } = require('./review.js');

const ROOT = path.join(__dirname, '..', '..');
const DEMO = path.join(ROOT, 'demos', 'rodwell-tuohy');
const ASSETS = 'logo-selection-assets';
const tidy = s => String(s).replace(/\s+/g, ' ').trim();

const AXES = [
  ['Metaphor',        'metaphor'],
  ['Built from',      'primitive'],
  ['Symmetry',        'symmetry'],
  ['Where the space is', 'space'],
  ['Mass or line',    'massLine'],
];

// ── the two, side by side ─────────────────────────────────────────────────────
function options() {
  return `
  <section class="s" id="options">
    <div class="wrap">
      <div class="s__h"><span class="s__n">01 · The two directions</span>
        <div><h2>Both come from your own design system.</h2>
        <p class="s__l">Neither of these is a new idea. Your design system already carries three
          logo cards under &ldquo;Three starting points for the mark&rdquo;; these are the two of
          them that are genuinely different directions, rebuilt with real construction so they can
          be scaled, recoloured and specified rather than just looked at.</p></div>
      </div>
      <div class="opts">
        ${DIRECTIONS.map(d => {
          const t = TREATMENTS.find(x => x.id === d.recommend);
          return `
        <article class="opt"${d.clientPick ? ' data-picked' : ''}>
          <div class="opt__art">
            ${d.clientPick ? '<span class="opt__badge">Nancy\'s pick</span>' : ''}
            ${tracedSvg(d.mark, { height: 118, color: '#' + hexOf('Sunburst Rose'), frame: 'square' })}
          </div>
          <div class="opt__body">
            <p class="eyebrow">Option ${d.option} &middot; from &ldquo;${esc(d.from)}&rdquo;</p>
            <h3 class="opt__h">${esc(d.name)}</h3>
            <p class="opt__t">${esc(d.thesis)}</p>
            <p class="opt__s"><strong>Its strength.</strong> ${esc(d.strength)}</p>
            <p class="opt__c"><strong>Its cost.</strong> ${esc(d.honest[0])}</p>
            <p class="opt__r">Recommended treatment &mdash; ${esc(t.name)}</p>
            <a class="btn" href="${pageFor(d)}">Open Option ${d.option} &rarr;</a>
          </div>
        </article>`; }).join('')}
      </div>
    </div>
  </section>`;
}

// ── why these are two directions ──────────────────────────────────────────────
function axes() {
  const [a, b] = DIRECTIONS;
  return `
  <section class="s" id="differ">
    <div class="wrap">
      <div class="s__h"><span class="s__n">02 · Why two</span>
        <div><h2>They differ all the way down.</h2>
        <p class="s__l">The failure mode in a logo round is being shown four takes on one idea and
          being asked to choose. So these two are held to a rule: they have to differ
          structurally, not decoratively. Changing an adjective is a variation; changing the
          metaphor is a direction. These differ on all five counts, and the build refuses to
          publish them if they ever stop doing so.</p></div>
      </div>
      <div class="tbl">
        <table>
          <caption class="vh">How Option A and Option B differ, on five structural axes</caption>
          <thead><tr><th scope="col">&nbsp;</th>
            <th scope="col">A &middot; ${esc(a.name)}</th>
            <th scope="col">B &middot; ${esc(b.name)}</th></tr></thead>
          <tbody>
            ${AXES.map(([label, key]) => `<tr>
              <th scope="row">${esc(label)}</th>
              <td>${esc(a[key])}</td><td>${esc(b[key])}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="call">
        <p><strong>What happened to the third card.</strong> The design system&rsquo;s third logo
          card &mdash; &ldquo;C &middot; On peach, rule variant&rdquo; &mdash; is a wordmark-and-rule
          <em>lockup</em>, not a mark. It is not a third direction, so it is not offered as one; it
          survives as the alternate lockup on whichever direction you pick. Recorded here so a
          later round does not put it back on the table as an option.</p>
      </div>
    </div>
  </section>`;
}

// ── how to decide ─────────────────────────────────────────────────────────────
function how() {
  return `
  <section class="s" id="how">
    <div class="wrap">
      <div class="s__h"><span class="s__n">03 · What we need back</span>
        <div><h2>One direction and one treatment.</h2>
        <p class="s__l">Not a ranking &mdash; one answer. Everything downstream comes off the same
          geometry, so as soon as there is a direction and a treatment the full file set follows
          without another round.</p></div>
      </div>
      <ol class="steps">
        <li><strong>Open both options.</strong> Each page is one scroll: the mark at the sizes that
          decide it, six treatments, the name in six faces, four colourways, and the lockup.</li>
        <li><strong>Name a direction and a treatment.</strong> &ldquo;B, bold cut&rdquo; is a
          complete answer. If you want a change inside a direction &mdash; more rays, a thinner
          stroke, a different lockup &mdash; say that instead and it comes back redrawn.</li>
        <li><strong>We build the real file set.</strong> Full colour, one colour, reversed, favicon
          and social avatar, plus the sheet for the printer &mdash; all from the same coordinates,
          so nothing drifts between them.</li>
      </ol>
      <div class="call">
        <p><strong>This does not close the artist track.</strong> Your playbook records the logo as
          <em>in progress with an artist, going in its own direction</em>, and that stays true. What
          this gives you is a launch-safe mark you can build and ship on now, plus a precise brief
          &mdash; construction, sizes, colourways, reproduction limits &mdash; for whoever draws the
          final one.</p>
        <p><strong>Nothing here changes your proposal.</strong> The walkthrough, homepage, packages
          page, design system and sitemap are exactly as they were; this flow lives on its own
          path and adds no page to them.</p>
      </div>
    </div>
  </section>`;
}

// ── the sheets ────────────────────────────────────────────────────────────────
function sheets() {
  return `
  <section class="s" id="sheets">
    <div class="wrap">
      <div class="s__h"><span class="s__n">04 · On paper</span>
        <div><h2>One sheet per direction.</h2>
        <p class="s__l">Letter portrait and print-styled &mdash; Print, then Save as PDF. Lockup,
          mark at size, clear space, colour with RGB and CMYK, type per platform, reproduction and
          misuse. The page a printer, a sign shop or an illustrator actually reads.</p></div>
      </div>
      <div class="dl">
        ${DIRECTIONS.map(d => `
        <a href="logo-selection-visid-${d.id}.html">
          ${SHEET_ICON}<span><strong>Option ${d.option} &middot; ${esc(d.name)}</strong>
          <span>${esc(d.thesis)} Specified end to end, with every colour value measured rather
            than asserted.</span></span></a>`).join('')}
        <a class="dl__wide" href="Solas-VisID.pptx">
          ${DECK_ICON}<span><strong>PowerPoint deck</strong>
          <span>Both options in one file &mdash; cover, Daybreak, Radiance, colour, type and a
            sign-off slide with a signature line. For sending or presenting rather than
            printing.</span></span></a>
      </div>
    </div>
  </section>`;
}

const EXTRA = `
.opts{display:grid;gap:clamp(16px,2.4vw,22px);grid-template-columns:1fr}
@media(min-width:860px){.opts{grid-template-columns:1fr 1fr}}
.opt{border:1px solid var(--line);border-radius:var(--r);background:var(--white);overflow:hidden;
  display:flex;flex-direction:column}
.opt[data-picked]{border-color:var(--terracotta);box-shadow:0 0 0 1px var(--terracotta)}
.opt__art{background:var(--peach-soft);display:grid;place-items:center;padding:clamp(30px,4vw,52px);
  position:relative}
.opt__art svg{color:var(--terracotta);width:auto}
.opt__badge{position:absolute;top:14px;left:14px;font-family:var(--font-body);font-size:9.5px;
  font-weight:800;letter-spacing:0.13em;text-transform:uppercase;background:var(--terracotta);
  color:var(--cream);padding:5px 10px;border-radius:2px}
.opt__body{padding:clamp(22px,3vw,30px);display:flex;flex-direction:column;flex:1}
.opt__h{font-size:clamp(28px,3.6vw,38px);font-weight:400;margin:0 0 10px}
.opt__t{font-family:var(--font-display);font-size:20px;color:var(--terracotta);margin:0 0 18px;
  line-height:1.3}
.opt__s,.opt__c{font-size:14.5px;color:var(--ink-2);margin:0 0 12px;line-height:1.65}
.opt__r{font-family:var(--font-body);font-size:11px;font-weight:800;letter-spacing:0.14em;
  text-transform:uppercase;color:var(--muted);margin:auto 0 0;padding-top:16px;
  border-top:1px solid var(--line)}
/* margin-top:auto on the LABEL, not the button: the two cards carry different
   amounts of copy, and pushing only the button down left the two "recommended
   treatment" rules at different heights. */
.opt .btn{align-self:flex-start;margin-top:18px}

.tbl{overflow-x:auto;border:1px solid var(--line);border-radius:var(--r);background:var(--white)}
table{border-collapse:collapse;width:100%;min-width:640px;font-size:14.5px}
th,td{text-align:left;padding:15px 18px;border-bottom:1px solid var(--line);vertical-align:top;
  color:var(--ink-2);line-height:1.6}
thead th{font-family:var(--font-body);font-size:11px;font-weight:800;letter-spacing:0.14em;
  text-transform:uppercase;color:var(--ink);background:var(--peach-soft);white-space:nowrap}
tbody th{font-family:var(--font-body);font-size:11px;font-weight:800;letter-spacing:0.12em;
  text-transform:uppercase;color:var(--muted);white-space:nowrap;width:180px}
tbody tr:last-child th,tbody tr:last-child td{border-bottom:0}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

.steps{counter-reset:s;list-style:none;margin:0;padding:0;display:grid;gap:13px;
  grid-template-columns:1fr}
@media(min-width:860px){.steps{grid-template-columns:repeat(3,1fr)}}
.steps li{counter-increment:s;background:var(--white);border:1px solid var(--line);
  border-radius:var(--r);padding:22px 24px;font-size:14.5px;color:var(--ink-2);line-height:1.65}
.steps li::before{content:counter(s);display:block;font-family:var(--font-display);font-size:26px;
  color:var(--terracotta);margin-bottom:8px;line-height:1}
`;

function page() {
  const [a, b] = DIRECTIONS;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Logo selection — Solas Women’s Health</title>
<meta name="description" content="Two directions for the Solas Women’s Health mark — Daybreak and Radiance — both rebuilt from the brand’s own design system, with the sheets to decide from."/>
<link href="${ASSETS}/fonts/fonts.css" rel="stylesheet"/>
<style>:root{${TOKENS}}${CSS}${EXTRA}</style>
</head>
<body>
<a class="skip" href="#options">Skip to content</a>

<nav class="top" aria-label="The two directions">
  <div class="wrap top__in">
    <a class="top__lock" href="logo-selection.html">
      ${tracedSvg(traceKeyFor(a.mark, 26), { height: 26 })}
      <span class="top__wm">${esc(WORDMARK)}</span>
    </a>
    <a class="tab" href="logo-selection.html" aria-current="page">Both</a>
    <a class="tab" href="${pageFor(a)}">Option A &middot; ${esc(a.name)}</a>
    <a class="tab" href="${pageFor(b)}">Option B &middot; ${esc(b.name)}</a>
  </div>
</nav>

<main>
  <section class="wrap hero">
    <div>
      <p class="eyebrow">Solas Women’s Health &middot; logo selection</p>
      <h1>Two directions for the mark.</h1>
      <p class="hero__p">Solas is the Gaelic word for light, and both directions are a sun &mdash;
        because that is what your design system already had. Where they part company is what the
        sun is <em>doing</em>. One is coming up over a horizon; the other is simply shining. That is
        a real difference in what the brand claims, and it is the choice on this page.</p>
      <blockquote class="hero__q">“a lot of women feel like they’re down in a darker place than
        they’d want to be… just that you’ve got a little spark again — like a weight gets lifted”
        <span>Nancy, discovery call</span></blockquote>
    </div>
    <div class="hero__mk">
      ${tracedSvg(b.mark, { height: 128, color: '#' + hexOf('Sunburst Rose'),
          label: 'The Solas mark, Radiance direction' })}
    </div>
  </section>
${options()}
${axes()}
${how()}
${sheets()}
  <section class="ask">
    <div class="wrap">
      ${(() => {
        const picked = DIRECTIONS.find(d => d.clientPick);
        if (!picked) return `
      <h2>${esc(a.name)}, or ${esc(b.name)}?</h2>
      <p>Open both, then name one direction and one treatment. That is everything needed to build
        the full file set &mdash; and it is the last decision this part of the brand needs.</p>
      <a class="btn" href="${pageFor(a)}">Start with Option A &middot; ${esc(a.name)} &rarr;</a>`;
        const other = DIRECTIONS.find(d => d !== picked);
        const t = TREATMENTS.find(x => x.id === picked.recommend);
        const wm = DISPLAY_FACES.find(f => f.clientPick);
        return `
      <h2>${esc(picked.name)} it is.</h2>
      <p>The client review came back unanimous on Option ${esc(picked.option)} &middot;
        ${esc(picked.name)} &mdash; the ${esc(t.name)} treatment${wm ? `, ${esc(wm.name)} for the
        wordmark and every heading` : ''}.
        Option ${esc(other.option)} &middot; ${esc(other.name)} stays on this page for the record;
        everything downstream builds from ${esc(picked.name)}.</p>
      <a class="btn" href="${pageFor(picked)}">Open Option ${esc(picked.option)} &middot; ${esc(picked.name)} &rarr;</a>`;
      })()}
    </div>
  </section>
</main>

<footer class="ftr">
  <div class="wrap">
    <p>Solas Women’s Health &middot; ${esc(SUBLOCK)} &middot; logo selection, prepared by YohDev
      &middot; <a href="index.html">Back to the proposal</a></p>
  </div>
</footer>
</body>
</html>
`;
}

function build() {
  const out = path.join(DEMO, 'logo-selection.html');
  fs.writeFileSync(out, page());
  return [path.relative(ROOT, out)];
}

module.exports = { build, page };
if (require.main === module) for (const f of build()) console.log('wrote', f);
