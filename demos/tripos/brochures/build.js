#!/usr/bin/env node
'use strict';

/**
 * TripOS brochure builder. Zero dependencies.
 *
 * Turns one trip file (JSON) into a personalized, printable trip brochure:
 *   1. Cover          the traveler's trip as a ticket
 *   2. One board      every plan from every app, with status
 *   3. Plan B         their own mid-trip worry, answered step by step
 *   4. Know before    destination essentials, checklist, sources
 *
 * The output is ONE self-contained .html file (fonts and styles embedded), so it
 * can be emailed, texted, opened offline, or printed to PDF from any browser
 * (Ctrl+P / Cmd+P, "Save as PDF", Letter, margins: none, background graphics: on).
 *
 * Usage:
 *   node demos/tripos/brochures/build.js <trip.json> [more.json ...]
 *   node demos/tripos/brochures/build.js --all          # every file in brochures/data/
 *   npm run brochure -- demos/tripos/brochures/data/maya-paris.json
 *
 * Where it writes:
 *   - A trip file with "sample": true  -> demos/tripos/output/Sample-Brochure.html (public)
 *   - Anything else                    -> demos/tripos/brochures/out/<slug>.html   (git-ignored:
 *     real students' names and plans never go on the public site)
 *
 * Trip file format: see brochures/data/sample-london.json and the trip-brochure skill.
 * Any section whose data is missing is left out rather than filled with filler.
 */

const fs = require('fs');
const path = require('path');

const BRAND = path.resolve(__dirname, '..');
const CSS = path.join(BRAND, 'output', 'assets', 'css', 'tripos.css');
const FONTS = path.join(BRAND, 'output', 'assets', 'fonts');
const DATA = path.join(__dirname, 'data');
const OUT_PRIVATE = path.join(__dirname, 'out');
const OUT_SAMPLE = path.join(BRAND, 'output', 'Sample-Brochure.html');

/* ---------------- helpers ---------------- */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const has = (v) => Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '';
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'trip';
const possessive = (name) => /s$/i.test(name) ? `${name}’` : `${name}’s`;
const STATUS = { go: 'status--go', flap: 'status--flap', alert: 'status--alert' };

function embeddedCss() {
  let css = fs.readFileSync(CSS, 'utf8');
  // Inline every font as a data URI so the brochure works as a single file.
  css = css.replace(/url\("\.\.\/fonts\/([^"]+)"\)/g, (_, file) => {
    const b64 = fs.readFileSync(path.join(FONTS, file)).toString('base64');
    return `url("data:font/woff2;base64,${b64}")`;
  });
  return css;
}

function findTodos(obj, trail = '') {
  const out = [];
  if (typeof obj === 'string') { if (/\bTODO\b/.test(obj)) out.push(trail || '(root)'); }
  else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) out.push(...findTodos(v, trail ? `${trail}.${k}` : k));
  }
  return out;
}

/* ---------------- sections ---------------- */
function cover(d) {
  const t = d.trip || {};
  const name = d.traveler && d.traveler.firstName;
  const title = has(t.name) ? `${possessive(name)} ${t.name.charAt(0).toLowerCase()}${t.name.slice(1)}.` : `${possessive(name)} trip to ${t.to}.`;
  const cells = [
    ['From', t.from], ['To', t.to], ['Dates', t.dates], ['Crew', has(t.crew) ? t.crew.join(', ') : ''],
  ].filter(([, v]) => has(v));
  return `
  <section class="sheet sheet--cover on-board" aria-labelledby="cover-title">
    <div class="cover__top">
      <span class="wordmark">Trip<span class="wordmark__tile">OS</span></span>
      <span class="label cover__for">Trip brochure for ${esc(name)}</span>
    </div>
    ${d.sample ? '<p class="cover__sample label">Sample brochure &middot; example data</p>' : ''}
    <h1 class="display cover__title" id="cover-title">${esc(title)}</h1>
    <dl class="ticket">
      ${cells.map(([k, v]) => `<div class="ticket__cell"><dt class="label">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}
    </dl>
  </section>`;
}

function boardPage(d) {
  if (!has(d.board)) return '';
  const a = d.answers || {};
  const rows = d.board.map((r) => `
          <tr>
            <td class="board__time">${esc([r.day, r.time].filter(Boolean).join(' '))}</td>
            <td><span class="board__what">${esc(r.what)}</span>${has(r.src) ? `<br><span class="board__src">from: ${esc(r.src)}</span>` : ''}</td>
            <td><span class="status ${STATUS[r.kind] || STATUS.go}">${esc(r.status)}</span></td>
          </tr>`).join('');
  return `
  <section class="sheet" aria-labelledby="board-title">
    <p class="label sheet__kicker">Page 2 &middot; Your plan</p>
    <h2 class="display sheet__title" id="board-title">Your trip on one board.</h2>
    ${has(a.storedIn) ? `<p class="sheet__lede">You told us your trip lives in <q>${esc(a.storedIn)}</q>. Here it is in one place, in order.</p>` : ''}
    <div class="board">
      <div class="board__head">
        <span class="board__title">${esc((d.trip && d.trip.to) || 'Your trip')}${has(d.trip && d.trip.crew) ? ` &middot; ${d.trip.crew.length} traveler${d.trip.crew.length === 1 ? '' : 's'}` : ''}</span>
        <span class="board__clock">${esc((d.trip && d.trip.dates) || '')}</span>
      </div>
      <table class="board__table">
        <caption class="sr-only">Every plan for the trip, with where it came from and its status.</caption>
        <thead><tr><th scope="col">When</th><th scope="col">Plan</th><th scope="col">Status</th></tr></thead>
        <tbody>${rows}
        </tbody>
      </table>
    </div>
    ${has(d.boardNote) ? `<p class="sheet__note">${esc(d.boardNote)}</p>` : ''}
  </section>`;
}

function planBPage(d) {
  const p = d.planB;
  const a = d.answers || {};
  if (!p || !has(p.steps)) return '';
  return `
  <section class="sheet" aria-labelledby="planb-title">
    <p class="label sheet__kicker">Page 3 &middot; Your plan B</p>
    <h2 class="display sheet__title" id="planb-title">${esc(p.title || 'Your plan B.')}</h2>
    ${has(a.worry) ? `<blockquote class="told"><p class="label">You told us</p><p class="told__quote">&ldquo;${esc(a.worry)}&rdquo;</p></blockquote>` : ''}
    <ol class="ledger steps">
      ${p.steps.map((s, i) => `<li class="ledger__row"><span class="ledger__n">${String(i + 1).padStart(2, '0')}</span><span class="ledger__text">${has(s.title) ? `<strong>${esc(s.title)}</strong> ` : ''}${esc(s.text || s)}</span></li>`).join('')}
    </ol>
    ${has(a.lastTrip) && has(d.lastTripFix) ? `
    <div class="lasttime">
      <div><p class="label">Last time</p><p>&ldquo;${esc(a.lastTrip)}&rdquo;</p></div>
      <div><p class="label">This time</p><p>${esc(d.lastTripFix)}</p></div>
    </div>` : ''}
  </section>`;
}

function essentialsPage(d) {
  if (!has(d.essentials) && !has(d.checklist)) return '';
  const t = d.trip || {};
  return `
  <section class="sheet" aria-labelledby="ess-title">
    <p class="label sheet__kicker">Page 4 &middot; Before you land</p>
    <h2 class="display sheet__title" id="ess-title">Know before you land${has(t.to) ? ` in ${esc(t.to)}` : ''}.</h2>
    <div class="ess">
      ${has(d.essentials) ? `<dl class="facts">${d.essentials.map((e) => `<div class="facts__row"><dt class="label">${esc(e.k)}</dt><dd>${esc(e.v)}</dd></div>`).join('')}</dl>` : ''}
      ${has(d.checklist) ? `<div class="check"><h3 class="label">Pack and prep</h3><ul>${d.checklist.map((c) => `<li><span class="box" aria-hidden="true"></span>${esc(c)}</li>`).join('')}</ul></div>` : ''}
    </div>
    <div class="sheet__foot">
      ${has(d.contact) ? `<p class="contact"><span class="label">Mid-trip and stuck?</span> ${esc(d.contact)}</p>` : ''}
      ${has(d.sources) ? `<p class="sources"><span class="label">Sources</span> ${d.sources.map((s) => `<a href="${esc(s.url)}">${esc(s.label)}</a>`).join(' &middot; ')}</p>` : ''}
      <p class="made"><span class="wordmark">Trip<span class="wordmark__tile">OS</span></span> Made for ${esc(d.traveler.firstName)}${d.preparedOn ? ` on ${esc(d.preparedOn)}` : ''}.</p>
    </div>
  </section>`;
}

/* ---------------- page ---------------- */
const BROCHURE_CSS = `
  body{background:#D9D3C4}
  .sheets{display:flex;flex-direction:column;align-items:center;gap:28px;padding:28px 12px 60px}
  .sheet{position:relative;width:100%;max-width:8.5in;min-height:11in;background:var(--paper);color:var(--ink);padding:.7in .65in;display:flex;flex-direction:column;box-shadow:0 1px 0 rgba(20,22,28,.08),0 18px 40px -24px rgba(20,22,28,.45)}
  .sheet--cover{background:var(--board);color:var(--chalk);justify-content:space-between}
  .cover__top{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
  .cover__top .wordmark{font-size:30px;color:var(--chalk)}
  .cover__for{color:var(--chalk-2)}
  .cover__sample{position:absolute;top:1.35in;left:.65in;background:var(--flap);color:var(--ink);padding:7px 10px;border-radius:4px}
  .cover__title{font-size:clamp(54px,11vw,104px);color:var(--chalk);max-width:8ch;margin-top:auto}
  .ticket{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:.5in;border-top:2px dashed var(--line-board)}
  .ticket__cell{padding:16px 16px 14px 0;border-bottom:1px solid var(--line-board)}
  .ticket__cell:nth-child(even){padding-left:16px;border-left:1px solid var(--line-board)}
  .ticket dt{color:var(--flap);margin-bottom:6px}
  .ticket dd{font-family:var(--mono);font-weight:700;font-size:16px;color:var(--chalk)}
  .sheet__kicker{color:var(--flap-line);margin-bottom:18px}
  .sheet__title{font-size:clamp(44px,8vw,76px);max-width:11ch;margin-bottom:22px}
  .sheet__lede{font-size:18px;color:var(--ink-2);max-width:52ch;margin-bottom:26px}
  .sheet__lede q{color:var(--ink);font-weight:600}
  .sheet__note{margin-top:18px;font-size:15px;color:var(--ink-2);max-width:60ch}
  .sheet .board__table{font-size:13px}
  .told{margin:6px 0 26px;padding:20px 22px;background:var(--paper-2);border-left:4px solid var(--flap-line);border-radius:0 var(--r) var(--r) 0}
  .told .label{color:var(--flap-line);margin-bottom:8px}
  .told__quote{font-family:var(--display);font-weight:600;font-stretch:88%;font-size:26px;line-height:1.15;letter-spacing:-.02em}
  .steps .ledger__text{font-size:16.5px}
  .steps strong{font-weight:700}
  .lasttime{margin-top:auto;display:grid;grid-template-columns:1fr 1fr;border-top:2px solid var(--ink);padding-top:18px;gap:24px}
  .lasttime .label{color:var(--flap-line);margin-bottom:6px}
  .lasttime p{font-size:15.5px;line-height:1.5}
  .ess{display:grid;grid-template-columns:7fr 5fr;gap:32px;align-items:start}
  .facts{border-top:2px solid var(--ink)}
  .facts__row{display:grid;grid-template-columns:11ch minmax(0,1fr);gap:12px;padding:11px 0;border-bottom:1px solid var(--line-paper);align-items:baseline}
  .facts dt{color:var(--flap-line)}
  .facts dd{font-size:15px;line-height:1.45}
  .check{background:var(--paper-2);padding:18px 18px 8px;border-radius:var(--r)}
  .check .label{margin-bottom:10px}
  .check li{display:flex;gap:10px;align-items:flex-start;font-size:15px;line-height:1.4;padding:7px 0;border-top:1px solid var(--line-paper)}
  .box{flex:none;width:14px;height:14px;border:2px solid var(--ink);border-radius:3px;margin-top:3px}
  .sheet__foot{margin-top:auto;padding-top:24px;display:grid;gap:10px;font-size:14px;color:var(--ink-2)}
  .sheet__foot .label{color:var(--ink);margin-right:8px}
  .sources a{color:var(--ink-2);text-underline-offset:3px}
  .made{display:flex;align-items:center;gap:10px;padding-top:12px;border-top:1px solid var(--line-paper)}
  .made .wordmark{font-size:20px;color:var(--ink)}
  .printbar{position:sticky;top:0;z-index:5;display:flex;justify-content:center;gap:12px;padding:12px;background:var(--board)}
  @media (max-width:640px){
    .sheet{min-height:0;padding:36px 22px}
    .sheet--cover{min-height:88svh}
    .cover__sample{position:static;align-self:flex-start;margin-top:20px}
    .ticket{grid-template-columns:1fr}
    .ticket__cell:nth-child(even){padding-left:0;border-left:0}
    .ess,.lasttime{grid-template-columns:1fr}
    .facts__row{grid-template-columns:1fr;gap:2px}
  }
  @page{size:letter;margin:0}
  @media print{
    body{background:none}
    .printbar{display:none}
    .sheets{padding:0;gap:0;display:block}
    .sheet{width:8.5in;max-width:none;height:11in;min-height:0;box-shadow:none;break-after:page;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .sheet:last-child{break-after:auto}
    .sheet:not(.sheet--cover){padding:.55in .6in}
    .sheet .board__table td{padding:8px 10px}
    .sheet__title{margin-bottom:16px}
  }
`;

function render(d) {
  const name = d.traveler.firstName;
  const to = (d.trip && d.trip.to) || 'your trip';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(possessive(name))} trip brochure: ${esc(to)} | TripOS</title>
  <meta name="description" content="${esc(d.sample ? 'A sample TripOS trip brochure with example data: the trip on one board, a plan B, and what to know before you land.' : `A personalized TripOS trip brochure for ${name}.`)}">
  ${d.sample ? '' : '<meta name="robots" content="noindex, nofollow">'}
  <style>${embeddedCss()}${BROCHURE_CSS}</style>
</head>
<body>
  <a class="skip" href="#brochure">Skip to brochure</a>
  <div class="printbar on-board">
    <button class="btn btn--flap" type="button" onclick="window.print()"><span>Print or save as PDF</span></button>
  </div>
  <main class="sheets" id="brochure">
${cover(d)}
${boardPage(d)}
${planBPage(d)}
${essentialsPage(d)}
  </main>
</body>
</html>
`;
}

/* ---------------- run ---------------- */
function build(file) {
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!d.traveler || !has(d.traveler.firstName)) throw new Error(`${file}: traveler.firstName is required`);
  const todos = findTodos(d);
  if (todos.length) {
    console.warn(`  ! ${path.basename(file)} still has TODOs (${todos.join(', ')}). Those parts will print as written.`);
  }
  const out = d.sample ? OUT_SAMPLE : path.join(OUT_PRIVATE, `${d.slug || slugify(`${d.traveler.firstName}-${(d.trip && d.trip.to) || 'trip'}`)}.html`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, render(d));
  console.log(`  ✓ ${path.relative(process.cwd(), out)}`);
  return out;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const files = args.includes('--all')
    ? fs.readdirSync(DATA).filter((f) => f.endsWith('.json')).map((f) => path.join(DATA, f))
    : args.filter((a) => !a.startsWith('--'));
  if (!files.length) {
    console.log('Usage: node demos/tripos/brochures/build.js <trip.json> [...]  |  --all');
    process.exit(1);
  }
  console.log('TripOS brochures');
  let failed = 0;
  for (const f of files) { try { build(path.resolve(f)); } catch (e) { failed++; console.error(`  ✗ ${e.message}`); } }
  process.exit(failed ? 1 : 0);
}

module.exports = { build, render, slugify };
