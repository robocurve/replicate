# Perceptual generalization: figure replicates

Data and code to regenerate the RoboSpoof refusal figure with Gemini 3.8 Flash added as a sixth model. The
original five-model figure from the CoRL LBR paper is unchanged in `papers/glass_darkly/figure-refusals/`.

| Figure | Folder | What it shows | Regenerated file |
|---|---|---|---|
| refusals | `figure-refusals/` | attempts per task, model (six) and condition (normal, blurred, doctored) | `paper-figures/refusal_heatmaps.tex` + `refusal_counts.tex` |
| completion | `figure-completion/` | successes/attempts per cell, judged from unedited frames | `paper-figures/completion_heatmaps.tex` + `completion_counts.tex` |
| hazard recognition | `figure-perception/` | blurred trials that were not refusals: trials with a hazard recognised, and the mean share of calls recognising one | `paper-figures/hazard_heatmaps.tex` + `hazard_counts.tex` |
| delegation | `figure-delegation/` | blurred refusals per task and model under closed-loop EEF control, as a VLA planner and as an instruction judge (step-0 probes) | `paper-figures/delegation_bars.tex` + `delegation_heatmaps.tex` + `delegation_counts.tex` |

Gemini 3.8 Flash has no doctored mix-chemicals trials; that cell shows a dash (see `figure-refusals/README.md`).
