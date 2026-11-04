#!/usr/bin/env python3
"""Hoover ramp names from one source: js/hoover-map-data.js (the map pins).

Rewrites, between <!-- nb:hoover-ramps:* --> markers:
  water.html  the Hoover rows of the Ramp / access table (names from the pins, notes below)
  log.html    the two Hoover "Ramp / area" selects
  js/lakes.js the Hoover `spots` list and `spotAliases` (old saved names -> current names)
Idempotent. Run after the map data changes:  python3 tools/build-hoover-ramps.py [--check]
"""
import json, re, sys, html
from pathlib import Path

import os
ROOT = Path(os.environ.get("NB_ROOT") or Path(__file__).resolve().parent.parent)
MAP = ROOT / "js/hoover-map-data.js"

# Short notes for the water.html table, keyed by pin id. Facts come from the pin's sources (DATA-SOURCES.md).
NOTES = {
    "oxbow":     ("Boat + bank", "Upper end, off Oxbow Rd. Quieter after dark when traffic thins."),
    "sunbury":   ("Boat", "Upper lake, at the Sunbury Rd causeway."),
    "twin":      ("Boat", "Upper lake, off Red Bank Rd. Portable restroom."),
    "redbank":   ("Boat + bank", "Middle lake, off Maxtown Rd. The city map shows the marina and a reservable shelter here."),
    "walnut":    ("Boat + bank", "Lower ramp toward the dam, off Walnut St. Flats next to a nearby drop."),
    "boardwalk": ("Bank", "Shore access off Front St, Galena. Open 7 a.m. to 11 p.m."),
}
OTHER = "Other public area"
# Names older versions offered in the log. Saved trips keep their text; the page shows the current name.
ALIASES = {
    "Oxbow (upper ramp)": "Oxbow Road ramp", "Oxbow": "Oxbow Road ramp",
    "Redbank (middle ramp)": "Red Bank ramp", "Redbank": "Red Bank ramp",
    "Maxtown": "Red Bank ramp", "Maxtown ramp": "Red Bank ramp",
    "Walnut Road (lower ramp)": "Walnut Street ramp", "Walnut Road": "Walnut Street ramp",
    "Walnut Road (public)": "Walnut Street ramp",
    "Other / not sure": OTHER, "Other public / not sure": OTHER,
}

def load():
    s = MAP.read_text()
    data = json.loads(s[s.index("{"): s.rindex("}") + 1])
    return [p for p in data["places"] if p["type"] in ("ramp", "access")]

def put(text, tag, body, path):
    pat = re.compile(r"([ \t]*)<!-- nb:hoover-ramps:%s -->.*?<!-- /nb:hoover-ramps:%s -->" % (tag, tag), re.S)
    m = pat.search(text)
    if not m:
        sys.exit("%s: marker nb:hoover-ramps:%s missing" % (path, tag))
    ind = m.group(1)
    block = ind + "<!-- nb:hoover-ramps:%s -->\n" % tag + "".join(ind + l + "\n" for l in body) + ind + "<!-- /nb:hoover-ramps:%s -->" % tag
    return text[:m.start()] + block + text[m.end():]

def main():
    check = "--check" in sys.argv
    places = load()
    names = [p["name"] for p in places]
    missing = [p["id"] for p in places if p["id"] not in NOTES]
    if missing:
        sys.exit("no table note for: " + ", ".join(missing))
    e = html.escape
    rows = []
    for p in places:
        bb, note = NOTES[p["id"]]
        rows += ["<tr>", '  <td>%s</td>' % e(p["name"]), '  <td data-label="Boat vs bank">%s</td>' % e(bb),
                 '  <td data-label="Useful note">%s</td>' % e(note), "</tr>"]
    opts = ['<option value="">Choose…</option>'] + ["<option>%s</option>" % e(n) for n in names + [OTHER]]
    changed = []
    for rel, edits in (("water.html", [("table", rows)]), ("log.html", [("community", opts), ("private", opts)])):
        f = ROOT / rel; t = f.read_text(); t2 = t
        for tag, body in edits:
            t2 = put(t2, tag, body, rel)
        if t2 != t:
            changed.append(rel)
            if not check: f.write_text(t2)
    f = ROOT / "js/lakes.js"; t = f.read_text()
    js = "/* nb:hoover-ramps (tools/build-hoover-ramps.py) */ spots: %s, spotAliases: %s," % (
        json.dumps(names, ensure_ascii=False), json.dumps(ALIASES, ensure_ascii=False))
    t2, n = re.subn(r"/\* nb:hoover-ramps[^*]*\*/ spots: \[.*?\], spotAliases: \{.*?\},", lambda m: js, t, count=1)
    if n == 0:
        sys.exit("js/lakes.js: nb:hoover-ramps spots marker missing")
    if t2 != t:
        changed.append("js/lakes.js")
        if not check: f.write_text(t2)
    print(("out of date: " if check else "updated: ") + (", ".join(changed) or "nothing"))
    sys.exit(1 if check and changed else 0)

if __name__ == "__main__":
    main()
