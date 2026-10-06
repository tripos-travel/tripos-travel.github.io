# Phase 01: Plan & Extract

## Purpose
Lock the cluster scope, resolve the brand layer and filenames, then gather content for **every** page (hub + spokes) — in parallel — into one combined extraction artifact.

## 1. Enforce the one-cluster guardrail
- Confirm the input describes **exactly one** cluster: one hub + its spokes.
- If multiple clusters (or multiple hubs) are present, build only the first and stop with:
  *"Pillar Cluster builds one cluster per run — please run the others as separate builds."*
- Confirm spokes are **explicit** (URLs in legacy mode, briefs in scratch mode). Do **not** crawl or auto-discover spokes.

## 2. Resolve the brand layer
Follow `legacy-page-rebuild` → "Brand Layer Detection & Reuse":
- Find the brand's existing pages (e.g. `demos/<brand>/output/`); open one and reuse its design-token + component block verbatim.
- Self-contained inline system → keep new pages self-contained (don't bolt on `shared/system.css`).
- If no brand layer exists → link `shared/system.css`, note `brand.css` missing.

**Read the brand's structure contract (stay on the beaten trail).** If `demos/<brand>/site.manifest.json`
exists, read it and the artifacts it names. The new hub + spokes must be added to its `pages[]` and wired
into the hub + nav (and the brand's Sitemap page, if it has one). **Component/pattern work belongs in the
Style Guide page (`components.home`), never a new standalone artifact** — this skill still does not *produce*
a style guide, but when one exists it respects it. No manifest → proceed as today. Schema: `demos/README-manifest.md`.

## 3. Settle the cluster slug + filenames
- **Cluster slug:** short, from the hub (e.g. `services`). 
- **Hub file:** `<cluster>.html`.
- **Spoke files:** `<cluster>-<spoke>.html` (e.g. `services-residential.html`), consistent with existing siblings.
- Record the hub↔spoke map for the nav-wiring stage.

## 4. Extract content for every page (parallel)
One unit of work per page:
- **legacy mode:** run `legacy-page-rebuild` Phase 01 for each URL — WebFetch for structured content (headings, copy, CTAs, nav, footer) **and** a raw-HTML fetch to harvest real image URLs (`<img src>`, `srcset`, `og:image`, CSS backgrounds). Resolve relative paths against the page origin.
- **scratch mode:** run `net-new-page` Phase 01 (context intake) for each brief; capture only real, provided content (no invention).

## 5. Write the combined extraction artifact
Produce a single `output/01-<cluster>-content-extraction.md` covering the hub and every spoke (clearly sectioned per page), including the harvested image-URL inventory. Suffix by cluster slug so prior artifacts are never clobbered.

## Outputs
- `output/01-<cluster>-content-extraction.md` (hub + all spokes, with image inventory)
- Resolved brand layer, cluster slug, and hub↔spoke filename map (carried into Phase 02/03)

## Does not block
Proceed to Phase 02. Collect any genuine, un-defaultable build decisions as clarifying questions (batched). When invoked headlessly, never ask — default and record the assumption in the artifact.
