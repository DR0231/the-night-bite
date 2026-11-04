# nb-trip-queue (Share a trip queue)

Worker: https://nb-trip-queue.nightbiteoh.workers.dev (workers.dev only, no DNS). Storage: Workers KV namespace
`nb-trip-queue` (binding `TRIPS`). Secret: `ADMIN_TOKEN` (Worker secret; box copy at
/home/box/.nightbite/trip-queue-admin-token, chmod 600; never commit it).

- `POST /submit` (CORS: https://nightbiteoh.com, https://dr0231.github.io only). JSON with only lake, date, species,
  ramp, time_window, bait, keep_release, notes, plus the hidden honeypot `website` and `check` (test trips from
  tools/check-trip-queue.cjs). 4 KB body cap, species/time/keep from the form's lists, ramp 80, bait 120, notes 500
  characters, no links. 5 per IP per hour (salted hash, expires, no raw IP kept). Max 300 pending. Stored as
  `pending:<id>`. Nothing is published.
- `GET /admin/list?status=pending|approved`, `POST /admin/approve {id}`, `POST /admin/reject {id}` (deletes),
  `Authorization: Bearer <token>`. Use `python3 tools/trip-queue.py`.
- Approve only marks the trip approved. `tools/trip-queue.py approve ID --write` adds it to
  data/community-log.json; commit that to the preview and it goes live on "push".

Deploy: `wrangler deploy` from this folder (wrangler.jsonc), or the Cloudflare API script upload with the same
bindings. Set the secret with `wrangler secret put ADMIN_TOKEN < /home/box/.nightbite/trip-queue-admin-token`.
