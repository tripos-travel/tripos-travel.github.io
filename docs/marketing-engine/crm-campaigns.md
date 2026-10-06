# Capability Spec — `crm-campaigns`

> **Status: planned skill spec.** Blueprint for a future skill under `.claude/skills/crm-campaigns/`.
> Not yet built. Part of the [Marketing Engine](README.md); funnel stage: **Convert / Nurture /
> Close**.

## Identity
- **Name:** `crm-campaigns`
- **Display name:** CRM & Campaigns
- **Description:** Stand up the pipeline, **speed-to-lead** routing, and nurture campaigns that turn
  captured leads into closed deals — so the sales team "fires" the moment a lead arrives and no lead
  goes cold. CRM-agnostic contract; HubSpot reference.
- **Version:** 0.1.0 (spec)

## Purpose
A lead in a form is worth nothing until a rep is on the phone. This skill makes the CRM *act*: it
defines the deal pipeline, routes new leads to a rep within a tight speed-to-lead window, and nurtures
the leads that don't close on the first touch — the difference between "we're getting leads" and
"we're closing deals."

## Where it fits
The **Convert/Nurture/Close** layer, immediately after [`lead-funnel`](lead-funnel.md) (roadmap M4). It
consumes the routing-trigger contract that `lead-funnel` raises, uses the ad-angle/offer context from
[`competitive-analysis`](competitive-analysis.md) for nurture messaging, and feeds pipeline data to
[`conversion-optimization`](conversion-optimization.md).

## Inputs
- The CRM (agnostic; **HubSpot reference**) and the lead schema from `lead-funnel`.
- The client's **deal model + sales process** (e.g., a high-consideration purchase with a
  deposit-based close, reps closing **by phone**, multi-region fulfillment — concrete client facts
  live in the pilot brief).
- The sales team structure (who takes leads, hours, territories) for routing.
- Target **speed-to-lead** window and nurture cadence.

## Process (phases)

### Phase 01 — Pipeline & lifecycle design
**Purpose:** Model the client's actual sales process in the CRM.
**Inputs:** Deal model, sales process.
**Process:**
1. Define **lifecycle stages** (lead → MQL/qualified → opportunity → deposit paid → won/lost) that
   match how the business actually closes — e.g., a "deposit paid" stage is a real, money-in stage
   (not a vanity step) when the business is paid on deposit.
2. Define **deal properties** needed to qualify + forecast (product type/size, budget, region, timeline).
3. Define lost reasons + re-engagement criteria.
**Outputs:** `output/01-pipeline-design.md` (stages, properties, entry/exit criteria per stage).
**Exit criteria:** Pipeline mirrors the real close process; operator + sales sign off.

### Phase 02 — Speed-to-lead routing
**Purpose:** Get a human (or an instant auto-touch) on every new lead fast.
**Inputs:** `lead-funnel` routing-trigger contract, team structure, speed-to-lead target.
**Process:**
1. Define the routing rule: new lead → assigned rep (by territory/round-robin/availability).
2. Define the **instant first-touch**: auto SMS/email to the lead ("we got your request, a rep will
   call") + rep notification, firing within the target window (e.g., < 5 minutes).
3. Define fallback/escalation if the assigned rep doesn't act (reassign / alert).
**Outputs:** `output/02-routing-rules.md` (assignment logic, first-touch templates, SLAs, escalation).
**Exit criteria:** A new lead auto-routes + auto-first-touches within the target window in a test.

### Phase 03 — Nurture campaigns
**Purpose:** Keep un-closed leads warm without manual effort.
**Inputs:** Pipeline stages, offer/angle context, cadence.
**Process:**
1. Build **one** core nurture sequence first (no automation sprawl): no-response follow-ups over N
   days, then a long-term "still interested?" drip.
2. Message-match nurture to the ad angle/offer that produced the lead where possible.
3. Define enrollment/suppression rules (stop on reply, stop on deposit, respect consent/unsubscribe).
**Outputs:** `output/03-nurture-campaigns.md` (sequence content, timing, enroll/suppress logic).
**Exit criteria:** One nurture sequence configured with correct enroll/suppress; consent respected.

### Phase 04 — Campaign structure & attribution
**Purpose:** Organize marketing activity so results are attributable.
**Inputs:** Ad channel + source data from `lead-funnel`, pipeline data.
**Process:**
1. Define the **campaign object** structure so leads/deals associate to the campaign that produced
   them (channel → campaign → asset).
2. Set first/last-touch source stamping (full multi-touch attribution is deferred).
3. Define the reporting fields `conversion-optimization` will read (source → lead → appointment →
   deposit → won).
**Outputs:** `output/04-campaign-and-attribution.md` (campaign taxonomy, attribution rules, reporting
field contract).
**Exit criteria:** Every lead/deal can be traced to a source + campaign; reporting contract is set.

## Tooling
- **Agnostic contract:** pipeline + lifecycle stages, new-lead routing with instant first-touch,
  nurture sequencing with consent handling, and campaign/attribution structure.
- **Reference implementation (HubSpot):** deal pipeline + lifecycle stages; `manage_crm_objects`
  (with association context) for routing + deal creation; workflows for speed-to-lead + nurture;
  `manage_campaign_objects` for campaign structure; `get_campaign_attribution_reports` /
  `read_campaign_data` for the reporting contract. Swappable per client (GoHighLevel pipelines +
  automations, etc.).

## Provenance artifacts
- `output/01-pipeline-design.md`
- `output/02-routing-rules.md`
- `output/03-nurture-campaigns.md`
- `output/04-campaign-and-attribution.md`

## Quality / ADA gates
- Marketing **emails** should meet basic accessibility (semantic structure, alt text, sufficient
  contrast) even though they're not scanned by the site ADA tool.
- **Consent & compliance:** honor unsubscribe/opt-out and SMS consent (TCPA-style) — a hard rule, not
  a nicety.
- **No fabricated claims** in nurture copy — offers/guarantees come from the client.
- **Confirm-before-write:** the HubSpot reference tools require explicit approval before creating/
  updating CRM or campaign objects — that gate stands.

## Open questions / deferred
- Exact speed-to-lead target + hours-of-operation handling (after-hours auto-touch vs. queue).
- SMS provider + consent capture point (likely on the `lead-funnel` form) — coordinate with M3.
- Round-robin vs. territory routing for a multi-region model.
- Full multi-touch attribution modeling — **deferred** to a later pass (first/last-touch for v1).
