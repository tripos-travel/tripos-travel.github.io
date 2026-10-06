#!/usr/bin/env python3
"""Report a font's family, weight axis and glyph coverage, so config weight and
tracking are set from fact rather than guesswork.
Usage: fontinfo.py <font-file> [text-to-check]
Requires: fonttools   (pip install fonttools)"""
import sys
from fontTools.ttLib import TTFont
f = TTFont(sys.argv[1])
n = f["name"]
print(f"family   : {n.getDebugName(1)} / {n.getDebugName(2)}")
print(f"upem     : {f['head'].unitsPerEm}   glyphs: {f['maxp'].numGlyphs}")
if "fvar" in f:
    for a in f["fvar"].axes:
        print(f"axis     : {a.axisTag} min={a.minValue} default={a.defaultValue} max={a.maxValue}")
else:
    print("axis     : static (no variable axes — weight must match this file)")
if len(sys.argv) > 2:
    cmap = f.getBestCmap()
    missing = [c for c in dict.fromkeys(sys.argv[2]) if ord(c) not in cmap]
    print(f"coverage : {'ALL PRESENT' if not missing else 'MISSING ' + repr(missing)}")
