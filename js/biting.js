/**
 * The Night Bite: "What's biting now" card on the Species page.
 * Reads the active lake's own set, js/biting/<id>.js, through NightBiteLakes.biting (js/lakes.js starts loading it in
 * <head> on pages marked data-biting). The month comes from the device clock in America/New_York.
 * Works offline once installed (the file is precached with the lake home). The card stays hidden if the data can't load.
 */
(function () {
  var card = document.getElementById("biting");
  var LS = window.NightBiteLakes;
  if (!card || !LS || !LS.biting) return;
  var LKID = window.NightBiteLake ? window.NightBiteLake.id : "hoover";
  LS.biting(LKID).then(function (data) { if (data) start(data); });
  function start(data) {
    var NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    function monthEt(d) {
      try {
        return parseInt(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "numeric" }).format(d), 10) - 1;
      } catch (e) {
        return d.getMonth();
      }
    }

    function render() {
      var m = monthEt(new Date());
      var month = data.months[m];
      if (!month) return;
      card.querySelector(".biting-month-name").textContent = NAMES[m];
      card.setAttribute("data-month", String(m + 1));
      var list = card.querySelector(".biting-list");
      list.textContent = "";
      month.picks.forEach(function (p) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.className = "biting-item";
        a.href = p.id;
        var img = document.createElement("img");
        img.src = "../assets/icons/fish-" + p.id + ".svg";
        img.alt = "";
        img.width = 32;
        img.height = 32;
        img.className = "biting-icon";
        var body = document.createElement("span");
        body.className = "biting-body";
        var name = document.createElement("span");
        name.className = "biting-name";
        name.textContent = data.species[p.id] || p.id;
        var where = document.createElement("span");
        where.className = "biting-where";
        where.textContent = p.where;
        var when = document.createElement("span");
        when.className = "biting-when" + (p.night ? " is-night" : "");
        when.textContent = p.when;
        body.appendChild(name);
        body.appendChild(where);
        body.appendChild(when);
        a.appendChild(img);
        a.appendChild(body);
        li.appendChild(a);
        list.appendChild(li);
      });
      var note = card.querySelector(".biting-safety");
      note.textContent = month.note || "";
      note.hidden = !month.note;
      card.hidden = false;
    }

    render();
    // a tab left open across midnight on the 1st picks up the new month when it comes back into view
    document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });
  }
})();
