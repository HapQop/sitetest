const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");

const { isAdminUser } = require("../lib/admin-access");
const admin = require("../api/admin");
const auth = require("../api/auth/[action].js");
const catalogApi = require("../api/catalog");
const { CATALOG_KEY, VERSIONS_KEY } = require("../lib/catalog");

const OWNER_EMAIL = "1mmx1mmxxx@gmail.com";

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send(value) { this.body = JSON.parse(value); return this; },
  };
}

function tokenDigest(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function adminRequest({ method = "GET", token, body, headers = {} } = {}) {
  return {
    method,
    body,
    headers: {
      host: "site.example.test",
      ...(token ? { cookie: `auth_session=${encodeURIComponent(token)}` } : {}),
      ...headers,
    },
  };
}

async function invoke(handler, request) {
  const res = response();
  await handler(request, res);
  return res;
}

test("admin access requires a verified owner or configured verified administrator", () => {
  const original = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = " editor@example.test, second@example.test ";
  try {
    assert.equal(isAdminUser({ email: OWNER_EMAIL, verifiedAt: "2026-01-01" }), true);
    assert.equal(isAdminUser({ email: "  EDITOR@example.test ", verifiedAt: "2026-01-01" }), true);
    assert.equal(isAdminUser({ email: OWNER_EMAIL }), false);
    assert.equal(isAdminUser({ email: "visitor@example.test", verifiedAt: "2026-01-01" }), false);
  } finally {
    if (original === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = original;
  }
});

test("admin API protects edits and publishes saved catalog versions", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  };
  const values = new Map();
  const writes = [];
  const ownerToken = "owner-session";
  const unverifiedToken = "unverified-owner-session";

  process.env.KV_REST_API_URL = "https://kv.example.test";
  process.env.KV_REST_API_TOKEN = "test-token";
  delete process.env.ADMIN_EMAILS;
  values.set(`auth:session:${tokenDigest(ownerToken)}`, JSON.stringify({ userId: "owner" }));
  values.set("auth:user:owner", JSON.stringify({ id: "owner", username: "owner", email: OWNER_EMAIL, verifiedAt: "2026-09-28T00:00:00.000Z" }));
  values.set(`auth:session:${tokenDigest(unverifiedToken)}`, JSON.stringify({ userId: "unverified" }));
  values.set("auth:user:unverified", JSON.stringify({ id: "unverified", username: "unverified", email: OWNER_EMAIL }));

  global.fetch = async (url, options) => {
    assert.equal(url, "https://kv.example.test");
    assert.equal(options.headers.Authorization, "Bearer test-token");
    const [operation, key, value] = JSON.parse(options.body);
    if (operation === "GET") return { ok: true, json: async () => ({ result: values.get(key) ?? null }) };
    if (operation === "SET") {
      values.set(key, value);
      writes.push(key);
      return { ok: true, json: async () => ({ result: "OK" }) };
    }
    throw new Error(`Unexpected KV operation: ${operation}`);
  };

  const jsonHeaders = { "content-type": "application/json", origin: "https://site.example.test" };
  try {
    const anonymous = await invoke(admin, adminRequest());
    assert.equal(anonymous.statusCode, 403);

    const unverified = await invoke(admin, adminRequest({ token: unverifiedToken }));
    assert.equal(unverified.statusCode, 403);

    const forbiddenEdit = await invoke(admin, adminRequest({
      method: "POST", token: unverifiedToken, headers: jsonHeaders,
      body: { action: "version", platform: "windows", version: "9.9.9" },
    }));
    assert.equal(forbiddenEdit.statusCode, 403);
    assert.equal(values.has(VERSIONS_KEY), false);

    const dashboard = await invoke(admin, adminRequest({ token: ownerToken }));
    assert.equal(dashboard.statusCode, 200);
    assert.equal(dashboard.body.admin.email, OWNER_EMAIL);
    assert.equal(dashboard.body.catalog.isaeva.plans.weekly.price, 2.99);

    const invalidPlan = await invoke(admin, adminRequest({
      method: "POST", token: ownerToken, headers: jsonHeaders,
      body: { action: "plan", productId: "isaeva", planId: "weekly", name: "Weekly", access: "Weekly access", price: "-1", stock: "2", available: true },
    }));
    assert.equal(invalidPlan.statusCode, 400);
    assert.equal(invalidPlan.body.error, "Price must be between 0 and 100000.");
    assert.equal(writes.includes(CATALOG_KEY), false);

    const inheritedProduct = await invoke(admin, adminRequest({
      method: "POST", token: ownerToken, headers: jsonHeaders,
      body: { action: "product", productId: "__proto__", name: "Unsafe", version: "1" },
    }));
    assert.equal(inheritedProduct.statusCode, 400);
    assert.equal(Object.prototype.name, undefined);

    const planUpdate = await invoke(admin, adminRequest({
      method: "POST", token: ownerToken, headers: jsonHeaders,
      body: { action: "plan", productId: "isaeva", planId: "weekly", name: "Seven days", access: "7-day access", price: "7.5", stock: "12", available: false },
    }));
    assert.equal(planUpdate.statusCode, 200);
    assert.deepEqual(planUpdate.body.updated, { productId: "isaeva", planId: "weekly" });
    assert.deepEqual(JSON.parse(values.get(CATALOG_KEY)).isaeva.plans.weekly, {
      name: "Seven days", access: "7-day access", price: 7.5, stock: 12, available: false, updatedAt: planUpdate.body.catalog.isaeva.plans.weekly.updatedAt,
    });

    const productUpdate = await invoke(admin, adminRequest({
      method: "POST", token: ownerToken, headers: jsonHeaders,
      body: { action: "product", productId: "isaeva", name: "Isaeva Plus", version: "2.4.1" },
    }));
    assert.equal(productUpdate.statusCode, 200);
    assert.equal(productUpdate.body.catalog.isaeva.name, "Isaeva Plus");
    assert.equal(productUpdate.body.catalog.isaeva.version, "2.4.1");

    const invalidVersion = await invoke(admin, adminRequest({
      method: "POST", token: ownerToken, headers: jsonHeaders,
      body: { action: "version", platform: "linux", version: "1.0" },
    }));
    assert.equal(invalidVersion.statusCode, 400);

    const versionUpdate = await invoke(admin, adminRequest({
      method: "POST", token: ownerToken, headers: jsonHeaders,
      body: { action: "version", platform: "windows", version: "1.2.3" },
    }));
    assert.equal(versionUpdate.statusCode, 200);
    assert.deepEqual(versionUpdate.body.versions, { windows: "1.2.3" });

    const publicCatalog = await invoke(catalogApi, { method: "GET", headers: {} });
    assert.equal(publicCatalog.statusCode, 200);
    assert.equal(publicCatalog.body.fallback, undefined);
    assert.equal(publicCatalog.body.catalog.isaeva.plans.weekly.price, 7.5);
    assert.equal(publicCatalog.body.catalog.isaeva.name, "Isaeva Plus");
    assert.equal(publicCatalog.body.catalog.isaeva.version, "2.4.1");
    assert.deepEqual(publicCatalog.body.versions, { windows: "1.2.3" });

    const versionClear = await invoke(admin, adminRequest({
      method: "POST", token: ownerToken, headers: jsonHeaders,
      body: { action: "version", platform: "windows", version: "" },
    }));
    assert.equal(versionClear.statusCode, 200);
    assert.deepEqual(versionClear.body.versions, {});
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("registration, verification, and session grant admin access only to the exact owner email", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    AUTH_FROM_EMAIL: process.env.AUTH_FROM_EMAIL,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  };
  const values = new Map();
  const emailedCodes = [];

  process.env.KV_REST_API_URL = "https://kv.example.test";
  process.env.KV_REST_API_TOKEN = "test-token";
  process.env.RESEND_API_KEY = "test-token";
  process.env.AUTH_FROM_EMAIL = "test@example.test";
  delete process.env.ADMIN_EMAILS;
  global.fetch = async (url, options) => {
    if (url === "https://api.resend.com/emails") {
      const payload = JSON.parse(options.body);
      emailedCodes.push(payload.text.match(/\b\d{6}\b/)[0]);
      return { ok: true, json: async () => ({}) };
    }
    assert.equal(url, "https://kv.example.test");
    const [operation, key, value] = JSON.parse(options.body);
    if (operation === "GET") return { ok: true, json: async () => ({ result: values.get(key) ?? null }) };
    if (operation === "SET") values.set(key, value);
    if (operation === "DEL") values.delete(key);
    return { ok: true, json: async () => ({ result: "OK" }) };
  };

  async function authRequest(action, body, headers = {}) {
    return invoke(auth, { method: "POST", query: { action }, body, headers });
  }

  async function registerAndVerify(username, email) {
    const registration = await authRequest("register", { username, email, password: "secret-password-123" });
    assert.equal(registration.statusCode, 200);
    const verification = await authRequest("verify", { challengeId: registration.body.challengeId, code: emailedCodes.at(-1) });
    assert.equal(verification.statusCode, 200);
    const cookie = verification.headers["set-cookie"].match(/^auth_session=([^;]+)/)[1];
    return { verification, cookie };
  }

  try {
    const owner = await registerAndVerify("owneruser", OWNER_EMAIL);
    assert.equal(owner.verification.body.user.isAdmin, true);
    const ownerSession = await invoke(auth, { method: "GET", query: { action: "session" }, headers: { cookie: `auth_session=${owner.cookie}` } });
    assert.equal(ownerSession.statusCode, 200);
    assert.equal(ownerSession.body.user.isAdmin, true);
    assert.equal((await invoke(admin, adminRequest({ token: owner.cookie }))).statusCode, 200);

    const similar = await registerAndVerify("lookalike", "1mmx1mmxxx+other@gmail.com");
    assert.equal(similar.verification.body.user.isAdmin, false);
    const similarSession = await invoke(auth, { method: "GET", query: { action: "session" }, headers: { cookie: `auth_session=${similar.cookie}` } });
    assert.equal(similarSession.statusCode, 200);
    assert.equal(similarSession.body.user.isAdmin, false);
    assert.equal((await invoke(admin, adminRequest({ token: similar.cookie }))).statusCode, 403);
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

