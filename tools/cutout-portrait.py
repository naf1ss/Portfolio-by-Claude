#!/usr/bin/env python3
"""Cuts a painted portrait out of its black backdrop and writes transparent WebP files.

Usage: tools/cutout-portrait.py <source.jpg> <output-prefix> [width ...]
Example: tools/cutout-portrait.py portrait.jpg images/about/portrait 800 1600

Only the black connected to the picture's edge is removed (so dark paint inside the
subject is kept), with a soft edge and the edge colours un-premultiplied so no dark
halo shows on a white page. Needs numpy, scipy and Pillow.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

BACKDROP_MAX = 28   # brightest channel at or below this counts as backdrop
SOFT_EDGE = (10, 56)  # brightness range over which the edge fades from clear to solid
EDGE_REACH_PX = 6   # how far from the backdrop the soft edge may reach
PADDING_PX = 24


def cut_out(image: Image.Image) -> Image.Image:
    rgb = np.asarray(image.convert("RGB")).astype(np.float32)
    brightest = rgb.max(axis=2)

    labelled, _ = ndimage.label(brightest <= BACKDROP_MAX)
    edge_labels = np.unique(np.concatenate([labelled[0], labelled[-1], labelled[:, 0], labelled[:, -1]]))
    backdrop = np.isin(labelled, edge_labels[edge_labels != 0])

    near_backdrop = ndimage.binary_dilation(backdrop, iterations=EDGE_REACH_PX)
    low, high = SOFT_EDGE
    ramp = np.clip((brightest - low) / (high - low), 0, 1)
    alpha = np.where(near_backdrop, ramp, 1.0)
    alpha = np.where(backdrop & (brightest <= BACKDROP_MAX), 0.0, alpha)
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


def main(argv):
    if len(argv) < 3:
        sys.exit(__doc__)
    source, prefix, widths = argv[1], argv[2], [int(w) for w in argv[3:]] or [800, 1600]
    cut = crop_to_subject(cut_out(Image.open(source)))
    for width in widths:
        height = round(cut.height * width / cut.width)
        resized = cut.resize((width, height), Image.LANCZOS)
        resized.save(f"{prefix}-{width}.webp", quality=88, method=6)
        print(f"{prefix}-{width}.webp {width}x{height}")


if __name__ == "__main__":
    main(sys.argv)
