const { cloneHomeSettings, readHomeSettings } = require("../lib/home-settings");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  res.setHeader("Cache-Control", "no-store");
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      return res.status(200).json({ home: cloneHomeSettings(), fallback: true });
    }
    return res.status(200).json({ home: await readHomeSettings() });
  } catch (error) {
    console.error("Home API error", error.message);
    return res.status(200).json({ home: cloneHomeSettings(), fallback: true });
  }
};

