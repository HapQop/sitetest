const assert = require("node:assert/strict");
const test = require("node:test");

const auth = require("../api/auth/[action].js");

function response() {
  return {
    statusCode: 200,
    setHeader() { return this; },
    status(code) { this.statusCode = code; return this; },
    send(value) { this.body = JSON.parse(value); return this; },
  };
}

test("a rejected verification email returns 503 and removes the unsent challenge", async () => {
  const originalFetch = global.fetch;
  const originalError = console.error;
  const originalEnv = Object.fromEntries(
    ["KV_REST_API_URL", "KV_REST_API_TOKEN", "RESEND_API_KEY", "AUTH_FROM_EMAIL"]
      .map((key) => [key, process.env[key]])
  );
  const values = new Map();
  let rejectEmail = true;
  process.env.KV_REST_API_URL = "https://kv.example.test";
  process.env.KV_REST_API_TOKEN = "test-token";
  process.env.RESEND_API_KEY = "test-token";
  process.env.AUTH_FROM_EMAIL = "CheatBlox <noreply@cheatblox.xyz>";
  console.error = () => {};
  global.fetch = async (url, options) => {
    if (url === "https://api.resend.com/emails") return rejectEmail ? { ok: false, status: 403 } : { ok: true };
    const [operation, key, value] = JSON.parse(options.body);
    if (operation === "GET") return { ok: true, json: async () => ({ result: values.get(key) ?? null }) };
    if (operation === "SET") values.set(key, value);
    if (operation === "DEL") values.delete(key);
    return { ok: true, json: async () => ({ result: "OK" }) };
  };

  try {
    const res = response();
    await auth({
      method: "POST",
      query: { action: "register" },
      body: { username: "emailretry", email: "retry@example.test", password: "secret-password-123" },
    }, res);

    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, "Verification email could not be delivered. Please try again later.");
    assert.equal([...values.keys()].some((key) => key.startsWith("auth:challenge:")), false);

    rejectEmail = false;
    const retry = response();
    await auth({
      method: "POST",
      query: { action: "register" },
      body: { username: "emailretry", email: "retry@example.test", password: "secret-password-123" },
    }, retry);
    assert.equal(retry.statusCode, 200);
    assert.ok(retry.body.challengeId);
  } finally {
    global.fetch = originalFetch;
    console.error = originalError;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
