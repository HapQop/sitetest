(() => {
  const status = document.querySelector("[data-admin-status]");
  const content = document.querySelector("[data-admin-content]");
  const products = document.querySelector("[data-admin-products]");
  const versions = document.querySelector("[data-admin-versions]");
  const empty = document.querySelector("[data-admin-empty]");
  const user = document.querySelector("[data-admin-user]");
  const login = document.querySelector("[data-admin-login]");
  const homeForm = document.querySelector("[data-admin-home-form]");
  const exploitRows = document.querySelector("[data-admin-exploit-rows]");
  const exploitSearch = document.querySelector("[data-admin-exploit-search]");
  const addExploitForm = document.querySelector("[data-admin-add-exploit]");
  const sectionNames = { home: "главной страницы", products: "каталога товаров", exploits: "страницы эксплоитов" };
  const requestedSection = new URLSearchParams(window.location.search).get("section");
  const section = Object.hasOwn(sectionNames, requestedSection) ? requestedSection : "home";

  document.querySelectorAll("[data-admin-section]").forEach((panel) => { panel.hidden = panel.dataset.adminSection !== section; });
  document.querySelectorAll("[data-admin-tab]").forEach((tab) => {
    const active = tab.dataset.adminTab === section;
    tab.classList.toggle("is-active", active);
    if (active) tab.setAttribute("aria-current", "page");
  });
  document.querySelector("[data-admin-intro]").textContent = `Настройки ${sectionNames[section]}. Изменения появятся на сайте после сохранения.`;
  document.querySelector("[data-admin-back]").href = { home: "index.html", products: "products.html", exploits: "exploits.html" }[section];

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
    const stockInput = createInput(stock, { type: "number", min: "0", max: "1000000000", step: "1", inputMode: "numeric", placeholder: "Без лимита" });
    const available = document.createElement("input");
    available.type = "checkbox";
    available.checked = Boolean(plan.available);
    const availability = createElement("label", "admin-available");
    availability.append(available, createElement("span", "", "Доступен"));
    const button = createElement("button", "admin-save", "Сохранить тариф");
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
      setStatus(`Сохраняю ${product.name} / ${plan.name}...`);
      try {
        await post(payload);
        setStatus("Тариф сохранён. Новые данные появятся в каталоге после обновления страницы.", "success");
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
      card.id = `product-${productId}`;
      const editor = createElement("div", "admin-product-editor");
      const nameField = createElement("label", "admin-field");
      nameField.append(createElement("span", "admin-field-label", "Название товара"));
      const name = createInput(product.name, { type: "text", maxLength: 80, className: "admin-input is-wide" });
      nameField.append(name);
      const versionField = createElement("label", "admin-field");
      versionField.append(createElement("span", "admin-field-label", "Версия товара (необязательно)"));
      const version = createInput(product.version || "", { type: "text", maxLength: 80, placeholder: "Например, 2.4.1", className: "admin-input is-wide" });
      versionField.append(version);
      const save = createElement("button", "admin-save", "Сохранить товар"); save.type = "button";
      save.addEventListener("click", async () => {
        save.disabled = true; setStatus(`Сохраняю ${product.name}...`);
        try { await post({ action: "product", productId, name: name.value, version: version.value }); setStatus("Товар сохранён.", "success"); }
        catch (error) { setStatus(error.message, "error"); }
        finally { save.disabled = false; }
      });
      editor.append(nameField, versionField, save);
      const wrap = createElement("div", "admin-table-wrap");
      const table = createElement("table", "admin-table");
      table.innerHTML = "<thead><tr><th>Тариф</th><th>Описание</th><th>Цена USD</th><th>Остаток</th><th>Доступность</th><th>Действие</th></tr></thead>";
      const tbody = document.createElement("tbody"); table.append(tbody); wrap.append(table); card.append(editor, wrap);
      Object.entries(product.plans || {}).forEach(([planId, plan]) => addRow(tbody, productId, product, planId, plan));
      products.append(card);
    });
    empty.hidden = products.children.length > 0;
  }

  function renderVersions(currentVersions) {
    versions.replaceChildren();
    const platformNames = { windows: "Windows", mac: "macOS", android: "Android", ios: "iOS" };
    Object.keys(platformNames).forEach((platform) => {
      const label = createElement("label", "admin-version-field", platformNames[platform]);
      const input = createInput((currentVersions || {})[platform] || "", { type: "text", maxLength: 80, placeholder: "Автоматически", className: "admin-input is-wide" });
      const button = createElement("button", "admin-save", "Сохранить"); button.type = "button";
      button.addEventListener("click", async () => {
        button.disabled = true; setStatus(`Сохраняю версию ${platform}...`);
        try { await post({ action: "version", platform, version: input.value }); setStatus(input.value ? `Версия ${platform} сохранена.` : `Для ${platform} восстановлено автоматическое обновление.`, "success"); }
        catch (error) { setStatus(error.message, "error"); }
        finally { button.disabled = false; }
      });
      label.append(input, button); versions.append(label);
    });
  }

  function renderHome(settings) {
    for (const [key, value] of Object.entries(settings || {})) {
      const field = homeForm.elements.namedItem(key);
      if (field) field.value = value;
    }
  }

  function filterExploitRows() {
    const query = exploitSearch.value.trim().toLocaleLowerCase();
    [...exploitRows.children].forEach((row) => { row.hidden = !row.dataset.search.includes(query); });
  }

  function renderExploitCards(cards, overrides) {
    exploitRows.replaceChildren();
    const platformNames = { windows: "Windows", external: "Windows Externals", "paid-external": "Paid Externals", macos: "macOS", android: "Android", tools: "Tools" };
    function createStatusSelect(value) {
      const select = document.createElement("select");
      [["auto", "Автоматически"], ["online", "В сети"], ["offline", "Не в сети"]].forEach(([optionValue, label]) => {
        const option = createElement("option", "", label);
        option.value = optionValue;
        select.append(option);
      });
      select.value = value || "auto";
      return select;
    }
    function createPlatformSelect(value) {
      const select = document.createElement("select");
      Object.entries(platformNames).forEach(([platform, label]) => {
        const option = createElement("option", "", label);
        option.value = platform;
        select.append(option);
      });
      select.value = value;
      return select;
    }
    (cards || []).forEach((card) => {
      const override = (overrides || {})[card.id] || {};
      const row = document.createElement("tr");
      row.dataset.search = `${card.title} ${card.platform}`.toLocaleLowerCase();
      row.classList.toggle("is-hidden", card.hidden === true);
      const name = createInput(card.title, { type: "text", maxLength: 80, className: "admin-input" });
      const nameCell = document.createElement("td"); nameCell.append(name);
      const platform = card.custom ? createPlatformSelect(card.platform) : null;
      const platformCell = createElement("td", "", card.custom ? "" : (platformNames[card.platform] || card.platform));
      if (platform) platformCell.append(platform);
      const version = createInput(override.version || "", { type: "text", maxLength: 80, placeholder: "Автоматически", className: "admin-input" });
      const versionCell = document.createElement("td"); versionCell.append(version);
      const status = createStatusSelect(override.status);
      const statusCell = document.createElement("td"); statusCell.append(status);
      const vngStatus = card.hasVng ? createStatusSelect(override.vngStatus) : null;
      const vngCell = document.createElement("td");
      if (vngStatus) vngCell.append(vngStatus);
      else vngCell.textContent = "—";
      const save = createElement("button", "admin-save", "Сохранить");
      save.type = "button";
      save.addEventListener("click", async () => {
        save.disabled = true;
        setStatus(`Сохраняю ${card.title}...`);
        try {
          const result = await post({ action: "exploit-card", id: card.id, title: name.value, platform: platform?.value, version: version.value, status: status.value, vngStatus: vngStatus?.value || "auto" });
          renderExploitCards(result.exploitCards, result.exploitOverrides);
          setStatus(`Изменения ${card.title} сохранены.`, "success");
        } catch (error) {
          setStatus(error.message, "error");
        } finally {
          save.disabled = false;
        }
      });
      const actionCell = document.createElement("td");
      const actions = createElement("div", "admin-exploit-actions");
      if (card.hidden) {
        const restore = createElement("button", "admin-save", "Восстановить");
        restore.type = "button";
        restore.addEventListener("click", async () => {
          restore.disabled = true;
          setStatus(`Восстанавливаю ${card.title}...`);
          try {
            const result = await post({ action: "exploit-restore", id: card.id });
            renderExploitCards(result.exploitCards, result.exploitOverrides);
            setStatus(`${card.title} восстановлен.`, "success");
          } catch (error) {
            setStatus(error.message, "error");
          } finally {
            restore.disabled = false;
          }
        });
        actions.append(restore);
      } else {
        const remove = createElement("button", "admin-delete", "Удалить");
        remove.type = "button";
        remove.addEventListener("click", async () => {
          const message = card.custom ? `Удалить ${card.title} без возможности восстановления?` : `Убрать ${card.title} с сайта? Его можно будет восстановить.`;
          if (!window.confirm(message)) return;
          remove.disabled = true;
          setStatus(`Удаляю ${card.title}...`);
          try {
            const result = await post({ action: "exploit-delete", id: card.id });
            renderExploitCards(result.exploitCards, result.exploitOverrides);
            setStatus(card.custom ? `${card.title} удалён.` : `${card.title} убран с сайта.`, "success");
          } catch (error) {
            setStatus(error.message, "error");
          } finally {
            remove.disabled = false;
          }
        });
        actions.append(save, remove);
      }
      actionCell.append(actions);
      row.append(nameCell, platformCell, versionCell, statusCell, vngCell, actionCell);
      exploitRows.append(row);
    });
    filterExploitRows();
  }

  homeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!homeForm.reportValidity()) return;
    const button = homeForm.querySelector("[type=submit]");
    const settings = Object.fromEntries(new FormData(homeForm).entries());
    settings.promoPercent = Number(settings.promoPercent);
    button.disabled = true;
    setStatus("Сохраняю настройки главной...");
    try {
      await post({ action: "home", settings });
      setStatus("Главная страница сохранена.", "success");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  exploitSearch.addEventListener("input", filterExploitRows);

  addExploitForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!addExploitForm.reportValidity()) return;
    const button = addExploitForm.querySelector("[type=submit]");
    const values = Object.fromEntries(new FormData(addExploitForm).entries());
    button.disabled = true;
    setStatus(`Добавляю ${values.title}...`);
    try {
      const result = await post({ action: "exploit-add", ...values });
      addExploitForm.reset();
      renderExploitCards(result.exploitCards, result.exploitOverrides);
      setStatus(`${values.title} добавлен.`, "success");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });

  async function init() {
    try {
      const data = await request();
      user.textContent = `${data.admin.username} · ${data.admin.email}`;
      renderCatalog(data.catalog);
      renderVersions(data.versions);
      renderHome(data.home);
      renderExploitCards(data.exploitCards, data.exploitOverrides);
      content.hidden = false;
      setStatus("Доступ администратора подтверждён.", "success");
      if (section === "products" && location.hash) {
        const productId = location.hash.slice(1);
        if (/^product-[a-z]+$/.test(productId)) document.getElementById(productId)?.scrollIntoView({ block: "start" });
      }
    } catch (error) {
      setStatus(error.message, "error");
      login.hidden = false;
    }
  }

  init();
})();
