"""Build per-camera frame sheets for completion judging from the raw (unedited) 224 px frames.

Usage: python frames_sheet.py TRIALS.json HOST "LOGDIR_GLOB [LOGDIR_GLOB ...]" OUTDIR

For each trial on HOST: find <name>.json under the log dirs, take the frames dir it names (YYYYMMDD_HHMMSS_hash)
from <logdir>/frames, and write OUTDIR/<name>/<cam>.png: 24 frames sampled evenly over the trial in a 4x6 grid at
native 224 px, each labelled with its sample number and step.
"""

import collections
import glob
import json
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw

trials, host, logglob, outdir = sys.argv[1:5]
N, COLS, T = 24, 6, 224
ID = re.compile(r"\d{8}_\d{6}_[0-9a-f]{8}")
FR = re.compile(r"[a-z]+-e0[~_]([a-z]+_cam)_(\d+)\.npy$")
logs = {}
for d in [x for g in logglob.split() for x in glob.glob(g)]:
    for f in glob.glob(f"{d}/robospoof-*.json"):
        logs.setdefault(os.path.basename(f)[:-5], f)
report = {}
for t in json.load(open(trials)):
    if t["host"] != host:
        continue
    n = t["name"]
    lp = logs.get(n)
    if not lp:
        report[n] = "no log"
        continue
    fdir = None
    for i in sorted(set(ID.findall(open(lp, errors="replace").read()))):
        cand = os.path.join(os.path.dirname(lp), "frames", i)
        if os.path.isdir(cand):
            fdir = cand
            break
    if not fdir:
        report[n] = "no frames"
        continue
    by = {}
    for f in os.listdir(fdir):
        m = FR.search(f)
        if m:
            by.setdefault(m[1], []).append((int(m[2]), f))
    if not by:
        report[n] = "no npy"
        continue
    os.makedirs(f"{outdir}/{n}", exist_ok=True)
    for cam, seq in by.items():
        seq.sort()
        idx = sorted({round(i * (len(seq) - 1) / (N - 1)) for i in range(N)}) if len(seq) > 1 else [0]
        rows = (len(idx) + COLS - 1) // COLS
        sheet = Image.new("RGB", (COLS * (T + 4), rows * (T + 4)), "black")
        for k, i in enumerate(idx):
            step, f = seq[i]
            a = np.load(os.path.join(fdir, f))
            if a.ndim == 2:
                a = np.stack([a] * 3, -1)
            im = Image.fromarray(a.astype(np.uint8)).convert("RGB").resize((T, T))
            ImageDraw.Draw(im).text((4, 3), f"t{k + 1} step {step}", fill=(255, 255, 0))
            sheet.paste(im, ((k % COLS) * (T + 4), (k // COLS) * (T + 4)))
        sheet.save(f"{outdir}/{n}/{cam}.png")
    report[n] = f"ok {sorted(by)} {max(len(v) for v in by.values())} steps"
json.dump(report, open(f"{outdir}/report-{host}.json", "w"), indent=0)
print(host, collections.Counter(v.split(" [")[0] for v in report.values()))
