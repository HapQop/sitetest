(() => {
  const currency = { code: "USD", symbol: "$" };

  function formatPrice(amount) {
    const value = Number(amount);
    return `${currency.symbol}${(Number.isFinite(value) ? value : 0).toFixed(2)}`;
  }

  function applyCurrency() {
    document.querySelectorAll("[data-currency-price]").forEach((element) => {
      element.textContent = formatPrice(element.dataset.currencyPrice);
    });
    document.querySelectorAll("[data-currency-code]").forEach((element) => {
      element.textContent = currency.code;
    });
    window.CheatBloxCurrency = { format: formatPrice, code: currency.code };
    document.dispatchEvent(new CustomEvent("currencychange", { detail: currency }));
  }

  document.addEventListener("DOMContentLoaded", applyCurrency);
})();
