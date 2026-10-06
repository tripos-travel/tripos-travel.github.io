# Website Build System

How the skills and automation in this repo fit together to build brand pages — from scratch or
from a legacy site, one page or a whole cluster, interactively or unattended.

Every skill reuses the target brand's existing design system verbatim (tokens, header/footer,
components) and never invents copy. Client-specific detail lives in a fork's `demos/` folder; the
portable skills, scanner, and pipeline live upstream (see [../UPSTREAM.md](../UPSTREAM.md)).

## The two axes

Every build is defined by a **source** and a **scope**:

|  | **Single page** | **Pillar cluster** (hub + spokes) |
|---|---|---|
| **From Legacy** (rebuild a live URL) | `legacy-page-rebuild` | `pillar-cluster` (legacy mode) |
| **From Scratch** (build from a brief) | `net-new-page` | `pillar-cluster` (scratch mode) |
| **From Figma** (implement a design) | `figma-page-build` | one run per designed board |

A separate skill, `yohdev-website-refresh`, builds a **full brand site** from structured brand intake
data (see `.claude/skills/yohdev-website-refresh/reference/intake-contract.md`) and is the heaviest
workflow — a responsive homepage plus an audience-split set of **brand books** (Brand Basics
one-pager · Brand Playbook · Design System) fronted by a routing hub. Used when standing up a brand,
not for individual pages. It runs headlessly, phase to phase, gated only by the deterministic
accessibility/structure scans below — no human-approval pause.

## The front door — `guided-build`

The simple entry point for non-technical users. It asks two questions — **source**
(Legacy/Scratch/Figma) then **scope** (page/cluster) — runs a short plain-language intake, offers a final
"add custom context / uploads" step, then routes to the right builder above. It fills blanks with
flagged defaults so a first-time user reaches the same quality an expert would.
See `.claude/skills/guided-build/SKILL.md`.

## The builders

| Skill | Builds | Notes |
|---|---|---|
| `legacy-page-rebuild` | One page from a live URL | Verbatim content + localized images; reuses the brand's design system. |
| `net-new-page` | One page from a brief | Interactive 4-question intake; image slots start as placeholders, optionally generated via `brand-imagery`. |
| `figma-page-build` | One page from a Figma design | Capture once via MCP → tokens + node-mapped inventory → confirm-and-lock → build → visual diff against the design render. |
| `pillar-cluster` | **One** cluster (hub + spokes) | Parallel page build + nested-nav wiring. Legacy or scratch mode. One cluster per run. |
| `yohdev-website-refresh` | A full brand site | 6-phase intake → responsive homepage + audience-split brand books (Basics/Playbook/Design System) + hub + `demo.json`. |

All builders reuse the brand's existing design system verbatim (tokens, header/footer, components)
and never invent copy. Page skills produce `01-…`/`02-…` provenance artifacts and **no** `demo.json`.

## Building from a design — `figma-page-build`

The third source. A design comp is a different kind of input from a URL or a brief: the content is
authoritative, the *values* are only semi-authoritative, and the connector that reads it is metered.
The skill is shaped around those three facts.

**Capture once, iterate offline.** Figma MCP call budget is tied to the operator's seat — a View seat
exhausts within a handful of calls, mid-run. So Phase 01 makes every Figma call it will ever make and
writes the raw responses to `demos/<brand>/output/00-figma-capture/`, including a **call ledger**.
Phases 02 and 03 never touch Figma. `scripts/figma-tokens.js` normalizes the capture offline, as
often as you like, for free — and reads the ledger, so a capture truncated by a rate limit is
reported loudly instead of silently becoming a thin token set.

**Provenance decides who reviews what.** Every token carries where it came from:

| Confidence | Source | Needs a human? |
|---|---|---|
| `bound` | A real Figma variable | No |
| `verified` | Inferred, then corroborated by pixel coverage in a design render | No |
| `inferred` | Scraped from design context — nobody named it or blessed it | **Yes** |

Files that bind no variables are the common case, not a failure — they just push more tokens into
`inferred`, where `tokens.lock.json` (the confirm-and-lock gate) resolves them. `npm run figma:check`
fails the build until every inferred token is confirmed or dropped.

**Renders do real work.** A full-page PNG export of the design is nominally optional and changes the
output more than anything else. `scripts/figma-tokens.js` decodes it (zero-dependency, on node's
zlib) and measures how much of the page each color actually covers — so an inferred color the render
proves is promoted to `verified` and leaves the review queue, and a color covering >1% of the design
that appears nowhere in the capture is flagged as something the connector missed. It is also the only
thing the finished build can be checked *against*.

**The build is verified, not asserted.** `scripts/figma-diff.js` compares a screenshot of the built
page against the design render — height ratio, per-band color profile down the page, and palette
diff — and writes a side-by-side PNG with a green/red drift strip between the two. Deliberately not a
pixel differ: two honest renders of the same page never match pixel-for-pixel, and a pixel differ
would fail a page that is visually right. It answers "which part of the page drifted, and how", which
is the question a builder can act on.

```bash
npm run figma:tokens -- --capture=<dir>     # normalize capture → tokens.json + tokens.css
npm run figma:lock   -- --capture=<dir>     # write the confirm-and-lock skeleton
npm run figma:check  -- --capture=<dir>     # gate: unconfirmed tokens / truncated capture
npm run figma:shot   -- <page> 1440 <out>   # screenshot the build
npm run figma:diff   -- --design=<png> --build=<png> --check
```

Inside a full brand-site refresh the same pipeline runs, but tokens feed *into* the design system
rather than becoming it — see `yohdev-website-refresh/phases/phase-02a-figma-integration.md`.

## Clusters (hub + spokes)

A **cluster** = one hub/pillar page plus its spoke pages, built and deployed together as one unit,
sharing one brand layer and one assets folder, linked by a nested nav (hub in the main nav; spokes
in a submenu; current page marked). A typical cluster looks like `services.html` (hub) ↔
`services-residential.html` / `services-commercial.html` (spokes).

`pillar-cluster` builds the pages in parallel and wires the nav across the new **and** existing
sibling pages, repointing stale links. **MVP guardrail: exactly one cluster per run; spokes are
explicit (no crawl/auto-discovery).**

## Unattended builds — `automation/legacy-cluster-routine/`

The headless equivalent of "guided-build → pillar-cluster (legacy)". A routine (webhook / scheduled
job / manual dispatch) injects a JSON payload — `brand`, `clusterName`, `hub`, `spokes[]` — and the
agent rebuilds that one cluster autonomously and opens a reviewable PR. It never asks questions;
it applies documented defaults and records assumptions in the PR body + provenance artifacts.

- `SYSTEM_PROMPT.md` — the injected system prompt.
- `payload.schema.json` — the one-cluster-per-run contract.
- `README.md` — how to fire it (the live dispatch workflow is documented but deferred for MVP).

The PR it opens plugs into the existing preview pipeline — see [DEPLOYMENT.md](DEPLOYMENT.md).

## Accessibility gate — `ada-compliance-scan`

Every built page has to clear **ADA / WCAG 2.1 AA** before it ships. The `ada-compliance-scan` skill
(engine: `scripts/ada-scan.js`, zero-dependency Node) audits all `demos/<brand>/output/*.html` for
color-contrast failures — including the common **red-on-dark** problem (saturated red text on dark
heroes/scrims/bands) — plus structural checks (lang, title, alt text, control names, form labels,
heading order, duplicate ids, disabled zoom).

It is also a **commit gate**: `.githooks/pre-commit` runs the scanner on the output pages staged in a
commit and aborts the commit if any still fail — so a page must pass its own accessibility test before
it can be committed. Activate the hook with `npm run ada:install-hook` (a `SessionStart` hook in
`.claude/settings.json` also sets it automatically each Claude web session).

```bash
npm run ada:scan            # full audit
npm run ada:scan:staged     # what the pre-commit hook runs
```

In CI, the `accessibility` job in `.github/workflows/deploy.yml` runs a full audit on every PR/push,
uploads a self-contained **HTML report as a workflow artifact** (`ada-report`, downloadable from the
run — not committed to the repo), comments a whole-site summary on the PR, and **blocks merge/deploy
on the output pages changed in that PR/push** (three-dot diff). `deploy-main` depends on it.

## Design craft — `docs/DESIGN-CRAFT.md` + `craft-scan`

The third gate answers the question clients ask first: *does this look like a designer made it?*
**[DESIGN-CRAFT.md](DESIGN-CRAFT.md)** is the shared bar every builder reads before designing —
concept first, every device traced to it, the client's words, extreme type contrast, a different module
per section, real curated imagery, motion in one register (Mechanical / Editorial-slow / Kinetic) on one
curve — distilled from the builds clients praised and from the one a client called "AI generated".

- **Engine:** `scripts/craft-scan.js` (zero-dependency, sibling of `ada-scan.js`). ERROR: reveal content
  hidden with no JS gate, animation without a reduced-motion rule, lorem ipsum. WARN: stock copy, em
  dashes, default-only type, generic gradients, emoji icons, card monotony, a static homepage, default
  easing, missing focus styles, placeholder-heavy pages, a drawer left in the tab order, a sticky header
  with no scroll offset.
- **Gate:** `.githooks/pre-commit` runs it on staged output pages; errors block (`CRAFT_SKIP=1` to bypass),
  warnings print and must be fixed or answered in the page's `02-…` provenance.

```bash
npm run craft:scan            # full audit
npm run craft:scan:staged     # what the pre-commit hook runs
```

## Structural consistency — `site.manifest.json` + `structure-scan`

Alongside the accessibility gate is a **structural-consistency gate** that keeps a build on the beaten
trail — it is the guardrail against a builder spawning a stray top-level artifact (the classic failure: a
standalone `Components.html` of card grids) instead of folding the work into the brand's existing canonical
pages, and against broken internal wiring.

- **Source of truth:** an optional per-brand `demos/<brand>/site.manifest.json` declares the canonical
  pages, their roles, and where component/pattern work belongs (the page with role `style-guide`). Absent a
  manifest, the canonical set is inferred from what the brand hub (`index.html`) links to. Full schema:
  **[../demos/README-manifest.md](../demos/README-manifest.md)**.
- **Engine:** `scripts/structure-scan.js` (zero-dependency Node, sibling of `ada-scan.js`) reports
  `orphan-page`, `broken-link`, `missing-page` (ERROR) and `placement` (WARN) findings, and `--fix`
  auto-applies the deterministic, non-destructive repairs.
- **Self-heal:** the **`structure-fix`** skill is the loop that makes drift *just get fixed*: scan →
  auto-fix → resolve residuals with judgment (wire a stray page in, or fold a component gallery into the
  Style Guide) → re-scan until clean. It only pauses for one thing — a plain-language yes/no before it
  **deletes or overwrites** a page. A non-technical operator never sees a raw scanner error.
- **Gate (backstop):** the same `.githooks/pre-commit` runs `--fix`, re-stages the safe repairs, and blocks
  only if a judgment call remains — pointing the user at `structure-fix`. The `structure` job in
  `.github/workflows/deploy.yml` blocks merge/deploy on the pages/hubs/manifests changed in a PR (three-dot
  diff). A pre-existing orphan is *reported* by the full audit but never blocks unrelated work.

```bash
npm run structure:scan            # full audit (every brand)
npm run structure:scan:staged     # what the pre-commit hook runs
npm run structure:fix             # auto-apply the safe fixes (the deterministic subset)
```

**Every builder honors this** via a read-before-build / self-heal-after-build loop:

- **Read before building** — if the brand has a `site.manifest.json`, read it and the artifacts it names;
  place components in the Style Guide; a genuinely new page must gain a manifest entry and be wired into the
  hub + nav (+ the Sitemap page if the brand has one). No manifest → reuse the existing design layer as before.
- **Self-heal after building** — run the `structure-fix` loop (with `npm run ada:scan`) until the scan is
  clean. Drift is repaired automatically; the only interruption is a confirmation before deleting/overwriting
  a page. Don't surface the raw finding to the user — fix it.

## What's next — the Marketing Engine (planned)

The build system stops at the website. A planned evolution — the **Marketing Engine** — documents the
layer *downstream* of the site (lead capture, CRM & campaigns, conversion optimization) and *upstream*
of it (competitive analysis, SEO). It is **planning only today** (capability specs + roadmap, no
skills built yet). Start at [marketing-engine/README.md](marketing-engine/README.md). The first pilot
driving it is client-specific and lives in that client's fork, not upstream.

## Shared conventions (all builders)

- **No invented copy** — content comes from the brief or the legacy source; messaging hierarchy preserved.
- **Generated imagery is never an identity** — `brand-imagery` fills photographic/decorative slots;
  `brand-identity` uses generated marks only as concept exploration, and the chosen direction is
  redrawn as vector geometry before it ships. Wordmarks are always live type in a licensed face.
- **Real images, hosted locally** — never hotlink. Pull them from the source, or generate them
  on-brand with `brand-imagery` (which downloads and commits the bytes, so the rule still holds);
  labeled placeholder as the noted fallback.
- **Reuse the design system verbatim** — new component variants only from existing tokens.
- **Provenance** — page builders emit `output/01-…` (content/extraction) and `output/02-…` (component map).
- **Branch → PR → preview → merge** — nothing live changes until a named approver merges.

## Where things live

```
.claude/skills/
├── guided-build/              # front door (source × scope router)
├── pillar-cluster/            # cluster builder (hub + spokes), legacy or scratch
│   └── phases/                # plan & extract → map → build, wire & deliver
├── legacy-page-rebuild/       # single page from a URL
├── net-new-page/              # single page from a brief
├── figma-page-build/          # single page from a Figma design
│   └── phases/                # capture → tokens & confirm → build, verify & deliver
├── yohdev-website-refresh/    # full brand site (intake contract → homepage + audience-split brand books)
├── ada-compliance-scan/       # ADA / WCAG AA audit + fix (red-on-dark, etc.)
└── structure-fix/             # self-heal loop: fix orphans / broken links / misplaced components
automation/
└── legacy-cluster-routine/    # headless wrapper for pillar-cluster (legacy)
scripts/ada-scan.js            # ADA/WCAG scanner (engine for the skill + hook)
scripts/craft-scan.js          # design-craft scanner: "designed, not generated" (hook + audit)
scripts/structure-scan.js      # structure scanner + --fix (engine for structure-fix + hook)
scripts/figma-tokens.js        # Figma capture → tokens + component inventory (+ confirm-and-lock)
scripts/figma-diff.js          # design render vs built page: band/palette diff + side-by-side PNG
scripts/page-shot.sh           # full-page screenshot of a built page (Playwright, Chrome fallback)
scripts/lib/png.js             # zero-dependency PNG decode/encode shared by both
.githooks/pre-commit           # commit gate: ADA + structure + craft (self-heal safe fixes; block on judgment calls)
shared/system.css              # shared design tokens/components
demos/<brand>/                 # built brands (+ site.manifest.json structure contract)
docs/                          # DEPLOYMENT.md, BUILD-SYSTEM.md (this file)
```
