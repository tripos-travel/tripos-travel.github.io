# Phase 02 — Apply Changes

Goal: action every mapped comment **inside the design system**, leaving a clean diff that maps
one-to-one with the change plan.

## Working rules
- **One comment at a time, smallest correct edit.** Prefer `Edit` against the exact section
  identified in Phase 01. Don't refactor surrounding markup that the comment didn't touch.
- **Reuse, don't reinvent.** Use the brand's existing classes/tokens. If a comment needs a
  pattern the page doesn't have, copy the closest existing component from a sibling page and
  adapt it with existing tokens only — never introduce a new color, font, radius, or shadow.
- **Copy fidelity.** Paste the comment's wording verbatim. Fix only what the comment asks for.
- **Preserve conventions.** Keep the nested-dropdown nav, scroll-to-top script, real
  breadcrumbs, and the absence of YohDev/playbook back-links. Don't regress earlier work.

## Comment types & how to handle them
- **Copy change** ("change headline to X"): edit the text node; keep markup/structure.
- **Style/spacing tweak** ("more padding", "make it red"): adjust via existing tokens
  (`var(--…)`, existing spacing scale). If "make it red" means the brand accent, use the
  token; if it's a genuinely new color, raise it as a conflict (clarifying question).
- **Layout change** ("put the form first", "two columns"): use existing layout patterns
  (the grid/flex utilities already in the page). On mobile, respect the established stacking
  order rules (e.g. an embedded scheduling/booking portal first on mobile).
- **Add/remove/reorder element**: mirror an existing component instance; wire any link to a
  real internal target where one exists, else a noted `#` placeholder.
- **Desired-design screenshot**: rebuild the *intent* with the design system — match layout,
  hierarchy, and component choices, not the screenshot's raw pixels/colors. If it needs an
  image asset, download it locally (no hotlink), generate it via `brand-imagery` when the brand has
  an imagery profile, or use a labeled placeholder and note it.
- **New image**: save into the brand's `assets/`/`assets/images/`, reference locally, carry
  or derive alt text.

## As you go
- Update the change-log row for each comment with the concrete change and a status
  (`✅ done`, `⏳ asked`, `⛔ blocked — reason`).
- If you hit a genuine ambiguity or design-system conflict mid-way, finish the
  unambiguous comments first, then batch the open ones into a single `AskUserQuestion`.

## Do not
- Do not embed or hotlink a desired-design screenshot.
- Do not invent copy, colors, fonts, or radii.
- Do not fix unrelated issues silently — note them for the user instead.
