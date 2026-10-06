# Phase 05 - Design System (Style Guide)

## Purpose
Complete the **Design System** — the technical source of truth **for designers & developers**:
tokens, type scale, the component set, and theme files. This is the dev-facing artifact (code and
specs); the stakeholder/marketing brand guides are produced in Phase 06. Label it clearly for its
audience ("For designers & developers"). It must be mobile-responsive (grids collapse; no horizontal
scroll at 360px) and pass `npm run ada:scan`.

## Inputs
- Approved Homepage from Phase 04
- Locked tokens from Phase 03
- Component patterns from Homepage

## Process
1. Extract components from Homepage
   - Buttons (all states)
   - Navigation patterns
   - Cards and containers
   - Forms and inputs
   - Typography examples
   - Icons and imagery

2. Document each component
   - Visual examples
   - HTML markup
   - CSS classes
   - Usage guidelines
   - Accessibility notes

3. Create theme files
   - Generate `theme.json` for WordPress
   - Document CSS custom properties
   - Export token values

4. Complete documentation
   - Implementation notes
   - Component variations
   - Do's and don'ts
   - Maintenance guidelines

## Outputs
- `output/Style-Guide.html` — the Design System (100% complete), audience-labeled "For designers & developers"
  - All tokens documented
  - All components with examples
  - Code samples for each
  - Usage guidelines
  - Responsive; passes `npm run ada:scan` (see `reference/Style-Guide.html`)

- `output/theme.json`
  - WordPress block theme config
  - All design tokens
  - Component definitions

## Exit Criteria
- Every Homepage component documented
- theme.json validates correctly
- All code samples tested
- **Hard gate:** `npm run ada:scan` is clean and `npm run craft:scan` has no errors — these
  deterministic checks gate advancing to Phase 06 (no human-approval pause)
- The Style Guide documents the motion register and easing tokens, renders the signature interaction
  live, and carries the *Removed — do not reintroduce* list; `theme.json` locks radius, palette and
  font sizes (`custom:false`, `customFontSize:false`) and records motion values in `settings.custom`