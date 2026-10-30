#!/usr/bin/env python3
"""Watches the official dock and drawdown pages listed under "watch" in data/docks.json and reports what changed.

From the repo root:
    python3 tools/check-docks.py            # compare with the saved baseline, print a report, save nothing
    python3 tools/check-docks.py --update   # same, then save today's snapshot as the new baseline

For each page it keeps only the sentences that mention that source's keywords (docks, ramps, drawdown, closures...),
so menus, ads and date stamps don't trip it. ODNR drawdowns: just the Alum Creek, Buckeye Lake, Delaware and Deer Creek table rows.
Baseline: tools/docks-watch-state.json (commit it after --update).

Output: one line per source, then a last line that starts with RESULT:
    RESULT: CHANGED n      a watched page changed; the +/- lines show what. Read the page, then edit data/docks.json
    RESULT: NO CHANGE      every page was read and nothing that matters moved
    RESULT: ERRORS n       nothing changed on the pages that loaded, but n could not be read
Exit code: 0 no change, 1 changed, 2 errors only.
ohiodnr.gov refuses some networks (it answers 404 to everything); the script then reads the same public page through
the r.jina.ai reader and says "via reader" on that line.
"""
import datetime, hashlib, html, json, pathlib, re, sys, urllib.request

R = pathlib.Path(__file__).resolve().parent.parent
CONF = json.loads((R / "data" / "docks.json").read_text())
STATE = R / "tools" / "docks-watch-state.json"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 NightBiteDockCheck/1"


def get(url, timeout=45):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*;q=0.8", "Accept-Language": "en-US"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "replace")


def fetch(url):
    try:
        return get(url), "direct"
    except Exception as e:
        first = f"{type(e).__name__}: {e}"
    try:
        return get("https://r.jina.ai/" + url, timeout=90), "via reader"
    except Exception as e:
        raise RuntimeError(f"{first}; reader: {type(e).__name__}: {e}")


def to_text(raw):
    t = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", raw)
    t = re.sub(r"(?i)<br\s*/?>|</(p|li|h\d|div|tr|td|th|section|article)>", "\n", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html.unescape(t)
    t = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", t)          # reader markdown images
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t)        # reader markdown links -> text
    t = t.replace("\u200b", " ").replace("\xa0", " ")
    return t


def snippets(text, keywords):
    out = []
    for line in text.split("\n"):
        line = re.sub(r"[ \t*#|>_]+", " ", line).strip()
        for s in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])", line):
            s = s.strip()
            if len(s) < 30 or not any(k in s.lower() for k in keywords):
                continue
            s = s[:400]
            if s not in out:
                out.append(s)
    return sorted(out)


def drawdown_rows(raw, names):
    rows = []
    m = re.search(r'\{"data":\s*(\[\[.*?\]\])', html.unescape(raw), re.S)  # the page embeds the table as JSON
    if m:
        try:
            for r in json.loads(m.group(1)):
                if r and any(r[0].strip().lstrip("*").lower() == n.lower() for n in names):
                    rows.append(" | ".join(c.strip() for c in r[:6]))
        except ValueError:
            pass
    if not rows:  # table as text (direct HTML or reader markdown)
        for line in to_text(raw).split("\n"):
            cells = [c.strip() for c in line.split("|") if c.strip()]
            if cells and any(cells[0].lstrip("*").lower() == n.lower() for n in names):
                rows.append(" | ".join(cells[:6]))
    return sorted(set(rows))


def main():
    update = "--update" in sys.argv[1:]
    old = json.loads(STATE.read_text()) if STATE.exists() else {}
    new, changed, errors = {}, 0, 0
    print(f"Dock watch, {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')} (box time, America/New_York)")
    for w in CONF["watch"]:
        sid = w["id"]
        try:
            raw, how = fetch(w["url"])
        except Exception as e:
            errors += 1
            print(f"ERROR     {sid}: could not read {w['url']} ({e})")
            if sid in old:
                new[sid] = old[sid]
            continue
        snips = snippets(to_text(raw), [k.lower() for k in w["keywords"]])
        if w.get("rows"):
            rows = drawdown_rows(raw, w["rows"])
            if not rows:
                errors += 1
                print(f"ERROR     {sid}: no {', '.join(w['rows'])} rows found ({how}); the table layout may have changed")
                if sid in old:
                    new[sid] = old[sid]
                continue
            snips = sorted(set(rows + [s for s in snips if "postpon" in s.lower() and '","' not in s]))
        if not snips:
            errors += 1
            print(f"ERROR     {sid}: page loaded ({how}) but nothing matched its keywords; check it by hand: {w['url']}")
            if sid in old:
                new[sid] = old[sid]
            continue
        digest = hashlib.sha256("\n".join(snips).encode()).hexdigest()[:16]
        new[sid] = {"hash": digest, "snippets": snips, "url": w["url"], "seen": datetime.date.today().isoformat()}
        prev = old.get(sid)
        if prev is None:
            print(f"NEW       {sid}: first snapshot, {len(snips)} lines ({how})")
        elif prev["hash"] == digest:
            print(f"UNCHANGED {sid} ({how})")
        else:
            changed += 1
            print(f"CHANGED   {sid}: {w['url']} ({how})")
            a, b = set(prev["snippets"]), set(snips)
            for s in sorted(b - a):
                print(f"    + {s}")
            for s in sorted(a - b):
                print(f"    - {s}")
    if update:
        STATE.write_text(json.dumps(new, indent=2, ensure_ascii=False) + "\n")
        print(f"baseline saved to {STATE.relative_to(R)}")
    if changed:
        print(f"RESULT: CHANGED {changed}")
        return 1
    if errors:
        print(f"RESULT: ERRORS {errors}")
        return 2
    print("RESULT: NO CHANGE")
    return 0


if __name__ == "__main__":
    sys.exit(main())
