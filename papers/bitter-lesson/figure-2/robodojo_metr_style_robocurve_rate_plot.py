"""Task checkpoints per minute by model release date, in the robocurve.org trends-panel frame.

Sibling of ``robodojo_metr_style_robocurve_cost_plot.py`` with throughput on the y axis:
a configuration's summed judge checkpoints over its 120 trials divided by its summed
wall-clock minutes (checkpoints per minute, linear axis). Checkpoints are credited as in
the cost chart (a trial judged at level k of its task counts k checkpoints; Sort Objects'
paired levels count once); minutes are the recorded wall-clock time per trial from the
judge CSV (Opus 5.5 xhigh has 116 timed trials of 120, so its ratio mixes the two
denominators). No intervals are drawn, for the same reason as the cost chart. The dashed
line is a least squares fit through the highest-effort configuration of each model
(ultrafast never stands in for an effort level); under ``--frontier`` it runs through the
running fastest instead (every configuration no earlier-or-same-day release beats), those
points are drawn solid with a ring twice as thick, and the output gains ``-frontier``. Writes
robodojo-metr-style-judge-square-robocurve-rate-title.* (PNG, SVG, PDF; the ``--frontier``
PNG goes to reports/robocurve-charts/). Flags as the
titled script: ``--check``, ``--text-scale=``, ``--width=``, ``--frontier``,
``--frontier-no-ultrafast``.
Run with: uv run --with matplotlib --with pillow --with svgpath2mpl python
reports/robodojo_metr_style_robocurve_rate_plot.py
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import matplotlib.dates as mdates  # noqa: E402
import numpy as np  # noqa: E402

import robodojo_metr_style_robocurve_cost_plot as cost  # noqa: E402
import robodojo_metr_style_robocurve_plot as base  # noqa: E402
import robodojo_metr_style_robocurve_plot_title as frame  # noqa: E402

TITLE = "LLM Robotics Checkpoints per Minute\nvs Release Date"
BODY = (
    "Task checkpoints reached per minute of wall-clock time on RoboDojo-RC Tier 1 against each model’s "
    "public release date; the line shows a least squares fit on the top performing configuration of each model."
)
BODY_FRONTIER = (
    "Task checkpoints reached per minute of wall-clock time on RoboDojo-RC Tier 1 against each model’s "
    "public release date; line fit to all historical state-of-the-art models (indicated by thicker borders)."
)
CAPTION = (
    "Summed task checkpoints reached over 120 task attempts per configuration divided by the summed "
    "wall-clock minutes, by public release date."
)
OUT = HERE / f"robodojo-metr-style-judge-square-robocurve-rate-title{base.SUFFIX}"
Y_RANGE, Y_TICKS = (0, 1.1), (0, 0.25, 0.5, 0.75, 1.0)  # 0.16 (Opus 5) to 0.91 (Astra H+UF); headroom for the legend

# Label placement. The September 2 to 4 cluster is a column at Aug 29 (levelled with the
# markers, pushed apart by one text line); GPT-5.6 Sol is labelled above on a leader because
# its right-hand slot would touch the Opus 5 ring two weeks later; Opus 5.5 (XH) and (M)
# nearly coincide, so their labels fan above and below. GPT-6 Astra (XH) and (M) coincide
# to within 0.01, so the pair carries one label.
PLACE = {
    ("gpt-5.6-sol", "high"): ("data", "2026-07-06", 0.33, "left", (0.0, 0.5)),
    ("claude-opus-5", "medium"): ("offset", 8, 0, "left"),
    ("gemini-3.8-flash", "high"): ("column", "2026-08-29", "right"),
    ("gpt-6-astra", "medium"): ("column", "2026-08-29", "right"),
    ("gpt-6-astra", "high"): ("column", "2026-08-29", "right"),
    ("gpt-6-astra", "xhigh"): ("column", "2026-08-29", "right"),
    ("gpt-6-astra", "high", "ultrafast"): ("column", "2026-08-29", "right"),
    ("gpt-6-sol", "high"): ("offset", 8, 0, "left"),
    ("claude-opus-5-5", "high"): ("offset", 8, 0, "left"),
    ("claude-opus-5-5", "medium"): ("offset", 8, -10, "left"),
    ("claude-opus-5-5", "xhigh"): ("offset", 8, 2, "left"),
    ("gpt-6.1-sol", "high"): ("offset", 8, 0, "left"),
}
LABEL_TEXT = {k: "GPT-6 Astra (XH, M)" for k in (("gpt-6-astra", "xhigh", "fast"), ("gpt-6-astra", "medium", "standard"))}  # one label for the coincident pair (both points carry it, so the checker treats them as one)
SKIP_LABEL = {("gpt-6-astra", "medium", "standard")}
UNIT_IN = 0.885 * frame.PANEL_IN / (Y_RANGE[1] - Y_RANGE[0])  # axes inches per checkpoint-per-minute
LINE_UNITS = (base.TEXT * 1.8) / 72 / UNIT_IN  # one label line (ascender to descender plus box pad) in axis units


def load() -> list[dict]:
    rows = base.load()
    per_trial = cost.checkpoints_per_trial()
    for r in rows:
        checkpoints, n = per_trial[f"{r['model']}|{r['effort']}|{r['mode']}"]
        if n != int(r["n_trials"]):
            raise SystemExit(f"{r['model']} {r['effort']} {r['mode']}: {n} judged trials but {r['n_trials']} in the CSV")
        r["checkpoints_per_minute"] = checkpoints / float(r["mean_minutes_per_trial"])
        r["ci_low_pct"] = r["ci_high_pct"] = r["checkpoints_per_minute"]  # no interval: check_overlaps sees a zero-length bar
    return rows


def draw(fig, ax) -> tuple[list[tuple], list[tuple], list]:
    rows = load()
    if base.ONE_PER_MODEL:
        rows = base.select(rows)
    markers, gem = base.make_markers()
    base.style_axes(ax)

    points: list[tuple] = []
    annots: list[tuple] = []
    column_y = base.column_positions([r for r in rows if (r["model"], r["effort"], r["mode"]) not in SKIP_LABEL], PLACE, key="checkpoints_per_minute", gap=LINE_UNITS)
    fit = base.fit_rows(rows, "checkpoints_per_minute")
    for r in rows:
        dev = r["developer"]
        x = mdates.date2num(r["date"])
        y = r["checkpoints_per_minute"]
        base.draw_point(ax, x, y, dev, markers, gem, base.point_alpha(r, fit), base.point_edge(r, fit))
        spec = PLACE.get((r["model"], r["effort"], r["mode"])) or PLACE[(r["model"], r["effort"])]
        key = (r["model"], r["effort"], r["mode"])
        label = LABEL_TEXT.get(key, base.config_label(r))
        points.append((r, x, y, label))
        if key in SKIP_LABEL:
            continue
        ann, leader, relpos = base.place_label(ax, r, x, y, label, spec, column_y, base.LAB[dev])
        annots.append((ann, label, leader, relpos))

    xb = np.array([mdates.date2num(r["date"]) for r in fit])
    yb = np.array([r["checkpoints_per_minute"] for r in fit])
    slope, intercept = np.polyfit(xb, yb, 1)
    xs = np.array([mdates.date2num(date(2026, 7, 1)), mdates.date2num(date(2026, 10, 7))])
    ax.plot(xs, slope * xs + intercept, color=base.FRONTIER, linewidth=1.5 * base.PX, linestyle=(0, (2, 4)),
            dash_capstyle="round", zorder=1)
    ax.trend_per_month = slope * 30.44
    print(f"trend through {base.fit_name()}: {ax.trend_per_month:+.3f} checkpoints per minute per month "
          f"({', '.join(f'{base.config_label(r)} {r['checkpoints_per_minute']:.2f}' for r in fit)})")

    ax.set_ylim(*Y_RANGE)
    ax.set_yticks(Y_TICKS)
    ax.set_yticklabels([f"{v:g}" for v in Y_TICKS])
    ax.set_ylabel("Checkpoints per minute")
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
