const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const productPage = fs.readFileSync("pottasium.html", "utf8");

test("Potassium has eight available lifetime licenses", () => {
  assert.match(productPage, /data-plan-stock>8 available/);
  assert.match(productPage, /data-plan-summary-stock>8 available/);
  assert.match(productPage, /lifetime: \{ name: "Lifetime", access: "Lifetime access", price: 18, stock: "8 available", available: true \}/);
  assert.doesNotMatch(productPage, /data-select-plan disabled/);
});
