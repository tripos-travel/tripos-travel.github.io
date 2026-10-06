#!/usr/bin/env node
'use strict';

/**
 * figma-diff.js — compares a built page against the Figma design render.
 *
 * The build half of the pipeline is otherwise unverifiable: tokens can all be
 * correct and the page still look nothing like the comp, because composition —
 * section order, proportion, which band is which color — lives in the layout,
 * not the token set. A PNG export of the design is the only ground truth we
 * get, so this compares against it.
 *
 * It is deliberately NOT a pixel-equality diff. Two honest renders of the same
 * page never match pixel-for-pixel (font hinting, image scaling, a 4px
 * difference in line height compounding down the page), and a pixel differ
 * reports 100% failure for a page that is visually right. Instead it compares:
 *
 *   1. HEIGHT RATIO      — is the build dramatically taller/shorter than the design?
 *   2. BAND PROFILE      — average color across ~160 horizontal bands, on a
 *                          normalized vertical axis. Catches a missing section,
 *                          a wrong band color, a hero at half the intended height.
 *   3. PALETTE           — dominant colors in each. Catches the wrong navy.
 *
 * It also writes a side-by-side PNG so a human (or an agent that can see
 * images) can look at the two together with the drift marked.
 *
 * Usage:
 *   node scripts/figma-diff.js --design=<render.png> --build=<screenshot.png>
 *        [--label=desktop] [--out=<dir>] [--bands=160] [--threshold=28] [--check] [--json]
 *        [--design-crop=y0:y1] [--build-crop=y0:y1]   # compare one slice of a long page
 *
 * Exit code is 0 unless --check is passed and the mean band distance exceeds
 * --threshold.
 */

const fs = require('fs');
const path = require('path');
const { decodePNG, encodePNG, pixelAt, dominantColors, bandProfile, trimTrailingUniform, toHex } = require('./lib/png');

const ROOT = path.resolve(__dirname, '..');

/* ------------------------------------------------------------------ *
 * Comparison
 * ------------------------------------------------------------------ */
function distance(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function comparePalettes(design, build, floor = 0.01) {
  const d = new Map(dominantColors(design).filter((c) => c.coverage >= floor).map((c) => [c.hex, c.coverage]));
  const b = new Map(dominantColors(build).filter((c) => c.coverage >= floor).map((c) => [c.hex, c.coverage]));

  // A near-match is fine — antialiasing and image scaling shift a hex by a hair.
  const near = (hex, other) => [...other.keys()].find((h) => distance(hexToRGB(hex), hexToRGB(h)) <= 10);

  const missing = [...d.entries()]
    .filter(([hex]) => !b.has(hex) && !near(hex, b))
    .map(([hex, coverage]) => ({ hex, coverage: Number(coverage.toFixed(4)) }))
    .sort((x, y) => y.coverage - x.coverage);

  const extra = [...b.entries()]
    .filter(([hex]) => !d.has(hex) && !near(hex, d))
    .map(([hex, coverage]) => ({ hex, coverage: Number(coverage.toFixed(4)) }))
    .sort((x, y) => y.coverage - x.coverage);

  return { missing, extra };
}

function hexToRGB(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

/* ------------------------------------------------------------------ *
 * Side-by-side artifact
 * ------------------------------------------------------------------ */
const PANEL_W = 300;
const PANEL_H = 900;
const GUTTER = 12;
const STRIP_W = 46;

function sample(img, u, v) {
  const x = Math.min(img.width - 1, Math.max(0, Math.floor(u * img.width)));
  const y = Math.min(img.height - 1, Math.max(0, Math.floor(v * img.height)));
  return pixelAt(img, x, y);
}

/**
 * Left: the design. Right: the build. Between them a strip that is green where
 * the bands agree and red where they don't — so the eye goes straight to the
 * part of the page that drifted.
 */
function writeSideBySide(file, design, build, bandDist, threshold) {
  const width = PANEL_W * 2 + STRIP_W + GUTTER * 4;
  const height = PANEL_H + GUTTER * 2;
  const BG = [24, 24, 27];

  const leftX = GUTTER;
  const stripX = leftX + PANEL_W + GUTTER;
  const rightX = stripX + STRIP_W + GUTTER;

  encodePNG(file, width, height, (x, y) => {
    if (y < GUTTER || y >= GUTTER + PANEL_H) return BG;
    const v = (y - GUTTER) / PANEL_H;

    if (x >= leftX && x < leftX + PANEL_W) return sample(design, (x - leftX) / PANEL_W, v).slice(0, 3);
    if (x >= rightX && x < rightX + PANEL_W) return sample(build, (x - rightX) / PANEL_W, v).slice(0, 3);

    if (x >= stripX && x < stripX + STRIP_W) {
      const d = bandDist[Math.min(bandDist.length - 1, Math.floor(v * bandDist.length))];
      const ratio = Math.min(1, d / (threshold * 2));
      // green (agree) → amber → red (drift)
      return d <= threshold
        ? [Math.round(40 + 120 * ratio), 160, 70]
        : [220, Math.round(160 - 120 * ratio), 60];
    }
    return BG;
  });
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */
function maybeTrim(img, trim) {
  return trim ? trimTrailingUniform(img) : img;
}

/**
 * Vertical slice of an image, as "y0:y1".
 *
 * A design render is the whole page — 15,424px in the first real file we ran.
 * A build is very often one chunk of it, because that is how a page this size
 * has to be built. Without this you would be comparing a section against a
 * whole homepage and reading a meaningless height ratio.
 */
function maybeCrop(img, spec) {
  if (!spec) return img;
  const [a, b] = String(spec).split(':').map(Number);
  const y0 = Math.max(0, Math.min(img.height - 1, a || 0));
  const y1 = Math.max(y0 + 1, Math.min(img.height, Number.isFinite(b) ? b : img.height));
  if (y0 === 0 && y1 === img.height) return img;
  const stride = img.width * img.channels;
  return {
    width: img.width, height: y1 - y0, channels: img.channels,
    data: img.data.slice(y0 * stride, y1 * stride),
  };
}

function parseArgs(argv) {
  const o = { design: null, build: null, label: null, out: null, bands: 160, threshold: 28, maxDrifting: 10, check: false, json: false, quiet: false, trim: false, designCrop: null, buildCrop: null };
  for (const a of argv) {
    if (a.startsWith('--design=')) o.design = a.slice(9);
    else if (a.startsWith('--build=')) o.build = a.slice(8);
    else if (a.startsWith('--label=')) o.label = a.slice(8);
    else if (a.startsWith('--out=')) o.out = a.slice(6);
    else if (a.startsWith('--bands=')) o.bands = parseInt(a.slice(8), 10) || 160;
    else if (a.startsWith('--threshold=')) o.threshold = parseFloat(a.slice(12)) || 28;
    else if (a.startsWith('--max-drifting=')) o.maxDrifting = parseFloat(a.slice(15));
    else if (a === '--trim') o.trim = true;
    else if (a.startsWith('--design-crop=')) o.designCrop = a.slice(14);
    else if (a.startsWith('--build-crop=')) o.buildCrop = a.slice(13);
    else if (a === '--check') o.check = true;
    else if (a === '--json') o.json = true;
    else if (a === '--quiet') o.quiet = true;
  }
  return o;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.design || !opts.build) {
    console.error('figma-diff: need --design=<figma-render.png> and --build=<page-screenshot.png>');
    process.exit(1);
  }

  let design, build;
  try {
    // Trimming is OFF by default and deliberately so: a page whose last section
    // is a flat color band (a solid footer) looks exactly like Chrome's
    // background padding, and trimming would silently eat a real section and
    // then report the build as "shorter than the design". Capture the
    // screenshot at the true page height instead — see scripts/page-shot.sh.
    design = maybeTrim(maybeCrop(decodePNG(path.resolve(ROOT, opts.design)), opts.designCrop), opts.trim);
    build = maybeTrim(maybeCrop(decodePNG(path.resolve(ROOT, opts.build)), opts.buildCrop), opts.trim);
  } catch (err) {
    console.error(`figma-diff: ${err.message}`);
    process.exit(1);
  }

  const label = opts.label || path.basename(opts.build, '.png');
  const outDir = path.resolve(ROOT, opts.out || path.dirname(path.resolve(ROOT, opts.build)));
  fs.mkdirSync(outDir, { recursive: true });

  const dProfile = bandProfile(design, opts.bands);
  const bProfile = bandProfile(build, opts.bands);
  const bandDist = dProfile.map((c, i) => distance(c, bProfile[i]));
  const mean = bandDist.reduce((a, b) => a + b, 0) / bandDist.length;

  const worst = bandDist
    .map((d, i) => ({ d, i }))
    .filter((x) => x.d > opts.threshold)
    .sort((a, b) => b.d - a.d)
    .slice(0, 8)
    .map((x) => ({
      at: `${((x.i / opts.bands) * 100).toFixed(1)}%`,
      distance: Math.round(x.d),
      design: toHex(...dProfile[x.i]),
      build: toHex(...bProfile[x.i]),
    }));

  const designAspect = design.height / design.width;
  const buildAspect = build.height / build.width;
  const heightRatio = buildAspect / designAspect;
  const palette = comparePalettes(design, build);

  const diffFile = path.join(outDir, `diff-${label}.png`);
  writeSideBySide(diffFile, design, build, bandDist, opts.threshold);

  const result = {
    label,
    design: { file: path.basename(opts.design), width: design.width, height: design.height },
    build: { file: path.basename(opts.build), width: build.width, height: build.height },
    heightRatio: Number(heightRatio.toFixed(3)),
    meanBandDistance: Number(mean.toFixed(1)),
    driftingBands: bandDist.filter((d) => d > opts.threshold).length,
    totalBands: opts.bands,
    worst,
    palette,
    artifact: path.relative(ROOT, diffFile),
  };

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!opts.quiet) {
    console.log(`figma-diff [${label}]  design ${design.width}×${design.height}  ·  build ${build.width}×${build.height}`);
    console.log(`  mean band distance  ${result.meanBandDistance}  (threshold ${opts.threshold})`);
    console.log(`  drifting bands      ${result.driftingBands}/${opts.bands}`);
    console.log(`  height ratio        ${result.heightRatio}× ${heightRatio > 1.15 ? '— build is notably TALLER than the design' : heightRatio < 0.85 ? '— build is notably SHORTER than the design' : '(in proportion)'}`);
    console.log(`  side-by-side        ${result.artifact}`);
    if (worst.length) {
      console.log('  worst drift (position down the page):');
      for (const w of worst) console.log(`    ${w.at.padStart(4)}  Δ${String(w.distance).padStart(3)}   design ${w.design} → build ${w.build}`);
    }
    if (palette.missing.length) {
      console.log('  in the design but NOT in the build:');
      for (const c of palette.missing.slice(0, 6)) console.log(`    ${c.hex}  ${(c.coverage * 100).toFixed(1)}% of the design`);
    }
    if (palette.extra.length) {
      console.log('  in the build but NOT in the design:');
      for (const c of palette.extra.slice(0, 6)) console.log(`    ${c.hex}  ${(c.coverage * 100).toFixed(1)}% of the build`);
    }
    if (!worst.length && !palette.missing.length && !palette.extra.length) {
      console.log('  no drift above threshold — build matches the design render.');
    }
  }

  if (opts.check) {
    // Three independent ways a build can be wrong. The mean alone is a bad gate:
    // one badly-wrong section averages away against a page that is otherwise
    // fine, which is exactly the failure a visual diff exists to catch.
    const driftPct = (result.driftingBands / opts.bands) * 100;
    const lostColor = palette.missing.find((c) => c.coverage >= 0.05);
    const reasons = [];
    if (mean > opts.threshold) reasons.push(`mean band distance ${result.meanBandDistance} > ${opts.threshold}`);
    if (driftPct > opts.maxDrifting) reasons.push(`${driftPct.toFixed(1)}% of bands drifting > ${opts.maxDrifting}%`);
    if (lostColor) reasons.push(`${lostColor.hex} covers ${(lostColor.coverage * 100).toFixed(1)}% of the design but is absent from the build`);
    if (heightRatio > 1.4 || heightRatio < 0.7) reasons.push(`height ratio ${result.heightRatio}× is out of proportion`);
    if (reasons.length) {
      console.error(`figma-diff: build does not match the design — ${reasons.join('; ')}`);
      process.exit(1);
    }
  }
}

main();
