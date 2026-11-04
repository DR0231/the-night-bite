#!/usr/bin/env python3
"""Hoover ramp names: one spelling site-wide (static).

ERROR lines for:
  * an old ramp spelling (the alias keys in tools/build-hoover-ramps.py, plus Redbank / Walnut Road / Maxtown ramp)
    in any page, script or data file outside the alias table itself
  * the water.html table, log.html selects or js/lakes.js spots out of date with js/hoover-map-data.js
  * a Hoover ramp pin without Directions coordinates
"""
import os, re, sys, json, subprocess, importlib.util
from pathlib import Path

ROOT = Path(os.environ.get("NB_ROOT") or Path(__file__).resolve().parent.parent)
TOOLS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("bhr", TOOLS / "build-hoover-ramps.py")
bhr = importlib.util.module_from_spec(spec); spec.loader.exec_module(bhr)

BAD = [r"\bRedbank\b", r"\bWalnut Road\b", r"\bMaxtown ramp\b", r"\bOxbow \(upper ramp\)", r"\bMaxtown\b(?! Rd)"]
BAD += [re.escape(k) for k in bhr.ALIASES if k not in ("Oxbow", "Maxtown", "Other / not sure", "Other public / not sure")]
pat = re.compile("|".join(sorted(set(BAD))))
SKIP_DIRS = {".git", "node_modules", "tools", "whisperwood", "assets"}
errors = 0
files = 0
for dp, dn, fn in os.walk(ROOT):
    dn[:] = [d for d in dn if d not in SKIP_DIRS and not d.startswith(".")]
    for f in fn:
        if not f.endswith((".html", ".js", ".json")) or f.startswith("whisperwood"):
            continue
        p = Path(dp) / f
        files += 1
        for i, line in enumerate(p.read_text(errors="ignore").splitlines(), 1):
            if "nb:hoover-ramps" in line:      # the alias table in js/lakes.js
                continue
            for m in pat.finditer(line):
                print("ERROR %s:%d old ramp name %r" % (p.relative_to(ROOT), i, m.group(0)))
                errors += 1

r = subprocess.run([sys.executable, str(TOOLS / "build-hoover-ramps.py"), "--check"], capture_output=True, text=True, cwd=ROOT)
if r.returncode != 0:
    print("ERROR ramp lists out of date with js/hoover-map-data.js (%s); run tools/build-hoover-ramps.py" % (r.stdout.strip() or r.stderr.strip()))
    errors += 1
for p in bhr.load():
    d = p.get("directions") or []
    if len(d) != 2 or not all(isinstance(x, (int, float)) for x in d):
        print("ERROR pin %s (%s) has no Directions coordinates" % (p["id"], p["name"]))
        errors += 1
qf = json.loads((ROOT / "data/quick-facts.json").read_text())
qtext = json.dumps(qf.get("hoover", qf.get("lakes", {}).get("hoover", {})))
for p in bhr.load():
    if p["type"] == "ramp" and p["name"].replace(" ramp", "") not in qtext:
        print("ERROR data/quick-facts.json Hoover ramps line is missing %s" % p["name"])
        errors += 1
print("check-ramp-names: %d files, %d ramp pins, %d errors" % (files, len(bhr.load()), errors))
sys.exit(1 if errors else 0)
