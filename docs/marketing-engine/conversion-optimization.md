# Capability Spec — `conversion-optimization`

> **Status: planned skill spec.** Blueprint for a future skill under
> `.claude/skills/conversion-optimization/`. Not yet built. Part of the [Marketing Engine](README.md);
> funnel stage: **Optimize (continuous)**.

## Identity
- **Name:** `conversion-optimization`
- **Display name:** Conversion Optimization
- **Description:** Make the funnel measurable, diagnose where it leaks, and run prioritized experiments
  that lift conversion — a continuous loop that feeds fixes back into the landing pages, CRM, and SEO.
- **Version:** 0.1.0 (spec)

## Purpose
Once traffic and leads exist, growth comes from converting more of the *same* traffic — cheaper leads,
higher form conversion, faster speed-to-lead, better close rates. This skill turns the funnel from
"set and forget" into a measured system with a running experiment backlog.

## Where it fits
The **continuous optimize loop** (roadmap M5). It needs live traffic + CRM data, so it comes last — but
then it never stops: it reads data produced by [`lead-funnel`](lead-funnel.md) and
[`crm-campaigns`](crm-campaigns.md), and its findings feed fixes back into those skills and into
[`seo-foundation`](seo-foundation.md).

## Inputs
- Live analytics + ad-platform data (traffic, cost, conversion events).
- CRM pipeline data + the reporting-field contract from `crm-campaigns`.
- The funnel's tracking plan from `lead-funnel`.
- The SEO baseline from `seo-foundation`.

## Process (phases)

### Phase 01 — Measurement baseline
**Purpose:** Establish the funnel's current conversion rates end to end.
**Inputs:** Analytics, ad data, CRM data.
**Process:**
1. Assemble the funnel view: impressions → clicks → landing views → form starts → submits → leads →
   appointments → deposits → won.
2. Compute stage-to-stage conversion rates + cost per stage (cost-per-lead, cost-per-acquisition).
3. Confirm data quality (attribution intact, events firing) — flag gaps before drawing conclusions.
**Outputs:** `output/01-funnel-baseline.md` (rates + costs per stage, data-quality notes).
**Exit criteria:** A trustworthy baseline exists; measurement gaps are documented, not glossed over.

### Phase 02 — Diagnose leaks
**Purpose:** Find where the funnel loses the most recoverable value.
**Inputs:** The baseline.
**Process:**
1. Identify the biggest drop-offs vs. reasonable benchmarks (e.g., low form-conversion, slow
   speed-to-lead, high appointment no-show).
2. Segment (by source/campaign/angle/device/region) to localize the leak.
3. Form hypotheses for the top leaks — each tied to a specific, testable change.
**Outputs:** `output/02-funnel-diagnosis.md` (ranked leaks + hypotheses).
**Exit criteria:** Top leaks ranked by recoverable value with testable hypotheses.

### Phase 03 — Experiment backlog & prioritization
**Purpose:** Decide what to test, in what order.
**Inputs:** Diagnosis.
**Process:**
1. Turn hypotheses into experiments (page headline/offer/form-length tests, routing-speed changes,
   nurture-timing changes, ad-angle tests).
2. Prioritize (e.g., ICE/PIE: impact × confidence × ease). Note which skill each experiment routes to
   (`lead-funnel`, `crm-campaigns`, or `seo-foundation`).
3. Define success metric + minimum sample/duration per experiment (avoid calling winners on noise).
**Outputs:** `output/03-experiment-backlog.md` (prioritized experiments with owners + success
criteria).
**Exit criteria:** A ranked backlog exists; the top experiment is fully specified.

### Phase 04 — Run, read, feed back
**Purpose:** Ship an experiment and route the learning back into the system.
**Inputs:** The top experiment.
**Process:**
1. Ship the change through the owning skill (e.g., a headline test built via `lead-funnel`'s page
   conventions → PR → preview → merge).
2. Let it reach the pre-defined sample/duration; read the result honestly (win/lose/inconclusive).
3. Feed the learning back: roll winners into the relevant skill's defaults; record losers so they
   aren't re-tried.
**Outputs:** `output/04-experiment-<n>-readout.md` (result + decision + what changed).
**Exit criteria:** One experiment shipped + read out with a decision — then loop to Phase 02.

## Tooling
- **Agnostic contract:** funnel measurement, leak diagnosis, a prioritized experiment backlog, and an
  experiment run/readout loop that feeds other skills.
- **Reference implementation:** analytics + ad-platform reporting for top-of-funnel; **HubSpot**
  `get_campaign_attribution_reports` / `read_campaign_data` / `query_crm_data` for lead→deal
  conversion; experiments shipped via the existing page-build + preview pipeline; CRM/campaign changes
  via `crm-campaigns`. A/B testing tool per client.

## Provenance artifacts
- `output/01-funnel-baseline.md`
- `output/02-funnel-diagnosis.md`
- `output/03-experiment-backlog.md`
- `output/04-experiment-<n>-readout.md` (one per experiment)

## Quality / ADA gates
- Any page variant shipped for a test is `output/*.html` → **must pass ADA / WCAG AA** and the
  pre-commit gate; an "optimized" variant that fails contrast never ships.
- **Statistical honesty** — no calling winners before the pre-defined sample/duration; inconclusive is
  a valid, recorded outcome.

## Open questions / deferred
- Which A/B tool (native ad-platform, HubSpot, or a dedicated CRO tool) for v1.
- Minimum traffic threshold before experiments are worthwhile (guardrail against testing on too little
  data).
- Personalization / dynamic content — deferred until the base funnel is optimized.
