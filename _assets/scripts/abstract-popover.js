// Hover-and-hold abstracts: any <li> containing a
// <template class="abstract-content"> (see \abstract{} in utils.jl) shows
// its content in a small floating popover after the pointer rests on the
// item for ~0.5s (or immediately on keyboard focus). Moving away, blurring,
// or pressing Escape hides it again.
(function () {
  var templates = document.querySelectorAll("template.abstract-content");
  if (!templates.length) return;

  var HOVER_DELAY = 500;
  var HIDE_DELAY = 150;
  var MAX_CHARS = 2000;
  var showTimer = null;
  var hideTimer = null;
  var activeItem = null;

  // Width grows with how much text there is, so a one-line abstract isn't
  // stretched to fit a long one and a long one isn't squeezed into a tall,
  // narrow column. Capped by the viewport either way.
  function widthFor(len) {
    var px = len <= 100 ? 260 : len <= 250 ? 340 : len <= 400 ? 420 : 480;
    return "min(" + px + "px, calc(100vw - 2rem))";
  }

  function truncate(text, max) {
    if (text.length <= max) return text;
    var cut = text.slice(0, max);
    var lastSpace = cut.lastIndexOf(" ");
    if (lastSpace > max * 0.6) cut = cut.slice(0, lastSpace);
    return cut.trim() + "…";
  }

  // Structure: .abstract-popover (fixed, positions/sizes the whole thing,
  // overflow left visible) > .abstract-popover-card (the visible card:
  // background/border/radius/shadow, clips to its rounded corners) >
  // .abstract-popover-body (the actual scroll region). The arrow is a
  // sibling of the card, not a descendant, so the card's clipping (needed
  // for the rounded corners while the body scrolls) never cuts it off.
  var popover = document.createElement("div");
  popover.className = "abstract-popover";
  popover.id = "abstract-popover";
  popover.setAttribute("role", "tooltip");
  var card = document.createElement("div");
  card.className = "abstract-popover-card";
  var body = document.createElement("div");
  body.className = "abstract-popover-body";
  var arrow = document.createElement("div");
  arrow.className = "abstract-popover-arrow";
  card.appendChild(body);
  popover.appendChild(card);
  popover.appendChild(arrow);
  document.body.appendChild(popover);

  function clearTimers() {
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  }

  function position(item) {
    var itemRect = item.getBoundingClientRect();
    var popRect = popover.getBoundingClientRect();
    var margin = 10;

    var spaceAbove = itemRect.top - margin;
    var spaceBelow = window.innerHeight - itemRect.bottom - margin;
    var placeAbove = spaceAbove >= popRect.height || spaceAbove > spaceBelow;

    var top = placeAbove
      ? itemRect.top - popRect.height - margin
      : itemRect.bottom + margin;
    // Clamp into the visible viewport either way, so a popover that's
    // taller than the available space (e.g. near the top of an unscrolled
    // page) doesn't run off-screen instead of just overlapping the item.
    top = Math.max(margin, Math.min(top, window.innerHeight - popRect.height - margin));

    var left = itemRect.left + itemRect.width / 2 - popRect.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - popRect.width - margin));

    popover.style.top = top + "px";
    popover.style.left = left + "px";
    popover.classList.toggle("is-below", !placeAbove);

    var arrowLeft = itemRect.left + itemRect.width / 2 - left;
    arrowLeft = Math.max(14, Math.min(arrowLeft, popRect.width - 14));
    arrow.style.left = arrowLeft + "px";
  }

  function show(item, tpl) {
    clearTimers();
    activeItem = item;
    var text = tpl.content.textContent.replace(/\s+/g, " ").trim();
    popover.style.width = widthFor(text.length);
    body.textContent = truncate(text, MAX_CHARS);
    popover.classList.add("is-visible");
    // Positioned after becoming visible so its rendered size is correct.
    position(item);
  }

  function hide() {
    clearTimers();
    activeItem = null;
    popover.classList.remove("is-visible");
  }

  function scheduleHide() {
    clearTimers();
    hideTimer = setTimeout(hide, HIDE_DELAY);
  }

  // Franklin renders \abstract{} as a raw HTML block, which closes the
  // preceding markdown list before inserting it - so the <template> ends
  // up as a sibling of the <ul>/<li>, not nested inside it (same as
  // \twosidebox{} always has). Fall back to walking backwards for the
  // <li> it was written under.
  function findItem(tpl) {
    var li = tpl.closest("li");
    if (li) return li;
    var el = tpl.previousElementSibling;
    while (el) {
      if (el.tagName === "LI") return el;
      if (el.tagName === "UL" || el.tagName === "OL") {
        var last = el.lastElementChild;
        if (last && last.tagName === "LI") return last;
      }
      el = el.previousElementSibling;
    }
    return null;
  }

  templates.forEach(function (tpl) {
    if (!tpl.content.textContent.trim()) return; // nothing to show yet

    var item = findItem(tpl);
    if (!item) return;

    item.classList.add("has-abstract");
    item.tabIndex = 0;
    item.setAttribute("aria-describedby", "abstract-popover");

    var hint = document.createElement("i");
    hint.className = "fa-solid fa-circle-info abstract-hint";
    hint.setAttribute("aria-hidden", "true");
    (item.querySelector("p:last-of-type") || item).appendChild(hint);

    item.addEventListener("mouseenter", function () {
      clearTimers();
      showTimer = setTimeout(function () { show(item, tpl); }, HOVER_DELAY);
    });
    item.addEventListener("mouseleave", scheduleHide);
    item.addEventListener("focus", function () { show(item, tpl); });
    item.addEventListener("blur", scheduleHide);
  });

  popover.addEventListener("mouseenter", clearTimers);
  popover.addEventListener("mouseleave", scheduleHide);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && activeItem) {
      hide();
      activeItem && activeItem.blur && activeItem.blur();
    }
  });

  window.addEventListener("scroll", function () {
    if (activeItem) position(activeItem);
  }, { passive: true, capture: true });
})();
