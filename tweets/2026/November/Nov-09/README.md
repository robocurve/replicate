# Nov-09: General AI capability vs robotics skill on the Franka Panda (5:4 cards)

Standalone replicate of the four 5:4 cards in Robocurve's X thread on Aiden Swann's Franka Panda kinematics probe
(posted copies in `original/`). Each card plots one of Aiden's four tests against Epoch's Capabilities Index (ECI)
for 44 LLMs. On the left is a scatter with a trend curve and a 95% band. On the right is a ranking of how far each
model beats that trend. Both the curve and the band are fitted without GPT-6 Astra, GPT-6.1 Sol and Gemini 4 Argon,
so those three can be compared against the rest.

| File | Test | Left axis | Right axis |
|---|---|---|---|
| `franka-fk.png` | forward kinematics: joint angles to hand position | Hand-position error (cm) ↓ better | Beats the curve by (cm) ↑ better |
| `franka-mcq.png` | multiple choice: pick the hand position out of four | Correct answers (%) ↑ better | Beats the curve by (points) ↑ better |
| `franka-ik.png` | inverse kinematics: target to joint angles | Hand-position IK error (cm) ↓ better | Beats the curve by (cm) ↑ better |
| `franka-overfitting.png` | forward kinematics with an edited Franka geometry | Distance from real Franka (cm) ↓ more overfit | Beyond the curve (cm) ↑ more overfit |

Run `./regenerate.sh` to rebuild all four PNGs (1600x1280). It needs Python 3 with numpy and scipy, plus Node 22+.

## Where the numbers come from

- **Scores.** Aiden Swann's released per-model table, `figures/all_models.csv` of
  [swannaiden/vlm-robotics-training](https://github.com/swannaiden/vlm-robotics-training) at commit `fd223ef8`.
  That repo has no licence file, so it is not copied here: `make_data.py` downloads it into `data/upstream/` on
  first run. Robocurve re-ran 12 models with Aiden's harness, prompts and strict system prompt, with reasoning off
  (or the lowest effort the API accepts). Those results are in `data/panda_rerun_robocurve.csv` and replace Aiden's
  numbers for the same models.
- **The four tests** are the `real Panda with its table` panels of that table: `FK error`, `Multiple choice correct`,
  `IK error`, and `Twisted arm: distance from the Panda's answer`. The last is the "overfitting" card: it uses the
  edited geometry, and a lower distance means the answer sits closer to the real, unedited Franka's.
- **ECI.** `data/eci_scores.csv` is Epoch AI's Capabilities Index export (epoch.ai, CC BY 4.0).
  `data/model_map.csv` maps each model id to its ECI name and display name. 44 models have both a score and an ECI.
- **Fits** (`fits.py`, `make_data.py`). Error panels use an exponential decay to a floor. Multiple choice uses a
  logistic from chance (25%) to 100%. Both are fitted with a robust soft-L1 loss on the 41 models other than the three
  named ones. The band is the 2.5th to 97.5th percentile of those 41 models' residuals around the curve. "Beats the
  curve by" is each model's residual, signed so that positive is better. On the overfitting card the same sign means
  more overfit: closer to the real Franka's answer than the curve predicts. Models are ranked by that number.
- `make_data.py` writes `site/src/kinematicsData.json`, which is the only data the cards read. It is byte-identical
  to the file the posted cards were rendered from. It is committed, so the cards still build if the upstream
  download ever disappears (the download is pinned to the full commit hash and checked against a sha256).

## How the images are made

`site/` is a trimmed copy of the `robocurve/website` repo at commit `67f4b5a` (branch `kinematics-draft`,
2026-11-09). `package.json`, `package-lock.json`, `tokens/fonts-local.css` and the self-hosted Open Sans and Space
Grotesk fonts are reused from `tweets/2026/October/Oct-19/site`; `build.mjs` and `shot.mjs` are adapted from it (card
ids, output names, page title). Code comments in the copied files refer to their source repos (for example, the
website repo being private, or paths in Robocurve's internal social repo); they are left as they were.

- `site/src/KinematicsCards.jsx` defines the cards (`KIN_WIDE54_PANELS`, ids `kw-fk`, `kw-mc`, `kw-ik`, `kw-twist`),
  including the cross-panel arrows and their routing.
- `site/src/{Trends,robodojoModels,ReleaseChart,ParetoChart,SpeedChart}.jsx`, `useChartSize.js`, `placeLabels.js`,
  `runs.mjs`, `components/Wordmark.jsx`, `styles.css`, `tokens/*.css` and `assets/data/*.json` are unmodified files
  from that commit, included because the card module imports them. `styles.css` additionally imports
  `fonts-local.css` so the render works offline. The Imagin webfont is not included, because the cards don't use it.
- `site/entry.jsx` mounts the four cards in the 580x464 CSS frame of the website's unlisted `/draft/` page, using
  the CSS copied from `src/DraftPage.jsx`. `site/shot.mjs` serves `dist/` locally and screenshots
  each card at 1600/580 device pixels.

## Verification (2026-11-09)

The regenerated PNGs are 1600x1280, the same as `original/`. Every point, label, arrow and line sits in the same
place. Against the originals, the mean absolute pixel difference is 1.7 to 2.4 on the 0-255 scale, and 0.5 to 1.3%
of pixels differ by more than 64 levels, all at glyph edges (text rasterisation differs between machines).
