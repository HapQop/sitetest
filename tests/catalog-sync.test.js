const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync("scripts/site-catalog.js", "utf8");

test("catalog values are revealed after the catalog API falls back", async () => {
  const listeners = new Map();
  const classes = new Set();
  const document = {
    body: { dataset: {} },
    documentElement: { classList: { add(name) { classes.add(name); } } },
    addEventListener(name, callback) { listeners.set(name, [...(listeners.get(name) || []), callback]); },
    querySelectorAll() { return []; },
  };

  vm.runInNewContext(source, { document, window: {}, fetch: async () => ({ ok: false }) });
  await listeners.get("DOMContentLoaded")[0]();

  assert.equal(classes.has("catalog-sync-ready"), true);
});

test("catalog sync styling hides stale catalog values before the API resolves", () => {
  const styles = fs.readFileSync("styles/site-header.css", "utf8");
  assert.match(styles, /html:not\(\.catalog-sync-ready\) \[data-currency-price\]/);
  assert.match(styles, /animation: catalog-sync-fallback 0s linear 5s forwards/);
});
