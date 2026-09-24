const WEAO_EXPLOITS_URL = "https://weao.xyz/api/status/exploits";
const WEAO_SUNC_URL = "https://weao.xyz/api/sunc";

function normalizeName(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function normalizePlatform(value) {
  const platform = String(value || "").toLowerCase();
  if (platform.includes("mac")) return "mac";
  if (platform.includes("android")) return "android";
  if (platform.includes("ios")) return "ios";
  if (platform.includes("windows")) return "windows";
  return platform;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(7000),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `WEAO request failed: ${response.status}`);
    error.status = response.status;
    error.rateLimitInfo = payload.rateLimitInfo;
    throw error;
  }
  return payload;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const requestUrl = new URL(req.url, "http://localhost");
  const requestedName = normalizeName(req.query?.title || requestUrl.searchParams.get("title"));
  const requestedPlatform = normalizePlatform(req.query?.platform || requestUrl.searchParams.get("platform"));
  const aliases = { pottasium: "potassium", dx9ware: "dx9warev2" };
  const exploitName = aliases[requestedName] || requestedName;
  if (!exploitName || !["windows", "mac", "android", "ios"].includes(requestedPlatform)) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(400).json({ error: "An exploit title and platform are required." });
  }

  try {
    const exploits = await fetchJson(WEAO_EXPLOITS_URL);
    if (!Array.isArray(exploits)) throw new Error("WEAO returned an invalid exploit list.");
    const exploit = exploits.find((item) =>
      normalizeName(item.title) === exploitName && normalizePlatform(item.platform) === requestedPlatform
    );
    if (!exploit?.sunc?.suncScrap || !exploit?.sunc?.suncKey) {
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300");
      return res.status(404).json({ error: "No sUNC report is available for this exploit." });
    }

    const params = new URLSearchParams({ scrap: exploit.sunc.suncScrap, key: exploit.sunc.suncKey });
    const report = await fetchJson(`${WEAO_SUNC_URL}?${params}`);
    const passed = Array.isArray(report.tests?.passed) ? report.tests.passed : [];
    const failed = Array.isArray(report.tests?.failed) ? report.tests.failed : [];
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=21600, stale-while-revalidate=86400");
    return res.status(200).json({
      executor: typeof report.executor === "string" ? report.executor : exploit.title,
      version: typeof report.version === "string" ? report.version : exploit.version,
      timestamp: typeof report.timestamp === "number" && Number.isFinite(report.timestamp) ? report.timestamp : null,
      outdated: typeof report.outdated === "boolean" ? report.outdated : null,
      tests: {
        passed: passed.map(({ name, library }) => ({ name, library })),
        failed: failed.map(({ name, library, reason }) => ({ name, library, reason })),
      },
    });
  } catch (error) {
    const status = error.status === 429 ? 429 : 502;
    res.setHeader("Cache-Control", "no-store");
    if (error.rateLimitInfo?.remainingTime) res.setHeader("Retry-After", String(error.rateLimitInfo.remainingTime));
    console.error("WEAO sUNC API error", error.message);
    return res.status(status).json({
      error: status === 429 ? "WEAO sUNC rate limit reached." : "WEAO sUNC data is temporarily unavailable.",
      retryAfter: Number(error.rateLimitInfo?.remainingTime) || null,
    });
  }
};
