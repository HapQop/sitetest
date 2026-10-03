const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

test("prices are formatted as fixed USD without creating a currency selector", () => {
  const listeners = new Map();
  const prices = [
    { dataset: { currencyPrice: "2.99" }, textContent: "" },
    { dataset: { currencyPrice: "20" }, textContent: "" },
  ];
  const currencyCodes = [{ textContent: "" }];
  const dispatched = [];
  const document = {
    addEventListener(name, listener) { listeners.set(name, listener); },
    dispatchEvent(event) { dispatched.push(event); },
    querySelectorAll(selector) {
      if (selector === "[data-currency-price]") return prices;
      if (selector === "[data-currency-code]") return currencyCodes;
      return [];
    },
  };
  const context = {
    document,
    window: {},
    CustomEvent: class {
      constructor(type, init) {
        this.type = type;
        this.detail = init.detail;
      }
    },
  };
  const source = fs.readFileSync("scripts/site-currency.js", "utf8");

  vm.runInNewContext(source, context);
  listeners.get("DOMContentLoaded")();

  assert.deepEqual(prices.map((element) => element.textContent), ["$2.99", "$20.00"]);
  assert.equal(currencyCodes[0].textContent, "USD");
  assert.equal(context.window.CheatBloxCurrency.code, "USD");
  assert.equal(context.window.CheatBloxCurrency.format(4), "$4.00");
  assert.equal(dispatched[0].type, "currencychange");
  assert.equal(dispatched[0].detail.code, "USD");
  assert.doesNotMatch(source, /currency-menu|currency-trigger|createMenu|fetch\(/);
});
