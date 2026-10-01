const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync("scripts/catalog.js", "utf8");

function element(dataset = {}, text = "") {
  const listeners = new Map();
  const classes = new Set();
  const styleValues = new Map();
  return {
    dataset, textContent: text, hidden: false, value: "", attributes: {},
    style: { setProperty(name, value) { styleValues.set(name, value); }, removeProperty(name) { styleValues.delete(name); }, getPropertyValue(name) { return styleValues.get(name) || ""; } },
    classList: { add(name) { classes.add(name); }, remove(name) { classes.delete(name); }, toggle(name, active) { active ? classes.add(name) : classes.delete(name); }, contains: (name) => classes.has(name) },
    addEventListener(name, callback) { listeners.set(name, callback); },
    click() { listeners.get("click")?.(); },
    dispatch(name) { listeners.get(name)?.(); },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
}

function setupCatalog({ deniedStorage = false } = {}) {
  const tabs = ["all", "roblox", "cs2"].map((game) => element({ productFilter: game }));
  const types = ["all", "executor", "external", "script"].map((type) => {
    const button = element({ productTypeFilter: type });
    button.badge = { textContent: "" };
    button.querySelector = (selector) => selector === ".catalog-filter__count" ? button.badge : null;
    return button;
  });
  const statuses = ["online", "offline"].map((status) => {
    const button = element({ productStatusFilter: status });
    button.badge = { textContent: "" };
    button.querySelector = (selector) => selector === ".catalog-filter__count" ? button.badge : null;
    return button;
  });
  const prices = ["all", "under-10", "10-25", "25-50", "50-plus"].map((price) => element({ productPriceFilter: price }));
  const product = (id, type, status, price) => {
    const card = element({ productId: id, productType: type, productStatus: status, productGame: "roblox" });
    const usdPrice = { dataset: { currencyPrice: String(price) }, textContent: `€${price * 100}` };
    card.querySelector = (selector) => {
      if (selector === ".store-card__body h2") return { textContent: id };
      if (selector === "[data-currency-price]") return usdPrice;
      return null;
    };
    card.usdPrice = usdPrice;
    return card;
  };
  const products = [
    product("Isaeva", "executor", "online", 9.99),
    product("Lumen", "external", "offline", 10),
    product("Matcha", "external", "online", 25),
    product("Volt", "executor", "online", 50),
    product("KiciaHook", "script", "online", 2.99),
    product("Yabujin", "script", "online", 2.99),
    product("MsPaint", "script", "online", 2.99),
    product("Severe", "external", "offline", 9.99),
    product("Matrix Hub", "external", "offline", 7.99),
  ];
  const cs2Empty = element({ emptyGame: "cs2" });
  const searchEmpty = element();
  const search = element();
  const priceMin = element();
  const priceMax = element();
  const reset = element();
  const listeners = new Map();
  const document = {
    addEventListener(name, callback) { listeners.set(name, [...(listeners.get(name) || []), callback]); },
    dispatchEvent(event) { (listeners.get(event.type) || []).forEach((callback) => callback(event)); },
    querySelectorAll(selector) {
      return {
        "[data-product-filter]": tabs, "[data-product-game]": products, "[data-empty-game]": [cs2Empty],
        "[data-product-type-filter]": types, "[data-product-status-filter]": statuses, "[data-product-price-filter]": prices,
      }[selector] || [];
    },
    querySelector(selector) {
      return {
        "[data-product-search]": search, "[data-search-empty]": searchEmpty, "[data-reset-product-filters]": reset,
        "#catalog-price-min": priceMin, "#catalog-price-max": priceMax,
      }[selector] || null;
    },
  };
  const localStorage = { getItem() { if (deniedStorage) throw new Error("denied"); return null; }, setItem() { if (deniedStorage) throw new Error("denied"); } };
  vm.runInNewContext(source, { document, localStorage });
  listeners.get("DOMContentLoaded")[0]();
  return { tabs, types, statuses, prices, products, cs2Empty, searchEmpty, search, priceMin, priceMax, reset, document };
}

function visibleIds(page) {
  return page.products.filter((product) => !product.hidden).map((product) => product.dataset.productId);
}

test("type, Online/Offline, search, and price facets combine while counts retain the other active facets", () => {
  const page = setupCatalog({ deniedStorage: true });
  page.types[1].click();
  page.statuses[0].click();
  page.prices[1].click();
  assert.deepEqual(visibleIds(page), ["Isaeva"]);
  assert.equal(page.types[0].badge.textContent, "4");
  assert.equal(page.types[1].badge.textContent, "1");
  assert.equal(page.types[2].badge.textContent, "0");
  assert.equal(page.types[3].badge.textContent, "3");
  assert.equal(page.statuses[0].badge.textContent, "1");
  assert.equal(page.statuses[1].badge.textContent, "0");

  page.search.value = "is";
  page.search.dispatch("input");
  page.tabs[1].click();
  assert.deepEqual(visibleIds(page), ["Isaeva"]);
  page.statuses[0].click();
  assert.equal(page.statuses.every((button) => button.attributes["aria-pressed"] === "false"), true, "clicking the active status clears it");
});

test("price presets use USD data boundaries, and custom prices accept zero and inclusive decimals", () => {
  const page = setupCatalog();
  const expected = {
    "under-10": ["Isaeva", "KiciaHook", "Yabujin", "MsPaint", "Severe", "Matrix Hub"], "10-25": ["Lumen"], "25-50": ["Matcha"], "50-plus": ["Volt"],
  };
  for (const [preset, ids] of Object.entries(expected)) {
    page.prices.find((button) => button.dataset.productPriceFilter === preset).click();
    assert.deepEqual(visibleIds(page), ids, preset);
  }

  page.priceMin.value = "10";
  page.priceMax.value = "10";
  page.priceMin.dispatch("input");
  page.priceMax.dispatch("input");
  assert.deepEqual(visibleIds(page), ["Lumen"], "custom limits are inclusive");
  assert.equal(page.prices.every((button) => button.attributes["aria-pressed"] === "false"), true);

  page.priceMin.value = "";
  page.priceMax.value = "";
  page.priceMax.dispatch("input");
  assert.equal(page.prices[0].attributes["aria-pressed"], "true", "clearing both limits returns to Any price");

  page.priceMin.value = "0";
  page.priceMax.value = "9.99";
  page.priceMin.dispatch("input");
  page.priceMax.dispatch("input");
  assert.deepEqual(visibleIds(page), ["Isaeva", "KiciaHook", "Yabujin", "MsPaint", "Severe", "Matrix Hub"]);
  page.priceMin.value = "30";
  page.priceMax.value = "10";
  page.priceMax.dispatch("input");
  assert.deepEqual(visibleIds(page), []);
  assert.equal(page.searchEmpty.hidden, false, "price-only empty results use the generic empty state");
});

test("Script facet isolates all scripts while retaining their count", () => {
  const page = setupCatalog();
  const script = page.types.find((button) => button.dataset.productTypeFilter === "script");
  script.click();
  assert.deepEqual(visibleIds(page), ["KiciaHook", "Yabujin", "MsPaint"]);
  assert.equal(script.badge.textContent, "3");
});

test("selected filters replay a staggered left-to-right entrance for visible cards", () => {
  const page = setupCatalog();
  assert.equal(page.products.some((product) => product.classList.contains("catalog-card-enter")), false, "initial catalog state does not replay the filter animation");

  page.types.find((button) => button.dataset.productTypeFilter === "external").click();
  const visibleCards = page.products.filter((product) => !product.hidden);
  assert.deepEqual(visibleIds(page), ["Lumen", "Matcha", "Severe", "Matrix Hub"]);
  assert.equal(visibleCards.every((product) => product.classList.contains("catalog-card-enter")), true);
  assert.deepEqual(visibleCards.map((product) => product.style.getPropertyValue("--catalog-card-enter-delay")), ["0ms", "45ms", "90ms", "135ms"]);
});

test("preset, custom, reset, and catalog changes retain selections and re-read USD starting prices", () => {
  const page = setupCatalog();
  page.types[2].click();
  page.statuses[0].click();
  page.prices[1].click();
  assert.deepEqual(visibleIds(page), [], "formatted currency text does not make $25 Matcha match under $10");
  page.products[2].usdPrice.dataset.currencyPrice = "5";
  page.document.dispatchEvent({ type: "cheatblox:catalogchange" });
  assert.deepEqual(visibleIds(page), ["Matcha"]);
  assert.equal(page.types[2].attributes["aria-pressed"], "true");
  assert.equal(page.statuses[0].attributes["aria-pressed"], "true");
  assert.equal(page.prices[1].attributes["aria-pressed"], "true");

  page.priceMin.value = "1";
  page.priceMin.dispatch("input");
  assert.equal(page.prices.every((button) => button.attributes["aria-pressed"] === "false"), true);
  page.prices[4].click();
  assert.equal(page.priceMin.value, "");
  assert.equal(page.priceMax.value, "");
  page.reset.click();
  assert.equal(page.products.every((product) => !product.hidden), true);
  assert.equal(page.types[0].attributes["aria-pressed"], "true");
  assert.equal(page.statuses.every((button) => button.attributes["aria-pressed"] === "false"), true);
  assert.equal(page.prices[0].attributes["aria-pressed"], "true");
  page.tabs[2].click();
  assert.equal(page.cs2Empty.hidden, false, "plain CS2 retains its game empty state");
});
