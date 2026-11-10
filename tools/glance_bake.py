#!/usr/bin/env python3
"""The Night Bite: bake the "Tonight at a glance" strip (and, for lakes other than Hoover, the pool card's snapshot
lines) into a lake home's static HTML, so the strip never shows a placeholder: with JavaScript off, or with USGS or
NWS blocked or offline, it still shows the stamped snapshot (level, water temp) with its checked date and time.

The level and temp come from the page's own pool card (#correction-line and the Checked <time>), the same lines the
weekly USGS snapshot routine edits on hoover/index.html, so the strip and the card can never disagree.
js/glance.js turns the absolute time into "last updated X hours ago" and swaps in live values when they arrive.

    python3 tools/glance_bake.py hoover/index.html   # rebake one page from its own snapshot lines (after the routine)
    python3 tools/glance_bake.py --check             # exit 1 if any lake home's strip is out of step with its card

Used by tools/build-lake-pages.py (every lake home and the template) and tools/promote.py (hoover/index.html, after
live's snapshot lines are kept). Lakes with no public gauge get an intentional "No gauge" state linking to the pool
card's source note; a gauge that stopped reporting says so. Never invents a value.
"""
import datetime, html, pathlib, re, sys
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")
# same pattern as js/glance.js and js/pool-readout.js
LINE_RE = re.compile(r"^\s*([\d.]+)\s*ft\s*·\s*(?:(-?\d+(?:\.\d+)?)\s*°F(?:\s+outflow)?|no temp|temp —|Corps profile [A-Z][a-z]{2,3}\.? \d{1,2})\s*·\s*~?([\d.]+)\s*ft\s+(above|below)\s+full pool\s*$")
GLANCE_RE = re.compile(r'[ \t]*<section class="glance" id="glance".*?</section>', re.S)


def t(s):
    return html.escape(str(s), quote=False)


def a(s):
    return html.escape(str(s), quote=True)


def when_et(iso):
    """'2026-11-02T17:00:00-05:00' -> 'Nov. 2, 5 PM ET' (the site's month style; minutes only when not :00)."""
    d = datetime.datetime.fromisoformat(iso).astimezone(ET)
    mon = {5: "May", 6: "June", 7: "July", 9: "Sept."}.get(d.month, d.strftime("%b") + ".")
    h = d.hour % 12 or 12
    tm = f"{h}:{d.minute:02d}" if d.minute else f"{h}"
    return f"{mon} {d.day}, {tm} {'AM' if d.hour < 12 else 'PM'} ET"


def page_snapshot(page):
    """(line text, checked ISO) from a page's pool card, or (None, None)."""
    m = re.search(r'<p class="pool-lead" id="correction-line">(.*?)</p>', page, re.S)
    c = re.search(r'id="correction-checked">\s*Checked: <time datetime="([^"]+)">', page)
    return (html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else None, c.group(1) if c else None)


def pool_card(page, pool):
    """Non-Hoover lakes: the pool card's static lines carry this lake's own snapshot (js/lake-snapshot.js writes the
    same text after load), so a page with JavaScript off never shows Hoover's numbers under another lake's name."""
    S = pool.get("snapshot") or {}
    st = pool.get("stale")
    if st:
        line = "USGS gauge not reporting"
        checked = (f'ODNR fishing map pool: {t(pool["fullPool"])} ft. USGS gauge {st["site"]} last reported {t(st["last"])} on '
                   f'{t(st["lastWhen"])} and has posted nothing since, so there is no current reading to show. '
                   f'<a href="{a(st["url"])}" target="_blank" rel="noopener">USGS gauge page</a>.')
        temp, status = "No public water temp gauge", "The USGS lake level gauge here is not reporting right now. No water temp gauge. Never invented."
    elif not pool.get("src"):
        line = "No public lake level gauge"
        fp = (f'ODNR fishing map pool: {t(pool["fullPool"])} ft. ' if pool.get("fullPool") is not None
              else "No ODNR fishing map pool is posted for this lake. ")
        checked = (fp + "No USGS or Corps gauge posts this lake\u2019s level or "
                   "water temp, so there is no live reading to show.").replace("\u2019", "'")
        temp, status = "No public water temp gauge", "No public lake level or water temp gauge on this lake. Never invented."
    elif S:
        line = S["line"]
        checked = (f'Checked: <time datetime="{a(S["at"])}">{t(S["when"])}</time>. '
                   f'<a href="{a(pool["gaugeUrl"])}" target="_blank" rel="noopener">Live {t(pool["srcName"])} gauge</a>.')
        # a Corps outflow temp is labelled outflow (never lake surface); a Corps profile only says so (js/lake-snapshot.js)
        temp = (None if pool.get("temp") else "USACE outflow temp, not lake surface" if pool.get("outflow")
                else "No live water temp" if pool.get("profile") else "No public water temp gauge")
        note = ("" if pool.get("temp") else " USACE outflow temp; it is not lake surface temperature." if pool.get("outflow")
                else " No live water temp; the Corps posts a temperature profile." if pool.get("profile") else " No public water temp gauge on this lake.")
        status = f'Provisional snapshot; your browser may refresh it from {t(pool["srcName"])}.' + note + " Never invented."
    else:
        return page
    page = re.sub(r'(<p class="pool-lead" id="correction-line">).*?(</p>)', lambda m: m.group(1) + t(line) + m.group(2), page, count=1, flags=re.S)
    page = re.sub(r'(<p class="meta" id="correction-checked">).*?(</p>)', lambda m: m.group(1) + "\n          " + checked + "\n        " + m.group(2), page, count=1, flags=re.S)
    if temp:
        page = re.sub(r'(<span class="value" id="water-temp">).*?(</span>\n)', lambda m: m.group(1) + temp + m.group(2), page, count=1, flags=re.S)
    page = re.sub(r'(<p class="meta" id="usgs-live-status"[^>]*>).*?(</p>)', lambda m: m.group(1) + "\n          " + status + "\n        " + m.group(2), page, count=1, flags=re.S)
    return page


def cell(key, label, value, sub, href, state=False, unit=None, ext=False, empty=False, sub_key=True):
    v = (f'<span class="glance-value glance-state" data-glance="{key}">{value}</span>' if state else
         f'<span class="glance-value" data-glance="{key}">{t(value)}' + (f'<span class="glance-unit"> {t(unit)}</span>' if unit else "") + "</span>")
    attrs = f' href="{a(href)}"' + (' target="_blank" rel="noopener"' if ext else "") + f' data-cell="{key}"' + (" data-empty" if empty else "")
    return (f'        <a class="glance-cell"{attrs}>\n'
            f'          <span class="glance-label">{label}</span>\n'
            f'          {v}\n'
            f'          <span class="glance-sub" data-glance="{key}-sub">{t(sub)}</span>\n'
            '        </a>')


def glance(page, pool, nws_page, prefix=""):
    """The whole <section class="glance"> for one lake, from the page's own pool card lines."""
    card = f"{prefix}#pool-snapshot"
    line, at = page_snapshot(page)
    m = LINE_RE.match(line or "")
    src_name = pool.get("srcName") or "USGS"
    has_temp = bool(pool.get("temp"))
    out = None if has_temp else pool.get("outflow")
    prof = None if has_temp or out else pool.get("profile")
    if pool.get("stale"):
        st = pool["stale"]
        pc = cell("pool", "Lake level", "No reading", "Gauge not reporting", card, state=True, empty=True)
        tc = cell("temp", "Water temp", "No gauge", "No public gauge", card, state=True, empty=True)
        stamp = f'USGS gauge {t(st["site"])} last reported {t(st["lastWhen"])}, so there is no current level. Nothing is estimated.'
        kind = "stale"
    elif not pool.get("src"):
        pc = cell("pool", "Lake level", "No gauge", "No public gauge", card, state=True, empty=True)
        tc = cell("temp", "Water temp", "No gauge", "No public gauge", card, state=True, empty=True)
        stamp = "No public lake level or temp gauge on this water. Nothing is estimated."
        kind = "none"
    elif m and at:
        gauge = pool.get("gaugeUrl") or card
        pc = cell("pool", "Lake level", m.group(1), f"~{m.group(3)} ft {m.group(4)} full", gauge, unit="ft", ext=gauge != card)
        if out:
            tc = (cell("temp", "Outflow temp", str(round(float(m.group(2)))), "USACE outflow", out["url"], unit="°F", ext=True)
                  if m.group(2) is not None else
                  cell("temp", "Outflow temp", "No reading", "Not in the last check", out["url"], state=True, ext=True, empty=True))
        elif prof:
            tc = cell("temp", "Water temp", "Profile only", f'Corps, {prof["short"]}', prof["url"], state=True, ext=True, empty=True)
        elif not has_temp:
            tc = cell("temp", "Water temp", "No gauge", "No public gauge", card, state=True, empty=True)
        elif m.group(2) is not None:
            tc = cell("temp", "Water temp", str(round(float(m.group(2)))), f"{src_name} gauge", gauge, unit="°F", ext=gauge != card)
        else:
            tc = cell("temp", "Water temp", "No reading", "Not in the last check", gauge, state=True, ext=gauge != card, empty=True)
        what = "Level and temp" if has_temp else "Level"
        stamp = f'{what} last checked <time datetime="{a(at)}">{when_et(at)}</time>, {t(src_name)} gauge.'
        kind = "snapshot"
    else:   # a gauge lake with no saved reading yet (a brand new water): point at the gauge, show no number
        gauge = pool.get("gaugeUrl") or card
        pc = cell("pool", "Lake level", "Check gauge", f"{src_name} gauge", gauge, state=True, ext=gauge != card, empty=True)
        tc = (cell("temp", "Water temp", "Check gauge", f"{src_name} gauge", gauge, state=True, ext=gauge != card, empty=True) if has_temp
              else cell("temp", "Outflow temp", "Check gauge", "USACE outflow", out["url"], state=True, ext=True, empty=True) if out
              else cell("temp", "Water temp", "Profile only", f'Corps, {prof["short"]}', prof["url"], state=True, ext=True, empty=True) if prof
              else cell("temp", "Water temp", "No gauge", "No public gauge", card, state=True, empty=True))
        stamp = f"No saved {t(src_name)} reading on this page yet. Tap Lake level for the live gauge."
        kind = "nosnap"
    sun = cell("sunset", "Sunset", "<noscript>JS is off</noscript>", "On this phone", f"{prefix}#conditions", state=True, empty=True)
    wind = cell("wind", "Wind tonight", "Check NWS", "At weather.gov", nws_page or f"{prefix}#conditions", state=True, ext=bool(nws_page), empty=True)
    return (
        f'    <section class="glance" id="glance" aria-labelledby="glance-title" data-baked="{kind}">\n'
        '      <!-- baked by tools/glance_bake.py from this page\'s pool card; js/glance.js keeps it current -->\n'
        '      <div class="glance-head">\n'
        '        <h2 class="glance-title" id="glance-title">Tonight at a glance</h2>\n'
        f'        <a class="glance-cell glance-bite" href="{prefix}#bite-how" data-empty>\n'
        '          <span class="glance-label">Bite</span>\n'
        '          <span class="glance-value glance-state" data-glance="bite">Needs forecast</span>\n'
        '        </a>\n'
        '      </div>\n'
        '      <div class="glance-grid">\n'
        f"{pc}\n{tc}\n{sun}\n{wind}\n"
        '      </div>\n'
        f'      <p class="glance-stamp" data-glance="stamp">{stamp}</p>\n'
        '    </section>'
    )


def bake(page, pool, nws_page, prefix="", card=True):
    """page HTML -> page HTML with the pool card (card=True, lakes other than Hoover) and the glance strip baked."""
    if card:
        page = pool_card(page, pool)
    new, n = GLANCE_RE.subn(lambda m_: glance(page, pool, nws_page, prefix), page, count=1)
    if n != 1:
        raise SystemExit("glance_bake: no <section class=\"glance\" id=\"glance\"> in the page")
    return new


def lake_cfg(root, lake):
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    import registry
    c = registry.load(root)["lakes"][lake]
    return c.get("pool") or {}, (c.get("nws") or {}).get("page")


def main(argv):
    root = pathlib.Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    import registry
    R = registry.load(root)
    check = "--check" in argv
    files = [x for x in argv if not x.startswith("--")] or [registry.home(l) + "index.html" for l in R["order"]]
    bad = []
    for f in files:
        p = root / f
        lake = p.parent.name
        c = R["lakes"][lake]
        old = p.read_text()
        new = bake(old, c.get("pool") or {}, (c.get("nws") or {}).get("page"), prefix=lake + "/", card=False)
        if new != old:
            if check:
                bad.append(f)
            else:
                p.write_text(new)
                print(f"glance_bake: wrote {f}")
    if check:
        print("glance_bake --check: " + ("out of step: " + ", ".join(bad) if bad else f"{len(files)} pages in step"))
        return 1 if bad else 0
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
