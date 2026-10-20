# Figure 2: mean task score against model release date

The mean task score achieved by each (model, configuration) pair against the model's release date,
with the 95% bootstrap interval of each score; record-setting pairs (the pairs that outscored every
pair released on or before their date) are filled with bold labels, and the dashed line is the
least-squares exponential fit through them, whose doubling time of 44.5 days the paper quotes. The
paper includes `paper-figures/robodojo-release-score.png` at `0.9\textwidth` (section 4, label
`fig:metr-plot`).

## Files

| file | what |
|---|---|
| `robodojo-metr-style-data-judge.csv` | input: one row per configuration: release date, mean task score over 120 trials with its 95% bootstrap interval, per-task means, mean minutes and estimated cost per trial |
| `robodojo-milestone-mix.json` | input: judge level counts per configuration and task, plus the rubrics; the data script needs it for the cost and rate CSVs, the score figure itself uses only the CSV |
| `robodojo_metr_style_robocurve_data.py` | stage 1: writes the four CSVs in `robocurve-charts/` from the two inputs, through the loaders of the chart modules below |
| `robodojo_metr_style_robocurve_plot.py`, `..._plot_title.py`, `..._cost_plot.py`, `..._rate_plot.py` | the robocurve.org chart modules that the data script and the figure script import: data loading, the record-setter selection, label placement and the overlap check. Their own website-style charts are not drawn here |
| `robocurve-charts/*.csv` | stage 1 output: the plotted values, one row per configuration, with `in_fit` marking the record setters; `...-frontier-fits.csv` describes each chart's fitted line |
| `robodojo_release_paper_figures.py` | stage 2: draws this figure, and Figure 5's rate-and-cost figure, from the CSVs into `paper-figures/` |
| `paper-figures/` | output: `robodojo-release-score.{png,pdf}` (this figure), `robodojo-release-rate-cost.{png,pdf}` (Figure 5) and `robodojo-release-figures.tex`, the LaTeX figure environments with generated captions and a record-setter table |
| `robocurve-style/icons.json`, `robocurve-mark-v2.svg` | the lab icon paths and colours the chart module loads at import; the icons are drawn only under `--icons`, which the paper does not use |
| `fonts/` | Liberation Sans (SIL OFL 1.1, licence included), the figure's typeface |
| `as-published/robodojo-release-score.png` | the figure as embedded in the paper |
| `verify.py` | pixel comparison of a regenerated PNG with the as-published one |
| `run.sh`, `requirements.txt` | regenerate and verify; the pinned environment |

## Reproduce

```
./run.sh
```

runs, with uv and the pins in `requirements.txt`:

```
python robodojo_metr_style_robocurve_data.py
python robodojo_release_paper_figures.py --check
python verify.py paper-figures/robodojo-release-score.png as-published/robodojo-release-score.png
```

`--check` prints any label that touches a marker, bar or other label, and any text that runs off the
figure; it prints nothing for this figure. The figure script prints the fitted doubling time (44.5
days over 5 record setters) and each metric's first and latest record.

## How the numbers are made

- Mean task score is the `mean_progress_pct` column of the judge CSV: the mean over 6 tasks x 20
  trials of the rubric score the GPT-6 Astra (H) judge awarded; `ci_low_pct` and `ci_high_pct` are its
  95% bootstrap interval.
- Record setters are `pareto_frontier()` in `robodojo_metr_style_robocurve_plot.py`: every
  configuration that no configuration released on or before its date beats (ties kept; ultrafast
  serving eligible). There are five: GPT-5.6 Sol (H), Claude Opus 5 (M), Gemini 3.8 Flash (H), GPT-6
  Astra (H+UF) and Claude Opus 5.5 (XH).
- The trend is a least-squares fit of log2(score) on release date over the record setters, drawn from
  2026-07-01 to 2026-10-07; the doubling time is 1/slope in days.

## Verification

Regenerated on 2026-10-20 with the pinned environment: 1650 x 641 px, 0 pixels differ from the
paper's copy (`verify.py`).

## Notes

- The only change to the scripts from the `data-analysis` repository (`robodojo-release-date-charts/`,
  commit `aceeb47`) is where the figure script finds its fonts: `FONT_DIR`, the bundled `fonts/`
  first, then the system copy.
- Label positions are hand-tuned for this figure's size. The script's `--width`, `--height`,
  `--font=serif` and `--icons` options draw variants that are not in the paper.
- Claude Opus 5 (M) was withdrawn from robocurve.org on 2026-10-06 (a rig configuration error pinned
  the wrist during its trials) but is in the figure and the fit, as in the paper; without it the
  doubling time is 42 days.

## Licence

Code: MIT (the repository's `LICENSE`). Data and figures, including the as-published copy: CC BY 4.0
(`LICENSE-CC-BY-4.0` at the repository root). Fonts: SIL OFL 1.1 (`fonts/LICENSE`). The lab logo paths
in `robocurve-style/icons.json` are trademarks of their owners and are not covered; the figure does not
draw them.
