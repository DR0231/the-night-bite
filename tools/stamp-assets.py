#!/usr/bin/env python3
"""Stamp font and image URLs with a content hash: assets/fonts/foo.woff2?v=<12 hex sha256>.

The hash changes only when the file changes, so a later long HTTP cache (a Cloudflare Cache Rule D'Angelo
can add) stays safe: a new file gets a new URL, and an unchanged file keeps the same one. CSS and JS already
use ?v=VERSION from stamp-version.py; this is the same idea for fonts and images, keyed by content instead of
the deploy.

    python3 tools/stamp-assets.py            # rewrite references (stamp-version.py, check-all and promote.py run this)
    python3 tools/stamp-assets.py --check    # change nothing; exit 1 if a static font/image URL is missing or stale

Scanned: html, css, js and site.webmanifest, plus tools/lake-home.html. Whisperwood, sw.js (precache paths are
cache keys, not fetch URLs), data/, and everything under tools/ except the lake home template are left alone.
looks up the file from the site root, the file's folder, or one folder up (lake pages use <base href="../">).
Dynamic concatenations (for example fish-<id>.svg in js/biting.js) are not complete URLs and are left as they are.
"""
import hashlib, os, pathlib, posixpath, re, sys

root = pathlib.Path(os.environ.get("NB_ROOT") or pathlib.Path(__file__).resolve().parent.parent)
EXTS = {".woff2", ".png", ".svg", ".ico", ".jpg", ".jpeg", ".webp"}
SKIP_DIR = ("whisperwood", "previews/", "review/", ".git/", "node_modules/", "data/")
SCAN_EXT = {".html", ".css", ".js", ".webmanifest"}
# a site font or image path, optional host / ../ prefix, optional existing ?v=
ASSET_RE = re.compile(
    r"(?:https?://(?:www\.)?nightbiteoh\.com/|https?://dr0231\.github\.io/night-bite-preview/)?"
    r"(?:(?:\.\./){0,4}|/night-bite-preview/|/)?"
    r"(?:assets/[\w./-]+\.(?:woff2|png|svg|ico|jpe?g|webp)|favicon\.(?:svg|ico)|apple-touch-icon\.png)"
    r"(?:\?v=[^'\"\)\s,>]*)?",
    re.I,
)


def skip_dir(rel):
    return rel.startswith(SKIP_DIR) or "/whisperwood/" in rel


def revs():
    out = {}
    for p in root.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in EXTS:
            continue
        rel = p.relative_to(root).as_posix()
        if skip_dir(rel):
            continue
        out[rel] = hashlib.sha256(p.read_bytes()).hexdigest()[:12]
    return out


def lookup(url, file_rel, table):
    raw = url.split("#")[0]
    raw = re.sub(r"\?v=[^&]*", "", raw)
    raw = raw.split("?")[0]
    for prefix in (
        "https://www.nightbiteoh.com/",
        "https://nightbiteoh.com/",
        "http://www.nightbiteoh.com/",
        "http://nightbiteoh.com/",
        "https://dr0231.github.io/night-bite-preview/",
        "http://dr0231.github.io/night-bite-preview/",
    ):
        if raw.startswith(prefix):
            raw = raw[len(prefix):]
            break
    raw = raw.lstrip("/")
    if raw.startswith("night-bite-preview/"):
        raw = raw[len("night-bite-preview/"):]
    cands = [posixpath.normpath(raw)]
    file_dir = posixpath.dirname(file_rel)
    if file_dir and file_dir != ".":
        cands.append(posixpath.normpath(posixpath.join(file_dir, raw)))
        cands.append(posixpath.normpath(posixpath.join(file_dir, "..", raw)))
    seen = set()
    for c in cands:
        if c in seen or c in (".", ".."):
            continue
        seen.add(c)
        if c in table:
            return c, table[c]
    return None, None


def should_scan(rel):
    if rel == "sw.js" or skip_dir(rel):
        return False
    if rel == "tools/lake-home.html":
        return True
    if rel.startswith("tools/"):
        return False
    return pathlib.Path(rel).suffix.lower() in SCAN_EXT


def scan_files():
    out = []
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(root).as_posix()
        if should_scan(rel):
            out.append((rel, p))
    return sorted(out)


def stamp_text(rel, text, table):
    problems, n = [], 0

    def repl(m):
        nonlocal n
        full = m.group(0)
        path, h = lookup(full, rel, table)
        if not h:
            # a path that looks local but has no file: report, leave the text alone
            problems.append(f"{rel}: no file for {full}")
            return full
        base = re.sub(r"\?v=[^'\"\)\s,>]*$", "", full)
        want = base + "?v=" + h
        if full != want:
            n += 1
        return want

    new = ASSET_RE.sub(repl, text)
    return new, n, problems


def main():
    check = "--check" in sys.argv[1:]
    table = revs()
    changed_files, stamps, problems = 0, 0, []
    for rel, p in scan_files():
        try:
            text = p.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        new, n, probs = stamp_text(rel, text, table)
        problems.extend(probs)
        stamps += n
        if new != text:
            changed_files += 1
            if not check:
                p.write_text(new, encoding="utf-8")
    # --check also fails when a reference still has the wrong or missing hash
    if check:
        # re-scan the current text (we didn't write) for missing/stale stamps
        stale = 0
        for rel, p in scan_files():
            try:
                text = p.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            for m in ASSET_RE.finditer(text):
                full = m.group(0)
                path, h = lookup(full, rel, table)
                if not h:
                    continue
                if not full.endswith("?v=" + h):
                    problems.append(f"{rel}: {full} should end with ?v={h}")
                    stale += 1
        if problems or stale:
            print("FAIL stamp-assets: " + "; ".join(problems[:20]) + (f" ({len(problems)} total)" if len(problems) > 20 else ""))
            sys.exit(1)
        print(f"PASS stamp-assets: {len(table)} font/image files, every static reference carries its content hash")
        return
    if problems:
        print("WARN stamp-assets: " + "; ".join(problems[:10]) + (f" ({len(problems)} total)" if len(problems) > 10 else ""))
    print(f"stamp-assets: {'updated' if changed_files else 'unchanged'}, {stamps} URL(s) on {changed_files} file(s), {len(table)} hashed files")


if __name__ == "__main__":
    main()
