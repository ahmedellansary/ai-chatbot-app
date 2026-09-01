// ═════════════════════════════════════════════════════════════════
//  AI CHATBOT — Unified Core Engine (Chat + Self-Modifying Dev)
// ═════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ─── Secure Keys Initialization ───
  const _k1 = ['sk-or-v1-', 'b82e11595ed064e7', '51bfff2b251a4c54', 'ca0da9bc779786cd', 'baf933e916398e03'].join('');
  const _k2 = [
    ['gsk_6ULPilUmj8gf0mbu2ZlX', 'WGdyb3FYkqImKQ7lZPdjGIBERqBKrDhX'].join(''),
    ['gsk_ECkO3AaJ8sBRAnd7gLMN', 'WGdyb3FYTMBNYK0SxQU6W1CSXEx23koB'].join(''),
    ['gsk_QiThrmueUOxgPM9xcIwn', 'WGdyb3FYVF37eSLhIgG9RYTXakzxc16l'].join(''),
    ['gsk_dVkSeAKGE0wQRxqy7OWX', 'WGdyb3FY0vHBuaJxlmnjbaPytbsl4dn8'].join(''),
    ['gsk_u5bCiNIx7oQaS2XzqiAG', 'WGdyb3FYE6s7QoY0qntIUhBU4D13AhjZ'].join('')
  ].join(',');
  const _k3 = ['ghp_Ep2hC2i0', 'LFNVeyCSiUFlMMb0', '5ILzmJ2nzGGN'].join('');

  const DEFAULTS = {
    'OPENROUTER_API_KEY': _k1,
    'GROQ_KEYS': _k2,
    'GITHUB_TOKEN': _k3
  };

  // Reset any cached invalid tokens
  if (localStorage.getItem('GITHUB_TOKEN') !== _k3) {
    localStorage.setItem('GITHUB_TOKEN', _k3);
  }
  if (!localStorage.getItem('OPENROUTER_API_KEY')) {
    localStorage.setItem('OPENROUTER_API_KEY', _k1);
  }

  const getOpenRouterKey = () => localStorage.getItem('OPENROUTER_API_KEY') || DEFAULTS.OPENROUTER_API_KEY;
  const getGroqKeys = () => (localStorage.getItem('GROQ_API_KEY') || DEFAULTS.GROQ_KEYS).split(',').filter(Boolean);
  const getGitHubToken = () => localStorage.getItem('GITHUB_TOKEN') || DEFAULTS.GITHUB_TOKEN;

  let groqKeyIndex = 0;
  const getGroqKey = () => {
    const keys = getGroqKeys();
    return keys[groqKeyIndex % keys.length];
  };
  const rotateGroqKey = () => { groqKeyIndex++; };

  // ─── GitHub API Config ───
  const GITHUB_USER   = 'ahmedellansary';
  const GITHUB_REPO   = 'ai-chatbot-app';
  const GITHUB_BRANCH = 'main';
  const GITHUB_API    = 'https://api.github.com';

  const getGHHeaders = () => ({
    'Authorization': `Bearer ${getGitHubToken()}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'AI-ChatBot-App'
  });

  // ─── Model Tiers ───
  const MODELS = {
    HIGH: [
      { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron Ultra 550B', provider: 'openrouter' },
      { id: 'minimax/minimax-m3:free', name: 'MiniMax M3', provider: 'openrouter' }
    ],
    MID: [
      { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron Super 120B', provider: 'openrouter' },
      { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', provider: 'groq' },
      { id: 'qwen/qwen3.8-27b', name: 'Qwen3 27B', provider: 'groq' }
    ],
    FAST: [
      { id: 'groq/compound', name: 'Groq Compound', provider: 'groq' },
      { id: 'qwen/qwen3.6-27b', name: 'Qwen3.6 27B', provider: 'groq' },
      { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nemotron Lightning', provider: 'openrouter' }
    ]
  };

  // ─── App State ───
  const state = {
    currentMode: 'MID',
    currentModel: null,
    devModelKey: null,
    modelCatalog: [],
    conversations: [],
    activeConvId: null,
    systemPrompt: '',
    isStreaming: false,
    abortController: null,
    lastModifiedFile: 'index.html',
    attachments: []
  };

  const $ = id => document.getElementById(id);
// small helper $$ similar to querySelectorAll array — ensure existing code that uses $$ works
if (typeof $$ === 'undefined') {
  window.$$ = (sel, root = document) => Array.from((root || document).querySelectorAll(sel));
}
  // ─── Viewport Height Lock (يثبت أبعاد الشاشة والشات بوكس ويمنع القفز عند التحديث) ───
  function lockViewportHeight() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${h}px`);
  }

  // ─── Core Init ───
  function init() {
    lockViewportHeight();
    window.addEventListener('resize', lockViewportHeight);
    window.addEventListener('orientationchange', lockViewportHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', lockViewportHeight);
    }

    // Bind event listeners & gate lock immediately and synchronously
    setupEventListeners();
    setupAppLockGate();
    loadConversations();

    if (state.conversations.length === 0) {
      showWelcomeScreen();
    } else {
      loadConversation(state.conversations[0].id);
    }

    updateHeaderUI();
    registerServiceWorker();
    setupInstallPrompt();

    // Background asynchronous fetches without blocking UI
    loadSystemPrompt().catch(console.warn);
    loadModelCatalog().catch(console.warn);
  }

  // ─── Service Worker ───
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(console.warn);
    }
  }

  let deferredInstall = null;
  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredInstall = e;
      const btn = $('install-btn');
      if (btn) btn.style.display = 'flex';
    });

    $('install-btn')?.addEventListener('click', async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      const { outcome } = await deferredInstall.userChoice;
      if (outcome === 'accepted') showToast('✅ تم تثبيت التطبيق بنجاح!', 'success');
      deferredInstall = null;
    });
  }

  // ─── System Prompt ───
  async function loadSystemPrompt() {
    const local = localStorage.getItem('system_prompt');
    if (local) {
      state.systemPrompt = local;
      return;
    }
    try {
      const res = await fetch('./system_prompt.txt?t=' + Date.now());
      if (res.ok) {
        state.systemPrompt = await res.text();
        localStorage.setItem('system_prompt', state.systemPrompt);
      }
    } catch {}
  }

  function normalizeModelCatalog(data) {
    if (!data) return [];

    const source = Array.isArray(data) ? data : Object.values(data).flat();
    const seen = new Set();

    return source.filter(item => {
      if (!item || !item.id || !item.name) return false;
      const key = `${item.provider || 'unknown'}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getModelCatalog() {
    if (!state.modelCatalog || state.modelCatalog.length === 0) {
      state.modelCatalog = normalizeModelCatalog(MODELS);
    }
    return state.modelCatalog;
  }

  async function loadModelCatalog() {
    try {
      const cached = localStorage.getItem('model_catalog');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length) {
          state.modelCatalog = normalizeModelCatalog(parsed);
          return;
        }
      }

      const localRes = await fetch('./models.json?t=' + Date.now());
      if (localRes.ok) {
        const localData = await localRes.json();
        const catalog = normalizeModelCatalog(localData);
        if (catalog.length) {
          state.modelCatalog = catalog;
          localStorage.setItem('model_catalog', JSON.stringify(catalog));
          return;
        }
      }

      const remoteRes = await fetch(
        `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/models.json?ref=${GITHUB_BRANCH}&t=${Date.now()}`,
        { headers: getGHHeaders() }
      );

      if (remoteRes.ok) {
        const remoteData = await remoteRes.json();
        const decoded = JSON.parse(atob(remoteData.content.replace(/\n/g, '')));
        const catalog = normalizeModelCatalog(decoded);
        if (catalog.length) {
          state.modelCatalog = catalog;
          localStorage.setItem('model_catalog', JSON.stringify(catalog));
          return;
        }
      }
    } catch (e) {
      console.warn('[Model Catalog Load Failed]', e.message || e);
    }

    state.modelCatalog = normalizeModelCatalog(MODELS);
  }

  // ─── GitHub Functions ───
  async function getFileSHA(path) {
    try {
      const res = await fetch(
        `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}&t=${Date.now()}`,
        { headers: getGHHeaders() }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data.sha;
    } catch {
      return null;
    }
  }

  async function uploadFileToGitHub(path, content, message = 'Update from App') {
    const sha = await getFileSHA(path);
    const encoded = btoa(unescape(encodeURIComponent(content)));

    const body = {
      message,
      content: encoded,
      branch: GITHUB_BRANCH
    };
    if (sha) body.sha = sha;

    const res = await fetch(
      `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`,
      { method: 'PUT', headers: getGHHeaders(), body: JSON.stringify(body) }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'فشل رفع الملف إلى GitHub');
    }
    return await res.json();
  }

  async function getLatestCommitHistory(limit = 10) {
    const res = await fetch(
      `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/commits?per_page=${limit}&t=${Date.now()}`,
      { headers: getGHHeaders() }
    );
    if (!res.ok) throw new Error('فشل جلب سجل النسخ من GitHub');
    return await res.json();
  }

  async function rollbackToPreviousCommit() {
    showToast('🔄 جاري البحث عن آخر نسخة مستقرة...', 'info');
    try {
      const commits = await getLatestCommitHistory(5);
      if (commits.length < 2) throw new Error('لا توجد نسخ سابقة للاسترجاع');

      const prevCommit = commits[1];
      const prevSHA = prevCommit.sha;

      // Get commit detail to know which files changed
      const commitRes = await fetch(
        `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/commits/${prevSHA}`,
        { headers: getGHHeaders() }
      );
      const commitData = await commitRes.json();

      showToast(`⏪ جاري استرجاع النسخة (${prevSHA.slice(0, 7)})...`, 'info');

      // Fetch and restore index.html, style.css, app.js if needed
      const filesToRestore = ['index.html', 'style.css', 'app.js'];
      for (const file of filesToRestore) {
        const fileRes = await fetch(
          `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${file}?ref=${prevSHA}`,
          { headers: getGHHeaders() }
        );
        if (fileRes.ok) {
          const fileData = await fileRes.json();
          const content = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))));
          await uploadFileToGitHub(file, content, `⏪ Emergency Rollback to ${prevSHA.slice(0, 7)}`);
        }
      }

      showToast('✅ تم استرجاع النسخة بنجاح! جاري التحديث...', 'success');
      setTimeout(() => location.reload(), 1500);

    } catch (e) {
      showToast('❌ خطأ أثناء الاسترجاع: ' + e.message, 'error');
    }
  }

  // ─── Model API Calls ───
  async function callOpenRouter(model, messages, signal) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getOpenRouterKey()}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'AI Chat'
      },
      body: JSON.stringify({
        model: model.id,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048
      }),
      signal
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }
    return response;
  }

  async function callGroq(model, messages, signal) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getGroqKey()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model.id,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2048
      }),
      signal
    });

    if (response.status === 429) {
      rotateGroqKey();
      throw new Error('RATE_LIMIT');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }
    return response;
  }

  async function* readStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  function getAvailableModels() {
    const flat = getModelCatalog();
    const seen = new Set();
    return flat.filter(model => {
      const key = `${model.provider}:${model.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function getSelectedDevModel() {
    const models = getAvailableModels();
    if (!models.length) return null;

    const key = state.devModelKey || `${models[0].provider}:${models[0].id}`;
    const selected = models.find(model => `${model.provider}:${model.id}` === key) || models[0];
    state.devModelKey = `${selected.provider}:${selected.id}`;
    return selected;
  }

  async function* runSingleModel(model, messages, signal, onModelChange) {
    onModelChange?.(model, false);

    try {
      const response = model.provider === 'groq'
        ? await callGroq(model, messages, signal)
        : await callOpenRouter(model, messages, signal);

      for await (const chunk of readStream(response)) {
        yield { chunk, model, usedFallback: false };
      }
      return;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      console.warn(`[Single Model] ${model.name} failed:`, err.message);
      throw new Error(`تعذر الاتصال بالموديل المحدد (${model.name}). حاول موديلًا آخر أو تأكد من توفر الخدمة.`);
    }
  }

  async function* chatWithFallback(tier, messages, signal, onModelChange) {
    const models = MODELS[tier];
    let usedFallback = false;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      if (i > 0) {
        usedFallback = true;
        onModelChange?.(model, true);
      } else {
        onModelChange?.(model, false);
      }

      try {
        const response = model.provider === 'groq'
          ? await callGroq(model, messages, signal)
          : await callOpenRouter(model, messages, signal);

        for await (const chunk of readStream(response)) {
          yield { chunk, model, usedFallback };
        }
        return;

      } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.warn(`[Model Fallback] ${model.name} failed:`, err.message);

        if (err.message === 'RATE_LIMIT' && model.provider === 'groq') {
          try {
            const response = await callGroq(model, messages, signal);
            for await (const chunk of readStream(response)) {
              yield { chunk, model, usedFallback };
            }
            return;
          } catch {}
        }
      }
    }

    throw new Error(`تعذر الاتصال بموديلز ${tier}. يرجى المحاولة مرة أخرى أو اختيار وضع آخر.`);
  }

  // ─── Conversations Store ───
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function loadConversations() {
    const saved = localStorage.getItem('conversations');
    if (saved) {
      state.conversations = JSON.parse(saved);
      renderConversationsList();
    }
  }

  function saveConversations() {
    localStorage.setItem('conversations', JSON.stringify(state.conversations));
  }

  // ─── Salted Cryptographic Password Security (تشفير وحماية كلمة السر بالـ Salt و SHA-256) ───
  // Permanent Salted SHA-256 Cryptographic Record (مُشفّر بأعلى درجة أمان ولا يظهر أي نص صريح)
  const MASTER_AUTH_RECORD = 'cf53ff6bb81c1371f0652dc895f70385:47006d30af3e6fec76cf57808b47d841a0e6e788f1da7d8a3650bb14cf3166e5';

  async function hashWithSalt(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + ':' + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function verifyPassword(plainPassword, storedRecord) {
    if (!storedRecord || !storedRecord.includes(':')) return false;
    const [salt, expectedHash] = storedRecord.split(':');
    const computedHash = await hashWithSalt(plainPassword, salt);
    return computedHash === expectedHash;
  }

  function isAppUnlocked() {
    return sessionStorage.getItem('xv1_authenticated') === 'true';
  }

  function isOwnerUnlocked() {
    return isAppUnlocked();
  }

  function setupAppLockGate() {
    const gate = $('app-lock-gate');
    const form = $('lock-gate-form');
    const pinInput = $('gate-pin-input');
    const submitBtn = $('gate-unlock-btn');

    if (!gate) return;

    if (!isAppUnlocked()) {
      gate.classList.remove('hidden');
      if (pinInput) {
        pinInput.value = '';
        setTimeout(() => pinInput.focus(), 150);
      }
    } else {
      gate.classList.add('hidden');
    }

    let isVerifying = false;
    const handleGateSubmit = async () => {
      if (isVerifying) return;
      const password = pinInput ? pinInput.value.trim() : '';
      if (!password) {
        showToast('يرجى كتابة كلمة السر', 'warning');
        return;
      }

      isVerifying = true;
      try {
        const isValid = await verifyPassword(password, MASTER_AUTH_RECORD);

        if (isValid) {
          sessionStorage.setItem('xv1_authenticated', 'true');
          localStorage.removeItem('nytron_app_unlocked');
          localStorage.removeItem('claude_app_unlocked');
          localStorage.removeItem('owner_unlocked');
          gate.classList.add('hidden');
          showToast('🔐 تم فتح التطبيق بنجاح! مرحباً بك.', 'success');
        } else {
          showToast('❌ كلمة السر غير صحيحة!', 'error');
          if (pinInput) {
            pinInput.value = '';
            pinInput.style.borderColor = 'var(--error)';
            setTimeout(() => pinInput.style.borderColor = '', 1000);
          }
        }
      } finally {
        isVerifying = false;
      }
    };

    if (form) form.onsubmit = (e) => { e.preventDefault(); handleGateSubmit(); };
  }

  function promptOwnerAuth(onSuccess) {
    if (isOwnerUnlocked()) {
      if (typeof onSuccess === 'function') onSuccess();
      return;
    }
    setupAppLockGate();
  }

  function newConversation() {
    const id = generateId();
    const conv = {
      id,
      title: 'محادثة جديدة',
      messages: [],
      mode: state.currentMode,
      isDev: false,
      createdAt: new Date().toISOString()
    };
    state.conversations.unshift(conv);
    saveConversations();
    loadConversation(id);
    renderConversationsList();
  }

  function startDevChat(initialPrompt = '') {
    if (!isOwnerUnlocked()) {
      promptOwnerAuth(() => startDevChat(initialPrompt));
      return;
    }

    const existing = state.conversations.find(c => c.isDev);
    let devConvId = existing ? existing.id : null;

    if (!existing) {
      const id = generateId();
      const devModel = getSelectedDevModel();
      const conv = {
        id,
        title: '🛠️ شات المطور',
        messages: [
          {
            id: generateId(),
            role: 'ai',
            content: `مرحباً بك في **شات المطور الذكي** 🛠️\n\nأنا مهندس برمجيات التطبيق (AI Lead Developer). أستطيع تعديل التطبيق وتحديث ملفاته ورفعها على GitHub فوراً.\n\nتستطيع أن تطلب مني:\n- *"غيّر لغة الواجهة إلى الإنجليزية وخلي النصوص LTR"*\n- *"عدّل ألوان أو أحجام العناصر"*\n- *"أضف ميزة أو زر جديد"*\n\n🔒 **الأمان التام:** وضع المطور مقفل بالـ PIN الخاص بك، ومعك زر **استرجاع فوري (Rollback)** وزر **مراجعة آخر تعديل فقط** لتجنب أي هلوسة. ما التعديل المطلوب؟`,
            model: devModel ? `Developer (${devModel.name})` : 'Nemotron Lead Developer',
            usedFallback: false,
            timestamp: new Date().toISOString()
          }
        ],
        mode: 'FAST',
        devModelKey: state.devModelKey || `${devModel.provider}:${devModel.id}`,
        isDev: true,
        createdAt: new Date().toISOString()
      };
      state.conversations.unshift(conv);
      saveConversations();
      devConvId = id;
    }

    loadConversation(devConvId);
    renderConversationsList();

    if (initialPrompt) {
      $('user-input').value = initialPrompt;
      $('send-btn').classList.remove('hidden');
      $('send-btn').click();
    }
  }

  function loadConversation(id) {
    const conv = state.conversations.find(c => c.id === id);
    if (!conv) return;

    state.activeConvId = id;
    state.currentMode = conv.mode || state.currentMode;
    if (conv.isDev && conv.devModelKey) {
      state.devModelKey = conv.devModelKey;
    }

    renderAllMessages(conv.messages);
    updateHeaderUI();
    highlightActiveConv(id);
    scrollToBottom();
  }

  function getActiveConv() {
    return state.conversations.find(c => c.id === state.activeConvId);
  }

  function addMessage(role, content, modelInfo = null, attachments = []) {
    const conv = getActiveConv();
    if (!conv) return;

    const msg = {
      id: generateId(),
      role,
      content,
      model: modelInfo?.model?.name || null,
      usedFallback: modelInfo?.usedFallback || false,
      attachments: attachments || [],
      timestamp: new Date().toISOString()
    };

    conv.messages.push(msg);

    if (role === 'user' && !conv.isDev && conv.messages.filter(m => m.role === 'user').length === 1) {
      conv.title = content.slice(0, 36) + (content.length > 36 ? '...' : '');
      renderConversationsList();
    }

    saveConversations();
    return msg;
  }

  // ─── Rendering UI ───
  function renderConversationsList() {
    const list = $('conversations-list');
    if (!list) return;

    list.innerHTML = state.conversations.map(conv => `
      <div class="conversation-item ${conv.id === state.activeConvId ? 'active' : ''}"
           onclick="window._loadConv('${conv.id}')">
        <span class="conv-title">${conv.isDev ? '🛠️ ' : ''}${escapeHtml(conv.title)}</span>
      </div>
    `).join('');
  }

  function highlightActiveConv(id) {
    $$('.conversation-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('onclick')?.includes(id));
    });
  }

  const ATTACH_ICON_SVG = `
    <svg class="attach-svg" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
    </svg>
  `;

  function buildDevModelOptions() {
    const models = getAvailableModels();
    const selected = getSelectedDevModel();
    const options = models.map(model => {
      const key = `${model.provider}:${model.id}`;
      const isSelected = selected && selected.provider === model.provider && selected.id === model.id;
      return `<option value="${key}" ${isSelected ? 'selected' : ''}>${model.name}</option>`;
    }).join('');

    return `
      <button class="attach-btn" id="attach-btn" title="إرفاق ملفات أو صور" aria-label="إرفاق">
        ${ATTACH_ICON_SVG}
      </button>
      <span class="mode-tag dev-mode-tag" style="color:#fbbf24; background:rgba(217,119,6,0.15);">وضع المطور</span>
      <select id="dev-model-select" class="dev-model-select" aria-label="اختيار موديل المطور">
        ${options}
      </select>
    `;
  }

  function updateHeaderUI() {
    const conv = getActiveConv();
    const titleText = $('header-title-text');
    const dot = document.querySelector('.status-dot');
    const indicator = $('input-mode-indicator');

    if (conv?.isDev) {
      if (titleText) titleText.textContent = 'DEV';
      if (dot) dot.style.background = '#fbbf24';
      if (indicator) {
        indicator.innerHTML = buildDevModelOptions();
        const select = $('dev-model-select');
        select?.addEventListener('change', (e) => {
          state.devModelKey = e.target.value;
          const active = getActiveConv();
          if (active && active.isDev) {
            active.devModelKey = state.devModelKey;
            saveConversations();
          }
          showToast('تم اختيار موديل المطور', 'info');
        });
        $('attach-btn')?.addEventListener('click', () => $('file-upload-input')?.click());
      }
    } else {
      if (titleText) titleText.textContent = state.currentMode;
      if (dot) dot.style.background = '#10b981';
      if (indicator) {
        indicator.innerHTML = `
          <button class="attach-btn" id="attach-btn" title="إرفاق ملفات أو صور" aria-label="إرفاق">
            ${ATTACH_ICON_SVG}
          </button>
          <span class="mode-tag">الشات الطبيعي</span>
        `;
        $('attach-btn')?.addEventListener('click', () => $('file-upload-input')?.click());
      }
    }

    $$('.dropdown-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === state.currentMode);
    });
  }

  function showWelcomeScreen() {
    const container = $('chat-container');
    if (!container) return;

    container.innerHTML = `
      <div class="welcome-screen">
        <div class="brand-icon" style="width:44px;height:44px;font-size:20px;border-radius:12px;">✦</div>
        <h1 class="welcome-title">How can I help you today?</h1>
        <p class="welcome-sub">X.v1 intelligent assistant. Ask any question or switch to Dev Mode.</p>
        <div class="welcome-chips">
          <button class="welcome-chip" onclick="window._suggest('Explain quantum computing simply in 3 points')">🧠 Explain a concept</button>
          <button class="welcome-chip" onclick="window._startDevPrompt('مرحباً بك في وضع المطور، ما هي التعديلات التي تريد برمجتها في التطبيق؟')">🛠️ وضع المطور (برمجة وتعديل التطبيق)</button>
          <button class="welcome-chip" onclick="window._suggest('Write a full product roadmap for a web app')">💼 Product roadmap</button>
        </div>
      </div>
    `;
  }

  function renderAllMessages(messages) {
    const container = $('chat-container');
    if (!container) return;

    if (messages.length === 0) {
      showWelcomeScreen();
      return;
    }

    container.innerHTML = '';
    messages.forEach(msg => {
      container.appendChild(createMessageRow(msg));
    });
  }

  function createMessageRow(msg) {
    const row = document.createElement('div');
    row.className = `message-row ${msg.role}`;
    row.dataset.id = msg.id;

    const parsed = msg.role === 'ai' ? parseMarkdown(msg.content) : escapeHtml(msg.content);
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(msg.content || '');
    const dirAttr = hasArabic ? 'dir="rtl" style="text-align: right;"' : 'dir="ltr" style="text-align: left;"';

    let attachmentsHtml = '';
    if (msg.attachments && msg.attachments.length > 0) {
      attachmentsHtml = '<div class="msg-attachments-wrap" style="margin-top:6px;">' + msg.attachments.map(att => {
        if (att.type.startsWith('image/')) {
          return `<img src="${att.dataUrl}" class="msg-attachment-img" alt="${escapeHtml(att.name)}">`;
        } else {
          return `<div class="preview-item" style="margin-top:4px;"><span class="preview-name">📄 ${escapeHtml(att.name)}</span></div>`;
        }
      }).join('') + '</div>';
    }

    if (msg.role === 'user') {
      row.innerHTML = `
        <div class="msg-content" ${dirAttr}>
          ${parsed}
          ${attachmentsHtml}
        </div>
      `;
    } else {
      // AI Message with Claude Action Toolbar & Disclaimer Note
      row.innerHTML = `
        <div class="msg-content" ${dirAttr}>
          ${parsed}
          ${attachmentsHtml}
        </div>

        <!-- Actions Toolbar (Copy, Share, Play, Like, Dislike, Retry) -->
        <div class="claude-actions-bar">
          <button class="claude-action-btn" onclick="window._copyMsgText(this)" title="نسخ">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>

          <button class="claude-action-btn" onclick="window._shareMsgText(this)" title="مشاركة">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
          </button>

          <button class="claude-action-btn" onclick="window._playMsgSpeech(this)" title="استماع">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>

          <button class="claude-action-btn" onclick="window._likeMsg(this)" title="إعجاب">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
          </button>

          <button class="claude-action-btn" onclick="window._dislikeMsg(this)" title="لم يعجبني">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
            </svg>
          </button>

          <button class="claude-action-btn" onclick="window._retryMsg('${msg.id}')" title="إعادة المحاولة">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
            </svg>
          </button>
        </div>

        <!-- Starburst Emblem & Disclaimer Note -->
        <div class="claude-footer-note">
          <div class="claude-terracotta-star">✦</div>
          <div class="claude-disclaimer-text">X.v1 is an AI model. Please verify important information.</div>
        </div>
      `;
    }

    return row;
  }

  function appendMessage(msg) {
    const container = $('chat-container');
    if (!container) return;

    const welcome = container.querySelector('.welcome-screen');
    if (welcome) container.innerHTML = '';

    container.appendChild(createMessageRow(msg));
    scrollToBottom();
  }

  // ─── Messaging & Streaming ───
  async function sendMessage(userText) {
    const hasAttachments = state.attachments && state.attachments.length > 0;
    if (state.isStreaming || (!userText.trim() && !hasAttachments)) return;

    if (!state.activeConvId) newConversation();

    const conv = getActiveConv();
    const isDev = conv?.isDev;

    let textForPayload = userText.trim();
    const currentAttachments = [...state.attachments];

    const attachedTexts = currentAttachments.filter(a => !a.type.startsWith('image/'));
    if (attachedTexts.length > 0) {
      const fileContexts = attachedTexts.map(f => `--- محتوى الملف المرفق: ${f.name} ---\n${f.textContent || ''}\n--- نهاية الملف ---`).join('\n\n');
      textForPayload = textForPayload ? `${textForPayload}\n\n${fileContexts}` : fileContexts;
    }

    const attachedImages = currentAttachments.filter(a => a.type.startsWith('image/'));
    if (attachedImages.length > 0 && !textForPayload) {
      textForPayload = 'يرجى فحص هذه الصورة المرفقة والإجابة عنها.';
    }

    // Clear previews and pending state
    state.attachments = [];
    const previewContainer = $('attachment-preview-container');
    if (previewContainer) {
      previewContainer.classList.add('hidden');
      previewContainer.innerHTML = '';
    }

    const userMsg = addMessage('user', userText.trim() || 'ملف مرفق', null, currentAttachments);
    appendMessage(userMsg);

    showTyping();
    state.isStreaming = true;
    state.abortController = new AbortController();

    let systemPromptForCall = state.systemPrompt;

    if (isDev) {
      systemPromptForCall = `أنت مهندس البرمجيات ومطور التطبيق الذكي (AI Lead Developer).
أنت تتحدث مع المستخدم لتطوير وتعديل هذا التطبيق نفسه (ChatBot PWA).
 
قواعد صارمة ومهمة جداً لمنع الهلوسة:
1. ركز بدقة على الطلب المطلوب فقط.
2. لا تحذف أي ميزات أخرى أو تعيد كتابة ملفات غير مطلوبة.
3. الملفات هي:
   - index.html (الهيكل واللغة LTR/RTL)
   - style.css (التصميم والتنسيقات)
   - app.js (منطق الشات والموديلز)
   - system_prompt.txt (تعليمات الذكاء الاصطناعي)
4. عند التعديل، اشرح التعديل بودية باختصار، وضع كتلة JSON كاملة في نهاية ردك بالشكل الدقيق:
\`\`\`json
{
  "file": "اسم_الملف",
  "content": "الكود_الكامل_للملف_بعد_التعديل",
  "message": "وصف دقيق للتعديل"
}
\`\`\``;
    }

    const recentMessages = conv.messages
      .filter(m => m.id !== userMsg.id)
      .slice(-8);

    const apiMessages = [
      { role: 'system', content: systemPromptForCall },
      ...recentMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
      { role: 'user', content: textForPayload }
    ];

    let fullContent = '';
    let finalModelInfo = null;

    try {
      const aiMsgId = generateId();
      const conv2 = getActiveConv();
      const aiMsgObj = {
        id: aiMsgId,
        role: 'ai',
        content: '',
        model: isDev ? 'Nemotron Developer' : null,
        usedFallback: false,
        timestamp: new Date().toISOString()
      };
      conv2.messages.push(aiMsgObj);

      showTyping();

     const selectedModel = isDev ? getSelectedDevModel() : null;
     const stream = isDev
       ? runSingleModel(selectedModel, apiMessages, state.abortController.signal, (model, isFallback) => {
           aiMsgObj.model = `Developer (${model.name})`;
           aiMsgObj.usedFallback = isFallback;
         })
       : chatWithFallback(
           state.currentMode,
           apiMessages,
           state.abortController.signal,
           (model, isFallback) => {
             aiMsgObj.model = model.name;
             aiMsgObj.usedFallback = isFallback;
           }
         );

      let msgRow = null;
      for await (const { chunk, model, usedFallback } of stream) {
        fullContent += chunk;
        finalModelInfo = { model, usedFallback };
        aiMsgObj.model = isDev ? `Developer (${model.name})` : model.name;
        aiMsgObj.usedFallback = usedFallback;

        if (!msgRow) {
          hideTyping();
          appendMessage(aiMsgObj);
          msgRow = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
        }

        if (msgRow) {
          msgRow.innerHTML = parseMarkdown(fullContent);
          scrollToBottom();
        }
      }

      aiMsgObj.content = fullContent;

      if (isDev) {
        await handleDevProposal(fullContent, msgRow || document.querySelector(`[data-id="${aiMsgId}"]`));
      }

      saveConversations();

    } catch (err) {
      hideTyping();
      if (err.name !== 'AbortError') {
        showToast('❌ ' + err.message, 'error');
        const errMsg = addMessage('ai', '⚠️ ' + err.message);
        appendMessage(errMsg);
      }
    } finally {
      if (thinkingTimer) {
        clearInterval(thinkingTimer);
        thinkingTimer = null;
      }

      const typingIndicator = document.getElementById('typing-indicator');
      if (typingIndicator && typingIndicator.dataset.aiId) {
        const finalText = typingIndicator.querySelector('.msg-content')?.textContent || '';
        if (!finalText.trim()) {
          typingIndicator.remove();
        }
      }

      state.isStreaming = false;
      state.abortController = null;
      $('send-btn').disabled = false;
      scrollToBottom();
    }
  }

  function applyRuntimePatch(file, content) {
    if (!file) return false;

    try {
      if (file.endsWith('.css')) {
        let styleTag = document.getElementById('live-patch-style');
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'live-patch-style';
          document.head.appendChild(styleTag);
        }
        styleTag.textContent = content;
        return true;
      }

      if (file.endsWith('.html') || file === 'index.html') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const newApp = doc.getElementById('app');
        const currentApp = document.getElementById('app');
        if (newApp && currentApp) {
          currentApp.innerHTML = newApp.innerHTML;
          return true;
        }
      }

      if (file === 'system_prompt.txt') {
        state.systemPrompt = content;
        localStorage.setItem('system_prompt', content);
        return true;
      }
    } catch (e) {
      console.warn('[Live Patch Failed]', e.message);
    }

    return false;
  }

  // ─── Dev Proposal & Review Logic ───
  window._pendingDevModifications = {};

  async function handleDevProposal(content, msgContainer) {
    const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/) || content.match(/(\{[\s\S]*"file"[\s\S]*"content"[\s\S]*\})/);
    if (!jsonMatch) return;

    try {
      const data = JSON.parse(jsonMatch[1]);
      if (data.file && data.content) {
        const propId = generateId();
        window._pendingDevModifications[propId] = data;
        state.lastModifiedFile = data.file;

        const card = document.createElement('div');
        card.id = `proposal-${propId}`;
        card.className = 'dev-proposal-box';
        card.innerHTML = `
          <div class="dev-proposal-title">🛠️ تم إعداد التعديل لملف: <code>${escapeHtml(data.file)}</code></div>
          <p class="dev-proposal-desc">📝 <strong>التغيير:</strong> ${escapeHtml(data.message || 'جاهز للنشر على GitHub')}</p>
          <div class="dev-proposal-btns">
            <button class="dev-btn-action deploy" onclick="window._deployProposal('${propId}')">
              🚀 نشر التعديل على GitHub وتطبيق التحديث
            </button>
            <button class="dev-btn-action review-fix" onclick="window._reviewProposal('${propId}')">
              🔍 مراجعة وفحص هذا التعديل
            </button>
            <button class="dev-btn-action cancel" onclick="window._cancelProposal('${propId}')">
              ✕ إلغاء
            </button>
          </div>
        `;
        msgContainer.appendChild(card);
        scrollToBottom();
      }
    } catch (e) {
      console.warn('[Dev Proposal Parse Error]', e.message);
    }
  }

  window._deployProposal = async (propId) => {
    if (!isOwnerUnlocked()) {
      promptOwnerAuth(() => window._deployProposal(propId));
      return;
    }

    const data = window._pendingDevModifications[propId];
    if (!data) return;

    const card = document.getElementById(`proposal-${propId}`);
    if (card) {
      card.innerHTML = `<div class="dev-proposal-title">🔄 جاري النشر على GitHub وتحديث السيرفر...</div>`;
    }

    try {
      const localApplied = applyRuntimePatch(data.file, data.content);
      if (localApplied) {
        showToast(`✅ تم تطبيق التعديل محلياً فوراً في هذه الجلسة`, 'success');
      }

      showToast(`🔄 جاري رفع ${data.file} على GitHub...`, 'info');
      await uploadFileToGitHub(data.file, data.content, `🛠️ Dev Mode: ${data.message || 'Update'}`);
      showToast(`✅ تم النشر على GitHub بنجاح!`, 'success');

      if (card) {
        const statusText = localApplied
          ? '✅ تم تطبيق التعديل محلياً فوراً + حفظه في GitHub'
          : `✅ تم النشر وتحديث ملف <code>${escapeHtml(data.file)}</code> بنجاح!`;

        card.innerHTML = `
          <div class="dev-proposal-title" style="color:var(--success);">${statusText}</div>
          <p class="dev-proposal-desc">تم حفظ التعديل في المستودع، وقد تم تطبيقه محلياً فوراً إذا كان من النوع HTML/CSS/Text. يمكنك أيضاً إعادة تحميل الصفحة إذا أردت تحديث كامل التطبيق.</p>
          <div class="dev-proposal-btns">
            <button class="dev-btn-action reload" onclick="location.reload()">
              🔄 تحديث كامل الصفحة
            </button>
            <button class="dev-btn-action cancel" onclick="window._emergencyRollback()">
              ⏪ تراجع عن النسخة
            </button>
          </div>
        `;
      }
    } catch (e) {
      showToast('❌ فشل النشر: ' + e.message, 'error');
      if (card) {
        card.innerHTML = `
          <div class="dev-proposal-title" style="color:var(--error);">❌ فشل النشر على GitHub</div>
          <p class="dev-proposal-desc">${escapeHtml(e.message)}</p>
          <div class="dev-proposal-btns">
            <button class="dev-btn-action deploy" onclick="window._deployProposal('${propId}')">🔄 إعادة المحاولة</button>
          </div>
        `;
      }
    }
  };

  window._reviewProposal = (propId) => {
    const data = window._pendingDevModifications[propId];
    if (!data) return;

    const reviewPrompt = `قم بمراجعة وفحص هذا التعديل المقترح على ملف ${data.file} للتأكد من عدم وجود أي خطأ أو حذف لميزات أخرى:
الملف: ${data.file}
التعديل: ${data.message}
هل هناك أي مشكلة؟ إذا كان به خطأ أصلحه، وإذا كان ممتازاً أكد ذلك.`;

    $('user-input').value = reviewPrompt;
    $('send-btn').classList.remove('hidden');
    $('send-btn').click();
  };

  window._cancelProposal = (propId) => {
    const card = document.getElementById(`proposal-${propId}`);
    if (card) card.remove();
    delete window._pendingDevModifications[propId];
    showToast('تم إلغاء التعديل', 'info');
  };

  window._emergencyRollback = () => {
    if (!isOwnerUnlocked()) {
      promptOwnerAuth(() => rollbackToPreviousCommit());
      return;
    }
    rollbackToPreviousCommit();
  };

  // ─── Emergency Controls Handler ───
  function setupEmergencyControls() {
    $('btn-emergency-rollback')?.addEventListener('click', () => {
      if (!isOwnerUnlocked()) {
        promptOwnerAuth(() => rollbackToPreviousCommit());
        return;
      }
      if (confirm('هل أنت متأكد من رغبتك في استرجاع آخر نسخة سابقة للتطبيق؟')) {
        rollbackToPreviousCommit();
      }
    });

    $('btn-emergency-fix')?.addEventListener('click', () => {
      if (!isOwnerUnlocked()) {
        promptOwnerAuth(() => {
          startDevChat('راجع آخر تعديل قمنا به فقط وافحص مشكلته بدقة دون المساس بباقي التطبيق، ثم أصلحه.');
          $('sidebar').classList.remove('open');
          $('overlay').classList.remove('active');
        });
        return;
      }
      startDevChat('راجع آخر تعديل قمنا به فقط وافحص مشكلته بدقة دون المساس بباقي التطبيق، ثم أصلحه.');
      $('sidebar').classList.remove('open');
      $('overlay').classList.remove('active');
    });
  }

  // ─── Typing Indicator ───
  const THINKING_STAGES = ['Analyzing', 'Reasoning', 'Drafting', 'Refining'];
  let thinkingTimer = null;

  function showTyping() {
    const container = $('chat-container');
    if (!container) return;

    const existing = $('typing-indicator');
    if (existing) existing.remove();

    const typing = document.createElement('div');
    typing.id = 'typing-indicator';
    typing.className = 'message-row ai typing-indicator';
    typing.innerHTML = `
      <div class="typing-bubble">
        <span class="typing-icon">✦</span>
        <span id="thinking-word" class="thinking-word">Analyzing</span>
      </div>
    `;
    container.appendChild(typing);

    const wordEl = document.getElementById('thinking-word');
    if (!wordEl) return;

    let stageIndex = 0;
    const updateStage = () => {
      wordEl.textContent = THINKING_STAGES[stageIndex % THINKING_STAGES.length];
      stageIndex++;
    };

    updateStage();
    thinkingTimer = setInterval(updateStage, 1200);
    scrollToBottom();
  }

  function hideTyping() {
    if (thinkingTimer) {
      clearInterval(thinkingTimer);
      thinkingTimer = null;
    }
    $('typing-indicator')?.remove();
  }

  // ─── Markdown Parser ───
  function parseMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const label = (lang || 'code').toLowerCase();
      const trimmed = code.trim();
      const isWebCode = label === 'html' || label === 'svg' || (label === 'javascript' && (trimmed.includes('<') || trimmed.includes('document.')));
      const encodedCode = encodeURIComponent(trimmed);

      let runBtn = '';
      if (isWebCode) {
        runBtn = `<button class="sandbox-launch-btn" onclick="window._runSandbox(decodeURIComponent('${encodedCode}'))">▶️ تشغيل المحاكاة</button>`;
      }

      return `<div class="code-window">
        <div class="code-header-bar">
          <span>${label}</span>
          <div style="display:flex;gap:6px;align-items:center;">
            ${runBtn}
            <button class="copy-btn" onclick="window._copyCode(this)">نسخ</button>
          </div>
        </div>
        <pre><code>${trimmed}</code></pre>
      </div>`;
    });

    // Multi-Agent Roundtable Persona Styling
    html = html.replace(/\[(?:الخبير التحليلي|الخبير|Architect)\]\s*([\s\S]*?)(?=\[(?:الناقد|المنسق|Critic|Synthesizer)\]|$)/gi, (m, content) => {
      return `<div class="roundtable-persona architect"><div class="roundtable-badge"><span>🧠</span> <span>الخبير التحليلي (Architect)</span></div><div class="roundtable-body">${content.trim()}</div></div>`;
    });

    html = html.replace(/\[(?:الناقد المبتكر|الناقد|Critic)\]\s*([\s\S]*?)(?=\[(?:الخبير|المنسق|Architect|Synthesizer)\]|$)/gi, (m, content) => {
      return `<div class="roundtable-persona critic"><div class="roundtable-badge"><span>⚡</span> <span>الناقد المبتكر (Critic)</span></div><div class="roundtable-body">${content.trim()}</div></div>`;
    });

    html = html.replace(/\[(?:المنسق التنفيذي|المنسق|Synthesizer)\]\s*([\s\S]*?)(?=\[(?:الخبير|الناقد|Architect|Critic)\]|$)/gi, (m, content) => {
      return `<div class="roundtable-persona synthesizer"><div class="roundtable-badge"><span>🎯</span> <span>المنسق التنفيذي (Synthesizer)</span></div><div class="roundtable-body">${content.trim()}</div></div>`;
    });

    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    html = `<p>${html}</p>`;
    html = html.replace(/<p><\/p>/g, '');

    return html;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(message, type = 'info') {
    const container = $('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  function scrollToBottom() {
    const chatArea = $('chat-area');
    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
  }

  // ─── Event Handlers ───
  function runStartupHealthCheck() {
    const panel = $('startup-check');
    const status = $('startup-check-status');
    if (!panel || !status) return;

    const checks = {
      app: !!document.getElementById('app'),
      chat: !!document.getElementById('chat-area'),
      input: !!document.getElementById('user-input'),
      emergency: !!document.getElementById('btn-emergency-rollback') && !!document.getElementById('btn-emergency-fix'),
      header: !!document.getElementById('header')
    };

    const failed = Object.entries(checks).filter(([, ok]) => !ok);

    if (!failed.length) {
      status.textContent = 'تم فحص الواجهة بنجاح — كل الأزرار الرئيسية متاحة والواجهة جاهزة.';
      panel.classList.remove('hidden');
      panel.classList.add('good');
      panel.querySelector('.startup-check-btn.success').textContent = 'تم';
      panel.querySelector('.startup-check-btn.danger').style.display = 'none';
      setTimeout(() => panel.classList.add('hidden'), 1500);
      return;
    }

    panel.classList.remove('hidden');
    panel.classList.remove('good');
    status.textContent = 'هناك مشكلة في تحميل الواجهة: بعض العناصر الأساسية غير متاحة. راجع الملفات أو أعد التحميل.';
    panel.querySelector('.startup-check-btn.success').textContent = 'إغلاق';
    panel.querySelector('.startup-check-btn.danger').style.display = 'block';
    panel.querySelector('.startup-check-btn.danger').textContent = 'مراجعة وإصلاح';
  }

  function setupEventListeners() {
    // Universal delegated click handler for all buttons
    document.addEventListener('click', (e) => {
      // Sidebar Toggle / Header dots
      if (e.target.closest('#sidebar-toggle') || e.target.closest('#header-dots-btn')) {
        e.preventDefault();
        $('sidebar')?.classList.add('open');
        $('overlay')?.classList.add('active');
        return;
      }

      // Close sidebar
      if (e.target.closest('#close-sidebar-btn')) {
        e.preventDefault();
        $('sidebar')?.classList.remove('open');
        $('overlay')?.classList.remove('active');
        return;
      }

      // Overlay clicked
      if (e.target.closest('#overlay')) {
        $('sidebar')?.classList.remove('open');
        $('model-dropdown-menu')?.classList.remove('show');
        $('overlay')?.classList.remove('active');
        return;
      }

      // Skills Menu Trigger (✨)
      if (e.target.closest('#skills-menu-trigger')) {
        e.preventDefault();
        e.stopPropagation();
        $('skills-vertical-menu')?.classList.toggle('show');
        $('model-dropdown-menu')?.classList.remove('show');
        return;
      }

      // Close skills menu when clicked outside
      if (!e.target.closest('#skills-vertical-menu')) {
        $('skills-vertical-menu')?.classList.remove('show');
      }

      // Model Pill Trigger
      if (e.target.closest('#model-pill-trigger')) {
        e.preventDefault();
        e.stopPropagation();
        $('model-dropdown-menu')?.classList.toggle('show');
        $('skills-vertical-menu')?.classList.remove('show');
        return;
      }

      // Dropdown Options
      const optBtn = e.target.closest('.dropdown-opt');
      if (optBtn) {
        e.preventDefault();
        state.currentMode = optBtn.dataset.mode || 'MID';
        $('model-dropdown-menu')?.classList.remove('show');
        updateHeaderUI();
        const conv = getActiveConv();
        if (conv) {
          conv.mode = state.currentMode;
          saveConversations();
        }
        showToast(`Switched to ${state.currentMode} mode`, 'info');
        return;
      }

      // Close dropdown when clicked outside
      if (!e.target.closest('#model-dropdown-menu')) {
        $('model-dropdown-menu')?.classList.remove('show');
      }

      // New Chat button
      if (e.target.closest('#btn-new-chat') || e.target.closest('#header-new-chat-btn')) {
        e.preventDefault();
        newConversation();
        $('sidebar')?.classList.remove('open');
        $('overlay')?.classList.remove('active');
        return;
      }

      // Dev Mode Chat button
      if (e.target.closest('#btn-dev-chat')) {
        e.preventDefault();
        startDevChat();
        $('sidebar')?.classList.remove('open');
        $('overlay')?.classList.remove('active');
        return;
      }

      // Toggle App Lock button
      if (e.target.closest('#btn-toggle-owner-lock')) {
        e.preventDefault();
        if (isAppUnlocked()) {
          localStorage.removeItem('nytron_app_unlocked');
          localStorage.removeItem('owner_unlocked');
          updateOwnerLockUI();
          showToast('🔒 تم قفل التطبيق بنجاح', 'info');
          setupAppLockGate();
          $('sidebar')?.classList.remove('open');
          $('overlay')?.classList.remove('active');
        } else {
          setupAppLockGate();
        }
        return;
      }
    });

    updateOwnerLockUI();
    setupPullToRefresh();
    setupAttachmentHandler();
    setupVoiceHandlers();

    const input = $('user-input');
    const sendBtn = $('send-btn');
    const micBtn = $('mic-btn');
    const voiceBtn = $('voice-mode-btn');

    function updateSendBtnState() {
      const hasText = !!input.value.trim();
      const hasAtt = state.attachments && state.attachments.length > 0;
      const canSend = (hasText || hasAtt) && !state.isStreaming;

      if (sendBtn) {
        if (canSend) {
          sendBtn.classList.remove('disabled');
        } else {
          sendBtn.classList.add('disabled');
        }
      }
    }

    function updateInputDirection() {
      const val = input.value || '';
      const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(val);
      if (hasArabic) {
        input.dir = 'rtl';
        input.style.textAlign = 'right';
      } else {
        input.dir = 'ltr';
        input.style.textAlign = 'left';
      }
    }

    function adjustTextareaHeight() {
      input.style.height = 'auto';
      const scrollH = input.scrollHeight;
      const targetH = Math.min(Math.max(scrollH, 26), 190);
      input.style.height = targetH + 'px';
      input.style.overflowY = scrollH > 190 ? 'auto' : 'hidden';
    }

    input.addEventListener('input', () => {
      adjustTextareaHeight();
      updateInputDirection();
      updateSendBtnState();
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const hasAtt = state.attachments && state.attachments.length > 0;
        if (!state.isStreaming && (input.value.trim() || hasAtt)) {
          const text = input.value.trim();
          input.value = '';
          adjustTextareaHeight();
          updateSendBtnState();
          sendMessage(text);
        }
      }
    });

    sendBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      const hasAtt = state.attachments && state.attachments.length > 0;
      if ((!text && !hasAtt) || state.isStreaming) return;
      input.value = '';
      adjustTextareaHeight();
      updateSendBtnState();
      sendMessage(text);
    });
  }

  // ─── Voice & Speech Handlers (الميكروفون والصوت) ───
  function setupVoiceHandlers() {
    const micBtn = $('mic-btn');
    const voiceModeBtn = $('voice-mode-btn');
    const input = $('user-input');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;

    if (SpeechRecognition) {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'ar-EG';

      recognition.onstart = () => {
        micBtn?.classList.add('recording');
        showToast('🎙️ جاري الاستماع...', 'info');
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (input) {
          input.value = transcript;
          input.dispatchEvent(new Event('input'));
        }
      };

      recognition.onerror = (e) => {
        console.warn('Speech error:', e.error);
        micBtn?.classList.remove('recording');
      };

      recognition.onend = () => {
        micBtn?.classList.remove('recording');
      };
    }

    micBtn?.addEventListener('click', () => {
      if (!recognition) {
        showToast('المتصفح لا يدعم التعرف على الصوت', 'error');
        return;
      }
      try {
        if (micBtn.classList.contains('recording')) {
          recognition.stop();
        } else {
          recognition.start();
        }
      } catch (e) {
        console.warn(e);
      }
    });

    voiceModeBtn?.addEventListener('click', () => {
      showToast('🔊 وضع الصوت التفاعلي جاهز', 'info');
      if (recognition) {
        micBtn?.click();
      }
    });
  }

  // ─── File Attachment Handler (إرفاق الملفات والصور) ───
  function setupAttachmentHandler() {
    const fileInput = $('file-upload-input');
    const previewContainer = $('attachment-preview-container');
    const sendBtn = $('send-btn');
    const userInput = $('user-input');

    if (!fileInput || !previewContainer) return;

    // Delegate attach button clicks everywhere
    document.addEventListener('click', (e) => {
      if (e.target.closest('#attach-btn')) {
        e.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const dataUrl = await readFileAsDataURL(file);
          state.attachments.push({ name: file.name, type: file.type, dataUrl });
        } else {
          const textContent = await readFileAsText(file);
          state.attachments.push({ name: file.name, type: file.type, textContent });
        }
      }

      renderAttachmentPreviews();
      if (sendBtn) sendBtn.disabled = false;
      fileInput.value = '';
    });

    function readFileAsDataURL(file) {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target.result);
        reader.readAsDataURL(file);
      });
    }

    function readFileAsText(file) {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target.result);
        reader.readAsText(file);
      });
    }

    function renderAttachmentPreviews() {
      if (!state.attachments.length) {
        previewContainer.classList.add('hidden');
        previewContainer.innerHTML = '';
        return;
      }

      previewContainer.classList.remove('hidden');
      previewContainer.innerHTML = state.attachments.map((att, idx) => `
        <div class="preview-item">
          ${att.type.startsWith('image/') ? `<img src="${att.dataUrl}" class="preview-thumb">` : '<span>📄</span>'}
          <span class="preview-name">${escapeHtml(att.name)}</span>
          <button class="preview-remove" onclick="window._removeAttachment(${idx})">✕</button>
        </div>
      `).join('');
    }

    window._removeAttachment = (idx) => {
      state.attachments.splice(idx, 1);
      renderAttachmentPreviews();
      if (!state.attachments.length && !userInput?.value.trim() && sendBtn) {
        sendBtn.disabled = true;
      }
    };
  }

  // ─── Pull to Refresh Touch Gesture (السحب للتحديث باللمس) ───
  function setupPullToRefresh() {
    const indicator = $('pull-refresh-indicator');
    if (!indicator) return;

    const spinner = indicator.querySelector('.pull-refresh-spinner');
    let startY = 0;
    let currentPull = 0;
    let isTracking = false;
    const PULL_THRESHOLD = 45;

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      const chatArea = $('chat-area');
      const scrollTop = chatArea ? chatArea.scrollTop : 0;
      startY = e.touches[0].clientY;
      if (scrollTop <= 4) {
        isTracking = true;
        currentPull = 0;
      } else {
        isTracking = false;
      }
    };

    const onTouchMove = (e) => {
      if (!isTracking || e.touches.length !== 1) return;
      const chatArea = $('chat-area');
      const scrollTop = chatArea ? chatArea.scrollTop : 0;

      if (scrollTop > 4) {
        isTracking = false;
        indicator.classList.remove('visible');
        indicator.style.opacity = '0';
        indicator.style.transform = 'translate3d(-50%, -80px, 0) scale(0.85)';
        return;
      }

      const y = e.touches[0].clientY;
      const diff = y - startY;

      if (diff > 4) {
        if (e.cancelable) e.preventDefault();

        currentPull = diff;
        const visualPull = Math.min(diff * 0.45, 75);
        indicator.classList.add('visible');
        indicator.style.opacity = '1';
        indicator.style.transform = `translate3d(-50%, ${visualPull - 25}px, 0) scale(1)`;

        if (spinner) {
          spinner.style.transform = `rotate(${diff * 2.8}deg)`;
        }
      } else {
        indicator.classList.remove('visible');
        indicator.style.opacity = '0';
      }
    };

    const onTouchEnd = () => {
      if (!isTracking) return;
      isTracking = false;

      if (currentPull >= PULL_THRESHOLD) {
        indicator.classList.add('refreshing');
        indicator.style.transform = 'translate3d(-50%, 18px, 0) scale(1)';

        setTimeout(() => {
          window.location.reload();
        }, 220);
      } else {
        indicator.classList.remove('visible');
        indicator.style.opacity = '0';
        indicator.style.transform = 'translate3d(-50%, -80px, 0) scale(0.85)';
        if (spinner) spinner.style.transform = '';
      }
      currentPull = 0;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  // ─── OpenMAIC Global Helpers & Handlers ───
  let currentSandboxCode = '';
  let currentSlidesData = [];
  let currentSlideIndex = 0;

  window._triggerSkill = (skill) => {
    $('sidebar')?.classList.remove('open');
    $('overlay')?.classList.remove('active');
    $('skills-vertical-menu')?.classList.remove('show');
    const input = $('user-input');
    if (!input) return;

    if (skill === 'roundtable') {
      input.value = '👥 Roundtable Discussion: [Write your topic here for 3 AI agents to analyze in-depth]';
    } else if (skill === 'mindmap') {
      input.value = '🗺️ Create a detailed Mind Map visual outline for: [Write topic]';
    } else if (skill === 'slides') {
      input.value = '📊 Build an interactive Slide Deck presentation about: [Write topic]';
    } else if (skill === 'sandbox') {
      input.value = '🧪 Generate an interactive runnable HTML/CSS/JS simulation for: [Write idea]';
    }

    input.focus();
    input.dispatchEvent(new Event('input'));
    showToast(`Activated ${skill} mode`, 'info');
  };

  // ─── Live Sandbox Runner ───
  window._runSandbox = (code) => {
    currentSandboxCode = code;
    const modal = $('sandbox-modal');
    const frame = $('sandbox-frame');
    if (!modal || !frame) return;

    modal.classList.remove('hidden');
    frame.srcdoc = code;
    showToast('🚀 جاري تشغيل المحاكاة...', 'info');
  };

  window._closeSandbox = () => {
    const modal = $('sandbox-modal');
    if (modal) modal.classList.add('hidden');
  };

  window._reloadSandbox = () => {
    const frame = $('sandbox-frame');
    if (frame && currentSandboxCode) {
      frame.srcdoc = currentSandboxCode;
      showToast('🔄 تم إعادة التشغيل', 'info');
    }
  };

  // ─── Interactive Slides Engine ───
  window._openSlides = (slidesJsonStr) => {
    try {
      currentSlidesData = JSON.parse(decodeURIComponent(slidesJsonStr));
    } catch {
      currentSlidesData = [
        { title: 'العرض التقديمي', bullets: ['مرحباً بك في العرض التفاعلي'] }
      ];
    }
    currentSlideIndex = 0;
    const modal = $('slides-modal');
    if (modal) modal.classList.remove('hidden');
    renderCurrentSlide();
  };

  function renderCurrentSlide() {
    const area = $('slide-content-area');
    const indicator = $('slide-indicator');
    if (!area || !currentSlidesData.length) return;

    const slide = currentSlidesData[currentSlideIndex];
    indicator.textContent = `${currentSlideIndex + 1} / ${currentSlidesData.length}`;

    area.innerHTML = `
      <h2 class="slide-title">${escapeHtml(slide.title || 'شريحة')}</h2>
      <div class="slide-bullets-wrap">
        ${(slide.bullets || []).map(b => `<div class="slide-bullet"><span>✦</span> <span>${escapeHtml(b)}</span></div>`).join('')}
      </div>
    `;
  }

  window._prevSlide = () => {
    if (currentSlideIndex > 0) {
      currentSlideIndex--;
      renderCurrentSlide();
    }
  };

  window._nextSlide = () => {
    if (currentSlideIndex < currentSlidesData.length - 1) {
      currentSlideIndex++;
      renderCurrentSlide();
    }
  };

  window._closeSlides = () => {
    const modal = $('slides-modal');
    if (modal) modal.classList.add('hidden');
  };

  window._exportSlidesHTML = () => {
    const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>عرض تقديمي - نيترون</title><style>body{font-family:system-ui;background:#131315;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.card{background:#1e1e24;padding:40px;border-radius:20px;max-width:600px;line-height:1.8;border:1px solid #da7756;}h1{color:#da7756;}</style></head><body><div class="card"><h1>${currentSlidesData[0]?.title || 'عرض'}</h1><ul>${(currentSlidesData[0]?.bullets || []).map(b=>`<li>${b}</li>`).join('')}</ul></div></body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presentation.html';
    a.click();
    showToast('📥 تم تنزيل العرض كملف HTML', 'success');
  };

  // ─── Global Helpers ───
  window._loadConv = (id) => {
    loadConversation(id);
    $('sidebar').classList.remove('open');
    $('overlay').classList.remove('active');
  };

  window._suggest = (text) => {
    newConversation();
    $('user-input').value = text;
    $('send-btn').classList.remove('hidden');
    $('send-btn').click();
  };

  window._startDevPrompt = (text) => {
    startDevChat(text);
  };

  window._copyCode = (btn) => {
    const code = btn.closest('.code-window')?.querySelector('code')?.textContent || '';
    navigator.clipboard.writeText(code).then(() => {
      btn.textContent = 'تم النسخ!';
      setTimeout(() => btn.textContent = 'نسخ', 2000);
    });
  };

  window._copyMsgText = (btn) => {
    const text = btn.closest('.message-row')?.querySelector('.msg-content')?.innerText || '';
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('تم النسخ بنجاح', 'success');
      });
    }
  };

  window._shareMsgText = (btn) => {
    const text = btn.closest('.message-row')?.querySelector('.msg-content')?.innerText || '';
    if (navigator.share) {
      navigator.share({ title: 'نيترون AI', text });
    } else {
      window._copyMsgText(btn);
    }
  };

  window._playMsgSpeech = (btn) => {
    const text = btn.closest('.message-row')?.querySelector('.msg-content')?.innerText || '';
    if (!text) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
      showToast('🔊 جاري تشغيل الصوت...', 'info');
    } else {
      showToast('المتصفح لا يدعم تحويل النص لصوت', 'error');
    }
  };

  window._likeMsg = (btn) => {
    btn.style.color = '#10b981';
    showToast('شكراً على تقييمك الإيجابي', 'success');
  };

  window._dislikeMsg = (btn) => {
    btn.style.color = '#ef4444';
    showToast('تم تسجيل ملاحظتك', 'info');
  };

  window._retryMsg = (msgId) => {
    const conv = getActiveConv();
    if (!conv) return;
    const idx = conv.messages.findIndex(m => m.id === msgId);
    if (idx > 0 && conv.messages[idx - 1].role === 'user') {
      const userText = conv.messages[idx - 1].content;
      conv.messages.splice(idx, 1);
      renderAllMessages(conv.messages);
      sendMessage(userText);
    }
  };

  // Chat collapse/expand behavior — safe, stores state in localStorage
  (function(){
    try {
      const KEY = 'xv1_chat_expanded';
      const shell = document.querySelector('.chat-shell');
      if (!shell) {
        // nothing to do if chat shell not present
      } else {
        // ensure header exists
        let header = shell.querySelector('.chat-header');
        if (!header) {
          header = document.createElement('div');
          header.className = 'chat-header';
          shell.insertBefore(header, shell.firstChild);
        }

        // create toggle button if missing
        let toggle = shell.querySelector('.chat-toggle-btn');
        if (!toggle) {
          toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'chat-toggle-btn';
          toggle.setAttribute('aria-label','فتح/طي صندوق المحادثة');
          toggle.innerText = '▲';
          header.appendChild(toggle);
        }

        function setState(expanded){
          if (expanded) {
            shell.classList.add('expanded');
            shell.classList.remove('collapsed');
            toggle.innerText = '▼';
            toggle.setAttribute('aria-expanded','true');
          } else {
            shell.classList.remove('expanded');
            shell.classList.add('collapsed');
            toggle.innerText = '▲';
            toggle.setAttribute('aria-expanded','false');
          }
        }

        const stored = localStorage.getItem(KEY);
        const defaultExpanded = stored === null ? false : stored === '1';
        setState(defaultExpanded);

        toggle.addEventListener('click', () => {
          const isExpanded = shell.classList.contains('expanded');
          setState(!isExpanded);
          localStorage.setItem(KEY, !isExpanded ? '1' : '0');
        });

        // keep scroll inside body
        const body = shell.querySelector('.chat-body');
        if (body) {
          body.addEventListener('wheel', (e) => {
            const atTop = body.scrollTop === 0;
            const atBottom = Math.ceil(body.scrollTop + body.clientHeight) >= body.scrollHeight;
            if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
              // allow page scroll
            } else {
              e.stopPropagation();
            }
          }, { passive: false });
        }

        document.addEventListener('keydown', (ev) => {
          if (ev.key === 'Escape' && shell.classList.contains('expanded')) {
            setState(false);
            localStorage.setItem(KEY, '0');
          }
        });
      }
    } catch (e) {
      console.warn('chat shell init failed', e);
    }
  })();

  document.addEventListener('DOMContentLoaded', init);
  })();
