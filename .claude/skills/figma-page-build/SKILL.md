---
name: figma-page-build
description: Convert a Figma design into clean, token-driven static HTML on the brand's design system. Captures the file once through the Figma MCP connector, normalizes it into design tokens (JSON + CSS variables) and a node-mapped component inventory, confirms the guesses with a human, then builds responsive HTML with real copy and locally-hosted assets — and checks the result against a PNG render of the design before delivering. Use when the user provides a Figma URL or a .fig file and asks to build, convert, implement, or "code this up"; says "turn this design into HTML/CSS" or "Figma to HTML"; asks for design tokens or a CSS variable set extracted from a Figma file; or hands over a design comp (Figma link plus a PNG export) for implementation.
---

# Figma Page Build Skill

## Identity
- **Name:** `figma-page-build`
- **Display name:** Figma Page Build
- **Description:** Convert a Figma design into clean, token-driven static HTML on the brand's design system. Captures the file once through the Figma MCP connector, normalizes it into design tokens (JSON + CSS variables) and a node-mapped component inventory, confirms the guesses with a human, then builds responsive HTML with real copy and locally-hosted assets — and checks the result against a PNG render of the design before delivering.
- **Version:** 1.0.0

## Activation Triggers
This skill activates when:
- User provides a Figma URL (or a `.fig` file) and asks to "build", "convert", "implement", or "code this up"
- User says "turn this design into HTML/CSS" or "Figma to HTML"
- User asks for design tokens or a CSS variable set extracted from a Figma file
- User hands over a design comp — Figma link plus a PNG export — for implementation

It is the third **source** on the build-system axis, alongside `legacy-page-rebuild` (from a live
URL) and `net-new-page` (from a brief): this one builds **from a design**.

## What you need before starting
| Input | Required? | Why |
|---|---|---|
| **Node-specific** Figma URL (`?node-id=…`) | **Yes** | The connector reads a node, not a file. A bare file URL returns the whole document or nothing useful. |
| Authenticated Figma MCP connector | **Yes** | All capture calls go through it. |
| A **Dev or Full** Figma seat | **Effectively yes** | Call budget is tied to seat/plan. A View seat exhausts within a handful of calls, mid-capture. |
| Full-page **PNG render** per breakpoint | Strongly recommended | Ground truth for composition, evidence for inferred colors, and the reference for the visual diff. See below. |
| Exported image assets | When the design uses photography/illustration | Asset **bytes** can not be pulled through the connector. |
| **Menu design + behavior**, desktop and mobile | Yes | Can't be extracted from a still comp. A frame per state is ideal (it's a node, so it flows through the normal pipeline); a written note works. See Phase 02B. |

**Ask for the renders.** They are nominally optional and they change the output quality more than
anything else on this list. Design context tells you a hex exists somewhere in the file; the render
tells you it covers 14% of the page — that is the difference between a stray value in a nested
vector and the band color. The render is also the only thing the finished build can be *checked
against*. Request a full-page PNG at desktop (~1440) and at mobile (~390); one tall shot per
breakpoint beats several cropped sections.

## Operating Principle — capture once, iterate offline
The Figma connector is a **metered, exhaustible resource**. Treat every call as if it costs money.

1. **Phase 01 captures once** and writes every raw response to disk under `00-figma-capture/`.
2. **Phases 02 and 03 never call Figma.** They read the capture. Re-run them as often as you like.

If you find yourself calling a Figma MCP tool outside Phase 01, stop — the answer is already on
disk, or it belongs in a re-capture of specific nodes.

## Process Overview

### Phase 01 — Capture
- Resolves the node-specific URL, authenticates, and pulls: node metadata, design context per node,
  variable definitions, and a screenshot where the seat allows it.
- Writes raw responses verbatim to `demos/<brand>/output/00-figma-capture/`, plus a **call ledger**
  recording every call and its outcome.
- Files the operator's PNG renders into `00-figma-capture/renders/` and the exported assets into
  `00-figma-capture/assets/` with a manifest.
- See `phases/phase-01-figma-capture.md`.

### Phase 02 — Tokens, Confirm & Component Map
- Runs `npm run figma:tokens -- --capture=<dir>` to emit `tokens.json`, `tokens.css`,
  `02-component-inventory.md`, `03-asset-handoff.md`, and `05-copy-report.md`.
- Recovers spacing and the page container from geometry when the comp has no auto-layout.
- Corroborates inferred colors against the renders by pixel coverage; what the render proves is
  promoted to `verified` and needs no human.
- **Blocks** on confirm-and-lock for whatever is left: the operator confirms names and drops noise
  in `tokens.lock.json`. `npm run figma:check` is the gate.
- Maps the component inventory to the brand's existing components.
- See `phases/phase-02-tokens-and-component-map.md`.

### Phase 02B — Behavior Intake
- **Asks for the menu design and behavior** (desktop + mobile) as a required input, alongside the
  node URL, renders and assets. A still comp contains no behavior, so it has to be supplied.
- Sources it in priority order: state frames → designer notes → operator answer → flagged default.
  Every entry records which.
- **Reads the annotation margin** rather than discarding it. The first real file this ran on carried
  17 behavioral notes there ("the numbers count up as a user reaches this section"), and the first
  build shipped without any of them because they'd been filtered as off-canvas noise.
- Writes `behavior.config.json`, `06-design-notes.md`, and `07-design-request.md`.
- See `phases/phase-02b-behavior-intake.md`.

### Phase 03 — Build, Verify & Deliver
- Builds responsive static HTML from the locked tokens and the confirmed component map.
- **Visual diff:** renders the built page in headless Chromium at each breakpoint and compares it
  against the Figma PNG; fixes the drift; repeats.
- Runs `npm run ada:scan` and the `structure-fix` loop until both are clean.
- See `phases/phase-03-build-verify-deliver.md`.

## Key Rules
- **No invented copy** — text comes from the Figma file's text nodes or from
  `00-figma-capture/copy-overrides.json` (a node-id → real-copy map, applied verbatim, which wins
  over the comp). Those are the only two sanctioned sources. Never transcribe copy out of a PNG
  render as the source of truth; a render is for layout and color, not for words.
- **Placeholder copy is built, never disguised** — a comp in review routinely ships lorem ipsum in
  the slots nobody has written yet. The build does not stop for it and does not quietly pass it off
  as real: every unresolved placeholder is listed in `05-copy-report.md` and **marked visibly in
  the page**. Supply an override to clear it. Refusing to build would block layout work while copy
  is still being written, which is the normal state of a design in review.
- **Real images, hosted locally** — assets are exported by hand from Figma into `assets/images/`
  and referenced locally. **Never hotlink a Figma CDN URL** — those expire. A labeled placeholder
  is the only fallback, and every one is listed in `03-asset-handoff.md`.
- **Reuse the design system verbatim** — if the brand already exists under `demos/<brand>/`, its
  established tokens/header/footer win over anything extracted from Figma. Extraction *feeds* a
  design system; it does not get to fork one. Where the two disagree, raise it — a design that
  contradicts the live system is a design question, not a build decision.
- **Confirm before you build** — no final build on unconfirmed inferred tokens. `npm run figma:check`
  must exit 0.
- **Breakpoints are inferred, always** — a frame width is a canvas decision, not a declared
  breakpoint. Confirm them like any other guess.
- **Spacing may be derived rather than extracted** — a comp with no auto-layout declares no padding,
  gap or itemSpacing, so the scale is recovered from the gaps between siblings and the page gutter
  from where content starts. Derived spacing is `inferred` by definition and near-neighbours are
  clustered, because a hand-positioned comp never lands on exact multiples.
- **No horizontal scroll at 360px.** Verify it, don't assume it.
- **No `demo.json`, no style guide** — page skills don't produce portal entries. If the brand has a
  Style Guide page, component/pattern work goes there, not into a new standalone artifact.
- **Structural consistency (self-heal)** — read `demos/<brand>/site.manifest.json` before building;
  after building run the `structure-fix` loop until `npm run structure:scan` is clean. See
  `demos/README-manifest.md`.

## The confidence model
Every token carries its provenance, and provenance decides who has to look at it:

| Confidence | Means | Needs a human? |
|---|---|---|
| `bound` | Read from a real Figma variable — named by the designer | No |
| `verified` | Inferred, then corroborated by pixel coverage in a render | No |
| `inferred` | Scraped from design context; nobody named it or blessed it | **Yes — confirm-and-lock** |

This is why files that don't bind variables aren't a failure case: they just push more tokens into
the `inferred` column, and the renders + the lock file resolve them.

## Failure Modes
- **Bare file URL (no `node-id`):** Ask for a node-specific URL. Don't try to walk the whole document.
- **Figma call limit / seat limit mid-capture:** The ledger records it and the normalizer reports it
  loudly and refuses `--check`. Everything already captured stays on disk. Confirm the seat, then
  re-capture **only the failed nodes**. Never restart a capture from scratch to work around a limit.
- **No variables bound in the file:** Expected, not an error. Tokens come from design context as raw
  values; lean harder on the renders and the lock file.
- **No auto-layout in the file:** Expected on a visual comp. Spacing is derived from sibling geometry
  and the gutter from content's left edge — both `inferred`, both confirmed like anything else.
- **Placeholder copy in the comp:** Build it, mark it, report it. Ask for a `copy-overrides.json`.
- **Asset bytes unavailable:** Expected in a sandboxed environment. Placeholder + hand-off ledger;
  ask the operator to export from Figma.
- **No renders supplied:** Proceed, but say plainly that nothing corroborates the colors and there is
  no reference for the visual diff — then ask for them again.
- **Design contradicts the brand's live design system:** Stop and raise it. Don't silently fork the
  system, and don't silently override the design.
- **Interactive states not in the file:** Hover/focus/disabled rarely exist in a static comp. Ask
  for a state frame (Phase 02B); failing that derive from the brand's existing components and note
  every one derived. Never invent motion silently.

## Quality Checklist
Before delivery:
- [ ] `npm run figma:check` exits 0 — no unconfirmed inferred tokens, capture not truncated
- [ ] Every CSS value in the build traces to a token in `tokens.css` (no stray hardcoded hexes)
- [ ] Component inventory maps each built section to a Figma node ID
- [ ] Copy matches the Figma text nodes or a supplied override exactly — nothing transcribed from a PNG
- [ ] Every unresolved placeholder string is marked in the page and listed in `05-copy-report.md`
- [ ] Provided assets hosted locally; **zero** Figma CDN hotlinks; every missing asset is a labeled placeholder listed in the hand-off
- [ ] Visual diff run at each breakpoint against the supplied render, drift resolved or noted
- [ ] Responsive: no horizontal scroll at 360px; mobile layout matches the mobile render
- [ ] `npm run ada:scan` clean — WCAG 2.1 AA, including red-on-dark contrast
- [ ] `npm run structure:scan` clean
- [ ] Semantic HTML5, correct heading order, valid meta title + description
- [ ] HTML page weight < 500 KB (excluding images)
