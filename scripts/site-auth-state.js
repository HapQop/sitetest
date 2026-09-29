(() => {
  const apiBase = window.AUTH_API_BASE || "/api/auth";
  let sessionPromise;
  let syncCartForUser = () => {};

  function checkSession() {
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async () => {
      try {
        const response = await fetch(`${apiBase}/session`, { method: "GET", credentials: "include" });
        if (!response.ok) return null;
        const data = await response.json();
        if (!data.ok || !data.user) return null;
        updateHeaderForLoggedInUser(data.user);
        return data.user;
      } catch (error) {
        console.error("[Auth] Session check failed:", error);
        return null;
      }
    })().finally(() => { sessionPromise = null; });
    return sessionPromise;
  }

  function updateHeaderForLoggedInUser(user) {
    syncCartForUser(user);
    const loginLink = document.querySelector(".login-link");
    const registerLink = document.querySelector(".register-link");

    if (loginLink) loginLink.style.display = "none";
    if (registerLink) registerLink.style.display = "none";

    // Создаем элемент с именем пользователя и кнопкой выхода
    const siteControls = document.querySelector(".site-controls");
    if (siteControls && !document.querySelector(".user-menu")) {
      const page = document.body.dataset.page;
      const productPages = ["isaeva", "cosmic", "volt", "pottasium", "real", "lumen", "wave"];
      const section = page === "nav-home" ? "home" : page === "exploits" ? "exploits" : page === "products" || productPages.includes(page) ? "products" : null;
      const productHash = productPages.includes(page) ? `#product-${page}` : "";
      const adminHref = section ? `admin.html?section=${section}${productHash}` : "admin.html";
      const adminLabel = section ? "Редактировать текущую страницу" : "Открыть админ-панель";
      const adminText = section ? "✎ Редактировать" : "✎ Панель";
      const userMenu = document.createElement("div");
      userMenu.className = "user-menu";
      userMenu.innerHTML = `
        <span class="user-name">${escapeHtml(user.username)}</span>
        ${user.isAdmin === true && page !== "admin" ? `<a class="admin-link" href="${adminHref}" aria-label="${adminLabel}">${adminText}</a>` : ""}
        <button class="logout-btn" aria-label="Logout">Logout</button>
      `;

      siteControls.appendChild(userMenu);

      // Обработчик выхода
      const logoutBtn = userMenu.querySelector(".logout-btn");
      logoutBtn.addEventListener("click", async () => {
        try {
          await fetch(`${apiBase}/logout`, {
            method: "POST",
            credentials: "include",
          });
          window.location.reload();
        } catch (error) {
          console.error("Logout failed:", error);
        }
      });
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function initCart() {
    const controls = document.querySelector(".site-controls");
    const language = controls?.querySelector(".language-toggle");
    if (!language) return;

    const cartButton = document.createElement("button");
    cartButton.type = "button";
    cartButton.className = "cart-trigger";
    cartButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 9 4-6m10 6-4-6M3 9h18v2H3zM4 11l2 10h12l2-10M9 15l.5 3m5.5-3-.5 3M12 15v3"/></svg><span class="cart-trigger__label"></span><span class="cart-trigger__count" aria-live="polite">0</span>';
    language.insertAdjacentElement("afterend", cartButton);

    const dialog = document.createElement("dialog");
    dialog.className = "cart-dialog";
    dialog.setAttribute("aria-labelledby", "cart-dialog-title");
    dialog.innerHTML = '<div class="cart-dialog__heading"><h2 id="cart-dialog-title"></h2><button type="button" class="cart-dialog__close" aria-label="Close">×</button></div><p class="cart-dialog__message"></p>';
    document.body.appendChild(dialog);
    dialog.querySelector(".cart-dialog__close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

    const countBadge = cartButton.querySelector(".cart-trigger__count");
    let cartCount = 0;
    let cartUserKey = null;

    function updateCount() {
      countBadge.textContent = String(cartCount);
      const translate = (key) => window.CheatBloxI18n?.translate(key) || key;
      cartButton.title = `${translate("cart-title")}: ${cartCount}`;
      const heading = dialog.querySelector("h2");
      heading.textContent = `${translate("cart-title")} (${cartCount})`;
    }

    syncCartForUser = (user) => {
      const key = `cheatblox-cart-count:${user.id ?? user.username}`;
      if (key === cartUserKey) return;
      cartUserKey = key;
      try {
        const savedCount = Number(window.localStorage.getItem(key));
        cartCount = Number.isSafeInteger(savedCount) && savedCount > 0 ? savedCount : 0;
      } catch {
        cartCount = 0;
      }
      updateCount();
    };

    const productButtons = [];
    document.querySelectorAll(".catalog-products > .store-card-link[data-product-id]").forEach((link) => {
      const item = document.createElement("div");
      item.className = "store-card-item";
      item.dataset.productGame = link.dataset.productGame;
      link.removeAttribute("data-product-game");
      link.before(item);
      item.appendChild(link);

      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "catalog-add-to-cart";
      addButton.setAttribute("data-add-to-cart", "");
      item.appendChild(addButton);
      const stock = link.querySelector(".store-card__stock");
      if (stock) {
        const syncStock = () => { addButton.disabled = stock.classList.contains("is-out"); };
        syncStock();
        new MutationObserver(syncStock).observe(stock, { attributes: true, attributeFilter: ["class"] });
      }
      productButtons.push(addButton);
    });

    const purchaseButton = document.querySelector(".plan-panel [data-select-plan]");
    if (purchaseButton) {
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "detail-add-to-cart";
      addButton.setAttribute("data-add-to-cart", "");
      purchaseButton.insertAdjacentElement("afterend", addButton);
      const syncPlan = () => { addButton.disabled = purchaseButton.disabled; };
      syncPlan();
      new MutationObserver(syncPlan).observe(purchaseButton, { attributes: true, attributeFilter: ["disabled"] });
      productButtons.push(addButton);
    }

    function updateLabels() {
      const translate = (key) => window.CheatBloxI18n?.translate(key) || key;
      cartButton.querySelector(".cart-trigger__label").textContent = translate("cart-title");
      updateCount();
      dialog.querySelector(".cart-dialog__message").textContent = translate("cart-coming-soon");
      dialog.querySelector(".cart-dialog__close").setAttribute("aria-label", translate("cart-close"));
      productButtons.forEach((button) => { button.textContent = translate("cart-add"); });
    }

    async function openCart() {
      if (dialog.open) return;
      const user = await checkSession();
      if (!user) {
        window.location.href = "auth.html?mode=login";
        return;
      }
      if (!dialog.open) dialog.showModal();
    }

    cartButton.addEventListener("click", openCart);
    document.addEventListener("click", async (event) => {
      const addButton = event.target.closest?.("[data-add-to-cart]");
      if (!addButton || addButton.disabled) return;
      const user = await checkSession();
      if (!user) {
        window.location.href = "auth.html?mode=login";
        return;
      }
      cartCount += 1;
      try { window.localStorage.setItem(cartUserKey, String(cartCount)); } catch { /* Keep the count for this page. */ }
      updateCount();
      if (!dialog.open) dialog.showModal();
    });
    document.addEventListener("languagechange", updateLabels);
    updateLabels();
  }

  function init() {
    initCart();
    checkSession();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  // Экспортируем функцию для использования после успешного логина
  window.CheatBloxAuth = { checkSession, updateHeaderForLoggedInUser };
})();
