"""Build site/src/kinematicsData.json: Franka Panda score vs Epoch's ECI for 44 LLMs, with the trend fitted
without GPT-6 Astra, GPT-6.1 Sol and Gemini 4 Argon, its 95% residual band, and every model's distance from it.

Inputs
- Aiden Swann's released per-model scores (figures/all_models.csv of github.com/swannaiden/vlm-robotics-training at
  commit fd223ef, downloaded on first run into data/upstream/; that repo has no licence file, so it is not copied here).
- data/panda_rerun_robocurve.csv: the 12 models Robocurve re-ran with Aiden's harness and prompts (these replace his
  numbers for the same model).
- data/eci_scores.csv: Epoch AI's Capabilities Index (epoch.ai, CC BY 4.0); data/model_map.csv maps model ids to ECI names.
"""
import csv
import json
import urllib.request
from pathlib import Path

import numpy as np

from fits import fit_form

HERE = Path(__file__).resolve().parent
UPSTREAM_URL = "https://raw.githubusercontent.com/swannaiden/vlm-robotics-training/fd223ef/figures/all_models.csv"
UPSTREAM = HERE / "data/upstream/all_models.csv"
LEAD = {"openai/gpt-6-astra": "GPT-6 Astra", "openai/gpt-6.1-sol": "GPT-6.1 Sol", "google/gemini-4-argon": "Gemini 4 Argon"}
# card key, panel name in the score CSVs, kind (sets the curve family and sign), curve family
MET = [("fk", "FK error, real Panda with its table", "error", "exponential decay to a floor"),
       ("mc", "Multiple choice correct, real Panda", "accuracy", "logistic, chance to 100%"),
       ("ik", "IK error, real Panda with its table", "error", "exponential decay to a floor"),
       ("twist", "Twisted arm: distance from the Panda's answer", "error", "exponential decay to a floor")]


def scores(path):
    return {(r["panel"], r["model"]): float(r["value"]) for r in csv.DictReader(open(path))}


if not UPSTREAM.exists():
    UPSTREAM.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(UPSTREAM_URL, UPSTREAM)
s = scores(HERE / "data/panda_rerun_robocurve.csv")
for k, v in scores(UPSTREAM).items():
    s.setdefault(k, v)  # Robocurve rerun wins where both exist
eci = {r["Model"]: float(r["eci"]) for r in csv.DictReader(open(HERE / "data/eci_scores.csv"))}
mmap = {r["model"]: (r["eci_name"], r["short"]) for r in csv.DictReader(open(HERE / "data/model_map.csv"))}

out = {}
for key, panel, kind, form in MET:
    pts = {m: (eci[mmap[m][0]], v) for (p, m), v in s.items() if p == panel and m in mmap and mmap[m][0] in eci}
    oth = {m: v for m, v in pts.items() if m not in LEAD}
    x = np.array([v[0] for v in oth.values()]); y = np.array([v[1] for v in oth.values()])
    f = fit_form(x, y, kind, form)
    r = y - f["predict"](x); qlo, qhi = np.percentile(r, [2.5, 97.5])
    xs = np.linspace(min(v[0] for v in pts.values()) - 0.5, max(v[0] for v in pts.values()) + 0.5, 60)
    fy = f["predict"](xs)
    res = {m: (v[1] - float(f["predict"]([v[0]])[0])) * (-1 if kind == "error" else 1) for m, v in pts.items()}
    order = sorted(res, key=lambda m: -res[m])
    out[key] = {"n": len(pts), "n_fit": len(x), "form": form,
                "points": [{"name": LEAD.get(m, mmap[m][1]), "lab": m.split("/")[0] if m.split("/")[0] in ("openai", "anthropic", "google") else "other",
                            "eci": round(v[0], 2), "v": round(float(v[1]), 2), "leader": m in LEAD, "rank": order.index(m) + 1,
                            "res": round(float(res[m]), 2)} for m, v in pts.items()],
                "curve": [[round(float(a), 2), round(float(b), 2)] for a, b in zip(xs, fy)],
                "lo": [round(float(b + qlo), 2) for b in fy], "hi": [round(float(b + qhi), 2) for b in fy]}
(HERE / "site/src/kinematicsData.json").write_text(json.dumps(out))
for k, v in out.items():
    print(k, f"n={v['n']}", [(q["name"], q["rank"]) for q in v["points"] if q["leader"]])
