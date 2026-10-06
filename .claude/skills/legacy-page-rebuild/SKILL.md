# Legacy Page Rebuild Skill

## Identity
- **Name:** `legacy-page-rebuild`
- **Display name:** Legacy Page Rebuild
- **Description:** Rebuild one or more existing pages from live URLs into an existing brand's design system. Mirrors structure and content exactly — no invented copy, no new value props. Pulls real legacy content **and** images. Runs end-to-end with minimal prompting: extract → map → build → wire navigation, pausing only to ask clarifying questions when a section genuinely needs a build decision.
- **Version:** 2.1.0

## Activation Triggers
This skill activates when:
- User provides one or more URLs and says "rebuild", "migrate", "port", or "recreate this page"
- User says "convert this site to our design system" with a URL
- User provides a URL and asks to "bring it into the playbook"
- User provides several related URLs (e.g. a hub page + its children) to bring into the design system together

## Operating Principle — minimal prompting
Run the full flow autonomously. **Do not gate each phase on sign-off.** Produce the Phase 01 / Phase 02 artifacts as provenance, then keep going through the build and navigation wiring without stopping.

The **only** reason to pause is a *section-level build decision you cannot safely default* — see **Clarifying-Question Triggers** below. When you have any, batch them into a single `AskUserQuestion` (don't drip them one at a time), apply the answers, and finish. Everything mechanical — fetching pages, extracting copy verbatim, downloading and localizing images, reusing the existing brand layer, building each page, wiring nested nav and cross-links — happens without asking.

## Process Overview

### Phase 01 — Content & Asset Extraction
- Fetches each URL with WebFetch for structured content (headings, copy, CTAs, nav, footer).
- Fetches the **raw HTML** of each URL to harvest real image URLs (`<img src>`, `og:image`, CSS backgrounds).
- Produces `output/01-<pageset>-content-extraction.md` (suffix per rebuild so prior artifacts are never clobbered).
- Does **not** block — proceeds to mapping.

### Phase 02 — Component Mapping
- Maps each extracted section to a component in the **existing brand's** design system.
- Reuses existing components verbatim; introduces a new component variant only when the source pattern has no match — built strictly from existing tokens (no new colors/fonts/radii).
- Produces `output/02-<pageset>-component-map.md`.
- Does **not** block — proceeds to build. Section decisions that need input are collected as clarifying questions (see triggers).

### Phase 03 — Build, Wire & Deliver
- Builds each URL as a **separate** HTML file, sharing one brand layer and one assets folder.
- Uses exact copy from Phase 01 and **real, locally-downloaded images** (no hotlinking).
- For multi-page sets, wires the pages together (e.g. nested nav for a hub + children) and repoints existing sibling pages' links to the new pages.
- Validates the quality checklist and delivers.

## Key Rules
- **No invented copy** — only content found on the source page. Preserve the original messaging hierarchy exactly. No new value props.
- **Pull real images, host them locally** — download each legacy image into `assets/images/` and reference it locally. **Never hotlink** an external URL. Use a labeled placeholder div **only as a fallback** when an image genuinely can't be fetched (404, blocked, or no source URL exists).
- **Match the existing design system** — reuse the brand's established tokens, header/footer, and components verbatim. New component variants are allowed only if they meet the system's requirements (existing tokens only).
- **Multi-page** — one HTML file per URL, sharing one brand layer and assets folder. Wire related pages together and repoint existing links.
- **Embedded scheduling/booking portal** — if the legacy page embeds an iframe scheduling, booking, or estimate widget, carry it into the rebuild and make the portal **first on mobile**. See **Embedded Scheduling / Booking Portal** below.
- **No style guide** — out of scope for rebuilds (use `yohdev-website-refresh` for that). But when the brand
  already has one, **respect it**: component/pattern work goes into the Style Guide page, not a new artifact.
- **No `demo.json`** — page skills do not produce portal entries.
- **Structural consistency (self-heal)** — if the brand has a `site.manifest.json`, read it before building
  and honor it; after building, run the `structure-fix` loop so `npm run structure:scan` ends clean (no
  orphan pages, no broken links). It auto-repairs drift (declaring/wiring a new page into hub + nav + Sitemap,
  folding components into the Style Guide) and only pauses to confirm before deleting/overwriting a page —
  don't surface a raw scanner error to the user. See `demos/README-manifest.md`.

## Image Handling (default: pull & localize)
For every image on the source page:
1. Harvest the real URL from the raw HTML (`<img src>`, `srcset`, `og:image`, inline/CSS `background-image`). Resolve relative paths against the page origin.
2. Download it into `assets/images/[descriptive-name.ext]` (verify it's a real image, not an error page).
3. Reference it locally — `<img src="assets/images/...">` or `background:url('assets/images/...')`.
4. Carry the source alt text. If alt is missing, write concise alt derived from context (do not invent claims).

**If an asset can't be fetched** (404, blocked, JS-only) **and the brand has
`demos/<brand>/imagery.profile.json`**, offer to generate a replacement via the `brand-imagery`
skill, using the source alt text and surrounding section copy as the subject. Generated images are
downloaded and committed locally, so "zero external hotlinks" still holds.

**Fallback** when there's no profile, when generation fails, or when the slot needs legible text in
it — labeled placeholder div, and note it for the user:
```html
<!-- IMAGE: [label] — asset unavailable from source; provide at assets/images/[filename] -->
<div class="img-placeholder" data-label="[label]"><span>[label]</span></div>
```
```css
.img-placeholder { background: var(--color-gray-200, #e5e7eb); border: 1px dashed #cbd5e1;
  display: flex; align-items: center; justify-content: center; min-height: 300px;
  border-radius: 4px; color: #6b7280; font-size: 0.875rem; text-align: center; padding: 1rem; }
```

## Brand Layer Detection & Reuse
Before building, locate where the brand already lives and match it exactly:
- **Sibling pages exist** (e.g. an existing `demos/<brand>/output/` or `brands/<slug>/`): open one, copy its design-token + component set **verbatim** into the new page(s), and write the new files alongside them. Reuse the exact header, footer, hero, card, and band components.
- **Self-contained inline systems:** if the existing pages inline their tokens/components in a `<style>` block and do **not** link `shared/system.css`, do the same — keep the new pages self-contained and consistent. Do **not** bolt on `system.css` or restructure existing pages.
- **Separate `brand.css` exists:** link it. If no brand layer exists at all, link `shared/system.css` and note that `brand.css` is missing, proceeding with system defaults.

## Multi-Page & Navigation Conventions
- Name files predictably and consistently with siblings (e.g. `services.html`, `services-residential.html`, `services-commercial.html`).
- A hub + children set should be navigable: build a **nested nav** (parent links to the hub; submenu links to each child) with hover + keyboard (`focus-within`) support and a mobile-expanded variant, using existing tokens.
- Apply the nav consistently across the new pages and the existing sibling pages, and **repoint** existing "Products"-style nav/footer links to the new pages. Mark the current page per file.
- Leave pages with a genuinely different layout / in-page anchors untouched unless repointing clearly helps (note the decision).

## Embedded Scheduling / Booking Portal
Applies to any legacy page that embeds an **iframe scheduling / booking / estimate widget** (a "Schedule Now" / "Get a Free Estimate" / "Book Online" control). When present it is part of the page, not chrome — carry it into the rebuild:
- **Always include it.** Map it to the brand's existing scheduling-portal component if one exists; otherwise build a token-compliant portal slot from existing tokens. Reuse the component verbatim — do not invent a new portal style. In production the slot is where the real iframe widget renders; in a demo it's the styled portal form.
- **Portal is always first on mobile.** When the hero stacks at the mobile breakpoint, the portal must come **before** the hero copy. Use CSS ordering on the stacked hero grid (e.g. `.portal { order: 1 }`, `.hero__copy { order: 2 }`) so the scheduling action is the first thing a mobile visitor sees. On desktop it sits in its usual two-column position.
- If the legacy hero has no portal but siblings place one in the hero, mirror the siblings (note the decision). If genuinely ambiguous where it belongs, raise it as a clarifying question.

## Clarifying-Question Triggers (the only reasons to pause)
Batch these into one `AskUserQuestion`; otherwise proceed silently:
- **Genuinely ambiguous unmatched section** — a source pattern with no clean match where the right approach isn't obvious. If a token-compliant variant of an existing component is the clear fit (as `product-card` was), build it silently; only ask when the handling could reasonably go several ways.
- **Ambiguous/garbled source copy** — e.g. a sentence truncated at the source. Ask for the exact line; never invent it. **If the user defers** ("make it up", "you decide"), make the smallest flagged completion that resolves it (e.g. the obviously-missing noun) — never a new claim — and mark it with an in-file `NOTE` and in the delivery summary.
- **A section the page implies but doesn't fully provide** — content gaps that block building that section (after noting them).
- **Net-new sections** the user wants that aren't on the legacy page.

Do **not** ask about: missing meta descriptions (derive a concise one from on-page copy), missing alt text (derive from context), images that can't be fetched — 404, blocked, or JS-only (offer generation if the brand has an imagery profile, else fall back to a noted placeholder), or banner reuse the legacy site itself does (mirror it and note it).

## Quality Checklist
Before delivery:
- [ ] All content sourced from the original page (no invention, no new value props)
- [ ] Images pulled from source and hosted locally; **zero external hotlinks**
- [ ] Any unfetchable image is generated on-brand, or a clearly labeled, noted placeholder
- [ ] New component variants use only existing design-system tokens
- [ ] Multi-page sets share one brand layer + assets folder; nav wired and links repointed
- [ ] No lorem ipsum
- [ ] Semantic HTML5, WCAG AA, mobile responsive
- [ ] Valid meta title and description; all CTAs and links preserved
- [ ] HTML page weight < 500 KB (excluding images)

## Shared Components Reference
Map extracted sections to the existing brand's components (names illustrative):
- `header-nav` — Logo left, nav right, CTA button (with nested dropdown when a section has children)
- `hero-section` — Full-width above-the-fold
- `value-card` — Icon/number + headline + description
- `product-card` — Title + spec line + feature list (variant of a card, for product lines)
- `testimonial` / reviews placeholder — Quote + author, or a noted widget slot
- `stat-counter` — Number + label
- `process-step` — Number + title + description
- `contact-form` — Fields + submit
- `accordion` — Expandable FAQ
- `footer` — Multi-column with links

## Failure Modes
- **URL unreachable:** Ask the user to paste the content directly.
- **JavaScript-rendered content missing:** Note gaps, ask the user to fill them in.
- **Image can't be fetched:** Fall back to a labeled placeholder div and note it (don't block).
- **No brand layer found:** Use `shared/system.css` defaults, note `brand.css` as missing.
- **Non-standard page layout:** Document in Phase 02, propose the closest component match (or raise as a clarifying question if it needs a new variant).
