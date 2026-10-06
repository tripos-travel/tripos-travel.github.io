# Phase 03: Build, Wire & Deliver

## Purpose
Build a complete HTML file per URL using the component map and extracted content. Every piece of copy comes from Phase 01. Every image is a **real asset downloaded from the source and hosted locally** (placeholder only as a noted fallback). For multi-page sets, wire the pages together and repoint existing sibling links.

## Inputs
- `output/01-<pageset>-content-extraction.md` (content + image-URL inventory)
- `output/02-<pageset>-component-map.md`

## Process

### 1. Determine Output Path & Brand Layer
Find where the brand already lives and write alongside it:
- **Existing sibling pages** (e.g. `demos/<brand>/output/`, `brands/<slug>/`): write the new file(s) into the same folder, using the same `assets/` directory.
- Identify the brand layer:
  - **Self-contained inline system** (sibling pages inline tokens/components in `<style>` and do not link `shared/system.css`): replicate that exact token + component set verbatim in each new page. Do **not** add `system.css` or restructure existing pages.
  - **Separate `brand.css`**: link it.
  - **None**: link `shared/system.css`, note `brand.css` is missing, proceed with defaults.
- **Read the brand's structure contract (stay on the beaten trail).** If `demos/<brand>/site.manifest.json`
  exists, read it and the artifacts it names. The rebuilt page(s) must be declared in its `pages[]` and wired
  into the hub + nav (+ the brand's Sitemap page if it has one). **Component/pattern work belongs in the
  Style Guide page (`components.home`), never a new standalone artifact.** No manifest → proceed as today.
  Schema: `demos/README-manifest.md`.

### 2. Download & Localize Images (default)
Before building, pull every image from the Phase 01 inventory:
```
mkdir -p <output>/assets/images
# for each source URL → curl into assets/images/<descriptive-name.ext>, then verify with `file`
```
- Verify each download is a real image (not an HTML error page); check dimensions/type.
- Reference locally: `<img src="assets/images/...">` or `background:url('assets/images/...')`.
- Carry source alt text; derive concise alt from context where missing (no invented claims).
- Reuse an existing local asset (e.g. the brand logo) rather than re-downloading it.
- **If an image can't be fetched** and the brand has `imagery.profile.json`: offer to generate a
  replacement via `brand-imagery` (subject = the source alt text + section context). Generated
  images are downloaded and committed locally, so the never-hotlink rule still holds.
- **Fallback only** if it can't be fetched and can't be generated: labeled `.img-placeholder` div +
  a note in the delivery summary. Never hotlink.

### 3. Build the HTML File
Follow the component order from Phase 02. Use exact copy from Phase 01 — no paraphrasing, no additions. Reuse the brand's header, footer, hero, cards, and bands verbatim. Introduce a new component variant only when mapped in Phase 02, using existing tokens only.

For a **self-contained brand**, mirror the sibling pages' `<head>` (fonts + inline `<style>` token/component block) rather than linking external CSS. Set a real `<title>` and a `<meta name="description">` derived from on-page copy.

### 3b. Embedded Scheduling / Booking Portal
If the legacy hero embeds an **iframe scheduling / booking / estimate portal**, carry it into the rebuild:
- Reuse the brand's existing scheduling-portal component verbatim (or build a token-compliant portal slot) in a two-column hero — copy on one side, portal on the other.
- **Make the portal first on mobile.** In the stacked (`max-width` hero) breakpoint, order the portal before the copy: `.portal { order: 1 }`, `.hero__copy { order: 2 }`.
- Skip this when the legacy page has no such portal, unless sibling pages place one in the hero (then mirror the siblings).

### 4. Wire Navigation (multi-page sets)
- Use consistent, predictable filenames (`services.html`, `services-residential.html`, …).
- For a hub + children, build a **nested nav**: parent links to the hub; a submenu lists each child. Add hover + keyboard (`focus-within`) support and a mobile-expanded variant, using existing tokens. Mark the current page per file.
- Apply the nav across the new pages **and** existing sibling pages, and repoint existing nav/footer links (e.g. old `#anchor` "Products" links) to the new pages.
- Leave genuinely different layouts / in-page anchors untouched unless repointing clearly helps (note the decision).
- If the brand has a Sitemap page (role `sitemap`), add the rebuilt page(s) to it in this same pass, and add them to `site.manifest.json` `pages[]` — an undeclared, unlinked new page is flagged as an orphan by the structure gate.

### 5. Validate Before Delivery
- [ ] All copy matches source extraction exactly; no invented content / no new value props
- [ ] Images downloaded from source and referenced locally; **zero external hotlinks**
      (`grep -nE '<img[^>]+src="http|url\\([\"']?http'` — scope it to `<img>`/`url()`, since a bare `src="http` also matches legitimate CDN `<script>` tags)
- [ ] Any unfetchable image is a clearly labeled, noted placeholder
- [ ] New component variants use only existing tokens (no new colors/fonts/radii)
- [ ] Brand layer matches sibling pages (header/footer/components reused verbatim)
- [ ] Multi-page: nav wired, current-page marked, existing links repointed, all internal links resolve
- [ ] **Structural consistency (self-heal)** — run the `structure-fix` loop until `npm run structure:scan` is clean: no orphan pages, no broken links; rebuilt pages in the Sitemap page + `site.manifest.json`; no component gallery spun off as its own artifact. It auto-repairs drift and only pauses to confirm before deleting/overwriting a page
- [ ] If the legacy page has an iframe scheduling/booking portal, it's carried into the design and ordered **first on mobile**
- [ ] Semantic HTML5, WCAG AA, mobile responsive
- [ ] Valid `<title>` + `<meta name="description">`; CTAs/phones/addresses preserved exactly
- [ ] No lorem ipsum; HTML page weight < 500 KB (excluding images)
- [ ] **Design craft** — `npm run craft:scan` has no errors, and every warning is fixed or answered in `02-…` (see `docs/DESIGN-CRAFT.md`). Run the **subtraction pass**: add no ornament the brand system doesn't already have; no two neighboring sections share a module; headlines are the client's words in sentence case with no em dashes; closed drawers are `inert`/`visibility:hidden`; the sticky header has a scroll offset.
      A rebuild keeps the brand's tokens verbatim — craft here means composition (vary the modules the
      source repeats), the brand's own motion register, and the plumbing, never new colors or fonts.

### 6. Deliver
Present the file paths and summarize: pages built, images localized (count), any placeholder fallbacks, new component variants, nav/links wired, and flagged items (e.g. truncated source copy completed as placeholder).

## Outputs
- One HTML file per URL, alongside existing brand pages, sharing one `assets/` folder
- `assets/images/` populated with real localized images
- Content sourced 100% from Phase 01; styling 100% from the existing brand layer

## Success Criteria
- Opens in browser without errors; structure mirrors source section order
- Real copy in place, zero invention; real images, zero hotlinks
- Multi-page set is internally navigable and consistent with the existing site

## Delivery Summary Format
```
## Rebuild Complete: [Page set]

**Output:** <folder>/[file].html × N

**Pages built:** [list]
**Images localized:** [N] into assets/images/ (generated: [N or none]; fallback placeholders: [N or none])
**New component variants:** [list or none] (existing tokens only)
**Navigation:** nested nav wired across [pages]; existing "Products"-style links repointed
**Flags:** [e.g. truncated source line completed as placeholder — swap when final copy approved]

**Next steps:**
1. Review localized images / swap any fallback placeholders
2. Preview locally; deploy via push or PR
```
