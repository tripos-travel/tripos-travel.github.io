#!/bin/bash
set -euo pipefail

# Build the deployable site:
#   dist/index.html        -> demo portal, auto-generated from demos/*/demo.json
#   dist/demos/<slug>/      -> each demo, copied verbatim
#   dist/docs/              -> README + docs
# This is the single source of build truth used by both `npm run build` and CI.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Building TripOS site (YohDev Website Playbook)..."

rm -rf dist
mkdir -p dist/demos

# 1. Copy every demo to dist/demos/<slug>/
if [ -d demos ]; then
  for demo_dir in demos/*/; do
    [ -d "$demo_dir" ] || continue
    slug="$(basename "$demo_dir")"
    echo "  → demo: $slug"
    mkdir -p "dist/demos/$slug"
    cp -R "$demo_dir." "dist/demos/$slug/"
  done
fi

# 2. Generate the portal index from the demo manifests
node scripts/build-index.js dist/index.html

# 2b. Optional site home: if ./site.home names a page, the site root redirects there
if [ -f site.home ]; then
  HOME_PAGE="$(head -n1 site.home | tr -d '[:space:]')"
  echo "  → site home: $HOME_PAGE"
  mv dist/index.html dist/portal.html
  cat > dist/index.html <<HTML
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>TripOS</title>
<meta http-equiv="refresh" content="0; url=$HOME_PAGE"><link rel="canonical" href="$HOME_PAGE"></head>
<body><p><a href="$HOME_PAGE">Continue to TripOS</a></p></body></html>
HTML
fi

# 3. Documentation (footer links README.md at the site root)
cp README.md dist/ 2>/dev/null || true
mkdir -p dist/docs
[ -d docs ] && cp -R docs/. dist/docs/ 2>/dev/null || true

# 4. GitHub Pages: skip Jekyll processing
touch dist/.nojekyll

echo "Build complete → dist/"
find dist -maxdepth 2 -type d | sort
