# YohDev Website Playbook

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A **brand-agnostic website build system** for Claude Code — a set of skills, a demo portal, an
accessibility gate, and a preview/deploy pipeline for producing consistent, high-quality pages on
any client's design system. Build a single page, a hub-and-spoke cluster, or a full brand site;
rebuild a legacy URL or start from a brief; run it interactively or headlessly.

> Built by [YohDev](https://yohdev.com). Fork this repo to spin up a website playbook for a client —
> see [Using This as a Base](#using-this-as-a-base).

## The build system

Every build is defined by a **source** (rebuild a live URL, or start from a brief) and a **scope**
(one page, or a hub + spokes cluster). A front-door skill routes non-technical users to the right
builder. The full map is in **[docs/BUILD-SYSTEM.md](docs/BUILD-SYSTEM.md)** — start there.

| Need | Skill |
|---|---|
| Walk a (non-technical) user through a build | `guided-build` (front door; routes to the rest) |
| Rebuild one live page into a brand's design system | `legacy-page-rebuild` |
| Build one new page from a brief | `net-new-page` |
| Build a cluster (hub/pillar + spokes), one per run | `pillar-cluster` |
| Stand up a full brand site (homepage + brand books) | `yohdev-website-refresh` |
| Apply client Markup.io review feedback to a built page | `markup-review` |
| Fire a legacy cluster rebuild unattended | `automation/legacy-cluster-routine/` |
| Scan/fix output pages for ADA / WCAG AA | `ada-compliance-scan` |

Each skill lives in `.claude/skills/<skill>/SKILL.md` (with `phases/` for the multi-step builders).

## Quick Start

```bash
npm install                      # one time
npm run build && npm run serve   # build the demo portal, preview at http://localhost:8000
```

Then ask Claude Code to build something — e.g. "walk me through building a page" (routes through
`guided-build`), or invoke a builder directly.

## Accessibility gate (ADA / WCAG 2.1 AA)

Output pages must pass a zero-dependency accessibility scan before they ship — color contrast
(including the common red-on-dark failure), plus structural checks (lang, title, alt text, control
names, form labels, heading order, duplicate ids, disabled zoom).

```bash
npm run ada:scan            # full audit of every demos/<brand>/output/*.html
npm run ada:scan:staged     # only the output pages staged for commit
npm run ada:install-hook    # install the pre-commit gate (blocks failing staged pages)
```

The same scanner runs in CI on every PR: it uploads a full HTML report as an artifact, comments a
whole-site summary, and **blocks merge/deploy on the output pages changed in that PR**. See the
`ada-compliance-scan` skill and [docs/BUILD-SYSTEM.md](docs/BUILD-SYSTEM.md).

## Full brand sites — the brand intake pipeline

The `yohdev-website-refresh` skill turns **structured brand intake data** into a deployable brand
site across six phases (Intake → Research → System → Home Page → Design System → Package), running
headlessly end-to-end — phases advance automatically, gated only by the deterministic `ada:scan` /
`structure:scan` checks, with no human-approval pause in between. It ships a mobile-responsive
homepage (with a right-side hamburger fly-out nav) plus an **audience-split set of brand books**,
fronted by a routing hub:

- **Brand Basics** — a plain-language marketing one-pager (*for marketing & owners*), no code
- **Brand Playbook** — the full brand story (*for brand & stakeholders*)
- **Design System** — tokens, components, and `theme.json` (*for designers & developers*)
- **Brand Books** — the hub that routes each audience to the right guide

The skill reads `intake/answers.json` — a `BrandIntakeAnswers`-shaped JSON file — instead of a
manually-assembled folder of briefing documents. See
`.claude/skills/yohdev-website-refresh/reference/intake-contract.md` for the exact contract.

Two helper prompts still exist to help technical sales reps produce the **pre-sale** discovery
package that HubSpot/deal-review process expects (a separate, external artifact — this pipeline does
not read it):

- **Sales Discovery Prompt** — `.claude/skills/yohdev-website-refresh/prompts/sales-discovery-prompt.md`
- **Handoff Template Generator** — `.claude/skills/yohdev-website-refresh/prompts/handoff-template-generator.md`

```bash
npm run skill                      # run the pipeline (or: "run the YohDev playbook")
npm run state:status               # check phase progress
```

Full detail: `.claude/skills/yohdev-website-refresh/SKILL.md`.

## Demo Portal

The site root is a **demo portal** that auto-lists every playbook under `demos/`. Each demo is a
self-contained folder with a small manifest:

```
demos/<slug>/
├── demo.json        # title, location, blurb, logo, status — drives the portal card
├── index.html       # the demo's own landing page (entry point)
└── ...              # brand-intake/, figma-context/, output/, assets/
```

To add a demo, drop a folder under `demos/` with a `demo.json`; it appears on the portal
automatically (respecting `hidden` and `order`). The portal is generated by `scripts/build-index.js`
from `scripts/portal-template.html`. This repo ships one neutral reference demo, `demos/yohdev/`.

| `demo.json` field | purpose |
|-------|---------|
| `title` | card heading |
| `company` | logo text fallback |
| `location` | location chip |
| `blurb` | one-paragraph description |
| `logo` | path to a logo image, relative to the demo folder |
| `entry` | landing page (default `index.html`) |
| `status` | `complete` or `intake-only` (renders a badge) |
| `order` | sort order on the portal |
| `hidden` | omit from the public portal when `true` |

## Deployment

- **Production** — push to `main` → GitHub Pages root (`https://yohdev.github.io/yd-website-playbook/`).
- **Preview** — open a PR → a **unique Surge URL** (`yd-playbook-pr-<N>.surge.sh`) is built and
  commented on the PR, then torn down when the PR closes. This is the approve-and-preview gate before
  anything goes live.
- **Local** — `npm run build && npm run serve` (http://localhost:8000).

Previews are **PR-gated**: pushing a branch alone does not deploy; open a PR to get a preview.

> One-time setup: add a `SURGE_TOKEN` repository secret to enable preview links. Until it's set, CI
> stays green and the PR comment explains the missing secret. Full steps in
> [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Using This as a Base

This repo is designed to be forked for individual client projects, staying connected so you can pull
upstream improvements later.

### Fork for a new client

1. Fork or clone this repo for the client project:
   ```bash
   git clone https://github.com/yohdev/yd-website-playbook my-client-playbook
   cd my-client-playbook
   ```
2. Point `origin` at the client's new repo and add this repo as `upstream`:
   ```bash
   git remote set-url origin https://github.com/your-org/my-client-playbook
   git remote add upstream https://github.com/yohdev/yd-website-playbook
   ```

### Pull upstream improvements

```bash
git fetch upstream
git merge upstream/main
# resolve any conflicts, then push
git push origin main
```

### Client vs. portable

Keep **client-specific detail in your fork** — everything under `demos/`, Sales Handoff data, client
output pages, and private stack details (CMS project IDs, sponsor assets, market/persona copy). Keep
**portable concepts upstream** — skill logic, phases, the ADA scanner, CI, and shared tokens. If a
fork produces a genuinely generalized fix, contribute it back (see [CONTRIBUTING.md](CONTRIBUTING.md)
and [UPSTREAM.md](UPSTREAM.md)).

---

## Credits

Built and maintained by [YohDev](https://yohdev.com). If you fork this repo for a client project,
please keep the upstream remote connected and attribute YohDev in your project README. That's the
only ask.
