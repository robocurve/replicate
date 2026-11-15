#!/usr/bin/env bash
# Regenerate Figure 5 of "The Bitter Lesson Comes to Robotics" from the data in this folder and check it
# against the copy published in the paper. Needs uv (https://docs.astral.sh/uv/), which builds the pinned
# environment in requirements.txt on first use.
set -euo pipefail
cd "$(dirname "$0")"
export PYTHONDONTWRITEBYTECODE=1
run() { uv run --no-project --python 3.12 --with-requirements requirements.txt python "$@"; }

run robodojo_metr_style_robocurve_data.py      # judge CSV + milestone counts -> robocurve-charts/*.csv
run robodojo_release_paper_figures.py --check  # robocurve-charts/*.csv -> paper-figures/robodojo-release-rate-cost.{png,pdf} (and Figure 2)
run verify.py paper-figures/robodojo-release-rate-cost.png as-published/robodojo-release-rate-cost.png
