document.addEventListener("DOMContentLoaded", () => {
  injectBonusModal();
  if (document.querySelector(".site-footer")) return;
  const isHomePage = document.body.dataset.page === "nav-home";

  const markup =
    '<footer class="site-footer' + (isHomePage ? '' : ' site-footer--compact') + '" aria-label="Site footer">' +
      '<div class="site-footer__inner">' +
      (isHomePage ? (
        '<div class="site-footer__grid">' +
          '<section>' +
            '<a class="site-footer__brand" href="index.html">Cheat<span>Blox</span></a>' +
            '<p class="site-footer__description" data-i18n="footer-description">CheatBlox is a streamlined gaming hub for versions, products, and community resources.</p>' +
          '</section>' +
          '<section>' +
            '<h2 class="site-footer__title" data-i18n="footer-navigation">Navigation</h2>' +
            '<nav aria-label="Footer navigation"><ul class="site-footer__links">' +
              '<li><a href="index.html" data-i18n="nav-home">Home</a></li>' +
              '<li><a href="products.html" data-i18n="nav-products">Products</a></li>' +
              '<li><a href="exploits.html" data-i18n="nav-exploits">Exploits</a></li>' +
              '<li><a href="reviews.html" data-i18n="nav-reviews">Reviews</a></li>' +
              '<li><a href="contact.html" data-i18n="nav-contact">Contact</a></li>' +
            '</ul></nav>' +
          '</section>' +
          '<section>' +
            '<h2 class="site-footer__title" data-i18n="footer-resources">Resources</h2>' +
            '<ul class="site-footer__links">' +
              '<li><a href="products.html" data-i18n="footer-product-catalog">Product catalog</a></li>' +
              '<li><a href="exploits.html" data-i18n="footer-version-archive">Version archive</a></li>' +
            '</ul>' +
            '<p class="site-footer__coming-soon" data-i18n="footer-coming-soon">More information will appear here soon.</p>' +
          '</section>' +
          '<section>' +
            '<h2 class="site-footer__title" data-i18n="footer-contacts">Contacts</h2>' +
            '<ul class="site-footer__contacts">' +
              '<li class="site-footer__contact"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 4-3.3 16-6-4.3-3.1 2.6.6-4.1L4 11.8 21 4Z"/><path d="m9.2 14.2 7.2-6.5"/></svg><span data-i18n="footer-telegram">Telegram</span><span class="site-footer__placeholder">—</span></li>' +
              '<li class="site-footer__contact"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/></svg><span data-i18n="footer-funpay">FunPay</span><span class="site-footer__placeholder">—</span></li>' +
              '<li class="site-footer__contact"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 8 9 6 9-6"/></svg><span data-i18n="footer-email">Email</span><span class="site-footer__placeholder">—</span></li>' +
            '</ul>' +
          '</section>' +
        '</div>'
      ) : '') +
        '<div class="site-footer__bottom"><span data-i18n="footer-copyright">© 2026 CheatBlox. All rights reserved.</span></div>' +
      '</div>' +
    '</footer>';

  document.body.insertAdjacentHTML("beforeend", markup);
});

function injectBonusModal() {
  if (document.querySelector(".bonus-modal")) return;

  const sessionKey = "cheatblox-bonus-seen";
  if (sessionStorage.getItem(sessionKey) === "true") return;

  document.body.insertAdjacentHTML("beforeend", `
    <div class="bonus-modal" data-bonus-modal hidden>
      <div class="bonus-modal__backdrop" data-bonus-close></div>
      <section class="bonus-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="bonus-modal-title" aria-describedby="bonus-modal-copy">
        <button class="bonus-modal__close" type="button" data-bonus-close aria-label="Close bonus"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
        <h2 id="bonus-modal-title">Bonus</h2>
        <p id="bonus-modal-copy" data-i18n="bonus-modal-copy">Use this code for a bonus on your next order.</p>
        <span class="bonus-modal__tag" data-i18n="bonus-modal-tag">BONUS OFFER</span>
        <div class="bonus-modal__code-row">
          <span class="bonus-modal__code-label" data-i18n="bonus-modal-code-label">Your code</span>
          <code class="bonus-modal__code">BONUS</code>
          <button class="bonus-modal__copy" type="button" data-bonus-copy aria-label="Copy promo code"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8V5.8A1.8 1.8 0 0 1 9.8 4h8.4A1.8 1.8 0 0 1 20 5.8v8.4a1.8 1.8 0 0 1-1.8 1.8H16M5.8 9h7.4A1.8 1.8 0 0 1 15 10.8v7.4A1.8 1.8 0 0 1 13.2 20H5.8A1.8 1.8 0 0 1 4 18.2v-7.4A1.8 1.8 0 0 1 5.8 9Z"/></svg><span class="visually-hidden" data-bonus-copy-label>Copy promo code</span></button>
        </div>
        <p class="bonus-modal__message" data-bonus-message aria-live="polite"></p>
        <a class="bonus-modal__cta" href="products.html" data-bonus-close data-i18n="bonus-modal-cta">Start shopping</a>
      </section>
    </div>
  `);

  const modal = document.querySelector("[data-bonus-modal]");
  const closeButtons = modal.querySelectorAll("[data-bonus-close]");
  const copyButton = modal.querySelector("[data-bonus-copy]");
  const message = modal.querySelector("[data-bonus-message]");
  const code = modal.querySelector(".bonus-modal__code").textContent;

  requestAnimationFrame(() => modal.removeAttribute("hidden"));
  sessionStorage.setItem(sessionKey, "true");

  const close = () => {
    modal.classList.add("is-closing");
    window.setTimeout(() => modal.remove(), 170);
  };

  closeButtons.forEach((button) => button.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.contains(modal)) close();
  }, { once: true });
  copyButton.addEventListener("click", async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code);
      else {
        const field = document.createElement("textarea");
        field.value = code;
        field.setAttribute("readonly", "");
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.append(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      message.textContent = document.documentElement.lang === "ru" ? "Скопировано" : "Copied";
      copyButton.classList.add("is-copied");
    } catch {
      message.textContent = document.documentElement.lang === "ru" ? "Не удалось скопировать" : "Copy unavailable";
    }
  });
}
