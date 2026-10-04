#!/usr/bin/env python3
"""Re-add Night Bite back links and the feedback link after syncing the Whisperwood game.
Run from the site repo root. Idempotent."""
import re
from pathlib import Path

FORM = "https://docs.google.com/forms/d/e/1FAIpQLSeL7vIXUSW5PActv19YB5Et4H61p-zzsZfIHhfAe3Of2R8ocw/viewform"
ww = Path("whisperwood")

for name in ["play.html", "index.html", "guide.html"]:
    p = ww / name
    if not p.exists():
        continue
    t = p.read_text(encoding="utf-8", errors="replace")
    if "../whisperwood.html" not in t:
        brand = '<a class="brand" href="index.html">Whisperwood Vale</a>'
        if name == "play.html" and brand in t:
            t = t.replace(brand, brand + '\n    <a class="nb-back" href="../whisperwood.html" style="color:#c4a35a;font:14px/1.4 system-ui,sans-serif;margin-left:0.75rem">← Night Bite</a>', 1)
        else:
            t = re.sub(r"(<body[^>]*>)", r'\1\n  <p style="margin:0.5rem 1rem;font:14px/1.4 system-ui,sans-serif"><a href="../whisperwood.html" style="color:#c4a35a">← The Night Bite</a> · Whisperwood Vale (not the real lake)</p>', t, count=1, flags=re.I)
    if name == "play.html" and "nb-feedback" not in t:
        t, n = re.subn(r'(\n(\s*)<a href="guide.html">Guide</a>\n)', r'\1\2<a class="nb-feedback" href="' + FORM + r'" target="_blank" rel="noopener">Feedback</a>\n', t, count=1)
        if n == 0:
            t = t.replace("</nav>", '  <a class="nb-feedback" href="' + FORM + '" target="_blank" rel="noopener">Feedback</a>\n    </nav>', 1)
    p.write_text(t, encoding="utf-8")
print("links ok")
