(() => {
  const apiUrl = "/api/catalog";
  const productByPage = { isaeva: "isaeva", cosmic: "cosmic", volt: "volt", pottasium: "pottasium", real: "real", lumen: "lumen", wave: "wave" };
  const bodyProductId = productByPage[document.body?.dataset.page];

  function formatStock(plan) {
    if (plan.stock === null || plan.stock === undefined) return plan.available ? "Available" : "0 available";
    return `${plan.stock} available`;
  }

  function formatPrice(amount) {
    return window.CheatBloxCurrency ? window.CheatBloxCurrency.format(amount) : `$${Number(amount).toFixed(2)}`;
  }

  function applyCatalogCards(catalog) {
    document.querySelectorAll("[data-product-id]").forEach((card) => {
      const product = catalog[card.dataset.productId];
      if (!product) return;
      const firstPlan = Object.values(product.plans || {}).find((plan) => plan.available) || Object.values(product.plans || {})[0];
      if (!firstPlan) return;
      const price = card.querySelector("[data-currency-price]");
      if (price) {
        price.dataset.currencyPrice = String(firstPlan.price);
        price.textContent = formatPrice(firstPlan.price);
      }
      const stock = card.querySelector(".store-card__stock");
      if (stock) {
        stock.textContent = formatStock(firstPlan);
        stock.classList.toggle("is-out", !firstPlan.available);
      }
    });
  }

  function applyDetailProduct(product) {
    if (!product) return;
    const buttons = [...document.querySelectorAll("[data-plan-option]")];
    const plans = product.plans || {};
    const state = { current: buttons.find((button) => button.classList.contains("is-active"))?.dataset.planOption || Object.keys(plans)[0] };
    const page = document.querySelector("main");
    const panel = document.querySelector(".plan-panel");
    const price = document.querySelector("[data-plan-price]");
    const headingStock = document.querySelector("[data-plan-stock]");
    const planName = document.querySelector("[data-plan-name]");
    const summaryName = document.querySelector("[data-plan-summary-name]");
    const summaryStock = document.querySelector("[data-plan-summary-stock]");
    const summaryPrice = document.querySelector("[data-plan-summary-price]");
    const selectPlan = document.querySelector("[data-select-plan]");
    const planLabel = document.querySelector("[data-plan-label]");
    const message = document.querySelector("[data-plan-message]");

    function setPlan(planId) {
      const plan = plans[planId];
      if (!plan) return;
      state.current = planId;
      buttons.forEach((button) => {
        const active = button.dataset.planOption === planId;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
      });
      page.dataset.plan = planId;
      panel?.classList.toggle("is-unavailable", !plan.available);
      if (price) price.textContent = formatPrice(plan.price);
      if (headingStock) {
        headingStock.textContent = formatStock(plan);
        headingStock.classList.toggle("is-out", !plan.available);
      }
      if (planName) planName.textContent = plan.access;
      if (summaryName) summaryName.textContent = plan.name;
      if (summaryPrice) summaryPrice.textContent = formatPrice(plan.price);
      if (summaryStock) {
        summaryStock.textContent = formatStock(plan);
        summaryStock.classList.toggle("is-out", !plan.available);
      }
      if (selectPlan) selectPlan.disabled = !plan.available;
      if (planLabel) planLabel.textContent = `Purchase ${plan.name}`;
      if (message) {
        message.textContent = plan.available ? "Available now" : "Out of stock";
        message.classList.toggle("is-out", !plan.available);
      }
    }

    buttons.forEach((button) => button.addEventListener("click", () => setPlan(button.dataset.planOption)));
    document.addEventListener("currencychange", () => setPlan(state.current));
    setPlan(state.current);
  }

  async function loadCatalog() {
    try {
      const response = await fetch(apiUrl, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Catalog request failed");
      const data = await response.json();
      if (!data.catalog) throw new Error("Catalog response is invalid");
      applyCatalogCards(data.catalog);
      if (bodyProductId) applyDetailProduct(data.catalog[bodyProductId]);
    } catch {
      // Static HTML values remain active when the optional catalog API is unavailable.
    }
  }

  document.addEventListener("DOMContentLoaded", loadCatalog);
})();
