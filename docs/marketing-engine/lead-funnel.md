# Capability Spec — `lead-funnel`

> **Status: planned skill spec.** Blueprint for a future skill under `.claude/skills/lead-funnel/`.
> Not yet built. Part of the [Marketing Engine](README.md); funnel stage: **Capture**. **This is the
> priority capability** — the client's stated #1 need is leads.

## Identity
- **Name:** `lead-funnel`
- **Display name:** Lead Funnel
- **Description:** Build the path from ad click to CRM lead — on-brand, ADA-clean landing page(s), a
  conversion-focused form, end-to-end tracking, and a clean handoff into the CRM with source
  attribution intact. One funnel per run.
- **Version:** 0.1.0 (spec)

## Purpose
The website exists to *convert*, not just to inform. This skill assembles the capture path so a paid
click (or organic visit) becomes a structured lead the sales team can act on immediately — with the
tracking to know which ad/keyword produced it.

## Where it fits
The genuinely new **post-site** layer. It runs after the Playbook site + brand exist (roadmap M3),
reuses the design system verbatim for landing pages/forms (via the same conventions as
`net-new-page` / `pillar-cluster`), consumes ad angles from
[`competitive-analysis`](competitive-analysis.md), and hands leads to
[`crm-campaigns`](crm-campaigns.md). Its output is what [`conversion-optimization`](conversion-optimization.md)
later improves.

## Inputs
- The live site + brand design system.
- The offer + ad angles (from competitive analysis / the client).
- The client's live ad channel(s) (e.g., Meta/Facebook).
- The target CRM (agnostic; **HubSpot reference**) and the lead fields the sales team needs.
- The deal model that shapes the form + routing (e.g., a high-consideration, deposit-based, phone-close
  purchase → capture enough to qualify + call fast; concrete client facts live in the pilot brief).

## Process (phases)

### Phase 01 — Funnel plan
**Purpose:** Define one funnel end-to-end before building any of it.
**Inputs:** Offer, ad angle(s), channel, CRM target, deal model.
**Process:**
1. Pick **one** offer/audience for this funnel (no multi-funnel sprawl — one per run).
2. Map the path: ad → landing page → form → thank-you/next-step → CRM record → routing trigger.
3. Define the **lead schema**: exactly which fields to capture (and which to *avoid* — every extra
   field costs conversion), and how they map to CRM properties.
4. Define the **tracking plan**: UTM convention, events (page view, form start, submit), and where
   source attribution is stamped.
**Outputs:** `output/01-funnel-plan.md` (path diagram, lead schema → CRM field map, tracking plan).
**Exit criteria:** Operator approves the single funnel's shape, fields, and tracking before build.

### Phase 02 — Landing page & form build
**Purpose:** Build the on-brand, accessible capture surface.
**Inputs:** Funnel plan, design system.
**Process:**
1. Build the landing page(s) reusing the brand's tokens/components **verbatim** — message-matched to
   the ad angle (ad promise = page headline). Real images, hosted locally; labeled placeholder only as
   a noted fallback.
2. Build the form: minimal fields per the lead schema, clear single CTA, visible privacy/consent,
   accessible labels + error states.
3. Build the thank-you / next-step state (sets up speed-to-lead — e.g., "a rep will call you shortly").
**Outputs:** `output/Landing-<offer>.html` (+ form), `output/02-component-map.md` (which brand
components were used — provenance, mirroring the page builders' `02-…` artifact).
**Exit criteria:** Page + form built; on-brand; **passes `npm run ada:scan`** and the pre-commit gate.

### Phase 03 — Tracking & CRM intake wiring
**Purpose:** Make a submission become a CRM lead with attribution intact.
**Inputs:** Tracking plan, lead schema → CRM field map.
**Process:**
1. Implement UTM capture + persistence through to submission.
2. Wire form submit → CRM lead/contact create with source, campaign, and UTM fields populated.
3. Implement conversion events (submit) for the ad platform + analytics.
4. Define the **routing trigger** contract handed to `crm-campaigns` (new lead → who/what fires) —
   this skill *raises* the event; `crm-campaigns` *acts* on it.
**Outputs:** `output/03-tracking-and-intake.md` (event + field mapping, routing-trigger contract).
**Exit criteria:** Field map + events specified; the CRM create + attribution contract is unambiguous.

### Phase 04 — End-to-end verification
**Purpose:** Prove a lead flows from ad click to CRM record.
**Inputs:** The built + wired funnel.
**Process:**
1. Submit a **test lead** and confirm it lands in the CRM with correct fields + source/UTM.
2. Confirm the conversion event fires on the ad platform + analytics.
3. Confirm the routing trigger raises for `crm-campaigns`.
**Outputs:** `output/04-funnel-verification.md` (test evidence: what was submitted, what landed).
**Exit criteria:** One clean end-to-end pass documented — **this is roadmap M3's definition of done.**

## Tooling
- **Agnostic contract:** landing page + form producing a CRM lead with source attribution and firing
  conversion + routing events.
- **Reference implementation:** landing pages via the repo's page-build conventions (Next.js output,
  brand tokens); forms → **HubSpot** contact/lead create (`manage_crm_objects`) with UTM/source
  properties, campaign association (`manage_campaign_objects`), and HubSpot forms/tracking; Meta Pixel
  / conversions API for the ad-side event. Swappable per client (GoHighLevel, Meta Lead Ads → sheet,
  etc.).

## Provenance artifacts
- `output/01-funnel-plan.md`
- `output/Landing-<offer>.html` (+ form) · `output/02-component-map.md`
- `output/03-tracking-and-intake.md`
- `output/04-funnel-verification.md`

## Quality / ADA gates
- Landing pages + forms are `output/*.html` → **must pass ADA / WCAG AA** (contrast incl. red-on-dark,
  form labels, control names, error identification) and clear the pre-commit hook before commit.
- **No invented offer claims** — pricing/guarantee copy comes from the client/offer, not fabricated.
- **Consent/privacy** present on any form that collects PII.

## Open questions / deferred
- One landing page per ad angle vs. a modular page — start with one per angle (bounded), templatize
  later.
- Server-side vs. client-side conversion tracking for v1. (Proposed: pixel v1, CAPI later.)
- Spam/bot mitigation on forms (honeypot/reCAPTCHA) — decide in the pilot.
- Multi-step vs. single-step form — test in `conversion-optimization`, don't pre-optimize.
