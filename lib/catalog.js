const DEFAULT_CATALOG = {
  isaeva: {
    name: "Isaeva",
    plans: {
      weekly: { name: "Weekly", access: "Weekly access", price: 2.99, stock: 9, available: true },
      monthly: { name: "Monthly", access: "Monthly access", price: 9.99, stock: 0, available: false },
    },
  },
  cosmic: {
    name: "Cosmic",
    plans: {
      monthly: { name: "30 days", access: "30-day access", price: 3.99, stock: 0, available: false },
      lifetime: { name: "Lifetime", access: "Lifetime access", price: 14.99, stock: 0, available: false },
    },
  },
  volt: {
    name: "Volt",
    plans: {
      weekly: { name: "Weekly", access: "7-day access", price: 4.99, stock: 2, available: true },
      monthly: { name: "30 days", access: "30-day access", price: 15, stock: 0, available: false },
      ninety: { name: "90 days", access: "90-day access", price: 40, stock: 0, available: false },
    },
  },
  pottasium: {
    name: "Potassium",
    plans: { lifetime: { name: "Lifetime", access: "Lifetime access", price: 18, stock: 0, available: false } },
  },
  real: {
    name: "Real",
    plans: {
      weekly: { name: "Weekly", access: "7-day access", price: 2.99, stock: null, available: true },
      monthly: { name: "30 days", access: "30-day access", price: 8, stock: null, available: true },
    },
  },
  lumen: {
    name: "Lumen",
    plans: { lifetime: { name: "Lifetime", access: "Lifetime access", price: 9.99, stock: null, available: true } },
  },
  wave: {
    name: "Wave",
    plans: {
      weekly: { name: "Weekly", access: "7-day access", price: 2.99, stock: null, available: true },
      monthly: { name: "30 days", access: "30-day access", price: 12, stock: null, available: true },
      ninety: { name: "90 days", access: "90-day access", price: 30, stock: null, available: true },
      yearly: { name: "365 days", access: "365-day access", price: 75, stock: null, available: true },
    },
  },
};

const CATALOG_KEY = "catalog:products";
const VERSIONS_KEY = "catalog:platform-versions";
const VERSION_PLATFORMS = ["windows", "mac", "android", "ios"];

function cloneCatalog() {
  return JSON.parse(JSON.stringify(DEFAULT_CATALOG));
}

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function kv(command) {
  const response = await fetch(env("KV_REST_API_URL"), {
    method: "POST",
    headers: { Authorization: `Bearer ${env("KV_REST_API_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.error || "KV request failed");
  return payload.result;
}

function mergeCatalog(overrides) {
  const catalog = cloneCatalog();
  if (!overrides || typeof overrides !== "object") return catalog;
  for (const [productId, product] of Object.entries(overrides)) {
    if (!Object.hasOwn(catalog, productId) || !product?.plans) continue;
    if (typeof product.name === "string") catalog[productId].name = product.name;
    if (typeof product.version === "string") catalog[productId].version = product.version;
    for (const [planId, plan] of Object.entries(product.plans)) {
      if (!Object.hasOwn(catalog[productId].plans, planId)) continue;
      catalog[productId].plans[planId] = { ...catalog[productId].plans[planId], ...plan };
    }
  }
  return catalog;
}

async function readCatalog() {
  const raw = await kv(["GET", CATALOG_KEY]);
  if (!raw) return cloneCatalog();
  try {
    return mergeCatalog(JSON.parse(raw));
  } catch {
    return cloneCatalog();
  }
}

async function writeCatalog(catalog) {
  await kv(["SET", CATALOG_KEY, JSON.stringify(catalog)]);
}

async function readVersions() {
  const raw = await kv(["GET", VERSIONS_KEY]);
  if (!raw) return {};
  try {
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return {};
    return Object.fromEntries(VERSION_PLATFORMS.filter((platform) => typeof saved[platform] === "string" && saved[platform]).map((platform) => [platform, saved[platform]]));
  } catch {
    return {};
  }
}

async function writeVersions(versions) {
  await kv(["SET", VERSIONS_KEY, JSON.stringify(versions)]);
}

module.exports = { CATALOG_KEY, DEFAULT_CATALOG, VERSIONS_KEY, VERSION_PLATFORMS, cloneCatalog, env, kv, mergeCatalog, readCatalog, readVersions, writeCatalog, writeVersions };
