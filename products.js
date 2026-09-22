const copyLabels = {
  en: { copy: "Copy version", copied: "Copied", filesSoon: "Files will be added later", linksSoon: "Discord link will be added later", purchaseSoon: "Purchase link will be added later" },
  ru: { copy: "Копировать версию", copied: "Скопировано", filesSoon: "Файлы будут добавлены позже", linksSoon: "Ссылка Discord будет добавлена позже", purchaseSoon: "Ссылка для покупки будет добавлена позже" },
};

const versionsApiUrl = "https://weao.xyz/api/versions/current";
const versionsCacheKey = "cheatblox-roblox-versions";
const versionsCacheTtl = 15 * 60 * 1000;

function currentLanguage() {
  return document.documentElement.lang === "en" ? "en" : "ru";
}

function normalizeVersionKey(value) {
  return String(value).replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function findVersionValue(payload, aliases, depth = 0) {
  if (depth > 4 || payload == null) return "";
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findVersionValue(item, aliases, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof payload !== "object") return "";

  const aliasKeys = aliases.map(normalizeVersionKey);
  for (const [key, value] of Object.entries(payload)) {
    if (aliasKeys.includes(normalizeVersionKey(key)) && (typeof value === "string" || typeof value === "number")) {
      const version = String(value).trim();
      if (version) return version;
    }
  }
  for (const value of Object.values(payload)) {
    const found = findVersionValue(value, aliases, depth + 1);
    if (found) return found;
  }
  return "";
}

function versionAliases(platform) {
  if (platform === "windows") return ["Windows", "windows", "WindowsVersion", "windowsVersion"];
  if (platform === "mac") return ["Mac", "mac", "MacOS", "macOS", "MacVersion", "macVersion"];
  if (platform === "android") return ["Android", "android", "AndroidVersion", "androidVersion"];
  return ["iOS", "ios", "IOS", "iOSVersion", "iosVersion"];
}

function getVersionPlatform(product) {
  const icon = product.querySelector(".platform-icon");
  if (!icon) return "";
  return ["windows", "mac", "android", "ios"].find((platform) => icon.classList.contains(platform)) || "";
}

function applyVersions(payload) {
  let updated = 0;
  document.querySelectorAll(".product[data-version]").forEach((product) => {
    const platform = getVersionPlatform(product);
    const version = findVersionValue(payload, versionAliases(platform));
    if (!platform || !version) return;
    product.dataset.version = version;
    const code = product.querySelector(".version-chip code");
    if (code) code.textContent = version;
    updated += 1;
  });
  return updated;
}

function readCachedVersions() {
  try {
    const cached = JSON.parse(localStorage.getItem(versionsCacheKey) || "null");
    if (!cached || Date.now() - cached.savedAt > versionsCacheTtl) return null;
    return cached.payload;
  } catch {
    return null;
  }
}

async function refreshRobloxVersions() {
  const cached = readCachedVersions();
  if (cached) applyVersions(cached);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(versionsApiUrl, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Versions request failed: ${response.status}`);
    const payload = await response.json();
    const updated = applyVersions(payload);
    if (!updated) throw new Error("Versions response did not contain supported platforms");
    localStorage.setItem(versionsCacheKey, JSON.stringify({ savedAt: Date.now(), payload }));
  } catch {
    // The HTML values remain visible when the remote API is unavailable.
  } finally {
    window.clearTimeout(timeout);
  }
}

function formatUpdated(timestamp, language) {
  const elapsedDays = Math.max(0, Math.floor((Date.now() - Date.parse(timestamp)) / 86_400_000));
  if (elapsedDays === 0) return language === "ru" ? "↻ обновлено сегодня" : "↻ updated today";
  const relative = new Intl.RelativeTimeFormat(language, { numeric: "always" }).format(-elapsedDays, "day");
  return language === "ru" ? `↻ обновлено ${relative}` : `↻ updated ${relative}`;
}

function refreshProductDates() {
  const language = currentLanguage();
  document.querySelectorAll(".product[data-updated-at]").forEach((product) => {
    const updatedAt = product.querySelector(".updated-at");
    updatedAt.textContent = formatUpdated(product.dataset.updatedAt, language);
    updatedAt.title = new Date(product.dataset.updatedAt).toLocaleString(language, { timeZone: "UTC", timeZoneName: "short" });
  });
  document.querySelectorAll("[data-copy-version]").forEach((button) => {
    if (!button.classList.contains("is-copied")) button.setAttribute("aria-label", copyLabels[language].copy);
  });
  document.querySelectorAll(".download-button:disabled:not(.exploit-discord-button)").forEach((button) => {
    button.title = copyLabels[language].filesSoon;
  });
  document.querySelectorAll(".exploit-discord-button:disabled").forEach((button) => {
    button.title = copyLabels[language].linksSoon;
  });
  document.querySelectorAll(".paid-purchase-button:disabled").forEach((button) => {
    button.title = copyLabels[language].purchaseSoon;
  });
}

function legacyCopy(value) {
  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  return copied;
}

async function copyVersion(button) {
  const version = button.closest(".product").dataset.version;
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(version);
    else if (!legacyCopy(version)) throw new Error("Copy is unavailable");

    const language = currentLanguage();
    button.classList.add("is-copied");
    button.setAttribute("aria-label", copyLabels[language].copied);
    window.setTimeout(() => {
      button.classList.remove("is-copied");
      button.setAttribute("aria-label", copyLabels[currentLanguage()].copy);
    }, 1250);
  } catch {
    button.setAttribute("aria-label", copyLabels[currentLanguage()].copy);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  refreshProductDates();
  if (document.querySelector(".product[data-version]")) refreshRobloxVersions();
  document.querySelectorAll('input[name="language"]').forEach((input) => {
    input.addEventListener("change", refreshProductDates);
  });
  document.querySelectorAll("[data-copy-version]").forEach((button) => {
    button.setAttribute("aria-label", copyLabels[currentLanguage()].copy);
    button.addEventListener("click", () => copyVersion(button));
  });
  document.querySelectorAll(".download-menu a").forEach((link) => {
    link.addEventListener("click", () => link.closest(".download-menu").removeAttribute("open"));
  });
  document.addEventListener("click", (event) => {
    document.querySelectorAll(".download-menu[open]").forEach((menu) => {
      if (!menu.contains(event.target)) menu.removeAttribute("open");
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") document.querySelectorAll(".download-menu[open]").forEach((menu) => menu.removeAttribute("open"));
  });
});
