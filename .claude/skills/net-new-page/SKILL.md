# Net New Page Skill

## Identity
- **Name:** `net-new-page`
- **Display name:** Net New Page
- **Description:** Build a production-ready page from scratch using user-provided context — a brief, pasted content, or a doc. No existing URL required. Images are placeholder unless the user provides them, or the brand has an imagery profile and the user opts into generation (see `brand-imagery`). One page per run; multi-page support is a planned follow-on.
- **Version:** 1.0.0

## Activation Triggers
This skill activates when:
- User says "build a new page", "create a page for [X]", or "I need a landing page for [X]"
- User provides a brief or doc with content but no source URL to rebuild from
- User says "start fresh" or "build from scratch" with page context
- User pastes a Google Doc URL or inline content brief and asks for a page

## Process Overview

### Phase 01 — Context Intake
- Accepts freeform input: inline brief, pasted content, Google Doc URL, or answers to 4 focused questions
- Produces `output/01-page-brief.md` — structured content outline with flagged gaps
- Blocks on user confirmation before proceeding

### Phase 02 — Page Blueprint
- Maps confirmed content to section structure using shared components
- Documents every image slot as a labeled placeholder
- Produces `output/02-page-blueprint.md` — section-by-section build plan
- Blocks on user approval before building

### Phase 03 — Build & Deliver
- Builds the complete HTML page from the approved blueprint
- Uses system defaults for brand colors/font if no brand.css exists
- Offers a quick token customization step before final delivery
- Optionally outputs `output/03-image-brief.md` — image spec sheet for designer handoff

## The 4 Page Questions
Used only when user hasn't provided enough context. Focused, not the full 10-question brand intake:

1. **Purpose:** What is this page for? Who sees it, and what decision does it drive?
2. **Action:** What's the one thing you want the visitor to do?
3. **Tone:** What tone should this hit? (Match an existing brand? Describe the feel.)
4. **Content:** What content do you have? (Paste headlines, bullets, testimonials, stats, bios — everything.)

If the user has already provided enough context through a brief or doc, skip straight to Phase 02.

## Key Rules
- **No lorem ipsum** anywhere in the output
- **Explicit placeholders** for every image slot — never a gray box with no label. A placeholder can be filled for real at the end via `brand-imagery`; an unlabeled box can never be
- **No invented facts** — stats, testimonials, and claims must come from user-provided content
- **One page per run** — for multiple pages, run the skill again
- **Inherit brand context** — if a matching `brand.css` exists in the repo, use it automatically
- **No `demo.json`** — page skills do not produce portal entries
- **Structural consistency (self-heal)** — if the brand has a `site.manifest.json`, read it before building
  and honor it (components live in the Style Guide page, not a new artifact); after building, run the
  `structure-fix` loop so `npm run structure:scan` ends clean and any new page is declared + wired into the
  hub + nav. It auto-repairs drift and only pauses to confirm before deleting/overwriting a page. See `demos/README-manifest.md`.

## Image Placeholder Pattern
Every image slot uses this markup:
```html
<!-- IMAGE PLACEHOLDER: [describe ideal image — subject, mood, orientation] -->
<div class="img-placeholder" style="aspect-ratio: [ratio];">
  <span>[describe ideal image]</span>
</div>
```
With this CSS in the page `<style>` block:
```css
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
```

## Brand Fallback Behavior
When no `brand.css` exists for this page:
1. Build using `shared/system.css` defaults (neutral blue/gray palette)
2. At the end of Phase 03, offer a quick customization step:
   - Primary color (hex)
   - Secondary color (hex)
   - Font family (Google Fonts name or "system default")
3. Apply the tokens and re-deliver, or skip if the user wants to handle it separately

## Quality Checklist
Before delivery:
- [ ] All content sourced from user-provided context (no invention)
- [ ] Every image slot clearly labeled as placeholder
- [ ] No lorem ipsum
- [ ] Semantic HTML5 with correct heading hierarchy
- [ ] WCAG AA compliant
- [ ] Mobile responsive
- [ ] Valid meta title and description
- [ ] Primary CTA present and prominent
- [ ] Page weight < 500 KB (excluding images)

## Shared Components Reference
Map content to these:
- `header-nav` — Logo left, nav right, CTA button
- `hero-section` — Full-width above-the-fold
- `value-card` — Icon + headline + description
- `testimonial` — Quote + author
- `stat-counter` — Number + label
- `process-step` — Number + title + description
- `contact-form` — Fields + submit
- `accordion` — Expandable FAQ
- `pricing-table` — Tiers with features
- `content-section` — Generic text block
- `footer` — Multi-column with links

## Failure Modes
- **Too little content:** Ask the 4 page questions, then proceed
- **Conflicting tone signals:** Surface in Phase 01 brief, ask user to choose
- **No brand context at all:** Use system defaults, offer token customization at Phase 03
- **Image placement instructions unclear:** Mark as placeholder, add note in image brief
- **Placeholder needs a real image:** If the brand has `imagery.profile.json`, offer generation via `brand-imagery`; otherwise the brief is the deliverable
- **Requested feature not in component library:** Build custom HTML, document as non-standard
