# Capability Spec — `seo-foundation`

> **Status: planned skill spec.** Blueprint for a future skill under
> `.claude/skills/seo-foundation/`. Not yet built. Part of the [Marketing Engine](README.md); funnel
> stage: **Attract (organic & local)**.

## Identity
- **Name:** `seo-foundation`
- **Display name:** SEO Foundation
- **Description:** Bake technical and local/multi-region SEO **into** the site build — schema,
  metadata, information architecture, sitemap, performance, and a keyword→page map — so a brand-new
  domain starts findable instead of invisible.
- **Version:** 0.1.0 (spec)

## Purpose
SEO retrofitted onto a finished site is slower, more expensive, and worse than SEO designed in from the
start. This skill makes the structural search decisions *during* the build, and stands up the local
footprint a service-area business needs to appear in "near me" and per-region searches.

## Where it fits
**Designed into the site build.** It hooks the existing page/site builders
(`yohdev-website-refresh`, `net-new-page`, `pillar-cluster`) rather than replacing them — it
contributes the SEO layer to what they produce. It consumes the SEO target list from
[`competitive-analysis`](competitive-analysis.md) and lands *with* the site (roadmap M2), not after.

## Inputs
- The competitive SEO target list (terms/topics) from `competitive-analysis`.
- The brand's IA / page plan from the Playbook build.
- Service geography (a multi-region/multi-state service area drives the local strategy) and the primary domain.
- Business facts for structured data (name, offers, service areas, reviews if any).

## Process (phases)

### Phase 01 — Keyword & intent map
**Purpose:** Decide what the site should rank for, and which page owns each term.
**Inputs:** Competitive SEO target list, page plan, geography.
**Process:**
1. Cluster target terms by **intent** (informational vs. transactional/"buy a <product> in <state>").
2. Map each cluster to a single owning page (avoid cannibalization) — new pages flagged where a term
   has no home.
3. Prioritize by value × winnability for a new domain (favor local/long-tail early).
**Outputs:** `output/01-keyword-map.md` (term cluster → intent → owning page → priority).
**Exit criteria:** Every priority term has exactly one owning page; gaps flagged as pages to build.

### Phase 02 — Technical SEO spec (built into the site)
**Purpose:** Define the on-page/technical requirements the site build must satisfy.
**Inputs:** Keyword map, IA.
**Process:**
1. **Metadata:** title/description patterns per template; canonical rules; Open Graph/social cards.
2. **Structured data (schema.org):** Organization/LocalBusiness, Product/Offer where relevant,
   BreadcrumbList, Review/AggregateRating when real reviews exist. **No fabricated review markup.**
3. **IA & URLs:** clean, keyword-aligned slugs; breadcrumb structure; internal-linking rules.
4. **Crawl/index infrastructure:** `sitemap.xml`, `robots.txt`, correct indexability.
5. **Performance:** Core Web Vitals budget (the Next.js stack is well-suited — set targets, don't
   assume). Image sizing/lazy-load consistent with the "real images, hosted locally" rule.
**Outputs:** `output/02-technical-seo-spec.md` — a checklist the page/site builders implement.
**Exit criteria:** Spec is complete and expressed as build requirements the existing builders can act
on.

### Phase 03 — Local / service-area structure
**Purpose:** Give a multi-region business a legitimate local footprint.
**Inputs:** Service geography, keyword map, page plan.
**Process:**
1. Decide the service-area page model (e.g., state/region hub + spoke pages) — implemented via
   `pillar-cluster` conventions, **one cluster per run**, spokes explicit.
2. Define per-region content requirements that avoid thin/duplicate pages (real differentiators per
   region — no spun boilerplate).
3. Specify Google Business Profile / local citation guidance (setup checklist; NAP consistency).
   *Off-site setup is guidance, not something the skill auto-executes in v1.*
**Outputs:** `output/03-local-seo-plan.md` — service-area page model + GBP/citation checklist.
**Exit criteria:** A non-thin, scalable local page model is defined and handed to the cluster builder.

### Phase 04 — Measurement & verification
**Purpose:** Make organic performance observable from day one.
**Inputs:** The built site.
**Process:**
1. Search Console + analytics setup checklist; confirm sitemap submitted and pages indexable.
2. A technical audit pass (metadata present, schema valid, no broken canonicals, CWV within budget).
3. Baseline the target-term positions for later comparison by [`conversion-optimization`](conversion-optimization.md).
**Outputs:** `output/04-seo-audit.md` + baseline ranking snapshot.
**Exit criteria:** Audit passes; measurement is live; baseline recorded.

## Tooling
- **Agnostic contract:** produce a keyword→page map, a technical SEO spec the builders implement, a
  local page model, and a verification/audit pass.
- **Reference implementation:** WebSearch/SERP checks for terms; schema validated against schema.org;
  Search Console for indexing/measurement; the existing page/site builders for implementation. No CRM
  dependency.

## Provenance artifacts
- `output/01-keyword-map.md`
- `output/02-technical-seo-spec.md`
- `output/03-local-seo-plan.md`
- `output/04-seo-audit.md` (+ baseline snapshot)

## Quality / ADA gates
- Any pages produced via the builders (service-area pages) go through the standard **ADA / WCAG AA**
  scan and the pre-commit gate — SEO never overrides accessibility (e.g., heading order stays correct;
  alt text is real).
- **No black-hat / fabricated markup** — no fake reviews, hidden text, or thin doorway pages.

## Open questions / deferred
- Search Console API automation vs. manual verification for v1. (Proposed: manual checklist v1.)
- How many service-area pages before it's "thin at scale" for a large multi-state footprint? (Needs a content model
  decision in the pilot.)
- Multi-language/hreflang — deferred (out of scope for the first pass).
