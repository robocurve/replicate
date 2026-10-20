"""Write the plotted values of the per-milestone 3D figure to a CSV, one row per configuration.

Uses the figure script's own loaders and dominance test, so the numbers are exactly what
``robodojo_3d_plot.py --frontier`` draws. Run from this directory:
    uv run --no-project --with matplotlib --with numpy python robodojo_3d_data.py
"""
import csv, sys
sys.argv = [sys.argv[0]]  # the plot module reads its flags from sys.argv at import; defaults = per milestone
import robodojo_3d_plot as p

rows = p.load()
per_trial = p.milestones_per_trial()
def dominated(a):
    return any(b is not a and b["cost"] <= a["cost"] and b["time"] <= a["time"] and b["score"] >= a["score"]
               and (b["cost"] < a["cost"] or b["time"] < a["time"] or b["score"] > a["score"]) for b in rows)
out = p.HERE / "robodojo-3d-cost-time-score-per-milestone.csv"
with out.open("w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["model", "name", "developer", "release_date", "effort", "mode", "label", "n_trials", "cost_basis",
                "mean_progress_pct", "ci_low_pct", "ci_high_pct", "mean_minutes_per_trial", "mean_cost_usd",
                "milestones_per_trial", "minutes_per_milestone", "subtasks_per_hour", "cost_per_milestone_usd", "on_frontier"])
    for r in sorted(rows, key=lambda r: (r["developer"], r["name"], r["effort"], r["mode"])):
        m, n = per_trial[f"{r['model']}|{r['effort']}|{r['mode']}"]
        w.writerow([r["model"], r["name"], r["developer"], r["release_date"], r["effort"], r["mode"], p.label(r), r["n_trials"],
                    r["cost_basis"], r["mean_progress_pct"], r["ci_low_pct"], r["ci_high_pct"], r["mean_minutes_per_trial"],
                    r["mean_cost_usd"], f"{m:.4f}", f"{r['time']:.4f}", f"{r['rate']:.4f}", f"{r['cost']:.4f}", 0 if dominated(r) else 1])
print("wrote", out)
