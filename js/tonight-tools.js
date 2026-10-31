/**
 * The Night Bite: two buttons under the home "Tonight at a glance" strip.
 *
 * Share tonight: draws a 1200x630 PNG on the phone (canvas) from what the page already shows, leading with what anglers
 * check first: wind and gusts, air and feels like, sky and rain chance (NWS forecast), any NWS watch or warning, sunset,
 * moonrise and moon (worked out on the phone), water temp where the lake has a public temp gauge, and the top 3 "biting
 * now" picks from the site's monthly notes. Lake level and the bite rating stay, smaller. Missing values print as "--".
 * No URL and no source footer on the image; the sources are listed in the dialog under it. Shares the PNG with the Web Share API where
 * the browser can share files, otherwise offers a download. Nothing leaves the phone unless you share it.
 *
 * Remind me: any time of day from a wheel picker (hour, 5 minute steps, AM/PM) or the Sunset button. No push server, so it is honest about what a web app can do:
 *   1. Add to calendar: a .ics file with an alarm at the chosen time. Works everywhere, app open or not.
 *   2. Notify on this phone: asks notification permission, then
 *      · where the browser supports Notification Triggers (TimestampTrigger), schedules it with the service worker,
 *        so it can go off with the app closed;
 *      · otherwise keeps a timer while The Night Bite is open, and fires it late (up to an hour) if you reopen
 *        the app after the time passed. Phones often pause web apps in the background, so this is best effort.
 *   No third-party push service, no server, nothing stored outside localStorage on the phone.
 */
(function () {
  var row = document.getElementById("glance-actions");
  var LK = window.NightBiteLake, LS = window.NightBiteLakes;
  if (!row || !LK || !LS) return;
  var cfg = LK.cfg, lakeName = cfg.name;
  var home = LS.homeFor ? LS.homeFor(LK.id) : location.href.split("#")[0];
  var REMIND_KEY = "nb-remind";
  row.hidden = false;

  function $(s, r) { return (r || document).querySelector(s); }
  function txt(s) { var n = $(s); return n ? n.textContent.replace(/\s+/g, " ").trim() : ""; }
  function etNow() {
    try { return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date()) + " ET"; }
    catch (e) { return new Date().toLocaleString(); }
  }
  function etDate() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }

  /* ------------------------------------------------------------------ share card ------------------------------------------------------------------ */
  // what anglers check first, read from what this page already shows; anything missing prints as "--"
  var DASH = "--";
  function cond(key) {
    var c = $('[data-cond="' + key + '"]');
    if (!c || c.hasAttribute("data-empty") || c.hasAttribute("data-noreading")) return null;
    var v = $(".cond-value", c), u = v && $(".cond-unit", v), s = $(".cond-sub", c);
    if (!v) return null;
    var unit = u ? u.textContent.trim() : "";
    var val = v.textContent.replace(unit, "").replace(/\s+/g, " ").trim();
    if (!val) return null;
    return { v: val, u: unit, sub: s ? s.textContent.replace(/\s+/g, " ").trim() : "" };
  }
  function etShort(iso) {
    var d = new Date(iso);
    if (!iso || isNaN(d.valueOf())) return "";
    try { return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" }).format(d); }
    catch (e) { return ""; }
  }
  function monthEt() {
    try { return parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "numeric" }).format(new Date()), 10) - 1; }
    catch (e) { return new Date().getMonth(); }
  }
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  // "What's biting now" data is not on the home page, so load the lake's file (already in the offline cache) on demand
  function bitingData() {
    var key = window.NightBiteLakes ? window.NightBiteLakes.bitingVar(LK.id) : "NightBiteBiting";
    if (window[key]) return Promise.resolve(window[key]);
    return new Promise(function (ok) {
      var sc = document.createElement("script");
      sc.src = LS.base + (key === "NightBiteBiting" ? "js/biting-data.js" : "js/biting-data-lakes.js");
      sc.onload = function () { ok(window[key] || null); };
      sc.onerror = function () { ok(null); };
      document.head.appendChild(sc);
    });
  }
  function readings(bite) {
    var r = {};
    var w = cond("wind");
    if (w) {
      var dir = w.u.replace(/^mph\s*/i, "");
      r.wind = w.v === "Calm" ? "Calm" : (dir && dir !== "Var" ? dir + " " : dir === "Var" ? "Var " : "") + w.v + " mph";
      var g = /gusts (\d+)/i.exec(w.sub);
      r.windSub = g ? "Gusts " + g[1] + " mph" : "No higher gusts";
    } else { r.wind = DASH; r.windSub = "Gusts " + DASH; }
    var a = cond("air");
    r.air = a ? a.v + (a.u || "") : DASH;
    var fl = a && /Feels like (-?\d+)/i.exec(a.sub);
    r.airSub = "Feels like " + (fl ? fl[1] + "\u00b0" : DASH);
    var sky = txt("#conditions .cond-summary");
    r.sky = sky.replace(/\.$/, "") || DASH;
    var rain = cond("rain");
    r.rain = "Rain " + (rain ? rain.v + (rain.u || "") : DASH) + ", next 12 h";
    var storm = $("#conditions .cond-storm");
    r.storm = storm && !storm.hidden && storm.textContent.trim() ? storm.textContent.trim().split(".")[0] : "";
    var al = window.NightBiteAlertsActive;
    if (!al) r.alert = { text: "NWS alerts: " + DASH, on: false };
    else if (!al.length) r.alert = { text: "No NWS watches or warnings", on: false };
    else {
      var u = etShort(al[0].until);
      r.alert = { text: "NWS " + al[0].event + (u ? " until " + u + " ET" : "") + (al.length > 1 ? " (+" + (al.length - 1) + " more)" : ""), on: true };
    }
    var ss = cond("sunset"), mr = cond("moonrise"), mo = cond("moon");
    r.sunset = ss ? ss.v + (ss.u ? " " + ss.u : "") : DASH;
    r.moonrise = "Moonrise " + (mr ? mr.v + (mr.u ? " " + mr.u : "") : DASH);
    var lit = mo && /(\d+)% lit/.exec(mo.sub);
    r.moon = mo ? mo.v + (lit ? ", " + lit[1] + "% lit" : "") : "Moon " + DASH;
    // water temp: only where the lake has a public temp gauge (cfg.pool.temp); never guessed
    var hasTemp = !!(cfg.pool && cfg.pool.temp);
    var t = hasTemp && /(-?\d+)\s*\u00b0F/.exec(txt("#correction-line"));
    r.water = t ? t[1] + "\u00b0F" : DASH;
    r.waterSub = !hasTemp ? "No public temp gauge" : t ? (cfg.pool.srcName || "") + " lake gauge" : "No reading right now";
    // lake level and bite rating, kept but smaller
    var poolCell = $('[data-glance="pool"]'), biteCell = $('[data-glance="bite"]');
    var poolOk = poolCell && !poolCell.closest(".glance-cell").hasAttribute("data-empty");
    var biteOk = biteCell && !biteCell.closest(".glance-cell").hasAttribute("data-empty");
    r.level = poolOk ? txt('[data-glance="pool"]') : DASH;
    r.levelSub = poolOk ? txt('[data-glance="pool-sub"]') : (cfg.pool && !cfg.pool.src ? "No public gauge" : "");
    r.bite = biteOk ? txt('[data-glance="bite"]') : DASH;
    // biting now: top 3 picks for this month from the site's notes
    var m = monthEt(), picks = bite && bite.months && bite.months[m] ? bite.months[m].picks : [];
    r.biting = (picks || []).slice(0, 3).map(function (p) { return (LS.speciesNames && LS.speciesNames[p.id]) || p.id; });
    r.month = MONTHS[m];
    // sources, for the text under the card (not on the image)
    var checked = txt("#correction-checked time");
    var cm = /Checked (\d{1,2}:\d{2} [AP]M) ET/.exec(txt("#conditions .cond-status"));
    r.src = [
      "Weather: NWS forecast" + (cm ? ", checked " + cm[1] + " ET" : ", not loaded") + ". Alerts: NWS.",
      "Sunset, moonrise and moon: worked out on this phone.",
      (cfg.pool && !cfg.pool.src ? "Level: no public gauge on this lake." :
      "Level" + (hasTemp ? " and water temp" : "") + ": " + (cfg.pool && cfg.pool.srcName ? cfg.pool.srcName + " gauge" : "gauge") + (poolOk && checked ? ", checked " + checked : poolOk ? "" : ", no reading") + "."),
      "Biting now: this site\u2019s " + MONTHS[m] + " notes (typical patterns, not a report). Bite: rule of thumb from the NWS forecast."
    ].join(" ");
    r.date = (function () { try { return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date()) + " ET"; } catch (e) { return ""; } })();
    return r;
  }
  function img(src) {
    return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; });
  }
  // shrink to fit, down to a floor; past the floor, trim with an ellipsis so text never runs out of its box
  function fit(ctx, text, max, size, family, floor) {
    var s = size, f = floor || 22;
    for (;;) { ctx.font = family.replace("{s}", s); if (ctx.measureText(text).width <= max || s <= f) break; s -= 1; }
    if (ctx.measureText(text).width <= max) return text;
    var t = text;
    while (t.length > 1 && ctx.measureText(t + "\u2026").width > max) t = t.slice(0, -1);
    return t.replace(/\s+$/, "") + "\u2026";
  }
  function draw() {
    var W = 1200, H = 630;
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var ctx = c.getContext("2d");
    var fonts = document.fonts && document.fonts.load ? Promise.all([
      document.fonts.load('44px "Night Bite Pixel"'), document.fonts.load('600 44px "Source Serif 4"'), document.fonts.load('28px "Source Serif 4"')
    ]).catch(function () {}) : Promise.resolve();
    return Promise.all([fonts, img(LS.base + "assets/lantern.svg"), bitingData()]).then(function (a) {
      var lantern = a[1], r = readings(a[2]);
      var NAVY = "#0a1628", MID = "#122038", LIGHT = "#1a2e4a", AMBER = "#f0a830", CREAM = "#f5edd8", CREAM2 = "#e8d5a3", MUTED = "#8a9aaa";
      var HEAD = '{s}px "Night Bite Pixel", "Pixelify Sans", monospace';
      var SERIF = '{s}px "Source Serif 4", Georgia, serif', SERIF6 = '600 {s}px "Source Serif 4", Georgia, serif';
      function F(f, s) { return f.replace("{s}", s); }
      function text(t, x, y, font, color, max, floor, right) {
        var size = +/(\d+)px/.exec(font)[1], fam = font.replace(/\d+px/, "{s}px");
        var out = max ? fit(ctx, t, max, size, fam, floor) : (ctx.font = font, t);
        ctx.fillStyle = color;
        ctx.fillText(out, right ? x - ctx.measureText(out).width : x, y);
      }
      ctx.fillStyle = NAVY; ctx.fillRect(0, 0, W, H);
      ctx.textBaseline = "alphabetic";
      // header: brand (the only pixel text) and the lake, big
      if (lantern) { ctx.imageSmoothingEnabled = false; ctx.drawImage(lantern, 48, 34, 44, 56); }
      text("The Night Bite", 108, 80, F(HEAD, 40), CREAM);
      text(lakeName, W - 48, 70, F(SERIF6, 40), AMBER, 640, 30, true);
      text(r.date, W - 48, 104, F(SERIF, 26), CREAM2, 640, 22, true);
      // NWS alert line
      var ay = 124;
      ctx.fillStyle = r.alert.on ? AMBER : MID; ctx.fillRect(48, ay, W - 96, 50);
      text((r.alert.on ? "\u26a0 " : "") + r.alert.text, 68, ay + 35, F(SERIF6, 28), r.alert.on ? NAVY : CREAM2, W - 136, 22);
      // six tiles
      var TW = 357, TH = 176, GX = 16, x0 = 48, y0 = 190, PAD = 24;
      function tile(i, label, value, subs, opt) {
        var x = x0 + (i % 3) * (TW + GX), y = y0 + Math.floor(i / 3) * (TH + 14);
        ctx.fillStyle = MID; ctx.fillRect(x, y, TW, TH);
        ctx.fillStyle = LIGHT; ctx.fillRect(x, y, TW, 3);
        ctx.font = F(SERIF6, 24);
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "2px";
        text(label.toUpperCase(), x + PAD, y + 40, F(SERIF6, 24), CREAM2);
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "0px";
        if (opt && opt.list) {
          if (!value.length) text(DASH, x + PAD, y + 92, F(SERIF6, 46), MUTED);
          value.forEach(function (n, k) { text(n, x + PAD, y + 82 + k * 38, F(SERIF6, 32), AMBER, TW - 2 * PAD, 24); });
          return;
        }
        text(value, x + PAD, y + 92, F(SERIF6, opt && opt.vs || 46), value === DASH ? MUTED : CREAM, TW - 2 * PAD, 28);
        (subs || []).forEach(function (s, k) {
          if (!s) return;
          var hot = typeof s === "object";
          text(hot ? s.t : s, x + PAD, y + 128 + k * 34, F(hot ? SERIF6 : SERIF, 27), hot ? AMBER : CREAM2, TW - 2 * PAD, 22);
        });
      }
      tile(0, "Wind", r.wind, [r.windSub]);
      tile(1, "Air", r.air, [r.airSub]);
      tile(2, "Sky", r.sky, [r.rain, r.storm ? { t: r.storm } : ""], { vs: 36 });
      tile(3, "Sunset", r.sunset, [r.moonrise, r.moon]);
      tile(4, "Water temp", r.water, [r.waterSub]);
      tile(5, "Biting now", r.biting, null, { list: true });
      // level and bite rating: smaller, one line
      var by = 600;
      var lvl = "Lake level " + r.level + (r.levelSub ? ", " + r.levelSub.charAt(0).toLowerCase() + r.levelSub.slice(1) : "");
      text(lvl, 48, by, F(SERIF, 27), CREAM2, 720, 22);
      text("Tonight\u2019s bite: " + r.bite, W - 48, by, F(SERIF6, 27), r.bite === DASH ? MUTED : CREAM, 380, 22, true);
      return { canvas: c, r: r };
    });
  }

  var shareDlg = document.getElementById("tt-share");
  var shareImg = $("#tt-share-img"), shareBtn = $("#tt-share-go"), dlLink = $("#tt-share-dl"), shareMsg = $("#tt-share-msg");
  var lastFile = null;
  function openShare() {
    if (!shareDlg) return;
    shareMsg.textContent = "Drawing the card\u2026";
    shareBtn.hidden = true;
    if (shareDlg.showModal) shareDlg.showModal(); else shareDlg.setAttribute("open", "");
    draw().then(function (o) {
      var url = o.canvas.toDataURL("image/png");
      shareImg.src = url;
      shareImg.alt = "Tonight at " + lakeName + ": wind " + o.r.wind + ", air " + o.r.air + ", " + o.r.sky + ", sunset " + o.r.sunset + ", water " + o.r.water + (o.r.biting.length ? ", biting now " + o.r.biting.join(", ") : "") + ".";
      var name = "night-bite-" + LK.id + "-" + etDate() + ".png";
      dlLink.href = url; dlLink.download = name;
      shareMsg.textContent = "Sources: " + o.r.src;
      o.canvas.toBlob(function (b) {
        if (!b || !window.File) return;
        lastFile = new File([b], name, { type: "image/png" });
        try { shareBtn.hidden = !(navigator.canShare && navigator.canShare({ files: [lastFile] })); } catch (e) { shareBtn.hidden = true; }
      }, "image/png");
    });
  }
  if (shareBtn) shareBtn.addEventListener("click", function () {
    if (!lastFile) return;
    navigator.share({ files: [lastFile], title: "Tonight at " + lakeName, text: "Tonight at " + lakeName + " on The Night Bite: " + home })
      .catch(function () {});
  });

  /* ------------------------------------------------------------------ reminder ------------------------------------------------------------------ */
  var remDlg = document.getElementById("tt-remind");
  var remMsg = $("#tt-remind-msg"), notifyBtn = $("#tt-remind-notify"), cancelBtn = $("#tt-remind-cancel");
  var whenEl = $("#tt-remind-when"), sunBtn = $("#tt-remind-sunset");
  var timer = null;
  var canNotify = "Notification" in window;
  var canTrigger = canNotify && "showTrigger" in Notification.prototype && typeof window.TimestampTrigger === "function";
  function label(d) { return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }

  /* Wheel picker: hour 1 to 12, minute in 5 minute steps, AM/PM. Each column is a native scroll-snap list, so touch
     swipes, mouse wheels and trackpads all scroll it the way the phone expects; arrow keys step it; screen readers get a
     spinbutton with a spoken value. 5 minute steps: 12 stops instead of 60 is one flick on a phone, and a fishing
     reminder doesn't need the exact minute. The Sunset button still sets the exact minute. */
  var ROW = 44;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var COLS = {
    h: { vals: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], show: function (v) { return String(v); }, say: function (v) { return v + " o\u2019clock"; } },
    m: { vals: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55], show: function (v) { return (v < 10 ? "0" : "") + v; }, say: function (v) { return (v < 10 ? "0" : "") + v + " minutes"; } },
    ap: { vals: [0, 1], show: function (v) { return v ? "PM" : "AM"; }, say: function (v) { return v ? "PM" : "AM"; } }
  };
  var pick = { h: 0, m: 0, ap: 0 };   // indexes into COLS[k].vals
  var exact = null;                   // { d: Date } when the Sunset button set an exact minute
  var wheels = {};
  function wheelInit() {
    document.querySelectorAll("#tt-remind .tt-col").forEach(function (el) {
      var k = el.getAttribute("data-col"), col = COLS[k], ul = $(".tt-col-list", el), settle = null, raf = 0;
      col.vals.forEach(function (v, i) {
        var li = document.createElement("li");
        li.className = "tt-item"; li.textContent = col.show(v); li.setAttribute("data-i", String(i));
        ul.appendChild(li);
      });
      wheels[k] = el;
      function paint() {
        raf = 0;
        var pos = el.scrollTop / ROW;
        ul.querySelectorAll(".tt-item").forEach(function (li, i) { li.style.setProperty("--d", String(Math.min(2, Math.abs(i - pos)))); });
      }
      el.addEventListener("scroll", function () {
        if (!raf) raf = requestAnimationFrame(paint);
        clearTimeout(settle);
        settle = setTimeout(function () {
          var i = Math.max(0, Math.min(col.vals.length - 1, Math.round(el.scrollTop / ROW)));
          if (i !== pick[k]) { pick[k] = i; exact = null; aria(k); update(); }
        }, 120);
      }, { passive: true });
      el.addEventListener("keydown", function (e) {
        var step = { ArrowUp: -1, ArrowDown: 1, PageUp: -3, PageDown: 3 }[e.key];
        var i = pick[k];
        if (step) i += step; else if (e.key === "Home") i = 0; else if (e.key === "End") i = col.vals.length - 1; else return;
        e.preventDefault();
        i = Math.max(0, Math.min(col.vals.length - 1, i));
        if (i === pick[k]) return;
        pick[k] = i; exact = null; aria(k); scrollTo(k, true); update();
      });
      ul.addEventListener("click", function (e) {
        var li = e.target.closest(".tt-item"); if (!li) return;
        pick[k] = +li.getAttribute("data-i"); exact = null; aria(k); scrollTo(k, true); update(); el.focus({ preventScroll: true });
      });
      paint();
    });
  }
  function aria(k) {
    var el = wheels[k], v = COLS[k].vals[pick[k]];
    el.setAttribute("aria-valuenow", String(v));
    el.setAttribute("aria-valuetext", COLS[k].say(v));
  }
  function scrollTo(k, smooth) {
    var el = wheels[k];
    el.scrollTo({ top: pick[k] * ROW, behavior: smooth && !(reduce && reduce.matches) ? "smooth" : "auto" });
  }
  function setWheels(d) {
    var h = d.getHours(), mi = d.getMinutes();
    pick.ap = h >= 12 ? 1 : 0;
    pick.h = ((h % 12) || 12) - 1;
    pick.m = Math.min(11, Math.round(mi / 5));
    ["h", "m", "ap"].forEach(function (k) { aria(k); scrollTo(k, false); });
  }
  function sunsetNext() {
    var A = window.NightBiteAstro;
    if (!A || !A.sunset || cfg.lat == null) return null;
    var now = new Date();
    for (var i = 0; i < 2; i++) {
      var noon = new Date(now); noon.setDate(noon.getDate() + i); noon.setHours(12, 0, 0, 0);
      var s = A.sunset(noon, cfg.lat, cfg.lng);
      if (!s) return null;
      s = new Date(s.valueOf()); s.setSeconds(0, 0);
      if (s > now) return { d: s, tomorrow: i === 1 };
    }
    return null;
  }
  // the chosen time as a Date; if it already passed today it rolls to tomorrow
  function chosen() {
    if (exact) return { d: exact.d, tomorrow: exact.tomorrow, sunset: true };
    var h = COLS.h.vals[pick.h] % 12 + (pick.ap ? 12 : 0), mi = COLS.m.vals[pick.m];
    var d = new Date(); d.setHours(h, mi, 0, 0);
    var tomorrow = d <= new Date();
    if (tomorrow) d.setDate(d.getDate() + 1);
    return { d: d, tomorrow: tomorrow };
  }
  function update() {
    var c = chosen();
    if (whenEl) whenEl.textContent = (c.sunset ? "Sunset, " + (c.tomorrow ? "tomorrow" : "today") : c.tomorrow ? "Tomorrow" : "Today") + " at " + label(c.d) +
      (c.tomorrow && !c.sunset ? ". That time has passed today." : ".");
    if (sunBtn) sunBtn.setAttribute("aria-pressed", c.sunset ? "true" : "false");
  }
  function defaults() {
    var s = sunsetNext();
    if (s && !s.tomorrow) { exact = s; setWheels(s.d); }
    else {
      exact = null;
      var d = new Date(Date.now() + 15 * 6e4); d.setHours(d.getHours() + 1, 0, 0, 0);   // next whole hour at least 15 minutes out
      setWheels(d);
    }
    if (sunBtn) {
      var n = sunsetNext();
      sunBtn.hidden = !n;
      if (n) sunBtn.textContent = "Sunset " + label(n.d) + (n.tomorrow ? " tomorrow" : "");
    }
    update();
  }
  if (sunBtn) sunBtn.addEventListener("click", function () {
    var s = sunsetNext(); if (!s) return;
    exact = s; setWheels(s.d);
    ["h", "m", "ap"].forEach(function (k) { scrollTo(k, true); });
    update();
  });
  function title() { return "Fishing check: " + lakeName; }
  function body() { return "Check the wind, sky and level before you head out."; }
  function ics(ts) {
    function u(d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
    var s = new Date(ts), e = new Date(ts + 30 * 6e4);
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//The Night Bite//Remind me//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
      "BEGIN:VEVENT", "UID:" + ts + "-" + LK.id + "@nightbiteoh.com", "DTSTAMP:" + u(new Date()), "DTSTART:" + u(s), "DTEND:" + u(e),
      "SUMMARY:" + title(), "DESCRIPTION:" + body() + " " + home, "URL:" + home,
      "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + title(), "TRIGGER:PT0S", "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
    return lines.join("\r\n") + "\r\n";
  }
  function fire(note) {
    var opts = { body: body(), tag: "nb-remind", icon: LS.base + "assets/icons/icon-192.png", data: { url: home } };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(function (reg) { reg.showNotification(title(), opts); });
    } else { try { new Notification(title(), opts); } catch (e) {} }
    try { localStorage.removeItem(REMIND_KEY); } catch (e) {}
    status();
  }
  function arm(rec) {
    clearTimeout(timer);
    var wait = rec.at - Date.now();
    if (wait <= 0) { if (wait > -36e5 && Notification.permission === "granted") fire(); else { try { localStorage.removeItem(REMIND_KEY); } catch (e) {} } return; }
    if (wait < 2147483647) timer = setTimeout(fire, wait);
  }
  function saved() { try { return JSON.parse(localStorage.getItem(REMIND_KEY) || "null"); } catch (e) { return null; } }
  function status() {
    var rec = saved();
    if (!remMsg) return;
    if (rec && rec.at > Date.now()) {
      var day = new Date(rec.at).toDateString() === new Date().toDateString() ? "today" : "tomorrow";
      remMsg.textContent = "Reminder set for " + day + " at " + label(new Date(rec.at)) + " on this phone" +
        (rec.trigger ? ". It is scheduled with the app, so it can go off while the app is closed." : ". It goes off only while The Night Bite is open. For a sure thing, add it to your calendar too.");
      cancelBtn.hidden = false;
    } else {
      remMsg.textContent = canNotify ? (canTrigger ? "This phone can schedule a reminder that goes off with the app closed." : "On this phone a reminder can only go off while The Night Bite is open. The calendar option always works.")
        : "This browser can\u2019t show notifications. The calendar option works everywhere.";
      cancelBtn.hidden = true;
    }
    if (notifyBtn) notifyBtn.hidden = !canNotify;
  }
  var wheelReady = false;
  function openRemind() {
    if (!remDlg) return;
    status();
    if (remDlg.showModal) remDlg.showModal(); else remDlg.setAttribute("open", "");
    if (!wheelReady) { wheelInit(); wheelReady = true; }
    defaults();
  }
  var calBtn = $("#tt-remind-ics");
  if (calBtn) calBtn.addEventListener("click", function () {
    var c = chosen(), ts = c.d.valueOf();
    var url = URL.createObjectURL(new Blob([ics(ts)], { type: "text/calendar;charset=utf-8" }));
    var a = document.createElement("a");
    a.href = url; a.download = "night-bite-" + LK.id + "-reminder.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    remMsg.textContent = "Calendar file saved. Open it to add the reminder " + (c.tomorrow ? "tomorrow" : "today") + " at " + label(c.d) + ".";
  });
  if (notifyBtn) notifyBtn.addEventListener("click", function () {
    var ts = chosen().d.valueOf();
    Notification.requestPermission().then(function (p) {
      if (p !== "granted") { remMsg.textContent = "Notifications are off for this site, so use the calendar option instead."; return; }
      var rec = { at: ts, lake: LK.id, trigger: false };
      var done = function () { try { localStorage.setItem(REMIND_KEY, JSON.stringify(rec)); } catch (e) {} if (!rec.trigger) arm(rec); status(); };
      if (canTrigger && navigator.serviceWorker) {
        navigator.serviceWorker.ready.then(function (reg) {
          return reg.showNotification(title(), { body: body(), tag: "nb-remind", icon: LS.base + "assets/icons/icon-192.png", data: { url: home }, showTrigger: new window.TimestampTrigger(ts) });
        }).then(function () { rec.trigger = true; done(); }, done);
      } else done();
    });
  });
  if (cancelBtn) cancelBtn.addEventListener("click", function () {
    clearTimeout(timer);
    try { localStorage.removeItem(REMIND_KEY); } catch (e) {}
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then(function (reg) {
      if (reg && reg.getNotifications) reg.getNotifications({ tag: "nb-remind", includeTriggered: true }).then(function (ns) { ns.forEach(function (n) { n.close(); }); });
    });
    status();
  });
  // re-arm a page-open reminder after a reload
  var rec0 = saved();
  if (rec0 && !rec0.trigger && canNotify) arm(rec0);

  row.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-act]");
    if (!b) return;
    if (b.getAttribute("data-act") === "share") openShare(); else openRemind();
  });
  document.querySelectorAll(".tt-close").forEach(function (b) {
    b.addEventListener("click", function () { var d = b.closest("dialog"); if (d.close) d.close(); else d.removeAttribute("open"); });
  });
})();
