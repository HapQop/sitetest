const copyLabels = {
  en: { copy: "Copy version", copied: "Copied", filesSoon: "Files will be added later", linksSoon: "Discord link will be added later", purchaseSoon: "Purchase link will be added later" },
  ru: { copy: "Копировать версию", copied: "Скопировано", filesSoon: "Файлы будут добавлены позже", linksSoon: "Ссылка Discord будет добавлена позже", purchaseSoon: "Ссылка для покупки будет добавлена позже" },
};

function currentLanguage() {
  return document.documentElement.lang === "en" ? "en" : "ru";
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
