(() => {
  function initHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    let isAtTop = window.scrollY <= 1;
    let isScrollingDown = false;
    let lastScrollY = window.scrollY;
    let framePending = false;

    if (!isAtTop) header.classList.add("is-scrolled");

    const spacer = document.createElement("div");
    spacer.className = "site-header-spacer";
    spacer.setAttribute("aria-hidden", "true");
    header.after(spacer);

    function updateSpacer() {
      const flowTop = parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue("--site-header-flow-top")) || 34;
      spacer.style.height = `${flowTop + header.offsetHeight}px`;
    }

    function updateHeader() {
      framePending = false;
      const currentScrollY = window.scrollY;
      if (currentScrollY === lastScrollY) return;

      const nextIsScrollingDown = currentScrollY > lastScrollY;
      lastScrollY = currentScrollY;
      if (nextIsScrollingDown !== isScrollingDown) isScrollingDown = nextIsScrollingDown;

      const nextIsAtTop = currentScrollY <= 1;
      if (nextIsAtTop === isAtTop) return;

      isAtTop = nextIsAtTop;
      header.classList.toggle("is-scrolled", !isAtTop);
    }

    function scheduleUpdate() {
      if (framePending) return;
      framePending = true;
      requestAnimationFrame(updateHeader);
    }

    updateSpacer();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", updateSpacer, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeader, { once: true });
  } else {
    initHeader();
  }
})();
