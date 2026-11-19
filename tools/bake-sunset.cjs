#!/usr/bin/env node
/**
 * The Night Bite: compute sunset and last light with the same js/astro.js the pages use,
 * so a baked glance cell matches the live value for that date (SunCalc port, not invented data).
 *
 * stdin:  { "date": "2026-11-18", "lakes": [{ "id", "lat", "lng" }, ...] }
 *         date is optional; default is today in America/New_York.
 * stdout: { "<id>": { date, dateLabel, sunset, sunsetValue, sunsetUnit, lastLight, lastLightValue, lastLightUnit } }
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const ctx = { window: {}, Math, Date, Intl };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/astro.js'), 'utf8'), ctx);
const A = ctx.window.NightBiteAstro;
if (!A || !A.sunset || !A.lastLight || !A.etMidnight) {
  console.error('bake-sunset: js/astro.js did not expose NightBiteAstro');
  process.exit(1);
}

function timeEt(d) {
  if (!d) return null;
  const t = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).format(d);
  const m = /^(\d{1,2}:\d{2})\s*([AP]M)$/.exec(t);
  return m ? { value: m[1], unit: m[2] } : { value: t, unit: '' };
}

function ymd(d) {
  const p = {};
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
  return p.year + '-' + p.month + '-' + p.day;
}

function dateLabel(d) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch (e) {
  console.error('bake-sunset: expected JSON on stdin'); process.exit(1);
}
const lakes = input.lakes || [];
let when;
if (input.date && /^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
  const parts = input.date.split('-').map(Number);
  // 17:00 UTC is noon ET in winter and 1 PM ET in summer, always that calendar day.
  when = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 17, 0, 0));
} else {
  when = new Date();
}
const mid = A.etMidnight(when);
const noon = new Date(mid.valueOf() + 12 * 36e5);
const isoDate = ymd(noon);
const label = dateLabel(noon);
const out = {};
for (const lake of lakes) {
  if (!lake || !lake.id || typeof lake.lat !== 'number' || typeof lake.lng !== 'number') {
    console.error('bake-sunset: each lake needs id, lat, lng'); process.exit(1);
  }
  const set = A.sunset(noon, lake.lat, lake.lng);
  const dusk = A.lastLight(noon, lake.lat, lake.lng);
  const s = timeEt(set);
  const dk = timeEt(dusk);
  out[lake.id] = {
    date: isoDate,
    dateLabel: label,
    sunset: s ? s.value + ' ' + s.unit : null,
    sunsetValue: s ? s.value : null,
    sunsetUnit: s ? s.unit : null,
    lastLight: dk ? dk.value + ' ' + dk.unit : null,
    lastLightValue: dk ? dk.value : null,
    lastLightUnit: dk ? dk.unit : null
  };
}
process.stdout.write(JSON.stringify(out));
