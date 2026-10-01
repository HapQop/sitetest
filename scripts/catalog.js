document.addEventListener("DOMContentLoaded", () => {
  const tabs = [...document.querySelectorAll("[data-product-filter]")];
  const products = [...document.querySelectorAll("[data-product-game]")];
  const emptyStates = [...document.querySelectorAll("[data-empty-game]")];
  const searchInput = document.querySelector("[data-product-search]");
  const searchEmpty = document.querySelector("[data-search-empty]");
  const typeButtons = [...document.querySelectorAll("[data-product-type-filter]")];
  const statusButtons = [...document.querySelectorAll("[data-product-status-filter]")];
  const priceButtons = [...document.querySelectorAll("[data-product-price-filter]")];
  const priceMinInput = document.querySelector("#catalog-price-min");
  const priceMaxInput = document.querySelector("#catalog-price-max");
  const resetButton = document.querySelector("[data-reset-product-filters]");
  if (!tabs.length) return;

  let activeFilter = "all";
  let activeType = "all";
  let activeStatus = "all";
  let activePrice = "all";
  let cardAnimationFrame = null;

  const inputPrice = (input) => {
    const value = input?.value?.trim();
    if (value === "" || value === undefined) return null;
    const price = Number(value);
    return Number.isFinite(price) ? price : null;
  };

  const matchesPrice = (product) => {
    const price = Number(product.querySelector("[data-currency-price]")?.dataset.currencyPrice);
    const minimum = inputPrice(priceMinInput);
    const maximum = inputPrice(priceMaxInput);
    if (!Number.isFinite(price)) return activePrice === "all" && minimum === null && maximum === null;
    if (minimum !== null && price < minimum) return false;
    if (maximum !== null && price > maximum) return false;
    return {
      all: true,
      custom: true,
      "under-10": price >= 0 && price < 10,
      "10-25": price >= 10 && price < 25,
      "25-50": price >= 25 && price < 50,
      "50-plus": price >= 50,
    }[activePrice] ?? false;
  };

  const animateVisibleProducts = () => {
    const visibleCards = products.filter((product) => !product.hidden && !product.classList.contains("scroll-reveal-pending"));
    if (!visibleCards.length) return;

    visibleCards.forEach((product) => {
      product.classList.remove("catalog-card-enter");
      product.style.removeProperty("--catalog-card-enter-delay");
    });
    void visibleCards[0].offsetWidth;

    const start = () => {
      visibleCards.forEach((product, index) => {
        product.style.setProperty("--catalog-card-enter-delay", `${Math.min(index * 45, 180)}ms`);
        product.classList.add("catalog-card-enter");
      });
      cardAnimationFrame = null;
    };

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      if (cardAnimationFrame !== null) window.cancelAnimationFrame?.(cardAnimationFrame);
      cardAnimationFrame = window.requestAnimationFrame(start);
    } else {
      start();
    }
  };

  const applyFilters = ({ animate = false } = {}) => {
    const query = (searchInput?.value || "").trim().toLocaleLowerCase();
    const hasPriceFilter = activePrice !== "all" || inputPrice(priceMinInput) !== null || inputPrice(priceMaxInput) !== null;
    let visibleProducts = 0;
    const typeCounts = new Map(typeButtons.map((button) => [button.dataset.productTypeFilter, 0]));
    const statusCounts = new Map(statusButtons.map((button) => [button.dataset.productStatusFilter, 0]));

    products.forEach((product) => {
      const title = product.querySelector(".store-card__body h2")?.textContent.trim().toLocaleLowerCase() || "";
      const matchesGame = activeFilter === "all" || product.dataset.productGame === activeFilter;
      const matchesSearch = !query || title.startsWith(query);
      const matchesType = activeType === "all" || product.dataset.productType === activeType;
      const matchesStatus = activeStatus === "all" || product.dataset.productStatus === activeStatus;
      const matchesBase = matchesGame && matchesSearch && matchesPrice(product);
      product.hidden = !(matchesBase && matchesType && matchesStatus);
      if (!product.hidden) visibleProducts += 1;

      if (matchesBase && matchesStatus) {
        typeCounts.forEach((count, type) => {
          if (type === "all" || product.dataset.productType === type) typeCounts.set(type, count + 1);
        });
      }
      if (matchesBase && matchesType) {
        statusCounts.forEach((count, status) => {
          if (status === "all" || product.dataset.productStatus === status) statusCounts.set(status, count + 1);
        });
      }
    });

    typeButtons.forEach((button) => {
      const active = button.dataset.productTypeFilter === activeType;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      const badge = button.querySelector(".catalog-filter__count");
      if (badge) badge.textContent = String(typeCounts.get(button.dataset.productTypeFilter));
    });
    statusButtons.forEach((button) => {
      const active = button.dataset.productStatusFilter === activeStatus;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      const badge = button.querySelector(".catalog-filter__count");
      if (badge) badge.textContent = String(statusCounts.get(button.dataset.productStatusFilter));
    });
    priceButtons.forEach((button) => {
      const active = button.dataset.productPriceFilter === activePrice;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    emptyStates.forEach((state) => {
      state.hidden = visibleProducts > 0 || query.length > 0 || activeType !== "all" || activeStatus !== "all" || hasPriceFilter || state.dataset.emptyGame !== activeFilter;
    });
    if (searchEmpty) searchEmpty.hidden = visibleProducts > 0 || emptyStates.some((state) => !state.hidden);
    if (animate) animateVisibleProducts();
  };

  const setActiveTab = (tab, { animate = false } = {}) => {
    activeFilter = tab.dataset.productFilter;

    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });

    applyFilters({ animate });

    try { localStorage.setItem("cheatblox-product-filter", activeFilter); } catch { /* Filtering also works without saved preferences. */ }
  };

  let storedFilter;
  try { storedFilter = localStorage.getItem("cheatblox-product-filter"); } catch { /* Start with all games. */ }
  setActiveTab(tabs.find((tab) => tab.dataset.productFilter === storedFilter) || tabs[0]);
  tabs.forEach((tab) => tab.addEventListener("click", () => setActiveTab(tab, { animate: true })));
  searchInput?.addEventListener("input", () => applyFilters({ animate: true }));
  typeButtons.forEach((button) => button.addEventListener("click", () => {
    activeType = button.dataset.productTypeFilter;
    applyFilters({ animate: true });
  }));
  statusButtons.forEach((button) => button.addEventListener("click", () => {
    activeStatus = activeStatus === button.dataset.productStatusFilter ? "all" : button.dataset.productStatusFilter;
    applyFilters({ animate: true });
  }));
  priceButtons.forEach((button) => button.addEventListener("click", () => {
    activePrice = button.dataset.productPriceFilter;
    if (priceMinInput) priceMinInput.value = "";
    if (priceMaxInput) priceMaxInput.value = "";
    applyFilters({ animate: true });
  }));
  [priceMinInput, priceMaxInput].forEach((input) => input?.addEventListener("input", () => {
    activePrice = "custom";
    if (inputPrice(priceMinInput) === null && inputPrice(priceMaxInput) === null) activePrice = "all";
    applyFilters({ animate: true });
  }));
  resetButton?.addEventListener("click", () => {
    activeType = "all";
    activeStatus = "all";
    activePrice = "all";
    if (searchInput) searchInput.value = "";
    if (priceMinInput) priceMinInput.value = "";
    if (priceMaxInput) priceMaxInput.value = "";
    setActiveTab(tabs.find((tab) => tab.dataset.productFilter === "all") || tabs[0], { animate: true });
  });
  document.addEventListener("cheatblox:catalogchange", applyFilters);
  document.addEventListener("cheatblox:productstatuschange", applyFilters);
});
