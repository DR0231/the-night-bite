#!/usr/bin/env python3
"""Every script, stylesheet and first-paint image a lake home loads is in the sw.js PRECACHE list, so a lake page
opened offline after install has everything it needs. sw-precache.py --check compares PRECACHE with the registry and
the disk; this compares it with what the pages actually reference (the 49 lake homes, the lake home template and the
offline page). Static, fast.

    python3 tools/check-precache-refs.py [--lakes hoover,alum]

Scanned: <script src>, <link rel="stylesheet" href> and <img src> without loading="lazy", same site only (no http
URLs, no data: URIs), with ?v= stamps and #fragments taken off. Template paths are resolved the way built pages are
(lake homes carry <base href="../">, so their references resolve from the site root, and so do the template's). Links (<a href>) are not
first-paint content and are not scanned. Exit 1 on any miss. NB_ROOT checks another copy of the site.
"""
import argparse, os, pathlib, posixpath, re, sys

TOOLS = pathlib.Path(__file__).resolve().parent
ROOT = pathlib.Path(os.environ.get("NB_ROOT") or TOOLS.parent)
sys.path.insert(0, str(TOOLS))
import registry  # noqa: E402

PRECACHE_RE = re.compile(r"var PRECACHE = \[\n(.*?)\n\];", re.S)
TAG = re.compile(r"<(script|link|img)\b([^>]*)>", re.I)
ATTR = re.compile(r'([\w-]+)\s*=\s*"([^"]*)"')

ap = argparse.ArgumentParser()
ap.add_argument("--lakes", default=os.environ.get("NB_LAKES", ""), help="comma list (default: every lake)")
a = ap.parse_args()
reg = registry.load(ROOT)
lakes = [x for x in a.lakes.split(",") if x] or list(reg["order"])

sw = (ROOT / "sw.js").read_text()
m = PRECACHE_RE.search(sw)
if not m:
    print("FAIL sw.js: PRECACHE not found"); sys.exit(1)
pre = set(re.findall(r'^\s*"([^"]+)",?\s*$', m.group(1), re.M))


def refs(html):
    out = []
    for tag, attrs in TAG.findall(html):
        at = dict((k.lower(), v) for k, v in ATTR.findall(attrs))
        t = tag.lower()
        if t == "script":
            u = at.get("src")
        elif t == "link":
            u = at.get("href") if "stylesheet" in at.get("rel", "").lower().split() else None
        else:
            u = None if at.get("loading", "").lower() == "lazy" else at.get("src")
        if u:
            out.append(u)
    return out


def site_path(u, page_dir):
    """the PRECACHE form of a reference from a page in page_dir ('' for the root, 'hoover' for hoover/index.html)"""
    if re.match(r"^(?:[a-z]+:)?//|^data:|^mailto:|^javascript:", u, re.I):
        return None
    u = u.split("#")[0].split("?")[0]
    if not u:
        return None
    if u.startswith("/"):
        u = u.lstrip("/")
        if u.startswith("night-bite-preview/"):
            u = u[len("night-bite-preview/"):]
        return posixpath.normpath(u)
    return posixpath.normpath(posixpath.join(page_dir, u)) if page_dir else posixpath.normpath(u)


bad, n = 0, 0
pages = [(f"{lake}/index.html", lake) for lake in lakes] + [("offline.html", "")]
for rel, page_dir in pages:
    f = ROOT / rel
    if not f.exists():
        print(f"FAIL {rel} missing"); bad += 1; continue
    h = f.read_text()
    b = re.search(r'<base href="([^"]*)"', h)   # lake homes carry <base href="../">: their links resolve from the root
    base_dir = posixpath.normpath(posixpath.join(page_dir, b.group(1))) if b else page_dir
    base_dir = "" if base_dir in (".", "") else base_dir
    miss = sorted({p for p in (site_path(u, base_dir) for u in refs(h)) if p and p not in pre})
    n += 1
    for p in miss:
        print(f"FAIL {rel}: loads {p}, which is not in sw.js PRECACHE (it would be missing offline)"); bad += 1
    if not miss:
        print(f"pass {rel}: every script, stylesheet and first-paint image is precached")
# the template: a new <script> or style there reaches every lake home on the next build
tpl = (ROOT / "tools" / "lake-home.html").read_text()
tmiss = sorted({p for p in (site_path(u, "") for u in refs(tpl)) if p and p not in pre and "{" not in p
                and not re.match(r"assets/[a-z]+-chart\.png$", p)})   # per-lake charts are checked on each built home
for p in tmiss:
    print(f"FAIL tools/lake-home.html: loads {p}, which is not in sw.js PRECACHE"); bad += 1
print(f"check-precache-refs: {n} pages and the lake home template, {bad} problem(s)")
sys.exit(1 if bad else 0)
