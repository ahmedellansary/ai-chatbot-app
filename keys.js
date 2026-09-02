// Runtime configuration bootstrap: keep secrets out of source control.
(function () {
  const safeConfig = {
    OPENROUTER_API_KEY: '',
    GROQ_API_KEY: '',
    GITHUB_TOKEN: ''
  };

  if (!window.__APP_CONFIG__) {
    window.__APP_CONFIG__ = {};
  }

  Object.entries(safeConfig).forEach(([key, value]) => {
    if (value && value.trim()) {
      window.__APP_CONFIG__[key] = value.trim();
      try {
        localStorage.setItem(key, value.trim());
      } catch {}
    }
  });
})();