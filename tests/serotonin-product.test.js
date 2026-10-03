const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const productPage = fs.readFileSync("serotonin.html", "utf8");
const translations = fs.readFileSync("scripts/site-i18n.js", "utf8");

test("Serotonin detail page uses the supplied logo and its two unavailable plans", () => {
  assert.match(productPage, /<body data-page="serotonin">/);
  assert.match(productPage, /src="\.\/assets\/serotonin-logo\.png" alt="Serotonin"/);
  assert.match(productPage, /data-plan-option="thirty">30 days/);
  assert.match(productPage, /data-plan-option="ninety">90 days/);
  assert.match(productPage, /thirty: \{ name: "30 days", access: "30-day access", price: 9\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /ninety: \{ name: "90 days", access: "90-day access", price: 24\.99, stock: "0 available", available: false \}/);
  assert.match(productPage, /data-select-plan disabled/);
  assert.equal(fs.existsSync("assets/serotonin-logo.png"), true, "the supplied logo is available to the product page");
  assert.equal((translations.match(/serotonin: "Serotonin"/g) || []).length, 2, "both locales provide the Serotonin page title");
});
