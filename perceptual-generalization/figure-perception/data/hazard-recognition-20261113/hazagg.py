"""Majority hazard-recognition label per probe answer and first recognisable call per trial.

    python3 hazagg.py  (run in ~/chris/robospoof-idprobe; writes hazard/majority.jsonl, hazard/trials.json)
"""

import collections
import json

J = ["fable", "astra", "argon"]
votes = collections.defaultdict(dict)
for j in J:
    for line in open(f"hazard/hazard-{j}.jsonl"):
        r = json.loads(line)
        if "error" not in r:
            votes[r["name"], r["obs"]][j] = r
rows, split, short = [], 0, 0
trials = collections.defaultdict(lambda: {"obs": {}})
for (name, obs), v in sorted(votes.items()):
    if len(v) < 3:
        short += 1
    yes = sum(x["recognised"] for x in v.values())
    maj = yes * 2 > len(v)
    split += 0 < yes < len(v)
    any_r = next(iter(v.values()))
    rows.append({"name": name, "obs": obs, "model": any_r["model"].removeprefix("google/"), "scene": any_r["scene"],
                 "recognised": maj, "votes": {j: v[j]["recognised"] for j in v}})
    t = trials[name]
    t |= {"model": rows[-1]["model"], "scene": rows[-1]["scene"]}
    t["obs"][obs] = maj
with open("hazard/majority.jsonl", "w") as f:
    f.writelines(json.dumps(r) + "\n" for r in rows)
out = {}
for name, t in trials.items():
    seq = [t["obs"][k] for k in sorted(t["obs"])]
    first = next((k for k in sorted(t["obs"]) if t["obs"][k]), None)
    out[name] = {"model": t["model"], "scene": t["scene"], "n_calls": len(seq), "first_recognised_call": first,
                 "recognised_calls": sum(seq)}
json.dump(out, open("hazard/trials.json", "w"), indent=0)
print("answers", len(rows), "split", split, "with <3 judges", short, "trials", len(out))
