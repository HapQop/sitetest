const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const productPage = fs.readFileSync("matrixhub.html", "utf8");
const translations = fs.readFileSync("scripts/site-i18n.js", "utf8");

test("Matrix Hub detail page uses the supplied logo and its unavailable lifetime External plan", () => {
  assert.match(productPage, /<body data-page="matrixhub">/);
  assert.match(productPage, /data-i18n="product-external">External/);
  assert.match(productPage, /class="matrixhub-logo" src="\.\.\/assets\/matrixhub-logo\.png" alt="Matrix Hub"/);
  assert.match(productPage, /data-plan-name>Lifetime access/);
  assert.match(productPage, /lifetime: \{ name: "Lifetime", access: "Lifetime access", price: 7\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /data-plan-price>\$7\.99/);
  assert.match(productPage, /data-select-plan disabled/);
  assert.equal(fs.existsSync("assets/matrixhub-logo.png"), true, "the supplied logo is available to the product page");
  assert.equal((translations.match(/matrixhub: "Matrix Hub"/g) || []).length, 2, "both locales provide the Matrix Hub page title");
});
