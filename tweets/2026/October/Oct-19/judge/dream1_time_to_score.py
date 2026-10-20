"""For each Dream-1 trial (set 65d2b81265f0, 2026-10-18; adapted from /tmp/vla_time_to_score.py) with a non-zero saved grade, ask the same judge (GPT-6 Astra, high
effort, same 1 fps three-camera evidence) for the earliest video time by which the trial
had already earned its saved score. Read-only: writes results to ~/scratch/dream1-time/ only."""
import json, sys, time, re
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
sys.path.insert(0, str(Path.home() / 'sravanthi/rig-dashboard/src'))
from rig_dashboard import final_judge as fj  # noqa: E402

# 180 s x 3 cameras at 1 fps = 540 images > the 500-image API limit. Keep the whole trial:
# 166 frames per camera spaced evenly from first to last (~1.1 s apart), endpoints included.
_orig_ei = fj.evidence_indices
def _even_indices(count, fps, latest=False):
    idx = fj.sample_indices(count, fps)
    cap = 500 // len(fj.CAMERAS)
    if len(idx) <= cap: return idx
    return [idx[round(i * (len(idx) - 1) / (cap - 1))] for i in range(cap)]
fj.evidence_indices = _even_indices
M = Path.home() / 'sravanthi/rig-dashboard/media'
OUT = Path.home() / 'scratch/dream1-time/results'; OUT.mkdir(parents=True, exist_ok=True)
SET = '65d2b81265f0'

wb = json.loads((M / 'workbench.json').read_text()); judges = json.loads((M / 'final-judges.json').read_text())
cohort = {r['key'] for r in wb['runs'].values() if r.get('set_id') == SET and r.get('included') and not r.get('deleted') and not r.get('superseded_by')}
jobs = []
for r in wb['runs'].values():
    if r['key'] not in cohort: continue
    g = judges[r['key']]
    assert g['status'] == 'ok' and g['active']
    jobs.append(dict(key=r['key'], vla='dream-1', task=wb['tasks'][r['task_id']]['name'],
                     instruction=r['instruction'], rubric=wb['tasks'][r['task_id']]['rubric'], score=g['score'],
                     explanation=g['explanation']))
assert len(jobs) == 120, len(jobs)
if len(sys.argv) > 1: jobs = [j for j in jobs if j['key'] in sys.argv[1:]]


def prompt(job):
    base = fj.prompt_for(job['instruction'], job['rubric'])
    base = base.rsplit(' Explain your judgement briefly', 1)[0]
    return (base + f"\n\nThis trial has already been graded on the full footage: SCORE {job['score']}. "
            f"The grader's explanation was:\n<<<\n{job['explanation']}\n>>>\n\n"
            "Your task now is different: find the earliest video time T (in seconds) such that, if the recording had ended at T "
            "(so the frame at T were the final frame), the trial would already earn this same score under the rubric. "
            "Conditions that must hold at trial end are judged at T. If the score is earned and later lost and regained, "
            "report the earliest T after which it is held through the end of the footage; if it is never held to the end, "
            "report the earliest T at which it is first earned and say so. Use the video times shown with the frames. "
            "Explain briefly, then end your reply with exactly one line:\nTIME: <seconds>")


def run(job):
    dest = OUT / (job['key'].replace('/', '_') + '.json')
    if dest.exists(): return json.loads(dest.read_text())
    host, rig, name = job['key'].split('/')
    paths = {cam: M / host / rig / f'{name}_{cam}.mp4' for cam in fj.CAMERAS}
    frames, evidence = fj.extract_clips(paths, compact=True)
    request = fj.build_request(job['instruction'], job['rubric'], frames)
    request['messages'][0]['content'][0]['text'] = prompt(job)
    for attempt in range(4):
        try:
            response = fj.call_astra(request); break
        except OSError as exc:
            if attempt == 3: raise
            time.sleep(20 * (attempt + 1))
    reply = response['choices'][0]['message']['content'] or ''
    m = re.findall(r'^\s*TIME:\s*\**\s*(\d+(?:\.\d+)?)\s*\**\s*$', reply, re.M)
    result = dict(job, time_s=float(m[-1]) if len(m) == 1 else None, reply=reply, usage=response.get('usage'),
                  model=response.get('model'), video_s=max(f['video_time_s'] for f in frames), images=evidence['image_count'])
    result.pop('rubric')
    dest.write_text(json.dumps(result))
    return result


todo = [j for j in jobs if j['score'] > 0]
print('non-zero trials', len(todo), flush=True)
done = 0
with ThreadPoolExecutor(max_workers=int(__import__("os").environ.get("WORKERS", "10"))) as pool:
    for fut in as_completed([pool.submit(run, j) for j in todo]):
        try:
            r = fut.result(); done += 1
            print(done, r['key'], r['score'], r['time_s'], (r.get('usage') or {}).get('prompt_tokens'), flush=True)
        except Exception as exc:
            print('ERROR', type(exc).__name__, str(exc)[:200], flush=True)
