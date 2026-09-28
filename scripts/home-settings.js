(() => {
  const fallback = {
    titleRu: "CheatBlox", titleEn: "CheatBlox",
    descriptionRu: "Открой максимум возможностей", descriptionEn: "Unlock maximum possibilities",
    modalTitleRu: "Скидка 10%", modalTitleEn: "Get 10% off",
    modalDescriptionRu: "Перейдите в наш Telegram или Discord за промокодом. Примените его на странице продукта, чтобы увидеть цену со скидкой.",
    modalDescriptionEn: "Join our Telegram or Discord to get a promo code. Apply it on a product page to see your discounted price.",
    promoCode: "OPENING", promoPercent: 10,
    telegramUrl: "https://t.me/Qop_products", discordUrl: "https://discord.com/invite/qP2xRwhYFt",
  };

  let home = { ...fallback };

  function language() {
    return document.documentElement.lang === "en" ? "En" : "Ru";
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
  }

  function setHref(selector, value) {
    document.querySelectorAll(selector).forEach((element) => { element.href = value; });
  }

  function render() {
    const suffix = language();
    document.querySelectorAll("[data-home-title]").forEach((element) => {
      const title = home[`title${suffix}`];
      if (title === "CheatBlox") {
        const accent = document.createElement("span");
        accent.textContent = "Blox";
        element.replaceChildren(document.createTextNode("Cheat"), accent);
      } else {
        element.textContent = title;
      }
    });
    setText("[data-home-description]", home[`description${suffix}`]);
    setText("[data-home-modal-title]", home[`modalTitle${suffix}`]);
    setText("[data-home-modal-description]", home[`modalDescription${suffix}`]);
    setHref("[data-home-telegram]", home.telegramUrl);
    setHref("[data-home-discord]", home.discordUrl);
    window.CheatBloxHome = { ...home };
    document.dispatchEvent(new CustomEvent("cheatblox:homesettingschange", { detail: { home: { ...home } } }));
  }

  async function load() {
    try {
      const response = await fetch("/api/home", { headers: { Accept: "application/json" } });
      const payload = await response.json();
      if (response.ok && payload?.home && typeof payload.home === "object") home = { ...fallback, ...payload.home };
    } catch {
      // The static defaults keep the home page usable during local or offline visits.
    }
    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();
    document.querySelectorAll('input[name="language"]').forEach((input) => input.addEventListener("change", () => {
      window.setTimeout(render, 160);
    }));
    load();
  });
})();
