const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const test = require("node:test");

const auth = require("../api/auth/[action].js");

function passwordHash(password) {
  const salt = "1".repeat(32);
  const derived = crypto.scryptSync(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    send(value) { this.body = JSON.parse(value); return this; },
  };
}

test("account exposes only the signed-in user's purchased keys and can change the password", async () => {
  const originalFetch = global.fetch;
  const originalEnv = Object.fromEntries(["KV_REST_API_URL", "KV_REST_API_TOKEN"].map((key) => [key, process.env[key]]));
  const values = new Map();
  const userId = "account-user";
  const sessionToken = "current-session-token";
  const sessionKey = `auth:session:${crypto.createHash("sha256").update(sessionToken).digest("hex")}`;
  process.env.KV_REST_API_URL = "https://kv.example.test";
  process.env.KV_REST_API_TOKEN = "test-token";
  values.set(`auth:user:${userId}`, JSON.stringify({
    id: userId,
    username: "buyer",
    email: "buyer@example.test",
    passwordHash: passwordHash("old-password-123"),
    verifiedAt: "2026-10-04T00:00:00.000Z",
  }));
  values.set(sessionKey, JSON.stringify({ userId }));
  values.set(`auth:keys:${userId}`, JSON.stringify([
    { id: "purchase-1", productName: "Potassium", planName: "Lifetime", key: "CBX-AAAA-BBBB-CCCC", purchasedAt: "2026-10-04T12:00:00.000Z", amount: 18.5 },
    { productName: "Invalid", key: "" },
  ]));
  global.fetch = async (_url, options) => {
    const [operation, key, value] = JSON.parse(options.body);
    if (operation === "GET") return { ok: true, json: async () => ({ result: values.get(key) ?? null }) };
    if (operation === "SET") values.set(key, value);
    if (operation === "DEL") values.delete(key);
    return { ok: true, json: async () => ({ result: "OK" }) };
  };

  async function request(action, method, body, cookie) {
    const res = response();
    await auth({ method, query: { action }, body, headers: { cookie: cookie ? `auth_session=${cookie}` : "" } }, res);
    return res;
  }

  try {
    const unauthenticated = await request("account", "GET");
    assert.equal(unauthenticated.statusCode, 401);

    const account = await request("account", "GET", null, sessionToken);
    assert.equal(account.statusCode, 200);
    assert.deepEqual(account.body.user, { username: "buyer", email: "buyer@example.test", isAdmin: false });
    assert.deepEqual(account.body.keys, [{
      id: "purchase-1", productName: "Potassium", planName: "Lifetime", key: "CBX-AAAA-BBBB-CCCC", purchasedAt: "2026-10-04T12:00:00.000Z", amount: 18.5,
    }]);
    assert.deepEqual(account.body.stats, { purchases: 1, spent: 18.5, currency: "USD" });

    const incorrect = await request("change-password", "POST", { currentPassword: "not-the-password", newPassword: "new-password-123" }, sessionToken);
    assert.equal(incorrect.statusCode, 400);
    assert.equal(incorrect.body.error, "Current password is incorrect.");

    const changed = await request("change-password", "POST", { currentPassword: "old-password-123", newPassword: "new-password-123" }, sessionToken);
    assert.equal(changed.statusCode, 200);
    assert.match(changed.headers["set-cookie"], /^auth_session=.*HttpOnly; Secure; SameSite=Lax/);
    assert.equal(values.has(sessionKey), false);
    assert.notEqual(JSON.parse(values.get(`auth:user:${userId}`)).passwordHash, passwordHash("old-password-123"));

    const expired = await request("account", "GET", null, sessionToken);
    assert.equal(expired.statusCode, 401);
    const newToken = changed.headers["set-cookie"].match(/^auth_session=([^;]+)/)[1];
    const refreshed = await request("account", "GET", null, newToken);
    assert.equal(refreshed.statusCode, 200);
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("account page links the user menu and includes account, keys, stats, spin, and logout navigation", () => {
  const markup = fs.readFileSync("account.html", "utf8");
  const headerScript = fs.readFileSync("scripts/site-auth-state.js", "utf8");
  assert.match(markup, /data-account-keys/);
  assert.match(markup, /data-account-password-form/);
  assert.match(markup, /data-account-logout/);
  assert.match(markup, /data-account-tab="stats"/);
  assert.match(markup, /data-account-tab="spin"/);
  assert.match(headerScript, /class="user-name" href="\/account"/);
  assert.doesNotMatch(headerScript, /class="logout-btn"/);
});
