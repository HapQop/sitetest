(() => {
  const apiBase = window.AUTH_API_BASE || "/api/auth";
  const views = [...document.querySelectorAll("[data-auth-view]")];
  const status = document.querySelector("[data-auth-status]");
  let challengeId = "";
  let resetEmail = "";

  function showStatus(message, type = "") {
    status.textContent = message;
    status.className = `auth-status${type ? ` is-${type}` : ""}`;
  }

  function showView(mode) {
    views.forEach((view) => {
      view.hidden = view.dataset.authView !== mode;
    });
    showStatus("");
  }

  async function request(path, payload) {
    const response = await fetch(`${apiBase}/${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Authentication request failed.");
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
        const result = await request("login", data);
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
        await request("verify", { challengeId, code: data.code });
        showStatus("Email verified. You are signed in.", "success");
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
