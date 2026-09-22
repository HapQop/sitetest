(() => {
  const status = document.querySelector("[data-admin-status]");
  const content = document.querySelector("[data-admin-content]");
  const rows = document.querySelector("[data-admin-rows]");
  const empty = document.querySelector("[data-admin-empty]");
  const user = document.querySelector("[data-admin-user]");
  const login = document.querySelector("[data-admin-login]");

  function setStatus(message, type = "") {
    status.textContent = message;
    status.className = `admin-status${type ? ` is-${type}` : ""}`;
  }

  async function request(path = "", options = {}) {
    const response = await fetch(`/api/admin${path}`, { credentials: "include", ...options, headers: { Accept: "application/json", ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Admin request failed (${response.status}).`);
    return data;
  }

  function addRow(productId, product, planId, plan) {
    const row = document.createElement("tr");
    const stock = plan.stock === null || plan.stock === undefined ? "" : String(plan.stock);
    row.innerHTML = `<td class="admin-product"></td><td class="admin-plan"></td><td><input class="admin-input" data-field="price" type="number" min="0" max="100000" step="0.01" inputmode="decimal"></td><td><input class="admin-input" data-field="stock" type="number" min="0" max="1000000000" step="1" inputmode="numeric" placeholder="Unlimited"></td><td><label class="admin-available"><input data-field="available" type="checkbox"><span>Available</span></label></td><td><button class="admin-save" type="button">Save</button></td>`;
    row.children[0].textContent = product.name;
    row.children[1].textContent = plan.name;
    row.querySelector('[data-field="price"]').value = Number(plan.price).toFixed(2);
    row.querySelector('[data-field="stock"]').value = stock;
    row.querySelector('[data-field="available"]').checked = Boolean(plan.available);
    row.querySelector(".admin-save").addEventListener("click", async () => {
      const button = row.querySelector(".admin-save");
      const payload = {
        productId,
        planId,
        price: row.querySelector('[data-field="price"]').value,
        stock: row.querySelector('[data-field="stock"]').value,
        available: row.querySelector('[data-field="available"]').checked,
      };
      button.disabled = true;
      setStatus(`Saving ${product.name} / ${plan.name}...`);
      try {
        await request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        setStatus("Saved. The public catalog will use the new value on its next load.", "success");
      } catch (error) {
        setStatus(error.message, "error");
      } finally {
        button.disabled = false;
      }
    });
    rows.appendChild(row);
  }

  function renderCatalog(catalog) {
    rows.replaceChildren();
    Object.entries(catalog || {}).forEach(([productId, product]) => Object.entries(product.plans || {}).forEach(([planId, plan]) => addRow(productId, product, planId, plan)));
    empty.hidden = rows.children.length > 0;
  }

  async function init() {
    try {
      const data = await request();
      user.textContent = `${data.admin.username} · ${data.admin.email}`;
      renderCatalog(data.catalog);
      content.hidden = false;
      setStatus("Admin access granted.", "success");
    } catch (error) {
      setStatus(error.message, "error");
      login.hidden = false;
    }
  }

  init();
})();
