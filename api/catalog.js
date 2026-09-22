const { cloneCatalog, readCatalog } = require("../lib/catalog");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }
  try {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ catalog: cloneCatalog(), fallback: true });
    }
    const catalog = await readCatalog();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ catalog });
  } catch (error) {
    console.error("Catalog API error", error.message);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ catalog: cloneCatalog(), fallback: true });
  }
};
