# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this repo is

A self-contained, **brand-agnostic website playbook** — a build system for producing consistent,
high-quality pages on any client's design system. Brands live under `demos/<brand>/`; the repo root
builds into a portal that lists every brand. Output is static HTML that reuses each brand's existing
tokens, header/footer, and components.

It is designed to be **forked per client**: a fork keeps its own brand work under `demos/` and pulls
skill/tooling improvements from this upstream repo. See [UPSTREAM.md](UPSTREAM.md).

## The build system — read this first

The skills and automation here form one build system organized by **source** (Legacy / Scratch) and
**scope** (single page / pillar cluster). The full map — which skill to use when, how clusters work,
and the unattended routine — is in **[docs/BUILD-SYSTEM.md](docs/BUILD-SYSTEM.md)**. Start there.

| Need | Use |
|---|---|
| Walk a (non-technical) user through a build | `guided-build` (front door; routes to the rest) |
| Rebuild one live page into a brand's design system | `legacy-page-rebuild` |
| Build one new page from a brief | `net-new-page` |
| Convert a Figma design into token-driven HTML | `figma-page-build` |
| Build a cluster (hub/pillar + spokes), one per run | `pillar-cluster` |
| Stand up a full brand site (homepage + audience-split brand books) | `yohdev-website-refresh` |
| Turn a TripOS pilot form response into a personalized, printable trip brochure | `trip-brochure` |
| Apply client Markup.io review feedback to a built page | `markup-review` |
| Fire a legacy cluster rebuild unattended | `automation/legacy-cluster-routine/` |
| Fill a build's image placeholders with real, on-brand generated images | `brand-imagery` |
| Run a branding exercise — logo concept directions → chosen mark → one-page VisID | `brand-identity` |
| Put two or three logo directions in front of a client on their own path | `logo-selection` |
| Turn an approved logo into a client-ready asset package (web / print / mobile) | `logo-asset-kit` |
| Scan/fix output pages for ADA / WCAG AA (incl. red-on-dark) | `ada-compliance-scan` |
| Auto-fix a build that drifted off-structure (stray page, misplaced components, broken links) | `structure-fix` |
| Check a build looks designed, not generated | `npm run craft:scan` + [docs/DESIGN-CRAFT.md](docs/DESIGN-CRAFT.md) |

## Conventions (apply to all builds)

- **No invented copy** — content comes from the brief or the legacy source; preserve messaging hierarchy.
- **Real images, hosted locally** — never hotlink. Pull from the source, or generate on-brand via
  `brand-imagery` (Banana Stand); either way the bytes are downloaded and committed under
  `assets/images/`, so no page ever points at a remote host. A labeled, noted placeholder is the
  fallback. Per-brand imagery direction lives in `demos/<brand>/imagery.profile.json` — schema in
  `demos/README-imagery.md`.
- **Verify against the source, don't assert** — a build from a design is checked against a PNG render
  of that design (`npm run figma:diff`), not declared correct. Same principle as the ADA gate: the
  claim has to be produced by a check, not by the builder's confidence.
- **Reuse the design system verbatim** — match the brand's tokens/header/footer/components; new
  component variants only from existing tokens (no new colors/fonts/radii).
- **Provenance** — page builders write `output/01-…` (content/extraction) and `output/02-…` (component map).
- **One cluster per run** — `pillar-cluster` and the headless routine build exactly one cluster at a time.
- **No `demo.json` / no style guide** from the page builders — those belong to `yohdev-website-refresh`.
- **A logo round lives on its own path** — `logo-selection` writes only `demos/<brand>/logo-selection*`
  and adds a single entry card to the brand hub. It never writes into `output/`, never edits
  `site.manifest.json`, and never overwrites a brand's `index.html` (an earlier version of this flow
  did exactly that and replaced a client's live proposal). See the `logo-selection` skill.
- **`brand-identity` vs `logo-selection`** — these overlap and are converging; pick by where the
  output goes. `brand-identity` runs the exercise into the brand's own `output/` pages
  (`Logo-Concepts.html`, `Brand-Identity.html`) and drives generation through
  `scripts/generate-images.mjs` + `demos/<brand>/imagery.profile.json`, with `npm run concepts:check`
  as its divergence gate. `logo-selection` is the client-facing *choosing* surface: a hub plus one
  review page and one printable sheet per direction, entirely under `logo-selection*` so a live
  proposal is never disturbed, with its own gate (`npm run logos:check`) and its own generator
  (`scripts/logo-selection/designs.js`). **Two Banana Stand clients and two divergence gates now
  exist in this repo** — that duplication arrived when `brand-identity` landed on `main`, and
  consolidating `logo-selection` onto `generate-images.mjs` and `concept-directions.mjs` is
  outstanding work, not a settled design.
- **Designer bar** — every page builder reads **[docs/DESIGN-CRAFT.md](docs/DESIGN-CRAFT.md)** before
  designing: one concept sourced from the client, every device traced to it (no default kit of numbered
  eyebrows, accent words, pills, marquees, icon grids), the client's words with no em dashes, extreme type
  contrast, a different module per section, real curated imagery, and motion in one register on one
  curve. `npm run craft:scan` checks the mechanical parts; its errors block the pre-commit hook for staged
  pages and its warnings must be fixed or answered in provenance.
- **ADA / WCAG AA** — output pages must pass `npm run ada:scan` (esp. contrast; no red text on dark).
  A pre-commit hook (`.githooks/pre-commit`) blocks committing any staged page that still fails;
  run `npm run install-hook` once to activate it. See the `ada-compliance-scan` skill.
- **Structural consistency (self-heals)** — stay on the beaten trail. Before building, read the brand's
  `demos/<brand>/site.manifest.json` (if present) and the artifacts it names; **components/pattern work
  goes in the Style Guide page, never a new standalone artifact**, and a genuinely new page must gain a
  manifest entry and be wired into the hub + nav (+ the Sitemap page if one exists). After building, run the
  **`structure-fix`** loop: it scans, auto-repairs any drift, and re-scans until clean — only pausing to
  confirm before deleting/overwriting a page. Never hand a non-technical user a raw scanner error; fix it.
  The pre-commit hook + CI `structure` job are the backstops (they auto-apply the safe fixes too). Schema:
  `demos/README-manifest.md`.

## Build, preview, deploy

```bash
npm install                      # one time
npm run build && npm run serve   # build the portal, preview at http://localhost:8000
```

- **Branch → PR → preview → merge.** Opening a PR builds an isolated Surge preview; nothing live
  changes until a named approver merges to `main` (which deploys to GitHub Pages).
- Full deployment details: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## Fork model (client-specific vs. portable)

This is the upstream, brand-agnostic playbook. Keep **client-specific detail in a fork** (everything
under `demos/`, client handoff data, client output pages); keep **portable concepts upstream** (skill
logic, phases, the ADA scanner, CI, shared tokens). Don't commit a client's brand assets, copy, or
private stack details to this repo. See [UPSTREAM.md](UPSTREAM.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Pointers

- System overview: [docs/BUILD-SYSTEM.md](docs/BUILD-SYSTEM.md)
- Marketing Engine (planned evolution — planning docs only, no skills built yet): [docs/marketing-engine/README.md](docs/marketing-engine/README.md)
- Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Fork & upstream workflow: [UPSTREAM.md](UPSTREAM.md)
- Operator guide / portal: [README.md](README.md)
- Skills: `.claude/skills/<skill>/SKILL.md` (+ `phases/`)
