"""The Night Bite: keep our own headless and test runs out of Cloudflare Web Analytics.

Use in every Playwright script that opens the site (preview or live):
    import sys; sys.path.insert(0, "/workspace/night-bite-preview/tools")
    import no_analytics as NA
    browser = p.chromium.launch(args=NA.args(["--no-sandbox"]))
    ctx = browser.new_context(...); NA.block(ctx)
Two layers: Chrome never resolves the analytics hosts, and any request that still gets out is aborted.
"""
import re

HOSTS = ["static.cloudflareinsights.com", "cloudflareinsights.com", "nightbite-visits.nightbiteoh.workers.dev"]
RULE = "--host-resolver-rules=" + ", ".join(f"MAP {h} ~NOTFOUND" for h in HOSTS)
PATTERN = re.compile(r"^https?://(([a-z0-9-]+\.)*cloudflareinsights\.com|nightbite-visits\.nightbiteoh\.workers\.dev)/", re.I)


def args(extra=None):
    return [a for a in (extra or []) if not a.startswith("--host-resolver-rules=")] + [RULE]


def block(target):
    """target: a BrowserContext or Page (sync or async API both work for route)."""
    return target.route(PATTERN, lambda route: route.abort("blockedbyclient"))
