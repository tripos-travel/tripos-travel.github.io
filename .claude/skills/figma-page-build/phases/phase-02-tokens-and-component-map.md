# Phase 02 — Tokens, Confirm & Component Map

## Purpose
Turn the raw capture into a design-system-shaped token set the build can actually use — and put a
human in front of every value that is a guess.

**No Figma calls happen in this phase.** Everything reads `00-figma-capture/`.

## 1. Normalize

```bash
npm run figma:tokens -- --capture=demos/<brand>/output/00-figma-capture
```

Writes into `demos/<brand>/output/`:

| File | What it is |
|---|---|
| `tokens.json` | The full token model with provenance, evidence, and warnings |
| `tokens.css` | `:root` custom properties — what the build links |
| `02-component-inventory.md` | Every build target mapped to its Figma node ID |
| `03-asset-handoff.md` | What arrived, what's outstanding, what to export |
| `05-copy-report.md` | Every text node's copy, which strings are placeholder, and how to override them |

Read the console output before moving on. It reports the confidence split, what the renders
corroborated, dominant render colors the capture **missed** (usually inside an asset or an effect),
and any capture truncation.

## 2. Understand the confidence split

| Confidence | Source | Action |
|---|---|---|
| `bound` | A real Figma variable | Trust it, name and all |
| `verified` | Inferred, then corroborated by pixel coverage in a render | Trust it |
| `inferred` | Scraped from design context | **Confirm it** |

A file with no bound variables is normal, not broken — it just means most tokens land in `inferred`
and the renders and the lock file do the work.

### What the renders are doing here
The normalizer decodes the PNGs and measures how much of the page each color actually covers. A
token the render shows at ≥0.2% coverage is promoted to `verified` and leaves the confirm queue.
Colors covering ≥1% of a render that appear **nowhere** in the capture are reported as candidates —
those are almost always inside an exported asset or an effect the connector didn't surface, and they
are worth a look before you build.

This is why asking for renders in Phase 01 matters: it converts a long list of "please eyeball these
hexes" into a short list of genuine judgment calls.

## 2b. Spacing, when the comp has no auto-layout

A visual comp positions everything absolutely and declares no padding, gap or `itemSpacing`, so
spacing extraction returns **zero**. The rhythm is still there, just implied — four cards sitting
17px apart are telling you the gutter even though nothing states it.

So the normalizer measures it: gaps between adjacent siblings that share a row or a column, plus the
page gutter from the modal left edge of on-canvas content (which also gives `--container`). On the
first real file this produced `--gutter: 100px` and `--container: 1240px`, matching what a human had
independently hand-authored.

Two things to know when reviewing it:

- **It is `inferred` by definition.** It is a reading of the design, not a declaration by it. A
  one-off 37px gap between two unrelated boxes is not a token.
- **Near-neighbours are clustered.** A hand-positioned comp never lands on exact multiples, so 30 /
  32 / 36 / 38 is usually one step measured four times. They collapse onto the most-used member so
  you review a scale rather than a transcript. Values from bound variables are never absorbed.

Prune hard in the lock file. The small end (2px, 6px) is normally sub-component drift, not system
spacing.

## 3. Confirm and lock — the gate

```bash
npm run figma:lock -- --capture=demos/<brand>/output/00-figma-capture
```

Writes `tokens.lock.json` pre-filled with generated names, the confidence, use counts, and the
render evidence. Now put it in front of a human. For each unconfirmed entry they:

- **rename** it to what the design system actually calls it — the generator deliberately writes
  descriptive names (`accent-1`, `surface-alt`) rather than semantic ones, because deciding that a
  color is "primary" is precisely the judgment being delegated;
- **`"drop": true`** the noise — one-off values from a stray nested vector are not tokens;
- **`"confirmed": true`** what survives.

Then:

```bash
npm run figma:check -- --capture=demos/<brand>/output/00-figma-capture
```

Exit 0 means build-ready. It fails while any inferred token is unconfirmed, and it fails if the
capture was truncated by a call limit.

### Things worth confirming carefully
- **Band/background hexes** — the ones the ticket flags. Cross-check against the render evidence
  note in the lock file; a color at 40% coverage is a band, a color at 0.3% is an accent.
- **Radii** — a design comp often has several near-identical values (8, 10, 12). Usually one system
  value plus rounding noise. Pick one, drop the rest.
- **Breakpoints** — inferred from top-level frame widths, which is a canvas decision, not a
  declaration. Confirm the real breakpoints with whoever owns the design.
- **Spacing** — the normalizer snaps to a 2px grid and keeps repeated steps, but it can still carry
  a one-off. Anything used once is suspect.

## 3b. Copy — real, placeholder, and overridden

Read `05-copy-report.md`. Figma names text layers after their content, so the node tree carries the
real copy — and any copy that isn't real yet.

The rule is **build it, mark it, report it**. An unresolved placeholder is built as-is and flagged
visibly in the page; it is never quietly presented as finished copy, and it never stops the build.
Blocking on it would stall layout work while copy is still being written, which is the normal state
of a design in review.

To resolve one, put the real text in `00-figma-capture/copy-overrides.json`:

```json
{ "1429:2015": "The headline as it will actually ship" }
```

Overrides are applied verbatim and win over the comp. Together with the Figma text nodes they are
the **only** two sanctioned sources of copy — writing it yourself is not one.

## 4. Reconcile against the brand's existing design system

If `demos/<brand>/` already exists, **its established tokens win.** Open a sibling page and diff:

- Same value, different name → keep the brand's name.
- Value close but not equal (`#0f2b46` vs `#0e2a45`) → the brand's value wins; the drift is a
  rounding artifact, not a new token.
- Genuinely new value with no counterpart → flag it. A design introducing a color the live system
  doesn't have is a **design question**, not a build decision. Raise it; don't silently fork.

Record every reconciliation in the component map so a reviewer can see what was decided.

## 5. Map components

Take `02-component-inventory.md` and map each Figma node onto a component in the brand's system.
Append the mapping to that file:

| Figma node | Figma name | Maps to | Notes |
|---|---|---|---|
| `12:400` | Header | `header-nav` (existing) | Verbatim reuse |
| `12:410` | Hero | `hero-section` (existing) | Split hero, image right |
| `12:421` | Card / Value | `value-card` (existing) | 3-up grid, stacks at tablet |
| `12:490` | Footer | `footer` (existing) | Verbatim reuse |

Rules:
- Reuse existing components **verbatim** wherever the design allows.
- A new variant is allowed only when the design genuinely has no match — and only from existing
  tokens. No new colors, fonts, or radii sneak in through a variant.
- Component/pattern work belongs in the brand's **Style Guide** page if it has one, never a new
  standalone artifact.
- Note anything in the inventory you are deliberately **not** building, and why.

## Exit criteria
- `npm run figma:check` exits 0
- Token names reconciled against the brand's existing system, conflicts raised
- Every section to be built has a row mapping it to a Figma node ID
- Asset hand-off list sent to the operator

## Next
→ Phase 03 — Build, Verify & Deliver
