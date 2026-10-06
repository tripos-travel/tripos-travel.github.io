# Upstream Guide

This repo (`yohdev/yd-website-playbook`) is the canonical source for the YohDev website build system — a multi-skill Claude Code playbook for building brand pages on any client's design system. Client projects are forks of this repo and can stay connected to pull improvements over time.

## How the fork model works

```
yohdev/yd-website-playbook  (upstream — this repo)
         │
         ├── fork → client-a/website-playbook
         ├── fork → client-b/website-playbook
         └── fork → client-c/website-playbook
```

Each client fork lives independently. When YohDev improves the skill, client forks can pull those improvements with:

```bash
git fetch upstream
git merge upstream/main
```

## What flows upstream (improvements YohDev ships)

- Skills and their phase logic (`.claude/skills/*/`, including `phases/`, `run-skill.js`)
- New or improved reference templates (`reference/`)
- The ADA/WCAG scanner and commit gate (`scripts/ada-scan.js`, `.githooks/pre-commit`)
- The structural-consistency scanner + gate (`scripts/structure-scan.js`, the `structure.json`/manifest
  **schema** in `demos/README-manifest.md`, and the builder read/verify steps) — portable machinery
- Shared design tokens/components (`shared/system.css`)
- The unattended build routine (`automation/`)
- Scripts and build tooling (`scripts/`)
- CI/CD workflow updates (`.github/workflows/`)
- README and documentation improvements

## What stays in the client fork (do not expect upstream)

- The `demos/` folder — client-specific examples stay in the fork
- Any `Sales Handoff — */` data (excluded by `.gitignore` anyway)
- Client-specific `output/` artifacts
- The **content** of each brand's `site.manifest.json` (the schema is portable; the page list is per-client)

## Contributing back

If a client fork introduces a fix or improvement that would benefit all projects, open a PR against `yohdev/yd-website-playbook`. YohDev reviews and merges improvements that are genuinely generalized (not client-specific).

## Setting up upstream on an existing fork

If your fork doesn't have the upstream remote yet:

```bash
git remote add upstream https://github.com/yohdev/yd-website-playbook
git fetch upstream
```
