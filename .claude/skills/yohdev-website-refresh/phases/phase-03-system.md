# Phase 03 - System

## Purpose
Define and lock the design system tokens before building components.

## Inputs
- Research from Phase 02
- Logo and colors from handoff
- Brand identity guidelines
- Intake decisions

## Process
1. Define color palette (`docs/DESIGN-CRAFT.md` §5)
   - Neutrals named after the client's materials and tinted toward the brand hue — never #333 / #F5F5F5,
     never pure black or white
   - One accent. For every locked brand color derive AA-safe companions: a line tone, a text-on-light
     tone, a text-on-dark tone. A light logo color is never text.
   - A contrast matrix (every foreground × every surface it may sit on) and written allowed-use rules
     ("600 is never text on dark")
   - Scarcity rules: which surface is used once (e.g. the dark panel behind the conversion)
   - At most one signature finish, derived from a brand asset, with where it may appear
   - Semantic colors (success, warning, error)

2. Establish typography (`docs/DESIGN-CRAFT.md` §4)
   - Roles, one job per face: display / reading / label-or-data. A display face with a point of view
     (defaults like Inter/Roboto/Poppins are for body only)
   - Scale with extreme contrast and a missing middle (display ≈ 6× body); tracking that tightens with
     size and widens for small caps; optical width as a token if the family has a `wdth` axis
   - Line heights, measures in `ch`
   - Self-hosted `woff2` with shape-matched fallbacks

3. Set spacing system
   - Base unit
   - Spacing scale
   - Container widths
   - Grid system

4. Define visual style
   - Edge geometry as one token (radius 0, one radius, or one chamfer shape) — locked in `theme.json`
   - Structure: hairlines over shadows (shadows only where something truly floats)
   - Icon style — or no icons: numbered/typographic devices when the concept supports them

5. Lock the motion register (`docs/DESIGN-CRAFT.md` §8)
   - Register from Phase 02: **Mechanical** (causal hovers, 180/260ms), **Editorial-slow** (opacity
     reveals 1.2–2.4s, image settle, no wipes), or **Kinetic** (masked word rises, choreographed hero,
     scroll-linked effects, pointer physics on fine pointers only)
   - One or two easing tokens (`--ease-out`, `--ease-io`) and a duration scale — used everywhere
   - The signature interaction (one hover or reveal motif repeated across pages)
   - The before-paint `.js`/`.motion` gate and the reduced-motion behavior

6. Start the **Removed — do not reintroduce** list: every default device considered and rejected, and why

## Outputs
- `output/03-system-tokens.md`
  - Complete token documentation, incl. easing/duration tokens and the motion register
  - Usage guidelines and allowed-use rules per color
  - Contrast matrix and accessibility notes
  - The concept's rationale table (device → source) and the *Removed — do not reintroduce* list

- `output/Style Guide.html` (60% complete)
  - Token visualization
  - Color swatches
  - Type specimens
  - Spacing examples

## Exit Criteria
- All tokens defined and documented
- Style Guide shows all tokens
- Tokens are accessibility compliant
- Tokens are LOCKED automatically once documented — no approval pause; later phases build only from
  these locked tokens