#!/usr/bin/env python3
"""Promote the preview (DR0231/night-bite-preview) to the live site's working tree (DR0231/the-night-bite).

DRY RUN BY DEFAULT. Real mode (--live --confirm-push) writes into the live checkout and is used ONLY after D'Angelo
has said "push" in chat for this promotion. Without that word in chat, run the dry run and report what it shows.

    python3 tools/promote.py                                   # dry run: what would change on live, writes nothing
    python3 tools/promote.py --whats-new entry.json            # dry run including the new What's new entry
    python3 tools/promote.py --live --confirm-push --whats-new entry.json            # after "push": write live tree
    python3 tools/promote.py --live --confirm-push --whats-new entry.json --commit   # ...and commit (no push)
    python3 tools/promote.py --live --confirm-push --commit --push                  # ...pull --rebase, push (never force)
    python3 tools/promote.py --small-fix                                            # dry run for a small fix (no What's new entry)
    python3 tools/promote.py --live --confirm-push --small-fix --commit --push      # small fix: skip only the What's new requirement
    python3 tools/promote.py --live --confirm-push --live-dir /tmp/live-copy        # rehearse on a copy

What it does (the v20/v21 promote steps, generalized):
  · files: everything that changed in the preview between --base (default: the end of the range in live's last
    "Promote preview A..B" commit) and --ref (default origin/main), read from git, not the working tree. --all takes
    every tracked file instead. Live-only files are never written: CNAME, robots.txt, the IndexNow key file,
    google*.html, privacy.html, data/updates.json, updates.html, whisperwood*, previews/, review/, .github/.
  · html: CSP gets Cloudflare Insights (live CSP kept when it differs), the analytics beacon before </body> (not
    offline.html), robots noindex,nofollow removed (404 and offline keep noindex), Preview chip removed,
    /night-bite-preview/ becomes /, Whisperwood links relative, live's pool lead, Checked time and water temp kept.
  · css: the "Preview copy only" block is dropped. sw.js: PREFIX nb-live-, VERSION (--version, default the next vN
    with today's date). DATA-SOURCES.md: live title. Anything else is copied as is.
  · --whats-new FILE: a JSON entry or a JSON array of entries (id, tag, title, bullets, links; date defaults to today) added at the top of
    live data/updates.json. Then the build order runs in the live tree: build-lake-pages, build-docks, build-meta,
    stamp-version, build-updates.
  · --small-fix: skip only the What's new entry requirement, for small fixes that get no entry. The VERSION bump
    check and every other check still apply.
Checks (real mode refuses, dry run reports and exits 1): a new dated What's new entry in live data/updates.json that
is not in live HEAD (skipped with --small-fix); VERSION newer than live HEAD's; no preview URLs, chip or
noindex,nofollow on any page; beacon once per page; live-only files and whisperwood/ unchanged; live tree clean
before a real run.
Nothing is committed without --commit, nothing pushed without --push, and it never force-pushes. After a push it
prints the IndexNow command; it does not run it.
"""
import argparse, datetime, difflib, filecmp, json, os, pathlib, re, shutil, subprocess, sys, tempfile

TOOLS = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS))
import registry  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--preview", default=str(TOOLS.parent), help="preview checkout (any branch; files are read from --ref)")
ap.add_argument("--ref", default="origin/main", help="preview commit to promote (default origin/main)")
ap.add_argument("--base", help="preview commit live already has (default: from live's last 'Promote preview A..B' commit)")
ap.add_argument("--all", action="store_true", help="transform every tracked preview file, not just base..ref")
ap.add_argument("--live-dir", default="/workspace/the-night-bite", help="live checkout (default /workspace/the-night-bite)")
ap.add_argument("--version", help='sw.js VERSION for live (default next vN, e.g. "v22-2026-11-01")')
ap.add_argument("--whats-new", metavar="FILE", help="JSON What's new entry, or a JSON array of entries, to add to live data/updates.json")
ap.add_argument("--small-fix", action="store_true", help="skip only the What's new entry requirement (small fixes get no entry); the VERSION bump and every other check still apply")
ap.add_argument("--live", action="store_true", help="REAL MODE: write into --live-dir. Only after D'Angelo said \"push\" in chat")
ap.add_argument("--confirm-push", action="store_true", help="required with --live: confirms D'Angelo said \"push\" in chat")
ap.add_argument("--commit", action="store_true", help="real mode: commit the promoted files in the live checkout")
ap.add_argument("--push", action="store_true", help="real mode with --commit: git pull --rebase, then push (never force)")
ap.add_argument("--no-fetch", action="store_true", help="do not git fetch the preview or live before reading")
ap.add_argument("--show-diff", action="store_true", help="dry run: print a unified diff of each changed text file")
a = ap.parse_args()

PV = pathlib.Path(a.preview).resolve()
LIVE = pathlib.Path(a.live_dir).resolve()
REAL = a.live
today = datetime.date.today().isoformat()
GIT_ID = ["-c", "user.email=nightbite@local", "-c", "user.name=The Night Bite"]


def die(msg, code=2):
    print("promote: " + msg, file=sys.stderr)
    sys.exit(code)


def git(cwd, *args, check=True, binary=False):
    p = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=not binary)
    if check and p.returncode:
        die(f"git {' '.join(args)} in {cwd} failed: {p.stderr if not binary else p.stderr.decode()}")
    return p.stdout


if REAL and not a.confirm_push:
    die('real mode needs --live --confirm-push, and is only used after D\'Angelo has said "push" in chat')
if a.confirm_push and not REAL:
    die("--confirm-push only goes with --live")
if (a.commit or a.push) and not REAL:
    die("--commit and --push only go with --live --confirm-push")
if a.push and not a.commit:
    die("--push needs --commit")
if not (LIVE / ".git").exists():
    die(f"{LIVE} is not a git checkout of the live repo")
if not (LIVE / "CNAME").exists():
    die(f"{LIVE} has no CNAME: not the live site?")
if PV == LIVE or (PV / "CNAME").exists():
    die("--preview points at a live tree")

# ---------------------------------------------------------------- what to promote
if not a.no_fetch:
    git(PV, "fetch", "--quiet", "origin")
    if REAL:
        git(LIVE, "fetch", "--quiet", "origin")
ref = git(PV, "rev-parse", "--verify", a.ref + "^{commit}").strip()
if REAL:
    if git(LIVE, "status", "--porcelain").strip():
        die(f"live tree {LIVE} has uncommitted changes; commit or clean them first")
    up = subprocess.run(["git", "rev-parse", "--verify", "-q", "origin/main"], cwd=LIVE, capture_output=True, text=True).stdout.strip()
    if up and git(LIVE, "rev-parse", "HEAD").strip() != up:
        print(f"note: live HEAD is not origin/main ({up[:7]}); --push pulls with --rebase first")
base = a.base
if not base and not a.all:
    log = git(LIVE, "log", "--format=%s", "-n", "200")
    m = re.search(r"Promote preview [0-9a-f]+\.\.([0-9a-f]+)", log)
    if not m:
        die("no 'Promote preview A..B' commit in live history; pass --base or --all")
    base = m.group(1)
if base:
    base = git(PV, "rev-parse", "--verify", base + "^{commit}").strip()
    rows = [l.split("\t") for l in git(PV, "diff", "--name-status", "--no-renames", base, ref).splitlines() if l]
    files = [r[-1] for r in rows if r[0] != "D"]
    deleted = [r[-1] for r in rows if r[0] == "D"]
else:
    files = [f for f in git(PV, "ls-tree", "-r", "--name-only", ref).splitlines() if f]
    deleted = []

SKIP_EXACT = {"whisperwood.html", "robots.txt", "robots.live.txt", ".gitignore", "SERVICE-WORKER.md", "README.md",
              "privacy.html", "data/updates.json", "updates.html", "CNAME"}
SKIP_PREFIX = ("whisperwood/", "previews/", "review/", ".github/")


def live_only(f):
    return (f in SKIP_EXACT or f.startswith(SKIP_PREFIX) or "__pycache__" in f
            or re.fullmatch(r"google[0-9a-f]+\.html", f) or re.fullmatch(r"[0-9a-f]{32}\.txt", f))


todo = [f for f in files if not live_only(f)]
skipped = [f for f in files if live_only(f)]

# ---------------------------------------------------------------- transforms (v21 promote.py)
BEACON = ("<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' "
          "data-cf-beacon='{\"token\": \"145e7409a0914c4cb3ccff3fffe4f1f4\"}'></script><!-- End Cloudflare Web Analytics -->")
CHIP = '      <p class="preview-chip-row"><span class="preview-chip" title="Test copy. Changes here are not on nightbiteoh.com yet.">Preview</span></p>\n'
SNAP = [r'^\s*<p class="pool-lead" id="correction-line">.*$', r'^\s*Checked: <time datetime=.*$', r'^\s*<span class="value" id="water-temp">.*$']
STUBS = ("docks.html", "tournaments.html")   # redirect stubs: live keeps script-src 'self' and no beacon
CSP_RE = r'<meta http-equiv="Content-Security-Policy" content="([^"]*)"'


def csp(c, f):
    if f == "offline.html":
        return c
    c = c.replace("script-src 'self';", "script-src 'self' https://static.cloudflareinsights.com;", 1)
    c = re.sub(r"(connect-src [^;]*)", lambda m: m.group(1) + " https://cloudflareinsights.com", c, count=1)
    assert "static.cloudflareinsights.com" in c and "api.waterdata.usgs.gov" in c, f
    return c


def html(f, s, old):
    if f in STUBS:
        s = s.replace('  <meta name="robots" content="noindex,nofollow">\n', "").replace("/night-bite-preview/", "/")
        assert "night-bite-preview" not in s and "dr0231.github.io" not in s.lower(), f
        return s
    s, n = re.subn(r'(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(")', lambda m: m.group(1) + csp(m.group(2), f) + m.group(3), s)
    assert n == 1, f"{f}: expected one CSP meta"
    if f in ("404.html", "offline.html"):
        s, n = re.subn(r'  <meta name="robots" content="noindex,nofollow">', '  <meta name="robots" content="noindex">', s)
    else:
        s, n = re.subn(r'  <meta name="robots" content="noindex,nofollow">\n', "", s)
    assert n == 1, f"{f}: expected one robots noindex,nofollow meta in the preview copy"
    s = s.replace(CHIP, "")
    s = s.replace("/night-bite-preview/", "/")
    depth = f.count("/")
    s = s.replace('href="https://nightbiteoh.com/whisperwood/', 'href="' + "../" * depth + 'whisperwood/')
    if f != "offline.html":
        assert BEACON not in s, f
        i = s.rindex("</body>")
        s = s[:i] + BEACON + "\n" + s[i:]
    if old is not None:
        for pat in SNAP:
            o = re.search(pat, old, re.M); m = re.search(pat, s, re.M)
            if o and m:
                s = s[:m.start()] + o.group(0) + s[m.end():]
    assert "night-bite-preview" not in s and "dr0231.github.io" not in s.lower() and "preview-chip" not in s, f
    return s


def live_version():
    m = re.search(r'var VERSION = "([^"]*)";', git(LIVE, "show", "HEAD:sw.js"))
    return m.group(1) if m else None


def vnum(v):
    m = re.match(r"v(\d+)-(\d{4}-\d{2}-\d{2})$", v or "")
    return (int(m.group(1)), m.group(2)) if m else None


old_ver = live_version()
if a.version:
    VER = a.version
else:
    n = vnum(old_ver)
    if not n:
        die(f"cannot read live VERSION ({old_ver!r}); pass --version")
    VER = f"v{n[0] + 1}-{today}"


def transform(f, data, dst):
    """bytes of preview file f -> bytes for live"""
    if f.endswith(".html"):
        old = dst.read_text(encoding="utf-8") if dst.exists() else None
        snap_from = old
        if old is None and f == "hoover/index.html":
            # first promote after the water picker (v65): live's snapshot lines are still in the old root index.html
            snap_from = git(LIVE, "show", "HEAD:index.html", check=False) or None   # live's last commit, not this run's
            if snap_from:
                notes.append("hoover/index.html: snapshot lines taken from live's old root index.html (first promote)")
        out = html(f, data.decode("utf-8"), snap_from)
        if old is not None and f not in STUBS:
            lc = re.search(CSP_RE, old); nc = re.search(CSP_RE, out)
            if lc and nc and lc.group(1) != nc.group(1):
                notes.append(f"CSP differs, kept live's: {f}")
                out = out.replace(nc.group(1), lc.group(1), 1)
        return out.encode("utf-8")
    if f == "css/styles.css":
        s = data.decode("utf-8")
        try:
            i = s.index("/* ==========================================================================\n   Preview copy only")
            j = s.index("/* ====", i + 10)
        except ValueError:
            raise AssertionError("css/styles.css: 'Preview copy only' block not found")
        s = s[:i] + s[j:]
        s = s.replace("   Preview features: conditions card", "   Live data features: conditions card")
        assert "preview-chip" not in s, f
        return s.encode("utf-8")
    if f == "sw.js":
        s = data.decode("utf-8")
        s = s.replace(" * The Night Bite service worker (preview build).\n * Lives at the site root so its scope is the whole site: /night-bite-preview/ here, / on nightbiteoh.com.",
                      " * The Night Bite service worker (nightbiteoh.com).\n * Lives at the site root so its scope is the whole site (/). The preview copy runs the same file under /night-bite-preview/.")
        s = s.replace("with the same PREFIX only (other sites on the same origin, like other github.io projects, are left alone).", "with the same PREFIX only.")
        s = s.replace('var PREFIX = "nb-preview-";', 'var PREFIX = "nb-live-";')
        s = re.sub(r'var VERSION = "[^"]*";', 'var VERSION = "%s";' % VER, s)
        assert "nb-preview" not in s and "(preview build)" not in s and 'var PREFIX = "nb-live-";' in s, f
        return s.encode("utf-8")
    if f == "DATA-SOURCES.md":
        s = data.decode("utf-8").replace("# Data sources (preview features)", "# Data sources (live data features)", 1)
        return re.sub(r" \(preview\)", "", s).encode("utf-8")
    return data


# ---------------------------------------------------------------- apply into the target tree
notes, problems = [], []
if REAL:
    T = LIVE
    tmp = None
else:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="nb-promote-dry-"))
    T = tmp / "live"
    shutil.copytree(LIVE, T, ignore=shutil.ignore_patterns(".git", "__pycache__"), symlinks=True)


def snapshot(root, pred):
    return {p.relative_to(root).as_posix(): p.read_bytes() for p in root.rglob("*")
            if p.is_file() and ".git" not in p.parts and "__pycache__" not in p.parts and pred(p.relative_to(root).as_posix())}


guard = lambda r: r.startswith("whisperwood") or r in ("CNAME", "robots.txt") or re.fullmatch(r"google[0-9a-f]+\.html|[0-9a-f]{32}\.txt", r)
before_guard = snapshot(T, guard)
try:
    for f in todo:
        data = git(PV, "show", f"{ref}:{f}", binary=True)
        dst = T / f
        dst.parent.mkdir(parents=True, exist_ok=True)
        out = transform(f, data, dst)
        dst.write_bytes(out)
except AssertionError as e:
    die(f"transform stopped: {e}", 1)
if "sw.js" not in todo:   # every promotion gets a new cache VERSION, even when the preview's sw.js did not change
    sw = (T / "sw.js").read_text()
    (T / "sw.js").write_text(re.sub(r'var VERSION = "[^"]*";', 'var VERSION = "%s";' % VER, sw, count=1))

if a.whats_new:
    raw = json.loads(pathlib.Path(a.whats_new).read_text())
    incoming = raw if isinstance(raw, list) else [raw]
    up_t = (T / "data/updates.json").read_text(); up = json.loads(up_t)
    added = 0
    for E in incoming:
        E = dict(E)
        E.pop("draft", None)
        E["date"] = E.get("date") or today
        for k in ("id", "tag", "title", "bullets"):
            if not E.get(k):
                die(f"--whats-new entry needs {k}")
        if any(x.get("id") == E["id"] for x in up["entries"]):
            notes.append(f"What's new entry {E['id']} already in live data/updates.json; not added again")
        else:
            keys = ["id", "date", "tag", "title", "bullets", "links"]
            up["entries"].insert(added, {k: E[k] for k in keys if k in E} | {k: v for k, v in E.items() if k not in keys})
            added += 1
    if added:
        (T / "data/updates.json").write_text(registry.dump_like(up_t, up))

build_log = []
for b in ("build-lake-pages.py", "build-docks.py", "build-meta.py", "stamp-version.py", "build-updates.py"):
    p = subprocess.run([sys.executable, str(T / "tools" / b)], cwd=T, capture_output=True, text=True)
    last = (p.stdout.strip().splitlines() or [""])[-1]
    build_log.append(f"{b}: {'ok' if p.returncode == 0 else 'FAILED'} {last}")
    if p.returncode:
        problems.append(f"{b} failed: {(p.stdout + p.stderr).strip()[-400:]}")
        break

# ---------------------------------------------------------------- checks
head_up = json.loads(git(LIVE, "show", "HEAD:data/updates.json"))
head_ids = {x.get("id") for x in head_up["entries"]}
now_up = json.loads((T / "data/updates.json").read_text())
new_entries = [x for x in now_up["entries"] if x.get("id") not in head_ids and x.get("date") and not x.get("draft")]
if not new_entries and not a.small_fix:
    problems.append("no new dated What's new entry in live data/updates.json (pass --whats-new FILE, or --small-fix)")
sw_now = re.search(r'var VERSION = "([^"]*)";', (T / "sw.js").read_text()).group(1)
if not (vnum(sw_now) and vnum(old_ver) and vnum(sw_now) > vnum(old_ver)):
    problems.append(f"sw.js VERSION {sw_now} is not newer than live {old_ver}")
for p in sorted(T.rglob("*.html")):
    r = p.relative_to(T).as_posix()
    if r.startswith(("whisperwood", "previews/", "review/")) or re.fullmatch(r"google[0-9a-f]+\.html", r):
        continue
    s = p.read_text(encoding="utf-8")
    if "night-bite-preview" in s or "dr0231.github.io" in s.lower() or "preview-chip" in s:
        problems.append(f"{r}: preview URL or chip left in")
    if 'content="noindex,nofollow"' in s:
        problems.append(f"{r}: robots noindex,nofollow left in")
    want = 0 if r in STUBS or r == "offline.html" else 1
    if s.count("static.cloudflareinsights.com/beacon.min.js") != want and r not in STUBS:
        problems.append(f"{r}: beacon count {s.count('static.cloudflareinsights.com/beacon.min.js')}, want {want}")
after_guard = snapshot(T, guard)
for r in sorted(set(before_guard) | set(after_guard)):
    if before_guard.get(r) != after_guard.get(r):
        problems.append(f"live-only file changed: {r}")
if deleted:
    notes.append("deleted in the preview, left on live (delete by hand if meant): " + ", ".join(deleted))

# ---------------------------------------------------------------- what changed
STAMP = [(r"\?v=[A-Za-z0-9._-]+", "?v="), (r'data-updates="[^"]*"', 'data-updates=""'), (r"<lastmod>[^<]*</lastmod>", "<lastmod></lastmod>")]


def norm(b):
    try:
        s = b.decode("utf-8")
    except UnicodeDecodeError:
        return b
    for pat, rep in STAMP:
        s = re.sub(pat, rep, s)
    return s


if REAL:
    st = [l for l in git(LIVE, "status", "--porcelain", "--untracked-files=all").splitlines() if l]
    real_c, stamp_c = [], []
    for r in (l[3:] for l in st):
        o = subprocess.run(["git", "show", f"HEAD:{r}"], cwd=LIVE, capture_output=True)
        if o.returncode == 0 and (LIVE / r).exists() and norm(o.stdout) == norm((LIVE / r).read_bytes()):
            stamp_c.append(r)
        else:
            real_c.append(r)
else:
    real_c, stamp_c = [], []
    for p in sorted(T.rglob("*")):
        if not p.is_file() or "__pycache__" in p.parts:
            continue
        r = p.relative_to(T).as_posix(); o = LIVE / r
        if o.exists() and filecmp.cmp(o, p, shallow=False):
            continue
        if o.exists() and norm(o.read_bytes()) == norm(p.read_bytes()):
            stamp_c.append(r)
        else:
            real_c.append(r)
            if a.show_diff and o.exists() and r.endswith((".html", ".js", ".css", ".json", ".md", ".xml", ".py", ".cjs")):
                sys.stdout.writelines(difflib.unified_diff(o.read_text().splitlines(True), p.read_text().splitlines(True), "live/" + r, "promoted/" + r, n=1))

mode = "REAL (wrote " + str(LIVE) + ")" if REAL else "DRY RUN (nothing written; live tree untouched)"
print(f"promote {mode}")
print(f"  preview {base[:7] + '..' if base else 'all files at '}{ref[:7]}  ->  {LIVE}")
print(f"  sw.js VERSION {old_ver} -> {sw_now}")
print(f"  {len(todo)} preview files promoted, {len(skipped)} live-only skipped" + (f" ({', '.join(skipped[:6])}{'...' if len(skipped) > 6 else ''})" if skipped else ""))
for l in build_log:
    print("  " + l)
print(f"  files {'changed' if REAL else 'that would change'} on live: {len(real_c)} content, {len(stamp_c)} version-stamp only")
for r in real_c:
    print("    " + r)
for n_ in notes:
    print("  note: " + n_)
if new_entries:
    print("  What's new: " + "; ".join(f"{x['id']} ({x['date']}) {x['title']}" for x in new_entries))
elif a.small_fix:
    print("  What's new: skipped (--small-fix)")
if tmp:
    shutil.rmtree(tmp)
if problems:
    print("PROBLEMS (real mode would stop here):" if not REAL else "PROBLEMS (live tree written but NOT committed; fix or `git -C %s checkout -- . && git clean -fd`):" % LIVE)
    for p_ in problems:
        print("  ! " + p_)
    sys.exit(1)
wn_ok = "What's new skipped (--small-fix)" if (a.small_fix and not new_entries) else "new What's new entry"
print(f"checks: OK ({wn_ok}, VERSION bumped, no preview leftovers, beacon once per page, live-only files untouched)")
if not REAL:
    extra = f" --whats-new {a.whats_new}" if a.whats_new else (" --small-fix" if a.small_fix else " --whats-new FILE")
    print('real mode, ONLY after D\'Angelo says "push" in chat: add --live --confirm-push' + extra)
    sys.exit(0)

if a.commit:
    if new_entries:
        lead = f"What's new '{new_entries[0]["title"]}'"
    else:
        lead = "small fix (no What's new entry)"
    msg = (f"Promote preview {base[:7] + '..' if base else ''}{ref[:7]} to live: {lead}; privacy and updates copy, "
           f"beacon, CSP, CNAME and IndexNow key kept; SW {sw_now}")
    git(LIVE, "add", "-A")
    git(LIVE, *GIT_ID, "commit", "-q", "-m", msg)
    print("committed " + git(LIVE, "rev-parse", "--short", "HEAD").strip() + ": " + msg)
    if a.push:
        git(LIVE, *GIT_ID, "pull", "--rebase", "--quiet")
        p = subprocess.run(["timeout", "120", "git", "push", "origin", "HEAD:main"], cwd=LIVE, capture_output=True, text=True)
        if p.returncode:
            die("push failed (not retried, never forced): " + p.stderr.strip(), 1)
        print("pushed " + git(LIVE, "rev-parse", "--short", "HEAD").strip() + " to origin main")
        print("when nightbiteoh.com serves it: python3 tools/indexnow.py --since HEAD~1 --send   (run from the live checkout)")
else:
    print("not committed (add --commit)")
