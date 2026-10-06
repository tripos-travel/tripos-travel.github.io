# Phase 06 - Package

## Purpose
Produce the audience-split **brand books** and assemble the final deliverable package for client
handoff. Three tiers, each labeled for its audience, fronted by a routing hub:
- **Brand Basics** (`Brand-Basics.html`) — a plain-language marketing one-pager, "For marketing &
  owners", **no code/jargon** (palette, the two fonts, buttons, building blocks, do's & don'ts).
- **Brand Playbook** (`Playbook.html`) — the full brand story, "For brand & stakeholders" (positioning,
  audience, personas, voice & tone, messaging, design rationale).
- **Design System** (`Style-Guide.html`, from Phase 05) — "For designers & developers".
- **Brand Books** (`Brand-Books.html`) — the hub that routes each audience to the right guide.

All are mobile-responsive and must pass `npm run ada:scan`. Generalize the structure from
`reference/Brand-Basics.html` and `reference/Brand-Books.html`; adapt to the client's tokens.

## Inputs
- All outputs from Phases 01-05
- Structured intake data (`intake/answers.json` — see `reference/intake-contract.md`)
- Client branding

## Process
1. Build the brand books
   - Brand Playbook (`Playbook.html`): apply client tokens; positioning, audience, personas, voice,
     messaging, decisions & rationale — labeled "For brand & stakeholders"
   - Brand Basics (`Brand-Basics.html`): the plain-language one-pager, no code — labeled
     "For marketing & owners"
   - Brand Books hub (`Brand-Books.html`): route to Brand Basics, Brand Playbook, and the Design System

2. Organize deliverables
   - Copy final Homepage.html
   - Copy final Style-Guide.html (the Design System)
   - Copy Playbook.html, Brand-Basics.html, and Brand-Books.html
   - Organize all assets
   - Archive the intake snapshot (`intake/answers.json` → `brief/intake-answers.json`)

3. Write the structure contract
   - Create `demos/<brand>/site.manifest.json` declaring the canonical pages this skill produced:
     `Homepage.html` (role `homepage`), `Style-Guide.html` (role `style-guide`, and `components.home`),
     `Brand-Books.html` (role `hub`), `Playbook.html` + `Brand-Basics.html` (role `brand-book`). This makes
     the Style Guide the single home for component/pattern work, so later page builds fold components in
     rather than spawning a stray artifact. Schema: `demos/README-manifest.md`.

4. Create documentation
   - Write deployment README
   - List all placeholders/stubs
   - Document next steps
   - Include technical requirements

5. Final quality check
   - Validate all HTML
   - Check all links
   - Verify asset paths
   - Test deployment locally
   - `npm run ada:scan` is clean, `npm run craft:scan` has no errors (warnings answered), and the
     `structure-fix` loop leaves `npm run structure:scan` clean (no
     orphan pages, no broken links; every produced page declared in `site.manifest.json` and reachable from
     the hub). The loop auto-repairs drift and only pauses to confirm before deleting/overwriting a page.

## Outputs
Final folder structure:
```
{{client-slug}}-website-refresh/
├── Homepage.html
├── Brand-Books.html        # routing hub (start here)
├── Brand-Basics.html       # marketing one-pager — for marketing & owners
├── Playbook.html           # Brand Playbook — for brand & stakeholders
├── Style-Guide.html        # Design System — for designers & developers
├── site.manifest.json      # structure contract (canonical pages + component home)
├── assets/
│   ├── logos/
│   ├── imagery/
│   └── fonts/
├── theme/
│   └── theme.json
├── brief/
│   └── intake-answers.json # snapshot of the intake data this build was generated from
├── output/
│   └── [all phase outputs]
├── README.md
└── .nojekyll
```

## Exit Criteria
- All files in correct locations
- `site.manifest.json` written and `npm run structure:scan` clean (no orphans, no broken links)
- README complete with instructions
- Package ready for deployment
- No blockers for client handoff