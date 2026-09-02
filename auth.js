// ═════════════════════════════════════════════════════════════════
//  X.v1 Unified Auth — Single Source of Truth (Phase 1 Refactor)
//  Replaces duplicated AuthManager/DevAuthManager/OpsAuthManager
//  Preserves salted SHA-256, isUnlocked, unlock/lock, setupGate
// ═════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const MASTER_AUTH_RECORD = 'd34a56498cc5f912d1f55cefd6382af6:c000fd79842150a9fdb7b3d30ed0f964652ad5ba078beb7b7f9c47a523a16595';

  async function sha256Hex(str) {
    const data = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function hashWithSalt(password, salt) {
    return sha256Hex(`${salt}:${password}`);
  }

  async function verifyPassword(password) {
    if (!password || !MASTER_AUTH_RECORD.includes(':')) return false;
    const customPin = (() => { try { return localStorage.getItem('DEV_CUSTOM_PIN'); } catch { return null; } })();
    if (customPin && password === customPin) return true;
    try {
      const [salt, expected] = MASTER_AUTH_RECORD.split(':');
      const computed = await hashWithSalt(password, salt);
      return computed === expected;
    } catch { return false; }
  }

  // Factory — creates an AuthManager configured for each app
  function createAuthManager(opts) {
    const {
      storageKey = 'xv1_authenticated', // sessionStorage key for unlocked
      previewFlag = '__IS_DEV_PREVIEW',
      legacyKeys = [], // localStorage keys to clear on unlock/lock
      gateId = 'app-lock-gate',
      formId = 'lock-gate-form',
      inputId = 'gate-pin-input',
      buttonId = 'gate-unlock-btn',
      onUnlock = null
    } = opts || {};

    return {
      MASTER_AUTH_RECORD,
      hashWithSalt,
      sha256: sha256Hex,
      verify: verifyPassword,

      isUnlocked() {
        if (typeof window !== 'undefined' && window[previewFlag] === true) return true;
        try {
          if (sessionStorage.getItem(storageKey) === 'true') return true;
          // legacy global unlocks (for app)
          if (storageKey === 'xv1_authenticated') {
            if (localStorage.getItem('owner_unlocked') === '1') return true;
            if (localStorage.getItem('nytron_app_unlocked') === '1') return true;
          }
          return false;
        } catch { return false; }
      },

      unlock() {
        try { sessionStorage.setItem(storageKey, 'true'); } catch {}
        legacyKeys.forEach(k => { try { localStorage.removeItem(k); } catch {} });
      },

      lock() {
        try { sessionStorage.removeItem(storageKey); } catch {}
        legacyKeys.forEach(k => { try { localStorage.removeItem(k); } catch {} });
        this.setupGate();
      },

      setupGate() {
        const gate = document.getElementById(gateId);
        const form = document.getElementById(formId);
        const pinInput = document.getElementById(inputId);
        const unlockBtn = document.getElementById(buttonId);
        if (!gate) return;

        if (!this.isUnlocked()) {
          gate.classList.remove('hidden');
          if (pinInput) {
            pinInput.value = '';
            setTimeout(() => { try { pinInput.focus(); } catch {} }, 150);
          }
        } else {
          gate.classList.add('hidden');
        }

        let isVerifying = false;
        const handle = async () => {
          if (isVerifying) return;
          const pwd = pinInput ? pinInput.value.trim() : '';
          if (!pwd) {
            const toast = window.MessageRenderer?.showToast || window.DevUIEngine?.showToast || window.OpsUI?.showToast;
            if (toast) toast('يرجى كتابة كلمة السر', 'warning');
            return;
          }
          isVerifying = true;
          if (unlockBtn) unlockBtn.innerHTML = '<span>جاري التحقق...</span> <span>⏳</span>';
          try {
            const ok = await verifyPassword(pwd);
            if (ok) {
              this.unlock();
              gate.classList.add('hidden');
              const toast = window.MessageRenderer?.showToast || window.DevUIEngine?.showToast || window.OpsUI?.showToast;
              if (toast) toast('🔓 تم فتح التطبيق بنجاح!', 'success');
              if (typeof onUnlock === 'function') onUnlock();
              if (gateId === 'ops-lock-gate' && window.OpsApp?.initData) window.OpsApp.initData();
            } else {
              const toast = window.MessageRenderer?.showToast || window.DevUIEngine?.showToast || window.OpsUI?.showToast;
              if (toast) toast('❌ كلمة السر غير صحيحة!', 'error');
              if (pinInput) {
                pinInput.value = '';
                pinInput.style.borderColor = 'var(--error, #ef4444)';
                setTimeout(() => pinInput.style.borderColor = '', 1000);
              }
            }
          } finally {
            isVerifying = false;
            if (unlockBtn) {
              const orig = gateId === 'app-lock-gate' ? '<span>Unlock Workspace</span> <span>🔓</span>' :
                         gateId === 'ops-lock-gate' ? '<span>فتح مركز العمليات</span> <span>🔓</span>' :
                         '<span>فتح بيئة المطور</span> <span>🔓</span>';
              unlockBtn.innerHTML = orig;
            }
          }
        };

        if (form) form.onsubmit = (e) => { e.preventDefault(); handle(); };
        if (unlockBtn) unlockBtn.onclick = (e) => { e.preventDefault(); handle(); };
        if (pinInput) pinInput.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handle(); } };
      },

      requireAuth(cb) {
        if (this.isUnlocked()) { if (typeof cb === 'function') cb(); return; }
        this.setupGate();
      }
    };
  }

  // Create instances for each app — preserve original global names
  const AuthManager = createAuthManager({
    storageKey: 'xv1_authenticated',
    previewFlag: '__IS_DEV_PREVIEW',
    legacyKeys: ['nytron_app_unlocked', 'claude_app_unlocked', 'owner_unlocked'],
    gateId: 'app-lock-gate',
    formId: 'lock-gate-form',
    inputId: 'gate-pin-input',
    buttonId: 'gate-unlock-btn'
  });

  const DevAuthManager = createAuthManager({
    storageKey: 'DEV_PORTAL_UNLOCKED',
    previewFlag: '__IS_DEV_PREVIEW',
    legacyKeys: [],
    gateId: 'app-lock-gate',
    formId: 'lock-gate-form',
    inputId: 'gate-pin-input',
    buttonId: 'gate-unlock-btn',
    onUnlock: null
  });

  const OpsAuthManager = createAuthManager({
    storageKey: 'OPS_PORTAL_UNLOCKED',
    previewFlag: '__IS_DEV_PREVIEW',
    legacyKeys: [],
    gateId: 'ops-lock-gate',
    formId: 'ops-lock-form',
    inputId: 'ops-gate-pin-input',
    buttonId: 'ops-gate-unlock-btn',
    onUnlock: null
  });

  // Expose
  window.MASTER_AUTH_RECORD = MASTER_AUTH_RECORD;
  window.createAuthManager = createAuthManager;
  window.AuthManager = AuthManager;
  window.DevAuthManager = DevAuthManager;
  window.OpsAuthManager = OpsAuthManager;

  // Legacy global aliases (preserve)
  window.isAppUnlocked = () => AuthManager.isUnlocked();
  window.isOwnerUnlocked = () => AuthManager.isUnlocked();
  window.updateOwnerLockUI = () => {};
  window.promptOwnerAuth = (cb) => AuthManager.requireAuth(cb);
  window.setupAppLockGate = () => AuthManager.setupGate();
})();
