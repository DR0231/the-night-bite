#!/usr/bin/env python3
"""Wrap written dates ("Oct. 29, 2026", "June 4, 2026") in <time datetime="YYYY-MM-DD"> on built pages, so js/i18n.js
can write them with Intl in the picked language. English output is unchanged. Idempotent: text already inside <time>,
<head>, <script>, <style>, attributes and whisperwood.html is never touched.

    python3 tools/wrap-dates.py            # rewrite pages in place, print how many dates were wrapped
    python3 tools/wrap-dates.py --check    # write nothing; exit 1 if a page has an unwrapped date
"""
import pathlib, re, sys, os
ROOT = pathlib.Path(os.environ.get("NB_ROOT") or pathlib.Path(__file__).resolve().parent.parent)
MON = {"Jan.": 1, "Feb.": 2, "Mar.": 3, "Apr.": 4, "May": 5, "June": 6, "July": 7, "Aug.": 8, "Sept.": 9, "Oct.": 10, "Nov.": 11, "Dec.": 12,
       "January": 1, "February": 2, "March": 3, "April": 4, "August": 8, "September": 9, "October": 10, "November": 11, "December": 12}
DATE = re.compile(r"\b(" + "|".join(re.escape(k) for k in sorted(MON, key=len, reverse=True)) + r") (\d{1,2}), (\d{4})\b")
# split into tags and text; skip regions that must stay as they are
TOK = re.compile(r"(<head\b.*?</head>|<script\b.*?</script>|<style\b.*?</style>|<time\b.*?</time>|<title\b.*?</title>|<!--.*?-->|<[^>]+>)", re.S | re.I)

def wrap(html):
    out, n = [], 0
    for i, part in enumerate(TOK.split(html)):
        if i % 2 == 1 or not part:
            out.append(part); continue
        def rep(m):
            nonlocal n; n += 1
            return '<time datetime="%s-%02d-%02d">%s</time>' % (m.group(3), MON[m.group(1)], int(m.group(2)), m.group(0))
        out.append(DATE.sub(rep, part))
    return "".join(out), n

def pages():
    for p in sorted(ROOT.glob("*.html")) + sorted(ROOT.glob("*/index.html")) + sorted((ROOT / "species").glob("*.html")):
        if p.stem == "whisperwood" or p.parent.name in ("tools", "previews", "workers", "assets", "node_modules"): continue
        yield p

def main():
    check = "--check" in sys.argv; total = 0; bad = []
    for p in pages():
        s = p.read_text(encoding="utf-8"); t, n = wrap(s)
        if n:
            total += n; bad.append(p.relative_to(ROOT).as_posix())
            if not check: p.write_text(t, encoding="utf-8")
    if check:
        if bad: print("wrap-dates: unwrapped dates in", ", ".join(bad)); sys.exit(1)
        print("wrap-dates: ok")
    else:
        print("wrap-dates: wrapped %d dates in %d pages" % (total, len(bad)))

if __name__ == "__main__":
    main()
