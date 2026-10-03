const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const productPage = fs.readFileSync("ronin.html", "utf8");

test("Ronin detail page uses the supplied logo and its unavailable lifetime External plan", () => {
  assert.match(productPage, /<body data-page="ronin">/);
  assert.match(productPage, /data-i18n="product-external">External/);
  assert.match(productPage, /class="ronin-logo" src="\.\/assets\/ronin-logo\.png" alt="Ronin"/);
  assert.match(productPage, /data-plan-name>Lifetime access/);
  assert.match(productPage, /lifetime: \{ name: "Lifetime", access: "Lifetime access", price: 9\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /data-plan-price>\$9\.99/);
  assert.match(productPage, /data-select-plan disabled/);
  assert.equal(fs.existsSync("assets/ronin-logo.png"), true, "the supplied logo is available to the product page");
});
