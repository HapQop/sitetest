(() => {
  const russianCountries = new Set(["RU", "UA", "BY", "KZ", "AM", "AZ", "GE", "KG", "MD", "TJ", "TM", "UZ"]);
  const euroCountries = new Set([
    "AT", "BE", "BG", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK",
    "AD", "MC", "SM", "VA", "ME", "XK", "AX", "BL", "GF", "GP", "MF", "MQ", "PM", "RE", "YT",
  ]);
  const countryCurrencies = {
    US: "USD", RU: "RUB", UA: "UAH", BY: "BYN", KZ: "KZT", BR: "BRL", GB: "GBP", JP: "JPY", IN: "INR",
    AM: "AMD", AZ: "AZN", GE: "GEL", KG: "KGS", MD: "MDL", TJ: "TJS", TM: "TMT", UZ: "UZS",
    GG: "GBP", JE: "GBP", IM: "GBP",
  };
  const supportedCurrencies = new Set(["EUR", ...Object.values(countryCurrencies)]);

  function readPreference(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function savePreference(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Keep the selection for this page when storage is unavailable. */ }
  }

  function currencyForCountry(country) {
    return euroCountries.has(country) ? "EUR" : countryCurrencies[country] || "USD";
  }

  const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language || "en"];
  const browserLanguage = browserLanguages.map((value) => value.split("-")[0].toLowerCase())
    .find((value) => value === "ru" || value === "en") || "en";
  let browserCountry = null;
  for (const language of browserLanguages) {
    try { browserCountry = new Intl.Locale(language).region || null; } catch { continue; }
    if (browserCountry) break;
  }

  const savedLanguage = readPreference("cheatblox-language");
  const savedCurrency = readPreference("cheatblox-currency");
  let manualLanguage = savedLanguage === "ru" || savedLanguage === "en";
  let manualCurrency = supportedCurrencies.has(savedCurrency);
  let language = manualLanguage ? savedLanguage : browserLanguage;
  let currency = manualCurrency ? savedCurrency : currencyForCountry(browserCountry);
  let country = null;

  function notify() {
    document.dispatchEvent(new CustomEvent("cheatblox:localechange", { detail: { country, language, currency } }));
  }

  async function detectCountry() {
    if (manualLanguage && manualCurrency) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch("/api/locale", {
        signal: controller.signal, cache: "no-store", headers: { Accept: "application/json" },
      });
      if (!response.ok) return;
      const data = await response.json();
      const value = typeof data?.country === "string" ? data.country.trim().toUpperCase() : "";
      if (!/^[A-Z]{2}$/.test(value) || value === "XX" || value === "ZZ") return;
      country = value;
      if (!manualLanguage) language = russianCountries.has(country) ? "ru" : "en";
      if (!manualCurrency) currency = currencyForCountry(country);
      notify();
    } catch {
      // Browser preferences keep the site usable without Vercel or while offline.
    } finally {
      window.clearTimeout(timeout);
    }
  }

  window.CheatBloxLocale = {
    get language() { return language; },
    get currency() { return currency; },
    get country() { return country; },
    setLanguage(value) {
      if (value !== "ru" && value !== "en") return;
      manualLanguage = true;
      language = value;
      savePreference("cheatblox-language", value);
      notify();
    },
    setCurrency(value) {
      if (!supportedCurrencies.has(value)) return;
      manualCurrency = true;
      currency = value;
      savePreference("cheatblox-currency", value);
      notify();
    },
    ready: detectCountry(),
  };
})();
