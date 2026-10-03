const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const productPage = fs.readFileSync("axis.html", "utf8");

test("Axis detail page uses the supplied logo and its two unavailable 30-day External plans", () => {
  assert.match(productPage, /<body data-page="axis">/);
  assert.match(productPage, /data-i18n="product-external">External/);
  assert.match(productPage, /src="\.\.\/assets\/axis-logo\.png" alt="Axis"/);
  assert.match(productPage, /data-plan-option="thirty">30 days/);
  assert.match(productPage, /data-plan-option="thirtyPremium">30 days/);
  assert.match(productPage, /thirty: \{ name: "30 days", access: "30-day access", price: 4\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /thirtyPremium: \{ name: "30 days", access: "30-day access", price: 9\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /data-plan-price>\$4\.99/);
  assert.match(productPage, /data-select-plan disabled/);
  assert.equal(fs.existsSync("assets/axis-logo.png"), true, "the supplied logo is available to the product page");
});
