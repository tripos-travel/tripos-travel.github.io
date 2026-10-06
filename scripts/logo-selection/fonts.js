#!/usr/bin/env node
// Pull the latin woff2 for each face the logo-selection pages set, and write them
// into the brand's own assets beside a generated fonts.css.
//
//   npm run logos:fonts
//
// Ported from the Beyond Infinity generator (PR #55). Two reasons it exists
// rather than a <link> to Google, both learned the hard way there:
//
//   * The build container cannot always reach fonts.googleapis.com, and a webfont
//     that fails to load does not throw — it renders the fallback. On a page whose
//     SUBJECT is a comparison between six display serifs, that silently becomes
//     six cards of the same system serif, and the page claims a choice it is not
//     showing. That exact mistake shipped once already.
//   * Self-hosted, the sheets also work offline, behind a locked-down network,
//     and when printed to PDF — which is how the VisID is meant to be handed on.
//
// Every face here is SIL OFL, which permits hosting the file. Solas has no
// commercial face to explain: both of the brand's own faces are OFL too, which is
// the one thing this package has that the Beyond Infinity one did not.

const fs = require('fs'), path = require('path'), https = require('https'), http = require('http');
const { TYPE, DISPLAY_FACES } = require('./directions.js');

const ROOT = path.join(__dirname, '..', '..');
const BRAND = 'rodwell-tuohy';
const DEST = path.join(ROOT, 'demos', BRAND, 'logo-selection-assets', 'fonts');
const CACHE = path.join(__dirname, '.fontcache');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// Everything the pages set live. The display faces come from the same list the
// pages render, so a face cannot be shown without its file shipping.
// Deduped by FAMILY NAME, not by query string: Newsreader appears in both lists
// with different weight sets, and fetching both emitted two @font-face blocks
// per file with overlapping font-weight ranges. Keep the widest spec per family.
const FAMILIES = (() => {
  const by = new Map();
  for (const q of [TYPE.display.q, TYPE.body.q, ...DISPLAY_FACES.map(f => f.q)]) {
    const fam = q.split(':')[0];
    const prev = by.get(fam);
    if (!prev || q.length > prev.length) by.set(fam, q);
  }
  return [...by.values()];
})();

function safeCA() { try { return fs.readFileSync('/root/.ccr/ca-bundle.crt'); } catch { return undefined; } }

// Outbound HTTPS here goes through an agent proxy, so CONNECT first and speak TLS
// over the tunnel. Without this the fetch fails and the fallback ships.
const get = url => new Promise((res, rej) => {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxy) {
    const u = new URL(url), p = new URL(proxy);
    const c = http.request({ host: p.hostname, port: p.port, method: 'CONNECT',
                             path: `${u.hostname}:443` });
    c.on('connect', (_, socket) => {
      const r = https.request({ host: u.hostname, path: u.pathname + u.search, socket,
        agent: false, headers: { 'User-Agent': UA }, ca: safeCA() },
        resp => collect(resp, res, rej));
      r.on('error', rej); r.end();
    });
    c.on('error', rej); c.end();
  } else {
    https.get(url, { headers: { 'User-Agent': UA } }, resp => collect(resp, res, rej)).on('error', rej);
  }
});
function collect(resp, res, rej) {
  if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location)
    return get(resp.headers.location).then(res, rej);
  if (resp.statusCode !== 200) return rej(new Error('HTTP ' + resp.statusCode));
  const chunks = []; resp.on('data', d => chunks.push(d));
  resp.on('end', () => res(Buffer.concat(chunks)));
}

async function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.mkdirSync(DEST, { recursive: true });

  const faces = [];
  for (const fam of FAMILIES) {
    // Google serves variable fonts as one file per unicode-range with a
    // font-weight RANGE, so the declaration is copied through verbatim rather
    // than parsed. Only the plain latin subset is kept: latin-ext doubles the
    // bytes for glyphs no page here sets.
    const css = (await get(`https://fonts.googleapis.com/css2?family=${fam}&display=swap`)).toString();
    let kept = 0;
    for (const m of css.matchAll(/\/\* (latin|latin-ext) \*\/\s*(@font-face \{[\s\S]*?\})/g)) {
      if (m[1] !== 'latin') continue;
      const block = m[2];
      const url = /src: url\((https[^)]+)\)/.exec(block)[1];
      const name = url.replace(/.*\//, '').replace(/[^\w.-]/g, '_');
      const file = path.join(CACHE, name);
      if (!fs.existsSync(file)) fs.writeFileSync(file, await get(url));
      faces.push(block.replace(url, name));   // relative: fonts.css sits beside the files
      kept++;
    }
    if (!kept) throw new Error(`no latin faces parsed for ${fam} — refusing to ship a fallback`);
    console.log('  ' + fam.split(':')[0].replace(/\+/g, ' ').padEnd(20), kept);
  }

  const files = [...new Set(faces.map(b => /src: url\(([^)]+)\)/.exec(b)[1]))];
  for (const f of files) fs.copyFileSync(path.join(CACHE, f), path.join(DEST, f));
  fs.writeFileSync(path.join(DEST, 'fonts.css'),
    '/* Generated by scripts/logo-selection/fonts.js — do not edit by hand. */\n'
    + '/* Every face here is SIL OFL. Latin subset only. */\n' + faces.join('\n') + '\n');

  console.log(`\n${files.length} files → ${path.relative(ROOT, DEST)}`);
}

module.exports = { FAMILIES, DEST };
if (require.main === module) main().catch(e => { console.error('\n' + e.message); process.exit(1); });
