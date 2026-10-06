# YohDev Website Refresh Skill

## Identity
- **Name:** `yohdev-website-refresh`
- **Display name:** YohDev Website Refresh
- **Description:** Turn structured brand intake data into a deployable client playbook — strategy doc, high-fidelity home page mock, and a block-theme style guide — automatically, phase by phase.
- **Version:** 0.1.0

## Activation Triggers
This skill activates when:
- An `intake/answers.json` file (matching the `BrandIntakeAnswers` contract — see
  `reference/intake-contract.md`) exists in the workspace
- User mentions "Discovery Brief" or "client kickoff"
- User explicitly says "run the YohDev playbook" or "start Phase 01"

Runs headlessly end-to-end: phases advance automatically as each writes its output, gated only by
the deterministic checks noted below (`npm run ada:scan`, `npm run structure:scan`) — there is no
human-approval pause between phases. See `reference/intake-contract.md` for the input contract this
replaced the old "unzip a Sales Handoff folder" flow with.

## Process Overview

### Phase 01 — Intake
- Reads `intake/answers.json` (see `reference/intake-contract.md`)
- Cross-checks it against the 10 canonical questions; documents anything the contract doesn't cover
  as an explicit assumption (see the contract doc's coverage table — e.g. there's no field for the
  primary CTA/desired visitor action)
- Writes `output/01-intake-summary.md`
- Advances automatically once the summary is written

### Phase 02 — Research
- Crawls current website
- Fetches competitor screenshots
- Creates visual/copy inventory
- Writes `output/02-research.md` + screenshots
- Advances automatically once the research doc + screenshots are written

### Phase 03 — System
- Proposes design system tokens
- Creates palette, type scale, spacing
- Writes `output/03-system-tokens.md`
- Drafts initial Style Guide at 60% fidelity
- Tokens are locked automatically once documented — later phases build only from these locked tokens

### Phase 04 — Home Page
- Builds high-fidelity, mobile-responsive Homepage.html with a right-side hamburger fly-out nav
- Uses real copy from audience + pillars
- Writes `output/Homepage.html`
- Advances automatically once the page matches Phase 01 decisions and uses only locked tokens

### Phase 05 — Design System (Style Guide)
- Completes the Design System (`Style-Guide.html`) — "For designers & developers"
- Documents all tokens + component patterns; responsive
- Generates theme.json for WordPress
- Writes `output/Style-Guide.html` + `output/theme.json`
- **Hard gate:** `npm run ada:scan` and `npm run craft:scan` must have no errors before advancing to
  Phase 06 — deterministic automated checks, not human approvals, and they do not get skipped

### Phase 06 — Package (Brand Books)
- Produces the audience-split brand books: **Brand Basics** (`Brand-Basics.html`, marketing one-pager,
  "For marketing & owners"), **Brand Playbook** (`Playbook.html`, "For brand & stakeholders"), and the
  **Brand Books** hub (`Brand-Books.html`) that routes to them + the Design System
- Assembles deployable folder; archives the intake snapshot in `/brief/`
- Writes README with deploy instructions
- **Hard gate:** `npm run ada:scan`, `npm run craft:scan` (no errors; warnings answered) and
  `npm run structure:scan` (via the `structure-fix` self-heal loop) must all be clean before the package ships
- Ships final package

## The 10 Canonical Questions
Kept here for reference (other skills, e.g. `guided-build`, point at this list) — but Phase 01 no
longer *asks* these interactively. Most are pre-answered by the intake contract; see
`reference/intake-contract.md` for the field-by-field coverage table and the gaps (notably: no field
captures the primary desired visitor action).

1. What's the single most important thing the home page must communicate?
2. Who is the primary person this page must convert? (One persona, not three.)
3. What's the one action you want them to take?
4. What tone must this absolutely hit — and what tone must it absolutely avoid?
5. Are there sites you want us to look at as positive references? Negative references?
6. What's locked (logo, colors, copy, platform) and what's open?
7. What's your timeline, and what's driving it?
8. Who has sign-off authority, and who else is in the room at reviews?
9. How will you know this worked? (One measurable outcome.)
10. What would make you cancel this project mid-flight?

## Design Craft — the designer bar (read `docs/DESIGN-CRAFT.md` before Phase 02)
The standard is a page a client can't tell was generated. It is distilled from the builds clients
praised (Element 47, Omni Mold & Die, Wilson & Walker, IntualityAI) — and from Wilson & Walker v1,
which a client called "AI generated" until it was redesigned by subtraction.
- **Concept first** — one idea from the client's own story, trade, words or product (Phase 02), written
  as a rationale table: *device → where it comes from*. A device with no row doesn't ship.
- **No kit by default** — numbered eyebrows, an accent word in every heading, pills, marquees, patterns,
  icon rows, three-card grids, centered badge heroes, indigo/violet gradients, emoji. Each must be earned
  by the concept, and then used sparingly.
- **The client's words** — sentence case, periods, **no em dashes**, no stock phrasing, hyper-specific
  nouns, never invented proof (a labeled open item instead).
- **Type does the work** — role discipline (display / reading / label), extreme scale contrast (display
  ≈ 6× body), tracking and optical width as tokens, a display face with a point of view.
- **Color with conviction** — neutrals named after the client's materials, one accent with AA-safe
  companions and a published contrast matrix, scarcity (one dark panel), one signature finish at most.
- **Every section a different module**; hairlines over shadows; asymmetric splits; bottom-anchored heroes;
  no accidental gaps; a designed mobile pass.
- **Real imagery, curated by position**; one treatment; no generic SVG illustration — if there are no
  photos, visualize what the product does.
- **Motion in a register** (Mechanical / Editorial-slow / Kinetic) chosen in Phase 03, on one or two
  easing tokens, hidden states gated behind a before-paint `.js`/`.motion` class, reduced motion honored.
- Dark mode only when it matches the brand. Body text ≥ 16px. Placeholder > bad attempt.

## Failure Modes
- **Intake malformed or missing:** `run-skill.js` fails fast with the specific missing/invalid
  top-level fields (see `reference/intake-contract.md`). This is an upstream contract violation —
  Phase 01 does not pause to ask a human to patch gaps.
- **Logo raster-only:** Flag, request SVG, mark as deploy blocker
- **No photography:** Use labeled placeholders, add to stubs list
- **Current site is good:** Note in Phase 02, refine don't teardown
- **Conflicting guidance:** Surface explicitly in Phase 01
- **Multiple variants requested:** Push back, one direction executed well

## Not in Scope
- Multi-page sites (home page + style guide only)
- Copywriting beyond home page
- Logo/brand design
- Deployment (produces deployable package only)
- Live CMS integration (static HTML + theme.json)