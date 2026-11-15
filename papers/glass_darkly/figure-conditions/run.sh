#!/usr/bin/env bash
# Regenerate the conditions figure from the tiles in frames/. Needs uv (https://docs.astral.sh/uv/), which builds the
# pinned environment in requirements.txt on first use.
#
# The tiles themselves come from make_tiles.py, which needs the RoboSpoof package (its overlay and blur code are the
# mods) and the trial frames in RoboSpoof/runs/gemini-edit-test-20261025/consistency. Rebuild them with
#   (cd <RoboSpoof checkout> && uv run python <this dir>/make_tiles.py runs/gemini-edit-test-20261025/consistency <this dir>/frames)
set -euo pipefail
cd "$(dirname "$0")"
export PYTHONDONTWRITEBYTECODE=1
uv run --no-project --python 3.12 --with-requirements requirements.txt python plot.py   # frames/*.png -> paper-figures/glass-darkly-conditions.{png,pdf,tex}
