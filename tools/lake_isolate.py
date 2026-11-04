#!/usr/bin/env python3
"""Keep only one lake's blocks on that lake's home page (used by tools/build-lake-pages.py).

tools/lake-home.html carries every lake's lake-only blocks (data-for="<id>" or a space separated list of ids) and every
lake's pool chart <img>. On a built page <id>/index.html, isolate(html, id):
  · removes every element whose data-for list does not include the lake, children and all (so the page ships only its
    own text and its own chart, and Google and text readers see one lake, not 23);
  · drops every other lake's map data script (js/hoover-map-data.js is Hoover's, js/lake-map-data-<id>.js the rest's;
    js/hoover-map.js only reads the current lake's);
  · rewrites the kept ones to data-for="<id>" (CSS still sizes the chart by img[data-for="<id>"]);
  · sets <html data-lake="<id>">, so with JavaScript off the page shows its own lake (css/styles.css only falls back to
    Hoover's blocks on pages with no data-lake). js/lakes.js sets the same value, so nothing changes with JS on.
Switching lakes is a page load to the other lake's home page (js/lakes.js hrefFor), so no page needs another lake's blocks.
Shared pages (water.html, gear.html, stocking.html, species/) are not touched; they still switch lakes in place.
tools/check-lake-isolation.py checks the built pages.
"""
import re

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
MAP_SCRIPT = re.compile(r'[ \t]*<script src="js/(?:hoover-map-data|lake-map-data-([a-z0-9]+))\.js[^"]*"></script>\n')
OPEN_FOR = re.compile(r'<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?\sdata-for="([^"]*)"[^>]*>')


def _end_of(h, start, tag, open_end):
    """Index just past the element that opens at h[start:open_end] (a <tag ...>), counting nested <tag>s."""
    if tag.lower() in VOID or h[open_end - 2] == "/":
        return open_end
    pat = re.compile(r"<(/?)" + tag + r"\b[^>]*>", re.I)
    depth, pos = 1, open_end
    while True:
        m = pat.search(h, pos)
        if not m:
            raise ValueError(f"lake_isolate: no </{tag}> for element at {start}")
        depth += -1 if m.group(1) else (0 if m.group(0).endswith("/>") else 1)
        pos = m.end()
        if depth == 0:
            return pos


def isolate(h, lake):
    out, pos = [], 0
    while True:
        m = OPEN_FOR.search(h, pos)
        if not m:
            out.append(h[pos:])
            break
        ids = m.group(2).split()
        if lake in ids:
            out.append(h[pos:m.start()])
            out.append(m.group(0).replace(f'data-for="{m.group(2)}"', f'data-for="{lake}"', 1))
            pos = m.end()
            continue
        end = _end_of(h, m.start(), m.group(1), m.end())
        before = h[pos:m.start()]
        # drop the whole line when the element sat alone on it, so no blank lines are left behind
        line_start = before.rfind("\n") + 1
        nl = h.find("\n", end)
        if before[line_start:].strip() == "" and nl != -1 and h[end:nl].strip() == "":
            before, end = before[:line_start], nl + 1
        out.append(before)
        pos = end
    res = "".join(out)
    res = MAP_SCRIPT.sub(lambda m: m.group(0) if (m.group(1) or "hoover") == lake else "", res)
    res, n = re.subn(r"<html lang=\"en\"(?: data-lake=\"[^\"]*\")?>", f'<html lang="en" data-lake="{lake}">', res, count=1)
    if n != 1:
        raise ValueError("lake_isolate: <html lang=\"en\"> not found")
    return res


def foreign(h, lake):
    """Problems on a built lake home: other lakes' blocks and charts, a missing own chart, no html[data-lake]."""
    bad = []
    for m in OPEN_FOR.finditer(h):
        if m.group(2).split() != [lake]:
            bad.append(f'data-for="{m.group(2)}" ({m.group(0)[:60]})')
    charts = re.findall(r'assets/([a-z0-9]+)-chart\.png', h)
    others = sorted({c for c in charts if c != lake})
    if others:
        bad.append("other lakes' charts: " + ", ".join(others))
    maps = sorted({m.group(1) or "hoover" for m in MAP_SCRIPT.finditer(h)})
    if maps != [lake]:
        bad.append("map data scripts: " + (", ".join(maps) or "none") + f" (want {lake} only)")
    if f'<html lang="en" data-lake="{lake}">' not in h:
        bad.append(f'<html> has no data-lake="{lake}"')
    return bad
