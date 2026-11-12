#!/usr/bin/env python3
"""Scaffold a new water from one entry: registry, Quick facts, sitemap, Bait nearby slot, then the build order.

    python3 tools/new-lake.py --from tools/new-lake.example.json            # write it, build, print the checklist
    python3 tools/new-lake.py --from lake.json --dry-run                     # show what it would write, change nothing
    python3 tools/new-lake.py --slug dow2 --name "Dow Lake" --region southeast --lat 39.345 --lng -82.03 \\
        --source "ODNR, Strouds Run State Park=https://ohiodnr.gov/..."     # the same with CLI args
    python3 tools/new-lake.py --remove dow2 --yes                            # undo a scaffold (registry, data, sitemap, page)
    python3 tools/new-lake.py --root /tmp/copy ...                           # work on another copy of the site

What it writes (all from the entry; nothing is made up):
  · js/lakes.js: a LAKES entry and the id at the end of ORDER. NWS forecast grid, station and alert zones come from
    api.weather.gov/points/<lat>,<lng> (official NWS); --no-nws leaves nws null for you to fill. The gauge comes from
    usgs_site (USGS) or cwms (Army Corps) when given; otherwise the lake has no public gauge (pool.src null). map is
    null, spots and species are empty until you add them from a source.
  · data/quick-facts.json: checked date, title, description and only the facts that came with a source
    (motors, ramps, pool, night). A fact without a source is left out, never guessed.
  · sitemap.xml: <id>/ after the last lake home. data/bait-shops.json: an empty list (the card says No shops confirmed yet).
  · then runs tools/build-tile-charts.py --lake <id> (the picker's north-up tile chart and its sw.js precache line,
    once assets/<id>-chart.png exists), build-lake-pages.py, build-docks.py, build-meta.py, stamp-version.py, build-updates.py, wrap-dates.py
    (unless --no-build). build-lake-pages.py also refreshes every tile, so a chart added later needs no extra step.
Sources must be official: USGS, Army Corps, ODNR (ohio.gov), NWS, MWCD, or a host already used in data/quick-facts.json
(vetted city, park and marina pages). Another official city, park or marina host needs --allow-host HOST, after you
have checked it is the official page. Google Maps listings are for bait shops only, and those go in data/bait-shops.json.
The checklist at the end lists every field and file that still has no official source or content.

Entry (JSON; see tools/new-lake.example.json): slug, name, short, area, region, lat, lng, owner, aliases,
usgs_site, usgs_temp (true only if that USGS site reports water temp), cwms {office, ts, gauge_url}, full_pool
{ft, source [name, url]}, title, description, facts {motors|ramps|pool|night: {text, source [name, url]}},
sources [[name, url], ...], checked (YYYY-MM-DD, default today).
"""
import argparse, datetime, json, pathlib, re, shutil, subprocess, sys, urllib.parse, urllib.request

TOOLS = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS))
import registry  # noqa: E402

SITE = registry.SITE
AGENCY_HOSTS = ("usgs.gov", "usace.army.mil", "ohiodnr.gov", "ohio.gov", "weather.gov", "mwcd.org")
FACT_KEYS = ("motors", "ramps", "pool", "night")
UA = "NightBite new-lake (contact@nightbiteoh.com)"

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--from", dest="src", help="entry JSON file")
ap.add_argument("--slug"); ap.add_argument("--name"); ap.add_argument("--short"); ap.add_argument("--area")
ap.add_argument("--region"); ap.add_argument("--lat", type=float); ap.add_argument("--lng", type=float)
ap.add_argument("--owner"); ap.add_argument("--usgs-site"); ap.add_argument("--title"); ap.add_argument("--description")
ap.add_argument("--source", action="append", default=[], help='"Name=URL", repeatable')
ap.add_argument("--allow-host", action="append", default=[], help="an official city, park or marina host you checked")
ap.add_argument("--root", default=str(TOOLS.parent), help="site copy to edit (default this checkout)")
ap.add_argument("--no-nws", action="store_true", help="do not ask api.weather.gov; nws stays null")
ap.add_argument("--no-build", action="store_true")
ap.add_argument("--dry-run", action="store_true", help="print what would change, write nothing")
ap.add_argument("--remove", metavar="SLUG", help="remove a scaffolded lake again (needs --yes)")
ap.add_argument("--yes", action="store_true")
a = ap.parse_args()
ROOT = pathlib.Path(a.root).resolve()
today = datetime.date.today().isoformat()


def die(msg):
    sys.exit("new-lake: " + msg)


def read(rel):
    return (ROOT / rel).read_text()


def write(rel, text):
    if a.dry_run:
        print(f"  would write {rel}")
    else:
        (ROOT / rel).write_text(text)
        print(f"  wrote {rel}")


BUILD_LAKE = None   # the new lake's slug, so build-tile-charts draws only its tile (--remove runs a full pass)


def build():
    if a.no_build or a.dry_run:
        print("build skipped" + (" (dry run)" if a.dry_run else ""))
        return
    for b in ("build-tile-charts.py", "build-lake-pages.py", "build-docks.py", "build-meta.py", "stamp-version.py", "build-updates.py", "wrap-dates.py", "i18n-extract.py", "sw-precache.py"):
        args = [sys.executable, str(ROOT / "tools" / b)]
        if b == "build-tile-charts.py":   # the north-up tile chart for the picker, plus its sw.js precache line
            args += ["--root", str(ROOT)] + (["--lake", BUILD_LAKE] if BUILD_LAKE else [])
        p = subprocess.run(args, cwd=ROOT, capture_output=True, text=True)
        last = (p.stdout.strip().splitlines() or [""])[-1]
        print(f"  {b}: {'ok' if p.returncode == 0 else 'FAILED'} {last}")
        if p.returncode:
            die(f"{b} failed:\n{p.stdout}{p.stderr}")


# ---------------------------------------------------------------- remove
if a.remove:
    sid = a.remove
    if not re.fullmatch(r"[a-z][a-z0-9]*", sid):
        die("bad slug")
    reg = registry.load(ROOT)
    if sid not in reg["order"]:
        die(f"{sid} is not in js/lakes.js")
    if sid == "hoover" or not a.yes:
        die("removing a lake needs --yes (and never hoover)")
    js = read("js/lakes.js")
    js, n = re.subn(r",\n    " + sid + r": \{\n.*?\n    \}(?=\n  \};|,\n    [a-z0-9]+: \{)", "", js, count=1, flags=re.S)
    if n != 1:
        die(f"could not find the {sid} entry layout in js/lakes.js")
    js, n = re.subn(r', "' + sid + r'"(?=[,\]])', "", js, count=1)
    write("js/lakes.js", js)
    for rel in ("data/quick-facts.json", "data/bait-shops.json"):
        t = read(rel); d = json.loads(t)
        if d["lakes"].pop(sid, None) is not None:
            write(rel, registry.dump_like(t, d))
    sm = read("sitemap.xml")
    sm2 = re.sub(r"  <url>\n    <loc>" + re.escape(SITE + sid + "/") + r"</loc>\n.*?</url>\n", "", sm, flags=re.S)
    if sm2 != sm:
        write("sitemap.xml", sm2)
    if (ROOT / sid).is_dir() and not a.dry_run:
        shutil.rmtree(ROOT / sid); print(f"  removed {sid}/")
    build()
    print(f"removed {sid}")
    sys.exit(0)

# ---------------------------------------------------------------- entry
E = json.loads(pathlib.Path(a.src).read_text()) if a.src else {}
for k in ("slug", "name", "short", "area", "region", "lat", "lng", "owner", "title", "description"):
    v = getattr(a, k)
    if v is not None:
        E[k] = v
if a.usgs_site:
    E["usgs_site"] = a.usgs_site
for s in a.source:
    if "=" not in s:
        die(f'--source needs "Name=URL": {s}')
    n, u = s.split("=", 1)
    E.setdefault("sources", []).append([n.strip(), u.strip()])

slug = E.get("slug") or ""
if not re.fullmatch(r"[a-z][a-z0-9]*", slug):
    die("slug must be lowercase letters and digits, like saltfork")
for k in ("name", "region"):
    if not E.get(k):
        die(f"{k} is required")
if E.get("lat") is None or E.get("lng") is None:
    die("lat and lng are required (the lake's NWS forecast point, on the water)")
if re.search(r"\bCount(y|ies)\b", json.dumps(E)):
    die("no county names on the site: reword the entry")
if re.search(r"\bBuckeye\b(?! (Lake|Trail|State))", json.dumps(E)):
    die('write "Buckeye Lake" in full')
if re.search(r"\s[-\u2013\u2014]\s", json.dumps(E, ensure_ascii=False)):
    die("no spaced dashes in site copy")

reg = registry.load(ROOT)
if slug in reg["order"]:
    die(f"{slug} is already in js/lakes.js")
if (ROOT / slug).exists():
    die(f"{slug}/ already exists in the site")
regions = {r["id"]: r["name"] for r in reg["regions"]}
if E["region"] not in regions:
    die(f"region must be one of: {', '.join(regions)}")
qf_text = read("data/quick-facts.json")
qf = json.loads(qf_text)
vetted = {urllib.parse.urlsplit(u).hostname for L in qf["lakes"].values() for _, u in L.get("sources", [])}
allowed_extra = set(a.allow_host)


def host_ok(url):
    h = (urllib.parse.urlsplit(url).hostname or "").lower()
    if urllib.parse.urlsplit(url).scheme != "https":
        return False, "not https"
    if "google." in h:
        return False, "Google Maps is for bait shops only (data/bait-shops.json)"
    if any(h == d or h.endswith("." + d) for d in AGENCY_HOSTS):
        return True, "agency"
    if h in vetted:
        return True, "already used in data/quick-facts.json"
    if h in allowed_extra:
        return True, "--allow-host"
    return False, f"{h} is not an agency host; if it is the official city, park or marina page, pass --allow-host {h}"


def need_source(label, src):
    if not (isinstance(src, list) and len(src) == 2 and all(isinstance(x, str) and x for x in src)):
        die(f"{label}: source must be [name, url]")
    ok, why = host_ok(src[1])
    if not ok:
        die(f"{label}: {why}")


short = E.get("short") or E["name"]
sources = [list(s) for s in E.get("sources", [])]
for s in sources:
    need_source("sources", s)
facts, missing = {}, []
for k in FACT_KEYS:
    f = (E.get("facts") or {}).get(k)
    if not f or not f.get("text"):
        missing.append(f"Quick facts '{k}': no sourced text, left out")
        continue
    if not f.get("source"):
        missing.append(f"Quick facts '{k}': text given without a source, left out")
        continue
    need_source(f"facts.{k}", f["source"])
    facts[k] = f["text"]
    if list(f["source"]) not in sources:
        sources.append(list(f["source"]))
if not sources:
    die("at least one official source is required (the lake's agency page)")

# gauge
pool = {"src": None, "srcName": None, "temp": None, "fullPool": None, "gaugeUrl": None}
gauge_note = "no public gauge: the site says so and fetches nothing"
if E.get("usgs_site"):
    site = str(E["usgs_site"])
    if not re.fullmatch(r"\d{8,15}", site):
        die("usgs_site must be the USGS site number")
    pool = {"src": "usgs", "srcName": "USGS", "site": site, "param": "62614", "temp": "00010" if E.get("usgs_temp") else None,
            "fullPool": None, "gaugeUrl": f"https://waterdata.usgs.gov/monitoring-location/USGS-{site}/"}
    gauge_note = f"USGS {site} (lake elevation 62614{', water temp 00010' if E.get('usgs_temp') else ''})"
elif E.get("cwms"):
    c = E["cwms"]
    if not (c.get("office") and c.get("ts") and c.get("gauge_url")):
        die("cwms needs office, ts and gauge_url")
    need_source("cwms.gauge_url", ["Corps gauge", c["gauge_url"]])
    pool = {"src": "cwms", "srcName": "USACE", "office": c["office"], "ts": c["ts"], "temp": None, "fullPool": None, "gaugeUrl": c["gauge_url"]}
    gauge_note = f"Army Corps CWMS {c['office']} {c['ts']}"
fp = E.get("full_pool")
if fp and fp.get("ft") is not None and fp.get("source"):
    need_source("full_pool", fp["source"])
    pool["fullPool"] = fp["ft"]
    if list(fp["source"]) not in sources:
        sources.append(list(fp["source"]))
else:
    missing.append("full pool elevation: no sourced value, left null (the pool card shows no full pool line)")

# NWS (official): grid, hourly forecast, station, alert zones
nws, alerts = None, None
if not a.no_nws:
    def jget(url):
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/geo+json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    lat, lng = E["lat"], E["lng"]
    try:
        P = jget(f"https://api.weather.gov/points/{lat},{lng}")["properties"]
        st = jget(P["observationStations"])["features"][0]["properties"]
        nws = {"hourly": P["forecastHourly"], "point": f"https://api.weather.gov/points/{lat},{lng}", "grid": P["forecastGridData"],
               "station": st["stationIdentifier"], "stationName": f"{st['name']} ({st['stationIdentifier']})",
               "page": f"https://forecast.weather.gov/MapClick.php?lat={lat}&lon={lng}"}
        zones = [P["county"].rsplit("/", 1)[1], P["forecastZone"].rsplit("/", 1)[1]]
        alerts = {"zones": ",".join(zones), "counties": f"the {short} area"}
    except Exception as e:
        die(f"NWS lookup failed ({type(e).__name__}: {e}); retry, or pass --no-nws and fill nws and alerts by hand")
else:
    missing.append("nws and alerts: null (--no-nws); fill from api.weather.gov/points/<lat>,<lng>")

has_gauge = pool["src"] is not None
title = E.get("title") or f"{short} Fishing: {'Level' if has_gauge else 'Map'}, Ramps, Rules | The Night Bite"
desc = E.get("description") or (f"{E['name']} fishing: " + ("live lake level, " if has_gauge else "") + "tonight's bite and species." + ("" if has_gauge else " No public level gauge.") + " Unofficial.")
if not E.get("description"):
    missing.append("description: placeholder from the name only; write one from the sourced facts (under 160 characters)")

# ---------------------------------------------------------------- js/lakes.js
J = lambda v: json.dumps(v, ensure_ascii=False)


def pool_js(p):
    keys = [k for k in ("src", "srcName", "site", "param", "office", "ts", "temp", "fullPool", "gaugeUrl") if k in p]
    return ",\n".join(f"        {k}: {J(p[k])}" for k in keys)


entry = f""",
    {slug}: {{
      id: {J(slug)},
      name: {J(E['name'])},
      short: {J(short)},
      area: {J(E.get('area') or regions[E['region']])},
      lat: {E['lat']}, lng: {E['lng']},
      region: {J(E['region'])}, owner: {J(E.get('owner'))},
      aliases: {J(E.get('aliases') or [])},
      pool: {{
        // {gauge_note} (tools/new-lake.py)
{pool_js(pool)}
      }},
      nws: {"null" if nws is None else "{" + chr(10) + (',' + chr(10)).join(f'        {k}: {J(v)}' for k, v in nws.items()) + chr(10) + "      }"},
      alerts: {"null" if alerts is None else "{ zones: " + J(alerts['zones']) + ", counties: " + J(alerts['counties']) + " }"},
      push: null,
      map: null,       // no map data yet: add js/lake-map-data-{slug}.js and assets/{slug}-chart.png, then set map
      spots: [],
      species: []      // add ids only from ODNR surveys or stocking records
    }}"""
js = read("js/lakes.js")
m = re.search(r"\n    \}\n  \};\n  var ORDER = \[([^\]]*)\];", js)
if not m:
    die("js/lakes.js layout changed: could not find the end of LAKES and ORDER")
js = js[:m.start() + 6] + entry + js[m.start() + 6:]
js = re.sub(r"(var ORDER = \[[^\]]*)\]", lambda x: x.group(1) + f', "{slug}"]', js, count=1)

# ---------------------------------------------------------------- data files and sitemap
L = {"checked": E.get("checked") or today, "title": title, "description": desc}
L.update(facts)
# night-rules chip (S5): "hours" from the entry, only with an official source; otherwise say so (tools/check-hours.py)
H = E.get("hours")
if H and H.get("source"):
    need_source("hours", H["source"])
    L["hours"] = dict(H, checked=H.get("checked") or today)
else:
    L["hours"] = {"none": True, "note": "No official page we found states hours for this water, so there's no night rule to show; follow posted signs.", "checked": today}
    missing.append("hours: no official source, so no night-rules chip (the Night rules row says so)")
L["sources"] = sources
qf["lakes"][slug] = L
bait_text = read("data/bait-shops.json"); bait = json.loads(bait_text)
bait["lakes"].setdefault(slug, [])
sm = read("sitemap.xml")
homes = [registry.home(i) for i in reg["order"]]
locs = list(re.finditer(r"  <url>\n    <loc>([^<]+)</loc>\n.*?</url>\n", sm, re.S))
last_home = [x for x in locs if x.group(1)[len(SITE):] in homes]
if not last_home:
    die("sitemap.xml: no lake home found")
at = last_home[-1].end()
sm = sm[:at] + f"  <url>\n    <loc>{SITE}{slug}/</loc>\n    <lastmod>{today}</lastmod>\n  </url>\n" + sm[at:]

print(f"new-lake {slug} ({E['name']}) in {ROOT}")
write("js/lakes.js", js)
write("data/quick-facts.json", registry.dump_like(qf_text, qf))
write("data/bait-shops.json", registry.dump_like(bait_text, bait))
write("sitemap.xml", sm)
BUILD_LAKE = slug
if not a.dry_run:
    reg2 = registry.load(ROOT)   # parses again: proves the new entry is valid JavaScript
    assert reg2["order"][-1] == slug
build()

# ---------------------------------------------------------------- checklist
print("\nCHECKLIST: still no official source or content (nothing below was filled in)")
cap = slug[0].upper() + slug[1:]
files = {
    f"assets/og/og-{slug}.png": "share card (until then the page shares og-card.png)",
    f"js/lake-map-data-{slug}.js": "map data from the ODNR fishing map (map is null, so the home map falls back)",
    f"assets/{slug}-chart.png": "map chart image (its north-up picker tile and precache line follow on the next build)",
}
for rel, why in files.items():
    if not (ROOT / rel).exists():
        missing.append(f"{rel}: missing, {why}")
if not re.search(r"NightBiteBiting" + cap + r"\b", read("js/biting-data-lakes.js")):
    missing.append(f"js/biting-data-lakes.js: no NightBiteBiting{cap} (what's biting) entry")
missing.append("species and spots in js/lakes.js: empty; add from ODNR surveys or stocking records")
missing.append("data/bait-shops.json: empty list (card says No shops confirmed yet); add shops from Google Maps listings that show the shop open with recent reviews")
docks = json.loads(read("data/docks.json"))
if slug not in docks.get("lakes", {}):
    missing.append("data/docks.json: no entry (run tools/build-docks.py after adding one from the official dock page)")
if E.get("owner") is None:
    missing.append("owner in js/lakes.js: null; set the managing agency from its own page")
others = list(reg["order"])
sp_pages = []
for p in sorted(ROOT.glob("*.html")) + sorted((ROOT / "species").glob("*.html")):
    rel = p.relative_to(ROOT).as_posix()
    if rel.startswith("whisperwood"):
        continue
    t = p.read_text()
    tokens = set(re.findall(r'data-(?:for|lakes)="([^"]*)"', t))
    present = {i for tok in tokens for i in tok.split()}
    n = len(present & set(others))
    if n >= max(2, len(others) // 2) and slug not in present:
        if rel.startswith("species/"):
            sp_pages.append(rel)
        else:
            missing.append(f"{rel}: {n} other lakes have their own blocks (data-for/data-lakes), {slug} has none")
if sp_pages:
    missing.append(f"species pages ({len(sp_pages)}, e.g. {sp_pages[0]}): no {slug} blocks; add one only for species the lake has, from ODNR")
missing.append("DATA-SOURCES.md: add the lake's sources; data/updates.json: a What's new entry (2 to 5 bullets) when it goes live")
for x in missing:
    print("  [ ] " + x)
print(f"\nnext: python3 tools/check-all.py --target local --lakes {slug}")
