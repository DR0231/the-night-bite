#!/usr/bin/env python3
"""Adds a one line ODNR stocking or survey note to species pages, linking to /stocking for that lake.
Every number here is copied from the ODNR district 1 PDFs listed in DATA-SOURCES.md (Stocking & surveys), or for Deer Creek Lake, Madison Lake, Knox Lake and Clear Fork Reservoir from ODNR's Fish Stocking dashboard (checked Oct. 30, 2026),
and for Seneca Lake, Dillon Lake, Lake Logan, Salt Fork Lake, Burr Oak Lake and Dow Lake from the same dashboard (checked Oct. 31, 2026),
and for Mosquito Creek Lake, Berlin Lake, West Branch Reservoir, Pymatuning Lake, Lake Milton and Leesville Lake from the same dashboard (checked Nov. 3, 2026).
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
        ("leesville", "stocked", "ODNR stocked saugeye in Leesville Lake every year from 2016 to 2025."),
        ("grandlakestmarys", "stocked", "ODNR stocked triploid saugeye in Grand Lake St. Marys in 2025."),
        ("caesarcreek", "stocked", "ODNR stocked saugeye in Caesar Creek Lake every year from 2016 to 2025, mostly as fry."),
        ("eastfork", "stocked", "ODNR stocked saugeye in East Fork Lake every year from 2018 to 2025."),
        ("rockyfork", "stocked", "ODNR stocked saugeye in Rocky Fork Lake every year from 2016 to 2025."),
        ("paintcreek", "stocked", "ODNR stocked saugeye in Paint Creek Lake every year from 2016 to 2025."),
        ("loramie", "stocked", "ODNR stocked saugeye in Lake Loramie every year from 2016 to 2025."),
        ("cowan", "stocked", "ODNR stocked saugeye in Cowan Lake every year from 2016 to 2025."),
        ("acton", "stocked", "ODNR stocked saugeye in Acton Lake every year from 2016 to 2025."),
        ("tappan", "stocked", "ODNR stocked saugeye in Tappan Lake every year from 2016 to 2025."),
        ("piedmont", "stocked", "ODNR stocked saugeye in Piedmont Lake every year from 2016 to 2025."),
        ("clendening", "stocked", "ODNR stocked saugeye in Clendening Lake every year from 2016 to 2025."),
        ("atwood", "stocked", "ODNR stocked saugeye in Atwood Lake every year from 2016 to 2025."),
        ("charlesmill", "stocked", "ODNR stocked saugeye in Charles Mill Lake every year from 2016 to 2025."),
        ("pleasanthill", "stocked", "ODNR stocked saugeye in Pleasant Hill Lake every year from 2016 to 2025."),
    ],
    "blue-catfish": [
        ("hoover", "stocked", "ODNR stocked blue catfish in Hoover in 7 of the years from 2011 to 2018."),
        ("seneca", "stocked", "ODNR stocked blue catfish in Seneca Lake in 7 of the years from 2016 to 2024."),
        ("dillon", "stocked", "ODNR stocked blue catfish in Dillon Lake every year from 2022 to 2025."),
        ("burroak", "stocked", "ODNR stocked blue catfish in Burr Oak Lake every year from 2022 to 2025."),
        ("westbranch", "stocked", "ODNR stocked blue catfish in West Branch Reservoir every year from 2023 to 2025."),
        ("caesarcreek", "stocked", "ODNR stocked blue catfish in Caesar Creek Lake in 6 of the years from 2018 to 2024."),
        ("eastfork", "stocked", "ODNR stocked blue catfish in East Fork Lake every year from 2022 to 2025."),
        ("clendening", "stocked", "ODNR stocked blue catfish in Clendening Lake in 2016 to 2019, 2021, 2023 and 2025."),
        ("atwood", "stocked", "ODNR stocked blue catfish in Atwood Lake in 2023, 2024 and 2025."),
    ],
    "walleye": [
        ("hoover", "stocked", "ODNR stocked 288,728 walleye fingerlings in Hoover in 2019."),
        ("mosquito", "stocked", "ODNR stocked walleye in Mosquito Creek Lake every year from 2016 to 2025, as fry and fingerlings."),
        ("berlin", "stocked", "ODNR stocked walleye in Berlin Lake every year from 2016 to 2025, as fry and fingerlings."),
        ("westbranch", "stocked", "ODNR stocked walleye in West Branch Reservoir every year from 2016 to 2025 except 2023."),
        ("pymatuning", "stocked", "ODNR stocked walleye in Pymatuning Lake every year from 2016 to 2025 except 2023."),
        ("milton", "stocked", "ODNR stocked walleye in Lake Milton every year from 2016 to 2025."),
        ("cjbrown", "stocked", "ODNR stocked walleye in C.J. Brown Reservoir every year from 2016 to 2025."),
        ("ladue", "stocked", "ODNR stocked walleye in LaDue Reservoir in 9 of the years from 2016 to 2025."),
        ("nimisila", "stocked", "ODNR stocked walleye in Nimisila Reservoir from 2016 to 2018."),
    ],
    "muskellunge": [
        ("alum", "stocked", "ODNR stocked muskellunge in Alum Creek every year from 2010 to 2019."),
        ("clearfork", "stocked", "ODNR stocked muskellunge in Clear Fork Reservoir every year from 2016 to 2025."),
        ("saltfork", "stocked", "ODNR stocked muskellunge in Salt Fork Lake every year from 2016 to 2025."),
        ("westbranch", "stocked", "ODNR stocked muskellunge in West Branch Reservoir every year from 2016 to 2025."),
        ("milton", "stocked", "ODNR stocked muskellunge in Lake Milton every year from 2016 to 2025."),
        ("leesville", "stocked", "ODNR stocked muskellunge in Leesville Lake every year from 2016 to 2025."),
        ("caesarcreek", "stocked", "ODNR stocked muskellunge in Caesar Creek Lake every year from 2016 to 2025."),
        ("cjbrown", "stocked", "ODNR stocked muskellunge in C.J. Brown Reservoir every year from 2018 to 2025."),
        ("piedmont", "stocked", "ODNR stocked muskellunge in Piedmont Lake every year from 2016 to 2025."),
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
        ("leesville", "stocked", "ODNR stocked channel catfish in Leesville Lake every other year from 2017 to 2025."),
        ("grandlakestmarys", "stocked", "ODNR stocked channel catfish in Grand Lake St. Marys in 2017."),
        ("ladue", "stocked", "ODNR stocked channel catfish in LaDue Reservoir every other year from 2016 to 2024."),
        ("portagelakes", "stocked", "ODNR stocked channel catfish in Turkeyfoot Lake (Portage Lakes) every other year from 2017 to 2025."),
        ("mogadore", "stocked", "ODNR stocked channel catfish in Mogadore Reservoir every other year from 2017 to 2025."),
        ("loramie", "stocked", "ODNR stocked channel catfish in Lake Loramie in 7 of the years from 2016 to 2023."),
        ("nimisila", "stocked", "ODNR stocked channel catfish in Nimisila Reservoir every other year from 2016 to 2024."),
        ("atwood", "stocked", "ODNR stocked channel catfish in Atwood Lake in 2020."),
        ("pleasanthill", "stocked", "ODNR stocked catchable channel catfish in Pleasant Hill Lake in 2016 to 2018 and 2021 to 2023."),
        ("wingfoot", "stocked", "ODNR stocked channel catfish in Wingfoot Lake in 2016, 2022 and 2024."),
        ("guilford", "stocked", "ODNR stocked channel catfish in Guilford Lake in 2016, 2018 and 2020."),
        ("highlandtown", "stocked", "ODNR stocked channel catfish in Highlandtown Lake in 2016 and 2020."),
        ("punderson", "stocked", "ODNR stocked channel catfish in Punderson Lake every other year from 2017 to 2025."),
        ("wellington", "stocked", "ODNR stocked channel catfish in Wellington Upground Reservoir every other year from 2016 to 2024."),
    ],
    "bluegill": [
        ("mosquito", "stocked", "ODNR stocked 125 bluegill catchables in Mosquito Creek Lake in 2025."),
    ],
    "yellow-perch": [
        ("knox", "stocked", "ODNR stocked yellow perch fingerlings in Knox Lake in 2019 and every year from 2022 to 2025."),
        ("grandlakestmarys", "stocked", "ODNR stocked yellow perch in Grand Lake St. Marys in most years from 2016 to 2025."),
        ("wellington", "stocked", "ODNR stocked yellow perch in Wellington Upground Reservoir in nine of the ten years from 2016 to 2025."),
    ],
    "hybrid-striped-bass": [
        ("oshaughnessy", "stocked", "ODNR lists O’Shaughnessy among the lakes it stocks with hybrid striped bass; no numbers are posted."),
        ("griggs", "stocked", "ODNR lists Griggs among the lakes it stocks with hybrid striped bass; no numbers are posted."),
        ("dillon", "stocked", "ODNR stocked hybrid striped bass fingerlings in Dillon Lake every year from 2016 to 2025."),
        ("eastfork", "stocked", "ODNR stocked hybrid striped bass in East Fork Lake every year from 2016 to 2025."),
        ("charlesmill", "stocked", "ODNR stocked hybrid striped bass in Charles Mill Lake in 2016 to 2020 and 2022 to 2025."),
        ("guilford", "stocked", "ODNR stocked hybrid striped bass in Guilford Lake most years from 2016 to 2023."),
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
