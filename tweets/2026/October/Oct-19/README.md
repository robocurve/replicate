# Oct-19: Dream-1 "faster than every LLM" card

Standalone replicate of the third image in Robocurve's Dream-1 X posts of 2026-10-19
(`original/3-speed.png`, copy in `original/x-3-speed.md`): mean score on RoboDojo-RC Tier 1
against time per task attempt, log x axis, with Dream-1 at 1.4 min, the new Pareto frontier,
the previous frontier, and the "1.3x better, 1.7x faster" arrow from GPT-6 Astra (ultrafast).

`./regenerate.sh` rebuilds `dream-1.jpeg` (and `dream-1.png`, both 1200x1500) from the
sources in `site/`, dumps the values the chart actually plots to `data/chart-values.json`,
and rebuilds `robocurve-runs.csv` with `make_runs_csv.py`.

## Where the numbers come from

- LLM points: wall-clock minutes per attempt and mean score, 120 attempts per configuration.
  Nine configurations are the site's own (`site/src/robodojoModels.jsx`, `MODELS`, partly
  read from `site/assets/data/robocurve-leaderboard.json` as of 2026-10-17; copy in
  `data/robocurve-leaderboard-2026-10-17.json`). Three more (GPT-6 Astra xhigh, Opus 5.5
  xhigh, GPT-6 Astra high ultrafast) are hard-coded in `site/src/Dream1Cards.jsx`
  (`LLM_EXTRA`) from the data-analysis per-configuration table
  (`data/robodojo-3d-cost-time-score-per-milestone.csv`).
- VLA points (Dream-1, GR00T N1.7, MolmoAct2): every VLA attempt runs to its cap (Dream-1
  180 s; the others 3,600 control steps), so the card plots the mean time to reach the final
  score instead of wall-clock. For each scored trial the same GPT-6 Astra judge that graded
  it was shown the saved score and asked for the earliest video time by which that score was
  already earned (166 evenly spaced frames per camera, three cameras, to stay under the
  500-image cap). Script: `judge/dream1_time_to_score.py`, run on omen against
  `judge/final_judge.py` (the rig dashboard's judge module, copy of 2026-10-19) and the
  workbench and final-judges stores. Raw replies: `data/judge-results/dream-1/` (118 trials)
  and `data/judge-results/vla-baselines/` (125 trials, GR00T and MolmoAct2). Per-trial
  times: `data/time-to-score-dream-1.json`, `data/time-to-score-vla-baselines.csv`.
  Means: Dream-1 86.84 s = 1.447 min over 118 scored trials (median 74 s); GR00T 55.2 s
  (48 trials); MolmoAct2 50.0 s (77 trials). The two zero-score Dream-1 trials have no time.
- Dream-1 score 59.25 is the mean of task means with Stand Up Bottles re-graded under the
  older 5-level rubric the LLM rows use (60.875 under the newer 8-level one). The arrow
  multiples are 59.25 / 47.08 = 1.26x ("1.3x") and 2.474 / 1.447 = 1.71x.

`data/robocurve-runs(1).csv` is the robocurve.org all-runs export of the 120 Dream-1 attempts
(its `minutes` is wall-clock, 3.0 for every row). `robocurve-runs.csv` (this folder) is the same
file with `minutes` replaced by the measured completion time in minutes (blank for the two
unscored trials) and two columns appended: `wall_clock_minutes` (the original value) and
`time_to_score_s`. `cost` stays wall-clock based ($3/hr x duration), as on the site. Cost and both
minute columns are rounded to 2 decimal places. The same values were pushed to the
website's Dream-1 rows on 2026-10-20 (robocurve/website branch `dream1-measured-minutes`), so
the site's "Download filtered CSV" for the Dream-1 cohort matches this file once merged.

## How the image is made

`site/` is a trimmed copy of the `robocurve/website` repo at commit `5fbe5ea` (2026-10-17),
the base of the author's local `gemini4-draft` worktree, with the Dream-1 card patch applied:

- `site/src/{DraftPage,LeaderboardBars,ParetoChart,ReleaseChart,robodojoModels}.jsx` are the
  `5fbe5ea` files with `shared-components.diff` from
  `robocurve/social:posts/2026-10-19-dream-1/draft/chart-code/` applied (clean apply).
  One line was appended to `DraftPage.jsx` to export `DRAFT_CSS`, `DRAFT_W`, `DRAFT_H`,
  `footer`.
- `site/src/Dream1Cards.jsx` (the card definitions; the time card is `D1_LOG_PANELS`
  id `d1-time-log`), `DraftTasksPage.jsx` and `dream1TaskScores.json` are the snapshot
  files from the same folder. `Gemini4Cards.jsx` and `RciCards.jsx` are empty stubs for two
  imports the snapshot does not include.
- `site/src/{Trends,SpeedChart}.jsx`, `useChartSize.js`, `placeLabels.js`, `runs.mjs`,
  `components/Wordmark.jsx`, `styles.css`, `tokens/*.css`, `assets/data/*.json` and the
  Imagin webfonts are unmodified `5fbe5ea` files. `tokens/fonts-local.css` adds
  self-hosted Open Sans and Space Grotesk so the render does not depend on Google Fonts.
- `site/entry.jsx` mounts only the `d1-time-log` panel in the 420x525 CSS frame of the
  unlisted `/draft/` page. `site/build.mjs` bundles it with esbuild using the website's
  settings. `site/shot.mjs` serves `dist/` locally and screenshots the panel's 420x525 box at
  1200/420 device pixels, the way the posted cards were shot (see the author's
  `shot-bottles-video.mjs` in the social repo).

Pinned toolchain: `site/package.json` + `package-lock.json` (react 18.3.1, esbuild 0.24,
playwright 1.50 with its bundled Chromium).

## Verification (2026-10-20)

`dream-1.png` is 1200x1500 like the posted card, and `data/chart-values.json` reproduces the
site's figures (Dream-1 59.3% at 1.4 min on the frontier; MolmoAct2 18.9% at 0.8; GR00T 9.5%
at 0.9; GPT-6 Astra ultrafast 47.1% at 2.5). Every point, label, line and the footer sit in
the same place as in `original/3-speed.png`. The two files are not byte-identical: at the
best alignment (one pixel vertically) the mean absolute pixel difference is 5.9 on the 0-255
scale and 3.6% of pixels differ by more than 64 levels, all at glyph edges and strongest in
the title and subtitle lines. That residue is text rasterization: the posted card was shot
with Chromium on macOS, this one with Playwright's Chromium on Linux. Rendering with the
CDN fonts or the self-hosted copies gives the same bytes here, so the font files are not the
cause. `make_runs_csv.py` reports 118 measured trials with mean 1.447 min, matching the
leaderboard's `minutes` for Dream-1.
