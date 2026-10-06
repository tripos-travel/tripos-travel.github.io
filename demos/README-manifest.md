# `site.manifest.json` — the per-brand structure contract

Each brand under `demos/<brand>/` may carry a **`site.manifest.json`**. It is the single source of
truth for *which pages the brand is allowed to have* and *where component work belongs*. It is what
keeps a build on the beaten trail: the `structure-scan` gate uses it to catch stray top-level artifacts
(the classic failure: a standalone `Components.html` of card grids instead of folding the components into
the Style Guide) and broken internal wiring before they reach `main`.

The manifest is **portable machinery** (the schema + the scanner + the skill steps live upstream); the
**content** of each manifest is client-specific and stays in the fork. See [../UPSTREAM.md](../UPSTREAM.md).

## Why it's a sibling file (not part of `demo.json`)

`demo.json` drives the portal (`scripts/build-index.js`) and describes the brand *card*. `site.manifest.json`
describes the brand's *internal page structure*. Keeping them separate means the portal builder is never
touched by structural rules, and a brand can adopt the manifest without changing its portal entry.

## Optional, with graceful degrade

- **Manifest present** → the canonical page set is exactly what it declares, plus anything reachable from
  the hub. Component placement is enforced against the page whose `role` is `style-guide`.
- **Manifest absent** → the scanner infers the canonical set from what the brand hub (`index.html`) links
  to, and runs only the orphan + broken-link checks. Nothing breaks; you just get less guidance.

## Schema

```jsonc
{
  "brand": "yohdev",                // slug (matches the folder); informational
  "hub": "index.html",              // brand entry page that links the artifacts (relative to the brand dir)
  "outputDir": "output",            // where the pages live (relative to the brand dir); default "output"
  "pages": [                        // the canonical, allowed pages
    { "file": "Homepage.html", "role": "homepage", "title": "Homepage" }
    // role ∈ homepage | style-guide | brand-book | sitemap | search-insights | hub | spoke | other
    // file is relative to outputDir unless it contains a "/"
  ],
  "components": { "home": "Style-Guide.html" },  // the page component/pattern work belongs in

  "assets": [                       // OPTIONAL — provenance for images in outputDir/assets/
    {
      "file": "assets/images/hero-workspace.webp",
      "source": "generated",        // generated | downloaded | provided
      "generator": "banana-stand",
      "model": "gemini-2.5-flash-image",
      "prompt": "…the exact composed prompt…",
      "style": "photographic",
      "seed": 0,
      "width": 1600, "height": 700,
      "alt": "A developer workspace lit by the cyan glow of a single monitor",
      "usedBy": ["Homepage.html"]
    }
  ]
}
```

### `assets[]` — optional, advisory, ungated

Purely a record. The scanner reads only `outputDir`, `pages`, and `components` and ignores
everything else, so adding or omitting `assets[]` changes no gate and blocks no commit.

It earns its place by making generated imagery reproducible: `prompt` + `style` + `seed` is
exactly what you need to re-roll one slot without disturbing the others, and it is how a
cluster recognizes that a hub and a spoke asked for the same picture. `npm run images:generate`
prints the block ready to paste. See [README-imagery.md](README-imagery.md).

## What the scanner checks against it

| Rule | Level | Meaning |
|---|---|---|
| `orphan-page` | ERROR | an `outputDir/*.html` on disk that is neither declared here nor reachable from the hub |
| `broken-link` | ERROR | a same-brand `.html` link (hub or any page) that resolves to no file |
| `missing-page` | ERROR | a `pages[]` entry whose `file` is not on disk |
| `placement` | WARN | a non-declared page that looks like a component/pattern gallery — fold it into the Style Guide |
| `manifest` | ERROR | `site.manifest.json` is not valid JSON |

Run it:

```bash
npm run structure:scan          # full audit of every brand
npm run structure:scan:staged   # what the pre-commit hook runs (staged files only)
```

The gate mirrors the ADA gate exactly: staged pages are checked on commit (`.githooks/pre-commit`), and CI
blocks merge on the pages changed in a PR. A pre-existing orphan is *reported by the full audit* but does
**not** block an unrelated commit — only files you actually stage are gated.

## Adding a page the right way

When a build adds a real new page, it should: (1) create it in `outputDir/`, (2) wire it into the hub +
nav (and the sitemap page if the brand has one), and (3) add a `pages[]` entry here. Component/pattern
work is **not** a new page — it goes into the `components.home` page (the Style Guide).
