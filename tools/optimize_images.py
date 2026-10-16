#!/usr/bin/env python3
"""Make web-ready copies of artwork photos for the portfolio site.

For every JPG/PNG in SOURCE this writes three sizes to DEST:

    <slug>-600.jpg, <slug>-1200.jpg, <slug>-1800.jpg

Originals are only read. Output is converted to sRGB, auto-rotated, and has
all metadata (GPS, camera, document IDs) stripped. Images smaller than a
target width are not upscaled.

It also prints one JavaScript record per image, ready to paste into
js/works-data.js after you fill in the title, year, medium and category.

    python3 tools/optimize_images.py ~/Pictures/new-work images/artwork
"""
import argparse
import io
import re
import sys
from pathlib import Path

from PIL import Image, ImageCms, ImageOps

Image.MAX_IMAGE_PIXELS = None  # large scans are expected

SUFFIXES = (600, 1200, 1800)  # must match SIZE_SUFFIXES in js/works-utils.js
EXTENSIONS = {".jpg", ".jpeg", ".png"}
SRGB = ImageCms.createProfile("sRGB")


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def to_srgb(image: Image.Image) -> Image.Image:
    profile = image.info.get("icc_profile")
    if profile:
        try:
            source = ImageCms.ImageCmsProfile(io.BytesIO(profile))
            return ImageCms.profileToProfile(image, source, SRGB, outputMode="RGB")
        except Exception:
            pass  # fall through to a plain conversion
    return image.convert("RGB")


def optimize(source: Path, dest: Path, quality: int) -> dict:
    slug = slugify(source.stem)
    with Image.open(source) as opened:
        opened.draft("RGB", (SUFFIXES[-1] * 2, SUFFIXES[-1] * 2))  # fast JPEG downscale
        image = to_srgb(ImageOps.exif_transpose(opened))
        full_width, full_height = image.size
        widths = []
        for suffix in SUFFIXES:
            width = min(suffix, full_width)
            height = round(full_height * width / full_width)
            resized = image if width == full_width else image.resize((width, height), Image.LANCZOS)
            resized.save(dest / f"{slug}-{suffix}.jpg", "JPEG", quality=quality,
                         optimize=True, progressive=True)
            widths.append(width)
    return {"slug": slug, "ws": widths, "w": widths[-1],
            "h": round(full_height * widths[-1] / full_width)}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("source", type=Path, help="folder of original images")
    parser.add_argument("dest", type=Path, help="output folder, e.g. images/artwork")
    parser.add_argument("--quality", type=int, default=82, help="JPEG quality (default 82)")
    args = parser.parse_args()

    files = sorted(p for p in args.source.iterdir() if p.suffix.lower() in EXTENSIONS)
    if not files:
        print(f"No JPG or PNG files found in {args.source}", file=sys.stderr)
        return 1
    args.dest.mkdir(parents=True, exist_ok=True)

    group = args.dest.name
    for source in files:
        info = optimize(source, args.dest, args.quality)
        print(f"{{ id: '', title: '', year: , medium: '', dimensions: '', category: '', "
              f"base: '{group}/{info['slug']}', ws: {info['ws']}, w: {info['w']}, h: {info['h']} }},")
    return 0


if __name__ == "__main__":
    sys.exit(main())
