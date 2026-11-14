# Delegation: blurred refusals under three modalities

Blurred trials only. For each model and task, how often the model refuses when it drives the arms itself
(closed-loop EEF control), when it plans for a VLA, and when it checks the instruction as a judge.

![pooled bars](paper-figures/delegation-bars.png)

![per-task table](paper-figures/delegation-table.png)

## The three modalities

- **Closed-loop EEF (E):** the refusal figure's blurred column, unchanged: the first 12 counted trials per cell,
  refusal = three-judge panel majority (`../figure-refusals/data/counted-trials.csv`, copied to `data/`).
- **VLA planner (V):** one probe per counted trial. The trial's first observation (overhead and both wrist
  frames, the bytes the trial sent at step 0) goes to the trial's own model with the trial's request parameters,
  framed as the planner of a planner-plus-VLA controller (`plan-v3` in RoboSpoof `ops/idprobe/probe.py`). It
  replies `send_instructions` or `message_operator`; refusal = `message_operator`.
- **Judge (J):** the same observation, framed as an instruction check (`review-v3`), replying `approve` or
  `reject`; refusal = `reject`.

So every cell has as many V and J probes as E trials (12), and each probe is tied to one E trial by name.

## Caveats

- **Timing differs.** E counts a refusal at any point in the trial; V and J see only the first observation.
- **Reasons are mixed.** Most V and J refusals from Astra, Sol and Argon cite blur, not a hazard. In the 2026-11-07
  pilot these models also rejected a benign control instruction mostly on blur grounds, so a V or J refusal is not
  hazard recognition. A three-judge safety/other split of the refusals exists on omen
  (`~/chris/robospoof-idprobe/full-run/refusals-*-*.jsonl`) and is not drawn here.
- **Gemini Flash 3.8 has no V or J probes** (only identify probes were run for it); its cells show a dash and the
  bars say n/p.

## Files

| File | What it is |
|---|---|
| `paper-figures/delegation_bars.tex` | TikZ clustered bars, pooled over tasks (60 trials per bar) |
| `paper-figures/delegation_heatmaps.tex` | TikZ per-task table, the refusal heatmap's layout with E/V/J columns |
| `paper-figures/delegation_counts.tex` | generated counts (`\SetDelegation`, `\SetDelegationPooled`) |
| `paper-figures/delegation_settings.tex` | `\ModalityCode`, `\ModalityKey`, `\ModalityName` |
| `paper-figures/figure_settings.tex` | copy of the refusal figure's task and model names |
| `paper-figures/delegation-bars.png`, `delegation-table.png`, `perceptual-generalization-delegation-preview.pdf` | local render at 5.5 in width |
| `make_delegation_counts.py` | tallies the counts from the three inputs below |
| `data/counted-trials.csv` | the refusal figure's per-trial table |
| `data/probes-step0-20261108/step0-plan-v3.jsonl`, `step0-review-v3.jsonl` | the 300 step-0 probes each (five models), extracted from omen `~/chris/robospoof-idprobe/full-run/probes-{plan,review}-v3.jsonl` |
| `preview.tex`, `run.sh` | regenerate counts and previews |

Bar colours (2A7FA8, D9822B, 009075) pass the dataviz palette validator on white; the orange is under 3:1 contrast,
so every bar is labelled with its rate.

## Reproduce

```
./run.sh
```
