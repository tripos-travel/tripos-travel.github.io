# Logo Selection Skill

## Identity
- **Name:** `logo-selection`
- **Display name:** Logo Selection (two directions → chosen mark → VisID)
- **Description:** Put a small number of genuinely distinct logo directions in front of a client on their own path, with everything needed to choose one — the mark drawn as vector geometry at the sizes that decide it, six treatments per direction, the name compared across faces, measured colourways, and a printable identity sheet per direction. Optionally renders finished "study" images through Banana Stand. Never touches the brand's existing playbook pages.
- **Version:** 1.0.0

## Why this exists

Two failures kill a logo round, and both are avoidable.

**The first is showing variations and calling them directions.** Ask an image model
for four logo options and it returns four takes on whatever it landed on first. The
client's reaction is on the record in this repo — *"it just looks very similar,
right?"* — and no amount of re-rendering fixes it, because the problem is upstream
of the rendering.

**The second is presenting a mark you cannot then specify.** A generated image has
no known stroke width, no known behaviour at 16 px, and cannot be recoloured. The
moment the client says "that one", the work of turning a picture into an identity
starts from nothing — and every artefact that shows the "chosen" mark is showing a
different shape from the one being specified.

So: **decide the ideas in language, draw them as geometry, and render studies only
to push a direction further.** Difference is designed rather than hoped for, and
everything presented as artwork is the artwork.

## Relationship to `brand-identity`

They overlap, and they are converging. Pick by **where the output goes**:

| | `brand-identity` | `logo-selection` |
|---|---|---|
| Writes to | the brand's `output/` pages | `logo-selection*` only |
| Generation | `scripts/generate-images.mjs` + `imagery.profile.json` | `scripts/logo-selection/designs.js` |
| Divergence gate | `npm run concepts:check` | `npm run logos:check` |
| Shape | the full exercise, concepts → VisID | the client-facing *choosing* surface |

Use `logo-selection` when a brand already has a live playbook or proposal the
client is reading and the logo is one open decision inside it. Use
`brand-identity` when the identity work *is* the deliverable.

**Two Banana Stand clients and two divergence gates now exist in this repo.** That
duplication arrived when `brand-identity` landed on `main`; consolidating this
skill onto `generate-images.mjs` and `concept-directions.mjs` is outstanding work,
not a settled design. Do not add a third.

## Activation Triggers
- "logo directions", "logo selection", "option A and B for the logo", "we need a mark",
  "VisID", "biz ID", "brand identity sheet"
- A brand's playbook or style guide records the logo as an open decision
- A client asks for directions to choose between
- The user types `/logo-selection`

## The hard rule: this lives on its own path

Everything this skill produces is namespaced under `logo-selection*` inside the
brand's demo folder:

```
demos/<brand>/logo-selection.html              the hub — the one page to send
demos/<brand>/logo-selection-<id>.html         one review page per direction
demos/<brand>/logo-selection-visid-<id>.html   one printable sheet per direction
demos/<brand>/logo-selection-assets/           fonts, and any generated studies
```

It writes **no** page inside `output/`, changes **no** `site.manifest.json` entry,
and touches **no** existing asset. The one exception is a single entry card added
to the brand's hub (`index.html`) so the flow is reachable at all — and that is
one card and one heading count, called out in the commit.

This constraint is not stylistic. The predecessor of this flow wrote each option
page straight over `demos/<brand>/index.html`, which is the brand's playbook front
door: running it replaced the proposal the client was already reading. A logo
round is one open decision inside a brand, not a replacement for it.

## 1. Author the directions — in language, before anything is drawn

Write them into `scripts/logo-selection/directions.js`. Per direction: `option`,
`name`, `mark`, `from`, `thesis`, `answersTo`, `metaphor`, `primitive`,
`symmetry`, `space`, `massLine`, `para`, `recommend`, `strength`, `honest[]`.

**Start from what the brand already has.** If the style guide carries logo cards,
those are the directions — rebuilt properly, not replaced. Cite the card in `from`
so the client recognises it, and record what happened to any card you did *not*
carry forward, so a later round does not put it back on the table.

**`answersTo` is a quotation, not a summary.** Take the client's own words from
discovery — a line like *"you've got a little spark again, like a weight gets
lifted"* is both the brief and the test. Each direction has to answer to one.

**`honest[]` needs at least two real costs per direction.** A sheet listing only
strengths is a sheet nobody can decide from, and the gate enforces the minimum.

### The divergence rule

Every pair of directions must differ on at least **two** of five structural axes:
`metaphor`, `primitive`, `symmetry`, `space`, `massLine`. Changing an adjective is
a variation; changing the metaphor is a direction.

```bash
npm run logos:check
```

It exits non-zero on near-duplicates, incomplete directions, a recommendation that
is not a real treatment, or a colourway nobody can read. **Do not work around it.**
If it fires on divergence, one of the ideas is not an idea yet.

Two to three directions. One is not a choice; four dilutes the conversation and is
where "they all look the same" comes from.

## 2. Draw the marks as geometry

In `scripts/logo-selection/marks.js`, as computed coordinates — never hand-typed
path data, and never a trace of a render.

- One `GEO` entry per mark holds the construction numbers; **everything else
  derives from them.** A number stored twice drifts.
- The `viewBox` is computed from the mark's own inked bounds, stroke included, not
  from the construction grid. Otherwise `48px` means two different optical sizes
  for a wide mark and a square one, and the comparison is quietly unfair.
- Size marks **by height** when comparing directions of different aspect.
- Emit `width` *and* `height`. An HTML `height` attribute survives `width:100%`,
  and that one fact shipped twelve cropped logo cards in the predecessor round.
- Use one `color` parameter and no hard-coded fills, so a mark recolours through
  every colourway without a second file.
- **Emit no `id`.** These SVGs are inlined dozens of times per page; an `id` becomes
  a duplicate-id error. Give exactly one instance per page an `aria-label`; every
  other one gets `aria-hidden="true" focusable="false"`.

**Then render the contact sheet and look at it.**

```bash
npm run logos:marks && open scripts/logo-selection/marks-contact-sheet.html
```

Every treatment at 96 / 56 / 40 / 24 / 16 px. This is not a formality — it is where
the real defects surface. In the Solas build it caught a horizon running three
times wider than its own rays, and two contained treatments whose containers were
clipped to half-discs. Neither was visible in the code.

## 3. Six treatments, and the reason for each

`monoline · solid · geometric · bold · roundel · tile` — lightest to heaviest, then
the two contained forms.

Keep the six shapes; **re-derive the reasons per brand.** A moulded product brand
justifies its heavy cut by tool geometry; a solo medical practice justifies it by a
favicon, a social avatar, and one-colour reproduction on a printed superbill. The
reasons are what the client is actually choosing between.

Recommend exactly one, and say why in one clause. The review page **ends** on the
recommendation rather than mentioning it mid-grid.

## 4. Studies through Banana Stand — optional, and never the deliverable

```bash
BANANA_STAND_TOKEN=… npm run logos:designs
```

- **No token is not an error.** Pages fall back to the drawn cut for any study not
  on disk and say so on the card. Say that plainly rather than treating it as a
  failure.
- Every card that shows a study is **labelled** as one, next to cards labelled
  "Drawn". The distinction is the point.
- Prompts name colours **in words, never as hex.** The instance returns a hard 502
  when a `#RRGGBB` is present, and an image model does not hit a hex value anyway.
- Keep the negative clause **short and true of the subject.** `"icon only, no
  tagline"` renders; `"symbol only, no additional text"` 502s. A clause that
  contradicts the subject fails, and beyond that it is arbitrary — re-test the
  specific prompt, not the general idea.
- Hold everything except the treatment phrase constant, so the cards differ by
  treatment alone.
- Check the two lockups per direction **by eye.** Generated lettering is what goes
  wrong.

## 5. Ship the faces with the pages

```bash
npm run logos:fonts
```

A webfont that fails to load does not throw — it renders the fallback. On a page
whose subject *is* a comparison between six display serifs, that silently becomes
six cards of the same face, and the page claims a choice it is not showing. That
shipped once already.

Self-host every face (all OFL), latin subset, deduped **by family name** — not by
query string, or the same family fetched with two weight sets emits overlapping
`@font-face` blocks. Commercial faces are never hosted: show the foundry's own
specimen image and say which is which.

## 6. The review page, in this order

one paragraph → the mark at the sizes that decide it → six treatments → the name
across faces → the brand's own faces → colourways with measured contrast → the
final lockup → what the direction costs → the sheet → one question.

Nothing else. Spec tables belong on the sheet. Little text, heavily visual: the
brief that produced this shape was *"I'm talking little to no text… explain the
brand in one paragraph and then talk about the mark."*

## 7. The VisID sheet

`1` lockup · `2` mark at size · `3` clear space · `4` colour · `5` type ·
`6` reproduction · `7` misuse · `8` provenance.

- **Colour:** hex, RGB, CMYK and a contrast reading per surface, all computed. Mark
  artwork is held to 3:1; anything that is type is held to 4.5:1 — a mark can carry
  a colour that type cannot, and that split is usually the most important rule in
  the palette. Say which values can carry text and which cannot.
- **Pantone: leave it out unless a human supplies it.** It is a licensed system; a
  number must come from a physical guide or the client's swatch cards. A guessed
  Pantone is worse than none, because a printer will run it. Say so on the sheet
  where the column would have been.
- **The wordmark is live type**, never an image and never outlines.
- **Print is a target, not an afterthought.** Letter at a 10 mm margin is ~750 px —
  under the usual 820 px breakpoint, so multi-column blocks collapse and the sheet
  runs to six mostly-empty pages. Restate every grid inside `@media print` rather
  than lowering the breakpoint; 820 is the right number on a phone. Then **measure
  the page count and state the real one** — do not claim "two sides" without
  printing it.
- **Provenance:** say what is drawn, what is generated, what is still open, and what
  is deliberately absent.

## 8. Verify — and look at it

```bash
npm run logos            # gate, then build every page
npm run logos:ada        # every logo-selection page, 0 errors AND 0 warnings
npm run structure:scan
npm run build
```

Then open the hub, both options and both sheets at **390 / 900 / 1440**, print one
sheet to PDF, and check for horizontal overflow (`scrollWidth === clientWidth`).

## Failure Modes
| Situation | Response |
|---|---|
| Divergence gate fires | Rewrite a direction. Never lower the bar |
| Client picks two | Ask for one. Two directions is two identities |
| Client asks for a study as the logo | It is raster and approximate. Deliver the vector |
| Mark dies at small size | Fewer, heavier elements — do not just scale it up |
| A contained treatment is invisible | Its container is the same colour as the card. Give it its own measured pair |
| No Banana Stand token | Build anyway; the drawn cuts carry the page. Say so, do not treat it as an error |
| Client wants Pantone | Ask for a guide reading or swatch cards. Never estimate one |
| Face needs a licence | Flag it before specifying, and offer a named free stand-in |
| Brand has an artist already engaged | Frame this as the launch-safe mark **and** the brief for that artist. It does not close that track |

## Outputs
- `logo-selection.html`, `logo-selection-<id>.html`, `logo-selection-visid-<id>.html`
- `logo-selection-assets/fonts/` — self-hosted OFL faces
- `logo-selection-assets/design-*.webp` — studies, when a token was available
- No change to `output/`, `site.manifest.json` or `demo.json`; one entry card in the brand hub

## Success Criteria
- Every pair of directions differs on 2+ structural axes, asserted by the gate
- Nothing generated is presented as the identity
- Marks are vector, and checked by eye on the contact sheet at every size
- Every colourway's mark clears 3:1 and every wordmark clears 4.5:1, computed
- Pantone is human-supplied or absent — never invented
- `logos:ada` reports 0 errors and 0 warnings; `structure:scan` and `build` pass
- The brand's existing playbook pages are byte-identical apart from one entry card
