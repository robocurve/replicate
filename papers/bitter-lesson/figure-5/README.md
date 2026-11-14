# Figure 5: subtask completion rate and API cost per subtask against model release date

The current version of the figure, drawn from the data next to the scripts: the twelve configurations of the
submitted paper plus the ones evaluated since (see `../README.md`). The submitted figure, with its pixel check, is
in `../CoRL-TAG-submission-snapshot/figure-5/`.

## Files

| File | What it is |
|---|---|
| `robodojo-metr-style-data-judge.csv` and `robodojo-milestone-mix.json` | the data; written by `../build_data.py`, do not edit by hand |
| the same modules as figure-2 (byte-identical copies; edit them there and copy) | the figure code; the same scripts as the snapshot's, which read and write next to themselves unless `BITTER_LESSON_DATA` / `BITTER_LESSON_OUT` say otherwise |
| `paper-figures/robodojo-release-rate-cost.png`, `.pdf`, `.tex` | the regenerated figure and its LaTeX environment with a generated caption |
| `fonts/` | the bundled Liberation Sans (SIL OFL 1.1) the figures are set in |
| `run.sh`, `requirements.txt` | regenerate; the pinned environment |

## Reproduce

```
./run.sh
```

or `../run.sh` to rebuild the data first. `run.sh` passes the overlap checker (`--check`), which prints any labels
that collide; silence means none.

## Licence

Code: MIT (the repository's `LICENSE`). Data and figures: CC BY 4.0 (`LICENSE-CC-BY-4.0` at the repository root).
Fonts: SIL Open Font License 1.1 (`fonts/LICENSE`).
