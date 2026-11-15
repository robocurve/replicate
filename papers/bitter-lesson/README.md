# The Bitter Lesson Comes to Robotics: figure replicates

Data and code to regenerate every plot in *The Bitter Lesson Comes to Robotics* (Christopher Leet, Achyutha
Menon, Sravanthi Machcha, Sven Koenig, Tzu Kit Chan and Jay Chooi). This folder is the current version of the
paper, the one that will become the camera-ready; `CoRL-TAG-submission-snapshot/` is the version submitted to the
TAG workshop at CoRL 2026 (18 October 2026), frozen with its own data, scripts and a pixel check against the
figures embedded in the submitted PDF. Figures 1 and 4 are camera photographs (the six task scenes, and a pen lid
being launched out of reach), not plots, so they have no folder.

| Figure | Folder | What it shows | Regenerated file |
|---|---|---|---|
| 2 | `figure-2/` | mean task score of each (model, configuration) pair against model release date, with 95% bootstrap intervals, record setters and the fitted trend | `paper-figures/robodojo-release-score.png` |
| 3 | `figure-3/` | survival curves: the share of trials completing each subtask, one panel per task, one curve per model (its top-scoring configuration) | `paper-figures/robodojo-survival-curves-models.png` |
| 5 | `figure-5/` | subtask completion rate (top) and API cost per subtask (bottom) against release date, with record setters | `paper-figures/robodojo-release-rate-cost.png` |
| 6 | `figure-6/` | the 3D Pareto frontier over cost per subtask, subtasks per hour and mean task score, all on log axes | `paper-figures/robodojo-3d-frontier.png` |

## What changed since the submission

The submission evaluated 12 (model, configuration) pairs released between 9 July and 29 September 2026. The
current version adds the three pairs evaluated on the same rigs, tasks, harness and judge after the submission
data was frozen on 13 October.

| Configuration | Released | Mean score (95% interval) | Complete | Cost per attempt | Minutes per attempt | Trials |
|---|---|---|---|---|---|---|
| Gemini 3.6 Flash (H) | 2026-07-21 | 19.6% (15.6 to 23.7) | 4 / 120 | $0.88 (harness estimate) | 3.91 | 20 per task, run 15 and 16 October |
| GPT-6.1 Sol (H+UF) | 2026-09-29 | 39.8% (36.3 to 43.3) | 20 / 120 | $6.02 (harness estimate) | 2.26 | 20 per task, run 12 to 20 October |
| Gemini 4 Argon (H+PR) | 2026-10-13 | 48.4% (43.4 to 53.2) | 22 / 120 | $2.34 (robocurve.org, Priority-tier prices) | 20.49 | the 120 attempts published on robocurve.org |

Labels follow the paper: M/H/XH is the reasoning effort, UF is OpenAI's ultrafast service tier (the Sol 6.1 cohort's
wire captures show every request sent with `service_tier: ultrafast`), and PR is Google's Priority tier, which the
Argon cohort ran on at launch prices ($3.60 / $0.18 / $18.00 per million input, cached and output tokens).

A fourth cohort, 120 Gemini 3.7 Flash (H) runs from 14 to 16 October, is left out: Google's internal documentation
says requests to Gemini 3.7 Flash were being served by Gemini 3.8 Flash at the time, so the runs measure nothing about
3.7. They are not in `data/`.

- **Figure 2.** The record-setter frontier gains two points: Gemini 3.6 Flash (21 July, 19.6%) and Gemini 4 Argon
  (13 October, 48.4%, 0.13 points above Claude Opus 5.5 (XH)). The fitted doubling time moves from 44.5 to 53.9
  days, with the 95% bootstrap interval 36.1 to 59.5 days (the submission's 35.0 to 50.8) and a leave-one-out range
  of 44.3 to 61.1 days (the submission's 40.3 to 53.6). The interval is wide because the Argon record is a 0.13-point
  margin: in resamples where Opus 5.5 (XH) stays ahead, the frontier ends on 22 September and the fit is steeper.
  `data/doubling-time.json` holds the numbers; `doubling_time.py CoRL-TAG-submission-snapshot/figure-2` reproduces the
  submission's 44.5 / 35.0 to 50.8 / 40.3 to 53.6.
- **Figure 3.** Two more curves (nine models). GPT-6.1 Sol keeps its fast-tier configuration, which outscores the
  ultrafast one.
- **Figure 5.** Gemini 3.6 Flash sets both the cost record ($0.95 per subtask) and the rate record (14.3 subtasks per
  hour) on its release date, so the cost panel keeps three record setters and the rate panel has four. The first and
  latest records, and so the table, are unchanged: $2.36 to $0.38 per subtask and 12.4 to 54.4 subtasks per hour.
  GPT-6.1 Sol (H+UF) is the second fastest configuration (49.0 per hour) at $3.27 per subtask; Gemini 4 Argon is the
  slowest (7.1 per hour, 20 minutes per attempt), so the rate axis floor drops from 8 to 6.
- **Figure 6.** Gemini 4 Argon and GPT-6.1 Sol (H+UF) are Pareto-optimal; Gemini 3.6 Flash is dominated by Gemini
  3.8 Flash. Eleven of 15 configurations are on the surface (the submission's nine plus the two); the dominated four
  are Gemini 3.6 Flash and the submission's Claude Opus 5 (M), GPT-5.6 Sol (H) and GPT-6 Sol (H).

Figures 2 and 5 are drawn 2.6 in tall (`--height=2.6`; the submission's are 2.1 in) to fit the extra labels; the
right-hand label column moves past the Argon marker and the near-coincident pair Claude Opus 5.5 (H)/(M) shares a
label. The generated `.tex` captions and the record table are in `figure-2/paper-figures/robodojo-release-figures.tex`.

## Reproduce

```
./run.sh
```

needs [uv](https://docs.astral.sh/uv/). It rebuilds the data files from the snapshot's and `data/new-cohorts-runs.json`
(`build_data.py`), recomputes the doubling-time statistics (`doubling_time.py`), and runs each figure folder's
`run.sh`, which builds that folder's pinned environment (Python 3.12, matplotlib 3.11.2, numpy 2.5.4, pillow 13.0.0;
figures 2 and 5 also use svgpath2mpl 1.0.0) on first use and regenerates the figure with the overlap checker on. The
regenerated PNGs match the committed ones on the machine the figures were made on; another matplotlib may differ by
a few anti-aliased pixels. For the submitted figures, with their pixel checks, run the snapshot's `run.sh` files.

## Data and selection

- `figure-*/robodojo-metr-style-data-judge.csv`: one row per (model, configuration) pair: release date, reasoning
  effort and serving mode, mean task score over the 120 trials (20 per task) with its 95% bootstrap interval, the
  per-task mean scores, mean wall-clock minutes per trial, mean estimated API cost per trial (`cost_basis` says
  whether it comes from the published dataset or the harness's own estimate), and timing statistics. The submission's
  12 rows are copied unchanged from the snapshot; the 3 new rows are built by `build_data.py`.
- `figure-*/robodojo-milestone-mix.json`: the six task rubrics and, for every (configuration, task, rubric level),
  how many of the 20 trials the GPT-6 Astra (H) judge scored at that level.
- `data/new-cohorts-runs.json`: one record per run of the three new cohorts as read from the rig workbench and the
  judge store (421 runs, hostnames removed): task, rig, start and end time, duration, model calls, token usage and
  the harness cost estimate, termination, inclusion flag, and the GPT-6 Astra (H) grade on the paper's rubric (`v1`;
  for Stand Up Bottles that is the adapted 2026-09-22 rubric every submitted cohort used, not the eight-level rubric
  saved on 16 October, whose grade is kept as `v2` for reference only).
- `build_data.py` selects 20 trials per task. For Gemini 3.6 Flash and GPT-6.1 Sol (H+UF) a trial is a
  workbench-included run with a grade, the first 20 per task by start time (one cell has 21); overheat-ended runs stay
  in as attempts, as the submission's Claude Opus 5 cohort did (1 to 3 per task for Gemini 3.6 Flash, none for Sol).
  For Gemini 4 Argon the trials are exactly the 120 attempts robocurve.org publishes (its
  `data/gemini4-argon-selection.json`: the dashboard's Final Runs rule, the newest 20 per task); 34 of them ended on a
  motor overheat, 7 on Gemini's input filter (graded on the footage up to that point) and 4 Stand Up Bottles trials on
  an LLM read timeout before any motion, which have no grade and count as 0 as on the site. The site's three
  operator-corrected Cap Pen grades are not applied here: every score is the judge's, as in the paper.
  `data/new-cohorts-summary.json` lists the selected run names per cell.
- Intervals are the paper's task-stratified percentile bootstrap (20,000 replicates, seed 20261005); applied to the
  submitted rows it reproduces their published intervals to within 0.3 points.
- Cost: the harness's own estimate from the per-call token counters (`plugin estimate`, the basis the paper used for
  GPT-6 Astra (H+UF) and the two XH rows) for the two cohorts not on robocurve.org; the site's per-attempt cost for
  Argon (`public dataset`, averaged over the 117 priced attempts).

## Caveats

- Gemini 4 Argon's release date is 13 October 2026 from the Gemini API changelog, as on robocurve.org; the RCI
  report's data table dates it 30 September. The record-setter fit does not depend on which is used, the plotted
  position does.
- Gemini 3.6 Flash is a backfill run in October on a model released in July; the rigs, harness and judge are the
  same as the September cohorts', but the rig layouts were the current ones.
- The Argon cohort keeps its overheat-ended attempts (28% of them), unlike the leaderboard cohorts in the
  submission, which ran replacements; its cost and minutes are therefore not like for like, and its mean score is
  lower than a clean cohort would give.
- Per-call API latencies are not extracted for the new rows (the `*_latency_*` columns are empty); nothing in the
  figures uses them.

## Provenance of the code

The figure scripts are the snapshot's with three additions: `BITTER_LESSON_DATA` and `BITTER_LESSON_OUT` can point
them at another data and output folder (unset, as here, they read and write next to themselves); the serving-tier
suffix `+PR` for Google's Priority tier; and label placements for the configurations the submission did not have,
which engage only when such a configuration is in the data. With the submission's data the patched scripts still
reproduce the submitted figures pixel for pixel. `figure-5/` holds byte-identical copies of `figure-2/`'s modules;
edit them in `figure-2/` and copy.

## Licence

Code: MIT (the repository's `LICENSE`). Data and figures: CC BY 4.0 (`LICENSE-CC-BY-4.0` at the repository root).
Fonts: SIL Open Font License 1.1 (`figure-*/fonts/LICENSE`).
