const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

test("manual platform version takes precedence over the automatic version", () => {
  const code = { textContent: "old" };
  const product = {
    dataset: { version: "old" },
    querySelector(selector) {
      if (selector === ".platform-icon") return { classList: { contains: (name) => name === "windows" } };
      if (selector === ".version-chip code") return code;
      return null;
    },
  };
  const document = {
    addEventListener() {},
    querySelectorAll: () => [product],
  };
  const context = vm.createContext({ document, window: {} });
  vm.runInContext(fs.readFileSync("scripts/products.js", "utf8"), context);

  context.applyVersions({ Windows: "auto-1" }, { windows: "manual-2" });
  assert.equal(product.dataset.version, "manual-2");
  assert.equal(code.textContent, "manual-2");

  context.applyVersions({ Windows: "auto-3" });
  assert.equal(product.dataset.version, "auto-3");
  assert.equal(code.textContent, "auto-3");
});
