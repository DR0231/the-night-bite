# The Night Bite tools

Run everything from the repo root of the preview checkout. Python 3 and Node 24 with Playwright (Chrome) are needed.
Every browser run loads `tools/no-analytics.cjs`, so no test visit is counted on Cloudflare Web Analytics or the visits counter.

The scripts read their lists from the site itself, so a new lake or page needs no edit here:

* lakes: `js/lakes.js` (LAKES, ORDER, REGIONS) and `data/quick-facts.json` (lake page title, description, Quick facts)
* pages: `sitemap.xml`

`tools/registry.cjs` (Node) and `tools/registry.py` (Python) are the one place that reads them. Try `node tools/registry.cjs`.

Data rule: no invented data. Sources are USGS, the Army Corps, ODNR, NWS, MWCD and official city, park and marina pages.
A Google Maps listing is used only for bait shops.

## Everyday

| Script | What it does |
| --- | --- |
| `python3 tools/check-all.py` | Builds, then runs every check on the changed lakes plus hoover. Writes one log and exits 1 only on a failure that is not in `tools/known-failures.json` |
| `node tools/sweep.cjs` | Opens every sitemap page at 390, 820 and 1280 px. Checks status, console, links, title, h1, meta, canonical and alt text |
| `python3 tools/new-lake.py` | Adds a new lake to the registry, Quick facts, sitemap and Bait nearby, runs the builds, and prints a checklist of everything still unsourced |
| `python3 tools/promote.py` | Copies the preview to live. **Dry run by default** |

### check-all.py

```
python3 tools/check-all.py                         # preview: build here, check https://dr0231.github.io/night-bite-preview/
python3 tools/check-all.py --target local          # build, serve this checkout on 127.0.0.1 (tools/serve.py), check it
python3 tools/check-all.py --target live           # read-only: no build; checks nightbiteoh.com and /workspace/the-night-bite
python3 tools/check-all.py --target local --only check-meta,check-radius,check-docks    # static checks, about 20 s
python3 tools/check-all.py --target local --lakes dow --shots --log /workspace/nb-checks/dow/check-all.log
python3 tools/check-all.py --target local --all-lakes             # explicit full run: groups of 5, resumable
python3 tools/check-all.py --target local --all-lakes --group 3   # one group only, one short step at a time
```

**Lake scope.** check-waters, check-glance, check-glance-fallback and check-bait never cover every lake by accident:

* `--lakes a,b` checks exactly those lakes.
* With no `--lakes`, the run checks the lakes whose files differ from `origin/main` (`git diff`, plus uncommitted and untracked files; `--base-ref` changes the ref) plus `hoover` as the reference, and prints what it chose. A file counts for a lake when its folder or file name is the lake id (`dow/index.html`, `assets/tiles/dow.png`, `assets/dow-chart.png`). Shared files (css, js, data) are listed in the printed scope too, since they can touch every lake. Add `--lakes` or use `--all-lakes` when that matters.
* `--all-lakes` is the only way to check every lake. It builds once, then runs a `site` group (static checks and the sweep) and lake groups of `--group-size` (default 5), each as its own `check-all --no-build --lakes ...`. Each group writes `group-<n>.json` and its log under `--state-dir` (default `/workspace/nb-checks/all-lakes-<target>/`). Rerunning the same command skips groups that passed, so an interrupted run resumes. `--group <n|site>` runs one group, `--fresh` starts over.
* Start each run in the background and wait on it no more than about 5 minutes at a time. One lake group takes about 4 to 5 minutes.
* `node tools/registry.cjs --changed [REF]` prints the changed lakes and files on their own.

* Checks: check-meta, check-radius, check-docks (report only), check-hours, check-ramp-names, check-lake-isolation, check-glance, check-glance-fallback, check-bait, check-waters (the lake scope above), check-picker-flow, check-a11y-settings, check-log-io, check-trip-queue, check-night-rules, check-i18n, check-manifest, check-i18n-browser and sweep.
* `--skip` leaves checks out.
* A scoped run takes a few minutes. A full `--all-lakes` run takes over 30 minutes across 49 waters, which is why it is split into groups.
* Known failures go in `tools/known-failures.json` as `{check, match, target?, why}`. Add an entry only for a failure you have looked at and accepted. Then remove it once the failure is fixed.

### sweep.cjs

```
node tools/sweep.cjs                                         # the preview, every sitemap page, links checked
node tools/sweep.cjs --base https://nightbiteoh.com/         # live (read-only)
node tools/sweep.cjs --pages water,alum/ --no-links
node tools/sweep.cjs --shots                                 # also screenshot pages changed since HEAD~1
node tools/sweep.cjs --shots water,species/saugeye --out /workspace/nb-checks/my-sweep
```

* Output is `sweep.log` with PASS, FAIL and NOTE lines, plus screenshots, in `--out`. The default is `/workspace/nb-checks/sweep-<time>`.
* Outside links that answered 200 are cached for 7 days in `/workspace/nb-checks/link-cache.json`.
* Each tab starts with no remembered lake.
* Exit codes: 0 means everything passed, 1 means at least one FAIL, 2 means the sweep crashed.

### new-lake.py

```
python3 tools/new-lake.py --from lake.json --dry-run      # what it would write
python3 tools/new-lake.py --from lake.json                # write, build, print the checklist
python3 tools/new-lake.py --remove <slug> --yes           # undo a scaffold
```

* See `tools/new-lake.example.json` for the entry format, and `--help` for every field.
* A fact without an official source is left out, never guessed.
* NWS forecast grid, station and alert zones come from api.weather.gov.
* After it runs, work through the checklist, then run `check-all.py --target local --lakes <slug>`.
* Never commit a test lake.

### promote.py: preview to live

**Real mode is only used after D'Angelo has said "push" in chat for this promotion.** Until then, run the dry run and report what it shows.

```
python3 tools/promote.py                                     # DRY RUN: lists what would change on live, writes nothing
python3 tools/promote.py --whats-new entry.json --show-diff  # dry run including the What's new entry, with diffs
# only after "push" in chat:
python3 tools/promote.py --live --confirm-push --whats-new entry.json            # write the live working tree
python3 tools/promote.py --live --confirm-push --whats-new entry.json --commit --push
```

* Files: whatever changed in the preview since the range named in live's last "Promote preview A..B" commit (override with `--base`).
* Live keeps its own privacy page, What's new data, CNAME, robots.txt, IndexNow key, Google verification file and Whisperwood.
* Every promotion requires a new What's new entry and a newer sw.js VERSION. The default VERSION is the next vN with today's date.
* Nothing is committed without `--commit`, and nothing is pushed without `--push`. The push runs `git pull --rebase` first and never force-pushes.
* After a push it prints the IndexNow command, `python3 tools/indexnow.py --since HEAD~1 --send`, for you to run once nightbiteoh.com serves the new pages.
* To rehearse, copy the live checkout and run against the copy: `--live --confirm-push --live-dir /tmp/live-copy`.

## Builds (run by check-all, new-lake and promote, in this order)

```
python3 tools/build-lake-pages.py   # picker tile charts (build-tile-charts.py, below), lake homes from tools/lake-home.html
                                    # + registry (title/description from data/quick-facts.json), the root picker tiles
python3 tools/build-docks.py        # water.html#docks from data/docks.json; a date already past is baked as its after text
python3 tools/build-meta.py         # share tags; og-<id>.png when it exists, else og-card.png
python3 tools/stamp-version.py      # ?v=VERSION on CSS/JS links
python3 tools/build-updates.py      # What's new page from data/updates.json
```

## Picker tile charts (`build-tile-charts.py`)

```
python3 tools/build-tile-charts.py                 # every lake in js/lakes.js
python3 tools/build-tile-charts.py --lake seneca   # one lake (repeat --lake for more)
python3 tools/build-tile-charts.py --check         # change nothing; exit 1 if a tile or sw.js would change
```

* Makes `assets/tiles/<id>.png` from the pool card chart `assets/<id>-chart.png`: the north arrow taken out, and charts drawn north-left turned north up, so every tile on the root picker faces the same way. The pool card charts are never changed.
* Keeps exactly one `"assets/tiles/<id>.png"` line per tile in sw.js `PRECACHE`, and a full run drops tiles of lakes no longer in js/lakes.js.
* Idempotent: files are written only when their bytes would change. Needs Pillow to draw; without it the committed tiles stay as they are.
* Runs on its own inside `build-lake-pages.py` (so check-all, promote and every build keep tiles in step), and `new-lake.py` runs it with `--lake <slug>`. A new lake gets its tile on the first build after its chart is added. A chart needs the standard arrow in its top left corner; the script stops if it can't find one.

## One lake per lake home (`lake_isolate.py`, `check-lake-isolation.py`)

* `tools/lake-home.html` carries every lake's lake-only blocks (`data-for="<id>"` or a list of ids), every pool chart
  `<img>` and every map data script. `build-lake-pages.py` runs `lake_isolate.isolate()` on each built page, so
  `<id>/index.html` keeps only its own blocks (rewritten to `data-for="<id>"`), its own chart and its own
  `js/lake-map-data-<id>.js` (Hoover: `js/hoover-map-data.js`), and gets `<html data-lake="<id>">` so a page with
  JavaScript off shows its own lake. Switching lakes is a page load to that lake's home page, so nothing is lost.
  Shared pages (water, gear, stocking, species) still carry every lake and switch in place.
* A new lake needs its blocks and chart in `tools/lake-home.html` as before; the build does the rest.
* `python3 tools/check-lake-isolation.py [--lakes a,b]` (static, under a second; check-all runs it for the lake scope)
  fails on another lake's block, chart or map data script on a lake home, a missing or doubled own chart, a missing
  `data-lake`, or a lake with no chart in the template.
* `build-lake-pages.py` also sets `<lastmod>` in sitemap.xml to today (ET) for each lake home, and the root, whose
  content changed on that build (version stamps ignored), and gives picker tiles after the first row `loading="lazy"`.
* `check-meta.py` errors when two indexable pages share a `<title>`, meta description or first `<h1>`.

## Picker flow (`check-picker-flow.cjs`)

* `node tools/check-picker-flow.cjs <base> [out]` (about 1 minute; check-all runs it as `check-picker-flow`): the root
  picker (first visit, search by name and town, empty state, region chip, Enter, return visit, `?pick` with Last picked,
  tiles, Just browsing saves nothing, shared lake link, lazy tiles, plain links with JavaScript off), then switching
  lakes from the header pill at 390 and 1280 px (each switch lands on the lake's own address with only its own chart
  and blocks, and saves it), and a lake home with JavaScript off showing its own lake. Analytics blocked.

## Display settings (`a11y-inject.py`, `check-a11y-settings.cjs`)

- `js/a11y-boot.js` loads sync in every `<head>` (before the stylesheet; the CSP forbids inline script) and sets
  `data-text` (sm, lg, xl), `data-font` (readable), `data-motion` (reduce), `data-contrast` (more) on `<html>` from
  localStorage `nb-a11y`, so nothing flashes. Large and XL turn readable text on. `data-light` (red) is red light: only the palette tokens
  change (including the `--*-rgb` triplets used for tints), pictures get `--red-filter`, the lantern keeps its art, the
  phone toolbar color goes black, and the share card reads the same tokens.
- `js/a11y.js` (defer) builds the Display panel (a native `<dialog>`) on first open from any `[data-a11y-open]` button:
  one in the More menu, one in the footer nav. The buttons stay hidden without JavaScript.
- `python3 tools/a11y-inject.py` adds the head script, the panel script and both buttons to every page and to
  `tools/lake-home.html`. Idempotent; run it after adding a hand-written page. whisperwood* is skipped.
- `node tools/check-a11y-settings.cjs <base> [outDir] [pages]` (in check-all): each size, readable text, less motion
  and high contrast apply, persist after a reload, are on `<html>` before first paint, no sideways scroll at XL, the
  header still fits, Reset clears it, and no JS means no Display button. Red light at 390: red text on true black (no
  text color or share-card pixel with green or blue above 96), pictures filtered, lantern not, persists before paint. Pages default to `,hoover/,species/`.

## Other checks and helpers

* `check-meta.py`, `check-radius.py`, `check-docks.py`, `check-glance.cjs`, `check-bait.cjs` and `check-waters.cjs` are each also runnable alone. Run alone, `check-waters.cjs [BASE] [OUT]` with no lake ids checks the changed lakes plus hoover and prints them; `--all-lakes [--group N] [--fresh]` runs every lake in groups of 5 with a `group-N.json` per group in OUT, resuming on rerun. `check-glance.cjs`, `check-glance-fallback.cjs` and `check-bait.cjs` take `NB_LAKES=a,b` (check-all sets it). `NB_ROOT=DIR` points the static checks at another checkout.
* `serve.py --root DIR --port 8642` serves a checkout like GitHub Pages does (clean URLs, a 301 to add the trailing slash, and 404.html for missing pages).
* `indexnow.py` is for live only, after a push.
* `nav-labels.py` gives each header nav link one label, so page text reads "Species", "Water" and "Whisperwood Vale" once (the old full + short spans read "SpeciesSpecies", "WaterLake"). On phones the Water link still shows "Lake" from `data-short` through CSS. `--check` changes nothing and exits 1 if a page has the old spans; check-meta reports the same as an error. whisperwood.html is never touched.
* `nav-desk-more.py [--check]` marks each header nav (classes `nav-ww` and `nav-more-desk`) so on wide screens (901px and up) Whisperwood Vale sits in the More menu, with Display; Log, About and What's new stay in the row. Phones are unchanged. check-meta errors on an unmarked nav. whisperwood.html is never touched.

## Tonight at a glance: baked strip and its fallback check

* `glance_bake.py` bakes the "Tonight at a glance" strip into every lake home from that page's own pool card (level,
  water temp, the Checked `<time>`), and writes each non-Hoover lake's own snapshot (js/lakes.js `pool.snapshot`) into
  its pool card's static lines. `build-lake-pages.py` calls it, so a normal build keeps them in step. With JavaScript
  off, or USGS and NWS blocked, the page still shows the stamped reading with its date and time, "Needs forecast"
  for the bite, "Check NWS" for wind and "No gauge" (linked to the pool card note) where a lake has no public gauge.
  js/glance.js turns the stamp into "last updated X hours ago" and swaps in live values when they arrive.
* After the weekly USGS snapshot routine edits Hoover's three snapshot lines, rebake the strip from them:
  `python3 tools/glance_bake.py hoover/index.html` (or run the normal build). `python3 tools/glance_bake.py --check`
  exits 1 if any lake home's strip is out of step with its pool card.
* `check-glance-fallback.cjs [BASE] [OUT] [--lakes a,b]` loads each lake home with USGS, the Corps and NWS blocked
  and again with JavaScript off, at 320 and 430 px, and fails on any "--", "Loading", "unavailable" or
  "NWS not available" in the strip, a gauge lake without a visible timestamp, a missing "No gauge" state, clipped
  text or sideways scroll. Default lakes hoover,alum,knox,pymatuning (USGS, Corps, no gauge, stale gauge).

## Night-rules chip (S5)
* `data/quick-facts.json` `hours` per lake feeds the chip under each lake hero (built by `build-lake-pages.py`, countdown in `js/night-rules.js`, Eastern time). Only from an official city, ODNR, Army Corps or MWCD page, linked as `source`. `fishing_after_hours` is `true` only when the source says so, otherwise `null`. No official hours: `{"none": true, "note": "..."}`; no chip, and the Night rules row says so.
* `check-hours.py` (static, all lakes): every entry parses, has an official https source, and each lake home's chip matches it. `check-night-rules.cjs [BASE] [OUT]` (`NB_LAKES=a,b`): chip above the fold at 390, source link, countdown text, red light and high contrast, plus a mocked NWS storm banner above the fold. `new-lake.py` takes an optional `hours` object (see `new-lake.example.json`).

* `build-hoover-ramps.py [--check]`: Hoover ramp names come from one place, the pins in `js/hoover-map-data.js`. It rewrites the Hoover rows of the water.html Ramp / access table, both log.html Ramp selects and the Hoover `spots` and `spotAliases` in js/lakes.js (between `nb:hoover-ramps` markers). Table notes live in the script. `spotAliases` maps old saved names (Redbank, Walnut Road, Maxtown, Oxbow (upper ramp)) to the official ones, so old trips show the new name without rewriting what was saved. `check-ramp-names.py` (static, in check-all) fails on an old spelling anywhere in site copy, a list out of date with the pins, or a ramp pin without Directions.

## Trip queue (`trip-queue.py`, `check-trip-queue.cjs`)

- Share a trip on /log posts to the nb-trip-queue Worker (https://nb-trip-queue.nightbiteoh.workers.dev, source and notes in `workers/trip-queue/`). Trips wait as pending in KV; nothing is published by the Worker.
- `python3 tools/trip-queue.py list` shows pending trips; `approve ID [--write]` marks one approved (and with `--write` adds it to `data/community-log.json`, not committed); `reject ID` deletes it. The admin token is read from `/home/box/.nightbite/trip-queue-admin-token` (chmod 600) and never printed.
- `node tools/check-trip-queue.cjs <base> [outDir]` (in check-all, about 5 s): CSP allows the Worker, the honeypot is off screen, a blocked queue shows the email/GitHub fallback, then one real trip marked `check: true` with notes "[nb-check] automated test trip" is sent, found pending through the admin list, rejected and confirmed gone. Red light and high contrast keep the status readable. From a local base it sends with the preview's Origin, since the Worker only answers nightbiteoh.com and dr0231.github.io.

## Log backup (`check-log-io.cjs`)

- `node tools/check-log-io.cjs <base> [outDir]` (in check-all, about 10 s, phone width): with nothing saved the trip list is hidden, one line shows, Add a trip is open and Community is hidden (the JSON only has an Example trip); no Example card or dev notes (JSON file names, localStorage, mailto) in the page text. Then it saves two trips through the form plus one old-format trip (no `lake`, ramp "Redbank"), clicks Save a backup (file `night-bite-log-YYYY-MM-DD.json`), clears, opens the file and checks the same trips come back; the old trip shows as "Red Bank ramp" with its saved text kept. Opening it again adds nothing; non-JSON, foreign and bad entries are refused; a bare array merges. The status line is readable in red light and high contrast. It uses its own browser profile and clears it after, so it is safe against live.
- Format and rules: README.md "Log page (dev notes)".

## ODNR contour maps (`build-odnr-contours.py`)

- `python3 tools/build-odnr-contours.py --lake hoover` renders the retained ODNR GeoJSON offline into `assets/maps/hoover-depth-contours.svg` and `.webp`. Add `--download` only when refreshing the raw files in `data/odnr/hoover/`; Pillow is needed for the WebP fallback.
- Written ODNR permission covers Hoover only. Do not add another lake until its permission is confirmed. Keep the ODNR citation, revision/survey dates, units, PDF link and Not for navigation note on the page.

## Languages (`check-i18n.py`, `check-i18n.cjs`, `data/i18n/`)
- Strings: `data/i18n/en.json` is the source (`{"_meta": {"lang", "name", "review"}, "strings": {key: text}}`). Each other language is `data/i18n/<code>.json` with the same keys, `_meta.name` in its own language and `_meta.review: "draft"` until a person reviews it. Add the code and name to `LANGS` in `js/a11y-boot.js` (the picker lists only those) and the file to `PRECACHE` in `sw.js`. Right-to-left languages also set `_meta.dir: "rtl"`.
- Only UI chrome goes in the files: nav, Display panel, glance labels, night-rules chip and weather alert labels, Log form labels, footer. Never lake names, ramp names, species, levels, rules or regulations. `{name}` placeholders (for example `{time} left`) must survive.
- How it applies: `js/a11y-boot.js` sets `<html lang>` from `nb-lang` before paint; `js/a11y.js` loads `js/i18n.js` only when the language isn't English. It swaps text whose English matches a string, inside the chrome scopes listed at the top of `js/i18n.js`, and shows a "Draft translation" marker at the top of `<main>`. A missing key keeps English. Static HTML stays English.
- `python3 tools/check-i18n.py` (static, in check-all): missing keys per language (listed), extra keys, placeholder mismatches, protected words (agencies, weather.gov) dropped, draft flag, files vs `LANGS`, and no lake or ramp names in en.json.
- `node tools/check-i18n.cjs <base> [outDir]` (check-all name `check-i18n-browser`, about 20 s, phone width): Spanish applies from the footer Language button, persists over a reload, keeps lake name, rule chip and numbers, Log labels swap while species and ramps stay English, a missing key falls back to English, the marker reads in red light and high contrast, English restores everything.
