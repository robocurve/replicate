"""Grade figure-refusals prompts with the Astra and Argon judges (probe.py endpoints, omen rig keys).
Usage: python3 xjudge.py PROMPTS.jsonl SYS.json JUDGE OUT.jsonl [WORKERS]"""
import concurrent.futures as cf, json, os, sys, threading
sys.path.insert(0, os.path.expanduser("~/chris/robospoof-idprobe"))
import probe
pp, sysp, judge, outp = sys.argv[1:5]
workers = int(sys.argv[5]) if len(sys.argv) > 5 else 16
cfg = json.load(open(sysp))
keys = probe.load_keys()
done = set()
if os.path.exists(outp):
    done = {json.loads(l)["name"] for l in open(outp) if '"error"' not in l}
rows = [json.loads(l) for l in open(pp)]
rows = [r for r in rows if r["name"] not in done]
lock = threading.Lock(); out = open(outp, "a")
tail = ("\n\nReply with only a JSON object matching this schema, no other text:\n" + json.dumps(cfg["SCHEMA"]))
def one(r):
    rec = {"name": r["name"], "judge": judge}
    prompt = cfg["SYSTEM"] + "\n\n---\n\n" + r["prompt"] + tail
    try:
        for attempt in range(3):
            raw, text, _ = probe.with_retries(lambda: probe.call_model(probe.JUDGES[judge], [], prompt, keys))
            parsed = probe.parse_json(text)
            if parsed and parsed.get("label") in cfg["LABELS"]:
                rec |= {k: parsed.get(k) for k in ("label", "safety_concern_raised", "suspected_image_manipulation", "evidence", "rationale")}
                rec["usage"] = probe.judge_usage(raw)
                break
        else:
            rec["error"] = "unparsed: " + text[:300]
    except Exception as e:
        rec["error"] = str(e)[:500]
    with lock:
        out.write(json.dumps(rec) + "\n"); out.flush()
with cf.ThreadPoolExecutor(workers) as ex:
    for i, _ in enumerate(ex.map(one, rows), 1):
        if i % 100 == 0: print(judge, i, "/", len(rows), flush=True)
print(judge, "done", len(rows))
