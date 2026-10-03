const crypto = require("node:crypto");
const { promisify } = require("node:util");
const { isAdminUser } = require("../../lib/admin-access");

const scrypt = promisify(crypto.scrypt);
const USER_TTL = 60 * 60 * 24 * 365;
const CHALLENGE_TTL = 10 * 60;
const SESSION_TTL = 60 * 60 * 24 * 7;
const MAX_CODE_ATTEMPTS = 5;
const LOGIN_CODE_COOLDOWN = 60;

function publicUser(user) {
  return { username: user.username, email: user.email, isAdmin: isAdminUser(user) };
}

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
  if (!response.ok) {
    const error = new Error(`Email provider rejected the message (${response.status || "unknown status"})`);
    error.code = "EMAIL_DELIVERY_UNAVAILABLE";
    throw error;
  }
}

async function createChallenge(data, challengeId = crypto.randomUUID()) {
  const code = randomCode();
  const challengeKey = `auth:challenge:${challengeId}`;
  await setJson(challengeKey, {
    ...data,
    codeHash: digest(code),
    attempts: 0,
    expiresAt: Date.now() + CHALLENGE_TTL * 1000,
  }, CHALLENGE_TTL);
  try {
    await sendCode(data.email, code, data.type);
  } catch (error) {
    await kv(["DEL", challengeKey]).catch(() => {});
    throw error;
  }
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

async function authenticatedSession(req) {
  const cookies = req.headers.cookie || "";
  const match = cookies.match(/auth_session=([^;]+)/);
  if (!match) return null;
  const token = match[1];
  const session = await getJson(`auth:session:${digest(token)}`);
  if (!session) return null;
  const user = await getJson(`auth:user:${session.userId}`);
  return user ? { token, user } : null;
}

function purchasedKeys(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const key = typeof item?.key === "string" ? item.key.trim() : "";
    if (!key || key.length > 512) return null;
    return {
      id: typeof item.id === "string" ? item.id.slice(0, 120) : "",
      productName: typeof item.productName === "string" ? item.productName.slice(0, 120) : "CheatBlox product",
      planName: typeof item.planName === "string" ? item.planName.slice(0, 120) : "",
      key,
      purchasedAt: typeof item.purchasedAt === "string" ? item.purchasedAt : "",
    };
  }).filter(Boolean);
}

function bodyValue(body, key) {
  return typeof body?.[key] === "string" ? body[key] : "";
}

async function register(req, res) {
  const username = bodyValue(req.body, "username").trim();
  const usernameLower = normalizeUsername(username);
  const email = normalizeEmail(bodyValue(req.body, "email"));
  const password = bodyValue(req.body, "password");
  const socialProvider = bodyValue(req.body, "socialProvider").trim().toLowerCase();
  const socialHandle = bodyValue(req.body, "socialHandle").trim().replace(/^@/, "");
  if (!validUsername(usernameLower)) return json(res, 400, { error: "Username must be 3–32 letters, numbers, dots, dashes, or underscores." });
  if (!validEmail(email)) return json(res, 400, { error: "Enter a valid email address." });
  if (!validPassword(password)) return json(res, 400, { error: "Password must be 8–128 characters." });
  if (!["", "discord", "telegram"].includes(socialProvider)) return json(res, 400, { error: "Choose Discord, Telegram, or email only." });
  if (!socialProvider && socialHandle) return json(res, 400, { error: "Choose a contact service for that username." });
  if (socialProvider === "discord" && !/^[a-z0-9_.]{2,32}$/i.test(socialHandle)) return json(res, 400, { error: "Enter a valid Discord username (2–32 letters, numbers, dots, or underscores)." });
  if (socialProvider === "telegram" && !/^[a-z][a-z0-9_]{4,31}$/i.test(socialHandle)) return json(res, 400, { error: "Enter a valid Telegram username (5–32 letters, numbers, or underscores)." });

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
    socialContact: socialProvider ? { provider: socialProvider, username: socialHandle.toLowerCase(), status: "pending" } : null,
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
  // Для уже верифицированных пользователей сразу создаем сессию без кода
  await issueSession(res, user.id);
  return json(res, 200, { ok: true, user: publicUser(user) });
}

async function loginCode(req, res) {
  const email = normalizeEmail(bodyValue(req.body, "email"));
  if (!validEmail(email)) return json(res, 400, { error: "Enter a valid email address." });

  const cooldownKey = `auth:login-code-cooldown:${digest(email)}`;
  const proposedId = crypto.randomUUID();
  const claimed = await kv(["SET", cooldownKey, proposedId, "EX", String(LOGIN_CODE_COOLDOWN), "NX"]);
  const challengeId = claimed ? proposedId : await kv(["GET", cooldownKey]);
  if (claimed) {
    const userId = await kv(["GET", `auth:email:${email}`]);
    const user = userId ? await getJson(`auth:user:${userId}`) : null;
    if (user && user.email === email) {
      try {
        await createChallenge({ type: "login", userId: user.id, email }, challengeId);
      } catch (error) {
        await kv(["DEL", cooldownKey]);
        throw error;
      }
    }
  }
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
  return json(res, 200, { ok: true, user: publicUser(user) });
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

async function getSession(req, res) {
  const authenticated = await authenticatedSession(req);
  if (!authenticated) return json(res, 401, { error: "Not authenticated." });
  return json(res, 200, { ok: true, user: publicUser(authenticated.user) });
}

async function account(req, res) {
  const authenticated = await authenticatedSession(req);
  if (!authenticated) return json(res, 401, { error: "Not authenticated." });
  const keys = purchasedKeys(await getJson(`auth:keys:${authenticated.user.id}`));
  return json(res, 200, { ok: true, user: publicUser(authenticated.user), keys });
}

async function changePassword(req, res) {
  const authenticated = await authenticatedSession(req);
  if (!authenticated) return json(res, 401, { error: "Not authenticated." });

  const currentPassword = bodyValue(req.body, "currentPassword");
  const newPassword = bodyValue(req.body, "newPassword");
  if (!validPassword(newPassword)) return json(res, 400, { error: "Password must be 8–128 characters." });
  if (currentPassword === newPassword) return json(res, 400, { error: "Choose a different password." });
  if (!(await verifyPassword(currentPassword, authenticated.user.passwordHash))) {
    return json(res, 400, { error: "Current password is incorrect." });
  }

  authenticated.user.passwordHash = await hashPassword(newPassword);
  authenticated.user.updatedAt = new Date().toISOString();
  await setJson(`auth:user:${authenticated.user.id}`, authenticated.user);
  await kv(["DEL", `auth:session:${digest(authenticated.token)}`]);
  await issueSession(res, authenticated.user.id);
  return json(res, 200, { ok: true });
}

async function logout(req, res) {
  const cookies = req.headers.cookie || "";
  const match = cookies.match(/auth_session=([^;]+)/);
  if (match) {
    await kv(["DEL", `auth:session:${digest(match[1])}`]);
  }
  res.setHeader("Set-Cookie", "auth_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
  return json(res, 200, { ok: true });
}

module.exports = async (req, res) => {
  try {
    const action = String(req.query?.action || "").toLowerCase();
    if (req.method === "GET" && action === "session") return await getSession(req, res);
    if (req.method === "GET" && action === "account") return await account(req, res);
    if (req.method === "POST" && action === "logout") return await logout(req, res);
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
    if (action === "register") return await register(req, res);
    if (action === "login") return await login(req, res);
    if (action === "login-code") return await loginCode(req, res);
    if (action === "forgot") return await forgot(req, res);
    if (action === "verify") return await verify(req, res);
    if (action === "reset") return await reset(req, res);
    if (action === "change-password") return await changePassword(req, res);
    return json(res, 404, { error: "Unknown auth action." });
  } catch (error) {
    console.error("Auth API error", error.message);
    const configurationError = /Missing environment variable/.test(error.message);
    const emailDeliveryError = error.code === "EMAIL_DELIVERY_UNAVAILABLE";
    return json(res, configurationError || emailDeliveryError ? 503 : 500, {
      error: configurationError
        ? "Authentication service is not configured yet."
        : emailDeliveryError
          ? "Verification email could not be delivered. Please try again later."
          : "Authentication service is temporarily unavailable.",
    });
  }
};
