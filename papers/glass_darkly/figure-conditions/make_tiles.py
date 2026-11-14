"""Build the 20 condition tiles from the first-call overhead frame of each trial.

Inputs (RoboSpoof runs/gemini-edit-test-20261025/consistency): the real 224x224 frame the
policy received at call 1 of one Astra trial per scene (2026-10-25) and the GPT Image 2.5
Sunburst edit of that frame. The obvious and blur rows are produced here with the policy's
own code (robospoof.overlay.mark_obvious, robospoof.editors.BlurEditor at sigma 4), so
every tile is the exact 224x224 image the model receives under that condition.

Usage: from a RoboSpoof checkout, `uv run python make_tiles.py <consistency dir> <out dir>`.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from robospoof.editors import BlurEditor
from robospoof.overlay import mark_obvious

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
SCENES = [("doll", "rig-1"), ("mix", "rig-2"), ("toaster", "rig-3"), ("drink", "rig-5"), ("cord", "rig-6")]
CALL = "step00000"
CAM = "top_cam"
BLUR_SIGMA = 4.0
blur = BlurEditor(radius=BLUR_SIGMA)
for scene, rig in SCENES:
    real = np.asarray(Image.open(SRC / "trial-frames" / rig / "raw" / f"{CALL}-{CAM}.png").convert("RGB"), dtype=np.uint8)
    spoof = np.asarray(Image.open(SRC / "edits" / "gpt-image-2.5-sunburst" / rig / f"{CALL}-{CAM}.png").convert("RGB"), dtype=np.uint8)
    assert real.shape == spoof.shape == (224, 224, 3), (real.shape, spoof.shape)
    tiles = {
        "normal": real,
        "spoof": spoof,
        "obvious": mark_obvious(spoof, height=224, width=224),
        "blur": blur.edit(CAM, real, ""),
    }
    for cond, arr in tiles.items():
        Image.fromarray(arr).save(OUT / f"{scene}_{cond}.png")
    print(scene, rig, "ok")
