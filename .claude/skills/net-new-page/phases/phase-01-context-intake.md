# Phase 01: Context Intake

## Purpose
Understand what the page needs to do, who it's for, and what content exists. Produce a structured brief that gives Phase 02 everything it needs to blueprint the page.

## Inputs
- User's freeform context: inline brief, pasted content, Google Doc URL, or answers to the 4 page questions

## Process

### 1. Assess What Was Provided
Evaluate the user's input before asking questions:

**Sufficient to proceed without questions:**
- A pasted doc or detailed brief that covers: purpose, audience, desired action, and content
- A Google Doc URL (fetch via Google Drive MCP if available, or ask user to paste)
- Answers to all 4 page questions

**Ask the 4 questions if:**
- The input is vague (e.g., "I need a page for our roofing company")
- Content is missing (no headlines, no copy, no value props)
- The purpose or audience is unclear

### 2. Ask the 4 Page Questions (if needed)
Present as a single grouped ask — not one by one:

```
To build the best page for you, I need a few things:

1. **Purpose:** What is this page for? Who sees it, and what decision should it drive?
2. **Action:** What's the one thing you want the visitor to do? (Call, fill out a form, book, buy?)
3. **Tone:** What feel should this have? (Match an existing brand? Describe the voice — professional, approachable, bold, technical?)
4. **Content:** Paste everything you have — headlines, bullet points, testimonials, stats, bios, service descriptions, whatever exists. More is better; I'll organize it.
```

### 3. Extract and Structure the Content
From the user's input (or their answers), extract and organize:

**Page identity**
- Page title / working name
- Target audience (one primary person)
- Primary goal (one action)
- Tone attributes (must hit / must avoid)

**Content inventory**
- Hero headline (or best candidate from provided content)
- Supporting subheadline
- Value propositions / key benefits (list)
- Stats or proof points (number + label)
- Testimonials (quote + attribution — only if provided)
- Process or how-it-works steps (if applicable)
- FAQ items (if provided)
- Contact info (phone, email, address)
- CTA label and destination

**Gaps**
- List any content slots that are empty and will need placeholder handling

### 4. Check for Existing Brand Context
Look for a matching brand folder in the repo:
```
demos/[slug]/assets/brand.css
```
If found, note it. If not, note that system defaults will be used with a customization offer at delivery.

**Also read the brand's structure contract (stay on the beaten trail).** If `demos/[slug]/site.manifest.json`
exists, read it and the artifacts it names (the hub, the page whose role is `style-guide`, plus any
Sitemap / Brand Book / Search-strategy pages). Honor its placement rules: **component/pattern work belongs
in the Style Guide page (`components.home`), never a new standalone artifact**, and a genuinely new page
must gain a manifest entry and be wired into the hub + nav (+ the Sitemap page if one exists). No manifest →
reuse the existing design layer as today. Schema: `demos/README-manifest.md`.

### 5. Write Page Brief
Produce `output/01-page-brief.md`:

```markdown
# [Page Title] — Page Brief

## Purpose
- **For:** [audience description]
- **Goal:** [one action]
- **Tone:** [attributes — hit / avoid]

## Content Inventory

### Hero
- Headline: [text or TBD]
- Subheadline: [text or TBD]
- CTA primary: [label → destination]
- CTA secondary: [label → destination or none]
- Hero image: [description or PLACEHOLDER]

### Value Propositions
1. [Title]: [description]
2. [Title]: [description]
3. [Title]: [description]

### Proof / Stats (if any)
- [Number]: [label]

### Testimonials (if any)
- "[Quote]" — [Attribution]

### Process / Steps (if any)
1. [Title]: [description]

### FAQ (if any)
- Q: [question] / A: [answer]

### Contact / CTA Section
- Phone: [number or TBD]
- Email: [email or TBD]
- CTA: [label → destination]

### Footer
- Links: [page names]
- Legal: [copyright or TBD]

## Brand Context
- Brand CSS: [found at demos/[slug]/assets/brand.css / not found — will use system defaults]

## Content Gaps
- [Slot]: [what's missing — placeholder or ask user]
```

## Outputs
- `output/01-page-brief.md` — Structured content brief

## Success Criteria
- Purpose, audience, and primary action clearly defined
- All available content organized into content slots
- Gaps explicitly listed — nothing silently omitted
- No invented content added

## User Checkpoint
**BLOCKS** — Present the brief and ask:
"Here's what I'll build from. Does this capture the intent? Any content to add or correct before I map out the page structure?"
