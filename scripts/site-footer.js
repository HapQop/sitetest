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
      '</div>' +
    '</footer>';

  document.body.insertAdjacentHTML("beforeend", markup);
});

function injectBonusModal() {
  if (document.body.dataset.page !== "nav-home" || document.querySelector(".bonus-modal")) return;

  const sessionKey = "cheatblox-bonus-seen";
  if (sessionStorage.getItem(sessionKey) === "true") return;

  document.body.insertAdjacentHTML("beforeend", `
    <div class="bonus-modal" data-bonus-modal hidden>
      <div class="bonus-modal__backdrop" data-bonus-close></div>
      <section class="bonus-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="bonus-modal-title" aria-describedby="bonus-modal-copy">
        <button class="bonus-modal__close" type="button" data-bonus-close data-i18n-aria-label="bonus-modal-close" aria-label="Close offer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
        <span class="bonus-modal__tag" data-i18n="bonus-modal-tag">WELCOME OFFER</span>
        <h2 id="bonus-modal-title" data-i18n="bonus-modal-title">Get 10% off</h2>
        <p id="bonus-modal-copy" data-i18n="bonus-modal-copy">Join our Telegram or Discord to get a promo code. Apply it on a product page to see your discounted price.</p>
        <div class="bonus-modal__actions">
          <a class="bonus-modal__cta" href="https://t.me/qop_fun" target="_blank" rel="noopener noreferrer" data-bonus-link data-i18n="bonus-modal-telegram">Open Telegram</a>
          <a class="bonus-modal__cta bonus-modal__cta--secondary" href="https://discord.gg/qP2xRwhYFt" target="_blank" rel="noopener noreferrer" data-bonus-link data-i18n="bonus-modal-discord">Open Discord</a>
        </div>
      </section>
    </div>
  `);

  const modal = document.querySelector("[data-bonus-modal]");
  const closeButtons = modal.querySelectorAll("[data-bonus-close]");
  const focusable = [modal.querySelector(".bonus-modal__close"), ...modal.querySelectorAll("[data-bonus-link]")];
  const previousFocus = document.activeElement;

  requestAnimationFrame(() => {
    modal.removeAttribute("hidden");
    document.body.classList.add("bonus-modal-open");
    focusable[0].focus();
  });
  sessionStorage.setItem(sessionKey, "true");

  const close = () => {
    if (modal.classList.contains("is-closing")) return;
    modal.classList.add("is-closing");
    document.body.classList.remove("bonus-modal-open");
    document.removeEventListener("keydown", onKeydown);
    window.setTimeout(() => {
      modal.remove();
      previousFocus?.focus?.();
    }, 170);
  };

  closeButtons.forEach((button) => button.addEventListener("click", close));
  modal.querySelectorAll("[data-bonus-link]").forEach((link) => link.addEventListener("click", close));
  function onKeydown(event) {
    if (event.key === "Escape") close();
    if (event.key !== "Tab") return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  document.addEventListener("keydown", onKeydown);
}
