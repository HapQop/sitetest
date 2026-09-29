const assert = require("node:assert/strict");
const test = require("node:test");

const auth = require("../api/auth/[action].js");

test("email-code login sends only for existing accounts and verifies into a session", async () => {
  const originalFetch = global.fetch;
  const originalEnv = Object.fromEntries(
    ["KV_REST_API_URL", "KV_REST_API_TOKEN", "RESEND_API_KEY", "AUTH_FROM_EMAIL"]
      .map((key) => [key, process.env[key]])
  );
  const values = new Map();
  const emails = [];
  const commands = [];
  process.env.KV_REST_API_URL = "https://kv.example.test";
  process.env.KV_REST_API_TOKEN = "test-token";
  process.env.RESEND_API_KEY = "test-token";
  process.env.AUTH_FROM_EMAIL = "test@example.test";
  values.set("auth:email:member@example.test", "member-id");
  values.set("auth:user:member-id", JSON.stringify({
    id: "member-id", username: "member", email: "member@example.test", verifiedAt: "2026-01-01T00:00:00.000Z",
  }));

  global.fetch = async (url, options) => {
    if (url === "https://api.resend.com/emails") {
      emails.push(JSON.parse(options.body));
      return { ok: true };
    }
    assert.equal(url, "https://kv.example.test");
    const [action, key, value, , , nx] = JSON.parse(options.body);
    commands.push(JSON.parse(options.body));
    if (action === "GET") return { ok: true, json: async () => ({ result: values.get(key) ?? null }) };
    if (action === "SET") {
      if (nx === "NX" && values.has(key)) return { ok: true, json: async () => ({ result: null }) };
      values.set(key, value);
    }
    if (action === "DEL") values.delete(key);
    return { ok: true, json: async () => ({ result: "OK" }) };
  };

  async function request(action, body, cookie) {
    const headers = {};
    const res = {
      statusCode: 200,
      setHeader(key, value) { headers[key] = value; return this; },
      status(code) { this.statusCode = code; return this; },
      send(value) { this.body = JSON.parse(value); return this; },
    };
    await auth({ method: action === "session" ? "GET" : "POST", query: { action }, body, headers: { cookie } }, res);
    return { ...res, headers };
  }

  try {
    const invalid = await request("login-code", { email: "invalid" });
    assert.equal(invalid.statusCode, 400);
    assert.equal(commands.length, 0);

    const unknown = await request("login-code", { email: "nobody@example.test" });
    assert.equal(unknown.statusCode, 200);
    assert.deepEqual(Object.keys(unknown.body), ["challengeId"]);
    assert.equal(values.has(`auth:challenge:${unknown.body.challengeId}`), false);
    assert.equal(emails.length, 0);
    const unknownAgain = await request("login-code", { email: "nobody@example.test" });
    assert.deepEqual(unknownAgain.body, unknown.body);

    const started = await request("login-code", { email: " MEMBER@EXAMPLE.TEST " });
    assert.equal(started.statusCode, 200);
    assert.deepEqual(Object.keys(started.body), Object.keys(unknown.body));
    assert.equal(emails.length, 1);
    assert.deepEqual(emails[0].to, ["member@example.test"]);
    const challengeKey = `auth:challenge:${started.body.challengeId}`;
    const challenge = JSON.parse(values.get(challengeKey));
    assert.equal(challenge.type, "login");
    assert.equal(challenge.userId, "member-id");
    assert.equal(challenge.attempts, 0);
    assert.ok(challenge.expiresAt > Date.now() + 9 * 60 * 1000);
    assert.ok(commands.some(([action, key, , ttlFlag, ttl]) => action === "SET" && key === challengeKey && ttlFlag === "EX" && ttl === "600"));
    const code = emails[0].text.match(/\b\d{6}\b/)[0];

    const repeated = await request("login-code", { email: "member@example.test" });
    assert.deepEqual(repeated.body, started.body);
    assert.equal(emails.length, 1);

    for (let attempt = 1; attempt <= 5; attempt++) {
      const wrong = await request("verify", { challengeId: started.body.challengeId, code: code === "000000" ? "999999" : "000000" });
      assert.equal(wrong.statusCode, 400);
      assert.equal(JSON.parse(values.get(challengeKey)).attempts, attempt);
    }
    const locked = await request("verify", { challengeId: started.body.challengeId, code });
    assert.equal(locked.statusCode, 429);
    assert.equal(locked.headers["Set-Cookie"], undefined);

    // A fresh request after the cooldown yields a new challenge and the normal verification flow.
    const memberCooldownKey = commands.find(([action, key, value]) => action === "SET" && key.startsWith("auth:login-code-cooldown:") && value === started.body.challengeId)?.[1];
    assert.ok(memberCooldownKey);
    values.delete(memberCooldownKey);
    const retry = await request("login-code", { email: "member@example.test" });
    assert.equal(retry.statusCode, 200);
    assert.notEqual(retry.body.challengeId, started.body.challengeId);
    assert.equal(emails.length, 2);
    const retryCode = emails[1].text.match(/\b\d{6}\b/)[0];
    const verified = await request("verify", { challengeId: retry.body.challengeId, code: retryCode });
    assert.equal(verified.statusCode, 200);
    assert.equal(verified.body.user.email, "member@example.test");
    assert.match(verified.headers["Set-Cookie"], /auth_session=.*HttpOnly; Secure; SameSite=Lax/);
    assert.equal(values.has(`auth:challenge:${retry.body.challengeId}`), false);
    const session = await request("session", null, verified.headers["Set-Cookie"]);
    assert.equal(session.statusCode, 200);
    assert.equal(session.body.user.username, "member");
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
