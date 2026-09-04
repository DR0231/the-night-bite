# The Night Bite

Static website: night-fishing log and dockside vegan snacks for **Hoover Reservoir** (Delaware / Franklin County, Ohio). Cozy cabin-notebook look. Catfish-first. Unofficial personal project — not ODNR, not City of Columbus.

**Site name spelling:** *The Night Bite* (Night, not Nite).

## Local preview

From this directory:

```bash
cd the-night-bite
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in a browser.

Any static server works (`npx serve`, VS Code Live Server, etc.).

## Deploy to GitHub Pages

1. Create a GitHub repo and push this folder (as repo root, or as `/docs`, or via GitHub Actions).
2. In the repo: **Settings → Pages**.
3. Source: **Deploy from a branch**.
4. Branch: `main` (or `master`), folder: `/` (root) or `/docs` if you keep the site there.
5. Save. After a minute, open `https://<user>.github.io/<repo>/`.

If the site lives in a project-pages subpath, keep asset paths relative (they already are: `css/`, `js/`, `assets/`).

Optional: add a empty `.nojekyll` file at the site root so GitHub Pages does not process the tree with Jekyll.

**Do not commit secrets.** This site has no API keys.

## Editing a SAMPLE log entry

Samples are defined in two places:

1. **Seeded in JavaScript:** `js/log.js` → array `SAMPLE_TRIPS` (used when `localStorage` is empty or samples were never seeded).
2. **Noscript fallback in HTML:** `log.html` inside `<noscript>` (shown only when JS is off).

To change a sample:

1. Edit the matching object in `SAMPLE_TRIPS` (`date`, `location`, `bait`, `species`, `disposition`, `notes`).
2. Keep `"sample": true` and an `id` like `sample-N`.
3. Update the matching `<noscript>` card in `log.html` if you care about no-JS users.
4. In a browser you already tested: DevTools → Application → Local Storage → remove `nightbite-log-v1` and `nightbite-samples-seeded-v1`, then reload so samples re-seed.

User-added trips use ids like `user-<timestamp>` and can be removed with **Clear my entries** (samples remain).

Storage key: `nightbite-log-v1`.

## Water numbers

**Water level and temperature on this site are placeholders only** (`last checked: unknown.`).  
Do not invent live USGS values. Full pool (~894 ft NGVD29), gauge ID **03228400**, 10 HP limit, and ramp names (Oxbow / Redbank / Walnut Road) are reference notes — confirm current conditions via official USGS / local sources.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Home, atmosphere, static GO / NIGHTS ONLY / WAIT chips |
| `log.html` | SAMPLE trips + localStorage form |
| `water.html` | Gauge / pool / ramps |
| `dockside.html` | Original vegan recipes |
| `whisperwood.html` | Game teaser (not playable) |
| `about.html` | Disclaimer, safety, license & cat limit reminders |

## Fonts

- **Pixelify Sans** (display) + **Source Serif 4** (body) via Google Fonts.
- Fallback: `"Courier New"` / Georgia system stack if fonts fail to load.

## License note

Hand-authored SVG icons in `assets/`. Recipe text is original for this project.
