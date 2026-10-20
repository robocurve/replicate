"""Build robocurve-runs.csv (in this folder) from the public Dream-1 export and the judge's time-to-score results.

robocurve-runs(1).csv is the robocurve.org all-runs export of the 120 Dream-1 attempts; its `minutes`
column is wall-clock duration, 3.0 min for every row because a VLA cannot end an attempt. The speed card
instead plots the mean time to reach the final score, measured per trial by the same GPT-6 Astra judge
(data/time-to-score-dream-1.json, 118 scored trials; the two zero-score trials have no such time).

Output keeps the 21 export columns in order, with `minutes` replaced by the measured completion time
(time_to_score_s / 60, blank for the two unscored rows), and appends `wall_clock_minutes` (the original
value) and `time_to_score_s`. `cost` stays wall-clock based, as on the site ($3/hr x 180 s).
All figures are rounded to 2 decimal places (cost, minutes, wall_clock_minutes; scores already are,
time_to_score_s is whole seconds).
"""
import csv
import json
import statistics
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / 'data/robocurve-runs(1).csv'
TTS = HERE / 'data/time-to-score-dream-1.json'
OUT = HERE / 'robocurve-runs.csv'

tts = {r['key'].rsplit('/', 1)[-1]: r for r in json.loads(TTS.read_text())}
rows = list(csv.DictReader(open(SRC, newline='')))
assert len(rows) == 120 and len(tts) == 118
fields = list(rows[0].keys()) + ['wall_clock_minutes', 'time_to_score_s']
scored = []
with open(OUT, 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=fields, quoting=csv.QUOTE_ALL)
    w.writeheader()
    for r in rows:
        t = tts.get(r['run'])
        if t is None:
            assert float(r['score']) == 0, r['run']
        elif r['task'] != 'Stand Up Bottles':  # bottles rows carry the old-rubric re-grade; the judge saw the new one
            assert abs(float(r['score']) - t['score']) < 1e-9, (r['run'], r['score'], t['score'])
        r['wall_clock_minutes'] = f"{float(r['minutes']):.2f}"
        r['cost'] = f"{float(r['cost']):.2f}"
        r['time_to_score_s'] = '' if t is None else f"{t['time_s']:g}"
        r['minutes'] = '' if t is None else f"{t['time_s'] / 60:.2f}"
        if t is not None:
            scored.append(t['time_s'] / 60)
        w.writerow(r)
print(f"wrote {OUT.name}: {len(rows)} rows, {len(scored)} with a measured completion time, "
      f"mean {statistics.mean(scored):.3f} min (median {statistics.median(scored):.3f}), "
      f"wall-clock mean {statistics.mean(float(r['wall_clock_minutes']) for r in rows):.3f} min")
