# `imagery.profile.json` — the per-brand imagery contract

Each brand under `demos/<brand>/` may carry an **`imagery.profile.json`**. It is what makes
generated imagery *on-brand*: a house style, a palette described in words, and a set of named
slot presets. The `generate-images` script composes every prompt from it, so two people
generating a hero for the same brand get the same look without coordinating.

Like `site.manifest.json`, the profile is **portable machinery, client-specific content** —
the schema and the script live upstream, each brand's actual profile stays in the fork.
See [../UPSTREAM.md](../UPSTREAM.md).

## Why a profile instead of prompts in the brief

Banana Stand has six global style presets (`web`, `photographic`, `illustration`, `abstract`,
`3d`, `minimal`) and no concept of a client. Left alone, "on-brand" becomes whatever adjectives
whoever ran the build happened to type that day, and a hero generated in March looks nothing
like a card generated in June.

The profile moves that decision **up a level and writes it down once**. A page's image brief
says only *what the picture is of*; the profile says *what this brand looks like*.

## Optional, with graceful degrade

- **Profile present** → images can be generated for this brand.
- **Profile absent** → the generator refuses and points here; builders fall back to labeled
  placeholders exactly as before. Nothing breaks, you just don't get generation.

## Schema

```jsonc
{
  "brand": "yohdev",                  // slug (matches the folder); informational
  "instance": "https://…",            // optional; overrides $BANANA_STAND_URL
  "outputDir": "output",              // optional; where assets/images/ lives. default "output"

  "defaultStyle": "photographic",     // fallback Banana Stand preset. default "web"
  "defaultFormat": "webp",            // webp | jpeg | png. default "webp"
  "quality": 82,                      // 1–100, ignored for png. default 82

  "promptPrefix": "…",                // the house style — prepended to every prompt
  "palette": ["near-black charcoal background", "bright cyan-teal accent light"],
  "avoid":   ["stock-photo handshakes", "warm orange color casts"],

  "slots": {                          // named presets; a brief references these by name
    "hero": { "width": 1600, "height": 700, "style": "photographic" },
    "card": { "width": 800,  "height": 600 }
  }
}
```

### How a prompt is composed

Fixed order, whitespace collapsed:

```
promptPrefix  →  the brief entry's subject  →  "Color palette: …"  →  "Avoid: …"
```

Style resolves **entry → slot → `defaultStyle` → `web`**.

The order is fixed and the text is normalized on purpose. Banana Stand's cache key is a
SHA-256 over the prompt, so identical inputs return the identical cached image — which is what
makes a re-run free, and what lets a hub and its spokes share one asset without extra work.

Composed prompts are capped at Banana Stand's 1000-character limit; the generator fails loudly
if `promptPrefix` + `palette` + `avoid` crowd out the subject.

### Writing `palette` and `avoid`

Both are **plain English fed to an image model**, not CSS. `#10D1D3` means nothing to it —
"bright cyan-teal accent light" does. Derive the words from the brand's real tokens, then
keep them stable.

`avoid` is where the house guardrails live. Worth having in most profiles:
`text, logos, or UI chrome rendered in the image` (image models render text badly and a fake
logo is worse than none) and whatever stock-photo clichés the brand should never look like.

## Concept mode — brand marks

A `mark` slot switches the generator into **concept mode**, used by the `brand-identity` skill to
explore logo directions. Two extra profile keys drive it:

```jsonc
{
  "conceptPrefix": "A single abstract brand mark centred on a plain, uniform near-black background. …",
  "conceptAvoid": ["lettering, words, or initials of any kind", "drop shadows, glows, halos …",
                   "light or white backgrounds", "more than two colours"],
  "slots": { "mark": { "width": 1024, "height": 1024, "style": "minimal" } }
}
```

`conceptPrefix` **replaces** `promptPrefix`; `conceptAvoid` is **appended** to `avoid`. Assets record
`"role": "concept"` in the manifest. Set `"concept": true` on an entry to force the mode for a
non-`mark` slot.

**Pin the background inside `conceptPrefix`.** Left unspecified, some marks return light and some
dark — and a concept sheet whose only job is fair side-by-side comparison quietly stops being fair.

A concept render is **never a logo**. It exists to settle a direction; the chosen one is redrawn as
vector geometry. See the `brand-identity` skill.

## The image brief that feeds it

The generator reads a JSON brief — one entry per image slot, produced by the page builder
alongside the human-readable `03-image-brief.md`:

```jsonc
{
  "page": "Homepage.html",
  "images": [
    {
      "slot": "hero",                    // a key in the profile's slots
      "file": "hero-workspace.webp",     // bare filename; lands in assets/images/
      "subject": "A quiet developer workspace at night, lit by one monitor",
      "alt": "A developer workspace lit by the cyan glow of a single monitor",
      "page": "Homepage.html",           // optional; recorded as usedBy
      "seed": 0                          // bump to re-roll this slot only
    }
  ]
}
```

`width`/`height`/`style`/`format`/`quality` may be set per entry to override the slot.
`alt` is carried straight into the `<img>` tag — `""` is valid and means decorative.

A runnable reference brief ships at `.claude/skills/brand-imagery/example-brief.json` — copy it,
swap the subjects and alt text, and point `--spec` at your copy.

## Running it

```bash
# Preview every composed prompt. Zero network calls — tune the profile here first.
npm run images:dry-run -- --brand=yohdev --spec=demos/yohdev/output/03-image-brief.json

# Generate for real (needs BANANA_STAND_TOKEN).
npm run images:generate -- --brand=yohdev --spec=demos/yohdev/output/03-image-brief.json

# Re-roll one slot: bump its "seed" in the brief, then
npm run images:generate -- --brand=yohdev --spec=… --force
```

| Flag | Effect |
|---|---|
| `--dry-run` | print prompts and targets, write nothing, call nothing |
| `--force` | regenerate even when the target file already exists |
| `--concurrency=<n>` | parallel generations (default 3) |
| `--strict` | exit non-zero if any image failed (default: report and carry on) |

**Without `BANANA_STAND_TOKEN` the generator prints a skip notice and exits 0** — the same
degrade-don't-fail convention as `SURGE_TOKEN` in CI. A build never breaks for want of a
credential; it just keeps its placeholders.

## Provenance

Generated assets are downloaded and committed locally — **the CDN URL is never referenced from
a page**, keeping the "real images, hosted locally, never hotlink" rule intact.

The generator prints an `assets[]` block to merge into the brand's `site.manifest.json`. That
record is what lets you re-roll a slot months later, and lets a cluster recognize that two pages
want the same image. See [README-manifest.md](README-manifest.md).

## Known limits

- **Generated images carry an invisible SynthID watermark** and are AI-generated. They are not
  photographs of the client's real people, products, or premises.
- **Image models render text badly.** Never generate a slot that needs legible words in it.
- **The ADA scanner cannot see them.** `ada-scan.js` checks that an `alt` attribute exists, and
  for text-over-image it *assumes* a dark background. Generate a light hero under white text and
  the scan will pass while the page fails in reality — re-run `npm run ada:scan` after
  generating and check hero sections by eye.
