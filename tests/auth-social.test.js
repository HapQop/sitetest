const assert = require("node:assert/strict");
const test = require("node:test");

const auth = require("../api/auth/[action].js");

test("registration saves an optional unverified social contact", async () => {
  const originalFetch = global.fetch;
  const originalEnv = {
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    AUTH_FROM_EMAIL: process.env.AUTH_FROM_EMAIL,
  };
  const values = new Map();
  process.env.KV_REST_API_URL = "https://kv.example.test";
  process.env.KV_REST_API_TOKEN = "test-token";
  process.env.RESEND_API_KEY = "test-token";
  process.env.AUTH_FROM_EMAIL = "test@example.test";
  global.fetch = async (url, options) => {
    if (url === "https://api.resend.com/emails") return { ok: true };
    assert.equal(url, "https://kv.example.test");
    const [action, key, value] = JSON.parse(options.body);
    if (action === "GET") return { ok: true, json: async () => ({ result: values.get(key) ?? null }) };
    if (action === "SET") values.set(key, value);
    if (action === "DEL") values.delete(key);
    return { ok: true, json: async () => ({ result: "OK" }) };
  };

  async function register(body) {
    const res = {
      statusCode: 200,
      setHeader() { return this; },
      status(code) { this.statusCode = code; return this; },
      send(value) { this.body = JSON.parse(value); return this; },
    };
    await auth({ method: "POST", query: { action: "register" }, body }, res);
    return res;
  }

  try {
    const base = { password: "secret-password-123" };
    const emailOnly = await register({ ...base, username: "emailuser", email: "email@example.test" });
    assert.equal(emailOnly.statusCode, 200);
    const emailUserId = values.get("auth:email:email@example.test");
    assert.equal(JSON.parse(values.get(`auth:user:${emailUserId}`)).socialContact, null);

    const discord = await register({ ...base, username: "discorduser", email: "discord@example.test", socialProvider: "discord", socialHandle: "@Discord.User" });
    assert.equal(discord.statusCode, 200);
    const discordUserId = values.get("auth:email:discord@example.test");
    assert.deepEqual(JSON.parse(values.get(`auth:user:${discordUserId}`)).socialContact, {
      provider: "discord", username: "discord.user", status: "pending",
    });

    const telegram = await register({ ...base, username: "telegramuser", email: "telegram@example.test", socialProvider: "telegram", socialHandle: "@Telegram_User" });
    assert.equal(telegram.statusCode, 200);
    const telegramUserId = values.get("auth:email:telegram@example.test");
    assert.deepEqual(JSON.parse(values.get(`auth:user:${telegramUserId}`)).socialContact, {
      provider: "telegram", username: "telegram_user", status: "pending",
    });

    const invalid = await register({ ...base, username: "invaliduser", email: "invalid@example.test", socialProvider: "telegram", socialHandle: "no" });
    assert.equal(invalid.statusCode, 400);
    assert.equal(values.has("auth:email:invalid@example.test"), false);
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
