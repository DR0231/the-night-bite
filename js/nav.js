/**
 * The Night Bite — primary nav + mobile More toggle
 */
(function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");
  var moreBtn = document.querySelector(".nav-more-btn");
  var morePanel = document.getElementById("nav-more-panel");

  function setMenuOpen(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    nav.classList.toggle("is-open", open);
    toggle.textContent = open ? "Close" : "Menu";
  }

  function setMoreOpen(open) {
    if (!moreBtn || !morePanel) return;
    moreBtn.setAttribute("aria-expanded", open ? "true" : "false");
    morePanel.hidden = !open;
    morePanel.classList.toggle("is-open", open);
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      setMenuOpen(open);
      if (!open) setMoreOpen(false);
    });
  }

  if (moreBtn && morePanel) {
    moreBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = moreBtn.getAttribute("aria-expanded") !== "true";
      setMoreOpen(open);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (moreBtn && moreBtn.getAttribute("aria-expanded") === "true") {
      setMoreOpen(false);
      moreBtn.focus();
      return;
    }
    if (toggle && toggle.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener("click", function (e) {
    if (!moreBtn || !morePanel) return;
    if (morePanel.hidden) return;
    if (morePanel.contains(e.target) || moreBtn.contains(e.target)) return;
    setMoreOpen(false);
  });

  if (nav) {
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMoreOpen(false);
        if (
          toggle &&
          window.matchMedia("(max-width: 900px)").matches
        ) {
          setMenuOpen(false);
        }
      });
    });
  }

  // What's new: a small New dot on links to updates.html when the newest entry (data-updates, stamped by
  // tools/build-updates.py) is newer than the last one this visitor saw. Visiting the page clears it.
  (function () {
    var links = document.querySelectorAll("a[data-updates]");
    var latest = links.length ? links[0].getAttribute("data-updates") : "";
    var KEY = "nb-updates-seen", seen = "";
    if (!latest) return;
    try { seen = localStorage.getItem(KEY) || ""; } catch (e) { return; }
    if (document.querySelector("[data-updates-page]")) { try { localStorage.setItem(KEY, latest); } catch (e) {} return; }
    if (seen >= latest) return;
    links.forEach(function (a) {
      a.classList.add("is-new");
      var s = document.createElement("span");
      s.className = "sr-only"; s.textContent = " (new)";
      a.appendChild(s);
    });
    if (moreBtn && morePanel && morePanel.querySelector(".is-new")) moreBtn.classList.add("has-new");
  })();
})();
