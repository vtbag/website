document.addEventListener("DOMContentLoaded", () => {
  // 1. Theme Switcher Logic
  const currentTheme = localStorage.getItem("theme") || "system";
  const buttons = document.querySelectorAll(".theme-btn");

  const applyTheme = (theme) => {
    if (theme === "system") {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute(
        "data-theme",
        isDark ? "dark" : "light",
      );
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    localStorage.setItem("theme", theme);

    buttons.forEach((btn) => {
      const isActive = btn.getAttribute("data-mode") === theme;
      btn.classList.toggle("active", isActive);
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-mode");
      applyTheme(mode);
    });
  });

  applyTheme(currentTheme);

  // 2. Iframe Navigation Bar Controls
  const iframe = document.getElementById("demo-iframe");
  const navUrl = document.getElementById("nav-url");
  const btnBack = document.getElementById("nav-back");
  const btnForward = document.getElementById("nav-forward");
  const btnReload = document.getElementById("nav-reload");

  if (iframe && navUrl && btnBack && btnForward && btnReload) {
    let historyStack = ["/demo"];
    let currentIndex = 0;
    let isUserNav = true;

    btnBack.disabled = false;
    btnForward.disabled = true;

    btnBack.addEventListener("click", () => {
      if (currentIndex > 0) {
        isUserNav = false;
        currentIndex--;
        iframe.contentWindow.history.back();
      } else {
        window.location.href = "../";
      }
    });

    btnForward.addEventListener("click", () => {
      if (currentIndex < historyStack.length - 1) {
        isUserNav = false;
        currentIndex++;
        iframe.contentWindow.history.forward();
      }
    });

    btnReload.addEventListener("click", () => {
      iframe.contentWindow.location.reload();
    });

    iframe.addEventListener("load", () => {
      const path = iframe.contentWindow.location.pathname;
      let displayPath = "/demo";

      // Custom Display Path extraction (handles navigation-types and falls back to /demo)
      if (path.includes("detail")) {
        const match = path.match(/detail\/(\d+)/);
        if (match) displayPath = `/detail/${match[1]}`;
      } else if (path.includes("about")) {
        displayPath = "/about";
      }

      if (isUserNav) {
        if (currentIndex < historyStack.length - 1) {
          historyStack = historyStack.slice(0, currentIndex + 1);
        }
        if (historyStack[currentIndex] !== displayPath) {
          historyStack.push(displayPath);
          currentIndex++;
        }
      } else {
        isUserNav = true;
      }

      navUrl.innerText = displayPath;

      btnBack.disabled = false;
      btnForward.disabled = currentIndex >= historyStack.length - 1;
    });
  }
});
