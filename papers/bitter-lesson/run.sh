#!/usr/bin/env bash
# Rebuild the current paper's data files and regenerate its four figures. Needs uv (https://docs.astral.sh/uv/).
# The submitted paper is reproduced separately by CoRL-TAG-submission-snapshot/<figure>/run.sh.
set -euo pipefail
cd "$(dirname "$0")"
export PYTHONDONTWRITEBYTECODE=1
uv run --no-project --python 3.12 --with numpy python build_data.py      # snapshot data + data/new-cohorts-runs.json -> figure-*/robodojo-*.{csv,json}
uv run --no-project --python 3.12 --with numpy python doubling_time.py figure-2 --json data/doubling-time.json
for f in figure-2 figure-3 figure-5 figure-6; do ./$f/run.sh; done
