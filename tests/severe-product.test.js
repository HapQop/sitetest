const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const productPage = fs.readFileSync("severe.html", "utf8");
const translations = fs.readFileSync("scripts/site-i18n.js", "utf8");

test("Severe detail page uses the supplied logo and its two unavailable External lifetime plans", () => {
  assert.match(productPage, /<body data-page="severe">/);
  assert.match(productPage, /data-i18n="product-external">External/);
  assert.match(productPage, /class="severe-logo" src="\.\/assets\/severe-logo\.png" alt="Severe"/);
  assert.match(productPage, /data-plan-option="basic">Lifetime \(Basic\)/);
  assert.match(productPage, /data-plan-option="ultimate">Lifetime \(Ultimate\)/);
  assert.match(productPage, /basic: \{ name: "Lifetime \(Basic\)", access: "Lifetime \(Basic\) access", price: 9\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /ultimate: \{ name: "Lifetime \(Ultimate\)", access: "Lifetime \(Ultimate\) access", price: 19\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /data-select-plan disabled/);
  assert.equal(fs.existsSync("assets/severe-logo.png"), true, "the supplied logo is available to the product page");
  assert.equal((translations.match(/severe: "Severe"/g) || []).length, 2, "both locales provide the Severe page title");
});
