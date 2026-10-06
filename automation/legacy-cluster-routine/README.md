# Legacy Cluster Routine

Fire a **headless** build of one legacy page cluster (a hub/pillar page + its spoke pages) by
injecting a small JSON payload. The run rebuilds the cluster into an existing brand's design
system and opens a reviewable pull request. No human is in the loop during the build.

This is the automation seam for the `pillar-cluster` skill (legacy mode). The interactive path is
`guided-build` → `pillar-cluster`; this routine is the unattended equivalent.

## Files
| File | Role |
|---|---|
| `SYSTEM_PROMPT.md` | The system prompt injected into the headless agent. |
| `payload.schema.json` | The injection contract (one cluster per run). |
| `README.md` | This file — how to fire it. |

## Payload
A single JSON object (see `payload.schema.json`):

```json
{
  "brand": "your-brand",
  "clusterName": "services",
  "hub": "https://example.com/services/",
  "spokes": [
    "https://example.com/services/residential/",
    "https://example.com/services/commercial/"
  ]
}
```

- **One cluster per run.** A top-level array (multiple clusters/hubs) is rejected before any build.
- **Explicit spokes only** — no crawling/auto-discovery.
- `brand` must resolve to a `demos/<brand>/` design system in the repo.

## How it runs (MVP)
Headless invocation with the system prompt + payload:

```bash
claude -p \
  --append-system-prompt "$(cat automation/legacy-cluster-routine/SYSTEM_PROMPT.md)" \
  "$(cat payload.json)"
```

The agent: validates the payload → creates a fresh branch → invokes the `pillar-cluster` skill in
legacy mode → builds hub + spokes in parallel → wires the nested nav → commits → opens a PR. It
never asks questions; it applies documented defaults and records every assumption in the PR body
and the combined `01-`/`02-` provenance artifacts.

## Preview & review (existing pipeline — no change needed)
The PR opened by the routine plugs straight into `.github/workflows/deploy.yml`:
- Opening/updating the PR builds an **isolated Surge preview** (`yd-playbook-pr-<N>.surge.sh`) and comments
  the link on the PR.
- Nothing live changes until a named approver merges; merging to the default branch deploys to
  GitHub Pages.

## Triggering it from a webhook / schedule (next step — deferred for MVP)
MVP ships the prompt + contract + this doc. To wire an actual trigger, add a thin GitHub Actions
workflow (e.g. `.github/workflows/cluster-dispatch.yml`) on `workflow_dispatch` (manual, with a
`payload` input) or `repository_dispatch` (external webhook → GitHub API). The job checks out the
repo, writes the input to `payload.json`, and runs the `claude -p` invocation above with an API key
from repository secrets. Sketch:

```yaml
# .github/workflows/cluster-dispatch.yml  (NOT YET ADDED — MVP reference only)
name: Legacy Cluster Build
on:
  workflow_dispatch:
    inputs:
      payload:
        description: "Cluster payload JSON (one hub + spokes)"
        required: true
jobs:
  build-cluster:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: printf '%s' "${{ inputs.payload }}" > payload.json
      - name: Run headless cluster build
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          claude -p \
            --append-system-prompt "$(cat automation/legacy-cluster-routine/SYSTEM_PROMPT.md)" \
            "$(cat payload.json)"
      # the agent opens the PR; deploy.yml builds the preview
```

Keep the one-cluster guardrail intact — the trigger should pass a single payload object per run.

## Guardrails (recap)
- One cluster per run; explicit spokes; generic pillar/cluster/hub/spoke vocabulary.
- No invented copy; real images hosted locally; design system reused verbatim.
- Output is always a branch + PR — never a direct write to anything live.
