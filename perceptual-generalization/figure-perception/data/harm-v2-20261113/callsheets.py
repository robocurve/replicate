"""Per-call frame sheets from the raw (unedited) frames, for frame-only harm judging.

    python3 callsheets.py MANIFEST LOGS_ROOT OUTDIR [NAMES_FILE]

For each trial in MANIFEST (idprobe manifest: calls with their observation steps), find the raw
frame archive (LOGS_ROOT/<rig>/logs/frames/<id>, the id named in the trial log) and write
OUTDIR/<name>/call-<k>.png: the motion that call k produced, from its observation step to the next
call's observation step (the last call runs to the last recorded step), as 3 camera rows (top,
left, right) x 5 frames sampled evenly over that span, each tile labelled with call and step.
Also writes OUTDIR/<name>/meta.json (call spans, last recorded step). Raw frames are 224 px and
never blurred or edited.
"""

import json
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw

N, T = 5, 224
CAMS = ["top_cam", "left_cam", "right_cam"]
ID = re.compile(r"\d{8}_\d{6}_[0-9a-f]{8}")
FR = re.compile(r"[a-z]+-e0[~_]([a-z]+_cam)_(\d+)\.npy$")

manifest, logs_root, outdir = sys.argv[1:4]
names = set(open(sys.argv[4]).read().split()) if len(sys.argv) > 4 else None
report = {}
for line in open(manifest):
    e = json.loads(line)
    name = e["name"]
    if names is not None and name not in names:
        continue
    if "calls" not in e:
        report[name] = "manifest error"
        continue
    logdir = os.path.join(logs_root, e["rig"], "logs")
    fdir = None
    for cand in [e.get("run")] + sorted(set(ID.findall(open(os.path.join(logdir, name + ".json"), errors="replace").read()))):
        if cand and os.path.isdir(os.path.join(logdir, "frames", cand)):
            fdir = os.path.join(logdir, "frames", cand)
            break
    if not fdir:
        report[name] = "no frames"
        continue
    frames = {}
    for f in os.listdir(fdir):
        m = FR.search(f)
        if m and f"{e['scene']}-e0" in f:
            frames.setdefault(m[1], {})[int(m[2])] = os.path.join(fdir, f)
    if not all(c in frames for c in CAMS):
        report[name] = f"cameras {sorted(frames)}"
        continue
    last = min(max(frames[c]) for c in CAMS)
    starts = [c["steps"]["top_cam"] for c in e["calls"]]
    os.makedirs(os.path.join(outdir, name), exist_ok=True)
    spans = []
    for k, s0 in enumerate(starts):
        s1 = starts[k + 1] if k + 1 < len(starts) else last
        s1 = max(s1, s0)
        steps = sorted({round(s0 + i * (s1 - s0) / (N - 1)) for i in range(N)})
        spans.append({"call": k, "from_step": s0, "to_step": s1, "steps": steps})
        sheet = Image.new("RGB", (N * (T + 4), len(CAMS) * (T + 4)), "black")
        for r, cam in enumerate(CAMS):
            avail = sorted(frames[cam])
            for col, s in enumerate(steps):
                s_near = min(avail, key=lambda x: abs(x - s))
                a = np.load(frames[cam][s_near])
                if a.ndim == 2:
                    a = np.stack([a] * 3, -1)
                im = Image.fromarray(a.astype(np.uint8)).convert("RGB").resize((T, T))
                ImageDraw.Draw(im).text((4, 3), f"call {k} step {s_near} {cam}", fill=(255, 255, 0))
                sheet.paste(im, (col * (T + 4), r * (T + 4)))
        sheet.save(os.path.join(outdir, name, f"call-{k:02d}.png"))
    json.dump({"name": name, "model": e["model"], "scene": e["scene"], "termination": e.get("termination"),
               "last_step": last, "calls": spans}, open(os.path.join(outdir, name, "meta.json"), "w"))
    report[name] = f"ok {len(spans)} calls, last step {last}"
json.dump(report, open(os.path.join(outdir, f"report-{os.path.basename(os.path.dirname(manifest))}.json"), "w"), indent=0)
print({v.split(" ")[0]: sum(1 for x in report.values() if x.split(" ")[0] == v.split(" ")[0]) for v in report.values()})
