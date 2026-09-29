(() => {
  function initNavigationLoader(header) {
    const storageKey = "cheatblox-navigation-start";
    let loader;

    function showLoader() {
      if (!loader) {
        loader = document.createElement("div");
        loader.className = "site-page-loader";
        loader.setAttribute("role", "status");
        loader.innerHTML = '<span class="site-page-loader__spinner" aria-hidden="true"></span><span class="visually-hidden" data-i18n="page-loading">Loading page</span>';
        document.body.appendChild(loader);
      }
      loader.querySelector("[data-i18n]").textContent = window.CheatBloxI18n?.translate("page-loading") || "Loading page";
      loader.classList.add("is-visible");
    }

    function hideLoader() {
      loader?.classList.remove("is-visible");
    }

    let startedAt = 0;
    try {
      startedAt = Number(window.sessionStorage.getItem(storageKey));
      window.sessionStorage.removeItem(storageKey);
    } catch { /* A navigation still works when storage is unavailable. */ }
    if (startedAt > 0 && Date.now() - startedAt < 10000 && Date.now() >= startedAt) {
      showLoader();
      const finishLoading = () => window.setTimeout(hideLoader, 350);
      if (document.readyState === "complete") finishLoading();
      else window.addEventListener("load", finishLoading, { once: true });
      window.setTimeout(hideLoader, 5000);
    }

    header.addEventListener("click", (event) => {
      const link = event.target.closest?.(".site-nav a, .site-brand");
      if (!link || event.defaultPrevented || (event.button !== undefined && event.button !== 0)
        || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
        || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;

      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
      try { window.sessionStorage.setItem(storageKey, String(Date.now())); } catch { /* Keep this page's loader visible. */ }
      showLoader();
      window.setTimeout(hideLoader, 5000);
    });
    window.addEventListener("pageshow", (event) => { if (event.persisted) hideLoader(); });
  }

  function initHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    let isAtTop = window.scrollY <= 1;
    let framePending = false;

    header.classList.toggle("is-scrolled", !isAtTop);

    const spacer = document.createElement("div");
    spacer.className = "site-header-spacer";
    spacer.setAttribute("aria-hidden", "true");
    header.after(spacer);

    function updateSpacer() {
      // Reserve the expanded height so shrinking the header never moves page content.
      const previousTransition = header.style.transition;
      header.style.transition = "none";
      header.classList.remove("is-scrolled");
      const flowTop = parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue("--site-header-flow-top")) || 34;
      spacer.style.height = `${flowTop + header.offsetHeight}px`;
      header.classList.toggle("is-scrolled", !isAtTop);
      void header.offsetHeight;
      header.style.transition = previousTransition;
    }

    function updateHeader() {
      framePending = false;
      const nextIsAtTop = window.scrollY <= 1;
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
    // Currency controls are inserted during DOMContentLoaded and can add a row.
    requestAnimationFrame(updateSpacer);
    document.addEventListener("DOMContentLoaded", () => requestAnimationFrame(updateSpacer), { once: true });
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", updateSpacer, { passive: true });
    initNavigationLoader(header);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeader, { once: true });
  } else {
    initHeader();
  }
})();
