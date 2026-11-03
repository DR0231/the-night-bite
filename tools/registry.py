"""The Night Bite: the site's lake registry for the Python tools (same data as tools/registry.cjs, which it calls).

    import sys, pathlib; sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
    import registry
    R = registry.load()          # {"order": [...], "lakes": {...}, "regions": [...], "pages": [...]}
    registry.home("dow")         # "dow/"; Hoover is "hoover/" (the site root is the water picker)

Lakes and their order come from js/lakes.js, pages from sitemap.xml. Nothing is hard-coded here.
dump_like(text, data) writes JSON in the same layout as an existing file (indent width, short lists on one line), so a
tool that edits data/*.json changes only the lines it means to.
"""
import json, pathlib, re, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://nightbiteoh.com/"


def load(root=None):
    root = pathlib.Path(root or ROOT)
    out = subprocess.run(["node", str(pathlib.Path(__file__).resolve().parent / "registry.cjs"), "--root", str(root)],
                         capture_output=True, text=True)
    if out.returncode:
        raise SystemExit("registry: " + (out.stderr.strip() or "node tools/registry.cjs failed"))
    return json.loads(out.stdout)


def home(lake):
    return lake + "/"   # every lake home, Hoover too, lives at <id>/; the site root is the water picker


def _indent_of(text):
    m = re.search(r'\n( +)"', text)
    return len(m.group(1)) if m else 2


def dump_like(text, data):
    """JSON in the layout of `text`: its indent width, and lists of plain values (or of short lists) on one line when
    the original kept them that way. Round-trips data/quick-facts.json and data/bait-shops.json byte for byte."""
    ind = _indent_of(text)
    ascii_only = text.isascii()   # the file writes curly quotes as \u2019 escapes, so keep doing that
    inline_lists = re.search(r'\["[^\n]*"\]', text) is not None   # the file keeps some list of strings on one line

    def scalar_list(v):
        return isinstance(v, list) and all(not isinstance(x, (dict, list)) for x in v)

    def enc(v, level):
        pad, pad1 = " " * (ind * level), " " * (ind * (level + 1))
        if isinstance(v, dict):
            if not v:
                return "{}"
            items = [f"{pad1}{json.dumps(k, ensure_ascii=ascii_only)}: {enc(x, level + 1)}" for k, x in v.items()]
            return "{\n" + ",\n".join(items) + "\n" + pad + "}"
        if isinstance(v, list):
            if not v:
                return "[]"
            if inline_lists and scalar_list(v):
                return json.dumps(v, ensure_ascii=ascii_only)
            if inline_lists and all(scalar_list(x) for x in v):
                return "[\n" + ",\n".join(pad1 + json.dumps(x, ensure_ascii=ascii_only) for x in v) + "\n" + pad + "]"
            return "[\n" + ",\n".join(pad1 + enc(x, level + 1) for x in v) + "\n" + pad + "]"
        return json.dumps(v, ensure_ascii=ascii_only)

    return enc(data, 0) + ("\n" if text.endswith("\n") else "")
