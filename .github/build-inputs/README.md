# Build inputs (not site files)

GitHub Pages never publishes `.github/`, so files here stay in the repo without being deployed.

* `biting-data.js` (Hoover) and `biting-data-lakes.js` (every other water): the "What's biting now" sources. Edit these,
  then run `python3 tools/biting-split.py`, which writes the per-lake `js/biting/<id>.js` files the site loads.
  Sources for every line are in DATA-SOURCES.md.
* `i18n-tm/<lang>.json`: the translation memory (about 14 MB). `tools/i18n-extract.py` reads it to write the small
  per page files in `data/i18n/pages/`. No browser code fetches it.

`tools/promote.py` carries this folder to live so live's builds can read it too.
