# Phase 01 — Capture

## Purpose
Spend the Figma call budget **once**, and get everything onto disk so nothing downstream ever has to
call Figma again.

## Inputs
- Node-specific Figma URL — `https://figma.com/design/<fileKey>/<name>?node-id=12-345`
- Authenticated Figma MCP connector
- Full-page PNG render(s) from the operator — desktop and mobile
- Exported image assets, if the design uses any

## Before you call anything

### 1. Check the URL is node-specific
A URL without `node-id` is not usable. Ask for it and say how to get it: select the frame in Figma →
right-click → **Copy link to selection**.

Note the id format difference — the URL uses `12-345`, the API uses `12:345`. Convert.

### 2. Check the seat covers the run
Figma MCP call budget is tied to seat/plan; a **View** seat exhausts within a handful of calls, and
it fails *mid-capture*, leaving a half-built token set that looks complete. Ask up front:

> Which Figma seat is this account on — View, Dev, or Full? A View seat won't survive a full
> extraction run.

If the answer is View or unknown, say plainly that the capture may truncate, and capture in priority
order (below) so the most valuable calls land first.

### 3. Budget the calls
Plan the call list before making any. Per node, in priority order:

| # | Tool | Why it's ranked here |
|---|---|---|
| 1 | `get_metadata` | The node tree — component inventory and inferred breakpoints. Cheap, high value. |
| 2 | `get_design_context` | The token bearer. Without it there are almost no tokens. |
| 3 | `get_variable_defs` | Bound variables — free naming and top-tier confidence. Skip if the file binds none. |
| 4 | `get_screenshot` | Only if the operator supplied no render. An operator-exported PNG is better and costs nothing. |

Capture the **top-level page node first**, then section nodes only if the page node's design context
is too shallow to yield tokens.

## Capture protocol

Create the capture directory:

```
demos/<brand>/output/00-figma-capture/
  capture.json
  variables.json
  metadata.json
  design-context/<node>.json
  renders/
  assets/
```

Then, for each call:

1. Make the call.
2. Write the **raw, unedited** response to its file. Do not summarize, reshape, or prune — the
   normalizer is built to read messy real responses, and a lossy capture can't be re-read later
   without spending Figma calls again.
3. Append an entry to the ledger in `capture.json` — **including failures**.

### capture.json
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

**The ledger is not bookkeeping.** `scripts/figma-tokens.js` reads it, recognizes rate/seat/quota
errors, reports the capture as incomplete, and fails `--check`. An unrecorded failure becomes a
silently thin token set that nobody catches until the build looks wrong.

## When the limit hits
Stop capturing. Do not retry in a loop — the budget is already gone and retries burn what's left.

1. Record the failure in the ledger.
2. Tell the operator plainly: which calls landed, which didn't, what's missing as a result.
3. Ask them to confirm a Dev/Full seat.
4. On re-run, capture **only the failed nodes**. Everything on disk is kept and never re-fetched.

## Renders
File the operator's PNGs into `renders/`, named by breakpoint:

```
renders/desktop.png     # ~1440 wide, full page
renders/mobile.png      # ~390 wide, full page
```

Requirements: **non-interlaced, 8-bit** PNG (Figma's default export — no Adam7). Full page, not
cropped sections. If the operator has only cropped shots, take them, but name them for what they
show (`renders/hero-desktop.png`) and expect weaker pixel-coverage evidence.

If no render was supplied, ask once more before proceeding — this is the cheapest quality win
available. If the seat allows it and the operator has none, fall back to `get_screenshot` and save
the result here.

## Assets
Image bytes can not be pulled through the connector in a sandboxed environment. Build the ledger
from what the design references, and mark each one:

```json
[
  { "name": "Hero background", "nodeId": "12:412", "status": "missing" },
  { "name": "Logo mark", "nodeId": "12:401", "status": "provided",
    "exportPath": "assets/images/logo.svg" }
]
```

Hand-off request to the operator — export from Figma, **SVG** for logos/icons and **WebP** (with a
PNG fallback) at 1x and 2x for photography. Anything still missing at build time renders as a
labeled placeholder and is listed in `03-asset-handoff.md`.

## Exit criteria
- `capture.json` exists with a complete call ledger
- At least `metadata.json` **or** one `design-context/*.json` captured
- Renders filed (or their absence explicitly flagged to the operator)
- Asset manifest written
- Any limit failure reported to the operator, not swallowed

## Next
→ Phase 02 — Tokens, Confirm & Component Map
