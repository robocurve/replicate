"""Survival-curve figure: how far through each rubric the RoboDojo-RC Tier 1 trials got.

One panel per task (3 rows x 2 columns). Each curve is one configuration and
shows the share of its 20 trials whose GPT-6 Astra autograde reached at least
each rubric checkpoint, so every curve starts at 100 percent and can only fall.
Color identifies the model, marker shape the reasoning effort (circle medium,
square high, triangle extra-high; diamond for the ultrafast service mode). All
text is set at one size (BASE) except the task titles (TITLE_SIZE); checkpoint
scores are shown in percentage points. There is no figure title or subtitle:
the paper caption carries the methods text.

Reads robodojo-milestone-mix.json beside this script and writes PNG, SVG and PDF next to it.

    --no-jitter   draw every curve exactly on the checkpoint ticks (curves that
                  share a value then overlap completely)
    --only a,b    keep only the listed model keys, e.g. gpt-6-astra,claude-opus-5-5
    --configs a,b keep only the listed configuration keys (model|effort|mode)
    --one-per-model
                  one curve per model: its highest-effort configuration, except
                  GPT-6 Astra, which uses high effort in ultrafast mode (ONE_PER_MODEL_PIN)
    --suffix s    append -s to the output file names (e.g. --suffix models)
    --paper       the CoRL-paper version, written to paper-figures/ as PDF and PNG with a
                  .tex caption: the 2D paper figures' type, ink and palette anchors at the
                  text width; with --font serif, --width W (inches, default 5.5) and
                  --check (print overlapping tick labels, a legend touching a title, or
                  content off the figure)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

matplotlib.use("Agg")

HERE = Path(__file__).resolve().parent
FONT_DIR = next((d for d in (HERE / "fonts", Path("/usr/share/fonts/truetype/liberation")) if d.is_dir()), HERE / "fonts")  # the bundled Liberation TTFs (SIL OFL 1.1), else Debian's fonts-liberation package
DATA = HERE / "robodojo-milestone-mix.json"
OUT = HERE / "robodojo-survival-curves"
if "--suffix" in sys.argv:
    OUT = OUT.with_name(OUT.name + "-" + sys.argv[sys.argv.index("--suffix") + 1])
JITTER = "--no-jitter" not in sys.argv
ONLY = None
if "--only" in sys.argv:
    ONLY = set(sys.argv[sys.argv.index("--only") + 1].split(","))
CONFIGS = None
if "--configs" in sys.argv:
    CONFIGS = set(sys.argv[sys.argv.index("--configs") + 1].split(","))
ONE_PER_MODEL = "--one-per-model" in sys.argv
# Configurations pinned by --one-per-model; every other model takes its highest effort.
ONE_PER_MODEL_PIN = {"gpt-6-astra": "gpt-6-astra|high|ultrafast"}
EFFORT_RANK = {"medium": 0, "high": 1, "xhigh": 2}
PAPER = "--paper" in sys.argv  # the CoRL figure: see the --paper blocks below
SERIF = PAPER and "--font" in sys.argv and sys.argv[sys.argv.index("--font") + 1] == "serif"
CHECK = "--check" in sys.argv
WIDTH = float(sys.argv[sys.argv.index("--width") + 1]) if "--width" in sys.argv else 5.5  # --paper: figure width in inches (the CoRL text width)
SUFFIX = sys.argv[sys.argv.index("--suffix") + 1] if "--suffix" in sys.argv else ""
if PAPER:
    OUT = HERE / "paper-figures" / (OUT.name + ("-serif" if SERIF else ""))

# Chart chrome: shared with the sibling RoboDojo figures, except that the surface
# is pure white so the figure sits on a paper page without a visible edge.
SURFACE = "#ffffff"
INK = "#0b0b0b"
INK2 = "#52514e"
MUTED = "#898781"
GRID = "#e1e0d9"
AXIS = "#c3c2b7"

# Categorical palette, slots 1-7 in fixed order (validated: adjacent pairs pass in
# light mode; aqua, yellow and magenta sit below 3:1 on the surface, so the legend
# and marker shapes carry identity alongside hue). The mapping is fixed per model
# and does not change when configurations are dropped. The three flagship models
# keep the developer hues of the sibling figures (OpenAI blue, Anthropic orange,
# Google aqua).
MODEL_COLOR = {
    "gpt-6-astra": "#2a78d6",
    "claude-opus-5-5": "#eb6834",
    "gemini-3.8-flash": "#1baf7a",
    "gpt-6.1-sol": "#eda100",
    "claude-opus-5": "#e87ba4",
    "gpt-6-sol": "#008300",
    "gpt-5.6-sol": "#4a3aa7",
}
NAME = {
    "gpt-5.6-sol": "GPT-5.6 Sol", "claude-opus-5": "Claude Opus 5", "gemini-3.8-flash": "Gemini 3.8 Flash",
    "gpt-6-astra": "GPT-6 Astra", "gpt-6-sol": "GPT-6 Sol", "claude-opus-5-5": "Claude Opus 5.5", "gpt-6.1-sol": "GPT-6.1 Sol",
}
EFFORT = {"medium": "M", "high": "H", "xhigh": "XH"}
EFFORT_MARKER = {"medium": "o", "high": "s", "xhigh": "^"}
ULTRAFAST_MARKER = "D"

TASKS = ["Stack Bowls", "Store In Safe", "Sort Objects", "Cap Pen", "Pack And Pour Fruit", "Stand Up Bottles"]
ROWS, COLS = 3, 2

# Horizontal offset order (left to right). Models pinned left take the leftmost
# offsets in this order, models pinned right the rightmost (last entry is the
# rightmost curve); everything else fills the middle in legend order. Pulling the
# top models to opposite ends keeps their curves apart where they share a value,
# such as the 100 percent plateau on Stack Bowls.
JITTER_LEFT = ["claude-opus-5-5", "gemini-3.8-flash"]
JITTER_RIGHT = ["gpt-6.1-sol", "gpt-6-astra"]

# Checkpoints per task: (score threshold, score in percentage points, short label).
# Labels are abbreviated to fit the slot width at BASE size: "obj." for objects;
# for Pack And Pour Fruit, "in bowl" means fruits packed into the small bowl and
# "out" means fruits poured from it into the large bowl.
# Thresholds are the rubric's non-zero levels. Sort Objects awards 0.33 or 0.34
# (and 0.66 or 0.67) depending on which baskets the objects landed in; both
# correspond to the same number of objects sorted, so they share one checkpoint,
# labelled with the rounded fraction (33%, 67%).
CHECKPOINTS: dict[str, list[tuple[float, str, str]]] = {
    "Stack Bowls": [
        (0.25, "25%", "2 bowls\noverlap"),
        (0.5, "50%", "2 bowls\nstacked"),
        (0.75, "75%", "3 bowls\noverlap"),
        (1.0, "100%", "3 bowls\nstacked"),
    ],
    "Store In Safe": [
        (0.25, "25%", "1 obj.\nin safe"),
        (0.5, "50%", "2 obj.\nin safe"),
        (0.75, "75%", "3 obj.\nin safe"),
        (1.0, "100%", "3 in safe,\nlid closed"),
    ],
    "Sort Objects": [
        (0.17, "17%", "1 obj.\nsorted"),
        (0.33, "33%", "2 obj.\nsorted"),
        (0.5, "50%", "3 obj.\nsorted"),
        (0.66, "67%", "4 obj.\nsorted"),
        (0.83, "83%", "5 obj.\nsorted"),
        (1.0, "100%", "All 6\nsorted"),
    ],
    "Cap Pen": [
        (0.2, "20%", "Pen/cap\nlifted"),
        (0.5, "50%", "Both held\nin air"),
        (0.75, "75%", "Touch\nin air"),
        (1.0, "100%", "Cap on\npen"),
    ],
    "Pack And Pour Fruit": [
        (0.1, "10%", "1 in\nbowl"),
        (0.3, "30%", "2 in\nbowl"),
        (0.5, "50%", "3 in\nbowl"),
        (0.7, "70%", "Bowl\nlifted"),
        (0.8, "80%", "1 out"),
        (0.9, "90%", "2 out"),
        (1.0, "100%", "All 3\nout"),
    ],
    "Stand Up Bottles": [
        (0.1, "10%", "Bottle\nlifted"),
        (0.4, "40%", "1 bottle\nupright"),
        (0.7, "70%", "2 bottles\nupright"),
        (1.0, "100%", "3 bottles\nupright"),
    ],
}
# Rubric levels folded into the preceding checkpoint (see CHECKPOINTS).
MERGED = {"Sort Objects": {0.34: 0.33, 0.67: 0.66}}

# One text size everywhere (points) except the task titles.
BASE = 20
TITLE_SIZE = 28
LINE_W = 2.0
MARKER_SIZE = 11.25
# Per-shape size factors: a triangle covers less area than a square or diamond of
# the same nominal size, so it is drawn 30 percent larger; the circle 20 percent.
MARKER_SCALE = {"^": 1.3, "o": 1.2}

# Layout in inches; subplots_adjust fractions are derived from these.
FIG_W = 16.5
AX_H = 2.32  # 1.93in x 1.2
TITLE_BAND = 0.65  # panel title above each axes
XLABEL_BAND = 1.2  # three-line tick labels below each axes
TOP_BAND = 0.1  # margin above the first row of titles
LEGEND_COLS = 4
LEFT = 1.55  # y label plus y tick labels
RIGHT, BOTTOM, LEGEND_PAD = 0.165, 0.0, 0.35  # right and bottom margins and the legend strip's padding, inches
EDGE_W, LINE_ALPHA, TICK_PAD, TITLE_PAD = 1.4, 0.9, 6, 10  # marker edge (points), curve alpha, tick-label and title pads (points)
AXIS_PT = BASE  # axis-title size
TICK_INK, YTICK_INK, LABEL_INK = INK2, MUTED, INK2  # x tick labels, y tick labels, axis titles
Y_LABEL = "Trials reaching\ncheckpoint (%)"
if PAPER:  # the 2D paper figures' dress (../robodojo-release-date-charts/robodojo_release_paper_figures.py): their ink, grid and
    # spine colours, 8 pt axis type with 7 pt tick labels and legend, thin marks, and a palette anchored on their lab colours
    # (OpenAI ink, Anthropic rust and Google purple for the three flagship models, as the default palette anchors on the
    # website's lab hues); the other four models take hues checked for colour-blind separation against every other.
    # Marker shapes still encode the effort, since the all-configurations figure needs it.
    INK, INK2, MUTED, GRID, AXIS = "#1a1511", "#6a655f", "#aaa6a1", "#e4e2de", "#aaa6a1"
    TICK_INK = YTICK_INK = LABEL_INK = INK
    # Chosen by a search over OKLCH (the dataviz skill's validator, all pairs, white surface): every pair of the seven is at
    # least 15 OKLab dE apart (most over 18) for normal vision and at least 6.2 under simulated protan/deutan vision, with
    # the two pairs below 8 (Opus 5 or Opus 5.5 against GPT-6 Sol) also told apart by marker shape in the one-per-model
    # figure. Opus 5 takes a lighter warm hue of the Anthropic family; no second purple, so Gemini stays the only one.
    MODEL_COLOR = {
        "gpt-6-astra": "#1B150F",  # the paper's OpenAI ink
        "claude-opus-5-5": "#9C3D1B",  # the paper's Anthropic rust
        "gemini-3.8-flash": "#9177C7",  # the paper's Google purple
        "gpt-6.1-sol": "#225a93",  # navy
        "gpt-6-sol": "#04844d",  # green
        "gpt-5.6-sol": "#b18e15",  # olive gold
        "claude-opus-5": "#e65d76",  # salmon
    }
    BASE, AXIS_PT, TITLE_SIZE = 7.0, 8.0, 8.0
    LINE_W, MARKER_SIZE, EDGE_W, LINE_ALPHA = 0.8, 4.0, 0.6, 1.0
    FIG_W, AX_H, TITLE_BAND, XLABEL_BAND, TOP_BAND = WIDTH, 0.85, 0.2, 0.46, 0.04
    LEFT, RIGHT, BOTTOM, LEGEND_PAD, TICK_PAD, TITLE_PAD = 0.6, 0.06, 0.08, 0.08, 3, 4
    Y_LABEL = "Trials completing\nsubtask (%)"


def legend_band(n_entries: int) -> float:
    """Height of the legend strip in inches: one text line per row plus padding."""
    return LEGEND_PAD + (BASE * 1.45 / 72) * -(-n_entries // LEGEND_COLS)

FAMILY = ("Liberation Serif" if SERIF else "Liberation Sans") if PAPER else "DejaVu Sans"
if PAPER:  # TrueType, so the PDF embeds clean subsets
    from matplotlib import font_manager
    for f in FONT_DIR.glob(f"{FAMILY.replace(' ', '')}-*.ttf"):
        font_manager.fontManager.addfont(str(f))
plt.rcParams.update(
    {
        "font.family": FAMILY,
        "font.size": BASE,
        "axes.edgecolor": AXIS,
        "axes.labelcolor": LABEL_INK,
        "xtick.color": TICK_INK,
        "ytick.color": YTICK_INK,
        "xtick.labelsize": BASE,
        "ytick.labelsize": BASE,
        "axes.labelsize": AXIS_PT,
        "axes.titlesize": TITLE_SIZE,
        "legend.fontsize": BASE,
        **({"pdf.fonttype": 42} if PAPER else {}),
        "figure.facecolor": SURFACE,
        "axes.facecolor": SURFACE,
        "savefig.facecolor": SURFACE,
    }
)


def label(cfg: str) -> str:
    model, effort, mode = cfg.split("|")
    return f"{NAME[model]} ({EFFORT[effort]}{'+UF' if mode == 'ultrafast' else ''})"


def marker(cfg: str) -> str:
    _, effort, mode = cfg.split("|")
    return ULTRAFAST_MARKER if mode == "ultrafast" else EFFORT_MARKER[effort]


def marker_size(cfg: str) -> float:
    return MARKER_SIZE * MARKER_SCALE.get(marker(cfg), 1.0)


def check_rubrics(rubrics: dict) -> None:
    """Fail loudly if the hard-coded checkpoints drift from the rubric levels in the data."""
    for task, points in CHECKPOINTS.items():
        levels = {float(lv["score"]) for lv in rubrics[task]["levels"]} - {0.0}
        folded = {MERGED.get(task, {}).get(s, s) for s in levels}
        want = {s for s, _, _ in points}
        if folded != want:
            raise SystemExit(f"{task}: checkpoints {sorted(want)} do not match rubric levels {sorted(levels)}")


def survival(rows: list[dict], thresholds: list[float]) -> list[float]:
    """Percent of trials scoring at or above each threshold (100 at the start)."""
    n = rows[0]["n"]
    return [100.0] + [100.0 * sum(r["count"] for r in rows if float(r["level_score"]) >= t - 1e-9) / n for t in thresholds]


def select(configs: list[str]) -> list[str]:
    if ONLY:
        configs = [c for c in configs if c.split("|")[0] in ONLY]
    if CONFIGS:
        missing = CONFIGS - set(configs)
        if missing:
            raise SystemExit(f"unknown configurations: {sorted(missing)}")
        configs = [c for c in configs if c in CONFIGS]
    if ONE_PER_MODEL:
        best: dict[str, str] = {}
        for c in configs:
            model, effort, _ = c.split("|")
            if model in ONE_PER_MODEL_PIN:
                best[model] = ONE_PER_MODEL_PIN[model]
            elif model not in best or EFFORT_RANK[effort] > EFFORT_RANK[best[model].split("|")[1]]:
                best[model] = c
        configs = [c for c in configs if c in set(best.values())]
    return configs


def check(fig, axes, leg) -> None:
    """Print any x tick labels that overlap, a legend that touches a panel title, or content off the figure (silence means none)."""
    fig.canvas.draw()
    rend = fig.canvas.get_renderer()
    for ax in axes.flat:
        items = [(t.get_text().replace("\n", " / "), t.get_window_extent(rend)) for t in ax.get_xticklabels()]
        for (ta, a), (tb, b) in zip(items, items[1:]):
            if a.x1 > b.x0 and a.y1 > b.y0 and b.y1 > a.y0:
                print(f"CHECK {ax.get_title()}: x tick labels {ta!r} and {tb!r} overlap by {(a.x1 - b.x0) * 72 / fig.dpi:.1f} pt")
        if leg.get_window_extent(rend).overlaps(ax.title.get_window_extent(rend)):
            print(f"CHECK legend touches the {ax.get_title()} title")
    bb = fig.get_tightbbox(rend)
    w, h = fig.get_size_inches()
    if bb.x0 < -0.005 or bb.y0 < -0.005 or bb.x1 > w + 0.005 or bb.y1 > h + 0.005:
        print(f"CHECK content runs off the {w:.2f} x {h:.2f} in figure: {bb.x0:.2f} {bb.y0:.2f} {bb.x1:.2f} {bb.y1:.2f}")


def write_tex(n: int) -> None:
    """The paper figure's environment and caption, next to the PDF (default type only)."""
    if ONE_PER_MODEL:
        variant = "One curve per model: its highest-effort configuration, except GPT-6 Astra, drawn at high effort in ultrafast mode."
    elif CONFIGS and SUFFIX == "frontier":
        variant = r"The nine Pareto-optimal configurations of Figure~\ref{fig:pareto-3d}."
    elif CONFIGS or ONLY:
        variant = f"{n} configurations are drawn."
    else:
        variant = "All twelve configurations are drawn."
    caption = (r"\textbf{How far through each task's rubric the trials got on RoboDojo-RC Tier~1.} One panel per task; each curve is "
               "one model configuration (M/H/XH: medium, high and extra-high reasoning effort; UF: ultrafast serving) and shows the "
               "share of its 20 trials whose autograde reached at least each subtask (a rubric checkpoint), so every curve starts at "
               r"100\% and can only fall. Subtasks are the rubric's non-zero levels, labelled with the level's score; Sort Objects' "
               "paired levels (0.33/0.34 and 0.66/0.67, the same number of objects sorted) are one subtask each. Colour identifies the "
               "model and marker shape the reasoning effort (circle medium, square high, triangle extra-high, diamond ultrafast); curves "
               "are offset slightly sideways so that those sharing a value stay visible. " + variant)
    flags = " --paper" + (" --one-per-model" if ONE_PER_MODEL else "") + (f" --suffix {SUFFIX}" if SUFFIX else "")
    tex = "\n".join([
        f"% Generated by robodojo_survival_plot.py{flags}. Copy the PDF into the paper's figures/ directory (or change the path). Needs graphicx.",
        r"\begin{figure}[t]",
        r"  \centering",
        rf"  \includegraphics[width=\linewidth]{{figures/{OUT.name}.pdf}}",
        rf"  \caption{{{caption}}}",
        rf"  \label{{fig:survival{'-' + SUFFIX if SUFFIX else ''}}}",
        r"\end{figure}",
    ])
    OUT.with_suffix(".tex").write_text(tex + "\n")


def main() -> None:
    data = json.loads(DATA.read_text())
    rubrics, counts = data["rubrics"], data["counts"]
    check_rubrics(rubrics)
    cells: dict[tuple[str, str], list[dict]] = {}
    for row in counts:
        cells.setdefault((row["config"], row["task"]), []).append(row)
    configs = select(sorted({row["config"] for row in counts}))

    def mean_score(cfg: str, task: str) -> float:
        rows = cells[(cfg, task)]
        return 100 * sum(float(r["level_score"]) * r["count"] for r in rows) / rows[0]["n"]

    order = sorted(configs, key=lambda c: -sum(mean_score(c, t) for t in TASKS) / len(TASKS))
    # Deterministic horizontal offsets so curves sharing a value stay visible.
    pinned = set(JITTER_LEFT + JITTER_RIGHT)
    jitter_order = (
        [c for m in JITTER_LEFT for c in order if c.split("|")[0] == m]
        + [c for c in order if c.split("|")[0] not in pinned]
        + [c for m in JITTER_RIGHT for c in order if c.split("|")[0] == m]
    )
    n = len(jitter_order)
    offsets = {c: (i - (n - 1) / 2) * (0.26 / max(n - 1, 1)) if JITTER else 0.0 for i, c in enumerate(jitter_order)}

    fig_h = TOP_BAND + ROWS * (TITLE_BAND + AX_H + XLABEL_BAND) + legend_band(len(order)) + BOTTOM
    fig, axes = plt.subplots(ROWS, COLS, figsize=(FIG_W, fig_h))
    for ax, task in zip(axes.flat, TASKS):
        points = CHECKPOINTS[task]
        thresholds = [s for s, _, _ in points]
        xs = list(range(len(points) + 1))
        for cfg in order:
            ys = survival(cells[(cfg, task)], thresholds)
            color = MODEL_COLOR[cfg.split("|")[0]]
            xj = [x + offsets[cfg] for x in xs]
            ax.plot(xj, ys, color=color, linewidth=LINE_W, solid_joinstyle="round", solid_capstyle="round", alpha=LINE_ALPHA, zorder=3)
            ax.plot(
                xj[1:], ys[1:], linestyle="none", marker=marker(cfg), markersize=marker_size(cfg), color=color,
                markeredgecolor=SURFACE, markeredgewidth=EDGE_W, zorder=4, clip_on=False,
            )
        ax.set_xticks(xs)
        ax.set_xticklabels(["Start"] + [f"{pct}\n{desc}" for _, pct, desc in points], linespacing=1.2)
        ax.set_xlim(-0.45, len(points) + 0.45)
        ax.set_ylim(-5, 105)  # headroom so markers at 0 and 100 percent are not cut off
        ax.set_yticks([0, 25, 50, 75, 100])
        ax.set_yticklabels(["0", "25", "50", "75", "100"])
        for side in ("top", "right"):
            ax.spines[side].set_visible(False)
        for side in ("left", "bottom"):
            ax.spines[side].set_color(AXIS)
            if PAPER:
                ax.spines[side].set_linewidth(0.6)
        ax.tick_params(length=0, pad=TICK_PAD)
        ax.grid(axis="y", color=GRID, linewidth=0.4 if PAPER else 1, zorder=0)
        ax.set_axisbelow(True)
        ax.set_title(task, loc="left", fontweight="bold", color=INK, pad=TITLE_PAD)
    for ax in axes[:, 0]:
        ax.set_ylabel(Y_LABEL, color=LABEL_INK, linespacing=1.2)

    handles = [
        Line2D(
            [], [], color=MODEL_COLOR[c.split("|")[0]], linewidth=LINE_W, marker=marker(c), markersize=marker_size(c),
            markeredgecolor=SURFACE, markeredgewidth=EDGE_W, label=label(c),
        )
        for c in order
    ]
    if PAPER:  # the legend above the panels, as the 2D figures' legend row, in LEGEND_COLS columns
        leg = fig.legend(
            handles=handles, loc="upper center", bbox_to_anchor=(0.5, 1 - TOP_BAND / fig_h), ncol=LEGEND_COLS, frameon=False,
            handlelength=2.0, columnspacing=1.2, handletextpad=0.5, labelspacing=0.4, labelcolor=INK, borderaxespad=0, borderpad=0,
        )
        fig.subplots_adjust(
            left=LEFT / FIG_W,
            right=1 - RIGHT / FIG_W,
            top=1 - (TOP_BAND + legend_band(len(order)) + TITLE_BAND) / fig_h,
            bottom=(BOTTOM + XLABEL_BAND) / fig_h,
            hspace=(TITLE_BAND + XLABEL_BAND) / AX_H,
            wspace=0.12,
        )
    else:
        leg = fig.legend(
            handles=handles, loc="lower center", bbox_to_anchor=(0.5, 0.0), ncol=LEGEND_COLS, frameon=False,
            handlelength=2.4, columnspacing=1.6, handletextpad=0.7, labelspacing=0.5, labelcolor=INK2,
        )
        fig.subplots_adjust(
            left=LEFT / FIG_W,
            right=0.99,
            top=1 - (TOP_BAND + TITLE_BAND) / fig_h,
            bottom=(legend_band(len(order)) + XLABEL_BAND) / fig_h,
            hspace=(TITLE_BAND + XLABEL_BAND) / AX_H,
            wspace=0.11,
        )
    if CHECK:
        check(fig, axes, leg)
    if PAPER:
        OUT.parent.mkdir(exist_ok=True)
        fig.savefig(f"{OUT}.pdf")
        fig.savefig(f"{OUT}.png", dpi=300)
        if not SERIF:
            write_tex(len(order))
    else:
        for ext in ("png", "svg", "pdf"):
            fig.savefig(f"{OUT}.{ext}", dpi=170 if ext == "png" else None)
    print(f"wrote {OUT.with_suffix('.png')}  ({FIG_W:.1f} x {fig_h:.1f} in)")
    print()
    print(f"{'configuration':30s}" + "".join(f"{t[:12]:>14s}" for t in TASKS))
    for cfg in order:
        print(f"{label(cfg):30s}" + "".join(f"{mean_score(cfg, t):14.1f}" for t in TASKS))


if __name__ == "__main__":
    main()
