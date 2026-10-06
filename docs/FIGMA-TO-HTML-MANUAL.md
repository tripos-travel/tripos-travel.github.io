# Figma File → HTML Conversion Tool — Manual

**Tool:** `figma-page-build` (Claude skill + offline Node scripts)
**Repo:** `yd-website-playbook`
**Status:** working; first real end-to-end run completed 25 Aug 2026 against `RFH-26002-Website-Design`
**Related ticket:** ClickUp `86bbhvr1z` (Rainfall Health, Milestone 0b)

---

## Part 1 — Read this first

### What the tool does

It turns a **Figma design frame** into **clean, token-driven static HTML** built on the client's
existing design system — and then *checks the result against a PNG render of the design* rather than
declaring it correct.

It is the third **source** in the playbook's build system, alongside `legacy-page-rebuild` (builds
from a live URL) and `net-new-page` (builds from a written brief). This one builds **from a design**.

### What it is *not*

- **Not a one-click converter.** It is a four-phase pipeline with a human approval gate in the
  middle. Somebody has to confirm the guesses before the build runs.
- **Not a standalone CLI.** The Figma read calls only exist inside an agent session (the Figma MCP
  connector), so the "tool" is a skill that drives a set of offline Node scripts. The scripts can be
  re-run by hand any number of times; the *capture* step cannot.
- **Not a pixel differ.** Verification is band-based and deliberately tolerant — see
  [The visual diff](#the-visual-diff).
- **Not a copywriter.** Copy comes from the Figma text nodes or from an explicit override file.
  Nothing is written for you, and nothing is transcribed out of a PNG.

### The one governing principle

> **Capture once, iterate offline.**

The Figma connector is a **metered, exhaustible resource**. Phase 01 spends the entire call budget
in one pass and writes every raw response to disk. Phases 02, 02B and 03 **never call Figma** — they
read the capture, so you can re-run them freely.

If a Figma call happens outside Phase 01, something is wrong: the answer is already on disk, or it
belongs in a targeted re-capture of specific nodes.

---

## Part 2 — Operator walkthrough

This part assumes no command line. It is what to collect, how to start a run, and what you will be
asked to approve.

### Step 1 — Collect the inputs

| Input | Required? | Why it matters |
|---|---|---|
| **Node-specific Figma URL** (contains `?node-id=…`) | **Yes** | The connector reads a *node*, not a file. A bare file URL returns nothing useful. In Figma: select the frame → right-click → **Copy link to selection**. |
| **Authenticated Figma MCP connector** | **Yes** | Every capture call goes through it. |
| **A Dev or Full Figma seat** | **Effectively yes** | Call budget is tied to seat. See [the seat constraint](#the-figma-seat-constraint) — this is currently the #1 blocker. |
| **Full-page PNG render per breakpoint** | Strongly recommended | Ground truth for composition, evidence that promotes guessed colors to verified, and the only reference the finished build can be *checked against*. |
| **Exported image assets** | When the design uses photography or illustration | Asset **bytes** cannot be pulled through the connector. They have to be exported by hand. |
| **Menu design + behavior**, desktop and mobile | **Yes** | A still comp contains no behavior. If nobody supplies it, the builder invents it silently. |

#### Please send the renders

They are nominally optional and they change output quality more than anything else on that list.

Design context tells you a hex *exists somewhere* in the file. The render tells you it covers **14%
of the page** — the difference between a stray value in a nested vector and the actual band color.

Ask for **one tall full-page PNG per breakpoint**: desktop (~1440 wide) and mobile (~390 wide).
Figma's default export is fine (non-interlaced, 8-bit). One full-page shot beats several cropped
sections. Cropped shots are accepted, but name them for what they show (`hero-desktop.png`) and
expect weaker evidence.

#### Please send the nav behavior

Copy-paste request for the designer:

> For the navigation, please provide how it should look and behave at desktop and at mobile —
> whatever form is easiest. Frames for the open and closed states are ideal; a written note works
> too. Include anything it does on scroll.

The same request applies to any other interactive component the design implies — forms, carousels,
accordions, modals, sticky CTAs. Nav is just the one that always exists.

A **state frame in the Figma file** is the best answer, because a frame is a node: it gets captured,
its values get extracted, and the render corroborates them. Drawer width, backdrop opacity, panel
background and divider color become *extracted* rather than guessed.

### Step 2 — Kick off the run

Hand the agent the node URL, the renders, the assets and the behavior notes, and ask it to build the
page. If you want to be walked through it, use the `guided-build` skill — it is the front door and
routes to `figma-page-build` for you.

### Step 3 — Approve the token list (the one place you are blocked)

The pipeline stops and waits for a human here. You will be shown a list of extracted values —
colors, type sizes, radii, spacing, breakpoints — each carrying **where it came from**:

| Confidence | Means | Needs you? |
|---|---|---|
| `bound` | Read from a real Figma variable — the designer named it | No |
| `verified` | Guessed, then proven by pixel coverage in your render | No |
| `inferred` | Scraped from design context; nobody named it or blessed it | **Yes** |

For each `inferred` entry you do one of three things:

- **Rename** it to what the design system actually calls it. The generator writes descriptive names
  (`accent-1`, `surface-alt`) on purpose — deciding a color is "primary" is exactly the judgment
  being handed to you.
- **Drop** it. A one-off value from a stray nested vector is not a token.
- **Confirm** it as-is.

Worth extra care:

- **Band / background hexes** — cross-check the render evidence note. A color at 40% coverage is a
  band; a color at 0.3% is an accent.
- **Radii** — a comp usually has one system value plus rounding noise (8, 10, 12). Pick one.
- **Breakpoints** — a frame width is a canvas decision, not a declared breakpoint. Confirm the real
  ones with whoever owns the design.
- **Spacing** — anything used only once is suspect.

A file with **no bound variables at all is normal**, not broken. It just pushes more values into the
`inferred` column, where the renders and your review resolve them.

### Step 4 — Read the reports you are handed

| File | What to do with it |
|---|---|
| `03-asset-handoff.md` | The export list. Anything still outstanding is capping real fidelity. |
| `05-copy-report.md` | Every text string, and which ones are still placeholder. |
| `06-design-notes.md` | Every annotation found in the design's margin, as a claim to confirm. |
| `07-design-request.md` | What design still owes — phrased so design can act on it. |
| `04-visual-diff/diff-*.png` | Design on the left, build on the right, agreement strip between. |

### Step 5 — Review and approve the page

Nothing goes live on its own. Opening a PR builds an isolated Surge preview; a **named approver
merging to `main`** is what deploys. Full detail in [DEPLOYMENT.md](DEPLOYMENT.md).

### Two things to expect in every delivery

**Placeholder copy gets built, marked, and reported.** A comp in review routinely ships lorem ipsum
in the slots nobody has written yet. The build does not stop for it and does not quietly pass it off
as real: every unresolved placeholder is **visibly marked in the page** and listed in
`05-copy-report.md`. Blocking instead would stall layout work while copy is still being written —
which is the normal state of a design in review. To clear one, supply the real text as an override.

**Accessibility wins over fidelity.** Design comps regularly use saturated red text over a dark hero
— in Figma that is a color choice and nobody ran a contrast check. The build fixes it with the
brand's tokens and **tells you** where it departed from the comp. It never silently diverges.

---

## Part 3 — Technical reference

### Prerequisites

```bash
npm install     # one time
```

Node ≥ 14. Playwright + Chromium is preferred for screenshots; headless Chrome is the fallback.

### Pipeline at a glance

```
Phase 01  Capture ──────────► demos/<brand>/output/00-figma-capture/   [the only Figma calls]
Phase 02  Tokens & map ─────► tokens.json · tokens.css · 02/03/05 reports   [GATE: figma:check]
Phase 02B Behavior intake ──► behavior.config.json · 06/07 reports
Phase 03  Build & verify ───► index.html · 04-visual-diff/    [GATES: diff · ada · structure]
```

Skill source: `.claude/skills/figma-page-build/SKILL.md` plus `phases/`.

### Phase 01 — Capture

Spend the budget once; get everything onto disk.

**Pre-flight, in order:**

1. **Is the URL node-specific?** `https://figma.com/design/<fileKey>/<name>?node-id=12-345`.
   Note the id format difference — the URL uses `12-345`, the API uses `12:345`. Convert.
2. **Does the seat cover the run?** Ask outright: View, Dev, or Full. A View seat fails
   *mid-capture*, leaving a half-built token set that looks complete.
3. **Budget the calls**, per node, in this priority order:

| # | Tool | Why it ranks here |
|---|---|---|
| 1 | `get_metadata` | The node tree — component inventory and inferred breakpoints. Cheap, high value. |
| 2 | `get_design_context` | The token bearer. Without it there are almost no tokens. |
| 3 | `get_variable_defs` | Bound variables — free naming, top-tier confidence. Skip if the file binds none. |
| 4 | `get_screenshot` | Only if no render was supplied. An operator-exported PNG is better and costs nothing. |

Capture the **top-level page node first**; add section nodes only if the page node's design context
is too shallow to yield tokens.

**Capture directory:**

```
demos/<brand>/output/00-figma-capture/
  capture.json                 # metadata + the call ledger
  variables.json
  metadata.json
  design-context/<node>.json
  renders/desktop.png
  renders/mobile.png
  assets/
  copy-overrides.json          # optional: node-id → real copy
```

**Write raw responses verbatim.** No summarizing, reshaping or pruning — the normalizer is built to
read messy real responses, and a lossy capture cannot be re-read later without spending Figma calls
again.

**The call ledger is not bookkeeping.** `scripts/figma-tokens.js` reads `capture.json`, recognizes
rate/seat/quota errors, reports the capture as incomplete, and **fails `--check`**. Record every
call including failures:

```json
{
  "fileKey": "AbC123…",
  "fileName": "Rainfall Health — Homepage",
  "figmaUrl": "https://www.figma.com/design/AbC123…/Rainfall?node-id=12-345",
  "nodeIds": ["12:345"],
  "seat": "dev",
  "capturedAt": "2026-08-25T14:00:00Z",
  "calls": [
    { "tool": "get_metadata", "node": "12:345", "ok": true },
    { "tool": "get_design_context", "node": "12:410", "ok": false,
      "error": "429 Too Many Requests — quota exceeded for this seat" }
  ]
}
```

An unrecorded failure becomes a silently thin token set that nobody catches until the build looks
wrong.

**Assets.** Image bytes cannot be pulled through the connector. Build the ledger from what the
design references and mark each entry `provided` or `missing`. Export by hand from Figma: **SVG**
for logos and icons, **WebP** (with a PNG fallback) at 1x and 2x for photography.

**Exit criteria:** `capture.json` with a complete ledger · at least `metadata.json` *or* one
`design-context/*.json` · renders filed or their absence flagged · asset manifest written · any
limit failure reported, not swallowed.

### Phase 02 — Tokens, confirm & component map

No Figma calls. Everything reads `00-figma-capture/`.

```bash
npm run figma:tokens -- --capture=demos/<brand>/output/00-figma-capture
```

Writes into `demos/<brand>/output/`:

| File | What it is |
|---|---|
| `tokens.json` | Full token model with provenance, evidence and warnings |
| `tokens.css` | `:root` custom properties — what the build links |
| `02-component-inventory.md` | Every build target mapped to its Figma node ID |
| `03-asset-handoff.md` | What arrived, what's outstanding, what to export |
| `05-copy-report.md` | Every text node's copy, which strings are placeholder, how to override |

**Read the console output before moving on.** It reports the confidence split, what the renders
corroborated, dominant render colors the capture **missed**, and any capture truncation.

#### What the renders do here

The normalizer decodes the PNGs and measures how much of the page each color actually covers.

- A token the render shows at **≥ 0.2% coverage** is promoted to `verified` and leaves the confirm
  queue.
- A color covering **≥ 1%** of a render that appears **nowhere** in the capture is reported as a
  candidate. These are almost always inside an exported asset or an effect the connector never
  surfaced — worth a look before you build.

On the first real run this promoted 3 inferred colors to verified *and* flagged `#eaf1fc` covering
**28.2%** of the page that `get_design_context` never returned. It was the hero panel.

#### Spacing when the comp has no auto-layout

A visual comp positions everything absolutely and declares no padding, gap or `itemSpacing`, so
spacing extraction returns **zero**. The rhythm is still there, just implied — four cards sitting
17px apart tell you the gutter even though nothing states it.

So the normalizer measures it: gaps between adjacent siblings sharing a row or column, plus the page
gutter from the modal left edge of on-canvas content (which also yields `--container`). On the first
real file this produced `--gutter: 100px` and `--container: 1240px`, matching what a human had
independently hand-authored.

Two things when reviewing it:

- **It is `inferred` by definition** — a reading of the design, not a declaration by it.
- **Near-neighbours are clustered.** A hand-positioned comp never lands on exact multiples, so
  30 / 32 / 36 / 38 is usually one step measured four times; they collapse onto the most-used member
  so you review a scale rather than a transcript. Values from bound variables are never absorbed.

Prune hard. The small end (2px, 6px) is normally sub-component drift, not system spacing.

#### Confirm and lock — the gate

```bash
npm run figma:lock  -- --capture=demos/<brand>/output/00-figma-capture   # writes tokens.lock.json
# …human edits tokens.lock.json: rename / "drop": true / "confirmed": true …
npm run figma:check -- --capture=demos/<brand>/output/00-figma-capture   # must exit 0
```

`figma:check` fails while any inferred token is unconfirmed, **and** fails if the capture was
truncated by a call limit.

#### Copy

Figma names text layers after their content, so the node tree carries the real copy — and any copy
that isn't real yet. To resolve a placeholder, put the real text in
`00-figma-capture/copy-overrides.json`:

```json
{ "1429:2015": "The headline as it will actually ship" }
```

Overrides are applied verbatim and win over the comp. Together with the Figma text nodes they are
the **only** two sanctioned sources of copy. Writing it yourself is not one, and neither is
transcribing it from a PNG.

#### Reconcile against the brand's existing design system

If `demos/<brand>/` already exists, **its established tokens win.** Open a sibling page and diff:

- Same value, different name → keep the brand's name.
- Close but not equal (`#0f2b46` vs `#0e2a45`) → the brand's value wins; the drift is a rounding
  artifact, not a new token.
- Genuinely new value with no counterpart → **flag it.** A design introducing a color the live
  system doesn't have is a *design question*, not a build decision. Raise it; don't silently fork.

Record every reconciliation in the component map so a reviewer can see what was decided.

#### Map components

Append the mapping to `02-component-inventory.md`:

| Figma node | Figma name | Maps to | Notes |
|---|---|---|---|
| `12:400` | Header | `header-nav` (existing) | Verbatim reuse |
| `12:410` | Hero | `hero-section` (existing) | Split hero, image right |
| `12:421` | Card / Value | `value-card` (existing) | 3-up grid, stacks at tablet |
| `12:490` | Footer | `footer` (existing) | Verbatim reuse |

Reuse existing components **verbatim** wherever the design allows. A new variant is allowed only
when the design genuinely has no match — and only from existing tokens; no new colors, fonts or
radii sneak in through a variant. Component and pattern work belongs in the brand's **Style Guide**
page, never a new standalone artifact. Note anything you are deliberately **not** building, and why.

### Phase 02B — Behavior intake

A comp is a still picture: no hover, no scroll response, no open and closed states, no motion. Those
are real design decisions and **none of them can be extracted**.

Answers are sourced in priority order, and each entry records which tier it came from:

| Tier | Source | Standing |
|---|---|---|
| 1 | A **state frame** in the Figma file | Extracted — it's a node, so it flows through the normal pipeline |
| 2 | A **designer annotation or note** | Stated intent — confirm the reading, don't reinterpret |
| 3 | An **answer from the operator** | Chosen, and recorded as chosen |
| 4 | A **flagged default** | Assumed — reported in the delivery summary, never silent |

Only ask about what tiers 1 and 2 didn't answer, and never ask what the capture already knows — item
count, nesting depth, whether there's a CTA in the bar are all on disk after Phase 01.

#### Read the annotation margin

A review board is routinely wider than the design it contains, and the surplus holds the designer's
notes. Phase 02 excludes those nodes from the **build** — correctly, they aren't page content. They
must not be excluded from the **process**.

This is not hypothetical. `RFH-26002` Home Round 6 carried **17 behavioral notes** in its margin —
*"the numbers count up as a user gets to this section"*, *"each of the 4 items appear as a user
scrolls"*, *"logos shift left and continuously loop"* — plus a pointer to a further board of
animation specs. The first build shipped **none** of it, because the notes had been filtered out as
off-canvas noise. The design was fully specified; the process dropped the spec.

Extract every text node in that margin to `06-design-notes.md`, keyed to the nearest on-canvas
element. Follow pointers to other boards — a comp referencing an animation-spec screen means Phase
01 needs that node too.

**Outputs:** `behavior.config.json` (every entry carrying its source tier, so a rebuild reads it
instead of re-asking) and `07-design-request.md` (what design still owes).

**Two rules that hold regardless of the design:**

- **Motion respects `prefers-reduced-motion`**, and content revealed on scroll stays visible when
  animation is suppressed. Content that only exists after an observer fires is content some users
  never get.
- **`ada-scan` cannot see any of this.** It is a static analyzer, so open panels, drawers, focus
  traps and scroll-hidden headers are invisible to the check that gates merges. A green scan is
  **not** evidence that JS-driven behavior is accessible — that pass is manual, and it's part of
  Phase 03's exit criteria.

### Phase 03 — Build, verify & deliver

No Figma calls here either.

**1. Gate before building.** `npm run figma:check` exits 0, or stop. Building on unconfirmed tokens
produces a page that looks plausible and encodes guesses — the most expensive kind of wrong, because
nobody catches it until a client does.

**2. Build.**

- Link `tokens.css`, or inline it in a `<style>` block if the brand's sibling pages are
  self-contained. **Match what the brand already does**; don't restructure existing pages.
- Every value in the page comes from a token. If you are typing a hex into markup, either it belongs
  in `tokens.css` or you are about to invent a color.
- Images reference exported assets locally from `assets/images/`. Every missing asset gets a labeled
  placeholder — never a blank box, **never a Figma CDN URL** (those expire):

```html
<!-- IMAGE: Hero background — Figma node 12:412; export pending, see 03-asset-handoff.md -->
<div class="img-placeholder" data-label="Hero background"><span>Hero background</span></div>
```

- Build to the **confirmed** breakpoints, not raw frame widths. Mobile should match the mobile
  render's stacking order, not just be a narrower desktop.
- Derive hover/focus/disabled from the brand's existing components and **note each one derived** — a
  reviewer needs to know which states were designed and which were inferred.

#### The visual diff

Tokens being right does not make the page right. Composition — section order, proportion, which band
is which color — lives in the layout, and the design render is the only ground truth for it.

```bash
# Screenshot the build at each breakpoint
npm run figma:shot -- demos/<brand>/output/index.html 1440 /tmp/build-desktop.png
npm run figma:shot -- demos/<brand>/output/index.html 390  /tmp/build-mobile.png

# Compare against the design renders captured in Phase 01
npm run figma:diff -- \
  --design=demos/<brand>/output/00-figma-capture/renders/desktop.png \
  --build=/tmp/build-desktop.png --label=desktop \
  --out=demos/<brand>/output/04-visual-diff --check
```

Reading the result — each signal maps to a different kind of mistake:

| Signal | What it means |
|---|---|
| **Height ratio** | Build much taller/shorter than the design — usually a missing section, or spacing applied at the wrong scale |
| **Drifting bands** + position down the page | *Where* it diverges. "41% Δ364 design `#ffffff` → build `#123049`" means the band 41% down is navy in the build and white in the design |
| **In the design but not the build** | A color you failed to use — often a band tint that got dropped |
| **In the build but not the design** | A color you invented, or the wrong shade of a real one |

It also writes `diff-<label>.png`: design left, build right, and a strip between them running green
where bands agree and red where they don't. **Look at it.** The numbers say something drifted at
41%; the picture says why.

This is intentionally **not** a pixel differ. Two honest renders of the same page never match
pixel-for-pixel, and a pixel differ would report a visually-correct page as 100% failed. Chase the
flagged bands, not a perfect score.

Iterate: fix → re-shoot → re-diff. When `--check` passes at both breakpoints, the composition is
right.

**3. Accessibility.** `npm run ada:scan` — WCAG 2.1 AA. The recurring failure this repo cares about
is **red-on-dark**. Fix it with the brand's tokens (white on dark); if the fix visibly departs from
the comp, say so in delivery.

**4. Structure.** `npm run structure:scan`, then run the `structure-fix` loop until clean. Any new
page gets a `site.manifest.json` entry and is wired into the hub, the nav, and the Sitemap page if
the brand has one. Never surface a raw scanner error to a non-technical operator.

**5. Deliver** — the page plus its provenance trail:

```
demos/<brand>/output/
  index.html                    # the build
  tokens.css                    # tokens it's built on
  tokens.json                   # full token model with provenance
  00-figma-capture/             # raw capture + lock file
  02-component-inventory.md     # node ID → component mapping
  03-asset-handoff.md           # assets provided / outstanding
  04-visual-diff/diff-*.png     # design vs build, per breakpoint
  assets/images/                # locally-hosted assets
```

Tell the operator, briefly: what was inferred-and-confirmed vs. read from bound variables; which
assets are still outstanding; any place the build departs from the comp and why (accessibility
fixes especially); any place the design contradicted the brand's live design system; and any
remaining visual drift you chose not to chase, with the reason.

Then branch → PR → preview → merge.

---

## Part 4 — Command reference

| Command | Does |
|---|---|
| `npm install` | One-time setup |
| `npm run figma:tokens -- --capture=<dir>` | Normalize a capture into tokens + reports |
| `npm run figma:lock -- --capture=<dir>` | Write `tokens.lock.json` for human confirmation |
| `npm run figma:check -- --capture=<dir>` | **Gate.** Exit 0 = build-ready |
| `npm run figma:shot -- <file-or-url> <width> <out.png> [height]` | Full-page screenshot of the build |
| `npm run figma:diff -- --design=… --build=… --label=… --out=… --check` | Design-vs-build band comparison |
| `npm run ada:scan` | **Gate.** WCAG 2.1 AA scan |
| `npm run structure:scan` / `npm run structure:fix` | **Gate.** Manifest/nav/link consistency |
| `npm run install-hook` | Activate the pre-commit ADA + structure gate |
| `npm run build && npm run serve` | Build the portal, preview at `http://localhost:8000` |

**Useful flags**

- `figma-tokens.js`: `--capture=` `--out=` `--check` `--init-lock` `--json` `--quiet`
- `figma-diff.js`: `--design=` `--build=` `--label=` `--out=` `--check` `--threshold=` (default 28)
  `--bands=` (default 160) `--max-drifting=` (default 10) `--design-crop=y0:y1` `--build-crop=y0:y1`
  `--trim` `--json` `--quiet`

Two flags that matter in practice:

- **`--design-crop` / `--build-crop`** exist because a real page is tall — the first one was
  15,424px — and gets built in chunks. Compare a slice.
- **`--trim` is off by default and should stay off** unless the screenshot came from the headless
  Chrome fallback. Chrome captures the *window*, not the document, so it leaves uniform background
  padding — which is exactly what `--trim` removes, and also exactly what a flat-colored footer band
  looks like. Prefer Playwright when the page ends in a solid band.

---

## Part 5 — Constraints and known limits

### The Figma seat constraint

**This is the current blocker on production use.**

| Seat / plan | MCP call budget |
|---|---|
| View / Starter | **20 tool calls per month** |
| Dev / Full on Professional | ~200 per day (≈ $12–15 per editor per month) |

`whoami` is exempt from the quota. A well-planned capture is cheap — the first real end-to-end run
cost **3 calls total** — but 20 calls a month cannot support iteration, and a View seat fails
*mid-capture*. Someone who owns the Figma account has to upgrade before this tool goes into regular
use.

This constraint is *why* the architecture is "capture once, normalize offline."

### Network egress

- **`figma.com` is blocked at the egress proxy** in both the cloud container and the device shell
  (403 on CONNECT), so asset bytes cannot be downloaded — hence the manual export hand-off.
  Allowlisting `figma.com` would remove that step entirely.
- **Google Fonts is blocked**, so screenshots render fallback typefaces. Account for that when
  reading a visual diff.

### What a real design file looks like

From `RFH-26002`, and worth expecting rather than treating as breakage:

- **No auto-layout** — everything absolutely positioned, so spacing extraction returns zero and
  spacing is derived from geometry instead.
- **No mobile board** — only a desktop comp existed.
- **Auto-generated layer names** ("Group 164"), which makes the component inventory low-value on
  its own.
- **141 on-canvas text nodes carried the real copy in their layer names** — that is where the
  build's copy came from.
- **Lorem ipsum in 5 text nodes** — normal for a comp in review.

### Extraction bugs already fixed (don't re-introduce them)

1. Figma **type variables are composite strings** —
   `Font(family: "DM Sans", size: 50, weight: 300, lineHeight: 55, …)`, not scalars. They must be
   exploded into size / weight / lineHeight tokens.
2. `get_design_context` returns **React + Tailwind, not CSS** — `rounded-[30px]`, `text-[16px]`. Scan
   Tailwind arbitrary values. Do **not** scan `left-` / `top-` / `w-` / `h-`: absolute positions in a
   comp are not spacing.
3. **Breakpoints:** "top-level frames > 320px" gave 22 false positives. The correct method is widths
   that **repeat** among full-bleed elements pinned to x=0, capped at the design width.
4. **Review boards are wider than the design** — a 1959px frame around a 1440px page, the margin
   holding sticky notes. Anything at x ≥ designWidth is annotation, not a build target.

### Open requirements gaps

- No acceptance criterion currently requires the build to **look like the design**. The visual diff
  should be an explicit criterion.
- "Layout" is listed as a token category, but container / grid / gutter cannot be reliably
  extracted — only derived.
- "Real copy" has no defined source of truth outside the comp and the override file.
- "Tool" vs. "workflow": a standalone CLI is not possible while the Figma read path lives only
  inside an agent session. What exists is a skill plus offline scripts.

---

## Part 6 — Failure modes

| Symptom | What it means | What to do |
|---|---|---|
| **Bare file URL (no `node-id`)** | Not usable | Ask for a node-specific URL. Do not try to walk the whole document. |
| **Figma call/seat limit mid-capture** | Budget gone | Record it in the ledger; report which calls landed and what's missing; confirm a Dev/Full seat; re-capture **only the failed nodes**. Never restart a capture from scratch, and never retry in a loop. |
| **No variables bound in the file** | Expected, not an error | Tokens come from design context as raw values. Lean harder on the renders and the lock file. |
| **No auto-layout** | Expected on a visual comp | Spacing derived from sibling geometry, gutter from content's left edge — both `inferred`, both confirmed like anything else. |
| **Placeholder copy in the comp** | Normal mid-review | Build it, mark it, report it. Ask for `copy-overrides.json`. |
| **Asset bytes unavailable** | Expected — egress blocks Figma | Placeholder + hand-off ledger; ask the operator to export. |
| **No renders supplied** | Degraded quality | Proceed, but say plainly that nothing corroborates the colors and there is no reference for the diff — then ask again. |
| **Design contradicts the brand's live design system** | A design question | Stop and raise it. Don't silently fork the system; don't silently override the design. |
| **Interactive states not in the file** | Normal for a static comp | Ask for a state frame (Phase 02B); failing that, derive from existing components and note every derivation. Never invent motion silently. |
| **`figma:check` fails and no token looks unconfirmed** | Likely a truncated capture | Check the ledger in `capture.json` for a recorded failure. |
| **Visual diff reports huge drift on a page that looks fine** | Usually the screenshot backend | Confirm Playwright was used; if it was the Chrome fallback, add `--trim` — but not if the page ends in a solid band. |

---

## Part 7 — Governance

### Quality checklist (before delivery)

- [ ] `npm run figma:check` exits 0 — no unconfirmed inferred tokens, capture not truncated
- [ ] Every CSS value in the build traces to a token in `tokens.css` (no stray hardcoded hexes)
- [ ] Component inventory maps each built section to a Figma node ID
- [ ] Copy matches the Figma text nodes or a supplied override exactly — nothing transcribed from a PNG
- [ ] Every unresolved placeholder is marked in the page and listed in `05-copy-report.md`
- [ ] Provided assets hosted locally; **zero** Figma CDN hotlinks; every missing asset a labeled placeholder in the hand-off
- [ ] Visual diff run at each breakpoint, drift resolved or noted
- [ ] No horizontal scroll at 360px; mobile layout matches the mobile render
- [ ] `npm run ada:scan` clean — WCAG 2.1 AA, including red-on-dark
- [ ] `npm run structure:scan` clean
- [ ] JS-driven behavior manually checked for accessibility (`ada-scan` cannot see it)
- [ ] Semantic HTML5, correct heading order, valid meta title + description
- [ ] HTML page weight < 500 KB excluding images

### Fork model

`yd-website-playbook` is the **brand-agnostic upstream**. Client-specific work — everything under
`demos/`, client handoff data, client output pages, brand assets — belongs in a **fork**. Only
portable improvements (skill logic, phases, the scanners, CI, shared tokens) are committed upstream.
See [UPSTREAM.md](../UPSTREAM.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).

### Deploy path

Branch → PR → isolated Surge preview → **named approver merges to `main`** → GitHub Pages. Nothing
live changes before that merge. See [DEPLOYMENT.md](DEPLOYMENT.md).

---

## Pointers

- Skill: `.claude/skills/figma-page-build/SKILL.md` (+ `phases/`)
- Scripts: `scripts/figma-tokens.js`, `scripts/figma-diff.js`, `scripts/page-shot.sh`
- Build system overview: [BUILD-SYSTEM.md](BUILD-SYSTEM.md)
- Manifest schema: `demos/README-manifest.md`
