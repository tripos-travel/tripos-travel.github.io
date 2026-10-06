# Guided Build Skill

## Identity
- **Name:** `guided-build`
- **Display name:** Guided Build
- **Description:** A simple, conditional front door for building brand pages. A non-technical user picks a **source** (From Legacy, From Scratch, or From Figma) and a **scope** (single page or pillar cluster), answers a short plain-language intake, and adds any custom context or uploads at the end. The skill applies sensible defaults and routes to the right builder so a first-time user lands the same quality of output an expert operator would.
- **Version:** 1.0.0

## Activation Triggers
This skill activates when:
- User says "guided build", "start a build", "build me a page", "help me build something", or types `/guided-build`
- A non-technical user asks to create or rebuild a page/site but hasn't named a specific skill
- User is unsure which builder to use and wants to be walked through it

When a user already knows exactly what they want (e.g. "rebuild this URL into our design system"), it's fine to skip straight to the underlying skill. Guided Build is for when the path isn't pre-decided.

## Operating Principle — one decision per screen, never block on a blank
Walk the user through the smallest possible set of choices, each on its own screen, using `AskUserQuestion`. Fill any blank with a sensible, **flagged** default rather than stalling — a defaults-only run must still produce complete output. The aim is parity: a guided run should be indistinguishable from a run an expert would have set up by hand.

Do **not** invent brand facts or copy. Defaults govern *build decisions* (which builder, layout fallbacks, meta descriptions); content always comes from the user, a brief, or the legacy source.

## The Flow

### Screen 1 — Source
`AskUserQuestion`: "Are we starting from an existing website, a design, or from scratch?"
- **From Legacy** — there's a live page/site to rebuild into our design system.
- **From Scratch** — no source site; we'll build from a brief.
- **From Figma** — there's an approved design comp to implement.

### Screen 2 — Scope
`AskUserQuestion`: "Building one page, or a whole pillar/cluster (a hub page plus its spoke pages)?"
- **Single page** — one page.
- **Pillar cluster** — a hub/pillar page and its spokes, built and wired together.

> Pillar cluster is available under **Legacy** and **Scratch**. **From Figma** builds one page per
> run — a cluster from a design means running it once per designed board, since each board needs its
> own capture, confirmation, and visual check.

### Screen 3 — Simplified intake
Ask a short, batched set of plain-language questions tailored to the source/scope. Keep it to one `AskUserQuestion` batch where possible.

**From Legacy:**
1. Which brand / design system should this match? *(Auto-detect from `demos/*/` — list detected brands as options; default to the obvious one when there's a single match.)*
2. The source URL(s):
   - Single page → one URL.
   - Pillar cluster → the **hub URL** and each **spoke URL** (explicit; one cluster only).

**From Figma:**
1. Which brand / design system should this match? *(Auto-detect from `demos/*/` as above.)*
2. The **node-specific** Figma URL — `?node-id=…`. In Figma: select the frame → right-click →
   **Copy link to selection**. A plain file URL is not enough; say so plainly and ask again.
3. Which Figma seat is the account on — **View, Dev, or Full**? A View seat runs out of connector
   calls partway through a capture, so it's worth knowing before starting rather than after.
4. **Do you have a PNG export of the design?** Full page, one per breakpoint (desktop ~1440,
   mobile ~390). Ask for it every time. It is optional to the tooling and it is the difference
   between a build that was checked against the design and one that was only checked against
   itself — it is also what lets the tool confirm colors from evidence instead of asking the user
   to eyeball a list of hex codes.
5. Any exported image assets (logos, photography)? Image bytes can't come through the Figma
   connector, so anything not supplied becomes a labeled placeholder.

**From Scratch** (a distillation of the canonical intake — see Reuse):
1. **Most important message** — the single thing this must communicate.
2. **Who it converts** — the one primary visitor.
3. **One action** — what you want them to do.
4. **Tone** — what voice to hit, and what to avoid.
5. **Content on hand** — paste headlines/bullets/stats/bios, or say what you have.
6. *(Pillar cluster only)* the hub topic + each spoke topic (one cluster only).

For any unanswered item, apply a flagged default (e.g. derive a meta description from on-page copy; use the brand's default hero layout) and record it so the user sees the assumption.

### Screen 4 — Add custom context or uploads (every path)
Before building, present one open step: "Anything else to fold in? Paste extra context, brand notes, or attach documents/images now." This is the catch-all for anything the structured questions didn't capture. Incorporate whatever is provided; proceed if nothing is.

### Route to the builder
| Source | Scope | Route to |
|---|---|---|
| From Legacy | Single page | `legacy-page-rebuild` |
| From Legacy | Pillar cluster | `pillar-cluster` (legacy mode) |
| From Scratch | Single page | `net-new-page` |
| From Scratch | Pillar cluster | `pillar-cluster` (scratch mode) |
| From Figma | Single page | `figma-page-build` |
| From Figma | Pillar cluster | `figma-page-build`, once per designed board |

Hand off the gathered context (brand/design system, URLs or brief, custom context/uploads) to the target skill, which runs its normal phases and produces its normal provenance artifacts + output. Guided Build adds no new output format of its own.

## Key Rules
- **One cluster at a time.** If the user describes multiple clusters, build one and tell them to run the others as separate builds (the cluster builder enforces this too).
- **Never block on a blank** — default and flag.
- **No invented content** — defaults cover build decisions only, never brand claims or copy.
- **Match the existing design system** — the underlying builders reuse the brand's tokens/components verbatim; Guided Build never introduces new visual styling.
- **Stay on the beaten trail (self-heal)** — the builders honor the brand's `site.manifest.json` (if present): components go in the Style Guide, new pages get wired into the hub + nav + sitemap. If a build drifts, the `structure-fix` loop repairs it automatically and only checks with the user before deleting a page — a non-technical user never sees a raw scanner error. Guided Build never spawns a standalone page/component file of its own. See `demos/README-manifest.md`.
- **Plain language** — phrase every screen for a non-technical user; avoid jargon.
- **Designer bar** — every builder it routes to follows `docs/DESIGN-CRAFT.md` and must clear
  `npm run craft:scan`. A first-time user should get a page nobody can tell was generated; one
  intake question worth asking is *"what's a story, phrase or detail only your business has?"* —
  that answer usually becomes the concept.

## Reuse (don't reinvent)
- **Question banks:** the 4 focused questions in `net-new-page/phases/phase-01-context-intake.md`, and the 10 canonical questions in `yohdev-website-refresh/SKILL.md` — the From-Scratch intake is a distillation of these.
- **Brand detection:** `legacy-page-rebuild` → "Brand Layer Detection & Reuse" (auto-detect the design system from `demos/*/`).
- **Builders:** `legacy-page-rebuild`, `net-new-page`, `pillar-cluster`.
- **Imagery:** `brand-imagery` — after a build, offer to fill any image placeholders with real
  on-brand images if the brand has `imagery.profile.json`. Phrase it plainly ("want me to fill in
  the pictures?"), never mention tokens or prompts unless asked.

## Outputs
No artifacts of its own. The routed builder produces the pages, assets, and provenance (`01-…`/`02-…` records). Guided Build's only job is to gather the right context simply and route correctly.

## Failure Modes
- **User unsure of the brand:** auto-detect from `demos/*/`; if still ambiguous, show the detected list and let them pick.
- **Legacy URL unreachable:** hand the situation to `legacy-page-rebuild`, which asks the user to paste content.
- **Figma URL has no `node-id`:** ask again with the "Copy link to selection" instruction. Don't route on a bare file URL.
- **Figma connector not authenticated, or a View seat:** say what will happen (capture may truncate mid-run) before starting, and let the user decide whether to proceed or sort the seat out first.
- **No PNG render available:** proceed, but tell the user the build won't be verifiable against the design and ask them to send one when they can.
- **Multiple clusters requested:** build one, note the rest must be separate runs.
- **No content provided in From Scratch:** flag that the build will use defaults/placeholders for unfilled sections and confirm before routing.
