'use strict';
/* The export matrix. Change this and every client's bundle changes together —
   that consistency is the point of the skill. */

function buildJobs(cfg, pkg) {
  const j = [];
  const add = (svg, out, w, extra = {}) => j.push({ svg: `${cfg.filePrefix}_${svg}`, out: `${pkg}/${out}`, w, ...extra });
  const ways = Object.keys(cfg.lockups);
  const dark = new Set(ways.filter(w => cfg.lockups[w].onDark));
  const darkBg = cfg.colors.anchor || '#000000';
  const iconBg = cfg.iconBackground || cfg.colors.deep || cfg.colors.ink;
  const smallWay = cfg.smallSizeColourway || ways[0];
  const P = cfg.filePrefix;
  const bgFor = w => (dark.has(w) ? { bg: darkBg } : {});

  // 01 master vector PDFs
  for (const a of ['lockup-stacked', 'lockup-horizontal'])
    for (const w of ways) add(`${a}_${w}`, `01_Master-Vector/PDF/${P}_${a}_${w}.pdf`, 600, bgFor(w));
  for (const k of Object.keys(cfg.markColours || {}))
    add(`mark_${k}`, `01_Master-Vector/PDF/${P}_mark_${k}.pdf`, 400, k === 'white' ? { bg: darkBg } : {});
  for (const k of Object.keys(cfg.wordmarkColours || {}))
    add(`wordmark_${k}`, `01_Master-Vector/PDF/${P}_wordmark_${k}.pdf`, 600, k === 'white' ? { bg: darkBg } : {});

  // 02 web PNG @1x @2x @3x
  const scales = [[1, '@1x'], [2, '@2x'], [3, '@3x']];
  for (const [a, base] of [['lockup-horizontal', 400], ['lockup-stacked', 300]])
    for (const w of ways) for (const [m, t] of scales)
      add(`${a}_${w}`, `02_Web/PNG/${P}_${a}_${w}${t}.png`, base * m);
  for (const k of Object.keys(cfg.markColours || {})) for (const [m, t] of scales)
    add(`mark_${k}`, `02_Web/PNG/${P}_mark_${k}${t}.png`, 128 * m);
  for (const k of Object.keys(cfg.wordmarkColours || {})) for (const [m, t] of scales)
    add(`wordmark_${k}`, `02_Web/PNG/${P}_wordmark_${k}${t}.png`, 400 * m);

  // favicons — the mark at 16px is where a light brand colour disappears,
  // so these use the small-size mark, not the primary one.
  const favMark = cfg.faviconMark || 'deep';
  for (const s of [16, 32, 48]) add(`mark_${favMark}`, `02_Web/Favicon/favicon-${s}x${s}.png`, s, { square: true, pad: 0.06 });
  for (const [name, w] of [['apple-touch-icon-180', 150], ['android-chrome-192', 160], ['android-chrome-512', 426]])
    add('mark_white', `02_Web/Favicon/${name}.png`, w, { square: true, pad: 0.10, bg: iconBg });

  // 03 print rasters (fallback when a printer refuses vector)
  for (const a of ['lockup-stacked', 'lockup-horizontal'])
    for (const w of ways) add(`${a}_${w}`, `03_Print/PNG-300dpi/${P}_${a}_${w}_300dpi.png`, 2400, bgFor(w));
  for (const k of Object.keys(cfg.markColours || {}))
    if (k !== 'white') add(`mark_${k}`, `03_Print/PNG-300dpi/${P}_mark_${k}_300dpi.png`, 1800);

  // 04 mobile + social
  add('mark_white', '04_Mobile-and-Social/App-Icon/ios-appicon-1024.png', 850, { square: true, pad: 0.10, bg: iconBg });
  for (const s of [512, 192, 144, 96])
    add('mark_white', `04_Mobile-and-Social/App-Icon/android-adaptive-foreground-${s}.png`,
      Math.round(s * 0.62), { square: true, pad: 0.31 });
  const darkWay = ways.find(w => dark.has(w)) || ways[0];
  add(`lockup-stacked_${darkWay}`, '04_Mobile-and-Social/Social/profile-400x400-dark.png', 250, { square: true, pad: 0.30, bg: darkBg });
  add(`lockup-stacked_${ways[0]}`, '04_Mobile-and-Social/Social/profile-400x400-light.png', 250, { square: true, pad: 0.30, bg: cfg.colors.cream || '#FFFFFF' });
  add(`lockup-horizontal_${ways[0]}`, '04_Mobile-and-Social/Social/og-image-1200x630.png', 620, { bg: cfg.colors.cream || '#FFFFFF' });
  add(`lockup-horizontal_${darkWay}`, '04_Mobile-and-Social/Social/email-signature-600.png', 600, { bg: darkBg });

  return { jobs: j, smallWay };
}
module.exports = { buildJobs };
