document.addEventListener("DOMContentLoaded", () => {
  const tabs = [...document.querySelectorAll("[data-product-filter]")];
  const products = [...document.querySelectorAll("[data-product-game]")];
  const emptyStates = [...document.querySelectorAll("[data-empty-game]")];
  const searchInput = document.querySelector("[data-product-search]");
  const searchEmpty = document.querySelector("[data-search-empty]");
  if (!tabs.length) return;

  let activeFilter = "all";

  const applyFilters = () => {
    const query = (searchInput?.value || "").trim().toLocaleLowerCase();
    let visibleProducts = 0;

    products.forEach((product) => {
      const title = product.querySelector(".store-card__body h2")?.textContent.trim().toLocaleLowerCase() || "";
      const matchesGame = activeFilter === "all" || product.dataset.productGame === activeFilter;
      const matchesSearch = !query || title.startsWith(query);
      product.hidden = !(matchesGame && matchesSearch);
      if (!product.hidden) visibleProducts += 1;
    });

    emptyStates.forEach((state) => {
      state.hidden = query.length > 0 || state.dataset.emptyGame !== activeFilter;
    });
    if (searchEmpty) searchEmpty.hidden = !query || visibleProducts > 0;
  };

  const setActiveTab = (tab) => {
    activeFilter = tab.dataset.productFilter;

    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });

    applyFilters();

    localStorage.setItem("cheatblox-product-filter", activeFilter);
  };

  const storedFilter = localStorage.getItem("cheatblox-product-filter");
  setActiveTab(tabs.find((tab) => tab.dataset.productFilter === storedFilter) || tabs[0]);
  tabs.forEach((tab) => tab.addEventListener("click", () => setActiveTab(tab)));
  searchInput?.addEventListener("input", applyFilters);
});
