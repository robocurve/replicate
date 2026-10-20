"""The robocurve-style METR panel with the site's trends-panel copy around it.

Same panel as ``robodojo_metr_style_robocurve_plot.py`` (imported and drawn by its
``draw``), framed the way robocurve.org frames its trend charts: a display-face
title and a body line above (``.rc-trends-title`` / ``.rc-trends-body``), a
hairline rule, the chart, a muted caption below (``.rc-chart-cap``), and the share-card
footer used on robocurve.org figures: the Robocurve mark and wordmark at the left,
"CC BY 4.0 | robocurve.org" at the right, in the site's muted neutral-500. Site
sizes (20px title, 14px body, 12px caption, 16px gaps) are converted at the
panel's 8pt-for-12px scale. The title uses the site's Imagin bold expanded face
when ``reports/robocurve-style/imagin-bold-expanded.ttf`` is present (its
-0.07em letter-spacing is not reproduced; matplotlib has no tracking), else
Open Sans SemiBold. Writes robodojo-metr-style-judge-square-robocurve-title.*
(PNG, SVG, PDF); under ``--frontier`` the PNG goes to reports/robocurve-charts/ instead,
the folder that collects the three frontier charts and their CSVs. ``--check``, ``--one-per-model``, ``--frontier`` and ``--frontier-no-ultrafast`` pass through
to the panel (``--frontier`` fits the running best, draws those points solid, swaps the body
sentence and writes ...-title-frontier.*); ``--text-scale`` (default 1.1) and ``--width``
(inches, default 5.28) set the type size and figure width.
Run with: uv run --with matplotlib --with pillow --with svgpath2mpl python
reports/robodojo_metr_style_robocurve_plot_title.py
"""

from __future__ import annotations

import sys
import textwrap
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import matplotlib.pyplot as plt  # noqa: E402
from matplotlib import font_manager  # noqa: E402
from matplotlib.lines import Line2D  # noqa: E402
from matplotlib.patches import PathPatch  # noqa: E402
from matplotlib.path import Path as MPath  # noqa: E402
from matplotlib.transforms import Affine2D  # noqa: E402
from svgpath2mpl import parse_path  # noqa: E402
import re  # noqa: E402

import robodojo_metr_style_robocurve_plot as base  # noqa: E402  (registers Open Sans, sets rcParams)

TITLE = "LLM Robotics Capabilities vs Release Date"
BODY = (
    "Mean score on RoboDojo-RC Tier 1 against each model’s public release date; "
    "the line shows a least squares fit on the top performing configuration of each model."
)
BODY_FRONTIER = (
    "Mean score on RoboDojo-RC Tier 1 against each model’s public release date; "
    "line fit to all historical state-of-the-art models (indicated by thicker borders)."
)
CAPTION = (
    "Mean score over 120 task attempts per configuration, by public release date. "
    "Error bars show 95% bootstrapped confidence intervals."
)
OUT = HERE / f"robodojo-metr-style-judge-square-robocurve-title{base.SUFFIX}"

PX = base.PX  # pt per site pixel


def _opt(name: str, default: str) -> str:
    return next((a.split("=", 1)[1] for a in sys.argv if a.startswith(name + "=")), default)


TEXT_SCALE = float(_opt("--text-scale", "1.1"))  # all text 10% larger than the bare panel
base.set_text_scale(TEXT_SCALE)
TITLE_PT, BODY_PT, CAP_PT = 20 * PX * TEXT_SCALE, 14 * PX * TEXT_SCALE, 12 * PX * TEXT_SCALE
TITLE_LH, BODY_LH, CAP_LH = 1.2, 1.4, 1.5  # --leading-snug, .rc-trends-body, --leading-normal (CSS line-height)
MPL_LH = 1.2  # matplotlib's linespacing=1 is already about this much of the font size, so CSS values are divided by it
GAP_COPY, GAP_PANEL, GAP_CAP = 8 * PX, 16 * PX, 8 * PX  # .rc-trends-copy gap, panel gap, caption margin
RULE = (0.106, 0.082, 0.059, 0.12)  # .rc-trends-rule rgba(27,21,15,.12)
CAP_INK = (0.106, 0.082, 0.059, 0.60)  # .rc-chart-cap #1b150f99
FOOT_INK = "#857a68"  # --neutral-500: footer mark, wordmark and licence line
WORDMARK_PT, FOOT_PT = 17 * PX * TEXT_SCALE, 13 * PX * TEXT_SCALE  # wordmark in the display face; licence line in Open Sans
GAP_FOOT = 5.4  # pt; with the footer line box this measures about 3 mm from caption glyphs to footer glyphs
MARK_H_PT = 12 * PX * TEXT_SCALE  # height of the ascending-step mark, scaled with the wordmark
WIDTH_IN = float(_opt("--width", "5.28"))  # 10% wider than the bare 4.8in panel; the axes widen with it
PANEL_IN = 4.5  # the square panel's figure height; its axes keep the same margins
LEFT = 0.045  # text and rule start, aligned with the panel's tick labels
RIGHT = 0.985

_display = next((HERE / "robocurve-style" / f for f in ("imagin-bold-expanded.ttf", "imagin-bold.ttf") if (HERE / "robocurve-style" / f).exists()), None)
TITLE_FONT = font_manager.FontProperties(fname=str(_display), size=TITLE_PT) if _display else font_manager.FontProperties(family="Open Sans", weight="semibold", size=TITLE_PT)
_wm = HERE / "robocurve-style" / "imagin-regular.ttf"
WORDMARK_FONT = font_manager.FontProperties(fname=str(_wm), size=WORDMARK_PT) if _wm.exists() else font_manager.FontProperties(family="Open Sans", size=WORDMARK_PT)


def mark_path() -> MPath:
    """The Robocurve ascending-step mark (assets/logo/robocurve-mark-v2.svg) as one y-up path with its origin at the lower left, 1 unit tall."""
    svg = (HERE / "robocurve-style" / "robocurve-mark-v2.svg").read_text()
    paths = [parse_path(d) for d in re.findall(r'<path d="([^"]+)"', svg)]
    path = MPath.make_compound_path(*paths).transformed(Affine2D().scale(1, -1))
    (x0, y0), (x1, y1) = path.get_extents().min, path.get_extents().max
    return path.transformed(Affine2D().translate(-x0, -y0).scale(1 / (y1 - y0)))


def frame(draw_fn, title: str, body: str, caption: str, out: Path) -> None:
    """Draw ``draw_fn(fig, ax)`` inside the site's trends-panel frame (title, body, rule, chart, caption, footer) and save PNG/SVG/PDF."""
    wrap_scale = (WIDTH_IN / 4.8) / TEXT_SCALE  # characters per line scale with width and inversely with type size
    # Explicit newlines in the title are kept; anything longer than the width (about 42 display-face
    # characters at the default size) wraps greedily.
    title_lines = [ln for part in title.split("\n") for ln in textwrap.wrap(part, round(42 * wrap_scale))]
    body_lines = textwrap.wrap(body, round(66 * wrap_scale))
    cap_lines = textwrap.wrap(caption, round(78 * wrap_scale))
    # Vertical layout in inches, top to bottom.
    pad = 16 * PX / 72
    h_title = len(title_lines) * TITLE_PT * TITLE_LH / 72
    h_body = len(body_lines) * BODY_PT * BODY_LH / 72
    h_cap = len(cap_lines) * CAP_PT * CAP_LH / 72
    h_foot = WORDMARK_PT * 1.2 / 72
    top_block = pad + h_title + GAP_COPY / 72 + h_body + GAP_PANEL / 72  # down to the rule
    panel_top = top_block + GAP_PANEL / 72
    bottom_block = GAP_CAP / 72 + h_cap + GAP_FOOT / 72 + h_foot + pad
    H = panel_top + PANEL_IN + bottom_block
    fig = plt.figure(figsize=(WIDTH_IN, H))
    # Axes with the square panel's own margins (left 0.11, right 0.985, top 0.985, bottom 0.1 of 4.5in).
    ax = fig.add_axes([0.11, (bottom_block + 0.1 * PANEL_IN) / H, RIGHT - 0.11, 0.885 * PANEL_IN / H])
    points, annots, legends = draw_fn(fig, ax)

    y = 1 - pad / H
    fig.text(LEFT, y, "\n".join(title_lines), fontproperties=TITLE_FONT, color=base.INK, ha="left", va="top", linespacing=TITLE_LH / MPL_LH)
    y -= (h_title + GAP_COPY / 72) / H
    fig.text(LEFT, y, "\n".join(body_lines), fontsize=BODY_PT, color=base.INK, ha="left", va="top", linespacing=BODY_LH / MPL_LH)
    y_rule = 1 - top_block / H
    fig.add_artist(Line2D([LEFT, RIGHT], [y_rule, y_rule], transform=fig.transFigure, color=RULE, linewidth=0.5 * PX, solid_capstyle="butt"))
    fig.text(LEFT, (pad + h_foot + GAP_FOOT / 72 + h_cap) / H, "\n".join(cap_lines), fontsize=CAP_PT, color=CAP_INK, ha="left", va="top", linespacing=CAP_LH / MPL_LH)

    # Footer: mark + wordmark at the left, "CC BY 4.0 | robocurve.org" at the right, vertically centred on one line.
    y_foot_in = pad + h_foot / 2  # inches from the bottom
    mark_h_in = MARK_H_PT / 72
    mark = mark_path()
    mark_w_in = mark_h_in * mark.get_extents().width
    fig.add_artist(PathPatch(mark, facecolor=FOOT_INK, edgecolor="none",
                             transform=Affine2D().scale(mark_h_in).translate(LEFT * WIDTH_IN, y_foot_in - mark_h_in / 2) + fig.dpi_scale_trans))
    fig.text((LEFT * WIDTH_IN + mark_w_in + 7 * PX / 72) / WIDTH_IN, y_foot_in / H, "Robocurve", fontproperties=WORDMARK_FONT, color=FOOT_INK, ha="left", va="center")
    site = fig.text(RIGHT, y_foot_in / H, "robocurve.org", fontsize=FOOT_PT, color=FOOT_INK, ha="right", va="center")
    fig.canvas.draw()
    site_w_in = site.get_window_extent(fig.canvas.get_renderer()).width / fig.dpi
    gap_in = 0.7 * FOOT_PT / 72
    x_bar = RIGHT - (site_w_in + gap_in) / WIDTH_IN
    bar_h = 1.25 * FOOT_PT / 72 / H
    fig.add_artist(Line2D([x_bar, x_bar], [y_foot_in / H - bar_h / 2, y_foot_in / H + bar_h / 2], transform=fig.transFigure, color=(0.106, 0.082, 0.059, 0.25), linewidth=0.75 * PX))
    fig.text(x_bar - gap_in / WIDTH_IN, y_foot_in / H, "CC BY 4.0", fontsize=FOOT_PT, color=FOOT_INK, ha="right", va="center")

    if base.CHECK:
        base.check_overlaps(fig, ax, points, annots, legends)
    png = (base.CHARTS / out.name if base.FRONTIER_FIT else out).with_suffix(".png")  # frontier PNGs are collected in one folder
    png.parent.mkdir(exist_ok=True)
    fig.savefig(png, dpi=200)
    for ext in ("svg", "pdf"):
        fig.savefig(f"{out}.{ext}")
    print("wrote", png, f"| figure {WIDTH_IN} x {H:.2f} in | title face:", _display.name if _display else "Open Sans SemiBold")


def main() -> None:
    frame(base.draw, TITLE, BODY_FRONTIER if base.FRONTIER_FIT else BODY, CAPTION, OUT)


if __name__ == "__main__":
    main()
