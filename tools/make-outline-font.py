#!/usr/bin/env python3
"""Makes fonts/manrope-outline-400.woff2: Manrope Regular with every letter merged into a single shape.

The site's Manrope is a variable font whose letters are built from overlapping pieces (the A's crossbar runs
into its legs, the R's leg into its bowl). Filled, nobody sees it; drawn as an outline, every overlap shows as
a stray line inside the letter. The giant outlined words (js/scroll-scenes.js) use this cut instead.

    pip install fonttools skia-pathops brotli
    python3 tools/make-outline-font.py
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

FONTS = Path(__file__).resolve().parent.parent / "fonts"
SOURCE = FONTS / "manrope-latin-wght-normal.woff2"
TARGET = FONTS / "manrope-outline-400.woff2"


def main() -> None:
    font = instantiateVariableFont(TTFont(SOURCE), {"wght": 400}, overlap=2)  # 2: remove overlaps
    font.flavor = "woff2"
    font.save(TARGET)
    print(f"wrote {TARGET.relative_to(FONTS.parent)}")


if __name__ == "__main__":
    main()
