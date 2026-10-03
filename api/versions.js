const WEAO_VERSIONS_URL = "https://weao.xyz/api/versions/current";
const { toUnixTimestamp } = require("../lib/unix-timestamp");

async function fetchJson() {
  const response = await fetch(WEAO_VERSIONS_URL, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(7000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`WEAO request failed: ${response.status}`);
  return response.json();
}

function normalizeVersions(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("WEAO returned invalid version data.");
  }

  const versions = { ...payload };
  for (const platform of ["Windows", "Mac", "Android", "iOS"]) {
    const dateKey = `${platform}Date`;
    const responseTimestamp = payload[`${platform}Response`]?.timestamp;
    versions[dateKey] = toUnixTimestamp(responseTimestamp) ?? toUnixTimestamp(payload[dateKey]);
  }
  return versions;
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const versions = normalizeVersions(await fetchJson());
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(versions);
  } catch (error) {
    console.error("WEAO versions API error", error.message);
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "WEAO version data is temporarily unavailable." });
  }
};

module.exports.normalizeVersions = normalizeVersions;
