# The Night Bite

Static website: **Hoover Reservoir** fishing hub (Delaware / Franklin County, Ohio) — species pages, water/maps, trip log, tournaments, and gear kits. Cozy cabin-notebook look. Night fishing still a strength. Unofficial personal project — **not ODNR, not City of Columbus, not USGS**.

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

**Do not commit secrets or PATs.** This site has no API keys. Mailto and the privacy page use the public contact `contact@nightbiteoh.com`.

## Nav

Home · Species · Water · Log · Tournaments · Gear · About  
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
  "lake": "hoover",
  "name": "Example club night",
  "date": "2026-10-01",
  "ramp": "Walnut Road (public)",
  "club": "Example club",
  "url": "https://example.com",
  "notes": "Third-party only."
}
```

`lake` is `hoover`, `alum` or `buckeye` (missing means `hoover`). Each lake view lists only its own events.

3. **Zero invented events.** Empty list is the honest default. This site is not a tournament director.

## SAMPLE private log entries

Log shows exactly one SAMPLE card. It normally comes from `data/community-log.json`; `js/log.js` (`SAMPLE_TRIPS`) only renders its copy when that JSON fails to load, and `log.html` has a noscript copy. SAMPLE demos are never stored. Storage key: `nightbite-log-v1` (user entries only).

## Water numbers

Home + Water show a **labeled provisional USGS snapshot** (pool param 62614, temp param 00010). `js/water.js` may refresh pool from the public IV JSON; **on failure it keeps the static snapshot and never invents**. Depth map: ODNR 2001 @ 894 ft — PDF linked, not for navigation. No Garmin/Navionics.

## Regs

Limit tables are **reminders only** — confirm on [HuntFish OH / ODNR licenses](https://ohiodnr.gov/buy-and-apply/hunting-and-fishing-licenses) and [ODNR Fishing Regulations 2026–27 (verify current)](https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/laws-regs-licenses/OhioFishingRegs_English.pdf).

## Pages

| Path | Purpose |
|------|---------|
| `index.html` | Hub home for Hoover (the site root), lake level and tonight's bite up top, pool/temp snapshot, next actions |
| `alum/index.html`, `buckeye/index.html` | Alum Creek and Buckeye Lake home pages, built from `index.html` (see Lake home pages) |
| `species/index.html` | Filterable species grid |
| `species/*.html` | Per-species Season · Where · Limits · Gear · Bait |
| `water.html` | Maps, pool correction, structure, ramps |
| `log.html` | Community JSON + private localStorage + submit |
| `tournaments.html` | Static JSON list + submit |
| `gear.html` | Short kits (affiliate placeholders) |
| `whisperwood.html` | Game teaser (kept) |
| `about.html` | Disclaimer, safety, regs reminders |

## Lake home pages

Each lake has its own address: Hoover is the root (`/`), Alum Creek is `/alum/`, Buckeye Lake is `/buckeye/`.
`alum/index.html` and `buckeye/index.html` are generated, never edited by hand. After any change to `index.html`:

```bash
python3 tools/build-lake-pages.py && python3 tools/stamp-version.py
```

The generator adds `<base href="../">` (so every asset, script and fetch resolves from the root), the lake's
`nb-home` meta, its own title, description, canonical and OG tags, and points in-page links at the lake's page.
`js/lakes.js` reads `nb-home`. Old links still work: `/?lake=alum` and a saved lake choice (localStorage `nb-lake`)
send the root to `/alum/`. On Home the lake picker goes to the lake's address; on other pages it adds `?lake=`.
All three home pages are precached by `sw.js`, so each opens offline. List new lakes in `sitemap.xml` too.

## Keep test runs out of the stats

The live site sends page views to Cloudflare Web Analytics (`static.cloudflareinsights.com`, `cloudflareinsights.com`).
Our own screenshot, CLS and test runs must never load it, or they show up as visitors (they did, as ChromeHeadless).

- **Every new script** blocks it in code. Node/Playwright: `const na = require("./tools/no-analytics.cjs");`, launch
  with `args: na.args()`, then `await na.block(context)`. Python: `from no_analytics import args, block` from
  `tools/no_analytics.py`, the same two steps (`await block(ctx)` with the async API).
- **The box blocks it for everything else**, including older scripts that were written before this: `/etc/hosts`
  maps both hosts to `0.0.0.0` and `::`, and a Chrome/Chromium policy (`/etc/opt/chrome/policies/managed/` and
  `/etc/chromium/policies/managed/nb-no-analytics.json`, `URLBlocklist`) refuses them.
- Check a run: no request to `cloudflareinsights.com` should succeed (the CLS and screenshot scripts print a count).

## Fonts

- **Pixelify Sans** (display) + **Source Serif 4** (body) via Google Fonts.

## License note

Pixel icons in `assets/` (16px set, palette-only, built from `nb-palette.gpl`). Text is original for this project.
