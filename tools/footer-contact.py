#!/usr/bin/env python3
"""Footer contact link: a mailto for questions and corrections on every page.

    python3 tools/footer-contact.py            # insert the link after Privacy in every footer (idempotent)
    python3 tools/footer-contact.py --check    # change nothing; exit 1 if a footer is missing the link or out of step

The address is the one already used on /privacy (contact@nightbiteoh.com). The subject is a fixed
"Correction" prefill, with no page name or other reader data. whisperwood pages are never touched.
The link also goes into tools/lake-home.html, so every lake home and every new water gets it from the build.
"""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP_PREFIX = ("whisperwood", "previews/", "review/", ".git/")
FOOTER = re.compile(r'(<footer class="site-footer">.*?</footer>)', re.S)
PRIVACY = re.compile(
    r'(<a href="(?:\.\./|/night-bite-preview/)?privacy">Privacy</a>)(\n[ \t]*)'
    r'(?:<a href="mailto:contact@nightbiteoh.com\?subject=Correction">Contact / send a correction</a>\n[ \t]*)?'
    r'(<button type="button" class="a11y-open")'
)
CONTACT = 'Contact / send a correction'
LINK = '<a href="mailto:contact@nightbiteoh.com?subject=Correction">' + CONTACT + '</a>'


def pages():
    out = []
    for p in sorted(ROOT.rglob("*.html")):
        rel = p.relative_to(ROOT).as_posix()
        if rel.startswith(SKIP_PREFIX):
            continue
        out.append(p)
    if (ROOT / "tools" / "lake-home.html") not in out:
        out.append(ROOT / "tools" / "lake-home.html")
    return out


def apply(s):
    footers = list(FOOTER.finditer(s))
    if not footers:
        return s, False
    changed = False
    out = []
    last = 0
    for m in footers:
        out.append(s[last:m.start()])
        block = m.group(0)
        new, n = PRIVACY.subn(r"\1\2" + LINK + r"\2\3", block, count=1)
        if n:
            if new != block:
                changed = True
            out.append(new)
        else:
            out.append(block)
        last = m.end()
    out.append(s[last:])
    return "".join(out), bool(footers)


def main():
    check = "--check" in sys.argv
    bad, wrote, n, no_footer, no_slot = [], 0, 0, [], []
    for p in pages():
        s = p.read_text()
        if "site-footer" not in s:
            continue  # redirect stubs like docks.html, tournaments.html
        new, has = apply(s)
        rel = str(p.relative_to(ROOT))
        if not has:
            no_footer.append(rel)
            continue
        if LINK not in new:
            no_slot.append(rel)
            continue
        n += 1
        if new != s:
            if check:
                bad.append(rel)
            else:
                p.write_text(new)
                wrote += 1
    if no_footer:
        print("footer-contact: no footer block match: " + ", ".join(no_footer))
    if no_slot:
        print("footer-contact: Privacy/Display slot missing: " + ", ".join(no_slot))
    if check:
        extra = ("; also " + ", ".join(no_slot) if no_slot else "")
        print("footer-contact --check: " + ("out of step: " + ", ".join(bad) if bad else f"{n} pages in step") + extra)
        return 1 if bad or no_slot else 0
    print(f"footer-contact: {n} pages, wrote {wrote}")
    return 1 if no_slot else 0


if __name__ == "__main__":
    sys.exit(main())
