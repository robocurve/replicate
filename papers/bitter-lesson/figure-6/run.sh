#!/usr/bin/env bash
# Regenerate this figure from the data in this folder (the current paper; the submitted version is reproduced in
# ../CoRL-TAG-submission-snapshot/). Needs uv (https://docs.astral.sh/uv/), which builds the pinned environment in
# requirements.txt on first use.
set -euo pipefail
cd "$(dirname "$0")"
export PYTHONDONTWRITEBYTECODE=1
run() { uv run --no-project --python 3.12 --with-requirements requirements.txt python "$@"; }

export BITTER_LESSON_RATE_FLOOR=6  # Gemini 4 Argon completes 7.1 subtasks per hour, under the submitted axis floor of 8
run robodojo_3d_plot.py --paper  # judge CSV + milestone counts -> paper-figures/robodojo-3d-frontier.{png,pdf,tex}
run robodojo_3d_data.py          # the plotted values -> robodojo-3d-cost-time-score-per-milestone.csv
