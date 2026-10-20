# Figure 6: cost, speed and score Pareto frontier (3D)

The twelve (model, configuration) pairs placed by API cost per subtask (USD), subtask completion rate
(subtasks per hour) and mean task score (%), all on log axes, each with a drop line to the floor. The
blue surface is the Pareto frontier: at each cost and rate, the best score of any pair at most that
costly and at least that fast. Filled markers are the nine Pareto-optimal pairs, hollow markers the
three dominated ones. The paper includes `paper-figures/robodojo-3d-frontier.png` at `0.9\textwidth`
(section 5, label `fig:robodojo-pareto-frontier`).

## Files

| file | what |
|---|---|
| `robodojo-metr-style-data-judge.csv` | input: one row per configuration: mean task score, mean minutes per trial, mean estimated cost per trial and its basis, release date |
| `robodojo-milestone-mix.json` | input: judge level counts per configuration and task, from which subtasks are credited, plus the rubrics |
| `robodojo_3d_plot.py` | the figure script, in the version that rendered the paper's copy (see Notes); `--paper` draws this figure |
| `robodojo_3d_data.py` | writes `robodojo-3d-cost-time-score-per-milestone.csv` with the figure script's own loaders and dominance test |
| `robodojo-3d-cost-time-score-per-milestone.csv` | the plotted values, one row per configuration: minutes per subtask, subtasks per hour, cost per subtask, score, and `on_frontier` |
| `paper-figures/` | output: `robodojo-3d-frontier.{png,pdf}` and `.tex`, the LaTeX figure environment with a generated caption |
| `fonts/` | Liberation Sans (SIL OFL 1.1, licence included), the figure's typeface |
| `as-published/robodojo-3d-frontier.png` | the figure as embedded in the paper |
| `verify.py` | pixel comparison of a regenerated PNG with the as-published one |
| `run.sh`, `requirements.txt` | regenerate and verify; the pinned environment |

## Reproduce

```
./run.sh
```

runs, with uv and the pins in `requirements.txt`:

```
python robodojo_3d_plot.py --paper
python robodojo_3d_data.py
python verify.py paper-figures/robodojo-3d-frontier.png as-published/robodojo-3d-frontier.png
```

The figure script scales its 12 in layout down until the figure, cropped to its content, is 5.5 in
wide, and prints the result: `5.50 x 3.23 in, layout scale 0.461, Liberation Sans`.

## How the figure is made

- Score is `mean_progress_pct` from the judge CSV. Subtasks per hour and cost per subtask are ratios of
  totals, as in Figure 5: a configuration's summed subtasks over its 120 trials (a trial judged at level
  k of its task's rubric counts k subtasks, Sort Objects' paired levels once; `MILESTONE_RANK`) divided
  into its summed minutes (then inverted to a rate) and its summed estimated cost.
- A pair is dominated when another pair is at least as good on all three axes and better on at least
  one (`dominated()`); the nine others are Pareto-optimal and drawn filled.
- The surface is evaluated on a 160 x 160 grid over log cost and log rate: at each grid point, the best
  score of any pair at most that costly and at least that fast; it is blank where no pair qualifies.
- The view is elevation 12, azimuth -142 (`--elev`, `--azim`), and the labels sit in hand-placed blocks
  (`BLOCKS_LAYOUT_PAPER`) with leaders to their markers.

## Verification

Regenerated on 2026-10-20 with the pinned environment: 1650 x 969 px, 0 pixels differ from the paper's
copy (`verify.py`).

## Notes

- `robodojo_3d_plot.py` here is the version of 2026-10-18 10:17 UTC that rendered the paper's copy.
  It was reconstructed from the `data-analysis` copy (`robodojo-3d-pareto-frontier/`, commit `aceeb47`)
  by reverting the three edits made between 10:44 and 10:46 UTC that morning, after the figure had
  been taken for the paper:
  - the type was made 30% larger (`PAPER_TEXT = 1.3`); the paper's copy has 8 pt axis type and 7 pt
    labels and legend, so its layout scales to 0.461 rather than 0.436 and the figure is 3.23 in tall
    rather than 3.15;
  - the cost and score axis titles were split over two lines; the paper's copy has "API cost per
    subtask (USD, log space)" and "Mean task score (%, log space)" on one line each, with only the rate
    title on two;
  - the label blocks for Claude Opus 5 (M), GPT-6 Sol (H), GPT-5.6 Sol (H), the GPT-6.1 Sol (H) and
    GPT-6 Astra (M) pair and the two extra-high configurations were moved, and the cost title given
    10 pt more pad.
  The docstring lines documenting `--paper`, added at 10:19 UTC, are kept; they do not affect the
  output. The `data-analysis` script now draws the later version (5.52 x 3.15 in).
- The other change from the `data-analysis` copy is where the script finds its fonts: `FONT_DIR`, the
  bundled `fonts/` first, then the system copy.
- The script's other layouts (`--frontier --layout blocks`, `--per-trial`, `--x date`, `--sweep`,
  `--show`) and the `--font serif` and `--crosses` variants of the paper figure are not in the paper.
- The GPT-6 Astra (XH), GPT-6 Astra (H+UF) and Claude Opus 5.5 (XH) costs are the harness's own
  estimates (`cost_basis` = `plugin estimate`); for the ultrafast tier the estimate applies a
  multiplier that was not checked against the provider's price sheet at the time.
- Claude Opus 5 (M) was withdrawn from robocurve.org on 2026-10-06 (a rig configuration error pinned
  the wrist during its trials) but is in the figure, as in the paper.
- No intervals are drawn: cost and rate are ratios of totals, and the score's bootstrap interval in the
  judge CSV is not shown in 3D.

## Licence

Code: MIT (the repository's `LICENSE`). Data and figures, including the as-published copy: CC BY 4.0
(`LICENSE-CC-BY-4.0` at the repository root). Fonts: SIL OFL 1.1 (`fonts/LICENSE`).
