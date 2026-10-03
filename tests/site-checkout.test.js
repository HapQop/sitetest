const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const orderId = "39ab422b-908a-4a03-b116-5349020d82a6";

function startOrder({ disabled = false, discounted = false } = {}) {
  const listeners = new Map();
  const storage = new Map();
  const purchaseButton = {
    disabled,
    addEventListener(name, callback) { this.click = callback; },
  };
  const price = {
    textContent: "$2.99",
    querySelector(selector) {
      if (!discounted) return null;
      if (selector === ".promo-discounted-price") return { textContent: "$2.69" };
      if (selector === ".promo-original-price") return { textContent: "$2.99" };
      return null;
    },
  };
  const document = {
    body: { dataset: { page: "isaeva" } },
    addEventListener(name, callback) { listeners.set(name, [...(listeners.get(name) || []), callback]); },
    querySelector(selector) {
      return {
        "[data-select-plan]": purchaseButton,
        "[data-plan-price]": price,
        main: { dataset: { plan: "weekly" } },
        ".product-heading h1": { textContent: "Isaeva" },
        "[data-plan-summary-name]": { textContent: "Weekly" },
      }[selector] || null;
    },
  };
  const window = {
    crypto: { randomUUID: () => orderId },
    sessionStorage: { setItem(key, value) { storage.set(key, value); } },
    location: { href: "" },
  };
  vm.runInNewContext(fs.readFileSync("scripts/site-catalog.js", "utf8"), { document, window, fetch: async () => ({ ok: false }) });
  listeners.get("DOMContentLoaded")[1]();
  purchaseButton.click();
  return { window, storage };
}

test("Purchase creates a preview order with the selected plan and opens its link", () => {
  const { window, storage } = startOrder({ discounted: true });
  assert.equal(window.location.href, `checkout.html?order=${orderId}&product=isaeva&plan=weekly`);
  const order = JSON.parse(storage.get(`cheatblox-order:${orderId}`));
  assert.deepEqual({ id: order.id, productId: order.productId, planId: order.planId, productName: order.productName, planName: order.planName, total: order.total },
    { id: orderId, productId: "isaeva", planId: "weekly", productName: "Isaeva", planName: "Weekly", total: "$2.69" });
  assert.equal(order.subtotal, "$2.99");
  assert.equal(order.promoCode, "OPENING");
});

test("an unavailable product does not create an order", () => {
  const { window, storage } = startOrder({ disabled: true });
  assert.equal(window.location.href, "");
  assert.equal(storage.size, 0);
});

test("checkout supports localized crypto-only preview controls", () => {
  const storage = new Map();
  storage.set(`cheatblox-order:${orderId}`, JSON.stringify({ id: orderId, productId: "wave", productName: "Wave", planName: "7-day access", total: "$2.99" }));
  const elements = new Map();
  const image = { src: "" };
  const document = {
    title: "Checkout — CheatBlox",
    documentElement: {},
    querySelectorAll(selector) {
      if (!elements.has(selector)) elements.set(selector, [{}]);
      return elements.get(selector);
    },
    querySelector(selector) { return selector === "[data-order-image]" ? image : null; },
  };
  const window = {
    location: { search: `?order=${orderId}&product=wave&plan=weekly` },
    sessionStorage: { getItem: (key) => storage.get(key) || null },
    localStorage: { getItem: () => null, setItem() {} },
  };
  vm.runInNewContext(fs.readFileSync("scripts/site-checkout.js", "utf8"), {
    document,
    window,
    URLSearchParams,
  });
  assert.equal(elements.get("[data-order-id]")[0].textContent, orderId);
  assert.equal(elements.get("[data-order-product]")[0].textContent, "Wave");
  assert.equal(elements.get("[data-order-total], [data-order-line-price], [data-order-subtotal], [data-order-grand-total], [data-order-cta-total]")[0].textContent, "$2.99");
  assert.equal(image.src, "./assets/wave-logo.png");
  window.CheatBloxCheckout.setLanguage("ru");
  assert.equal(document.documentElement.lang, "ru");
  assert.equal(elements.get("[data-checkout-language-label]")[0].textContent, "Русский");

  const markup = fs.readFileSync("checkout.html", "utf8");
  assert.match(markup, /data-payment-method="crypto"/);
  assert.match(markup, /data-checkout-language="es"/);
  assert.match(markup, /data-continue-payment/);
  assert.doesNotMatch(markup, /data-continue-payment disabled/);
  assert.doesNotMatch(markup, /Credit &amp; debit cards|Customer Balance|FunPay/);
});
