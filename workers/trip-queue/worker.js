/**
 * The Night Bite trip queue (nb-trip-queue on workers.dev).
 * POST /submit takes one Share a trip form, checks it and stores it in KV as pending. Nothing is published here:
 * D'Angelo approves or rejects each one (tools/trip-queue.py), and approved trips go into data/community-log.json by hand.
 * Admin: GET /admin/list?status=pending|approved, POST /admin/approve {id}, POST /admin/reject {id} (deletes),
 * all with "Authorization: Bearer <ADMIN_TOKEN>" (a Worker secret, never in this repo).
 * Bindings: TRIPS (KV), ADMIN_TOKEN (secret).
 * No raw IP is stored: the rate limit key is a salted SHA-256 of the IP and the hour, and it expires.
 */
const ORIGINS = ["https://nightbiteoh.com", "https://dr0231.github.io"];
const MAX_BODY = 4096;
const RATE_PER_HOUR = 5;
const MAX_PENDING = 300;
const SPECIES = ["Channel catfish", "Blue catfish", "Flathead catfish", "Largemouth bass", "Smallmouth bass",
  "Black crappie", "White crappie", "Bluegill / sunfish", "White bass", "Hybrid striped bass", "Saugeye",
  "Walleye", "Common carp", "Longnose gar", "Other"];
const TIMES = ["Day", "Night", "Dawn / dusk", "Mixed"];
const KEEP = ["Released", "Kept (1)", "Kept (2)", "Kept (other)", "No fish"];
const LIMITS = { ramp: 80, bait: 120, notes: 500 };
const FIELDS = ["lake", "date", "species", "ramp", "time_window", "bait", "keep_release", "notes", "website", "check"];

function cors(origin) {
  const h = { "Vary": "Origin", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" };
  if (ORIGINS.includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}

function json(status, body, headers) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers }
  });
}

function clean(s, max) {
  if (typeof s !== "string") return null;
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s+$/g, "").replace(/^\s+/g, "");
  return s.length <= max ? s : null;
}

function validate(b) {
  if (!b || typeof b !== "object" || Array.isArray(b)) return "bad body";
  for (const k of Object.keys(b)) if (!FIELDS.includes(k)) return "unknown field " + k.slice(0, 20);
  const t = {};
  t.lake = clean(b.lake, 24);
  if (!t.lake || !/^[a-z]{2,24}$/.test(t.lake)) return "lake";
  t.date = clean(b.date, 10);
  if (!t.date || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return "date";
  const d = Date.parse(t.date + "T12:00:00Z");
  if (isNaN(d) || d > Date.now() + 2 * 86400000 || d < Date.parse("2020-01-01")) return "date";
  t.species = clean(b.species, 40);
  if (!SPECIES.includes(t.species)) return "species";
  t.time_window = clean(b.time_window, 20);
  if (!TIMES.includes(t.time_window)) return "time_window";
  t.keep_release = clean(b.keep_release, 20);
  if (!KEEP.includes(t.keep_release)) return "keep_release";
  for (const k of ["ramp", "bait", "notes"]) {
    const v = clean(b[k] == null ? "" : b[k], LIMITS[k]);
    if (v === null) return k;
    t[k] = v;
  }
  if (!t.ramp) return "ramp";
  if (!t.bait) return "bait";
  if (/https?:\/\/|www\./i.test(t.ramp + " " + t.bait + " " + t.notes)) return "links are not allowed";
  if (b.check === true) t.check = true;
  return t;
}

async function sha(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, "0")).join("");
}

async function tokenOk(req, env) {
  const got = (req.headers.get("Authorization") || "").replace(/^Bearer /, "");
  if (!env.ADMIN_TOKEN || !got) return false;
  // compare digests so length and content leak nothing through timing
  const [a, b] = await Promise.all([sha(got), sha(env.ADMIN_TOKEN)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function listAll(env, prefix) {
  const out = [];
  let cursor;
  do {
    const r = await env.TRIPS.list({ prefix, cursor });
    for (const k of r.keys) out.push(k.name);
    cursor = r.list_complete ? null : r.cursor;
  } while (cursor);
  return out;
}

async function submit(req, env, origin) {
  const h = cors(origin);
  if (!ORIGINS.includes(origin)) return json(403, { ok: false, error: "origin" }, h);
  if (!(req.headers.get("Content-Type") || "").startsWith("application/json")) return json(415, { ok: false, error: "type" }, h);
  const len = Number(req.headers.get("Content-Length") || 0);
  if (len > MAX_BODY) return json(413, { ok: false, error: "too big" }, h);
  const text = await req.text();
  if (text.length > MAX_BODY) return json(413, { ok: false, error: "too big" }, h);
  let body;
  try { body = JSON.parse(text); } catch (e) { return json(400, { ok: false, error: "json" }, h); }
  // honeypot: a hidden "website" field people never fill; answer ok so bots learn nothing
  if (body && typeof body.website === "string" && body.website.trim() !== "") return json(200, { ok: true, status: "pending" }, h);
  const t = validate(body);
  if (typeof t === "string") return json(400, { ok: false, error: t }, h);

  const ip = req.headers.get("CF-Connecting-IP") || "unknown";
  const hour = new Date().toISOString().slice(0, 13);
  const rlKey = "rl:" + (await sha(ip + "|" + hour + "|" + (env.ADMIN_TOKEN || ""))).slice(0, 32);
  const n = Number((await env.TRIPS.get(rlKey)) || 0);
  if (n >= RATE_PER_HOUR) return json(429, { ok: false, error: "rate" }, { ...h, "Retry-After": "3600" });
  await env.TRIPS.put(rlKey, String(n + 1), { expirationTtl: 3600 });

  const pending = await env.TRIPS.list({ prefix: "pending:", limit: MAX_PENDING });
  if (pending.keys.length >= MAX_PENDING) return json(503, { ok: false, error: "queue full" }, h);

  const id = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + crypto.randomUUID().slice(0, 8);
  const entry = { id, status: "pending", received: new Date().toISOString(), from: origin, ...t };
  await env.TRIPS.put("pending:" + id, JSON.stringify(entry));
  return json(200, { ok: true, status: "pending", id }, h);
}

async function admin(req, env, path) {
  const h = { "Cache-Control": "no-store" };
  if (!(await tokenOk(req, env))) return json(401, { ok: false, error: "auth" }, h);
  if (req.method === "GET" && path === "/admin/list") {
    const status = new URL(req.url).searchParams.get("status") || "pending";
    if (!["pending", "approved"].includes(status)) return json(400, { ok: false, error: "status" }, h);
    const keys = await listAll(env, status + ":");
    const entries = [];
    for (const k of keys) {
      const v = await env.TRIPS.get(k);
      if (v) entries.push(JSON.parse(v));
    }
    return json(200, { ok: true, status, count: entries.length, entries }, h);
  }
  if (req.method === "POST" && (path === "/admin/approve" || path === "/admin/reject")) {
    let b;
    try { b = await req.json(); } catch (e) { return json(400, { ok: false, error: "json" }, h); }
    const id = b && typeof b.id === "string" && /^[0-9]{14}-[0-9a-f]{8}$/.test(b.id) ? b.id : null;
    if (!id) return json(400, { ok: false, error: "id" }, h);
    const v = await env.TRIPS.get("pending:" + id) || await env.TRIPS.get("approved:" + id);
    if (!v) return json(404, { ok: false, error: "not found" }, h);
    if (path === "/admin/reject") {
      await env.TRIPS.delete("pending:" + id);
      await env.TRIPS.delete("approved:" + id);
      return json(200, { ok: true, id, status: "rejected (deleted)" }, h);
    }
    const e = JSON.parse(v);
    e.status = "approved";
    e.approved = new Date().toISOString();
    await env.TRIPS.put("approved:" + id, JSON.stringify(e));
    await env.TRIPS.delete("pending:" + id);
    return json(200, { ok: true, id, status: "approved", entry: e }, h);
  }
  return json(404, { ok: false, error: "not found" }, h);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin") || "";
    try {
      if (url.pathname === "/submit") {
        if (req.method === "OPTIONS") return new Response(null, { status: ORIGINS.includes(origin) ? 204 : 403, headers: cors(origin) });
        if (req.method === "POST") return await submit(req, env, origin);
        return json(405, { ok: false, error: "method" }, cors(origin));
      }
      if (url.pathname.startsWith("/admin/")) return await admin(req, env, url.pathname);
      return json(404, { ok: false, error: "not found" }, {});
    } catch (e) {
      console.error("trip-queue error", e && e.message);
      return json(500, { ok: false, error: "server" }, cors(origin));
    }
  }
};
