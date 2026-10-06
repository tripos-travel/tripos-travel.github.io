#!/usr/bin/env node
// The gate on the two directions. Run before building, and in CI.
//
//   npm run logos:check
//
// Two things it will not let through, both of which have cost a wasted client
// round somewhere in this repo already:
//
//  1. Two "directions" that are really one direction with an adjective changed.
//     The client's reaction to that is on the record — "it just looks very
//     similar, right?" — and no amount of rendering fixes it.
//
//  2. A colourway that cannot be read. A mark can carry a colour that type
//     cannot; presenting a lockup whose wordmark sits at 3.2:1 is presenting a
//     lockup that fails the brand's own accessibility promise.

const { DIRECTIONS, COLOURWAYS, PALETTE } = require('./directions.js');
const { ratio, aa } = require('./color.js');
const { TREATMENTS, markSvg } = require('./marks.js');

const AXES = ['metaphor', 'primitive', 'symmetry', 'space', 'massLine'];
const errs = [];
const notes = [];

// ── 1. divergence ─────────────────────────────────────────────────────────────
for (let i = 0; i < DIRECTIONS.length; i++) {
  for (let j = i + 1; j < DIRECTIONS.length; j++) {
    const a = DIRECTIONS[i], b = DIRECTIONS[j];
    const differ = AXES.filter(k => String(a[k]).trim() !== String(b[k]).trim());
    if (differ.length < 2) {
      errs.push(`${a.name} and ${b.name} differ on only ${differ.length} of ${AXES.length} axes `
        + `(${differ.join(', ') || 'none'}). Two directions must differ on at least two — `
        + `changing an adjective is a variation, changing the metaphor is a direction.`);
    } else {
      notes.push(`${a.name} vs ${b.name}: differ on ${differ.length}/${AXES.length} — ${differ.join(', ')}`);
    }
  }
}

// ── 2. every direction is complete ────────────────────────────────────────────
const NEED = ['option', 'name', 'mark', 'from', 'thesis', 'answersTo', 'para',
              'recommend', 'strength', ...AXES];
for (const d of DIRECTIONS) {
  for (const k of NEED) {
    if (!d[k] || !String(d[k]).trim()) errs.push(`Direction ${d.option}: missing "${k}".`);
  }
  if (!Array.isArray(d.honest) || d.honest.length < 2) {
    errs.push(`Direction ${d.option}: needs at least two honest notes. `
      + `A sheet that lists only strengths is a sheet nobody can decide from.`);
  }
  if (!TREATMENTS.some(t => t.id === d.recommend)) {
    errs.push(`Direction ${d.option}: recommends "${d.recommend}", which is not a treatment.`);
  }
}

// ── 3. every colourway is legible ─────────────────────────────────────────────
// The mark is artwork, so it is held to the 3:1 non-text threshold. The wordmark
// is type and is held to 4.5:1, whatever size it happens to be set at here —
// this lockup ends up on a business card.
for (const w of COLOURWAYS) {
  const rm = ratio(w.mark, w.ground), rw = ratio(w.word, w.ground);
  if (!aa.ui(rm)) errs.push(`Colourway "${w.label}": mark ${rm}:1 on its ground — under 3:1.`);
  if (!aa.body(rw)) errs.push(`Colourway "${w.label}": wordmark ${rw}:1 on its ground — under 4.5:1. `
    + `A mark can carry that colour; type cannot.`);
  notes.push(`${w.label}: mark ${rm}:1, wordmark ${rw}:1`);
}

// ── 4. the palette claim the brand makes about itself ─────────────────────────
// Style-Guide.html states the two-accent rule in as many words: coral is not
// dark enough for small text on cream, terracotta is. If that ever stops being
// true, the design system is wrong and so is every page built on it.
const coral = PALETTE.find(c => c.name === 'Sunburst Rose').hex;
const terra = PALETTE.find(c => c.name === 'Berry').hex;
const cream = PALETTE.find(c => c.name === 'Cream').hex;
if (aa.body(ratio(coral, cream))) {
  errs.push('Sunburst Rose now clears 4.5:1 on cream — the two-accent rule in the design system '
    + 'is stale and the pages that cite it need rewriting.');
}
if (!aa.body(ratio(terra, cream))) {
  errs.push(`Berry is ${ratio(terra, cream)}:1 on cream — it carries every link and label `
    + 'in the brand and must clear 4.5:1.');
}

// ── 5. the geometry renders, at the sizes that decide it ──────────────────────
for (const d of DIRECTIONS) {
  for (const t of TREATMENTS) {
    for (const h of [96, 40, 16]) {
      const svg = markSvg(d.mark, { height: h, treatment: t.id, ground: '#FDEEE6', color: '#C8593A' });
      if (!/^<svg /.test(svg) || svg.includes('NaN') || svg.includes('undefined')) {
        errs.push(`Direction ${d.option} · ${t.name} at ${h}px: bad SVG.`);
      }
    }
  }
  // Exactly one instance per page may be named; the rest must be decorative, or
  // ada:scan reports a duplicated accessible name and a screen reader reads the
  // mark eighteen times.
  const named = markSvg(d.mark, { height: 40, treatment: 'solid', label: 'x' });
  const plain = markSvg(d.mark, { height: 40, treatment: 'solid' });
  if (!named.includes('aria-label') || !plain.includes('aria-hidden="true"')) {
    errs.push(`Direction ${d.option}: mark accessibility attributes are wrong.`);
  }
  if (named.includes(' id=') || plain.includes(' id=')) {
    errs.push(`Direction ${d.option}: the mark emits an id — repeated inline, that duplicates it.`);
  }
}

for (const n of notes) console.log('  ·', n);
if (errs.length) {
  console.error(`\n${errs.length} problem${errs.length > 1 ? 's' : ''}:\n`);
  for (const e of errs) console.error('  ✗ ' + e);
  console.error('');
  process.exit(1);
}
console.log(`\n${DIRECTIONS.length} directions, ${TREATMENTS.length} treatments, `
  + `${COLOURWAYS.length} colourways — all clear.`);
