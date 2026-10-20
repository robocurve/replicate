# Figure 5: subtask completion rate and API cost per subtask against model release date

Two panels on one date axis: the subtasks completed per hour of wall-clock time (top) and the
estimated API cost per subtask in dollars (bottom) achieved by each (model, configuration) pair.
Record setters, the fastest and the cheapest configurations to date, are filled with bold labels. No
trend line is drawn: each panel has only three record setters (the doubling and halving times the
paper reports, 45.6 and 20.8 days, are the fits the figure script prints but does not draw). The paper
includes `paper-figures/robodojo-release-rate-cost.png` at `\textwidth` (section 5, label
`fig:cost-and-time`).

This folder is a copy of `../figure-2/`, since one script draws both figures: see that folder's README
for the file list. The differences are this figure's `as-published/robodojo-release-rate-cost.png`
and the check in `run.sh`.

## Reproduce

```
./run.sh
```

runs, with uv and the pins in `requirements.txt`:

```
python robodojo_metr_style_robocurve_data.py
python robodojo_release_paper_figures.py --check
python verify.py paper-figures/robodojo-release-rate-cost.png as-published/robodojo-release-rate-cost.png
```

`--check` prints any label that touches a marker, bar or other label, and any text that runs off the
figure; it prints nothing for this figure.

## How the numbers are made

- Subtasks per hour (`checkpoints_per_minute` x 60 in `robocurve-charts/...-rate-title-frontier.csv`):
  a configuration's summed subtasks over its 120 trials divided by their summed wall-clock minutes. A
  trial judged at level k of its task's rubric counts k subtasks; Sort Objects' 0.33/0.34 and 0.66/0.67
  levels (the same number of objects sorted) count once (`MILESTONE_RANK` in
  `robodojo_metr_style_robocurve_cost_plot.py`). Trials that completed no subtask still add their time.
- API cost per subtask (`cost_per_checkpoint_usd` in `...-cost-title-frontier.csv`): the summed
  estimated API cost of the same trials divided by the same subtasks. Cost is estimated from the
  recorded token counters at the providers' published rates; the judge CSV's `cost_basis` says whether
  a configuration's cost comes from the published dataset or the harness's own estimate.
- Both are ratios of totals, so no intervals are drawn.
- Record setters are the 1D Pareto frontier over release date on each quantity (highest rate, lowest
  cost; ties kept): GPT-5.6 Sol (H), Gemini 3.8 Flash (H) and GPT-6 Astra (H+UF) for rate, GPT-5.6 Sol
  (H), Claude Opus 5 (M) and Gemini 3.8 Flash (H) for cost.

## Verification

Regenerated on 2026-10-20 with the pinned environment: 1650 x 1148 px, 0 pixels differ from the
paper's copy (`verify.py`).

## Notes

- The only change to the scripts from the `data-analysis` repository (`robodojo-release-date-charts/`,
  commit `aceeb47`) is where the figure script finds its fonts: `FONT_DIR`, the bundled `fonts/`
  first, then the system copy.
- On the rate panel GPT-6 Astra (XH) and (M) coincide to within 0.01 subtasks per minute and share one
  label, "GPT-6 Astra (XH, M)".
- The GPT-6 Astra (XH), GPT-6 Astra (H+UF) and Claude Opus 5.5 (XH) costs are the harness's own
  estimates (`cost_basis` = `plugin estimate`); for the ultrafast tier the estimate applies a
  multiplier that was not checked against the provider's price sheet at the time.
- Claude Opus 5 (M) was withdrawn from robocurve.org on 2026-10-06 (a rig configuration error) but is
  in the figure, and is a cost record setter, as in the paper.

## Licence

Code: MIT (the repository's `LICENSE`). Data and figures, including the as-published copy: CC BY 4.0
(`LICENSE-CC-BY-4.0` at the repository root). Fonts: SIL OFL 1.1 (`fonts/LICENSE`). The lab logo paths
in `robocurve-style/icons.json` are trademarks of their owners and are not covered; the figure does not
draw them.
