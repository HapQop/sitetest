const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const productPage = fs.readFileSync("mspaint.html", "utf8");
const translations = fs.readFileSync("scripts/site-i18n.js", "utf8");

test("MsPaint detail page uses a transparent version of the supplied icon and two unavailable Script plans", () => {
  assert.match(productPage, /<body data-page="mspaint">/);
  assert.match(productPage, /data-i18n="product-script">Script/);
  assert.match(productPage, /class="mspaint-logo" src="\.\/assets\/mspaint-logo\.png" alt="MsPaint"/);
  assert.match(productPage, /data-plan-option="monthly">30 days/);
  assert.match(productPage, /data-plan-option="lifetime">Lifetime/);
  assert.match(productPage, /monthly: \{ name: "30 days", access: "30-day access", price: 2\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /lifetime: \{ name: "Lifetime", access: "Lifetime access", price: 20, stock: "0 available", available: false \}/);
  assert.match(productPage, /data-select-plan disabled/);
  assert.equal(fs.existsSync("assets/mspaint-logo.png"), true, "the cleaned supplied icon is available to the product page");
  assert.equal((translations.match(/mspaint: "MsPaint"/g) || []).length, 2, "both locales provide the MsPaint page title");
});
