# Phase 02: Component Mapping

## Purpose
Map every section from the content extraction to a specific shared component. Identify any gaps where the source page uses patterns not covered by the existing library.

## Inputs
- Approved `output/01-content-extraction.md`

## Process

### 1. Map Each Section to a Component
Work through the extraction document top to bottom. For each section, assign the closest shared component:

| Source Section | Shared Component | Notes |
|---------------|-----------------|-------|
| Site header | `header-nav` | Logo left, nav right, CTA button |
| Hero / banner | `hero-section` | Full-width, H1 + subhead + CTA(s) |
| Features / benefits grid | `value-card` (×N) | Icon + title + description per card |
| Numbers / metrics | `stat-counter` (×N) | Number + label pairs |
| How it works / steps | `process-step` (×N) | Numbered sequence |
| Customer quotes | `testimonial` | Quote + attribution |
| FAQ / expandable | `accordion` | Q&A items |
| Contact or lead form | `contact-form` | Fields + submit |
| Generic text + image | `content-section` | Centered container |
| Site footer | `footer` | Multi-column |

### 2. Flag Non-Standard Patterns
If a source section doesn't map cleanly to an existing component, document it:
```
[Section name]: No direct match.
Closest approximation: [component name]
Required extension: [what needs to be added]
Proposed handling: [how to handle it — adapt existing or note as custom]
```

### 3. Document Section Order
Record the final page structure as an ordered list — this becomes the build blueprint:
```
1. header-nav
2. hero-section
3. stat-counter × 4 (stats bar)
4. value-card × 3 (why choose us)
5. process-step × 3 (our process)
6. testimonial × 1
7. contact-form
8. footer
```

### 4. Write Component Map
Produce `output/02-component-map.md`:

```markdown
# [Brand/Page Name] — Component Map

## Source: [URL]

## Page Structure
1. [component] — [brief note]
2. [component] — [brief note]
...

## Component Details

### header-nav
- Logo: [text/filename]
- Nav links: [label → anchor, ...]
- CTA: [label → destination]

### hero-section
- Eyebrow: [text]
- H1: [exact text]
- Subheadline: [text]
- CTA primary: [label → destination]
- CTA secondary: [label → destination or none]
- Background: [local image — alt text]

### [Each component with its content slots filled in]

## New Component Variants
[None / or list each: source pattern → closest existing component → what the variant adds, built strictly from existing tokens (no new colors/fonts/radii)]

## Brand Layer
- Source: [existing sibling pages at <path> — reuse their inline token+component set verbatim / separate brand.css at <path> / none — system defaults, brand.css missing]
- Logos/assets: [reused existing asset / downloaded from source]
```

## New Component Variants
When a source section has no clean match, you may introduce a variant **built only from the existing design system's tokens** (e.g. a `product-card` extending an existing card). Document it; raise it as a clarifying question only if the right approach is genuinely ambiguous.

## Outputs
- `output/02-<pageset>-component-map.md` — Complete section-by-component mapping

## Success Criteria
- Every source section assigned to a component (or a token-compliant variant)
- New variants documented
- Page order clearly defined
- Brand layer source identified

## Checkpoint — non-blocking
Do **not** stop for sign-off. Proceed to Phase 03. If — and only if — a section needs a build decision per SKILL.md "Clarifying-Question Triggers" (unmatched pattern needing a routing/variant call, garbled source copy, an implied-but-missing section, or a net-new section the user requested), batch those into a single `AskUserQuestion`, apply the answers, then build. Otherwise build straight through.
