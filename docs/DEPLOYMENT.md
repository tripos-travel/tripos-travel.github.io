# Deployment Guide

## How It Works

| Trigger | What happens | Where |
|---------|--------------|-------|
| Push to `main` | Build → publish to GitHub Pages root | `https://yohdev.github.io/yd-website-playbook/` (production) |
| Open / update a PR | Build → deploy a unique Surge preview → comment the link | `https://yd-playbook-pr-<N>.surge.sh` |
| Close a PR | Tear down the Surge preview | — |

Production lives on **GitHub Pages**. Ephemeral per-PR previews live on **Surge** so each
PR gets its own throwaway URL — the approve-and-preview gate before changes go live.

Every build runs `npm run build`, which assembles the demo portal (`dist/index.html`,
auto-listing every `demos/*/demo.json`) plus each demo at `dist/demos/<slug>/`.

## Setup (One-Time)

### 1. GitHub Pages source

**Settings → Pages → Build and deployment → Source:**
- Deploy from a branch
- Branch: `gh-pages` · Folder: `/ (root)` · Save

### 2. Actions permissions

**Settings → Actions → General → Workflow permissions:** Read and write permissions.

Do **not** add branch protection to `gh-pages` — the workflow pushes to it with the default `GITHUB_TOKEN`.

### 3. Surge token (enables PR previews)

Previews are skipped until a `SURGE_TOKEN` secret exists. CI stays green without it; the
PR comment will note that the secret is missing.

```bash
npm install --global surge   # or use npx
surge login                  # create / sign in to a Surge account
surge token                  # prints a token
```

Add the token under **Settings → Secrets and variables → Actions → New repository secret:**
- Name: `SURGE_TOKEN`
- Value: the token from `surge token`

Subdomains use the pattern `yd-playbook-pr-<PR number>.surge.sh`.

## Production Deployment

```bash
git checkout main
git add .
git commit -m "Update site"
git push origin main
```

The workflow builds and publishes to the root of `gh-pages`.

## Preview Deployment (PRs)

```bash
git checkout -b client-acme
# ...changes...
git commit -am "Add Acme playbook"
git push -u origin client-acme
# Open a PR → the preview URL is built and commented automatically.
# Each push updates the same preview; closing the PR tears it down.
```

Previews are **PR-gated**: pushing a branch on its own does not deploy anything.

## Local Testing

```bash
npm run build          # assemble dist/
npm run serve          # http://localhost:8000
```

## Troubleshooting

**No preview link on the PR**
- Confirm the `SURGE_TOKEN` secret exists (the comment says so if it's missing).
- Check the Actions tab for the `preview` job log.

**Production not updating**
- Pages source must be `gh-pages` / root; Actions permissions must be read+write.
- `gh-pages` must have no branch protection.
- Clear cache / wait 1–2 minutes for Pages to propagate.

**`gh-pages` branch doesn't exist**
The workflow creates it on first deploy to `main`. To create it manually:

```bash
git checkout --orphan gh-pages
git rm -rf .
touch .nojekyll
git add .nojekyll
git commit -m "Initialize gh-pages"
git push origin gh-pages
```

**Manually remove a stuck preview**

```bash
surge teardown yd-playbook-pr-<N>.surge.sh --token <SURGE_TOKEN>
```
