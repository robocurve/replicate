"""Cost per checkpoint by model release date, in the robocurve.org trends-panel frame.

Companion to ``robodojo_metr_style_robocurve_plot_title.py``: the same frame (title,
body, rule, chart, caption, footer), markers, lab colours and label machinery, with
the y axis showing estimated API cost per task checkpoint (USD, log scale). Every
configuration is shown; EFFORTS and KEEP_ULTRAFAST restrict the set if wanted. The
quantity is the ratio of totals used by the per-milestone 3D frontier figure
(``robodojo_3d_plot.py``): a configuration's summed estimated cost over its 120 judged
trials divided by its summed judge checkpoints, where a trial judged at level k of its
task counts k checkpoints (Sort Objects' 0.33/0.34 and 0.66/0.67 levels count once).
Trials that reached no checkpoint still add their cost. Per-trial cost and checkpoint
pairs are not available for every configuration, so no intervals are drawn. The dashed
line is a least squares fit of log cost per checkpoint on release date through the
highest-effort configuration of each model (ultrafast never stands in for an effort
level), reported as a percentage change per month; under ``--frontier`` it runs through the
running cheapest instead (every configuration no earlier-or-same-day release undercuts per
checkpoint), those points are drawn solid with a ring twice as thick, and the output gains ``-frontier``. Writes
robodojo-metr-style-judge-square-robocurve-cost-title.* (PNG, SVG, PDF; the ``--frontier``
PNG goes to reports/robocurve-charts/). Flags as the
titled script: ``--check``, ``--text-scale=``, ``--width=``, ``--frontier``,
``--frontier-no-ultrafast``.
Run with: uv run --with matplotlib --with pillow --with svgpath2mpl python
reports/robodojo_metr_style_robocurve_cost_plot.py
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import matplotlib.dates as mdates  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.ticker import FixedLocator, FuncFormatter, NullLocator  # noqa: E402

import robodojo_metr_style_robocurve_plot as base  # noqa: E402
import robodojo_metr_style_robocurve_plot_title as frame  # noqa: E402

TITLE = "LLM Robotics Cost per Checkpoint\nvs Release Date"  # explicit break: the frame wraps at about 42 display-face characters
BODY = (
    "Estimated API cost per task checkpoint on RoboDojo-RC Tier 1 against each model’s public "
    "release date; the line shows a least squares fit on the top performing configuration of each model."
)
BODY_FRONTIER = (
    "Estimated API cost per task checkpoint on RoboDojo-RC Tier 1 against each model’s public release "
    "date; line fit to all historical state-of-the-art models (indicated by thicker borders)."
)
CAPTION = (
    "Summed estimated API cost over 120 task attempts per configuration divided by the summed task "
    "checkpoints reached, by public release date."
)
EFFORTS = {"medium", "high", "xhigh"}  # configurations shown (all of them); ultrafast is kept
KEEP_ULTRAFAST = True
OUT = HERE / f"robodojo-metr-style-judge-square-robocurve-cost-title{base.SUFFIX}"
MILESTONES = HERE / "robodojo-milestone-mix.json"
Y_RANGE, Y_TICKS = (0.1, 10.0), (0.1, 0.2, 0.5, 1, 2, 5, 10)  # two full decades with 1-2-5 ticks, so the log scale reads as one; $0.38 (Gemini) to $4.51 (Astra H+UF), headroom for the legend, and the frontier fit stays in frame to October

# Checkpoints credited per judge level: the level's rank in its task rubric (same table as robodojo_3d_plot.py).
MILESTONE_RANK = {
    "Stack Bowls": {0: 0, 0.25: 1, 0.5: 2, 0.75: 3, 1: 4},
    "Store In Safe": {0: 0, 0.25: 1, 0.5: 2, 0.75: 3, 1: 4},
    "Sort Objects": {0: 0, 0.17: 1, 0.33: 2, 0.34: 2, 0.5: 3, 0.66: 4, 0.67: 4, 0.83: 5, 1.0: 6},
    "Cap Pen": {0: 0, 0.2: 1, 0.5: 2, 0.75: 3, 1: 4},
    "Pack And Pour Fruit": {0: 0, 0.1: 1, 0.3: 2, 0.5: 3, 0.7: 4, 0.8: 5, 0.9: 6, 1: 7},
    "Stand Up Bottles": {0: 0, 0.1: 1, 0.4: 2, 0.7: 3, 1: 4},
}

# Label placement on the two-decade log axis. The September 2 to 4 cluster is a column
# at Aug 29 (levelled with the markers, pushed apart by one text line in log units).
# GPT-5.6 Sol is labelled above on a leader because its right-hand slot would run into
# the Astra (XH) column label. In the September 22 cluster Opus 5.5 (H) sits a week
# before and just above GPT-6.1 Sol and is labelled above-right on a leader, and GPT-6
# Sol is labelled below-right because its right-hand slot would touch the GPT-6.1 Sol
# ring a week later.
PLACE = {
    ("gpt-5.6-sol", "high"): ("data", "2026-07-12", 3.0, "left", (0.0, 0.5)),
    ("claude-opus-5", "medium"): ("offset", 8, -12, "left"),  # below-right, under the column labels' left ends
    ("gemini-3.8-flash", "high"): ("column", "2026-08-29", "right"),
    ("gpt-6-astra", "medium"): ("column", "2026-08-29", "right"),
    ("gpt-6-astra", "high"): ("column", "2026-08-29", "right"),
    ("gpt-6-astra", "xhigh"): ("column", "2026-08-29", "right"),
    ("gpt-6-astra", "high", "ultrafast"): ("column", "2026-08-29", "right"),
    ("gpt-6-sol", "high"): ("offset", 8, -12, "left"),
    ("claude-opus-5-5", "high"): ("data", "2026-09-26", 1.48, "left", (0.0, 0.5)),  # between the (XH) and GPT-6.1 Sol labels, leader down-left
    ("claude-opus-5-5", "medium"): ("offset", 8, 0, "left"),
    ("claude-opus-5-5", "xhigh"): ("offset", 8, 0, "left"),
    ("gpt-6.1-sol", "high"): ("offset", 8, 0, "left"),
}
DECADE_IN = 0.885 * frame.PANEL_IN / np.log10(Y_RANGE[1] / Y_RANGE[0])  # axes inches per decade
LINE_DECADES = (base.TEXT * 1.8) / 72 / DECADE_IN  # one label line (ascender to descender plus box pad) in log10 units


def dollars(v: float, _pos=None) -> str:
    return f"${v:,.0f}" if v >= 1 else f"${v:.2f}"


def checkpoints_per_trial() -> dict[str, tuple[float, int]]:
    """Mean rubric checkpoints per trial and trial count, keyed "model|effort|mode", from the judge level counts."""
    totals: Counter[str] = Counter()
    trials: Counter[str] = Counter()
    for row in json.loads(MILESTONES.read_text())["counts"]:
        totals[row["config"]] += MILESTONE_RANK[row["task"]][float(row["level_score"])] * row["count"]
        trials[row["config"]] += row["count"]
    return {c: (totals[c] / trials[c], trials[c]) for c in totals}


def load() -> list[dict]:
    rows = base.load()
    per_trial = checkpoints_per_trial()
    for r in rows:
        checkpoints, n = per_trial[f"{r['model']}|{r['effort']}|{r['mode']}"]
        if n != int(r["n_trials"]):  # the ratio of means is the ratio of totals only over the same trials
            raise SystemExit(f"{r['model']} {r['effort']} {r['mode']}: {n} judged trials but {r['n_trials']} in the CSV")
        r["cost_per_checkpoint"] = float(r["mean_cost_usd"]) / checkpoints
        r["log_cost"] = float(np.log10(r["cost_per_checkpoint"]))
        r["ci_low_pct"] = r["ci_high_pct"] = r["cost_per_checkpoint"]  # no interval: check_overlaps sees a zero-length bar
    return rows


def draw(fig, ax) -> tuple[list[tuple], list[tuple], list]:
    rows = [r for r in load() if r["effort"] in EFFORTS and (KEEP_ULTRAFAST or r["mode"] != "ultrafast")]
    if base.ONE_PER_MODEL:
        rows = base.select(rows)
    markers, gem = base.make_markers()
    base.style_axes(ax)
    ax.set_yscale("log")

    points: list[tuple] = []
    annots: list[tuple] = []
    column_log = base.column_positions(rows, PLACE, key="log_cost", gap=LINE_DECADES)
    column_y = {k: 10 ** v for k, v in column_log.items()}
    fit = base.fit_rows(rows, "log_cost", higher_is_better=False)
    for r in rows:
        dev = r["developer"]
        x = mdates.date2num(r["date"])
        y = r["cost_per_checkpoint"]
        base.draw_point(ax, x, y, dev, markers, gem, base.point_alpha(r, fit), base.point_edge(r, fit))
        spec = PLACE.get((r["model"], r["effort"], r["mode"])) or PLACE[(r["model"], r["effort"])]
        label = base.config_label(r)
        points.append((r, x, y, label))
        ann, leader, relpos = base.place_label(ax, r, x, y, label, spec, column_y, base.LAB[dev])
        annots.append((ann, label, leader, relpos))

    xb = np.array([mdates.date2num(r["date"]) for r in fit])
    yb = np.array([r["log_cost"] for r in fit])
    slope, intercept = np.polyfit(xb, yb, 1)
    xs = np.array([mdates.date2num(date(2026, 7, 1)), mdates.date2num(date(2026, 10, 7))])
    ax.plot(xs, 10 ** (slope * xs + intercept), color=base.FRONTIER, linewidth=1.5 * base.PX, linestyle=(0, (2, 4)),
            dash_capstyle="round", zorder=1)
    ax.trend_pct_per_month = (10 ** (slope * 30.44) - 1) * 100
    print(f"log-linear trend through {base.fit_name()}: {ax.trend_pct_per_month:+.1f}% per month "
          f"({', '.join(f'{base.config_label(r)} ${r['cost_per_checkpoint']:.2f}' for r in fit)})")

    ax.set_ylim(*Y_RANGE)
    ax.yaxis.set_major_locator(FixedLocator(Y_TICKS))
    ax.yaxis.set_minor_locator(NullLocator())
    ax.yaxis.set_major_formatter(FuncFormatter(dollars))
    ax.set_ylabel("Cost per checkpoint (USD, log scale)")
    ax.set_xlim(date(2026, 6, 24), date(2026, 11, 15))
    ax.set_xticks([date(2026, m, 1) for m in (7, 8, 9, 10)])
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    ax.set_xlabel("Model release date")
    leg = base.lab_legend(ax, markers)
    return points, annots, [leg]


def main() -> None:
    frame.frame(draw, TITLE, BODY_FRONTIER if base.FRONTIER_FIT else BODY, CAPTION, OUT)


if __name__ == "__main__":
    main()
