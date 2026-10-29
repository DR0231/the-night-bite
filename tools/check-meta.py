#!/usr/bin/env python3
"""Check the head of every public page: title, description, canonical, Open Graph, Twitter Card and JSON-LD.

Run from the repo root:  python3 tools/check-meta.py      (exit code 1 on any error)

Every public page (same list as tools/build-meta.py) must have:
  · one <title> and one non-empty meta description
  · one canonical on https://nightbiteoh.com/ in the clean form (no .html, except whisperwood.html)
  · og:site_name, og:type, og:title, og:description, og:url (= canonical), og:image (absolute https://nightbiteoh.com
    URL to a file that exists in assets/og/), og:image:width, og:image:height, og:image:alt
  · twitter:card summary_large_image, twitter:title, twitter:description, twitter:image (absolute, file exists)
  · og:title and twitter:title equal to <title>; og/twitter descriptions equal to the meta description
  · every <script type="application/ld+json"> block parses as JSON and has @context https://schema.org and @type
404.html and offline.html need a title and description only. Warnings (not errors): descriptions over 160
characters, titles over 70, spaced dashes in title or description, an indexable canonical missing from sitemap.xml.
"""
import html, json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://nightbiteoh.com/"
BASIC_ONLY = {"404.html", "offline.html"}
OG = ["og:site_name", "og:type", "og:title", "og:description", "og:url", "og:image",
      "og:image:width", "og:image:height", "og:image:alt"]
TW = ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]

errors, warnings, checked = [], [], 0
sitemap = set(re.findall(r"<loc>([^<]+)</loc>", (root / "sitemap.xml").read_text()))


def metas(head, kind, name):
    return re.findall(r'<meta ' + kind + r'="' + re.escape(name) + r'" content="([^"]*)">', head)


for p in sorted(root.rglob("*.html")):
    rel = p.relative_to(root).as_posix()
    if rel.startswith(("previews/", "review/", "tools/", "whisperwood/", ".git/")) or re.match(r"google[0-9a-f]+\.html$", rel):
        continue
    checked += 1
    src = p.read_text()
    head = src[:src.find("</head>")]
    err = lambda m: errors.append(f"{rel}: {m}")
    titles = re.findall(r"<title>([^<]*)</title>", head)
    descs = metas(head, "name", "description")
    if len(titles) != 1 or not titles[0].strip():
        err(f"needs exactly one non-empty <title> (found {len(titles)})")
    if len(descs) != 1 or not descs[0].strip():
        err(f"needs exactly one non-empty meta description (found {len(descs)})")
    title = titles[0].strip() if titles else ""
    desc = descs[0] if descs else ""
    dlen, tlen = len(html.unescape(desc)), len(html.unescape(title))
    if dlen > 160:
        warnings.append(f"{rel}: description is {dlen} characters (search results cut around 160)")
    if tlen > 70:
        warnings.append(f"{rel}: title is {tlen} characters")
    for label, text in (("title", title), ("description", desc)):
        if re.search(r" [-\u2013\u2014] ", text):
            warnings.append(f"{rel}: spaced dash in {label}")
    for i, block in enumerate(re.findall(r'<script type="application/ld\+json">(.*?)</script>', src, re.S)):
        try:
            data = json.loads(block)
        except ValueError as e:
            err(f"JSON-LD block {i + 1} is not valid JSON ({e})")
            continue
        for item in data if isinstance(data, list) else [data]:
            if item.get("@context") not in ("https://schema.org", "https://schema.org/"):
                err(f"JSON-LD block {i + 1} needs @context https://schema.org")
            if not item.get("@type"):
                err(f"JSON-LD block {i + 1} needs @type")
    if rel in BASIC_ONLY:
        continue
    canon = re.findall(r'<link rel="canonical" href="([^"]*)">', head)
    if len(canon) != 1:
        err(f"needs exactly one canonical (found {len(canon)})")
        continue
    canon = canon[0]
    if not canon.startswith(SITE):
        err(f"canonical {canon} is not on {SITE}")
    if canon.endswith(".html") and rel != "whisperwood.html":
        err(f"canonical {canon} should use the clean URL (no .html)")
    for kind, names in (("property", OG), ("name", TW)):
        for n in names:
            v = metas(head, kind, n)
            if len(v) != 1 or not v[0].strip():
                err(f"needs exactly one {n} (found {len(v)})")
    get = lambda kind, n: (metas(head, kind, n) or [""])[0]
    if get("property", "og:url") != canon:
        err("og:url does not match the canonical")
    if get("name", "twitter:card") != "summary_large_image":
        err("twitter:card should be summary_large_image")
    for kind, n in (("property", "og:title"), ("name", "twitter:title")):
        if get(kind, n) != title:
            err(f"{n} does not match <title>")
    for kind, n in (("property", "og:description"), ("name", "twitter:description")):
        if get(kind, n) != desc:
            err(f"{n} does not match the meta description")
    for kind, n in (("property", "og:image"), ("name", "twitter:image")):
        img = get(kind, n)
        if not img.startswith(SITE + "assets/og/"):
            err(f"{n} should be an absolute {SITE}assets/og/ URL")
        elif not (root / img[len(SITE):]).exists():
            err(f"{n} points at a missing file {img}")
    noindex = re.search(r'<meta name="robots" content="[^"]*noindex', head) and 'http-equiv="refresh"' in head
    if not noindex and canon not in sitemap:
        warnings.append(f"{rel}: canonical {canon} is not in sitemap.xml")

for w in warnings:
    print("warn:", w)
for e in errors:
    print("ERROR:", e)
print(f"check-meta: {checked} pages, {len(errors)} errors, {len(warnings)} warnings")
sys.exit(1 if errors else 0)
