#!/usr/bin/env python3
"""Run the builds and every site check in one go, write one log, and report only NEW failures.

    python3 tools/check-all.py                      # preview: build this checkout, then check the deployed preview
    python3 tools/check-all.py --target local       # build, serve this checkout locally (tools/serve.py), check that
    python3 tools/check-all.py --target live        # read-only: no build, checks https://nightbiteoh.com and the live checkout
    python3 tools/check-all.py --no-build --only check-meta,sweep --log /tmp/x.log
    python3 tools/check-all.py --target local --lakes seneca,dow --shots    # limit the lake checks, screenshot changed pages
    python3 tools/check-all.py --target local --all-lakes                  # every lake, in groups of 5, resumable
    python3 tools/check-all.py --target local --all-lakes --group 2        # just one group (one short step per wait)

Lake scope (check-waters, check-glance, check-glance-fallback, check-bait). A run never covers every lake by accident:
    --lakes a,b     exactly those lakes
    (neither)       the lakes whose files differ from origin/main (git diff, plus uncommitted and untracked files)
                    plus hoover as the reference; the choice is printed. Shared files (css, js, data) are listed too,
                    since they can touch every lake: add --lakes or use --all-lakes when that matters.
    --all-lakes     an explicit full run. Lakes are split into groups of --group-size (default 5). Each group runs as
                    its own check-all (no rebuild) and writes <state-dir>/group-N.json, plus a "site" group for the
                    static checks and the sweep. Rerunning the same command skips groups already done, so an
                    interrupted run resumes; --fresh starts over. Default state dir /workspace/nb-checks/all-lakes-<target>/.

Builds (in this checkout, skipped with --no-build and always skipped for live), in order:
    build-lake-pages, build-docks, build-meta, stamp-version, build-updates, wrap-dates (S13)
Checks: check-meta (0 errors), check-radius, check-docks (report only: a CHANGED dock page is a note, never a failure),
check-night-rules (the chip and a mocked NWS storm banner above the fold at 390, red light and high contrast; browser),
check-hours (night-rules data has official sources and every chip matches it; static),
check-ramp-names (one Hoover ramp spelling site-wide, lists match the map pins, every ramp pin has Directions; static),
check-lake-isolation (each lake home in scope ships only its own blocks, chart and map data; static, fast),
check-glance, check-glance-fallback (USGS and NWS blocked, and JavaScript off, at 320 and 430 px: no placeholder,
a visible timestamp), check-bait, check-waters (the lake scope above), check-picker-flow (the water picker and switching
lakes from the header pill, about 1 minute), check-a11y-settings (Display panel: each setting applies, persists
after a reload and is set before first paint, at 390 and 1280 on /, hoover/ and species/, about 30 s),
check-trip-queue (Share a trip: queue down falls back to email/GitHub; a check trip sent for real lands pending, then is rejected and gone; needs /home/box/.nightbite/trip-queue-admin-token)
check-log-io (Log empty states, no dev notes, backup export, clear, import round trip with an old-format trip, merge
without duplicates, bad files refused; about 10 s), check-i18n (string files: missing keys per language, placeholders,
protected words, draft flag; static), check-i18n-browser (language picker: Spanish applies, persists, falls back to English
for a missing key; facts stay English; about 20 s), sweep (every sitemap page).
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
BUILDS = ["build-lake-pages.py", "build-docks.py", "build-meta.py", "stamp-version.py", "build-updates.py", "wrap-dates.py", "i18n-extract.py"]
CHECKS = ["check-meta", "check-radius", "check-hours", "check-ramp-names", "check-docks", "check-lake-isolation", "check-glance", "check-glance-fallback", "check-bait", "check-waters", "check-picker-flow", "check-a11y-settings", "check-log-io", "check-trip-queue", "check-night-rules", "check-i18n", "check-i18n-browser", "sweep"]
BROWSER = {"check-glance", "check-glance-fallback", "check-bait", "check-waters", "check-picker-flow", "check-a11y-settings", "check-log-io", "check-trip-queue", "check-i18n-browser", "sweep"}

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--target", choices=["preview", "live", "local"], default="preview")
ap.add_argument("--base", help="override the site URL for the browser checks")
ap.add_argument("--no-build", action="store_true", help="skip the builds")
ap.add_argument("--log", help="log file (default /workspace/nb-checks/<target>-<time>/check-all.log)")
ap.add_argument("--only", help="comma list of checks to run (" + ",".join(CHECKS) + ")")
ap.add_argument("--skip", help="comma list of checks to skip")
ap.add_argument("--lakes", help="comma list of lake ids for the lake checks (default: changed vs origin/main, plus hoover)")
ap.add_argument("--all-lakes", action="store_true", help="explicit full run over every lake, in resumable groups")
ap.add_argument("--group", help="with --all-lakes: run only this group (a number, or 'site')")
ap.add_argument("--group-size", type=int, default=5, help="with --all-lakes: lakes per group (default 5)")
ap.add_argument("--state-dir", help="with --all-lakes: where group results go (default /workspace/nb-checks/all-lakes-<target>/)")
ap.add_argument("--fresh", action="store_true", help="with --all-lakes: forget earlier group results and start over")
ap.add_argument("--base-ref", default="origin/main", help="git ref the default lake scope is diffed against")
ap.add_argument("--shots", nargs="?", const="changed", help="sweep screenshots: paths a,b or 'changed' (default when bare)")
ap.add_argument("--jobs", type=int, default=2, help="browser checks run at once (default 2)")
ap.add_argument("--live-dir", default="/workspace/the-night-bite", help="live checkout, read only (target live)")
a = ap.parse_args()
sys.path.insert(0, str(TOOLS))
import registry  # noqa: E402

if a.lakes and a.all_lakes:
    sys.exit("check-all: use --lakes or --all-lakes, not both")
if (a.group or a.fresh) and not a.all_lakes:
    sys.exit("check-all: --group and --fresh only go with --all-lakes")
ALL_IDS = registry.load()["order"]
LAKE_CHECKS = {"check-night-rules", "check-lake-isolation", "check-glance", "check-glance-fallback", "check-bait", "check-waters"}


def all_lakes_run():
    """Explicit full run: one 'site' group (static checks + sweep), then lake groups of --group-size, each a child
    check-all with --lakes and --no-build, each writing group-N.json so a rerun resumes where it stopped."""
    size = max(1, a.group_size)
    groups = {"site": None}
    for i in range(0, len(ALL_IDS), size):
        groups[str(i // size + 1)] = ALL_IDS[i:i + size]
    state = pathlib.Path(a.state_dir or f"/workspace/nb-checks/all-lakes-{a.target}")
    state.mkdir(parents=True, exist_ok=True)
    if a.fresh:
        for f in state.glob("group-*.json"):
            f.unlink()
    plan = {k: v for k, v in groups.items() if a.group in (None, k)}
    if not plan:
        sys.exit(f"check-all: no group {a.group}; groups are " + ", ".join(groups))
    print(f"check-all --all-lakes {a.target}: {len(ALL_IDS)} lakes in {len(groups) - 1} groups of {size} plus 'site'. State: {state}")
    for k, v in groups.items():
        print(f"  group {k}: {'static checks + sweep' if v is None else ','.join(v)}")
    if a.target != "live" and not a.no_build and a.group in (None, "site"):
        for b in BUILDS:
            p = subprocess.run([sys.executable, str(TOOLS / b)], cwd=ROOT, capture_output=True, text=True)
            if p.returncode:
                sys.exit(f"BUILD FAILED: {b}\n{p.stdout}{p.stderr}")
    passthru = ["--target", a.target, "--jobs", str(a.jobs), "--live-dir", a.live_dir] + (["--base", a.base] if a.base else [])
    worst = 0
    for k, v in plan.items():
        res = state / f"group-{k}.json"
        if res.exists() and json.loads(res.read_text()).get("exit") == 0:
            print(f"  group {k}: done earlier, skipped ({res})")
            continue
        sel = [c for c in CHECKS if c in only]
        sel = [c for c in sel if (c in LAKE_CHECKS) == (v is not None)]
        if not sel:
            continue
        cmd = [sys.executable, str(TOOLS / "check-all.py"), *passthru, "--no-build", "--only", ",".join(sel),
               "--log", str(state / f"group-{k}" / "check-all.log")] + (["--lakes", ",".join(v)] if v else ["--lakes", "hoover"])
        if a.shots and v is None:
            cmd += ["--shots", a.shots]
        print(f"  group {k}: running {','.join(sel)}" + (f" on {','.join(v)}" if v else ""))
        t0 = time.time()
        p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        tail = [l for l in p.stdout.strip().splitlines() if l.strip()][-1:] or [""]
        res.write_text(json.dumps({"group": k, "lakes": v, "checks": sel, "exit": p.returncode, "secs": round(time.time() - t0),
                                   "result": tail[0], "log": str(state / f"group-{k}" / "check-all.log"),
                                   "at": datetime.datetime.now().isoformat(timespec="seconds")}, indent=1) + "\n")
        print(f"  group {k}: exit {p.returncode} in {time.time() - t0:.0f}s :: {tail[0]}")
        worst = max(worst, p.returncode)
    has = lambda v: any(c in only and (c in LAKE_CHECKS) == (v is not None) for c in CHECKS)
    left = [k for k, v in groups.items() if has(v) and not ((state / f"group-{k}.json").exists() and json.loads((state / f"group-{k}.json").read_text()).get("exit") == 0)]
    print("all groups passed" if not left else "groups not passed yet: " + ", ".join(left) + " (rerun the same command to resume)")
    sys.exit(1 if worst else 0)

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
if a.all_lakes:
    all_lakes_run()

# ---- lake scope: never every lake by accident
if a.lakes:
    LAKES = [x for x in a.lakes.split(",") if x]
    bad = [x for x in LAKES if x not in ALL_IDS]
    if bad:
        sys.exit("check-all: unknown lake(s): " + ", ".join(bad))
    scope_note = "lakes from --lakes: " + ",".join(LAKES)
else:
    ch = registry.changed(a.base_ref)
    if ch.get("error"):
        print("check-all: " + ch["error"] + "; scoping to hoover")
    LAKES = [x for x in ALL_IDS if x in set(ch.get("lakes", [])) | {"hoover"}]
    scope_note = (f"lakes changed vs {a.base_ref}: {','.join(ch.get('lakes', [])) or 'none'}, plus hoover -> {','.join(LAKES)}"
                  + (f" (shared files also changed: {', '.join(ch['shared'][:6])}{' ...' if len(ch['shared']) > 6 else ''};"
                     " add --lakes or use --all-lakes for more)" if ch.get("shared") else ""))
if only & LAKE_CHECKS:
    print("check-all scope: " + scope_note)
known = json.loads((TOOLS / "known-failures.json").read_text())["known"]
notes, server = [], None
log(f"# check-all {a.target} {datetime.datetime.now().isoformat(timespec='seconds')}")
log("scope " + scope_note)

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
    if name in ("check-radius", "check-hours", "check-ramp-names"):
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
        "check-hours": ([py, str(TOOLS / "check-hours.py")], static_env),
        "check-ramp-names": ([py, str(TOOLS / "check-ramp-names.py")], static_env),
        "check-i18n": ([py, str(TOOLS / "check-i18n.py")], static_env),
        "check-i18n-browser": (["node", str(TOOLS / "check-i18n.cjs"), base, d], {}),
        "check-docks": ([py, str(TOOLS / "check-docks.py")], {}),
        "check-lake-isolation": ([py, str(TOOLS / "check-lake-isolation.py")], dict(static_env, NB_LAKES=",".join(LAKES))),
        "check-glance": (["node", str(TOOLS / "check-glance.cjs"), base, d], {"NB_LAKES": ",".join(LAKES)}),
        "check-night-rules": (["node", str(TOOLS / "check-night-rules.cjs"), base, d], {"NB_LAKES": ",".join(LAKES)}),
        "check-glance-fallback": (["node", str(TOOLS / "check-glance-fallback.cjs"), base, d], {"NB_LAKES": ",".join(LAKES)}),
        "check-bait": (["node", str(TOOLS / "check-bait.cjs")], {"BASE": base, "OUT": d, "NB_LAKES": ",".join(LAKES)}),
        "check-waters": (["node", str(TOOLS / "check-waters.cjs"), base, d, ",".join(LAKES)], {}),
        "check-picker-flow": (["node", str(TOOLS / "check-picker-flow.cjs"), base, d], {}),
        "check-a11y-settings": (["node", str(TOOLS / "check-a11y-settings.cjs"), base, d], {}),
        "check-log-io": (["node", str(TOOLS / "check-log-io.cjs"), base, d], {}),
        "check-trip-queue": (["node", str(TOOLS / "check-trip-queue.cjs"), base, d], {}),
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
if only & LAKE_CHECKS:
    print("  scope: " + scope_note)
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
