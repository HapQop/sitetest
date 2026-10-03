(() => {
  const apiBase = window.AUTH_API_BASE || "/api/auth";
  const views = [...document.querySelectorAll("[data-auth-view]")];
  const status = document.querySelector("[data-auth-status]");
  const authTitle = document.querySelector("#auth-title");
  const authTitles = {
    login: { ru: "Вход", en: "Login" },
    register: { ru: "Регистрация", en: "Sign up" },
    forgot: { ru: "Восстановление доступа", en: "Recover access" },
    verify: { ru: "Подтверждение почты", en: "Verify email" },
    reset: { ru: "Новый пароль", en: "New password" },
  };
  let currentMode = "login";
  let loginMethod = "password";
  let challengeId = "";
  let resetEmail = "";
  const loginIdentifier = document.querySelector("#login-identifier");
  const loginPasswordField = document.querySelector("[data-login-password-field]");
  const loginPassword = document.querySelector("#login-password");
  const loginSubmit = document.querySelector("[data-login-submit]");
  const loginNote = document.querySelector("[data-login-note]");
  const loginIdentifierLabel = document.querySelector("[data-login-identifier-label]");
  const loginMethodButtons = [...document.querySelectorAll("[data-auth-method]")];
  const socialProvider = document.querySelector("#register-social-provider");
  const socialHandleField = document.querySelector("[data-social-handle-field]");
  const socialHandle = document.querySelector("#register-social-handle");
  const socialChoices = [...document.querySelectorAll("[data-social-choice]")];
  const loginSocialChoice = document.querySelector("[data-login-social-choice]");

  function updateAuthTitle(language = document.documentElement.lang) {
    authTitle.textContent = authTitles[currentMode][language === "en" ? "en" : "ru"];
  }

  function translate(key, fallback) {
    return window.CheatBloxI18n?.translate(key) || fallback;
  }

  function updateLoginMethod() {
    const code = loginMethod === "code";
    loginMethodButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.authMethod === loginMethod)));
    loginIdentifier.type = code ? "email" : "text";
    loginIdentifier.autocomplete = code ? "email" : "username";
    loginIdentifierLabel.textContent = code
      ? translate("auth-email", "Email")
      : translate("auth-email-or-username", "Email or username");
    loginPasswordField.hidden = code;
    loginPassword.disabled = code;
    loginPassword.required = !code;
    loginSubmit.textContent = code
      ? translate("auth-send-login-code", "Send sign-in code")
      : translate("auth-sign-in", "Sign in");
    loginNote.textContent = code
      ? translate("auth-code-note", "We will send a six-digit code to your account email.")
      : "";
  }

  loginMethodButtons.forEach((button) => button.addEventListener("click", () => {
    loginMethod = button.dataset.authMethod;
    updateLoginMethod();
    showStatus("");
  }));
  updateLoginMethod();

  document.querySelectorAll("[data-login-social]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-login-social]").forEach((option) => {
      const selected = option === button;
      option.classList.toggle("is-selected", selected);
      option.setAttribute("aria-pressed", String(selected));
    });
    showStatus(translate("auth-social-coming-soon", "Social sign-in is coming soon."));
  }));

  function updateSocialHandle() {
    const selected = socialProvider.value === "discord" || socialProvider.value === "telegram";
    socialHandleField.hidden = !selected;
    socialHandle.disabled = !selected;
    socialHandle.required = selected;
    if (!selected) socialHandle.value = "";
    socialChoices.forEach((button) => {
      if (!button.dataset.socialChoice) return;
      const active = button.dataset.socialChoice === socialProvider.value;
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  socialChoices.forEach((button) => {
    button.addEventListener("click", () => {
      const choice = button.dataset.socialChoice;
      const next = socialProvider.value === choice ? "" : choice;
      if (next !== socialProvider.value) socialHandle.value = "";
      socialProvider.value = next;
      updateSocialHandle();
      if (next) socialHandle.focus();
    });
  });
  updateSocialHandle();
  document.addEventListener("DOMContentLoaded", () => { updateAuthTitle(); updateLoginMethod(); });
  document.addEventListener("languagechange", () => { updateAuthTitle(); updateLoginMethod(); });

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.target);
      if (!input) return;
      const isVisible = input.type === "text";
      input.type = isVisible ? "password" : "text";
      button.classList.toggle("is-visible", !isVisible);
      button.setAttribute("aria-pressed", String(!isVisible));
      const label = document.documentElement.lang === "ru"
        ? (isVisible ? "Показать пароль" : "Скрыть пароль")
        : (isVisible ? "Show password" : "Hide password");
      button.setAttribute("aria-label", label);
      button.title = label;
      input.focus();
    });
  });

  function showStatus(message, type = "") {
    status.textContent = message;
    status.className = `auth-status${type ? ` is-${type}` : ""}`;
  }

  function showView(mode) {
    currentMode = mode;
    views.forEach((view) => {
      view.hidden = view.dataset.authView !== mode;
    });
    if (loginSocialChoice) loginSocialChoice.hidden = mode !== "login";
    updateAuthTitle();
    showStatus("");
  }

  async function request(path, payload) {
    const response = await fetch(`${apiBase}/${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const contentType = response.headers.get("content-type") || "";
    const result = contentType.includes("application/json") ? await response.json().catch(() => ({})) : {};
    if (!response.ok) {
      const fallback = response.status === 404
        ? "Authentication API is not deployed. Redeploy the project with the api/auth function."
        : `Authentication request failed (${response.status}).`;
      throw new Error(result.error || fallback);
    }
    return result;
  }

  function setBusy(form, busy) {
    form.querySelector("button[type=submit]").disabled = busy;
  }

  async function submitForm(form, mode) {
    setBusy(form, true);
    showStatus("Connecting to the authentication service...");
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      if (mode === "register" && data.password !== data.confirmPassword) throw new Error("Passwords do not match.");
      if (mode === "register") {
        const result = await request("register", data);
        challengeId = result.challengeId;
        showView("verify");
        showStatus("Check your email for the six-digit verification code.", "success");
      } else if (mode === "login") {
        const result = loginMethod === "code"
          ? await request("login-code", { email: data.identifier })
          : await request("login", data);
        if (loginMethod === "code") {
          challengeId = result.challengeId;
          showView("verify");
          showStatus(translate("auth-code-sent", "If this account exists, a six-digit code has been sent."), "success");
          return;
        }
        if (result.ok && result.user) {
          // Уже верифицированный пользователь - сразу логиним
          showStatus("Login successful! Redirecting...", "success");
          setTimeout(() => window.location.href = result.user.isAdmin ? "admin.html" : "index.html", 1000);
          return;
        }
        challengeId = result.challengeId;
        showView("verify");
        showStatus("Check your email for the six-digit verification code.", "success");
      } else if (mode === "forgot") {
        const result = await request("forgot", data);
        challengeId = result.challengeId;
        resetEmail = data.email;
        showView("reset");
        showStatus("If the email exists, a recovery code has been sent.", "success");
      } else if (mode === "verify") {
        const result = await request("verify", { challengeId, code: data.code });
        showStatus("Email verified. You are signed in. Redirecting...", "success");
        setTimeout(() => window.location.href = result.user?.isAdmin ? "admin.html" : "index.html", 1500);
      } else if (mode === "reset") {
        await request("reset", { challengeId, email: resetEmail, code: data.code, password: data.password });
        showView("login");
        showStatus("Password reset. You can sign in now.", "success");
      }
    } catch (error) {
      const message = error instanceof TypeError
        ? "Authentication service is not connected. Configure the /api/auth backend."
        : error.message;
      showStatus(message, "error");
    } finally {
      setBusy(form, false);
    }
  }

  const params = new URLSearchParams(window.location.search);
  showView(["login", "register", "forgot"].includes(params.get("mode")) ? params.get("mode") : "login");
  document.querySelectorAll("[data-auth-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitForm(form, form.dataset.authForm);
    });
  });
})();
