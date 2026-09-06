/**
 * The Night Bite — sticky in-page nav active section highlight
 */
(function () {
  var nav = document.querySelector(".gear-sticky-nav, .species-subnav");
  if (!nav) return;
  var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  if (!links.length) return;

  var sections = [];
  links.forEach(function (link) {
    var id = link.getAttribute("href").slice(1);
    var el = document.getElementById(id);
    if (el) sections.push({ id: id, el: el, link: link });
  });
  if (!sections.length) return;

  function setActive(id) {
    links.forEach(function (link) {
      var on = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  if ("IntersectionObserver" in window) {
    var visible = {};
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          visible[entry.target.id] = entry.isIntersecting
            ? entry.intersectionRatio
            : 0;
        });
        var best = null;
        var bestRatio = 0;
        sections.forEach(function (s) {
          var r = visible[s.id] || 0;
          if (r > bestRatio) {
            bestRatio = r;
            best = s.id;
          }
        });
        if (best) setActive(best);
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1]
      }
    );
    sections.forEach(function (s) {
      observer.observe(s.el);
    });
  }

  links.forEach(function (link) {
    link.addEventListener("click", function () {
      setActive(link.getAttribute("href").slice(1));
    });
  });
})();
