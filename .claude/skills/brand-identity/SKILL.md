# Brand Identity Skill

## Identity
- **Name:** `brand-identity`
- **Display name:** Brand Identity (logo concepts → VisID)
- **Description:** Run a branding exercise end to end: author genuinely distinct logo concept directions, render one of each, help the client pick one, redraw it as real vector geometry, and deliver a one-page identity spec — lockup, mark, wordmark, colour with print values, type per platform, reproduction and misuse rules.
- **Version:** 1.0.0

## Why this exists
Asking an image model for "four logo options" returns four takes on whatever it landed on first.
The client sees near-identical thumbnails and says *"it just looks very similar, right?"* — and the
round is wasted.

The fix is to split the work in two. **Decide the ideas first, in language. Render second.** A
reasoning model writes each direction — its metaphor, its form language, its reason to exist — and
only then does an image model draw them. Difference is designed, not hoped for.

Generated renders are **never** the deliverable. They settle a direction in one round instead of
five. The chosen one is redrawn as vector geometry, and that is what ships.

## Activation Triggers
- "logo concepts", "brand identity", "VisID", "biz ID", "brand exercise", "we need a mark"
- A client asks for logo directions to choose between, or for a brand spec sheet
- The user types `/brand-identity`

## Prerequisites
| Thing | Where | If missing |
|---|---|---|
| Imagery profile with a `mark` slot | `demos/<brand>/imagery.profile.json` | Create it — see `demos/README-imagery.md` |
| `BANANA_STAND_TOKEN` | env | Concepts can't render; author the directions anyway and render later |

---

## 1. Intake — get the client's own words

Take metaphors, vocabulary and anti-references **verbatim**. A client saying *"I think black holes,
quasars, event horizons — I don't really want moons"* has handed you both the brief and the
avoid-list. Don't paraphrase it into house language.

Capture:
- What the brand is and who it serves
- The client's metaphors, in their words
- **Anti-references** — what they explicitly don't want
- **Hard constraints** — "clean and simple", one-colour reproduction, minimum size, and any
  manufacturing limit (a mark that gets stamped, moulded or embroidered has geometry limits, and
  finding that out *after* the client picks one costs a whole round)

## 2. Author the directions — stage one

Write `output/04-concept-directions.json`. Per direction:

```jsonc
{ "id": "aperture", "name": "Aperture",
  "thesis": "One line the client can say yes or no to.",
  "metaphor": "camera aperture / iris opening",
  "formLanguage": "rotational blades, hexagonal negative centre, hard edges",
  "geometricPrimitive": "straight-edged polygon",
  "symmetry": "6-fold rotational",
  "spaceStrategy": "negative-space centre carries the meaning",
  "massVsLine": "mass",
  "whyDistinct": "Only direction built from straight edges; meaning lives in the hole.",
  "reproduction": "Strong at 24px. One-colour safe. Mouldable — single closed outline.",
  "subject": "A six-bladed camera aperture forming a hexagonal opening at the centre" }
```

**The divergence rule.** Every pair must differ on at least **two** of five axes: `metaphor`,
`geometricPrimitive`, `symmetry`, `spaceStrategy`, `massVsLine`. Changing a seed or an adjective is a
*variation*; changing the metaphor is a *direction*. Enforced:

```bash
npm run concepts:check -- --brand=<brand>
npm run concepts:check -- --brand=<brand> --emit=demos/<brand>/output/04-concept-brief.json
```

It exits non-zero on near-duplicates or incomplete directions. **Don't work around it** — if it
fires, one of your ideas isn't an idea yet.

Three to five directions. Fewer isn't a choice; more dilutes the conversation.

## 3. Render — stage two

```bash
npm run images:generate -- --brand=<brand> --spec=demos/<brand>/output/04-concept-brief.json
```

The `mark` slot triggers **concept mode**: the profile's `conceptPrefix` and `conceptAvoid` replace
the house imagery prefix, banning lettering, glows, gradients and light backgrounds. Marks record
`"role": "concept"` in the manifest.

**Pin the background in `conceptPrefix`.** If it isn't specified, some renders come back light and
some dark, and a side-by-side comparison silently becomes unfair — the sheet's only job is fair
comparison.

## 4. The Concept Sheet

`Logo-Concepts.html` — every direction with its thesis, spec, and an honest reproduction note.
Include what's *wrong* with each render. If the model gave four bars where the brief said three, say
so; if the spokes will close up at small size, say that. The sheet is for deciding, and a client
deciding on flattery decides badly.

State plainly on the page that these are concepts, not logos.

## 5. Selection

Present them and ask for **one direction**, not a ranking. What you want back is *"that one, go."*
Record why the others were retired — a later round should not re-propose a shape already rejected.

## 6. Redraw as vector — the step that matters

The chosen direction is **rebuilt as SVG geometry**. Not traced, not upscaled: drawn, with real
construction. Compute the coordinates rather than eyeballing path data.

Then check it at 120 / 64 / 48 / 32 / 24px, in one colour, reversed, and on the accent. **Render it
and look.** A mark that dissolves at 32px is not finished, whatever it looks like at 500px.

Use `currentColor` so the mark inherits its context instead of hard-coding a fill.

**The refinement pass** (from the IntualityAI Forward Signal mark):
- **Generate the geometry from a formula, in a script committed with the brand** (e.g.
  `demos/<brand>/source/<mark>.js`), so the mark can be re-cut exactly for the asset kit.
- **Smooth curves, not polylines** — fit sampled points with Catmull-Rom → cubic Béziers; straight
  segments show at hero sizes.
- **Filled outlines with intentional stroke weight** — taper where the idea changes (thin where
  uncertain, heavier as it resolves); merge joins with a tapered transition, never a pill butting into a
  line; leave a deliberate gap before a terminal point.
- **Kill lumps at joins** — where strokes overlap as they converge, damp them to alignment before
  they thicken, and check the one-colour version: it exposes every bulge.
- **Cut a small-size version** — heavier strokes for nav, favicon and app icon; the display cut
  dissolves at 24px.
- **Solid colours per element, no gradients across hues** — amber→cyan goes muddy through grey.

## 7. The VisID — the deliverable

`Brand-Identity.html`, one page, in this order:

1. Primary lockup · 2. The mark at size · 3. Wordmark & clear space · 4. Colour ·
5. Type · 6. Reproduction · 7. Misuse · 8. Provenance

**The wordmark is live type in a real licensed face.** Never a generated image — generated
letterforms are subtly wrong and cannot be re-set. **Confirm the licence before specifying a face.**
Naming a font the client can't license stalls the work at the worst moment; if the licensed face
isn't available, show a named free stand-in and say which is which.

**Colour.** Give hex, RGB, CMYK and a contrast reading per surface. **Leave Pantone empty unless a
human supplies it.** Pantone is a licensed system; a number must come from a physical guide or the
client's own swatch cards. A guessed Pantone is worse than none — a factory will run it. Note when an
accent sits outside CMYK gamut, and check that accents used for text actually clear 4.5:1.

**Type.** Break weights out per platform — web, macOS, Android, fallback.

**Provenance.** Show the concept render beside the shipped vector and say which is which.

## 8. Verify

```bash
npm run ada:scan          # inlining one SVG many times duplicates its title id — see below
npm run structure:scan    # both pages declared in the manifest and wired into the hub
npm run build
```

**Inline the same SVG repeatedly and you duplicate its `id`.** Give exactly one instance the
accessible name; mark the rest `aria-hidden="true" focusable="false"` and strip their `<title>`.
They are decorative repeats, so this is correct semantics as well as a passing gate.

Then open both pages and look at them, at 375 / 900 / 1440.

## Failure Modes
| Situation | Response |
|---|---|
| Divergence check fires | Rewrite a direction. Never lower the bar |
| Client picks two | Ask for one. Two directions is two identities |
| Mark dies at small size | Redraw with fewer, heavier elements — don't just scale it up |
| Client asks for the render as the logo | Explain it's raster and approximate; deliver the vector |
| No manufacturing spec | Design to "clean and simple" and record that no spec was given |
| Client wants Pantone | Ask for their guide reading or swatch cards. Never estimate one |
| Font needs a licence | Flag before it's specified, and offer a named free stand-in |

## Outputs
- `output/04-concept-directions.json` — the authored directions
- `output/04-concept-brief.json` — the render brief
- `assets/images/concept-*.webp` — concept renders (`role: "concept"`)
- `assets/mark-<id>.svg` — the vector mark
- `Logo-Concepts.html` and `Brand-Identity.html`, wired into the hub and manifest

## Success Criteria
- Every pair of directions differs on 2+ structural axes, verified by the gate
- Nothing generated is presented as the identity
- The mark is vector and legible at 24px, checked by eye
- Pantone is either human-supplied or empty — never invented
- Font licences resolved or flagged
- `ada:scan` and `structure:scan` pass
