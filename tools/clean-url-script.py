#!/usr/bin/env python3
"""Insert js/clean-url.js as the first head script on every public page.

    python3 tools/clean-url-script.py            # insert (idempotent)
    python3 tools/clean-url-script.py --check    # change nothing; exit 1 if a page is missing the script or out of step

Sits immediately before js/a11y-boot.js, so the address bar is cleaned before
other boot scripts read the path. Skips whisperwood pages, 404.html (GitHub
Pages serves that file for missing paths; rewriting a missing /foo.html would
change a 404 URL) and pages with no a11y-boot hook (the docks and tournaments
redirect stubs). Also edits tools/lake-home.html. Paths follow each page's
own a11y-boot prefix, including <base href="../"> lake homes and the
/night-bite-preview/ prefix on preview-only absolute paths.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP_PREFIX = ("whisperwood", "previews/", "review/", ".git/")
SKIP_FILES = {"404.html"}
BOOT = re.compile(
    r'\n([ \t]*)(<script src="((?:\.\./|/night-bite-preview/|/)?)js/a11y-boot\.js[^"]*"></script>)'
)
EXISTING = re.compile(
    r'\n[ \t]*<script src="(?:\.\./|/night-bite-preview/|/)?js/clean-url\.js[^"]*"></script>'
)


def ver():
    m = re.search(r'var VERSION = "([^"]+)"', (ROOT / "sw.js").read_text())
    if not m:
        sys.exit("clean-url-script: VERSION not found in sw.js")
    return m.group(1)


def pages():
    out = []
    for p in sorted(ROOT.rglob("*.html")):
        rel = p.relative_to(ROOT).as_posix()
        if rel.startswith(SKIP_PREFIX) or rel in SKIP_FILES:
            continue
        out.append(p)
    lake = ROOT / "tools" / "lake-home.html"
    if lake not in out:
        out.append(lake)
    return out


def wanted(ind, pre, version, stamp):
    q = ("?v=" + version) if stamp else ""
    return f'\n{ind}<script src="{pre}js/clean-url.js{q}"></script>'


def apply(src, version, stamp):
    m = BOOT.search(src)
    if not m:
        return src, "no-boot"
    ind, pre = m.group(1), m.group(3)
    tag = wanted(ind, pre, version, stamp)
    stripped = EXISTING.sub("", src)
    m2 = BOOT.search(stripped)
    if not m2:
        return src, "no-boot"
    # Insert immediately before a11y-boot, even if a leftover tag was elsewhere.
    out = stripped[:m2.start()] + tag + stripped[m2.start():]
    return out, "ok"


def main():
    check = "--check" in sys.argv
    version = ver()
    bad, wrote, ok, skipped = [], 0, 0, []
    for p in pages():
        src = p.read_text()
        rel = p.relative_to(ROOT).as_posix()
        stamp = rel != "tools/lake-home.html"
        new, status = apply(src, version, stamp)
        if status == "no-boot":
            skipped.append(rel)
            continue
        ok += 1
        if new == src:
            continue
        if check:
            bad.append(rel)
        else:
            p.write_text(new)
            wrote += 1
    if check:
        if bad:
            print("FAIL clean-url-script: " + str(len(bad)) + " page(s) missing or out of step: " + ", ".join(bad))
            sys.exit(1)
        print(f"clean-url-script: {ok} pages in step, {len(skipped)} skipped (no a11y-boot)")
        return
    print(f"clean-url-script: {wrote} pages updated, {ok} have the script, {len(skipped)} skipped (no a11y-boot)")
    if skipped:
        print("  skipped: " + ", ".join(skipped))


if __name__ == "__main__":
    main()
