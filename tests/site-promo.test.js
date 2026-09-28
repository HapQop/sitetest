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
    this.classList = { values: new Set(), add: (name) => this.classList.values.add(name), toggle: (name, enabled) => enabled ? this.classList.values.add(name) : this.classList.values.delete(name) };
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; this.textContent = ""; }
  addEventListener(name, callback) { this.listeners.set(name, callback); }
  removeAttribute(name) { delete this.dataset[name.replace(/^data-/, "")]; }
  submit() { this.listeners.get("submit")?.({ preventDefault() {} }); }
}

test("saved promo code and discount update both price areas and survive plan changes", async () => {
  const mainPrice = new Element();
  mainPrice.dataset.promoBasePrice = "20";
  const summaryPrice = new Element();
  summaryPrice.dataset.promoBasePrice = "20";
  const form = new Element();
  const input = new Element();
  const message = new Element();
  const listeners = new Map();
  const document = {
    documentElement: { lang: "en" },
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
    fetch: async () => ({ ok: true, json: async () => ({ home: { promoCode: "NEWCODE", promoPercent: 25 } }) }),
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
  };
  vm.runInNewContext(fs.readFileSync("scripts/site-promo.js", "utf8"), context);
  listeners.get("DOMContentLoaded")();
  await new Promise(setImmediate);

  input.value = "newcode";
  form.submit();
  assert.equal(mainPrice.children[0].textContent, "$20.00");
  assert.equal(mainPrice.children[1].textContent, "$15.00");
  assert.equal(summaryPrice.children[1].textContent, "$15.00");
  assert.equal(message.textContent, "25% discount applied.");

  document.dispatchEvent(new context.CustomEvent("cheatblox:planpricechange", { detail: { price: 10 } }));
  assert.equal(mainPrice.children[0].textContent, "$10.00");
  assert.equal(mainPrice.children[1].textContent, "$7.50");

  context.window.CheatBloxCurrency.format = (amount) => `€${Number(amount).toFixed(2)}`;
  document.dispatchEvent({ type: "currencychange" });
  assert.equal(mainPrice.children[0].textContent, "€10.00");
  assert.equal(mainPrice.children[1].textContent, "€7.50");

  input.value = "wrong";
  form.submit();
  assert.equal(mainPrice.textContent, "€10.00");
  assert.equal(summaryPrice.textContent, "€10.00");
  assert.equal(message.dataset.i18n, "product-promo-invalid");
});
