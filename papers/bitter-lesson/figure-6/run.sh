#!/usr/bin/env bash
# Regenerate Figure 6 of "The Bitter Lesson Comes to Robotics" from the data in this folder and check it
# against the copy published in the paper. Needs uv (https://docs.astral.sh/uv/), which builds the pinned
# environment in requirements.txt on first use.
set -euo pipefail
cd "$(dirname "$0")"
export PYTHONDONTWRITEBYTECODE=1
run() { uv run --no-project --python 3.12 --with-requirements requirements.txt python "$@"; }

run robodojo_3d_plot.py --paper  # judge CSV + milestone counts -> paper-figures/robodojo-3d-frontier.{png,pdf,tex}
run robodojo_3d_data.py          # the plotted values -> robodojo-3d-cost-time-score-per-milestone.csv
run verify.py paper-figures/robodojo-3d-frontier.png as-published/robodojo-3d-frontier.png
