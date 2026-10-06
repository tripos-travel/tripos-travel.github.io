# Phase 03 — Verify & Deliver

Goal: prove each comment is resolved, keep the build green, and hand back a traceable delivery
that lines up with the Markup thread.

## Steps

1. **Render & confirm.**
   - Render the changed page (headless Chromium) and visually confirm each `[commentNumber]`
     is satisfied. For a desired-design comment, compare the rebuilt section against the
     target screenshot for intent (layout/hierarchy), not pixel identity.
   - Spot-check the relevant breakpoint when a comment touched layout (e.g. mobile stacking).

2. **Validate.**
   - Confirm no off-system tokens crept in (no new hex colors/fonts/radii); links resolve;
     images are local (no hotlinks).
   - Run `npm run build` — it must pass.

3. **Finalize the change log.**
   - Every comment row has a final status. Anything `⏳/⛔` carries a one-line reason and, if
     asked, the question posed.

4. **Commit & push.**
   - Commit on the working branch. The message names the page and the comment numbers
     addressed, e.g.:
     `Homepage: apply markup review r1 — comments [1][3][4][7]`
   - Push with `-u origin <branch>` (retry on network error). If a PR exists, the preview
     rebuilds for the next review round; don't open a new PR unless asked.

5. **Report back.**
   - Summarize per comment: number → what changed (or why it's open). Link the updated
     preview if available. List any out-of-scope issues you noticed but didn't touch.

## Definition of done
- Quality checklist in `SKILL.md` fully satisfied.
- Change log committed; commit message lists the comment numbers.
- Open items (if any) clearly surfaced for the user, not silently dropped.
