# The Night Bite

Static website: unofficial night fishing notebook for 49 Ohio waters, starting at Hoover Reservoir. Species pages, water and maps, trip log, tournaments, and gear kits. Cabin-notebook look. Night fishing is still a strength. Not ODNR, not City of Columbus, not USGS.

**Site name spelling:** *The Night Bite* (Night, not Nite).  
**Live domain:** `nightbiteoh.com` (CNAME in repo). Serve over **HTTPS** in production.

## Share tags, robots and the meta check

Share tags (Open Graph and Twitter Card) are written by `tools/build-meta.py` from each page's own `<title>`, meta description and canonical, so they never drift. Run it after `tools/build-lake-pages.py` and before `tools/stamp-version.py`, then check with `python3 tools/check-meta.py` (title, description, canonical, OG, Twitter and valid JSON-LD on every public page; exit 1 on errors). Images: `assets/og/og-<lake>.png` on the lake pages, `og-card.png` everywhere else.

`robots.txt` blocks AI training crawlers (GPTBot, Google-Extended, CCBot, anthropic-ai, ClaudeBot, Bytespider, Applebot-Extended, meta-externalagent, cohere-ai, Diffbot, Omgilibot). AI search crawlers that link back (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User) and normal search engines are allowed.

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

## Display settings

Text size, readable text, less motion, high contrast and red light (`html[data-light="red"]`, palette tokens only; the share card reads the same tokens): `js/a11y-boot.js` (head) and `js/a11y.js` (panel), saved in localStorage `nb-a11y` on the device only. See tools/README.md "Display settings".

## Nav

Home · Species · Water · Log · Tournaments · Gear · About  
(Whisperwood stays footer-linked / mentioned on About.)

## Adding a community trip

1. Readers use Send for review on the Log (the nb-trip-queue Worker queue, `workers/trip-queue/`). List and approve with `python3 tools/trip-queue.py`; `approve ID --write` adds the trip here. GitHub issues (`.github/ISSUE_TEMPLATE/trip-report.yml`) and the mailto / markdown helper stay as the fallback.
2. After review, append an object to `data/community-log.json` → `trips` array:

```json
{
  "id": "community-YYYYMMDD-slug",
  "sample": false,
  "date": "2026-09-01",
  "species": "Channel catfish",
  "ramp": "Oxbow Road ramp",
  "time_window": "Night",
  "bait": "Cut shad",
  "keep_release": "Released",
  "notes": "Public-safe notes only."
}
```

3. Set `"sample": true` only for clearly marked demos.
4. Commit and deploy. No accounts required to read the list. Photos / logins = Phase 2.

## Adding a tournament

1. Use `.github/ISSUE_TEMPLATE/tournament.yml` or the tournament mailto form at the bottom of the Log (`log#tournaments`).
2. Append to `data/tournaments.json` → `events`:

```json
{
  "lake": "hoover",
  "name": "Example club night",
  "date": "2026-10-01",
  "ramp": "Walnut Street ramp",
  "club": "Example club",
  "url": "https://example.com",
  "notes": "Third-party only."
}
```

`lake` is `hoover`, `alum`, `buckeye`, `oshaughnessy`, `griggs`, `indian`, `delaware`, `deercreek`, `madison`, `knox`, `clearfork`, `seneca`, `dillon`, `logan`, `saltfork`, `burroak`, `dow`, `mosquito`, `berlin`, `westbranch`, `pymatuning`, `milton`, `leesville`, `grandlakestmarys`, `caesarcreek`, `eastfork`, `cjbrown`, `rockyfork`, `ladue`, `paintcreek`, `portagelakes`, `mogadore`, `loramie`, `nimisila`, `cowan`, `acton`, `tappan`, `piedmont`, `clendening`, `atwood`, `charlesmill`, `pleasanthill`, `beachcity`, `wingfoot`, `eastbranch`, `guilford`, `highlandtown`, `punderson` or `wellington` (missing means `hoover`). Each lake view lists only its own events.

3. **Zero invented events.** Empty list is the honest default. This site is not a tournament director.

## Log page (dev notes)

These notes used to sit on the Log page itself; the page now says only "saved on this phone only".

- Community trips load from `data/community-log.json` (`js/community-log.js`). Entries with `"sample": true` are never shown. The Community section stays hidden until a real (non-sample) trip matches the lake filter, and also when the JSON fails to load.
- Share a trip (folded on the page) sends to the nb-trip-queue Worker (pending until approved; see `workers/trip-queue/README.md` and `tools/trip-queue.py`). If the queue can't be reached, Build email (mailto to `contact@nightbiteoh.com`), Show markdown and GitHub issue stay below it. Text only, public ramp names only.
- Your trips: `js/log.js`, localStorage `nightbite-log-v1`, user entries only (samples are never stored; `nightbite-samples-seeded-v2` is an old flag that gets removed). Entries without `lake` are Hoover trips. Old Hoover ramp names stay as saved and show as the official names (`spotName` in `js/lakes.js`).
- Empty states: with no trips the list is hidden, one line says so, and "Add a trip" opens.
- Backup: "Save a backup" downloads `night-bite-log-YYYY-MM-DD.json` as `{"app":"the-night-bite","kind":"trip-log","version":1,"exported":ISO,"entries":[...]}`. "Open a backup" reads that file, or a bare array (a raw `nightbite-log-v1` copy), with FileReader. Each entry needs a `YYYY-MM-DD` date, a known lake id (missing means `hoover`), string fields only (clipped to the form limits) and at least one of species, spot, bait or notes; samples are dropped. Trips are merged, never replaced: a trip that matches one already saved (same lake, date, spot after the ramp-name mapping, species, bait, keep and notes) is counted as already here. No network. `window.NightBiteLogIO` is the hook `tools/check-log-io.cjs` tests.

## Water numbers

Hoover's home (`hoover/`) + Water show a **labeled provisional USGS snapshot** (pool param 62614, temp param 00010). `js/water.js` may refresh pool from the public IV JSON; **on failure it keeps the static snapshot and never invents**. Depth map: ODNR 2001 @ 894 ft, PDF linked, not for navigation. No Garmin/Navionics.

## Regs

Limit tables are **reminders only**. Confirm on [HuntFish OH / ODNR licenses](https://ohiodnr.gov/buy-and-apply/hunting-and-fishing-licenses) and [ODNR Fishing Regulations 2026–27 (verify current)](https://dam.assets.ohio.gov/image/upload/ohiodnr.gov/documents/wildlife/laws-regs-licenses/OhioFishingRegs_English.pdf).

## Pages

| Path | Purpose |
|------|---------|
| `index.html` | Pick your water (the site root): every water as a tile (its pixel chart from `assets/tiles/`, north up with no arrow, made by `tools/build-tile-charts.py`; name, area where it adds, gauge line) grouped by region from `js/lakes.js` and `data/quick-facts.json`, region chips, a Find a water box and Last picked (`js/water-picker.js`), Just browsing (`hoover/?browse`, opens Hoover without saving it), Get the app |
| `hoover/index.html` | Hoover's home page (moved from the root on Nov. 3, 2026): Tonight at a glance, Quick facts, pool snapshot (the USGS snapshot routine's lines), conditions, bait nearby, log |
| `<lake>/index.html` (`alum/`, `berlin/` and the rest) | Home pages for every other lake, built like `hoover/` from `tools/lake-home.html` (see Lake home pages) |
| `species/index.html` | Filterable species grid for the active lake: Biting now picks first, then every other species at the lake, then a closed "Not at <lake>" dropdown, ramps and access (`js/species-lake.js`) |
| `species/*.html` | Per-species Season · Where · Limits · Gear · Bait, with an "at <lake> this month" note under the title |
| `water.html` | Maps, pool correction, structure, ramps, dock season (from `data/docks.json` via `tools/build-docks.py`; `docks.html` is the short /docks link), link to Ice season |
| `ice.html` | Ice season: ODNR ice safety, who to call per lake, winter species from the monthly notes. No ice reports |
| `log.html` | Your trips (this device, backup file), community trips, share a trip, tournaments |
| `tournaments.html` | Redirect to `log#tournaments` (list + submit now live at the bottom of the Log) |
| `gear.html` | Short kits (affiliate placeholders) |
| `whisperwood.html` | Game teaser (kept) |
| `about.html` | Disclaimer, safety, regs reminders |

## Clean addresses

Pages are linked without `.html` (`water`, `updates`, `species/walleye`, `species/`, `./` for Home). GitHub Pages serves `water.html` at `/water`, so the files keep their `.html` names and old links and bookmarks still work. Canonicals, og:url, JSON-LD and `sitemap.xml` use the clean form too. Write new links the same way. Exceptions: links into Whisperwood (`whisperwood.html`, `whisperwood/play.html`) keep `.html`, because `/whisperwood` is also a folder and the Whisperwood auto-deploy writes those links. The service worker answers `/water` and `/water.html` from the same saved copy when offline.

## Lake home pages

Each lake has its own address at `/<id>/`, Hoover too (`/hoover/`, `/alum/`, `/berlin/` ...; the ids are in `js/lakes.js`).
The site root (`/`) is the water picker. All lake `index.html` files, `hoover/` included, are generated from
`tools/lake-home.html` and never edited by hand, with one exception: the USGS snapshot routine's three lines in
`hoover/index.html` (correction-line, the Checked time, water-temp), which the build carries back into the template.
After any change to `tools/lake-home.html` or `js/lakes.js`:

```bash
python3 tools/build-lake-pages.py && python3 tools/build-meta.py && python3 tools/stamp-version.py
```

The generator adds `<base href="../">` (so every asset, script and fetch resolves from the root), the lake's
`nb-home` meta, its own title, description, canonical and OG tags (og:image is `assets/og/og-<lake>.png`), and points
in-page links at the lake's page. It also writes the root's tiles and region chips (`<!-- nb:water-picker -->`, `<!-- nb:water-chips -->`) and site JSON-LD,
so a new lake in `js/lakes.js` shows up on the picker with no edit to `index.html`.

Remembered water: `js/lakes.js` keeps the last water picked or opened in localStorage `nb-lake` (the id only). A lake
home page always wins and updates it, so a shared `/berlin/` link opens Berlin. On the root, a saved water (or an old
`/?lake=alum` link) goes straight to that lake's home page before paint (`location.replace`, no flash); lake pages never
redirect, so there is no loop. `/?pick` keeps the picker open. Once a water is chosen, Home links on every page point at
its home page; on a first visit they open the picker. `sw.js` precaches the picker and every lake home, so any water
opens offline right after install (see SERVICE-WORKER.md). List new lakes in
`sitemap.xml` too.

### Quick facts and structured data

`tools/build-lake-pages.py` also writes two blocks on every lake home, Hoover included (it refreshes `tools/lake-home.html` first):

- **Quick facts** (`<!-- nb:quick-facts -->`): a closed `<details>` with motors and speed, ramps and access, normal pool (with a USGS or Corps gauge link from `js/lakes.js`, or "No public gauge") and night rules, plus a visible "Facts checked <date>". The text comes only from `data/quick-facts.json`, which is copied from sourced site text (water facts cards, map notes, DATA-SOURCES.md). If a field has no source, leave it out. Never fill a gap with a guess. When you recheck a lake, update its `checked` date.
- **JSON-LD** (`<!-- nb:jsonld -->`): the root (the water picker) gets WebSite (with alternateName), Organization and WebPage. Each lake home gets a WebPage whose `dateModified` matches its Facts checked date. Don't add FAQPage.

## IndexNow

`tools/indexnow.py` tells Bing, Yandex and other IndexNow engines when pages on https://nightbiteoh.com/ change. The key file `5b4049f688da534086dcca09d14b201f.txt` sits at the site root and has to be live on nightbiteoh.com. The key is public by design.

```bash
python3 tools/indexnow.py                     # dry run: every sitemap URL, sends nothing
python3 tools/indexnow.py --since HEAD~1      # dry run: only pages changed since that commit
python3 tools/indexnow.py --since HEAD~1 --send   # really ping, only after the live push is up
```

Only URLs listed in `sitemap.xml` are sent. Don't use `--send` until the live site is serving the change, and don't ping the same unchanged URLs over and over.

## Home tools: Share tonight, Remind me

`js/tonight-tools.js` adds two buttons under the Tonight at a glance strip.
A one line note under them ("Share tonight's wind, weather, sunset and what's biting") says what the card holds, so
Share doesn't read as sharing only the strip above. No live thumbnail: at thumbnail size the card's text is unreadable,
it would wait on the forecast, and it crowds the first screen.
Share tonight draws a 1200x630 PNG on the phone from what the page shows, angler info first: wind and gusts, air and
feels like, sky and rain chance (NWS), any NWS watch or warning (event name only), sunset, moonrise and moon (worked out
on the phone), water temp only where the lake has a public temp gauge (Hoover, Griggs and Indian Lake; the others say "No public temp
gauge"), and the top 3 picks from the lake's "What's biting now" month notes. Lake level and the bite rating sit on one
small line. "--" when a value is missing. No URL and no source footer on the image; the sources are listed under it in
the dialog. Shares with the Web Share API with files where supported, or a download.
Remind me picks any time of day on a wheel (hour 1 to 12, minutes in 5 minute steps, AM/PM; scroll-snap columns with
spinbutton roles and arrow keys) or the Sunset button (exact minute). A time that already passed today rolls to tomorrow
and says so. No push server: a `.ics` calendar file (always works), and a phone notification that uses Notification
Triggers where the browser has them, otherwise a timer that only runs while the app is open.
`sw.js` handles `notificationclick` to open the lake's home page. Every URL comes from the page's own origin (`homeFor`,
the script URL), so the permission prompt names whatever site serves it.

## What's new (updates.html)

`updates.html` lists new features, improvements and fixes, newest first. Everything comes from one file, `data/updates.json`; `tools/build-updates.py` turns it into the page, so the page reads without JavaScript and search engines see it.

To add an update:

1. Add an entry at the top of `entries` in `data/updates.json` (below any draft):
   ```json
   {
     "id": "2026-11-02-short-name",
     "date": "2026-11-02",
     "tag": "New",
     "title": "Short title",
     "bullets": ["What changed, in plain words.", "Two to five bullets."],
     "links": [{ "label": "Home", "href": "./" }]
   }
   ```
   `tag` is `New`, `Improved` or `Fixed`. `id` must be unique; it becomes the entry's anchor (`updates#id`). Links are repo paths written without `.html` (`water#docks`, `species/walleye`, `./`) and must exist. Use the date the change went live (Eastern time), and only describe changes that actually shipped.
2. Run `python3 tools/build-updates.py && python3 tools/build-lake-pages.py && python3 tools/stamp-version.py`.
   The build checks the data (order, tags, 2 to 5 bullets, no spaced dashes, links exist) and stops with a message if something is off. It then:
   * prerenders the entries into `updates.html` between `<!-- updates:start -->` and `<!-- updates:end -->`;
   * stamps `data-updates="<newest date>"` on every What's new link in the nav, More menu and footer;
   * sets the `<lastmod>` for updates.html in `sitemap.xml`.
3. Bump `VERSION` in `sw.js` and deploy as usual.

**New dot.** `js/nav.js` compares the newest date on the links with `nb-updates-seen` in localStorage and shows a small amber dot on What's new (and on the More button on phones) until the visitor opens the page. Adding a dated entry turns the dot back on for everyone.

**Drafts.** An entry with `"draft": true` and `"date": null` is for features that are only on the preview. It shows on the preview (and localhost) with a dashed line and "Preview only", stays hidden on nightbiteoh.com (`js/updates-draft.js`). When the feature ships, set its date, remove `"draft": true`, move it into date order and rebuild.

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

- **Night Bite Pixel**, **Pixelify Sans** and **Source Serif 4**, self-hosted (see `css/styles.css` and `assets/fonts/`).

## License note

Pixel icons in `assets/` (16px set, palette-only, built from `nb-palette.gpl`). Text is original for this project.
