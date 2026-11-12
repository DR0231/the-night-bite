// The Night Bite: where the browser checks load Playwright from. Order: the PLAYWRIGHT_CORE environment override,
// then playwright-core installed next to the tools (npm install in tools/, see tools/package.json) or at the repo root,
// then the box's pnpm copy. Usage: const { chromium } = require(require('./playwright-path.cjs'));
const path = require('path');
const BOX = '/usr/local/lib/pnpm/5/.pnpm/playwright-core@1.59.1/node_modules/playwright-core';
function resolve() {
  if (process.env.PLAYWRIGHT_CORE) return process.env.PLAYWRIGHT_CORE;
  try { return require.resolve('playwright-core', { paths: [__dirname, path.join(__dirname, '..')] }); } catch (e) { /* not installed here */ }
  return BOX;
}
module.exports = resolve();
