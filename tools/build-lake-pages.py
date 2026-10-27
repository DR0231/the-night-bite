#!/usr/bin/env python3
"""Build each lake's own home page from index.html: alum/index.html and buckeye/index.html.

Run from the repo root after any change to index.html, then run tools/stamp-version.py:
    python3 tools/build-lake-pages.py && python3 tools/stamp-version.py

index.html stays the Hoover home page at the site root, unchanged. Each copy:
  · gets <base href="../"> so every relative link, image, script and fetch() resolves from the site root
    (same files, same service worker scope); in-page links (#main, #get-the-app) become alum/#main and so on;
  · says which lake it is (<meta name="nb-home" content="alum">), which js/lakes.js reads before first paint;
  · has its own title, description, canonical, og:url, og:title, og:description, og:image and JSON-LD url;
  · has the lake's names already filled in [data-lk] spots, so nothing swaps after paint.
Never edit alum/index.html or buckeye/index.html by hand; they are overwritten.
"""
import pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / "index.html").read_text()
SITE = "https://nightbiteoh.com/"

LAKES = {
    "alum": {
        "name": "Alum Creek Lake", "short": "Alum Creek",
        "title": "The Night Bite: Alum Creek fishing hub",
        "desc": "Unofficial Alum Creek fishing hub, Ohio: live lake level, tonight's bite, species, water maps, trip log, gear.",
    },
    "buckeye": {
        "name": "Buckeye Lake", "short": "Buckeye",
        "title": "The Night Bite: Buckeye Lake fishing hub",
        "desc": "Unofficial Buckeye Lake fishing hub, Ohio: live lake level, tonight's bite, species, water maps, trip log, gear.",
    },
}


def sub1(pattern, repl, text, flags=0):
    new, n = re.subn(pattern, repl, text, count=1, flags=flags)
    if n != 1:
        sys.exit(f"build-lake-pages: pattern not found: {pattern}")
    return new


def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("'", "&#39;")


for lake, L in LAKES.items():
    url = SITE + lake + "/"
    h = src
    h = sub1(r'(<meta charset="utf-8">\n)', r'\1  <base href="../">\n', h)
    h = sub1(r'<meta name="nb-home" content="hoover">', f'<meta name="nb-home" content="{lake}">', h)
    h = sub1(r"<title>[^<]*</title>", f"<title>{L['title']}</title>", h)
    h = sub1(r'(<meta name="description" content=")[^"]*(")', r"\g<1>" + esc(L["desc"]) + r"\2", h)
    h = sub1(r'(<link rel="canonical" href=")[^"]*(")', r"\g<1>" + url + r"\2", h)
    h = sub1(r'(<meta property="og:title" content=")[^"]*(")', r"\g<1>" + esc(L["title"]) + r"\2", h)
    h = sub1(r'(<meta property="og:description" content=")[^"]*(")', r"\g<1>" + esc(L["desc"]) + r"\2", h)
    h = sub1(r'(<meta property="og:url" content=")[^"]*(")', r"\g<1>" + url + r"\2", h)
    # each lake shares with its own card (assets/og/og-<lake>.png: same art, the lake's name; no live data)
    h = sub1(r'(<meta property="og:image" content=")[^"]*(")', r"\g<1>" + SITE + f"assets/og/og-{lake}.png" + r"\2", h)
    h = sub1(r'(<meta property="og:image:alt" content=")[^"]*(")', r"\g<1>" + esc(f"The Night Bite: {L['name']} fishing hub, a pixel lantern over a moonlit tree line") + r"\2", h)
    h = sub1(r'("@type": "WebSite", "name": "The Night Bite", "url": ")[^"]*(")', r"\g<1>" + url + r"\2", h)
    # in-page links and Home links: with <base href="../"> they would otherwise point at the root page
    h = re.sub(r'href="#', f'href="{lake}/#', h)
    h = re.sub(r'href="\./"', f'href="{lake}/"', h)
    # lake names in place before first paint (js/lakes.js would fill the same text)
    for key in ("name", "short"):
        h = re.sub(r'(<span[^>]*data-lk="' + key + r'"[^>]*>)[^<]*(</span>)', r"\g<1>" + L[key] + r"\2", h)
    h = h.replace("<!DOCTYPE html>\n", "<!DOCTYPE html>\n<!-- Built from index.html by tools/build-lake-pages.py. Do not edit by hand. -->\n", 1)
    out = root / lake / "index.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(h)
    print(f"wrote {out.relative_to(root)}")
