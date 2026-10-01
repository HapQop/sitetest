document.addEventListener("DOMContentLoaded", async () => {
  const products = [...document.querySelectorAll("[data-product-id][data-product-game]")];
  if (!products.length) return;

  const normalize = (value) => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const titles = { pottasium: "Potassium" };
  const labels = { online: "Online", offline: "Offline", unknown: "Status unavailable" };

  async function fetchStatuses() {
    for (const url of ["/api/exploits", "https://weao.xyz/api/status/exploits"]) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Status request failed");
        const data = await response.json();
        const exploits = Array.isArray(data) ? data : data.exploits;
        if (!Array.isArray(exploits) || !exploits.length) throw new Error("Status response is invalid");
        return exploits;
      } catch {
        // Use the same WEAO fallback as the Exploits page.
      } finally {
        clearTimeout(timeout);
      }
    }
    return [];
  }

  function setProductStatus(product, status) {
    product.dataset.productStatus = status;
    const label = product.querySelector("[data-product-status-label]");
    if (!label) return;
    label.textContent = labels[status];
    ["online", "offline"].forEach((value) => label.classList.toggle(`is-${value}`, status === value));
  }

  const remoteProducts = products.filter((product) => product.dataset.productType !== "script");
  products.filter((product) => product.dataset.productType === "script").forEach((product) => setProductStatus(product, "online"));

  const exploits = remoteProducts.length ? await fetchStatuses() : [];
  remoteProducts.forEach((product) => {
    const title = normalize(titles[product.dataset.productId] || product.dataset.productId);
    const exploit = exploits.find((item) => normalize(item?.title) === title && String(item?.platform || "").toLowerCase().includes("windows"));
    const status = exploit?.updateStatus === true ? "online" : exploit?.updateStatus === false ? "offline" : "unknown";
    setProductStatus(product, status);
  });
  document.dispatchEvent(new CustomEvent("cheatblox:productstatuschange"));
});
