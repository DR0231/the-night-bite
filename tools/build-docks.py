#!/usr/bin/env python3
"""Renders data/docks.json into water.html#docks (between the docks:start and docks:end markers).

Edit data/docks.json, then from the repo root:  python3 tools/build-docks.py && python3 tools/stamp-version.py
Statuses: in, ending (needs "ends"; js/docks.js flips it to the after text once the date passes in Columbus),
out (only when an official source says the docks are out), unannounced (the honest default).
An "ending" item whose date has already passed (ET) when this runs is written with its after text already in place
(class is-over), so a reader with JavaScript off never sees "Season ends Oct. 31" in November. js/docks.js does the
same swap in the browser for dates that pass between builds. Rerun this script (check-all and promote run it) to
rebake after a date passes.

Hoover only: an item with "rental": true is the public boat dock rental calendar. After its date the pill may say
the rentals are closed. It must not say the marina docks or the public launch courtesy docks were pulled. Other
waters do not use that flag and keep their own season text.
"""
import datetime, html, json, pathlib, re, sys, zoneinfo

R = pathlib.Path(__file__).resolve().parent.parent
D = json.loads((R / "data" / "docks.json").read_text())
WATCH = {w["id"]: w for w in D["watch"]}
EXT = ' target="_blank" rel="noopener"'
MONTHS = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."]


def ap_date(iso):
    d = datetime.date.fromisoformat(iso)
    return f"{MONTHS[d.month - 1]} {d.day}, {d.year}"


def attr(s):
    # notes carry &rsquo; style entities; keep them as entities inside the attribute
    return s.replace('"', "&quot;")


def src_link(sid):
    w = WATCH[sid]
    return f'<a href="{w["url"]}"{EXT}>{w["label"]}</a>'


PILL = {"in": "is-in", "ending": "is-ending", "out": "is-out", "unannounced": "is-unannounced"}
# Phrases that would turn Hoover's rental calendar into a claim the docks were pulled.
HOOVER_PHYSICAL = re.compile(
    r"season over|are done|docks are out|were removed|have been removed|were pulled|have been pulled|"
    r"pulling the ramp|only the marina|only marina docks|docks were taken out|"
    r"saw the docks|checked the docks|this weekend",
    re.I,
)


def hoover_blob(it):
    return " ".join(it.get(k, "") for k in ("name", "label", "note", "after_label", "after_note") if isinstance(it.get(k), str))


for key, lake in D["lakes"].items():
    for it in lake["items"]:
        assert it["status"] in PILL, it
        assert it["source"] in WATCH, it["source"]
        if it["status"] == "ending":
            datetime.date.fromisoformat(it["ends"])
        for k in ("label", "note", "after_label", "after_note"):
            if " - " in it.get(k, "") or " – " in it.get(k, ""):
                sys.exit(f"spaced dash in {it['name']} {k}")
        if it.get("rental") and key != "hoover":
            sys.exit(f"{key}: rental:true is Hoover only, so other waters keep their own dock process")
        if key == "hoover" and it.get("rental"):
            if it["status"] == "out":
                sys.exit("Hoover rental calendar cannot use status out")
            if it.get("source") != "recparks-docks":
                sys.exit("Hoover rental calendar is sourced from the marinas and docks page")
            hit = HOOVER_PHYSICAL.search(hoover_blob(it))
            if hit:
                sys.exit(f"Hoover rental item asserts physical removal ({hit.group(0)!r})")
        if key == "hoover" and it["status"] == "out" and it.get("source") == "recparks-docks":
            sys.exit("Hoover: the rental page is not a source for status out")

checked = D["checked"]
TODAY = datetime.datetime.now(zoneinfo.ZoneInfo("America/New_York")).date().isoformat()
out = ['      <p class="docks-intro">Who pulls the docks and when, from the City of Columbus, ODNR and marina pages. '
       '<strong>Not announced</strong> means no official date is posted yet.</p>']
for key, lake in D["lakes"].items():
    out.append(f'      <div data-for="{key}" class="docks-lake">')
    out.append(f'        <ul class="dock-status" aria-label="{lake["name"]} dock status">')
    for it in lake["items"]:
        extra, cls, label, note = "", PILL[it["status"]], it["label"], it["note"]
        if it.get("rental"):
            extra += ' data-rental="1"'
        if it["status"] == "ending":
            extra = (f'{extra} data-ends="{it["ends"]}" data-after-label="{attr(it["after_label"])}"'
                     f' data-after-note="{attr(it["after_note"])}"')
            if TODAY > it["ends"]:   # same test as js/docks.js: the day after "ends" in Columbus
                cls, label, note = "is-over", it["after_label"], it["after_note"]
        out.append(f'          <li class="dock-item {cls}"{extra}>')
        out.append(f'            <p class="dock-head"><span class="dock-name">{it["name"]}</span> '
                   f'<span class="dock-pill">{label}</span></p>')
        out.append(f'            <p class="dock-note">{note}</p>')
        out.append('          </li>')
    out.append('        </ul>')
    if lake.get("history"):
        h = lake["history"]
        if lake.get("history_url"):
            h += f' <a href="{lake["history_url"]}"{EXT}>Read it</a>.'
        out.append(f'        <p class="meta dock-history">{h}</p>')
    out.append('        <ul class="dock-calls">')
    for label, tel, shown, tail in lake["calls"]:
        out.append(f'          <li>{label}: <a href="tel:{tel}">{shown}</a>{tail}</li>')
    out.append('        </ul>')
    links = "; ".join(src_link(s) for s in lake["sources"])
    if key == "hoover":
        # ODNR says Columbus maintains the docks. It does not report whether they are in now.
        links += ('; <a href="https://ohiodnr.gov/go-and-do/plan-a-visit/find-a-property/hoover-reservoir-fishing-area"'
                  f'{EXT}>ODNR, Hoover Reservoir Fishing Area</a>')
    ck = lake.get("checked", checked)   # a lake added later carries its own checked date
    out.append(f'        <p class="meta dock-checked" data-checked="{ck}">Last checked '
               f'<time datetime="{ck}">{ap_date(ck)}</time>. Sources: {links}.</p>')
    out.append('      </div>')
block = "\n".join(out)


def slice_lake(html, lake):
    m = re.search(rf'<div data-for="{lake}" class="docks-lake">.*?</div>', html, re.S)
    if not m:
        sys.exit(f"Hoover dock check: no {lake} block")
    return m.group(0)


def require(text, phrase, where):
    if phrase not in text:
        sys.exit(f"Hoover dock check: {where} is missing {phrase!r}")


hoover_html = slice_lake(block, "hoover")
for phrase in (
    "Rentals closed",
    "rental season is closed",
    "unconfirmed",
    "public launch courtesy docks",
    "An open ramp does not mean a dock is installed",
    "not evidence the docks are in",
    "maintains the docks",
    'data-rental="1"',
    "Not confirmed",
    "hoover-reservoir-fishing-area",
    "2026-11-06",
):
    require(hoover_html, phrase, "water.html Hoover docks")
hit = HOOVER_PHYSICAL.search(hoover_html)
if hit:
    sys.exit(f"Hoover dock check: rendered docks assert physical removal ({hit.group(0)!r})")
if "is-out" in hoover_html:
    sys.exit("Hoover dock check: rendered a physical out status")
for other in ("oshaughnessy", "griggs"):
    other_html = slice_lake(block, other)
    require(other_html, "Season over", f"{other} docks")
    require(other_html, "City marina docks", f"{other} docks")
    if 'data-rental="1"' in other_html:
        sys.exit(f"Hoover dock check: {other} picked up the Hoover rental flag")
qf = json.loads((R / "data" / "quick-facts.json").read_text())["lakes"]
hoover_qf = qf["hoover"]["docks"]["text"]
for phrase in (
    "rental season is closed",
    "unconfirmed",
    "public launch courtesy docks",
    "An open ramp does not mean a dock is installed",
    "do not confirm they are in or out",
):
    require(hoover_qf, phrase, "Hoover quick facts")
hit = HOOVER_PHYSICAL.search(hoover_qf)
if hit:
    sys.exit(f"Hoover dock check: quick facts assert physical removal ({hit.group(0)!r})")
if not qf["hoover"]["motors"].startswith("10 hp limit"):
    sys.exit("Hoover dock check: 10 hp rule was changed")
for other in ("oshaughnessy", "griggs"):
    if "marina docks are done" not in qf[other]["docks"]["text"]:
        sys.exit(f"Hoover dock check: {other} quick facts were changed with Hoover")

page = R / "water.html"
t = page.read_text()
start, end = "<!-- docks:start -->", "<!-- docks:end -->"
if start not in t:
    # first run: swap the hand written dock blocks for the markers
    m = re.search(r'(<h2 id="docks-title">Dock season</h2>\n)(.*?)(\n    </section>)', t, re.S)
    assert m, "docks section not found"
    t = t[:m.end(1)] + f"      {start}\n      {end}" + t[m.start(3):]
t = re.sub(re.escape(start) + r".*?" + re.escape(end), lambda _: f"{start}\n{block}\n      {end}", t, flags=re.S)
if 'src="js/docks.js' not in t:
    t = t.replace('  <script src="js/scrollspy.js', '  <script src="js/docks.js"></script>\n  <script src="js/scrollspy.js', 1)
page.write_text(t)
print(f"water.html#docks built from data/docks.json (checked {checked})")
