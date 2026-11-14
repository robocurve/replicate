"""List every Gemini 3.8 Flash trial in a paper-campaign state dir (archives included) from its cohort logs.

Usage: python3 collect_flash38_cohorts.py STATE_DIR > out.tsv   (scene, condition, rig, stamp, status, log file)
"""
import re, sys, os, collections
START = re.compile(r"cohort start (rig-\d+) (\S+) (\S+) (\S+)")
TRIAL = re.compile(r"trial \d+ (\d{8}T\d{6}Z) status=(\S+)")
root = sys.argv[1]
out = []
for dp, dn, fn in os.walk(root):
    for f in fn:
        if "flash38" not in f or not (f.endswith(".log") or ".log." in f):
            continue
        p = os.path.join(dp, f)
        cur = None
        for line in open(p, errors="replace"):
            m = START.search(line)
            if m:
                cur = m.groups(); continue
            m = TRIAL.search(line)
            if m and cur and cur[3] == "flash38":
                out.append((cur[1], cur[2], cur[0], m[1], m[2], os.path.relpath(p, root)))
for r in out:
    print("\t".join(r))
