# Phase 02A - Figma Design Integration

## Purpose
Bridge brand strategy and implementation by extracting precise design specifications from Figma.

## This phase delegates
The extraction pipeline is a skill of its own: **`figma-page-build`**. It handles capture, token
normalization, confirm-and-lock, and the design-vs-build visual diff, and it is the same pipeline
whether you're converting one page or feeding a whole brand site.

**Read `.claude/skills/figma-page-build/SKILL.md` and run its three phases.** This document covers
only what is specific to using it *inside a full brand-site refresh*.

> **Historical note.** This phase used to describe a manual process — Figma Dev Mode, third-party
> token plugins, and hand-rolled `api.figma.com` calls. That predates the Figma MCP connector and is
> no longer how this works. Extraction now runs through the connector, and the raw responses are
> captured to disk so that everything downstream is deterministic, re-runnable, and free.

## When this phase applies
- Client provides a Figma link or `.fig` file
- Design team has created mockups in Figma
- Need implementation matching an approved design

## Inputs
| Input | Notes |
|---|---|
| **Node-specific** Figma URL | `?node-id=…` required. Copy link to selection, not the file URL. |
| Authenticated Figma MCP connector | Dev or Full seat — a View seat exhausts mid-capture |
| **Full-page PNG renders** | Desktop (~1440) and mobile (~390). Ask for these — see below. |
| Exported image assets | Asset bytes can't come through the connector |
| Brand intake documentation | Phase 01 |

### Ask for the renders
They are optional to the tooling and decisive to the result. A render is the only ground truth for
composition, it lets the normalizer confirm inferred colors from actual pixel coverage instead of
queueing them for a human, and it is the only thing the finished build can be checked against. On a
full site refresh, ask for one render per page being built.

## Running it

```bash
# Phase 01 of figma-page-build captures; then:
npm run figma:tokens -- --capture=demos/<brand>/output/00-figma-capture
npm run figma:lock   -- --capture=demos/<brand>/output/00-figma-capture   # then a human edits
npm run figma:check  -- --capture=demos/<brand>/output/00-figma-capture   # gate
```

Produces `tokens.json`, `tokens.css`, `02-component-inventory.md`, `03-asset-handoff.md`.

## What's specific to a brand-site refresh

### 1. Tokens feed the design system, they don't replace it
In a page build, extracted tokens *are* the system. In a brand refresh they are **an input to
Phase 03 (System Architecture)**. Reconcile them against the brand intake before they harden:

- A color in the comp with no counterpart in the brand kit is a **question for the brand owner**,
  not a new token you adopt by default.
- The comp shows one page; the design system has to serve the whole site. A value used once is
  probably a page-level decision, not a system token. Drop it in confirm-and-lock.
- Name tokens for the **system**, not the comp. The generator writes descriptive names
  (`accent-1`, `surface-alt`) precisely so the semantic naming decision lands with a human here.

### 2. Multiple pages, one capture directory per node set
Capture each design board under its own node id in the same directory; the normalizer merges every
`design-context/*.json` into one token set. A token appearing across several pages is a stronger
system candidate than one appearing on a single board — the `uses` count in `tokens.lock.json`
shows you which is which.

### 3. Gaps the comp won't cover
A comp is a static picture of a few pages. The brand books produced later in this skill need
things it never contains: interaction states, error/empty/loading states, long-form typography, and
components for pages that were never designed. Derive them from the extracted tokens, mark them as
derived in the Style Guide, and list them for the brand owner. **Never invent a token to fill a
gap** — build the derived component out of tokens that already exist.

### 4. Accessibility outranks fidelity
Comps routinely fail WCAG AA, red-on-dark most often. Fix it with the brand's tokens and report the
departure. A design system that ships an inaccessible color pairing has hard-coded the problem into
every page built on it afterward.

## Deliverables into Phase 03
- `tokens.json` + `tokens.css` — reconciled, confirmed, ready to become the design system
- `02-component-inventory.md` — node IDs mapped to components, with reconciliation notes
- `03-asset-handoff.md` — outstanding asset exports
- A list of open questions for the brand owner: new colors, inferred breakpoints, derived states

## Quality checklist
- [ ] `npm run figma:check` exits 0 — nothing unconfirmed, capture not truncated
- [ ] Tokens reconciled against brand intake; conflicts raised, not silently resolved
- [ ] Token names are system names, not comp names
- [ ] Single-use values dropped rather than promoted to system tokens
- [ ] Derived (not designed) components and states marked as derived
- [ ] Contrast checked with `npm run ada:scan`, red-on-dark included
- [ ] Asset hand-off list sent
- [ ] Open questions written down for the brand owner

## Exit criteria
- Confirmed token set + CSS variables
- Component inventory mapped to Figma node IDs
- Assets exported or explicitly outstanding
- Responsive behavior documented against confirmed breakpoints
- Open design questions raised

## Next Phase
→ Phase 03: System Architecture
