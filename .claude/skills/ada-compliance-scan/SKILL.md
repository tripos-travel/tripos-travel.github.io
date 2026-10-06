# ADA Compliance Scan Skill

## Identity
- **Name:** `ada-compliance-scan`
- **Display name:** ADA Compliance Scan
- **Description:** Scan the brand output pages for ADA / WCAG 2.1 AA problems — first and foremost **color contrast**, including the common **red-on-dark** failure (saturated red text on dark heroes, scrims, and bands) — then fix them in place using the brand's existing tokens. The same scanner runs as a **pre-commit gate**, so a page that still fails cannot be committed.
- **Version:** 1.0.0

## Activation Triggers
This skill activates when:
- User says "run the ADA scan", "check accessibility", "scan for WCAG / contrast issues", or types `/ada-compliance-scan`
- User reports a contrast / readability problem ("red on dark is unreadable", "this text fails contrast")
- After a page build, as the accessibility pass before committing/opening a PR
- A commit was blocked by the ADA pre-commit hook and the user wants the findings fixed

## What it checks
The engine is `scripts/ada-scan.js` — a **zero-dependency Node** static analyzer (no browser, no `npm install`). For each page it parses the inline `<style>` blocks + `style=""` attributes, resolves the brand `:root` design tokens, builds a lightweight DOM and CSS cascade, then reports:

- **Color contrast (WCAG 2.1 AA)** — `4.5:1` normal text, `3.0:1` large text (≥24px, or ≥18.66px bold). It resolves each text element's effective foreground and background through the cascade, composites translucent layers, and handles the **dark-overlay / hero pattern** (a `::before` scrim or an absolutely-positioned `*__bg` image layer) so red/dark text over a dark hero is caught. Red text on a dark or image background is always flagged — a good default rule is **saturated red on light, pure white on dark**.
- **Page language** — `<html lang>` present.
- **Document title** — non-empty `<title>`.
- **Image alt text** — every `<img>` has an `alt` attribute.
- **Accessible names** — `<a>` / `<button>` have text, `aria-label`, `title`, or a labeled child.
- **Form labels** — inputs/selects/textareas have a `<label>`, `aria-label`, or `aria-labelledby`.
- **Heading order** — an `<h1>` exists and levels don't skip (warning).
- **Duplicate ids**, **positive tabindex**, and **zoom disabled** in the viewport meta.

Severity: **ERROR** blocks the commit gate; **WARN** is advisory (e.g. heading skips, red-on-dark that still clears the large-text ratio but violates the brand rule).

## How to run it

```bash
npm run ada:scan            # full audit of every demos/<brand>/output/*.html
npm run ada:scan -- demos/yohdev/output/Homepage.html   # a single file / folder
node scripts/ada-scan.js --json   # machine-readable, for tooling
npm run ada:scan:staged     # only the output pages staged for commit (what the hook runs)
node scripts/ada-scan.js --html=report.html   # write a self-contained HTML report
```

Exit code is `0` when there are no ERROR findings, `1` otherwise. `--json` and `--html=<path>`
can be combined with any run; `--html` is written even on a clean/empty run so CI can always
upload it.

## The pre-commit gate (test-before-commit)
The scanner is wired as a tracked git hook at **`.githooks/pre-commit`**. On every commit it runs `ada-scan` against the **output pages staged in that commit**; if any page has a blocking issue the commit is aborted with the findings. So a page must **pass its own ADA test before the commit can happen**.

- Activate it (once per clone / automatically each Claude web session): `npm run ada:install-hook` — sets `core.hooksPath=.githooks`. The repo also ships a `SessionStart` hook in `.claude/settings.json` that does this automatically.
- Scope is **staged output pages only** — you can always commit tooling/docs; the gate engages the moment you stage a built page.
- Emergency bypass (use sparingly, and say so): `ADA_SKIP=1 git commit …` or `git commit --no-verify`.

## The CI gate (`.github/workflows/deploy.yml` → `accessibility` job)
The same scanner runs in CI as the authoritative, unbypassable gate:
- **Full audit → HTML report artifact.** Every run scans all output pages and uploads a
  self-contained `ada-report` artifact (HTML + JSON), downloadable from the Actions run. The report
  is **not committed to the repo** — it lives in the run's artifacts.
- **Blocking gate on changed pages.** The job fails only on the output pages **changed in that PR/push**
  (three-dot diff vs the base), so the pre-existing backlog stays visible (in the report + PR comment)
  without blocking unrelated work. `deploy-main` depends on this job, so a regression can't reach Pages.
- **PR comment + job summary.** A whole-site count is posted to the PR and the run summary, pointing to
  the artifact for detail.

## Operating procedure (when invoked to fix issues)
1. **Audit.** Run `npm run ada:scan` and read the findings grouped by file. Each line gives the rule, the computed ratio, the resolved `fg on bg` colors, and the element selector + a snippet so you can find it fast.
2. **Fix at the source, with existing tokens only.** Resolve every ERROR; treat WARN as a judgment call.
   - **Red-on-dark (a common issue):** switch the text to `var(--white)` (or another light token that clears AA) wherever saturated red sits on a dark hero/scrim/band. Keep saturated red for emphasis **on light surfaces**. Do **not** invent new colors — reuse the brand's tokens (this matches the repo's "reuse the design system verbatim" rule).
   - **Dark text on dark / light text on light:** flip to the correct paired token for that surface.
   - **Borderline grays / brand accents below AA:** nudge to an existing token that clears the threshold; if the only fix would change a brand color, surface it to the user rather than inventing a shade.
   - **Structural issues:** add the missing `lang`, `alt`, label, or accessible name; de-duplicate ids; fix heading order; remove zoom locks.
3. **Re-scan** until the targeted files are clean (`npm run ada:scan -- <files>` → 0 errors).
4. **Commit** — the pre-commit hook re-runs the scan on the staged pages and must pass. If it blocks, fix and retry (don't reach for `--no-verify`).

## Key rules
- **Reuse tokens, never invent color** — fixes use the brand's existing `:root` tokens (no new colors/fonts/radii), consistent with the playbook's design-system rule.
- **No copy or layout changes** — accessibility fixes adjust colors, attributes, and structure, not messaging or design intent.
- **Fix the source page** — edit the `demos/<brand>/output/*.html` file; don't patch around it.
- **The gate is the source of truth** — a page isn't done until `ada-scan` passes it.

## Limitations (be honest about these)
- Static analysis, not a rendered browser: it approximates the cascade (rightmost simple selector + ancestor matching, standard specificity) and can't see JS-applied styles.
- It can't sample the actual pixels behind text set over a **photo**; it uses the dark-overlay heuristic for scrims/image layers and otherwise assumes text inherits down to the page's base surface (white). Where a background genuinely can't be resolved it errs toward **not** reporting, to keep the gate free of phantom findings. Spot-check hero/photo sections by eye.

## Related
- Build system map: `docs/BUILD-SYSTEM.md`
- Deployment / preview pipeline: `docs/DEPLOYMENT.md`
- Scanner: `scripts/ada-scan.js` · Hook: `.githooks/pre-commit`
