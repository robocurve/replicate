"""METR-style square panel (judge data) drawn in the robocurve.org chart style.

Same data, axes and label placement as ``robodojo_metr_style_plot.py --judge
--square`` (4.8in x 4.5in, 8pt type, Astra autogrades), restyled after the
inline SVG charts on https://robocurve.org/ (read 2026-10-12):

- every point is the site's marker: a white ring in the lab's colour with the
  lab's icon inside (OpenAI logo, Claude logo, Gemini gradient sparkle);
- error bars (and leaders) take the lab colour from the site's "Lab" legend
  (Anthropic #9C3D1B, OpenAI #1B150F, Google #1F6B36);
- rings, icons and error bars are drawn at 50% opacity;
- Open Sans type, tick labels at 60% ink, point labels at 70% ink, axis titles
  in --neutral-900, faint horizontal gridlines only, a hairline baseline, no
  other spines, and the trend dashed like the site's frontier line.

Assets live in reports/robocurve-style/ (Open Sans TTFs, icons.json with the
icon paths and colours copied from the site). Writes PNG, SVG and PDF next to
the data as robodojo-metr-style-judge-square-robocurve.*. ``--check`` prints
every label, leader or legend that touches a marker, bar or other label.
``--one-per-model`` keeps one configuration per model, as in the original.
``--text-scale=1.1`` makes every piece of text 10% larger (marker geometry unchanged).
``--frontier`` fits the dashed line to the 1D Pareto frontier instead: the configurations
that were the best released to date (running best over release date, so a weaker later
release never moves the line). Those configurations and their error bars are drawn fully
opaque with a ring twice as thick, everything else at the usual 50% with the normal ring,
and the output name gains ``-frontier``.
``--frontier-no-ultrafast`` leaves ultrafast configurations out of the frontier.
Run with: uv run --with matplotlib --with pillow --with svgpath2mpl python
reports/robodojo_metr_style_robocurve_plot.py
"""

from __future__ import annotations

import csv
import io
import json
import sys
from datetime import date, datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates  # noqa: E402
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib import font_manager  # noqa: E402
from matplotlib.legend_handler import HandlerTuple  # noqa: E402
from matplotlib.lines import Line2D  # noqa: E402
from matplotlib.offsetbox import AnnotationBbox, OffsetImage  # noqa: E402
from matplotlib.patches import PathPatch  # noqa: E402
from matplotlib.text import Text  # noqa: E402
from matplotlib.transforms import Affine2D  # noqa: E402
from svgpath2mpl import parse_path  # noqa: E402

HERE = Path(__file__).resolve().parent
ASSETS = HERE / "robocurve-style"
DATA = HERE / "robodojo-metr-style-data-judge.csv"
CHECK = "--check" in sys.argv
ONE_PER_MODEL = "--one-per-model" in sys.argv
FRONTIER_FIT = "--frontier" in sys.argv  # fit the line to the running best, not the highest effort per model
FRONTIER_ULTRAFAST = "--frontier-no-ultrafast" not in sys.argv  # ultrafast configurations may sit on the frontier
SUFFIX = "-frontier" if FRONTIER_FIT else ""
CHARTS = HERE / "robocurve-charts"  # the three titled --frontier charts as PNG, with their reconstruction CSVs
OUT = HERE / f"robodojo-metr-style-judge-square-robocurve{SUFFIX}"

# robocurve.org tokens (site.css .rc-chart-* classes and the inline SVG charts).
INK = "#1a1511"  # --neutral-900: axis titles
LABEL_INK = (0.106, 0.082, 0.059, 0.70)  # .rc-chart-label #1b150fb3
TICK_INK = (0.106, 0.082, 0.059, 0.60)  # .rc-chart-tick #1b150f99
GRID = "#EBEAE7"  # horizontal gridlines of the site's line chart
BASELINE = (0.106, 0.082, 0.059, 0.25)  # .rc-chart-axis #1b150f40
FRONTIER = (0.106, 0.082, 0.059, 0.45)  # .rc-chart-frontier #1b150f73, dashed 2 4
SURFACE = "#ffffff"
ALPHA = 0.5  # rings, icons, error bars
ICONS = json.load((ASSETS / "icons.json").open())
LAB = {k: v["lab"] for k, v in ICONS.items() if not k.startswith("_")}

# Type: the site sets 12px ticks and labels, 13px axis titles. The panel is set in
# 8pt, so one site pixel is 8/12 pt; marker geometry (18px ring, 11px icon box,
# 1px ring stroke, 0.8px leaders) is converted at that rate.
BASE = 8.0
PX = BASE / 12.0
TEXT = BASE  # text size; set_text_scale() scales text without touching marker geometry
RING_PT = 18 * PX
RING_EDGE = 1.0 * PX
ICON_BOX_PT = 11 * PX  # the 24-unit icon viewBox is drawn 11px wide on the site
FIT_EDGE_SCALE = 2.0  # ring stroke of the configurations the line is fitted to, under --frontier
EFFORT = {"medium": "M", "high": "H", "xhigh": "XH"}
EFFORT_RANK = {"medium": 0, "high": 1, "xhigh": 2}

for f in ("OpenSans-Regular.ttf", "OpenSans-SemiBold.ttf"):
    if (ASSETS / f).exists():
        font_manager.fontManager.addfont(str(ASSETS / f))
HAVE_OPEN_SANS = any(x.name == "Open Sans" for x in font_manager.fontManager.ttflist)
plt.rcParams.update(
    {
        "font.family": "sans-serif",
        "font.sans-serif": ["Open Sans", "DejaVu Sans"] if HAVE_OPEN_SANS else ["DejaVu Sans"],
        "font.size": TEXT,
        "axes.labelsize": 13 * PX,
        "axes.labelcolor": INK,
        "xtick.labelsize": TEXT,
        "ytick.labelsize": TEXT,
        "xtick.color": TICK_INK,
        "ytick.color": TICK_INK,
        "figure.facecolor": SURFACE,
        "axes.facecolor": SURFACE,
        "savefig.facecolor": SURFACE,
    }
)

# Label placement, copied from the --square layout of robodojo_metr_style_plot.py:
# ("offset", dx pt, dy pt, ha) beside the marker, or ("data", "YYYY-MM-DD", y, ha[, relpos])
# with a leader back to the marker.
PLACE = {
    ("gpt-5.6-sol", "high"): ("offset", 8, 0, "left"),
    ("claude-opus-5", "medium"): ("offset", 8, -8, "left"),
    # The September 2 to 4 cluster is labelled in a column right-aligned at Aug 29,
    # each label level with its marker (relaxed apart to one text line) so the
    # leaders run horizontally and clear the neighbouring rings.
    ("gemini-3.8-flash", "high"): ("column", "2026-08-29", "right"),
    ("gpt-6-astra", "medium"): ("column", "2026-08-29", "right"),
    ("gpt-6-astra", "high"): ("column", "2026-08-29", "right"),
    ("gpt-6-astra", "xhigh"): ("column", "2026-08-29", "right"),
    ("gpt-6-astra", "high", "ultrafast"): ("column", "2026-08-29", "right"),
    ("gpt-6-sol", "high"): ("offset", 8, 0, "left"),
    ("claude-opus-5-5", "high"): ("offset", 8, -12, "left"),
    # Opus 5.5 (M) and (H) coincide (38.8 and 38.2 on the same date); the (M) label sits
    # above-right between the (XH) and GPT-6.1 Sol labels and its leader comes in from above.
    ("claude-opus-5-5", "medium"): ("data", "2026-09-26", 47.4, "left", (0.0, 0.5)),
    ("claude-opus-5-5", "xhigh"): ("offset", 8, 11, "left"),
    ("gpt-6.1-sol", "high"): ("offset", 8, -10, "left"),
}
COLUMN_GAP = 3.0  # score points between column labels: one 8pt line plus the box pad at this axes height


def set_text_scale(scale: float) -> None:
    """Scale every piece of text (ticks, axis titles, labels, legend) by ``scale``; markers and lines keep their size."""
    global TEXT, COLUMN_GAP
    TEXT = BASE * scale
    COLUMN_GAP = 3.0 * scale
    plt.rcParams.update({"font.size": TEXT, "axes.labelsize": 13 * PX * scale, "xtick.labelsize": TEXT, "ytick.labelsize": TEXT})


if "--text-scale=" in " ".join(sys.argv):
    set_text_scale(float(next(a for a in sys.argv if a.startswith("--text-scale=")).split("=", 1)[1]))


def icon_marker(d: str):
    """SVG path (24x24 viewBox) as a centred, y-up matplotlib marker path, plus its markersize in pt.

    Matplotlib scales a custom marker so its largest coordinate maps to half the markersize,
    so the size is chosen to reproduce the site's 11px drawing of the 24-unit box.
    """
    p = parse_path(d).transformed(Affine2D().translate(-12, -12).scale(1, -1))
    half = float(np.max(np.abs(p.vertices)))
    return p, 2 * half * ICON_BOX_PT / 24


def gemini_image(d: str, gradient: dict, px: int = 360) -> np.ndarray:
    """Rasterise the Gemini sparkle with the site's diagonal linear gradient (RGBA, 24-unit box)."""
    fig = plt.figure(figsize=(1, 1), dpi=px)
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_axis_off()
    ax.set_xlim(0, 24)
    ax.set_ylim(24, 0)
    path = parse_path(d)
    (x0, y0), (x1, y1) = path.get_extents().min, path.get_extents().max
    n = 256
    u, v = np.meshgrid(np.linspace(0, 1, n), np.linspace(0, 1, n))
    t = np.clip((u + v) / 2, 0, 1)  # objectBoundingBox gradient from (0,0) to (1,1)
    stops = gradient["stops"]
    pos = np.array([s[0] for s in stops])
    rgb = np.array([matplotlib.colors.to_rgb(s[1]) for s in stops])
    img = np.stack([np.interp(t, pos, rgb[:, c]) for c in range(3)], axis=-1)
    im = ax.imshow(img, extent=(x0, x1, y1, y0), interpolation="bilinear")
    im.set_clip_path(PathPatch(path, transform=ax.transData))
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=px, transparent=True)
    plt.close(fig)
    buf.seek(0)
    return plt.imread(buf)


def load() -> list[dict]:
    rows = []
    with DATA.open() as fh:
        for r in csv.DictReader(fh):
            r["date"] = datetime.strptime(r["release_date"], "%Y-%m-%d").date()
            for k in ("mean_progress_pct", "ci_low_pct", "ci_high_pct"):
                r[k] = float(r[k])
            rows.append(r)
    return rows


def select(rows: list[dict]) -> list[dict]:
    """One configuration per model: high effort where it exists, else medium; ultrafast kept."""
    has_high = {r["model"] for r in rows if r["effort"] == "high"}
    return [r for r in rows if r["effort"] == "high" or (r["effort"] == "medium" and r["model"] not in has_high)]


def check_overlaps(fig, ax, points: list[tuple], annots: list[tuple], legends: list) -> None:
    """Print every label box, leader or legend that touches a marker ring, an error bar or another label."""
    fig.canvas.draw()
    rend = fig.canvas.get_renderer()
    px = fig.dpi / 72.0
    margin = 0.5 * px
    shrink = 6 * px
    marks = []
    for r, x, y, name in points:
        X, Y = ax.transData.transform((x, y))
        lo = ax.transData.transform((x, r["ci_low_pct"]))[1]
        hi = ax.transData.transform((x, r["ci_high_pct"]))[1]
        marks.append((name, X, Y, RING_PT * px / 2, lo, hi))

    def hits(x0, y0, x1, y1, skip=""):
        out = []
        for name, X, Y, rad, lo, hi in marks:
            if name == skip:
                continue
            if x0 - margin <= X + rad and x1 + margin >= X - rad and y0 - margin <= Y + rad and y1 + margin >= Y - rad:
                out.append(f"marker {name}")
            elif x0 - margin <= X <= x1 + margin and y0 - margin <= hi and y1 + margin >= lo:
                out.append(f"bar {name}")
        return out

    boxes = []
    for ann, name, leader, relpos in annots:
        bb = Text.get_window_extent(ann, rend).padded(1.0 * px)
        boxes.append((name, bb))
        for h in hits(bb.x0, bb.y0, bb.x1, bb.y1):
            print(f"CHECK label {name!r} touches {h}")
        if leader:
            sx, sy = bb.x0 + relpos[0] * bb.width, bb.y0 + relpos[1] * bb.height
            ex, ey = ax.transData.transform(ann.xy)
            length = float(np.hypot(ex - sx, ey - sy))
            t_end = max(0.0, 1.0 - shrink / length) if length else 0.0
            seen: set[str] = set()
            for t in np.linspace(0, t_end, 400):
                qx, qy = sx + t * (ex - sx), sy + t * (ey - sy)
                if bb.contains(qx, qy):
                    continue
                for h in hits(qx, qy, qx, qy, skip=name):
                    seen.add(h)
            for h in sorted(seen):
                print(f"CHECK leader of {name!r} crosses {h}")
    for i, (n1, b1) in enumerate(boxes):
        for n2, b2 in boxes[i + 1 :]:
            if b1.overlaps(b2):
                print(f"CHECK label {n1!r} overlaps label {n2!r}")
    for leg in legends:
        lb = leg.get_window_extent(rend)
        for h in hits(lb.x0, lb.y0, lb.x1, lb.y1):
            print(f"CHECK legend touches {h}")
        for n, b in boxes:
            if lb.overlaps(b):
                print(f"CHECK legend overlaps label {n!r}")


def style_axes(ax) -> None:
    """The site's chart furniture: horizontal grid only, hairline baseline, no tick marks, no other spines."""
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(BASELINE)
    ax.spines["bottom"].set_linewidth(1.0 * PX)
    ax.grid(axis="y", color=GRID, linewidth=0.8 * PX, linestyle="-")
    ax.set_axisbelow(True)
    ax.tick_params(length=0, pad=4)


def make_markers() -> tuple[dict, "np.ndarray"]:
    """Icon marker paths per lab (vector) and the gradient-filled Gemini raster."""
    markers = {k: icon_marker(v["path"]) for k, v in ICONS.items() if not k.startswith("_") and v["fill"] != "gradient"}
    return markers, gemini_image(ICONS["Google"]["path"], ICONS["Google"]["gradient"])


def draw_point(ax, x: float, y: float, dev: str, markers: dict, gem, alpha: float = ALPHA, edge: float = RING_EDGE) -> None:
    """The site's point glyph at (x, y): white ring (stroke ``edge`` pt) in the lab colour with the lab icon inside, at ``alpha``."""
    ax.plot(x, y, marker="o", markersize=RING_PT, markerfacecolor=SURFACE, markeredgecolor=LAB[dev],
            markeredgewidth=edge, alpha=alpha, linestyle="none", zorder=4)
    if dev in markers:
        path, ms = markers[dev]
        ax.plot(x, y, marker=path, markersize=ms, color=ICONS[dev]["fill"], markeredgecolor="none",
                alpha=alpha, linestyle="none", zorder=5)
    else:
        box = AnnotationBbox(OffsetImage(gem, zoom=ICON_BOX_PT / gem.shape[0], alpha=alpha), (x, y),
                             frameon=False, pad=0, box_alignment=(0.5, 0.5), zorder=5)
        ax.add_artist(box)


def lab_legend(ax, markers: dict):
    """"Lab" legend as on the site: ring in the lab colour with the icon inside, one row, upper left."""
    handles, labels = [], []
    for dev in ("Anthropic", "OpenAI", "Google"):
        ring = Line2D([], [], marker="o", markersize=RING_PT, markerfacecolor=SURFACE, markeredgecolor=LAB[dev],
                      markeredgewidth=RING_EDGE, linestyle="none")
        if dev in markers:
            path, ms = markers[dev]
            icon = Line2D([], [], marker=path, markersize=ms, color=ICONS[dev]["fill"], markeredgecolor="none", linestyle="none")
        else:  # legend glyph for Gemini uses the gradient's middle stop
            path, ms = icon_marker(ICONS[dev]["path"])
            icon = Line2D([], [], marker=path, markersize=ms, color=ICONS[dev]["gradient"]["stops"][1][1], markeredgecolor="none", linestyle="none")
        handles.append((ring, icon))
        labels.append(dev)
    leg = ax.legend(
        handles, labels, handler_map={tuple: HandlerTuple(ndivide=1, pad=0)}, loc="upper left", frameon=False,
        fontsize=TEXT, ncol=3, columnspacing=1.4, handletextpad=0.4, handlelength=1.6, labelcolor=LABEL_INK, borderaxespad=0.2,
    )
    leg.set_zorder(7)
    return leg


def place_label(ax, r: dict, x: float, y: float, label: str, spec: tuple, column_y: dict, lab: str):
    """Annotate one point per a PLACE spec; returns (annotation, leader?, relpos) for check_overlaps."""
    relpos = spec[4] if len(spec) > 4 else (0.5, 0.5)
    if spec[0] == "offset":
        _, dx, dy, ha = spec[:4]
        xytext, textcoords, leader = (dx, dy), "offset points", abs(dy) > 14
    elif spec[0] == "column":
        _, d, ha = spec[:3]
        xytext, textcoords, leader = (mdates.date2num(datetime.strptime(d, "%Y-%m-%d").date()), column_y[(r["model"], r["effort"], r["mode"])]), "data", True
        relpos = (1.0, 0.5)  # leader leaves the label's right edge
    else:
        _, d, yy, ha = spec[:4]
        xytext, textcoords, leader = (mdates.date2num(datetime.strptime(d, "%Y-%m-%d").date()), yy), "data", True
    ann = ax.annotate(
        label, (x, y), xytext=xytext, textcoords=textcoords, ha=ha, va="center", fontsize=TEXT,
        color=LABEL_INK, zorder=6,
        bbox={"facecolor": SURFACE, "edgecolor": "none", "pad": 1.0},
        arrowprops=(
            {"arrowstyle": "-", "color": lab, "alpha": 0.6, "linewidth": 0.8 * PX, "shrinkA": 2,
             "shrinkB": RING_PT / 2 + 1, "relpos": relpos}
            if leader else None
        ),
    )
    return ann, leader, relpos


def config_label(r: dict) -> str:
    return f"{r['name']} ({EFFORT[r['effort']]}{'+UF' if r['mode'] == 'ultrafast' else ''})"


def highest_effort(rows: list[dict]) -> dict[str, dict]:
    """One configuration per model for the trend: the highest effort evaluated; ultrafast never stands in for an effort level."""
    best: dict[str, tuple] = {}
    for r in rows:
        rank = (EFFORT_RANK[r["effort"]], r["mode"] != "ultrafast")
        if r["model"] not in best or rank > best[r["model"]][0]:
            best[r["model"]] = (rank, r)
    return {m: r for m, (_, r) in best.items()}


def pareto_frontier(rows: list[dict], key: str, higher_is_better: bool = True, ultrafast: bool = True) -> list[dict]:
    """The 1D Pareto frontier over release date: every configuration that no configuration released on or
    before its date beats on ``key`` (ties kept), in date order. With ``ultrafast=False`` ultrafast
    configurations neither join the frontier nor block others."""
    cands = [r for r in rows if ultrafast or r["mode"] != "ultrafast"]
    sign = 1.0 if higher_is_better else -1.0
    front = [r for r in cands if all(sign * o[key] <= sign * r[key] for o in cands if o is not r and o["date"] <= r["date"])]
    return sorted(front, key=lambda r: (r["date"], -sign * r[key]))


def fit_rows(rows: list[dict], key: str, higher_is_better: bool = True) -> list[dict]:
    """Configurations the dashed line is fitted to: the Pareto frontier on ``key`` under --frontier, else the
    highest-effort configuration of each model."""
    if FRONTIER_FIT:
        return pareto_frontier(rows, key, higher_is_better, FRONTIER_ULTRAFAST)
    return list(highest_effort(rows).values())


def in_fit(r: dict, fit: list[dict]) -> bool:
    """Whether ``r`` is one of the configurations the line is fitted to under --frontier."""
    return FRONTIER_FIT and any(r is f for f in fit)


def point_alpha(r: dict, fit: list[dict]) -> float:
    """Opacity for one configuration: fully opaque when it is a frontier point under --frontier, else ALPHA."""
    return 1.0 if in_fit(r, fit) else ALPHA


def point_edge(r: dict, fit: list[dict]) -> float:
    """Ring stroke for one configuration: FIT_EDGE_SCALE times RING_EDGE for a frontier point under --frontier, else RING_EDGE."""
    return RING_EDGE * (FIT_EDGE_SCALE if in_fit(r, fit) else 1.0)


def fit_name() -> str:
    """How the fitted set is described in console output."""
    return "Pareto frontier" if FRONTIER_FIT else "highest-effort configuration per model"


def column_positions(rows: list[dict], place: dict, key: str = "mean_progress_pct", gap: float | None = None) -> dict:
    """Y positions for "column" labels: level with the marker, pushed apart in marker order to one text line, recentred on the markers."""
    gap = COLUMN_GAP if gap is None else gap
    col_rows = [r for r in rows if (place.get((r["model"], r["effort"], r["mode"])) or place[(r["model"], r["effort"])])[0] == "column"]
    col_rows.sort(key=lambda r: r[key])
    col_y = [r[key] for r in col_rows]
    for i in range(1, len(col_y)):
        col_y[i] = max(col_y[i], col_y[i - 1] + gap)
    for _ in range(3):
        shift = (np.mean([r[key] for r in col_rows]) - np.mean(col_y)) if col_rows else 0
        col_y = [v + shift for v in col_y]
        for i in range(1, len(col_y)):
            col_y[i] = max(col_y[i], col_y[i - 1] + gap)
    return {(r["model"], r["effort"], r["mode"]): y for r, y in zip(col_rows, col_y)}


def draw(fig, ax) -> tuple[list[tuple], list[tuple], list]:
    """Draw the panel into ``ax`` and return (points, annots, legends) for check_overlaps."""
    rows = load()
    if ONE_PER_MODEL:
        rows = select(rows)
    markers, gem = make_markers()
    style_axes(ax)

    points: list[tuple] = []
    annots: list[tuple] = []
    column_y = column_positions(rows, PLACE)
    fit = fit_rows(rows, "mean_progress_pct")
    for r in rows:
        dev = r["developer"]
        lab = LAB[dev]
        x = mdates.date2num(r["date"])
        y = r["mean_progress_pct"]
        alpha = point_alpha(r, fit)
        ax.errorbar(
            x, y, yerr=[[y - r["ci_low_pct"]], [r["ci_high_pct"] - y]],
            fmt="none", ecolor=lab, elinewidth=1.0, capsize=0, alpha=alpha, zorder=3,
        )
        draw_point(ax, x, y, dev, markers, gem, alpha, point_edge(r, fit))
        spec = PLACE.get((r["model"], r["effort"], r["mode"])) or PLACE[(r["model"], r["effort"])]
        label = config_label(r)
        points.append((r, x, y, label))
        ann, leader, relpos = place_label(ax, r, x, y, label, spec, column_y, lab)
        annots.append((ann, label, leader, relpos))

    # Dashed least-squares line, drawn like the site's frontier line, through one
    # configuration per model (the highest effort evaluated; ultrafast never stands in
    # for an effort level) or, under --frontier, through the running best (fit_rows).
    xb = np.array([mdates.date2num(r["date"]) for r in fit])
    yb = np.array([r["mean_progress_pct"] for r in fit])
    slope, intercept = np.polyfit(xb, yb, 1)
    xs = np.array([mdates.date2num(date(2026, 7, 1)), mdates.date2num(date(2026, 10, 7))])
    ax.plot(xs, slope * xs + intercept, color=FRONTIER, linewidth=1.5 * PX, linestyle=(0, (2, 4)),
            dash_capstyle="round", zorder=1)
    ax.trend_slope_per_month = slope * 30.44  # for captions that quote the fit
    fitted = ", ".join(f"{config_label(r)} {r['mean_progress_pct']:.1f}" for r in fit)
    print(f"trend slope through {fit_name()}: {slope * 30.44:.2f} points per month ({fitted})")

    ax.set_ylim(0, 62)
    ax.set_yticks([0, 20, 40, 60])
    ax.set_yticklabels([f"{v}%" for v in (0, 20, 40, 60)])
    ax.set_ylabel("Mean task score")
    ax.set_xlim(date(2026, 6, 24), date(2026, 11, 15))
    ax.set_xticks([date(2026, m, 1) for m in (7, 8, 9, 10)])
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    ax.set_xlabel("Model release date")

    leg = lab_legend(ax, markers)
    return points, annots, [leg]


def main() -> None:
    fig, ax = plt.subplots(figsize=(4.8, 4.5))
    points, annots, legends = draw(fig, ax)
    fig.subplots_adjust(left=0.11, right=0.985, top=0.985, bottom=0.1)
    if CHECK:
        check_overlaps(fig, ax, points, annots, legends)
    for ext in ("png", "svg", "pdf"):
        fig.savefig(f"{OUT}.{ext}", dpi=200 if ext == "png" else None)
    print("wrote", OUT.with_suffix(".png"), "| Open Sans:", HAVE_OPEN_SANS)


if __name__ == "__main__":
    main()
