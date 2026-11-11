#!/usr/bin/env python3
"""Write the content hash of every sw.js PRECACHE file into sw.js REVISIONS, so an installed phone only
downloads the files that changed since its last worker (instead of all of them on every VERSION).

Also fills the LAKE PRECACHE block in sw.js from js/lakes.js: every lake home plus the chart, map script
and map images that home needs to render offline. A new water in the registry is picked up automatically.

    python3 tools/sw-precache.py            # rewrite the lake list and REVISIONS (stamp-version.py and promote.py run this)
    python3 tools/sw-precache.py --check    # change nothing; exit 1 if the lake list or REVISIONS is stale, or a file is missing

Hash: sha256 of the file's bytes, first 12 hex. For HTML (./, a folder/ or *.html) the ?v= stamps are blanked
first, because stamp-version.py rewrites them on every deploy without changing the page. sw.js computes the same
hash when it reuses an older worker's copy, so keep the two in step (isHtmlPath and hashOf in sw.js).
Run it last, after every build that touches a precached file (stamp-version.py, build-updates.py, ...).
"""
import hashlib, json, os, pathlib, re, sys

# NB_ROOT=<dir> checks another copy of the site (tools/check-all.py uses it for the live checkout)
root = pathlib.Path(os.environ.get("NB_ROOT") or pathlib.Path(__file__).resolve().parent.parent)
STAMP = re.compile(r"""\?v=[^"'<>&#) \t\n\r\f]*""")
BLOCK = re.compile(r"(// BEGIN REVISIONS\n)var REVISIONS = \{.*?\};\n(// END REVISIONS)", re.S)
PRECACHE_RE = re.compile(r"var PRECACHE = \[\n(.*?)\n\];", re.S)
LAKE_BLOCK = re.compile(r"(  // BEGIN LAKE PRECACHE\n)(.*?)(  // END LAKE PRECACHE)", re.S)
# after the home page, each of these is added when the file exists (Hoover has no lake-map-data-hoover.js)
LAKE_ASSETS = (
    "assets/{id}-chart.png",
    "js/lake-map-data-{id}.js",
    "assets/map/{id}-map-tall.png",
    "assets/map/{id}-map-wide.png",
)


def file_for(path):
    if path == "./":
        return root / "index.html"
    if path.endswith("/"):
        return root / path / "index.html"
    return root / path


def is_html(path):
    return path == "./" or path.endswith("/") or path.lower().endswith(".html")


def rev(path):
    data = file_for(path).read_bytes()
    if is_html(path):
        data = STAMP.sub("?v=", data.decode("utf-8")).encode("utf-8")
    return hashlib.sha256(data).hexdigest()[:12]


def lake_ids():
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    import registry
    return list(registry.load(root)["order"])


def lake_precache():
    """Every registry lake home, plus the first-paint chart, map script and map images that exist."""
    paths, missing = [], []
    for lid in lake_ids():
        home = f"{lid}/"
        if not file_for(home).is_file():
            missing.append(home)
            continue
        paths.append(home)
        for tmpl in LAKE_ASSETS:
            p = tmpl.format(id=lid)
            if file_for(p).is_file():
                paths.append(p)
    return paths, missing


def lake_block_body(paths):
    return "".join(f'  {json.dumps(p)},\n' for p in paths)


def sync_lake_block(text, paths, write):
    body = lake_block_body(paths)
    m = LAKE_BLOCK.search(text)
    if not m:
        pm = PRECACHE_RE.search(text)
        if not pm:
            print("FAIL sw.js: PRECACHE or the LAKE PRECACHE block not found")
            sys.exit(1)
        # insert the marked block just before the closing ]; of PRECACHE
        start, end = pm.start(), pm.end()
        inner_end = end - 3  # "];" after the last newline of the array
        # PRECACHE_RE matches through "\n];", so end-2 is "];" and we want to insert before that newline
        insert_at = end - 2
        block = "  // BEGIN LAKE PRECACHE\n" + body + "  // END LAKE PRECACHE\n"
        new = text[:insert_at] + block + text[insert_at:]
        return new, True
    new_block = m.group(1) + body + m.group(3)
    if new_block == m.group(0):
        return text, False
    new = text[:m.start()] + new_block + text[m.end():]
    return new, True


def precache_paths(text):
    m = PRECACHE_RE.search(text)
    if not m:
        return None
    return re.findall(r'^\s*"([^"]+)",?\s*$', m.group(1), re.M)


def build(write=True):
    sw = root / "sw.js"
    text = sw.read_text(encoding="utf-8")
    if not PRECACHE_RE.search(text) or not BLOCK.search(text):
        if not write and os.environ.get("NB_ROOT") and PRECACHE_RE.search(text) and "REVISIONS" not in text:
            print(f"PASS {root}/sw.js has no REVISIONS yet (a worker from before v127): nothing to check")
            sys.exit(0)
        print("FAIL sw.js: PRECACHE or the REVISIONS block not found")
        sys.exit(1)

    lake_paths, missing_homes = lake_precache()
    if missing_homes:
        print("FAIL lake home(s) in js/lakes.js have no page, so they cannot be precached: " + ", ".join(missing_homes))
        sys.exit(1)

    text, lake_changed = sync_lake_block(text, lake_paths, write)
    paths = precache_paths(text)
    if paths is None:
        print("FAIL sw.js: PRECACHE not found after writing the lake list")
        sys.exit(1)

    missing = [p for p in paths if not file_for(p).is_file()]
    if missing:
        print("FAIL precached file(s) missing, so every install would fail: " + ", ".join(missing))
        sys.exit(1)
    dupes = sorted({p for p in paths if paths.count(p) > 1})
    if dupes:
        print("FAIL sw.js PRECACHE lists the same path twice: " + ", ".join(dupes))
        sys.exit(1)
    absent = [p for p in lake_paths if p not in paths]
    if absent:
        print("FAIL sw.js PRECACHE is missing lake file(s) from js/lakes.js: " + ", ".join(absent))
        sys.exit(1)

    revs = {p: rev(p) for p in paths}
    body = "var REVISIONS = {\n" + ",\n".join(f"  {json.dumps(p)}: {json.dumps(r)}" for p, r in revs.items()) + "\n};\n"
    new = BLOCK.sub(lambda x: x.group(1) + body + x.group(2), text, count=1)
    changed = new != sw.read_text(encoding="utf-8")
    if changed and write:
        sw.write_text(new, encoding="utf-8")
    size = sum(file_for(p).stat().st_size for p in paths)
    return changed, len(paths), size, len(lake_ids())


if __name__ == "__main__":
    check = "--check" in sys.argv[1:]
    changed, n, size, n_lakes = build(write=not check)
    if check:
        if changed:
            print(f"FAIL sw.js REVISIONS or the lake precache list is stale: run python3 tools/sw-precache.py ({n} files, {n_lakes} waters)")
            sys.exit(1)
        print(f"PASS sw.js REVISIONS match {n} precached files ({size / 1e6:.2f} MB), including {n_lakes} lake homes")
    else:
        print(f"sw-precache: {'updated' if changed else 'unchanged'}, {n} files, {size / 1e6:.2f} MB, {n_lakes} lake homes")
