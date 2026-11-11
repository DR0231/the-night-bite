#!/usr/bin/env python3
"""Check site.webmanifest: the install name, and that the water count matches js/lakes.js.

Run from the repo root:  python3 tools/check-manifest.py      (exit code 1 on any error)

  · name is "The Night Bite". On a preview tree (no CNAME) "The Night Bite (Preview)" is also allowed;
    on a live tree (CNAME present) the name must not contain "Preview". This is the same CNAME signal
    tools/promote.py uses. promote.py rewrites the preview name to the live name on the way to live.
  · description uses "waters" (not "lakes") for the whole group, and its count matches the registry:
    either "N Ohio waters" or "A, B and X more Ohio waters" where named waters + X equals the registry.
NB_ROOT=<dir> checks another copy of the site (tools/check-all.py uses it for the live checkout).
"""
import json, os, pathlib, re, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import registry  # noqa: E402

root = pathlib.Path(os.environ.get("NB_ROOT") or pathlib.Path(__file__).resolve().parent.parent)
errors, warnings = [], []
R = registry.load(root)
N = len(R["order"])
live = (root / "CNAME").exists()

labels = []
for i, L in R["lakes"].items():
    for key in ("name", "short"):
        v = (L.get(key) or "").strip()
        if v:
            labels.append((v, i))
labels.sort(key=lambda x: len(x[0]), reverse=True)

MORE = re.compile(r"\band (\d+) more Ohio (lakes|waters)\b", re.I)
TOTAL = re.compile(r"(?<!more )(\d+) Ohio (lakes|waters)\b", re.I)


def named_ids(text):
    found, used = set(), [False] * len(text)
    for phrase, i in labels:
        for m in re.finditer(r"(?<![A-Za-z])" + re.escape(phrase) + r"(?![A-Za-z])", text):
            if any(used[m.start():m.end()]):
                continue
            for j in range(m.start(), m.end()):
                used[j] = True
            found.add(i)
    return found


def count_phrases(text):
    """Yield (kind, number, noun, named_count) for each site-wide count phrase in text."""
    for m in MORE.finditer(text):
        yield ("more", int(m.group(1)), m.group(2).lower(), len(named_ids(text[:m.start()])))
    for m in TOTAL.finditer(text):
        yield ("total", int(m.group(1)), m.group(2).lower(), None)


path = root / "site.webmanifest"
if not path.exists():
    print("ERROR: site.webmanifest is missing")
    sys.exit(1)

try:
    man = json.loads(path.read_text(encoding="utf-8"))
except ValueError as e:
    print(f"ERROR: site.webmanifest is not valid JSON ({e})")
    sys.exit(1)

name = (man.get("name") or "").strip()
desc = (man.get("description") or "").strip()
if not name:
    errors.append("name is missing")
elif live:
    if "preview" in name.lower() or name != "The Night Bite":
        errors.append(f'live name should be "The Night Bite" (found {name!r})')
elif name not in ("The Night Bite", "The Night Bite (Preview)"):
    errors.append(f'preview name should be "The Night Bite" or "The Night Bite (Preview)" (found {name!r})')

if not desc:
    errors.append("description is missing")
else:
    hits = list(count_phrases(desc))
    if not hits:
        errors.append(f"description has no water count matching the registry ({N} waters)")
    for kind, num, noun, named in hits:
        if noun != "waters":
            errors.append(f'description uses "{noun}" for the whole group; use "waters"')
        if kind == "total" and num != N:
            errors.append(f"description count {num} does not match the registry ({N} waters)")
        elif kind == "more":
            if named < 1 or named + num != N:
                errors.append(f"description names {named} waters and {num} more, which is not the registry ({N})")

for w in warnings:
    print("warn:", w)
for e in errors:
    print("ERROR:", e)
mode = "live" if live else "preview"
print(f"check-manifest: {mode}, {N} waters, {len(errors)} errors, {len(warnings)} warnings")
sys.exit(1 if errors else 0)
