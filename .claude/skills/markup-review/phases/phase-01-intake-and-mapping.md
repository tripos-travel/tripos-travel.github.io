# Phase 01 — Intake & Mapping

Goal: turn the user's URL + screenshots + comment list into an unambiguous, traceable
**change plan** before touching any markup.

## Steps

1. **Resolve the page.**
   - Take the path after the host in the page URL and resolve it to a repo file
     (`…/demos/yohdev/output/Homepage.html` → `demos/yohdev/output/Homepage.html`).
   - Identify the brand from the path (`demos/<brand>/`). If a bare page name was given and
     more than one brand could match, ask once which brand.
   - `Read` the target file in full.

2. **Load the design layer (so edits stay on-system).**
   - Open a sibling page in the same `output/` folder and/or the brand's `style-guide.html`
     to confirm the exact tokens, component classes, and patterns in use.
   - Skim `docs/BUILD-SYSTEM.md` and the project `CLAUDE.md` conventions if unfamiliar.

3. **Ingest the screenshots.**
   - For each uploaded image, extract the **integer in the filename** → that is its
     `[commentNumber]`. Record `number → file(s)`.
   - Note which screenshots are **current-state context** vs. a **desired-design target**
     (the user flags targets; a target is something to *build*, not just locate).
   - Read each screenshot to understand the visual location and the current rendering.

4. **Parse the comment list.**
   - Split into entries keyed by `[commentNumber]`, capturing the instruction **verbatim**.
   - Cross-check coverage: every comment should have a screenshot, and every numbered
     screenshot should have a comment. Record orphans on either side.

5. **Map each comment to a section.**
   - For each `[commentNumber]`, locate the precise HTML target in the file — a section id,
     a component block, a specific selector/string. Use the screenshot to disambiguate when
     copy alone is unclear.

6. **Write the change plan** → `demos/<brand>/output/markup-review-<page>-<round>.md`
   (`<round>` = `r1`, `r2`, … so successive review passes don't clobber each other). One row
   per comment: number · location · verbatim comment · planned approach · open-question flag.

## Output of this phase
- A change-plan file committed as provenance.
- A clear list of any clarifying questions (orphans, ambiguities, copy gaps, design-system
  conflicts) to batch into one `AskUserQuestion` — or none, in which case proceed straight to
  Phase 02.

## Do not
- Do not start editing before every comment is mapped (or explicitly flagged).
- Do not guess a mapping for an orphan number — flag it.
