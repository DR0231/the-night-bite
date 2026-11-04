#!/usr/bin/env python3
"""Add the Display settings hooks to every page (idempotent). Run from anywhere:  python3 tools/a11y-inject.py
  - <head>: js/a11y-boot.js (sync, right before the stylesheet, so saved settings apply before first paint)
  - end of <body>: js/a11y.js (defer, builds the panel on first open)
  - a "Display" button in the More menu and the footer nav (hidden until js/a11y.js runs)
Also edits tools/lake-home.html, so lake homes built from it keep the hooks. whisperwood* (the game) is left alone.
Paths follow each page's own stylesheet link, so pages with <base href="../"> and plain ../ pages both work.
"""
import pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
ver = re.search(r'var VERSION = "([^"]+)"', (root / "sw.js").read_text()).group(1)
BTN = '<button type="button" class="a11y-open" data-a11y-open hidden>Display</button>'
css = re.compile(r'(\n([ \t]*)<link rel="stylesheet" href="((?:\.\./|/night-bite-preview/|/)?)css/styles\.css[^"]*">)')
pages = [p for p in sorted(root.rglob("*.html"))
         if not p.relative_to(root).as_posix().startswith(("whisperwood", "previews/", "review/", "tools/", "node_modules/"))]
pages.append(root / "tools" / "lake-home.html")
changed, missing = 0, []
for page in pages:
    old = t = page.read_text()
    m = css.search(t)
    if not m:
        missing.append(page.relative_to(root).as_posix()); continue
    ind, pre = m.group(2), m.group(3)
    if "js/a11y-boot.js" not in t:
        t = t.replace(m.group(1), f'\n{ind}<script src="{pre}js/a11y-boot.js?v={ver}"></script>' + m.group(1), 1)
    if "js/a11y.js" not in t:
        i = t.rfind("</body>")
        t = t[:i] + f'  <script src="{pre}js/a11y.js?v={ver}" defer></script>\n' + t[i:]
    if 'id="nav-more-panel"' in t and BTN not in t.split('id="nav-more-panel"', 1)[1].split("</div>", 1)[0]:
        t = re.sub(r'(id="nav-more-panel"[^>]*>.*?)(\n([ \t]*)</div>)', lambda x: x.group(1) + "\n" + x.group(3) + "  " + BTN + x.group(2), t, count=1, flags=re.S)
    fm = re.search(r'<nav aria-label="Footer">.*?</nav>', t, re.S)
    if fm and "data-a11y-open" not in fm.group(0):
        blk = fm.group(0)
        ind2 = re.search(r'\n([ \t]*)</nav>$', blk)
        new = blk[: ind2.start()] + "\n" + ind2.group(1) + "  " + BTN + blk[ind2.start():] if ind2 else blk.replace("</nav>", BTN + "</nav>")
        t = t.replace(blk, new, 1)
    if t != old:
        page.write_text(t); changed += 1
print(f"a11y hooks: {changed} pages changed, {len(pages) - len(missing)} have them")
if missing:
    print("no stylesheet link (skipped): " + ", ".join(missing))
