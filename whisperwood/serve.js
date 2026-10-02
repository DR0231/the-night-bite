/* Local static server: node serve.js */
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const port = Number(process.env.PORT) || 8765;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function handler(req, res) {
  let u = decodeURIComponent((req.url || "/").split("?")[0]);
  if (u === "/") u = "/play.html";
  const rel = u.replace(/^[/\\]+/, "").split("/").join(path.sep);
  const p = path.normalize(path.join(root, rel));
  if (!p.toLowerCase().startsWith(root.toLowerCase()) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    res.writeHead(404);
    res.end("no");
    return;
  }
  const ext = path.extname(p).toLowerCase();
  res.writeHead(200, {
    "Content-Type": types[ext] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(p).pipe(res);
}

function listen(host, label) {
  const s = http.createServer(handler);
  s.on("error", (e) => console.log(label + " fail " + (e.code || e.message)));
  s.listen(port, host, () => console.log("listening " + label));
}

listen("0.0.0.0", "http://127.0.0.1:" + port + "/play.html");
listen("::", "http://[::1]:" + port + "/play.html");
