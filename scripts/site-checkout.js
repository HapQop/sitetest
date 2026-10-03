(() => {
  const translations = {
    en: {
      "checkout-order-total": "ORDER TOTAL", "checkout-order-id": "Order ID", "checkout-selected-product": "Selected product", "checkout-selected-plan": "Selected plan", "checkout-subtotal": "Subtotal", "checkout-total": "Total", "checkout-products-link": "CheatBlox products", "checkout-copy-link": "Pay on mobile", "checkout-copy-success": "Checkout link copied.", "checkout-copy-error": "Copy the checkout link from your browser.", "checkout-terms": "Terms of Service", "checkout-privacy": "Privacy Policy", "checkout-refund": "Refund Policy",
      "checkout-progress": "Checkout progress", "checkout-step-information": "Order Information", "checkout-step-pay": "Confirm & Pay", "checkout-step-receive": "Receive Your Items", "checkout-preview-note": "Crypto checkout preview. Your payment will not be collected.", "checkout-contact": "CONTACT & DELIVERY", "checkout-email": "E-mail Address", "checkout-email-placeholder": "you@example.com", "checkout-discount-question": "Have a discount code?", "checkout-discount-label": "Discount code", "checkout-discount-placeholder": "Enter code", "checkout-discount-apply": "Apply", "checkout-discount-applied": "10% discount applied.", "checkout-discount-already-applied": "This discount has already been applied.", "checkout-discount-invalid": "This promo code is not valid.", "checkout-payment": "PAYMENT", "checkout-payment-methods": "Payment methods", "checkout-crypto": "Cryptocurrency", "checkout-terms-consent-before": "I have read and agree to CheatBlox's", "checkout-terms-consent-after": ".", "checkout-marketing-consent": "I would like to receive updates and promotions from CheatBlox.", "checkout-continue": "Continue to crypto payment", "checkout-payment-unavailable": "Crypto payments are not available yet. No payment has been processed.", "checkout-complete-form": "Enter a valid email and agree to the Terms of Service.", "checkout-secure-note": "♧   No payment is processed on this preview page.", "checkout-order-title": "Order",
    },
    ru: {
      "checkout-order-total": "СУММА ЗАКАЗА", "checkout-order-id": "ID заказа", "checkout-selected-product": "Выбранный товар", "checkout-selected-plan": "Выбранный тариф", "checkout-subtotal": "Подытог", "checkout-total": "Итого", "checkout-products-link": "Товары CheatBlox", "checkout-copy-link": "Оплатить с телефона", "checkout-copy-success": "Ссылка на оформление скопирована.", "checkout-copy-error": "Скопируйте ссылку из адресной строки браузера.", "checkout-terms": "Условия использования", "checkout-privacy": "Политика конфиденциальности", "checkout-refund": "Политика возврата",
      "checkout-progress": "Ход оформления заказа", "checkout-step-information": "Информация о заказе", "checkout-step-pay": "Подтверждение и оплата", "checkout-step-receive": "Получение товара", "checkout-preview-note": "Предпросмотр крипто-оплаты. Средства не будут списаны.", "checkout-contact": "КОНТАКТЫ И ДОСТАВКА", "checkout-email": "Электронная почта", "checkout-email-placeholder": "you@example.com", "checkout-discount-question": "Есть промокод?", "checkout-discount-label": "Промокод", "checkout-discount-placeholder": "Введите код", "checkout-discount-apply": "Применить", "checkout-discount-applied": "Скидка 10% применена.", "checkout-discount-already-applied": "Эта скидка уже применена.", "checkout-discount-invalid": "Промокод недействителен.", "checkout-payment": "ОПЛАТА", "checkout-payment-methods": "Способы оплаты", "checkout-crypto": "Криптовалюта", "checkout-terms-consent-before": "Я прочитал(а) и принимаю", "checkout-terms-consent-after": ".", "checkout-marketing-consent": "Я хочу получать новости и акции CheatBlox.", "checkout-continue": "Продолжить крипто-оплату", "checkout-payment-unavailable": "Крипто-оплата пока недоступна. Средства не списаны.", "checkout-complete-form": "Введите корректный e-mail и примите Условия использования.", "checkout-secure-note": "♧   На этой странице средства не списываются.", "checkout-order-title": "Заказ",
    },
    es: {
      "checkout-order-total": "TOTAL DEL PEDIDO", "checkout-order-id": "ID del pedido", "checkout-selected-product": "Producto seleccionado", "checkout-selected-plan": "Plan seleccionado", "checkout-subtotal": "Subtotal", "checkout-total": "Total", "checkout-products-link": "Productos de CheatBlox", "checkout-copy-link": "Pagar desde el móvil", "checkout-copy-success": "Enlace de pago copiado.", "checkout-copy-error": "Copia el enlace desde la barra del navegador.", "checkout-terms": "Términos de servicio", "checkout-privacy": "Política de privacidad", "checkout-refund": "Política de reembolso",
      "checkout-progress": "Progreso de pago", "checkout-step-information": "Información del pedido", "checkout-step-pay": "Confirmar y pagar", "checkout-step-receive": "Recibe tus artículos", "checkout-preview-note": "Vista previa del pago con criptomonedas. No se cobrará ningún pago.", "checkout-contact": "CONTACTO Y ENTREGA", "checkout-email": "Correo electrónico", "checkout-email-placeholder": "you@example.com", "checkout-discount-question": "¿Tienes un código de descuento?", "checkout-discount-label": "Código de descuento", "checkout-discount-placeholder": "Introduce el código", "checkout-discount-apply": "Aplicar", "checkout-discount-applied": "Se aplicó un 10% de descuento.", "checkout-discount-already-applied": "Este descuento ya está aplicado.", "checkout-discount-invalid": "El código promocional no es válido.", "checkout-payment": "PAGO", "checkout-payment-methods": "Métodos de pago", "checkout-crypto": "Criptomonedas", "checkout-terms-consent-before": "He leído y acepto los", "checkout-terms-consent-after": " de CheatBlox.", "checkout-marketing-consent": "Quiero recibir novedades y promociones de CheatBlox.", "checkout-continue": "Continuar al pago con criptomonedas", "checkout-payment-unavailable": "Los pagos con criptomonedas aún no están disponibles. No se ha procesado ningún pago.", "checkout-complete-form": "Introduce un correo válido y acepta los Términos de servicio.", "checkout-secure-note": "♧   No se procesa ningún pago en esta vista previa.", "checkout-order-title": "Pedido",
    },
  };
  const languageNames = { en: "English", ru: "Русский", es: "Español" };
  const planTranslations = {
    en: { "lifetime": "Lifetime", "lifetime access": "Lifetime access", "7-day access": "7-day access", "30-day access": "30-day access", "monthly access": "Monthly access", "weekly access": "Weekly access" },
    ru: { "lifetime": "Пожизненно", "lifetime access": "Пожизненный доступ", "7-day access": "Доступ на 7 дней", "30-day access": "Доступ на 30 дней", "monthly access": "Месячный доступ", "weekly access": "Недельный доступ" },
    es: { "lifetime": "De por vida", "lifetime access": "Acceso de por vida", "7-day access": "Acceso de 7 días", "30-day access": "Acceso de 30 días", "monthly access": "Acceso mensual", "weekly access": "Acceso semanal" },
  };
  const productImages = {
    isaeva: "isaeva-logo-red.png", cosmic: "cosmic-logo.png", volt: "volt-logo.png", pottasium: "pottasium-logo.png", real: "real-logo.png", lumen: "lumen-logo.png", wave: "wave-logo.png", sirhurt: "sirhurt-logo.png", matcha: "matcha-logo.png",
  };
  const params = new URLSearchParams(window.location?.search || "");
  const orderId = params.get("order") || "";
  const queryProductId = params.get("product") || "";
  let savedOrder = null;
  let language = readLanguage();
  let discountStatus = null;
  let paymentStatus = null;

  try {
    const saved = JSON.parse(window.sessionStorage?.getItem(`cheatblox-order:${orderId}`) || "null");
    if (saved?.id === orderId) savedOrder = saved;
  } catch { /* Direct visits still show a usable checkout preview. */ }

  const productId = savedOrder?.productId || queryProductId;
  const rawProductName = savedOrder?.productName || (productImages[productId] ? productId[0].toUpperCase() + productId.slice(1) : "");
  const rawPlanName = savedOrder?.planName || "";
  let total = savedOrder?.total || "—";

  function readLanguage() {
    try {
      const checkoutLanguage = window.localStorage?.getItem("cheatblox-checkout-language");
      if (translations[checkoutLanguage]) return checkoutLanguage;
      const siteLanguage = window.localStorage?.getItem("cheatblox-language");
      if (translations[siteLanguage]) return siteLanguage;
    } catch { /* Browser language remains a safe fallback. */ }
    const browserLanguage = window.navigator?.language?.split("-")[0]?.toLowerCase();
    return translations[browserLanguage] ? browserLanguage : "en";
  }

  function t(key) { return translations[language][key] || translations.en[key] || key; }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
  }

  function translatedPlan() {
    return planTranslations[language][rawPlanName.trim().toLowerCase()] || rawPlanName || t("checkout-selected-plan");
  }

  function productName() { return rawProductName || t("checkout-selected-product"); }

  function renderOrder() {
    setText("[data-order-id]", orderId || "—");
    setText("[data-order-product]", productName());
    setText("[data-order-plan]", translatedPlan());
    setText("[data-order-total], [data-order-line-price], [data-order-subtotal], [data-order-grand-total], [data-order-cta-total]", total);

    const image = document.querySelector("[data-order-image]");
    if (!image) return;
    image.alt = productName();
    if (image.dataset) image.dataset.productImage = productId;
    if (Object.hasOwn(productImages, productId)) image.src = `./assets/${productImages[productId]}`;
    image.addEventListener?.("error", () => {
      image.src = "./assets/icons/cheatblox-mark.svg";
      if (image.dataset) delete image.dataset.productImage;
    }, { once: true });
  }

  function setFeedback(selector, key, state) {
    const feedback = document.querySelector(selector);
    if (!feedback) return;
    feedback.textContent = key ? t(key) : "";
    feedback.classList?.toggle("is-error", state === "error");
    feedback.classList?.toggle("is-success", state === "success");
  }

  function checkoutFormIsComplete() {
    const email = document.querySelector("#checkout-email");
    const terms = document.querySelector("[data-terms-consent]");
    if (!email || !terms) return false;
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    return emailIsValid && terms.checked;
  }

  function persistOrder(changes) {
    if (!savedOrder || !orderId) return;
    savedOrder = { ...savedOrder, ...changes };
    try { window.sessionStorage?.setItem(`cheatblox-order:${orderId}`, JSON.stringify(savedOrder)); } catch { /* The visible preview still updates. */ }
  }

  function parseUsd(value) {
    const amount = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  }

  function applyDiscount() {
    const input = document.querySelector("#checkout-discount");
    const code = input?.value.trim().toUpperCase();
    if (code !== "OPENING") {
      discountStatus = { key: "checkout-discount-invalid", state: "error" };
    } else if (savedOrder?.promoCode === "OPENING") {
      discountStatus = { key: "checkout-discount-already-applied", state: "error" };
    } else {
      const amount = parseUsd(total);
      if (amount === null) {
        discountStatus = { key: "checkout-discount-invalid", state: "error" };
      } else {
        const subtotal = savedOrder?.subtotal || total;
        total = `$${(amount * .9).toFixed(2)}`;
        persistOrder({ subtotal, total, promoCode: "OPENING" });
        renderOrder();
        discountStatus = { key: "checkout-discount-applied", state: "success" };
      }
    }
    setFeedback("[data-discount-status]", discountStatus.key, discountStatus.state);
  }

  function setDiscountOpen(open) {
    const toggle = document.querySelector("[data-discount-toggle]");
    const form = document.querySelector("[data-discount-form]");
    if (toggle) toggle.setAttribute("aria-expanded", String(open));
    if (form) form.hidden = !open;
  }

  function setLanguage(nextLanguage) {
    if (!translations[nextLanguage]) return;
    language = nextLanguage;
    if (document.documentElement) document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.dataset?.i18n;
      if (key) element.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.dataset?.i18nPlaceholder;
      if (key) element.placeholder = t(key);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const key = element.dataset?.i18nAriaLabel;
      if (key) element.setAttribute?.("aria-label", t(key));
    });
    setText("[data-checkout-language-label]", languageNames[language]);
    document.querySelectorAll("[data-checkout-language]").forEach((button) => {
      button.setAttribute?.("aria-selected", String(button.dataset?.checkoutLanguage === language));
    });
    renderOrder();
    if (discountStatus) setFeedback("[data-discount-status]", discountStatus.key, discountStatus.state);
    if (paymentStatus) setFeedback("[data-payment-status]", paymentStatus.key, paymentStatus.state);
    document.title = orderId ? `${t("checkout-order-title")} ${orderId.slice(0, 8)} — CheatBlox` : "Checkout — CheatBlox";
    try { window.localStorage?.setItem("cheatblox-checkout-language", language); } catch { /* Keep the selected language for this page. */ }
  }

  async function copyCheckoutLink() {
    const status = document.querySelector("[data-checkout-link-status]");
    const url = window.location?.href || "";
    try {
      if (!window.navigator?.clipboard?.writeText || !url) throw new Error("Clipboard is unavailable.");
      await window.navigator.clipboard.writeText(url);
      if (status) status.textContent = t("checkout-copy-success");
    } catch {
      if (status) status.textContent = t("checkout-copy-error");
    }
  }

  function closeLanguageMenu() {
    const toggle = document.querySelector("[data-language-toggle]");
    const menu = document.querySelector("[data-language-menu]");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (menu) menu.hidden = true;
  }

  function bindInteractions() {
    const email = document.querySelector("#checkout-email");
    const terms = document.querySelector("[data-terms-consent]");
    const discountToggle = document.querySelector("[data-discount-toggle]");
    const discountForm = document.querySelector("[data-discount-form]");
    const continueButton = document.querySelector("[data-continue-payment]");
    const languageToggle = document.querySelector("[data-language-toggle]");
    const languageMenu = document.querySelector("[data-language-menu]");

    email?.addEventListener("input", () => { persistOrder({ email: email.value.trim() }); });
    if (email && savedOrder?.email) email.value = savedOrder.email;
    discountToggle?.addEventListener("click", () => setDiscountOpen(discountForm?.hidden !== false));
    discountForm?.addEventListener("submit", (event) => { event.preventDefault(); applyDiscount(); });
    continueButton?.addEventListener("click", () => {
      paymentStatus = { key: checkoutFormIsComplete() ? "checkout-payment-unavailable" : "checkout-complete-form", state: "error" };
      setFeedback("[data-payment-status]", paymentStatus.key, paymentStatus.state);
    });
    languageToggle?.addEventListener("click", () => {
      const open = languageMenu?.hidden !== false;
      if (languageMenu) languageMenu.hidden = !open;
      languageToggle.setAttribute("aria-expanded", String(open));
    });
    document.querySelectorAll("[data-checkout-language]").forEach((button) => button.addEventListener?.("click", () => { setLanguage(button.dataset.checkoutLanguage); closeLanguageMenu(); }));
    document.querySelector("[data-copy-checkout-link]")?.addEventListener("click", copyCheckoutLink);
    document.addEventListener?.("click", (event) => {
      if (!languageMenu?.contains?.(event.target) && !languageToggle?.contains?.(event.target)) closeLanguageMenu();
    });
  }

  setLanguage(language);
  bindInteractions();
  window.CheatBloxCheckout = { setLanguage, applyDiscount };
})();
