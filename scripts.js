document.addEventListener("DOMContentLoaded", () => {
  const favoriteFilter = document.querySelector("[data-favorite-filter]");
  const searchInput = document.querySelector("[data-script-search]");
  const emptyState = document.querySelector("[data-scripts-empty]");
  const cards = [...document.querySelectorAll(".script-card-shell")];
  const favoriteFilterKey = "cheatblox-scripts-favorites-filter";

  if (!favoriteFilter && !searchInput) return;

  function isFavorite(scriptId) {
    return localStorage.getItem(`cheatblox-script-${scriptId}-favorite`) === "true";
  }

  function applyFilters() {
    const favoriteOnly = favoriteFilter?.classList.contains("is-active") ?? false;
    const query = (searchInput?.value || "").trim().toLocaleLowerCase();
    let visibleCount = 0;
    cards.forEach((card) => {
      const scriptId = card.querySelector(".script-card")?.dataset.scriptId;
      const title = card.querySelector(".script-card h2")?.textContent.trim().toLocaleLowerCase() || "";
      const matchesFavorite = !favoriteOnly || isFavorite(scriptId);
      const matchesSearch = !query || title.startsWith(query);
      const visible = matchesFavorite && matchesSearch;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    if (emptyState) emptyState.hidden = visibleCount > 0;
  }

  favoriteFilter?.addEventListener("click", () => {
    const active = !favoriteFilter.classList.contains("is-active");
    favoriteFilter.classList.toggle("is-active", active);
    favoriteFilter.setAttribute("aria-pressed", String(active));
    localStorage.setItem(favoriteFilterKey, String(active));
    applyFilters();
  });

  searchInput?.addEventListener("input", applyFilters);

  const savedFavoriteFilter = localStorage.getItem(favoriteFilterKey) === "true";
  favoriteFilter?.classList.toggle("is-active", savedFavoriteFilter);
  favoriteFilter?.setAttribute("aria-pressed", String(savedFavoriteFilter));

  applyFilters();
});
