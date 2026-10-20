#!/usr/bin/env bash
# One-shot regeneration: dream-1.jpeg (+ dream-1.png, data/chart-values.json) and robocurve-runs.csv.
# Needs Node 22+ and Python 3. First run downloads the pinned npm packages and Playwright's Chromium (~120 MB).
set -euo pipefail
cd "$(dirname "$0")/site"
npm ci --no-audit --no-fund
npx playwright install chromium
node build.mjs
node shot.mjs
cd ..
python3 make_runs_csv.py
