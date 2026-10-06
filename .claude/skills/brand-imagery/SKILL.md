# Brand Imagery Skill

## Identity
- **Name:** `brand-imagery`
- **Display name:** Brand Imagery (generate on-brand images)
- **Description:** Replace a build's gray placeholder boxes with real, on-brand images. Composes prompts from the brand's imagery profile, generates through Banana Stand, downloads the result into the brand's `assets/images/`, and wires it into the page with alt text. Also creates and tunes a brand's imagery profile in the first place, and re-rolls a single slot that came out wrong.
- **Version:** 1.0.0

## Why this exists
Every builder in this playbook could produce a finished page except for one thing: the pictures.
`net-new-page` shipped gray boxes and a brief "for your designer". `legacy-page-rebuild` could only
copy images that already existed somewhere else. `markup-review` had a whole class of client
feedback — "we need a photo here" — that it could not act on.

This skill closes that. It does **not** make image generation a free-for-all: output is only as
on-brand as the profile behind it, and the profile is the thing worth investing in.

## Activation Triggers
- A builder finishes a page that has image placeholders and the brand has an imagery profile.
- The user says "generate the images", "fill in the placeholders", "make the hero image",
  "these images are wrong", "re-roll that", "set up imagery for this brand", or types `/brand-imagery`.
- `markup-review` hits a client comment that needs an asset that doesn't exist.

## Prerequisites

| Thing | Where | If missing |
|---|---|---|
| Imagery profile | `demos/<brand>/imagery.profile.json` | **Create it first** — step 1 below |
| `BANANA_STAND_TOKEN` | env | Generation skips cleanly; placeholders stay. Say so plainly, don't treat it as an error |
| `BANANA_STAND_URL` | env, optional | Defaults to `https://www.bananastandai.com`; a profile's `instance` wins |

Schema and full flag reference: **[demos/README-imagery.md](../../../demos/README-imagery.md)**.
A runnable reference brief ships next to this file: **`example-brief.json`**.

## 1. Establish the profile (once per brand)

Read the brand's real design tokens before writing a word of it — the `:root` block in the brand's
Style Guide page is the source of truth. Then translate them **into plain English**, because the
image model cannot read hex.

> `--canvas:#05080A` + `--teal:#10D1D3` + `--ink:#F5F7F7`
> → `"near-black charcoal background"`, `"bright cyan-teal accent light"`, `"cool off-white highlights"`

Write `demos/<brand>/imagery.profile.json` with:

- **`promptPrefix`** — the house style in two or three sentences. Subject-agnostic: it must make
  sense in front of *any* subject. Lighting, mood, composition, density.
- **`palette`** — three to five color phrases from the tokens above.
- **`avoid`** — the guardrails. Always include `text, logos, or UI chrome rendered in the image`
  (models render text badly and a wrong logo is worse than no logo). Add the stock-photo clichés
  this brand should never resemble.
- **`slots`** — named presets for the sizes this brand actually uses (`hero`, `card`, `banner`, …).
  Take the dimensions from the built page's real layout, not from habit.

Then **dry-run before generating anything**:

```bash
npm run images:dry-run -- --brand=<brand> --spec=<brief.json>
```

This prints every composed prompt and makes zero network calls. Read them. Tune the profile. Repeat.
Getting the profile right here is worth more than any number of re-rolls later.

## 2. Write the image brief

The page builder produces `output/03-image-brief.json` next to the human-readable `.md`. One entry
per slot:

```jsonc
{ "slot": "hero", "file": "hero-workspace.webp", "page": "Homepage.html",
  "subject": "A quiet developer workspace at night, lit by one monitor",
  "alt": "A developer workspace lit by the cyan glow of a single monitor" }
```

- **`subject` says what the picture is of — nothing about style.** Style belongs in the profile.
  If you find yourself writing "dark, moody, cyan-lit" into a subject, that belongs in `promptPrefix`.
- **`alt` is required thinking, not a formality.** It ships into the page. Describe what a sighted
  visitor would see. `""` is valid and correct for a purely decorative texture — it tells a screen
  reader to skip it, which is better than narrating a background.
- **Never generate a slot that needs legible text in it.** A wordmark, a UI screenshot, a sign,
  a chart. Image models produce convincing gibberish. Use a real asset or keep the placeholder.
- **Never ship a generated image as a logo.** A brand mark is a real vector asset, not a render.
  The one sanctioned exception is *concept exploration* — see below — where generated marks are
  labelled as directions to choose between and are never presented as the identity.

## 3. Generate

```bash
npm run images:generate -- --brand=<brand> --spec=<brief.json>
```

Images download into `demos/<brand>/output/assets/images/` and are committed. **The Banana Stand
CDN URL never appears in a page** — that would break the playbook's never-hotlink rule and make a
client's live site depend on our Vercel instance.

Failures are per-entry and non-fatal: a slot that fails keeps its placeholder and gets reported.
That is the correct outcome, not a problem to work around — **a labeled placeholder beats a bad
image**. Note any failures in the delivery summary.

## 4. Wire into the page

Replace each placeholder div with a real image:

```html
<!-- was: <div class="img-placeholder" style="aspect-ratio:16/7"><span>…</span></div> -->
<img src="assets/images/hero-workspace.webp"
     alt="A developer workspace lit by the cyan glow of a single monitor"
     width="1600" height="700" loading="lazy" decoding="async">
```

- Always set `width`/`height` — they prevent layout shift and they're already known from the slot.
- `loading="lazy"` on everything **except** an above-the-fold hero, which should load eagerly.
- Keep the `alt` byte-identical to the brief so the manifest record stays true.

Then merge the printed `assets[]` block into `demos/<brand>/site.manifest.json`.

## 5. Verify — and actually look at it

```bash
npm run ada:scan          # alt presence, contrast
npm run structure:scan    # unchanged by assets[], but the page changed
grep -rn 'src="http' demos/*/output/*.html    # must print nothing
```

**The ADA scanner has a blind spot you must cover manually.** It cannot sample the pixels behind
text set over a photo — it assumes a dark background (`OVERLAY_DARK = #1a1a1a` in
`scripts/ada-scan.js`). Generate a light-toned hero, put white text on it, and the scan passes
while the page is genuinely unreadable. **Open every text-over-image section and look at it.**

Then judge the images themselves, honestly:

- Does it look like this brand, or does it look like AI stock?
- Any garbled text, extra fingers, impossible geometry, uncanny faces?
- Does it repeat another image on the same page?

**A gray box is better than a bad image.** If a slot needs three re-rolls it probably needs a real
photograph — say that.

## 6. Re-roll a single slot

Bump that entry's `seed` in the brief, then:

```bash
npm run images:generate -- --brand=<brand> --spec=<brief.json> --force
```

Same prompt + size + style + seed always returns the identical cached image, so changing the seed
is what produces a genuinely different picture; `--force` lets it overwrite the old file. Every
other slot is untouched.

If the re-roll doesn't help, the problem is the prompt, not the dice — fix the `subject`, or fix
the profile if it's affecting every image.

## What these images are and are not

Generated images are **AI-generated and carry an invisible SynthID watermark**. They are not
photographs of the client's real team, products, or premises.

That makes them excellent for abstract backgrounds, textures, mood and concept imagery, and
stand-ins during design review. It makes them a poor substitute for an About page portrait or a
product shot. Nothing in this skill blocks that use — but tell the client which images were
generated when you deliver, so the choice to ship one is theirs and informed.

## Failure Modes

| Situation | Response |
|---|---|
| No imagery profile for the brand | Create one (step 1). Don't generate against defaults — output won't be on-brand |
| `BANANA_STAND_TOKEN` unset | Report plainly, keep placeholders, carry on. Not an error |
| Instance returns 401 | Token missing or wrong for that instance — the API can't tell you which |
| Image comes back wrong twice | Fix the subject or the profile; don't keep re-rolling |
| Slot needs legible text | Never generate it. Real asset or placeholder |
| Composed prompt over 1000 chars | Shorten `promptPrefix`/`avoid` — the subject is getting crowded out |
| Client asks "is this a real photo?" | Answer straight: it's generated. Never imply otherwise |

## Outputs
- `demos/<brand>/imagery.profile.json` — the brand's imagery contract (first run)
- `demos/<brand>/output/assets/images/*` — real, committed, locally-hosted images
- `assets[]` provenance merged into `site.manifest.json`
- Updated page markup with real `<img>` tags and alt text

## Success Criteria
- Every generated slot is a local file; `grep 'src="http'` returns nothing
- Every `<img>` has meaningful `alt` (or `alt=""` if genuinely decorative) plus `width`/`height`
- `npm run ada:scan` and `npm run structure:scan` pass, and text-over-image sections were checked by eye
- Images look like the brand — verified by a person, not by the absence of errors
- The delivery summary states which images were generated
