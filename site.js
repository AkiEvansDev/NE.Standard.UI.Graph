// The whole of the site's behaviour: the sidebar opens on a phone, filters as you type, and scrolls to the page you
// are on. Everything here is an enhancement — with scripts off the sidebar is a plain list of every page, as before.
(function () {
    "use strict";

    document.documentElement.classList.add("has-js");

    var sidebar = document.getElementById("sidebar");
    var toggle = document.querySelector(".pages-toggle");

    if (!sidebar) {
        return;
    }

    if (toggle) {
        toggle.addEventListener("click", function () {
            var open = sidebar.classList.toggle("sidebar--open");
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
    }

    var filter = sidebar.querySelector(".nav-filter");

    if (filter) {
        filter.hidden = false;
        filter.addEventListener("input", function () {
            var needle = filter.value.trim().toLowerCase();

            sidebar.querySelectorAll("ul").forEach(function (list) {
                var shown = 0;

                list.querySelectorAll("li").forEach(function (item) {
                    var match = !needle || item.textContent.toLowerCase().indexOf(needle) >= 0;
                    item.hidden = !match;
                    shown += match ? 1 : 0;
                });

                // A group heading with nothing left under it is noise, so it goes with its list.
                list.hidden = shown === 0;

                if (list.previousElementSibling && list.previousElementSibling.tagName === "H3") {
                    list.previousElementSibling.hidden = shown === 0;
                }
            });
        });
    }

    // The sidebar has its own scrollbar and opens at the top, so on a component page the current entry starts out of sight.
    var current = sidebar.querySelector("li.current");

    if (current && sidebar.scrollHeight > sidebar.clientHeight) {
        sidebar.scrollTop = Math.max(0, current.offsetTop - sidebar.clientHeight / 2);
    }
})();
