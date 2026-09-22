const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);
const USER_TTL = 60 * 60 * 24 * 365;
const CHALLENGE_TTL = 10 * 60;
const SESSION_TTL = 60 * 60 * 24 * 7;
const MAX_CODE_ATTEMPTS = 5;

function json(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8").send(JSON.stringify(body));
}

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function kv(command) {
  const response = await fetch(env("KV_REST_API_URL"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("KV_REST_API_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) throw new Error(payload.error || "KV request failed");
  return payload.result;
}

async function getJson(key) {
  const value = await kv(["GET", key]);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function setJson(key, value, ttl = USER_TTL) {
  await kv(["SET", key, JSON.stringify(value), "EX", String(ttl)]);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validUsername(value) {
  return value.length >= 3 && value.length <= 32 && /^[a-z0-9_.-]+$/.test(value);
}

function validPassword(value) {
  return typeof value === "string" && value.length >= 8 && value.length <= 128;
}

function randomCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });
  return `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [, salt, expectedHex] = String(stored).split("$");
  if (!salt || !expectedHex) return false;
  const derived = await scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 });
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === derived.length && crypto.timingSafeEqual(expected, Buffer.from(derived));
}

async function sendCode(email, code, purpose) {
  const subject = purpose === "reset" ? "CheatBlox password recovery code" : "CheatBlox verification code";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env("AUTH_FROM_EMAIL"),
      to: [email],
      subject,
      text: `Your CheatBlox code is ${code}. It expires in 10 minutes.`,
      html: `<p>Your CheatBlox code is <strong style="font-size:22px;letter-spacing:4px">${code}</strong>.</p><p>This code expires in 10 minutes.</p>`,
    }),
  });
  if (!response.ok) throw new Error("Email provider rejected the message");
}

async function createChallenge(data) {
  const challengeId = crypto.randomUUID();
  const code = randomCode();
  await setJson(`auth:challenge:${challengeId}`, {
    ...data,
    codeHash: digest(code),
    attempts: 0,
    expiresAt: Date.now() + CHALLENGE_TTL * 1000,
  }, CHALLENGE_TTL);
  await sendCode(data.email, code, data.type);
  return challengeId;
}

function cookieHeader(token) {
  return `auth_session=${token}; Path=/; Max-Age=${SESSION_TTL}; HttpOnly; Secure; SameSite=Lax`;
}

async function issueSession(res, userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  await setJson(`auth:session:${digest(token)}`, { userId }, SESSION_TTL);
  res.setHeader("Set-Cookie", cookieHeader(token));
}

function bodyValue(body, key) {
  return typeof body?.[key] === "string" ? body[key] : "";
}

async function register(req, res) {
  const username = bodyValue(req.body, "username").trim();
  const usernameLower = normalizeUsername(username);
  const email = normalizeEmail(bodyValue(req.body, "email"));
  const password = bodyValue(req.body, "password");
  if (!validUsername(usernameLower)) return json(res, 400, { error: "Username must be 3–32 letters, numbers, dots, dashes, or underscores." });
  if (!validEmail(email)) return json(res, 400, { error: "Enter a valid email address." });
  if (!validPassword(password)) return json(res, 400, { error: "Password must be 8–128 characters." });

  const existingId = await kv(["GET", `auth:username:${usernameLower}`]);
  const existingEmailId = await kv(["GET", `auth:email:${email}`]);
  if (existingId && existingId !== existingEmailId) return json(res, 409, { error: "That username is already in use." });
  if (existingEmailId && existingEmailId !== existingId) return json(res, 409, { error: "That email is already in use." });
  if (existingId) {
    const existingUser = await getJson(`auth:user:${existingId}`);
    if (existingUser?.verifiedAt) return json(res, 409, { error: "That account is already registered." });
  }

  const userId = existingId || crypto.randomUUID();
  const user = {
    id: userId,
    username,
    usernameLower,
    email,
    passwordHash: await hashPassword(password),
    verifiedAt: null,
    updatedAt: new Date().toISOString(),
  };
  await setJson(`auth:user:${userId}`, user);
  await kv(["SET", `auth:username:${usernameLower}`, userId, "EX", String(USER_TTL)]);
  await kv(["SET", `auth:email:${email}`, userId, "EX", String(USER_TTL)]);
  const challengeId = await createChallenge({ type: "register", userId, email });
  return json(res, 200, { challengeId });
}

async function login(req, res) {
  const identifier = bodyValue(req.body, "identifier").trim();
  const password = bodyValue(req.body, "password");
  if (!identifier || !validPassword(password)) return json(res, 400, { error: "Enter your username/email and password." });
  const lookupKey = identifier.includes("@") ? `auth:email:${normalizeEmail(identifier)}` : `auth:username:${normalizeUsername(identifier)}`;
  const userId = await kv(["GET", lookupKey]);
  const user = userId ? await getJson(`auth:user:${userId}`) : null;
  if (!user || !(await verifyPassword(password, user.passwordHash))) return json(res, 401, { error: "Invalid username/email or password." });
  if (!user.verifiedAt) {
    const challengeId = await createChallenge({ type: "login", userId: user.id, email: user.email });
    return json(res, 200, { challengeId });
  }
  const challengeId = await createChallenge({ type: "login", userId: user.id, email: user.email });
  return json(res, 200, { challengeId });
}

async function forgot(req, res) {
  const email = normalizeEmail(bodyValue(req.body, "email"));
  if (!validEmail(email)) return json(res, 400, { error: "Enter a valid email address." });
  const userId = await kv(["GET", `auth:email:${email}`]);
  const challengeId = userId ? await createChallenge({ type: "reset", userId, email }) : crypto.randomUUID();
  return json(res, 200, { challengeId });
}

async function verify(req, res) {
  const challengeId = bodyValue(req.body, "challengeId");
  const code = bodyValue(req.body, "code");
  const challenge = await getJson(`auth:challenge:${challengeId}`);
  if (!challenge || challenge.type === "reset" || Date.now() > challenge.expiresAt) return json(res, 400, { error: "This verification code has expired." });
  if (!/^\d{6}$/.test(code)) return json(res, 400, { error: "Enter the six-digit code." });
  if (challenge.attempts >= MAX_CODE_ATTEMPTS) return json(res, 429, { error: "Too many code attempts. Request a new code." });
  if (digest(code) !== challenge.codeHash) {
    challenge.attempts += 1;
    await setJson(`auth:challenge:${challengeId}`, challenge, Math.max(1, Math.ceil((challenge.expiresAt - Date.now()) / 1000)));
    return json(res, 400, { error: "Incorrect verification code." });
  }
  const user = await getJson(`auth:user:${challenge.userId}`);
  if (!user) return json(res, 400, { error: "Account not found." });
  user.verifiedAt = user.verifiedAt || new Date().toISOString();
  await setJson(`auth:user:${user.id}`, user);
  await kv(["DEL", `auth:challenge:${challengeId}`]);
  await issueSession(res, user.id);
  return json(res, 200, { ok: true, user: { username: user.username, email: user.email } });
}

async function reset(req, res) {
  const challengeId = bodyValue(req.body, "challengeId");
  const email = normalizeEmail(bodyValue(req.body, "email"));
  const code = bodyValue(req.body, "code");
  const password = bodyValue(req.body, "password");
  const challenge = await getJson(`auth:challenge:${challengeId}`);
  if (!challenge || challenge.type !== "reset" || challenge.email !== email || Date.now() > challenge.expiresAt) return json(res, 400, { error: "This recovery code has expired." });
  if (!validPassword(password)) return json(res, 400, { error: "Password must be 8–128 characters." });
  if (!/^\d{6}$/.test(code) || digest(code) !== challenge.codeHash) return json(res, 400, { error: "Incorrect recovery code." });
  const user = await getJson(`auth:user:${challenge.userId}`);
  if (!user) return json(res, 400, { error: "Account not found." });
  user.passwordHash = await hashPassword(password);
  user.updatedAt = new Date().toISOString();
  await setJson(`auth:user:${user.id}`, user);
  await kv(["DEL", `auth:challenge:${challengeId}`]);
  return json(res, 200, { ok: true });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
  try {
    const action = String(req.query?.action || "").toLowerCase();
    if (action === "register") return await register(req, res);
    if (action === "login") return await login(req, res);
    if (action === "forgot") return await forgot(req, res);
    if (action === "verify") return await verify(req, res);
    if (action === "reset") return await reset(req, res);
    return json(res, 404, { error: "Unknown auth action." });
  } catch (error) {
    console.error("Auth API error", error.message);
    const configurationError = /Missing environment variable/.test(error.message);
    return json(res, configurationError ? 503 : 500, {
      error: configurationError ? "Authentication service is not configured yet." : "Authentication service is temporarily unavailable.",
    });
  }
};
