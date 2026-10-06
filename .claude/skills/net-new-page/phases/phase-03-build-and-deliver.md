# Phase 03: Build & Deliver

## Purpose
Build the complete HTML page from the approved blueprint. Real copy throughout, labeled placeholders for every image, system defaults for brand styling with a customization offer before final delivery.

## Inputs
- Approved `output/01-page-brief.md`
- Approved `output/02-page-blueprint.md`

## Process

### 1. Determine Output Path
- If a matching brand folder exists (`demos/[slug]/`): write to `demos/[slug]/[page-name].html`
- If no brand folder: write to `pages/[slug].html`

### 2. Resolve Brand Stylesheet
Check for existing brand CSS:
```
demos/[slug]/assets/brand.css  →  link it
```
If not found, use `shared/system.css` only and note it with a comment:
```html
<!-- No brand.css found. Using system defaults.
     Add demos/[slug]/assets/brand.css to apply brand colors.
     Or accept the token customization offer at the end of this phase. -->
```

### 3. Build the HTML File
Follow the blueprint section order exactly. Every content slot uses copy from the approved brief.

**File header:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Page title from brief]</title>
  <meta name="description" content="[One-sentence page description from brief content]">
  <link rel="stylesheet" href="../../shared/system.css">
  <!-- <link rel="stylesheet" href="assets/brand.css"> -->
  <style>
    .img-placeholder {
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      border-radius: 4px;
      color: #6b7280;
      font-size: 0.875rem;
      text-align: center;
      padding: 1rem;
    }
  </style>
</head>
<body>
```

### 4. Render Each Section
Build from the blueprint. Use shared BEM class names. No deviations from approved copy.

**Every image slot uses this pattern:**
```html
<!-- IMAGE PLACEHOLDER: [subject description] — replace with asset -->
<div class="img-placeholder" style="aspect-ratio: [ratio];">
  <span>[subject description from blueprint]</span>
</div>
```

**Content gaps from the brief** — mark inline:
```html
<!-- CONTENT NEEDED: [what's missing — e.g., "client phone number"] -->
<p>[Client phone number TBD]</p>
```

### 5. Quality Checklist
Before offering token customization:
- [ ] All copy from the approved brief (no invention)
- [ ] No lorem ipsum
- [ ] Every image slot is either a labeled placeholder or a real `<img>` with alt + `width`/`height`
- [ ] Correct heading hierarchy (one H1, logical H2/H3)
- [ ] All CTAs present with correct labels and destinations
- [ ] Mobile responsive (shared system breakpoints)
- [ ] Valid `<title>` and `<meta name="description">`
- [ ] WCAG AA: all text meets contrast ratio (with system defaults)
- [ ] Page weight < 500 KB (excluding images)
- [ ] No broken internal anchor links
- [ ] **Design craft** — `npm run craft:scan` has no errors, and every warning is fixed or answered in `02-…` (see `docs/DESIGN-CRAFT.md`). Run the **subtraction pass**: every ornament traces to the concept or goes; no two neighboring sections share a module; headlines are the client's words in sentence case with no em dashes; closed drawers are `inert`/`visibility:hidden`; the sticky header has a scroll offset.
- [ ] **Structural consistency (self-heal)** — run the `structure-fix` loop: it scans, auto-repairs, and
      re-scans until `npm run structure:scan` is clean (no orphan page, no broken links; this page declared
      in `site.manifest.json` and wired into the hub + nav + Sitemap; component/pattern work folded into the
      Style Guide, not a standalone artifact). It fixes drift automatically and only pauses to confirm before
      deleting/overwriting a page — don't hand the user a raw scanner error.

### 6. Offer Token Customization
If no `brand.css` was found, present this before delivering:

```
The page is built using system defaults (blue primary, gray neutral).

Want to apply brand colors before I deliver?
- Primary color (hex): buttons, links, accents
- Secondary color (hex): backgrounds, hover states
- Font: Google Fonts name or "keep system default"

Reply with the values or say "skip" to get the page as-is.
```

If the user provides tokens: add a `<style>` block to the page head:
```html
<style>
  :root {
    --brand-primary: [hex];
    --brand-secondary: [hex];
    /* font-face or Google Fonts link if requested */
  }
</style>
```

### 7. Image Brief — and Optionally the Images Themselves

Always produce `output/03-image-brief.md` when the page has 2+ image placeholders:

```markdown
# [Page Title] — Image Brief

Images needed before this page can ship. Provide assets at the paths listed.

| # | Section | File Path | Dimensions | Aspect Ratio | Subject | Mood |
|---|---------|-----------|-----------|-------------|---------|------|
| 1 | hero | assets/images/hero.webp | 1600×700 | 16/7 | [desc] | [mood] |
| 2 | [section] | assets/images/[file] | [dims] | [ratio] | [desc] | [mood] |
```

**If the brand has `demos/<brand>/imagery.profile.json`**, also write the machine-readable
sidecar `output/03-image-brief.json` and offer to fill the placeholders for real:

```jsonc
{ "page": "[Page].html",
  "images": [
    { "slot": "hero", "file": "hero.webp", "page": "[Page].html",
      "subject": "[what the picture is of — not its style]",
      "alt": "[what a sighted visitor would see]" }
  ] }
```

Ask:

```
This page has [N] image slots. Want me to:
  1. Generate them now — on-brand images, downloaded and wired in
  2. Just the brief — a spec sheet for your designer
  3. Skip — leave the labeled placeholders
```

On **1**, hand off to the **`brand-imagery`** skill: it dry-runs the prompts, generates, downloads
into `assets/images/`, replaces each placeholder div with a real `<img>` (alt + `width`/`height` +
`loading="lazy"`), and merges provenance into `site.manifest.json`. Any slot that fails keeps its
placeholder — that is the correct outcome, and it goes in the delivery summary.

If the brand has **no** imagery profile, don't offer option 1 — offer to create the profile first
(`brand-imagery` step 1) or proceed with the brief.

**Never generate a slot that needs legible text in it** (a wordmark, a UI screenshot, a chart).
Image models produce convincing gibberish. Real asset or placeholder.

### 8. Deliver
Output the file path and a delivery summary.

## Outputs
- `demos/[slug]/[page].html` or `pages/[slug].html` — Complete built page
- `output/03-image-brief.md` — Image spec sheet (2+ placeholders)
- `output/03-image-brief.json` — Machine-readable brief for `brand-imagery` (if the brand has an imagery profile)
- `assets/images/*` — Generated images, if the user chose to generate

## Success Criteria
- Opens in browser without errors
- All real copy in place, zero invention
- Every image placeholder clearly labeled and described
- Token customization applied or explicitly skipped
- User has clear next steps

## Delivery Summary Format
```
## Page Complete: [Page Title]

**Output:** [file path]

**Sections built:** [N]
**Images needing replacement:** [N] placeholders
**Content gaps flagged:** [N inline notes or "none"]
**Brand styling:** [system defaults / brand.css applied / custom tokens applied]

**Images needed:**
- [Section]: [subject] → [file path]

**Next steps:**
1. Replace [N] image placeholders with real assets
2. [If tokens not applied] Create brand.css or accept token customization
3. Fill any [CONTENT NEEDED] gaps
4. Run `npm run build && npm run serve` to preview locally
5. Deploy: push to main or open a PR for a Surge preview
```
