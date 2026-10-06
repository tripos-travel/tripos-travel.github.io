// The two logo directions Solas is choosing between.
//
// Neither is a new idea. The Solas design system already carries three logo
// cards (Style-Guide.html §02 · "Three starting points for the mark"), and the
// Playbook records the open decision behind them:
//
//   "Logo — In progress with an artist, going in its own direction. Three MVP
//    directions are in the design system as a launch-safe fallback that can be
//    refined later."
//
// So this flow does not invent a mark. It takes the two of those three cards that
// are actually DIRECTIONS, rebuilds them with real construction (marks.js), and
// puts them side by side with everything needed to pick one. The third card
// ("C · On peach, rule variant") is a wordmark-and-rule lockup rather than a
// mark, and it survives as the alternate lockup on both options — recorded here
// so a later round does not re-propose it as a third direction.
//
// ── The divergence rule ───────────────────────────────────────────────────────
// Two directions must differ on at least two of five structural axes — metaphor,
// geometricPrimitive, symmetry, spaceStrategy, massVsLine — or they are one
// direction shown twice. These differ on all five, and `npm run logos:check`
// asserts it rather than trusting this comment.

const C = require('./color.js');

// ── the palette ───────────────────────────────────────────────────────────────
// Updated in review: client feedback asked for the mark in pink rather than the
// original Sunburst Coral / Terracotta pair (see the logo-selection-color-note
// round and the PR #34 comment that preceded this change). The two swapped
// swatches are new; everything else — Cream, Peach, Peach Soft, Ink, Anchor —
// is untouched, and both options still share one palette rather than each
// getting its own, for the same reason as before: giving each option its own
// palette would make this a choice between two brands, not a choice of mark.
//
// The two new hexes were picked to land in the same hue family the client
// reacted to (the Banana Stand pink studies), then adjusted just enough to
// clear this palette's own contrast rules: the mark stays under 4.5:1 on cream
// (so it never quietly becomes usable as text), and the text-safe swatch clears
// 4.5:1 on both cream and peach. `npm run logos:check` asserts both.
//
// Pantone is deliberately absent. It is a licensed system and a number has to
// come from a physical guide or the client's own swatch cards; nobody has
// supplied one for Solas. A guessed Pantone is worse than none — a printer will
// run it.
const PALETTE = [
  { name: 'Cream',       token: '--cream',           hex: 'FDFAF6',
    role: 'The page. Every Solas surface starts here — the system is light-first because the name means light.' },
  { name: 'Peach',       token: '--peach',           hex: 'FAD9C7',
    role: 'The warm field. Section bands and cards that need to lift off the cream.' },
  { name: 'Peach Soft',  token: '--peach-soft',      hex: 'FDEEE6',
    role: 'The quietest field. The ground behind a roundel or an app tile.' },
  { name: 'Sunburst Rose', token: '--coral',        hex: 'C05A67',
    role: 'The mark’s colour. Decorative only — fills, icons, rules, the sun itself.' },
  { name: 'Berry',  token: '--terracotta',      hex: '96324A',
    role: 'The text-safe sibling. Every link, label and button, and the wordmark.' },
  { name: 'Ink',         token: '--ink',             hex: '221C19',
    role: 'Headings and body copy on any light surface.' },
  { name: 'Anchor',      token: '--anchor',          hex: '2F2621',
    role: 'The one deep tone. The footer, and nowhere else.' },
];

// Which colour plays which structural role, named explicitly rather than looked
// up by swatch name — a by-name lookup breaks the moment a swatch is renamed.
const ROLES = {
  page: 'Cream', field: 'Peach', quiet: 'Peach Soft',
  mark: 'Sunburst Rose', text: 'Berry', ink: 'Ink', deep: 'Anchor',
};

const hexOf = name => PALETTE.find(c => c.name === name).hex;
const role = r => '#' + hexOf(ROLES[r]);

// ── the four colourways ───────────────────────────────────────────────────────
// Four real options, not one printed four times. Each states the surface it is
// for and carries its own measured contrast, because the rule that governs this
// palette is that a colour bright enough to be the mark is not always dark
// enough to be the type beside it.
const COLOURWAYS = [
  { id: 'primary',  label: 'Primary — on cream',
    ground: hexOf('Cream'),      mark: hexOf('Sunburst Rose'), word: hexOf('Berry') },
  { id: 'field',    label: 'On peach',
    ground: hexOf('Peach'),      mark: hexOf('Berry'),     word: hexOf('Ink') },
  { id: 'one',      label: 'One colour — ink',
    ground: hexOf('Cream'),      mark: hexOf('Ink'),            word: hexOf('Ink') },
  { id: 'reversed', label: 'Reversed — on the anchor',
    ground: hexOf('Anchor'),     mark: hexOf('Sunburst Rose'), word: hexOf('Cream') },
];

// ── type ──────────────────────────────────────────────────────────────────────
// Both faces are already in the Solas system and both are SIL OFL, so there is
// no licence to resolve and no stand-in to explain — which is the one thing this
// package has that the Beyond Infinity one did not.
const TYPE = {
  // Markup.io client review, 2026-09-06: Lora is her confirmed pick for the
  // wordmark and every heading, over Newsreader (the six-faces grid in
  // review.js still shows Newsreader as `current` — what the live site is set
  // in today — alongside Lora badged as the pick, so the comparison stays
  // legible). This value drives --font-display in shell.js's TOKENS, so it
  // reaches every heading across the whole deck, not just the wordmark cards.
  display: { name: 'Lora', q: 'Lora:wght@400;500;600',
    weights: ['Regular 400', 'Medium 500'],
    clientPick: true,
    note: 'The wordmark and every heading, Nancy\'s confirmed pick. Steadier and warmer than '
        + 'Newsreader, and no italics — a standing instruction from the last round of feedback.',
    mac: 'Georgia', win: 'Georgia', android: 'Noto Serif', generic: 'serif' },
  body: { name: 'Hanken Grotesk', q: 'Hanken+Grotesk:wght@400;500;600;700;800',
    weights: ['Regular 400', 'SemiBold 600', 'ExtraBold 800'],
    // Markup.io client review, 2026-09-06, comment [3]: pinned directly on this
    // card's body-copy line — she likes this face for the text, distinct from
    // comment [2] on Newsreader in the six-faces headline grid. See theType()
    // in review.js.
    clientPick: true,
    note: 'Body copy, and the 11px uppercase labels at 0.22em tracking that do most of the work.',
    mac: 'Helvetica Neue', win: 'Segoe UI', android: 'Roboto', generic: 'sans-serif' },
};

// The wordmark faces, shown with the mark constant beside each so only the face
// changes. All six are OFL and self-hosted, so any of them can be committed to
// today. Ordered finest to sturdiest, because the trade is the hairline: the
// finer the face, the less of it survives at 16px and in one colour.
//
// Newsreader is first because it is what Solas already uses — the comparison
// exists to test that choice, not to reopen it.
const DISPLAY_FACES = [
  { name: 'Newsreader', q: 'Newsreader:opsz,wght@6..72,400;6..72,500', weight: 400, current: true,
    note: 'What Solas is set in today. Editorial, high contrast, a real text face rather than a display-only one.' },
  { name: 'Cormorant', q: 'Cormorant:wght@400;500;600', weight: 500,
    note: 'Finer and more organic, with an angled axis. The most delicate of the six — and the first to thin out at small sizes.' },
  { name: 'Prata', q: 'Prata', weight: 400,
    note: 'High contrast but warmer, with more weight in the thins. Reads friendlier than a strict Didone.' },
  { name: 'Lora', q: 'Lora:wght@400;500;600', weight: 500,
    // Markup.io client review, 2026-09-06 (superseding an earlier Newsreader
    // reading of the same comments): her pick for the wordmark/headings.
    clientPick: true,
    note: 'The steadiest. Moderate contrast, brushed curves — the safest choice for long reading.' },
  { name: 'Playfair Display', q: 'Playfair+Display:wght@400;500;600', weight: 500,
    note: 'More display than text: tighter, more dramatic. Holds up smaller than Cormorant.' },
  { name: 'DM Serif Display', q: 'DM+Serif+Display', weight: 400,
    note: 'The sturdiest here, thick enough in the thins to hold at a favicon size — and the least editorial.' },
];

// ── the two directions ────────────────────────────────────────────────────────
const A = {
  id: 'a', option: 'A', name: 'Daybreak', mark: 'a',
  from: 'A · Rising sun',
  thesis: 'The light is coming back.',
  // Nancy's own words from the discovery call, quoted rather than paraphrased.
  // The Playbook calls this "the single most useful creative instruction in this
  // document", so it is the thing each direction has to answer to.
  answersTo: 'you’ve got a little spark again — like a weight gets lifted',
  metaphor: 'first light over a horizon',
  primitive: 'a half-disc on a straight baseline, with straight rays above it',
  symmetry: 'bilateral — mirrored about the vertical, with a top and a bottom',
  space: 'the horizon grounds it; every bit of open space is above the line',
  massLine: 'line',
  recommend: 'solid',
  para: `Solas is the Gaelic word for light. <strong>Daybreak</strong> is the direction already
    sketched in your design system — a sun coming up over a horizon line — rebuilt with real
    construction. It is light as <em>relief</em> rather than light as spectacle: the sun is not
    overhead, it is arriving. That reading is the one thing the brand cannot get wrong, and a mark
    with a horizon in it says it without a word of copy.`,
  // What is actually wrong with it. The sheet is for deciding, and a client
  // deciding on flattery decides badly.
  honest: [
    'It is a wide mark — roughly two to one — so anywhere square (a favicon, a social avatar, an app icon) needs the roundel or the tile rather than the mark itself.',
    'The Monoline cut closes up below about 40px tall. Below that it has to be the Bold cut.',
    'A horizon reads as a landscape at a glance. It is the more distinctive of the two and the one more likely to need a second look.',
  ],
  strength: 'Says something. A horizon is a narrative the other direction does not have.',
};

const B = {
  id: 'b', option: 'B', name: 'Radiance', mark: 'b',
  from: 'B · Horizontal lockup',
  thesis: 'The light is already hers.',
  // Markup.io client review, 2026-09-06: unanimous on this direction and on
  // the Bold cut treatment (already `recommend` below). Wordmark/headings →
  // Lora (`clientPick` on DISPLAY_FACES), body → Hanken Grotesk (`clientPick`
  // on TYPE.body). Sets the "Nancy's pick" badges throughout — see
  // theSix()/theFaces()/theType()/theFinal()/ask() in review.js and
  // options()/ask() in hub.js.
  clientPick: true,
  answersTo: 'the light is still theirs, not something a practice hands to them',
  metaphor: 'the sun at full strength, radiating from a centre',
  primitive: 'a circle with radial spokes all round it',
  symmetry: '8-fold rotational — no top, no bottom, no orientation',
  space: 'a solid core, with the meaning in the even gaps between the rays',
  massLine: 'mass',
  recommend: 'bold',
  para: `Solas is the Gaelic word for light. <strong>Radiance</strong> is the other direction from
    your design system — the full sun beside the name — rebuilt on a circle grid. It makes a
    different claim from Daybreak: the light is not rising, it is simply <em>on</em>. That matches
    the line in your playbook about the light being hers already rather than something the practice
    switches on for her.`,
  honest: [
    'It is the more conventional of the two. A radiating sun is the single most-used mark in wellness, and adjacent-but-distinct is a stated requirement here — this direction needs the type and the palette to carry the difference.',
    'The Monoline cut thins out below about 24px; every other cut holds to 16px.',
    'Being square and orientation-free, it is the easier mark to live with in every slot — which is also why it is the less memorable one.',
  ],
  strength: 'Works everywhere, at every size, with no second file. Square, symmetrical, and legible at 16px.',
};

const DIRECTIONS = [A, B];

// Every colour, resolved against the surfaces it has to survive on. The page
// prints these; nothing is typed by hand.
function measured() {
  return PALETTE.map(c => ({
    ...c,
    rgb: C.rgb(c.hex),
    cmyk: C.cmyk(c.hex),
    onCream:  C.ratio(c.hex, hexOf('Cream')),
    onPeach:  C.ratio(c.hex, hexOf('Peach')),
    onAnchor: C.ratio(c.hex, hexOf('Anchor')),
  }));
}

module.exports = { A, B, DIRECTIONS, PALETTE, ROLES, COLOURWAYS, TYPE, DISPLAY_FACES,
                   hexOf, role, measured };
