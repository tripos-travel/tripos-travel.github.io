# Pillar Cluster Skill

## Identity
- **Name:** `pillar-cluster`
- **Display name:** Pillar Cluster
- **Description:** Build **one** pillar/cluster — a hub (pillar) page plus its spoke pages — in a single run, with the pages built in parallel and wired together by a nested navigation. Works in two modes: **legacy** (each page from a live URL, reusing `legacy-page-rebuild` mechanics) and **scratch** (each page from a brief, reusing `net-new-page` mechanics). Generic vocabulary throughout — pillar / cluster / hub / spoke — not tied to any one content domain.
- **Version:** 1.0.0

## Activation Triggers
This skill activates when:
- User asks to build a "cluster", "pillar cluster", "hub and spokes", or "a hub page plus its spoke pages"
- `guided-build` routes here (source × cluster scope)
- The headless legacy-cluster routine invokes it with an injected payload
- User provides one hub + its spoke URLs (or briefs) to build together as a set

## Operating Principle — one cluster, parallel build, wire once
A **cluster** is one hub/pillar page plus N spoke pages, built and deployed together as one atomic unit sharing a single brand layer and assets folder. Build the pages **in parallel**, then wire them together in a single pass. Run autonomously like `legacy-page-rebuild` — produce provenance artifacts and keep going; pause only for a genuine, un-defaultable build decision (batch those into one `AskUserQuestion`). When invoked headlessly, never ask — apply documented defaults and record assumptions.

## MVP Guardrails (hard limits)
- **Exactly one cluster per run.** If asked to build multiple clusters (or given multiple hubs), build the first and stop with: *"Pillar Cluster builds one cluster per run — please run the others as separate builds."* Never fan out across clusters in a single invocation.
- **Explicit inputs only.** Spokes are supplied as explicit URLs (legacy) or explicit briefs (scratch). **No crawling / auto-discovery** of spokes at MVP.
- **Generic naming.** Use pillar/cluster/hub/spoke. Do not hard-code domain-specific names (e.g. "service area").

## Inputs
- **Mode:** `legacy` or `scratch`.
- **Brand / design system:** which existing brand layer to match (auto-detected from `demos/*/` or named).
- **Hub:** one URL (legacy) or one brief (scratch).
- **Spokes:** a list of URLs (legacy) or briefs (scratch).
- **Cluster name:** short slug used for filenames + provenance artifacts (e.g. `products`). Derive from the hub if not given.

## Process Overview

### Phase 01 — Plan & Extract  (`phases/phase-01-cluster-plan.md`)
Validate the one-cluster guardrail, resolve the brand layer, settle filenames (hub = `<cluster>.html`, spokes = `<cluster>-<spoke>.html`), then gather content for **every** page in parallel:
- **legacy:** run `legacy-page-rebuild` Phase 01 (WebFetch + raw HTML for images) per URL.
- **scratch:** run `net-new-page` Phase 01 (context intake) per brief.
Produce **one combined** `output/01-<cluster>-content-extraction.md` covering hub + spokes (do not clobber prior artifacts).

### Phase 02 — Map Components  (`phases/phase-02-cluster-map.md`)
Map each page's sections to the brand's existing components (reuse verbatim; new variants only from existing tokens). Produce **one combined** `output/02-<cluster>-component-map.md`. Note the planned nested-nav structure (hub + each spoke).

### Phase 03 — Build, Wire & Deliver  (`phases/phase-03-cluster-build.md`)
Build the hub and every spoke **in parallel**, download/localize images, then wire the nested nav across the new pages **and** existing sibling pages and repoint stale links. Validate the checklist and deliver.

## Parallel Build
Build the pages concurrently — one unit of work per page (hub + each spoke). Use the `Workflow` tool: a pipeline with one item per page through the per-page build stages, then a single final wiring stage that runs once all pages exist (it needs every filename to build the submenu). Wall-clock is the slowest single page plus one wiring pass, not the sum. If the `Workflow` tool isn't available, fall back to building pages sequentially, then wire — same output.

## Nested Navigation (the wiring)
Reuse the brand's existing nested-nav pattern verbatim (a dropdown/submenu such as `.nav__item--has-children` + `.nav__sub`, with `focus-within` keyboard support and a mobile-expanded variant; current page marked with `aria-current="page"`). For this cluster:
- Hub link sits in the main nav; a submenu lists the hub ("All …") and every spoke.
- Apply the nav across the new pages **and** existing sibling pages; repoint any dead/placeholder links (`href="#"`) to the new pages.
- Mark the current page per file.

If the brand's design system already defines a nested-nav/dropdown pattern, mirror its exact markup/CSS. Otherwise extend the base `.nav` component in `shared/system.css` with a `focus-within` submenu, using existing tokens only. A typical cluster looks like `services.html` (hub) ↔ `services-residential.html` / `services-commercial.html` (spokes).

## Key Rules
- **One cluster per run** (see guardrails).
- **No invented copy** (legacy: verbatim from source; scratch: from the brief) — preserve messaging hierarchy.
- **Pull real images, host locally** — never hotlink; generate on-brand via `brand-imagery` when the
  brand has an imagery profile; labeled placeholder as the noted fallback. Generation dedupes across
  the cluster for free — the same subject at the same size returns the identical cached image, so it
  lands once in the shared `assets/images/` and every page that needs it points at that one file.
- **Match the existing design system** — reuse tokens/header/footer/components verbatim; new variants use existing tokens only.
- **One brand layer + one assets folder** shared across the whole cluster.
- **No `demo.json`, no style guide** (consistent with `legacy-page-rebuild`) — but when the brand already has
  a style guide, respect it: component/pattern work goes there, not into a new artifact.
- **Structural consistency (self-heal)** — if the brand has a `site.manifest.json`, read it before building;
  after building, run the `structure-fix` loop so `npm run structure:scan` ends clean, with the new hub +
  spokes declared in the manifest and wired into the hub + nav (+ Sitemap page). It auto-repairs drift and
  only pauses to confirm before deleting/overwriting a page. See `demos/README-manifest.md`.
- **Combined provenance** — one `01-`/`02-` artifact pair per cluster, not per page.

## Outputs
- `output/<cluster>.html` (hub) + `output/<cluster>-<spoke>.html` × N, alongside existing brand pages.
- Shared `assets/` (+ `assets/images/` for localized images).
- `output/01-<cluster>-content-extraction.md` and `output/02-<cluster>-component-map.md`.
- Nested nav wired across new + existing sibling pages; current page marked.

## Reuse (don't reinvent)
- `legacy-page-rebuild/phases/*` — per-page extract/map/build + image localization + nav-wiring conventions (legacy mode).
- `net-new-page/phases/*` — per-page intake/blueprint/build (scratch mode).
- `shared/system.css` `.nav` component (plus the brand's existing nested-nav pattern, if any) — the nav markup/CSS to mirror.
- `shared/system.css` + the brand's inline token block.

## Failure Modes
- **Multiple clusters requested:** build one, stop with the one-cluster message.
- **A spoke URL unreachable (legacy):** note the gap; build the rest; ask the user to paste that page's content (or skip that spoke and flag it).
- **Hub vs spoke ambiguous:** if not specified, treat the broadest/index page as the hub; confirm only if genuinely unclear.
- **No existing brand layer:** fall back to `shared/system.css` defaults and note `brand.css` missing (per `legacy-page-rebuild`).
