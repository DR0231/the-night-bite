#!/usr/bin/env python3
"""Each lake home (<id>/index.html) ships only its own lake: no other lake's data-for block, chart or map data script,
exactly one pool chart (its own), and <html data-lake="<id>">. Also checks that the template (tools/lake-home.html)
still carries a block for every lake, since the built pages are cut from it.
Built by tools/build-lake-pages.py with tools/lake_isolate.py. Exit 1 on any problem.
    python3 tools/check-lake-isolation.py [--lakes hoover,alum]
"""
import argparse, os, pathlib, re, sys

TOOLS = pathlib.Path(__file__).resolve().parent
ROOT = pathlib.Path(os.environ.get("NB_ROOT") or TOOLS.parent)   # NB_ROOT: the live checkout (check-all --target live)
sys.path.insert(0, str(TOOLS))
import lake_isolate, registry  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--lakes", default=os.environ.get("NB_LAKES", ""), help="comma list (default: every lake; reads only local files, so it is fast)")
a = ap.parse_args()
reg = registry.load(ROOT)
lakes = [x for x in a.lakes.split(",") if x] or list(reg["order"])
bad = 0
tpl = (ROOT / "tools" / "lake-home.html").read_text()
for lake in reg["order"]:
    if f'assets/{lake}-chart.png' not in tpl:
        print(f"FAIL tools/lake-home.html: no pool chart <img> for {lake}"); bad += 1
# shared pages (water.html) carry Hoover's baked pool card; js/lake-snapshot.js swaps in each gauged lake's own snapshot
# (line and water temp). A gauged lake with no snapshot, or a temp lake whose snapshot line can't give the temp, would
# leave Hoover's numbers under its name.
SNAP_LINE = re.compile(r"^\s*[\d.]+\s*ft\s*·\s*(?:-?\d+(?:\.\d+)?\s*°F(?:\s+outflow)?|no temp|Corps profile [A-Z][a-z]{2,3}\.? \d{1,2})\s*·\s*~?[\d.]+\s*ft\s+(?:above|below)\s+full pool\s*$")
for lake in reg["order"]:
    if lake == "hoover":
        continue
    P = reg["lakes"][lake].get("pool") or {}
    if not P.get("src"):
        continue
    S = P.get("snapshot") or {}
    if not (S.get("line") and S.get("at") and S.get("when")):
        print(f"FAIL js/lakes.js {lake}: gauged lake with no pool.snapshot (line, at, when), so water.html would keep Hoover's reading"); bad += 1
        continue
    if not SNAP_LINE.match(S["line"]):
        print(f"FAIL js/lakes.js {lake}: pool.snapshot.line {S['line']!r} doesn't match the pool line pattern (js/glance.js, js/pool-readout.js)"); bad += 1
    if P.get("outflow") and "°F" in S["line"] and "outflow" not in S["line"]:
        print(f"FAIL js/lakes.js {lake}: outflow lake snapshot shows a temp without the outflow label"); bad += 1
# water.html must not carry a Hoover temp that lake-snapshot.js leaves in place for a lake with its own temp gauge
js_snap = (ROOT / "js" / "lake-snapshot.js").read_text()
if "if (temp && P.temp)" not in js_snap:
    print("FAIL js/lake-snapshot.js: no water temp swap for lakes with their own temp gauge (water.html would show Hoover's temp)"); bad += 1
for lake in lakes:
    f = ROOT / lake / "index.html"
    if not f.exists():
        print(f"FAIL {lake}/index.html missing"); bad += 1; continue
    h = f.read_text()
    probs = lake_isolate.foreign(h, lake)
    n = len(re.findall(rf'<img src="assets/{lake}-chart\.png"', h))
    if n != 1:
        probs.append(f"{n} copies of its own chart (want 1)")
    for p in probs:
        print(f"FAIL {lake}/index.html: {p}")
    bad += len(probs)
    if not probs:
        print(f"pass {lake}/index.html: own blocks only, 1 chart, own map data")
print(f"check-lake-isolation: {len(lakes)} lake homes, {bad} problem(s)")
sys.exit(1 if bad else 0)
