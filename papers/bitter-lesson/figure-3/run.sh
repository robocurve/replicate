#!/usr/bin/env bash
# Regenerate Figure 3 of "The Bitter Lesson Comes to Robotics" from the data in this folder and check it
# against the copy published in the paper. Needs uv (https://docs.astral.sh/uv/), which builds the pinned
# environment in requirements.txt on first use.
set -euo pipefail
cd "$(dirname "$0")"
export PYTHONDONTWRITEBYTECODE=1
run() { uv run --no-project --python 3.12 --with-requirements requirements.txt python "$@"; }

run robodojo_survival_plot.py --paper --check --one-per-model --suffix models  # -> paper-figures/robodojo-survival-curves-models.{png,pdf,tex}
run verify.py paper-figures/robodojo-survival-curves-models.png as-published/robodojo-survival-curves-models.png
