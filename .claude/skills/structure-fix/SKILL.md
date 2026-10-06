# Structure Fix Skill

## Identity
- **Name:** `structure-fix`
- **Display name:** Structure Fix (self-heal)
- **Description:** When a build colors outside the lines — a stray page nobody links to, a component/pattern gallery spun off as its own file, a broken internal link, a page missing from the site map — this skill **just fixes it**. It runs the structure scanner, auto-applies the safe repairs, folds misplaced work back into the right canonical page, wires new pages into the nav, and re-scans until the site is clean. It pauses for exactly one thing: a plain-language yes/no before it deletes or overwrites an existing page.
- **Version:** 1.0.0

## Why this exists
Non-technical operators shouldn't be handed a wall of scanner errors or a blocked commit. The build system should **self-heal**: if something drifts off the playbook structure, fix it automatically instead of asking the user to understand and resolve a formality. This skill is that loop. Every builder runs it as its verify step, and it can be invoked on demand.

## Activation Triggers
- A builder's verify step finishes a page/cluster/site build (`legacy-page-rebuild`, `net-new-page`, `pillar-cluster`, `yohdev-website-refresh`, `markup-review`).
- `npm run structure:scan` reports anything, or the pre-commit hook blocked on a structural issue.
- The user says "fix the structure", "clean this up", "wire it in", "it made a stray page", or types `/structure-fix`.

## Operating Principle — fix silently, confirm only before destroying
Apply every safe fix without asking. The **only** reason to pause is an action that would **delete or overwrite an existing page** (e.g. folding a standalone gallery into the Style Guide and removing the original). Batch any such confirmations into a single, plain-language `AskUserQuestion` — no scanner jargon. If nothing destructive is needed, run start to finish and just report what you tidied.

Never invent copy and never introduce off-system styling — moving content preserves it verbatim and reuses the brand's existing tokens/components (same rules as every builder).

## The loop

### 1. Scan
Run the scanner as JSON and read the findings. Scope to the pages you just built when invoked from a builder; full audit otherwise.
```bash
node scripts/structure-scan.js --json                 # full audit
node scripts/structure-scan.js --json <files...>      # just-built pages
```

### 2. Auto-apply the safe fixes
```bash
npm run structure:fix          # deterministic, non-destructive (e.g. repoint an unambiguous broken link)
```
This clears what can be proven safe and reports the rest as residual.

### 3. Resolve each residual with the canonical fix
Re-scan, then for each remaining finding apply the fix that keeps the site on the beaten trail:

| Finding | Fix |
|---|---|
| `broken-link` (ambiguous / no obvious target) | Repoint to the page the context clearly intends; if the target genuinely doesn't exist, remove the dead link (don't invent a page). |
| `orphan-page` that is a real content page | **Wire it in** — add it to the hub + nav (+ the brand's Sitemap page if it has one) and add a `pages[]` entry to `site.manifest.json` with the right `role`. Prefer wiring in over deleting. |
| `orphan-page` + `placement` (a component / pattern gallery) | **Fold it into the Style Guide** (`components.home`): move each pattern into the Design System page, reusing existing tokens/components; update anything that pointed at the stray file; then remove the standalone file. **Destructive → confirm once first.** |
| `missing-page` (manifest names a file that's gone) | If it was renamed, repoint the manifest entry to the new file. If it was truly removed, drop the entry (confirm if that could lose content). |

### 4. Re-scan and repeat
Re-run the scan after each round. Stop when it's clean, or after ~3 rounds with no further progress (then summarize the residuals plainly and hand back — don't loop forever).

### 5. Report in plain language
Tell the user what you tidied, without jargon. Good: *"The components page was floating on its own, so I folded those card styles into your Style Guide and removed the stray copy. Everything links up now."* Not: *"Resolved 1 orphan-page ERROR and 1 placement WARN."*

## Confirmation prompt (the only pause)
When a fix would delete or overwrite an existing page, ask once, batched, plain-language, e.g.:
> "Your components ended up in a separate page (`Components.html`) that isn't linked anywhere. I'd like to move those styles into your Style Guide (where components belong) and delete the leftover page. OK to do that, or keep the separate page and just link it into the menu instead?"

Offer the non-destructive alternative (wire it in) as the other option, so "no" still leaves a clean site.

## Guardrails
- **Confirm before delete/overwrite** — everything else is automatic.
- **No invented copy, no off-system styling** — moving content preserves wording and reuses existing tokens/components.
- **Design system is law** — component/pattern work lives in the Style Guide (`components.home`), never a new standalone artifact.
- **Don't loop forever** — cap at ~3 no-progress rounds, then summarize and hand back.
- **Leave a clean scan** — success = `npm run structure:scan` reports zero ERRORs.

## Relationship to the gate
- `scripts/structure-scan.js` is the detector (and the `--fix` mechanical fixer).
- The pre-commit hook and CI `structure` job are the backstops; they run `--fix` and re-stage the safe repairs, and only block when a judgment call remains — pointing the user here.
- This skill is the judgment layer that makes "colors outside the lines → just fixed" true. Schema + rules: `demos/README-manifest.md`, `docs/BUILD-SYSTEM.md`.
