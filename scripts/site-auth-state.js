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

    const siteControls = document.querySelector(".site-controls");
    if (siteControls && !document.querySelector(".user-menu")) {
      const page = document.body.dataset.page;
      const productPages = ["isaeva", "cosmic", "volt", "pottasium", "real", "lumen", "wave", "sirhurt", "synapsez", "matcha", "serotonin", "kiciahook", "yabujin", "severe", "mspaint", "matrixhub", "ronin", "axis"];
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
      userMenu.querySelector(".logout-btn").addEventListener("click", async () => {
        try {
          await fetch(`${apiBase}/logout`, { method: "POST", credentials: "include" });
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
    const translate = (key) => window.CheatBloxI18n?.translate(key) || key;

    const cartButton = document.createElement("button");
    cartButton.type = "button";
    cartButton.className = "cart-trigger";
    cartButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 9 4-6m10 6-4-6M3 9h18v2H3zM4 11l2 10h12l2-10M9 15l.5 3m5.5-3-.5 3M12 15v3"/></svg><span class="cart-trigger__label"></span><span class="cart-trigger__count" aria-live="polite">0</span>';
    language.insertAdjacentElement("afterend", cartButton);

    const dialog = document.createElement("dialog");
    dialog.className = "cart-dialog";
    dialog.setAttribute("aria-labelledby", "cart-dialog-title");
    dialog.innerHTML = '<div class="cart-dialog__heading"><div><h2 id="cart-dialog-title"></h2><p class="cart-dialog__subtitle"></p></div><button type="button" class="cart-dialog__close" aria-label="Close">×</button></div><div class="cart-dialog__items" aria-live="polite"></div><footer class="cart-dialog__footer"><div class="cart-dialog__total"><span></span><strong></strong></div></footer>';
    document.body.appendChild(dialog);

    const countBadge = cartButton.querySelector(".cart-trigger__count");
    const heading = dialog.querySelector("h2");
    const subtitle = dialog.querySelector(".cart-dialog__subtitle");
    const itemsContainer = dialog.querySelector(".cart-dialog__items");
    const totalLabel = dialog.querySelector(".cart-dialog__total span");
    const totalValue = dialog.querySelector(".cart-dialog__total strong");
    let cartItems = [];
    let cartUserKey = null;

    function formatPrice(amount) {
      return window.CheatBloxCurrency?.format ? window.CheatBloxCurrency.format(amount) : `$${Number(amount).toFixed(2)}`;
    }

    function totalQuantity() {
      return cartItems.reduce((sum, item) => sum + item.quantity, 0);
    }

    function totalPrice() {
      return cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    }

    function saveCart() {
      if (!cartUserKey) return;
      try { window.localStorage.setItem(cartUserKey, JSON.stringify(cartItems)); } catch { /* The cart remains available during this visit. */ }
    }

    function readCart(key) {
      try {
        const saved = JSON.parse(window.localStorage.getItem(key) || "[]");
        if (!Array.isArray(saved)) return [];
        return saved.filter((item) => item && typeof item.productId === "string" && typeof item.planId === "string"
          && typeof item.productName === "string" && typeof item.planName === "string"
          && Number.isFinite(item.unitPrice) && item.unitPrice >= 0
          && Number.isSafeInteger(item.quantity) && item.quantity > 0);
      } catch {
        return [];
      }
    }

    function updateCartButton() {
      const quantity = totalQuantity();
      countBadge.textContent = String(quantity);
      cartButton.title = `${translate("cart-title")}: ${quantity}`;
    }

    function renderCart() {
      const quantity = totalQuantity();
      heading.textContent = translate("cart-title");
      subtitle.textContent = quantity ? `${quantity} ${translate("cart-items")}` : translate("cart-empty");
      totalLabel.textContent = translate("cart-total");
      totalValue.textContent = formatPrice(totalPrice());
      if (!cartItems.length) {
        itemsContainer.innerHTML = `<p class="cart-dialog__empty">${escapeHtml(translate("cart-empty"))}</p>`;
        return;
      }
      itemsContainer.innerHTML = cartItems.map((item, index) => `
        <article class="cart-item">
          <div class="cart-item__details"><strong>${escapeHtml(item.productName)}</strong><span>${escapeHtml(item.planName)}</span></div>
          <strong class="cart-item__price">${escapeHtml(formatPrice(item.unitPrice * item.quantity))}</strong>
          <div class="cart-item__controls"><span>${escapeHtml(translate("cart-quantity"))}</span><button type="button" data-cart-action="decrease" data-cart-item-index="${index}" aria-label="${escapeHtml(translate("cart-decrease"))}">−</button><b>${item.quantity}</b><button type="button" data-cart-action="increase" data-cart-item-index="${index}" aria-label="${escapeHtml(translate("cart-increase"))}">+</button><button type="button" class="cart-item__remove" data-cart-action="remove" data-cart-item-index="${index}">${escapeHtml(translate("cart-remove"))}</button></div>
        </article>
      `).join("");
    }

    function refreshCart() {
      updateCartButton();
      renderCart();
    }

    syncCartForUser = (user) => {
      const key = `cheatblox-cart:${user.id ?? user.username}`;
      if (key === cartUserKey) return;
      cartUserKey = key;
      cartItems = readCart(key);
      refreshCart();
    };

    function currentCartItem() {
      const main = document.querySelector("main[data-plan]") || document.querySelector("main");
      const price = document.querySelector("[data-plan-price]");
      const unitPrice = Number(price?.dataset.promoBasePrice);
      const productName = document.querySelector(".product-heading h1")?.textContent.trim();
      const planName = document.querySelector("[data-plan-summary-name]")?.textContent.trim();
      const productId = document.body.dataset.page;
      const planId = main?.dataset.plan;
      if (!productId || !planId || !productName || !planName || !Number.isFinite(unitPrice) || unitPrice < 0) return null;
      return { productId, planId, productName, planName, unitPrice, quantity: 1 };
    }

    function flyToCart(source) {
      if (typeof source?.getBoundingClientRect !== "function" || typeof cartButton.getBoundingClientRect !== "function") return;
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
      const start = source.getBoundingClientRect();
      const end = cartButton.getBoundingClientRect();
      const dot = document.createElement("span");
      dot.className = "cart-fly-dot";
      dot.style.left = `${start.left + start.width / 2}px`;
      dot.style.top = `${start.top + start.height / 2}px`;
      document.body.appendChild(dot);
      const animation = dot.animate?.([
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
        { transform: `translate(${end.left + end.width / 2 - (start.left + start.width / 2)}px, ${end.top + end.height / 2 - (start.top + start.height / 2)}px) scale(.25)`, opacity: .4 },
      ], { duration: 560, easing: "cubic-bezier(.2,.8,.2,1)" });
      if (animation?.finished) animation.finished.finally(() => dot.remove());
      else window.setTimeout?.(() => dot.remove(), 600);
      cartButton.classList.add("is-bumped");
      window.setTimeout?.(() => cartButton.classList.remove("is-bumped"), 420);
    }

    const purchaseButton = document.querySelector(".plan-panel [data-select-plan]");
    let addButton;
    if (purchaseButton) {
      addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "detail-add-to-cart";
      addButton.setAttribute("data-add-to-cart", "");
      purchaseButton.insertAdjacentElement("afterend", addButton);
      const syncPlan = () => { addButton.disabled = purchaseButton.disabled; };
      syncPlan();
      new MutationObserver(syncPlan).observe(purchaseButton, { attributes: true, attributeFilter: ["disabled"] });
    }

    async function openCart() {
      if (dialog.open) return;
      const user = await checkSession();
      if (!user) {
        window.location.href = "auth.html?mode=login";
        return;
      }
      renderCart();
      if (!dialog.open) dialog.showModal();
    }

    dialog.querySelector(".cart-dialog__close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        dialog.close();
        return;
      }
      const action = event.target.closest?.("[data-cart-action]");
      if (!action) return;
      const index = Number(action.dataset.cartItemIndex);
      if (!Number.isInteger(index) || !cartItems[index]) return;
      if (action.dataset.cartAction === "increase") cartItems[index].quantity += 1;
      if (action.dataset.cartAction === "decrease") {
        cartItems[index].quantity -= 1;
        if (cartItems[index].quantity < 1) cartItems.splice(index, 1);
      }
      if (action.dataset.cartAction === "remove") cartItems.splice(index, 1);
      saveCart();
      refreshCart();
    });

    cartButton.addEventListener("click", openCart);
    document.addEventListener("click", async (event) => {
      const clickedAddButton = event.target.closest?.("[data-add-to-cart]");
      if (!clickedAddButton || clickedAddButton.disabled) return;
      const user = await checkSession();
      if (!user) {
        window.location.href = "auth.html?mode=login";
        return;
      }
      const item = currentCartItem();
      if (!item) return;
      const existing = cartItems.find((entry) => entry.productId === item.productId && entry.planId === item.planId && entry.unitPrice === item.unitPrice);
      if (existing) existing.quantity += 1;
      else cartItems.push(item);
      saveCart();
      refreshCart();
      flyToCart(clickedAddButton);
    });
    document.addEventListener("languagechange", refreshCart);
    document.addEventListener("currencychange", renderCart);

    cartButton.querySelector(".cart-trigger__label").textContent = translate("cart-title");
    dialog.querySelector(".cart-dialog__close").setAttribute("aria-label", translate("cart-close"));
    if (addButton) addButton.textContent = translate("cart-add");
    refreshCart();
  }

  function init() {
    initCart();
    checkSession();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();

  window.CheatBloxAuth = { checkSession, updateHeaderForLoggedInUser };
})();
