#!/usr/bin/env node
// Finished logo studies, drawn by nano banana through Banana Stand.
//
//   BANANA_STAND_TOKEN=… npm run logos:designs
//
// ── What these are, and what they are not ─────────────────────────────────────
//
// These ARE design studies — six treatments plus two lockups per direction, each
// rendered finished enough to react to. The drawn geometry (marks.js) answers
// what the mark IS; it does not answer what it could look like if an illustrator
// took it further. That gap is what this fills, and it matters here more than
// usual: the Solas playbook records the logo as "in progress with an artist,
// going in its own direction", so these studies are the brief for that artist as
// much as they are a choice for the client.
//
// They are NOT the deliverable, and every card that shows one says so. An image
// model draws a shape that reads correctly; it does not draw a shape with a known
// stroke width, a known ray count, or a known behaviour at 16px. So whichever
// direction is chosen ships as the drawn vector, and the study stays the
// reference. Keeping that distinction visible on the page is the whole reason the
// studies sit in their own labelled row rather than mixed in with the drawn cuts.
//
// ── Relationship to scripts/generate-images.mjs ───────────────────────────────
//
// `main` also carries a Banana Stand client — scripts/generate-images.mjs, driven
// by demos/<brand>/imagery.profile.json and used by the brand-imagery and
// brand-identity skills. It is the more general of the two: profile-composed
// prompts, a dry run, concurrency, a provenance record, --force.
//
// This file is NOT a rejection of it. It predates the merge that brought it onto
// this branch, and the duplication is real and worth removing: the right end state
// is this script emitting a spec and delegating, with `outputDir` in the profile
// pointed at logo-selection-assets so nothing lands in output/. That consolidation
// is outstanding — see the note in CLAUDE.md. Until it happens, the two clients
// behave the same way in the ways that matter (skip cleanly with no token, skip
// what is already on disk, verify the bytes look like an image).
//
// ── Degrading without a token ─────────────────────────────────────────────────
//
// No token is not an error. The pages fall back to the drawn vector cut for any
// study that is not on disk, which is the same behaviour the brand-imagery skill
// specifies ("Generation skips cleanly; placeholders stay. Say so plainly, don't
// treat it as an error"). Run this later and the pages pick the files up with no
// further edit — review.js checks the filesystem, not a manifest.
//
// Cached on the instance by content hash and skipped here if already on disk, so
// a re-run is free. Delete a file to redraw it.

const fs = require('fs'), path = require('path');
const https = require('https');
const { DIRECTIONS } = require('./directions.js');
const { TREATMENTS } = require('./marks.js');

const ROOT = path.join(__dirname, '..', '..');
const BRAND = 'rodwell-tuohy';
const OUT = path.join(ROOT, 'demos', BRAND, 'logo-selection-assets');
const HOST = process.env.BANANA_STAND_HOST || process.env.BANANA_STAND_URL
          || 'https://www.bananastandai.com';
const TOKEN = process.env.BANANA_STAND_TOKEN;

// ── the two subjects, in the brand's own terms ────────────────────────────────
// Written from the design system's own logo cards and the Playbook's language,
// not from a generic idea of "a sun", so the model is steered by this brand
// rather than by the category. The category is the thing to avoid: the Playbook
// names "don't resemble the peer site she named" and "no stock menopause
// imagery" as hard guardrails.
const SUBJECT = {
  a: {
    icon: 'a half circle sun sitting on a straight horizontal line with straight '
        + 'rays fanning upward above it, the rays evenly spaced across the half circle, '
        + 'the horizontal line extending a little past the outermost rays on both sides',
    palette: 'soft blush pink and rose pink on a solid warm off-white cream background',
    mark:   'soft rose pink',
    ground: 'warm off-white cream',
    serif:  'an elegant high-contrast editorial serif with fine hairlines',
    noText: 'icon only, no tagline',
  },
  b: {
    // Says nothing about fill: the treatment decides that, and a subject that
    // insists on "solid" contradicts the monoline treatment.
    icon: 'a sun, a circle at the centre with straight rays radiating outward all '
        + 'the way around it at even angles, eight rays, perfectly symmetrical',
    palette: 'soft blush pink and rose pink on a solid warm off-white cream background',
    mark:   'soft rose pink',
    ground: 'warm off-white cream',
    serif:  'an elegant high-contrast editorial serif with fine hairlines',
    noText: 'icon only, no words, no lettering, no tagline',
  },
};

// Colours are named, never given as hex. Two reasons, one practical and one
// honest: the instance returns a hard 502 on these prompts when a #RRGGBB is in
// them (verified on the Beyond Infinity run — the identical prompt with the hex
// removed renders fine), and an image model does not hit a hex value anyway.
// These are directional studies; the authoritative palette is on the VisID
// sheet, measured and specified, and nothing here should be colour-picked as if
// it were the spec.

// Held constant across every prompt so the cards differ by treatment alone.
const BASE = 'professional brand identity logo design, flat vector, crisp clean edges, '
  + 'perfectly centred with generous even margin, solid flat background with no gradient '
  + 'and no texture, no photographic elements, no drop shadow, no mockup, no frame, '
  + 'no watermark, no signature';

// The negative clause is the single most failure-prone part of these prompts. The
// instance answers 502 "Image generation failed" deterministically for some
// wordings and renders fine for others, and the difference is not obvious from
// reading them. Bisected examples from the Beyond Infinity run, all else equal:
//
//   "icon only, no tagline"                            renders
//   "symbol only, no additional text"                  502
//   "icon only, no words, no lettering, no tagline"     renders
//
// The pattern that fits: a clause contradicting the subject fails, and beyond
// that it is arbitrary. Keep these short, keep them true of the subject, and
// re-test the specific prompt rather than the general idea when one starts
// failing. The retry loop below covers the genuinely intermittent ones.

// One phrase per treatment, keyed to the six in marks.js so the studies and the
// drawn cuts are the same six things.
const PHRASE = {
  monoline:  'drawn as ONE thin constant-width monoline stroke with fully rounded ends, '
           + 'generous open negative space, nothing filled in',
  solid:     'drawn as one bold solid filled shape, the forms merging into a single silhouette, '
           + 'smooth rounded joins, strong clear negative space',
  // Two clauses 502 here, bisected against the live instance one at a time:
  // "flat ends" contradicts the rays fanning to a point in subject A, and
  // "mathematically precise" 502s on subject B specifically (redundant against
  // "perfectly symmetrical" in B's own icon text, apparently enough to trip the
  // same failure). Both removed rather than reworded, since neither carries
  // meaning "precise" and "even stroke weight" don't already cover.
  geometric: 'constructed strictly from perfect circles and true arcs on a geometric grid, '
           + 'even stroke weight throughout',
  bold:      'drawn very thick and heavy with fewer rays, bold and chunky, no thin details anywhere',
  roundel:   'reversed and knocked out of a solid filled circular badge medallion so the icon '
           + 'reads as the empty space inside the disc',
  tile:      'centred inside a rounded square app icon tile with a soft corner radius, '
           + 'the icon filling the tile confidently',
};

// The two lockups carry real words, so they are the ones to check by eye —
// generated lettering is the thing that goes wrong. They are studies of the
// LOCKUP, never the wordmark itself: the shipped wordmark is live Newsreader.
const LOCKUPS = [
  { id: 'lockup-stacked', name: 'Stacked lockup', w: 1000, h: 1000,
    lead: 'The mark over the name. The form for a phone screen, a square avatar, a hang tag.',
    prompt: (s) => `a brand logo lockup, centred and stacked vertically: at the top an icon of `
      + `${s.icon} in ${s.mark}, and directly beneath it the word "SOLAS" on one centred line, `
      + `spelled exactly SOLAS, set in ${s.serif}, generously letterspaced, in a deep warm brown, `
      + `on a solid ${s.ground} background` },
  { id: 'lockup-inline', name: 'Inline lockup', w: 1200, h: 700,
    lead: 'The mark beside the name. The default horizontal signature — site header, footer, sign.',
    prompt: (s) => `a brand logo lockup arranged horizontally on one line: on the left an icon of `
      + `${s.icon} in ${s.mark}, and to its right the word "SOLAS" on a single line, spelled `
      + `exactly SOLAS, set in ${s.serif}, generously letterspaced, in a deep warm brown, on a `
      + `solid ${s.ground} background` },
];

// The full study list for a direction, with its file id resolved. Exported so the
// pages render exactly the set this script generates — a card cannot appear for a
// study that was never asked for.
function studiesFor(dir) {
  const s = SUBJECT[dir.mark];
  const six = TREATMENTS.map(t => ({
    id: t.id, name: t.name, lead: t.lead, short: t.short, w: 800, h: 800,
    file: `design-${dir.id}-${t.id}.webp`,
    prompt: `${s.icon}, ${PHRASE[t.id]}, ${s.palette}, ${s.noText}, ${BASE}`
      .replace(/\s+/g, ' ').trim(),
  }));
  const locks = LOCKUPS.map(l => ({
    id: l.id, name: l.name, lead: l.lead, lockup: true, w: l.w, h: l.h,
    file: `design-${dir.id}-${l.id}.webp`,
    prompt: `${l.prompt(s)}, ${BASE}`.replace(/\s+/g, ' ').trim(),
  }));
  return [...six, ...locks];
}

// Which studies are actually on disk. The pages call this, so generation and
// rendering can never disagree about what exists.
function onDisk(dir) {
  const have = {};
  for (const st of studiesFor(dir)) {
    have[st.id] = fs.existsSync(path.join(OUT, st.file)) ? st.file : null;
  }
  return have;
}

// ── fetch ─────────────────────────────────────────────────────────────────────
// A long prompt does not fit comfortably in a query string typed by hand, so the
// URL is built here and the 302 to the blob CDN is followed by hand.
function get(url, headers, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('too many redirects'));
    https.get(url, { headers, timeout: 240000 }, res => {
      const { statusCode, headers: h } = res;
      if (statusCode >= 300 && statusCode < 400 && h.location) {
        res.resume();
        return resolve(get(h.location, {}, redirects + 1));   // no token off-origin
      }
      if (statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${statusCode} for ${url.split('?')[0]}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('timeout', function () { this.destroy(new Error('timed out')); })
      .on('error', reject);
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let made = 0, kept = 0, skipped = 0;

  for (const dir of DIRECTIONS) {
    console.log(`\nOption ${dir.option} · ${dir.name}`);
    for (const st of studiesFor(dir)) {
      const dest = path.join(OUT, st.file);
      if (fs.existsSync(dest)) { kept++; console.log('  kept   ', st.file); continue; }

      if (!TOKEN) { skipped++; console.log('  skip   ', st.file, '(no token)'); continue; }

      process.stdout.write(`  fetch   ${st.file} … `);
      const url = `${HOST}/i/${st.w}x${st.h}?prompt=${encodeURIComponent(st.prompt)}&style=web`;
      // A cache miss runs a real image generation, so a 5xx here is usually the
      // model timing out rather than the request being wrong. Retried with
      // backoff; a cache HIT on the retry costs nothing extra.
      let buf;
      for (let attempt = 1; ; attempt++) {
        try { buf = await get(url, { 'X-Gen-Token': TOKEN }); break; }
        catch (e) {
          if (attempt >= 6) throw e;
          process.stdout.write(`${e.message.split(' for ')[0]}, retrying … `);
          await new Promise(r => setTimeout(r, attempt * 12000));
        }
      }
      if (buf.length < 1000) throw new Error(`${st.file}: suspiciously small (${buf.length} bytes)`);
      fs.writeFileSync(dest, buf);
      made++;
      console.log(`${(buf.length / 1024).toFixed(0)} KB`);
    }
  }

  console.log(`\n${made} generated, ${kept} already on disk, ${skipped} skipped.`);
  if (skipped) {
    console.log('\nBANANA_STAND_TOKEN is not set, so no study was drawn. This is not a failure:');
    console.log('the pages fall back to the drawn vector cut for every missing study and say so');
    console.log('on the card. Set the token and re-run to fill them in — no other edit needed.');
  }
  if (made) console.log('Check the two lockups per option by eye — generated lettering is what goes wrong.');
}

module.exports = { SUBJECT, PHRASE, LOCKUPS, studiesFor, onDisk, OUT };
if (require.main === module) main().catch(e => { console.error('\n' + e.message); process.exit(1); });
