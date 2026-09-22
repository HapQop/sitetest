const crypto = require("node:crypto");
const { readCatalog, writeCatalog, kv } = require("../lib/catalog");

const SESSION_TTL = 60 * 60 * 24 * 7;

function json(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).json(body);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function parseCookies(header) {
  return String(header || "").split(";").reduce((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator < 0) return cookies;
    try { cookies[part.slice(0, separator).trim()] = decodeURIComponent(part.slice(separator + 1).trim()); } catch { /* Ignore malformed cookie values. */ }
    return cookies;
  }, {});
}

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function adminEmails() {
  return String(process.env.ADMIN_EMAILS || "").split(",").map(normalizeEmail).filter(Boolean);
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return false;
  let originUrl;
  try { originUrl = new URL(origin); } catch { return false; }
  const forwardedHost = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return originUrl.host === forwardedHost;
}

async function currentAdmin(req) {
  const token = parseCookies(req.headers.cookie).auth_session;
  if (!token) return null;
  const session = await (async () => {
    const raw = await kv(["GET", `auth:session:${digest(token)}`]);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  })();
  if (!session?.userId) return null;
  const rawUser = await kv(["GET", `auth:user:${session.userId}`]);
  if (!rawUser) return null;
  let user;
  try { user = JSON.parse(rawUser); } catch { return null; }
  if (!user.verifiedAt || !adminEmails().includes(normalizeEmail(user.email))) return null;
  return { id: user.id, username: user.username, email: user.email, sessionExpiresIn: SESSION_TTL };
}

function bodyValue(body, key) {
  return typeof body?.[key] === "string" ? body[key].trim() : body?.[key];
}

function validateUpdate(body, catalog) {
  const productId = bodyValue(body, "productId");
  const planId = bodyValue(body, "planId");
  const price = Number(bodyValue(body, "price"));
  const stockValue = bodyValue(body, "stock");
  const available = body?.available === true || body?.available === "true";
  if (!catalog[productId]?.plans?.[planId]) return "Unknown product plan.";
  if (!Number.isFinite(price) || price < 0 || price > 100000) return "Price must be between 0 and 100000.";
  if (stockValue !== null && stockValue !== "" && (!Number.isInteger(Number(stockValue)) || Number(stockValue) < 0 || Number(stockValue) > 1000000000)) return "Stock must be a non-negative whole number or blank.";
  return null;
}

module.exports = async (req, res) => {
  try {
    const admin = await currentAdmin(req);
    if (!admin) return json(res, 403, { error: "Admin access is not available for this account." });
    if (req.method === "GET") return json(res, 200, { admin, catalog: await readCatalog() });
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return json(res, 405, { error: "Method not allowed." });
    }
    if (!String(req.headers["content-type"] || "").toLowerCase().includes("application/json")) return json(res, 415, { error: "JSON content type is required." });
    if (!sameOrigin(req)) return json(res, 403, { error: "Request origin rejected." });
    const catalog = await readCatalog();
    const validationError = validateUpdate(req.body, catalog);
    if (validationError) return json(res, 400, { error: validationError });
    const productId = bodyValue(req.body, "productId");
    const planId = bodyValue(req.body, "planId");
    const plan = catalog[productId].plans[planId];
    const stockValue = bodyValue(req.body, "stock");
    plan.price = Math.round(Number(bodyValue(req.body, "price")) * 100) / 100;
    plan.stock = stockValue === null || stockValue === "" ? null : Number(stockValue);
    plan.available = req.body?.available === true || req.body?.available === "true";
    plan.updatedAt = new Date().toISOString();
    await writeCatalog(catalog);
    return json(res, 200, { ok: true, catalog, updated: { productId, planId } });
  } catch (error) {
    console.error("Admin API error", error.message);
    const configurationError = /Missing environment variable/.test(error.message);
    return json(res, configurationError ? 503 : 500, { error: configurationError ? "Admin service is not configured yet." : "Admin service is temporarily unavailable." });
  }
};
