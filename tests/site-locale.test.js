const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../scripts/site-locale.js"), "utf8");

function setup({ languages = ["en-US"], saved = {}, country = "US", fetchError = false, httpError = false, jsonError = false, storageError = false, writeError = false, deferred = false } = {}) {
  const values = new Map(Object.entries(saved));
  const events = [];
  const requests = [];
  let release;
  const response = () => fetchError ? Promise.reject(new Error("offline")) : Promise.resolve({ ok: !httpError, json: async () => { if (jsonError) throw new Error("invalid JSON"); return { country }; } });
  const fetch = (url, options) => {
    requests.push({ url, options });
    return deferred ? new Promise((resolve, reject) => { release = () => response().then(resolve, reject); }) : response();
  };
  const localStorage = {
    getItem(key) { if (storageError) throw new Error("storage denied"); return values.get(key) ?? null; },
    setItem(key, value) { if (storageError || writeError) throw new Error("storage denied"); values.set(key, value); },
  };
  class CustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  const navigator = { languages, language: languages[0] || "" };
  const document = { documentElement: { lang: "en" }, dispatchEvent(event) { events.push(event); } };
  const window = { navigator, localStorage, fetch, CustomEvent, setTimeout, clearTimeout, AbortController, Intl, location: { origin: "https://example.test" } };
  vm.runInNewContext(source, { window, document, navigator, localStorage, fetch, CustomEvent, Intl, AbortController, setTimeout, clearTimeout, console });
  const locale = window.CheatBloxLocale;
  assert.ok(locale, "locale service is exported immediately");
  assert.equal(typeof locale.ready?.then, "function");
  return { locale, events, requests, values, release: () => { assert.ok(release, "pending fetch exists"); release(); } };
}

function state(locale) { return { language: locale.language, currency: locale.currency, country: locale.country }; }

test("locale exports browser fallback immediately and ready waits for one same-origin GET", async () => {
  const page = setup({ languages: ["fr-FR", "ru-UA"], country: "US", deferred: true });
  assert.deepEqual(state(page.locale), { language: "ru", currency: "EUR", country: null });
  let settled = false;
  page.locale.ready.then(() => { settled = true; });
  await new Promise(setImmediate);
  assert.equal(settled, false);
  assert.equal(page.requests.length, 1);
  assert.equal(page.requests[0].url, "/api/locale");
  assert.equal(page.requests[0].options?.method || "GET", "GET");
  page.release();
  await page.locale.ready;
  assert.deepEqual(state(page.locale), { language: "en", currency: "USD", country: "US" });
  assert.equal(page.requests.length, 1);
});

test("country currency mapping covers supported countries and eurozone", async () => {
  const cases = { UA: "UAH", RU: "RUB", BY: "BYN", KZ: "KZT", AM: "AMD", AZ: "AZN", GE: "GEL", KG: "KGS", MD: "MDL", TJ: "TJS", TM: "TMT", UZ: "UZS", BR: "BRL", GB: "GBP", JP: "JPY", IN: "INR", US: "USD", AT: "EUR", BE: "EUR", BG: "EUR", HR: "EUR", CY: "EUR", EE: "EUR", FI: "EUR", FR: "EUR", DE: "EUR", GR: "EUR", IE: "EUR", IT: "EUR", LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR", NL: "EUR", PT: "EUR", SK: "EUR", SI: "EUR", ES: "EUR" };
  for (const [country, currency] of Object.entries(cases)) {
    const page = setup({ country });
    await page.locale.ready;
    assert.equal(page.locale.currency, currency, country);
    assert.equal(page.locale.country, country, country);
  }
});

test("detected country selects Russian for CIS countries and English elsewhere", async () => {
  for (const country of ["UA", "RU", "BY", "KZ", "AM", "AZ", "GE", "KG", "MD", "TJ", "TM", "UZ"]) {
    const page = setup({ country }); await page.locale.ready;
    assert.equal(page.locale.language, "ru", country);
  }
  for (const country of ["US", "GB", "IE", "CA", "AU", "NZ", "IN", "SG", "ZA", "DE", "FR", "BR", "JP", "EE", "LV", "LT"]) {
    const page = setup({ country, languages: ["ru-RU"] }); await page.locale.ready;
    assert.equal(page.locale.language, "en", country);
  }
});

test("failed or malformed geolocation preserves language and browser region fallback", async () => {
  for (const options of [{ country: null }, { country: "USA" }, { country: "XX" }, { country: "ZZ" }, { country: 123 }, { fetchError: true }, { httpError: true }, { jsonError: true }]) {
    const page = setup({ languages: ["uk-UA", "ru-RU"], ...options }); await page.locale.ready;
    assert.deepEqual(state(page.locale), { language: "ru", currency: "UAH", country: null });
  }
  for (const [languages, currency, language] of [[["ja-JP"], "JPY", "en"], [["en-GB", "ru-RU"], "GBP", "en"], [["ru"], "USD", "ru"], [["bad_locale"], "USD", "en"], [[], "USD", "en"]]) {
    const page = setup({ languages, fetchError: true }); await page.locale.ready;
    assert.equal(page.locale.currency, currency);
    assert.equal(page.locale.language, language);
  }
  const unknown = setup({ country: "CH", languages: ["ru-UA"] }); await unknown.locale.ready;
  assert.equal(unknown.locale.language, "en");
  assert.equal(unknown.locale.currency, "USD");
});

test("valid saved preferences independently override country defaults", async () => {
  for (const [saved, expected] of [
    [{ "cheatblox-language": "en" }, { language: "en", currency: "RUB" }],
    [{ "cheatblox-currency": "JPY" }, { language: "ru", currency: "JPY" }],
    [{ "cheatblox-language": "unsupported", "cheatblox-currency": "BAD" }, { language: "ru", currency: "RUB" }],
    [{ "cheatblox-language": "en", "cheatblox-currency": "UAH" }, { language: "en", currency: "UAH" }],
  ]) {
    const page = setup({ saved, country: "RU" }); await page.locale.ready;
    assert.equal(page.locale.language, expected.language);
    assert.equal(page.locale.currency, expected.currency);
  }
});

test("manual language changes survive late country response without locking currency", async () => {
  const page = setup({ country: "RU", deferred: true });
  page.locale.setLanguage("en");
  assert.equal(page.values.get("cheatblox-language"), "en");
  assert.equal(page.events.at(-1).type, "cheatblox:localechange");
  assert.deepEqual({ ...page.events.at(-1).detail }, { language: "en", currency: "USD", country: null });
  page.release(); await page.locale.ready;
  assert.deepEqual(state(page.locale), { language: "en", currency: "RUB", country: "RU" });
});

test("manual currency changes survive late country response without locking language", async () => {
  const page = setup({ country: "RU", deferred: true });
  page.locale.setCurrency("EUR");
  assert.equal(page.values.get("cheatblox-currency"), "EUR");
  assert.deepEqual({ ...page.events.at(-1).detail }, { language: "en", currency: "EUR", country: null });
  page.release(); await page.locale.ready;
  assert.deepEqual(state(page.locale), { language: "ru", currency: "EUR", country: "RU" });
});

test("manual preferences persist for every supported currency and language", async () => {
  const page = setup(); await page.locale.ready;
  for (const currency of ["USD", "EUR", "RUB", "UAH", "BYN", "KZT", "BRL", "GBP", "JPY", "INR", "AMD", "AZN", "GEL", "KGS", "MDL", "TJS", "TMT", "UZS"]) {
    page.locale.setCurrency(currency);
    assert.equal(page.locale.currency, currency);
    assert.equal(page.values.get("cheatblox-currency"), currency);
  }
  for (const language of ["ru", "en"]) {
    page.locale.setLanguage(language);
    assert.equal(page.locale.language, language);
    assert.equal(page.values.get("cheatblox-language"), language);
  }
  assert.equal(page.events.at(-1).type, "cheatblox:localechange");
  assert.deepEqual({ ...page.events.at(-1).detail }, state(page.locale));
});

test("denied storage does not prevent fallback, geolocation, or manual override", async () => {
  const page = setup({ country: "RU", storageError: true, deferred: true });
  assert.equal(page.locale.language, "en");
  assert.doesNotThrow(() => page.locale.setCurrency("UAH"));
  page.release(); await page.locale.ready;
  assert.deepEqual(state(page.locale), { language: "ru", currency: "UAH", country: "RU" });
  assert.doesNotThrow(() => page.locale.setLanguage("en"));
  assert.equal(page.locale.language, "en");
});

test("failed storage writes still allow manual selection over readable saved preferences", async () => {
  const page = setup({ country: "RU", saved: { "cheatblox-language": "ru", "cheatblox-currency": "JPY" }, writeError: true });
  await page.locale.ready;
  assert.equal(page.locale.currency, "JPY");
  assert.doesNotThrow(() => page.locale.setLanguage("en"));
  assert.doesNotThrow(() => page.locale.setCurrency("GBP"));
  assert.deepEqual(state(page.locale), { language: "en", currency: "GBP", country: page.locale.country });
  assert.deepEqual({ ...page.events.at(-1).detail }, state(page.locale));
});

test("invalid manual values leave preferences available for country detection", async () => {
  const page = setup({ country: "RU", deferred: true });
  const before = state(page.locale);
  for (const value of ["", "EN", "uk", null, undefined]) page.locale.setLanguage(value);
  for (const value of ["", "usd", "BAD", null, undefined]) page.locale.setCurrency(value);
  assert.deepEqual(state(page.locale), before);
  assert.equal(page.values.size, 0);
  assert.equal(page.events.length, 0);
  page.release(); await page.locale.ready;
  assert.deepEqual(state(page.locale), { language: "ru", currency: "RUB", country: "RU" });
});
