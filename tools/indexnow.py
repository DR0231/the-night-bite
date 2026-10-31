#!/usr/bin/env python3
"""Tell IndexNow search engines (Bing, Yandex, Seznam, Naver and others; not Google) which nightbiteoh.com pages changed.

Run ONLY after a live push to DR0231/the-night-bite, once the new pages are live on https://nightbiteoh.com.
Never point it at the preview; the preview is noindex.

    python3 tools/indexnow.py                         # dry run: list every URL in sitemap.xml, send nothing
    python3 tools/indexnow.py --send                  # ping api.indexnow.org with every URL in sitemap.xml
    python3 tools/indexnow.py --since HEAD~1 --send   # only pages whose files changed since that git ref
    python3 tools/indexnow.py --send https://nightbiteoh.com/dillon/ https://nightbiteoh.com/water

Key: the one *.txt file at the site root named after its own 32 hex character contents (the IndexNow key file).
It is a public ownership check, not a secret: IndexNow fetches https://nightbiteoh.com/<key>.txt and compares.
Keep the file in both repos. To rotate, delete it, write a new random key the same way and push before the next ping.
Exit codes: 0 ok (200 or 202), 1 on a refusal or a network error, 2 on bad input.
"""
import argparse, json, pathlib, re, subprocess, sys, urllib.error, urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
HOST = "nightbiteoh.com"
SITE = f"https://{HOST}/"
ENDPOINT = "https://api.indexnow.org/indexnow"


def find_key():
    keys = [p for p in root.glob("*.txt") if re.fullmatch(r"[0-9a-f]{32}", p.stem) and p.read_text().strip() == p.stem]
    if len(keys) != 1:
        sys.exit(f"indexnow: expected exactly one <key>.txt at the site root, found {len(keys)}")
    return keys[0].stem


def sitemap_urls():
    return re.findall(r"<loc>([^<]+)</loc>", (root / "sitemap.xml").read_text())


def url_for(path):
    """Repo file path to its clean live URL (same rules as the canonicals); None if it is not a page."""
    if not path.endswith(".html") or path.startswith(("whisperwood", "previews/", "tools/")) or path in ("404.html", "offline.html"):
        return None
    if path == "index.html":
        return SITE
    if path.endswith("/index.html"):
        return SITE + path[: -len("index.html")]
    return SITE + path[: -len(".html")]


def changed_urls(ref):
    out = subprocess.run(["git", "-C", str(root), "diff", "--name-only", ref, "--"], capture_output=True, text=True, check=True).stdout
    listed = set(sitemap_urls())
    urls = [u for u in (url_for(p) for p in out.split()) if u]
    return [u for u in dict.fromkeys(urls) if u in listed]   # only pages the sitemap lists (no redirect stubs)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("urls", nargs="*", help="URLs to send (default: every URL in sitemap.xml)")
    ap.add_argument("--since", metavar="REF", help="only pages changed since this git ref")
    ap.add_argument("--send", action="store_true", help="really send (default is a dry run)")
    a = ap.parse_args()

    key = find_key()
    urls = a.urls or (changed_urls(a.since) if a.since else sitemap_urls())
    bad = [u for u in urls if not u.startswith(SITE)]
    if bad:
        print("indexnow: every URL must be on " + SITE + ": " + ", ".join(bad), file=sys.stderr)
        return 2
    if not urls:
        print("indexnow: nothing to send")
        return 0
    body = {"host": HOST, "key": key, "keyLocation": f"{SITE}{key}.txt", "urlList": urls[:10000]}
    if not a.send:
        print(f"dry run: would send {len(urls)} URL(s) to {ENDPOINT} with key file {body['keyLocation']}")
        for u in urls:
            print("  " + u)
        print("add --send to ping (only after a live push)")
        return 0
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": "nightbite-indexnow/1"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"IndexNow {r.status}: sent {len(urls)} URL(s)")
            return 0 if r.status in (200, 202) else 1
    except urllib.error.HTTPError as e:
        hint = {400: "bad request", 403: "key not valid (is the key file live?)", 422: "URLs do not match the host or key",
                429: "too many requests, try later"}.get(e.code, "")
        print(f"IndexNow {e.code} {hint}".rstrip(), file=sys.stderr)
        return 1
    except urllib.error.URLError as e:
        print(f"IndexNow network error: {e.reason}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
