# Figure 3: survival curves

How far through each task's rubric the trials got: one panel per task, one curve per model (its
top-scoring configuration), showing the percentage of the model's 20 trials whose judge score reached
at least each subtask, so every curve starts at 100% and can only fall. The x axes list each task's
subtasks with their scores. The paper includes `paper-figures/robodojo-survival-curves-models.png` at
`\textwidth` (section 4, label `fig:robodojo-survival-curves-models`).

## Files

| file | what |
|---|---|
| `robodojo-milestone-mix.json` | input: for every (configuration, task, rubric level), the number of the 20 trials the GPT-6 Astra (H) judge scored at that level (444 rows), plus the six rubrics |
| `robodojo_survival_plot.py` | the figure script; `--paper --one-per-model --suffix models` draws this figure |
| `paper-figures/` | output: `robodojo-survival-curves-models.{png,pdf}` and `.tex`, the LaTeX figure environment with a generated caption |
| `fonts/` | Liberation Sans (SIL OFL 1.1, licence included), the figure's typeface |
| `as-published/robodojo-survival-curves-models.png` | the figure as embedded in the paper |
| `verify.py` | pixel comparison of a regenerated PNG with the as-published one |
| `run.sh`, `requirements.txt` | regenerate and verify; the pinned environment |

## Reproduce

```
./run.sh
```

runs, with uv and the pins in `requirements.txt`:

```
python robodojo_survival_plot.py --paper --check --one-per-model --suffix models
python verify.py paper-figures/robodojo-survival-curves-models.png as-published/robodojo-survival-curves-models.png
```

`--check` prints any x tick labels that overlap, a legend that touches a panel title, or content that
runs off the figure; it prints nothing for this figure. The script then prints the mean task score per
task of each configuration drawn, in legend order.

## How the curves are made

- A trial completes a subtask when its judge level is at least that subtask's score (`survival()`).
  Subtasks are the rubric's non-zero levels; Sort Objects' 0.33/0.34 and 0.66/0.67 levels (the same
  number of objects sorted, in different baskets) are folded into one subtask each (`MERGED`). The
  script checks its hard-coded subtask list against the rubrics in the data and stops if they differ.
- `--one-per-model` keeps each model's highest-effort configuration, with GPT-6 Astra pinned to high
  effort in ultrafast mode, its top-scoring configuration (`ONE_PER_MODEL_PIN`). The legend lists the
  models by mean task score over the six tasks, best first.
- Curves are offset sideways by a small fixed amount per configuration so that curves sharing a value
  stay visible (`--no-jitter` draws them exactly on the ticks).
- Colour identifies the model and marker shape the reasoning effort (circle medium, square high,
  triangle extra-high, diamond ultrafast).

## Verification

Regenerated on 2026-10-20 with the pinned environment: 1650 x 1503 px, 0 pixels differ from the
paper's copy (`verify.py`).

## Notes

- The only change to the script from the `data-analysis` repository (`survival-curves/`, commit
  `aceeb47`) is where it finds its fonts: `FONT_DIR`, the bundled `fonts/` first, then the system copy.
- The script also draws all twelve configurations (`--paper` alone) or the nine Pareto-optimal ones
  (`--configs ... --suffix frontier`), and without `--paper` the earlier website-style render; none of
  these is in the paper.
- The GPT-6 Sol (H) and GPT-5.6 Sol (H) Stand Up Bottles cells are the 2026-09-28/29 reruns of those
  trials, not the 2026-09-23 originals.
- Claude Opus 5 (M) was withdrawn from robocurve.org on 2026-10-06 (a rig configuration error pinned
  the wrist during its trials) but is in the figure, as in the paper.

## Licence

Code: MIT (the repository's `LICENSE`). Data and figures, including the as-published copy: CC BY 4.0
(`LICENSE-CC-BY-4.0` at the repository root). Fonts: SIL OFL 1.1 (`fonts/LICENSE`).
