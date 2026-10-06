'use strict';
/* Compose the master SVGs: mark, wordmark, and the two lockups, per colourway.
   Everything downstream (PNG, PDF, favicons, social) is rendered from these,
   so this is the only place geometry is decided. */

const fs = require('fs');
const path = require('path');

/** Pull the mark artwork out of a source SVG file or an HTML page. */
function extractMark(cfg, root) {
  const src = path.join(root, cfg.mark.from);
  const raw = fs.readFileSync(src, 'utf8');
  let open;
  if (cfg.mark.ariaLabel) {
    const re = new RegExp(`<svg[^>]*aria-label="${cfg.mark.ariaLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`);
    open = raw.match(re);
    if (!open) throw new Error(`mark not found: no <svg aria-label="${cfg.mark.ariaLabel}"> in ${cfg.mark.from}`);
  } else {
    open = raw.match(/<svg[^>]*>/);
    if (!open) throw new Error(`mark not found: no <svg> in ${cfg.mark.from}`);
  }
  const start = open.index;
  const end = raw.indexOf('</svg>', start);
  if (end < 0) throw new Error(`mark not found: unterminated <svg> in ${cfg.mark.from}`);
  const tag = open[0];
  const vb = tag.match(/viewBox="([\d.\-\s]+)"/);
  if (!vb) throw new Error(`mark has no viewBox in ${cfg.mark.from} — cannot scale it safely`);
  const [, , w, h] = vb[1].trim().split(/\s+/).map(Number);
  let inner = raw.slice(start + tag.length, end);
  const fills = [...new Set(inner.match(/fill="#[0-9A-Fa-f]{6}"/g) || [])];
  inner = inner.replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="__FILL__"');
  return { inner, w, h, sourceFills: fills };
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n = v => Number(v.toFixed(3));

function svgDoc(w, h, body, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(w)} ${n(h)}" width="${n(w)}" `
       + `height="${n(h)}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${body}</svg>\n`;
}

function compose(cfg, text, root) {
  const M = extractMark(cfg, root);
  const markG = (fill, s = 1, dx = 0, dy = 0) =>
    `<g transform="translate(${n(dx)} ${n(dy)}) scale(${s.toFixed(6)})">${M.inner.replace(/__FILL__/g, fill)}</g>`;

  const WM = cfg.wordmark, SB = cfg.subline;
  const wmW = text.wordmark.advance * WM.size;
  const wmCap = (WM.capRatio ?? 0.70) * WM.size;
  const sbW = SB ? text.subline.advance * SB.size : 0;
  const sbCap = SB ? (SB.capRatio ?? 0.72) * SB.size : 0;
  const txtG = (k, size, x, baseline, fill) =>
    `<g transform="translate(${n(x)} ${n(baseline)}) scale(${(size / 1000).toFixed(6)})"><path fill="${fill}" d="${text[k].d}"/></g>`;

  const gapStack = cfg.spacing?.stackedGap ?? 28;
  const gapSub = cfg.spacing?.sublineGap ?? 18;
  const gapHoriz = cfg.spacing?.horizontalGap ?? 26;
  const markRatio = cfg.spacing?.horizontalMarkRatio ?? 1.42;

  const files = {};
  for (const [way, c] of Object.entries(cfg.lockups)) {
    // stacked
    const W = Math.max(M.w, wmW, sbW);
    const bl1 = M.h + gapStack + wmCap;
    const bl2 = bl1 + gapSub + sbCap;
    let body = markG(c.mark, 1, (W - M.w) / 2, 0) + txtG('wordmark', WM.size, (W - wmW) / 2, bl1, c.wordmark);
    if (SB) body += txtG('subline', SB.size, (W - sbW) / 2, bl2, c.subline);
    files[`lockup-stacked_${way}`] = svgDoc(W, SB ? bl2 + SB.size * 0.06 : bl1 + WM.size * 0.06, body,
      `${cfg.name}, stacked lockup`);

    // horizontal
    const tb = SB ? wmCap + 14 + sbCap : wmCap;
    const ms = (tb / M.h) * markRatio;
    const mw = M.w * ms, mh = M.h * ms;
    const H = Math.max(mh, tb), tx = mw + gapHoriz, ty = (H - tb) / 2;
    let b2 = markG(c.mark, ms, 0, (H - mh) / 2) + txtG('wordmark', WM.size, tx, ty + wmCap, c.wordmark);
    if (SB) b2 += txtG('subline', SB.size, tx, ty + wmCap + 14 + sbCap, c.subline);
    files[`lockup-horizontal_${way}`] = svgDoc(tx + Math.max(wmW, sbW), H, b2, `${cfg.name}, horizontal lockup`);
  }
  for (const [k, v] of Object.entries(cfg.markColours || {}))
    files[`mark_${k}`] = svgDoc(M.w, M.h, markG(v), `${cfg.shortName} mark`);
  for (const [k, v] of Object.entries(cfg.wordmarkColours || {}))
    files[`wordmark_${k}`] = svgDoc(wmW, wmCap, txtG('wordmark', WM.size, 0, wmCap, v), `${cfg.shortName} wordmark`);

  return { files, meta: { markSourceFills: M.sourceFills, markW: M.w, markH: M.h, wmW, sbW } };
}

module.exports = { compose, extractMark };
