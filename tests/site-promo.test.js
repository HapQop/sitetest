const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

class Element {
  constructor() {
    this.dataset = {};
    this.children = [];
    this.textContent = "";
    this.listeners = new Map();
    this.classList = { values: new Set(), toggle: (name, enabled) => enabled ? this.classList.values.add(name) : this.classList.values.delete(name) };
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; this.textContent = ""; }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  submit() { this.listeners.get("submit")?.({ preventDefault() {} }); }
}

test("OPENING applies ten percent to both price areas and survives plan changes", () => {
  const mainPrice = new Element();
  mainPrice.dataset.promoBasePrice = "20";
  const summaryPrice = new Element();
  summaryPrice.dataset.promoBasePrice = "20";
  const form = new Element();
  const input = new Element();
  const message = new Element();
  const listeners = new Map();
  const document = {
    head: { append() {} },
    addEventListener(name, callback) { listeners.set(name, callback); },
    dispatchEvent(event) { listeners.get(event.type)?.(event); },
    createElement() { return new Element(); },
    querySelector(selector) {
      return { "[data-plan-price]": mainPrice, "[data-promo-form]": form, "#promo-code": input, "[data-promo-message]": message }[selector] || null;
    },
    querySelectorAll(selector) {
      return selector === "[data-plan-price], [data-plan-summary-price]" ? [mainPrice, summaryPrice] : [];
    },
  };
  const context = {
    document,
    window: { CheatBloxCurrency: { format: (amount) => `$${Number(amount).toFixed(2)}` } },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
  };
  vm.runInNewContext(fs.readFileSync("scripts/site-promo.js", "utf8"), context);
  listeners.get("DOMContentLoaded")();

  input.value = "opening";
  form.submit();
  assert.equal(mainPrice.children[0].textContent, "$20.00");
  assert.equal(mainPrice.children[1].textContent, "$18.00");
  assert.equal(summaryPrice.children[1].textContent, "$18.00");
  assert.equal(message.dataset.i18n, "product-promo-applied");

  document.dispatchEvent(new context.CustomEvent("cheatblox:planpricechange", { detail: { price: 10 } }));
  assert.equal(mainPrice.children[0].textContent, "$10.00");
  assert.equal(mainPrice.children[1].textContent, "$9.00");

  context.window.CheatBloxCurrency.format = (amount) => `€${Number(amount).toFixed(2)}`;
  document.dispatchEvent({ type: "currencychange" });
  assert.equal(mainPrice.children[0].textContent, "€10.00");
  assert.equal(mainPrice.children[1].textContent, "€9.00");

  input.value = "wrong";
  form.submit();
  assert.equal(mainPrice.textContent, "€10.00");
  assert.equal(summaryPrice.textContent, "€10.00");
  assert.equal(message.dataset.i18n, "product-promo-invalid");
});