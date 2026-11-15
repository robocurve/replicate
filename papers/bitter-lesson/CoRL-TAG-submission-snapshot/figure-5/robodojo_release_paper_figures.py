"""CoRL-paper versions of the three X cards in ``x-cards/``: score, cost and rate against release date.

Two full-width floats: the score chart at ``--width`` x ``--height`` inches, default
5.5 x 2.1 (the CoRL template's 5.5 in text width; a quarter of its 9 in text
height, with a two-line caption taking the figure to about 2.5 in), and the rate
and cost charts stacked in one figure (rate above cost on the same x axis, each
panel as tall as the score plot, ``--gap`` inches apart), written as vector PDFs for
``includegraphics[width=linewidth]`` and as 300 dpi PNG previews. The charts
keep the X cards' content: log y axes with 1-2-5 ticks and the cards' label
layout, re-tuned for the wide, short plot. The score chart keeps the exponential
fit (least squares on log2 of the value against release date over the ``in_fit``
record setters, drawn from 2026-07-01 to 2026-10-07); the cost and rate charts
draw none, since three record setters do not support one, and the ``.tex``
snippet tabulates each metric's first and latest record instead. Paper conventions
replace the cards': no title, lead line, caption or footer (``paper-figures/
robodojo-release-figures.tex`` carries them as LaTeX captions with the
numbers filled in, followed by the record-setter table), 8 pt axis type and 7 pt labels in Liberation Sans (Arial
metrics, embedded as TrueType; ``--font=serif`` sets Liberation Serif, Times
metrics, to match the CoRL body text), plain markers in the lab's colour with
one shape per lab (OpenAI circle, Anthropic diamond, Google triangle), record
setters filled with bold labels and everything else hollow with grey labels,
and a one-row legend above the plot. ``--icons`` keeps the cards' lab-icon rings.

Writes ``paper-figures/robodojo-release-{score,rate-cost}.{pdf,png}`` and the
``.tex`` snippet (needs graphicx and booktabs); ``--icons`` and ``--font=serif`` add ``-icons`` and ``-serif`` to the names. ``--check`` prints any label that touches a marker, bar or
other label, and any text that runs off the figure.
Run with: uv run --with matplotlib --with pillow --with svgpath2mpl python
robodojo_release_paper_figures.py --check
"""

from __future__ import annotations

import csv
import sys
from datetime import date, datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
FONT_DIR = next((d for d in (HERE / "fonts", Path("/usr/share/fonts/truetype/liberation")) if d.is_dir()), HERE / "fonts")  # the bundled Liberation TTFs (SIL OFL 1.1), else Debian's fonts-liberation package
sys.path.insert(0, str(HERE))

import matplotlib  # noqa: E402

matplotlib.use("Agg")
import matplotlib.dates as mdates  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib import font_manager  # noqa: E402
from matplotlib.colors import to_rgb  # noqa: E402
from matplotlib.legend_handler import HandlerTuple  # noqa: E402
from matplotlib.lines import Line2D  # noqa: E402
from matplotlib.ticker import FixedLocator, FuncFormatter, NullLocator  # noqa: E402

import robodojo_metr_style_robocurve_plot as base  # noqa: E402  (icon paths, label placement, overlap check)

CHARTS = HERE / "robocurve-charts"
OUT = HERE / "paper-figures"
CHECK = "--check" in sys.argv
ICONS = "--icons" in sys.argv


def _opt(name: str, default: str) -> str:
    return next((a.split("=", 1)[1] for a in sys.argv if a.startswith(name + "=")), default)


WIDTH, HEIGHT = float(_opt("--width", "5.5")), float(_opt("--height", "2.1"))  # inches
DPI = int(_opt("--dpi", "300"))
GAP = float(_opt("--gap", "0.16"))  # inches between the two panels of the stacked rate-over-cost figure
SERIF = _opt("--font", "sans") == "serif"
FAMILY = "Liberation Serif" if SERIF else "Liberation Sans"
for f in FONT_DIR.glob(f"{FAMILY.replace(' ', '')}-*.ttf"):
    font_manager.fontManager.addfont(str(f))

# Type and ink. CoRL sets 10 pt body and 9 pt captions; the figure's axis type is 8 pt and its labels 7 pt.
AXIS_PT, TICK_PT, LABEL_PT, LEGEND_PT = 8.0, 8.0, 7.0, 7.0
INK = "#1a1511"
LABEL_INK = "#6a655f"  # labels of configurations off the record: 65% ink
GRID, SPINE, FIT, SURFACE = "#e4e2de", "#aaa6a1", "#6a655f", "#ffffff"
LAB = {"OpenAI": "#1B150F", "Anthropic": "#9C3D1B", "Google": "#9177C7"}  # Google takes the cards' ring colour (the Gemini gradient's middle stop); it passes the CVD check against the Anthropic rust, the site's green does not
ICON_FILL = {"OpenAI": "#000000", "Anthropic": "#D97757", "Google": "#9177C7"}
SHAPE = {"OpenAI": ("o", 1.0), "Anthropic": ("D", 0.82), "Google": ("^", 1.12)}  # marker, size factor for equal visual weight
MARK_PT = 6.5  # marker diameter (the ring's, under --icons)
EDGE_PT = 0.8
DX = MARK_PT / 2 + 2.5  # label offset from a marker centre, in points
MARGIN = dict(left=0.56 + AXIS_PT * 1.2 / 72, right=0.08, bottom=0.36, top=0.21)  # inches around the axes: y tick labels and a two-line title (quantity, then unit: on one line the rate title would be longer than the panel is tall); x tick labels and title; the legend row
X0, X1 = date(2026, 7, 1), date(2026, 11, 11)  # the X cards' date range
FIT_X = (date(2026, 7, 1), date(2026, 10, 7))
COL_L, COL_R = "2026-08-28", "2026-10-05"  # label columns: right-aligned left of the September 2-4 cluster, left-aligned right of the September 22-29 one

plt.rcParams.update(
    {
        "font.family": FAMILY,
        "font.size": TICK_PT,
        "axes.labelsize": AXIS_PT,
        "axes.labelcolor": INK,
        "xtick.labelsize": TICK_PT,
        "ytick.labelsize": TICK_PT,
        "xtick.color": INK,
        "ytick.color": INK,
        "axes.unicode_minus": False,
        "pdf.fonttype": 42,
        "figure.facecolor": SURFACE,
        "axes.facecolor": SURFACE,
        "savefig.facecolor": SURFACE,
    }
)


def tint(color: str, amount: float = 0.5) -> tuple:
    """``color`` mixed towards white by ``amount``."""
    return tuple(1 - (1 - v) * (1 - amount) for v in to_rgb(color))


def load(name: str, value: callable) -> list[dict]:
    rows = []
    with (CHARTS / f"robodojo-metr-style-judge-square-robocurve-{name}title-frontier.csv").open() as fh:
        for r in csv.DictReader(fh):
            r["date"] = datetime.strptime(r["release_date"], "%Y-%m-%d").date()
            r["y"] = value(r)
            r["log"] = float(np.log10(r["y"]))
            r["in_fit"] = r["in_fit"] == "1"
            if name == "":
                r["ci_low_pct"], r["ci_high_pct"] = float(r["ci_low_pct"]), float(r["ci_high_pct"])
            else:
                r["ci_low_pct"] = r["ci_high_pct"] = r["y"]  # no interval: the checker sees a zero-length bar
            rows.append(r)
    return rows


SCORE = {
    "file": "score",
    "load": lambda: load("", lambda r: float(r["mean_score_pct"])),
    "ylabel": "Mean task score\n(%, log scale)",  # two lines like the stacked figure's titles: on one it is 109 pt, the panel 110 pt tall
    "ylim": (10, 67), "ticks": [10, 20, 30, 50], "fmt": lambda v, _=None: f"{v:g}%", "bars": True,
    "foot": 1 / 25.4,  # inches of axis below the 10% tick, so the x axis and its tick labels clear the "10%" label
    "legend_lift": 1 / 25.4,  # inches the legend row sits above its usual place, clear of the GPT-6 Astra (H+UF) label and the trend line
    "trend": "Doubling", "fit": True,
    "column_shift": 0.5,  # lines: lifts the September 2-4 column so the Astra (M) leader passes over the Gemini marker and bar
    "place": {
        ("gpt-5.6-sol", "high"): ("offset", DX, 0, "left"),
        ("claude-opus-5", "medium"): ("offset", DX, 0, "left"),
        ("gemini-3.8-flash", "high"): ("column", COL_L, "right"),
        ("gpt-6-astra", "medium"): ("column", COL_L, "right"),
        ("gpt-6-astra", "high"): ("column", COL_L, "right"),
        ("gpt-6-astra", "xhigh"): ("column", COL_L, "right"),
        ("gpt-6-astra", "high", "ultrafast"): ("column", COL_L, "right"),
        ("claude-opus-5-5", "xhigh"): ("data", COL_R, 52.5, "left", (0.0, 0.5)),
        ("gpt-6.1-sol", "high"): ("data", COL_R, 44.5, "left", (0.0, 0.5)),
        ("claude-opus-5-5", "medium"): ("data", COL_R, 34.0, "left", (0.0, 0.5)),  # (M) and (H) sit under the GPT-6.1 Sol label so their leaders pass under its bar
        ("claude-opus-5-5", "high"): ("data", COL_R, 29.0, "left", (0.0, 0.5)),
        ("gpt-6-sol", "high"): ("data", COL_R, 21.98, "left", (0.0, 0.5)),
    },
}
COST = {
    "file": "cost",
    "load": lambda: load("cost-", lambda r: float(r["cost_per_checkpoint_usd"])),
    "ylabel": "API cost per subtask\n($/subtask)",  # two lines: on one it is 116 pt, longer than the 110 pt panel
    # The top is $6, not the cards' $5: headroom for the $4.51 GPT-6 Astra (H+UF) label under the legend.
    "ylim": (0.2, 6), "ticks": [0.2, 0.5, 1, 2, 5], "fmt": lambda v, _=None: f"${v:,.0f}" if v >= 1 else f"${v:.2f}", "bars": False,
    "foot": 1 / 25.4,  # inches of axis below the $0.20 tick, so the x axis and its tick labels clear the "$0.20" label
    "trend": "Halving", "fit": False,  # three record setters: no trend is drawn; the table in the .tex gives the range
    "place": {
        ("gpt-5.6-sol", "high"): ("offset", DX, 0, "left"),
        ("claude-opus-5", "medium"): ("offset", DX, 0, "left"),
        ("gemini-3.8-flash", "high"): ("offset", -DX, 0, "right"),
        ("gpt-6-astra", "medium"): ("offset", DX, 2.0, "left"),  # right of its marker, between the September 22 markers
        ("gpt-6-astra", "high"): ("offset", DX, -1.5, "left"),  # right of its marker: left would collide with the Opus 5 (M) label
        ("gpt-6-astra", "xhigh"): ("offset", -DX, 3.0, "right"),  # a touch high to clear the Opus 5 (M) label
        ("gpt-6-astra", "high", "ultrafast"): ("offset", -DX, 0, "right"),
        ("claude-opus-5-5", "xhigh"): ("data", COL_R, 2.2, "left", (0.0, 0.5)),
        ("claude-opus-5-5", "high"): ("data", COL_R, 1.42, "left", (0.0, 0.5)),
        ("gpt-6.1-sol", "high"): ("data", COL_R, 1.08, "left", (0.0, 0.5)),
        ("gpt-6-sol", "high"): ("data", COL_R, 0.82, "left", (0.0, 0.5)),
        ("claude-opus-5-5", "medium"): ("data", COL_R, 0.4768, "left", (0.0, 0.5)),
    },
}
RATE = {
    "file": "rate",
    "load": lambda: load("rate-", lambda r: 60 * float(r["checkpoints_per_minute"])),
    "ylabel": "Subtask completion rate\n(subtasks/hour)",  # two lines: on one it is 143 pt, longer than the 110 pt panel
    "ylim": (8, 63), "ticks": [10, 20, 50], "fmt": lambda v, _=None: f"{v:g}", "bars": False,
    "trend": "Doubling", "fit": False,  # three record setters: no trend is drawn; the table in the .tex gives the range
    "place": {
        ("gpt-5.6-sol", "high"): ("offset", DX, 0, "left"),
        ("claude-opus-5", "medium"): ("offset", DX, 0, "left"),
        ("gemini-3.8-flash", "high"): ("offset", -DX, 2.5, "right"),
        ("gpt-6-astra", "high"): ("offset", -DX, 4.5, "right"),
        ("gpt-6-astra", "xhigh"): ("offset", -DX, -4.5, "right"),  # carries the coincident (M) marker
        ("gpt-6-astra", "medium"): ("offset", -DX, 0, "right"),
        ("gpt-6-astra", "high", "ultrafast"): ("offset", -DX, 0, "right"),
        ("claude-opus-5-5", "high"): ("data", COL_R, 37.0, "left", (0.0, 0.5)),
        ("gpt-6.1-sol", "high"): ("data", COL_R, 31.0, "left", (0.0, 0.5)),
        ("claude-opus-5-5", "xhigh"): ("data", COL_R, 26.0, "left", (0.0, 0.5)),
        ("claude-opus-5-5", "medium"): ("data", COL_R, 21.8, "left", (0.0, 0.5)),
        ("gpt-6-sol", "high"): ("data", COL_R, 17.92, "left", (0.0, 0.5)),
    },
    "text": {("gpt-6-astra", "xhigh", "fast"): "GPT-6 Astra (XH, M)"},
    "skip": {("gpt-6-astra", "medium", "standard")},
}


def configure_base() -> None:
    """Point the base module's label and leader geometry at this figure's scale."""
    base.PX = 0.6  # leaders at 0.48 pt (0.8 site px)
    base.RING_PT = MARK_PT  # the overlap checker's marker radius
    base.ICON_BOX_PT = MARK_PT * 11 / 18  # the site's 11 px icon in an 18 px ring
    base.TEXT = LABEL_PT
    base.LABEL_INK = LABEL_INK
    base.SURFACE = SURFACE


def draw_point(ax, x: float, y: float, dev: str, record: bool, icons: dict) -> None:
    """One configuration: filled (record setter) or hollow marker in the lab's colour and shape, or the card's icon ring."""
    if ICONS:
        alpha = 1.0 if record else 0.5
        ax.plot(x, y, marker="o", markersize=MARK_PT, markerfacecolor=SURFACE, markeredgecolor=LAB[dev],
                markeredgewidth=EDGE_PT * (2 if record else 1), alpha=alpha, linestyle="none", zorder=4)
        path, ms = icons[dev]
        ax.plot(x, y, marker=path, markersize=ms, color=ICON_FILL[dev], markeredgecolor="none", alpha=alpha, linestyle="none", zorder=5)
        return
    m, k = SHAPE[dev]
    if record:
        ax.plot(x, y, marker=m, markersize=MARK_PT * k * 1.1, markerfacecolor=LAB[dev], markeredgecolor=SURFACE,
                markeredgewidth=0.6, linestyle="none", zorder=5)
    else:  # a surface halo first, so overlapping hollow markers stack instead of tangling
        ax.plot(x, y, marker=m, markersize=MARK_PT * k + 1.6, markerfacecolor=SURFACE, markeredgecolor="none", linestyle="none", zorder=3.9)
        ax.plot(x, y, marker=m, markersize=MARK_PT * k, markerfacecolor=SURFACE, markeredgecolor=LAB[dev],
                markeredgewidth=EDGE_PT, linestyle="none", zorder=4)


def legend(ax, spec: dict, days: float, icons: dict, ax_h: float):
    """Lab markers, the record-setter fill and, where one is drawn, the fitted trend: one row above the axes (``ax_h`` inches
    tall), no frame, lifted by ``spec["legend_lift"]`` inches if set."""
    handles, labels = [], []
    for dev in ("OpenAI", "Anthropic", "Google"):
        if ICONS:
            ring = Line2D([], [], marker="o", markersize=MARK_PT, markerfacecolor=SURFACE, markeredgecolor=LAB[dev], markeredgewidth=EDGE_PT, linestyle="none")
            path, ms = icons[dev]
            handles.append((ring, Line2D([], [], marker=path, markersize=ms, color=ICON_FILL[dev], markeredgecolor="none", linestyle="none")))
        else:
            m, k = SHAPE[dev]
            handles.append(Line2D([], [], marker=m, markersize=MARK_PT * k, markerfacecolor=SURFACE, markeredgecolor=LAB[dev], markeredgewidth=EDGE_PT, linestyle="none"))
        labels.append(dev)
    if ICONS:
        handles.append(Line2D([], [], marker="o", markersize=MARK_PT, markerfacecolor=SURFACE, markeredgecolor=FIT, markeredgewidth=2 * EDGE_PT, linestyle="none"))
        labels.append("Record setter (bold ring)")
    else:
        handles.append(Line2D([], [], marker="o", markersize=MARK_PT * 1.1, markerfacecolor=FIT, markeredgecolor=SURFACE, markeredgewidth=0.6, linestyle="none"))
        labels.append("Record setter")
    if spec["fit"]:
        handles.append(Line2D([], [], color=FIT, linewidth=0.8, linestyle=(0, (2, 3)), dash_capstyle="round"))
        labels.append("Fitted trend")
    lift = spec.get("legend_lift", 0.0) / ax_h  # axes fraction
    leg = ax.legend(handles, labels, handler_map={tuple: HandlerTuple(ndivide=1, pad=0)}, loc="lower left", bbox_to_anchor=(0, 1.0 + lift),
                    frameon=False, fontsize=LEGEND_PT, ncol=len(handles), columnspacing=1.2, handletextpad=0.5, handlelength=1.5,
                    borderaxespad=0.1, borderpad=0, labelcolor=INK)
    leg.set_zorder(7)
    return leg


def y_range(spec: dict, ax_h: float) -> tuple[float, float]:
    """``spec["ylim"]`` extended below by ``spec["foot"]`` inches of an axes ``ax_h`` inches tall (the foot included): the
    decades per inch stay those of ``ylim`` over the axes less its foot, so the foot is extra axis under the bottom tick."""
    lo, hi = spec["ylim"]
    foot = spec.get("foot", 0.0)
    if foot:
        lo /= 10 ** (foot * np.log10(hi / lo) / (ax_h - foot))
    return lo, hi


def style_axes(ax, spec: dict, ax_h: float, xlabels: bool) -> None:
    """Spines, grid, the log y axis with its ticks and the x axis; ``xlabels`` False hides the x tick labels and title."""
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(SPINE)
        ax.spines[side].set_linewidth(0.6)
    ax.grid(True, axis="both", color=GRID, linewidth=0.4)
    ax.set_axisbelow(True)
    ax.set_yscale("log")
    ax.set_ylim(*y_range(spec, ax_h))
    ax.yaxis.set_major_locator(FixedLocator(spec["ticks"]))
    ax.yaxis.set_minor_locator(NullLocator())
    ax.yaxis.set_major_formatter(FuncFormatter(spec["fmt"]))
    ax.set_xlim(X0, X1)
    ax.set_xticks([date(2026, m, 1) for m in (7, 8, 9, 10)])
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    ax.tick_params(axis="both", which="both", length=0, pad=3)
    if xlabels:
        ax.set_xlabel("Model release date", labelpad=3)
    else:
        ax.tick_params(axis="x", labelbottom=False)
    ax.set_ylabel(spec["ylabel"], labelpad=4)


def panel(ax, spec: dict, ax_h: float, xlabels: bool = True, with_legend: bool = True) -> tuple:
    """Draw one metric into ``ax`` (``ax_h`` inches tall); return (points, annots, legend, numbers for the captions)."""
    rows = spec["load"]()
    style_axes(ax, spec, ax_h, xlabels)
    icons = {dev: base.icon_marker(base.ICONS[dev]["path"]) for dev in LAB} if ICONS else {}
    fit = [r for r in rows if r["in_fit"]]
    place, texts, skip = spec["place"], spec.get("text", {}), spec.get("skip", set())
    lo, hi = y_range(spec, ax_h)
    decade_pt = ax_h * 72 / np.log10(hi / lo)
    line_decades = LABEL_PT * 1.3 / decade_pt  # one label line plus air, in log10 units
    shift = spec.get("column_shift", 0.0) * line_decades
    column_y = {k: 10 ** (v + shift) for k, v in base.column_positions(rows, place, key="log", gap=line_decades).items()}
    points, annots = [], []
    for r in rows:
        dev, key = r["developer"], (r["model"], r["effort"], r["mode"])
        x = mdates.date2num(r["date"])
        if spec["bars"]:
            ax.errorbar(x, r["y"], yerr=[[r["y"] - r["ci_low_pct"]], [r["ci_high_pct"] - r["y"]]], fmt="none",
                        ecolor=LAB[dev] if r["in_fit"] else tint(LAB[dev]), elinewidth=0.7 if r["in_fit"] else 0.6, capsize=0, zorder=3)
        draw_point(ax, x, r["y"], dev, r["in_fit"], icons)
        label = texts.get(key, r["label"])
        points.append((r, x, r["y"], label))
        if key in skip:
            continue
        ann, leader, relpos = base.place_label(ax, r, x, r["y"], label, place.get(key) or place[key[:2]], column_y, LAB[dev])
        if r["in_fit"]:  # record setters: bold, in the figure's ink
            ann.set_fontweight("bold")
            ann.set_color(INK)
        annots.append((ann, label, leader, relpos))

    xb = np.array([mdates.date2num(r["date"]) for r in fit])
    slope, intercept = np.polyfit(xb, np.log2([r["y"] for r in fit]), 1)
    days = abs(1 / slope)
    if spec["fit"]:
        xs = np.array([mdates.date2num(d) for d in FIT_X])
        ax.plot(xs, 2 ** (slope * xs + intercept), color=FIT, linewidth=0.8, linestyle=(0, (2, 3)), dash_capstyle="round", zorder=1, clip_on=True)
    leg = legend(ax, spec, days, icons, ax_h) if with_legend else None
    first, last = min(fit, key=lambda r: r["date"]), max(fit, key=lambda r: r["date"])
    print(f"{spec['file']}: {spec['trend'].lower()} time {days:.1f} days over {len(fit)} record setters{'' if spec['fit'] else ' (not drawn)'}; "
          f"{first['label']} {first['y']:.3g} ({first['date']}) to {last['label']} {last['y']:.3g} ({last['date']})")

    return points, annots, leg, {"days": days, "n": len(fit), "first": first, "last": last, "fit": spec["fit"]}


def finish(fig, height: float, name: str, panels: list[tuple]) -> None:
    """Under --check, report label collisions in each panel and content off the figure; then write the PDF and PNG."""
    if CHECK:
        for ax, points, annots, leg in panels:
            base.check_overlaps(fig, ax, points, annots, [leg] if leg else [])
        bb = fig.get_tightbbox(fig.canvas.get_renderer())
        if bb.x0 < -0.005 or bb.y0 < -0.005 or bb.x1 > WIDTH + 0.005 or bb.y1 > height + 0.005:
            print(f"CHECK {name}: content runs off the {WIDTH} x {height:.2f} in figure: {bb.x0:.2f} {bb.y0:.2f} {bb.x1:.2f} {bb.y1:.2f}")
    OUT.mkdir(exist_ok=True)
    stem = OUT / f"robodojo-release-{name}{'-icons' if ICONS else ''}{'-serif' if SERIF else ''}"
    fig.savefig(stem.with_suffix(".pdf"))
    fig.savefig(stem.with_suffix(".png"), dpi=DPI)
    plt.close(fig)


AX_W, AX_H = WIDTH - MARGIN["left"] - MARGIN["right"], HEIGHT - MARGIN["bottom"] - MARGIN["top"]  # one plot, inches
STACK_H = MARGIN["top"] + AX_H + GAP + AX_H + MARGIN["bottom"]  # the stacked figure: two plots of the same height


def chart(spec: dict) -> dict:
    """One metric as a WIDTH x HEIGHT figure; returns the numbers for its caption."""
    foot = spec.get("foot", 0.0)
    height, ax_h = HEIGHT + foot, AX_H + foot
    fig = plt.figure(figsize=(WIDTH, height))
    ax = fig.add_axes([MARGIN["left"] / WIDTH, MARGIN["bottom"] / height, AX_W / WIDTH, ax_h / height])
    points, annots, leg, result = panel(ax, spec, ax_h)
    finish(fig, height, spec["file"], [(ax, points, annots, leg)])
    return result


def stack_height(bottom: dict) -> float:
    """The stacked figure's height: STACK_H plus the bottom panel's foot."""
    return STACK_H + bottom.get("foot", 0.0)


def align_ylabels(fig, axes: list) -> None:
    """Set the y axis titles of ``axes`` at one x: the leftmost of the positions matplotlib gives them (each sits ``labelpad``
    left of its own tick labels, so the title beside the widest tick labels sets the column). ``Figure.align_ylabels`` would
    do this but skips axes not made by ``subplots``."""
    fig.canvas.draw()
    x = min(ax.yaxis.label.get_position()[0] for ax in axes)  # display px: the title's x transform is the identity
    for ax in axes:
        bb = ax.get_window_extent()
        ax.yaxis.set_label_coords((x - bb.x0) / bb.width, 0.5)  # as an axes fraction, so it holds at the PNG's dpi


def stacked(top: dict, bottom: dict, name: str) -> dict:
    """Two metrics as one WIDTH x stack_height(bottom) figure, ``top`` over ``bottom`` on the same x axis: each panel is as
    tall as a single chart's plot (``bottom`` plus its foot), the legend sits above the top panel and the x tick labels under
    the bottom one, and the two y titles are aligned."""
    height, h_bot = stack_height(bottom), AX_H + bottom.get("foot", 0.0)
    fig = plt.figure(figsize=(WIDTH, height))
    ax_top = fig.add_axes([MARGIN["left"] / WIDTH, (MARGIN["bottom"] + h_bot + GAP) / height, AX_W / WIDTH, AX_H / height])
    ax_bot = fig.add_axes([MARGIN["left"] / WIDTH, MARGIN["bottom"] / height, AX_W / WIDTH, h_bot / height])
    results, panels = {}, []
    for ax, spec, ax_h in ((ax_top, top, AX_H), (ax_bot, bottom, h_bot)):
        points, annots, leg, results[spec["file"]] = panel(ax, spec, ax_h, xlabels=ax is ax_bot, with_legend=ax is ax_top)
        panels.append((ax, points, annots, leg))
    align_ylabels(fig, [ax_top, ax_bot])
    finish(fig, height, name, panels)
    return results


def tex_name(r: dict) -> str:
    return r["label"].replace(" (", "~(").replace("Opus ", "Opus~").replace("Sol", "Sol").replace("Flash", "Flash")


def month(d: date) -> str:
    return d.strftime("%B %Y")


def day_month(d: date) -> str:
    return f"{d.day}~{d:%b}"


def table_env(score: dict, cost: dict, rate: dict) -> str:
    """One table: each metric's first and latest record setter, which are its lowest and highest record-setter values."""
    def block(metric: str, res: dict, fmt) -> list[str]:
        first, last = res["first"], res["last"]
        ratio = last["y"] / first["y"]
        change = (rf"$\times${ratio:.1f}" if ratio >= 1 else rf"$\div${1 / ratio:.1f}") + f" in {(last['date'] - first['date']).days} days"
        return [
            rf"{metric} & {tex_name(first)} & {day_month(first['date'])} & {fmt(first['y'])} & \\",
            rf"\quad ({res['n']} record setters) & {tex_name(last)} & {day_month(last['date'])} & {fmt(last['y'])} & {change} \\",
        ]
    rows = (block("Mean task score", score, lambda v: f"{v:.1f}\\%") + [r"\midrule"]
            + block("API cost per subtask", cost, lambda v: f"\\${v:.2f}") + [r"\midrule"]
            + block("Subtasks per hour", rate, lambda v: f"{v:.1f}"))
    caption = (r"\textbf{Range of the record setters on RoboDojo-RC Tier~1, July to September 2026.} For each metric, "
               "the first and the latest record: the lowest and highest values among the record setters (for cost, the "
               r"first record is the highest). Configurations are labelled as in Figure~\ref{fig:release-score}.")
    return "\n".join([
        r"\begin{table}[t]",
        r"  \centering",
        r"  \small",
        rf"  \caption{{{caption}}}",
        r"  \label{tab:release-records}",
        r"  \begin{tabular}{@{}lllrl@{}}",
        r"    \toprule",
        r"    Metric & Record setter & Released & Value & Change \\",
        r"    \midrule",
        *("    " + r for r in rows),
        r"    \bottomrule",
        r"  \end{tabular}",
        r"\end{table}",
    ])


def figure_env(name: str, label: str, caption: str) -> str:
    return "\n".join([
        r"\begin{figure}[t]",
        r"  \centering",
        rf"  \includegraphics[width=\linewidth]{{figures/{name}.pdf}}",
        rf"  \caption{{{caption}}}",
        rf"  \label{{fig:{label}}}",
        r"\end{figure}",
    ])


def write_tex(score: dict, cost: dict, rate: dict) -> None:
    """The score figure, the stacked rate-over-cost figure (captions carrying the cards' title, lead line and caption) and the record-setter table."""
    marks = ("Filled markers with bold labels are the record setters: the configurations that no configuration released "
             "on or before them beat. The dashed line is a least-squares exponential fit to the record setters "
             r"($\log_2$ of the value against release date).")
    score_cap = (r"\textbf{Mean task score on RoboDojo-RC Tier~1 against model release date.} "
                 "Each point is one model configuration (M/H/XH: medium, high and extra-high reasoning effort; UF: ultrafast "
                 "serving), scored over 120 attempts (20 per task); bars are 95\\% bootstrap intervals. " + marks +
                 f" Its doubling time is {score['days']:.1f} days: the record rose from {score['first']['y']:.1f}\\% "
                 f"({tex_name(score['first'])}, {month(score['first']['date'])}) to {score['last']['y']:.1f}\\% "
                 f"({tex_name(score['last'])}, {month(score['last']['date'])}).")
    rc_cap = (r"\textbf{Subtasks completed per hour of wall-clock time (top) and API cost per subtask (bottom) against "
              r"model release date.} Rate is a configuration's summed subtasks over its 120 attempts divided by their summed "
              "duration (an attempt judged at milestone $k$ of its task completes $k$ subtasks); cost is its summed API cost "
              r"divided by the same subtasks. As ratios of totals they carry no intervals. Markers are as in Figure~\ref{fig:release-score}, "
              "with record setters the fastest and the cheapest configurations to date; with only three record setters on each "
              f"panel, no trend is fitted. The rate record rose from {rate['first']['y']:.1f} subtasks per hour "
              f"({tex_name(rate['first'])}, {month(rate['first']['date'])}) to {rate['last']['y']:.1f} ({tex_name(rate['last'])}, "
              f"{month(rate['last']['date'])}), and the cost record fell from \\${cost['first']['y']:.2f} per subtask "
              f"({tex_name(cost['first'])}, {month(cost['first']['date'])}) to \\${cost['last']['y']:.2f} ({tex_name(cost['last'])}, "
              f"{month(cost['last']['date'])}); Table~\\ref{{tab:release-records}} gives the ranges.")
    body = "\n\n".join([
        "% Generated by robodojo_release_paper_figures.py: two full-width figures and one table for a CoRL paper.\n"
        "% Copy the PDFs from paper-figures/ into the paper's figures/ directory (or change the paths) and\n"
        "% \\input this file, or paste the environments where they should float. Needs graphicx and booktabs.",
        figure_env("robodojo-release-score", "release-score", score_cap),
        figure_env("robodojo-release-rate-cost", "release-rate-cost", rc_cap),
        table_env(score, cost, rate),
    ])
    (OUT / "robodojo-release-figures.tex").write_text(body + "\n")


def main() -> None:
    configure_base()
    results = {"score": chart(SCORE), **stacked(RATE, COST, "rate-cost")}
    if not ICONS and not SERIF:  # the snippet names the default figures
        write_tex(results["score"], results["cost"], results["rate"])
    print("wrote", OUT, "| font:", FAMILY, f"| score {WIDTH} x {HEIGHT + SCORE.get('foot', 0.0):.2f} in, rate-cost {WIDTH} x {stack_height(COST):.2f} in")


if __name__ == "__main__":
    main()
