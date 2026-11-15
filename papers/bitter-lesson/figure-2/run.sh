#!/usr/bin/env bash
# Regenerate this figure from the data in this folder (the current paper; the submitted version is reproduced in
# ../CoRL-TAG-submission-snapshot/). Needs uv (https://docs.astral.sh/uv/), which builds the pinned environment in
# requirements.txt on first use.
set -euo pipefail
cd "$(dirname "$0")"
export PYTHONDONTWRITEBYTECODE=1
run() { uv run --no-project --python 3.12 --with-requirements requirements.txt python "$@"; }

run robodojo_metr_style_robocurve_data.py                # judge CSV + milestone counts -> robocurve-charts/*.csv
run robodojo_release_paper_figures.py --check --height=2.6  # robocurve-charts/*.csv -> paper-figures/robodojo-release-score.{png,pdf} (and Figure 5), robodojo-release-figures.tex
