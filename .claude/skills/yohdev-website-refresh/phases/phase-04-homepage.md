# Phase 04 - Home Page

## Purpose
Build the high-fidelity home page using locked design tokens.

## Inputs
- Locked system tokens from Phase 03
- Personas and target audience
- Strategy and positioning
- Current website analysis
- Brand assets

## Process
0. Read `docs/DESIGN-CRAFT.md`. The bar is a page a client can't tell was generated.

1. Structure planning
   - Sticky header with responsive nav (desktop links + right-side hamburger fly-out on mobile)
   - Hero with the primary CTA — anchored, not a centered badge-headline-two-buttons stack
   - Then a **module sequence**, one different module per section (DESIGN-CRAFT §6 has the library:
     statement paragraph, bleed split, readout bar, hairline matrix, bento, ledger, spec table, photo
     split, full-bleed band, authored gallery, scrollytelling/tabbed stage, giant-link footer…).
     No two neighbors alike; at most one plain equal-card row on the page.
   - One primary action named the same everywhere, repeated at escalating scale; the conversion
     designed for the client's real job (e.g. an urgency selector, the right file types)
   - Footer with navigation

2. Content creation
   - Write real copy (no lorem ipsum)
   - Pull from strategy pillars
   - Match brand voice
   - Focus on primary persona

3. Visual implementation
   - Apply design tokens consistently; every ornament maps to a row in the concept's rationale table
   - Use real imagery, curated by position and unified by one treatment; labeled placeholders only as
     a fallback. No generic SVG illustration — if there are no photos, visualize what the product does
   - Motion in the locked register: add the before-paint gate
     (`document.documentElement.classList.add('js')`, plus `motion` when reduced motion is off), scope
     every hidden state under it, reveal once, never leave an image invisible waiting for a trigger,
     pause canvas/rAF loops off-screen, keep LCP content visible in < ~1s
   - Plumbing: `scroll-padding-top` for the sticky header; closed drawer `visibility:hidden` or `inert`
   - Ensure responsive design at every breakpoint (mobile-first; multi-column grids collapse to one column, no horizontal scroll at 360px)
   - Header nav collapses to a right-side hamburger fly-out on mobile — backdrop, close on backdrop/Esc/button, `aria-expanded`, body-scroll lock. Copy the pattern from `reference/Homepage.html`

4. Refinement — the subtraction pass (DESIGN-CRAFT, end of doc)
   - Screenshot desktop and 390px mobile, scrolling so reveals fire; squint: can you name the concept?
   - List every ornament; delete any without a rationale row. Add each removal to the
     *Removed — do not reintroduce* list
   - Read every headline aloud: client's words, sentence case, period, no em dash, no stock phrase
   - `npm run craft:scan` — fix every error; fix or answer every warning in `02-…`
   - Check accessibility; test viewports; iterate

## Outputs
- `output/Homepage.html`
  - Fully styled, responsive page with a mobile hamburger fly-out nav
  - Real copy throughout
  - All CTAs functional
  - Production-ready code

## Exit Criteria
- Page matches all Phase 01 decisions
- Uses only locked tokens from Phase 03
- `npm run craft:scan` has no errors and every warning is fixed or answered
- All copy is real and on-brand — advances automatically, no approval pause (the accessibility hard
  gate lands in Phase 05)