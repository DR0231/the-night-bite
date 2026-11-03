#!/usr/bin/env python3
"""Picker tile charts: assets/tiles/<id>.png, made from each lake's pool card chart (assets/<id>-chart.png).

The pool card charts carry a small north arrow, and some are drawn with north to the left so a long lake fits the
card. The picker on the site root shows every water side by side, so its tiles use a copy with the arrow taken out
and north turned to the top on every water (map convention, so no arrow is needed). The pool card art is unchanged.

    python3 tools/build-tile-charts.py                 # every lake in js/lakes.js
    python3 tools/build-tile-charts.py --lake seneca   # one lake (repeat --lake for more)
    python3 tools/build-tile-charts.py --check         # change nothing; exit 1 if a tile or sw.js would change

Idempotent: a tile is written only when its bytes would change, and sw.js PRECACHE gets exactly one
"assets/tiles/<id>.png" line per tile that exists (added after the other tile lines, stale ones dropped).
tools/build-lake-pages.py runs this for every lake on each build (so check-all, new-lake, promote and a plain build
all keep tiles in step), and tools/new-lake.py runs it for the new lake. A lake with no chart yet gets no tile; its
tile appears on the first build after assets/<id>-chart.png is added. Needs Pillow to draw; without it the committed
tiles are used as they are and a note is printed.
"""
import argparse
import io
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CREAM = (232, 213, 163, 255)
# the arrow and N, as drawn in the top left corner of every chart (pixel positions, 1x)
NORTH_LEFT = {(2, 4), (3, 3), (3, 4), (3, 5), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (5, 4), (6, 4), (8, 2), (8, 3),
              (8, 4), (8, 5), (8, 6), (9, 3), (10, 4), (11, 2), (11, 3), (11, 4), (11, 5), (11, 6)}
NORTH_UP = {(2, 3), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (4, 3), (6, 2), (6, 3), (6, 4), (6, 5), (6, 6), (7, 3), (8, 4),
            (9, 2), (9, 3), (9, 4), (9, 5), (9, 6)}
TILE_LINE = re.compile(r'^  "assets/tiles/([a-z0-9]+)\.png",\n', re.M)


def lake_ids(root):
    src = (root / "js" / "lakes.js").read_text(encoding="utf-8")
    order = re.search(r"var ORDER = \[([^\]]*)\]", src)
    if not order:
        raise SystemExit("build-tile-charts: could not find ORDER in js/lakes.js")
    return re.findall(r'"([a-z0-9]+)"', order.group(1))


def tile_bytes(chart):
    """The chart with its north arrow removed, turned north up. Raises ValueError when there is no arrow to read."""
    from PIL import Image
    im = Image.open(chart).convert("RGBA")
    px = im.load()
    cream = {(x, y) for y in range(min(9, im.height)) for x in range(min(13, im.width)) if px[x, y] == CREAM}
    if NORTH_LEFT <= cream:
        glyph, turn = NORTH_LEFT, True
    elif NORTH_UP <= cream:
        glyph, turn = NORTH_UP, False
    else:
        raise ValueError(f"no north arrow found in {chart.name}; draw it in the top left corner like the other charts")
    for x, y in glyph:
        px[x, y] = (0, 0, 0, 0)   # the tile's well is navy, so the arrow's navy outline disappears with it
    if turn:
        im = im.rotate(-90, expand=True)   # north on the left -> north at the top
    out = io.BytesIO()
    im.save(out, "PNG", optimize=True)
    return out.getvalue()


def sync_precache(root, write=True):
    """One PRECACHE line per existing tile, in lake order, placed where the tile lines already sit."""
    sw = root / "sw.js"
    text = sw.read_text(encoding="utf-8")
    want = [i for i in lake_ids(root) if (root / "assets" / "tiles" / f"{i}.png").exists()]
    block = "".join(f'  "assets/tiles/{i}.png",\n' for i in want)
    lines = list(TILE_LINE.finditer(text))
    if lines:
        new = text[:lines[0].start()] + TILE_LINE.sub("", text[lines[0].start():lines[-1].end()]) + text[lines[-1].end():]
        at = lines[0].start()
    else:
        m = re.search(r'^  "assets/[a-z0-9]+-chart\.png",\n', text, re.M) or re.search(r"^var PRECACHE = \[\n", text, re.M)
        if not m:
            raise SystemExit("build-tile-charts: could not find PRECACHE in sw.js")
        new, at = text, (m.start() if "-chart" in m.group(0) else m.end())
    new = new[:at] + block + new[at:]
    changed = new != text
    if changed and write:
        sw.write_text(new, encoding="utf-8")
    return changed


def build(root=ROOT, lakes=None, check=False, log=print):
    """Write the tiles for `lakes` (default every lake) and sync sw.js. Returns the list of files that changed
    (or would change, with check=True)."""
    root = pathlib.Path(root)
    every = lake_ids(root)
    todo = lakes or every
    unknown = [i for i in todo if i not in every]
    if unknown:
        raise SystemExit(f"build-tile-charts: not in js/lakes.js: {', '.join(unknown)}")
    tiles = root / "assets" / "tiles"
    changed = []
    try:
        import PIL  # noqa: F401
        have_pil = True
    except ImportError:
        have_pil = False
        log("build-tile-charts: Pillow is not installed, so tiles were not redrawn (pip install pillow)")
    for lid in todo:
        chart, dst = root / "assets" / f"{lid}-chart.png", tiles / f"{lid}.png"
        if not chart.exists() or not have_pil:
            continue
        try:
            data = tile_bytes(chart)
        except ValueError as e:
            raise SystemExit(f"build-tile-charts: {e}")
        if not dst.exists() or dst.read_bytes() != data:
            changed.append(dst.relative_to(root).as_posix())
            if not check:
                tiles.mkdir(parents=True, exist_ok=True)
                dst.write_bytes(data)
    if not lakes and tiles.exists():   # a full run also drops tiles of lakes that left js/lakes.js
        for f in sorted(tiles.glob("*.png")):
            if f.stem not in every:
                changed.append(f.relative_to(root).as_posix())
                if not check:
                    f.unlink()
    if sync_precache(root, write=not check):
        changed.append("sw.js")
    return changed


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--lake", action="append", help="only this lake (repeatable); default every lake")
    ap.add_argument("--check", action="store_true", help="change nothing; exit 1 if anything would change")
    ap.add_argument("--root", default=str(ROOT), help="site checkout (default this one)")
    a = ap.parse_args()
    changed = build(a.root, a.lake, a.check)
    verb = "would change" if a.check else "changed"
    print(f"build-tile-charts: {len(changed)} files {verb}" + (": " + ", ".join(changed) if changed else ""))
    if a.check and changed:
        sys.exit(1)


if __name__ == "__main__":
    main()
