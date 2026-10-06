# Logo Asset Kit Skill

## Identity
- **Name:** `logo-asset-kit`
- **Display name:** Logo Asset Kit (approved mark → agency-grade handoff zip)
- **Description:** Turn an approved logo direction into the structured asset package a senior designer would hand over: outlined vector masters in every colourway, exports for web, print, mobile and social, a favicon and app-icon set, colour specification with CMYK reference, licensed fonts, and a usage guide that tells a non-designer which file to open. Config-driven, so every client gets the identical structure.
- **Version:** 1.0.0

## Why this exists

A logo round ends with a client saying "that one". What usually follows is someone
emailing a PNG. Three months later the practice manager is putting a stretched
screenshot on a pull-up banner, the printer is asking for vector and getting a
72dpi JPEG, and the favicon is a squashed crop of the full lockup.

The package is the deliverable, not the mark.

Two specific failures killed the first pass of this on Solas, and the gate exists
because of them:

**Lettering left as live text.** The wordmark was `font-family:'Lora',Georgia,serif`.
That renders correctly on the machine that made it and silently becomes Georgia
everywhere else — a different logo, on a letterhead, with nobody noticing.
Everything this skill ships has the lettering **converted to outlines**.

**A stale palette hiding in the artwork.** The approved mark still carried
`fill="#C05A67"` from a pre-approval palette. The page's CSS tokens had been
updated; SVG `fill=` attributes are not tokens, so a find-and-replace over tokens
never reached the artwork. The client was looking at the approved logo in the
wrong brand colour. The build recolours from config and the gate rejects any fill
the config does not declare.

## When to use it

Use it once a direction is **approved** — not to explore options. Exploration is
`logo-selection`; this is what happens after the client picks.

| | `logo-selection` | `logo-asset-kit` |
|---|---|---|
| Question | which direction? | how does everyone use the one we chose? |
| Output | review pages + VisID sheets | a zip you hand to a developer, printer or client |
| Writes to | `demos/<brand>/logo-selection*` | `demos/<brand>/logo-asset-kit/` |
| Gate | `npm run logos:check` | `npm run kit:check <brand>` |

## How to run it

```bash
npm run kit:init <brand>     # scaffold a config for a brand that has none
npm run kit <brand>          # build  → demos/<brand>/logo-asset-kit/<Name>_Logo-Assets_v1.zip
npm run kit:check <brand>    # gate   → run before sending, every time
```

Dependencies, once per machine:

```bash
npm install                             # playwright, for PNG and PDF export
npx playwright install chromium         # the browser binary itself
pip install fonttools brotli Pillow     # outlining, and favicon.ico
```

Skip `npx playwright install` and the build fails at step 3 with a browser-not-found
error. Some environments ship Chromium already; the build uses it if
`PLAYWRIGHT_CHROMIUM` or `/opt/pw-browsers/chromium` exists, and falls back to
Playwright's own download otherwise.

## Running it for a client that has no config yet

```bash
npm run kit:init <brand>
```

That inspects the brand folder and answers the questions you would otherwise dig
for, then writes a scaffold config with every unknown marked `TODO`:

- **candidate marks** — every labelled `<svg>` in the brand's pages that carries
  real path data, largest first, with the fills each one is currently using. The
  biggest is almost always the mark; the fills tell you immediately whether the
  artwork is still on an old palette.
- **font files on disk**, so you are picking from what exists rather than guessing
  a path.
- **the most-used colours in the brand**, to sanity-check against what the client
  actually approved.

Then fill in the TODOs. The three that need care:

1. **Is that mark the approved direction?** The build will happily recolour a
   superseded mark into the approved palette and pass every check. Nothing
   downstream can catch this. Open the page and look.
2. **Weight and tracking come from the CSS of the approved lockup** — find the
   rule that sets the wordmark (`letter-spacing`, `font-weight`, `font-size`) and
   copy the numbers. Do not eyeball them; a wordmark at the wrong tracking is a
   different wordmark. To confirm a font file's family, weight axis and glyph
   coverage:
   ```bash
   python3 scripts/logo-asset-kit/lib/fontinfo.py demos/<brand>/<font.woff2> "YOUR WORDMARK"
   ```
3. **`lockups` is where a multi-tone logo is declared** — one entry per colourway,
   each naming the colour of *every part*. If the mark is one colour and the
   wordmark another, say so here. Flattening a lockup to a single colour is the
   most common way this goes wrong.

Then build, check, and work the handover checklist at the bottom of this file.

## The one file you write per client

`demos/<brand>/logo-asset-kit.config.json`. Copy
`scripts/logo-asset-kit/config.example.json` and fill it in. Everything else is
derived — no per-client scripting, which is the whole point: change the export
matrix in `scripts/logo-asset-kit/lib/jobs.js` and every client's bundle changes
together.

The fields that carry real decisions:

- **`mark.from` / `mark.ariaLabel`** — where the approved artwork lives. Point it
  at the logo-selection page for the chosen direction and the `aria-label` of its
  `<svg>`. The build lifts the paths and **recolours them from config**, so
  whatever palette the source is carrying does not matter.
- **`wordmark` / `subline`** — the text, the font file, the weight, the tracking.
  Take tracking and weight from the CSS of the approved lockup; do not eyeball it.
  Variable fonts are instantiated at the requested weight.
- **`lockups`** — one entry per colourway, each naming the colour of *every part*.
  This is where multi-tone logos are declared, and where the failure of flattening
  a lockup to one colour is prevented.
- **`smallSizeColourway` / `faviconMark`** — a light brand colour disappears at
  16px. Name the darker variant here and the favicons and the guide both use it.
- **`palette`**, **`minSizes`**, **`clearSpace`**, **`do` / `dont`** — feed the
  usage guide and the colour spec.

## What gets produced

```
<Name>_Logo-Assets_v1/
├── 00_READ-ME-FIRST.pdf     logo anatomy, which-file-do-I-use, clear space, do/don't
├── 01_Master-Vector/        SVG + vector PDF — the originals
├── 02_Web/                  SVG, PNG @1x/@2x/@3x, favicon set + .ico + manifest
├── 03_Print/                300dpi rasters for a printer that refuses vector
├── 04_Mobile-and-Social/    iOS 1024, Android adaptive, profile, OG, email signature
├── 05_Fonts/                the typefaces, with licence notes
└── 06_Brand-Colors/         COLOUR-SPEC.txt, palette .json, palette .css
```

Four assets — mark, wordmark, stacked lockup, horizontal lockup — across every
configured colourway, exported to every format the brand will need.

**The guide is not optional decoration.** It is the difference between a folder of
files and a package someone can use without asking a designer. It leads with logo
anatomy — which colour goes on which part — because that is what breaks first
downstream.

## The gate

`npm run kit:check <brand>` fails the bundle on:

- `<text>` or `font-family` in any master — lettering that is not outlined
- any `fill` not declared in the config's colourways — a stale palette leak
- a missing `viewBox` — artwork that will not scale predictably
- an under-populated folder the guide tells the client to open
- a missing guide, manifest or colour spec
- any zero-byte export — a silent render failure

It warns when no one-colour lockup is configured, because single-ink printing and
engraving will have nothing to use.

**Run it before sending. A logo package fails quietly** — nothing looks broken
until it is on someone's letterhead.

## Honest limits, state them to the client

- **No EPS or AI.** Those need Illustrator. Vector PDF is the universal print
  interchange format and every printer accepts it. If a printer specifically
  demands `.ai`, that is an Illustrator round-trip outside this pipeline.
- **CMYK values are conversions, not measured press values.** The spec file and
  the guide both say so. Always tell the client to get a proof and match to the
  proof, never to a screen.
- **No Pantone.** If a spot colour is needed, have the printer match to a proof of
  the primary swatch.

## Checklist before handing it over

1. Is the source artwork the **approved** direction, and does the config's palette
   match what the client signed off? The build will happily recolour a stale mark
   into the right colours — it will not tell you that you pointed at the wrong
   mark.
2. `npm run kit:check <brand>` — clean.
3. Open `00_READ-ME-FIRST.pdf` and read the anatomy block. Is that actually the
   logo?
4. Look at the smallest favicon. If the mark has dissolved, raise
   `faviconMark` to a darker colourway.
5. If the live site or proposal pages still carry the old palette in their SVG
   artwork, **say so** — the bundle being right does not make the website right.
