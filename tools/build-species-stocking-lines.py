#!/usr/bin/env python3
"""Adds a one line ODNR stocking or survey note to species pages, linking to /stocking for that lake.
Every number here is copied from the ODNR district 1 PDFs listed in DATA-SOURCES.md (Stocking & surveys), or for Deer Creek Lake, Madison Lake, Knox Lake and Clear Fork Reservoir from ODNR's Fish Stocking dashboard (checked Oct. 30, 2026),
and for Seneca Lake, Dillon Lake, Lake Logan, Salt Fork Lake, Burr Oak Lake and Dow Lake from the same dashboard (checked Oct. 31, 2026).
Idempotent: rewrites the block between <!-- stocking-line --> markers. Run from the repo root."""
import pathlib, re

LINK = '<a href="../stocking?lake={lake}#{anchor}">Stocking &amp; surveys</a>'
LINES = {
    "saugeye": [
        ("hoover", "stocked", "ODNR stocked saugeye in Hoover every year from 2010 to 2019."),
        ("alum", "stocked", "ODNR stocked saugeye in Alum Creek every year from 2010 to 2019."),
        ("indian", "stocked", "ODNR stocked saugeye in Indian Lake every year from 2010 to 2019."),
        ("deercreek", "stocked", "ODNR stocked saugeye in Deer Creek Lake every year from 2016 to 2025, about 130,000 fingerlings a year since 2021."),
        ("seneca", "stocked", "ODNR stocked saugeye in Seneca Lake every year from 2016 to 2025, mostly as fry."),
        ("dillon", "stocked", "ODNR stocked saugeye in Dillon Lake every year from 2016 to 2025."),
        ("logan", "stocked", "ODNR stocked saugeye in Lake Logan every year from 2016 to 2025."),
        ("saltfork", "stocked", "ODNR stocked saugeye in Salt Fork Lake every year from 2016 to 2025."),
        ("dow", "stocked", "ODNR stocked saugeye in Dow Lake every year from 2016 to 2025."),
    ],
    "blue-catfish": [
        ("hoover", "stocked", "ODNR stocked blue catfish in Hoover in 7 of the years from 2011 to 2018."),
        ("seneca", "stocked", "ODNR stocked blue catfish in Seneca Lake in 7 of the years from 2016 to 2024."),
        ("dillon", "stocked", "ODNR stocked blue catfish in Dillon Lake every year from 2022 to 2025."),
        ("burroak", "stocked", "ODNR stocked blue catfish in Burr Oak Lake every year from 2022 to 2025."),
    ],
    "walleye": [
        ("hoover", "stocked", "ODNR stocked 288,728 walleye fingerlings in Hoover in 2019."),
    ],
    "muskellunge": [
        ("alum", "stocked", "ODNR stocked muskellunge in Alum Creek every year from 2010 to 2019."),
        ("clearfork", "stocked", "ODNR stocked muskellunge in Clear Fork Reservoir every year from 2016 to 2025."),
        ("saltfork", "stocked", "ODNR stocked muskellunge in Salt Fork Lake every year from 2016 to 2025."),
    ],
    "black-crappie": [
        ("hoover", "growth", "ODNR trap nets: Hoover crappie average 9.9 in at age 3 (Ohio 9.5)."),
        ("alum", "growth", "ODNR trap nets: Alum Creek crappie average 10.8 in at age 3 (Ohio 9.5)."),
        ("indian", "growth", "ODNR trap nets: Indian Lake crappie average 10.9 in at age 3 (Ohio 9.5)."),
        ("delaware", "growth", "ODNR trap nets: Delaware Lake crappie average 10.4 in at age 3 (Ohio 9.5)."),
    ],
    "largemouth-bass": [
        ("hoover", "growth", "ODNR electrofishing: Hoover largemouth average 12.4 in at age 3 (Ohio 11.3)."),
        ("alum", "growth", "ODNR electrofishing: Alum Creek largemouth average 13.3 in at age 3 (Ohio 11.3)."),
        ("indian", "growth", "ODNR electrofishing: Indian Lake largemouth average 11.4 in at age 3 (Ohio 11.3)."),
        ("delaware", "growth", "ODNR electrofishing: Delaware Lake largemouth average 11.4 in at age 3 (Ohio 11.3)."),
    ],
    "channel-catfish": [
        ("hoover", "growth", "ODNR hoop nets compare Hoover channel catfish catch rates with district and state averages."),
        ("alum", "growth", "ODNR hoop nets compare Alum Creek channel catfish catch rates with district and state averages."),
        ("indian", "growth", "ODNR hoop nets compare Indian Lake channel catfish catch rates with district and state averages."),
        ("delaware", "growth", "ODNR hoop nets compare Delaware Lake channel catfish catch rates with district and state averages."),
        ("madison", "stocked", "ODNR stocked channel catfish in Madison Lake every other year from 2016 to 2024."),
        ("logan", "stocked", "ODNR stocked channel catfish in Lake Logan every other year from 2016 to 2024."),
        ("burroak", "stocked", "ODNR stocked channel catfish in Burr Oak Lake every other year from 2016 to 2024."),
        ("dow", "stocked", "ODNR stocked channel catfish in Dow Lake in 2017 and 2019."),
    ],
    "yellow-perch": [
        ("knox", "stocked", "ODNR stocked yellow perch fingerlings in Knox Lake in 2019 and every year from 2022 to 2025."),
    ],
    "hybrid-striped-bass": [
        ("oshaughnessy", "stocked", "ODNR lists O’Shaughnessy among the lakes it stocks with hybrid striped bass; no numbers are posted."),
        ("griggs", "stocked", "ODNR lists Griggs among the lakes it stocks with hybrid striped bass; no numbers are posted."),
        ("dillon", "stocked", "ODNR stocked hybrid striped bass fingerlings in Dillon Lake every year from 2016 to 2025."),
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
