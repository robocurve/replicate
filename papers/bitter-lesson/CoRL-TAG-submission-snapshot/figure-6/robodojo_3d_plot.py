"""3D view of RoboDojo-RC Tier 1 configurations: cost per milestone, wall-clock time per milestone, mean task score.

Usage (from the repo root, matplotlib via an ephemeral uv environment):
    uv run --no-project --with matplotlib --with numpy python reports/robodojo_3d_plot.py [flags]
Flags:
    --frontier          draw the Pareto surface; dominated runs are drawn as crosses
    --elev E --azim A   view angles in matplotlib's convention (default 30, -70)
    --sweep             write a 3x3 contact sheet of angles instead of one figure
    --show              open an interactive window (drag to rotate); prints the
                        final --elev/--azim on close so you can re-render it
    --labels            with --show, draw the labels in the window (they follow
                        the rotation; the saved renders always have labels)
    --layout blocks     labels in aligned blocks with leaders, no title, one-line
                        legend, white page; designed for --frontier --elev 12 --azim -142
    --layout blocks-tall  the earlier proportions of that layout (7.86 in tall, suffix -tall)
    --height H          with --layout blocks: figure height in inches (default 6.8); the
                        score axis is stretched to fill it, labels keep their offsets
    --per-trial         the earlier axes: estimated cost and wall-clock time per trial
                        instead of per milestone (no suffix; the default adds -per-milestone)
    --paper             the CoRL figure, written to paper-figures/: the blocks layout at the
                        text width in the 2D paper figures' type, palette and markers, on their
                        axes (cost, subtasks per hour and score, all in log space); with
                        --font serif, --crosses and --width W

The cost and time axes are ratios of totals per configuration: the 120 trials'
summed estimated cost (or wall-clock minutes) over their summed rubric milestones,
where a trial judged at level k of its task counts k milestones (Sort Objects'
0.33/0.34 and 0.66/0.67 levels are one checkpoint each). Trials that reached no
milestone still add their cost and time, so the axes read as throughput: what a
milestone costs and how long it takes at that configuration. --x date puts model
release date on the x axis instead of cost. Points carry drop lines to the floor
so depth reads correctly, and labels are the same "Model (M|H|XH[+UF])" form as
the 2D figures. Reads reports/robodojo-metr-style-data-judge.csv (means) and
reports/robodojo-milestone-mix.json (judge level counts).
"""

from __future__ import annotations

import csv
import json
import math
import os
import sys
from collections import Counter
from datetime import date, datetime
from pathlib import Path

import matplotlib
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.lines import Line2D
from matplotlib.transforms import Bbox
from mpl_toolkits.mplot3d import Axes3D, proj3d  # noqa: F401  (registers the 3d projection)

SHOW = "--show" in sys.argv  # open an interactive window; the final view angles are printed on close
SWEEP = "--sweep" in sys.argv  # render a contact sheet of nine view angles
LABELS = "--labels" in sys.argv  # with --show: draw labels that follow the rotation
LAYOUT = sys.argv[sys.argv.index("--layout") + 1] if "--layout" in sys.argv else ""
BLOCKS = LAYOUT in ("blocks", "blocks-tall")  # hand layout for the ideal-corner view
TALL = LAYOUT == "blocks-tall"  # the earlier proportions: full-height score axis, smaller axis text, two-row top blocks
PAPER = "--paper" in sys.argv  # CoRL-paper figure: the frontier in the blocks layout at the text width, in the 2D paper figures' type, palette and markers
CROSSES = "--crosses" in sys.argv  # with --paper: dominated runs as crosses (the submitted figure's glyph) instead of hollow markers
if PAPER:
    LAYOUT, BLOCKS, TALL = "blocks", True, False
if not SHOW:
    matplotlib.use("Agg")

HERE = Path(__file__).resolve().parent
FONT_DIR = next((d for d in (HERE / "fonts", Path("/usr/share/fonts/truetype/liberation")) if d.is_dir()), HERE / "fonts")  # the bundled Liberation TTFs (SIL OFL 1.1), else Debian's fonts-liberation package
DATA = HERE / "robodojo-metr-style-data-judge.csv"
MILESTONES = HERE / "robodojo-milestone-mix.json"
XMODE = "date" if "--x" in sys.argv and sys.argv[sys.argv.index("--x") + 1] == "date" else "cost"
OUT = HERE / ("robodojo-3d-cost-time-score" if XMODE == "cost" else "robodojo-3d-date-time-score")


def _arg(flag: str, default: float) -> float:
    """Optional numeric CLI flag, e.g. --elev 30 --azim -70 (copied from the interactive explorer)."""
    return float(sys.argv[sys.argv.index(flag) + 1]) if flag in sys.argv else default


ELEV, AZIM = _arg("--elev", 12.0 if PAPER else 30.0), _arg("--azim", -142.0 if PAPER else -70.0)
FRONTIER = "--frontier" in sys.argv or PAPER  # draw the 3-objective Pareto surface and fade dominated runs
PER_TRIAL = "--per-trial" in sys.argv  # the earlier axes: cost and wall-clock time per trial instead of per milestone
UNIT = "Trial" if PER_TRIAL else "Milestone"  # for the titled (non-blocks) layout
if not PER_TRIAL:
    OUT = Path(str(OUT) + "-per-milestone")
if FRONTIER:
    OUT = Path(str(OUT) + "-frontier")
if TALL:
    OUT = Path(str(OUT) + "-tall")
elif BLOCKS and "--height" in sys.argv:
    OUT = Path(str(OUT) + "-h" + f"{float(sys.argv[sys.argv.index('--height') + 1]):g}".replace(".", "p"))  # e.g. -h6p12
SERIF = "--font" in sys.argv and sys.argv[sys.argv.index("--font") + 1] == "serif"  # --paper: Liberation Serif (Times metrics) instead of Liberation Sans
if PAPER:
    OUT = HERE / "paper-figures" / f"robodojo-3d-frontier{'-serif' if SERIF else ''}"

DEV_COLOR = {"OpenAI": "#2a78d6", "Anthropic": "#eb6834", "Google": "#1baf7a"}
SURFACE = "#ffffff"  # paper figures: pure white, not the dataviz off-white
INK = "#0b0b0b"
INK2 = "#52514e"
MUTED = "#898781"
GRID = "#e1e0d9"
AXIS = "#c3c2b7"
if PAPER:  # the 2D paper figures' palette (../robodojo-release-date-charts/robodojo_release_paper_figures.py)
    DEV_COLOR = {"OpenAI": "#1B150F", "Anthropic": "#9C3D1B", "Google": "#9177C7"}
    INK, INK2, MUTED, GRID, AXIS = "#1a1511", "#6a655f", "#aaa6a1", "#e4e2de", "#aaa6a1"
SHAPE = {"OpenAI": ("o", 1.0), "Anthropic": ("D", 0.82), "Google": ("^", 1.12)}  # --paper: marker and size factor per lab, as the 2D figures
MARK_PT, EDGE_PT = 6.5, 0.8  # --paper: marker diameter and hollow-marker edge, points
WIDTH = _arg("--width", 5.5)  # --paper: the cropped figure's width in inches (the CoRL text width)
# --paper geometry scale: the blocks layout is designed at 12 in wide; the geometry (figure, label offsets, pads) is
# multiplied by K while the type keeps its point sizes. main() adjusts K until the cropped figure is WIDTH wide.
K = WIDTH / 10.91 if PAPER else 1.0
SCALE = 1.35
BASE = 10.5 * SCALE
EFFORT = {"medium": "M", "high": "H", "xhigh": "XH"}

# Blocks layout geometry. One text size for labels, ticks, axis titles and legend. The 3D box is flattened
# (z aspect) with the zoom compensated so the floor keeps its on-page size, and the square 3D box is let
# overhang the figure (subplot bottom < 0, top > 1) so the figure is cropped to the drawn content.
TXT = BASE * 1.2  # point-label size
if TALL:
    BLOCKS_Z, BLOCKS_FIG, BLOCKS_BOX, BLOCKS_LEGEND_Y = 0.85, (12.0, 7.86), (0.0, 1.026), 0.969
    AXIS_TXT, TICK_TXT, LEGEND_TXT = BASE, BASE * 0.8, BASE * 0.9
else:
    # --height H (inches) picks the figure height; the score axis is stretched to fill it and the square
    # 3D box is slid so the legend band and the bottom margin stay the same. Calibrated on the 5.9 in and
    # 6.8 in renders: the content grows 0.89 in per 0.165 of z aspect, 0.30 of it above the box centre.
    HEIGHT = float(sys.argv[sys.argv.index("--height") + 1]) if "--height" in sys.argv else 6.8
    BLOCKS_Z = 0.46 + (HEIGHT - 5.91) * 0.165 / 0.89
    _above = 2.16 + (BLOCKS_Z - 0.46) * 0.30 / 0.165  # box centre to back corner, inches
    _centre = HEIGHT - 0.72 - _above  # legend band is 0.72 in
    _side = 8.058  # square box side (12 in wide figure, box squared by Axes3D at draw time)
    BLOCKS_FIG = (12.0, HEIGHT)
    BLOCKS_BOX = ((_centre - _side / 2) / HEIGHT, (_centre + _side / 2) / HEIGHT)
    BLOCKS_LEGEND_Y = 1 - 0.04 / HEIGHT
    AXIS_TXT = TICK_TXT = LEGEND_TXT = TXT
if PAPER:
    TXT, AXIS_TXT, TICK_TXT, LEGEND_TXT = 7.0, 8.0, 8.0, 7.0  # the 2D paper figures' sizes: 7 pt labels and legend, 8 pt axis type
# BLOCKS_BOX is (subplot bottom, top); BLOCKS_LEGEND_Y is the top of the legend box in figure fraction
# (the box has padding, so the text starts lower).
BLOCKS_ZOOM = 1.22 * math.sqrt(1.35**2 + 1 + BLOCKS_Z**2) / math.sqrt(1.35**2 + 1 + 0.85**2)
PAPER_PAD = (1.0, 0.25)  # --paper: extra canvas (inches, width and height) round the scaled layout, so the axis titles, whose
# point sizes do not shrink with K, stay on the canvas for the crop


def paper_geometry(k: float) -> tuple:
    """--paper figure size, (subplot bottom, top) and legend top for layout scale ``k``: the 12 in layout's box scaled by ``k``,
    sitting PAPER_PAD[1] above the canvas bottom, on a canvas PAPER_PAD[0] wider than the scaled layout."""
    height = HEIGHT * k + PAPER_PAD[1]
    bottom, top = (_centre - _side / 2) * k + PAPER_PAD[1], (_centre + _side / 2) * k + PAPER_PAD[1]
    return (12.0 * k + PAPER_PAD[0], height), (bottom / height, top / height), 1 - 0.04 * k / height

FAMILY = "Liberation Serif" if SERIF else "Liberation Sans"
if PAPER:  # TrueType, so the PDF embeds clean subsets (the Nimbus clones embed as mismatched CFF)
    from matplotlib import font_manager
    for f in FONT_DIR.glob(f"{FAMILY.replace(' ', '')}-*.ttf"):
        font_manager.fontManager.addfont(str(f))
plt.rcParams.update(
    {
        "font.family": FAMILY if PAPER else "DejaVu Sans",
        "font.size": TICK_TXT if PAPER else BASE,
        **({"pdf.fonttype": 42} if PAPER else {}),  # TrueType subsets in the paper PDF; the default render keeps matplotlib's Type 3
        "figure.facecolor": SURFACE,
        "axes.facecolor": SURFACE,
        "savefig.facecolor": SURFACE,
    }
)

# Label placement in 2D screen offsets (points) from the projected marker: (dx, dy, ha).
# A leader line is drawn when the label is far from its marker.
PLACE_COST = {
    ("gpt-6-astra", "high", "ultrafast"): (12, 0, "left"),
    ("gpt-6-astra", "xhigh", "fast"): (12, 8, "left"),
    ("gpt-6-astra", "high", "fast"): (12, -8, "left"),
    ("gpt-6-astra", "medium", "standard"): (-12, -12, "right"),
    ("gemini-3.8-flash", "high", "standard"): (12, 4, "left"),
    ("claude-opus-5-5", "xhigh", "fast"): (12, 6, "left"),
    ("claude-opus-5-5", "high", "fast"): (12, -2, "left"),
    ("claude-opus-5-5", "medium", "standard"): (-12, 8, "right"),
    ("gpt-6-sol", "high", "fast"): (12, 0, "left"),
    ("gpt-6.1-sol", "high", "fast"): (12, 26, "left"),
    ("gpt-5.6-sol", "high", "fast"): (12, 0, "left"),
    ("claude-opus-5", "medium", "standard"): (12, -40, "left"),
}
PLACE_DATE = {k: (12, 0, "left") for k in PLACE_COST}


# Cost (log) and time axes: range, ticks and title, per milestone or per trial.
if PER_TRIAL:
    X_RANGE, X_TICKS, X_LABEL = (0.5, 13), (0.5, 1, 2, 5, 10), "Cost per trial (USD, log)"
    Y_RANGE, Y_TICKS, Y_LABEL = (120, 480), (120, 240, 360, 480), "Wall-clock time per trial (s)"
else:
    X_RANGE, X_TICKS, X_LABEL = (0.3, 7), (0.5, 1, 2, 5), "Cost per milestone (USD, log)"
    Y_RANGE, Y_TICKS, Y_LABEL = (0, 7), (0, 2, 4, 6), "Wall-clock time per milestone (min)"
    if PAPER:  # the 2D paper figures' axes: subtasks per hour instead of minutes per subtask, and score, both in log space with the
        # 2D figures' ranges and 1-2-5 ticks; "subtask" is the paper's word for a rubric milestone
        X_LABEL = "API cost per subtask (USD, log space)"
        RATE_RANGE, RATE_TICKS, Y_LABEL = (8, 63), (10, 20, 50), "Subtask completion rate\n(subtasks per hour, log space)"
        SCORE_RANGE, SCORE_TICKS, Z_LABEL = (10, 67), (10, 20, 30, 50), "Mean task score (%, log space)"
if PAPER and PER_TRIAL:
    raise SystemExit("--paper draws the per-subtask axes; drop --per-trial")
# Plot coordinates. --paper draws the rate axis as -log10(subtasks per hour), so the fastest configurations sit at the front
# corner where the quickest sat on the time axis and the ticks read 10, 20, 50 from left to right in the paper view; score
# is log10. The other layouts keep minutes per milestone (or seconds per trial) and score as they are.
Y_LIM = (-math.log10(RATE_RANGE[1]), -math.log10(RATE_RANGE[0])) if PAPER else Y_RANGE
Z_LIM = (math.log10(SCORE_RANGE[0]), math.log10(SCORE_RANGE[1])) if PAPER else (0, 60)


def ycoord(r: dict) -> float:
    return -math.log10(r["rate"]) if PAPER else r["time"]


def zcoord(score: float) -> float:
    return math.log10(score) if PAPER else score


def dollars(v: float) -> str:
    return f"${v:,.0f}" if v >= 1 else f"${v:.2f}"


# Milestones credited per judge level: the level's rank in its rubric, with Sort Objects' 0.33/0.34 and
# 0.66/0.67 levels sharing a rank (same count of correctly basketed objects). Same convention as
# robodojo-survival-counts.md.
MILESTONE_RANK = {
    "Stack Bowls": {0: 0, 0.25: 1, 0.5: 2, 0.75: 3, 1: 4},
    "Store In Safe": {0: 0, 0.25: 1, 0.5: 2, 0.75: 3, 1: 4},
    "Sort Objects": {0: 0, 0.17: 1, 0.33: 2, 0.34: 2, 0.5: 3, 0.66: 4, 0.67: 4, 0.83: 5, 1.0: 6},
    "Cap Pen": {0: 0, 0.2: 1, 0.5: 2, 0.75: 3, 1: 4},
    "Pack And Pour Fruit": {0: 0, 0.1: 1, 0.3: 2, 0.5: 3, 0.7: 4, 0.8: 5, 0.9: 6, 1: 7},
    "Stand Up Bottles": {0: 0, 0.1: 1, 0.4: 2, 0.7: 3, 1: 4},
}


def milestones_per_trial() -> dict[str, tuple[float, int]]:
    """Mean rubric milestones per trial and trial count, keyed "model|effort|mode", from the judge level counts."""
    totals: Counter[str] = Counter()
    trials: Counter[str] = Counter()
    for row in json.loads(MILESTONES.read_text())["counts"]:
        totals[row["config"]] += MILESTONE_RANK[row["task"]][float(row["level_score"])] * row["count"]
        trials[row["config"]] += row["count"]
    return {c: (totals[c] / trials[c], trials[c]) for c in totals}


def load() -> list[dict]:
    rows = []
    per_trial = milestones_per_trial()
    with DATA.open() as fh:
        for r in csv.DictReader(fh):
            r["score"] = float(r["mean_progress_pct"])
            minutes, cost = float(r["mean_minutes_per_trial"]), float(r["mean_cost_usd"])
            if PER_TRIAL:
                r["time"], r["cost"] = minutes * 60, cost  # seconds and dollars per trial
            else:
                milestones, n = per_trial[f"{r['model']}|{r['effort']}|{r['mode']}"]
                if n != int(r["n_trials"]):  # the ratio of means is the ratio of totals only over the same trials
                    raise SystemExit(f"{r['model']} {r['effort']} {r['mode']}: {n} judged trials but {r['n_trials']} in the CSV")
                r["time"], r["cost"] = minutes / milestones, cost / milestones  # minutes and dollars per milestone
            r["rate"] = (3600 if PER_TRIAL else 60) / r["time"]  # trials (per trial) or milestones (per milestone) per hour
            d = datetime.strptime(r["release_date"], "%Y-%m-%d").date()
            r["days"] = (d - date(2026, 7, 1)).days
            rows.append(r)
    return rows


def label(r: dict) -> str:
    return f"{r['name']} ({EFFORT[r['effort']]}{'+UF' if r['mode'] == 'ultrafast' else ''})"


def draw_scene(ax, rows: list[dict], elev: float, azim: float, with_labels: bool = True) -> list:
    ax.view_init(elev=elev, azim=azim)
    ax.set_box_aspect((1.35, 1.0, BLOCKS_Z if BLOCKS else 0.85), zoom=BLOCKS_ZOOM if BLOCKS else 1.0)

    def dominated(a: dict) -> bool:
        return any(
            b is not a and b["cost"] <= a["cost"] and b["time"] <= a["time"] and b["score"] >= a["score"]
            and (b["cost"] < a["cost"] or b["time"] < a["time"] or b["score"] > a["score"])
            for b in rows
        )

    if FRONTIER and XMODE == "cost":
        gx = np.linspace(math.log10(X_RANGE[0]), math.log10(X_RANGE[1]), 160)
        gy = np.linspace(Y_LIM[0], Y_LIM[1], 160)
        GX, GY = np.meshgrid(gx, gy)
        GZ = np.zeros_like(GX)
        for r in rows:
            mask = (GX >= math.log10(r["cost"])) & (GY >= ycoord(r))  # at least this cost and this time (--paper: at most this rate)
            GZ = np.where(mask, np.maximum(GZ, zcoord(r["score"])), GZ)
        GZm = np.where(GZ > 0, GZ, np.nan)
        ax.plot_surface(GX, GY, GZm, color="#2a78d6", alpha=0.16 if PAPER else 0.18, shade=False, linewidth=0, antialiased=True, rstride=1, cstride=1, zorder=1)
        ax.plot_wireframe(GX, GY, GZm, rstride=8, cstride=8, color=INK2, linewidth=0.3 if PAPER else 0.45, alpha=0.35, zorder=1)

    pts = []
    for r in rows:
        dom = FRONTIER and dominated(r)
        c = DEV_COLOR[r["developer"]]
        x = math.log10(r["cost"]) if XMODE == "cost" else r["days"]
        y, z = ycoord(r), zcoord(r["score"])
        ax.plot([x, x], [y, y], [Z_LIM[0], z], color=c, linewidth=0.5 if PAPER else 1.0, alpha=0.45, zorder=2)
        if PAPER:  # the 2D figures' glyphs: the lab's shape, filled on the frontier, hollow (or a cross) when dominated
            m, k = SHAPE[r["developer"]]
            if dom and CROSSES:
                ax.scatter([x], [y], [z], s=(MARK_PT * 1.3) ** 2, marker="x", color=c, linewidth=1.0, depthshade=False, zorder=5)
            elif dom:
                ax.scatter([x], [y], [z], s=(MARK_PT * k) ** 2, marker=m, facecolor=SURFACE, edgecolor=c, linewidth=EDGE_PT, depthshade=False, zorder=5)
            else:
                ax.scatter([x], [y], [z], s=(MARK_PT * k * 1.1) ** 2, marker=m, facecolor=c, edgecolor=SURFACE, linewidth=0.6, depthshade=False, zorder=5)
        elif dom:  # dominated: a cross in the developer colour (unfilled markers take their colour from `color`, not `edgecolor`)
            ax.scatter([x], [y], [z], s=230 if BLOCKS else 160, marker="x", color=c, linewidth=2.6 if BLOCKS else 2.2, depthshade=False, zorder=5)
        else:
            ax.scatter([x], [y], [z], s=187 if BLOCKS else 130, color=c, edgecolor=SURFACE, linewidth=2.0 if BLOCKS else 1.8, depthshade=False, zorder=5)
        pts.append((r, x, y, z, dom))

    for axis in (ax.xaxis, ax.yaxis, ax.zaxis):
        axis.set_pane_color((1, 1, 1, 0))
        axis._axinfo["grid"]["color"] = GRID
        axis._axinfo["grid"]["linewidth"] = 0.4 if PAPER else 0.8
        axis.line.set_color(AXIS)
    big = BLOCKS and not TALL  # the wide layout's larger axis text needs more room
    axt = AXIS_TXT if BLOCKS else BASE  # axis-title size
    pad = (18 if big else 14) * K
    ax.tick_params(colors=INK, labelsize=TICK_TXT if BLOCKS else BASE * 0.8, pad=2 * K)
    if big:  # push the corner tick labels apart ("120" vs "$0.50" at the front, "0" vs "480" at the left)
        ax.tick_params(axis="x", pad=16 * K)
        ax.tick_params(axis="y", pad=8 * K)
        ax.tick_params(axis="z", pad=14 * K)
    if XMODE == "cost":
        ax.set_xlim(math.log10(X_RANGE[0]), math.log10(X_RANGE[1]))
        ax.set_xticks([math.log10(v) for v in X_TICKS])
        ax.set_xticklabels([dollars(v) for v in X_TICKS])
        ax.set_xlabel(X_LABEL, labelpad=pad + (8 * K if big else 0), color=INK, fontsize=axt)
    else:
        ticks = [date(2026, 7, 1), date(2026, 8, 1), date(2026, 9, 1), date(2026, 10, 1)]
        ax.set_xlim(-6, 100)
        ax.set_xticks([(t - date(2026, 7, 1)).days for t in ticks])
        ax.set_xticklabels([t.strftime("%b") for t in ticks])
        ax.set_xlabel("Model release date (2026)", labelpad=pad, color=INK, fontsize=axt)
    ax.set_ylim(*Y_LIM)
    if PAPER:
        ax.set_yticks([-math.log10(v) for v in RATE_TICKS])
        ax.set_yticklabels([f"{v:g}" for v in RATE_TICKS])
    else:
        ax.set_yticks(list(Y_TICKS))
    ax.set_ylabel(Y_LABEL, labelpad=pad, color=INK, fontsize=axt)
    ax.set_zlim(*Z_LIM)
    if PAPER:
        ax.set_zticks([math.log10(v) for v in SCORE_TICKS])
        ax.set_zticklabels([f"{v:g}" for v in SCORE_TICKS])
    else:
        ax.set_zticks([0, 20, 40, 60])
    ax.set_zlabel(Z_LABEL if PAPER else "Mean Task Score (%)", labelpad=(20 if big else 10) * K, color=INK, fontsize=axt)

    anns = []
    if with_labels == "blocks":
        block_labels(ax, ax.figure, pts)
    elif with_labels == "auto":
        items = []
        for r, x, y, z, dom in pts:
            x2, y2, _ = proj3d.proj_transform(x, y, z, ax.get_proj())
            items.append({"x2": x2, "y2": y2, "z": z, "label": label(r), "fontsize": BASE * 0.8})
        auto_place_labels(ax, ax.figure, items)
    elif with_labels:
        place = PLACE_COST if XMODE == "cost" else PLACE_DATE
        for r, x, y, z, dom in pts:
            x2, y2, _ = proj3d.proj_transform(x, y, z, ax.get_proj())
            dx, dy, ha = place[(r["model"], r["effort"], r["mode"])]
            far = abs(dy) > 14 or abs(dx) > 40
            ann = ax.annotate(
                label(r), (x2, y2), xytext=(dx, dy), textcoords="offset points", ha=ha, va="center",
                fontsize=BASE * 0.8, color=INK, zorder=10, annotation_clip=False,
                bbox={"facecolor": SURFACE, "edgecolor": "none", "pad": 1.2, "alpha": 0.9},
                arrowprops={"arrowstyle": "-", "color": MUTED, "linewidth": 1, "shrinkA": 2, "shrinkB": 8} if far else None,
            )
            anns.append((ann, x, y, z))
    return pts, anns


def auto_place_labels(ax, fig, items: list[dict]) -> None:
    """Greedy label placement in display space around projected markers.

    Each label tries positions on rings around its marker, preferring the right
    side and short distances, and takes the first spot that overlaps no marker
    or placed label and stays inside the axes. Far placements get a leader.
    """
    from matplotlib.transforms import Bbox

    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    axbox = ax.get_window_extent(renderer).expanded(0.98, 0.98)
    sizes = []
    for it in items:
        t = ax.text2D(0, 0, it["label"], fontsize=it["fontsize"], transform=ax.transAxes)
        bb = t.get_window_extent(renderer)
        sizes.append((bb.width, bb.height))
        t.remove()
    markers = [ax.transData.transform((it["x2"], it["y2"])) for it in items]
    obstacles = [Bbox.from_bounds(mx - 10, my - 10, 20, 20) for mx, my in markers]
    angles = [0, 20, -20, 40, -40, 180, 160, -160, 60, -60, 90, -90, 120, -120, 140, -140]
    radii = [12, 26, 44, 64, 88, 115, 145, 180]
    order = sorted(range(len(items)), key=lambda i: -items[i]["z"])
    placed = []
    for i in order:
        it, (w, h), (mx, my) = items[i], sizes[i], markers[i]
        best = None
        for r in radii:
            for a in angles:
                px, py = mx + r * math.cos(math.radians(a)), my + r * math.sin(math.radians(a))
                c = math.cos(math.radians(a))
                if c > 0.2:
                    box = Bbox.from_bounds(px, py - h / 2, w, h); ha = "left"
                elif c < -0.2:
                    box = Bbox.from_bounds(px - w, py - h / 2, w, h); ha = "right"
                else:
                    box = Bbox.from_bounds(px - w / 2, py - h / 2, w, h); ha = "center"
                pad = box.expanded(1.06, 1.2)
                if not (axbox.x0 <= pad.x0 and pad.x1 <= axbox.x1 and axbox.y0 <= pad.y0 and pad.y1 <= axbox.y1):
                    continue
                if any(pad.overlaps(o) for o in obstacles) or any(pad.overlaps(pb) for pb in placed):
                    continue
                if r >= 26:
                    lx_, ly_ = (box.x0 if ha == "left" else box.x1 if ha == "right" else (box.x0 + box.x1) / 2), (box.y0 + box.y1) / 2
                    if any(pb.contains(mx + (lx_ - mx) * k / 12, my + (ly_ - my) * k / 12) for pb in placed for k in range(1, 12)):
                        continue
                best = (r, a, ha, box)
                break
            if best:
                break
        if best is None:
            best = (12, 0, "left", Bbox.from_bounds(mx + 12, my - h / 2, w, h))
        r, a, ha, box = best
        placed.append(box.expanded(1.06, 1.2))
        dx = (box.x0 if ha == "left" else box.x1 if ha == "right" else (box.x0 + box.x1) / 2) - mx
        dy = (box.y0 + box.y1) / 2 - my
        pts = 72 / fig.dpi
        ax.annotate(
            it["label"], (it["x2"], it["y2"]), xytext=(dx * pts, dy * pts), textcoords="offset points", ha=ha, va="center",
            fontsize=it["fontsize"], color=INK, zorder=10, annotation_clip=False,
            bbox={"facecolor": SURFACE, "edgecolor": "none", "pad": 1.2, "alpha": 0.9},
            arrowprops={"arrowstyle": "-", "color": MUTED, "linewidth": 1, "shrinkA": 2, "shrinkB": 8} if r >= 26 else None,
        )


# Block layout for the ideal-corner view: each block is a column of labels anchored
# near a reference marker (axes-fraction offsets), with a leader to every marker.
# One table per axis mode; the per-trial tables also have a blocks-tall variant.
BLOCKS_LAYOUT = [
    # (reference config, dx, dy of the first row in points from the reference marker,
    #  members top-to-bottom as (config, relpos): relpos is the point on the label box the leader leaves from)
    # Gemini alone, just above its dot with a short vertical leader.
    (("gemini-3.8-flash", "high", "standard"), -62, 34, [
        (("gemini-3.8-flash", "high", "standard"), (0.355, 0.0)),
    ]),
    # The two medium Opus runs, on the floor below and left of their dots.
    (("claude-opus-5", "medium", "standard"), -162, -50, [
        (("claude-opus-5", "medium", "standard"), (0.95, 1.0)),
        (("claude-opus-5-5", "medium", "standard"), (0.9, 1.0)),
    ]),
    # GPT-6 Sol just below its dot; GPT-5.6 Sol to the right of its dot.
    (("gpt-6-sol", "high", "fast"), -42, -26, [
        (("gpt-6-sol", "high", "fast"), (0.38, 1.0)),
    ]),
    (("gpt-5.6-sol", "high", "fast"), 12, -18, [
        (("gpt-5.6-sol", "high", "fast"), (0.0, 0.5)),
    ]),
    # Top middle, straddling the back edge of the box, a clear band below the legend.
    (("gemini-3.8-flash", "high", "standard"), 129, 146, [
        (("gpt-6.1-sol", "high", "fast"), (1.0, 0.5)),
        (("gpt-6-astra", "medium", "standard"), (0.64, 0.0)),
    ]),
    # Top right: the two extra-high runs, above their dots.
    (("claude-opus-5-5", "xhigh", "fast"), 20, 63, [
        (("claude-opus-5-5", "xhigh", "fast"), (0.0, 0.5)),
        (("gpt-6-astra", "xhigh", "fast"), (0.0, 0.5)),
    ]),
    # Right, below the surface: Astra ultrafast under its dot, then the two high fast runs to its left.
    (("gpt-6-astra", "high", "ultrafast"), -72, -60, [
        (("gpt-6-astra", "high", "ultrafast"), (0.40, 1.0)),
        (("gpt-6-astra", "high", "fast"), (0.0, 0.5)),
        (("claude-opus-5-5", "high", "fast"), (0.08, 1.0)),
    ]),
]
BLOCKS_LAYOUT_PAPER = [  # --paper: the log rate and score axes move the markers, so the blocks are placed afresh
    # Gemini alone, just above its dot with a short vertical leader.
    (("gemini-3.8-flash", "high", "standard"), -62, 34, [
        (("gemini-3.8-flash", "high", "standard"), (0.355, 0.0)),
    ]),
    # The two medium Opus runs project close together here, so each gets its own label: Opus 5.5 (M) just under its
    # dot (its leader is short and vertical, clear of the Opus 5 dot), Opus 5 (M) lower left on the floor.
    (("claude-opus-5-5", "medium", "standard"), -14, -31, [
        (("claude-opus-5-5", "medium", "standard"), (0.1, 1.0)),
    ]),
    (("claude-opus-5", "medium", "standard"), -155, -47, [
        (("claude-opus-5", "medium", "standard"), (0.95, 1.0)),
    ]),
    (("gpt-6-sol", "high", "fast"), -42, -26, [
        (("gpt-6-sol", "high", "fast"), (0.38, 1.0)),
    ]),
    (("gpt-5.6-sol", "high", "fast"), 12, -18, [
        (("gpt-5.6-sol", "high", "fast"), (0.0, 0.5)),
    ]),
    (("gemini-3.8-flash", "high", "standard"), 129, 146, [
        (("gpt-6.1-sol", "high", "fast"), (1.0, 0.5)),
        (("gpt-6-astra", "medium", "standard"), (0.64, 0.0)),
    ]),
    (("claude-opus-5-5", "xhigh", "fast"), 20, 63, [
        (("claude-opus-5-5", "xhigh", "fast"), (0.0, 0.5)),
        (("gpt-6-astra", "xhigh", "fast"), (0.0, 0.5)),
    ]),
    (("gpt-6-astra", "high", "ultrafast"), -72, -60, [
        (("gpt-6-astra", "high", "ultrafast"), (0.40, 1.0)),
        (("gpt-6-astra", "high", "fast"), (0.0, 0.5)),
        (("claude-opus-5-5", "high", "fast"), (0.08, 1.0)),
    ]),
]
BLOCKS_LAYOUT_PER_TRIAL = [  # --per-trial, --layout blocks
    # (reference config, dx, dy of the first row in points from the reference marker,
    #  members top-to-bottom as (config, relpos): relpos is the point on the label box the leader leaves from)
    # Astra block, directly under the gap between its three dots.
    (("gpt-6-astra", "high", "ultrafast"), -139, -70, [
        (("gpt-6-astra", "high", "ultrafast"), (0.65, 1.0)),
        (("gpt-6-astra", "high", "fast"), (0.0, 0.5)),
        (("claude-opus-5-5", "high", "fast"), (0.0, 0.5)),
    ]),
    # Sol block, on the floor between its dots and the front edge.
    (("gpt-6-sol", "high", "fast"), -37, -39, [
        (("gpt-6-sol", "high", "fast"), (0.5, 1.0)),
        (("gpt-5.6-sol", "high", "fast"), (1.0, 0.75)),
    ]),
    # Gemini alone, just above its dot with a short vertical leader.
    (("gemini-3.8-flash", "high", "standard"), -62, 28, [
        (("gemini-3.8-flash", "high", "standard"), (0.355, 0.0)),
    ]),
    # The two medium Opus runs, clear of the Opus 5 dot, the chart's left edge and the floor edge.
    (("gemini-3.8-flash", "high", "standard"), -42, -60, [
        (("claude-opus-5", "medium", "standard"), (0.8, 1.0)),
        (("claude-opus-5-5", "medium", "standard"), (1.0, 0.5)),
    ]),
    # Top left, straddling the back edge of the box, a clear band below the legend.
    (("gemini-3.8-flash", "high", "standard"), 129, 146, [
        (("gpt-6.1-sol", "high", "fast"), (1.0, 0.5)),
        (("gpt-6-astra", "medium", "standard"), (0.64, 0.0)),
    ]),
    # Top right, straddling the back edge of the box, a clear band below the legend.
    (("claude-opus-5-5", "xhigh", "fast"), 20, 63, [
        (("claude-opus-5-5", "xhigh", "fast"), (0.0, 0.5)),
        (("gpt-6-astra", "xhigh", "fast"), (0.0, 0.5)),
    ]),
]
BLOCKS_ROW_PT = 29  # row pitch in points
BLOCKS_LAYOUT_PER_TRIAL_TALL = [  # --per-trial, --layout blocks-tall
    (("gpt-6-astra", "high", "ultrafast"), -139, -100, [
        (("gpt-6-astra", "high", "ultrafast"), (0.65, 1.0)),
        (("gpt-6-astra", "high", "fast"), (0.0, 0.5)),
        (("claude-opus-5-5", "high", "fast"), (0.0, 0.5)),
    ]),
    (("gpt-6-sol", "high", "fast"), -29, -87, [
        (("gpt-6-sol", "high", "fast"), (0.5, 1.0)),
        (("gpt-5.6-sol", "high", "fast"), (1.0, 0.5)),
    ]),
    (("gemini-3.8-flash", "high", "standard"), -62, 28, [
        (("gemini-3.8-flash", "high", "standard"), (0.355, 0.0)),
    ]),
    (("gemini-3.8-flash", "high", "standard"), -71, -90, [
        (("claude-opus-5", "medium", "standard"), (0.8, 1.0)),
        (("claude-opus-5-5", "medium", "standard"), (1.0, 0.5)),
    ]),
    (("gpt-6-astra", "medium", "standard"), -116, 128, [
        (("gpt-6.1-sol", "high", "fast"), (1.0, 0.5)),
        (("gpt-6-astra", "medium", "standard"), (1.0, 0.5)),
    ]),
    (("claude-opus-5-5", "xhigh", "fast"), 35, 55, [
        (("claude-opus-5-5", "xhigh", "fast"), (0.0, 0.5)),
        (("gpt-6-astra", "xhigh", "fast"), (0.0, 0.5)),
    ]),
]


def block_labels(ax, fig, pts) -> None:
    """Place labels in aligned columns with leaders (see BLOCKS_LAYOUT).

    Offsets are in points so the layout survives figure-size changes. Marker positions are compared in
    axes fraction, which Axes3D keeps when it squares the box at draw time, and converted with the final
    box side.
    """
    proj = ax.get_proj()
    where = {}
    for r, x, y, z, dom in pts:
        x2, y2, _ = proj3d.proj_transform(x, y, z, proj)
        disp = ax.transData.transform((x2, y2))
        where[(r["model"], r["effort"], r["mode"])] = ((x2, y2), ax.transAxes.inverted().transform(disp), r, dom)
    sp = fig.subplotpars
    side_pt = 72 * min(fig.get_figwidth() * (sp.right - sp.left), fig.get_figheight() * (sp.top - sp.bottom))
    if os.environ.get("BLOCKS_DEBUG"):  # print marker positions (axes fraction) and the box side to plan offsets
        print("box side pt", side_pt, "fig in", fig.get_figwidth(), fig.get_figheight())
        for key, (_, (fx, fy), _, _) in where.items():
            print(f"{key}: ax=({fx:.4f}, {fy:.4f})")
    table = BLOCKS_LAYOUT_PAPER if PAPER else (BLOCKS_LAYOUT_PER_TRIAL_TALL if TALL else BLOCKS_LAYOUT_PER_TRIAL) if PER_TRIAL else BLOCKS_LAYOUT
    for ref, dx, dy, members in table:
        (_, (rx, ry), _, _) = where[ref]
        for i, (key, relpos) in enumerate(members):
            (xy, (ox, oy), r, dom) = where[key]
            if PAPER:  # regular weight throughout; dominated runs' labels in the 2D figures' grey, leaders in the lab colour
                colour = INK2 if dom else INK
                arrow = {"arrowstyle": "-", "color": DEV_COLOR[r["developer"]], "alpha": 0.6, "linewidth": 0.5, "shrinkA": 1.5,
                         "shrinkB": MARK_PT / 2 + 1, "relpos": relpos}
            else:
                colour = INK
                arrow = {"arrowstyle": "-", "color": MUTED, "linewidth": 1, "shrinkA": 2, "shrinkB": 9, "relpos": relpos}
            ax.annotate(
                label(r), xy, xytext=((rx - ox) * side_pt + dx * K, (ry - oy) * side_pt + dy * K - i * (TXT * 1.7 if PAPER else BLOCKS_ROW_PT)),
                textcoords="offset points", ha="left", va="center",
                fontsize=TXT, color=colour, zorder=10, annotation_clip=False,
                bbox={"facecolor": SURFACE, "edgecolor": "none", "pad": 1.2},  # opaque: box edges behind a label must not show through
                arrowprops=arrow,
            )


def content_bbox(fig, pad: float) -> Bbox:
    """Bounding box of the drawn content in figure inches, padded, from an Agg draw of the figure.

    Axes3D squares its box and we let it overhang the page, so matplotlib's own tight bbox is not usable;
    the raster is the ground truth for what is on the page.
    """
    fig.canvas.draw()
    rgb = np.asarray(fig.canvas.buffer_rgba())[..., :3].astype(int)
    bg = np.array([int(SURFACE[i : i + 2], 16) for i in (1, 3, 5)])
    mask = np.abs(rgb - bg).sum(axis=2) > 12
    rows, cols = np.where(mask.any(axis=1))[0], np.where(mask.any(axis=0))[0]
    h, dpi = rgb.shape[0], fig.dpi
    return Bbox.from_extents(cols[0] / dpi - pad, (h - 1 - rows[-1]) / dpi - pad, (cols[-1] + 1) / dpi + pad, (h - rows[0]) / dpi + pad)


def follow_rotation(fig, ax, anns) -> None:
    """Re-anchor the 2D labels to their markers whenever the 3D view changes."""
    def update(_event=None):
        proj = ax.get_proj()
        for ann, x, y, z in anns:
            x2, y2, _ = proj3d.proj_transform(x, y, z, proj)
            ann.xy = (x2, y2)
        fig.canvas.draw_idle()
    for name in ("motion_notify_event", "button_release_event", "scroll_event", "resize_event"):
        fig.canvas.mpl_connect(name, update)


def main() -> None:
    rows = load()
    if SWEEP:
        views = [(e, a) for e in (15, 30, 45) for a in (-120, -70, -20)]
        fig = plt.figure(figsize=(18, 15))
        for i, (e, a) in enumerate(views, 1):
            ax = fig.add_subplot(3, 3, i, projection="3d")
            draw_scene(ax, rows, e, a, with_labels=False)
            ax.set_title(f"--elev {e} --azim {a}", fontsize=BASE, color=INK2, pad=4)
            ax.set_xlabel(""); ax.set_ylabel(""); ax.set_zlabel("")
        fig.suptitle("View sweep: pick an angle, then re-render with those flags", x=0.03, y=0.985, ha="left", fontsize=16, fontweight="bold", color=INK)
        fig.subplots_adjust(left=0.0, right=1.0, top=0.95, bottom=0.0, wspace=0.0, hspace=0.05)
        out = Path(str(OUT) + "-sweep")
        fig.savefig(f"{out}.png", dpi=110)
        print("wrote", f"{out}.png")
        return

    if PAPER:
        paper(rows)
        return
    fig, ax, anns = render(rows)
    if SHOW:
        if LABELS:
            follow_rotation(fig, ax, anns)
        print("drag to rotate; close the window to print the final --elev/--azim")
        plt.show()
        print(f"final view: --elev {ax.elev:.0f} --azim {ax.azim:.0f}")
        return
    trim = content_bbox(fig, pad=0.1) if BLOCKS else None  # the blocks layout is cropped to its drawn content
    for ext in ("png", "svg", "pdf"):
        fig.savefig(f"{OUT}.{ext}", dpi=200 if ext == "png" else None, bbox_inches=trim, facecolor=SURFACE)
    print(f"wrote {OUT}.png" + (f" (trimmed to {trim.width:.2f} x {trim.height:.2f} in)" if trim is not None else ""))


def paper(rows: list[dict]) -> None:
    """The CoRL figure: scale the layout until the cropped figure is WIDTH wide, write PDF and PNG, and the .tex snippet."""
    global K
    for _ in range(6):
        fig, ax, _ = render(rows)
        trim = content_bbox(fig, pad=0.03)
        if abs(trim.width - WIDTH) < 0.01:
            break
        K *= WIDTH / trim.width
        plt.close(fig)
    OUT.parent.mkdir(exist_ok=True)
    fig.savefig(f"{OUT}.pdf", bbox_inches=trim, facecolor=SURFACE)
    fig.savefig(f"{OUT}.png", dpi=300, bbox_inches=trim, facecolor=SURFACE)
    print(f"wrote {OUT}.pdf and .png: {trim.width:.2f} x {trim.height:.2f} in, layout scale {K:.3f}, {FAMILY}")
    if not SERIF and not CROSSES:
        n_opt = sum(1 for r in rows if not any(
            b is not r and b["cost"] <= r["cost"] and b["time"] <= r["time"] and b["score"] >= r["score"]
            and (b["cost"] < r["cost"] or b["time"] < r["time"] or b["score"] > r["score"]) for b in rows))
        caption = (r"\textbf{Cost, speed and score Pareto frontier on RoboDojo-RC Tier~1.} Each point is one model configuration "
                   "(M/H/XH: medium, high and extra-high reasoning effort; UF: ultrafast serving), placed by its API cost per subtask, "
                   "subtask completion rate (subtasks per hour of wall-clock time) and mean task score over 120 attempts, all on log "
                   "axes, with a drop line to the floor. Cost and rate are ratios of totals (summed cost over the subtasks completed, "
                   "and subtasks completed over summed minutes, an attempt judged at milestone $k$ of its task completing $k$ subtasks), "
                   "so attempts that completed no subtask still count. The surface is the Pareto frontier: at each cost and rate, the "
                   "best score of any configuration that is at most that costly and at least that fast. "
                   f"Filled markers are the {n_opt} Pareto-optimal configurations; hollow markers are dominated (another configuration "
                   "is at least as good on all three axes and better on one).")
        tex = "\n".join([
            "% Generated by robodojo_3d_plot.py --paper. Copy the PDF into the paper's figures/ directory (or change the path). Needs graphicx.",
            r"\begin{figure}[t]",
            r"  \centering",
            r"  \includegraphics[width=\linewidth]{figures/robodojo-3d-frontier.pdf}",
            rf"  \caption{{{caption}}}",
            r"  \label{fig:pareto-3d}",
            r"\end{figure}",
        ])
        (OUT.parent / "robodojo-3d-frontier.tex").write_text(tex + "\n")


def render(rows: list[dict]) -> tuple:
    """The single figure (not the sweep): scene, labels and legend. Returns (fig, ax, label annotations)."""
    if PAPER:
        figsize, box, legend_y = paper_geometry(K)
    else:
        figsize, box, legend_y = (BLOCKS_FIG if BLOCKS else (12.0, 9.6)), (BLOCKS_BOX if BLOCKS else (0.02, 0.9)), BLOCKS_LEGEND_Y
    fig = plt.figure(figsize=figsize)
    ax = fig.add_subplot(111, projection="3d")
    fig.subplots_adjust(left=0.0, right=1.0, top=box[1], bottom=box[0])
    _, anns = draw_scene(ax, rows, ELEV, AZIM, with_labels=(LABELS if SHOW else ("blocks" if BLOCKS else "auto")))
    if PAPER:  # one row above the plot, as the 2D figures: hollow lab shapes, the filled Pareto-optimal marker, the surface
        from matplotlib.patches import Patch
        handles = []
        for d in ("OpenAI", "Anthropic", "Google"):
            m, k = SHAPE[d]
            handles.append(Line2D([], [], marker=m, markersize=MARK_PT * k, markerfacecolor=DEV_COLOR[d] if CROSSES else SURFACE,
                                  markeredgecolor=SURFACE if CROSSES else DEV_COLOR[d], markeredgewidth=0.6 if CROSSES else EDGE_PT,
                                  linestyle="none", label=d))
        if CROSSES:
            handles.append(Line2D([], [], marker="x", color=INK2, markersize=MARK_PT, markeredgewidth=1.0, linestyle="none", label="Dominated"))
        else:
            handles.append(Line2D([], [], marker="o", markersize=MARK_PT * 1.1, markerfacecolor=INK2, markeredgecolor=SURFACE,
                                  markeredgewidth=0.6, linestyle="none", label="Pareto-optimal"))
        handles.append(Patch(facecolor="#2a78d6", alpha=0.25, edgecolor="none", label="Pareto surface"))
        fig.legend(handles=handles, loc="upper center", bbox_to_anchor=(0.5, legend_y), frameon=False, fontsize=LEGEND_TXT,
                   labelcolor=INK, ncol=len(handles), columnspacing=1.2, handletextpad=0.5, handlelength=1.5)
        return fig, ax, anns
    handles = [
        Line2D([], [], marker="o", color=DEV_COLOR[d], markersize=13 if BLOCKS else 11, linestyle="none", markeredgecolor=SURFACE, label=d)
        for d in ("OpenAI", "Anthropic", "Google")
    ]
    if FRONTIER:
        from matplotlib.patches import Patch
        handles += [Patch(facecolor="#2a78d6", alpha=0.25, edgecolor="none",
                          label="Pareto surface" if BLOCKS else "Pareto surface: best score within a cost and time budget"),
                    Line2D([], [], marker="x", color=INK2, markersize=11 if BLOCKS else 9, markeredgewidth=2.2, linestyle="none",
                           label="Dominated" if BLOCKS else "Dominated: another run is at least as good on all three axes")]
    if BLOCKS:
        fig.legend(handles=handles, loc="upper center", bbox_to_anchor=(0.5, BLOCKS_LEGEND_Y), frameon=False, fontsize=LEGEND_TXT,
                   labelcolor=INK, ncol=len(handles), columnspacing=1.2, handletextpad=0.5)
    else:
        ax.legend(handles=handles, loc="upper left", bbox_to_anchor=(0.0, 0.98), frameon=False, fontsize=BASE * 0.85, labelcolor=INK,
                  ncol=3 if not FRONTIER else 2, columnspacing=1.6, handletextpad=0.5)
        title = (
            (f"RoboDojo-RC Tier 1 Pareto Frontier\nby Cost and Wall-Clock Time per {UNIT}" if FRONTIER else f"RoboDojo-RC Tier 1 Mean Task Scores\nby Cost and Wall-Clock Time per {UNIT}")
            if XMODE == "cost"
            else f"RoboDojo-RC Tier 1 Mean Task Scores\nby Model Release Date and Wall-Clock Time per {UNIT}"
        )
        fig.suptitle(title, x=0.03, y=0.97, ha="left", fontsize=16 * SCALE, fontweight="bold", color=INK, linespacing=1.15)
    return fig, ax, anns


if __name__ == "__main__":
    main()
