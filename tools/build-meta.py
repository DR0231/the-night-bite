#!/usr/bin/env python3
"""Write the share tags (Open Graph and Twitter Card) on every public page from that page's own head.

Run from the repo root after tools/build-lake-pages.py (it rebuilds alum/ and buckeye/ from index.html):
    python3 tools/build-lake-pages.py && python3 tools/build-meta.py && python3 tools/stamp-version.py

For each page this reads <title>, <meta name="description"> and <link rel="canonical"> and writes one block
right after the canonical:
  og:site_name, og:type, og:title, og:description, og:url (= canonical), og:image (+ width, height, alt),
  twitter:card summary_large_image, twitter:title, twitter:description, twitter:image, twitter:image:alt.
Any og:* or twitter:* tags already on the page are removed first, so running it twice changes nothing.
Images are absolute https://nightbiteoh.com URLs: assets/og/og-<lake>.png on each lake home page other
than Hoover (alum, buckeye, oshaughnessy, griggs, indian, delaware), assets/og/og-card.png everywhere else (all 1200x630).
Skipped: 404.html and offline.html (no canonical, not shared), previews/, review/, tools/, whisperwood/ (the game),
and Search Console verification files. Check the result with tools/check-meta.py.
"""
import pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://nightbiteoh.com/"
SKIP_FILES = {"404.html", "offline.html"}
IMAGES = {
    "alum/index.html": ("og-alum.png", "The Night Bite: Alum Creek Lake fishing hub, a pixel lantern over a moonlit tree line"),
    "buckeye/index.html": ("og-buckeye.png", "The Night Bite: Buckeye Lake fishing hub, a pixel lantern over a moonlit tree line"),
    "oshaughnessy/index.html": ("og-oshaughnessy.png", "The Night Bite: O’Shaughnessy Reservoir fishing hub, a pixel lantern over a moonlit tree line"),
    "griggs/index.html": ("og-griggs.png", "The Night Bite: Griggs Reservoir fishing hub, a pixel lantern over a moonlit tree line"),
    "indian/index.html": ("og-indian.png", "The Night Bite: Indian Lake fishing hub, a pixel lantern over a moonlit tree line"),
    "delaware/index.html": ("og-delaware.png", "The Night Bite: Delaware Lake fishing hub, a pixel lantern over a moonlit tree line"),
}
DEFAULT_IMAGE = ("og-card.png", "The Night Bite: a pixel lantern over a moonlit tree line")


def public_pages():
    for p in sorted(root.rglob("*.html")):
        rel = p.relative_to(root).as_posix()
        if rel.startswith(("previews/", "review/", "tools/", "whisperwood/", ".git/")) or rel in SKIP_FILES:
            continue
        if re.match(r"google[0-9a-f]+\.html$", rel):
            continue
        yield rel, p


def attr(s):
    # values are copied from the page's own head, already HTML-escaped; only guard a stray double quote
    return s.replace('"', "&quot;")


def block(rel, title, desc, url):
    img, alt = IMAGES.get(rel, DEFAULT_IMAGE)
    img = SITE + "assets/og/" + img
    t, d, a = attr(title), attr(desc), attr(alt)
    lines = [
        '<meta property="og:site_name" content="The Night Bite">',
        '<meta property="og:type" content="website">',
        f'<meta property="og:title" content="{t}">',
        f'<meta property="og:description" content="{d}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:image" content="{img}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{a}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{t}">',
        f'<meta name="twitter:description" content="{d}">',
        f'<meta name="twitter:image" content="{img}">',
        f'<meta name="twitter:image:alt" content="{a}">',
    ]
    return "".join("\n  " + l for l in lines)


errors, changed = [], 0
for rel, p in public_pages():
    src = p.read_text()
    head_end = src.find("</head>")
    head, rest = src[:head_end], src[head_end:]
    title = re.search(r"<title>([^<]*)</title>", head)
    desc = re.search(r'<meta name="description" content="([^"]*)">', head)
    canon = re.search(r'<link rel="canonical" href="([^"]*)">', head)
    if not (title and desc and canon):
        errors.append(f"{rel}: needs <title>, meta description and canonical before share tags can be written")
        continue
    head = re.sub(r'\n[ \t]*<meta (?:property="og:[^"]*"|name="twitter:[^"]*") content="[^"]*">', "", head)
    canon = re.search(r'<link rel="canonical" href="([^"]*)">', head)
    head = head[:canon.end()] + block(rel, title.group(1).strip(), desc.group(1), canon.group(1)) + head[canon.end():]
    new = head + rest
    if new != src:
        p.write_text(new)
        changed += 1
if errors:
    sys.exit("\n".join(errors))
print(f"meta: share tags written, {changed} pages changed")
