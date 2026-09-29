module.exports = (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const value = req.headers?.["x-vercel-ip-country"];
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  const country = /^[A-Z]{2}$/.test(normalized) && normalized !== "XX" && normalized !== "ZZ"
    ? normalized : null;
  return res.status(200).json({ country });
};
