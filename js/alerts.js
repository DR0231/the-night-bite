/**
 * The Night Bite: site-wide NWS alert banner.
 * Shows only when a Warning or Watch is active for the lake's area (Hoover: Delaware or Franklin County, Ohio,
 * named in page text only as "the Hoover area")
 * (county zones OHC041, OHC049 and forecast zones OHZ046, OHZ055). Source: api.weather.gov/alerts/active.
 * Silent when there is nothing active or the API can't be reached (the conditions card covers outages).
 */
(function () {
  if (!window.fetch) return;
  var LK = window.NightBiteLake, LC = (LK && LK.cfg) || null;   // js/lakes.js; Hoover if missing
  var URL = "https://api.weather.gov/alerts/active?zone=" + ((LC && LC.alerts.zones) || "OHC041,OHC049,OHZ046,OHZ055");
  var MORE = (LC && LC.nws.page) || "https://forecast.weather.gov/MapClick.php?lat=40.11&lon=-82.88";
  var COUNTIES = (LC && LC.alerts.counties) || "the Hoover area";
  var CACHE_KEY = LK ? LK.key("nb-alerts-v1") : "nb-alerts-v1", CACHE_MS = 5 * 60 * 1000, HIDE_KEY = "nb-alerts-hidden";

  function fmt(iso) {
    var d = new Date(iso);
    if (isNaN(d.valueOf())) return "";
    return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" }).format(d) + " ET";
  }

  function pick(json) {
    var now = Date.now(), seen = {}, out = [];
    ((json && json.features) || []).forEach(function (f) {
      var p = f.properties || {};
      if (!/(Warning|Watch)\b/i.test(p.event || "")) return;
      if (p.status && p.status !== "Actual") return;
      if (p.messageType === "Cancel") return;
      var end = p.ends || p.expires;
      if (end && new Date(end).valueOf() < now) return;
      var key = p.event + "|" + (end || "");
      if (seen[key]) return;
      seen[key] = 1;
      out.push({ id: p.id || f.id || key, event: p.event, until: end, area: p.areaDesc || "" });
    });
    // warnings before watches
    out.sort(function (a, b) { return (/Watch/i.test(a.event) ? 1 : 0) - (/Watch/i.test(b.event) ? 1 : 0); });
    return out;
  }

  // tell the home conditions card which alerts are on screen, so its storm line can point here instead of repeating them
  function shown(list) {
    window.NightBiteAlertsShown = list;
    try { document.dispatchEvent(new CustomEvent("nb:alerts", { detail: { list: list } })); } catch (e) {}
  }

  function render(list) {
    var old = document.querySelector(".nws-alert");
    if (old) { old.remove(); document.documentElement.classList.remove("has-nws-alert"); }
    if (!list.length) return shown([]);
    var sig = list.map(function (a) { return a.id; }).join(",");
    try { if (sessionStorage.getItem(HIDE_KEY) === sig) return shown([]); } catch (e) {}
    shown(list);
    var bar = document.createElement("div");
    bar.className = "nws-alert";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Weather alert");
    var inner = document.createElement("div");
    inner.className = "nws-alert-inner";
    var text = document.createElement("p");
    text.className = "nws-alert-text";
    var lead = document.createElement("strong");
    lead.textContent = list[0].event;
    text.appendChild(lead);
    var rest = list[0].until ? " until " + fmt(list[0].until) : "";
    if (list.length > 1) rest += ", plus " + (list.length - 1) + " more";
    text.appendChild(document.createTextNode(rest + " for " + COUNTIES + ". "));
    var a = document.createElement("a");
    a.href = MORE;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Details on weather.gov";
    text.appendChild(a);
    var close = document.createElement("button");
    close.type = "button";
    close.className = "nws-alert-close";
    close.setAttribute("aria-label", "Hide this alert for now");
    close.textContent = "Hide";
    close.addEventListener("click", function () {
      try { sessionStorage.setItem(HIDE_KEY, sig); } catch (e) {}
      bar.remove();
      shown([]);
    });
    inner.appendChild(text);
    inner.appendChild(close);
    bar.appendChild(inner);
    var skip = document.querySelector("body > a.sr-only");
    if (skip && skip.nextSibling) skip.parentNode.insertBefore(bar, skip.nextSibling);
    else document.body.insertBefore(bar, document.body.firstChild);
    document.documentElement.classList.add("has-nws-alert");
  }

  function load(force) {
    var cached = null;
    if (!force) {
      try {
        cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
        if (!cached || Date.now() - cached.at > CACHE_MS) cached = null;
      } catch (e) { cached = null; }
    }
    if (cached) { render(cached.list); return; }
    var ctrl = window.AbortController ? new AbortController() : null;
    if (ctrl) setTimeout(function () { ctrl.abort(); }, 9000);
    fetch(URL, { headers: { Accept: "application/geo+json" }, signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error("alerts " + r.status); return r.json(); })
      .then(function (json) {
        var list = pick(json);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), list: list })); } catch (e) {}
        render(list);
      })
      .catch(function () {});   // on a failed refresh the current banner (if any) stays
  }

  load(false);
  if (window.NightBiteRefresh) window.NightBiteRefresh.add("alerts", load);
})();
