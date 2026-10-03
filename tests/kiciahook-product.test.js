const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const productPage = fs.readFileSync("kiciahook.html", "utf8");
const translations = fs.readFileSync("scripts/site-i18n.js", "utf8");

test("KiciaHook detail page uses the supplied logo and its two unavailable Script plans", () => {
  assert.match(productPage, /<body data-page="kiciahook">/);
  assert.match(productPage, /data-i18n="product-script">Script/);
  assert.match(productPage, /src="\.\/assets\/kiciahook-logo\.png" alt="KiciaHook"/);
  assert.match(productPage, /data-plan-option="weekly">7 days/);
  assert.match(productPage, /data-plan-option="monthly">30 days/);
  assert.match(productPage, /weekly: \{ name: "7 days", access: "7-day access", price: 2\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /monthly: \{ name: "30 days", access: "30-day access", price: 7\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /data-select-plan disabled/);
  assert.equal(fs.existsSync("assets/kiciahook-logo.png"), true, "the supplied logo is available to the product page");
  assert.equal((translations.match(/kiciahook: "KiciaHook"/g) || []).length, 2, "both locales provide the KiciaHook page title");
});
