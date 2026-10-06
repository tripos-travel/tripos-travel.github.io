#!/bin/bash
# page-shot.sh — full-page PNG screenshot of a built page, for the design-vs-build
# visual diff in the `figma-page-build` skill.
#
#   scripts/page-shot.sh <file-or-url> <width> <output.png> [height]
#
# Example:
#   scripts/page-shot.sh demos/rainfall/output/index.html 1440 /tmp/build-desktop.png
#   scripts/page-shot.sh demos/rainfall/output/index.html 390  /tmp/build-mobile.png
#
# Two backends, in preference order:
#
#   1. Playwright, if present — captures a true full-page shot at the page's real
#      height. Nothing to trim, and figma-diff can run without --trim.
#   2. Headless Chrome — the fallback, and the one already assumed elsewhere in
#      this repo. Chrome's --screenshot captures the WINDOW, not the document, so
#      this opens a deliberately tall window and lets the page paint into it. The
#      leftover is background padding, so pair it with `figma-diff --trim`.
#
# The trim caveat matters: --trim removes uniform trailing rows, which is exactly
# what Chrome's padding looks like — and also exactly what a flat-colored footer
# band looks like. Prefer Playwright when the page ends in a solid band.

set -euo pipefail

TARGET="${1:-}"
WIDTH="${2:-1440}"
OUT="${3:-page-shot.png}"
HEIGHT="${4:-4000}"

if [ -z "$TARGET" ]; then
  echo "Usage: $0 <file-or-url> <width> <output.png> [height]" >&2
  exit 1
fi

# Local paths need a file:// URL.
case "$TARGET" in
  http://*|https://*|file://*) URL="$TARGET" ;;
  /*) URL="file://$TARGET" ;;
  *)  URL="file://$(cd "$(dirname "$TARGET")" && pwd)/$(basename "$TARGET")" ;;
esac

mkdir -p "$(dirname "$OUT")"

if npx --no-install playwright --version >/dev/null 2>&1; then
  echo "page-shot: playwright · ${WIDTH}px · full page"
  npx --no-install playwright screenshot \
    --full-page \
    --viewport-size="${WIDTH},900" \
    --wait-for-timeout=1200 \
    "$URL" "$OUT"
  echo "page-shot: wrote $OUT  (no --trim needed)"
  exit 0
fi

CHROME=""
for candidate in google-chrome chromium chromium-browser \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
  if command -v "$candidate" >/dev/null 2>&1 || [ -x "$candidate" ]; then
    CHROME="$candidate"; break
  fi
done

if [ -z "$CHROME" ]; then
  echo "page-shot: no Playwright and no Chrome/Chromium found." >&2
  echo "  Install one, or export the screenshot by hand at ${WIDTH}px wide and full page." >&2
  exit 1
fi

echo "page-shot: chrome · ${WIDTH}x${HEIGHT} window"
"$CHROME" \
  --headless \
  --disable-gpu \
  --hide-scrollbars \
  --force-device-scale-factor=1 \
  --virtual-time-budget=4000 \
  --window-size="${WIDTH},${HEIGHT}" \
  --screenshot="$OUT" \
  "$URL" >/dev/null 2>&1

echo "page-shot: wrote $OUT"
echo "page-shot: window-based capture — run figma-diff with --trim to drop the background padding."
