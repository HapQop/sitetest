function toUnixTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value > 10_000_000_000 ? value / 1000 : value);
  }

  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;

  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? Math.floor(numeric > 10_000_000_000 ? numeric / 1000 : numeric) : null;
  }

  const milliseconds = Date.parse(normalized.replace(/\s+at\s+/i, " "));
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : null;
}

module.exports = { toUnixTimestamp };
