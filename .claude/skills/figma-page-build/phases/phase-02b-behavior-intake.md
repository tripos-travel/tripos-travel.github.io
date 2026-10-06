# Phase 02B — Behavior Intake

## Purpose
A Figma comp is a still picture. It has no hover, no scroll response, no open and closed states,
no motion. Those are real design decisions and **none of them can be extracted** — so unless
somebody supplies them, whoever builds the page invents them silently.

So they get asked for, like every other input this pipeline needs.

## Menu design and behavior is a required input

Alongside the node URL, the PNG renders and the exported assets, the process asks for **the menu
design and how it should behave** — desktop and mobile.

What that looks like in practice is up to the designer. A frame per state is ideal. A written note
is fine. A pointer to another site to match is fine. What is not fine is nothing, because nothing
means the builder decides, and the builder deciding is how a client's navigation ends up behaving
in a way nobody chose.

Ask for it at kickoff, not mid-build:

> For the navigation, please provide how it should look and behave at desktop and at mobile —
> whatever form is easiest. Frames for the open and closed states are ideal; a written note works
> too. Include anything it does on scroll.

The same request applies to any other interactive component the design implies — forms, carousels,
accordions, modals, sticky CTAs. Nav is just the one that always exists.

## Where the answer comes from

In priority order. Each recorded with which tier it came from:

| Tier | Source | Standing |
|---|---|---|
| 1 | A **state frame** in the Figma file | Extracted — it's a node like any other, so its tokens come through the normal pipeline |
| 2 | A **designer annotation or note** | Stated intent — confirm the reading, don't reinterpret |
| 3 | An **answer from the operator** | Chosen, and recorded as chosen |
| 4 | A **flagged default** | Assumed — reported in the delivery summary, never silent |

Tier 1 is worth pushing for because a state frame isn't just documentation — it's a node, so Phase
01 captures it, Phase 02 extracts its values, and the render corroborates them. Drawer width,
backdrop opacity, panel background, divider colour all become extracted rather than guessed.

Only ask about what tiers 1 and 2 didn't answer, and never ask what the capture already knows —
item count, nesting depth, whether there's a CTA in the bar are all on disk after Phase 01.

## Read the annotation margin

A review board is routinely wider than the design it contains, and the surplus holds the
designer's notes. Phase 02 excludes those nodes from the **build** — correctly, they aren't page
content. They must not be excluded from the **process**.

This isn't hypothetical. The first real file this pipeline ran (`RFH-26002`, Home Round 6) carried
**17 behavioral notes** in its margin — *"the numbers count up as a user gets to this section"*,
*"each of the 4 items appear as a user scrolls"*, *"logos shift left and continuously loop"* —
plus a pointer to a further board of animation specs. The first build shipped none of it, because
the notes had been filtered out as off-canvas noise. The design was fully specified; the process
dropped the spec.

Extract every text node in that margin to `06-design-notes.md`, keyed to the nearest on-canvas
element. Treat each as a claim to confirm, not an instruction to execute. Follow pointers to other
boards — a comp referencing an animation-spec screen means Phase 01 needs that node too.

## Output

`behavior.config.json` beside the token files, every entry carrying its source tier — the same way
tokens carry `bound` / `verified` / `inferred`. A rebuild reads it instead of re-asking, so
behavior can't quietly change because a different person answered differently.

`07-design-request.md` lists whatever is still unanswered, phrased as a hand-off design can act on.
Same shape and purpose as `03-asset-handoff.md`: the build proceeds on flagged defaults, and the
request list is what turns those defaults into decisions next round.

## Two things that hold regardless of the design

- **Motion respects `prefers-reduced-motion`**, and content revealed on scroll stays visible when
  animation is suppressed. Content that only exists after an observer fires is content some users
  never get.
- **`ada-scan` cannot see any of this.** It's a static analyzer and says so in its own header, so
  open panels, drawers, focus traps and scroll-hidden headers are invisible to the check that gates
  merges. A green scan is not evidence that JS-driven behavior is accessible — that pass is manual,
  and it's part of Phase 03's exit criteria.

## Exit criteria
- Every interactive component has a sourced behavior or a flagged default
- `06-design-notes.md` written; every annotation read and either applied or explicitly declined
- `behavior.config.json` written with sources
- `07-design-request.md` lists what design still owes
- Defaults surfaced in the delivery summary, not buried

## Next
→ Phase 03 — Build, Verify & Deliver
