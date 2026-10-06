#!/bin/bash

# Local development server for testing builds

echo "🚀 Starting local preview server..."

# Build first
bash scripts/build.sh

PORT=8000

# Pick a *real* Python, skipping shims that hijack the `python3` name without
# actually serving (e.g. ServBay's /Applications/ServBay/script/alias/python3,
# which prints nothing yet never binds the port — connection refused).
find_python() {
    # Prefer explicit real interpreters, then whatever is on PATH.
    local candidates=(
        /opt/homebrew/bin/python3
        /usr/local/bin/python3
        /usr/bin/python3
        python3
        python
    )
    local cmd resolved
    for cmd in "${candidates[@]}"; do
        resolved="$(command -v "$cmd" 2>/dev/null)" || continue
        # Reject known shim locations that don't actually serve.
        case "$resolved" in
            */ServBay/*) continue ;;
        esac
        # Must be a genuine CPython (rules out wrapper scripts).
        if "$resolved" --version 2>&1 | grep -q '^Python '; then
            echo "$resolved"
            return 0
        fi
    done
    return 1
}

PYTHON="$(find_python)"

if [ -n "$PYTHON" ]; then
    echo "📡 Starting server at http://localhost:$PORT  (using $PYTHON)"
    cd dist && exec "$PYTHON" -m http.server "$PORT"
elif command -v npx &> /dev/null; then
    echo "📡 Starting server at http://localhost:$PORT  (using npx http-server)"
    exec npx http-server dist -p "$PORT"
else
    echo "❌ No suitable server found. Install Python 3 or Node.js"
    echo "   Or manually serve the ./dist directory"
    exit 1
fi
