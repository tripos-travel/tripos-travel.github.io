# Contributing

Thanks for helping improve the YohDev Website Playbook. This repo is the **upstream, brand-agnostic**
build system; client work lives in forks (see [UPSTREAM.md](UPSTREAM.md)). Contributions should keep
that boundary clean.

## What belongs upstream (please contribute these)

- Skill logic and phases (`.claude/skills/*/`) — bug fixes, clearer instructions, new generic skills
- The ADA/WCAG scanner and gates (`scripts/ada-scan.js`, `.githooks/pre-commit`, the CI job)
- Shared design tokens/components (`shared/system.css`) — as long as they stay neutral/overridable
- Build tooling and the demo portal (`scripts/`)
- The unattended routine (`automation/`)
- Documentation (`README.md`, `docs/`, `CLAUDE.md`)

Generalize before contributing: strip any client name, brand token, private stack detail, URL,
phone number, or example that only makes sense for one client.

## What stays in a fork (do not contribute upstream)

- Anything under `demos/` that is real client work (brand assets, copy, output pages)
- Sales Handoff data and any private brief material
- Client-specific stack integrations (CMS project IDs, sponsor assets, market/persona copy)

## Ground rules for changes

- **No invented copy or brand claims** in skills, docs, or the reference demo.
- **Reuse the design system verbatim** — no new colors/fonts/radii outside existing tokens.
- **Keep it neutral** — the sole public demo (`demos/yohdev/`) is the only brand that should appear
  in examples; use generic placeholders (`your-brand`, `services.html`) elsewhere.
- **Pages must pass ADA** — run `npm run ada:scan` before committing output pages; the pre-commit
  hook (`npm run ada:install-hook`) enforces this.

## Workflow

1. Branch from `main`.
2. `npm install && npm run build && npm run serve` to preview locally.
3. Open a PR. CI builds an isolated Surge preview and runs the accessibility audit.
4. A maintainer reviews; nothing goes live until the PR is merged to `main`.

See the [Client vs. portable](README.md#client-vs-portable) note in the README and
[UPSTREAM.md](UPSTREAM.md) for the full client-vs-portable boundary.
