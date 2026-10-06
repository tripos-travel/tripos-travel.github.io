# Design Craft — the designer bar

Every page builder in this repo reads this before it designs anything. The ADA scan proves a page is
usable and the structure scan proves it is on the beaten trail; this document is about the third
thing a client notices in the first five seconds: **does it look like a designer made it, or like it
was generated?**

It is distilled from four builds clients responded to — and one they didn't:

| Build | What it proved | Register |
|---|---|---|
| **Element 47** (PR #67) | One conceit from the client's own story (their name, "47") can be the only ornament. Extreme type scale, a different layout in every section, physics-driven motion. | Kinetic |
| **Omni Mold & Die** (PR #69) | One metaphor from the trade (a machined part) mapped to every token. **No scroll animation at all** — six hover transitions on one curve read as "good animation". | Mechanical |
| **Wilson & Walker** (PR #70) | v1 was called *"AI generated"* by the client. v2 won by **subtracting**: no em dashes, no numbered eyebrows, no italic accent word in every heading, no pills, no marquee, no image wipes. | Editorial-slow |
| **IntualityAI** (PR #68) | With no photography, the visuals can come from what the product *does* (signals converging into a forecast) — generated from data, not decoration. | Kinetic |

The through-line: **an authored idea, applied with restraint, executed with precise type, real
content, and motion on one curve.** Generated pages fail the opposite way — no idea, the same
tasteful ornaments stacked on every section, invented copy, stock motion.

---

## 1. Concept first — one idea, from the client

Before any token: write one sentence naming the idea, and where it came from. It must come from the
client's own material — their story, their trade, their words, their product — never from a mood.

- Element 47 → the founder's dad answering every question with "Forty-seven" → a count-to-47 intro,
  a giant outlined 47, a diamond marker from the logo.
- Omni → "Omni machines steel to tight tolerances. The brand should look the same way." → 45°
  chamfers, spec-sheet labels, a fixture-plate grid, one brushed-steel finish from the chrome logo.
- Wilson & Walker → the client's own blog byline, "The Curated Surface" → an interiors magazine where
  the floor is the subject.
- IntualityAI → "LLMs predict the next word; we predict what happens next" → signals resolving into a
  forecast point, in the logo, the hero, and every chart.

Write it into provenance (`01-…`) as a **rationale table**: *device → where it comes from*. If a
device has no row, it doesn't ship.

## 2. Every device traces to the concept — or it goes

The same device is craft in one build and a tell in another. Element 47's "01 / 05" numbering is
the concept (it's a numbers brand); Omni's `SVC-01` part numbers are the concept (it's a spec
sheet); Wilson & Walker's numbered eyebrows were decoration, and the client called them AI.

**The kit — never by default.** Each of these has to be earned by the concept, and even then used
sparingly:

- numbered eyebrows / "01 —" section indexes / roman numerals
- an italic or colored accent word in every headline
- eyebrow hairlines, pills and badges, "NEW" chips
- marquees / tickers, background patterns, grain, glow, glass, blobs
- icon rows (and icon-in-a-circle feature grids), emoji anywhere
- three (or four) identical cards with an icon on top
- a centered hero with a badge, a headline, two buttons
- indigo→violet / purple→blue gradients; pure `#000` / `#FFF`
- animated counters, typing effects, parallax bands, looping scroll cues

**Ornament budget:** one signature device (the concept) used boldly, one supporting finish used once
(Omni's steel gradient on *one* headline word). Everything else is typography, space and content.

**Subtraction is a design step.** Record what you removed and why (Element 47 wrote down why the
illustrated icons went; Wilson & Walker keeps a *"Removed — do not reintroduce"* list in its tokens
doc and brand books). Minimalism reads as a decision only when it is one.

## 3. Copy — the client's words, set like an editor would

- **Only the client's words**, trimmed and re-ordered, each line traceable to a source page. Emphasis
  and order are yours; claims are not.
- Headlines in **sentence case, ending with a period**. Short. One idea.
- **No em dashes** — not in headlines, body, `<title>`, meta or alt text. Use a period, comma or colon.
- **No stock phrasing**: *elevate, seamless, unlock, cutting-edge, state-of-the-art, revolutionize,
  game-changer, next-level, harness, unleash, empower, delve, tapestry, one-stop shop, welcome to*.
  `craft:scan` flags these.
- **Hyper-specific nouns beat adjectives**: "GF AgieCharmilles Cut P550 ×2", "Okamoto 618B", "15 NFL
  seasons in Las Vegas", the twelve towns written as one sentence. Specificity is the most
  convincing human signal there is.
- **Never invent proof.** Missing testimonials, stats, certifications → a labeled open item with an
  owner (Omni: *"We won't write testimonials on Omni's behalf."*).
- A section's semantic heading can be a small label while the visual headline is a large paragraph
  (`<h2 class="label">The People</h2>` + a 42px serif sentence).

## 4. Typography — the fastest tell

- **Roles, not just faces.** Each face has exactly one job:
  display (says it) / reading (explains it) / mono or tracked caps (labels, data, UI).
  *"Cormorant speaks. Jost explains."* Put the display face in places a template wouldn't — lists,
  addresses, the mobile menu.
- **Extreme scale contrast, missing middle.** Display ≈ 6× body; no sizes crowding 20–28px.
  - Element 47: `clamp(54px,10.4vw,172px)` at line-height .88, tracking −0.055em, over 12px/0.14em labels.
  - Wilson & Walker: `clamp(46px,5.6vw + 18px,104px)`, Cormorant 300, −0.022em, lh .96, over 17px/1.75 body.
  - Tracking tightens as size grows (−0.01 → −0.08em); small caps widen (0.14 → 0.3em).
- **Optical width as a token** when the family has a `wdth` axis: *narrower* as size grows (E47: 88 →
  75), *wider* for small labels (Omni: 112% display, 125% labels).
- **Measure in `ch`**: hero 11ch, statements 20–24ch, body ≤ 62ch.
- **Display face with a point of view.** Inter / Roboto / Poppins / Montserrat / Open Sans are fine for
  body, not for headlines. `craft:scan` flags a default display face or a single-family page.
- Real typographic entities: `&rsquo;`, `&nbsp;·&nbsp;`, non-breaking hyphens, tabular numerals for
  counters and data.
- Self-host fonts (`woff2`, `font-display:swap`, shape-matched fallbacks). Headless renders and
  offline reviews then match what the client sees.

## 5. Color — conviction and scarcity

- **Neutrals named after the client's materials and tinted toward the brand** (Omni: graphite,
  gunmetal, steel, alloy — every neutral cool; Wilson & Walker: cream, linen, oak — every neutral
  warm). Never `#333`/`#F5F5F5`, never pure black/white.
- **One accent**, with **AA-safe companions** derived from each locked brand color: one for lines,
  one for text on light, one for text on dark. Publish a contrast matrix (fg × surface) in the tokens
  doc. A light logo color is never text.
- **Scarcity gives weight**: the dark panel once per page, behind the conversion (W&W); the accent
  under 5% of the surface (E47: < 2%). Rhythm comes from alternating surfaces, not gradients.
- **One signature finish** derived from a brand asset (Omni's chrome-logo gradient), used on one word
  or one button type. Everywhere, it's a filter; once, it's craft.
- Colors, easing and durations all live in `:root` as tokens.

## 6. Composition — never the same module twice in a row

- **Every section a different module.** Library, from the builds:
  type-only hero · bleed split hero · statement paragraph · numbered index with cursor preview ·
  asymmetric 7/5 + 4/4/4 editorial grid · horizontal snap rail · readout/spec bar · hairline
  `gap:1px` matrix · bento with one `span 2` feature · inventory ledger · real `<table>` · key/value
  list · photo split · full-bleed band with one sentence · `grid-template-areas` gallery ·
  scrollytelling stage · tabbed stage · giant-link footer.
  **At most one plain equal-card row per page.** `craft:scan` flags card monotony.
- **Structure with 1px hairlines**, not shadows and boxes. Radius is a single token (often 0, or one
  chamfer shape) locked in `theme.json`.
- **Asymmetric fr splits** (1.05/.95, 5fr/7fr, 3fr/9fr) and **bottom-aligned two-column section heads**
  (eyebrow + H2 left, lede right) instead of centered title-over-subtitle stacks.
- **Heroes anchored bottom-left / bottom-right** at `100svh` minus the header — and check the fold
  actually fills (Element 47's Hero C left a dead top half).
- **Bleeds done properly**: `margin-right: calc(-1 * (max(0px,(100vw - var(--container))/2) + var(--gutter)))`,
  directional scrim, a small data-plate caption pinned on the photo.
- **No accidental gaps.** Photo splits use `position:absolute; inset:0` media so the image always fills
  its half; galleries use authored `grid-template-areas` with every cell filled (W&W:
  `"a a b" "a a c" "d e e" "f e e"`). Staggered offsets and mosaics read as broken.
- **A separate mobile pass**, not a stack: `vw` headlines that fill the width, edge-to-edge snap rows
  with gutter-aligned `scroll-padding`, crops re-aimed (`object-position`), centered sections go left.

## 7. Imagery — real, curated, treated once

- **Real and local**: the client's own photos, downloaded once, self-hosted, credited in
  `assets/images/CREDITS.md` with source and rights notes. Never hotlink. Generate via
  `brand-imagery` only on-brand and labeled.
- **Curate by position, not availability.** A weak real photo (drop ceiling, TV, fluorescent light)
  undoes a luxury register — cut it, log the cut as an owned open item, and prefer a typographic
  section to a bad image.
- **One treatment** unifies mismatched sources (Omni: `grayscale(.35) contrast(1.05)`, restored on
  hover). Per-context aspect ratios. Frames filled with a stone token so nothing flashes gray.
  Text on photos only through a shaped scrim.
- **Normalize source crops** (E47's thumbnails kept baked-in watermark backgrounds — don't).
- **No photography? Visualize what the product does** from real structure (IntualityAI's signal
  field and forecast charts), label it *illustrative*, and never draw generic decorative SVG
  illustration.

## 8. Motion — pick a register, then use one curve

Motion intensity matches the brand. Choose one register in Phase 03 and write it into the tokens:

| Register | Brands | Technique | Timing |
|---|---|---|---|
| **Mechanical** | trades, industrial, B2B precision | Causal only: hover/state transitions, axis-aligned, one signature hover motif repeated (Omni's 3px bar growing across a cell). No scroll reveals. | 180ms micro · 260ms travel · `cubic-bezier(.2,.7,.2,1)` |
| **Editorial-slow** | luxury, interiors, hospitality, professional services | Opacity-only reveals (text rises 28px over 1.2s; images fade over 1.6s while the inner image settles from `scale(1.06)` over 2.4s); a 16s hero zoom-out; tiny slow hovers. No wipes, no loops. | UI .45s · reveals 1.2–2.4s · `cubic-bezier(.2,.7,.1,1)` |
| **Kinetic** | agencies, tech, product launches | Masked word-rise headlines, choreographed hero sequence, scroll-linked effects (word lighting, scrollytelling, timeline fill), one or two physics effects on fine pointers only (velocity marquee, lerped cursor preview, magnetic CTA). | entrances .9–1.8s `cubic-bezier(.16,1,.3,1)` · wipes `cubic-bezier(.77,0,.18,1)` |

Rules for every register:

- **One or two easing tokens, used everywhere.** Consistent physics is what reads as "designed".
- **Hidden states exist only when JS runs and motion is allowed.** Set the class before paint;
  scope every `opacity:0` under it; add a scroll fallback; reveal once and unobserve.

  ```html
  <script>/* in <head>, before any CSS paints */
    document.documentElement.classList.add('js');
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('motion');
  </script>
  <style>
    :root{ --ease-out:cubic-bezier(.16,1,.3,1); }
    .motion [data-reveal]{ opacity:0; transform:translateY(28px);
      transition:opacity 1.2s var(--ease-out), transform 1.2s var(--ease-out); transition-delay:calc(var(--d,0) * 80ms); }
    .motion [data-reveal].in{ opacity:1; transform:none; }
    @media (prefers-reduced-motion: reduce){ *,*::before,*::after{ animation:none!important; transition:none!important; } }
  </style>
  ```
- **Never leave an image invisible waiting for a trigger.** Wilson & Walker's clip-path wipes made
  photos look broken; Element 47's worked because they fire early and finish fast. Default to
  opacity + inner scale; if you wipe, observe the *parent* (a fully clipped box never intersects).
- **Choreograph the hero, then clear the delays** (E47 adds `hero-done` so later hovers respond
  instantly). Keep LCP content visible in under ~1s; no unskippable intro curtain on a real site.
- **Canvas / rAF loops pause off-screen and when idle**, and render a static frame under reduced
  motion.
- **A dim state that holds real copy keeps a 4.5:1 floor** (scroll-lit words start at the muted token,
  never 16% ink).
- Compose CSS and JS transforms without clobbering: `@property --sc{syntax:"<number>"}` and the
  standalone `translate` property.

## 9. UX system

- **One primary action**, named the same everywhere, repeated at escalating scale: header → hero →
  mid-page → a footer where the CTA *is* the headline. One primary button per view.
- **Design the conversion for the real job**: Omni's quote form has a Hot job / Standard / Planning
  selector and CAD upload, and puts the urgency path directly under the hero.
- **Keep the source's IA** unless research says otherwise; merge duplicates; move logins to a utility
  bar.
- **Plumbing every build must have** (all three reference builds missed at least one):
  - `scroll-margin-top` (or `scroll-padding-top` on `html`) equal to the sticky header height;
  - closed off-canvas drawers are `inert` or `visibility:hidden` — `translateX(100%)` + `aria-hidden`
    leaves links in the tab order; focus moves in on open and back on close; Esc closes;
  - `:focus-visible` rings in an accent companion; skip link; `aria-labelledby` on sections;
  - `width`/`height` on every image, `fetchpriority` on the hero, `srcset` for large images, lazy below the fold.

## 10. System and handoff

- **Derive tokens from the approved page and lock them** (`03-system-tokens.md`, marked LOCKED, with
  the contrast matrix, allowed-use rules, the motion register and easing tokens, and the *Removed —
  do not reintroduce* list).
- **Style Guide renders every component live** from the real CSS, with copy-paste snippets.
- **`theme.json` enforces the system** in the editor: `defaultPalette:false`, `custom:false`,
  `customFontSize:false`, radius locked, motion values in `settings.custom`.
- **Regenerate the system after every review round**, so it never drifts from what was approved.
- **Options as a decision tool** when direction is open: a URL-synced section switcher plus a hub
  with the brief, the rules applied, and a recommended combination (Element 47).

---

## The subtraction pass (before every handoff)

1. Screenshot desktop and 390px mobile, scrolling so reveals fire.
2. **Squint test**: can you name the concept from the screenshot alone?
3. List every ornament on the page. Beside each, write the concept row it serves. Delete the orphans.
4. Check the module sequence: no two neighbors the same; at most one equal-card row.
5. Read every headline aloud: client's words? sentence case? period? no dash, no stock phrase?
6. Check each image: would a luxury/precision/tech buyer (whoever the audience is) wince at it?
7. Run the gates: `npm run craft:scan`, `npm run ada:scan`, `npm run structure:scan`.

## The gate — `npm run craft:scan`

`scripts/craft-scan.js` encodes the mechanical parts of this document. **Errors** block the
pre-commit hook for staged output pages (content hidden with no JS gate, animation without a
reduced-motion rule, lorem ipsum). **Warnings** are designer push-back: answer them in the
provenance doc or fix them — stock copy, em dashes, default-only type, generic gradients, emoji
icons, card monotony, a static homepage, default easing only, missing focus styles, placeholder-heavy
pages, a drawer left in the tab order, a sticky header with no scroll offset.
