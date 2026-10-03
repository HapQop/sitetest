(() => {
  const apiBase = window.AUTH_API_BASE || "/api/auth";
  const keyList = document.querySelector("[data-account-keys]");
  const keyCount = document.querySelector("[data-account-key-count]");
  const passwordForm = document.querySelector("[data-account-password-form]");
  const passwordStatus = document.querySelector("[data-account-password-status]");
  let account = null;

  function translate(key, fallback) {
    return window.CheatBloxI18n?.translate(key) || fallback;
  }

  function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = String(value || "");
    return element.innerHTML;
  }

  function setStatus(message, type = "") {
    passwordStatus.textContent = message;
    passwordStatus.className = `account-status${type ? ` is-${type}` : ""}`;
  }

  function formatPurchasedAt(value) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(document.documentElement.lang === "ru" ? "ru-RU" : "en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function renderKeys(keys) {
    keyCount.textContent = String(keys.length);
    if (!keys.length) {
      keyList.innerHTML = `<p class="account-key-empty">${escapeHtml(translate("account-keys-empty", "No purchased keys yet. Your keys will appear here after payment is confirmed."))}</p>`;
      return;
    }
    keyList.innerHTML = keys.map((item, index) => {
      const date = formatPurchasedAt(item.purchasedAt);
      return `<article class="account-key"><div class="account-key__top"><div><strong>${escapeHtml(item.productName)}</strong><span>${escapeHtml(item.planName)}</span></div>${date ? `<time class="account-key__date" datetime="${escapeHtml(item.purchasedAt)}">${escapeHtml(date)}</time>` : ""}</div><div class="account-key__value"><code>${escapeHtml(item.key)}</code><button type="button" data-copy-key-index="${index}">${escapeHtml(translate("account-key-copy", "Copy"))}</button></div></article>`;
    }).join("");
  }

  function renderAccount(data) {
    account = data;
    document.querySelector("[data-account-username]").textContent = data.user.username;
    document.querySelector("[data-account-email]").textContent = data.user.email;
    renderKeys(data.keys || []);
  }

  async function request(action, options = {}) {
    const response = await fetch(`${apiBase}/${action}`, {
      method: options.method || "GET",
      credentials: "include",
      headers: options.body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || "Account request failed.");
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  async function loadAccount() {
    try {
      renderAccount(await request("account"));
    } catch (error) {
      if (error.status === 401) {
        window.location.href = "auth.html?mode=login";
        return;
      }
      keyList.innerHTML = `<p class="account-key-empty">${escapeHtml(error.message)}</p>`;
    }
  }

  function copyLegacy(value) {
    const input = document.createElement("textarea");
    input.value = value;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    return copied;
  }

  keyList.addEventListener("click", async (event) => {
    const button = event.target.closest?.("[data-copy-key-index]");
    if (!button || !account) return;
    const key = account.keys[Number(button.dataset.copyKeyIndex)]?.key;
    if (!key) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(key);
      else if (!copyLegacy(key)) throw new Error("Copy is unavailable.");
      button.textContent = translate("account-key-copied", "Copied");
    } catch {
      button.textContent = translate("account-key-copy-error", "Copy failed");
    }
  });

  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(passwordForm).entries());
    if (data.newPassword !== data.confirmPassword) {
      setStatus(translate("account-password-mismatch", "New passwords do not match."), "error");
      return;
    }
    const submit = passwordForm.querySelector("button[type=submit]");
    submit.disabled = true;
    setStatus("");
    try {
      await request("change-password", { method: "POST", body: { currentPassword: data.currentPassword, newPassword: data.newPassword } });
      passwordForm.reset();
      setStatus(translate("account-password-updated", "Password updated. Your session has been refreshed."), "success");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      submit.disabled = false;
    }
  });

  document.querySelector("[data-account-logout]").addEventListener("click", async () => {
    try {
      await request("logout", { method: "POST", body: {} });
    } finally {
      window.location.href = "auth.html?mode=login";
    }
  });

  document.addEventListener("languagechange", () => {
    if (account) renderAccount(account);
  });
  loadAccount();
})();
