#!/usr/bin/env python3
"""Fail on internal .html links, canonicals, og:url and hreflang when a clean URL exists.

Run from the repo root:  python3 tools/check-clean-urls.py      (exit code 1 on any error)

Public pages should use /water, /hoover/, /species/trout, not water.html or
hoover/index.html. Search engines already see a self-referencing canonical on
the clean URL. This check keeps links, sitemap locs, canonicals, og:url and
hreflang from slipping back to the .html form.

A .html path is allowed only when that is the official public URL (today,
/whisperwood.html) or when no clean twin exists. whisperwood.html and
everything under whisperwood/ are skipped (the game; left alone). External
http(s) links are ignored unless they point at nightbiteoh.com or the
preview host. 404.html is not expected to load js/clean-url.js.

Also fails if a public page that loads js/a11y-boot.js is missing
js/clean-url.js immediately before it, so the address-bar cleanup cannot
quietly disappear.
"""
import os, pathlib, posixpath, re, sys
from urllib.parse import urlparse

ROOT = pathlib.Path(os.environ.get("NB_ROOT") or pathlib.Path(__file__).resolve().parent.parent)
SITE_HOSTS = {"nightbiteoh.com", "www.nightbiteoh.com", "dr0231.github.io"}
SKIP_PREFIX = ("whisperwood", "previews/", "review/", "tools/", ".git/")
SKIP_FILES = {"whisperwood.html"}
# Official public URLs that keep the .html form (canonical and sitemap use these).
ALLOW_HTML = {"whisperwood.html"}

CANON = re.compile(r'<link\b[^>]*rel=["\']canonical["\'][^>]*>', re.I)
OGURL = re.compile(r'<meta\b[^>]*property=["\']og:url["\'][^>]*>', re.I)
HREFLANG = re.compile(r'<link\b[^>]*hreflang=', re.I)
TAG = re.compile(r'<link\b[^>]*>|<meta\b[^>]*>|<a\b[^>]*>|<area\b[^>]*>|<form\b[^>]*>', re.I)
ATTR = re.compile(r'([a-zA-Z_:][-a-zA-Z0-9:._]*)\s*=\s*("([^"]*)"|\'([^\']*)\')')
HREF_ATTRS = {"href", "action"}
SCRIPT_BOOT = re.compile(
    r'<script src="((?:\.\./|/night-bite-preview/|/)?)js/a11y-boot\.js[^"]*"></script>'
)
SCRIPT_CLEAN = re.compile(
    r'<script src="((?:\.\./|/night-bite-preview/|/)?)js/clean-url\.js[^"]*"></script>'
)
JSONLD_URL = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)


def attrs(tag):
    out = {}
    for m in ATTR.finditer(tag):
        val = m.group(3) if m.group(3) is not None else m.group(4)
        out[m.group(1).lower()] = val
    return out


def public_pages():
    pages = []
    for p in sorted(ROOT.rglob("*.html")):
        rel = p.relative_to(ROOT).as_posix()
        if rel.startswith(SKIP_PREFIX) or rel in SKIP_FILES:
            continue
        pages.append(p)
    return pages


def is_internal(url):
    if not url or url.startswith(("#", "mailto:", "tel:", "data:", "javascript:")):
        return False
    if url.startswith("//"):
        return urlparse("https:" + url).hostname in SITE_HOSTS
    parsed = urlparse(url)
    if parsed.scheme in ("http", "https"):
        return parsed.hostname in SITE_HOSTS
    return True  # relative or root-relative


def path_of(url, page_rel):
    """Site-relative path (no leading slash), or None if not a site path we can judge."""
    parsed = urlparse(url)
    path = parsed.path
    if parsed.scheme in ("http", "https") or url.startswith("//"):
        host = parsed.hostname
        if host == "dr0231.github.io":
            if path.startswith("/night-bite-preview/"):
                path = path[len("/night-bite-preview/"):]
            elif path == "/night-bite-preview":
                path = ""
            else:
                return None
        else:
            path = path.lstrip("/")
    elif path.startswith("/"):
        path = path[1:]
        if path.startswith("night-bite-preview/"):
            path = path[len("night-bite-preview/"):]
        elif path == "night-bite-preview":
            path = ""
    else:
        # relative to the current page's directory
        base = page_rel.rsplit("/", 1)[0] + "/" if "/" in page_rel else ""
        path = posixpath.normpath(base + path)
    path = posixpath.normpath(path.lstrip("/"))
    if path.startswith("..") or path == "..":
        return None
    if path in (".", ""):
        return ""
    return path


def clean_form(path):
    """Return the public clean URL path, or the same path if .html is official or has no twin."""
    if not path or ".html" not in path.split("#")[0].split("?")[0]:
        return path
    bare = path.split("#")[0].split("?")[0]
    if bare in ALLOW_HTML:
        return path
    if bare.endswith("/index.html"):
        return bare[: -len("index.html")] + (path[len(bare):] if len(path) > len(bare) else "")
    if bare == "index.html":
        return "" + (path[len(bare):] if len(path) > len(bare) else "")
    if bare.endswith(".html"):
        # A clean twin exists when the .html file itself exists in the repo
        # (GitHub Pages already serves the extensionless URL for that file).
        if (ROOT / bare).is_file():
            return bare[: -len(".html")] + (path[len(bare):] if len(path) > len(bare) else "")
    return path


def flag(path):
    cleaned = clean_form(path)
    return cleaned if cleaned != path else None


errors = []


def add(rel, where, url, suggest):
    errors.append(f"{rel}: {where} uses {url} (use {suggest})")


# --- HTML pages ---
for p in public_pages():
    rel = p.relative_to(ROOT).as_posix()
    src = p.read_text()
    # canonical
    canons = CANON.findall(src)
    for tag in canons:
        url = attrs(tag).get("href", "")
        path = path_of(url, rel) if is_internal(url) else None
        if path is None:
            continue
        sug = flag(path)
        if sug is not None:
            add(rel, "canonical", url, "/" + sug if sug else "/")
    # og:url
    for tag in OGURL.findall(src):
        url = attrs(tag).get("content", "")
        path = path_of(url, rel) if is_internal(url) else None
        if path is None:
            continue
        sug = flag(path)
        if sug is not None:
            add(rel, "og:url", url, "/" + sug if sug else "/")
    # hreflang / alternate
    for tag in TAG.findall(src):
        at = attrs(tag)
        if "hreflang" in at:
            url = at.get("href", "")
            path = path_of(url, rel) if is_internal(url) else None
            if path is None:
                continue
            sug = flag(path)
            if sug is not None:
                add(rel, "hreflang", url, "/" + sug if sug else "/")
        name = tag.lstrip("<").split()[0].lower()
        if name == "meta":
            continue
        # skip stylesheets, icons, manifests, preloads: only page links
        rel_attr = (at.get("rel") or "").lower()
        if name == "link" and rel_attr and rel_attr.split()[0] in {
            "stylesheet", "icon", "apple-touch-icon", "manifest", "preload", "preconnect", "prefetch", "canonical"
        }:
            continue
        url = at.get("href") or at.get("action") or ""
        if not is_internal(url):
            continue
        path = path_of(url, rel)
        if path is None:
            continue
        sug = flag(path)
        if sug is not None:
            add(rel, "href" if "href" in at else "action", url, "/" + sug if sug else "/")
    # JSON-LD url fields
    import json
    for i, block in enumerate(JSONLD_URL.findall(src), 1):
        try:
            data = json.loads(block)
        except ValueError:
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            item = stack.pop()
            if isinstance(item, dict):
                url = item.get("url")
                if isinstance(url, str) and is_internal(url):
                    path = path_of(url, rel)
                    if path is not None:
                        sug = flag(path)
                        if sug is not None:
                            add(rel, f"JSON-LD url (block {i})", url, "/" + sug if sug else "/")
                stack.extend(item.values())
            elif isinstance(item, list):
                stack.extend(item)
    # clean-url.js must precede a11y-boot.js on pages that have the boot hook
    if rel in ("404.html",):
        if SCRIPT_CLEAN.search(src):
            errors.append(f"{rel}: should not load js/clean-url.js (404 body is also served for missing .html paths)")
        continue
    boot = SCRIPT_BOOT.search(src)
    if not boot:
        continue
    # Find the two script tags near each other
    if "js/clean-url.js" not in src:
        errors.append(f"{rel}: missing js/clean-url.js (run python3 tools/clean-url-script.py)")
        continue
    # Must appear immediately before a11y-boot
    pair = re.search(
        r'<script src="((?:\.\./|/night-bite-preview/|/)?)js/clean-url\.js[^"]*"></script>\s*'
        r'<script src="((?:\.\./|/night-bite-preview/|/)?)js/a11y-boot\.js[^"]*"></script>',
        src,
    )
    if not pair:
        errors.append(f"{rel}: js/clean-url.js must sit immediately before js/a11y-boot.js")
    elif pair.group(1) != pair.group(2):
        errors.append(f"{rel}: js/clean-url.js path prefix {pair.group(1)!r} does not match a11y-boot {pair.group(2)!r}")

# --- sitemap ---
sm = ROOT / "sitemap.xml"
if sm.is_file():
    for i, loc in enumerate(re.findall(r"<loc>([^<]+)</loc>", sm.read_text()), 1):
        if not is_internal(loc):
            continue
        path = path_of(loc, "sitemap.xml")
        if path is None:
            continue
        sug = flag(path)
        if sug is not None:
            add("sitemap.xml", f"loc {i}", loc, "https://nightbiteoh.com/" + sug)

# --- manifest start_url ---
for name in ("site.webmanifest",):
    f = ROOT / name
    if not f.is_file():
        continue
    text = f.read_text()
    m = re.search(r'"start_url"\s*:\s*"([^"]+)"', text)
    if m and is_internal(m.group(1)):
        path = path_of(m.group(1), name)
        if path is not None:
            sug = flag(path)
            if sug is not None:
                add(name, "start_url", m.group(1), "./" if sug == "" else sug)

for e in errors:
    print("ERROR:", e)
print(f"check-clean-urls: {len(public_pages())} pages, {len(errors)} errors")
sys.exit(1 if errors else 0)
