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

  // Active = the last page section whose top has passed a reading line
  // just under the sticky bars. Sections without a chip clear the highlight.
  var main = nav.closest("main") || document;
  var all = Array.prototype.slice.call(main.querySelectorAll("section[id]"));
  var ticking = false;
  function update() {
    ticking = false;
    var bottom = nav.getBoundingClientRect().bottom;
    var last = nav.lastElementChild;
    if (last) bottom = Math.max(bottom, last.getBoundingClientRect().bottom);
    var line = bottom + window.innerHeight * 0.2;
    var cur = null;
    var atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (!el.offsetParent && el.offsetHeight === 0) continue;
      if (atEnd || el.getBoundingClientRect().top <= line) cur = el.id;
    }
    setActive(cur);
  }
  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  links.forEach(function (link) {
    link.addEventListener("click", function () {
      setActive(link.getAttribute("href").slice(1));
    });
  });
})();
