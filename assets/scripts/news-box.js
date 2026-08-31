// The News box (see \newsbox{} in utils.jl) has a fixed height that only
// shows a few entries at once. Rather than hiding the rest, hovering the
// top half of the list auto-scrolls up and the bottom half auto-scrolls
// down, so older entries stay reachable and the `limit` passed to
// \newsbox{} can be higher (e.g. 6-7) than what's visible at a glance.
(function () {
  var lists = document.querySelectorAll(".news-list");
  if (!lists.length) return;

  // Note: this scroll is user-initiated (only runs while actively
  // hovering) rather than an autoplaying animation, so it isn't gated
  // behind prefers-reduced-motion the way the heading's blinking dot is
  // (see mystyles.css) - without it there'd be no way to reach items
  // past the first few at all.
  var SPEED = 22; // px/second

  var TICK_MS = 30;

  lists.forEach(function (list) {
    var direction = 0; // -1 up, 1 down, 0 idle
    var intervalId = null;

    // Checked live rather than once at load - whether the list actually
    // overflows can change after this script runs (web fonts swapping in
    // and reflowing text, a resize, content changing), so a one-time
    // check taken here could go stale and permanently disable scrolling.
    function canScroll() {
      return list.scrollHeight > list.clientHeight + 1;
    }

    function updateOverflowHint() {
      list.classList.toggle("has-overflow", canScroll());
    }
    updateOverflowHint();
    window.addEventListener("resize", updateOverflowHint);

    // setInterval rather than requestAnimationFrame - rAF is tied to the
    // browser's paint/compositor schedule and can be starved or throttled
    // independently of tab visibility in some embedding contexts, which
    // would silently stall this with no compositor error to catch it by.
    // A plain timer just needs to fire, not to sync with a paint.
    function tick() {
      if (direction !== 0 && canScroll()) {
        list.scrollTop += direction * SPEED * (TICK_MS / 1000);
      }
    }

    function start() {
      if (intervalId === null) {
        intervalId = setInterval(tick, TICK_MS);
      }
    }

    function stop() {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      direction = 0;
    }

    list.addEventListener("mousemove", function (e) {
      if (!canScroll()) return;
      var rect = list.getBoundingClientRect();
      var relY = e.clientY - rect.top;
      direction = relY < rect.height / 2 ? -1 : 1;
      start();
    });
    list.addEventListener("mouseleave", stop);
  });
})();
