#!/usr/bin/env python3
"""Serve a copy of the site the way GitHub Pages does, for local checks (tools/check-all.py --target local).

    python3 tools/serve.py [--root DIR] [--port 8642] [--prefix /night-bite-preview/]

Clean URLs like Pages: /water -> water.html, /alum/ -> alum/index.html, anything missing -> 404.html with status 404.
The default prefix matches the preview (https://dr0231.github.io/night-bite-preview/), so absolute /night-bite-preview/
paths and the service worker scope behave the same. Read-only: it never writes a file.
"""
import argparse, functools, http.server, os, pathlib, posixpath, urllib.parse

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--root", default=str(pathlib.Path(__file__).resolve().parent.parent))
ap.add_argument("--port", type=int, default=8642)
ap.add_argument("--prefix", default="/night-bite-preview/")
a = ap.parse_args()
ROOT = pathlib.Path(a.root).resolve()
PREFIX = "/" + a.prefix.strip("/") + "/" if a.prefix.strip("/") else "/"


class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *x):
        pass

    def find(self):
        path = urllib.parse.urlsplit(self.path).path
        if not path.startswith(PREFIX):
            return None
        rel = posixpath.normpath(urllib.parse.unquote(path[len(PREFIX):])).lstrip("/")
        if rel in (".", ""):
            rel = ""
        if rel.startswith("..") or "/.git" in "/" + rel:
            return None
        p = ROOT / rel
        if p.is_dir() and not path.endswith("/"):
            return None   # send_head redirects to the slash form, like Pages
        for c in ([p / "index.html"] if path.endswith("/") else [p, p.with_name(p.name + ".html"), p / "index.html"]):
            if c.is_file():
                return c
        return None

    def send_head(self):
        f = self.find()
        status = 200
        if f is None:
            path = urllib.parse.urlsplit(self.path).path
            if (ROOT / path[len(PREFIX):].strip("/")).is_dir() and not path.endswith("/") and path.startswith(PREFIX):
                self.send_response(301); self.send_header("Location", path + "/"); self.end_headers(); return None
            f, status = ROOT / "404.html", 404
        ctype = self.guess_type(str(f))
        body = open(f, "rb")
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(os.fstat(body.fileno()).st_size))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        return body


if __name__ == "__main__":
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", a.port), H)
    print(f"serving {ROOT} at http://127.0.0.1:{a.port}{PREFIX}", flush=True)
    srv.serve_forever()
