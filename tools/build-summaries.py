#!/usr/bin/env python3
"""Build the two summary pages from data already on the site, so they never drift from the lake pages:

    python3 tools/build-summaries.py           # write drawdown.html and night.html between their nb:summary markers
    python3 tools/build-summaries.py --check   # change nothing; exit 1 if either page would change

  · drawdown.html: MWCD's winter drawdown table for the waters on this site, from data/drawdowns.json (MWCD's own
    numbers, with the source and the date checked). Waters MWCD does not list are named as not listed.
  · night.html: open hours and night rules for every water, from data/quick-facts.json (the same "night" line and
    "hours" source each lake home shows in Quick facts), grouped by the picker regions in js/lakes.js. A water with no
    night line gets a plain "no night rule sourced yet" line, never a guess.
Only the part between <!-- nb:summary --> and <!-- /nb:summary --> is written; the rest of each page is hand edited.
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
        out.append(f'          <tr><th scope="row"><a href="{r["lake"]}/">{html.escape(name(r["lake"]))}</a></th><td>{ap(r["begins"], year=False)}</td>'
                   f'<td class="num">{ft(r["normal"])} ft</td><td class="num">{ft(r["winter"])} ft</td><td class="num">{ft(r["drop"])} ft</td>'
                   f'<td class="num">{r["days"]}</td><td class="num">{ft(r["refill"])} ft</td></tr>')
    out += ['        </tbody>', '      </table></div>']
    if d.get("not_listed"):
        nl = [f'<a href="{l}/">{html.escape(name(l))}</a>' for l in d["not_listed"]]
        out.append(f'      <p class="meta">Not on MWCD&rsquo;s schedule: {", ".join(nl)}. Its lake page shows the Corps of Engineers gauge.</p>')
    src = f'<a href="{html.escape(d["source"][1])}" target="_blank" rel="noopener">{html.escape(d["source"][0])} ({ap(d["source_date"])})</a>'
    out.append(f'      <p class="meta">Source: {src}. Checked {ap(d["checked"])}.</p>')
    return "\n".join(out)


def night():
    q = json.loads((root / "data" / "quick-facts.json").read_text())["lakes"]
    out = []
    for reg in REG["regions"]:
        ids = [l for l in REG["order"] if REG["lakes"][l].get("region") == reg["id"]]
        if not ids:
            continue
        out.append(f'      <h2 id="night-{reg["id"]}">{html.escape(reg["name"])}</h2>')
        out.append('      <ul class="summary-list">')
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
            out.append(f'        <li><p class="summary-head"><a href="{l}/">{html.escape(name(l))}</a>{chip}</p><p class="summary-body">{body}</p></li>')
        out.append('      </ul>')
    return "\n".join(out)


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
sys.exit(bad)
