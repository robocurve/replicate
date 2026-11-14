"""Doubling time of the mean task score record, with the paper's uncertainty analysis, for a data set.

Point estimate: least squares of log2(mean score) on release date over the record setters (the configurations that
strictly outscore every configuration released on or before their date), as Figure 2. Uncertainty, as Section 4:
a task-stratified percentile bootstrap (20,000 replicates; the 20 trial scores of each task are resampled with
replacement for every configuration, the record setters re-selected and the regression refitted) and a leave-one-out
range (each record setter dropped in turn). Per-trial scores come from the milestone counts, release dates from the CSV.

Usage: uv run --no-project --python 3.12 --with numpy python doubling_time.py [DATA_DIR] [--json OUT]
DATA_DIR defaults to ./figure-2 (the current data); CoRL-TAG-submission-snapshot/figure-2 reproduces the submitted
paper's numbers (44.5 days, 35.0 to 50.8, 40.3 to 53.6).
"""

from __future__ import annotations

import csv
import json
import sys
from datetime import date
from pathlib import Path

import numpy as np

SEED = 20261005
REPLICATES = 20_000
TASKS = ["Stack Bowls", "Store In Safe", "Sort Objects", "Cap Pen", "Pack And Pour Fruit", "Stand Up Bottles"]


def load(data_dir: Path) -> tuple[list[str], np.ndarray, np.ndarray, dict[str, str]]:
    """Configurations, their days since 2026-07-01, per-trial scores (config x task x 20) and labels."""
    rows = list(csv.DictReader((data_dir / "robodojo-metr-style-data-judge.csv").open()))
    mix = json.loads((data_dir / "robodojo-milestone-mix.json").read_text())
    configs = [f"{r['model']}|{r['effort']}|{r['mode']}" for r in rows]
    days = np.array([(date.fromisoformat(r["release_date"]) - date(2026, 7, 1)).days for r in rows], dtype=float)
    suffix = {"ultrafast": "+UF", "priority": "+PR"}
    effort = {"medium": "M", "high": "H", "xhigh": "XH"}
    labels = {c: f"{r['name']} ({effort[r['effort']]}{suffix.get(r['mode'], '')})" for c, r in zip(configs, rows)}
    scores = np.zeros((len(configs), len(TASKS), 20))
    for i, c in enumerate(configs):
        for j, t in enumerate(TASKS):
            cell = [float(x["level_score"]) for x in mix["counts"] if x["config"] == c and x["task"] == t for _ in range(x["count"])]
            if len(cell) != 20:
                raise SystemExit(f"{c} {t}: {len(cell)} trials in the milestone counts")
            scores[i, j] = cell
    return configs, days, scores, labels


def record_setters(days: np.ndarray, means: np.ndarray) -> np.ndarray:
    """Boolean mask: strictly above every configuration released on or before the same day."""
    rec = np.ones(len(days), dtype=bool)
    for i in range(len(days)):
        others = (days <= days[i]) & (np.arange(len(days)) != i)
        rec[i] = bool(np.all(means[i] > means[others])) if others.any() else True
    return rec


def doubling(days: np.ndarray, means: np.ndarray, mask: np.ndarray) -> float:
    slope = np.polyfit(days[mask], np.log2(means[mask]), 1)[0]
    return 1.0 / slope


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    data_dir = Path(args[0]) if args else Path(__file__).resolve().parent / "figure-2"
    out = Path(sys.argv[sys.argv.index("--json") + 1]) if "--json" in sys.argv else None
    configs, days, scores, labels = load(data_dir)
    means = scores.mean(axis=(1, 2)) * 100
    rec = record_setters(days, means)
    point = doubling(days, means, rec)
    setters = [configs[i] for i in np.flatnonzero(rec)]
    print(f"data: {data_dir}")
    print(f"record setters ({len(setters)}): " + "; ".join(f"{labels[c]} {means[configs.index(c)]:.2f}% ({date(2026, 7, 1).toordinal()})"[:0] + f"{labels[c]} {means[configs.index(c)]:.2f}%" for c in setters))
    print(f"doubling time: {point:.1f} days")

    rng = np.random.default_rng(SEED)
    n_cfg, n_task, n = scores.shape
    draws = np.empty(REPLICATES)
    idx = rng.integers(0, n, size=(REPLICATES, n_cfg, n_task, n))
    for b in range(REPLICATES):
        resampled = np.take_along_axis(scores, idx[b], axis=2).mean(axis=(1, 2)) * 100
        draws[b] = doubling(days, resampled, record_setters(days, resampled))
    lo, hi = np.percentile(draws, [2.5, 97.5])
    print(f"95% bootstrap interval (record setters re-selected per replicate, {REPLICATES} replicates, seed {SEED}): {lo:.1f} to {hi:.1f} days")

    loo = {}
    for i in np.flatnonzero(rec):
        mask = rec.copy()
        mask[i] = False
        loo[configs[i]] = doubling(days, means, mask)
    print("leave-one-out: " + "; ".join(f"drop {labels[c]}: {v:.1f}" for c, v in loo.items()))
    print(f"leave-one-out range: {min(loo.values()):.1f} to {max(loo.values()):.1f} days")
    if out:
        out.write_text(json.dumps({
            "data_dir": str(data_dir), "record_setters": [{"config": c, "label": labels[c], "mean_score_pct": round(float(means[configs.index(c)]), 2),
                                                           "release_date": str(date(2026, 7, 1) + __import__("datetime").timedelta(days=int(days[configs.index(c)])))} for c in setters],
            "doubling_days": round(float(point), 2), "bootstrap_95": [round(float(lo), 2), round(float(hi), 2)],
            "replicates": REPLICATES, "seed": SEED,
            "leave_one_out": {labels[c]: round(float(v), 2) for c, v in loo.items()},
            "leave_one_out_range": [round(min(loo.values()), 2), round(max(loo.values()), 2)],
        }, indent=1) + "\n")
        print("wrote", out)


if __name__ == "__main__":
    main()
