#!/usr/bin/env python3
"""Run the builds and every site check in one go, write one log, and report only NEW failures.

    python3 tools/check-all.py                      # preview: build this checkout, then check the deployed preview
    python3 tools/check-all.py --target local       # build, serve this checkout locally (tools/serve.py), check that
    python3 tools/check-all.py --target live        # read-only: no build, checks https://nightbiteoh.com and the live checkout
    python3 tools/check-all.py --no-build --only check-meta,sweep --log /tmp/x.log
    python3 tools/check-all.py --target local --lakes seneca,dow --shots    # limit check-waters, screenshot changed pages

Builds (in this checkout, skipped with --no-build and always skipped for live), in order:
    build-lake-pages, build-meta, stamp-version, build-updates
Checks: check-meta (0 errors), check-radius, check-docks (report only: a CHANGED dock page is a note, never a failure),
check-glance, check-bait, check-waters (every lake in js/lakes.js unless --lakes), sweep (every sitemap page).
Every browser check loads tools/no-analytics.cjs. Against live nothing is written: static checks read the live
checkout (--live-dir, default /workspace/the-night-bite) through NB_ROOT, and no build runs.

Known failures live in tools/known-failures.json. A FAIL or ERROR line that matches one is listed as known; anything
else is NEW. Exit code 1 only when there is a new failure (or a check crashed), 0 otherwise.
Log: one file at --log (default /workspace/nb-checks/<target>-<time>/check-all.log) with every check's full output;
each check's own files (glance shots, sweep.log, ...) sit next to it.
"""
import argparse, datetime, json, os, pathlib, re, socket, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
sys.stdout.reconfigure(line_buffering=True)

TOOLS = pathlib.Path(__file__).resolve().parent
ROOT = TOOLS.parent
BASES = {"preview": "https://dr0231.github.io/night-bite-preview/", "live": "https://nightbiteoh.com/"}
BUILDS = ["build-lake-pages.py", "build-meta.py", "stamp-version.py", "build-updates.py"]
CHECKS = ["check-meta", "check-radius", "check-docks", "check-glance", "check-bait", "check-waters", "sweep"]
BROWSER = {"check-glance", "check-bait", "check-waters", "sweep"}

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--target", choices=["preview", "live", "local"], default="preview")
ap.add_argument("--base", help="override the site URL for the browser checks")
ap.add_argument("--no-build", action="store_true", help="skip the builds")
ap.add_argument("--log", help="log file (default /workspace/nb-checks/<target>-<time>/check-all.log)")
ap.add_argument("--only", help="comma list of checks to run (" + ",".join(CHECKS) + ")")
ap.add_argument("--skip", help="comma list of checks to skip")
ap.add_argument("--lakes", help="comma list of lake ids for check-waters (default every lake)")
ap.add_argument("--shots", nargs="?", const="changed", help="sweep screenshots: paths a,b or 'changed' (default when bare)")
ap.add_argument("--jobs", type=int, default=2, help="browser checks run at once (default 2)")
ap.add_argument("--live-dir", default="/workspace/the-night-bite", help="live checkout, read only (target live)")
a = ap.parse_args()

stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
log_path = pathlib.Path(a.log) if a.log else pathlib.Path(f"/workspace/nb-checks/{a.target}-{stamp}/check-all.log")
OUT = log_path.parent
OUT.mkdir(parents=True, exist_ok=True)
log_lines = []


def log(s=""):
    log_lines.append(s)


def run(cmd, env=None, timeout=3600):
    t0 = time.time()
    try:
        p = subprocess.run(cmd, cwd=ROOT, env={**os.environ, **(env or {})}, capture_output=True, text=True, timeout=timeout)
        out, code = p.stdout + (("\n" + p.stderr) if p.stderr.strip() else ""), p.returncode
    except subprocess.TimeoutExpired as e:
        out, code = (e.stdout or "") if isinstance(e.stdout, str) else "", 124
        out += f"\ntimed out after {timeout}s"
    return code, out, time.time() - t0


only = set(a.only.split(",")) if a.only else set(CHECKS)
only -= set(a.skip.split(",")) if a.skip else set()
unknown = only - set(CHECKS)
if unknown:
    sys.exit("check-all: unknown check(s): " + ", ".join(sorted(unknown)))
known = json.loads((TOOLS / "known-failures.json").read_text())["known"]
notes, server = [], None
log(f"# check-all {a.target} {datetime.datetime.now().isoformat(timespec='seconds')}")

# ---- builds (never against live)
if a.target == "live":
    if not a.no_build:
        notes.append("live is read-only: builds skipped")
elif not a.no_build:
    before = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT, capture_output=True, text=True).stdout
    for b in BUILDS:
        code, out, secs = run([sys.executable, str(TOOLS / b)])
        log(f"## build {b} (exit {code}, {secs:.0f}s)\n{out.strip()}\n")
        if code:
            print(f"BUILD FAILED: {b}\n{out.strip()}")
            pathlib.Path(log_path).write_text("\n".join(log_lines) + "\n")
            sys.exit(1)
    after = subprocess.run(["git", "status", "--porcelain"], cwd=ROOT, capture_output=True, text=True).stdout
    if after != before:
        notes.append("the builds changed files in this checkout; review with git status before committing")

# ---- target
static_env = {}
if a.target == "live":
    static_env = {"NB_ROOT": a.live_dir}
    base = a.base or BASES["live"]
elif a.target == "preview":
    base = a.base or BASES["preview"]
    st = subprocess.run(["git", "status", "--porcelain", "--untracked-files=no"], cwd=ROOT, capture_output=True, text=True).stdout
    if st.strip() and only & BROWSER:
        notes.append("this checkout has uncommitted edits; browser checks test the deployed preview, not them (use --target local)")
else:
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    server = subprocess.Popen([sys.executable, str(TOOLS / "serve.py"), "--port", str(port)], cwd=ROOT,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = a.base or f"http://127.0.0.1:{port}/night-bite-preview/"
    for _ in range(50):
        try:
            socket.create_connection(("127.0.0.1", port), timeout=0.2).close(); break
        except OSError:
            time.sleep(0.1)
base = base.rstrip("/") + "/"
log(f"base {base}\n")


def fail_lines(name, out):
    if name in ("check-meta",):
        return [l[len("ERROR:"):].strip() for l in out.splitlines() if l.startswith("ERROR:")]
    if name == "check-radius":
        return [l[len("ERROR"):].strip() for l in out.splitlines() if l.startswith("ERROR ")]
    return [l[len("FAIL"):].strip() for l in out.splitlines() if l.startswith("FAIL ")]


def is_known(name, line):
    for k in known:
        if not re.fullmatch(k["check"], name):
            continue
        if k.get("target") and k["target"] != a.target:
            continue
        if re.search(k["match"], line):
            return True
    return False


def cmd_for(name):
    d = str(OUT / name)
    py = sys.executable
    return {
        "check-meta": ([py, str(TOOLS / "check-meta.py")], static_env),
        "check-radius": ([py, str(TOOLS / "check-radius.py")], static_env),
        "check-docks": ([py, str(TOOLS / "check-docks.py")], {}),
        "check-glance": (["node", str(TOOLS / "check-glance.cjs"), base, d], {}),
        "check-bait": (["node", str(TOOLS / "check-bait.cjs")], {"BASE": base, "OUT": d}),
        "check-waters": (["node", str(TOOLS / "check-waters.cjs"), base, d] + ([a.lakes] if a.lakes else []), {}),
        "sweep": (["node", str(TOOLS / "sweep.cjs"), "--base", base, "--out", d] + (["--shots", a.shots] if a.shots else []), {}),
    }[name]


def one(name):
    (OUT / name).mkdir(exist_ok=True)
    cmd, env = cmd_for(name)
    code, out, secs = run(cmd, env)
    return name, code, out, secs


results = {}
try:
    order = [c for c in CHECKS if c in only]
    with ThreadPoolExecutor(max_workers=max(1, a.jobs)) as ex:
        quick = [ex.submit(one, c) for c in order if c not in BROWSER]
        for f in quick:
            n, code, out, secs = f.result(); results[n] = (code, out, secs)
        for f in [ex.submit(one, c) for c in order if c in BROWSER]:
            n, code, out, secs = f.result(); results[n] = (code, out, secs)
finally:
    if server:
        server.terminate()

# ---- summary
new, old, summary = [], [], []
for name in [c for c in CHECKS if c in results]:
    code, out, secs = results[name]
    log(f"## {name} (exit {code}, {secs:.0f}s)\n$ {' '.join(cmd_for(name)[0])}\n{out.strip()}\n")
    fl = fail_lines(name, out)
    kn = [l for l in fl if is_known(name, l)]
    nw = [l for l in fl if not is_known(name, l)]
    if name == "check-docks":
        res = next((l for l in out.splitlines() if l.startswith("RESULT:")), "no RESULT line")
        summary.append(f"{name:13} {res[len('RESULT: '):] if res.startswith('RESULT:') else res} (report only)")
        if not res.startswith("RESULT:"):
            nw.append(f"check-docks crashed (exit {code})")
    else:
        if code and not fl:
            nw.append(f"{name} exited {code} with no FAIL lines (crashed?): {out.strip().splitlines()[-1] if out.strip() else ''}")
        last = [l for l in out.strip().splitlines() if l.strip()][-1:] or [""]
        summary.append(f"{name:13} {len(nw)} new, {len(kn)} known   [{last[0][:110]}]")
    new += [f"{name}: {l}" for l in nw]
    old += [f"{name}: {l}" for l in kn]

log("## summary\n" + "\n".join(summary))
log("## new failures\n" + ("\n".join(new) or "none"))
log("## known failures (tools/known-failures.json)\n" + ("\n".join(old) or "none"))
if notes:
    log("## notes\n" + "\n".join(notes))
log_path.write_text("\n".join(log_lines) + "\n")

print(f"check-all {a.target} ({base})")
for s in summary:
    print("  " + s)
for n in notes:
    print("  note: " + n)
if new:
    print(f"NEW FAILURES ({len(new)}):")
    for l in new[:40]:
        print("  " + l[:300])
    if len(new) > 40:
        print(f"  ... {len(new) - 40} more in the log")
print(f"{'FAILED' if new else 'OK'}: {len(new)} new, {len(old)} known. Log: {log_path}")
sys.exit(1 if new else 0)
