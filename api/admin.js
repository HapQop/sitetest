const crypto = require("node:crypto");
const { readCatalog, writeCatalog, readVersions, writeVersions, VERSION_PLATFORMS, kv } = require("../lib/catalog");
const { isAdminUser } = require("../lib/admin-access");

const SESSION_TTL = 60 * 60 * 24 * 7;

function json(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).json(body);
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
  if (!isAdminUser(user)) return null;
  return { id: user.id, username: user.username, email: user.email, sessionExpiresIn: SESSION_TTL };
}

function bodyValue(body, key) {
  return typeof body?.[key] === "string" ? body[key].trim() : body?.[key];
}

function validText(value, maxLength, optional = false) {
  return typeof value === "string" && (optional || value.trim().length > 0) && value.trim().length <= maxLength && !/[\x00-\x1f\x7f]/.test(value);
}

function validatePlanUpdate(body, catalog) {
  const productId = bodyValue(body, "productId");
  const planId = bodyValue(body, "planId");
  const priceValue = bodyValue(body, "price");
  const price = Number(priceValue);
  const stockValue = bodyValue(body, "stock");
  if (!Object.hasOwn(catalog, productId) || !Object.hasOwn(catalog[productId].plans, planId)) return "Unknown product plan.";
  if (!validText(body?.name, 80) || !validText(body?.access, 120)) return "Plan name and access text are required (max 80/120 characters).";
  if (priceValue === null || priceValue === undefined || priceValue === "") return "Price is required.";
  if (!Number.isFinite(price) || price < 0 || price > 100000) return "Price must be between 0 and 100000.";
  if (stockValue !== null && stockValue !== "" && (!Number.isInteger(Number(stockValue)) || Number(stockValue) < 0 || Number(stockValue) > 1000000000)) return "Stock must be a non-negative whole number or blank.";
  if (typeof body?.available !== "boolean") return "Availability must be true or false.";
  return null;
}

module.exports = async (req, res) => {
  try {
    const admin = await currentAdmin(req);
    if (!admin) return json(res, 403, { error: "Admin access is not available for this account." });
    if (req.method === "GET") {
      const [catalog, versions] = await Promise.all([readCatalog(), readVersions()]);
      return json(res, 200, { admin, catalog, versions });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return json(res, 405, { error: "Method not allowed." });
    }
    if (!String(req.headers["content-type"] || "").toLowerCase().includes("application/json")) return json(res, 415, { error: "JSON content type is required." });
    if (!sameOrigin(req)) return json(res, 403, { error: "Request origin rejected." });
    const action = req.body?.action || "plan";
    if (action === "version") {
      const platform = bodyValue(req.body, "platform");
      const version = bodyValue(req.body, "version");
      if (!VERSION_PLATFORMS.includes(platform) || !validText(version, 80, true)) return json(res, 400, { error: "Invalid platform or version (max 80 characters)." });
      const versions = await readVersions();
      if (version) versions[platform] = version;
      else delete versions[platform];
      await writeVersions(versions);
      return json(res, 200, { ok: true, versions });
    }
    const catalog = await readCatalog();
    const productId = bodyValue(req.body, "productId");
    if (!Object.hasOwn(catalog, productId)) return json(res, 400, { error: "Unknown product." });
    if (action === "product") {
      const name = bodyValue(req.body, "name");
      const version = bodyValue(req.body, "version");
      if (!validText(name, 80) || !validText(version, 80, true)) return json(res, 400, { error: "Invalid product name or version (max 80 characters)." });
      catalog[productId].name = name;
      catalog[productId].version = version;
      await writeCatalog(catalog);
      return json(res, 200, { ok: true, catalog, updated: { productId } });
    }
    if (action !== "plan") return json(res, 400, { error: "Unknown admin action." });
    const validationError = validatePlanUpdate(req.body, catalog);
    if (validationError) return json(res, 400, { error: validationError });
    const planId = bodyValue(req.body, "planId");
    const plan = catalog[productId].plans[planId];
    const stockValue = bodyValue(req.body, "stock");
    plan.name = bodyValue(req.body, "name");
    plan.access = bodyValue(req.body, "access");
    plan.price = Math.round(Number(bodyValue(req.body, "price")) * 100) / 100;
    plan.stock = stockValue === null || stockValue === "" ? null : Number(stockValue);
    plan.available = req.body.available;
    plan.updatedAt = new Date().toISOString();
    await writeCatalog(catalog);
    return json(res, 200, { ok: true, catalog, updated: { productId, planId } });
  } catch (error) {
    console.error("Admin API error", error.message);
    const configurationError = /Missing environment variable/.test(error.message);
    return json(res, configurationError ? 503 : 500, { error: configurationError ? "Admin service is not configured yet." : "Admin service is temporarily unavailable." });
  }
};
