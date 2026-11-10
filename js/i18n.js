/* The Night Bite: interface language (draft translations). No third-party code.
 * js/a11y-boot.js sets <html lang> from localStorage "nb-lang" before paint; js/a11y.js loads this file only when a
 * language other than English is picked. The static HTML stays English (SEO and no-JS unchanged).
 * Strings live in data/i18n/<lang>.json as {"_meta": {...}, "strings": {key: text}}; data/i18n/en.json is the source.
 * Matching is by the English text: inside the UI chrome scopes below, a text node, placeholder, aria-label or
 * data-short that equals an English string (or fits a template such as "{time} left") is swapped for the same key in
 * the picked language. A key missing there keeps the English text. Lake names, ramp names, species, levels, rules and
 * regulations are never in the string files, so they always stay as the source publishes them.
 * Right to left (ar, ur, fa: _meta.dir "rtl"): <html dir="rtl">, {time} values wrapped in Unicode isolates, and the
 * fact elements in LTR (numbers, lake and ramp names, the rule chip, untranslated options) get dir="ltr" while they hold
 * no RTL script; any left-to-right language, English included, removes it again.
 * Page UI (S10): <main> is walked too, so headings, labels, buttons, fold summaries, glance subs and status lines swap
 * when their whole text node equals an English string. In <main> only exact strings and the "pg." templates apply (a
 * looser template could catch a prose line), and h1 (titles stay as they are), .cond-summary (NWS forecast words) and
 * anything inside [data-nb-keep] are never touched. Long-form prose has no key, so it stays English.
 * S11: dates in <time datetime="YYYY-MM-DD"> inside <main> are written in the picked language (Intl); "cmp." keys
 * (compass words) apply only to a captured template value ("mph {dir}"), never to a whole text node; a text node that
 * starts with ": " or ends with "Source:" / "Live level:" is matched without that piece and the piece added back
 * translated; [data-nb-rule] (rule lines, translated as drafts) gets a small note pointing to the linked official source.
 * S12: every other line on a page comes from data/i18n/pages/<page>.en.json and <page>.<lang>.json, written by
 * tools/i18n-extract.py from the built HTML and the translation memory data/i18n/tm/<lang>.json. Shared keys win.
 * S13: text the scripts write after load goes through the pg.* templates; any {value} or whole text node that is an
 * Ohio clock time ("5:27 PM Wed", "9 PM", "Nov. 2, 5 PM ET") is rewritten with Intl, a value cell split as "5:27" +
 * <span class="cond-unit">PM Wed</span> is read as one time, and <time datetime> holding a full ISO instant (the
 * glance stamp) is written with Intl in Ohio time. Units (°F, %, inHg, ft) and every number stay as written.
 */
(function (d) {
  var SCOPES = ".site-header, .site-footer, .glance, #glance-actions, .a11y-panel, .night-chip, .nws-alert, #my-trips, #add-trip, [data-log-filter], .i18n-draft, .spy-label, a.sr-only[href$=\"#main\"], .install-tip";
  var ATTRS = ["placeholder", "aria-label", "data-short", "title", "alt"];
  var LTR = ".glance-value, .glance-sub, .glance-stamp, .lake-pill-name, .night-chip-text, main h1, .site-header option, #add-trip option, #my-trips option, [data-log-filter] option, .i18n-draft-en";
  var WIDE = "main, dialog:not(.a11y-panel)", KEEP = "h1, .cond-summary, [data-nb-keep]";
  var RTLSCRIPT = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff]/;
  function rtl() { return d.documentElement.dir === "rtl"; }
  var me = d.currentScript, BASE = me ? me.src : location.href;
  var cache = {}, orig = new WeakMap(), attrOrig = new WeakMap(), cur = "en", tbl = null, obs = null, busy = false;
  function load(lang) {
    if (cache[lang]) return cache[lang];
    cache[lang] = fetch(new URL("../data/i18n/" + lang + ".json", BASE).href, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function () { delete cache[lang]; return { _meta: { lang: lang }, strings: {} }; });
    return cache[lang];
  }
  // S12: each page also has its own lines in data/i18n/pages/<page>.<lang>.json (tools/i18n-extract.py)
  function pageId() {
    var root = new URL("../", BASE).pathname, p = location.pathname;
    p = (p.indexOf(root) === 0 ? p.slice(root.length) : p.replace(/^\//, "")).replace(/index\.html$/, "").replace(/\.html$/, "").replace(/\/$/, "");
    return !p ? "index" : p.replace(/\//g, "-").replace(/^species-$/, "species");
  }
  var pcache = {};
  function loadPage(lang, id) {
    var k = (id || pageId()) + "." + lang;
    if (pcache[k]) return pcache[k];
    pcache[k] = fetch(new URL("../data/i18n/pages/" + k + ".json", BASE).href, { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.json() : { strings: {} }; })
      .catch(function () { delete pcache[k]; return { strings: {} }; });
    return pcache[k];
  }
  // S13: times the scripts write in English ("5:27 PM Wed", "9 PM", "Tue 9:40 PM ET", "Nov. 2, 5 PM ET") are read
  // back and written with Intl in the picked language; the clock value itself never changes (always Ohio time)
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var TRE = /^(?:(Sun|Mon|Tue|Wed|Thu|Fri|Sat) )?(?:(Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec)\.? (\d{1,2}), )?(\d{1,2})(?::(\d{2}))? ?([AP]M)(?: (Sun|Mon|Tue|Wed|Thu|Fri|Sat))?( ET)?$/;
  function tparse(v) {
    var m = TRE.exec(norm(v)); if (!m) return null;
    var h = +m[4] % 12 + (m[6] === "PM" ? 12 : 0), day = m[1] || m[7], mon = m[2] ? MONS.indexOf(m[2].slice(0, 3)) : -1;
    // a fixed week (Nov 1 2026 is a Sunday) carries the weekday; a month and day carry themselves
    var dt = mon >= 0 ? Date.UTC(2026, mon, +m[3], h, +(m[5] || 0)) : Date.UTC(2026, 10, 1 + (day ? DAYS.indexOf(day) : 0), h, +(m[5] || 0));
    return { at: dt, min: m[5] != null, day: !!day, date: mon >= 0, et: !!m[8] };
  }
  function tfmt(p, parts) {
    try {
      var o = { timeZone: "UTC", hour: "numeric" }; if (p.min || p.date) o.minute = "2-digit";
      var t = new Intl.DateTimeFormat(cur, o).format(p.at), x = "";
      if (p.date) x = new Intl.DateTimeFormat(cur, { timeZone: "UTC", month: "short", day: "numeric" }).format(p.at);
      else if (p.day) x = new Intl.DateTimeFormat(cur, { timeZone: "UTC", weekday: "short" }).format(p.at);
      if (parts) return { t: t, x: x };
      return (p.date ? x + ", " + t : p.day ? x + " " + t : t) + (p.et ? " ET" : "");
    } catch (e) { return null; }
  }
  function timeT(v) { var p = tparse(v); return p ? tfmt(p) : null; }
  // a value cell written as "5:27" + <span class="cond-unit">PM Wed</span>: both nodes are read together
  var UNIT = ".cond-unit, .glance-unit";
  function enOf(n) { return n && n.nodeType === 3 ? (orig.has(n) && n.nodeValue === n.__nbOut ? orig.get(n) : n.nodeValue) : null; }
  function split(node, en) {
    var p = node.parentNode, num, unit, isUnit = false;
    if (p.matches && p.matches(UNIT)) { isUnit = true; num = enOf(p.previousSibling); unit = en; }
    else { var nx = node.nextSibling; if (!nx || !nx.matches || !nx.matches(UNIT)) return null; num = en; unit = enOf(nx.firstChild); }
    if (num == null || unit == null || !/^\d{1,2}(:\d{2})?$/.test(norm(num)) || !/^[AP]M( \w{3})?$/.test(norm(unit))) return null;
    var q = tparse(norm(num) + " " + norm(unit)); if (!q) return null;
    var r = tfmt(q, true); if (!r) return null;
    // the day sits in its own element: keep a real space before it so copied/read text never joins ("17:27mié")
    return isUnit ? (r.x ? (/^\s/.test(en) ? "" : " ") + r.x : "\u200b") : r.t;
  }
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function norm(s) { return s.replace(/\s+/g, " ").trim(); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function build(en, tr) {
    var exact = {}, tpl = [], cap = {};
    Object.keys(en).forEach(function (k) {
      var e = norm(en[k]);
      if (k.indexOf("cmp.") === 0) { cap[e] = k; return; }
      if (/\{\w+\}/.test(e)) {
        var names = [], re = "^" + esc(e).replace(/\\\{(\w+)\\\}/g, function (m, n) { names.push(n); return /^num/.test(n) ? "(\\d[\\d.,]*)" : /^unit/.test(n) ? "(mph)" : "(.+?)"; }) + "$";   // {num}: digits only, so prose never lands in the slot
        tpl.push({ k: k, re: new RegExp(re), names: names });
      } else if (!(e in exact)) exact[e] = k;
    });
    return { exact: exact, tpl: tpl, tr: tr, cap: cap };
  }
  var TAILS = ["Source:", "Live level:"];
  function lookup(t, s, wide) {
    var n = norm(s); if (!n) return null;
    var r = lookup1(t, n, wide); if (r == null) r = listT(t, n); if (r != null || !wide) return r;
    // ": The city lists ... Source:" (text between a <time> and a link): peel the joins, translate the middle
    var pre = "", post = "", m0 = n.match(/^([:;,.]\s*)(.+)$/);
    if (m0) { pre = m0[1].trim() + " "; n = m0[2]; }
    for (var i = 0; i < TAILS.length; i++) {
      var tl = TAILS[i];
      if (n.length > tl.length && n.slice(-tl.length) === tl) { var tt = t.tr[t.exact[tl]]; post = " " + (tt != null ? tt : tl); n = n.slice(0, -tl.length).trim(); break; }
    }
    if (!pre && !post) return null;
    if (pre && !post && !n) return null;
    r = n ? lookup1(t, n, wide) : "";
    return r == null ? null : (pre + r + post).replace(/^\s+/, pre ? "" : "");
  }
  // a line the scripts join from parts ("After dark now, SE wind 12 mph, 4% rain chance."): every part must match
  // a string or pg.* template on its own, or the line stays English; joined with the language's own comma
  function listT(t, n) {
    var end = /\.$/.test(n), bits = (end ? n.slice(0, -1) : n).split(", "), out = [];
    if (bits.length < 2) return null;
    for (var i = 0; i < bits.length; i++) {
      var b = bits[i], r = lookup1(t, b, true, true);
      if (r == null && i === 0) r = lookup1(t, b.charAt(0).toLowerCase() + b.slice(1), true, true);
      if (r == null || r === b) return null;
      out.push(r);
    }
    var cjk = cur === "ja" || cur === "zh", sep = cur === "ja" ? "\u3001" : cur === "zh" ? "\uff0c" : /^(ar|fa|ur)$/.test(cur) ? "\u060c " : ", ";
    var s = out.join(sep); s = s.charAt(0).toUpperCase() + s.slice(1);
    return s + (end ? (cjk ? "\u3002" : cur === "hi" ? "\u0964" : cur === "ur" ? "\u06d4" : ".") : "");
  }
  // a captured value: compass words first ("SE"; "NNE" = N + NE), then any exact or page string
  function capT(t, v) {
    var c = function (x) { var k = t.cap[x]; return k && t.tr[k] != null ? t.tr[k] : null; };
    var r = c(v); if (r != null) return r;
    r = timeT(v); if (r != null) return r;
    if (/^[NSEW]{3}$/.test(v) && c(v[0]) != null && c(v.slice(1)) != null) return c(v[0]) + c(v.slice(1));
    return lookup1(t, v, true, true);
  }
  function lookup1(t, n, wide, part) {
    var k = t.exact[n];
    if (k) return t.tr[k] != null ? t.tr[k] : null;
    for (var i = 0; i < t.tpl.length; i++) {
      if (wide && t.tpl[i].k.indexOf("pg.") !== 0 && !(part && t.tpl[i].k.indexOf("pl.") === 0)) continue;
      if (!part && t.tpl[i].k.indexOf("pl.") === 0) continue;
      var m = n.match(t.tpl[i].re); if (!m) continue;
      var out = t.tr[t.tpl[i].k]; if (out == null) return null;
      // a captured part can be a string too ("2 hours ago", "steady"); names and numbers match nothing and stay
      t.tpl[i].names.forEach(function (nm, j) { var v = m[j + 1], vt = capT(t, norm(v)); if (vt != null) v = vt; out = out.split("{" + nm + "}").join(rtl() ? "\u2068" + v + "\u2069" : v); });
      return out;
    }
    return monthT(n);
  }
  // S13: "November" (biting card) and "Hoover, November" (species heading, js/species-lake.js): the lake stays, the month is written with Intl
  var LMON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function monthT(n) {
    var m = /^(?:(.+), )?(January|February|March|April|May|June|July|August|September|October|November|December)$/.exec(n);
    if (!m) return timeT(n);
    try {
      var mo = new Intl.DateTimeFormat(cur, { timeZone: "UTC", month: "long" }).format(Date.UTC(2026, LMON.indexOf(m[2]), 15));
      var sep = cur === "ja" ? "\u3001" : cur === "zh" ? "\uff0c" : /^(ar|fa|ur)$/.test(cur) ? "\u060c " : ", ";
      if (!m[1]) return mo;
      return (rtl() ? "\u2068" + m[1] + "\u2069" : m[1]) + sep + mo;
    } catch (e) { return null; }
  }
  function walk(root, wide) {
    var w = d.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function (node) {
      var p = node.parentNode; if (!p || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.nodeName)) return;
      if (wide && p.closest && (p.closest(KEEP) || p.closest(SCOPES))) return;
      // its own script rewrote the text since we swapped it (a countdown, a state): the new text is the English now
      if (orig.has(node) && node.nodeValue !== node.__nbOut) orig.delete(node);
      var en = orig.has(node) ? orig.get(node) : node.nodeValue;
      if (!norm(en)) return;
      var out = cur === "en" ? null : split(node, en), want;
      if (out == null && cur !== "en") out = lookup(tbl, en, wide);
      if (out != null) { want = en.match(/^\s*/)[0] + out + en.match(/\s*$/)[0]; orig.set(node, en); node.__nbOut = want; }
      else { want = en; orig.delete(node); }
      if (node.nodeValue !== want) node.nodeValue = want;
      // scripts that parse this text (the pool line) read the English back from data-en while data-nb-out still matches
      if (p.id === "correction-line") { if (out != null) { p.setAttribute("data-en", en); p.setAttribute("data-nb-out", p.textContent); } else { p.removeAttribute("data-en"); p.removeAttribute("data-nb-out"); } }
    });
    var els = root.querySelectorAll ? [root].concat([].slice.call(root.querySelectorAll("[" + ATTRS.join("],[") + "]"))) : [];
    els.forEach(function (el) {
      if (!el.getAttribute) return;
      var o = attrOrig.get(el) || {};
      ATTRS.forEach(function (a) {
        if (!el.hasAttribute(a)) return;
        if (wide && el.closest && (el.closest(KEEP) || el.closest(SCOPES))) return;
        var cv = el.getAttribute(a); if (a in o && cv !== o["~" + a]) delete o[a];   // a script set new English since our last write
        var en = a in o ? o[a] : cv, out = cur === "en" ? null : lookup(tbl, en, wide);
        if (out != null) { o[a] = en; o["~" + a] = out; if (cv !== out) el.setAttribute(a, out); } else if (a in o) { el.setAttribute(a, o[a]); delete o[a]; }
      });
      attrOrig.set(el, o);
    });
  }
  function scopes() { return [].slice.call(d.querySelectorAll(SCOPES)); }
  // facts stay left to right inside an RTL page (like <bdi dir="ltr">); only elements this file marked are reset
  function isolate() {
    var on = rtl();
    [].slice.call(d.querySelectorAll(LTR + ", [data-nb-ltr]")).forEach(function (el) {
      var t = el.textContent || "", want = on && norm(t) && !RTLSCRIPT.test(t);
      if (want && !el.hasAttribute("dir")) { el.setAttribute("dir", "ltr"); el.setAttribute("data-nb-ltr", ""); }
      else if (!want && el.hasAttribute("data-nb-ltr")) { el.removeAttribute("dir"); el.removeAttribute("data-nb-ltr"); }
    });
  }
  var dateOrig = new WeakMap();
  function dates() {
    [].slice.call(d.querySelectorAll("main time[datetime], dialog time[datetime], .glance time[datetime], .night-chip time[datetime], .nws-alert time[datetime], #my-trips time[datetime]")).forEach(function (el) {
      var dt = el.getAttribute("datetime"), full = /^\d{4}-\d{2}-\d{2}T/.test(dt);
      if ((!/^\d{4}-\d{2}-\d{2}$/.test(dt) && !full) || el.children.length) return;
      // a script rewrote it since (a new reading): that text is the English now
      if (dateOrig.has(el) && el.textContent !== el.__nbOut) dateOrig.delete(el);
      if (!dateOrig.has(el)) dateOrig.set(el, el.textContent);
      var want = dateOrig.get(el);
      if (cur !== "en") { try {
        if (full) {
          // "(Nov. 2, 5 PM ET)": an instant, shown in Ohio time like the English, brackets and "ET" kept
          var en0 = want, at = new Date(dt), body = new Intl.DateTimeFormat(cur, { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(at);
          if (isFinite(at)) want = (/^\s*\(/.test(en0) ? "(" : "") + body + (/ET\)?\s*$/.test(en0) ? " ET" : "") + (/\)\s*$/.test(en0) ? ")" : "");
        } else { var p = dt.split("-"); want = new Intl.DateTimeFormat(cur, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
      } catch (e) {} }
      el.__nbOut = want;
      if (el.textContent !== want) el.textContent = want;
    });
  }
  function rules() {
    [].slice.call(d.querySelectorAll("[data-nb-rule]")).forEach(function (el) {
      var n = el.querySelector(":scope > .i18n-rule-note"), txt = cur !== "en" && tbl.tr["pg.rule_note"];
      if (!txt) { if (n) n.remove(); return; }
      if (!n) { n = d.createElement("span"); n.className = "i18n-rule-note"; el.appendChild(n); }
      if (n.textContent !== txt) n.textContent = txt;
    });
  }
  // S13 final: a dock note with <time> children is one line in docklist, but the walk sees it in pieces; match it whole
  function wholeNotes() {
    [].slice.call(d.querySelectorAll(".dock-note")).forEach(function (el) {
      if (el.__nbHtml == null) { if (!el.querySelector("time")) return; el.__nbHtml = el.innerHTML; el.__nbEn = norm(el.textContent); }
      if (cur === "en") { if (el.__nbOut != null && el.textContent === el.__nbOut) el.innerHTML = el.__nbHtml; el.__nbOut = null; return; }
      if (el.__nbOut != null && el.textContent === el.__nbOut) return;
      var out = lookup(tbl, el.__nbEn, true);
      if (out != null) { el.textContent = out; el.__nbOut = el.textContent; }
    });
  }
  function run() { if (busy) return; busy = true; try { wholeNotes(); scopes().forEach(function (r) { walk(r); }); [].slice.call(d.querySelectorAll(WIDE)).forEach(function (r) { walk(r, true); }); dates(); rules(); isolate(); } finally { busy = false; } }
  function marker(meta) {
    var m = d.getElementById("i18n-draft");
    if (cur === "en") { if (m) m.remove(); return; }
    if (!m) {
      m = d.createElement("p"); m.id = "i18n-draft"; m.className = "i18n-draft"; m.setAttribute("role", "note");
      var tag = d.createElement("span"); tag.className = "i18n-draft-tag";
      var txt = d.createElement("span"); txt.className = "i18n-draft-text";
      var tagEn = d.createElement("span"); tagEn.className = "i18n-draft-en";
      tag.appendChild(d.createElement("span")).className = "i18n-draft-tr"; tag.appendChild(tagEn);
      m.appendChild(tag); m.appendChild(d.createTextNode(" ")); m.appendChild(txt);
      var main = d.querySelector("main"); if (main) main.insertBefore(m, main.firstChild); else d.body.insertBefore(m, d.body.firstChild);
    }
    // always shows the English words too, so anyone can tell this is a draft
    m.querySelector(".i18n-draft-tr").textContent = tbl.tr["i18n.draft"] ? tbl.tr["i18n.draft"] + " " : "";
    m.querySelector(".i18n-draft-en").textContent = tbl.tr["i18n.draft"] ? "(Draft translation)" : "Draft translation";
    m.querySelector(".i18n-draft-text").textContent = tbl.tr["i18n.facts_note"] || "";
    m.dataset.review = (meta && meta.review) || "draft";
  }
  function set(lang) {
    lang = lang || "en";
    return Promise.all([load("en"), lang === "en" ? null : load(lang)]).then(function (r0) {
      // only pages listed in _meta.pages have their own file (no 404s, nothing for the service worker to wait on)
      var has = lang !== "en" && r0[1] && r0[1]._meta && (r0[1]._meta.pages || []).indexOf(pageId()) >= 0;
      // S13: lines the scripts fill in from data (the "What's biting" cards) live in one shared "js" page file
      var js = lang !== "en" && r0[1] && r0[1]._meta && (r0[1]._meta.pages || []).indexOf("js") >= 0;
      var mp = lang !== "en" && r0[1] && r0[1]._meta && (r0[1]._meta.pages || []).indexOf("map") >= 0;
      var dk = lang !== "en" && r0[1] && r0[1]._meta && (r0[1]._meta.pages || []).indexOf("docklist") >= 0 && !!d.querySelector(".docks-lake, .dock-status");
      return Promise.all([r0[0], r0[1], has ? loadPage("en") : null, has ? loadPage(lang) : null, js ? loadPage("en", "js") : null, js ? loadPage(lang, "js") : null,
        mp ? loadPage("en", "map") : null, mp ? loadPage(lang, "map") : null, dk ? loadPage("en", "docklist") : null, dk ? loadPage(lang, "docklist") : null]);
    }).then(function (r) {
      cur = lang;
      var S = function (x) { return (x && x.strings) || {}; };
      tbl = build(merge(merge(merge(merge(S(r[8]), S(r[6])), S(r[4])), S(r[2])), S(r[0])), merge(merge(merge(merge(S(r[9]), S(r[7])), S(r[5])), S(r[3])), S(r[1])));
      var A = window.NB_A11Y, dir = (r[1] && r[1]._meta && r[1]._meta.dir) || (A && A.RTL && A.RTL[lang] ? "rtl" : "ltr");
      d.documentElement.lang = lang; d.documentElement.dir = lang === "en" ? "ltr" : dir;
      if (lang === "en") d.documentElement.removeAttribute("data-lang"); else d.documentElement.setAttribute("data-lang", lang);
      marker(r[1] && r[1]._meta);
      run();
      if (!obs && window.MutationObserver) {
        obs = new MutationObserver(function () { if (!busy && cur !== "en") { clearTimeout(obs.t); obs.t = setTimeout(run, 30); } });
        obs.observe(d.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
      }
      d.dispatchEvent(new CustomEvent("nb-lang", { detail: { lang: lang } }));
      return lang;
    });
  }
  window.NB_I18N = { set: set, load: load, current: function () { return cur; } };
  var saved = window.NB_A11Y && NB_A11Y.lang ? NB_A11Y.lang() : "en";
  if (saved !== "en") set(saved);
})(document);
