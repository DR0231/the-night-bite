#!/usr/bin/env python3
"""Build the two summary pages from data already on the site, so they never drift from the lake pages:

    python3 tools/build-summaries.py           # write drawdown.html and night.html between their nb:summary markers;
                                               # stamp lake row ids on rules.html items already on the page
    python3 tools/build-summaries.py --check   # change nothing; exit 1 if a page would change

  · drawdown.html: MWCD's winter drawdown table for the waters on this site, from data/drawdowns.json (MWCD's own
    numbers, with the source and the date checked). Waters MWCD does not list are named as not listed.
  · night.html: open hours and night rules for every water, from data/quick-facts.json (the same "night" line and
    "hours" source each lake home shows in Quick facts), grouped into native <details> dropdowns by the picker regions
    in js/lakes.js, in that order, with a name search above the list. A region with no waters is left out. A water with
    no night line gets a plain "no night rule sourced yet" line, never a guess. Each row keeps id="<lake>" so /night#<lake>
    still lands on that water.
  · rules.html: add id="<lake>" to each bass-table row already on the page, and id="hoover" to the Hoover crappie
    paragraph, so lake-home also-links can go to /rules#<lake>. This does not add or rewrite rows.
Only the part between <!-- nb:summary --> and <!-- /nb:summary --> is written on drawdown.html and night.html; the rest
of each of those pages is hand edited. rules.html is stamped in place, with no new content rows.
"""
import datetime, html, json, os, pathlib, re, sys

root = pathlib.Path(os.environ.get("NB_ROOT") or pathlib.Path(__file__).resolve().parent.parent)
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import registry  # noqa: E402

REG = registry.load(root)
MON = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."]


def ap(iso, year=True):
    d = datetime.date.fromisoformat(iso)
    s = f"{MON[d.month - 1]} {d.day}" + (f", {d.year}" if year else "")
    return f'<time datetime="{iso}">{s}</time>'


def ft(v):
    n = float(v)
    s = f"{n:,.2f}".rstrip("0").rstrip(".")
    return s


def link(src):
    return f'<a href="{html.escape(src[1])}" target="_blank" rel="noopener">{html.escape(src[0])}</a>'


def name(lake):
    return REG["lakes"][lake]["name"]


def drawdown():
    d = json.loads((root / "data" / "drawdowns.json").read_text())
    rows = sorted(d["rows"], key=lambda r: (r["begins"], name(r["lake"])))
    out = ['      <div class="table-wrap data-table-wrap"><table class="data-table summary-table">',
           f'        <caption>MWCD winter drawdown, {d["season"]}. Levels in feet above sea level, as MWCD lists them.</caption>',
           '        <thead><tr><th scope="col">Water</th><th scope="col">Starts</th><th scope="col" class="num">Normal pool</th>'
           '<th scope="col" class="num">Winter level</th><th scope="col" class="num">Drop</th><th scope="col" class="num">Days</th>'
           f'<th scope="col" class="num">Refill by {ap(d["refill_by"], year=False)}</th></tr></thead>',
           '        <tbody>']
    for r in rows:
        out.append(f'          <tr id="{html.escape(r["lake"], quote=True)}"><th scope="row"><a href="{r["lake"]}/">{html.escape(name(r["lake"]))}</a></th><td>{ap(r["begins"], year=False)}</td>'
                   f'<td class="num">{ft(r["normal"])} ft</td><td class="num">{ft(r["winter"])} ft</td><td class="num">{ft(r["drop"])} ft</td>'
                   f'<td class="num">{r["days"]}</td><td class="num">{ft(r["refill"])} ft</td></tr>')
    out += ['        </tbody>', '      </table></div>']
    if d.get("not_listed"):
        nl = [f'<a href="{l}/">{html.escape(name(l))}</a>' for l in d["not_listed"]]
        out.append(f'      <p class="meta">Not on MWCD&rsquo;s schedule: {", ".join(nl)}. Its lake page shows the Corps of Engineers gauge.</p>')
    src = f'<a href="{html.escape(d["source"][1])}" target="_blank" rel="noopener">{html.escape(d["source"][0])} ({ap(d["source_date"])})</a>'
    out.append(f'      <p class="meta">Source: {src}. Checked {ap(d["checked"])}.</p>')
    return "\n".join(out)


def search_q(lake):
    """Visible name plus the short name, for the night page search (names only, not towns)."""
    c = REG["lakes"][lake]
    seen, bits = set(), []
    for n in (c.get("name"), c.get("short")):
        if not n or n in seen:
            continue
        seen.add(n)
        bits.append(n)
    return " ".join(bits)


def night():
    q = json.loads((root / "data" / "quick-facts.json").read_text())["lakes"]
    out = [
        '      <form class="night-search" role="search" hidden>',
        '        <label for="night-search">Find a water</label>',
        '        <input class="lp-search" id="night-search" type="search" placeholder="Find a water" autocomplete="off" spellcheck="false" enterkeyhint="search">',
        '      </form>',
        '      <p class="night-empty" id="night-empty" role="status" hidden></p>',
        '      <div id="night-regions">',
    ]
    for reg in REG["regions"]:
        ids = [l for l in REG["order"] if REG["lakes"][l].get("region") == reg["id"]]
        if not ids:
            continue
        rid = html.escape(reg["id"], quote=True)
        out.append(f'      <details class="night-region" id="night-{rid}" data-region="{rid}">')
        out.append(f'        <summary><h2 class="night-region-title">{html.escape(reg["name"])}</h2>'
                   f'<span class="night-region-n" aria-hidden="true">{len(ids)}</span></summary>')
        out.append('        <ul class="summary-list">')
        for l in ids:
            f = q.get(l) or {}
            h = f.get("hours") or {}
            line = f.get("night")
            if line:
                src = h.get("source")
                bits = []
                if src:
                    bits.append(link(src))
                if h.get("checked"):
                    bits.append("checked " + ap(h["checked"]))
                tail = f'<span class="summary-src">{"; ".join(bits)}</span>' if bits else ""
                body = f'<span class="summary-note">{line}</span>{tail}'
            else:
                body = '<span class="summary-note">No night rule sourced yet. Check posted signs, and the lake page for who runs the water.</span>'
            chip = f'<span class="summary-chip">{html.escape(h["chip"])}</span>' if h.get("chip") else ""
            lid = html.escape(l, quote=True)
            dq = html.escape(search_q(l), quote=True)
            out.append(f'          <li id="{lid}" data-q="{dq}"><p class="summary-head"><a href="{l}/">{html.escape(name(l))}</a>{chip}</p><p class="summary-body">{body}</p></li>')
        out.append('        </ul>')
        out.append('      </details>')
    out.append('      </div>')
    return "\n".join(out)



def stamp_rules_ids(s):
    """Add id="<lake>" to lake-specific items already on rules.html. Does not add or rewrite rows."""
    def tr(m):
        lake = m.group(1)
        if lake not in REG["lakes"]:
            return m.group(0)
        return f'<tr id="{html.escape(lake, quote=True)}"><th scope="row"><a href="{lake}/">'

    bass = re.search(r'(<section id="bass".*?<tbody>)(.*?)(</tbody>)', s, re.S)
    if bass:
        body = re.sub(
            r'<tr(?:\s+id="[^"]*")?><th scope="row"><a href="([a-z0-9-]+)/">',
            tr,
            bass.group(2),
        )
        s = s[:bass.start()] + bass.group(1) + body + bass.group(3) + s[bass.end():]
    s = re.sub(
        r'(<section id="crappie"[^>]*>\s*<h2[^>]*>.*?</h2>\s*)<p(?:\s+id="hoover")?>(\s*<a href="hoover/">)',
        r'\1<p id="hoover">\2',
        s,
        count=1,
        flags=re.S,
    )
    return s


MARK = re.compile(r"(<!-- nb:summary -->)(.*?)(<!-- /nb:summary -->)", re.S)
check = "--check" in sys.argv[1:]
bad = 0
for page, fn in (("drawdown.html", drawdown), ("night.html", night)):
    p = root / page
    s = p.read_text()
    m = MARK.search(s)
    if not m:
        sys.exit(f"{page}: no <!-- nb:summary --> markers")
    ind = re.search(r"([ \t]*)<!-- nb:summary -->", s).group(1)
    new = s[:m.start(2)] + "\n" + fn() + "\n" + ind + s[m.end(2):]
    if new != s:
        if check:
            print(f"FAIL {page} is out of date (run python3 tools/build-summaries.py)"); bad = 1
        else:
            p.write_text(new); print(f"wrote {page}")
    elif check:
        print(f"PASS {page}")

# rules.html: stamp row ids on items already on the page. Do not add or rewrite rows.
rp = root / "rules.html"
rs = rp.read_text()
rs2 = stamp_rules_ids(rs)
if rs2 != rs:
    if check:
        print("FAIL rules.html is missing lake row ids (run python3 tools/build-summaries.py)"); bad = 1
    else:
        rp.write_text(rs2); print("wrote rules.html (row ids)")
elif check:
    print("PASS rules.html")
sys.exit(bad)
