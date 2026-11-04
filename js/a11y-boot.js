/* The Night Bite: display settings, applied before first paint. Loaded sync in <head> (the CSP forbids inline script).
 * Reads localStorage "nb-a11y" and sets data attributes on <html>; css/styles.css does the rest. The panel is js/a11y.js.
 *   data-text     sm | lg | xl            (absent = default size)
 *   data-font     readable                (phone's own system font for text and UI; lg and xl turn it on too)
 *   data-motion   reduce                  (also makes matchMedia('(prefers-reduced-motion: reduce)') report true)
 *   data-contrast more                    (high contrast, still navy and cream)
 *   data-light    red                     (red light: dim red on black; the phone's toolbar color follows)
 * Language: localStorage "nb-lang" (absent = English). Sets <html lang> and data-lang here, before paint; js/a11y.js
 * then loads js/i18n.js, which swaps the UI chrome strings. LANGS lists the languages with a string file. RTL lists the
 * right-to-left ones (ar, ur, fa): <html dir="rtl"> is set here too, before paint; any other language sets dir="ltr".
 * SYSFONT: every language other than English (S11, readable over pixel). css/styles.css gives html[data-lang] the
 * system font, and the Display panel shows Readable text on and locked, without writing it into the saved settings.
 */
(function (d) {
  var KEY = "nb-a11y", OK = { text: ["sm", "lg", "xl"], font: ["readable"], motion: ["reduce"], contrast: ["more"], light: ["red"] };
  function read() { try { var s = JSON.parse(localStorage.getItem(KEY) || "{}"); return s && typeof s === "object" ? s : {}; } catch (e) { return {}; } }
  function apply(s) {
    var h = d.documentElement;
    for (var k in OK) { if (OK[k].indexOf(s[k]) >= 0) h.setAttribute("data-" + k, s[k]); else h.removeAttribute("data-" + k); }
    if (s.text === "lg" || s.text === "xl") h.setAttribute("data-font", "readable");
    var tc = d.querySelector('meta[name="theme-color"]');
    if (tc) { if (!tc.hasAttribute("data-day")) tc.setAttribute("data-day", tc.content); tc.content = s.light === "red" ? "#000000" : tc.getAttribute("data-day"); }
  }
  var mm = window.matchMedia;
  if (mm) window.matchMedia = function (q) {
    if (/prefers-reduced-motion:\s*reduce/.test(q) && d.documentElement.getAttribute("data-motion") === "reduce") {
      var n = function () {};
      return { matches: true, media: q, onchange: null, addEventListener: n, removeEventListener: n, addListener: n, removeListener: n, dispatchEvent: function () { return false; } };
    }
    return mm.call(window, q);
  };
  var LKEY = "nb-lang", LANGS = { en: "English", es: "Espa\u00f1ol", zh: "\u7b80\u4f53\u4e2d\u6587", tl: "Tagalog", vi: "Ti\u1ebfng Vi\u1ec7t", fr: "Fran\u00e7ais", ko: "\ud55c\uad6d\uc5b4", pt: "Portugu\u00eas", hi: "\u0939\u093f\u0928\u094d\u0926\u0940", ru: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439", ht: "Krey\u00f2l ayisyen", de: "Deutsch", pl: "Polski", it: "Italiano", ja: "\u65e5\u672c\u8a9e", ar: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", ur: "\u0627\u0631\u062f\u0648", fa: "\u0641\u0627\u0631\u0633\u06cc" };
  function lang() { try { var l = localStorage.getItem(LKEY); return LANGS[l] ? l : "en"; } catch (e) { return "en"; } }
  var RTL = { ar: 1, ur: 1, fa: 1 }, SYSFONT = {};
  for (var lk in LANGS) if (lk !== "en") SYSFONT[lk] = 1;
  function applyLang(l) { var h = d.documentElement; h.lang = l === "en" ? "en" : l; h.dir = RTL[l] ? "rtl" : "ltr"; if (l === "en") h.removeAttribute("data-lang"); else h.setAttribute("data-lang", l); }
  window.NB_A11Y = { KEY: KEY, OK: OK, read: read, apply: apply, LKEY: LKEY, LANGS: LANGS, RTL: RTL, SYSFONT: SYSFONT, lang: lang,
    setLang: function (l) { l = LANGS[l] ? l : "en"; try { if (l === "en") localStorage.removeItem(LKEY); else localStorage.setItem(LKEY, l); } catch (e) {} applyLang(l); return l; },
    save: function (s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} apply(s); } };
  apply(read());
  applyLang(lang());
})(document);
