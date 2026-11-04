#!/usr/bin/env python3
"""One label per nav link, so text readers and plain-text extractors read "Species", "Water" and "Whisperwood Vale"
once (the old markup carried a full and a short <span> per link: "SpeciesSpecies", "WaterLake").

    python3 tools/nav-labels.py            # rewrite every page's header nav (idempotent)
    python3 tools/nav-labels.py --check    # change nothing; exit 1 if a page still has the old two-span labels

The new markup:
  · Species: plain text (the short label was the same word).
  · Water: <span class="nav-label" data-short="Lake"><span class="nav-label-text">Water</span></span>. On phones
    (max-width 900px, css/styles.css) the text is hidden and the short label comes from data-short through CSS
    ::before, so the nav still reads "Lake" on screen and to screen readers; the page text is "Water" only.
  · Whisperwood Vale: plain text. Its short label only showed on phones, where the link sits in the More panel.
whisperwood.html is never touched (its nav keeps the old spans; css/styles.css keeps the old rules for it).
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FULL_SHORT = re.compile(r'<span class="nav-label-full">([^<]*)</span><span class="nav-label-short">([^<]*)</span>')


def new_label(m):
    full, short = m.group(1), m.group(2)
    if full == short or full.startswith("Whisperwood"):
        return full
    return f'<span class="nav-label" data-short="{short}"><span class="nav-label-text">{full}</span></span>'


def pages():
    for p in sorted(ROOT.rglob("*.html")):
        rel = p.relative_to(ROOT).as_posix()
        if rel.startswith(("whisperwood", "previews/", "review/", ".git/")):
            continue
        yield rel, p


check = "--check" in sys.argv
old = []
for rel, p in pages():
    s = p.read_text()
    if not FULL_SHORT.search(s):
        continue
    old.append(rel)
    if not check:
        p.write_text(FULL_SHORT.sub(new_label, s))
if check:
    for r in old:
        print(f"FAIL {r}: old two-span nav labels (run python3 tools/nav-labels.py)")
    print(f"nav-labels: {len(old)} page(s) with old labels")
    sys.exit(1 if old else 0)
print(f"nav-labels: rewrote {len(old)} page(s)")
