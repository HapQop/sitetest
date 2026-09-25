(() => {
  const apiBase = window.AUTH_API_BASE || "/api/auth";

  async function checkSession() {
    try {
      console.log("[Auth] Checking session...");
      const response = await fetch(`${apiBase}/session`, {
        method: "GET",
        credentials: "include",
      });

      console.log("[Auth] Session response:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("[Auth] Session data:", data);
        if (data.ok && data.user) {
          console.log("[Auth] User logged in:", data.user.username);
          updateHeaderForLoggedInUser(data.user);
        }
      } else {
        console.log("[Auth] No active session");
      }
    } catch (error) {
      console.error("[Auth] Session check failed:", error);
    }
  }

  function updateHeaderForLoggedInUser(user) {
    const loginLink = document.querySelector(".login-link");
    const registerLink = document.querySelector(".register-link");

    if (loginLink) loginLink.style.display = "none";
    if (registerLink) registerLink.style.display = "none";

    // Создаем элемент с именем пользователя и кнопкой выхода
    const siteControls = document.querySelector(".site-controls");
    if (siteControls && !document.querySelector(".user-menu")) {
      const userMenu = document.createElement("div");
      userMenu.className = "user-menu";
      userMenu.innerHTML = `
        <span class="user-name">${escapeHtml(user.username)}</span>
        <button class="logout-btn" aria-label="Logout">Logout</button>
      `;

      siteControls.appendChild(userMenu);

      // Обработчик выхода
      const logoutBtn = userMenu.querySelector(".logout-btn");
      logoutBtn.addEventListener("click", async () => {
        try {
          await fetch(`${apiBase}/logout`, {
            method: "POST",
            credentials: "include",
          });
          window.location.reload();
        } catch (error) {
          console.error("Logout failed:", error);
        }
      });
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Проверяем сессию при загрузке страницы
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkSession);
  } else {
    checkSession();
  }

  // Экспортируем функцию для использования после успешного логина
  window.CheatBloxAuth = { checkSession, updateHeaderForLoggedInUser };
})();
