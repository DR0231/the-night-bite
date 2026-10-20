#!/usr/bin/env python3
"""Re-add Night Bite back links and the feedback link after syncing the Whisperwood game.
Run from the site repo root. Idempotent."""
import re
from pathlib import Path

FORM = "https://docs.google.com/forms/d/e/1FAIpQLSeL7vIXUSW5PActv19YB5Et4H61p-zzsZfIHhfAe3Of2R8ocw/viewform"
ww = Path("whisperwood")

# Game-page CSP (Vale Security audit 2026-10-20, H2). The game runs only its own
# scripts (no inline JS), uses inline style attributes, canvas/data:/blob: images,
# a self-hosted font, Web Audio, and localStorage. Outbound links are not limited by CSP.
GAME_CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob: data:; "
            "manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-src 'none'; "
            "worker-src 'none'; upgrade-insecure-requests")
SEC_META = ('\n  <meta http-equiv="Content-Security-Policy" content="' + GAME_CSP + '" />'
            '\n  <meta name="referrer" content="strict-origin-when-cross-origin" />')

for name in ["play.html", "index.html", "guide.html"]:
    p = ww / name
    if not p.exists():
        continue
    t = p.read_text(encoding="utf-8", errors="replace")
    if 'http-equiv="Content-Security-Policy"' not in t:
        t, n = re.subn(r"(<meta\s+charset=[^>]*>)", lambda m: m.group(1) + SEC_META, t, count=1, flags=re.I)
        if n == 0:
            t = re.sub(r"(<head[^>]*>)", lambda m: m.group(1) + SEC_META, t, count=1, flags=re.I)
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
    if name == "play.html":
        slot = '<div id="nb-links" class="nb-links"></div>'
        if slot in t:
            t = t.replace(slot, '<div id="nb-links" class="nb-links"><a class="nb-back" href="../whisperwood.html">← Night Bite</a><a class="nb-feedback" href="' + FORM + '" target="_blank" rel="noopener">Feedback</a></div>', 1)
    if name == "play.html":
        # Privacy link right after each Feedback link (top nav + #nb-links slot). Idempotent.
        PRIV = '<a class="nb-privacy" href="../privacy.html">Privacy</a>'
        fb = re.compile(r'(\n([ \t]*))?(<a class="nb-feedback"[^>]*>Feedback</a>)(?!\s*<a class="nb-privacy")')
        t = fb.sub(lambda m: (m.group(1) or "") + m.group(3) + ((m.group(1) or "") + PRIV if m.group(1) else PRIV), t)
    p.write_text(t, encoding="utf-8")
print("links ok")
