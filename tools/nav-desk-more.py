#!/usr/bin/env python3
"""Desktop nav: Whisperwood Vale moves into the More menu on wide screens too (phones already had it there).

    python3 tools/nav-desk-more.py            # mark every page's header nav (idempotent)
    python3 tools/nav-desk-more.py --check    # change nothing; exit 1 if a page's nav is not marked

Markup it adds (classes only, no new links):
  · the Whisperwood <li class="nav-extra"> gets "nav-ww" (css hides it at 901px and up),
  · the <li class="nav-more-item"> gets "nav-more-desk" (css shows More at 901px and up, with only the
    Whisperwood link and the Display button in the panel; Log, About and What's new stay in the row).
whisperwood.html is never touched (its nav keeps the old row on desktop).
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
WW_LI = re.compile(r'<li class="nav-extra">(<a href="[^"]*whisperwood\.html")')
MORE_LI = '<li class="nav-more-item">'


def pages():
    for p in sorted(ROOT.rglob("*.html")):
        rel = p.relative_to(ROOT).as_posix()
        if rel.startswith(("whisperwood", "previews/", "review/", ".git/", "node_modules/")):
            continue
        yield rel, p


check = "--check" in sys.argv
todo = []
for rel, p in pages():
    s = p.read_text()
    if MORE_LI not in s and not WW_LI.search(s):
        continue  # no header nav (redirect pages)
    n = WW_LI.sub(r'<li class="nav-extra nav-ww">\1', s)
    n = n.replace(MORE_LI, '<li class="nav-more-item nav-more-desk">')
    if n != s:
        todo.append(rel)
        if not check:
            p.write_text(n)
if check:
    for r in todo:
        print(f"FAIL {r}: nav not marked for desktop More (run python3 tools/nav-desk-more.py)")
    print(f"nav-desk-more: {len(todo)} page(s) unmarked")
    sys.exit(1 if todo else 0)
print(f"nav-desk-more: marked {len(todo)} page(s)")
