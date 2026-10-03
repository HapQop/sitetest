const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");

const adminApi = require("../api/admin");
const homeApi = require("../api/home");
const exploitOverridesApi = require("../api/exploit-overrides");
const { DEFAULT_HOME_SETTINGS, HOME_SETTINGS_KEY } = require("../lib/home-settings");
const { EXPLOIT_CARDS, EXPLOIT_OVERRIDES_KEY } = require("../lib/exploit-overrides");

const OWNER_EMAIL = "1mmx1mmxxx@gmail.com";

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function tokenDigest(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function request({ method = "GET", token, body, headers = {} } = {}) {
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

async function invoke(handler, req) {
  const res = response();
  await handler(req, res);
  return res;
}

test("admin edits home and exploit sections and publishes the saved content", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    ADMIN_EMAILS: process.env.ADMIN_EMAILS,
  };
  const values = new Map();
  const ownerToken = "admin-sections-owner";
  const visitorToken = "admin-sections-visitor";
  const jsonHeaders = { "content-type": "application/json", origin: "https://site.example.test" };

  process.env.KV_REST_API_URL = "https://kv.example.test";
  process.env.KV_REST_API_TOKEN = "test-token";
  delete process.env.ADMIN_EMAILS;
  values.set(`auth:session:${tokenDigest(ownerToken)}`, JSON.stringify({ userId: "owner" }));
  values.set("auth:user:owner", JSON.stringify({ id: "owner", email: OWNER_EMAIL, verifiedAt: "2026-09-28T00:00:00.000Z" }));
  values.set(`auth:session:${tokenDigest(visitorToken)}`, JSON.stringify({ userId: "visitor" }));
  values.set("auth:user:visitor", JSON.stringify({ id: "visitor", email: "visitor@example.test", verifiedAt: "2026-09-28T00:00:00.000Z" }));

  global.fetch = async (url, options) => {
    assert.equal(url, "https://kv.example.test");
    assert.equal(options.headers.Authorization, "Bearer test-token");
    const [operation, key, value] = JSON.parse(options.body);
    if (operation === "GET") return { ok: true, json: async () => ({ result: values.get(key) ?? null }) };
    if (operation === "SET") {
      values.set(key, value);
      return { ok: true, json: async () => ({ result: "OK" }) };
    }
    throw new Error(`Unexpected KV operation: ${operation}`);
  };

  try {
    const dashboard = await invoke(adminApi, request({ token: ownerToken }));
    assert.equal(dashboard.statusCode, 200);
    assert.deepEqual(dashboard.body.home, DEFAULT_HOME_SETTINGS);
    assert.equal(dashboard.body.exploitCards.length, EXPLOIT_CARDS.length);
    assert.deepEqual(dashboard.body.exploitOverrides, {});

    const home = {
      ...DEFAULT_HOME_SETTINGS,
      titleRu: "Заголовок на русском",
      titleEn: "English headline",
      descriptionRu: "Русское описание",
      descriptionEn: "English description",
      promoCode: "SEPTEMBER25",
      promoPercent: 25,
      telegramUrl: "https://t.me/new_channel",
      discordUrl: "https://discord.com/invite/new-server",
    };
    const savedHome = await invoke(adminApi, request({
      method: "POST", token: ownerToken, headers: jsonHeaders, body: { action: "home", settings: home },
    }));
    assert.equal(savedHome.statusCode, 200);
    assert.equal(savedHome.body.home.titleRu, "Заголовок на русском");
    assert.equal(savedHome.body.home.titleEn, "English headline");
    assert.equal(JSON.parse(values.get(HOME_SETTINGS_KEY)).promoCode, "SEPTEMBER25");

    const publicHome = await invoke(homeApi, request());
    assert.equal(publicHome.statusCode, 200);
    assert.equal(publicHome.body.home.descriptionRu, "Русское описание");
    assert.equal(publicHome.body.home.descriptionEn, "English description");
    assert.equal(publicHome.body.home.promoPercent, 25);

    const savedExploit = await invoke(adminApi, request({
      method: "POST", token: ownerToken, headers: jsonHeaders,
      body: { action: "exploit", id: "xeno", version: " 3.2.1 ", status: "offline" },
    }));
    assert.equal(savedExploit.statusCode, 200);
    assert.deepEqual(savedExploit.body.exploitOverrides, { xeno: { version: "3.2.1", status: "offline" } });
    assert.deepEqual(JSON.parse(values.get(EXPLOIT_OVERRIDES_KEY)), { xeno: { version: "3.2.1", status: "offline" } });

    const publicOverrides = await invoke(exploitOverridesApi, request());
    assert.equal(publicOverrides.statusCode, 200);
    assert.deepEqual(publicOverrides.body.overrides, { xeno: { version: "3.2.1", status: "offline" } });

    const clearedExploit = await invoke(adminApi, request({
      method: "POST", token: ownerToken, headers: jsonHeaders,
      body: { action: "exploit", id: "xeno", version: "", status: "auto" },
    }));
    assert.equal(clearedExploit.statusCode, 200);
    assert.deepEqual(clearedExploit.body.exploitOverrides, {});
    assert.deepEqual((await invoke(exploitOverridesApi, request())).body.overrides, {});

    const savedVng = await invoke(adminApi, request({
      method: "POST", token: ownerToken, headers: jsonHeaders,
      body: { action: "exploit", id: "delta", version: "", status: "auto", vngStatus: "offline" },
    }));
    assert.equal(savedVng.statusCode, 200);
    assert.deepEqual(savedVng.body.exploitOverrides.delta, { version: "", status: "auto", vngStatus: "offline" });

    const renamedExploit = await invoke(adminApi, request({
      method: "POST", token: ownerToken, headers: jsonHeaders,
      body: { action: "exploit-card", id: "xeno", title: "Xeno Prime", version: "3.3.0", status: "online", vngStatus: "auto" },
    }));
    assert.equal(renamedExploit.statusCode, 200);
    assert.equal(renamedExploit.body.exploitCards.find((card) => card.id === "xeno").title, "Xeno Prime");
    assert.equal(renamedExploit.body.exploitCards.find((card) => card.id === "xeno").apiTitle, "Xeno");

    const hiddenExploit = await invoke(adminApi, request({
      method: "POST", token: ownerToken, headers: jsonHeaders, body: { action: "exploit-delete", id: "xeno" },
    }));
    assert.equal(hiddenExploit.statusCode, 200);
    assert.equal(hiddenExploit.body.exploitCards.find((card) => card.id === "xeno").hidden, true);

    const restoredExploit = await invoke(adminApi, request({
      method: "POST", token: ownerToken, headers: jsonHeaders, body: { action: "exploit-restore", id: "xeno" },
    }));
    assert.equal(restoredExploit.statusCode, 200);
    assert.equal(restoredExploit.body.exploitCards.find((card) => card.id === "xeno").hidden, false);

    const addedExploit = await invoke(adminApi, request({
      method: "POST", token: ownerToken, headers: jsonHeaders,
      body: { action: "exploit-add", title: "Custom Tool", platform: "tools", version: "1.0", status: "offline" },
    }));
    assert.equal(addedExploit.statusCode, 200);
    const customId = addedExploit.body.created.id;
    assert.match(customId, /^custom-/);
    assert.equal(addedExploit.body.exploitCards.find((card) => card.id === customId).title, "Custom Tool");

    const updatedCustomExploit = await invoke(adminApi, request({
      method: "POST", token: ownerToken, headers: jsonHeaders,
      body: { action: "exploit-card", id: customId, title: "Custom Tool 2", platform: "android", version: "1.1", status: "online" },
    }));
    assert.equal(updatedCustomExploit.statusCode, 200);
    assert.equal(updatedCustomExploit.body.exploitCards.find((card) => card.id === customId).title, "Custom Tool 2");

    const deletedCustomExploit = await invoke(adminApi, request({
      method: "POST", token: ownerToken, headers: jsonHeaders, body: { action: "exploit-delete", id: customId },
    }));
    assert.equal(deletedCustomExploit.statusCode, 200);
    assert.equal(deletedCustomExploit.body.exploitCards.some((card) => card.id === customId), false);

    const nonAdminWrite = await invoke(adminApi, request({
      method: "POST", token: visitorToken, headers: jsonHeaders, body: { action: "exploit", id: "xeno", version: "1", status: "online" },
    }));
    assert.equal(nonAdminWrite.statusCode, 403);

    const badOrigin = await invoke(adminApi, request({
      method: "POST", token: ownerToken,
      headers: { "content-type": "application/json", origin: "https://attacker.example.test" },
      body: { action: "exploit", id: "xeno", version: "1", status: "online" },
    }));
    assert.equal(badOrigin.statusCode, 403);

    const unknownExploit = await invoke(adminApi, request({
      method: "POST", token: ownerToken, headers: jsonHeaders, body: { action: "exploit", id: "unknown", version: "1", status: "online" },
    }));
    assert.equal(unknownExploit.statusCode, 400);

    const invalidStatus = await invoke(adminApi, request({
      method: "POST", token: ownerToken, headers: jsonHeaders, body: { action: "exploit", id: "xeno", version: "1", status: "broken" },
    }));
    assert.equal(invalidStatus.statusCode, 400);

    const invalidHomeUrl = await invoke(adminApi, request({
      method: "POST", token: ownerToken, headers: jsonHeaders,
      body: { action: "home", settings: { ...home, telegramUrl: "javascript:alert(1)" } },
    }));
    assert.equal(invalidHomeUrl.statusCode, 400);
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
