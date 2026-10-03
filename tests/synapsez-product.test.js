const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const productPage = fs.readFileSync("synapsez.html", "utf8");

test("SynapseZ detail page uses the supplied logo and its two unavailable Executor plans", () => {
  assert.match(productPage, /<body data-page="synapsez">/);
  assert.match(productPage, /data-i18n="product-executor">Executor/);
  assert.match(productPage, /class="synapsez-logo" src="\.\/assets\/synapsez-logo\.png" alt="SynapseZ"/);
  assert.match(productPage, /data-plan-option="weekly">7 days/);
  assert.match(productPage, /data-plan-option="monthly">30 days/);
  assert.match(productPage, /weekly: \{ name: "7 days", access: "7-day access", price: 3\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /monthly: \{ name: "30 days", access: "30-day access", price: 10\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /data-select-plan disabled/);
  assert.equal(fs.existsSync("assets/synapsez-logo.png"), true, "the supplied logo is available to the product page");
});
