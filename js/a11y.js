/* The Night Bite: Display panel (text size, readable text, less motion, high contrast). Settings live in
 * localStorage "nb-a11y" on this device only; js/a11y-boot.js applies them before paint. Any [data-a11y-open]
 * button opens the panel (More menu and footer). Red light (data-light="red") is the last toggle.
 */
(function () {
  var A = window.NB_A11Y; if (!A) return;
  var dlg, lastBtn;
  var SIZES = [["sm", "Small"], ["", "Default"], ["lg", "Large"], ["xl", "Extra large"]];
  var TOGGLES = [
    ["font", "readable", "Readable text", "Your phone\u2019s own font for text, menus and buttons. Large sizes turn it on."],
    ["motion", "reduce", "Less motion", "No sliding or fading."],
    ["contrast", "more", "High contrast", "Brighter text and borders."],
    ["light", "red", "Red light", "Dim red on black, so your eyes stay used to the dark."]
  ];
  function el(t, a, kids) {
    var e = document.createElement(t);
    for (var k in a || {}) { if (k === "text") e.textContent = a[k]; else e.setAttribute(k, a[k]); }
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function build() {
    dlg = el("dialog", { id: "a11y-panel", "class": "a11y-panel", "aria-labelledby": "a11y-title" });
    var form = el("form", { method: "dialog", "class": "a11y-form" });
    var close = el("button", { type: "button", "class": "a11y-close", "aria-label": "Close" }, [el("span", { "aria-hidden": "true", "class": "a11y-close-x" })]);
    form.appendChild(el("div", { "class": "a11y-head" }, [el("h2", { id: "a11y-title", "class": "a11y-title", text: "Display" }), close]));
    function group(label, id, kids) {
      return el("section", { "class": "a11y-group", "aria-labelledby": id }, [el("h3", { id: id, "class": "a11y-group-label", text: label })].concat(kids));
    }
    function toggle(t) {
      var id = "a11y-" + t[0];
      var inp = el("input", { type: "checkbox", role: "switch", id: id, "data-key": t[0], value: t[1], "aria-describedby": id + "-note" });
      return el("div", { "class": "a11y-row" }, [
        el("label", { "for": id, "class": "a11y-toggle" }, [
          el("span", { "class": "a11y-toggle-body" }, [el("span", { "class": "a11y-toggle-text", text: t[2] }), el("span", { id: id + "-note", "class": "a11y-note", text: t[3] })]),
          inp, el("span", { "class": "a11y-switch", "aria-hidden": "true" })
        ])
      ]);
    }
    var fs = el("fieldset", { "class": "a11y-sizes" }, [el("legend", { "class": "sr-only", text: "Text size" })]);
    var row = el("div", { "class": "a11y-seg" });
    SIZES.forEach(function (s) {
      var id = "a11y-size-" + (s[0] || "default");
      var inp = el("input", { type: "radio", name: "a11y-text", id: id, value: s[0] });
      row.appendChild(el("label", { "for": id, "class": "a11y-seg-opt", "data-size": s[0] || "default" }, [inp, el("span", { text: s[1] })]));
    });
    fs.appendChild(row);
    form.appendChild(group("Text size", "a11y-g-text", [fs, toggle(TOGGLES[0])]));
    form.appendChild(group("Screen", "a11y-g-screen", [el("div", { "class": "a11y-list" }, TOGGLES.slice(1).map(toggle))]));
    var lsel = el("select", { id: "a11y-lang", "aria-labelledby": "a11y-g-lang", "aria-describedby": "a11y-lang-note" });
    Object.keys(A.LANGS).forEach(function (k) { lsel.appendChild(el("option", { value: k, lang: k, text: A.LANGS[k] })); });
    form.appendChild(group("Language", "a11y-g-lang", [el("div", { "class": "a11y-row a11y-lang" }, [
      el("div", { "class": "a11y-select" }, [lsel]),
      el("p", { id: "a11y-lang-note", "class": "a11y-note", text: "Draft translations. Place names stay in English; for rules, the linked official source counts." })
    ])]));
    lsel.addEventListener("change", function (e) { e.stopPropagation(); setLang(lsel.value); sync(form); });
    var reset = el("button", { type: "button", "class": "btn btn-ghost a11y-reset", text: "Reset" });
    var done = el("button", { type: "submit", "class": "btn a11y-done", value: "done", text: "Done" });
    form.appendChild(el("div", { "class": "a11y-foot" }, [el("p", { "class": "a11y-saved", text: "Saved on this phone only." }), el("div", { "class": "a11y-actions" }, [reset, done])]));
    dlg.appendChild(form);
    document.body.appendChild(dlg);
    form.addEventListener("change", function (e) { if (e.target && e.target.id === "a11y-lang") return; A.save(collect(form)); sync(form); });
    reset.addEventListener("click", function () { A.save({}); setLang("en"); sync(form); });
    close.addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("close", function () { if (lastBtn && lastBtn.isConnected) lastBtn.focus(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    return form;
  }
  function collect(form) {
    var s = A.read(), r = form.querySelector('input[name="a11y-text"]:checked');
    if (r && r.value) s.text = r.value; else delete s.text;
    // a locked toggle (Readable text for a script the pixel fonts can't draw, or under Large and XL) keeps the saved value
    form.querySelectorAll("input[data-key]").forEach(function (c) { if (c.disabled) return; if (c.checked) s[c.dataset.key] = c.value; else delete s[c.dataset.key]; });
    if ((s.text === "lg" || s.text === "xl") && !s.font) s.font = "readable";
    return s;
  }
  function sync(form) {
    var ls = form.querySelector("#a11y-lang"); if (ls) ls.value = A.lang();
    var s = A.read(), big = s.text === "lg" || s.text === "xl";
    form.querySelectorAll('input[name="a11y-text"]').forEach(function (r) { r.checked = r.value === (s.text || ""); });
    form.querySelectorAll("input[data-key]").forEach(function (c) { c.checked = s[c.dataset.key] === c.value; });
    var f = form.querySelector("#a11y-font"), sys = !!(A.SYSFONT && A.SYSFONT[A.lang()]);
    f.disabled = big || sys; if (big || sys) f.checked = true;
    var fn = form.querySelector("#a11y-font-note");
    fn.textContent = sys ? "Always on for this language." : TOGGLES[0][3];
    var m = form.querySelector("#a11y-motion"), os = window.matchMedia && matchMedia.call(window, "(prefers-reduced-motion: reduce)").matches && s.motion !== "reduce";
    var note = form.querySelector("#a11y-motion-note");
    note.textContent = os ? "On already, because your phone asks for less motion." : "No sliding or fading.";
  }
  function open(btn) {
    var form = (dlg && dlg.querySelector("form")) || build();
    lastBtn = btn; sync(form);
    var nm = document.getElementById("nav-more-panel"); if (nm && !nm.hidden) { var mb = document.querySelector(".nav-more-btn"); if (mb) mb.click(); lastBtn = mb || btn; }
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    var first = (btn && btn.hasAttribute("data-lang-open") && form.querySelector("#a11y-lang")) || form.querySelector('input[name="a11y-text"]:checked') || form.querySelector("input");
    if (first) first.focus();
  }
  // js/i18n.js is only fetched when a language other than English is in use
  var ME = document.currentScript ? document.currentScript.src : "", i18nP = null;
  function i18n() {
    if (window.NB_I18N) return Promise.resolve(window.NB_I18N);
    if (!i18nP) i18nP = new Promise(function (ok, no) {
      var sc = document.createElement("script"); sc.src = new URL("i18n.js" + (ME.split("?")[1] ? "?" + ME.split("?")[1] : ""), ME || location.href).href;
      sc.onload = function () { ok(window.NB_I18N); }; sc.onerror = function () { i18nP = null; no(); };
      document.head.appendChild(sc);
    });
    return i18nP;
  }
  function setLang(l) {
    l = A.setLang(l);
    if (l === "en" && !window.NB_I18N) return;
    i18n().then(function (I) { I.set(l); }, function () {});
  }
  if (A.lang() !== "en") i18n().catch(function () {});
  document.querySelectorAll('nav[aria-label="Footer"]').forEach(function (n) {
    if (n.querySelector("[data-lang-open]")) return;
    var b = el("button", { type: "button", "class": "a11y-open", "data-a11y-open": "", "data-lang-open": "", text: "Language" });
    b.insertBefore(el("span", { "class": "lang-globe", "aria-hidden": "true" }), b.firstChild);
    n.appendChild(b);
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-a11y-open]");
    if (b) { e.preventDefault(); open(b); }
  });
  document.querySelectorAll("[data-a11y-open]").forEach(function (b) { b.hidden = false; });
  window.addEventListener("storage", function (e) { if (e.key === A.LKEY) { setLang(A.lang()); if (dlg) sync(dlg.querySelector("form")); } if (e.key === A.KEY) { A.apply(A.read()); if (dlg) sync(dlg.querySelector("form")); } });
})();
