#!/usr/bin/env python3
"""Build the What's new page from data/updates.json (the one place entries live).

Run from the repo root after editing data/updates.json, then stamp as usual:
    python3 tools/build-updates.py && python3 tools/stamp-version.py

It writes
  · updates.html: the entries prerendered between <!-- updates:start --> and <!-- updates:end -->, so the page reads
    without JavaScript and search engines see it. Draft entries ("draft": true, "date": null) are rendered with
    class "is-draft"; the CSS hides them unless js/updates-draft.js marks the page as a preview (any host other than
    nightbiteoh.com), so a draft never shows on the live site even if it gets promoted by mistake.
  · data-updates="YYYY-MM-DD" on every link to the What's new page (updates, no .html) in the site's pages (newest dated entry), which js/nav.js
    compares with what the visitor last saw to show the small New dot.
  · the <lastmod> of /updates in sitemap.xml.
Checks: dates are YYYY-MM-DD, newest first; tag is New, Improved or Fixed; 2 to 5 bullets; no spaced dashes; every
link points at a page in the repo, written without .html (water#docks, species/walleye, ./). whisperwood.html and everything under whisperwood/ are left alone.
"""
import datetime, html, json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
TAGS = {"New", "Improved", "Fixed"}
data = json.loads((root / "data/updates.json").read_text())
entries = data["entries"]
errors = []

def check_text(where, s):
    if re.search(r"\s[-\u2013\u2014]\s", s):
        errors.append(f"{where}: spaced dash in {s!r}")

def link_ok(href):
    path = href.split("#")[0]
    if path in ("", "./"):
        return (root / "index.html").exists()
    p = root / path
    if path.endswith("/"):
        return (p / "index.html").exists()
    # links are written without .html (GitHub Pages serves foo.html at foo)
    return not path.endswith(".html") and (root / (path + ".html")).exists()

ids, last = set(), None
for i, e in enumerate(entries):
    w = f"entry {i} ({e.get('id')})"
    if e.get("id") in ids or not re.fullmatch(r"[a-z0-9-]+", e.get("id", "")):
        errors.append(f"{w}: id must be unique, lowercase letters, digits and hyphens")
    ids.add(e.get("id"))
    if e.get("draft"):
        if e.get("date"):
            errors.append(f"{w}: a draft has no date yet; set the date and remove \"draft\" together at promotion")
    else:
        try:
            d = datetime.date.fromisoformat(e.get("date") or "")
        except ValueError:
            errors.append(f"{w}: date must be YYYY-MM-DD"); d = None
        if d and last and d > last:
            errors.append(f"{w}: entries must be newest first")
        last = d or last
    if e.get("tag") and e["tag"] not in TAGS:
        errors.append(f"{w}: tag must be one of {sorted(TAGS)}")
    b = e.get("bullets", [])
    if not 2 <= len(b) <= 5:
        errors.append(f"{w}: needs 2 to 5 bullets")
    for s in [e.get("title", "")] + b + [l["label"] for l in e.get("links", [])]:
        check_text(w, s)
    for l in e.get("links", []):
        if not link_ok(l["href"]):
            errors.append(f"{w}: link {l['href']} is not a page in this repo")
drafts_first = [bool(e.get("draft")) for e in entries]
if drafts_first != sorted(drafts_first, reverse=True):
    errors.append("draft entries go at the top (they are the newest)")
if errors:
    sys.exit("data/updates.json:\n  " + "\n  ".join(errors))

dated = [e for e in entries if not e.get("draft")]
latest = dated[0]["date"] if dated else ""

def nice(d):
    d = datetime.date.fromisoformat(d)
    return f"{d.strftime('%B')} {d.day}, {d.year}"

def esc(s):
    return html.escape(s, quote=True)

def nowrap_phones(s):
    # keep 614-645-3337 on one line on phones instead of breaking at a hyphen
    return re.sub(r"(?<![\d-])(\d{3}-\d{3}-\d{4})(?![\d-])", r'<span class="nowrap">\1</span>', s)

# ---- updates.html
out = []
for e in entries:
    draft = bool(e.get("draft"))
    cls = "update is-draft" if draft else "update"
    out.append(f'      <li class="{cls}" id="{e["id"]}">')
    out.append('        <article aria-labelledby="' + e["id"] + '-title">')
    out.append('          <p class="update-meta">')
    if draft:
        out.append('            <span class="update-date update-date-draft">Preview only: date set when it ships</span>')
    else:
        out.append(f'            <time class="update-date" datetime="{e["date"]}">{nice(e["date"])}</time>')
    if e.get("tag"):
        out.append(f'            <span class="update-tag update-tag-{e["tag"].lower()}">{esc(e["tag"])}</span>')
    out.append('          </p>')
    out.append(f'          <h2 class="update-title" id="{e["id"]}-title">{esc(e["title"])}</h2>')
    out.append('          <ul class="update-list">')
    for b in e["bullets"]:
        out.append(f"            <li>{nowrap_phones(esc(b))}</li>")
    out.append("          </ul>")
    if e.get("links"):
        links = "".join(f'<li><a href="{esc(l["href"])}">{esc(l["label"])}</a></li>' for l in e["links"])
        out.append(f'          <ul class="update-links" aria-label="Changed pages">{links}</ul>')
    out.append("        </article>")
    out.append("      </li>")
page = root / "updates.html"
src = page.read_text()
new, n = re.subn(r"(<!-- updates:start -->).*?(\n\s*<!-- updates:end -->)", lambda m: m.group(1) + "\n" + "\n".join(out) + m.group(2), src, flags=re.S)
if n != 1:
    sys.exit("updates.html: markers <!-- updates:start --> / <!-- updates:end --> not found")
if new != src:
    page.write_text(new)

# ---- data-updates on every link to the page (drives the New dot), and the sitemap lastmod
pat = re.compile(r'(<a href="(?:\.\./|/night-bite-preview/|/)?updates")(?: data-updates="[^"]*")?')
pages = 0
for p in sorted(root.rglob("*.html")):
    rel = p.relative_to(root).as_posix()
    if rel.startswith(("whisperwood", "previews/", "review/", "tools/")):
        continue
    s = p.read_text()
    t = pat.sub(lambda m: f'{m.group(1)} data-updates="{latest}"', s)
    if t != s:
        p.write_text(t); pages += 1
sm = root / "sitemap.xml"
s = sm.read_text()
t = re.sub(r"(<loc>https://nightbiteoh\.com/updates</loc>\s*<lastmod>)[^<]*", lambda m: m.group(1) + latest, s)
if t != s:
    sm.write_text(t)
print(f"updates: {len(dated)} dated, {len(entries) - len(dated)} draft; newest {latest}; stamped links on {pages} pages")
