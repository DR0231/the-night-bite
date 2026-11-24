#!/usr/bin/env python3
"""Checks for tools/promote.py: skip list, translation memory, What's new shape, staging, stale HEAD.

Nothing is written to the live checkout (/workspace/the-night-bite). Real-mode rehearsal uses a throwaway
git tree. A full dry run of a live promote is optional:  python3 tools/check-promote.py --with-dry-run
"""
import importlib.util, json, os, pathlib, shutil, subprocess, sys, tempfile

TOOLS = pathlib.Path(__file__).resolve().parent
REPO = TOOLS.parent
LIVE = pathlib.Path("/workspace/the-night-bite")
spec = importlib.util.spec_from_file_location("promote", TOOLS / "promote.py")
promote = importlib.util.module_from_spec(spec)
spec.loader.exec_module(promote)

lines, fails = [], 0


def log(s):
    lines.append(s)
    print(s)


def check(name, ok, info=""):
    global fails
    log(("PASS " if ok else "FAIL ") + name + ((" :: " + info) if info else ""))
    if not ok:
        fails += 1


def run_promote(*args, cwd=None):
    return subprocess.run([sys.executable, str(TOOLS / "promote.py"), *args],
                          cwd=cwd or REPO, capture_output=True, text=True)


# ---------------------------------------------------------------- skip list and guard
check("live_only: whisperwood.html and whisperwood/ are skipped",
      promote.live_only("whisperwood.html") and promote.live_only("whisperwood/index.html"))
check("live_only: a stray whisperwood-icon.png is skipped (same as the guard)",
      promote.live_only("whisperwood-icon.png") and promote.guard_path("whisperwood-icon.png"))
check("live_only: previews/ and review/ are skipped",
      promote.live_only("previews/x.html") and promote.live_only("review/y.html")
      and promote.guard_path("previews/x.html") and promote.guard_path("review/y.html"))
check("live_only: a regular script is promoted", promote.live_only("js/nav.js") is False)
check("live_only: Worker drafts and DEPLOY-DRAFT.md are skipped",
      promote.live_only("workers/trip-queue/worker.draft.js") is True
      and promote.live_only("workers/trip-queue/wrangler.draft.jsonc") is True
      and promote.live_only("workers/trip-queue/DEPLOY-DRAFT.md") is True
      and promote.live_only("workers/trip-queue/check-worker-draft.mjs") is True
      and promote.live_only("workers/trip-queue/worker.js") is False
      and promote.live_only("workers/trip-queue/wrangler.jsonc") is False)
check("live_only: workflows and build-inputs go to live; other .github/ files do not",
      (not promote.live_only(".github/workflows/pages.yml")
       and not promote.live_only(".github/build-inputs/i18n-tm/ar.json")
       and promote.live_only(".github/ISSUE_TEMPLATE/bug.md")
       and promote.guard_path(".github/ISSUE_TEMPLATE/bug.md")))

# ---------------------------------------------------------------- translation memory
check("TM_RE: two-letter names still match",
      bool(promote.TM_RE.fullmatch(".github/build-inputs/i18n-tm/ar.json")))
check("TM_RE: a name with a digit or a dot matches (es-419.json, foo.bar.json)",
      bool(promote.TM_RE.fullmatch(".github/build-inputs/i18n-tm/es-419.json"))
      and bool(promote.TM_RE.fullmatch(".github/build-inputs/i18n-tm/foo.bar.json")))
check("TM_RE: a nested path does not match",
      promote.TM_RE.fullmatch(".github/build-inputs/i18n-tm/sub/x.json") is None)

# ---------------------------------------------------------------- What's new
today = "2026-11-24"
good = {"id": "test-entry", "tag": "Site", "title": "A real update",
        "bullets": ["First change.", "Second change."], "date": today,
        "links": [{"label": "Preview", "href": "https://dr0231.github.io/night-bite-preview/"}]}
out = promote.validate_whats_new_entry(good, today)
check("whats-new: a well-formed entry is accepted", out["id"] == "test-entry" and out["date"] == today)

defaulted = promote.validate_whats_new_entry(
    {"id": "n", "tag": "Site", "title": "T", "bullets": ["One bullet is enough for the type check."]}, today)
check("whats-new: a missing date defaults to today", defaulted["date"] == today)

def bad(entry, frag):
    try:
        promote.validate_whats_new_entry(entry, today)
        return False, "accepted"
    except ValueError as e:
        return frag in str(e), str(e)

ok, info = bad("not-an-object", "must be an object")
check("whats-new: a non-object is rejected", ok, info)
ok, info = bad({**{k: good[k] for k in ("id", "tag", "title")}, "bullets": "a string"}, "bullets")
check("whats-new: bullets as a string is rejected", ok, info)
ok, info = bad({**{k: good[k] for k in ("id", "tag", "title", "bullets")}, "date": "soon"}, "YYYY-MM-DD")
check("whats-new: date 'soon' is rejected", ok, info)
ok, info = bad({**good, "extra": 1}, "unknown key")
check("whats-new: unknown keys are rejected", ok, info)
ok, info = bad({**{k: good[k] for k in ("id", "tag", "title", "bullets")}, "links": [{"label": "x"}]}, "links")
check("whats-new: a link without href is rejected", ok, info)

# validation runs before any write: a bad file must not touch the live tree
live_before = subprocess.check_output(["git", "status", "--porcelain"], cwd=LIVE).decode() if LIVE.exists() else ""
badfile = pathlib.Path(tempfile.mkdtemp(prefix="nb-wn-")) / "bad.json"
badfile.write_text(json.dumps({"id": "x", "tag": "Site", "title": "Hi", "bullets": "nope", "date": today}))
r = run_promote("--whats-new", str(badfile), "--small-fix")
live_after = subprocess.check_output(["git", "status", "--porcelain"], cwd=LIVE).decode() if LIVE.exists() else ""
check("whats-new: a bad entry fails before any live write",
      r.returncode != 0 and "bullets" in (r.stderr or "") and live_before == live_after,
      f"rc={r.returncode} stderr={(r.stderr or '').strip()!r} live_changed={live_before != live_after}")

# ---------------------------------------------------------------- privacy / updates shell
priv = '''<html><head>
<script src="js/clean-url.js?v=v49-2026-11-20"></script>
<script src="js/a11y-boot.js?v=v49-2026-11-20"></script>
</head><body><p>Privacy wording stays.</p>
    <a href="updates" data-updates="2026-11-18">What's new</a>
    <!-- nb:footer-social (tools/footer-social.py) -->
    <p class="footer-social"><span class="social-label">Follow along</span></p>
    <!-- /nb:footer-social -->
</body></html>
'''
priv2 = priv.replace("v49-2026-11-20", "v50-2026-11-24").replace("2026-11-18", "2026-11-24")
check("privacy shell: stamps, clean-url and the footer follow row may change",
      promote.live_page_shell(priv) == promote.live_page_shell(priv2))
check("privacy shell: any other wording change fails",
      promote.live_page_shell(priv) != promote.live_page_shell(priv.replace("stays.", "changed.")))
upd = priv.replace("<p>Privacy wording stays.</p>",
                   "<!-- updates:start -->\nold entry\n<!-- updates:end -->\n<p>Around the list.</p>")
upd2 = upd.replace("old entry", "new entry").replace("v49-2026-11-20", "v50-2026-11-24")
check("updates shell: the entries block and allowed stamps may change",
      promote.live_page_shell(upd, updates=True) == promote.live_page_shell(upd2, updates=True))
check("updates shell: wording outside the entries block fails",
      promote.live_page_shell(upd, updates=True) != promote.live_page_shell(upd.replace("Around the list.", "Other."), updates=True))

# ---------------------------------------------------------------- named git add
src = (TOOLS / "promote.py").read_text()
check("source: no git add -A call", '"add", "-A"' not in src and "'add', '-A'" not in src)
check("source: no post-commit pull --rebase", '"pull", "--rebase"' not in src)
check("may_stage: todo, sw.js, data/updates.json, updates.html and privacy.html are named",
      all(promote.may_stage(f, {"js/nav.js"}) for f in ("js/nav.js", "sw.js", "data/updates.json", "updates.html", "privacy.html")))
check("may_stage: CNAME, whisperwood* and an untracked tools file are not staged",
      not promote.may_stage("CNAME", []) and not promote.may_stage("whisperwood-icon.png", [])
      and not promote.may_stage("tools/.i18n-coverage.json", []))
check("may_stage: a stamped lake home not in todo is a known build output",
      promote.may_stage("hoover/index.html", set()) and not promote.live_only("hoover/index.html"))

# ---------------------------------------------------------------- stale HEAD and --no-fetch in real mode (throwaway tree only)
work = pathlib.Path(tempfile.mkdtemp(prefix="nb-promote-check-"))
try:
    origin = work / "origin.git"
    clone = work / "live"
    src_tree = work / "src"
    src_tree.mkdir()
    (src_tree / "CNAME").write_text("nightbiteoh.com\n")
    (src_tree / "sw.js").write_text('var VERSION = "v1-2026-11-01";\n')
    (src_tree / "data").mkdir()
    (src_tree / "data" / "updates.json").write_text('{"entries":[]}\n')
    def g(*args, cwd=src_tree):
        return subprocess.check_output(["git", *args], cwd=cwd, text=True)
    g("init", "-q", "-b", "main")
    g("config", "user.email", "nightbite@local")
    g("config", "user.name", "The Night Bite")
    g("add", ".")
    g("commit", "-q", "-m", "base")
    subprocess.check_call(["git", "clone", "-q", "--bare", str(src_tree), str(origin)])
    shutil.copytree(src_tree, clone, ignore=shutil.ignore_patterns(".git"))
    g("init", "-q", "-b", "main", cwd=clone)
    g("config", "user.email", "nightbite@local", cwd=clone)
    g("config", "user.name", "The Night Bite", cwd=clone)
    # reuse the same commits: add remote and fetch so origin/main exists, then add a local-only commit
    subprocess.check_call(["git", "remote", "add", "origin", str(origin)], cwd=clone)
    # clone the bare better to get the same history
    shutil.rmtree(clone)
    subprocess.check_call(["git", "clone", "-q", str(origin), str(clone)])
    g("config", "user.email", "nightbite@local", cwd=clone)
    g("config", "user.name", "The Night Bite", cwd=clone)
    g("commit", "--allow-empty", "-q", "-m", "local only", cwd=clone)
    head = g("rev-parse", "HEAD", cwd=clone).strip()
    up = g("rev-parse", "origin/main", cwd=clone).strip()
    check("fixture: throwaway HEAD is ahead of its origin/main", head != up)
    r = run_promote("--live", "--confirm-push", "--small-fix", "--live-dir", str(clone))
    # must refuse before writing; CNAME still the committed bytes
    still = (clone / "CNAME").read_text() == "nightbiteoh.com\n"
    check("real mode: refuses when live HEAD is not origin/main",
          r.returncode != 0 and "origin/main" in (r.stderr or "") and still,
          f"rc={r.returncode} stderr={(r.stderr or '').strip()!r}")
    # tree should still have the empty commit only (no promote files written beyond CNAME)
    dirty = subprocess.check_output(["git", "status", "--porcelain"], cwd=clone, text=True).strip()
    check("real mode: a stale HEAD refusal leaves the throwaway tree clean", dirty == "", dirty)

    r2 = run_promote("--live", "--confirm-push", "--small-fix", "--no-fetch", "--live-dir", str(clone))
    check("real mode: --no-fetch is refused",
          r2.returncode != 0 and "no-fetch" in (r2.stderr or ""),
          f"rc={r2.returncode} stderr={(r2.stderr or '').strip()!r}")
finally:
    shutil.rmtree(work, ignore_errors=True)

# live checkout (the real one) still has only its pre-existing dirt, if any
if LIVE.exists():
    now = subprocess.check_output(["git", "status", "--porcelain"], cwd=LIVE).decode()
    check("live checkout: these checks did not change it", now == live_before, now)

# optional full dry run (writes only a temp copy; never --live)
if "--with-dry-run" in sys.argv:
    if not LIVE.exists():
        check("dry-run: live checkout present", False)
    else:
        # use a clean clone so pre-existing dirty files in the workspace live tree are not copied
        clean = pathlib.Path(tempfile.mkdtemp(prefix="nb-promote-dry-"))
        try:
            subprocess.check_call(["git", "clone", "-q", "--local", str(LIVE), str(clean / "live")])
            r = run_promote("--small-fix", "--no-fetch", "--live-dir", str(clean / "live"))
            out = (r.stdout or "") + (r.stderr or "")
            log(out[-2000:] if len(out) > 2000 else out)
            check("dry-run --small-fix: finished (temp live-dir only)",
                  "DRY RUN" in (r.stdout or "") and "nothing written" in (r.stdout or ""),
                  f"rc={r.returncode}")
        finally:
            shutil.rmtree(clean, ignore_errors=True)

log(("ALL PASSED: " + str(sum(1 for l in lines if l.startswith("PASS"))) + " pass, 0 fail")
    if not fails else (str(fails) + " FAIL, " + str(sum(1 for l in lines if l.startswith("PASS"))) + " pass"))
sys.exit(1 if fails else 0)
