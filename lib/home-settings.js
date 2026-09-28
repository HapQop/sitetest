
const { kv } = require("./catalog");

const HOME_SETTINGS_KEY = "site:home-settings";
const DEFAULT_HOME_SETTINGS = Object.freeze({
  titleRu: "CheatBlox",
  titleEn: "CheatBlox",
  descriptionRu: "Открой максимум возможностей",
  descriptionEn: "Unlock maximum possibilities",
  modalTitleRu: "Скидка 10%",
  modalTitleEn: "Get 10% off",
  modalDescriptionRu: "Перейдите в наш Telegram или Discord за промокодом. Примените его на странице продукта, чтобы увидеть цену со скидкой.",
  modalDescriptionEn: "Join our Telegram or Discord to get a promo code. Apply it on a product page to see your discounted price.",
  promoCode: "OPENING",
  promoPercent: 10,
  telegramUrl: "https://t.me/Qop_products",
  discordUrl: "https://discord.com/invite/qP2xRwhYFt",
});

const TEXT_LIMITS = Object.freeze({
  titleRu: 100, titleEn: 100,
  descriptionRu: 240, descriptionEn: 240,
  modalTitleRu: 100, modalTitleEn: 100,
  modalDescriptionRu: 500, modalDescriptionEn: 500,
  promoCode: 48,
});
const URL_FIELDS = ["telegramUrl", "discordUrl"];

function cloneHomeSettings() {
  return { ...DEFAULT_HOME_SETTINGS };
}

function validText(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength && !/[\x00-\x1f\x7f]/.test(value);
}

function validUrl(value) {
  if (typeof value !== "string" || value.length > 500 || /[\x00-\x1f\x7f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validateHomeSettings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return { valid: false, error: "Home settings must be an object." };
  const home = {};
  for (const [field, limit] of Object.entries(TEXT_LIMITS)) {
    const value = settings[field];
    if (!validText(value, limit)) return { valid: false, error: `Invalid ${field}.` };
    home[field] = value.trim();
  }
  const promoPercent = Number(settings.promoPercent);
  if (!Number.isFinite(promoPercent) || promoPercent < 0 || promoPercent > 100) return { valid: false, error: "Promo percent must be between 0 and 100." };
  home.promoPercent = Math.round(promoPercent * 100) / 100;
  for (const field of URL_FIELDS) {
    if (!validUrl(settings[field])) return { valid: false, error: `Invalid ${field} URL.` };
    home[field] = settings[field].trim();
  }
  return { valid: true, home };
}

function mergeHomeSettings(saved) {
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return cloneHomeSettings();
  const candidate = { ...cloneHomeSettings(), ...saved };
  const result = validateHomeSettings(candidate);
  return result.valid ? result.home : cloneHomeSettings();
}

async function readHomeSettings() {
  const raw = await kv(["GET", HOME_SETTINGS_KEY]);
  if (!raw) return cloneHomeSettings();
  try {
    return mergeHomeSettings(JSON.parse(raw));
  } catch {
    return cloneHomeSettings();
  }
}

async function writeHomeSettings(settings) {
  const result = validateHomeSettings(settings);
  if (!result.valid) throw new Error(result.error);
  await kv(["SET", HOME_SETTINGS_KEY, JSON.stringify(result.home)]);
  return result.home;
}

module.exports = {
  DEFAULT_HOME_SETTINGS,
  HOME_SETTINGS_KEY,
  cloneHomeSettings,
  mergeHomeSettings,
  readHomeSettings,
  validateHomeSettings,
  writeHomeSettings,
};

