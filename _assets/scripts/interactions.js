// Small progressive-enhancement touches: a shadow on the navbar once the
// page scrolls, and a fade/slide-in reveal for sections and cards as they
// enter the viewport. Everything here is optional polish - if
// IntersectionObserver isn't available, or the user asked for reduced
// motion, elements are simply left visible.
(function () {
  var nav = document.getElementById("navbar-main");

  function onScroll() {
    if (!nav) return;
    if (window.scrollY > 8) {
      nav.classList.add("is-scrolled");
    } else {
      nav.classList.remove("is-scrolled");
    }
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) return;

  var targets = document.querySelectorAll(
    ".home-section, .franklin-content .card, .franklin-content .twosidebox, .franklin-content .media.stream-item"
  );
  if (!targets.length) return;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach(function (el) {
    el.classList.add("reveal");
    observer.observe(el);
  });
})();
