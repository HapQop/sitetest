document.addEventListener("DOMContentLoaded", () => {
  injectBonusModal();
  if (document.querySelector(".site-footer")) return;
  const isHomePage = document.body.dataset.page === "nav-home";
  const showFullFooter = isHomePage || document.body.dataset.page?.startsWith("doc-");

  const markup =
    '<footer class="site-footer' + (showFullFooter ? '' : ' site-footer--compact') + '" aria-label="Site footer">' +
      '<div class="site-footer__inner">' +
      (showFullFooter ? (
        '<div class="site-footer__grid">' +
          '<section>' +
            '<a class="site-footer__brand" href="index.html"><img src="../assets/icons/cheatblox-mark.svg" alt="" width="26" height="26">Cheat<span>Blox</span></a>' +
            '<p class="site-footer__description" data-i18n="footer-description">CheatBlox – a reliable and trusted store for purchasing game licenses and keys.</p>' +
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
            '<h2 class="site-footer__title" data-i18n="footer-documents">Documents</h2>' +
            '<ul class="site-footer__links">' +
              '<li><a href="terms-of-service.html">Terms of Service</a></li>' +
              '<li><a href="privacy-policy.html">Privacy Policy</a></li>' +
              '<li><a href="refund-policy.html">Refund Policy</a></li>' +
            '</ul>' +
          '</section>' +
          '<section>' +
            '<h2 class="site-footer__title" data-i18n="footer-contacts">Contacts</h2>' +
            '<ul class="site-footer__contacts">' +
              '<li class="site-footer__contact"><a href="https://t.me/Qop_products" data-home-telegram target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 4-3.3 16-6-4.3-3.1 2.6.6-4.1L4 11.8 21 4Z"/><path d="m9.2 14.2 7.2-6.5"/></svg><span data-i18n="footer-telegram">Telegram</span></a></li>' +
              '<li class="site-footer__contact"><a href="https://funpay.com/users/15012980/" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h3"/></svg><span data-i18n="footer-funpay">FunPay</span></a></li>' +
              '<li class="site-footer__contact"><a href="mailto:cheatbloxsupport@gmail.com"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 8 9 6 9-6"/></svg><span data-i18n="footer-email">Email</span></a></li>' +
              '<li class="site-footer__contact"><a href="https://discord.com/invite/qP2xRwhYFt" data-home-discord target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5a15 15 0 0 1 8 0l1 2a14 14 0 0 1 3 9 16 16 0 0 1-4 2l-1-2a11 11 0 0 0 2-1 11 11 0 0 1-10 0 11 11 0 0 0 2 1l-1 2a16 16 0 0 1-4-2 14 14 0 0 1 3-9l1-2Z"/><path d="M9 12h.01M15 12h.01"/></svg><span>Discord</span></a></li>' +
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
        <h2 id="bonus-modal-title" data-home-modal-title>Get 10% off</h2>
        <p id="bonus-modal-copy" data-home-modal-description>Join our Telegram or Discord to get a promo code. Apply it on a product page to see your discounted price.</p>
        <div class="bonus-modal__actions">
          <a class="bonus-modal__cta" href="https://t.me/Qop_products" data-home-telegram target="_blank" rel="noopener noreferrer" data-bonus-link><span class="bonus-modal__icon bonus-modal__icon--telegram" aria-hidden="true"></span><span data-i18n="bonus-modal-telegram">Open Telegram</span></a>
          <a class="bonus-modal__cta bonus-modal__cta--secondary" href="https://discord.com/invite/qP2xRwhYFt" data-home-discord target="_blank" rel="noopener noreferrer" data-bonus-link><span class="bonus-modal__icon bonus-modal__icon--discord" aria-hidden="true"></span><span data-i18n="bonus-modal-discord">Open Discord</span></a>
        </div>
      </section>
    </div>
  `);

  const modal = document.querySelector("[data-bonus-modal]");
  const closeButtons = modal.querySelectorAll("[data-bonus-close]");
  const focusable = [modal.querySelector(".bonus-modal__close"), ...modal.querySelectorAll("[data-bonus-link]")];
  const previousFocus = document.activeElement;

  window.setTimeout(() => {
    requestAnimationFrame(() => {
      modal.removeAttribute("hidden");
      document.body.classList.add("bonus-modal-open");
      focusable[0].focus();
      document.addEventListener("keydown", onKeydown);
      sessionStorage.setItem(sessionKey, "true");
    });
  }, 5000);

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
}
