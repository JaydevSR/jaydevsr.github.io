// Theme toggle: sets a `data-theme="light"|"dark"` attribute on <html>
// and persists the choice. All the actual color/icon switching lives in
// CSS (see _css/mystyles.css) keyed off that attribute plus the OS
// `prefers-color-scheme`, so this file only needs to own the attribute.
//
// A tiny inline script in _layout/head.html restores the stored choice
// before first paint, so there is no theme flash on reload.
(function () {
  var root = document.documentElement;
  var toggle = document.querySelector(".theme-toggle");
  if (!toggle) return;

  toggle.addEventListener("click", function () {
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var current = root.getAttribute("data-theme") || (prefersDark ? "dark" : "light");
    var next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {
      /* localStorage unavailable (private mode, etc.) - toggle still works for this page view */
    }
  });
})();
