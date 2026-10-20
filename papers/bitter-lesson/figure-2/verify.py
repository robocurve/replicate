"""Compare a regenerated figure PNG with the copy published in the paper, pixel for pixel.

Both images are flattened onto white before comparing (matplotlib saves the figure with an
alpha channel, and the paper's copy carries the same channel). Prints the image size and the
number of differing pixels; exits 0 when every pixel matches and 1 otherwise.

Usage: python verify.py <regenerated.png> <as-published.png>
"""

import sys

import numpy as np
from PIL import Image


def flat(path: str) -> np.ndarray:
    im = Image.open(path)
    rgb = np.asarray(im.convert("RGB"), dtype=np.float64)
    if "A" in im.getbands():
        a = np.asarray(im.getchannel("A"), dtype=np.float64)[..., None] / 255
        rgb = rgb * a + 255 * (1 - a)
    return rgb


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    a, b = flat(sys.argv[1]), flat(sys.argv[2])
    if a.shape != b.shape:
        print(f"size differs: {sys.argv[1]} is {a.shape[1]}x{a.shape[0]} px, {sys.argv[2]} is {b.shape[1]}x{b.shape[0]} px")
        return 1
    d = np.abs(a - b).max(axis=2)
    n = int((d > 0).sum())
    print(f"{a.shape[1]}x{a.shape[0]} px: {n} of {d.size} pixels differ (largest channel difference {d.max():.0f} of 255)")
    return 0 if n == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
