#!/usr/bin/env python3
"""Build every lake's home page, Hoover too, from one template: <id>/index.html for every lake in js/lakes.js
(the lake list, names and order come from js/lakes.js; each page's title and description from data/quick-facts.json).
The template is tools/lake-home.html (the Hoover home markup; the site root index.html is the water picker).

Run from the repo root after any change to tools/lake-home.html, then run tools/stamp-version.py:
    python3 tools/build-lake-pages.py && python3 tools/stamp-version.py

Each copy:
  · gets <base href="../"> so every relative link, image, script and fetch() resolves from the site root
    (same files, same service worker scope); in-page links (#main, #get-the-app) become alum/#main and so on;
  · says which lake it is (<meta name="nb-home" content="alum">), which js/lakes.js reads before first paint;
  · has its own title, description, canonical, og:url, og:title, og:description, og:image and JSON-LD url;
  · has the lake's names already filled in [data-lk] spots, so nothing swaps after paint;
  · has its own Quick facts block and JSON-LD (see below);
  · keeps only its own lake's blocks and pool chart (tools/lake_isolate.py drops every other lake's data-for element
    and sets <html data-lake="<id>">); the template keeps all of them. tools/check-lake-isolation.py checks this.
sitemap.xml gets today's <lastmod> (ET) for every lake home, and the root, whose content changed on this build.

Hoover's pool snapshot (the USGS snapshot routine's three lines: correction-line, the Checked time, water-temp) is
edited in hoover/index.html, the page visitors see. This script copies those three lines from hoover/index.html into
the template first, so a rebuild never undoes the routine's last update.

Quick facts: a static <details> block between <!-- nb:quick-facts --> markers, plain HTML with no script, built from
data/quick-facts.json (motors and speed, ramps and access, pool, night rules, sources, checked date). The gauge link or
"No public gauge" line comes from the lake's pool entry in js/lakes.js. A field missing from the JSON is left out.
JSON-LD (between <!-- nb:jsonld --> markers): every lake home gets its own WebPage, part of the WebSite that the
site root (the water picker) declares. Each WebPage carries dateModified = that lake's "checked" date, the same date
the page shows as "Facts checked". The template's own two blocks are refreshed with Hoover's.
Tonight at a glance: tools/glance_bake.py bakes the strip from each page's own pool card (level, temp, Checked time)
and, for lakes other than Hoover, writes that lake's snapshot from js/lakes.js into the pool card's static lines.
Never edit the <lake>/index.html copies by hand (except the three snapshot lines in hoover/index.html); they are overwritten.
"""
import datetime, html, json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
TEMPLATE = root / "tools" / "lake-home.html"
src = TEMPLATE.read_text()
SITE = "https://nightbiteoh.com/"
FACTS = json.loads((root / "data" / "quick-facts.json").read_text())["lakes"]
LAKES_JS = (root / "js" / "lakes.js").read_text()
WEBSITE_ID = SITE + "#website"
ORG_ID = SITE + "#organization"

# Every lake in js/lakes.js, Hoover too, in ORDER: name and short from js/lakes.js, the page's own
# <title> and meta description from data/quick-facts.json ("title", "description"). A new lake needs no edit here.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import registry  # noqa: E402
import glance_bake  # noqa: E402  (the static Tonight at a glance strip and pool card snapshot lines)
import lake_isolate  # noqa: E402  (each lake home keeps only its own data-for blocks and chart)
import importlib.util  # noqa: E402

REG = registry.load(root)

# picker tile charts first (assets/tiles/<id>.png and their sw.js PRECACHE lines), so a lake whose chart was just
# added gets its tile on this build; see tools/build-tile-charts.py
_spec = importlib.util.spec_from_file_location("build_tile_charts", pathlib.Path(__file__).with_name("build-tile-charts.py"))
_tiles = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_tiles)
_changed = _tiles.build(root)
if _changed:
    print("build-tile-charts: " + ", ".join(_changed))
LAKES = {}
for _id in REG["order"]:
    _f = FACTS.get(_id) or {}
    if not (_f.get("title") and _f.get("description")):
        sys.exit(f"build-lake-pages: data/quick-facts.json needs a title and description for {_id}")
    LAKES[_id] = {"name": REG["lakes"][_id]["name"], "short": REG["lakes"][_id]["short"],
                  "title": _f["title"], "desc": _f["description"]}


import importlib.util as _ilu
_wd = _ilu.spec_from_file_location("wrap_dates", str(__import__("pathlib").Path(__file__).resolve().parent / "wrap-dates.py"))
_wdm = _ilu.module_from_spec(_wd); _wd.loader.exec_module(_wdm)
def WRAP_DATES(h): return _wdm.wrap(h)[0]

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


def stale_cfg(lake):
    """pool.stale in js/lakes.js (a USGS gauge that stopped reporting): (site, lastWhen, url), or None."""
    m = re.search(r"\n    " + lake + r": \{\n.*?\n      pool: \{(.*?)\n      \},", LAKES_JS, re.S)
    st = m and re.search(r'stale: \{ site: "(\w+)", last: "[^"]*", lastWhen: "([^"]+)", url: "([^"]+)" \}', m.group(1))
    return st.groups() if st else None


def t(s):
    return html.escape(s, quote=False)


def quick_facts(lake):
    F = FACTS[lake]
    src, gauge, site = pool_cfg(lake)
    rows = []
    if F.get("motors"):
        rows.append(("Motors and speed", t(F["motors"])))
    if F.get("ramps"):
        ramps = t(F["ramps"])
        D = F.get("docks")   # optional dated end of season dock line, official source only
        if D:
            ramps += (f'<br><span class="qf-docks">Docks, checked <time datetime="{D["checked"]}">{nice_date(D["checked"])}</time>: '
                      f'{t(D["text"])} Source: <a href="{D["source"][1]}" target="_blank" rel="noopener">{t(D["source"][0])}</a>. '
                      f'<a href="water#docks">Dock season, all lakes</a>.</span>')
        rows.append(("Ramps and access", ramps))
    pool = t(F["pool"]) + " " if F.get("pool") else ""
    if src == "usgs" and gauge:
        pool += f'Live level: <a href="{gauge}" target="_blank" rel="noopener">USGS gauge {site}</a>.'
    elif src == "cwms" and gauge:
        pool += f'Live level: <a href="{gauge}" target="_blank" rel="noopener">Corps of Engineers gauge</a>.'
    elif stale_cfg(lake):
        st_site, st_when, st_url = stale_cfg(lake)
        pool += f'<a href="{st_url}" target="_blank" rel="noopener">USGS gauge {st_site}</a> has not reported since {st_when}, so this site shows no live level.'
    else:
        pool += "No public gauge, so this site shows no live level."
    rows.append(("Normal pool", pool))
    if F.get("night"):
        night = t(F["night"])
        H = F.get("hours") or {}
        if H.get("source"):
            night += f' Source: <a href="{H["source"][1]}" target="_blank" rel="noopener">{t(H["source"][0])}</a>.'
        rows.append(("Night rules", night))
    srcs = "; ".join(f'<a href="{u}" target="_blank" rel="noopener">{t(n)}</a>' for n, u in F["sources"])
    # rule lines get data-nb-rule: js/i18n.js adds a translated "draft, check the official source" note in other languages
    dl = "\n".join(f"          <div><dt>{k}</dt><dd{' data-nb-rule' if k in ('Motors and speed', 'Night rules') else ''}>{v}</dd></div>" for k, v in rows)
    return (
        '    <!-- nb:quick-facts (tools/build-lake-pages.py) -->\n'
        '    <details class="how-to-read quick-facts" id="quick-facts">\n'
        '      <summary><h2 class="qf-title">Quick facts</h2>'
        f'<span class="qf-checked">Facts checked <time datetime="{F["checked"]}">{nice_date(F["checked"])}</time></span></summary>\n'
        '      <div class="how-to-read-body">\n'
        '        <dl class="qf-list">\n'
        f'{dl}\n'
        '        </dl>\n'
        f'        <p class="meta qf-src">Sources: {srcs}.</p>\n'
        '        <details class="info-tip"><summary><span class="info-i" aria-hidden="true">i</span><span class="sr-only">About these facts</span></summary><p class="info-tip-body">Unofficial summary. Posted signs and the agencies above have the final word.</p></details>\n'
        '      </div>\n'
        '    </details>\n'
        '    <!-- /nb:quick-facts -->'
    )


def clock_label(hhmm):
    """"23:00" -> "11 p.m.", "06:30" -> "6:30 a.m." (the site's AP style)."""
    h, m = (int(x) for x in hhmm.split(":"))
    ap = "a.m." if h < 12 else "p.m."
    h12 = h % 12 or 12
    return f"{h12}{':%02d' % m if m else ''} {ap}"


def night_chip(lake):
    """Night-rules chip under the hero (S5), from data/quick-facts.json "hours". Official source only; no hours, no chip.
    Static text works without JS; js/night-rules.js adds the live ET countdown from the data-* attributes."""
    H = FACTS[lake].get("hours")
    if not H or H.get("none"):
        return '    <!-- nb:night-rules (tools/build-lake-pages.py) -->\n    <!-- /nb:night-rules -->'
    o, c = H.get("open"), H.get("close")
    attrs = f' data-open="{o or ""}" data-close="{c or ""}" data-authority="{H["authority"]}"'
    if H.get("fishing_after_hours"):
        attrs += ' data-after="fishing"'
    reopen = clock_label(o) if o and ":" in o else ""
    if reopen:
        attrs += f' data-reopen="{reopen}"'
    return (
        '    <!-- nb:night-rules (tools/build-lake-pages.py) -->\n'
        f'    <a class="night-chip" id="night-rules" href="{H["source"][1]}" target="_blank" rel="noopener"{attrs}>\n'
        f'      <span class="night-chip-text">{t(H["chip"])}</span>\n'
        '      <span class="night-chip-left" data-nr="left" hidden></span>\n'
        f'      <span class="sr-only"> Source: {t(H["source"][0])} (opens in a new tab)</span>\n'
        '    </a>\n'
        '    <!-- /nb:night-rules -->'
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
    body = json.dumps(items, ensure_ascii=False)
    return ('  <!-- nb:jsonld (tools/build-lake-pages.py) -->\n'
            f'  <script type="application/ld+json">\n  {body}\n  </script>\n'
            '  <!-- /nb:jsonld -->')


def fill(h, lake, name, url, title):
    h = sub1(r"[ \t]*<!-- nb:quick-facts.*?<!-- /nb:quick-facts -->", lambda m: quick_facts(lake), h, re.S)
    h = sub1(r"[ \t]*<!-- nb:night-rules.*?<!-- /nb:night-rules -->", lambda m: night_chip(lake), h, re.S)
    h = sub1(r"[ \t]*<!-- nb:jsonld.*?<!-- /nb:jsonld -->", lambda m: jsonld(lake, name, url, title), h, re.S)
    return h


# Hoover's pool snapshot lines: hoover/index.html (where the USGS snapshot routine writes) -> the template
SNAP = [r'^[ \t]*<p class="pool-lead" id="correction-line">.*$', r'^[ \t]*Checked: <time datetime=.*$',
        r'^[ \t]*<span class="value" id="water-temp">.*$']
_hv = root / "hoover" / "index.html"
if _hv.exists():
    _old = _hv.read_text()
    for pat in SNAP:
        o = re.search(pat, _old, re.M); m = re.search(pat, src, re.M)
        if o and m and o.group(0) != m.group(0):
            src = src[:m.start()] + o.group(0) + src[m.end():]

# the template's own Quick facts and JSON-LD: Hoover's, so it reads like the page it becomes
new_src = fill(src, "hoover", "Hoover Reservoir", SITE + "hoover/", LAKES["hoover"]["title"])
# and its glance strip, baked from Hoover's own pool card lines (tools/glance_bake.py)
new_src = glance_bake.bake(new_src, REG["lakes"]["hoover"].get("pool") or {}, (REG["lakes"]["hoover"].get("nws") or {}).get("page"), card=False)
if new_src != TEMPLATE.read_text():
    TEMPLATE.write_text(new_src)
    print("wrote tools/lake-home.html (Hoover quick facts, JSON-LD, snapshot lines)")
src = new_src
TEMPLATE_NOTE = re.compile(r"<!-- Template for every lake home.*?-->\n", re.S)
src = TEMPLATE_NOTE.sub("", src, count=1)
# the template's own noindex (it is copied to live with the tools, but is not a page); never on the lake homes
src = re.sub(r'[ \t]*<meta name="robots" content="noindex" data-nb-template>\n', "", src, count=1)

# share tags (og:* and twitter:*) exactly as tools/build-meta.py writes them, the ?v= stamps from sw.js VERSION
# (as tools/stamp-version.py writes them) and the What's new data-updates date from the site root, so running this
# script alone never regresses a lake home's own twitter: tags, stamps or New dot
_bm = importlib.util.spec_from_file_location("build_meta", pathlib.Path(__file__).with_name("build-meta.py"))
build_meta = importlib.util.module_from_spec(_bm); _bm.loader.exec_module(build_meta)
_ver = re.search(r'var VERSION = "([^"]+)"', (root / "sw.js").read_text())
STAMP_RE = re.compile(r'((?:src|href)=")((?:\.\./|/night-bite-preview/|/)?(?:css/[\w.-]+\.css|js/[\w.-]+\.js))(?:\?v=[^"]*)?(")')
_upd = re.search(r'<a href="(?:\.\./|/night-bite-preview/|/)?updates" data-updates="([^"]*)"', (root / "index.html").read_text())
UPD_RE = re.compile(r'(<a href="(?:\.\./|/night-bite-preview/|/)?updates")(?: data-updates="[^"]*")?')


def finish(rel, h):
    h, err = build_meta.share(rel, h)
    if err:
        sys.exit("build-lake-pages: " + err)
    if _ver:
        h = STAMP_RE.sub(lambda x: x.group(1) + x.group(2) + "?v=" + _ver.group(1) + x.group(3), h)
    if _upd:
        h = UPD_RE.sub(lambda m: f'{m.group(1)} data-updates="{_upd.group(1)}"', h)
    return h


# sitemap.xml <lastmod>: today (ET) for every page whose content changed on this build (version stamps ignored)
LASTMOD = set()


def unstamped(text):
    return re.sub(r"v\d+-\d{4}-\d\d-\d\d", "", text)


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
    # the map image alt names this lake (the template carries Hoover's)
    h = h.replace("Outline map of Hoover Reservoir with pins", f"Outline map of {L['name']} with pins", 1)
    # this lake's own snapshot in the pool card (not Hoover's) and the glance strip baked from it, so the first paint,
    # a page with JavaScript off and a page whose USGS or NWS calls fail all show a stamped reading, never "--"
    _c = REG["lakes"][lake]
    h = glance_bake.bake(h, _c.get("pool") or {}, (_c.get("nws") or {}).get("page"), card=lake != "hoover")
    # in-page links and Home links: with <base href="../"> they would otherwise point at the root page
    h = re.sub(r'href="#', f'href="{lake}/#', h)
    h = re.sub(r'href="\./"', f'href="{lake}/"', h)
    # lake names in place before first paint (js/lakes.js would fill the same text)
    for key in ("name", "short"):
        h = re.sub(r'(<span[^>]*data-lk="' + key + r'"[^>]*>)[^<]*(</span>)', r"\g<1>" + L[key] + r"\2", h)
    # only this lake's blocks and chart: the template carries every lake's; switching lakes is a page load
    h = lake_isolate.isolate(h, lake)
    # S13: written dates in <time datetime> so js/i18n.js writes them with Intl in the picked language
    h = WRAP_DATES(h)
    h = h.replace("<!DOCTYPE html>\n", "<!DOCTYPE html>\n<!-- Built from tools/lake-home.html by tools/build-lake-pages.py. Do not edit by hand (except the three snapshot lines in hoover/index.html). -->\n", 1)
    h = finish(f"{lake}/index.html", h)
    out = root / lake / "index.html"
    out.parent.mkdir(exist_ok=True)
    if out.exists() and unstamped(out.read_text()) != unstamped(h):
        LASTMOD.add(url)
    out.write_text(h)
    print(f"wrote {out.relative_to(root)}")


# The site root (index.html) is the water picker: plain links to every lake home, grouped by region in the order of
# REGIONS in js/lakes.js (empty regions left out), and the site-wide JSON-LD (WebSite, Organization, WebPage).
# Written between markers, so a new lake in js/lakes.js shows up here with no edit to index.html.
def chart_img(lid, eager=False):
    """The picker tile's chart: assets/tiles/<id>.png (north up, no arrow; tools/build-tile-charts.py makes it from the
    pool card chart). Drawn at a whole-number scale (1x to 3x) that fits a 148px tall well, so pixels stay crisp."""
    src = f"assets/tiles/{lid}.png"
    f = root / src
    if not f.exists():
        return ""   # a new lake with no chart yet; tools/new-lake.py lists the missing tile
    b = f.read_bytes()
    w, h = int.from_bytes(b[16:20], "big"), int.from_bytes(b[20:24], "big")   # PNG IHDR
    k = max(1, min(3, 148 // h, 300 // w))
    lazy = "" if eager else ' loading="lazy"'
    return f'<img src="{src}" alt="" width="{w * k}" height="{h * k}"{lazy} decoding="async">'


EAGER_TILES = 4   # the first row on the widest layout loads at once; the rest load as they scroll into view


def picker_tile(lid):
    c = REG["lakes"][lid]
    pool = c.get("pool") or {}
    q = " ".join([c["name"], c["short"], c.get("area") or ""] + list(c.get("aliases") or [])).lower()
    gauge = ("Live level" + (" and temp" if pool.get("temp") else "")) if pool.get("src") else "No public gauge"
    # the area line only when it says more than the region heading above it (West central Ohio under Central Ohio)
    rname = next((r["name"] for r in REG["regions"] if r["id"] == c["region"]), "")
    area = (f'<span class="wp-area">{html.escape(c["area"], quote=False)}</span>'
            if c.get("area") and c["area"].lower() != rname.lower() else "")
    return (f'          <li class="wp-item"><a class="wp-tile" href="{registry.home(lid)}" data-water="{lid}" data-q="{esc(q)}">'
            f'<span class="wp-art" aria-hidden="true">{chart_img(lid, REG["order"].index(lid) < EAGER_TILES)}</span>'
            f'<span class="wp-head"><span class="wp-name">{html.escape(c["name"], quote=False)}</span>'
            f'{area}</span>'
            f'<span class="wp-gauge"{" data-live" if pool.get("src") else ""}>{gauge}</span></a></li>')


def water_picker():
    parts = []
    for rg in REG["regions"]:
        ids = [i for i in REG["order"] if REG["lakes"][i]["region"] == rg["id"]]
        if not ids:
            continue
        name = html.escape(rg["name"], quote=False)
        parts.append(f'      <section class="wp-region" id="region-{rg["id"]}" data-region="{rg["id"]}" aria-labelledby="wp-h-{rg["id"]}">\n'
                     f'        <h3 class="wp-region-title" id="wp-h-{rg["id"]}">{name}</h3>\n'
                     f'        <ul class="wp-grid">\n' + "\n".join(picker_tile(i) for i in ids) + '\n        </ul>\n      </section>')
    return ("      <!-- nb:water-picker (tools/build-lake-pages.py, from js/lakes.js) -->\n" + "\n".join(parts)
            + "\n      <!-- /nb:water-picker -->")


def picker_chips():
    chips = ['        <a class="wp-chip" href="#waters" data-chip="all">All waters</a>']
    for rg in REG["regions"]:
        if any(REG["lakes"][i]["region"] == rg["id"] for i in REG["order"]):
            chips.append(f'        <a class="wp-chip" href="#region-{rg["id"]}" data-chip="{rg["id"]}">'
                         f'{html.escape(rg["name"].replace(" Ohio", ""), quote=False)}</a>')
    return ("      <!-- nb:water-chips (tools/build-lake-pages.py, from js/lakes.js) -->\n" + "\n".join(chips)
            + "\n      <!-- /nb:water-chips -->")


def root_jsonld(title):
    checked = max((FACTS.get(i) or {}).get("checked", "") for i in REG["order"])
    data = [
        {"@context": "https://schema.org", "@type": "WebSite", "@id": WEBSITE_ID, "name": "The Night Bite",
         "alternateName": ["Night Bite OH", "The Night Bite Ohio", "nightbiteoh.com"], "url": SITE,
         "inLanguage": "en-US", "publisher": {"@id": ORG_ID}},
        {"@context": "https://schema.org", "@type": "Organization", "@id": ORG_ID, "name": "The Night Bite", "url": SITE,
         "logo": {"@type": "ImageObject", "url": SITE + "assets/icons/icon-512.png", "width": 512, "height": 512},
         "sameAs": ["https://www.facebook.com/profile.php?id=61596457070134", "https://www.instagram.com/nightbiteohio/", "https://x.com/NightBiteOH"]},
        {"@context": "https://schema.org", "@type": "WebPage", "@id": SITE + "#webpage", "url": SITE, "name": title,
         "isPartOf": {"@id": WEBSITE_ID}, "dateModified": checked or None, "inLanguage": "en-US"},
    ]
    if not checked:
        del data[2]["dateModified"]
    return ("  <!-- nb:jsonld (tools/build-lake-pages.py) -->\n  <script type=\"application/ld+json\">\n  "
            + json.dumps(data, ensure_ascii=False) + "\n  </script>\n  <!-- /nb:jsonld -->")


ROOT_PAGE = root / "index.html"
r = ROOT_PAGE.read_text()
if 'name="nb-root"' not in r:
    sys.exit("build-lake-pages: index.html is not the water picker (<meta name=\"nb-root\"> missing)")
r_title = html.unescape(re.search(r"<title>([^<]*)</title>", r).group(1))
new_r = sub1(r"[ \t]*<!-- nb:water-picker.*?<!-- /nb:water-picker -->", lambda m: water_picker(), r, re.S)
new_r = sub1(r"[ \t]*<!-- nb:water-chips.*?<!-- /nb:water-chips -->", lambda m: picker_chips(), new_r, re.S)
new_r = sub1(r"[ \t]*<!-- nb:jsonld.*?<!-- /nb:jsonld -->", lambda m: root_jsonld(r_title), new_r, re.S)
new_r = WRAP_DATES(new_r)
if new_r != r:
    if unstamped(new_r) != unstamped(r):
        LASTMOD.add(SITE)
    ROOT_PAGE.write_text(new_r)
    print("wrote index.html (water picker tiles and region chips, site JSON-LD)")

if LASTMOD:
    import zoneinfo
    today = datetime.datetime.now(zoneinfo.ZoneInfo("America/New_York")).date().isoformat()
    SM = root / "sitemap.xml"
    sm = SM.read_text()
    for u in sorted(LASTMOD):
        sm = re.sub(r"(<loc>" + re.escape(u) + r"</loc>\s*<lastmod>)[^<]*(</lastmod>)", r"\g<1>" + today + r"\2", sm)
    if sm != SM.read_text():
        SM.write_text(sm)
        print(f"sitemap.xml: lastmod {today} for {len(LASTMOD)} changed page(s)")
