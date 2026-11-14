"""Reconstruction CSVs for the three frontier charts in reports/robocurve-charts/.

One CSV per chart, named after its PNG, written from the same loaders the chart scripts
use (``robodojo_metr_style_robocurve_plot.py``, ``..._cost_plot.py``, ``..._rate_plot.py``)
so the numbers are the ones plotted, one row per configuration in release order:

- ...-robocurve-title-frontier.csv: mean judge score with its 95% bootstrap interval
  (the points and error bars);
- ...-robocurve-cost-title-frontier.csv: estimated API cost per task checkpoint and the
  two per-trial means it is the ratio of (no intervals are drawn);
- ...-robocurve-rate-title-frontier.csv: task checkpoints per wall-clock minute and its
  inputs (``n_timed_trials`` is the denominator of the minutes mean; no intervals);
- ...-robocurve-frontier-fits.csv: the dashed line of each chart: the fitted
  configurations, slope per month (log10 units for cost, with a percentage), and the
  line's value at its two drawn ends, 2026-07-01 and 2026-10-07.

``label`` is the text beside the marker (effort M/H/XH, +UF for ultrafast; on the rate
chart GPT-6 Astra (XH) and (M) share the label "GPT-6 Astra (XH, M)"). ``in_fit`` (1/0)
marks the 1D Pareto frontier the line is fitted to: every configuration that nothing
released on or before its date beats (highest score, lowest cost per checkpoint, highest
rate; ultrafast eligible). Those points are drawn fully opaque with a ring twice as thick, the rest at 50%. Axes:
x 2026-06-24 to 2026-11-15 with ticks on the first of July to October; score 0 to 62
(ticks 0/20/40/60 %); cost log 0.10 to 10 USD (ticks $0.10, $0.20, $0.50, $1, $2, $5, $10); rate 0 to 1.1
(ticks 0/0.25/0.5/0.75/1). Run with: uv run --with matplotlib --with pillow
--with svgpath2mpl python reports/robodojo_metr_style_robocurve_data.py
"""

from __future__ import annotations

import csv
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import matplotlib.dates as mdates  # noqa: E402
import numpy as np  # noqa: E402

import robodojo_metr_style_robocurve_cost_plot as cost  # noqa: E402
import robodojo_metr_style_robocurve_plot as base  # noqa: E402
import robodojo_metr_style_robocurve_rate_plot as rate  # noqa: E402

STEM = "robodojo-metr-style-judge-square-robocurve"
LINE_DATES = (date(2026, 7, 1), date(2026, 10, 7))  # the dashed line is drawn between these dates
IDENT = ("model", "name", "developer", "release_date", "effort", "mode", "label", "n_trials")
# chart -> (CSV name, value the line is fitted on, higher is better, fit space, slope units)
CHARTS = {
    "score": (f"{STEM}-title-frontier.csv", "mean_progress_pct", True, "linear", "score points per month"),
    "cost": (f"{STEM}-cost-title-frontier.csv", "log_cost", False, "log10", "log10 USD per month"),
    "rate": (f"{STEM}-rate-title-frontier.csv", "checkpoints_per_minute", True, "linear", "checkpoints per minute per month"),
}


def key(r: dict) -> tuple[str, str, str]:
    return (r["model"], r["effort"], r["mode"])


def merged() -> list[dict]:
    """Every configuration with the three plotted quantities and their inputs, in release order."""
    rows = base.load()
    by_cost = {key(r): r for r in cost.load()}
    by_rate = {key(r): r for r in rate.load()}
    per_trial = cost.checkpoints_per_trial()
    for r in rows:
        k = key(r)
        r["label"] = base.config_label(r)
        r["mean_checkpoints_per_trial"] = per_trial[f"{r['model']}|{r['effort']}|{r['mode']}"][0]
        r["cost_per_checkpoint"] = by_cost[k]["cost_per_checkpoint"]
        r["log_cost"] = by_cost[k]["log_cost"]
        r["checkpoints_per_minute"] = by_rate[k]["checkpoints_per_minute"]
    rows.sort(key=lambda r: (r["date"], r["label"]))
    return rows


def frontier(rows: list[dict], chart: str) -> list[dict]:
    _, ykey, higher, _, _ = CHARTS[chart]
    return base.pareto_frontier(rows, ykey, higher)


def in_fit(r: dict, front: list[dict]) -> dict[str, int]:
    return {"in_fit": int(any(r is f for f in front))}


def write(path: Path, rows: list[dict]) -> None:
    with path.open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print("wrote", path, f"({len(rows)} rows)")


def main() -> None:
    rows = merged()
    out = base.CHARTS
    out.mkdir(exist_ok=True)
    ident = lambda r: {k: r[k] for k in IDENT}  # noqa: E731

    front = frontier(rows, "score")
    write(out / CHARTS["score"][0], [
        {**ident(r), "mean_score_pct": r["mean_progress_pct"], "ci_low_pct": r["ci_low_pct"], "ci_high_pct": r["ci_high_pct"],
         "grading": r["grading"], **in_fit(r, front)}
        for r in rows
    ])
    front = frontier(rows, "cost")
    write(out / CHARTS["cost"][0], [
        {**ident(r), "mean_cost_usd_per_trial": float(r["mean_cost_usd"]), "cost_basis": r["cost_basis"],
         "mean_checkpoints_per_trial": round(r["mean_checkpoints_per_trial"], 4),
         "cost_per_checkpoint_usd": round(r["cost_per_checkpoint"], 4), **in_fit(r, front)}
        for r in rows
    ])
    front = frontier(rows, "rate")
    write(out / CHARTS["rate"][0], [
        {**ident(r), "mean_checkpoints_per_trial": round(r["mean_checkpoints_per_trial"], 4),
         "mean_minutes_per_trial": float(r["mean_minutes_per_trial"]), "n_timed_trials": int(r["n_timed_trials"]),
         "checkpoints_per_minute": round(r["checkpoints_per_minute"], 4), **in_fit(r, front)}
        for r in rows
    ])

    fits = []
    for chart, (_, ykey, _, space, units) in CHARTS.items():
        front = frontier(rows, chart)
        x = np.array([mdates.date2num(r["date"]) for r in front])
        y = np.array([r[ykey] for r in front])
        slope, intercept = np.polyfit(x, y, 1)
        ends = [slope * mdates.date2num(d) + intercept for d in LINE_DATES]
        if space == "log10":
            ends = [10 ** v for v in ends]
        fits.append({
            "chart": chart, "fit_space": space, "n_points": len(front),
            "fitted_configurations": "; ".join(r["label"] for r in front),
            "slope_per_month": round(slope * 30.44, 5), "slope_units": units,
            "pct_change_per_month": round((10 ** (slope * 30.44) - 1) * 100, 2) if space == "log10" else "",
            "line_start_date": LINE_DATES[0].isoformat(), "line_start_y": round(ends[0], 4),
            "line_end_date": LINE_DATES[1].isoformat(), "line_end_y": round(ends[1], 4),
        })
    write(out / f"{STEM}-frontier-fits.csv", fits)


if __name__ == "__main__":
    main()
