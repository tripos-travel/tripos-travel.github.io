# Phase 03 — Build, Verify & Deliver

## Purpose
Build the page from locked tokens and the confirmed component map — then prove it matches the
design instead of assuming it does.

**No Figma calls in this phase either.**

## 1. Gate before building

```bash
npm run figma:check -- --capture=demos/<brand>/output/00-figma-capture
```

Exit 0 or stop. Building on unconfirmed tokens produces a page that looks plausible and encodes
guesses — the most expensive kind of wrong, because nobody catches it until a client does.

## 2. Build

- Link `tokens.css`, or inline it in a `<style>` block if the brand's sibling pages are
  self-contained. **Match what the brand already does** — don't restructure existing pages.
- Every value in the page comes from a token. If you're typing a hex into the markup, either it
  belongs in `tokens.css` or you're about to invent a color.
- Copy comes from the Figma text nodes captured in Phase 01 — verbatim, hierarchy preserved. Not
  from the PNG render. If the text didn't capture, ask for it; don't transcribe it from an image
  and don't write your own.
- Images: reference the exported assets locally from `assets/images/`. Every missing asset gets a
  labeled placeholder — never a blank box, never a Figma CDN URL (those expire):

```html
<!-- IMAGE: Hero background — Figma node 12:412; export pending, see 03-asset-handoff.md -->
<div class="img-placeholder" data-label="Hero background"><span>Hero background</span></div>
```

- Responsive: build to the **confirmed** breakpoints, not the raw frame widths. Mobile layout should
  match the mobile render's stacking order, not just be a narrower desktop.
- Interaction states (hover/focus/disabled) rarely exist in a static comp. Derive them from the
  brand's existing components and **note each one you derived** — a reviewer needs to know which
  states were designed and which were inferred.

## 3. Visual diff — the verification step

Tokens being right does not make the page right. Composition — section order, proportion, which
band is which color — lives in the layout. The design render is the only ground truth for it.

```bash
# Screenshot the build at each breakpoint
npm run figma:shot -- demos/<brand>/output/index.html 1440 /tmp/build-desktop.png
npm run figma:shot -- demos/<brand>/output/index.html 390  /tmp/build-mobile.png

# Compare against the design renders captured in Phase 01
npm run figma:diff -- \
  --design=demos/<brand>/output/00-figma-capture/renders/desktop.png \
  --build=/tmp/build-desktop.png --label=desktop \
  --out=demos/<brand>/output/04-visual-diff --check
```

Add `--trim` when the screenshot came from the Chrome fallback (see `scripts/page-shot.sh`).

### Reading the result
It reports four things, and each maps to a different kind of mistake:

| Signal | What it means |
|---|---|
| **Height ratio** | Build much taller/shorter than the design — usually a missing section, or spacing applied at the wrong scale |
| **Drifting bands** + position down the page | *Where* it diverges. "41% Δ364 design `#ffffff` → build `#123049`" means the band 41% down is navy in the build and white in the design |
| **In the design but not the build** | A color you failed to use — often a band tint that got dropped |
| **In the build but not the design** | A color you invented, or the wrong shade of a real one |

It also writes `diff-<label>.png`: design on the left, build on the right, and a strip between them
that runs green where the bands agree and red where they don't. **Look at it.** The numbers say
something drifted at 41%; the picture says why.

This is intentionally not a pixel differ. Two honest renders of the same page never match
pixel-for-pixel, and a pixel differ would report a visually-correct page as 100% failed. Chase the
flagged bands, not a perfect score.

Iterate: fix, re-shoot, re-diff. When `--check` passes at both breakpoints, the composition is right.

## 4. Accessibility

```bash
npm run ada:scan
```

Must pass WCAG 2.1 AA. The recurring failure this repo cares about is **red-on-dark** — a saturated
red used as text over a dark hero or scrim. A design comp does this often, because in Figma it's a
color choice and nobody ran a contrast check. Fix it with the brand's tokens (white on dark), and
if the fix visibly departs from the comp, say so in delivery. **Accessibility wins over fidelity** —
but tell the operator where the two disagreed rather than silently diverging.

## 5. Structure

```bash
npm run structure:scan
```

Run the `structure-fix` loop until clean: any new page gets a `site.manifest.json` entry and is
wired into the hub, the nav, and the Sitemap page if the brand has one. Component/pattern work goes
in the Style Guide page, never a new standalone artifact. Only pause to confirm before deleting or
overwriting a page — never surface a raw scanner error to a non-technical operator.

## 6. Deliver

The page plus its provenance trail:

```
demos/<brand>/output/
  index.html                    # the build
  tokens.css                    # tokens it's built on
  tokens.json                   # full token model with provenance
  00-figma-capture/             # raw capture + lock file
  02-component-inventory.md     # node ID → component mapping
  03-asset-handoff.md           # assets provided / outstanding
  04-visual-diff/diff-*.png     # design vs build, per breakpoint
  assets/images/                # locally-hosted assets
```

Tell the operator, briefly:
- what was **inferred and confirmed** vs. read from bound variables
- which assets are still **outstanding** (they're blocking real fidelity)
- any place the build **departs from the comp**, and why — accessibility fixes especially
- any place the design **contradicted the brand's live design system**
- remaining visual drift you chose not to chase, and why

Then branch → PR → preview → merge, per `docs/DEPLOYMENT.md`. Nothing goes live until a named
approver merges.

## Exit criteria
- `npm run figma:check`, `npm run ada:scan`, `npm run structure:scan` all clean; `npm run craft:scan`
  has no errors. The design is authoritative: a craft *warning* on a choice the comp made is answered
  "per design" in provenance, not "fixed" — but the plumbing (reveal gate, reduced motion, drawer
  `inert`, scroll offset) is always yours to get right
- `npm run figma:diff --check` passes at every supplied breakpoint
- No horizontal scroll at 360px
- Zero external hotlinks; every placeholder labeled and listed
- Provenance artifacts written; departures from the comp reported
