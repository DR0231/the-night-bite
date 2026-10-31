#!/usr/bin/env python3
"""Build each lake's own home page from index.html: alum/, buckeye/, oshaughnessy/, griggs/, indian/, delaware/,
deercreek/, madison/, knox/, clearfork/, seneca/, dillon/, logan/, saltfork/, burroak/ and dow/index.html.

Run from the repo root after any change to index.html, then run tools/stamp-version.py:
    python3 tools/build-lake-pages.py && python3 tools/stamp-version.py

index.html stays the Hoover home page at the site root, unchanged. Each copy:
  · gets <base href="../"> so every relative link, image, script and fetch() resolves from the site root
    (same files, same service worker scope); in-page links (#main, #get-the-app) become alum/#main and so on;
  · says which lake it is (<meta name="nb-home" content="alum">), which js/lakes.js reads before first paint;
  · has its own title, description, canonical, og:url, og:title, og:description, og:image and JSON-LD url;
  · has the lake's names already filled in [data-lk] spots, so nothing swaps after paint;
  · has its own Quick facts block and JSON-LD (see below).

Quick facts: a static <details> block between <!-- nb:quick-facts --> markers, plain HTML with no script, built from
data/quick-facts.json (motors and speed, ramps and access, pool, night rules, sources, checked date). The gauge link or
"No public gauge" line comes from the lake's pool entry in js/lakes.js. A field missing from the JSON is left out.
JSON-LD (between <!-- nb:jsonld --> markers): the Hoover home at the site root gets WebSite (with alternateName and a
publisher Organization) plus its WebPage; every other lake home gets its own WebPage. Each WebPage carries
dateModified = that lake's "checked" date, the same date the page shows as "Facts checked".
This script also refreshes those two blocks in index.html itself (Hoover); nothing else in index.html changes.
Never edit the <lake>/index.html copies by hand; they are overwritten.
"""
import datetime, html, json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / "index.html").read_text()
SITE = "https://nightbiteoh.com/"
FACTS = json.loads((root / "data" / "quick-facts.json").read_text())["lakes"]
LAKES_JS = (root / "js" / "lakes.js").read_text()
WEBSITE_ID = SITE + "#website"
ORG_ID = SITE + "#organization"

LAKES = {
    "alum": {
        "name": "Alum Creek Lake", "short": "Alum Creek",
        "title": "Alum Creek Fishing: Level, Ramps, Rules | The Night Bite",
        "desc": "Alum Creek Lake fishing: live Corps lake level, unlimited hp south and no wake north, four public ramps, tonight's bite and species. Unofficial.",
    },
    "buckeye": {
        "name": "Buckeye Lake", "short": "Buckeye Lake",
        "title": "Buckeye Lake Fishing: Level, Ramps, Rules | The Night Bite",
        "desc": "Buckeye Lake fishing: live USGS lake level, no hp limit with a 300 ft no wake zone, ramps and the Mud Island access, tonight's bite. Unofficial.",
    },
    "oshaughnessy": {
        "name": "O'Shaughnessy Reservoir", "short": "O'Shaughnessy",
        "title": "O'Shaughnessy Fishing: Level, Ramps, Rules | The Night Bite",
        "desc": "O'Shaughnessy Reservoir fishing: live USGS level, 40 mph by day and 10 mph after sunset, Home Road and Bellepoint ramps, tonight's bite. Unofficial.",
    },
    "griggs": {
        "name": "Griggs Reservoir", "short": "Griggs",
        "title": "Griggs Reservoir Fishing: Level, Rules | The Night Bite",
        "desc": "Griggs Reservoir fishing: live USGS level, 10 mph after sunset, the Griggs boat launch and docks, tonight's bite and species. Unofficial.",
    },
    "indian": {
        "name": "Indian Lake", "short": "Indian Lake",
        "title": "Indian Lake Fishing: Level, Ramps, Rules | The Night Bite",
        "desc": "Indian Lake fishing: live USGS lake level, no hp limit, five state park ramps and the Old Field Beach jetties, tonight's bite. Unofficial.",
    },
    "delaware": {
        "name": "Delaware Lake", "short": "Delaware Lake",
        "title": "Delaware Lake Fishing: Level, Ramps, Rules | The Night Bite",
        "desc": "Delaware Lake fishing: live Corps lake level, unlimited hp, three state park ramps, tonight's bite and species. Unofficial.",
    },
    "deercreek": {
        "name": "Deer Creek Lake", "short": "Deer Creek Lake",
        "title": "Deer Creek Lake Fishing: Level, Rules | The Night Bite",
        "desc": "Deer Creek Lake fishing: live Corps lake level, unlimited hp, two state park ramps and a marina, tonight's bite and species. Unofficial.",
    },
    "madison": {
        "name": "Madison Lake", "short": "Madison Lake",
        "title": "Madison Lake Fishing: Map, Ramps, Rules | The Night Bite",
        "desc": "Madison Lake fishing: electric motors only, one launch ramp, the lake map, park hours, tonight's bite and species. No public level gauge. Unofficial.",
    },
    "knox": {
        "name": "Knox Lake", "short": "Knox Lake",
        "title": "Knox Lake Fishing: Map, Ramps, Rules | The Night Bite",
        "desc": "Knox Lake fishing: 10 hp limit, the Armentrout Road ramp and marina, the lake map, tonight's bite and species. No public level gauge. Unofficial.",
    },
    "clearfork": {
        "name": "Clear Fork Reservoir", "short": "Clear Fork",
        "title": "Clear Fork Reservoir Fishing: Map, Rules | The Night Bite",
        "desc": "Clear Fork Reservoir fishing: idle speed, no wake lake, the free south side ramp, night parking rules, tonight's bite. No public level gauge. Unofficial.",
    },
    "seneca": {
        "name": "Seneca Lake", "short": "Seneca Lake",
        "title": "Seneca Lake Fishing: Level, Ramps, Rules | The Night Bite",
        "desc": "Seneca Lake fishing: live USGS lake level, 399 hp limit, MWCD ramps and the marina, after dark access rules, tonight's bite and species. Unofficial.",
    },
    "dillon": {
        "name": "Dillon Lake", "short": "Dillon Lake",
        "title": "Dillon Lake Fishing: Level, Ramps, Rules | The Night Bite",
        "desc": "Dillon Lake fishing: live Corps lake level, unlimited hp with no wake coves, two south end ramps, tonight's bite and species. Unofficial.",
    },
    "logan": {
        "name": "Lake Logan", "short": "Lake Logan",
        "title": "Lake Logan Fishing: Map, Ramps, Rules | The Night Bite",
        "desc": "Lake Logan fishing: 10 hp and 10 mph limits, two ramps and a marina, the lake map, tonight's bite. No public level gauge. Unofficial.",
    },
    "saltfork": {
        "name": "Salt Fork Lake", "short": "Salt Fork Lake",
        "title": "Salt Fork Lake Fishing: Map, Ramps, Rules | The Night Bite",
        "desc": "Salt Fork Lake fishing: unlimited hp with speed zones, Sugartree and Morning Glory ramps, the lake map, tonight's bite. No public gauge. Unofficial.",
    },
    "burroak": {
        "name": "Burr Oak Lake", "short": "Burr Oak Lake",
        "title": "Burr Oak Lake Fishing: Level, Ramps, Rules | The Night Bite",
        "desc": "Burr Oak Lake fishing: live Corps lake level, 10 hp limit and no jet drives, four ramps, tonight's bite and species. Unofficial.",
    },
    "dow": {
        "name": "Dow Lake", "short": "Dow Lake",
        "title": "Dow Lake Fishing: Map, Ramps, Rules | The Night Bite",
        "desc": "Dow Lake fishing at Strouds Run: 10 hp limit, one ramp with a courtesy dock, shore fishing by the dam, tonight's bite. No public level gauge. Unofficial.",
    },
}


def sub1(pattern, repl, text, flags=0):
    new, n = re.subn(pattern, repl, text, count=1, flags=flags)
    if n != 1:
        sys.exit(f"build-lake-pages: pattern not found: {pattern}")
    return new


def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("'", "&#39;")



def pool_cfg(lake):
    """The lake's pool entry in js/lakes.js: (src, gaugeUrl, site) or (None, None, None) when it has no public gauge."""
    m = re.search(r"\n    " + lake + r": \{\n.*?\n      pool: \{(.*?)\n      \},", LAKES_JS, re.S)
    if not m:
        sys.exit(f"build-lake-pages: no pool entry for {lake} in js/lakes.js")
    p = m.group(1)
    src = re.search(r'src: (?:"(\w+)"|null)', p)
    url = re.search(r'gaugeUrl: "([^"]+)"', p)
    site = re.search(r'site: "(\w+)"', p)
    return (src.group(1) if src else None, url.group(1) if url else None, site.group(1) if site else None)


def nice_date(iso):
    d = datetime.date.fromisoformat(iso)
    mon = d.strftime("%b") + ("." if d.month not in (5, 6, 7) else "")
    if d.month == 6: mon = "June"
    if d.month == 7: mon = "July"
    if d.month == 9: mon = "Sept."
    return f"{mon} {d.day}, {d.year}"


def t(s):
    return html.escape(s, quote=False)


def quick_facts(lake):
    F = FACTS[lake]
    src, gauge, site = pool_cfg(lake)
    rows = []
    if F.get("motors"):
        rows.append(("Motors and speed", t(F["motors"])))
    if F.get("ramps"):
        rows.append(("Ramps and access", t(F["ramps"])))
    pool = t(F["pool"]) + " " if F.get("pool") else ""
    if src == "usgs" and gauge:
        pool += f'Live level: <a href="{gauge}" target="_blank" rel="noopener">USGS gauge {site}</a>.'
    elif src == "cwms" and gauge:
        pool += f'Live level: <a href="{gauge}" target="_blank" rel="noopener">Corps of Engineers gauge</a>.'
    else:
        pool += "No public gauge, so this site shows no live level."
    rows.append(("Normal pool", pool))
    if F.get("night"):
        rows.append(("Night rules", t(F["night"])))
    srcs = "; ".join(f'<a href="{u}" target="_blank" rel="noopener">{t(n)}</a>' for n, u in F["sources"])
    dl = "\n".join(f"          <div><dt>{k}</dt><dd>{v}</dd></div>" for k, v in rows)
    return (
        '    <!-- nb:quick-facts (tools/build-lake-pages.py) -->\n'
        '    <details class="how-to-read quick-facts" id="quick-facts">\n'
        '      <summary><h2 class="qf-title">Quick facts</h2>'
        f'<span class="qf-checked">Facts checked <time datetime="{F["checked"]}">{nice_date(F["checked"])}</time></span></summary>\n'
        '      <div class="how-to-read-body">\n'
        '        <dl class="qf-list">\n'
        f'{dl}\n'
        '        </dl>\n'
        f'        <p class="meta qf-src">Sources: {srcs}. Unofficial summary; posted signs and the agencies above have the final word.</p>\n'
        '      </div>\n'
        '    </details>\n'
        '    <!-- /nb:quick-facts -->'
    )


def jsonld(lake, name, url, title):
    F = FACTS[lake]
    page = {
        "@context": "https://schema.org", "@type": "WebPage", "@id": url + "#webpage", "url": url, "name": title,
        "isPartOf": {"@id": WEBSITE_ID},
        "about": {"@type": "Reservoir" if name.endswith("Reservoir") else "LakeBodyOfWater", "name": name},
        "dateModified": F["checked"], "inLanguage": "en-US",
    }
    items = [page]
    if lake == "hoover":
        items = [
            {"@context": "https://schema.org", "@type": "WebSite", "@id": WEBSITE_ID, "name": "The Night Bite",
             "alternateName": ["Night Bite OH", "The Night Bite Ohio", "nightbiteoh.com"], "url": SITE,
             "inLanguage": "en-US", "publisher": {"@id": ORG_ID}},
            {"@context": "https://schema.org", "@type": "Organization", "@id": ORG_ID, "name": "The Night Bite", "url": SITE,
             "logo": {"@type": "ImageObject", "url": SITE + "assets/icons/icon-512.png", "width": 512, "height": 512}},
            page,
        ]
    body = json.dumps(items, ensure_ascii=False)
    return ('  <!-- nb:jsonld (tools/build-lake-pages.py) -->\n'
            f'  <script type="application/ld+json">\n  {body}\n  </script>\n'
            '  <!-- /nb:jsonld -->')


def fill(h, lake, name, url, title):
    h = sub1(r"[ \t]*<!-- nb:quick-facts.*?<!-- /nb:quick-facts -->", lambda m: quick_facts(lake), h, re.S)
    h = sub1(r"[ \t]*<!-- nb:jsonld.*?<!-- /nb:jsonld -->", lambda m: jsonld(lake, name, url, title), h, re.S)
    return h


# Hoover: refresh its own Quick facts and JSON-LD in index.html first, so every copy starts from the same source
hoover_title = html.unescape(re.search(r"<title>([^<]*)</title>", src).group(1))
new_src = fill(src, "hoover", "Hoover Reservoir", SITE, hoover_title)
if new_src != src:
    (root / "index.html").write_text(new_src)
    print("wrote index.html (Hoover quick facts and JSON-LD)")
src = new_src

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
    h = fill(h, lake, L["name"], url, L["title"])
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
