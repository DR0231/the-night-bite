#!/usr/bin/env python3
"""Renders data/docks.json into water.html#docks (between the docks:start and docks:end markers).

Edit data/docks.json, then from the repo root:  python3 tools/build-docks.py && python3 tools/stamp-version.py
Statuses: in, ending (needs "ends"; js/docks.js flips it to the after text once the date passes in Columbus),
out (only when an official source says the docks are out), unannounced (the honest default).
"""
import datetime, html, json, pathlib, re, sys

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
for lake in D["lakes"].values():
    for it in lake["items"]:
        assert it["status"] in PILL, it
        assert it["source"] in WATCH, it["source"]
        if it["status"] == "ending":
            datetime.date.fromisoformat(it["ends"])
        for k in ("label", "note", "after_label", "after_note"):
            if " - " in it.get(k, "") or " – " in it.get(k, ""):
                sys.exit(f"spaced dash in {it['name']} {k}")

checked = D["checked"]
out = ['      <p class="docks-intro">Who pulls the docks and when, from the City of Columbus, ODNR and marina pages. '
       '<strong>Not announced</strong> means no official date is posted yet.</p>']
for key, lake in D["lakes"].items():
    out.append(f'      <div data-for="{key}" class="docks-lake">')
    out.append(f'        <ul class="dock-status" aria-label="{lake["name"]} dock status">')
    for it in lake["items"]:
        extra = ""
        if it["status"] == "ending":
            extra = (f' data-ends="{it["ends"]}" data-after-label="{attr(it["after_label"])}"'
                     f' data-after-note="{attr(it["after_note"])}"')
        out.append(f'          <li class="dock-item {PILL[it["status"]]}"{extra}>')
        out.append(f'            <p class="dock-head"><span class="dock-name">{it["name"]}</span> '
                   f'<span class="dock-pill">{it["label"]}</span></p>')
        out.append(f'            <p class="dock-note">{it["note"]}</p>')
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
    ck = lake.get("checked", checked)   # a lake added later carries its own checked date
    out.append(f'        <p class="meta dock-checked" data-checked="{ck}">Last checked '
               f'<time datetime="{ck}">{ap_date(ck)}</time>. Sources: {links}.</p>')
    out.append('      </div>')
block = "\n".join(out)

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
