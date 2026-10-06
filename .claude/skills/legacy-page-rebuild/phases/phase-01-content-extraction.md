# Phase 01: Content & Asset Extraction

## Purpose
Fetch the source URL(s) and produce a complete, structured content inventory — every heading, paragraph, CTA, link, and image — ready to be mapped to components. Capture the **real image URLs** (not just alt text) so Phase 03 can download and host them locally.

## Inputs
- One or more URLs from the user

## Process

### 1. Fetch Each URL (content + raw HTML)
Use WebFetch on each URL for structured content. Then fetch the **raw HTML** of each URL (e.g. `curl`) and harvest the real image URLs — `<img src>`/`srcset`, `og:image`, and inline/CSS `background-image`. Resolve relative paths against the page origin and record absolute URLs. If a page is JavaScript-rendered and content is sparse, note the gap and ask the user to paste the missing sections.

### 2. Extract Content by Section
For each page, walk top to bottom and extract:

**Navigation**
- Logo text/image filename
- All nav link labels and anchor targets
- Primary CTA in header (label + destination)

**Hero / Above the Fold**
- Eyebrow text (if any)
- H1 headline (exact text)
- Subheadline or supporting paragraph
- CTA button label(s) and destinations
- Background image filename or alt text

**Each Content Section**
- Section heading (exact H2/H3 text)
- Body paragraphs (exact text)
- Any lists (preserve bullet points)
- Cards: title + description (all of them)
- Stats: number + label pairs
- Process steps: number + title + description
- Testimonials: quote text + attribution
- Form fields: labels + placeholder text

**Footer**
- Logo
- Column headings and all links
- Address, phone, email
- Legal/copyright line

**Images**
- Record each image's **absolute source URL**, its alt text (or `[no alt]`), and the section it appears in
- Flag any background/hero images with their CSS property context
- These URLs are downloaded and localized in Phase 03 — never hotlinked

### 3. Note What's Missing
If content appears to be dynamically loaded or is inaccessible:
- Mark the section `[CONTENT MISSING — user to provide]`
- List all missing sections at the end of the extraction doc

### 4. Write Extraction Document
Produce `output/01-<pageset>-content-extraction.md` (suffix it per rebuild — e.g. `01-products-content-extraction.md` — so prior artifacts are never overwritten):

```markdown
# [Brand/Page Name] — Content Extraction

## Source URL(s)
- [URL]

## Navigation
- Logo: [text or filename]
- Links: [label → target], [label → target], ...
- Header CTA: [label → destination]

## Hero
- Eyebrow: [text or none]
- H1: [exact text]
- Subheadline: [exact text]
- CTA 1: [label → destination]
- CTA 2: [label → destination or none]
- Hero image: [filename / alt text]

## Section: [Section Heading]
- Body: [paragraph text]
- Cards:
  - [Title]: [description]
  - [Title]: [description]
- Image: [alt text — filename]

## [Repeat for each section]

## Footer
- Logo: [text or filename]
- Column 1: [heading] — [link, link, ...]
- Contact: [phone] | [email] | [address]
- Legal: [copyright line]

## Images Inventory
| Alt Text | Source URL (absolute) | Local target | Section |
|----------|-----------------------|--------------|---------|
| [alt] | [https://…] | assets/images/[name] | [section] |

## Flags (collect, don't block)
- [Section]: [content missing / truncated source copy / no clean component match]
```

## Outputs
- `output/01-<pageset>-content-extraction.md` — Complete structured content + image-URL inventory

## Success Criteria
- Every visible section on the source page documented
- All CTAs captured with exact labels
- Every image inventoried with its **absolute source URL** and alt text
- Content gaps and ambiguities flagged
- No invented content added

## Checkpoint — non-blocking
Do **not** stop for sign-off. Note the extraction artifact and proceed straight to Phase 02. Carry any items in **Flags** forward; only the section-level decisions listed in SKILL.md "Clarifying-Question Triggers" get raised to the user (batched), and only later once mapping confirms they're real.
