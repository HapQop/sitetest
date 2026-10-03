(() => {
  const productImages = {
    isaeva: "isaeva-logo-red.png",
    cosmic: "cosmic-logo.png",
    volt: "volt-logo.png",
    pottasium: "pottasium-logo.png",
    real: "real-logo.png",
    lumen: "lumen-logo.png",
    wave: "wave-logo.png",
    sirhurt: "sirhurt-logo.png",
    matcha: "matcha-logo.png",
  };
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order") || "";
  const queryProductId = params.get("product") || "";
  let savedOrder = null;

  try {
    const saved = JSON.parse(window.sessionStorage.getItem(`cheatblox-order:${orderId}`) || "null");
    if (saved?.id === orderId) savedOrder = saved;
  } catch { /* Direct visits still show the checkout preview. */ }

  const productId = savedOrder?.productId || queryProductId;
  const productName = savedOrder?.productName || (productImages[productId] ? productId[0].toUpperCase() + productId.slice(1) : "Selected product");
  const planName = savedOrder?.planName || "Selected plan";
  const total = savedOrder?.total || "—";

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((element) => { element.textContent = value; });
  }

  setText("[data-order-id]", orderId || "—");
  setText("[data-order-product]", productName);
  setText("[data-order-plan]", planName);
  setText("[data-order-total], [data-order-line-price], [data-order-subtotal], [data-order-grand-total], [data-order-cta-total]", total);

  const image = document.querySelector("[data-order-image]");
  if (image && Object.hasOwn(productImages, productId)) image.src = `./assets/${productImages[productId]}`;
  if (orderId) document.title = `Order ${orderId.slice(0, 8)} — CheatBlox`;
})();
