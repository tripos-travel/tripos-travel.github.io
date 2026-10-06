# Capability Spec — `competitive-analysis`

> **Status: planned skill spec.** Blueprint for a future skill under
> `.claude/skills/competitive-analysis/`. Not yet built. Part of the
> [Marketing Engine](README.md); funnel stage: **Attract (differentiate)**.

## Identity
- **Name:** `competitive-analysis`
- **Display name:** Competitive Analysis
- **Description:** Benchmark a defined set of competitors and produce a positioning map, offer/pricing
  signal inventory, ad-angle library, messaging whitespace, and an SEO target list — the inputs that
  let a brand differentiate instead of blend in.
- **Version:** 0.1.0 (spec)

## Purpose
You cannot differentiate a brand you haven't benchmarked. This skill turns a list of competitors into
structured, evidence-backed intelligence that feeds brand positioning, ad creative, and SEO — so the
Playbook builds a site that stands *against* the field rather than echoing it.

## Where it fits
**Pre-Playbook input.** Runs before (or alongside) brand positioning. Its output is consumed by
`yohdev-website-refresh` Phase 01 (Intake) and Phase 02 (Research), and its ad-angle library is handed
to [`lead-funnel`](lead-funnel.md) and [`crm-campaigns`](crm-campaigns.md). It is the earliest skill in
the [roadmap](ROADMAP.md) (M1).

## Inputs
- **Explicit competitor list** (URLs + names) — required. No auto-discovery; the operator names the set
  (mirrors `pillar-cluster`'s "spokes are explicit").
- The client's own brief / positioning-so-far (to measure *against*).
- Target market + geography (product category + service area — concrete client facts live in the pilot brief).
- Optional: known ad channels to sample (e.g., Meta Ad Library).

## Process (phases)

> This is a **research** skill — three phases, no separate measurement/verification phase. Its output
> is validated by the operator at the Phase 03 exit and proven downstream when it feeds the Playbook
> build and the lead funnel.

### Phase 01 — Scope & source
**Purpose:** Lock the competitor set and evidence sources before analyzing.
**Inputs:** Competitor list, market/geo, channels to sample.
**Process:**
1. Confirm the explicit competitor list (3–7 direct competitors; note any aspirational/adjacent ones
   separately).
2. Identify evidence sources per competitor: website, pricing/config pages, Meta Ad Library entries,
   review profiles, and search results for target terms.
3. Record the scope so the run is bounded and repeatable.
**Outputs:** `output/01-competitor-scope.md` (the locked set + sources).
**Exit criteria:** Operator confirms the competitor set and sources; nothing analyzed yet.

### Phase 02 — Capture & extract
**Purpose:** Gather primary evidence, verbatim, with provenance.
**Inputs:** The locked scope.
**Process:**
1. For each competitor, capture: hero/value proposition, offer structure, pricing signals (starting
   prices, financing, deposit terms), primary CTA, proof (reviews, warranties, delivery claims), and
   visual/brand tone. Screenshot key pages.
2. Sample live ads (e.g., Meta Ad Library): capture hooks, formats, offers, and how long ads have been
   running (longevity ≈ what's working).
3. Note verbatim claims — **no paraphrasing into invented copy**; quote and cite.
**Outputs:** `output/02-competitor-evidence/` (per-competitor notes + screenshots), each entry
citing its source URL and capture date.
**Exit criteria:** Every competitor has an evidence entry with sources; claims are quoted, not invented.

### Phase 03 — Synthesize & find whitespace
**Purpose:** Turn evidence into differentiation inputs.
**Inputs:** The evidence set.
**Process:**
1. Build a **positioning map** (axes chosen from what actually varies — e.g., price vs.
   custom/quality, DIY vs. done-for-you, speed-to-delivery vs. selection).
2. Compile an **offer/pricing signal table** (how each competitor frames the money — deposit %,
   financing, "starting at," delivery/install).
3. Compile an **ad-angle library** (recurring hooks + which competitor uses them + apparent longevity).
4. Identify **messaging whitespace** — claims/angles the field under-uses that the client can own.
5. Produce an **SEO target list** — terms/topics competitors rank for or bid on (handed to
   [`seo-foundation`](seo-foundation.md)).
**Outputs:** `output/03-competitive-synthesis.md` — positioning map, offer table, ad-angle library,
whitespace recommendations, SEO target list.
**Exit criteria:** Operator approves the synthesis; positioning inputs are ready to hand to the
Playbook and ad angles to the lead funnel.

## Tooling
- **Agnostic contract:** capture competitor web + ad evidence with provenance; output a positioning
  map, offer table, ad-angle library, whitespace list, and SEO target list.
- **Reference implementation:** WebFetch / WebSearch for sites and SERPs; Meta Ad Library for live ad
  sampling; screenshots via the repo's existing capture approach (as in `yohdev-website-refresh`
  Phase 02). HubSpot is not required for this skill.

## Provenance artifacts
- `output/01-competitor-scope.md`
- `output/02-competitor-evidence/` (notes + screenshots, sourced & dated)
- `output/03-competitive-synthesis.md`

## Quality / ADA gates
- Produces no public `output/*.html`, so no ADA scan applies.
- **Evidence discipline:** every claim cited to a source + date; no fabricated pricing or stats.

## Open questions / deferred
- How many competitors is the right default cap? (Proposed: 3–7 direct.)
- Automated Meta Ad Library pulls vs. manual capture for v1. (Proposed: manual/assisted for v1.)
- Refresh cadence — is this one-shot at kickoff, or a recurring quarterly re-benchmark? (Deferred.)
