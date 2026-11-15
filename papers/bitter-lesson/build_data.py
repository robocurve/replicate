"""Extend the submitted paper's two data files with the configurations evaluated after the submission.

Reads the submitted files from CoRL-TAG-submission-snapshot/figure-2/ (12 configurations) and
data/new-cohorts-runs.json (per-run records for the new ones), and writes robodojo-metr-style-data-judge.csv
and robodojo-milestone-mix.json, in the same formats, next to each figure's scripts (figure-2, figure-3,
figure-5, figure-6), plus data/new-cohorts-summary.json with the selection counts behind each new row.
Deterministic: the bootstrap intervals use a fixed seed.

Cell selection (20 trials per task):
- Gemini 4 Argon (H, Priority): exactly the 120 attempts robocurve.org publishes (data/gemini4-argon-selection.json
  there: the dashboard's Final Runs rule, newest 20 per task, overheat-ended runs kept). Scores are the judge's v1
  grades; the four Stand Up Bottles trials that ended on an LLM read timeout have no grade and count as 0, as on the site.
- Gemini 3.6 Flash (H), GPT-6.1 Sol (H, ultrafast): the workbench's included runs that have a
  v1 grade, the first 20 per task by start time (one task has 21).
Run: uv run --no-project --python 3.12 --with numpy python build_data.py
"""

from __future__ import annotations

import csv
import json
import math
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
SUBMITTED = HERE / "CoRL-TAG-submission-snapshot" / "figure-2"
DATA = HERE / "data"
FIGURES = {"csv": ["figure-2", "figure-5", "figure-6"], "json": ["figure-2", "figure-3", "figure-5", "figure-6"]}
SEED = 20261005
REPLICATES = 20_000

TASK_NAME = {"Classify Objects": "Sort Objects"}  # workbench name -> paper name
TASKS = ["Stack Bowls", "Store In Safe", "Sort Objects", "Cap Pen", "Pack And Pour Fruit", "Stand Up Bottles"]
CONFIGS = {
    # config key -> CSV identity. Gemini 3.7 Flash (120 runs, 14 to 16 October) is deliberately absent: Google's internal
    # documentation says its requests were being served by Gemini 3.8 Flash, so the cohort measures nothing about 3.7.
    # Release dates: Gemini 3.6 Flash from the Artificial Analysis snapshot
    # (website assets/data/llm-speed.json); Gemini 4 Argon from the Gemini API changelog (2026-10-13, as on
    # robocurve.org; the RCI report's data table says 2026-09-30); GPT-6.1 Sol as the paper's fast-tier row.
    "gemini-3.6-flash|high|standard": dict(name="Gemini 3.6 Flash", developer="Google", release_date="2026-07-21"),
    "gpt-6.1-sol|high|ultrafast": dict(name="GPT-6.1 Sol", developer="OpenAI", release_date="2026-09-29"),
    "gemini-4-argon|high|priority": dict(name="Gemini 4 Argon", developer="Google", release_date="2026-10-13"),
}


def select(runs: list[dict]) -> dict[str, dict[str, list[dict]]]:
    """Trials per (config, paper task): the site's cohort for Argon, else included and graded, first 20 by start."""
    cells: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))
    for r in runs:
        task = TASK_NAME.get(r["task"], r["task"])
        if r["config"].startswith("gemini-4-argon"):
            if r.get("site_selected"):
                cells[r["config"]][task].append(r)
        elif r["included"] and r["v1_status"] == "ok":
            cells[r["config"]][task].append(r)
    for cfg, by_task in cells.items():
        for task, rows in by_task.items():
            rows.sort(key=lambda r: r["started_at"])
            if not cfg.startswith("gemini-4-argon"):
                del rows[20:]
            if len(rows) != 20:
                raise SystemExit(f"{cfg} {task}: {len(rows)} trials, expected 20")
    return cells


def score(r: dict) -> float:
    if r["v1_score"] is None:
        if r["status"] == "error" and r["v1_status"] is None:
            return 0.0  # LLM read timeout before any footage: no grade, counted as 0 (as on the site)
        raise SystemExit(f"{r['name']}: no v1 grade")
    return float(r["v1_score"])


def stratified_ci(per_task: list[list[float]], rng: np.random.Generator, stat=np.mean) -> tuple[float, float]:
    """95% percentile bootstrap of the mean over all trials, resampling within each task."""
    arrays = [np.asarray(v, dtype=float) for v in per_task]
    draws = np.empty(REPLICATES)
    for i in range(REPLICATES):
        draws[i] = stat(np.concatenate([rng.choice(a, size=a.size, replace=True) for a in arrays]))
    return float(np.percentile(draws, 2.5)), float(np.percentile(draws, 97.5))


def plain_ci(values: list[float], rng: np.random.Generator) -> tuple[float, float]:
    a = np.asarray(values, dtype=float)
    draws = np.array([rng.choice(a, size=a.size, replace=True).mean() for _ in range(REPLICATES)])
    return float(np.percentile(draws, 2.5)), float(np.percentile(draws, 97.5))


def wilson(k: int, n: int, z: float = 1.959964) -> tuple[float, float]:
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return 100 * (c - h), 100 * (c + h)


def tokens(r: dict) -> float | None:
    u = r.get("usage") or {}
    if "input_tokens" in u and "output_tokens" in u:
        return float(u["input_tokens"]) + float(u["output_tokens"])
    return None


def cost(r: dict) -> float | None:
    if r["config"].startswith("gemini-4-argon"):
        c = (r.get("site") or {}).get("cost")
        return float(c) if c not in (None, "") else None
    c = (r.get("usage") or {}).get("estimated_cost_usd")
    return float(c) if c is not None else None


def build_row(cfg: str, by_task: dict[str, list[dict]], template: dict, rng: np.random.Generator) -> dict:
    model, effort, mode = cfg.split("|")
    row = {k: "" for k in template}
    row.update(model=model, effort=effort, mode=mode, n_trials=120, grading="Astra autograde", **CONFIGS[cfg])
    per_task = [[score(r) for r in by_task[t]] for t in TASKS]
    allscores = [s for v in per_task for s in v]
    lo, hi = stratified_ci(per_task, rng)
    row.update(mean_progress_pct=round(100 * np.mean(allscores), 2), ci_low_pct=round(100 * lo, 2), ci_high_pct=round(100 * hi, 2))
    k = sum(1 for s in allscores if s >= 1 - 1e-9)
    wl, wh = wilson(k, len(allscores))
    row.update(completions=k, completion_rate_pct=round(100 * k / len(allscores), 2),
               completion_wilson_low_pct=round(wl, 2), completion_wilson_high_pct=round(wh, 2))
    for t, v in zip(TASKS, per_task):
        row[f"judge_{t}"] = f"{100 * np.mean(v):.1f}".rstrip("0").rstrip(".") if abs(100 * np.mean(v) - round(100 * np.mean(v))) < 1e-9 else f"{100 * np.mean(v):.1f}"
    trials = [r for t in TASKS for r in by_task[t]]
    tok = [x for x in (tokens(r) for r in trials) if x is not None]
    if tok:
        tl, th = plain_ci(tok, rng)
        row.update(mean_tokens=round(np.mean(tok)), tokens_ci_low=round(tl), tokens_ci_high=round(th))
    timed = [r for r in trials if r.get("duration_s")]
    minutes = [r["duration_s"] / 60 for r in timed]
    ml, mh = plain_ci(minutes, rng)
    row.update(mean_minutes_per_trial=round(np.mean(minutes), 3), n_timed_trials=len(timed),
               minutes_ci_low=round(ml, 3), minutes_ci_high=round(mh, 3))
    calls = [r["llm_calls"] for r in trials if r.get("llm_calls")]
    row.update(mean_calls_per_trial=round(np.mean(calls), 1))
    spc = [r["duration_s"] / r["llm_calls"] for r in timed if r.get("llm_calls")]
    sl, sh = plain_ci(spc, rng)
    row.update(mean_seconds_per_call=round(np.mean(spc), 2), seconds_per_call_ci_low=round(sl, 2), seconds_per_call_ci_high=round(sh, 2))
    costs = [x for x in (cost(r) for r in trials) if x is not None]
    cl, ch = plain_ci(costs, rng)
    row.update(mean_cost_usd=round(np.mean(costs), 3), cost_ci_low=round(cl, 3), cost_ci_high=round(ch, 3),
               cost_basis="public dataset" if cfg.startswith("gemini-4-argon") else "plugin estimate")
    row["n_latency_runs"] = ""  # per-call API latencies need the wire captures, which this update does not read
    return row


def milestone_rows(cfg: str, by_task: dict[str, list[dict]], rubrics: dict) -> list[dict]:
    rows = []
    for t in TASKS:
        levels = rubrics[t]["levels"]
        scores = [score(r) for r in by_task[t]]
        counts = Counter()
        for s in scores:
            match = [lv for lv in levels if abs(float(lv["score"]) - s) < 1e-6]
            if len(match) != 1:
                raise SystemExit(f"{cfg} {t}: judge score {s} is not a rubric level {[lv['score'] for lv in levels]}")
            counts[float(match[0]["score"])] += 1
        for lv in levels:
            rows.append({"config": cfg, "task": t, "level_score": lv["score"], "level_title": lv["title"],
                         "description": lv["description"], "count": counts[float(lv["score"])], "n": len(scores)})
    return rows


def main() -> None:
    runs = json.loads((DATA / "new-cohorts-runs.json").read_text())["runs"]
    cells = select(runs)
    with (SUBMITTED / "robodojo-metr-style-data-judge.csv").open() as fh:
        reader = csv.DictReader(fh)
        fieldnames = list(reader.fieldnames)
        base_rows = list(reader)
    mix = json.loads((SUBMITTED / "robodojo-milestone-mix.json").read_text())
    rng = np.random.default_rng(SEED)
    new_rows, new_counts, summary = [], [], {}
    for cfg in CONFIGS:
        by_task = cells[cfg]
        new_rows.append(build_row(cfg, by_task, dict.fromkeys(fieldnames), rng))
        new_counts += milestone_rows(cfg, by_task, mix["rubrics"])
        summary[cfg] = {t: {"n": len(by_task[t]), "names": [r["name"] for r in by_task[t]],
                            "overheat_ended": sum(1 for r in by_task[t] if r["termination"] == "overheat"),
                            "errored": sum(1 for r in by_task[t] if r["status"] == "error"),
                            "ungraded_as_zero": sum(1 for r in by_task[t] if r["v1_score"] is None),
                            "mean_v1": round(float(np.mean([score(r) for r in by_task[t]])), 4)} for t in TASKS}
    DATA.mkdir(exist_ok=True)
    out_mix = {"rubrics": mix["rubrics"], "counts": mix["counts"] + new_counts}
    for folder in FIGURES["csv"]:
        with (HERE / folder / "robodojo-metr-style-data-judge.csv").open("w", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=fieldnames)
            w.writeheader()
            w.writerows(base_rows + new_rows)
    for folder in FIGURES["json"]:
        (HERE / folder / "robodojo-milestone-mix.json").write_text(json.dumps(out_mix, indent=1) + "\n")
    (DATA / "new-cohorts-summary.json").write_text(json.dumps(summary, indent=1) + "\n")
    for r in new_rows:
        print(f"{r['name']} ({r['effort']}, {r['mode']}): score {r['mean_progress_pct']} [{r['ci_low_pct']}, {r['ci_high_pct']}], "
              f"complete {r['completions']}, ${r['mean_cost_usd']}/trial ({r['cost_basis']}), {r['mean_minutes_per_trial']} min/trial, "
              f"{r['mean_calls_per_trial']} calls")
    print(f"wrote robodojo-metr-style-data-judge.csv ({len(base_rows) + len(new_rows)} rows) to", ", ".join(FIGURES["csv"]))
    print(f"wrote robodojo-milestone-mix.json ({len(out_mix['counts'])} count rows) to", ", ".join(FIGURES["json"]))


if __name__ == "__main__":
    main()
