(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) return;

  const selectors = [
    "main > h1",
    "main > header",
    "main > section",
    "main > .detail-grid > section",
    "main > .contacts > .contact-card",
    "main .catalog-products > .store-card-link",
    "main .exploit-grid > .exploit-card",
    "main .products > .product",
    "main .info-grid > .info-card",
    "main > .empty-reviews",
    ".payment-section",
    ".faq-section > .faq-header",
    ".faq-list > .faq-item",
    "main > .auth-card",
  ];
  const elements = document.querySelectorAll(selectors.join(","));
  const siblingIndexes = new Map();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove("scroll-reveal-pending");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  elements.forEach((element) => {
    element.setAttribute("data-scroll-reveal", "");

    if (element.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    const parent = element.parentElement;
    const index = siblingIndexes.get(parent) || 0;
    siblingIndexes.set(parent, index + 1);
    const isCatalogCard = element.matches(".catalog-products > .store-card-link");
    element.style.setProperty("--scroll-reveal-delay", `${Math.min(index * (isCatalogCard ? 55 : 100), isCatalogCard ? 220 : 400)}ms`);
    element.classList.add("scroll-reveal-pending");
    observer.observe(element);
  });
})();
