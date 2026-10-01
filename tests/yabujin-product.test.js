const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const productPage = fs.readFileSync("pages/yabujin.html", "utf8");
const translations = fs.readFileSync("scripts/site-i18n.js", "utf8");

test("Yabujin detail page uses the supplied logo and its two unavailable Script plans", () => {
  assert.match(productPage, /<body data-page="yabujin">/);
  assert.match(productPage, /data-i18n="product-script">Script/);
  assert.match(productPage, /class="yabujin-logo" src="\.\.\/assets\/yabujin-logo\.png" alt="Yabujin"/);
  assert.match(productPage, /data-plan-option="weekly">7 days/);
  assert.match(productPage, /data-plan-option="monthly">30 days/);
  assert.match(productPage, /weekly: \{ name: "7 days", access: "7-day access", price: 2\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /monthly: \{ name: "30 days", access: "30-day access", price: 7\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /data-select-plan disabled/);
  assert.equal(fs.existsSync("assets/yabujin-logo.png"), true, "the supplied logo is available to the product page");
  assert.equal((translations.match(/yabujin: "Yabujin"/g) || []).length, 2, "both locales provide the Yabujin page title");
});
