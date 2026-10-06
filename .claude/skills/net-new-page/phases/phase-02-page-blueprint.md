# Phase 02: Page Blueprint

## Purpose
Translate the approved content brief into a precise section-by-section build plan. Every component named, every content slot filled, every image placeholder specified. No surprises in Phase 03.

## Inputs
- Approved `output/01-page-brief.md`

## Process

### 1. Design the Section Order
Map content from the brief to the most effective page flow for the stated goal. Standard conversion-focused order:

```
1. header-nav          — Logo, nav, header CTA
2. hero-section        — Headline, subhead, primary CTA
3. [social proof bar]  — stat-counter × N (if stats available)
4. value-card × N      — Key benefits (3–4 is ideal)
5. process-step × N    — How it works (if applicable)
6. testimonial         — Customer proof (if provided)
7. [secondary CTA]     — content-section with CTA
8. contact-form        — Lead capture (if applicable)
9. footer              — Links, contact info, legal
```

Adjust order based on the page's specific goal and available content. Not every section is required.

**This order is a content flow, not a layout.** Give each section a *different* module (see
`docs/DESIGN-CRAFT.md` §6): a stat row, not a stat card grid; a numbered or ruled list, a photo split,
a full-bleed band with one sentence, a spec table — at most one plain equal-card row per page. Name the
page's one idea (sourced from the brief) at the top of the blueprint and note which device expresses it.

### 2. Fill Each Component Slot
For each section in the page order, specify:
- Component name
- Every content slot with actual copy from the brief
- Image placeholder description (if the section has an image)
- CSS classes or layout modifiers needed

### 3. Specify Every Image Placeholder
For each image in the page, document:
- Section it belongs to
- Ideal aspect ratio
- Subject description (what the image should show)
- Mood/tone (e.g., "professional, outdoor, solar installation in progress")
- Suggested dimensions for the designer

### 4. Write Page Blueprint
Produce `output/02-page-blueprint.md`:

```markdown
# [Page Title] — Page Blueprint

## Page Order
1. header-nav
2. hero-section
3. [etc.]

---

## Section 1: header-nav
- Logo: [text placeholder or filename if provided]
- Nav links: [label → anchor, label → anchor, ...]
- Header CTA: [label → destination]

---

## Section 2: hero-section
- Layout: [full-width / split / centered]
- Eyebrow: [text or none]
- H1: [exact text from brief]
- Subheadline: [exact text from brief]
- CTA primary: [label → destination]
- CTA secondary: [label → destination or none]
- Image: PLACEHOLDER
  - Aspect ratio: 16/9
  - Subject: [describe ideal hero image]
  - Mood: [describe feel]
  - Dimensions: 1440 × 810px recommended

---

## Section 3: stat-counter (if applicable)
- Stat 1: [number] / [label]
- Stat 2: [number] / [label]
- [etc.]

---

## Section N: value-card × [count]
- Layout: grid-[count]
- Card 1:
  - Icon: [describe or "none"]
  - Title: [text]
  - Description: [text]
- Card 2: [etc.]

---

## [Continue for each section]

---

## Image Placeholders Summary
| Section | Aspect Ratio | Subject | Mood | Dimensions |
|---------|-------------|---------|------|-----------|
| hero | 16/9 | [desc] | [mood] | 1440×810 |
| [etc.] | | | | |

## Brand Context
- Using: [brand.css path / system defaults]
- Token customization: [will offer at Phase 03 end / already applied]

## Content Gaps Handled
- [Slot]: [how it's handled — placeholder, TBD label, or omitted]
```

## Outputs
- `output/02-page-blueprint.md` — Complete build plan

## Success Criteria
- Every section from the brief accounted for
- Every content slot filled with real copy or explicitly marked as placeholder
- Every image slot described with enough detail for a designer
- Section order optimized for the stated conversion goal
- No ambiguity for Phase 03 to resolve

## User Checkpoint
**BLOCKS** — Present the blueprint and ask:
"Here's the full page structure — every section, component, and content slot mapped out. Does this look right? Any sections to add, remove, or reorder before I build the HTML?"
