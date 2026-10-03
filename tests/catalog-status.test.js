const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync("scripts/catalog-status.js", "utf8");

function setupStatus({ replies }) {
  const events = new Map();
  const dispatched = [];
  const requests = [];
  const product = (id, stock, type = "executor") => {
    const classes = new Set();
    const label = {
      textContent: "Checking status…",
      classList: {
        toggle(name, active) { active ? classes.add(name) : classes.delete(name); },
        contains(name) { return classes.has(name); },
      },
    };
    return { dataset: { productId: id, productType: type, productGame: "roblox" }, stock, label, querySelector: (selector) => selector === "[data-product-status-label]" ? label : null };
  };
  const products = [
    product("pottasium", "8 available"),
    product("lumen", "0 available", "external"),
    product("matcha", "0 available", "external"),
    product("kiciahook", "0 available", "script"),
    product("yabujin", "0 available", "script"),
    product("mspaint", "0 available", "script"),
  ];
  const document = {
    addEventListener(name, callback) { events.set(name, callback); },
    dispatchEvent(event) { dispatched.push(event); },
    querySelectorAll(selector) { return selector === "[data-product-id][data-product-game]" ? products : []; },
  };
  class CustomEvent { constructor(type) { this.type = type; } }
  const fetch = async (url, options) => {
    requests.push({ url, options });
    const reply = replies.shift();
    if (reply instanceof Error) throw reply;
    return reply;
  };
  vm.runInNewContext(source, { document, fetch, CustomEvent, AbortController, setTimeout, clearTimeout });
  return { products, requests, dispatched, run: () => events.get("DOMContentLoaded")() };
}

test("status loader falls back to WEAO, matches Windows products, and keeps scripts Online", async () => {
  const page = setupStatus({ replies: [
    { ok: false },
    { ok: true, json: async () => ({ exploits: [
      { title: "Potassium", platform: "Windows", updateStatus: true },
      { title: "LUMÉN", platform: "WINDOWS", updateStatus: false },
      { title: "Matcha", platform: "Android", updateStatus: true },
      { title: "KiciaHook", platform: "Windows", updateStatus: false },
    ] }) },
  ] });
  const completion = page.run();
  assert.equal(page.products.slice(3).every((product) => product.dataset.productStatus === "online"), true, "scripts are online before the remote request resolves");
  assert.equal(page.products.slice(3).every((product) => product.label.textContent === "Online"), true);
  await completion;

  assert.deepEqual(page.requests.map((request) => request.url), ["/api/exploits", "https://weao.xyz/api/status/exploits"]);
  assert.equal(page.products[0].dataset.productStatus, "online");
  assert.equal(page.products[0].label.textContent, "Online");
  assert.equal(page.products[1].dataset.productStatus, "offline");
  assert.equal(page.products[1].label.textContent, "Offline");
  assert.equal(page.products[2].dataset.productStatus, "unknown");
  assert.equal(page.products[2].label.textContent, "Status unavailable");
  assert.equal(page.products.slice(3).every((product) => product.dataset.productStatus === "online"), true, "remote data never overrides script status");
  assert.equal(page.products.slice(3).every((product) => product.label.classList.contains("is-online")), true);
  assert.deepEqual(page.products.map((product) => product.stock), ["8 available", "0 available", "0 available", "0 available", "0 available", "0 available"]);
  assert.equal(page.dispatched[0].type, "cheatblox:productstatuschange");
});

test("failed or missing status data leaves non-scripts unknown while scripts stay Online", async () => {
  const page = setupStatus({ replies: [new Error("offline"), new Error("offline")] });
  await page.run();
  assert.equal(page.products.slice(0, 3).every((product) => product.dataset.productStatus === "unknown"), true);
  assert.equal(page.products.slice(0, 3).every((product) => product.label.textContent === "Status unavailable"), true);
  assert.equal(page.products.slice(3).every((product) => product.dataset.productStatus === "online"), true);
  assert.equal(page.products.slice(3).every((product) => product.label.textContent === "Online"), true);
  assert.deepEqual(page.products.map((product) => product.stock), ["8 available", "0 available", "0 available", "0 available", "0 available", "0 available"]);
});
