# The Bitter Lesson Comes to Robotics: figure replicates

Data and code to regenerate every plot in *The Bitter Lesson Comes to Robotics* (Christopher Leet,
Achyutha Menon, Sravanthi Machcha, Sven Koenig, Tzu Kit Chan and Jay Chooi; the TAG@CoRL submission
`Bitter_Lesson_CoRL_TAG-9.pdf`, built 2026-10-18). One folder per plot. Figures 1 and 4 are camera
photographs (the six task scenes, and a pen lid being launched out of reach), not plots, so they have
no folder.

| Figure | Folder | What it shows | Regenerated file |
|---|---|---|---|
| 2 | `figure-2/` | mean task score of each (model, configuration) pair against model release date, with 95% bootstrap intervals, record setters and the fitted trend (doubling time 44.5 days) | `paper-figures/robodojo-release-score.png` |
| 3 | `figure-3/` | survival curves: the share of trials completing each subtask, one panel per task, one curve per model (its top-scoring configuration) | `paper-figures/robodojo-survival-curves-models.png` |
| 5 | `figure-5/` | subtask completion rate (top) and API cost per subtask (bottom) against release date, with record setters | `paper-figures/robodojo-release-rate-cost.png` |
| 6 | `figure-6/` | the 3D Pareto frontier over cost per subtask, subtasks per hour and mean task score, all on log axes | `paper-figures/robodojo-3d-frontier.png` |

Each folder is self-contained: the input data, the scripts, the Liberation Sans fonts the figures are
set in, the figure as it appears in the paper (`as-published/`), a `verify.py` that compares a
regenerated PNG with it pixel for pixel, and a `run.sh` that regenerates and verifies. The paper embeds
the figures as 300 dpi PNGs (`\includegraphics` of the PNG at `\textwidth` or `0.9\textwidth`), so the
PNG is the artefact that matters; the scripts also write a vector PDF and a LaTeX figure environment
with a generated caption.

## Reproduce

Each `run.sh` needs [uv](https://docs.astral.sh/uv/), which builds the pinned environment in that
folder's `requirements.txt` (Python 3.12, matplotlib 3.11.2, numpy 2.5.4, pillow 13.0.0; figures 2 and
5 also use svgpath2mpl 1.0.0) on first use. Without uv, make a Python 3.12 virtualenv, `pip install -r
requirements.txt`, and run the commands listed in `run.sh` with its python.

```
for f in figure-2 figure-3 figure-5 figure-6; do ./$f/run.sh; done
```

## Verification

On 2026-10-20, on the machine the paper's figures were made on, every `run.sh` regenerated its figure
identical to the paper's copy (`verify.py` reports 0 differing pixels):

| Figure | Pixels | Result |
|---|---|---|
| 2 | 1650 x 641 | identical |
| 3 | 1650 x 1503 | identical |
| 5 | 1650 x 1148 | identical |
| 6 | 1650 x 969 | identical |

Pixel identity depends on the pinned matplotlib (its bundled FreeType rasteriser) and the bundled
fonts; another matplotlib may differ by a few anti-aliased pixels while drawing the same figure.

## Data

Two files, shared by all four figures and identical in each folder:

- `robodojo-metr-style-data-judge.csv`: one row per (model, configuration) pair: release date,
  reasoning effort and serving mode, mean task score over the 120 trials (20 per task) with its 95%
  bootstrap interval, the per-task mean scores, mean wall-clock minutes per trial, mean estimated API
  cost per trial (`cost_basis` says whether it comes from the published dataset or the harness's own
  estimate), and timing statistics.
- `robodojo-milestone-mix.json`: the six task rubrics and, for every (configuration, task, rubric
  level), how many of the 20 trials the GPT-6 Astra (H) judge scored at that level (444 rows).

Both were copied from the inspect-robots `reports/` folder (committed there on 2026-10-13, commit
`ca7c496` on branch `arch-touchup`) through the `data-analysis` repository. The per-trial logs,
transcripts and token counters they summarise are not included. Figures 2 and 5 are drawn from four
derived CSVs (`robocurve-charts/`) that the folder's data script rebuilds from these two files.

## Provenance of the code

The scripts are those of the `data-analysis` repository's `robodojo-release-date-charts/`,
`survival-curves/` and `robodojo-3d-pareto-frontier/` folders (commit `aceeb47`, 2026-10-20), with two
changes:

- each figure script loads Liberation Sans from the folder's `fonts/` directory, falling back to the
  system copy, instead of only from `/usr/share/fonts/truetype/liberation`;
- `figure-6/robodojo_3d_plot.py` is the version of 2026-10-18 10:17 UTC that rendered the paper's
  copy. The `data-analysis` copy was edited later that morning (30% larger type, two-line cost and
  score axis titles, moved labels) and draws a slightly different figure; `figure-6/README.md` lists
  the differences.

The as-published PNGs are the files in the paper's LaTeX source (`figures/`), as exported from Overleaf
on 2026-10-18; they are byte-for-byte the images embedded in `Bitter_Lesson_CoRL_TAG-9.pdf`.

## Caveats carried over from the analysis

- Claude Opus 5 (M) was withdrawn from robocurve.org on 2026-10-06 (a rig configuration error pinned
  the wrist during its trials) but is in every figure, as it was in the paper.
- The GPT-6 Astra (XH), GPT-6 Astra (H+UF) and Claude Opus 5.5 (XH) costs are the harness's own
  estimates from token counters (`cost_basis` = `plugin estimate`); the other nine come from the
  published dataset.

## Licence

Code (the scripts, `run.sh` and `verify.py`): MIT, the repository's `LICENSE`. Data and figures (the
CSV and JSON inputs, the derived CSVs, and the PNG, PDF and `.tex` outputs, including the as-published
copies): Creative Commons Attribution 4.0, `LICENSE-CC-BY-4.0` at the repository root. Fonts: SIL Open
Font License 1.1, `fonts/LICENSE` in each folder. The lab logo paths in `robocurve-style/icons.json`
(figures 2 and 5) are trademarks of their owners and are not covered by these licences; the paper
figures do not draw them.
