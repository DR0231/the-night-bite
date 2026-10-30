#!/usr/bin/env python3
"""Two corners sitewide: fail on any border-radius that is not built from the tokens.

Run from the repo root:  python3 tools/check-radius.py      (exit code 1 on any error)

Allowed values (each corner): var(--radius), var(--radius-pill) or 0 (a joined edge).
The only literals allowed are the two token definitions in css/styles.css (--radius: 4px; --radius-pill: 999px)
and anything listed in EXCEPTIONS below (for example a deliberate 50% circle; say why).
Scans CSS, HTML (inline style="" and <style> blocks), JS (style strings and .borderRadius) and the page builders
in tools/. Whisperwood (whisperwood.html, whisperwood/) is the game's own look and is skipped.
"""
import pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", "node_modules", "whisperwood", "__pycache__"}
SKIP_FILES = {"whisperwood.html", "check-radius.py"}
EXTS = {".css", ".html", ".js", ".cjs", ".mjs", ".py"}
TOKENS = {"--radius": "4px", "--radius-pill": "999px"}
# (relative path, selector or note, value): intentional 50% circles etc. None kept today.
EXCEPTIONS = set()

PART = re.compile(r"^(var\(--radius(-pill)?\)|0)$")
CSS_RE = re.compile(r"border-(?:(?:top|bottom)-(?:left|right)-|(?:start|end)-(?:start|end)-)?radius\s*:\s*([^;}\"']+)", re.I)
JS_RE = re.compile(r"\.borderRadius\s*=\s*([\"'])(.*?)\1")
TOKEN_RE = re.compile(r"(--radius(?:-pill)?)\s*:\s*([^;]+);")


def ok(value):
    parts = [p for p in re.split(r"\s+(?![^(]*\))", value.replace("!important", "").strip()) if p and p != "/"]
    return bool(parts) and all(PART.match(p) for p in parts)


errors, files = [], 0
for path in sorted(root.rglob("*")):
    rel = path.relative_to(root)
    if path.is_dir() or path.suffix not in EXTS or path.name in SKIP_FILES or SKIP_DIRS & set(rel.parts):
        continue
    files += 1
    for n, line in enumerate(path.read_text(errors="ignore").splitlines(), 1):
        for m in TOKEN_RE.finditer(line):
            name, val = m.group(1), m.group(2).strip()
            if name in TOKENS and val != TOKENS[name]:
                errors.append(f"{rel}:{n}: {name} is {val}, the rule says {TOKENS[name]}")
        found = [m.group(1).strip() for m in CSS_RE.finditer(line)] + [m.group(2).strip() for m in JS_RE.finditer(line)]
        for val in found:
            if not ok(val) and (str(rel), val) not in {(e[0], e[2]) for e in EXCEPTIONS}:
                errors.append(f"{rel}:{n}: border-radius {val} (use var(--radius), var(--radius-pill) or 0)")

for e in errors:
    print("ERROR", e)
print(f"check-radius: {files} files, {len(errors)} errors")
sys.exit(1 if errors else 0)
