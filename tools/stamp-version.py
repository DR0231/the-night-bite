#!/usr/bin/env python3
"""Stamp every page's own CSS and JS links with the service worker version: css/styles.css?v=VERSION.

Run after bumping VERSION in sw.js, from the repo root:  python3 tools/stamp-version.py
A new ?v= on each deploy skips the browser's 10 minute HTTP cache on GitHub Pages, so a page always loads the
styles and scripts from its own deploy. sw.js strips ?v= when it saves a copy, so offline copies still match.
whisperwood.html and everything under whisperwood/ are left alone.
"""
import pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
m = re.search(r'var VERSION = "([^"]+)"', (root / "sw.js").read_text())
if not m:
    sys.exit("VERSION not found in sw.js")
ver = m.group(1)
pat = re.compile(r'((?:src|href)=")((?:\.\./|/night-bite-preview/|/)?(?:css/[\w.-]+\.css|js/[\w.-]+\.js))(?:\?v=[^"]*)?(")')
changed = 0
for page in sorted(root.rglob("*.html")):
    rel = page.relative_to(root).as_posix()
    if rel.startswith(("whisperwood", "previews/", "review/", "tools/")):
        continue
    old = page.read_text()
    new = pat.sub(lambda x: x.group(1) + x.group(2) + "?v=" + ver + x.group(3), old)
    if new != old:
        page.write_text(new)
        changed += 1
print(f"stamped {changed} pages with ?v={ver}")
