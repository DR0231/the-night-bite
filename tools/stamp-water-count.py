#!/usr/bin/env python3
"""Write the current water count from the registry into marked spots on the built pages.

    python3 tools/stamp-water-count.py          # rewrite
    python3 tools/stamp-water-count.py --check  # change nothing; exit 1 if a mark is stale or missing

Marks: any element with data-nb-water-count. Inside it, a whole-word number immediately before
" waters" (for example "covering 62 waters") is replaced with len(registry order). The number is
never invented: it comes from tools/registry.py, the same source check-meta uses.
whisperwood pages are never touched. index.html must carry at least one mark.
"""
import os, pathlib, re, sys

ROOT = pathlib.Path(os.environ.get("NB_ROOT") or pathlib.Path(__file__).resolve().parent.parent)
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import registry  # noqa: E402

COUNT = len(registry.load(ROOT)["order"])
MARK = re.compile(r'(data-nb-water-count)([^>]*>)(.*?)(</)', re.S)
NUM = re.compile(r'\b\d+(?= waters\b)', re.I)


def pages():
    for p in sorted(ROOT.rglob("*.html")):
        rel = p.relative_to(ROOT).as_posix()
        if rel.startswith(("whisperwood", "previews/", "review/", "tools/", ".git/")):
            continue
        yield rel, p


def stamped(html):
    def repl(m):
        body = NUM.sub(str(COUNT), m.group(3), count=1)
        return m.group(1) + m.group(2) + body + m.group(4)
    return MARK.sub(repl, html)


check = "--check" in sys.argv
errors, changed, found = [], [], 0
index_marks = 0
for rel, p in pages():
    s = p.read_text()
    marks = len(re.findall(r"data-nb-water-count", s))
    if not marks:
        continue
    found += marks
    if rel == "index.html":
        index_marks += marks
    new = stamped(s)
    if "data-nb-water-count" in s and not NUM.search(MARK.search(s).group(3) if MARK.search(s) else ""):
        errors.append(f"{rel}: data-nb-water-count has no 'N waters' number to stamp")
    if new != s:
        changed.append(rel)
        if not check:
            p.write_text(new)
    else:
        # already current, or the number was already right
        for m in MARK.finditer(s):
            nums = NUM.findall(m.group(3))
            if nums and nums[0] != str(COUNT):
                errors.append(f"{rel}: water count {nums[0]} does not match the registry ({COUNT})")

if index_marks < 1:
    errors.append(f"index.html: missing data-nb-water-count (registry is {COUNT} waters)")

if check:
    for r in changed:
        errors.append(f"{r}: stale water count (run python3 tools/stamp-water-count.py)")
    for e in errors:
        print("FAIL " + e)
    print(f"stamp-water-count: {found} mark(s), {COUNT} waters, {len(errors)} error(s)")
    sys.exit(1 if errors else 0)

for e in errors:
    print("FAIL " + e)
print(f"stamp-water-count: wrote {len(changed)} page(s), {found} mark(s), {COUNT} waters")
sys.exit(1 if errors else 0)
