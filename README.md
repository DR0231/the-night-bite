# The Night Bite

Static website: **Hoover Reservoir** fishing hub (Delaware / Franklin County, Ohio) — species pages, water/maps, trip log, tournaments, gear kits, and dockside vegan snacks. Cozy cabin-notebook look. Night fishing still a strength. Unofficial personal project — **not ODNR, not City of Columbus, not USGS**.

**Site name spelling:** *The Night Bite* (Night, not Nite).  
**Live domain:** `nightbiteoh.com` (CNAME in repo). Serve over **HTTPS** in production.

## Local preview

From this directory:

```bash
cd the-night-bite
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080). A real HTTP server is required so `fetch()` can load `data/community-log.json` and `data/tournaments.json` (file:// will fail those).

Any static server works (`npx serve`, VS Code Live Server, etc.).

## Deploy to GitHub Pages

1. Push this repo (GitHub Pages already used for `nightbiteoh.com`).
2. **Settings → Pages** → deploy from branch `main` / root (or your existing workflow).
3. Keep asset paths relative (`css/`, `js/`, `assets/`, `data/`).
4. Optional: `.nojekyll` at site root if Jekyll interferes.

**Do not commit secrets or PATs.** This site has no API keys. Mailto uses placeholder `nightbite@local` until a public contact is set.

## Nav

Home · Species · Water · Log · Tournaments · Gear · Dockside · About  
(Whisperwood stays footer-linked / mentioned on About.)

## Adding a community trip

1. Prefer a GitHub issue via `.github/ISSUE_TEMPLATE/trip-report.yml`, or use the Log page mailto / markdown helper.
2. After review, append an object to `data/community-log.json` → `trips` array:

```json
{
  "id": "community-YYYYMMDD-slug",
  "sample": false,
  "date": "2026-09-01",
  "species": "Channel catfish",
  "ramp": "Oxbow (upper ramp)",
  "time_window": "Night",
  "bait": "Cut shad",
  "keep_release": "Released",
  "notes": "Public-safe notes only."
}
```

3. Set `"sample": true` only for clearly marked demos.
4. Commit and deploy. No accounts required to read the list. Photos / logins = Phase 2.

## Adding a tournament

1. Use `.github/ISSUE_TEMPLATE/tournament.yml` or the Tournaments mailto form.
2. Append to `data/tournaments.json` → `events`:

```json
{
  "name": "Example club night",
  "date": "2026-10-01",
  "ramp": "Walnut Road (public)",
  "club": "Example club",
  "url": "https://example.com",
  "notes": "Third-party only."
}
```

3. **Zero invented events.** Empty list is the honest default. This site is not a tournament director.

## SAMPLE private log entries

Seeded in `js/log.js` (`SAMPLE_TRIPS`) and noscript fallback in `log.html`. Storage key: `nightbite-log-v1`.

## Water numbers

Home + Water show a **labeled provisional USGS snapshot** (pool param 62614, temp param 00010). `js/water.js` may refresh pool from the public IV JSON; **on failure it keeps the static snapshot and never invents**. Depth map: ODNR 2001 @ 894 ft — PDF linked, not for navigation. No Garmin/Navionics.

## Regs

Limit tables are **reminders only** — confirm on [HuntFish OH / ODNR licenses](https://ohiodnr.gov/buy-and-apply/hunting-and-fishing-licenses) and [ODNR Fishing Regulations 2026–27 (verify current)](https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/laws-regs-licenses/OhioFishingRegs_English.pdf).

## Pages

| Path | Purpose |
|------|---------|
| `index.html` | Hub home, pool/temp snapshot, next actions |
| `species/index.html` | Filterable species grid |
| `species/*.html` | Per-species Season · Where · Limits · Gear · Bait |
| `water.html` | Maps, pool correction, structure, ramps |
| `log.html` | Community JSON + private localStorage + submit |
| `tournaments.html` | Static JSON list + submit |
| `gear.html` | Short kits (affiliate placeholders) |
| `dockside.html` | Vegan recipes (kept) |
| `whisperwood.html` | Game teaser (kept) |
| `about.html` | Disclaimer, safety, regs reminders |

## Fonts

- **Pixelify Sans** (display) + **Source Serif 4** (body) via Google Fonts.

## License note

Hand-authored SVG icons in `assets/`. Recipe text is original for this project.
