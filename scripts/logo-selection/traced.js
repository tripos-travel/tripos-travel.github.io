#!/usr/bin/env node
// The client-chosen Banana Stand study, traced to vector — asked for directly:
// "I need this logo (recommended) as the logo on the VisID and final section."
//
// A generated study is raster: fixed colour, fixed resolution, no known stroke
// width. That is fine for a labelled reference, and wrong for a specification —
// which is what the VisID sheet and the final lockup are. So rather than either
// embedding the raster (a picture standing in for a spec) or redrawing the shape
// by hand (an interpretation of it, not the chosen shape), the approved study is
// traced with potrace on its own alpha channel: every dot and ray becomes a real
// closed contour, at the exact chosen silhouette. Filled with the specified hex,
// it recolours through every colourway exactly — which a raster PNG could never
// do — and holds a clean edge at any size a vector holds.
//
// This is the same fix Beyond Infinity's round used for the same complaint (PR
// #55, "Use the chosen study itself as the logo, traced to vector") — traced
// once, offline, and the trace is committed as data (traced.json) so the build
// never depends on potrace being installed. To redo the trace after a new study
// is approved: see trace.js.
//
// A SECOND trace per direction — 'a-small' / 'b-small' — exists for sizes below
// TRACE_FLOOR_PX. The main trace's halftone is dozens of dots per ray; below the
// floor they go sub-pixel and the mark reads as a blur, measured by rendering at
// true device resolution rather than assumed. That is not a reason to fall back
// to an unrelated drawn construction at small sizes — it is a reason to ask
// Banana Stand for the SAME composition with a deliberately coarse, few-dot
// halftone built to hold up that small, and trace that instead. See
// small-mark.js for how it was generated and traced. traceKeyFor() below picks
// whichever of the two a caller should use for a given render size.

const path = require('path');
const DATA = require('./traced.json');

// Wraps a traced path the same way markSvg wraps a drawn one: sized by height,
// `frame: 'square'` for the comparison grids, `contain` for the app tile, a
// visible label only when one is passed.
function tracedSvg(which, opts = {}) {
  const { height = null, size = null, color = 'currentColor', ground = null,
    label = null, frame = null, contain = null } = opts;
  const m = DATA[which];
  if (!m) throw new Error(`no trace for "${which}"`);

  const body = `<g transform="${m.transform}"><path d="${m.d}" fill="${color}"/></g>`;
  const bw = m.width, bh = m.height;

  let vb, inner, vw, vh;
  if (contain) {
    const S = 100, pad = S * 0.14;
    const k = (S - 2 * pad) / Math.max(bw, bh);
    const tx = (S - bw * k) / 2, ty = (S - bh * k) / 2;
    vb = `0 0 ${S} ${S}`; vw = S; vh = S;
    const shape = contain === 'circle'
      ? `<circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}" fill="${ground || 'none'}"/>`
      : `<rect x="0" y="0" width="${S}" height="${S}" rx="${(S * 0.22).toFixed(2)}" fill="${ground || 'none'}"/>`;
    inner = `${ground ? shape : ''}<g transform="translate(${tx.toFixed(3)},${ty.toFixed(3)}) scale(${k.toFixed(6)})">${body}</g>`;
  } else if (frame === 'square') {
    const S = 100, pad = S * 0.05;
    const k = (S - 2 * pad) / Math.max(bw, bh);
    const tx = (S - bw * k) / 2, ty = (S - bh * k) / 2;
    vb = `0 0 ${S} ${S}`; vw = S; vh = S;
    inner = `<g transform="translate(${tx.toFixed(3)},${ty.toFixed(3)}) scale(${k.toFixed(6)})">${body}</g>`;
  } else {
    vb = `0 0 ${bw} ${bh}`; vw = bw; vh = bh;
    inner = body;
  }

  let w, h;
  if (height != null) { h = height; w = +((height * vw) / vh).toFixed(2); }
  else { w = size == null ? 64 : size; h = +((w * vh) / vw).toFixed(2); }

  const a11y = label
    ? ` role="img" aria-label="${String(label).replace(/"/g, '&quot;')}"`
    : ' aria-hidden="true" focusable="false"';

  return `<svg width="${w}" height="${h}" viewBox="${vb}"${a11y}>${inner}</svg>`;
}

// The smallest size the MAIN trace survives — below this its fine halftone goes
// sub-pixel and reads as a blur rather than a sunburst, measured by rendering at
// device resolution, not guessed. Every place that chooses between the two
// traces asks this and traceKeyFor(), so the pages and the prose that quotes the
// number cannot drift apart: that has already happened once, when the nav
// lockup went traced at 26 px while the same pages said 28 was the floor.
const TRACE_FLOOR_PX = 28;
const traceHolds = px => px >= TRACE_FLOOR_PX;

// Which trace to render at a given size: the main one at and above the floor,
// the small-size cut below it. Both are Banana Stand, both are the chosen
// composition — this never falls back to the drawn geometric construction.
const traceKeyFor = (mark, px) => traceHolds(px) ? mark : `${mark}-small`;

module.exports = { tracedSvg, DATA, TRACE_FLOOR_PX, traceHolds, traceKeyFor };
