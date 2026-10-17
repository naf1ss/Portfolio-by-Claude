#!/usr/bin/env python3
"""Cuts a subject out of its black backdrop and writes transparent WebP files.

Usage: tools/cutout-portrait.py <source.jpg> <output-prefix> [width ...] [--backdrop N] [--sharpen PERCENT]
Example: tools/cutout-portrait.py portrait.jpg images/about/portrait 800 1600
         tools/cutout-portrait.py me.jpg images/gallery/photographer 640 1100 --backdrop 10 --sharpen 90

Only the black connected to the picture's edge is removed (so dark clothes or paint inside
the subject are kept), with a soft edge and the edge colours un-premultiplied so no dark
halo shows on a white page. --backdrop is the brightest channel value still counted as
backdrop (lower it when the subject has very dark parts); --sharpen applies an unsharp mask
to each output size. Needs numpy, scipy and Pillow.
"""
import argparse

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

DEFAULT_BACKDROP_MAX = 28  # brightest channel at or below this counts as backdrop
SOFT_EDGE = (10, 56)  # brightness range over which the edge fades from clear to solid
EDGE_REACH_PX = 6   # how far from the backdrop the soft edge may reach
PADDING_PX = 24


def cut_out(image: Image.Image, backdrop_max: int = DEFAULT_BACKDROP_MAX) -> Image.Image:
    rgb = np.asarray(image.convert("RGB")).astype(np.float32)
    brightest = rgb.max(axis=2)

    labelled, _ = ndimage.label(brightest <= backdrop_max)
    edge_labels = np.unique(np.concatenate([labelled[0], labelled[-1], labelled[:, 0], labelled[:, -1]]))
    backdrop = np.isin(labelled, edge_labels[edge_labels != 0])

    near_backdrop = ndimage.binary_dilation(backdrop, iterations=EDGE_REACH_PX)
    low, high = SOFT_EDGE
    ramp = np.clip((brightest - low) / (high - low), 0, 1)
    alpha = np.where(near_backdrop, ramp, 1.0)
    alpha = np.where(backdrop & (brightest <= backdrop_max), 0.0, alpha)
    alpha = ndimage.gaussian_filter(alpha, 0.7)

    colour = rgb / np.maximum(alpha, 0.05)[..., None]
    colour = np.clip(colour, 0, 255)
    out = np.dstack([colour, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def crop_to_subject(image: Image.Image) -> Image.Image:
    box = image.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    left, top, right, bottom = box
    return image.crop((
        max(left - PADDING_PX, 0), max(top - PADDING_PX, 0),
        min(right + PADDING_PX, image.width), min(bottom + PADDING_PX, image.height),
    ))


def sharpen(image: Image.Image, percent: int) -> Image.Image:
    """Unsharp-masks the colour only, so the cut-out edge keeps its soft alpha."""
    if percent <= 0:
        return image
    rgb = image.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.4, percent=percent, threshold=2))
    rgb.putalpha(image.getchannel("A"))
    return rgb


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source")
    parser.add_argument("prefix")
    parser.add_argument("widths", nargs="*", type=int, default=[800, 1600])
    parser.add_argument("--backdrop", type=int, default=DEFAULT_BACKDROP_MAX)
    parser.add_argument("--sharpen", type=int, default=0, metavar="PERCENT")
    args = parser.parse_args()

    cut = crop_to_subject(cut_out(Image.open(args.source), args.backdrop))
    for width in args.widths:
        height = round(cut.height * width / cut.width)
        resized = sharpen(cut.resize((width, height), Image.LANCZOS), args.sharpen)
        resized.save(f"{args.prefix}-{width}.webp", quality=90, method=6)
        print(f"{args.prefix}-{width}.webp {width}x{height}")


if __name__ == "__main__":
    main()
