# Phase 03: Build, Wire & Deliver

## Purpose
Build the hub and every spoke in parallel, localize images, wire the nested nav across the new + existing pages, validate, and deliver.

## 1. Build pages in parallel
One build unit per page (hub + each spoke), run concurrently:
- **legacy mode:** follow `legacy-page-rebuild` Phase 03 per page — download & localize every image from the Phase 01 inventory into the shared `assets/`/`assets/images/` (verify each is a real image; never hotlink; labeled placeholder only as a noted fallback), then build the HTML using exact Phase 01 copy and the brand layer verbatim.
- **scratch mode:** follow `net-new-page` Phase 03 per page — build from the brief, placeholder every image slot with aspect ratio + description.
- Every page shares **one** brand layer and **one** assets folder. Set a real `<title>` + `<meta name="description">` (derive from on-page copy where unspecified).

### Parallelism mechanics
Use the `Workflow` tool: a pipeline with one item per page through the per-page build stages, then a **single final wiring stage** (stage runs once all pages exist — it needs every filename to build the submenu). If `Workflow` is unavailable, build pages sequentially then wire — identical output.

## 2. Wire the nested navigation (single pass, after all pages exist)
Reuse the brand's existing nested-nav markup/CSS verbatim (a dropdown/submenu such as `.nav__item--has-children` + `.nav__sub`, `focus-within` keyboard support, mobile-expanded variant). Then:
- In the main nav, point the hub link at `<cluster>.html` and add a submenu: "All …" (hub) + each spoke.
- Apply the nav to **all** new cluster pages **and** the existing sibling pages.
- **Repoint** any dead/placeholder links (`href="#"`) and old anchors to the new pages.
- Mark the current page per file with `aria-current="page"` (+ the brand's current-page class).

Mirror the brand's existing nested-nav pattern if it has one; otherwise extend the `.nav` component in `shared/system.css` with a `focus-within` submenu, using existing tokens only.

**Wire the sitemap + manifest too.** If the brand has a Sitemap page (a page with role `sitemap`), add the
new hub + spokes to it in the same pass. If the brand has a `site.manifest.json`, add the new pages to its
`pages[]` so the structure gate recognizes them (an undeclared new page is an orphan).

## 3. Validate before delivery
- [ ] One cluster only; hub + all spokes built
- [ ] All copy sourced (legacy: verbatim; scratch: from brief) — no invention, no new value props
- [ ] Images localized; **zero external hotlinks**
      (`grep -nE '<img[^>]+src="http|url\\([\"']?http'` — scope to `<img>`/`url()`; a bare `src="http` also matches legitimate CDN `<script>` tags);
      placeholders are labeled + noted
- [ ] New component variants use only existing tokens
- [ ] One shared brand layer + one assets folder; tokens/header/footer reused verbatim (diff `<style>` token block vs a sibling)
- [ ] Nested nav wired across new + existing pages; current page marked; stale links repointed; all internal links resolve
- [ ] **Structural consistency (self-heal)** — run the `structure-fix` loop until `npm run structure:scan` is clean: no orphan pages, no broken links; new pages in the Sitemap page + `site.manifest.json`; no component gallery spun off as its own artifact. It auto-repairs drift and only pauses to confirm before deleting/overwriting a page
- [ ] Combined `01-`/`02-` provenance artifacts written (one pair per cluster)
- [ ] **Design craft** — `npm run craft:scan` has no errors, and every warning is fixed or answered in `02-…` (see `docs/DESIGN-CRAFT.md`). Run the **subtraction pass**: every ornament traces to the concept or goes; no two neighboring sections share a module; headlines are the client's words in sentence case with no em dashes; closed drawers are `inert`/`visibility:hidden`; the sticky header has a scroll offset.
      Across a cluster, vary modules between hub and spokes too — a hub that is a grid of spoke cards
      and spokes that are the same template read as generated.
- [ ] Semantic HTML5, WCAG AA, mobile responsive; each page < 500 KB (excluding images)
- [ ] Valid `<title>` + `<meta name="description">` per page; CTAs/phones preserved

## 4. Deliver
Summarize: cluster slug, hub + spoke files built, images localized (count) / placeholders, new variants, nav wired + links repointed, and any flagged assumptions (especially for headless runs).

## Outputs
- `output/<cluster>.html` + `output/<cluster>-<spoke>.html` × N
- Shared `assets/` populated with localized images
- Nested nav wired; combined provenance artifacts

## Delivery Summary Format
```
## Cluster Built: [cluster slug]

**Output:** output/<cluster>.html (hub) + N spokes
**Pages:** [hub + spoke list]
**Images localized:** [N] (placeholders: [N or none])
**New component variants:** [list or none] (existing tokens only)
**Navigation:** nested nav wired across [pages]; [links repointed]
**Assumptions/flags:** [defaults applied — especially headless runs]

**Next steps:**
1. Review localized images / swap any placeholders
2. Preview locally; deploy via push or PR (PR auto-builds a preview)
```
