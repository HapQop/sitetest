(() => {
  const storageKey = "cheatblox-currency";
  const ratesStorageKey = "cheatblox-currency-rates";
  const ratesApiUrl = "https://open.er-api.com/v6/latest/USD";
  const ratesCacheTtl = 6 * 60 * 60 * 1000;
  const currencies = [
    { code: "USD", symbol: "$", name: "US Dollar", rate: 1, digits: 2 },
    { code: "EUR", symbol: "€", name: "Euro", rate: 0.92, digits: 2 },
    { code: "RUB", symbol: "₽", name: "Russian Ruble", rate: 90, digits: 2 },
    { code: "UAH", symbol: "₴", name: "Ukrainian Hryvnia", rate: 41, digits: 2 },
    { code: "BYN", symbol: "Br", name: "Belarusian Ruble", rate: 3.25, digits: 2 },
    { code: "KZT", symbol: "₸", name: "Kazakhstani Tenge", rate: 480, digits: 2 },
    { code: "BRL", symbol: "R$", name: "Brazilian Real", rate: 5.5, digits: 2 },
    { code: "GBP", symbol: "£", name: "British Pound", rate: 0.78, digits: 2 },
    { code: "JPY", symbol: "¥", name: "Japanese Yen", rate: 155, digits: 0 },
    { code: "INR", symbol: "₹", name: "Indian Rupee", rate: 84, digits: 2 },
  ];

  let selected = currencies.find((currency) => currency.code === localStorage.getItem(storageKey)) || currencies[0];

  function formatPrice(usdAmount) {
    const value = Number(usdAmount) * selected.rate;
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: selected.digits,
      maximumFractionDigits: selected.digits,
    }).format(value);
    return `${selected.symbol}${formatted}`;
  }

  function closeMenus() {
    document.querySelectorAll(".currency-menu.is-open").forEach((menu) => {
      menu.classList.remove("is-open");
      menu.querySelector(".currency-trigger")?.setAttribute("aria-expanded", "false");
    });
  }

  function applyCurrency() {
    document.querySelectorAll("[data-currency-code]").forEach((element) => {
      element.textContent = selected.code;
    });
    document.querySelectorAll("[data-currency-price]").forEach((element) => {
      element.textContent = formatPrice(element.dataset.currencyPrice);
    });
    window.CheatBloxCurrency = { format: formatPrice, code: selected.code };
    document.dispatchEvent(new CustomEvent("currencychange", { detail: selected }));
  }

  function applyRates(rates) {
    let changed = false;
    currencies.forEach((currency) => {
      const rate = Number(rates[currency.code]);
      if (!Number.isFinite(rate) || rate <= 0) return;
      currency.rate = rate;
      changed = true;
    });
    if (changed) applyCurrency();
  }

  function readCachedRates() {
    try {
      const cached = JSON.parse(localStorage.getItem(ratesStorageKey) || "null");
      if (!cached || Date.now() - cached.savedAt > ratesCacheTtl) return null;
      return cached.rates;
    } catch {
      return null;
    }
  }

  async function refreshRates() {
    const cachedRates = readCachedRates();
    if (cachedRates) applyRates(cachedRates);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(ratesApiUrl, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Rates request failed: ${response.status}`);
      const data = await response.json();
      if (data.result !== "success" || !data.rates || typeof data.rates !== "object") throw new Error("Rates response is invalid");
      localStorage.setItem(ratesStorageKey, JSON.stringify({ savedAt: Date.now(), rates: data.rates }));
      applyRates(data.rates);
    } catch {
      // Static rates remain active when the remote service is unavailable.
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function createMenu(controls) {
    if (controls.querySelector(".currency-menu")) return;

    const menu = document.createElement("div");
    menu.className = "currency-menu";
    menu.innerHTML =
      '<button class="currency-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Choose currency">' +
        '<span data-currency-code></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>' +
      '</button>' +
      '<div class="currency-panel" role="listbox" aria-label="Currencies"></div>';

    const panel = menu.querySelector(".currency-panel");
    currencies.forEach((currency) => {
      const option = document.createElement("button");
      option.className = "currency-option";
      option.type = "button";
      option.role = "option";
      option.dataset.currency = currency.code;
      option.innerHTML = `<span><strong>${currency.symbol}</strong><b>${currency.code}</b></span><small>${currency.name}</small>`;
      option.addEventListener("click", () => {
        selected = currency;
        localStorage.setItem(storageKey, currency.code);
        closeMenus();
        applyCurrency();
      });
      panel.appendChild(option);
    });

    const trigger = menu.querySelector(".currency-trigger");
    panel.addEventListener("wheel", (event) => {
      event.preventDefault();
      event.stopPropagation();
      panel.scrollBy({ top: event.deltaY * 0.55, behavior: "smooth" });
    }, { passive: false });
    trigger.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      closeMenus();
      if (open) {
        menu.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });
    controls.insertBefore(menu, controls.querySelector(".language-toggle"));
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".site-controls").forEach(createMenu);
    applyCurrency();
    refreshRates();
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".currency-menu")) closeMenus();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenus();
    });
  });
})();
