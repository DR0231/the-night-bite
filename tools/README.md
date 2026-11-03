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
| `python3 tools/check-all.py` | Builds, then runs every check. Writes one log and exits 1 only on a failure that is not in `tools/known-failures.json` |
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
```

* Checks: check-meta, check-radius, check-docks (report only), check-glance, check-bait, check-waters (every lake unless `--lakes`) and sweep.
* `--skip` leaves checks out.
* A full run takes about 20 minutes. Most of that is check-waters on all 23 lakes.
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

## Other checks and helpers

* `check-meta.py`, `check-radius.py`, `check-docks.py`, `check-glance.cjs`, `check-bait.cjs` and `check-waters.cjs` are each also runnable alone. `NB_ROOT=DIR` points the static checks at another checkout.
* `serve.py --root DIR --port 8642` serves a checkout like GitHub Pages does (clean URLs, a 301 to add the trailing slash, and 404.html for missing pages).
* `indexnow.py` is for live only, after a push.
