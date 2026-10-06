# Markup Review Skill

## Identity
- **Name:** `markup-review`
- **Display name:** Markup Review
- **Description:** Apply client review feedback from [Markup.io](https://markup.io) to an existing playbook page. The user provides the page URL, numbered screenshots from the Markup location, and a list of comments keyed by `[commentNumber]`; the skill maps each comment to the right page section and makes the change **inside the brand's design system** — reusing existing tokens and components, never inventing copy or new styles. When a screenshot represents a *desired* design, it is recreated with the design system, not pixel-copied. Runs with minimal prompting, pausing only when a comment is genuinely ambiguous.
- **Version:** 1.0.0

## Activation Triggers
This skill activates when:
- The user provides a playbook page URL **plus** Markup screenshots and/or a list of `[commentNumber]` comments.
- The user says "apply these markup changes", "markup review", "client markup", "work the review", "address the comments", or similar.
- The user uploads numbered screenshots (filenames containing a number, e.g. `3.png`, `home-3.png`, `markup-3.png`) alongside a page URL.

## What the user gives you (the input contract)
1. **The playbook page URL.** A preview or local URL whose path maps to a repo file —
   e.g. `https://yd-playbook-pr-6.surge.sh/demos/yohdev/output/Homepage.html` →
   `demos/yohdev/output/Homepage.html`. The path after the host is the repo path.
2. **Numbered screenshots from the Markup location.** The number in the filename **is the
   comment number** it illustrates (`3.png`, `comment-3.png`, `financing-3.png` all → comment `[3]`).
   These show *where* on the page a comment points and *what it currently looks like*.
3. **(Optional) A desired-design screenshot.** A mockup of what the user wants a section to
   become. **Recreate the intent using the design system** (tokens, components, spacing) —
   do not hotlink the image or hand-copy off-system colors/fonts. The user will say when a
   screenshot is a target rather than a "current state" reference.
4. **A comment list keyed by `[commentNumber]`.** Each entry is the instruction for that
   number. This is the source of truth for *what* to change; the screenshots are the source
   of truth for *where*.

You make the change. Then you log it, verify it, and deliver.

## Operating Principle — minimal prompting
Work the whole list autonomously. Resolve the URL to a file, map every `[commentNumber]` to a
page section, apply each change within the design system, and deliver — **without gating each
comment on sign-off.** The only reason to pause is a comment you genuinely cannot action
safely (see **Clarifying-Question Triggers**). Batch those into a single `AskUserQuestion`,
apply the answers, and finish.

## Process Overview

### Phase 01 — Intake & Mapping
- Resolve the page URL to its repo file; identify the brand (`demos/<brand>/`).
- Read the target file and the brand's design layer (sibling pages / style guide) so edits
  reuse the exact tokens and components. If the brand has a `site.manifest.json`, read it too:
  a comment that implies a new component/pattern is folded into the Style Guide page, and any
  comment implying a new page must gain a manifest entry + hub/nav wiring — never a stray artifact.
- Parse the comment list into a table; match each `[commentNumber]` to its screenshot(s) by
  the number in the filename, and to the **specific HTML section** it targets.
- Produce a **change plan** (`output/markup-review-<page>-<round>.md`) — one row per comment:
  number · location (section/selector) · requested change · planned approach · open question?
- Does **not** block — proceeds to apply. Genuine ambiguities become clarifying questions.
- Details: **[phases/phase-01-intake-and-mapping.md](phases/phase-01-intake-and-mapping.md)**

### Phase 02 — Apply Changes
- For each comment, locate the section and make the edit using existing tokens/components.
- Desired-design screenshots are rebuilt to intent on the design system (new variants only
  from existing tokens — no new colors, fonts, or radii).
- Preserve all playbook conventions already in the page (nested-dropdown nav, scroll-to-top,
  no YohDev/playbook back-links, local images / no hotlinks).
- Details: **[phases/phase-02-apply-changes.md](phases/phase-02-apply-changes.md)**

### Phase 03 — Verify & Deliver
- Render the changed page (and any reference comparison) to confirm each comment is resolved.
- Run `npm run build`; update the change log with a ✅/⏳ status per comment.
- Commit on the working branch with a message that lists the comment numbers addressed; push.
  If a PR exists, the preview regenerates for the next review round.
- Details: **[phases/phase-03-verify-and-deliver.md](phases/phase-03-verify-and-deliver.md)**

## Key Rules
- **Design system is law.** Reuse the brand's established tokens, header/footer, and
  components verbatim. New component variants are allowed **only** when built from existing
  tokens (no new colors, fonts, radii, shadows). When in doubt, copy a pattern that already
  exists on a sibling page. See `docs/BUILD-SYSTEM.md` and the brand's `style-guide.html`.
- **No invented copy.** Use the exact wording the comment provides. If a comment asks for new
  copy but doesn't supply it, ask — never write marketing claims on the client's behalf.
- **Comments are *what*, screenshots are *where*.** Map by the number in the filename. If a
  number has no matching comment (or vice-versa), flag it rather than guessing.
- **Desired-design screenshots = intent, not pixels.** Rebuild with the design system; do not
  embed the screenshot or reproduce off-system styling.
- **Real images, hosted locally.** Any new image is downloaded into the brand's
  `assets/`/`assets/images/` and referenced locally — never hotlinked. If a comment calls for an
  asset that doesn't exist and the brand has `demos/<brand>/imagery.profile.json`, generate it via
  the **`brand-imagery`** skill — it downloads and commits locally, so the rule holds. A labeled,
  noted placeholder is the fallback.
- **Preserve existing conventions.** Don't regress the nav, scroll-to-top, breadcrumb, or
  de-branding work already in the page.
- **Traceability.** Every change maps back to a `[commentNumber]` in the change log.
- **Scope discipline.** Touch only what the comments call for. Note any out-of-scope issue you
  spot; don't silently fix it.

## URL → file resolution
Take the path after the host and resolve it against the repo root:
```
https://yd-playbook-pr-6.surge.sh/demos/yohdev/output/Homepage.html
                                  └────────────── repo path ──────────────┘
→  demos/yohdev/output/Homepage.html
```
- A bare page name ("the homepage") → find it under the active brand's `output/`.
- If the brand is ambiguous (multiple brands), ask which brand once, up front.

## Screenshot naming convention
- The **integer in the filename is the comment number**: `3.png`, `home-3.png`,
  `markup-3.png`, `3-current.png` → comment `[3]`.
- A screenshot the user flags as a **target/desired** design is the thing to *build*; a
  screenshot of the **current** state is context for *locating* the comment.
- Multiple screenshots may share a number (wide + detail shots of the same comment).
- If filenames carry no number, ask the user to confirm the mapping before editing.

## Clarifying-Question Triggers (the only reasons to pause)
Batch into one `AskUserQuestion`; otherwise proceed:
- A comment requests **new copy** that isn't provided (never invent claims).
- A comment is **genuinely ambiguous** about which element or what outcome (and the screenshot
  doesn't disambiguate).
- A comment can only be satisfied by **breaking a design-system rule** (new color/font/radius,
  off-system layout) — surface the conflict and propose the closest on-system option.
- A `[commentNumber]` has **no matching screenshot/section**, or a numbered screenshot has **no
  matching comment**.
- A comment depends on a **page/asset that doesn't exist yet** in the playbook.

Do **not** ask about: which file a URL maps to (resolve it), missing alt text (derive from
context), or obvious typo/spacing/label fixes the comment clearly describes.

## Change Log (deliverable artifact)
Write/append `demos/<brand>/output/markup-review-<page>-<round>.md`:

| # | Location (section / selector) | Comment (verbatim) | Change made | Status |
|---|---|---|---|---|
| 3 | `.hero h1` | "Headline should say 'Whole-Home Power'" | Updated H1 copy | ✅ |
| 5 | warranty band | "Make the badge bigger" | n/a — needs new asset | ⏳ asked |

This log is how the user reconciles the Markup thread with the commit.

## Quality Checklist
Before delivery:
- [ ] Every `[commentNumber]` is accounted for (done, or flagged with a reason)
- [ ] All edits use existing design-system tokens/components; no new colors/fonts/radii
- [ ] No invented copy; new copy came verbatim from the comment
- [ ] New images localized; zero external hotlinks
- [ ] Nav, scroll-to-top, breadcrumb, and de-branding conventions still intact
- [ ] Page rendered and each change visually confirmed
- [ ] `npm run build` passes
- [ ] **Structural consistency (self-heal)** — run the `structure-fix` loop until `npm run structure:scan` is clean; no orphan page or broken link introduced (no stray artifact spun off). It auto-repairs and only pauses to confirm before deleting/overwriting a page
- [ ] Change log updated; commit message lists the comment numbers addressed

## Failure Modes
- **URL won't resolve to a file:** ask the user to confirm the brand/page.
- **Screenshot ↔ comment mismatch:** flag the orphan number; don't guess.
- **Comment conflicts with the design system:** propose the closest on-system option as a
  clarifying question; don't introduce off-system styling.
- **Desired design needs an asset that doesn't exist:** generate it via `brand-imagery` if the brand has an imagery profile and the slot doesn't need legible text; otherwise use a labeled placeholder and note it.
