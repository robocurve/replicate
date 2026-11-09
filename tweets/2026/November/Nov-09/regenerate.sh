#!/usr/bin/env bash
# One-shot regeneration of the four 5:4 cards (franka-*.png, 1600x1280).
# Needs Python 3 with numpy + scipy, Node 22+. First run downloads Aiden Swann's score table, the pinned npm
# packages and Playwright's Chromium (~120 MB).
set -euo pipefail
cd "$(dirname "$0")"
python3 make_data.py
cd site
npm ci --no-audit --no-fund
npx playwright install chromium
node build.mjs
node shot.mjs
