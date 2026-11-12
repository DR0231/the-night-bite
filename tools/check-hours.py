#!/usr/bin/env python3
"""check-hours: the night-rules data in data/quick-facts.json and the chip baked on each lake home (S5).

Every lake has an "hours" entry. Either {none: true, note, checked} (no official page states hours: the Night rules
row says so and no chip shows) or: authority city|odnr|mwcd; open/close "HH:MM" (24 h ET), "sunrise"/"sunset", or null;
fishing_after_hours true or null; chip text; source [label, https URL on an official domain]; checked YYYY-MM-DD.
Then each <lake>/index.html has the chip (or none) matching the data. Static and fast. Exit 1 on any error.
Run from the repo root:  python3 tools/check-hours.py
"""
import json, os, pathlib, re, sys

root = pathlib.Path(os.environ.get("NB_ROOT") or pathlib.Path(__file__).resolve().parent.parent)
L = json.loads((root / "data" / "quick-facts.json").read_text())["lakes"]
OFFICIAL = ("columbusrecparks.com", "ohiodnr.gov", "mwcd.org", "usace.army.mil", "mansfieldohio.gov",
            "codelibrary.amlegal.com", "codes.ohio.gov", "mcclibraryfunctions.azurewebsites.us",
            "geaugaparkdistrict.org")
TIME = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
errs, chips, none = [], 0, []


def ok_time(v):
    return v is None or v in ("sunrise", "sunset") or bool(TIME.match(v))


for lake, F in L.items():
    H = F.get("hours")
    if not H:
        errs.append(f"{lake}: no hours entry (use {{none: true, note}} when no official page states hours)")
        continue
    if not DATE.match(H.get("checked", "")):
        errs.append(f"{lake}: hours.checked missing or not YYYY-MM-DD")
    page = root / lake / "index.html"
    html = page.read_text() if page.exists() else ""
    if html and "<dt>Night rules</dt>" not in html:
        errs.append(f"{lake}: Quick facts has no Night rules row (run tools/build-lake-pages.py)")
    if H.get("none"):
        none.append(lake)
        if not H.get("note"):
            errs.append(f"{lake}: hours.none needs a note saying so")
        if 'id="night-rules"' in html:
            errs.append(f"{lake}: page has a night chip but the data has no sourced hours")
        continue
    if H.get("authority") not in ("city", "odnr", "mwcd"):
        errs.append(f"{lake}: hours.authority must be city, odnr or mwcd")
    for k in ("open", "close"):
        if not ok_time(H.get(k)):
            errs.append(f"{lake}: hours.{k} {H.get(k)!r} does not parse (HH:MM, sunrise, sunset or null)")
    if (H.get("open") is None) != (H.get("close") is None):
        errs.append(f"{lake}: hours.open and hours.close must both be set or both null")
    if H.get("fishing_after_hours") not in (True, None):
        errs.append(f"{lake}: fishing_after_hours is true (the source says so) or null, never a guess of false")
    if not H.get("chip") or re.search(r" [\u2014\u2013-] ", H.get("chip", "")):
        errs.append(f"{lake}: hours.chip missing or has a spaced dash")
    src = H.get("source") or []
    if len(src) != 2 or not src[1].startswith("https://") or not any(d in src[1] for d in OFFICIAL):
        errs.append(f"{lake}: hours.source must be [label, https URL on an official city, ODNR, Army Corps or MWCD page]")
    if html:
        m = re.search(r'<a class="night-chip" id="night-rules" href="([^"]+)"[^>]*data-close="([^"]*)"', html)
        if not m:
            errs.append(f"{lake}: {lake}/index.html has no night chip (run tools/build-lake-pages.py)")
        else:
            chips += 1
            if src and m.group(1) != src[1]:
                errs.append(f"{lake}: chip links {m.group(1)}, data source is {src[1]}")
            if m.group(2) != (H.get("close") or ""):
                errs.append(f"{lake}: chip data-close {m.group(2)!r} != data {H.get('close')!r}")
    else:
        errs.append(f"{lake}: {lake}/index.html missing")

for e in errs:
    print("ERROR", e)
print(f"check-hours: {len(L)} lakes, {chips} chips, no official hours: {', '.join(none) or 'none'}; {len(errs)} errors")
sys.exit(1 if errs else 0)
