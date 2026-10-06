#!/bin/bash

# Screenshot current website for Phase 02 research

URL="$1"
OUTPUT_DIR="${2:-output/02-screenshots}"

if [ -z "$URL" ]; then
    echo "Usage: $0 <website-url> [output-dir]"
    echo "Example: $0 https://example.com output/screenshots"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "Capturing screenshots of: $URL"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Use Chrome/Chromium in headless mode if available
if command -v google-chrome &> /dev/null; then
    CHROME_CMD="google-chrome"
elif command -v chromium &> /dev/null; then
    CHROME_CMD="chromium"
elif command -v chromium-browser &> /dev/null; then
    CHROME_CMD="chromium-browser"
else
    echo "Error: Chrome/Chromium not found. Please install Chrome for screenshot capability."
    echo "Alternative: Use online screenshot services or browser extensions"
    exit 1
fi

# Capture screenshots at different viewport sizes
viewports=(
    "1920,1080,desktop"
    "768,1024,tablet"
    "375,667,mobile"
)

for viewport in "${viewports[@]}"; do
    IFS=',' read -r width height device <<< "$viewport"
    output_file="$OUTPUT_DIR/homepage-$device.png"
    
    echo "Capturing $device view ($width x $height)..."
    
    "$CHROME_CMD" --headless \
        --disable-gpu \
        --window-size="$width,$height" \
        --screenshot="$output_file" \
        "$URL" 2>/dev/null
    
    if [ -f "$output_file" ]; then
        echo "  ✅ Saved: $output_file"
    else
        echo "  ❌ Failed to capture $device view"
    fi
done

echo ""
echo "Screenshot capture complete!"
echo "Review screenshots in: $OUTPUT_DIR"