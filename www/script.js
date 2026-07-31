const fadeInScrollIndicator = () => {
  const indicator = window.document.querySelector("zbk-button");
  if (!indicator) {
    return;
  }
  setTimeout(() => {
    indicator.classList.add("opacity");
    setTimeout(() => {
      indicator.classList.add("bounce-top");
    }, 3000);
  }, 5250);
};

fadeInScrollIndicator();

const scrollToTeaser = () => {
  const targetElement = window.document.querySelector("#teaser");
  if (!targetElement) {
    return;
  }
  targetElement.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
};

const scrollIndicator = window.document.querySelector("zbk-button");
scrollIndicator?.addEventListener("click", scrollToTeaser);

const storageKey = "markdown-theme";
const root = document.documentElement;
const toggle = document.querySelector("zbk-toggle");
const mediaQuery = window.matchMedia
  ? window.matchMedia("(prefers-color-scheme: dark)")
  : null;

const readStoredTheme = () => {
  try {
    return window.localStorage.getItem(storageKey);
  } catch (error) {
    return null;
  }
};

const writeStoredTheme = (value) => {
  try {
    window.localStorage.setItem(storageKey, value);
  } catch (error) {
    /* localStorage unavailable */
  }
};

const clearStoredTheme = () => {
  try {
    window.localStorage.removeItem(storageKey);
  } catch (error) {
    /* localStorage unavailable */
  }
};

const applyTheme = (theme, source) => {
  const nextTheme = theme === "dark" ? "dark" : "light";
  root.dataset.zbkTheme = nextTheme;
  root.dataset.themeSource = source;
  if (toggle) {
    toggle.checked = nextTheme === "dark";
  }
};

const storedTheme = (() => {
  const value = readStoredTheme();
  return value === "dark" || value === "light" ? value : null;
})();

const initialTheme =
  root.dataset.zbkTheme ||
  storedTheme ||
  (mediaQuery?.matches ? "dark" : "light");
const initialSource =
  root.dataset.themeSource || (storedTheme ? "manual" : "system");
applyTheme(initialTheme, initialSource);

toggle?.addEventListener("change", () => {
  const nextTheme = toggle.checked ? "dark" : "light";
  applyTheme(nextTheme, "manual");
  writeStoredTheme(nextTheme);
});

const handleSystemPreferenceChange = (event) => {
  if (root.dataset.themeSource === "manual") {
    return;
  }
  applyTheme(event.matches ? "dark" : "light", "system");
  clearStoredTheme();
};

if (mediaQuery?.addEventListener) {
  mediaQuery.addEventListener("change", handleSystemPreferenceChange);
} else if (mediaQuery?.addListener) {
  mediaQuery.addListener(handleSystemPreferenceChange);
}
