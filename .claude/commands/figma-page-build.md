---
description: Convert a Figma design node into token-driven static HTML, verified against a PNG render of the design
argument-hint: [node-specific Figma URL] [path to PNG render(s)] [notes]
---

Run the **`figma-page-build`** skill.

## Step 1 — Load the skill

Read these files before doing anything else, in this order:

1. `.claude/skills/figma-page-build/SKILL.md` — identity, required inputs, operating principle,
   confidence model, key rules, failure modes, quality checklist.
2. `.claude/skills/figma-page-build/phases/phase-01-figma-capture.md`
3. `.claude/skills/figma-page-build/phases/phase-02-tokens-and-component-map.md`
4. `.claude/skills/figma-page-build/phases/phase-02b-behavior-intake.md`
5. `.claude/skills/figma-page-build/phases/phase-03-build-verify-deliver.md`

Then follow the skill exactly. The phase files are authoritative; this command is only the entry point.

## Step 2 — Take the arguments

The operator supplied: $ARGUMENTS

Interpret them as any of: the node-specific Figma URL (must contain `?node-id=`), paths to full-page
PNG renders, paths to exported assets, the target brand, or notes on menu/nav behavior.

## Step 3 — Check the inputs before spending a single Figma call

Do not start Phase 01 until you have confirmed, and state which are missing:

- [ ] **Node-specific** Figma URL containing `?node-id=` — a bare file URL is not usable
- [ ] Figma MCP connector authenticated, on a **Dev or Full** seat (use the YohDev team, not a personal one — a View seat exhausts mid-capture)
- [ ] Full-page **PNG render** per breakpoint (desktop ~1440, mobile ~390) — nominally optional, changes output quality more than anything else, and is the only thing the build can be verified against
- [ ] Exported image **assets**, if the design uses photography or illustration — bytes cannot come through the connector
- [ ] **Menu design + behavior**, desktop and mobile — a still comp has no behavior; if nobody supplies it, do not invent it silently

If renders or nav behavior are missing, ask for them using the request wording in the skill rather
than proceeding on guesses.

## Step 4 — Honor the non-negotiables

- **Capture once, iterate offline.** Every Figma call happens in Phase 01 and is written verbatim to
  `00-figma-capture/` with a call ledger. Phases 02, 02B and 03 read disk and never call Figma. If
  you are about to call a Figma tool outside Phase 01, stop — the answer is already captured.
- **Stop at the Phase 02 gate.** `inferred` tokens require a human to rename / drop / confirm in
  `tokens.lock.json`, and `npm run figma:check` is the gate. Do not build past it unattended.
- **Verify, don't assert.** Phase 03 is not done until `npm run figma:diff` has produced the
  band-based comparison against the design render, and `npm run ada:scan` and
  `npm run structure:scan` pass.
- **No invented copy.** Copy comes from Figma text nodes or an explicit override file. Placeholder
  copy gets built, visibly marked, and reported in `05-copy-report.md` — never passed off as real.
- **Accessibility wins over fidelity**, and every departure from the comp gets reported.

Finish by summarizing what was produced, what still needs a human, and what design still owes
(`07-design-request.md`).
