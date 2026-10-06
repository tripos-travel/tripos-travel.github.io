#!/usr/bin/env python3
"""Convert logo lettering to outlines.

A logo whose wordmark is live text is not a logo -- open it on a machine without
the font and it silently becomes a different logo. This turns the configured
strings into SVG path data so the artwork never depends on an installed font.

Usage:  outline.py <config.json> <out.json>
Requires: fonttools, brotli   (pip install fonttools brotli)
"""
import json, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform


def outline(font_file, weight, text, tracking_em):
    f = TTFont(font_file)
    if "fvar" in f and weight is not None:
        axes = {a.axisTag: a for a in f["fvar"].axes}
        if "wght" in axes:
            a = axes["wght"]
            w = max(a.minValue, min(a.maxValue, weight))
            if w != weight:
                print(f"  ! {font_file}: wght {weight} clamped to {w}", file=sys.stderr)
            f = instancer.instantiateVariableFont(f, {"wght": w})
    upem = f["head"].unitsPerEm
    gs, cmap = f.getGlyphSet(), f.getBestCmap()
    missing = [c for c in dict.fromkeys(text) if ord(c) not in cmap]
    if missing:
        raise SystemExit(f"FAIL {font_file}: no glyph for {missing!r} in {text!r}")
    track, x, parts = tracking_em * upem, 0.0, []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        # flip Y: font space is y-up, SVG is y-down, baseline at y=0
        gs[g].draw(TransformPen(pen, Transform(1, 0, 0, -1, x, 0)))
        if pen.getCommands():
            parts.append(pen.getCommands())
        x += gs[g].width + track
    return {"d": " ".join(parts), "advance": (x - track) / upem, "upem": upem}


if __name__ == "__main__":
    cfg = json.load(open(sys.argv[1]))
    out = {}
    for key in ("wordmark", "subline"):
        s = cfg.get(key)
        if not s:
            continue
        out[key] = outline(s["font"], s.get("weight"), s["text"], s.get("tracking", 0))
        print(f"  outlined {key}: {s['text']!r} advance={out[key]['advance']:.3f}em")
    json.dump(out, open(sys.argv[2], "w"))
