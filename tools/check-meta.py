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
Across pages (errors): two indexable pages with the same <title>, meta description or first <h1> text (404, offline
and noindex redirect pages left out), so every lake and page can be found and shared on its own.
Header nav (error): the old two-span labels (nav-label-full + nav-label-short, read as "SpeciesSpecies", "WaterLake")
anywhere but whisperwood.html; tools/nav-labels.py rewrites them.
Lake count (error): a title or description that states a site-wide count ("23 Ohio lakes", "and 20 more Ohio
waters") that does not match the registry in js/lakes.js. A correct count that still says "lakes" instead of
"waters" is a warning only.
"""
import html, json, os, pathlib, re, sys

# NB_ROOT=<dir> checks another copy of the site (tools/check-all.py uses it to read the live checkout without writing)
root = pathlib.Path(os.environ.get("NB_ROOT") or pathlib.Path(__file__).resolve().parent.parent)
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import registry  # noqa: E402
SITE = "https://nightbiteoh.com/"
REG = registry.load(root)
WATER_COUNT = len(REG["order"])
_LABELS = []
for _id, _L in REG["lakes"].items():
    for _key in ("name", "short"):
        _v = (_L.get(_key) or "").strip()
        if _v:
            _LABELS.append((_v, _id))
_LABELS.sort(key=lambda x: len(x[0]), reverse=True)
MORE_RE = re.compile(r"\band (\d+) more Ohio (lakes|waters)\b", re.I)
TOTAL_RE = re.compile(r"(?<!more )(\d+) Ohio (lakes|waters)\b", re.I)


def named_waters(text):
    found, used = set(), [False] * len(text)
    for phrase, i in _LABELS:
        for m in re.finditer(r"(?<![A-Za-z])" + re.escape(phrase) + r"(?![A-Za-z])", text):
            if any(used[m.start():m.end()]):
                continue
            for j in range(m.start(), m.end()):
                used[j] = True
            found.add(i)
    return found


def count_errors(rel, label, text):
    """Error on a stale site-wide water count; warn when a correct count still says lakes."""
    out_err, out_warn = [], []
    for m in MORE_RE.finditer(text):
        num, noun = int(m.group(1)), m.group(2).lower()
        named = len(named_waters(text[:m.start()]))
        if named < 1 or named + num != WATER_COUNT:
            out_err.append(f"{rel}: {label} names {named} waters and {num} more, which is not the registry ({WATER_COUNT})")
        elif noun != "waters":
            out_warn.append(f"{rel}: {label} count is right but says \"{noun}\"; use \"waters\" for the whole group")
    for m in TOTAL_RE.finditer(text):
        num, noun = int(m.group(1)), m.group(2).lower()
        if num != WATER_COUNT:
            out_err.append(f"{rel}: {label} count {num} does not match the registry ({WATER_COUNT} waters)")
        elif noun != "waters":
            out_warn.append(f"{rel}: {label} count is right but says \"{noun}\"; use \"waters\" for the whole group")
    return out_err, out_warn

BASIC_ONLY = {"404.html", "offline.html"}
OG = ["og:site_name", "og:type", "og:title", "og:description", "og:url", "og:image",
      "og:image:width", "og:image:height", "og:image:alt"]
TW = ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]

errors, warnings, checked = [], [], 0
seen = {"title": {}, "description": {}, "h1": {}}   # text -> first page that used it
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
    if 'class="nav-label-short"' in src and not rel.startswith("whisperwood"):
        err("old two-span nav labels (run python3 tools/nav-labels.py)")
    if 'class="nav-more-item"' in src and not rel.startswith("whisperwood"):
        err("nav More not marked for desktop (run python3 tools/nav-desk-more.py)")
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
        ce, cw = count_errors(rel, label, html.unescape(text))
        errors.extend(ce)
        warnings.extend(cw)
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
    if not noindex:
        h1 = re.search(r"<h1\b[^>]*>(.*?)</h1>", src, re.S)
        h1 = " ".join(html.unescape(re.sub(r"<[^>]+>", "", h1.group(1))).split()) if h1 else ""
        for kind, text in (("title", html.unescape(title)), ("description", html.unescape(desc)), ("h1", h1)):
            if not text:
                continue
            if text in seen[kind]:
                err(f"same {kind} as {seen[kind][text]}: {text[:70]}")
            else:
                seen[kind][text] = rel

for w in warnings:
    print("warn:", w)
for e in errors:
    print("ERROR:", e)
print(f"check-meta: {checked} pages, {len(errors)} errors, {len(warnings)} warnings")
sys.exit(1 if errors else 0)
