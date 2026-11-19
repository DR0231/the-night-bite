#!/usr/bin/env python3
"""One plain label per nav link, so text readers and translations read "Species" and "Water" once.

    python3 tools/nav-labels.py            # rewrite every page's header nav (idempotent)
    python3 tools/nav-labels.py --check    # change nothing; exit 1 if a page still has a short-label trick

The Water link is the word "Water" on every screen (same as the footer). An older pattern hid that
word on phones and drew "Lake" through CSS content, which left the link with no accessible name.
whisperwood.html is never touched (its nav keeps the old full/short spans).
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FULL_SHORT = re.compile(r'<span class="nav-label-full">([^<]*)</span><span class="nav-label-short">([^<]*)</span>')
DATA_SHORT = re.compile(r'<span class="nav-label" data-short="[^"]*"><span class="nav-label-text">([^<]*)</span></span>')


def pages():
    for p in sorted(ROOT.rglob("*.html")):
        rel = p.relative_to(ROOT).as_posix()
        if rel.startswith(("whisperwood", "previews/", "review/", ".git/")):
            continue
        yield rel, p


def flatten(s):
    s = DATA_SHORT.sub(r"\1", s)
    s = FULL_SHORT.sub(lambda m: m.group(1), s)
    return s


check = "--check" in sys.argv
old = []
for rel, p in pages():
    s = p.read_text()
    new = flatten(s)
    if new == s:
        continue
    old.append(rel)
    if not check:
        p.write_text(new)
if check:
    for r in old:
        print(f"FAIL {r}: old short nav labels (run python3 tools/nav-labels.py)")
    print(f"nav-labels: {len(old)} page(s) with old labels")
    sys.exit(1 if old else 0)
print(f"nav-labels: rewrote {len(old)} page(s)")
