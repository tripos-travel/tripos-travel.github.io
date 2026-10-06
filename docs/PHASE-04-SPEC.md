# Phase 04 — Emit to Repo (SPEC)

**Status: draft for review. Nothing built.** Decisions needing a human are marked **OPEN**.
Author: drafted 2026-08-28 with Scott. Reviewers: Von, Andrew, Daniela.

---

## 1. Why this exists

Phases 01–03 turn a Figma file into verified tokens, a component inventory and static HTML.
Then the pipeline stops. The artifacts sit in an output folder with no destination, and getting
them into a client's site is hand work nobody has specified.

Rainfall Health needs it. **FPA Theatre is the second client on the same stack** (Sanity, Vercel,
Cloudflare, GitHub — per its Milestone 1 access tickets). A step that is manual twice is a missing
phase, not a chore.

Phase 04 closes the loop: **Figma in, styled Sanity site out.**

```
Figma file
   |  Phase 01  capture                      (Figma MCP, once)
   |  Phase 02  tokens + module inventory    <- human confirms names
   |  Phase 03  build + verify vs render
   |  Phase 04  emit into the client repo    <- THIS SPEC
Sanity site: themed, modules registered, PR open
```

---

## 2. The core idea: library vs instance

The thing that repeats across clients is **structure**. The thing that differs is **values and
composition**. Phase 04 exists to keep those apart.

| Layer | Lives in | Per client? | Example |
|---|---|---|---|
| **Module library** | playbook (`shared/modules/`) | No — built once | A `hero` schema + a token-driven `Hero.tsx` |
| **Token values** | client repo | Yes | `--color-brand-blue: #2b72e6` |
| **Composition** | Sanity content | Yes | This page uses hero, then statsBand, then cta |

A hero is a hero whether it is Rainfall or FPA Theatre. If its component references only
`bg-brand-blue` and never a literal hex, the same component serves both and themes itself from
whatever `@theme` the client repo carries. That is the whole bet.

**Hard rule that makes it work:** a library component contains **zero literal colour, font or
spacing values**. Every one is a token reference. A library module that hardcodes a hex is a bug,
and should be caught by a lint step (see §8).

### Where the line falls
Not every module generalises. Two categories:

- **Library modules** — general shapes: hero, statsBand, featureCard, logoMarquee, cta, quote,
  quoteTrio, centeredStatement, postGrid, featuredPost, leadCapture, audienceRow.
- **Client modules** — shapes with no general form (a theatre's showtimes grid; a hospital
  directory). Generated into the client repo only, never promoted.

**OPEN #1 — promotion rule.** What earns a client module a place in the library? Proposal: it gets
promoted the *second* time a client needs it, not the first. Building for reuse on one example is
how libraries get shapes nobody else can use.

---

## 3. Inputs

Phase 04 runs only after Phase 03 passes. It reads, and never re-derives:

| Input | From | Purpose |
|---|---|---|
| `tokens.json` | Phase 02 | Source of the theme. Carries values + provenance. |
| `tokens.lock.json` | Phase 02 | Proof a human confirmed the names. **Gate.** |
| `02-component-inventory.md` | Phase 02 | The raw section list |
| `modules.lock.json` | **new, Phase 02** | Inventory mapped to library modules. **Gate.** |
| `behavior.config.json` | Phase 02B | Interaction states |
| `04-visual-diff/` | Phase 03 | Evidence the build matched the design |
| `target.config.json` | **new, operator** | Where to emit and onto what stack |

**No Figma calls in this phase.** Same rule as 02 and 03.

### `modules.lock.json` — the new human gate
Mirrors `tokens.lock.json` exactly, and for the same reason: the mapping from "section 7 of the
comp" to "the `statsBand` library module" is a *guess*, and guesses get confirmed before they are
baked in.

```json
{
  "confirmedBy": "scott@yohdev.com",
  "confirmedAt": "2026-08-29T14:00:00Z",
  "modules": [
    { "node": "1568:9812", "module": "hero",       "source": "library", "instances": 1 },
    { "node": "1568:9930", "module": "statsBand",  "source": "library", "instances": 1 },
    { "node": "1568:10044","module": "featureCard","source": "library", "instances": 6 },
    { "node": "1568:11200","module": "showtimes",  "source": "client",  "instances": 1 }
  ],
  "dropped": [ { "node": "1568:9700", "reason": "annotation margin" } ]
}
```

Repetition is the free signal for field-vs-markup: whatever differs across 6 feature cards is a
field, whatever is constant is markup. Modules appearing **once** (hero, final CTA) have no such
signal and are exactly what the human is confirming.

---

## 4. `target.config.json` — pointing at a repo

Lives in the client's output dir, written by the operator once per client.

```json
{
  "repo": "/Users/scott/Sites/rainfall-health-site",
  "adapter": "sanity-next-tailwind4",
  "branch": "figma/round-7-design-system",
  "paths": {
    "theme":      "src/app/theme.css",
    "globals":    "src/app/globals.css",
    "schemas":    "src/sanity/schemas",
    "components": "src/components/modules",
    "public":     "public"
  }
}
```

The **adapter** is the platform-agnostic seam. `sanity-next-tailwind4` is the only one that needs
to exist now — Rainfall and FPA are both on it (Next 16.3.2, Tailwind ^4, Sanity ^6.10.1). A
`static-html` adapter would reproduce today's Phase 03 output; others can wait until something
needs them.

**OPEN #2 — does Phase 04 write to a repo path directly, or emit a patch bundle the operator
applies?** Direct writing is simpler and the git branch is the safety net. Recommend direct.

---

## 5. What it emits

Into the target repo, on a **new branch, never on `main`**:

### 5.1 The theme — `src/app/theme.css`
Generated from `tokens.json`. Tailwind v4 will **not** generate utilities from bare `:root` custom
properties, so the values are declared inside `@theme`. This is the difference between having
variables and having `bg-brand-blue`.

```css
/* theme.css — generated by figma-page-build Phase 04. Do not hand-edit.
 * Source: Figma kALEYryKFqNefNCcMCVhDd | tokens.lock.json confirmed 2026-08-29
 */
@theme {
  /* semantic aliases — components reference THESE */
  --color-brand:       var(--color-brand-blue);
  --color-brand-hover: var(--color-brand-blue-hover);
  --color-text:        var(--color-ink);

  /* extracted */
  --color-brand-blue:       #2b72e6;
  --color-brand-blue-hover: #1158cc;
  --color-ink:              #1d1c1a;
  --color-brand-tint:       #eaf1fc;
  --font-sans:  "DM Sans", ui-sans-serif, system-ui, sans-serif;
  --text-h2:    50px;
  --spacing-lg: 30px;
}
```

**The semantic alias layer is not optional.** Token names derive from Figma variable names; a
re-capture can rename them and break every component reference. Library components reference
`--color-brand`, never `--color-brand-blue`. This is the one thing that makes a shared library
survive a design round.

### 5.2 Wiring into `globals.css`
- add `@import "./theme.css";` after `@import "tailwindcss";`
- **delete the `prefers-color-scheme: dark` block** — the R7 comp is light-only and ported sections
  will invert without this
- replace the system font stack with `next/font/google` DM Sans (a token names the family; something
  still has to load it)

These are edits to a human-owned file, so they are proposed as a diff in the PR, not silently applied.

### 5.3 Module schemas — `src/sanity/schemas/modules/<module>.ts`
One Sanity object type per confirmed module. Fields only, no presentation:

```ts
export const hero = defineType({
  name: "hero", title: "Hero", type: "object",
  fields: [
    defineField({ name: "heading", type: "string", validation: r => r.required() }),
    defineField({ name: "body", type: "text" }),
    defineField({ name: "image", type: "image", options: { hotspot: true } }),
    defineField({ name: "tone", type: "string",
      options: { list: ["light", "tinted", "dark"] }, initialValue: "light" }),
  ],
  preview: { select: { title: "heading", media: "image" } },
});
```

`tone` is the pattern for legitimate visual variation: a **constrained enum the component maps to
token classes**, never a colour field. No hex fields, no spacing fields in a schema, ever.

### 5.4 Components — `src/components/modules/<Module>.tsx`
Token-driven, props typed from the schema:

```tsx
const TONE = {
  light:  "bg-white text-text",
  tinted: "bg-brand-tint text-text",
  dark:   "bg-text text-white",
} as const;

export function Hero({ heading, body, image, tone = "light" }: HeroProps) {
  return <section className={`${TONE[tone]} px-gutter py-3xl`}>…</section>;
}
```

### 5.5 Registry + page builder
`registry.ts` maps `_type` to component; `PageBuilder.tsx` walks `modules[]` and renders each,
skipping unknown types with a dev-only warning rather than crashing the page.

### 5.6 Patches to existing files
- `page.ts` gains `modules: array of [ ...confirmed module types ]`
- `schemas/index.ts` imports and registers the new object types

### 5.7 Provenance
- `tokens.json` copied to the repo (committed, not read at runtime) so Round 7 and Round 8 can be
  diffed
- `04-emit-manifest.json` — every file written, with a content hash (see §7)

### 5.8 Assets
Exported images copied into `public/`. Where Phase 03 had a labeled placeholder, Phase 04 emits the
same labeled placeholder and lists it in the PR body. **Never a Figma CDN URL** — those expire.

---

## 6. What it must NOT do

- **Never write content into Sanity.** Schemas are code; content is the editors' job. Phase 04
  ships empty modules for someone to fill in Studio.
  (If seeding is ever wanted, every array item needs a generated `_key` — the single most common
  bug in programmatic Sanity writes.)
- **Never put presentation in a schema.** No hex, no px, no spacing fields.
- **Never hardcode a value in a library component.** Tokens only.
- **Never commit to `main`.** Branch + PR, always.
- **Never overwrite a human-edited file silently.** See §7.

---

## 7. Re-runs — the part that decides whether this is usable

Round 8 will land. FPA will iterate. Phase 04 gets run repeatedly against a repo that people have
edited in between, and **clobbering someone's work once will kill trust in the tool.**

`04-emit-manifest.json` records a hash of every emitted file at emit time. On re-run each file is
one of three cases:

| Case | Meaning | Action |
|---|---|---|
| hash matches manifest | untouched since emit | overwrite freely |
| file absent | deleted or new | write |
| hash differs | **a human edited it** | do not write; report in the PR body; `--force` required |

Generated files carry a `Do not hand-edit` header naming the phase and the source. Files Phase 04
only *patches* (`globals.css`, `page.ts`, `schemas/index.ts`) are always proposed as a diff for
review, never rewritten wholesale.

**OPEN #3 — token renames across rounds.** If Round 8 renames `brand-blue`, every component
referencing it breaks. The semantic alias layer (§5.1) absorbs most of this, but not all. Proposal:
Phase 04 refuses to emit when a token present in the previous manifest has disappeared, and prints
the rename map for a human.

---

## 8. Gates

Phase 04 refuses to run unless:

- [ ] `npm run figma:check` exits 0 — tokens confirmed, capture not truncated
- [ ] `modules.lock.json` exists and is confirmed by a named human
- [ ] Phase 03 visual diff passed at every breakpoint, or the operator explicitly waived it
- [ ] `target.config.json` resolves to a real repo on a clean working tree

After emitting:

- [ ] target repo builds (`npm run build` in the target)
- [ ] **no literal hex, rgb or px in any emitted component** — the lint that protects §2
- [ ] `npm run ada:scan` clean on a rendered sample page
- [ ] branch pushed, PR opened, body lists: tokens changed, modules added, files skipped as
      human-edited, assets still missing

---

## 9. Open decisions

| # | Decision | Recommendation |
|---|---|---|
| 1 | When a client module gets promoted to the library | On the second client that needs it |
| 2 | Direct repo writes vs a patch bundle | Direct; the branch is the safety net |
| 3 | Handling token renames between rounds | Refuse + print rename map |
| 4 | Does the module library belong upstream at all? | **Needs Von + Andrew.** See below. |
| 5 | Does `tokens.json` adopt the DTCG standard format? | Cheaper now than after components reference the names. Deferred — not blocking. |

### On #4 — the scope question, stated plainly
The playbook's charter is *brand-agnostic and outputs static HTML*. A Sanity + Next + Tailwind
module library is a bet on YohDev's stack. It is not client-specific, so it is arguably portable —
but it changes what the playbook **is**, from a static-HTML build system to a stack-opinionated one.

That is a real expansion and Von and Andrew should agree to it deliberately, rather than discover it
in a PR. The adapter seam in §4 is what keeps the bet reversible: the Sanity emitter is *an*
adapter, not the pipeline's new spine.

---

## 10. Sequencing

1. Agree §9 #4 with Von and Andrew — everything else is wasted if the answer is no
2. Confirm Rainfall's `tokens.lock.json` (still `DRAFT — proposed by Claude`)
3. Build the theme emitter alone; land it on Rainfall; prove `bg-brand-blue` resolves
4. Add `modules.lock.json` to Phase 02
5. Build 3–4 library modules against Rainfall (hero, statsBand, featureCard, cta)
6. Run the same thing at FPA Theatre — the actual test of the library/instance split

Steps 2–3 are unblocked today and independent of homepage design signoff: the theme layer is
infrastructure that survives any design round. Step 5 is what the 2026-08-27 deferral was protecting
against, and should still wait for a signed-off comp.

---

## 11. Related

- Tool ticket: ClickUp `86bbhvr1z` — Figma File-to-HTML conversion tool
- Client deliverable: ClickUp `86bbfkytk` — Create Design System (Rainfall)
- Overlapping: `86bbgz0tb` Playbook Scaffolding for Home Page (Daniela + Greg)
- `docs/BUILD-SYSTEM.md`, `docs/FIGMA-TO-HTML-MANUAL.md`, `UPSTREAM.md`
