(() => {
  const THEME_KEY = "cheatblox-theme";

  function setTheme(theme, withAnimation = false) {
    if (withAnimation && document.startViewTransition) {
      document.startViewTransition(() => {
        applyTheme(theme);
      });
    } else {
      applyTheme(theme);
    }
  }

  function applyTheme(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
      document.documentElement.classList.add("dark");
    } else {
      document.body.classList.remove("dark-theme");
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem(THEME_KEY, theme);
  }

  function toggleTheme(event) {
    const currentTheme = document.body.classList.contains("dark-theme") ? "dark" : "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    // Добавляем CSS для анимации перехода
    if (document.startViewTransition && event) {
      const x = event.clientX;
      const y = event.clientY;
      const endRadius = Math.hypot(
        Math.max(x, innerWidth - x),
        Math.max(y, innerHeight - y)
      );

      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ];

      document.startViewTransition(async () => {
        applyTheme(newTheme);
      }).ready.then(() => {
        document.documentElement.animate(
          { clipPath },
          {
            duration: 500,
            easing: 'ease-in-out',
            pseudoElement: '::view-transition-new(root)'
          }
        );
      });
    } else {
      setTheme(newTheme, false);
    }
  }

  // Инициализация при загрузке
  document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem(THEME_KEY) || "light";
    applyTheme(savedTheme);

    // Обработчик клика на кнопку
    const themeToggle = document.querySelector(".theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", toggleTheme);
    }
  });
})();
