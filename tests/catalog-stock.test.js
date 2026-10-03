const assert = require("node:assert/strict");
const test = require("node:test");

const { CATALOG_KEY, DEFAULT_CATALOG, INVENTORY_REVISION, cloneCatalog, mergeCatalog, writeCatalog } = require("../lib/catalog");

test("default catalog marks Potassium and Isaeva weekly available", () => {
  for (const [productId, product] of Object.entries(DEFAULT_CATALOG)) {
    for (const [planId, plan] of Object.entries(product.plans)) {
      const isAvailableIsaevaWeekly = productId === "isaeva" && planId === "weekly";
      const isAvailablePotassiumLifetime = productId === "pottasium" && planId === "lifetime";
      assert.equal(plan.stock, isAvailableIsaevaWeekly ? 9 : isAvailablePotassiumLifetime ? 8 : 0, `${productId}/${planId} stock`);
      assert.equal(plan.available, isAvailableIsaevaWeekly || isAvailablePotassiumLifetime, `${productId}/${planId} availability`);
    }
  }
});

test("default catalog assigns product types", () => {
  for (const [productId, product] of Object.entries(DEFAULT_CATALOG)) {
    const expectedType = ["lumen", "matcha", "serotonin", "severe", "matrixhub", "ronin", "axis"].includes(productId) ? "external" : ["kiciahook", "yabujin", "mspaint"].includes(productId) ? "script" : "executor";
    assert.equal(product.type, expectedType, productId);
  }
});

test("Serotonin has unavailable 30-day and 90-day plans at the configured prices", () => {
  assert.deepEqual(DEFAULT_CATALOG.serotonin, {
    name: "Serotonin",
    type: "external",
    plans: {
      thirty: { name: "30 days", access: "30-day access", price: 9.99, stock: 0, available: false },
      ninety: { name: "90 days", access: "90-day access", price: 24.99, stock: 0, available: false },
    },
  });
});

test("KiciaHook has unavailable weekly and monthly Script plans at the configured prices", () => {
  assert.deepEqual(DEFAULT_CATALOG.kiciahook, {
    name: "KiciaHook",
    type: "script",
    plans: {
      weekly: { name: "7 days", access: "7-day access", price: 2.99, stock: 0, available: false },
      monthly: { name: "30 days", access: "30-day access", price: 7.99, stock: 0, available: false },
    },
  });
});

test("Yabujin has unavailable weekly and monthly Script plans at the configured prices", () => {
  assert.deepEqual(DEFAULT_CATALOG.yabujin, {
    name: "Yabujin",
    type: "script",
    plans: {
      weekly: { name: "7 days", access: "7-day access", price: 2.99, stock: 0, available: false },
      monthly: { name: "30 days", access: "30-day access", price: 7.99, stock: 0, available: false },
    },
  });
});

test("Severe has unavailable Basic and Ultimate lifetime External plans at the configured prices", () => {
  assert.deepEqual(DEFAULT_CATALOG.severe, {
    name: "Severe",
    type: "external",
    plans: {
      basic: { name: "Lifetime (Basic)", access: "Lifetime (Basic) access", price: 9.99, stock: 0, available: false },
      ultimate: { name: "Lifetime (Ultimate)", access: "Lifetime (Ultimate) access", price: 19.99, stock: 0, available: false },
    },
  });
});

test("MsPaint has unavailable monthly and lifetime Script plans at the configured prices", () => {
  assert.deepEqual(DEFAULT_CATALOG.mspaint, {
    name: "MsPaint",
    type: "script",
    plans: {
      monthly: { name: "30 days", access: "30-day access", price: 2.99, stock: 0, available: false },
      lifetime: { name: "Lifetime", access: "Lifetime access", price: 20, stock: 0, available: false },
    },
  });
});

test("Matrix Hub has an unavailable lifetime External plan at the configured price", () => {
  assert.deepEqual(DEFAULT_CATALOG.matrixhub, {
    name: "Matrix Hub",
    type: "external",
    plans: {
      lifetime: { name: "Lifetime", access: "Lifetime access", price: 7.99, stock: 0, available: false },
    },
  });
});

test("SynapseZ has unavailable weekly and monthly Executor plans at the configured prices", () => {
  assert.deepEqual(DEFAULT_CATALOG.synapsez, {
    name: "SynapseZ",
    type: "executor",
    plans: {
      weekly: { name: "7 days", access: "7-day access", price: 3.99, stock: 0, available: false },
      monthly: { name: "30 days", access: "30-day access", price: 10.99, stock: 0, available: false },
    },
  });
});

test("Ronin has an unavailable lifetime External plan at the configured price", () => {
  assert.deepEqual(DEFAULT_CATALOG.ronin, {
    name: "Ronin",
    type: "external",
    plans: {
      lifetime: { name: "Lifetime", access: "Lifetime access", price: 9.99, stock: 0, available: false },
    },
  });
});

test("Axis has two unavailable 30-day External plans at the configured prices", () => {
  assert.deepEqual(DEFAULT_CATALOG.axis, {
    name: "Axis",
    type: "external",
    plans: {
      thirty: { name: "30 days", access: "30-day access", price: 4.99, stock: 0, available: false },
      thirtyPremium: { name: "30 days", access: "30-day access", price: 9.99, stock: 0, available: false },
    },
  });
});

test("clone and merge reset legacy inventory while retaining product metadata", () => {
  const cloned = cloneCatalog();
  assert.notEqual(cloned, DEFAULT_CATALOG);
  assert.equal(cloned.matcha.type, "external");

  const oldSnapshot = {
    lumen: { name: "Lumen Legacy", plans: { lifetime: { price: 12, stock: null, available: true } } },
  };
  const mergedLegacy = mergeCatalog(oldSnapshot);
  assert.equal(mergedLegacy.lumen.type, "external");
  assert.equal(mergedLegacy.lumen.name, "Lumen Legacy");
  assert.equal(mergedLegacy.lumen.plans.lifetime.price, 12);
  assert.equal(mergedLegacy.lumen.plans.lifetime.stock, 0);
  assert.equal(mergedLegacy.lumen.plans.lifetime.available, false);
});

test("current inventory snapshots preserve explicit admin overrides", () => {
  const adminOverrides = {
    _inventoryRevision: INVENTORY_REVISION,
    isaeva: { name: "Isaeva Pro", version: "3.0.0", plans: { weekly: { price: 7.5, stock: 4, available: true } } },
  };
  const mergedOverrides = mergeCatalog(adminOverrides);
  assert.equal(mergedOverrides.isaeva.name, "Isaeva Pro");
  assert.equal(mergedOverrides.isaeva.version, "3.0.0");
  assert.deepEqual(mergedOverrides.isaeva.plans.weekly, { ...DEFAULT_CATALOG.isaeva.plans.weekly, price: 7.5, stock: 4, available: true });
});

test("the Potassium migration replaces only its legacy unavailable inventory", () => {
  const legacyInventory = {
    _inventoryRevision: 1,
    pottasium: { plans: { lifetime: { stock: 0, available: false } } },
    isaeva: { plans: { weekly: { stock: 4, available: false } } },
  };
  const merged = mergeCatalog(legacyInventory);

  assert.deepEqual(merged.pottasium.plans.lifetime, DEFAULT_CATALOG.pottasium.plans.lifetime);
  assert.deepEqual(merged.isaeva.plans.weekly, { ...DEFAULT_CATALOG.isaeva.plans.weekly, stock: 4, available: false });
});

test("writeCatalog stamps the current inventory revision", async () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.KV_REST_API_URL;
  const originalToken = process.env.KV_REST_API_TOKEN;
  let command;
  process.env.KV_REST_API_URL = "https://kv.example.test";
  process.env.KV_REST_API_TOKEN = "test-token";
  global.fetch = async (_url, options) => {
    command = JSON.parse(options.body);
    return { ok: true, json: async () => ({ result: "OK" }) };
  };

  try {
    await writeCatalog({ isaeva: DEFAULT_CATALOG.isaeva });
    assert.equal(command[0], "SET");
    assert.equal(command[1], CATALOG_KEY);
    assert.equal(JSON.parse(command[2])._inventoryRevision, INVENTORY_REVISION);
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.KV_REST_API_URL;
    else process.env.KV_REST_API_URL = originalUrl;
    if (originalToken === undefined) delete process.env.KV_REST_API_TOKEN;
    else process.env.KV_REST_API_TOKEN = originalToken;
  }
});
