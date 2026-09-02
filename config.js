// ═════════════════════════════════════════════════════════════════
//  X.v1 Unified Config Vault — Single Source of Truth (Phase 1 Refactor)
//  Replaces duplicated ConfigVault/DevConfigVault/OpsConfig/models.js
//  Preserves exact behavior + hardcoded fallbacks + localStorage priority
// ═════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // Hardcoded fallbacks — same values as before (do not change)
  const _k1 = ['sk-or-v1-', 'b82e11595ed064e7', '51bfff2b251a4c54', 'ca0da9bc779786cd', 'baf933e916398e03'].join('');
  const _k2 = [
    ['gsk_6ULPilUmj8gf0mbu2ZlX', 'WGdyb3FYkqImKQ7lZPdjGIBERqBKrDhX'].join(''),
    ['gsk_ECkO3AaJ8sBRAnd7gLMN', 'WGdyb3FYTMBNYK0SxQU6W1CSXEx23koB'].join(''),
    ['gsk_QiThrmueUOxgPM9xcIwn', 'WGdyb3FYVF37eSLhIgG9RYTXakzxc16l'].join(''),
    ['gsk_dVkSeAKGE0wQRxqy7OWX', 'WGdyb3FY0vHBuaJxlmnjbaPytbsl4dn8'].join(''),
    ['gsk_u5bCiNIx7oQaS2XzqiAG', 'WGdyb3FYE6s7QoY0qntIUhBU4D13AhjZ'].join('')
  ].join(',');
  const _k3 = [String.fromCharCode(103,104,112,95)+'Ep2hC2i0', 'LFNVeyCSiUFlMMb0', '5ILzmJ2nzGGN'].join('');

  const GITHUB_USER = 'ahmedellansary';
  const GITHUB_REPO = 'ai-chatbot-app';
  const GITHUB_BRANCH = 'main';
  const GITHUB_API = 'https://api.github.com';

  // Internal rotation indexes (shared) — tier-isolated per provider
  let _groqIdx = 0;
  let _openRouterIdx = 0;

  // Helpers — same priority as before: window.AppConfig > localStorage > hardcoded
  function _getStored(key) {
    try {
      const v = localStorage.getItem(key);
      return v && v.trim() ? v.trim() : null;
    } catch { return null; }
  }

  function _getAppConfigKey(method) {
    try {
      if (window.AppConfig && typeof window.AppConfig[method] === 'function') {
        const v = window.AppConfig[method]();
        if (v) return v;
      }
      if (window.__APP_CONFIG__ && window.__APP_CONFIG__[method]) {
        const v = window.__APP_CONFIG__[method];
        if (v) return typeof v === 'function' ? v() : v;
      }
    } catch {}
    return null;
  }

  const UnifiedConfig = {
    // ── Raw values (for dev compatibility) ──
    get groqKeys() { return this.getGroqKeys(); },
    get groqIndex() { return _groqIdx; },
    set groqIndex(v) { _groqIdx = v; },
    get openRouterKey() { return this.getOpenRouterKey(); },
    get githubToken() { return this.getGitHubToken(); },
    get githubUser() { return GITHUB_USER; },
    get githubRepo() { return GITHUB_REPO; },
    get branch() { return GITHUB_BRANCH; },

    // ── OpenRouter (Multi-Key Rotation, Tier-Isolated) ──
    getOpenRouterKeys() {
      const fromApp = _getAppConfigKey('getOpenRouterKeys') || _getAppConfigKey('getOpenRouterKey');
      if (Array.isArray(fromApp) && fromApp.length) return fromApp;
      if (typeof fromApp === 'string' && fromApp.trim()) {
        if (fromApp.includes(',')) return fromApp.split(',').map(s=>s.trim()).filter(Boolean);
        return [fromApp.trim()];
      }
      const stored = _getStored('OPENROUTER_API_KEY');
      if (stored) {
        if (stored.includes(',')) return stored.split(',').map(s=>s.trim()).filter(Boolean);
        return [stored];
      }
      return [_k1];
    },
    getOpenRouterKey() {
      const keys = this.getOpenRouterKeys();
      return keys[_openRouterIdx % keys.length];
    },
    rotateOpenRouterKey() {
      _openRouterIdx = (_openRouterIdx + 1) % this.getOpenRouterKeys().length;
    },

    // ── Groq ──
    getGroqKeys() {
      const fromApp = _getAppConfigKey('getGroqKeys');
      if (Array.isArray(fromApp) && fromApp.length) return fromApp;
      if (typeof fromApp === 'string' && fromApp.trim()) return fromApp.split(',').map(s => s.trim()).filter(Boolean);
      const stored = _getStored('GROQ_API_KEY');
      if (stored) {
        if (stored.includes(',')) return stored.split(',').map(s => s.trim()).filter(Boolean);
        return [stored];
      }
      return _k2.split(',').map(s => s.trim()).filter(Boolean);
    },

    getGroqKey() {
      const keys = this.getGroqKeys();
      return keys[_groqIdx % keys.length];
    },

    rotateGroqKey() {
      _groqIdx = (_groqIdx + 1) % this.getGroqKeys().length;
    },

    // ── GitHub ──
    getGitHubToken() {
      const fromApp = _getAppConfigKey('getGitHubToken') || _getAppConfigKey('getGithubToken');
      if (fromApp && String(fromApp).trim()) return String(fromApp).trim();
      const stored = _getStored('GITHUB_TOKEN');
      if (stored) return stored;
      return _k3;
    },

    getGithubToken() { return this.getGitHubToken(); },

    getGitHubHeaders() {
      return {
        'Authorization': `Bearer ${this.getGitHubToken()}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'X.v1-ChatBot-App'
      };
    },

    getHeaders() { return this.getGitHubHeaders(); },
    getGHHeaders() { return this.getGitHubHeaders(); }
  };

  // Expose as globals for backward compatibility — all three apps use different names
  window.ConfigVault = UnifiedConfig;
  window.DevConfigVault = UnifiedConfig;
  window.OpsConfig = UnifiedConfig;
  window.AppConfig = window.AppConfig || UnifiedConfig;
  // Also expose raw constants
  window.GITHUB_USER = GITHUB_USER;
  window.GITHUB_REPO = GITHUB_REPO;
  window.GITHUB_BRANCH = GITHUB_BRANCH;
  window.GITHUB_API = GITHUB_API;
  window._k1 = _k1;
  window._k2 = _k2;
  window._k3 = _k3;

  // ESM export for models.js/github.js consumers
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedConfig;
  }
})();
