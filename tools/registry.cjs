// The Night Bite: the site's own lake registry and page list, for every tool that needs "all lakes" or "all pages".
// Lakes come from js/lakes.js (the LAKES, ORDER and REGIONS literals, evaluated without a browser) plus
// data/quick-facts.json; pages come from sitemap.xml. Nothing here is hard-coded, so a new lake or page is picked up
// as soon as it is in those files.
//   const R = require('./registry.cjs'); R.lakes(), R.order(), R.home('dow'), R.sitemapPaths()
//   node tools/registry.cjs [--root DIR]     prints {order, lakes, regions, pages} as JSON (used by the Python tools)
//   R.changed('origin/main')  lakes whose files differ from that ref (commits, uncommitted and untracked edits), used by
//                             check-all.py and check-waters.cjs to scope a run when no lakes are named
//   node tools/registry.cjs --changed [REF]   prints {ref, lakes, files, shared} as JSON
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const SITE = 'https://nightbiteoh.com/';

function load(root) {
  root = root || path.join(__dirname, '..');
  const src = fs.readFileSync(path.join(root, 'js', 'lakes.js'), 'utf8');
  const a = src.indexOf('var LAKES = '), b = src.indexOf('var SPECIES = ');
  if (a < 0 || b < 0) throw new Error('registry: LAKES or SPECIES not found in js/lakes.js');
  const box = {};
  vm.runInNewContext(src.slice(a, b) + '\n;out.LAKES = LAKES; out.ORDER = ORDER; out.REGIONS = REGIONS;', { out: box });
  for (const id of box.ORDER) if (!box.LAKES[id]) throw new Error(`registry: ${id} is in ORDER but not in LAKES`);
  for (const id of Object.keys(box.LAKES)) if (!box.ORDER.includes(id)) throw new Error(`registry: ${id} is in LAKES but not in ORDER`);
  let facts = {};
  try { facts = JSON.parse(fs.readFileSync(path.join(root, 'data', 'quick-facts.json'), 'utf8')).lakes; } catch (e) {}
  const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const pages = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].startsWith(SITE) ? m[1].slice(SITE.length) : m[1]);
  return { root, order: box.ORDER, lakes: box.LAKES, regions: box.REGIONS, facts, pages };
}

// Files that differ from REF, mapped to lakes: a path whose folder or file name is a lake id (dow/index.html,
// assets/tiles/dow.png, assets/maps/dow-map.svg). Anything else (css, js, data, shared pages) is listed under shared,
// since it can touch every lake; callers still scope to the named lakes plus hoover and say so.
function changed(ref, root) {
  ref = ref || 'origin/main'; root = root || path.join(__dirname, '..');
  const ids = load(root).order;
  const git = args => { try { return cp.execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return null; } };
  const diff = git(['diff', '--name-only', ref]);
  if (diff === null) return { ref, lakes: [], files: [], shared: [], error: `git diff ${ref} failed (no such ref?)` };
  const files = [...new Set((diff + (git(['ls-files', '--others', '--exclude-standard']) || '')).split('\n').filter(Boolean))].sort();
  const lakes = new Set(), shared = [];
  for (const f of files) {
    const parts = f.split('/'), stem = parts[parts.length - 1].replace(/\..*$/, '');
    const hit = ids.find(id => parts[0] === id || stem === id || stem.startsWith(id + '-'));
    if (hit) lakes.add(hit); else if (!/^(tools|README|LOCAL-NOTES|DATA-SOURCES|SERVICE-WORKER)/.test(f)) shared.push(f);
  }
  return { ref, lakes: ids.filter(id => lakes.has(id)), files, shared };
}

let cache = null;
const get = () => cache || (cache = load(process.env.NB_ROOT));
module.exports = {
  SITE, load, changed: (ref, root) => changed(ref, root || process.env.NB_ROOT),
  order: () => get().order,
  lakes: () => get().lakes,
  facts: () => get().facts,
  sitemapPaths: () => get().pages,                      // '' for the root, 'alum/', 'water', 'species/saugeye' ...
  home: id => id + '/',                                 // every lake home, Hoover too; the site root is the water picker
  noGauge: () => get().order.filter(id => !get().lakes[id].pool || !get().lakes[id].pool.src),
  hasTemp: () => get().order.filter(id => get().lakes[id].pool && get().lakes[id].pool.src === 'usgs' && get().lakes[id].pool.temp),
  isLakeHome: p => get().order.some(id => module.exports.home(id) === p),
};

if (require.main === module) {
  const i = process.argv.indexOf('--root');
  const c = process.argv.indexOf('--changed');
  if (c > 0) {
    const ref = process.argv[c + 1] && !process.argv[c + 1].startsWith('--') ? process.argv[c + 1] : 'origin/main';
    process.stdout.write(JSON.stringify(changed(ref, i > 0 ? process.argv[i + 1] : process.env.NB_ROOT)));
    process.exit(0);
  }
  const r = load(i > 0 ? process.argv[i + 1] : process.env.NB_ROOT);
  process.stdout.write(JSON.stringify({ order: r.order, lakes: r.lakes, regions: r.regions, pages: r.pages }));
}
