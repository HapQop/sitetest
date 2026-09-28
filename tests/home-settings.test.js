const assert = require("node:assert/strict");
const test = require("node:test");

const homeApi = require("../api/home");
const {
  DEFAULT_HOME_SETTINGS,
  HOME_SETTINGS_KEY,
  readHomeSettings,
  validateHomeSettings,
  writeHomeSettings,
} = require("../lib/home-settings");

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("home settings validate text, promotion, and safe HTTPS community URLs", () => {
  const valid = validateHomeSettings({
    ...DEFAULT_HOME_SETTINGS,
    titleRu: "Новый заголовок",
    titleEn: "New headline",
    promoCode: "WELCOME20",
    promoPercent: 20,
    telegramUrl: "https://t.me/example",
    discordUrl: "https://discord.com/invite/example",
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.home.promoPercent, 20);

  assert.equal(validateHomeSettings({ ...DEFAULT_HOME_SETTINGS, telegramUrl: "javascript:alert(1)" }).valid, false);
  assert.equal(validateHomeSettings({ ...DEFAULT_HOME_SETTINGS, discordUrl: "http://discord.com/invite/example" }).valid, false);
  assert.equal(validateHomeSettings({ ...DEFAULT_HOME_SETTINGS, promoPercent: 101 }).valid, false);
});

test("home settings persist in KV and public API falls back without KV", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  };
  const values = new Map();
  process.env.KV_REST_API_URL = "https://kv.example.test";
  process.env.KV_REST_API_TOKEN = "test-token";
  global.fetch = async (url, options) => {
    assert.equal(url, "https://kv.example.test");
    assert.equal(options.headers.Authorization, "Bearer test-token");
    const [operation, key, value] = JSON.parse(options.body);
    if (operation === "GET") return { ok: true, json: async () => ({ result: values.get(key) ?? null }) };
    if (operation === "SET") {
      values.set(key, value);
      return { ok: true, json: async () => ({ result: "OK" }) };
    }
    throw new Error(`Unexpected operation: ${operation}`);
  };

  try {
    const saved = await writeHomeSettings({ ...DEFAULT_HOME_SETTINGS, titleRu: "Тестовая главная", promoPercent: 12.5 });
    assert.equal(saved.titleRu, "Тестовая главная");
    assert.equal(JSON.parse(values.get(HOME_SETTINGS_KEY)).promoPercent, 12.5);
    assert.equal((await readHomeSettings()).titleRu, "Тестовая главная");

    const apiResponse = response();
    await homeApi({ method: "GET" }, apiResponse);
    assert.equal(apiResponse.statusCode, 200);
    assert.equal(apiResponse.body.home.titleRu, "Тестовая главная");
    assert.equal(apiResponse.body.fallback, undefined);

    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    const fallbackResponse = response();
    await homeApi({ method: "GET" }, fallbackResponse);
    assert.equal(fallbackResponse.statusCode, 200);
    assert.equal(fallbackResponse.body.fallback, true);
    assert.deepEqual(fallbackResponse.body.home, DEFAULT_HOME_SETTINGS);
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("home API only accepts GET", async () => {
  const result = response();
  await homeApi({ method: "POST" }, result);
  assert.equal(result.statusCode, 405);
  assert.equal(result.headers.allow, "GET");
});

