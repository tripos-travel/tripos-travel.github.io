'use strict';
/* 00_READ-ME-FIRST — the difference between a folder of files and a usable
   package. Leads with logo anatomy, because "which colour goes on which part"
   is the thing that gets broken downstream. */
const fs = require('fs'); const path = require('path');
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function cmyk(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return [0, 0, 0, 100];
  return [(1-r-k)/(1-k), (1-g-k)/(1-k), (1-b-k)/(1-k), k].map(v => Math.round(v * 100));
}

function colourSpec(cfg) {
  const L = [`${cfg.name.toUpperCase()} - COLOUR SPECIFICATION`, '='.repeat(64), ''];
  const first = Object.values(cfg.lockups)[0];
  if (new Set([first.mark, first.wordmark, first.subline].filter(Boolean)).size > 1) {
    L.push('THE LOGO IS MULTI-TONE. Each part of the lockup takes its own colour.',
           'Do not set the whole lockup in one colour unless you are using one of the',
           'supplied one-colour files.', '',
           `  mark      ${first.mark}`, `  wordmark  ${first.wordmark}`,
           ...(first.subline ? [`  subline   ${first.subline}`] : []), '');
  }
  L.push('RGB/HEX is the master. CMYK below is a straight conversion, NOT a measured',
         'press value - a starting point only. Always ask the printer for a proof and',
         'match to the proof, never to a screen.', '');
  for (const p of cfg.palette) {
    const c = cmyk(p.hex);
    const [r, g, b] = [1, 3, 5].map(i => parseInt(p.hex.slice(i, i + 2), 16));
    L.push(`${p.name.padEnd(22)} ${p.hex}   RGB ${String(r).padStart(3)} ${String(g).padStart(3)} ${String(b).padStart(3)}`
      + `   CMYK ${c.map(v => String(v).padStart(3)).join(' ')}   ${p.use}`);
  }
  return L.join('\n') + '\n';
}

function guideHtml(cfg, pkgDir) {
  const ways = Object.entries(cfg.lockups);
  const first = ways[0][1];
  const heroFile = path.join(pkgDir, '01_Master-Vector/SVG', `${cfg.filePrefix}_lockup-horizontal_${ways[0][0]}.svg`);
  const hero = fs.existsSync(heroFile) ? Buffer.from(fs.readFileSync(heroFile)).toString('base64') : '';
  const sw = cfg.palette.slice(0, 6).map(p =>
    `<div><div class="sw" style="background:${p.hex}"></div><div class="sl">${p.hex}</div></div>`).join('');
  const anat = [['Mark', first.mark], ['Wordmark', first.wordmark], ['Subline', first.subline]]
    .filter(([, v]) => v).map(([k, v]) =>
      `<div class="anat"><span class="dot" style="background:${v}"></span><strong style="width:80px">${k}</strong> <code>${v}</code></div>`).join('');
  const wayRows = ways.map(([k, v]) => `<li><strong>${k}</strong> — ${esc(v.note || '')}</li>`).join('');
  const ms = cfg.minSizes || {};
  const minRows = Object.entries(ms).map(([k, v]) =>
    `<tr><td>${esc(k)}</td><td>${esc(v.screen)}</td><td>${esc(v.print)}</td></tr>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(cfg.name)} — Logo Asset Guide</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;700;800&family=Lora:wght@400&display=swap" rel="stylesheet">
<style>@page{size:Letter;margin:15mm}*{box-sizing:border-box}
body{margin:0;font-family:'Hanken Grotesk',system-ui,sans-serif;color:#1c1917;font-size:10.3pt;line-height:1.6}
h1{font-family:'Lora',serif;font-weight:400;font-size:26pt;margin:0 0 3px}
h2{font-family:'Lora',serif;font-weight:400;font-size:14.5pt;margin:24px 0 8px;padding-bottom:5px;border-bottom:1px solid #e7e5e4;break-after:avoid}
h3{font-size:8.6pt;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:${cfg.colors.deep || '#57534e'};margin:14px 0 5px;break-after:avoid}
p{margin:0 0 8px}ul{margin:0 0 8px;padding-left:16px}li{margin-bottom:3px}
.lede{color:#78716c;font-size:11pt}
table{width:100%;border-collapse:collapse;font-size:8.8pt;margin:5px 0 11px}
th{text-align:left;font-size:7.5pt;letter-spacing:.11em;text-transform:uppercase;color:#78716c;border-bottom:1.5px solid #1c1917;padding:4px 7px 4px 0}
td{padding:4px 7px 4px 0;border-bottom:1px solid #eeebe9;vertical-align:top}
code{font-family:ui-monospace,Menlo,monospace;font-size:8.3pt;background:#f5f5f4;padding:1px 4px;border-radius:2px}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1c1917;padding-bottom:12px;margin-bottom:16px}
.hd img{height:40px}.two{display:flex;gap:16px}.two>div{flex:1}
.warn{background:#f5f5f4;border-left:3px solid ${cfg.colors.deep || '#57534e'};padding:10px 13px;margin:9px 0}
.key{background:#fafaf9;border:1px solid #e7e5e4;padding:13px 15px;margin:10px 0}
.tree{font-family:ui-monospace,Menlo,monospace;font-size:8.2pt;line-height:1.5;white-space:pre;background:#fafaf9;border:1px solid #e7e5e4;padding:11px 13px}
.cs{display:flex;gap:5px;margin:7px 0}.sw{flex:1;height:34px;border-radius:2px;border:1px solid rgba(0,0,0,.08)}
.sl{font-size:7.2pt;color:#78716c;margin-top:3px;font-family:ui-monospace,monospace}
.anat{display:flex;gap:9px;align-items:center;font-size:8.6pt;margin:5px 0}
.dot{width:11px;height:11px;border-radius:50%;flex-shrink:0;border:1px solid rgba(0,0,0,.1)}
</style></head><body>
<div class="hd"><div><h1>Logo asset package</h1><div class="lede">${esc(cfg.name)}${cfg.direction ? ' — ' + esc(cfg.direction) : ''} — ${esc(cfg.version)}</div></div>
${hero ? `<img src="data:image/svg+xml;base64,${hero}">` : ''}</div>
<p>Everything needed to put the ${esc(cfg.shortName)} mark on a website, a printed piece, a phone screen or a social profile. The lettering in every logo file is <strong>converted to outlines</strong>, so artwork renders identically on a machine that has never had the fonts installed.</p>
<div class="key"><h3 style="margin-top:0">Logo anatomy — the thing to get right</h3>${anat}
<p style="margin:8px 0 0">Never set the whole lockup in a single colour unless you are using one of the supplied <code>onecolour-</code> files.</p></div>
<h2>Which file do I use?</h2>
<table><tr><th>Situation</th><th>Use</th><th>Why</th></tr>
<tr><td>Website, app, anything on screen</td><td><code>02_Web/SVG/…_${ways[0][0]}.svg</code></td><td>Vector, sharp at any size, a few KB</td></tr>
<tr><td>Logo below the minimum below</td><td><code>…_${cfg.smallSizeColourway || ways[0][0]}.svg</code></td><td>Holds contrast where the primary thins out</td></tr>
<tr><td>Dark background or photography</td><td><code>…_${(ways.find(([,v])=>v.onDark)||ways[0])[0]}.svg</code></td><td>Built for reversing</td></tr>
<tr><td>One-colour print, stamps, engraving</td><td><code>…_onecolour-ink.svg</code></td><td>Single ink, no halftones</td></tr>
<tr><td>Where SVG isn’t supported</td><td><code>02_Web/PNG/…@2x.png</code></td><td>@2x retina, @3x phones</td></tr>
<tr><td>Anything going to a printer</td><td><code>01_Master-Vector/PDF/</code></td><td>Vector PDF is the universal print handoff</td></tr>
<tr><td>Printer insists on a raster</td><td><code>03_Print/PNG-300dpi/</code></td><td>2400px wide, ~8in at 300dpi</td></tr>
<tr><td>Browser tab icon</td><td><code>02_Web/Favicon/</code></td><td>Drop the folder at the site root</td></tr>
<tr><td>App icon</td><td><code>04_Mobile-and-Social/App-Icon/</code></td><td>iOS 1024 master; Android adaptive foreground</td></tr>
<tr><td>Social profile picture</td><td><code>…/Social/profile-400x400-*.png</code></td><td>Safe padding for circular crops</td></tr>
<tr><td>Link preview / OG image</td><td><code>…/Social/og-image-1200x630.png</code></td><td>Facebook, LinkedIn, iMessage</td></tr>
<tr><td>Email signature</td><td><code>…/Social/email-signature-600.png</code></td><td>Email clients don’t render SVG</td></tr></table>
<h2>The ${ways.length} colourways</h2>
<div class="two"><div><h3>When to use each</h3><ul>${wayRows}</ul></div>
<div><h3>Palette</h3><div class="cs">${sw}</div>
<div class="warn"><strong>For print:</strong> CMYK values in <code>06_Brand-Colors/</code> are conversions, not measured press values. Always ask for a proof before a run and match to the proof, not a screen.</div></div></div>
<h2>Clear space and minimum size</h2>
<p><strong>Clear space.</strong> ${esc(cfg.clearSpace || 'Keep free space around the logo equal to the height of the mark’s smallest repeating element on every side.')} That measure scales with the logo, so it works at any size without a calculation. Nothing — type, rules, photo edges, other logos — enters that zone.</p>
<table><tr><th>Asset</th><th>Minimum on screen</th><th>Minimum in print</th></tr>${minRows}</table>
${cfg.minSizeNote ? `<p>${esc(cfg.minSizeNote)}</p>` : ''}
<h2>Do and don’t</h2>
<div class="two"><div><h3>Do</h3><ul>${(cfg.do || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
<div><h3>Don’t</h3><ul>${(cfg.dont || []).map(s => `<li>${esc(s)}</li>`).join('')}</ul></div></div>
<h2>What’s in the box</h2>
<div class="tree">${esc(cfg.folderName)}/
├── 00_READ-ME-FIRST.pdf        this document
├── 01_Master-Vector/           the originals — start here for anything new
│   ├── SVG/                    masters: lockups, mark, wordmark
│   └── PDF/                    same set, vector, for print
├── 02_Web/
│   ├── SVG/                    web-ready vector
│   ├── PNG/                    @1x @2x @3x, transparent
│   └── Favicon/                16/32/48, .ico, apple-touch, android, manifest
├── 03_Print/
│   └── PNG-300dpi/             2400px rasters if a vector is refused
├── 04_Mobile-and-Social/
│   ├── App-Icon/               iOS 1024 + Android adaptive foregrounds
│   └── Social/                 profile, OG image, email signature
├── 05_Fonts/                   with licence notes
└── 06_Brand-Colors/            COLOUR-SPEC.txt, .json, .css
</div>
<p style="margin-top:14px;color:#78716c;font-size:8.8pt">Prepared by YohDev.</p>
</body></html>`;
}

module.exports = { guideHtml, colourSpec, cmyk };
