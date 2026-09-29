(() => {
  let promoCode = "OPENING";
  let discountRate = 0.1;
  const planChangeEvent = "cheatblox:planpricechange";
  let active = false;
  let basePrice = null;

  function formatPrice(amount) {
    return window.CheatBloxCurrency ? window.CheatBloxCurrency.format(amount) : `$${Number(amount).toFixed(2)}`;
  }

  function priceElements() {
    return [...document.querySelectorAll("[data-plan-price], [data-plan-summary-price]")];
  }

  function renderPrices() {
    if (!Number.isFinite(basePrice)) return;
    const original = formatPrice(basePrice);
    const discounted = formatPrice(basePrice * (1 - discountRate));
    priceElements().forEach((element) => {
      element.dataset.promoBasePrice = String(basePrice);
      element.replaceChildren();
      if (active) {
        const oldPrice = document.createElement("s");
        oldPrice.className = "promo-original-price";
        oldPrice.textContent = original;
        const newPrice = document.createElement("span");
        newPrice.className = "promo-discounted-price";
        newPrice.textContent = discounted;
        element.append(oldPrice, newPrice);
      } else {
        element.textContent = original;
      }
    });
  }

  function setMessage(state) {
    const element = document.querySelector("[data-promo-message]");
    if (!element) return;
    if (state === "applied") {
      element.classList.add("is-applied");
      element.removeAttribute("data-i18n");
      const percent = Math.round(discountRate * 10000) / 100;
      element.textContent = document.documentElement.lang === "en" ? `${percent}% discount applied.` : `Скидка ${percent}% применена.`;
      return;
    }
    const key = `product-promo-${state}`;
    const fallback = { applied: "10% discount applied.", invalid: "This promo code is not valid.", empty: "Enter a promo code." };
    element.classList.toggle("is-applied", state === "applied");
    element.dataset.i18n = key;
    element.textContent = window.CheatBloxI18n?.translate(key) || fallback[state];
  }

  function handlePlanChange(event) {
    const amount = Number(event.detail?.price);
    if (!Number.isFinite(amount)) return;
    basePrice = amount;
    renderPrices();
  }

  function applyHomeSettings(home) {
    if (!home || typeof home !== "object") return;
    if (typeof home.promoCode === "string" && home.promoCode.trim()) promoCode = home.promoCode.trim();
    const percent = Number(home.promoPercent);
    if (Number.isFinite(percent) && percent >= 0 && percent <= 100) discountRate = percent / 100;
    renderPrices();
    if (active) setMessage("applied");
  }

  async function loadHomeSettings() {
    if (typeof fetch !== "function") return;
    try {
      const response = await fetch("/api/home", { headers: { Accept: "application/json" } });
      const payload = await response.json();
      if (response.ok) applyHomeSettings(payload?.home);
    } catch {
      // Product pages retain the static promotion while the settings API is unavailable.
    }
  }

  function initialize() {
    const initialPrice = Number(document.querySelector("[data-plan-price]")?.dataset.promoBasePrice);
    if (Number.isFinite(initialPrice)) {
      basePrice = initialPrice;
      renderPrices();
    }

    document.querySelector("[data-promo-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const code = document.querySelector("#promo-code")?.value.trim();
      if (!code) {
        active = false;
        renderPrices();
        setMessage("empty");
        return;
      }
      if (code.toUpperCase() !== promoCode) {
        active = false;
        renderPrices();
        setMessage("invalid");
        return;
      }
      active = true;
      renderPrices();
      setMessage("applied");
    });
  }

  function installStyles() {
    const style = document.createElement("style");
    style.textContent = ".plan-price,.plan-summary__price{display:inline-flex;align-items:baseline;flex-wrap:wrap;gap:7px}.promo-original-price{color:#918b8a;font-size:.62em;font-weight:700;text-decoration-thickness:1.5px}.promo-discounted-price{color:var(--orange,#ff9d5c)}";
    document.head.append(style);
  }

  document.addEventListener(planChangeEvent, handlePlanChange);
  document.addEventListener("currencychange", renderPrices);
  document.addEventListener("DOMContentLoaded", () => {
    installStyles();
    initialize();
    loadHomeSettings();
    document.addEventListener("languagechange", () => {
      if (active) setMessage("applied");
    });
  });
})();
