#!/usr/bin/env node
// The two Solas marks, drawn as geometry rather than placed as pictures.
//
// Why geometry and not a generated file: the generated studies (see designs.js)
// settle a DIRECTION in one round. They cannot be recoloured, cannot be re-set at
// 16px, and their stroke width is whatever the model felt like. Everything this
// flow presents as artwork is drawn from the numbers below, which is what makes
// the four colourways on the sheet four renderings of one mark instead of four
// files that have to be kept in step.
//
// Both marks come from the three MVP directions already in the Solas design
// system (Style-Guide.html §02) — this is those shapes rebuilt with real
// construction, not new ideas:
//
//   A · Daybreak  ← "A · Rising sun"        a dome on a horizon, rays above it
//   B · Radiance  ← "B · Horizontal lockup" a full sun, rays all round it
//
// The third card there ("C · On peach, rule variant") is not a third direction —
// it is a wordmark-and-rule LOCKUP, and it survives as the alternate lockup on
// both options rather than as a mark of its own.

// Everything is computed from these, so a change here moves every instance.
const GEO = {
  a: {
    view: [72, 44],           // the mark is wider than tall: it sits ON a horizon
    c: [36, 34],              // the horizon point every ray radiates from
    dome: 7.5,                // radius of the filled half-disc
    ri: 11.5, ro: 20.5,       // ray inner / outer radius
    // The horizon runs three units past the outermost ray on each side and no
    // further. Drawn full-width (the construction grid's 3 → 69) it read as a
    // long rule with a small sun sitting on it, and it dragged the mark's aspect
    // to 3:1 — which then scaled the mark down to nothing inside the square
    // roundel and tile. Found by rendering the contact sheet, not by reasoning.
    baseOver: 3,
    rays: 7,                  // spread across 180°, none of them horizontal
    sw: 2.2,
  },
  b: {
    view: [48, 48],
    c: [24, 24],
    core: 7.5,                // radius of the filled disc
    ri: 11.5, ro: 20.5,
    rays: 8,                  // 8-fold rotational: 4 axes + 4 diagonals
    sw: 2.4,
  },
};

const n = v => +v.toFixed(2);

// A ray is a radial line segment. Angles are degrees counter-clockwise from east,
// and y is negated because SVG's y axis points down.
function ray(cx, cy, deg, ri, ro) {
  const t = (deg * Math.PI) / 180, ct = Math.cos(t), st = Math.sin(t);
  return `M${n(cx + ri * ct)},${n(cy - ri * st)}L${n(cx + ro * ct)},${n(cy - ro * st)}`;
}

// A · rays fan across the half-plane above the horizon. Evenly spaced over 180°
// EXCLUSIVE at both ends — a ray lying along the horizon would just be a second
// baseline, and the outermost pair is what reads as "rising" rather than "risen".
const anglesA = count =>
  Array.from({ length: count }, (_, k) => 180 - ((k + 1) * 180) / (count + 1));

// B · rays all the way round, starting at due north so the mark has a top.
const anglesB = count =>
  Array.from({ length: count }, (_, k) => 90 - k * (360 / count));

// ── the six treatments ────────────────────────────────────────────────────────
// One shape, six ways of drawing it. Ordered lightest to heaviest, then the two
// contained forms — so the row reads as a range rather than a pile.
//
// The Beyond Infinity version of this list justified its heavy cut by injection
// moulding. Solas has no factory; its hard constraints are a favicon, a social
// avatar, and one-colour reproduction on a printed superbill. Same six shapes,
// different reason for each, and the reasons are what the client is choosing
// between.
const TREATMENTS = [
  { id: 'monoline', name: 'Monoline',
    short: 'Thinnest. The most editorial of the six, and the first to disappear when it gets small.',
    lead: 'One hairline of constant width, nothing filled. Closest in feel to Newsreader’s own thin strokes.' },
  { id: 'solid', name: 'Solid',
    short: 'Filled. Reads as one shape at any size.',
    lead: 'The dome or the disc filled and the rays thickened until the whole mark is a single silhouette.' },
  { id: 'geometric', name: 'Geometric',
    short: 'Built on a circle grid. Every curve a true arc.',
    lead: 'Flat ends and even weight throughout, constructed rather than drawn. The most neutral of the six.' },
  { id: 'bold', name: 'Bold cut',
    short: 'Thickest, with fewer rays. The one that still reads at 16px.',
    lead: 'Two rays removed and the stroke nearly doubled, because seven hairlines at favicon size become one grey smudge.' },
  { id: 'roundel', name: 'Roundel',
    short: 'Reversed out of a disc. The social avatar.',
    lead: 'A filled circle with the mark knocked out of it — the form that survives being cropped to a circle by someone else’s platform.' },
  { id: 'tile', name: 'App tile',
    short: 'In a rounded square. Favicon, phone, appointment email.',
    lead: 'Contained and centred, so the mark keeps its own margin instead of inheriting whatever the surface gives it.' },
];

// Per-treatment drawing parameters. `rays` overrides the count; `fill` decides
// whether the dome/disc is solid; `cap` and `sw` do the rest.
const STYLE = {
  monoline:  { sw: 1.4, cap: 'round',  fill: false },
  solid:     { sw: 3.4, cap: 'round',  fill: true  },
  geometric: { sw: 2.2, cap: 'butt',   fill: false },
  bold:      { sw: 4.2, cap: 'round',  fill: true, rays: { a: 5, b: 6 } },
  roundel:   { sw: 2.6, cap: 'round',  fill: true, contain: 'circle' },
  tile:      { sw: 2.6, cap: 'round',  fill: true, contain: 'tile' },
};

// ── the mark ──────────────────────────────────────────────────────────────────
// `color` draws the artwork; `ground` is only used by the two contained
// treatments, which need a second colour to knock out of.
//
// Two things here are corrections of defects found by rendering the contact
// sheet and looking at it, not theory:
//
//   * The viewBox is computed from the mark's own inked bounds, stroke included,
//     rather than from the construction grid. Option A is a wide, short mark and
//     its grid left ~14 units of dead space above the rays and 10 below the
//     horizon, so "48px" meant two different optical sizes for A and B and the
//     two options could not be compared honestly.
//   * The contained treatments fit the mark into a SQUARE container by its
//     bounds. Centring the container on the construction origin instead put
//     Option A's disc half outside the viewBox, and the roundel rendered as a
//     clipped dome.
//
// Accessibility: an inline SVG repeated down a page duplicates any id it carries,
// so nothing here emits one. Exactly one instance per page gets `label` (which
// becomes aria-label); every other instance is decorative and says so.

// The horizon's extent, derived rather than stored, so it can never drift out of
// step with the ray radius it is measured from.
const baseX = g => [g.c[0] - g.ro - g.baseOver, g.c[0] + g.ro + g.baseOver];

// The inked bounds of the bare mark, in construction units, stroke included.
function bounds(which, sw, count) {
  const g = GEO[which], [cx, cy] = g.c, pad = sw / 2;
  if (which === 'a') {
    // Rays span the half-plane above the horizon; the horizon itself is the
    // widest element and the flat bottom edge.
    const ys = anglesA(count).map(d => cy - g.ro * Math.sin((d * Math.PI) / 180));
    const [b0, b1] = baseX(g);
    return { x0: b0 - pad, x1: b1 + pad,
             y0: Math.min(...ys) - pad, y1: cy + pad };
  }
  return { x0: cx - g.ro - pad, x1: cx + g.ro + pad,
           y0: cy - g.ro - pad, y1: cy + g.ro + pad };
}

function markSvg(which, opts = {}) {
  const {
    size = null, height = null, color = 'currentColor', ground = null,
    treatment = 'geometric', label = null, frame = null,
  } = opts;

  const g = GEO[which];
  const st = STYLE[treatment] || STYLE.geometric;
  const [cx, cy] = g.c;
  const count = (st.rays && st.rays[which]) || g.rays;
  const sw = st.sw;

  const rayPaths = (which === 'a' ? anglesA(count) : anglesB(count))
    .map(d => ray(cx, cy, d, g.ri, g.ro)).join('');

  let body = '';
  if (which === 'a') {
    const r = g.dome;
    // The dome: a half-disc sitting on the horizon, drawn as one arc.
    const dome = `M${n(cx - r)},${n(cy)}A${n(r)},${n(r)} 0 0 1 ${n(cx + r)},${n(cy)}`;
    body =
      `<path d="${dome}${st.fill ? 'Z' : ''}" fill="${st.fill ? color : 'none'}" `
      + `stroke="${color}" stroke-width="${sw}" stroke-linejoin="round"/>`
      + `<path d="${rayPaths}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="${st.cap}"/>`
      // The horizon. Deliberately a touch lighter than the rays: it is the
      // ground the mark stands on, not one more ray.
      + `<path d="M${n(baseX(g)[0])},${n(cy)}L${n(baseX(g)[1])},${n(cy)}" fill="none" stroke="${color}" `
      + `stroke-width="${n(sw * 0.82)}" stroke-linecap="${st.cap}"/>`;
  } else {
    const r = g.core;
    body =
      `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(st.fill ? r : r - sw / 2)}" `
      + `fill="${st.fill ? color : 'none'}" stroke="${color}" stroke-width="${sw}"/>`
      + `<path d="${rayPaths}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="${st.cap}"/>`;
  }

  const b = bounds(which, sw, count);
  const bw = b.x1 - b.x0, bh = b.y1 - b.y0;

  let vb, inner, vw, vh;
  // `frame: 'square'` centres the mark in a square viewBox with no visible
  // container. The six treatment cards need it: Option A is a 2:1 mark and
  // Option B is 1:1, so rendered at their own aspect ratios in a square card the
  // two options occupied visibly different areas — and a comparison where one
  // side is presented larger is not a comparison. The contained treatments are
  // already square, so this only ever grows the open ones.
  if (frame === 'square' && !st.contain) {
    const S = 100, m = S * 0.05;
    const k = (S - 2 * m) / Math.max(bw, bh);
    const tx = (S - bw * k) / 2 - b.x0 * k;
    const ty = (S - bh * k) / 2 - b.y0 * k;
    vb = `0 0 ${S} ${S}`; vw = S; vh = S;
    inner = `<g transform="translate(${n(tx)},${n(ty)}) scale(${n(k)})">${body}</g>`;
  } else if (st.contain) {
    // Square container, mark fitted inside it by its own bounds with a real
    // margin — 14% each side, which is what keeps the app tile from looking
    // like the mark is touching the edges at 28px.
    const S = 100, m = S * 0.14;
    const k = (S - 2 * m) / Math.max(bw, bh);
    const tx = (S - bw * k) / 2 - b.x0 * k;
    const ty = (S - bh * k) / 2 - b.y0 * k;
    vb = `0 0 ${S} ${S}`; vw = S; vh = S;
    const shape = st.contain === 'circle'
      ? `<circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}" fill="${ground || 'none'}"/>`
      : `<rect x="0" y="0" width="${S}" height="${S}" rx="${n(S * 0.22)}" fill="${ground || 'none'}"/>`;
    inner = `${ground ? shape : ''}<g transform="translate(${n(tx)},${n(ty)}) scale(${n(k)})">${body}</g>`;
  } else {
    vb = `${n(b.x0)} ${n(b.y0)} ${n(bw)} ${n(bh)}`; vw = bw; vh = bh;
    inner = body;
  }

  // Both dimensions are always written out. The Beyond Infinity pages shipped
  // cropped logo cards for exactly one reason: an HTML height attribute survives
  // width:100%, so every 800x800 study laid out narrow-and-tall and
  // object-fit:cover cut its edges off. Sizing by HEIGHT is the honest way to
  // compare a wide mark against a square one.
  let w, h;
  if (height != null) { h = height; w = n((height * vw) / vh); }
  else { w = size == null ? 64 : size; h = n((w * vh) / vw); }

  const a11y = label
    ? ` role="img" aria-label="${String(label).replace(/"/g, '&quot;')}"`
    : ' aria-hidden="true" focusable="false"';

  return `<svg width="${n(w)}" height="${n(h)}" viewBox="${vb}"${a11y}>${inner}</svg>`;
}

// The contained treatments need a ground; everything else must not get one, or
// the knock-out logic draws a disc behind a mark that is meant to be open.
const needsGround = t => !!(STYLE[t] && STYLE[t].contain);

module.exports = { GEO, TREATMENTS, STYLE, markSvg, needsGround, anglesA, anglesB };

// `node scripts/logo-selection/marks.js` writes a contact sheet of every
// treatment at every size that decides one, so the geometry can be checked by
// eye without building the whole flow.
if (require.main === module) {
  const fs = require('fs'), path = require('path');
  const out = process.argv[2] || path.join(__dirname, 'marks-contact-sheet.html');
  const sizes = [96, 56, 40, 24, 16];   // HEIGHTS — see the note on markSvg
  const rows = ['a', 'b'].map(which => TREATMENTS.map(t => `
    <tr><th>${which.toUpperCase()} · ${t.name}</th>${sizes.map(s => `<td>${
      markSvg(which, { height: s, color: '#9C3F27', ground: '#FDEEE6', treatment: t.id })
    }</td>`).join('')}</tr>`).join('')).join('');
  fs.writeFileSync(out, `<!DOCTYPE html><meta charset="utf-8"><title>Solas marks — contact sheet</title>
<style>body{background:#FDFAF6;font:13px/1.5 system-ui;padding:28px;color:#221C19}
table{border-collapse:collapse}th{text-align:right;padding-right:16px;font-weight:600;white-space:nowrap}
td{padding:10px 14px;vertical-align:middle}thead th{text-align:center}</style>
<table><thead><tr><th></th>${sizes.map(s => `<th>${s}px tall</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`);
  console.log('wrote', out);
}
