'use strict';

/**
 * png.js — minimal zero-dependency PNG decode/encode for the playbook's
 * image-comparison tooling. Node ships zlib, which is the only hard part.
 *
 * Scope is deliberately narrow: non-interlaced, 8-bit, gray / gray+alpha /
 * RGB / RGBA. That covers what Figma exports and what headless Chrome
 * screenshots produce, which is the entire input surface here. Anything else
 * throws with a message that says what to re-export.
 *
 * Shared by scripts/figma-tokens.js (pixel evidence for token confidence) and
 * scripts/figma-diff.js (design-vs-build visual diff).
 */

const fs = require('fs');
const zlib = require('zlib');

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

/* ------------------------------------------------------------------ *
 * CRC32 (PNG chunk checksums)
 * ------------------------------------------------------------------ */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/* ------------------------------------------------------------------ *
 * Decode
 * ------------------------------------------------------------------ */
/** @returns {{width:number,height:number,channels:number,data:Buffer}} */
function decodePNG(file) {
  const buf = fs.readFileSync(file);
  if (!buf.slice(0, 8).equals(SIG)) throw new Error('not a PNG');

  let pos = 8, ihdr = null;
  const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString('ascii');
    const data = buf.slice(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4),
        bitDepth: data[8], colorType: data[9], interlace: data[12],
      };
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }

  if (!ihdr) throw new Error('no IHDR chunk');
  if (ihdr.bitDepth !== 8) throw new Error(`unsupported bit depth ${ihdr.bitDepth} — re-export as 8-bit`);
  if (ihdr.interlace !== 0) throw new Error('interlaced PNG unsupported — re-export without Adam7');
  const channels = CHANNELS[ihdr.colorType];
  if (!channels) throw new Error(`unsupported color type ${ihdr.colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const { width, height } = ihdr;
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);

  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const line = raw.slice(rp, rp + stride);
    rp += stride;
    const cur = out.slice(y * stride, (y + 1) * stride);
    const prior = y > 0 ? out.slice((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prior ? prior[x] : 0;
      const c = prior && x >= channels ? prior[x - channels] : 0;
      const v = line[x];
      let val;
      switch (filter) {
        case 0: val = v; break;
        case 1: val = v + a; break;
        case 2: val = v + b; break;
        case 3: val = v + ((a + b) >> 1); break;
        case 4: val = v + paeth(a, b, c); break;
        default: throw new Error(`bad filter type ${filter} on row ${y}`);
      }
      cur[x] = val & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

/* ------------------------------------------------------------------ *
 * Pixel access
 * ------------------------------------------------------------------ */
/** Read one pixel as [r,g,b,a] regardless of the source color type. */
function pixelAt(img, x, y) {
  const { channels, data, width } = img;
  const o = (y * width + x) * channels;
  if (channels === 1) return [data[o], data[o], data[o], 255];
  if (channels === 2) return [data[o], data[o], data[o], data[o + 1]];
  if (channels === 3) return [data[o], data[o + 1], data[o + 2], 255];
  return [data[o], data[o + 1], data[o + 2], data[o + 3]];
}

function toHex(r, g, b) {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

/** Dominant colors as [{hex, coverage}], most-covered first. */
function dominantColors(img, { maxSamples = 240000 } = {}) {
  const total = img.width * img.height;
  const step = Math.max(1, Math.floor(total / maxSamples));
  const counts = new Map();
  let sampled = 0;
  for (let i = 0; i < total; i += step) {
    const [r, g, b, a] = pixelAt(img, i % img.width, Math.floor(i / img.width));
    if (a < 128) continue;
    const hex = toHex(r, g, b);
    counts.set(hex, (counts.get(hex) || 0) + 1);
    sampled++;
  }
  return [...counts.entries()]
    .map(([hex, n]) => ({ hex, coverage: sampled ? n / sampled : 0 }))
    .sort((a, b) => b.coverage - a.coverage);
}

/**
 * Average color per horizontal band, sampling `bands` evenly down the image.
 * This is the backbone of the visual diff: two renders of the same page agree
 * band-for-band even when their exact pixel heights differ, so it compares
 * composition rather than demanding pixel equality.
 */
function bandProfile(img, bands = 160, samplesPerBand = 400) {
  const out = [];
  for (let b = 0; b < bands; b++) {
    const y0 = Math.floor((b * img.height) / bands);
    const y1 = Math.max(y0 + 1, Math.floor(((b + 1) * img.height) / bands));
    let r = 0, g = 0, bl = 0, n = 0;
    const rows = y1 - y0;
    const stepY = Math.max(1, Math.floor(rows / 8));
    const stepX = Math.max(1, Math.floor(img.width / (samplesPerBand / Math.max(1, rows / stepY))));
    for (let y = y0; y < y1; y += stepY) {
      for (let x = 0; x < img.width; x += stepX) {
        const [pr, pg, pb, pa] = pixelAt(img, x, y);
        if (pa < 128) continue;
        r += pr; g += pg; bl += pb; n++;
      }
    }
    out.push(n ? [Math.round(r / n), Math.round(g / n), Math.round(bl / n)] : [255, 255, 255]);
  }
  return out;
}

/** Trim uniform trailing rows — headless Chrome pads a short page with background. */
function trimTrailingUniform(img, tolerance = 6) {
  const [br, bg, bb] = pixelAt(img, Math.floor(img.width / 2), img.height - 1);
  let last = img.height - 1;
  const stepX = Math.max(1, Math.floor(img.width / 40));
  for (; last > 0; last--) {
    let uniform = true;
    for (let x = 0; x < img.width; x += stepX) {
      const [r, g, b] = pixelAt(img, x, last);
      if (Math.abs(r - br) > tolerance || Math.abs(g - bg) > tolerance || Math.abs(b - bb) > tolerance) {
        uniform = false; break;
      }
    }
    if (!uniform) break;
  }
  const height = Math.max(1, Math.min(img.height, last + 2));
  if (height === img.height) return img;
  return { width: img.width, height, channels: img.channels, data: img.data.slice(0, img.width * height * img.channels) };
}

/* ------------------------------------------------------------------ *
 * Encode (RGB, filter 0) — for the side-by-side diff artifact
 * ------------------------------------------------------------------ */
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** @param pixel (x,y) => [r,g,b] */
function encodePNG(file, width, height, pixel) {
  const stride = width * 3;
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(stride + 1); // filter byte 0 = None
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      const o = x * 3 + 1;
      row[o] = r; row[o + 1] = g; row[o + 2] = b;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  fs.writeFileSync(file, Buffer.concat([
    SIG, chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

module.exports = { decodePNG, encodePNG, pixelAt, dominantColors, bandProfile, trimTrailingUniform, toHex };
