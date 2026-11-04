#!/usr/bin/env python3
"""Extract every visible English line on every built page into per-page string files, and report translation coverage.

    python3 tools/i18n-extract.py              # write data/i18n/pages/*, print coverage per page group and language
    python3 tools/i18n-extract.py --check      # write nothing; exit 1 if a file would change or a STRICT page has gaps
    python3 tools/i18n-extract.py --missing es --page hoover   # list the English lines with no Spanish yet

How it works (S12, the lever for "every piece of text in the picked language"):
  * Walks every built page (index.html, <lake>/index.html, species/*.html and the other root pages; never
    whisperwood.html). Lake homes are generated from tools/lake-home.html, so the built pages cover the template.
  * Collects each visible text node inside <main> and dialogs (the same places js/i18n.js translates), plus the alt,
    aria-label, title and placeholder attributes. Skipped: h1 (titles stay as they are), .cond-summary (NWS words),
    [data-nb-keep], script/style, chrome already covered by data/i18n/en.json (exact strings and pg.* templates),
    and lines that hold no words once names and numbers are taken out.
  * Key = <page>.<first 8 hex of sha1 of the normalised English>, so a key is stable until the English changes, and an
    edit simply makes a new key (the old translation stays in the memory and is reused if the text comes back).
  * Translations live once per language in data/i18n/tm/<lang>.json ({"strings": {hash: text}}), the translation
    memory: a line shared by 23 lake homes is translated once. The tool writes data/i18n/pages/<page>.en.json (the
    English source for that page) and data/i18n/pages/<page>.<lang>.json (that page's lines from the memory), so a
    page fetches only its own strings. js/i18n.js loads them next to the shared file.
  * Idempotent: output is sorted, files are rewritten only when their content changes, stale page files are removed.
The static HTML is never edited: it stays English for SEO and no-JS. Matching in the browser is by the English text.
Coverage counts a key as translated when the language has it. STRICT_GROUPS lists page groups that must be complete;
check-i18n.py fails on any gap there and prints the coverage of every other group.
"""
import argparse, hashlib, html, json, os, pathlib, re, sys
from bs4 import BeautifulSoup, Comment, NavigableString

ROOT = pathlib.Path(os.environ.get("NB_ROOT") or pathlib.Path(__file__).resolve().parent.parent)
D = ROOT / "data" / "i18n"; PAGES = D / "pages"; TM = D / "tm"
ATTRS = ["alt", "aria-label", "title", "placeholder"]
SCOPES = ".site-header, .site-footer, .glance, #glance-actions, .a11y-panel, .night-chip, .nws-alert, #my-trips, #add-trip, [data-log-filter], .i18n-draft, .spy-label, a.sr-only[href$=\"#main\"]"
KEEP = "h1, .cond-summary, [data-nb-keep]"
# S13: text the scripts write after load (values, units, subs, status lines, the hourly strip) and <time> (Intl in the
# browser). Their baked placeholders are never shown for long; js/i18n.js handles them with pg.* templates and Intl.
DYN = ".cond-value, .cond-unit, .glance-unit, .cond-sub, .cond-asof, .cond-hours-list, .cond-storm, .cond-bite-rate, .cond-bite-why, .cond-line-text, .cond-x-value, .cond-status, .bait-status, .get-app-status, [id$=status], [class*=-status], time[datetime], [data-nb-dyn]"
SKIP_PAGES = {"whisperwood"}
# page groups for the coverage report; check-i18n.py fails on gaps only in STRICT_GROUPS (grow it as groups finish)
STRICT_GROUPS = ["lake homes", "species", "picker + water", "log", "other pages", "script cards", "map cards", "dock cards"]

def norm(s): return re.sub(r"\s+", " ", s).strip()
def h8(s): return hashlib.sha1(norm(s).encode()).hexdigest()[:8]

def pages():
    out = []
    for p in sorted(ROOT.glob("*.html")):
        if p.stem not in SKIP_PAGES: out.append(("index" if p.stem == "index" else p.stem, p))
    for p in sorted(ROOT.glob("*/index.html")):
        if p.parent.name in ("species", "tools", "previews", "workers", "assets"): continue
        out.append((p.parent.name, p))
    for p in sorted((ROOT / "species").glob("*.html")):
        out.append(("species" if p.stem == "index" else "species-" + p.stem, p))
    return out

def lakes():
    try:
        sys.path.insert(0, str(ROOT / "tools")); import registry
        return set(registry.load(ROOT)["order"])
    except Exception:
        return {p.parent.name for p in ROOT.glob("*/index.html") if (p.parent / "index.html").read_text(errors="ignore").find("lake-home") >= 0}

def group(page, LAKES):
    if page in LAKES: return "lake homes"
    if page.startswith("species"): return "species"
    if page in ("index", "water"): return "picker + water"
    if page == "log": return "log"
    if page == "js": return "script cards"
    if page == "map": return "map cards"
    if page == "docklist": return "dock cards"
    return "other pages"

def en_tables():
    en = json.loads((D / "en.json").read_text())["strings"]
    exact = {norm(v) for k, v in en.items() if not re.search(r"\{\w+\}", v)}
    tpl = [re.compile("^" + re.sub(r"\\\{(\w+)\\\}", lambda m: r"(\d[\d.,]*)" if m.group(1).startswith("num") else "(mph)" if m.group(1).startswith("unit") else "(.+?)", re.escape(norm(v))) + "$") for k, v in en.items() if k.startswith("pg.") and re.search(r"\{\w+\}", v)]
    return exact, tpl

NAMEWORDS = None
def words_left(s):
    """True when the line still has a word after names, units and numbers are removed."""
    t = s
    for n in NAMEWORDS: t = t.replace(n, " ")
    t = re.sub(r"\b(ft|mph|hp|in|inHg|°F|°|%|AM|PM|a\.m\.|p\.m\.|N|S|E|W|NE|NW|SE|SW|USGS|ODNR|NWS|USACE|MWCD)\b", " ", t)
    return bool(re.search(r"[A-Za-z]{2,}", t))

def extract(path, exact, tpl):
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "lxml")
    keep = set(map(id, soup.select(KEEP + ", " + DYN))) ; scope = set(map(id, soup.select(SCOPES)))
    def blocked(el):
        for a in [el] + list(el.parents):
            if id(a) in keep or id(a) in scope: return True
            if getattr(a, "name", None) in ("script", "style", "noscript", "template"): return True
        return False
    def covered(s):
        n = norm(s)
        if n in exact or any(r.match(n) for r in tpl): return True
        m = re.match(r"^[:;,.]\s*(.+)$", n)
        if m and (m.group(1) in exact): return True
        return False
    found = {}
    for root in soup.select("main, dialog"):
        if "a11y-panel" in (root.get("class") or []): continue
        for t in root.find_all(string=True):
            if isinstance(t, Comment) or not norm(t): continue
            if blocked(t.parent) or covered(t) or not words_left(norm(t)): continue
            found[norm(t)] = 1
        for el in [root] + root.find_all(True):
            for a in ATTRS:
                v = el.get(a)
                if not v or not norm(v) or blocked(el) or covered(v) or not words_left(norm(v)): continue
                found[norm(v)] = 1
    return list(found)

# S13: the "What's biting" cards are filled from these data files by js/biting.js and js/species-lake.js; their
# where/when/note lines go into one virtual page "js" (species names stay English, so they are left out)
JS_DATA = ["js/biting-data.js", "js/biting-data-lakes.js"]
def js_lines():
    import subprocess
    code = ("global.window={};" + "".join(f"require({json.dumps(str(ROOT / p))});" for p in JS_DATA) +
            "const s=new Set();for(const k in window){const v=window[k];if(!v||!v.months)continue;"
            "v.months.forEach(m=>{if(m.note)s.add(m.note);(m.picks||[]).forEach(p=>{s.add(p.where);s.add(p.when)})})}"
            "console.log(JSON.stringify([...s]))")
    out = json.loads(subprocess.run(["node", "-e", code], capture_output=True, text=True, check=True).stdout)
    return sorted({norm(x) for x in out if x and norm(x)})

# S13 seg6: ramp/bait card lines from the lake map data files (js/hoover-map.js) go into the virtual page "map"
# (names, addresses, phones and sources stay as written)
MAP_FIELDS = ["note", "parking", "restroom", "lit", "hours", "tip", "typeLabel"]
def map_lines():
    import subprocess
    files = sorted(str(p) for p in (ROOT / "js").glob("*map-data*.js"))
    code = ("global.window={};" + "".join(f"require({json.dumps(f)});" for f in files) +
            "const s=new Set();for(const k in window){const v=window[k];if(!v||!v.places)continue;if(v.title)s.add(v.title);if(v.notes)s.add(v.notes);"
            f"v.places.forEach(p=>{json.dumps(MAP_FIELDS)}.forEach(f=>{{if(typeof p[f]==='string')s.add(p[f])}}))}}"
            "console.log(JSON.stringify([...s]))")
    out = json.loads(subprocess.run(["node", "-e", code], capture_output=True, text=True, check=True).stdout)
    return sorted({norm(x) for x in out if x and norm(x) and words_left(norm(x))})

# S13 seg7: dock season lines from data/docks.json (item names, pills, notes and their after-season swaps) go into
# the virtual page "docklist" (docks.html already owns "docks"); js/docks.js swaps in data-after-label/-note, which i18n.js then matches here
def docks_lines():
    d = json.loads((ROOT / "data" / "docks.json").read_text(encoding="utf-8")); s = set()
    for L in d.get("lakes", {}).values():
        for it in L.get("items", []):
            for f in ("name", "label", "after_label", "note", "after_note"):
                if isinstance(it.get(f), str): s.add(html.unescape(it[f]))
    return sorted({norm(x) for x in s if x and norm(x) and words_left(norm(x))})

def write(p, obj, check, changed):
    txt = json.dumps(obj, ensure_ascii=False, indent=1, sort_keys=True) + "\n"
    if p.exists() and p.read_text(encoding="utf-8") == txt: return
    changed.append(str(p.relative_to(ROOT)))
    if not check: p.parent.mkdir(parents=True, exist_ok=True); p.write_text(txt, encoding="utf-8")

def main():
    global NAMEWORDS
    ap = argparse.ArgumentParser(); ap.add_argument("--check", action="store_true"); ap.add_argument("--missing"); ap.add_argument("--page"); ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()
    LAKES = lakes()
    ck = json.loads((ROOT / "tools" / "check-i18n-names.json").read_text()) if (ROOT / "tools" / "check-i18n-names.json").exists() else {}
    NAMEWORDS = sorted(set(ck.get("names", [])), key=len, reverse=True)
    exact, tpl = en_tables()
    langs = sorted(p.stem for p in D.glob("*.json") if p.stem != "en")
    tm = {l: (json.loads((TM / f"{l}.json").read_text())["strings"] if (TM / f"{l}.json").exists() else {}) for l in langs}
    changed, keep_files, cov, gaps = [], set(), {}, []
    for page, path in pages() + [("js", None), ("map", None), ("docklist", None)]:
        lines = (js_lines() if page == "js" else docks_lines() if page == "docklist" else map_lines()) if path is None else extract(path, exact, tpl)
        src = {f"{page}.{h8(s)}": s for s in lines}
        f = PAGES / f"{page}.en.json"; keep_files.add(f.name)
        write(f, {"_meta": {"page": page, "source": str(path.relative_to(ROOT)) if path else (", ".join(JS_DATA) if page == "js" else "data/docks.json" if page == "docklist" else "js/*map-data*.js")}, "strings": src}, a.check, changed)
        g = group(page, LAKES)
        for l in langs:
            tr = {k: tm[l][k.split(".", 1)[1]] for k in src if k.split(".", 1)[1] in tm[l]}
            c = cov.setdefault(g, {}).setdefault(l, [0, 0]); c[0] += len(tr); c[1] += len(src)
            if a.missing == l and (not a.page or a.page == page):
                for k, s in src.items():
                    if k not in tr: print(f"{k}\t{s}")
            if len(tr) < len(src) and g in STRICT_GROUPS: gaps.append(f"{l} {page}: {len(src) - len(tr)} untranslated")
            if tr:
                f = PAGES / f"{page}.{l}.json"; keep_files.add(f.name)
                write(f, {"_meta": {"page": page, "lang": l, "review": "draft"}, "strings": tr}, a.check, changed)
    # each language file lists the pages that have their own strings, so the browser never asks for a missing file
    for l in langs:
        lf = D / f"{l}.json"; j = json.loads(lf.read_text())
        want = sorted(n[:-len(f".{l}.json")] for n in keep_files if n.endswith(f".{l}.json"))
        if j.get("_meta", {}).get("pages") != want:
            j["_meta"]["pages"] = want; changed.append(str(lf.relative_to(ROOT)))
            if not a.check: lf.write_text(json.dumps(j, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for p in PAGES.glob("*.json"):
        if p.name not in keep_files:
            changed.append(str(p.relative_to(ROOT)) + " (stale)")
            if not a.check: p.unlink()
    if a.missing: return 0
    if not a.quiet:
        print(f"i18n-extract: {len(pages())} pages, {len(changed)} files {'would change' if a.check else 'written'}")
        for g in sorted(cov):
            row = ", ".join(f"{l} {100 * c[0] // max(c[1], 1)}%" for l, c in sorted(cov[g].items()))
            print(f"  {g} ({next(iter(cov[g].values()))[1]} keys): {row}")
    json.dump({g: {l: c for l, c in v.items()} for g, v in cov.items()}, open(ROOT / "tools" / ".i18n-coverage.json", "w"), indent=1, sort_keys=True)
    for x in gaps: print("FAIL " + x)
    if a.check and changed:
        print("FAIL page string files out of date (run python3 tools/i18n-extract.py): " + ", ".join(changed[:8])); return 1
    return 1 if gaps else 0

if __name__ == "__main__": sys.exit(main())
