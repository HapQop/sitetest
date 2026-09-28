(() => {
  const status = document.querySelector("[data-admin-status]");
  const content = document.querySelector("[data-admin-content]");
  const products = document.querySelector("[data-admin-products]");
  const versions = document.querySelector("[data-admin-versions]");
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

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function createInput(value, attributes = {}) {
    const input = document.createElement("input");
    input.className = "admin-input";
    Object.assign(input, attributes);
    input.value = value ?? "";
    return input;
  }

  function post(payload) {
    return request("", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  }

  function addRow(tbody, productId, product, planId, plan) {
    const row = document.createElement("tr");
    const stock = plan.stock === null || plan.stock === undefined ? "" : String(plan.stock);
    const planName = createInput(plan.name, { type: "text", maxLength: 80, className: "admin-input is-wide" });
    const access = createInput(plan.access || "", { type: "text", maxLength: 120, className: "admin-input is-wide" });
    const price = createInput(Number(plan.price).toFixed(2), { type: "number", min: "0", max: "100000", step: "0.01", inputMode: "decimal" });
    const stockInput = createInput(stock, { type: "number", min: "0", max: "1000000000", step: "1", inputMode: "numeric", placeholder: "Unlimited" });
    const available = document.createElement("input");
    available.type = "checkbox";
    available.checked = Boolean(plan.available);
    const availability = createElement("label", "admin-available");
    availability.append(available, createElement("span", "", "Available"));
    const button = createElement("button", "admin-save", "Save plan");
    button.type = "button";
    [[planName], [access], [price], [stockInput], [availability], [button]].forEach(([child]) => { const cell = document.createElement("td"); cell.append(child); row.append(cell); });
    button.addEventListener("click", async () => {
      const payload = {
        action: "plan",
        productId,
        planId,
        name: planName.value,
        access: access.value,
        price: price.value,
        stock: stockInput.value,
        available: available.checked,
      };
      button.disabled = true;
      setStatus(`Saving ${product.name} / ${plan.name}...`);
      try {
        await post(payload);
        setStatus("Saved. The public catalog will use the new value on its next load.", "success");
      } catch (error) {
        setStatus(error.message, "error");
      } finally {
        button.disabled = false;
      }
    });
    tbody.appendChild(row);
  }

  function renderCatalog(catalog) {
    products.replaceChildren();
    Object.entries(catalog || {}).forEach(([productId, product]) => {
      const card = createElement("article", "admin-product-card");
      const editor = createElement("div", "admin-product-editor");
      const nameField = createElement("label", "admin-field");
      nameField.append(createElement("span", "admin-field-label", "Product name"));
      const name = createInput(product.name, { type: "text", maxLength: 80, className: "admin-input is-wide" });
      nameField.append(name);
      const versionField = createElement("label", "admin-field");
      versionField.append(createElement("span", "admin-field-label", "Product version (optional)"));
      const version = createInput(product.version || "", { type: "text", maxLength: 80, placeholder: "For example, 2.4.1", className: "admin-input is-wide" });
      versionField.append(version);
      const save = createElement("button", "admin-save", "Save product"); save.type = "button";
      save.addEventListener("click", async () => {
        save.disabled = true; setStatus(`Saving ${product.name}...`);
        try { await post({ action: "product", productId, name: name.value, version: version.value }); setStatus("Product saved.", "success"); }
        catch (error) { setStatus(error.message, "error"); }
        finally { save.disabled = false; }
      });
      editor.append(nameField, versionField, save);
      const wrap = createElement("div", "admin-table-wrap");
      const table = createElement("table", "admin-table");
      table.innerHTML = "<thead><tr><th>Plan</th><th>Access</th><th>Price USD</th><th>Stock</th><th>Status</th><th>Action</th></tr></thead>";
      const tbody = document.createElement("tbody"); table.append(tbody); wrap.append(table); card.append(editor, wrap);
      Object.entries(product.plans || {}).forEach(([planId, plan]) => addRow(tbody, productId, product, planId, plan));
      products.append(card);
    });
    empty.hidden = products.children.length > 0;
  }

  function renderVersions(currentVersions) {
    versions.replaceChildren();
    ["windows", "mac", "android", "ios"].forEach((platform) => {
      const label = createElement("label", "admin-version-field", platform);
      const input = createInput((currentVersions || {})[platform] || "", { type: "text", maxLength: 80, placeholder: "Automatic", className: "admin-input is-wide" });
      const button = createElement("button", "admin-save", "Save"); button.type = "button";
      button.addEventListener("click", async () => {
        button.disabled = true; setStatus(`Saving ${platform} version...`);
        try { await post({ action: "version", platform, version: input.value }); setStatus(input.value ? `${platform} version saved.` : `${platform} override cleared.`, "success"); }
        catch (error) { setStatus(error.message, "error"); }
        finally { button.disabled = false; }
      });
      label.append(input, button); versions.append(label);
    });
  }

  async function init() {
    try {
      const data = await request();
      user.textContent = `${data.admin.username} · ${data.admin.email}`;
      renderCatalog(data.catalog);
      renderVersions(data.versions);
      content.hidden = false;
      setStatus("Admin access granted.", "success");
    } catch (error) {
      setStatus(error.message, "error");
      login.hidden = false;
    }
  }

  init();
})();
