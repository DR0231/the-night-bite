#!/usr/bin/env python3
"""Footer follow row: the About page's Facebook, Instagram and X pills in the footer of every page (review V1).

    python3 tools/footer-social.py            # write the row into every page's footer (idempotent)
    python3 tools/footer-social.py --check    # change nothing; exit 1 if a page's row is missing or out of step

Links only, to the site's own profiles (the same three as the About page and the Organization sameAs). The row goes
right after the footer's "Add to home screen" line, between <!-- nb:footer-social --> markers, on every page with
that line: root pages, species pages, and tools/lake-home.html (so every lake home and every new water gets it from
the build). Never whisperwood.html, never offline.html (no signal, nothing to open). Text and labels match About, so
the translations already in data/i18n/tm apply; colors are tokens, so red light and high contrast follow.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP = {"whisperwood.html", "offline.html"}
ICON = {
    "Facebook": 'M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.4V14h2.8v8z',
    "Instagram": 'M12 7.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2zM17 5.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 3.6c2.7 0 3 0 4.1.1 2.7.1 4 1.4 4.1 4.1.1 1.1.1 1.4.1 4.1s0 3-.1 4.1c-.1 2.7-1.4 4-4.1 4.1-1.1.1-1.4.1-4.1.1s-3 0-4.1-.1c-2.7-.1-4-1.4-4.1-4.1C3.7 15 3.6 14.7 3.6 12s0-3 .1-4.1c.1-2.7 1.4-4 4.1-4.1 1.1-.1 1.4-.1 4.2-.1zM12 2c-2.7 0-3.1 0-4.1.1C4.2 2.2 2.2 4.2 2.1 7.9 2 8.9 2 9.3 2 12s0 3.1.1 4.1c.1 3.7 2.1 5.7 5.8 5.8 1 .1 1.4.1 4.1.1s3.1 0 4.1-.1c3.7-.1 5.7-2.1 5.8-5.8.1-1 .1-1.4.1-4.1s0-3.1-.1-4.1c-.1-3.7-2.1-5.7-5.8-5.8C15.1 2 14.7 2 12 2z',
    "X": 'M17.8 3h3.1l-6.8 7.7 8 10.3h-6.2l-4.9-6.3-5.6 6.3H2.3l7.2-8.2L1.9 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z',
}
LINKS = [("Facebook", "https://www.facebook.com/profile.php?id=61596457070134"),
         ("Instagram", "https://www.instagram.com/nightbiteohio/"),
         ("X", "https://x.com/NightBiteOH")]


def block(indent):
    pills = "".join(
        f'\n{indent}  <a class="social-pill" href="{u}" target="_blank" rel="noopener me" aria-label="The Night Bite on {n} (opens in a new tab)">'
        f'<svg class="social-ico" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="{ICON[n]}"/></svg><span>{n}</span></a>'
        for n, u in LINKS)
    return (f'{indent}<!-- nb:footer-social (tools/footer-social.py) -->\n'
            f'{indent}<p class="footer-social"><span class="social-label">Follow along</span>{pills}\n{indent}</p>\n'
            f'{indent}<!-- /nb:footer-social -->\n')


OLD = re.compile(r"[ \t]*<!-- nb:footer-social.*?<!-- /nb:footer-social -->\n", re.S)
APP = re.compile(r'^([ \t]*)<p class="footer-app">.*?</p>\n', re.M)


def pages():
    out = [p for p in sorted(ROOT.glob("*.html")) if p.name not in SKIP]
    out += sorted((ROOT / "species").glob("*.html"))
    out.append(ROOT / "tools" / "lake-home.html")
    out += [ROOT / d.name / "index.html" for d in sorted(ROOT.iterdir()) if d.is_dir() and (d / "index.html").exists()
            and d.name not in ("species", "tools", "previews", "review", "workers", "assets", "node_modules") and not d.name.startswith("whisperwood")]
    return out


def apply(s):
    s = OLD.sub("", s)
    m = APP.search(s)
    if not m:
        return s, False
    return s[:m.end()] + block(m.group(1)) + s[m.end():], True


def main():
    check = "--check" in sys.argv
    bad, wrote, n = [], 0, 0
    for p in pages():
        s = p.read_text()
        new, has = apply(s)
        if not has:
            continue   # no footer app line (redirect stubs like docks.html, tournaments.html)
        n += 1
        if new != s:
            if check:
                bad.append(str(p.relative_to(ROOT)))
            else:
                p.write_text(new); wrote += 1
    if check:
        print("footer-social --check: " + ("out of step: " + ", ".join(bad) if bad else f"{n} pages in step"))
        return 1 if bad else 0
    print(f"footer-social: {n} pages, wrote {wrote}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
