// The page furniture every logo-selection page is built in.
//
// Extracted so the hub, the two option pages and the two sheets cannot drift
// apart. They are one experience from the client's side — she clicks from the hub
// into an option, across to the other, and out to a sheet — and a second copy of
// these values is a second thing to keep in step.
//
// The tokens are lifted verbatim from the :root block of
// demos/rodwell-tuohy/output/Style-Guide.html. Nothing here invents a colour, a
// face, or a radius. Two brand rules drive most of the decisions below and are
// worth stating because breaking either is easy and invisible:
//
//   * LIGHT-FIRST. "Solas means light, so the system is light-first. Cream and
//     peach do the work; the one deep tone appears at the footer and nowhere
//     else." The Beyond Infinity version of this flow set both option pages on a
//     near-black ground because that client asked for it. Doing that here would
//     contradict the Playbook's explicit guardrail — "No dark, moody treatment.
//     The first pass of this brand system led with deep plum and dark bands; it
//     has been rebuilt light-first for this reason."
//
//   * THE TWO-ACCENT RULE. The mark colour is decorative only — fills, icons,
//     rules, the mark itself — because it does not clear 4.5:1 on the page. Its
//     darker sibling carries every piece of text. Peach never sits behind small
//     text at all. That split is what lets the palette stay this bright and still
//     clear WCAG AA. Deliberately stated without swatch NAMES or figures: the
//     palette was recoloured once already (Coral/Terracotta → Sunburst Rose/Berry)
//     and a comment quoting the old pair and its old ratio is how the next person
//     learns a rule that is no longer true. check.js asserts the thresholds; it is
//     the only place the numbers live.
//
// No italics anywhere: a standing instruction from the client's last round.

const { hexOf, TYPE } = require('./directions.js');

const TOKENS = `
  --cream:${'#' + hexOf('Cream')};
  --white:#FFFFFF;
  --peach:${'#' + hexOf('Peach')};
  --peach-soft:${'#' + hexOf('Peach Soft')};
  --coral:${'#' + hexOf('Sunburst Rose')};
  --terracotta:${'#' + hexOf('Berry')};
  --ink:${'#' + hexOf('Ink')};
  --ink-2:#3D342F;
  --muted:#6B5E56;
  --anchor:${'#' + hexOf('Anchor')};
  --line:rgba(34,28,25,0.14);
  --line-2:rgba(34,28,25,0.26);
  --font-display:"${TYPE.display.name}",${TYPE.display.mac || 'Georgia'},${TYPE.display.generic};
  --font-body:"${TYPE.body.name}",${TYPE.body.generic};
  --r:4px;
`.replace(/\n\s+/g, '\n  ');

const CSS = `
*,*::before,*::after{box-sizing:border-box}
/* An HTML height attribute survives width:100%. That single fact shipped twelve
   cropped logo cards on the Beyond Infinity pages, because each 800x800 concept
   image laid out narrow-and-tall and object-fit:cover cut its edges off. */
img{display:block;max-width:100%;height:auto}
html,body{margin:0;padding:0;background:var(--cream);color:var(--ink);overflow-x:clip}
body{font-family:var(--font-body);font-size:16px;line-height:1.65;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{font-family:var(--font-display);font-weight:500;margin:0;color:var(--ink);
  letter-spacing:-0.015em;line-height:1.14}
p{margin:0 0 1em}
a{color:var(--terracotta)}
a:hover{color:var(--ink)}
strong{font-weight:700;color:var(--ink)}
/* The design system sets em to upright terracotta rather than italic — no
   italics anywhere is a standing instruction. */
em{font-style:normal;color:var(--terracotta)}
.skip{position:absolute;left:-9999px}
.skip:focus{left:8px;top:8px;background:var(--ink);color:var(--cream);padding:9px 13px;z-index:99;
  border-radius:var(--r)}
:focus-visible{outline:2px solid var(--terracotta);outline-offset:2px}
.wrap{max-width:1080px;margin:0 auto;padding:0 clamp(22px,4vw,44px)}
.eyebrow{font-family:var(--font-body);font-size:11px;font-weight:800;letter-spacing:0.22em;
  text-transform:uppercase;color:var(--terracotta);margin:0 0 16px}

/* ── the bar: the only navigation, because the only choice is A or B ───────── */
.top{position:sticky;top:0;z-index:30;background:rgba(255,255,255,0.96);
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
  border-bottom:1px solid var(--line)}
.top__in{display:flex;align-items:center;gap:12px;flex-wrap:wrap;min-height:62px;
  padding-top:11px;padding-bottom:11px}
.top__lock{display:flex;align-items:center;gap:10px;margin-right:auto;text-decoration:none;
  color:var(--ink)}
.top__wm{font-family:var(--font-display);font-size:17px;font-weight:500;letter-spacing:0.28em;
  text-transform:uppercase;line-height:1}
.tab{font-family:var(--font-body);font-size:11px;font-weight:800;letter-spacing:0.14em;
  text-transform:uppercase;text-decoration:none;color:var(--ink-2);padding:9px 13px;
  border:1px solid var(--line);border-radius:2px;background:var(--white)}
.tab:hover{border-color:var(--line-2);color:var(--ink)}
/* The page you're on reads as pink, not a dark block that looks like a different
   control — every other tab stays plain white so there is exactly one colour to
   scan for. Peach + Berry rather than Sunburst Rose: Rose is decorative-only and
   fails 4.5:1 as text at any weight in this palette (measured), so a tab label
   in it would be the one interactive text on the page that can't clear AA. Peach
   is a genuine pink field and Berry — Rose's text-safe sibling — clears 5.55:1 on it. */
.tab[aria-current]{background:var(--peach);border-color:var(--terracotta);color:var(--terracotta)}

/* ── hero ─────────────────────────────────────────────────────────────────── */
.hero{padding:clamp(46px,7vw,88px) 0 clamp(34px,5vw,58px);display:grid;gap:clamp(28px,5vw,54px);
  align-items:center;grid-template-columns:1fr}
@media(min-width:840px){.hero{grid-template-columns:1.1fr .9fr}}
.hero h1{font-size:clamp(40px,7vw,70px);font-weight:400;letter-spacing:-0.025em;margin:0 0 20px}
.hero__p{font-size:17.5px;color:var(--ink-2);margin:0;max-width:54ch;line-height:1.72}
.hero__mk{display:grid;place-items:center;padding:clamp(26px,4vw,46px);border-radius:var(--r);
  background:var(--white);border:1px solid var(--line);position:relative}
.hero__mk svg{color:var(--coral)}
.hero__mk img{width:100%;max-width:240px;height:auto}
.hero__q{margin:22px 0 0;padding-left:18px;border-left:2px solid var(--coral);
  font-family:var(--font-display);font-size:19px;color:var(--ink-2);max-width:44ch}
.hero__q span{display:block;margin-top:8px;font-family:var(--font-body);font-size:11px;
  font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted)}

/* ── a section ────────────────────────────────────────────────────────────── */
.s{padding:clamp(44px,6vw,74px) 0;border-top:1px solid var(--line)}
.s__h{display:grid;grid-template-columns:1fr;gap:12px;margin-bottom:clamp(26px,3.6vw,38px)}
@media(min-width:840px){.s__h{grid-template-columns:190px 1fr;gap:40px;align-items:baseline}}
.s__n{font-family:var(--font-body);font-size:11px;font-weight:800;letter-spacing:0.16em;
  text-transform:uppercase;color:var(--terracotta)}
.s h2{font-size:clamp(25px,3.5vw,38px);font-weight:400}
.s__l{font-size:16px;color:var(--muted);max-width:62ch;margin:13px 0 0;line-height:1.7}

/* ── the size ramp ────────────────────────────────────────────────────────── */
.ramp{display:flex;align-items:flex-end;justify-content:center;gap:clamp(20px,4.6vw,50px);
  flex-wrap:wrap;padding:clamp(28px,4.4vw,48px) 22px;border-radius:var(--r);
  background:var(--white);border:1px solid var(--line)}
.ramp figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:12px}
.ramp svg{color:var(--coral)}
.ramp figcaption{font-family:var(--font-body);font-size:10px;font-weight:800;letter-spacing:0.12em;
  text-transform:uppercase;color:var(--muted)}

/* ── the six ──────────────────────────────────────────────────────────────── */
.six{display:grid;gap:clamp(13px,1.7vw,18px);grid-template-columns:1fr}
@media(min-width:560px){.six{grid-template-columns:1fr 1fr}}
@media(min-width:900px){.six{grid-template-columns:repeat(3,1fr)}}
.six figure{margin:0;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;
  background:var(--white);display:flex;flex-direction:column}
.six figure[data-rec]{border-color:var(--terracotta);box-shadow:0 0 0 1px var(--terracotta)}
.six__art{aspect-ratio:1;display:grid;place-items:center;background:var(--white);
  padding:20px;position:relative}
.six__art svg{color:var(--terracotta)}
.six__art img{width:100%;height:auto;object-fit:contain}
.six__art svg{width:100%;height:auto}
.six__badge{position:absolute;top:10px;left:10px;font-family:var(--font-body);font-size:9.5px;
  font-weight:800;letter-spacing:0.13em;text-transform:uppercase;background:var(--terracotta);
  color:var(--cream);padding:4px 8px;border-radius:2px}
.six figcaption{padding:14px 17px 17px;border-top:1px solid var(--line);flex:1}
.six__n{font-family:var(--font-display);font-size:19px;font-weight:500;display:block;
  margin-bottom:5px}
.six__d{font-size:13.5px;color:var(--muted);margin:0;line-height:1.6}

/* ── the faces ────────────────────────────────────────────────────────────── */
.faces{display:grid;gap:14px;grid-template-columns:1fr}
@media(min-width:640px){.faces{grid-template-columns:1fr 1fr}}
@media(min-width:980px){.faces{grid-template-columns:repeat(3,1fr)}}
.faces figure{margin:0;border:1px solid var(--line);border-radius:var(--r);background:var(--white);
  overflow:hidden}
.faces figure[data-cur]{border-color:var(--terracotta)}
.faces__set{display:flex;flex-direction:column;align-items:center;gap:13px;padding:30px 20px;
  background:var(--peach-soft);position:relative}
.faces__set svg{color:var(--coral)}
.faces__set img{height:46px;width:auto}
.faces__badge{position:absolute;top:10px;left:10px;font-family:var(--font-body);font-size:9.5px;
  font-weight:800;letter-spacing:0.13em;text-transform:uppercase;background:var(--terracotta);
  color:var(--cream);padding:4px 8px;border-radius:2px}
.faces__wm{margin:0;font-size:29px;letter-spacing:0.26em;text-transform:uppercase;
  color:var(--ink);line-height:1;text-align:center}
.faces figcaption{padding:13px 17px 16px;border-top:1px solid var(--line)}
.faces__n{font-family:var(--font-body);font-size:12px;font-weight:800;letter-spacing:0.1em;
  text-transform:uppercase;display:block;margin-bottom:5px;color:var(--ink)}
.faces__w{font-size:13px;color:var(--muted);margin:0;line-height:1.6}

/* two specimens side by side on a wide screen, stacked on a phone */
.pair{display:grid;gap:14px;grid-template-columns:1fr}
@media(min-width:820px){.pair{grid-template-columns:1fr 1fr}}
.pair>div{background:var(--white);border:1px solid var(--line);border-radius:var(--r);
  padding:clamp(22px,3.2vw,32px);position:relative}
.pair>div[data-picked]{border-color:var(--terracotta);box-shadow:0 0 0 1px var(--terracotta)}

/* ── the colourways ───────────────────────────────────────────────────────── */
.ways{display:grid;gap:14px;grid-template-columns:1fr}
@media(min-width:600px){.ways{grid-template-columns:1fr 1fr}}
@media(min-width:980px){.ways{grid-template-columns:repeat(4,1fr)}}
.ways figure{margin:0;border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.ways__box{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
  padding:34px 18px;min-height:154px}
.ways__wm{margin:0;font-family:var(--font-display);font-size:19px;font-weight:500;
  letter-spacing:0.26em;text-transform:uppercase;line-height:1}
.ways figcaption{padding:12px 15px 14px;background:var(--white);border-top:1px solid var(--line)}
.ways__n{font-family:var(--font-body);font-size:11px;font-weight:800;letter-spacing:0.1em;
  text-transform:uppercase;color:var(--ink);display:block;margin-bottom:4px}
.ways__m{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:10.5px;color:var(--muted);
  margin:0;line-height:1.55}

/* ── the final lockup ─────────────────────────────────────────────────────── */
.fin{border:1px solid var(--line);border-radius:var(--r);background:var(--white);
  padding:clamp(34px,6vw,72px) 22px;display:grid;place-items:center;gap:20px;position:relative}
.fin svg{color:var(--coral)}
.fin__wm{margin:0;font-family:var(--font-display);font-size:clamp(30px,5.4vw,52px);font-weight:400;
  letter-spacing:0.3em;text-transform:uppercase;color:var(--ink);line-height:1;text-align:center}
.fin__sub{margin:0;font-family:var(--font-body);font-size:11px;font-weight:800;
  letter-spacing:0.24em;text-transform:uppercase;color:var(--muted)}
.fin__body{margin:0;font-family:var(--font-body);font-size:16px;font-weight:400;
  color:var(--ink-2);line-height:1.65;text-align:center;max-width:38ch}
.fin__set{display:grid;gap:14px;grid-template-columns:1fr;margin-top:16px}
@media(min-width:720px){.fin__set{grid-template-columns:repeat(3,1fr)}}
.fin__v{margin:0;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;
  background:var(--white);display:flex;flex-direction:column}
.fin__box{display:flex;align-items:center;justify-content:center;gap:13px;padding:30px 18px;
  min-height:118px;background:var(--peach-soft);flex:1}
.fin__box svg{color:var(--coral)}
.fin__box--peach{background:var(--peach)}
.fin__box--peach svg{color:var(--terracotta)}
.fin__wm--in{margin:0;font-family:var(--font-display);font-size:20px;font-weight:500;
  letter-spacing:0.24em;text-transform:uppercase;color:var(--ink);line-height:1}
.fin__v figcaption{padding:12px 16px 14px;border-top:1px solid var(--line);font-size:13px;
  color:var(--muted)}

/* ── honest notes ─────────────────────────────────────────────────────────── */
.hon{display:grid;gap:12px;grid-template-columns:1fr;margin:0;padding:0;list-style:none}
@media(min-width:820px){.hon{grid-template-columns:repeat(3,1fr)}}
.hon li{background:var(--white);border:1px solid var(--line);border-left:2px solid var(--coral);
  border-radius:var(--r);padding:18px 20px;font-size:14.5px;color:var(--ink-2);line-height:1.65}

/* ── callout ──────────────────────────────────────────────────────────────── */
.call{background:var(--peach-soft);border:1px solid var(--line);border-radius:var(--r);
  padding:20px 24px;margin-top:22px}
.call p{margin:0;font-size:14.5px;color:var(--ink-2);line-height:1.68}
.call p+p{margin-top:11px}

/* ── take it with you ─────────────────────────────────────────────────────── */
.dl{display:grid;gap:14px;grid-template-columns:1fr}
@media(min-width:720px){.dl{grid-template-columns:1fr 1fr}}
.dl a{display:flex;gap:15px;align-items:flex-start;text-decoration:none;background:var(--white);
  border:1px solid var(--line);border-radius:var(--r);padding:20px 22px;color:var(--ink)}
.dl a.dl__wide{grid-column:1/-1}
.dl a:hover{border-color:var(--terracotta)}
.dl svg{flex:none;color:var(--terracotta)}
.dl strong{display:block;font-family:var(--font-display);font-weight:500;font-size:19px;
  margin-bottom:5px;letter-spacing:-0.01em}
.dl span span{font-size:13.5px;color:var(--muted);line-height:1.6}

/* ── the question ─────────────────────────────────────────────────────────── */
.ask{background:var(--peach);border-top:1px solid var(--line);padding:clamp(44px,6vw,76px) 0}
.ask h2{font-size:clamp(26px,4vw,42px);font-weight:400;margin-bottom:16px}
.ask p{font-size:17px;color:var(--ink-2);max-width:58ch;margin:0}
.btn{display:inline-block;margin-top:24px;background:var(--terracotta);color:var(--cream);
  font-family:var(--font-body);font-size:13px;font-weight:700;letter-spacing:0.06em;
  text-decoration:none;padding:14px 24px;border-radius:2px}
.btn:hover{background:var(--ink);color:var(--cream)}

/* ── footer ───────────────────────────────────────────────────────────────── */
.ftr{background:var(--anchor);color:var(--peach-soft);padding:34px 0;font-size:13.5px}
.ftr a{color:var(--peach-soft);text-decoration:underline}
.ftr a:hover{color:var(--white)}
.ftr p{margin:0;line-height:1.7}
`;

// The two dimensions the pages need for an inline icon, kept here so the download
// rows on the hub and both option pages are the same icon.
const SHEET_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" '
  + 'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" '
  + 'aria-hidden="true" focusable="false"><path d="M14 3v5h5"/>'
  + '<path d="M19 8v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h8Z"/>'
  + '<path d="M8.5 13h7M8.5 16.5h4.5"/></svg>';

// A slide/deck icon, for the PowerPoint download row alongside the VisID sheets.
const DECK_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" '
  + 'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" '
  + 'aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="12" rx="1"/>'
  + '<path d="M8 20h8M12 17v3M7 9h10M7 12.5h6"/></svg>';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Every page links the self-hosted faces, never Google. See fonts.js.
const FONT_LINK = href => `<link href="${href}" rel="stylesheet">`;

module.exports = { TOKENS, CSS, SHEET_ICON, DECK_ICON, esc, FONT_LINK };
