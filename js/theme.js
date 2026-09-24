// Theme management
;(() => {
  const STORAGE_KEY = "theme"

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || "dark"
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }

  function toggleTheme() {
    setTheme(getTheme() === "dark" ? "light" : "dark")
  }

  function createThemeToggle() {
    const button = document.createElement("button")
    button.className = "theme-toggle"
    button.setAttribute("aria-label", "Toggle theme")
    button.setAttribute("title", "Перемкнути тему")

    const sunIcon = document.createElement("span")
    sunIcon.className = "sun-icon"
    sunIcon.textContent = "☀️"

    const moonIcon = document.createElement("span")
    moonIcon.className = "moon-icon"
    moonIcon.textContent = "🌙"

    button.appendChild(sunIcon)
    button.appendChild(moonIcon)
    button.addEventListener("click", toggleTheme)

    const navbar = document.getElementById("navbar")
    if (navbar) {
      const list = navbar.querySelector("ul") || navbar
      list.appendChild(button)
    } else {
      document.body.appendChild(button)
    }
  }

  function init() {
    setTheme(getTheme())
    createThemeToggle()
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }
})()
