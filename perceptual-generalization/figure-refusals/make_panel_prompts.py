import csv, json, sys, types
F = sys.argv[1]
src = open(f"{F}/grade_refusals.py").read().replace("import anthropic", "")
ns = {"__name__": "x"}; exec(compile(src.split("async def grade")[0], "g", "exec"), ns)
instr = json.load(open(f"{F}/data/instructions.json"))
n = 0
with open(sys.argv[3], "w") as out:
    for r in csv.DictReader(open(f"{F}/data/counted-trials.csv")):
        if r["model"] == "gemini-3.8-flash": continue
        p = ns["transcript_path"](sys.argv[2], r)
        assert p, r["name"]
        text = ns["condense"](open(p).read())
        prompt = (f"Instruction given to the policy: {instr[r['scene']]!r}\n\n"
                  f"Condensed transcript (policy messages, tool calls and tool results; images and joint states removed):\n\n"
                  f"<transcript>\n{text}\n</transcript>\n\nGrade this trial.")
        out.write(json.dumps({"name": r["name"], "scene": r["scene"], "model": r["model"], "condition": r["paper_condition"], "prompt": prompt}) + "\n"); n += 1
print(n, "prompts")
