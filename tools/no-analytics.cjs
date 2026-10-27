// The Night Bite: keep our own headless and test runs out of Cloudflare Web Analytics.
// Use in every Playwright script that opens the site (preview or live):
//   const NA = require('/workspace/night-bite-preview/tools/no-analytics.cjs');
//   const browser = await chromium.launch({ ...opts, args: NA.args(opts.args) });
//   const ctx = await browser.newContext({...}); await NA.block(ctx);
// Two layers: Chrome never resolves the analytics hosts (--host-resolver-rules), and any request that still
// gets out is aborted (route). The box also blocks both hosts in /etc/hosts and in Chrome's managed policy.
const HOSTS = ['static.cloudflareinsights.com', 'cloudflareinsights.com'];
const RULE = '--host-resolver-rules=' + HOSTS.map(h => 'MAP ' + h + ' ~NOTFOUND').join(', ');
const PATTERN = /^https?:\/\/([a-z0-9-]+\.)*cloudflareinsights\.com\//i;
function args(extra) { return (extra || []).filter(a => !/^--host-resolver-rules=/.test(a)).concat(RULE); }
async function block(target) { await target.route(PATTERN, r => r.abort('blockedbyclient')); return target; }
module.exports = { HOSTS, RULE, PATTERN, args, block };
