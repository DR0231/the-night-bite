#!/usr/bin/env python3
"""Adds a one line ODNR stocking or survey note to species pages, linking to /stocking for that lake.
Every number here is copied from the ODNR district 1 PDFs listed in DATA-SOURCES.md (Stocking & surveys).
Idempotent: rewrites the block between <!-- stocking-line --> markers. Run from the repo root."""
import pathlib, re

LINK = '<a href="../stocking?lake={lake}#{anchor}">Stocking &amp; surveys</a>'
LINES = {
    "saugeye": [
        ("hoover", "stocked", "ODNR stocked saugeye in Hoover every year from 2010 to 2019."),
        ("alum", "stocked", "ODNR stocked saugeye in Alum Creek every year from 2010 to 2019."),
    ],
    "blue-catfish": [
        ("hoover", "stocked", "ODNR stocked blue catfish in Hoover in 7 of the years from 2011 to 2018."),
    ],
    "walleye": [
        ("hoover", "stocked", "ODNR stocked 288,728 walleye fingerlings in Hoover in 2019."),
    ],
    "muskellunge": [
        ("alum", "stocked", "ODNR stocked muskellunge in Alum Creek every year from 2010 to 2019."),
    ],
    "black-crappie": [
        ("hoover", "growth", "ODNR trap nets: Hoover crappie average 9.9 in at age 3 (Ohio 9.5)."),
        ("alum", "growth", "ODNR trap nets: Alum Creek crappie average 10.8 in at age 3 (Ohio 9.5)."),
    ],
    "largemouth-bass": [
        ("hoover", "growth", "ODNR electrofishing: Hoover largemouth average 12.4 in at age 3 (Ohio 11.3)."),
        ("alum", "growth", "ODNR electrofishing: Alum Creek largemouth average 13.3 in at age 3 (Ohio 11.3)."),
    ],
    "channel-catfish": [
        ("hoover", "growth", "ODNR hoop nets compare Hoover channel catfish catch rates with district and state averages."),
        ("alum", "growth", "ODNR hoop nets compare Alum Creek channel catfish catch rates with district and state averages."),
    ],
}
LINES["white-crappie"] = LINES["black-crappie"]

START, END = "<!-- stocking-line -->", "<!-- /stocking-line -->"
ANCHOR = re.compile(r'(\n)(\s*)(<div class="sp-now" id="sp-now")')

for name, rows in LINES.items():
    path = pathlib.Path("species") / (name + ".html")
    html = path.read_text(encoding="utf-8")
    html = re.sub(r"\s*" + re.escape(START) + r".*?" + re.escape(END), "", html, flags=re.S)
    block = [START]
    for lake, anchor, text in rows:
        block.append('    <p class="meta sp-stock" data-for="%s">%s %s</p>' % (lake, text, LINK.format(lake=lake, anchor=anchor)))
    block.append("    " + END)
    m = ANCHOR.search(html)
    if not m:
        raise SystemExit("no sp-now anchor in " + str(path))
    # put the block just before the blank line that precedes sp-now
    idx = html.rfind("\n", 0, m.start()) if html[m.start()-1:m.start()] == "\n" else m.start()
    insert = "\n    " + "\n".join(block)
    html = html[:idx] + insert + html[idx:]
    path.write_text(html, encoding="utf-8")
    print("updated", path)
