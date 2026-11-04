#!/usr/bin/env python3
"""List, approve or reject trips waiting in the nb-trip-queue Worker (Share a trip on /log).

Nothing goes on the site from here unless you ask: `approve ID` only marks the trip approved in the queue.
Add `--write` to also add the approved trip to data/community-log.json in this checkout (then commit it to the
preview and push live on "push").

  python3 tools/trip-queue.py list                 # pending trips
  python3 tools/trip-queue.py list --approved      # approved trips
  python3 tools/trip-queue.py approve ID [--write]
  python3 tools/trip-queue.py reject ID            # deletes it from the queue

The admin token is read from /home/box/.nightbite/trip-queue-admin-token (600 perms), or NB_TRIP_TOKEN_FILE.
It is never printed.
"""
import argparse, json, os, sys, urllib.request, urllib.error
from pathlib import Path

URL = os.environ.get("NB_TRIP_QUEUE_URL", "https://nb-trip-queue.nightbiteoh.workers.dev")
TOKEN_FILE = Path(os.environ.get("NB_TRIP_TOKEN_FILE", "/home/box/.nightbite/trip-queue-admin-token"))
ROOT = Path(__file__).resolve().parent.parent
KEEP = ["lake", "date", "species", "ramp", "time_window", "bait", "keep_release", "notes"]


def token():
    if not TOKEN_FILE.exists():
        sys.exit(f"token file missing: {TOKEN_FILE}")
    if TOKEN_FILE.stat().st_mode & 0o077:
        sys.exit(f"{TOKEN_FILE} must be chmod 600")
    return TOKEN_FILE.read_text().strip()


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(URL + path, data=data, method=method, headers={
        "Authorization": "Bearer " + token(), "Content-Type": "application/json",
        "User-Agent": "nb-trip-queue-tool"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        try:
            msg = json.load(e)
        except Exception:
            msg = {"error": e.reason}
        sys.exit(f"{method} {path}: HTTP {e.code} {msg.get('error')}")


def show(e):
    tag = " [CHECK]" if e.get("check") else ""
    print(f"{e['id']}{tag}  {e.get('date')}  {e.get('lake')}  {e.get('species')}  at {e.get('ramp')}")
    print(f"    {e.get('time_window')}, {e.get('bait')}, {e.get('keep_release')}  (received {e.get('received')}, from {e.get('from')})")
    if e.get("notes"):
        print(f"    notes: {e['notes']}")


def write_log(e):
    p = ROOT / "data" / "community-log.json"
    doc = json.loads(p.read_text())
    trips = doc.setdefault("trips", [])
    tid = "community-" + e["id"]
    if any(t.get("id") == tid for t in trips):
        print(f"already in {p.relative_to(ROOT)}")
        return
    trips.append({"id": tid, **{k: e.get(k, "") for k in KEEP}})
    doc["updated"] = (e.get("approved") or "")[:10] or doc.get("updated")
    p.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    print(f"added to {p.relative_to(ROOT)} (not committed)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    ls = sub.add_parser("list"); ls.add_argument("--approved", action="store_true"); ls.add_argument("--json", action="store_true")
    a = sub.add_parser("approve"); a.add_argument("id"); a.add_argument("--write", action="store_true")
    r = sub.add_parser("reject"); r.add_argument("id")
    args = ap.parse_args()
    if args.cmd == "list":
        res = call("GET", "/admin/list?status=" + ("approved" if args.approved else "pending"))
        if args.json:
            print(json.dumps(res["entries"], indent=2)); return
        print(f"{res['count']} {res['status']}")
        for e in res["entries"]:
            show(e)
    elif args.cmd == "approve":
        res = call("POST", "/admin/approve", {"id": args.id})
        print(f"{res['id']}: {res['status']}")
        if args.write:
            if res["entry"].get("check"):
                print("check trip, not written"); return
            write_log(res["entry"])
    else:
        res = call("POST", "/admin/reject", {"id": args.id})
        print(f"{res['id']}: {res['status']}")


if __name__ == "__main__":
    main()
