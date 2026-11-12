#!/usr/bin/env python3
"""Split the "What's biting now" data into one small file per lake, so a page loads only the lake it shows.

Sources (edit these, never the output): js/biting-data.js (Hoover, window.NightBiteBiting) and
js/biting-data-lakes.js (every other lake, window.NightBiteBiting<Id>). Their sources are in DATA-SOURCES.md.
Output: js/biting/<id>.js, one per lake in js/lakes.js that has a set, holding only that lake's own object
(same variable name, same values, compact JSON). js/lakes.js loads it on demand (NightBiteLakes.biting(id)) and
sw.js precaches it with the lake home (tools/sw-precache.py).

    python3 tools/biting-split.py            # write js/biting/*.js (stamp-version.py, new-lake.py and promote.py run this)
    python3 tools/biting-split.py --check    # change nothing; exit 1 if a file is stale, missing, extra, or differs
                                             # in any value from the combined source

The check evaluates the combined sources and every output file with node and compares them value by value, so a
per-lake file can never drift from the data it was split from. A lake with no set yet simply gets no file
(new-lake.py lists it on its checklist); a set for an id that is not in js/lakes.js fails.
"""
import json, os, pathlib, subprocess, sys

root = pathlib.Path(os.environ.get("NB_ROOT") or pathlib.Path(__file__).resolve().parent.parent)
SOURCES = ["js/biting-data.js", "js/biting-data-lakes.js"]
OUT = "js/biting"
HEAD = ("/* The Night Bite: what's biting now at {name}, 12 months. Built by tools/biting-split.py from {src};"
        " edit that file, not this one. Sources: DATA-SOURCES.md. Typical patterns, not a fishing report. */\n")

# evaluate files in a bare window and print every NightBiteBiting* global as JSON
NODE = r"""
const vm = require('vm'), fs = require('fs');
const out = {};
for (const f of JSON.parse(process.argv[1])) {
  const win = {};
  vm.runInNewContext(fs.readFileSync(f, 'utf8'), { window: win }, { filename: f });
  for (const k of Object.keys(win)) {
    if (!/^NightBiteBiting[A-Za-z]*$/.test(k)) continue;
    if (out[k]) throw new Error(k + ' is set twice (' + out[k].file + ', ' + f + ')');
    out[k] = { file: f, value: win[k] };
  }
}
process.stdout.write(JSON.stringify(out));
"""


def evaluate(files):
    p = subprocess.run(["node", "-e", NODE, json.dumps([str(f) for f in files])], capture_output=True, text=True)
    if p.returncode:
        print("FAIL biting-split: node could not evaluate " + ", ".join(str(f) for f in files) + "\n" + p.stderr.strip()[-600:])
        sys.exit(1)
    return json.loads(p.stdout)


def var_for(lid):
    return "NightBiteBiting" if lid == "hoover" else "NightBiteBiting" + lid[:1].upper() + lid[1:]


def lakes():
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    import registry
    reg = registry.load(root)
    return reg["order"], reg["lakes"]


def build(write=True):
    order, reg = lakes()
    src = evaluate([root / s for s in SOURCES])
    by_var = {var_for(l): l for l in order}
    problems = [f"{k} in {pathlib.Path(v['file']).relative_to(root)} matches no lake in js/lakes.js" for k, v in src.items() if k not in by_var]
    want = {}
    for lid in order:
        k = var_for(lid)
        if k not in src:
            continue
        v = src[k]["value"]
        if not isinstance(v, dict) or not isinstance(v.get("months"), list) or len(v["months"]) != 12 or not isinstance(v.get("species"), dict):
            problems.append(f"{k}: expected {{species, months[12]}}")
            continue
        name = (reg.get(lid) or {}).get("short") or lid
        rel = pathlib.Path(src[k]["file"]).relative_to(root).as_posix()
        body = json.dumps(v, ensure_ascii=False, separators=(",", ":"))
        want[f"{OUT}/{lid}.js"] = HEAD.format(name=name, src=rel) + f"window.{k} = {body};\n"
    outdir = root / OUT
    have = {f"{OUT}/{p.name}" for p in outdir.glob("*.js")} if outdir.is_dir() else set()
    extra = sorted(have - set(want))
    stale = sorted(p for p, t in want.items() if not (root / p).is_file() or (root / p).read_text(encoding="utf-8") != t)
    if write and not problems:
        outdir.mkdir(parents=True, exist_ok=True)
        for p in stale:
            (root / p).write_text(want[p], encoding="utf-8")
        for p in extra:
            (root / p).unlink()
    # value-by-value proof: every output file, evaluated on its own, equals its lake's object in the combined source
    files = sorted(root / p for p in want if (root / p).is_file())
    got = evaluate(files) if files else {}
    for p in want:
        k = var_for(pathlib.Path(p).stem)
        if (root / p).is_file() and (k not in got or got[k]["value"] != src[k]["value"]):
            problems.append(f"{p}: values differ from {pathlib.Path(src[k]['file']).relative_to(root).as_posix()}")
    no_set = [l for l in order if var_for(l) not in src]
    size = sum((root / p).stat().st_size for p in want if (root / p).is_file())
    return problems, stale, extra, len(want), size, no_set


if __name__ == "__main__":
    check = "--check" in sys.argv[1:]
    if check and os.environ.get("NB_ROOT") and not (root / OUT).is_dir() and "biting-data-lakes.js" in (root / "sw.js").read_text(encoding="utf-8"):
        print(f"PASS {root} still serves the combined biting files (a site from before v132): nothing to check")
        sys.exit(0)
    problems, stale, extra, n, size, no_set = build(write=not check)
    for p in problems:
        print("FAIL " + p)
    if problems:
        sys.exit(1)
    note = f" (no set yet: {', '.join(no_set)})" if no_set else ""
    if check:
        bad = [f"stale or missing: {p}" for p in stale] + [f"no lake set: {p}" for p in extra]
        for b in bad:
            print("FAIL " + b)
        if bad:
            print("run python3 tools/biting-split.py")
            sys.exit(1)
        print(f"PASS {n} per-lake biting files match the combined source value for value ({size / 1e3:.1f} kB){note}")
    else:
        print(f"biting-split: {'wrote ' + str(len(stale)) if stale else 'unchanged'}{', removed ' + str(len(extra)) if extra else ''}, {n} lakes, {size / 1e3:.1f} kB{note}")
