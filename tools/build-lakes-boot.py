#!/usr/bin/env python3
"""Write the SHORTS table in js/lakes-boot.js from js/lakes.js, so a new water cannot be missing from the head boot.

    python3 tools/build-lakes-boot.py           # rewrite the data block if it drifted
    python3 tools/build-lakes-boot.py --check   # exit 1 if the block is out of step

The boot script itself (redirect, data-lake, hide rule) is hand-written in js/lakes-boot.js. This tool only
refreshes the short-name map between the nb:lakes-boot-data markers.
"""
import json, pathlib, re, sys

root = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import registry

MARK_START = "  /* nb:lakes-boot-data (tools/build-lakes-boot.py) */"
MARK_END = "  /* /nb:lakes-boot-data */"

def shorts_block(R):
    lines = [MARK_START, "  var SHORTS = {"]
    items = []
    for lid in R["order"]:
        items.append(f"    {json.dumps(lid)}: {json.dumps(R['lakes'][lid]['short'], ensure_ascii=False)}")
    lines.append(",\n".join(items))
    lines.append("  };")
    lines.append(MARK_END)
    return "\n".join(lines) + "\n"

def main(argv):
    R = registry.load(root)
    boot = root / "js" / "lakes-boot.js"
    if not boot.is_file():
        sys.exit("build-lakes-boot: js/lakes-boot.js is missing")
    old = boot.read_text()
    if MARK_START not in old or MARK_END not in old:
        sys.exit("build-lakes-boot: nb:lakes-boot-data markers missing from js/lakes-boot.js")
    new_block = shorts_block(R)
    new = re.sub(re.escape(MARK_START) + r".*?" + re.escape(MARK_END) + r"\n?", new_block, old, count=1, flags=re.S)
    check = "--check" in argv
    if new != old:
        if check:
            print("FAIL js/lakes-boot.js SHORTS is out of step with js/lakes.js")
            return 1
        boot.write_text(new)
        print(f"build-lakes-boot: wrote SHORTS for {len(R['order'])} waters")
        return 0
    print(f"build-lakes-boot: SHORTS already in step ({len(R['order'])} waters)")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
