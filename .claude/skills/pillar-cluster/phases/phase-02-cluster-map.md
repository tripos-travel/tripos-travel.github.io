# Phase 02: Map Components

## Purpose
Map every page's sections to the brand's existing components, and plan the nested-nav structure for the cluster. One combined artifact.

## 1. Map each page's sections
For the hub and each spoke, map extracted sections to components in the **existing brand's** design system:
- Reuse existing components verbatim (header, footer, hero, cards, bands, etc.).
- Introduce a new component variant only when a source pattern has no clean match — and only from **existing tokens** (no new colors/fonts/radii).
- Hub pages typically index/summarize and link to spokes; spokes drill into one facet. Map accordingly, but take all copy from Phase 01 — no invention.

## 2. Plan the nested navigation
Define the cluster's nav shape once, to be applied in Phase 03:
- Hub link in the main nav, with a submenu listing the hub ("All …") + every spoke.
- Note which existing sibling pages need their nav updated and which stale/placeholder links (`href="#"`) get repointed.
- Note the current-page marker per file.

## 3. Write the combined map artifact
Produce a single `output/02-<cluster>-component-map.md`:
- A per-page section→component table (hub + each spoke).
- The planned nested-nav structure (hub + spokes, files to update, links to repoint).
- Any new component variants (with the existing tokens they use).
- Build decisions taken and assumptions flagged.

## Outputs
- `output/02-<cluster>-component-map.md` (hub + all spokes + nav plan)

## Does not block
Proceed to Phase 03. Batch any genuine clarifying questions; headless runs never ask.
