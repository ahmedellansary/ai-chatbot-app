// ═════════════════════════════════════════════════════════════════
//  X.v1 CHATBOT — Unified Core Engine (Senior Architectural Refactor)
// ═════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────
  // 1. CONFIG & CREDENTIALS VAULT
  // ─────────────────────────────────────────────────────────────────
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
    OPENROUTER_API_KEY: _k1,
    GROQ_KEYS: _k2,
    GITHUB_TOKEN: _k3
  };

  const ConfigVault = {
    getOpenRouterKey() {
      const k = (window.AppConfig && window.AppConfig.getOpenRouterKey && window.AppConfig.getOpenRouterKey()) ||
                localStorage.getItem('OPENROUTER_API_KEY');
      return (k && k.trim()) ? k.trim() : DEFAULTS.OPENROUTER_API_KEY;
    },

    getGroqKeys() {
      const k = (window.AppConfig && window.AppConfig.getGroqKeys && window.AppConfig.getGroqKeys()) ||
                localStorage.getItem('GROQ_API_KEY');
      if (Array.isArray(k) && k.length) return k;
      if (typeof k === 'string' && k.trim()) return k.split(',').map(s => s.trim()).filter(Boolean);
      return DEFAULTS.GROQ_KEYS.split(',');
    },

    _groqIdx: 0,
    getGroqKey() {
      const keys = this.getGroqKeys();
      return keys[this._groqIdx % keys.length];
    },

    rotateGroqKey() {
      this._groqIdx++;
    },

    getGitHubToken() {
      const k = (window.AppConfig && window.AppConfig.getGitHubToken && window.AppConfig.getGitHubToken()) ||
                localStorage.getItem('GITHUB_TOKEN');
      return (k && k.trim()) ? k.trim() : DEFAULTS.GITHUB_TOKEN;
    },

    getGitHubHeaders() {
      return {
        'Authorization': `Bearer ${this.getGitHubToken()}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'X.v1-ChatBot-App'
      };
    }
  };

  const GITHUB_USER   = 'ahmedellansary';
  const GITHUB_REPO   = 'ai-chatbot-app';
  const GITHUB_BRANCH = 'main';
  const GITHUB_API    = 'https://api.github.com';

  // ─────────────────────────────────────────────────────────────────
  // 2. AUTHENTICATION & SECURITY (AuthManager)
  // ─────────────────────────────────────────────────────────────────
  const MASTER_AUTH_RECORD = 'cf53ff6bb81c1371f0652dc895f70385:47006d30af3e6fec76cf57808b47d841a0e6e788f1da7d8a3650bb14cf3166e5';

  const AuthManager = {
    async hashWithSalt(password, salt) {
      const encoder = new TextEncoder();
      const data = encoder.encode(`${salt}:${password}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async verify(password) {
      if (!MASTER_AUTH_RECORD || !MASTER_AUTH_RECORD.includes(':')) return false;
      const [salt, expectedHash] = MASTER_AUTH_RECORD.split(':');
      const computedHash = await this.hashWithSalt(password, salt);
      return computedHash === expectedHash;
    },

    isUnlocked() {
      try {
        return sessionStorage.getItem('xv1_authenticated') === 'true' ||
               localStorage.getItem('owner_unlocked') === '1' ||
               localStorage.getItem('nytron_app_unlocked') === '1';
      } catch {
        return false;
      }
    },

    unlock() {
      sessionStorage.setItem('xv1_authenticated', 'true');
      localStorage.removeItem('nytron_app_unlocked');
      localStorage.removeItem('claude_app_unlocked');
      localStorage.removeItem('owner_unlocked');
    },

    lock() {
      sessionStorage.removeItem('xv1_authenticated');
      localStorage.removeItem('nytron_app_unlocked');
      localStorage.removeItem('owner_unlocked');
      this.setupGate();
    },

    setupGate() {
      const gate = $('app-lock-gate');
      const form = $('lock-gate-form');
      const pinInput = $('gate-pin-input');
      if (!gate) return;

      if (!this.isUnlocked()) {
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
          MessageRenderer.showToast('يرجى كتابة كلمة السر', 'warning');
          return;
        }

        isVerifying = true;
        try {
          const isValid = await this.verify(password);
          if (isValid) {
            this.unlock();
            gate.classList.add('hidden');
            MessageRenderer.showToast('🔐 تم فتح التطبيق بنجاح! مرحباً بك.', 'success');
          } else {
            MessageRenderer.showToast('❌ كلمة السر غير صحيحة!', 'error');
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

      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          handleGateSubmit();
        };
      }
    },

    requireAuth(onSuccess) {
      if (this.isUnlocked()) {
        if (typeof onSuccess === 'function') onSuccess();
        return;
      }
      this.setupGate();
    }
  };

  // Safe global aliases for compatibility
  function isAppUnlocked() { return AuthManager.isUnlocked(); }
  function isOwnerUnlocked() { return AuthManager.isUnlocked(); }
  function updateOwnerLockUI() {}
  function promptOwnerAuth(cb) { AuthManager.requireAuth(cb); }
  function setupAppLockGate() { AuthManager.setupGate(); }

  // ─────────────────────────────────────────────────────────────────
  // 3. STATE & PERSISTENCE CONTROLLER (StateController)
  // ─────────────────────────────────────────────────────────────────
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

  const StateController = {
    load() {
      try {
        const saved = localStorage.getItem('conversations');
        if (saved) {
          state.conversations = JSON.parse(saved);
        }
      } catch (e) {
        console.warn('[State] Failed to load conversations', e);
        state.conversations = [];
      }
    },

    save() {
      try {
        localStorage.setItem('conversations', JSON.stringify(state.conversations));
      } catch (e) {
        console.warn('[State] Failed to save conversations', e);
      }
    },

    getActiveConv() {
      return state.conversations.find(c => c.id === state.activeConvId);
    },

    newConversation() {
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
      this.save();
      this.loadConversation(id);
      UIEngine.renderConversationsList();
      return conv;
    },

    loadConversation(id) {
      const conv = state.conversations.find(c => c.id === id);
      if (!conv) return;

      state.activeConvId = id;
      state.currentMode = conv.mode || state.currentMode;
      this.save();
      MessageRenderer.renderAllMessages(conv.messages);
      UIEngine.renderConversationsList();
      UIEngine.updateHeaderUI();
      UIEngine.updateSendBtnState();
      UIEngine.closeSidebar();
    },

    addMessage(role, content, modelInfo = null, attachments = []) {
      const conv = this.getActiveConv();
      if (!conv) return null;

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
        UIEngine.renderConversationsList();
      }

      this.save();
      return msg;
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 4. MODEL ENGINE & INTELLIGENT ROUTER (ModelEngine)
  // ─────────────────────────────────────────────────────────────────
  const MODELS = {
    HIGH: [
      { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 550B', provider: 'openrouter' },
      { id: 'minimax/minimax-m3:free', name: 'MiniMax M3', provider: 'openrouter' },
      { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', provider: 'groq' }
    ],
    MID: [
      { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 120B', provider: 'openrouter' },
      { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', provider: 'groq' },
      { id: 'qwen/qwen3.8-27b', name: 'Qwen 27B', provider: 'groq' }
    ],
    FAST: [
      { id: 'groq/compound', name: 'Groq Compound', provider: 'groq' },
      { id: 'qwen/qwen3.8-27b', name: 'Qwen 27B', provider: 'groq' }
    ]
  };

  const ModelEngine = {
    normalizeCatalog(data) {
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
    },

    getAvailableModels() {
      const flat = state.modelCatalog.length ? state.modelCatalog : this.normalizeCatalog(MODELS);
      const seen = new Set();
      return flat.filter(m => {
        const key = `${m.provider}:${m.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },

    getSelectedDevModel() {
      const models = this.getAvailableModels();
      if (!models.length) return null;
      const key = state.devModelKey || `${models[0].provider}:${models[0].id}`;
      const selected = models.find(m => `${m.provider}:${m.id}` === key) || models[0];
      state.devModelKey = `${selected.provider}:${selected.id}`;
      return selected;
    },

    async callOpenRouter(model, messages, signal) {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ConfigVault.getOpenRouterKey()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'X.v1 AI Chat'
        },
        body: JSON.stringify({
          model: model.id,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 8192
        }),
        signal
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }
      return response;
    },

    async callGroq(model, messages, signal) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ConfigVault.getGroqKey()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model.id,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 8192
        }),
        signal
      });

      if (response.status === 429) {
        ConfigVault.rotateGroqKey();
        throw new Error('RATE_LIMIT');
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }
      return response;
    },

    async* readStream(response) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let tokensEmitted = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              try {
                const obj = JSON.parse(trimmed);
                if (obj.error) throw new Error(obj.error.message || 'API stream error');
              } catch (e) {
                if (e.message && !e.message.includes('JSON')) throw e;
              }
            }
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') return;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error.message || 'Stream payload error');
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                yield delta;
                tokensEmitted++;
              }
            } catch (e) {
              if (e.message && !e.message.includes('JSON')) throw e;
            }
          }
        }
        if (tokensEmitted === 0 && buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer.trim());
            if (parsed.error) throw new Error(parsed.error.message || 'Stream payload error');
            const content = parsed.choices?.[0]?.message?.content;
            if (content) yield content;
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      } finally {
        reader.releaseLock();
      }
    },

    async* runSingleModel(model, messages, signal, onModelChange) {
      onModelChange?.(model, false);
      try {
        const response = model.provider === 'groq'
          ? await this.callGroq(model, messages, signal)
          : await this.callOpenRouter(model, messages, signal);

        for await (const chunk of this.readStream(response)) {
          yield { chunk, model, usedFallback: false };
        }
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.warn(`[Single Model] ${model.name} failed:`, err.message);
        throw new Error(`تعذر الاتصال بالموديل المحدد (${model.name}). يرجى المحاولة لاحقاً.`);
      }
    },

    async* chatWithFallback(tier, messages, signal, onModelChange) {
      const models = MODELS[tier] || MODELS.MID;
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
            ? await this.callGroq(model, messages, signal)
            : await this.callOpenRouter(model, messages, signal);

          for await (const chunk of this.readStream(response)) {
            yield { chunk, model, usedFallback };
          }
          return;
        } catch (err) {
          if (err.name === 'AbortError') throw err;
          console.warn(`[Model Fallback] ${model.name} failed:`, err.message);

          if (err.message === 'RATE_LIMIT' && model.provider === 'groq') {
            try {
              const response = await this.callGroq(model, messages, signal);
              for await (const chunk of this.readStream(response)) {
                yield { chunk, model, usedFallback };
              }
              return;
            } catch {}
          }
        }
      }

      throw new Error(`تعذر الاتصال بموديلز ${tier}. يرجى المحاولة مرة أخرى أو اختيار وضع آخر.`);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 5. GITHUB & SELF-MODIFYING DEV SERVICE (GitHubService)
  // ─────────────────────────────────────────────────────────────────
  const GitHubService = {
    utf8ToBase64(str) {
      const bytes = new TextEncoder().encode(str);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    },

    base64ToUtf8(b64) {
      const binary = atob(b64.replace(/\s/g, ''));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    },

    async getFileSHA(path) {
      try {
        const res = await fetch(
          `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}&t=${Date.now()}`,
          { headers: ConfigVault.getGitHubHeaders() }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data.sha;
      } catch {
        return null;
      }
    },

    async uploadFile(path, content, message = 'Update from App') {
      const sha = await this.getFileSHA(path);
      const encoded = this.utf8ToBase64(content);

      const body = {
        message,
        content: encoded,
        branch: GITHUB_BRANCH
      };
      if (sha) body.sha = sha;

      const res = await fetch(
        `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`,
        {
          method: 'PUT',
          headers: ConfigVault.getGitHubHeaders(),
          body: JSON.stringify(body)
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'فشل رفع الملف إلى GitHub');
      }
      return await res.json();
    },

    async getLatestCommits(limit = 10) {
      const res = await fetch(
        `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/commits?per_page=${limit}&t=${Date.now()}`,
        { headers: ConfigVault.getGitHubHeaders() }
      );
      if (!res.ok) throw new Error('فشل جلب سجل النسخ من GitHub');
      return await res.json();
    },

    async rollbackToPreviousCommit() {
      MessageRenderer.showToast('🔄 جاري البحث عن آخر نسخة مستقرة...', 'info');
      try {
        const commits = await this.getLatestCommits(5);
        if (commits.length < 2) throw new Error('لا توجد نسخ سابقة للاسترجاع');

        const prevCommit = commits[1];
        const prevSHA = prevCommit.sha;

        MessageRenderer.showToast(`⏪ جاري استرجاع النسخة (${prevSHA.slice(0, 7)})...`, 'info');

        const filesToRestore = ['index.html', 'style.css', 'app.js'];
        for (const file of filesToRestore) {
          const fileRes = await fetch(
            `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${file}?ref=${prevSHA}`,
            { headers: ConfigVault.getGitHubHeaders() }
          );
          if (fileRes.ok) {
            const fileData = await fileRes.json();
            const content = this.base64ToUtf8(fileData.content);
            await this.uploadFile(file, content, `⏪ Emergency Rollback to ${prevSHA.slice(0, 7)}`);
          }
        }

        MessageRenderer.showToast('✅ تم استرجاع النسخة بنجاح! جاري التحديث...', 'success');
        setTimeout(() => location.reload(), 1500);
      } catch (e) {
        MessageRenderer.showToast('❌ خطأ أثناء الاسترجاع: ' + e.message, 'error');
      }
    },

    applyRuntimePatch(file, content) {
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
  };

  // ─────────────────────────────────────────────────────────────────
  // 6. MARKDOWN & UI MESSAGE RENDERER (MessageRenderer)
  // ─────────────────────────────────────────────────────────────────
  const MessageRenderer = {
    escapeHtml(text) {
      return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },

    safeSelectorId(id) {
      const value = String(id ?? '');
      if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(value);
      }
      return value.replace(/([\\"'\s:#.\[\]\(\)])/g, '\\$1');
    },

    showToast(message, type = 'info') {
      const container = $('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3200);
    },

    scrollToBottom() {
      const chatArea = $('chat-area');
      if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
    },

    parseMarkdown(text) {
      if (!text) return '';
      let html = this.escapeHtml(text);

      // Fenced code blocks
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
    },

    createMessageRow(msg) {
      const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(msg.content || '');
      const row = document.createElement('div');
      row.className = `message-row ${msg.role} ${hasArabic ? 'is-rtl' : 'is-ltr'}`;
      row.dataset.id = msg.id;

      const parsed = msg.role === 'ai' ? this.parseMarkdown(msg.content) : this.escapeHtml(msg.content);
      const dirAttr = hasArabic ? 'dir="rtl" style="text-align: right;"' : 'dir="ltr" style="text-align: left;"';

      let attachmentsHtml = '';
      if (msg.attachments && msg.attachments.length > 0) {
        attachmentsHtml = '<div class="msg-attachments-wrap" style="margin-top:6px;">' + msg.attachments.map(att => {
          if (att.type.startsWith('image/')) {
            return `<img src="${att.dataUrl}" class="msg-attachment-img" alt="${this.escapeHtml(att.name)}">`;
          } else {
            return `<div class="preview-item" style="margin-top:4px;"><span class="preview-name">📄 ${this.escapeHtml(att.name)}</span></div>`;
          }
        }).join('') + '</div>';
      }

      if (msg.role === 'user') {
        row.innerHTML = `<div class="msg-content" ${dirAttr}>${parsed}${attachmentsHtml}</div>`;
      } else {
        row.innerHTML = `
          <div class="msg-content" ${dirAttr}>
            ${parsed}
            ${attachmentsHtml}
          </div>
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
          <div class="claude-footer-note">
            <div class="claude-terracotta-star">✦</div>
            <div class="claude-disclaimer-text">
              <span class="claude-model-name">${this.escapeHtml(msg.model || 'X.v1')}</span>
              <span>· Verify info</span>
            </div>
          </div>
        `;
      }
      return row;
    },

    renderAllMessages(messages) {
      const container = $('chat-container');
      if (!container) return;
      if (!messages || messages.length === 0) {
        UIEngine.showWelcomeScreen();
        return;
      }
      container.innerHTML = '';
      messages.forEach(msg => container.appendChild(this.createMessageRow(msg)));
    },

    appendMessage(msg) {
      const container = $('chat-container');
      if (!container || !msg) return;
      const welcome = container.querySelector('.welcome-screen');
      if (welcome) container.innerHTML = '';

      const existingRow = container.querySelector(`.message-row[data-id="${this.safeSelectorId(msg.id || '')}"]`);
      if (existingRow) {
        existingRow.replaceWith(this.createMessageRow(msg));
      } else {
        container.appendChild(this.createMessageRow(msg));
      }
      this.scrollToBottom();
    },

    _thinkingTimer: null,
    showTyping(initialText = 'Analyzing...') {
      const container = $('chat-container');
      if (!container) return;

      let typing = $('typing-indicator');
      if (!typing) {
        typing = document.createElement('div');
        typing.id = 'typing-indicator';
        typing.className = 'message-row ai typing-indicator';
        typing.innerHTML = `
          <div class="typing-bubble">
            <span class="typing-icon">✦</span>
            <span id="thinking-word" class="thinking-word">${this.escapeHtml(initialText)}</span>
          </div>
        `;
        container.appendChild(typing);
      } else {
        const wordEl = document.getElementById('thinking-word');
        if (wordEl) wordEl.textContent = initialText;
      }
      this.scrollToBottom();
    },

    setThinkingStage(text) {
      const wordEl = document.getElementById('thinking-word');
      if (wordEl) {
        wordEl.textContent = text;
        this.scrollToBottom();
      }
    },

    hideTyping() {
      if (this._thinkingTimer) {
        clearTimeout(this._thinkingTimer);
        this._thinkingTimer = null;
      }
      $('typing-indicator')?.remove();
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 7. CHAT CONTROLLER & STREAM ORCHESTRATOR (ChatEngine)
  // ─────────────────────────────────────────────────────────────────
  const ChatEngine = {
    preparePayload(userText) {
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

      return { textForPayload, currentAttachments };
    },

    buildSystemPrompt() {
      return state.systemPrompt;
    },

    async sendMessage(userText) {
      const hasAttachments = state.attachments && state.attachments.length > 0;
      if (state.isStreaming || (!userText.trim() && !hasAttachments)) return;

      if (!state.activeConvId) StateController.newConversation();
      const conv = StateController.getActiveConv();

      const { textForPayload, currentAttachments } = this.preparePayload(userText);

      // Clear previews & state
      state.attachments = [];
      const previewContainer = $('attachment-preview-container');
      if (previewContainer) {
        previewContainer.classList.add('hidden');
        previewContainer.innerHTML = '';
      }

      const userMsg = StateController.addMessage('user', userText.trim() || 'ملف مرفق', null, currentAttachments);
      MessageRenderer.appendMessage(userMsg);

      state.isStreaming = true;
      state.abortController = new AbortController();

      const systemPromptForCall = this.buildSystemPrompt();
      const recentMessages = conv.messages
        .filter(m => m.id !== userMsg.id)
        .slice(-8);

      const apiMessages = [
        { role: 'system', content: systemPromptForCall },
        ...recentMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
        { role: 'user', content: textForPayload }
      ];

      let fullContent = '';
      const aiMsgId = generateId();
      const aiMsgObj = {
        id: aiMsgId,
        role: 'ai',
        content: '',
        model: null,
        usedFallback: false,
        timestamp: new Date().toISOString()
      };
      conv.messages.push(aiMsgObj);

      MessageRenderer.showTyping('Analyzing...');

      const onModelEvent = (model, isFallback) => {
        aiMsgObj.model = model.name;
        aiMsgObj.usedFallback = isFallback;

        const connectText = isFallback ? `Switching to ${model.name}...` : `Connecting to ${model.name}...`;
        MessageRenderer.setThinkingStage(connectText);

        if (MessageRenderer._thinkingTimer) clearTimeout(MessageRenderer._thinkingTimer);
        MessageRenderer._thinkingTimer = setTimeout(() => {
          MessageRenderer.setThinkingStage('Reasoning...');
        }, 550);
      };

      try {
        const stream = ModelEngine.chatWithFallback(state.currentMode, apiMessages, state.abortController.signal, onModelEvent);

        let msgRow = null;
        for await (const { chunk, model, usedFallback } of stream) {
          fullContent += chunk;
          aiMsgObj.model = model.name;
          aiMsgObj.usedFallback = usedFallback;

          if (!msgRow) {
            MessageRenderer.hideTyping();
            MessageRenderer.appendMessage(aiMsgObj);
            msgRow = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
            const aiElem = document.querySelector(`[data-id="${aiMsgId}"]`);
            if (aiElem && typeof aiElem.scrollIntoView === 'function') {
              aiElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }

          if (msgRow) {
            msgRow.innerHTML = MessageRenderer.parseMarkdown(fullContent);
            const isAr = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(fullContent);
            const parentRow = document.querySelector(`[data-id="${aiMsgId}"]`);
            if (parentRow) {
              parentRow.classList.toggle('is-rtl', isAr);
              parentRow.classList.toggle('is-ltr', !isAr);
            }
            msgRow.setAttribute('dir', isAr ? 'rtl' : 'ltr');
            msgRow.style.textAlign = isAr ? 'right' : 'left';
          }
        }

        // Pre-response sanity check (MUST-ADD instruction enforcement)
        const sanity = MessageRenderer.preResponseSanity(fullContent);
        if (sanity.blocked) {
          const note = `⚠️ Output blocked by pre-response safety check: ${sanity.reason}. Provide clarification or attach required context.`;
          aiMsgObj.content = note;
          const errMsg = StateController.addMessage('ai', note);
          MessageRenderer.appendMessage(errMsg);
        } else {
          aiMsgObj.content = sanity.cleanedContent;
          StateController.save();
        }

      } catch (err) {
        MessageRenderer.hideTyping();
        if (err.name !== 'AbortError') {
          MessageRenderer.showToast('❌ ' + err.message, 'error');
          const errMsg = StateController.addMessage('ai', '⚠️ ' + err.message);
          MessageRenderer.appendMessage(errMsg);
        }
      } finally {
        MessageRenderer.hideTyping();
        state.isStreaming = false;
        state.abortController = null;
        UIEngine.updateSendBtnState();
        MessageRenderer.scrollToBottom();
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 8. SKILLS ENGINE & SANDBOX (SkillsEngine)
  // ─────────────────────────────────────────────────────────────────
  let currentSandboxCode = '';
  let currentSlidesData = [];
  let currentSlideIndex = 0;

  const SkillsEngine = {
    trigger(skill) {
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
      MessageRenderer.showToast(`Activated ${skill} mode`, 'info');
    },

    runSandbox(code) {
      currentSandboxCode = code;
      const modal = $('sandbox-modal');
      const frame = $('sandbox-frame');
      if (!modal || !frame) return;

      modal.classList.remove('hidden');
      frame.srcdoc = code;
      MessageRenderer.showToast('🚀 جاري تشغيل المحاكاة...', 'info');
    },

    closeSandbox() {
      const modal = $('sandbox-modal');
      if (modal) modal.classList.add('hidden');
    },

    reloadSandbox() {
      const frame = $('sandbox-frame');
      if (frame && currentSandboxCode) {
        frame.srcdoc = currentSandboxCode;
        MessageRenderer.showToast('🔄 تم إعادة التشغيل', 'info');
      }
    },

    openSlides(slidesJsonStr) {
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
      this.renderCurrentSlide();
    },

    renderCurrentSlide() {
      const area = $('slide-content-area');
      const indicator = $('slide-indicator');
      if (!area || !currentSlidesData.length) return;

      const slide = currentSlidesData[currentSlideIndex];
      if (indicator) indicator.textContent = `${currentSlideIndex + 1} / ${currentSlidesData.length}`;

      area.innerHTML = `
        <h2 class="slide-title">${MessageRenderer.escapeHtml(slide.title || 'شريحة')}</h2>
        <div class="slide-bullets-wrap">
          ${(slide.bullets || []).map(b => `<div class="slide-bullet"><span>✦</span> <span>${MessageRenderer.escapeHtml(b)}</span></div>`).join('')}
        </div>
      `;
    },

    prevSlide() {
      if (currentSlideIndex > 0) {
        currentSlideIndex--;
        this.renderCurrentSlide();
      }
    },

    nextSlide() {
      if (currentSlideIndex < currentSlidesData.length - 1) {
        currentSlideIndex++;
        this.renderCurrentSlide();
      }
    },

    closeSlides() {
      const modal = $('slides-modal');
      if (modal) modal.classList.add('hidden');
    },

    exportSlidesHTML() {
      const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>عرض تقديمي - X.v1</title><style>body{font-family:system-ui;background:#131315;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.card{background:#1e1e24;padding:40px;border-radius:20px;max-width:600px;line-height:1.8;border:1px solid #da7756;}h1{color:#da7756;}</style></head><body><div class="card"><h1>${currentSlidesData[0]?.title || 'عرض'}</h1><ul>${(currentSlidesData[0]?.bullets || []).map(b=>`<li>${b}</li>`).join('')}</ul></div></body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'presentation.html';
      a.click();
      MessageRenderer.showToast('📥 تم تنزيل العرض كملف HTML', 'success');
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 9. UI ENGINE & EVENT DISPATCHER (UIEngine)
  // ─────────────────────────────────────────────────────────────────
  const UIEngine = {
    ATTACH_ICON_SVG: `
      <svg class="attach-svg" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
      </svg>
    `,

    updateSendBtnState() {
      const inputEl = $('user-input');
      const btn = $('send-btn');
      if (!btn) return;
      const textVal = inputEl ? inputEl.value : '';
      const hasText = textVal.trim().length > 0;
      const hasAtt = Array.isArray(state.attachments) && state.attachments.length > 0;
      const canSend = (hasText || hasAtt) && !state.isStreaming;

      if (canSend) {
        btn.classList.add('active');
        btn.removeAttribute('disabled');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('disabled', 'true');
      }
    },

    updateInputDirection() {
      const inputEl = $('user-input');
      const val = inputEl ? inputEl.value : '';
      const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(val);
      if (inputEl) {
        if (hasArabic) {
          inputEl.dir = 'rtl';
          inputEl.style.textAlign = 'right';
        } else {
          inputEl.dir = 'ltr';
          inputEl.style.textAlign = 'left';
        }
      }
    },

    adjustTextareaHeight() {
      const inputEl = $('user-input');
      if (!inputEl) return;
      inputEl.style.height = 'auto';
      const scrollH = inputEl.scrollHeight;
      const targetH = Math.min(Math.max(scrollH, 26), 190);
      inputEl.style.height = targetH + 'px';
      inputEl.style.overflowY = scrollH > 190 ? 'auto' : 'hidden';
    },

    showWelcomeScreen() {
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
    },

    renderConversationsList() {
      const list = $('conversations-list');
      if (!list) return;
      list.innerHTML = state.conversations.map(conv => `
        <div class="conversation-item ${conv.id === state.activeConvId ? 'active' : ''}"
             onclick="window._loadConv('${conv.id}')">
          <span class="conv-title">${conv.isDev ? '🛠️ ' : ''}${MessageRenderer.escapeHtml(conv.title)}</span>
        </div>
      `).join('');
    },

    highlightActiveConv(id) {
      $$('.conversation-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('onclick')?.includes(id));
      });
    },

    buildDevModelOptions() {
      const models = ModelEngine.getAvailableModels();
      const selected = ModelEngine.getSelectedDevModel();
      const options = models.map(model => {
        const key = `${model.provider}:${model.id}`;
        const isSelected = selected && selected.provider === model.provider && selected.id === model.id;
        return `<option value="${key}" ${isSelected ? 'selected' : ''}>${model.name}</option>`;
      }).join('');

      return `
        <button class="attach-btn" id="attach-btn" title="إرفاق ملفات أو صور" aria-label="إرفاق">
          ${this.ATTACH_ICON_SVG}
        </button>
        <span class="mode-tag dev-mode-tag" style="color:#fbbf24; background:rgba(217,119,6,0.15);">وضع المطور</span>
        <select id="dev-model-select" class="dev-model-select" aria-label="اختيار موديل المطور">
          ${options}
        </select>
      `;
    },

    updateHeaderUI() {
      const conv = StateController.getActiveConv();
      const titleText = $('header-title-text');
      const dot = document.querySelector('.status-dot');
      const indicator = $('input-mode-indicator');

      if (conv?.isDev) {
        if (titleText) titleText.textContent = 'DEV';
        if (dot) dot.style.background = '#fbbf24';
        if (indicator) {
          indicator.innerHTML = this.buildDevModelOptions();
          const select = $('dev-model-select');
          select?.addEventListener('change', (e) => {
            state.devModelKey = e.target.value;
            const active = StateController.getActiveConv();
            if (active && active.isDev) {
              active.devModelKey = state.devModelKey;
              StateController.save();
            }
            MessageRenderer.showToast('تم اختيار موديل المطور', 'info');
          });
          $('attach-btn')?.addEventListener('click', () => $('file-upload-input')?.click());
        }
      } else {
        if (titleText) titleText.textContent = state.currentMode;
        if (dot) dot.style.background = '#10b981';
        if (indicator) {
          indicator.innerHTML = `
            <button class="attach-btn" id="attach-btn" title="إرفاق ملفات أو صور" aria-label="إرفاق">
              ${this.ATTACH_ICON_SVG}
            </button>
            <span class="mode-tag">الشات الطبيعي</span>
          `;
          $('attach-btn')?.addEventListener('click', () => $('file-upload-input')?.click());
        }
      }

      $$('.dropdown-opt').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === state.currentMode);
      });
    },

    setupEventListeners() {
      if (window.__chatListenersBound) return;
      window.__chatListenersBound = true;

      // Click Event Delegation
      document.addEventListener('click', (e) => {
        if (e.target.closest('#sidebar-toggle') || e.target.closest('#header-dots-btn')) {
          e.preventDefault();
          $('sidebar')?.classList.add('open');
          $('overlay')?.classList.add('active');
          return;
        }

        if (e.target.closest('#close-sidebar-btn')) {
          e.preventDefault();
          $('sidebar')?.classList.remove('open');
          $('overlay')?.classList.remove('active');
          return;
        }

        if (e.target.closest('#overlay')) {
          $('sidebar')?.classList.remove('open');
          $('model-dropdown-menu')?.classList.remove('show');
          $('overlay')?.classList.remove('active');
          return;
        }

        if (e.target.closest('#skills-menu-trigger')) {
          e.preventDefault();
          e.stopPropagation();
          $('skills-vertical-menu')?.classList.toggle('show');
          $('model-dropdown-menu')?.classList.remove('show');
          return;
        }

        if (!e.target.closest('#skills-vertical-menu')) {
          $('skills-vertical-menu')?.classList.remove('show');
        }

        if (e.target.closest('#model-pill-trigger')) {
          e.preventDefault();
          e.stopPropagation();
          $('model-dropdown-menu')?.classList.toggle('show');
          $('skills-vertical-menu')?.classList.remove('show');
          return;
        }

        const optBtn = e.target.closest('.dropdown-opt');
        if (optBtn) {
          e.preventDefault();
          state.currentMode = optBtn.dataset.mode || 'MID';
          $('model-dropdown-menu')?.classList.remove('show');
          this.updateHeaderUI();
          const conv = StateController.getActiveConv();
          if (conv) {
            conv.mode = state.currentMode;
            StateController.save();
          }
          MessageRenderer.showToast(`Switched to ${state.currentMode} mode`, 'info');
          return;
        }

        if (!e.target.closest('#model-dropdown-menu')) {
          $('model-dropdown-menu')?.classList.remove('show');
        }

        if (e.target.closest('#btn-new-chat') || e.target.closest('#header-new-chat-btn')) {
          e.preventDefault();
          StateController.newConversation();
          $('sidebar')?.classList.remove('open');
          $('overlay')?.classList.remove('active');
          return;
        }

        if (e.target.closest('#btn-dev-chat')) {
          e.preventDefault();
          StateController.startDevChat();
          $('sidebar')?.classList.remove('open');
          $('overlay')?.classList.remove('active');
          return;
        }

        if (e.target.closest('#btn-toggle-owner-lock')) {
          e.preventDefault();
          if (AuthManager.isUnlocked()) {
            AuthManager.lock();
            MessageRenderer.showToast('🔒 تم قفل التطبيق بنجاح', 'info');
            $('sidebar')?.classList.remove('open');
            $('overlay')?.classList.remove('active');
          } else {
            AuthManager.setupGate();
          }
          return;
        }
      });

      // Text Input Reactivity
      const input = $('user-input');
      const sendBtn = $('send-btn');

      const onInput = () => {
        this.adjustTextareaHeight();
        this.updateInputDirection();
        this.updateSendBtnState();
      };

      ['input', 'keyup', 'change', 'paste', 'cut'].forEach(evt => {
        input?.addEventListener(evt, onInput);
        document.addEventListener(evt, (e) => {
          if (e.target && e.target.id === 'user-input') onInput();
        });
      });

      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          // Enter creates a newline naturally without sending
          setTimeout(() => this.adjustTextareaHeight(), 10);
        }
      });

      sendBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        const text = input ? input.value.trim() : '';
        const hasAtt = state.attachments && state.attachments.length > 0;
        if ((!text && !hasAtt) || state.isStreaming) return;
        if (input) input.value = '';
        this.adjustTextareaHeight();
        this.updateSendBtnState();
        ChatEngine.sendMessage(text);
      });

      this.setupPullToRefresh();
      this.setupAttachmentHandler();
      this.setupVoiceHandlers();
      this.setupEmergencyControls();
      this.updateSendBtnState();
    },

    setupPullToRefresh() {
      const indicator = $('pull-refresh-indicator');
      if (!indicator) return;

      const spinner = indicator.querySelector('.pull-refresh-spinner');
      let startY = 0;
      let currentPull = 0;
      let isTracking = false;
      let isAtTop = false;
      let isAtBottom = false;
      let pullDirection = null;
      const PULL_THRESHOLD = 45;

      const onTouchStart = (e) => {
        if (e.touches.length !== 1) return;
        const chatArea = $('chat-area');
        if (!chatArea) return;
        const scrollTop = chatArea.scrollTop;
        const scrollHeight = chatArea.scrollHeight;
        const clientHeight = chatArea.clientHeight;

        startY = e.touches[0].clientY;
        isAtTop = (scrollTop <= 4);
        isAtBottom = (scrollTop + clientHeight >= scrollHeight - 6);
        isTracking = (isAtTop || isAtBottom);
        pullDirection = null;
        currentPull = 0;
      };

      const onTouchMove = (e) => {
        if (!isTracking || e.touches.length !== 1) return;
        const y = e.touches[0].clientY;
        const diff = y - startY;

        if (isAtTop && diff > 4 && (!pullDirection || pullDirection === 'top')) {
          pullDirection = 'top';
          if (e.cancelable) e.preventDefault();
          currentPull = diff;
          const visualPull = Math.min(diff * 0.45, 75);
          indicator.classList.remove('pull-bottom');
          indicator.classList.add('visible');
          indicator.style.opacity = '1';
          indicator.style.transform = `translate3d(-50%, ${visualPull - 25}px, 0) scale(1)`;
          if (spinner) spinner.style.transform = `rotate(${diff * 2.8}deg)`;
        } else if (isAtBottom && diff < -4 && (!pullDirection || pullDirection === 'bottom')) {
          pullDirection = 'bottom';
          if (e.cancelable) e.preventDefault();
          currentPull = Math.abs(diff);
          const visualPull = Math.min(Math.abs(diff) * 0.45, 75);
          indicator.classList.add('pull-bottom');
          indicator.classList.add('visible');
          indicator.style.opacity = '1';
          indicator.style.transform = `translate3d(-50%, ${25 - visualPull}px, 0) scale(1)`;
          if (spinner) spinner.style.transform = `rotate(${-diff * 2.8}deg)`;
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
          if (pullDirection === 'bottom') {
            indicator.style.transform = 'translate3d(-50%, -18px, 0) scale(1)';
          } else {
            indicator.style.transform = 'translate3d(-50%, 18px, 0) scale(1)';
          }

          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
              for (const r of regs) r.update().catch(() => {});
            }).catch(() => {});
          }

          setTimeout(() => location.reload(), 320);
        } else {
          indicator.classList.remove('visible', 'refreshing');
          indicator.style.opacity = '0';
          indicator.style.transform = pullDirection === 'bottom'
            ? 'translate3d(-50%, 80px, 0) scale(0.85)'
            : 'translate3d(-50%, -80px, 0) scale(0.85)';
          if (spinner) spinner.style.transform = '';
        }
        currentPull = 0;
        pullDirection = null;
      };

      document.addEventListener('touchstart', onTouchStart, { passive: true });
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd, { passive: true });
      document.addEventListener('touchcancel', onTouchEnd, { passive: true });
    },

    setupAttachmentHandler() {
      const fileInput = $('file-upload-input');
      const previewContainer = $('attachment-preview-container');
      if (!fileInput || !previewContainer) return;

      document.addEventListener('click', (e) => {
        if (e.target.closest('#attach-btn')) {
          e.preventDefault();
          fileInput.click();
        }
      });

      const readFileAsDataURL = (file) => new Promise(res => {
        const r = new FileReader();
        r.onload = ev => res(ev.target.result);
        r.readAsDataURL(file);
      });

      const readFileAsText = (file) => new Promise(res => {
        const r = new FileReader();
        r.onload = ev => res(ev.target.result);
        r.readAsText(file);
      });

      const renderPreviews = () => {
        if (!state.attachments.length) {
          previewContainer.classList.add('hidden');
          previewContainer.innerHTML = '';
          return;
        }
        previewContainer.classList.remove('hidden');
        previewContainer.innerHTML = state.attachments.map((att, idx) => `
          <div class="preview-item">
            ${att.type.startsWith('image/') ? `<img src="${att.dataUrl}" class="preview-thumb">` : '<span>📄</span>'}
            <span class="preview-name">${MessageRenderer.escapeHtml(att.name)}</span>
            <button class="preview-remove" onclick="window._removeAttachment(${idx})">✕</button>
          </div>
        `).join('');
      };

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

        renderPreviews();
        this.updateSendBtnState();
        fileInput.value = '';
      });

      window._removeAttachment = (idx) => {
        state.attachments.splice(idx, 1);
        renderPreviews();
        this.updateSendBtnState();
      };
    },

    setupVoiceHandlers() {
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
          MessageRenderer.showToast('🎙️ جاري الاستماع...', 'info');
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
          MessageRenderer.showToast('المتصفح لا يدعم التعرف على الصوت', 'error');
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
        MessageRenderer.showToast('🔊 وضع الصوت التفاعلي جاهز', 'info');
        if (recognition) micBtn?.click();
      });
    },

    setupEmergencyControls() {
      $('btn-emergency-rollback')?.addEventListener('click', () => {
        if (!AuthManager.isUnlocked()) {
          AuthManager.requireAuth(() => GitHubService.rollbackToPreviousCommit());
          return;
        }
        if (confirm('هل أنت متأكد من رغبتك في استرجاع آخر نسخة سابقة للتطبيق؟')) {
          GitHubService.rollbackToPreviousCommit();
        }
      });

      $('btn-emergency-fix')?.addEventListener('click', () => {
        if (!AuthManager.isUnlocked()) {
          AuthManager.requireAuth(() => {
            StateController.startDevChat('راجع آخر تعديل قمنا به فقط وافحص مشكلته بدقة دون المساس بباقي التطبيق، ثم أصلحه.');
            $('sidebar')?.classList.remove('open');
            $('overlay')?.classList.remove('active');
          });
          return;
        }
        StateController.startDevChat('راجع آخر تعديل قمنا به فقط وافحص مشكلته بدقة دون المساس بباقي التطبيق، ثم أصلحه.');
        $('sidebar')?.classList.remove('open');
        $('overlay')?.classList.remove('active');
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 10. GLOBAL INLINE HANDLERS BRIDGE
  // ─────────────────────────────────────────────────────────────────
  window._loadConv = (id) => {
    StateController.loadConversation(id);
    $('sidebar')?.classList.remove('open');
    $('overlay')?.classList.remove('active');
  };

  window._suggest = (text) => {
    StateController.newConversation();
    const input = $('user-input');
    if (input) input.value = text;
    UIEngine.updateSendBtnState();
    ChatEngine.sendMessage(text);
  };

  window._startDevPrompt = (text) => {
    StateController.startDevChat(text);
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
        MessageRenderer.showToast('تم النسخ بنجاح', 'success');
      });
    }
  };

  window._shareMsgText = (btn) => {
    const text = btn.closest('.message-row')?.querySelector('.msg-content')?.innerText || '';
    if (navigator.share) {
      navigator.share({ title: 'X.v1 AI', text });
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
      MessageRenderer.showToast('🔊 جاري تشغيل الصوت...', 'info');
    } else {
      MessageRenderer.showToast('المتصفح لا يدعم تحويل النص لصوت', 'error');
    }
  };

  window._likeMsg = (btn) => {
    btn.style.color = '#10b981';
    MessageRenderer.showToast('شكراً على تقييمك الإيجابي', 'success');
  };

  window._dislikeMsg = (btn) => {
    btn.style.color = '#ef4444';
    MessageRenderer.showToast('تم تسجيل ملاحظتك', 'info');
  };

  window._retryMsg = (msgId) => {
    const conv = StateController.getActiveConv();
    if (!conv) return;
    const idx = conv.messages.findIndex(m => m.id === msgId);
    if (idx > 0 && conv.messages[idx - 1].role === 'user') {
      const userText = conv.messages[idx - 1].content;
      conv.messages.splice(idx, 1);
      MessageRenderer.renderAllMessages(conv.messages);
      ChatEngine.sendMessage(userText);
    }
  };

  window._triggerSkill = (skill) => SkillsEngine.trigger(skill);
  window._runSandbox = (code) => SkillsEngine.runSandbox(code);
  window._closeSandbox = () => SkillsEngine.closeSandbox();
  window._reloadSandbox = () => SkillsEngine.reloadSandbox();
  window._openSlides = (slides) => SkillsEngine.openSlides(slides);
  window._prevSlide = () => SkillsEngine.prevSlide();
  window._nextSlide = () => SkillsEngine.nextSlide();
  window._closeSlides = () => SkillsEngine.closeSlides();
  window._exportSlidesHTML = () => SkillsEngine.exportSlidesHTML();


  window._clearAppCache = async function() {
    try {
      const preservedConversations = localStorage.getItem('conversations');
      const preservedAuth = localStorage.getItem('DEV_MODE_AUTH_HASH');
      const preservedGroq = localStorage.getItem('GROQ_API_KEY');
      const preservedOr = localStorage.getItem('OPENROUTER_API_KEY');
      const preservedGh = localStorage.getItem('GITHUB_TOKEN');

      if (typeof caches !== 'undefined' && caches.keys) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }

      localStorage.clear();
      if (preservedConversations) localStorage.setItem('conversations', preservedConversations);
      if (preservedAuth) localStorage.setItem('DEV_MODE_AUTH_HASH', preservedAuth);
      if (preservedGroq) localStorage.setItem('GROQ_API_KEY', preservedGroq);
      if (preservedOr) localStorage.setItem('OPENROUTER_API_KEY', preservedOr);
      if (preservedGh) localStorage.setItem('GITHUB_TOKEN', preservedGh);

      MessageRenderer.showToast('✅ تم تنظيف الكاش بنجاح مع الحفاظ على كافة المحادثات!', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (e) {
      console.warn('[Cache] Clear error:', e);
      window.location.reload();
    }
  };

  window._openSettingsModal = async function() {
    const modal = $('settings-modal');
    const textarea = $('settings-system-prompt');
    if (!modal) return;
    if (textarea) {
      if (!state.systemPrompt) {
        try {
          const res = await fetch('./system_prompt.txt?t=' + Date.now());
          if (res.ok) state.systemPrompt = await res.text();
        } catch {}
      }
      textarea.value = state.systemPrompt || localStorage.getItem('system_prompt') || '';
    }
    modal.classList.remove('hidden');
    UIEngine.closeSidebar();
  };

  window._closeSettingsModal = function() {
    const modal = $('settings-modal');
    if (modal) modal.classList.add('hidden');
  };

  window._saveCustomSystemPrompt = function() {
    const textarea = $('settings-system-prompt');
    if (!textarea) return;
    const val = textarea.value.trim();
    if (!val) {
      MessageRenderer.showToast('يرجى كتابة تعليمات صالحة أو استعادة الافتراضي', 'warning');
      return;
    }
    state.systemPrompt = val;
    localStorage.setItem('custom_system_prompt', val);
    localStorage.setItem('system_prompt', val);
    MessageRenderer.showToast('✅ تم حفظ تعليمات النظام بنجاح!', 'success');
    window._closeSettingsModal();
  };

  window._resetDefaultSystemPrompt = async function() {
    try {
      const res = await fetch('./system_prompt.txt?t=' + Date.now());
      if (res.ok) {
        const text = await res.text();
        state.systemPrompt = text;
        localStorage.removeItem('custom_system_prompt');
        localStorage.setItem('system_prompt', text);
        const textarea = $('settings-system-prompt');
        if (textarea) textarea.value = text;
        MessageRenderer.showToast('🔄 تمت استعادة التعليمات الافتراضية بنجاح!', 'info');
      }
    } catch (e) {
      MessageRenderer.showToast('تعذر جلب الملف الافتراضي: ' + e.message, 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 11. BOOTSTRAP & LIFECYCLE INITIALIZATION
  // ─────────────────────────────────────────────────────────────────
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function $(id) {
    return document.getElementById(id);
  }

  function $$(sel, root = document) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function lockViewportHeight() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${h}px`);
  }

  async function loadSystemPrompt() {
    const customPrompt = localStorage.getItem('custom_system_prompt');
    if (customPrompt) {
      state.systemPrompt = customPrompt;
      return;
    }
    try {
      const res = await fetch('./system_prompt.txt?t=' + Date.now());
      if (res.ok) {
        state.systemPrompt = await res.text();
        localStorage.setItem('system_prompt', state.systemPrompt);
      }
    } catch {
      state.systemPrompt = localStorage.getItem('system_prompt') || '';
    }
  }

  async function loadModelCatalog() {
    try {
      const cached = localStorage.getItem('model_catalog');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length) {
          state.modelCatalog = ModelEngine.normalizeCatalog(parsed);
          return;
        }
      }

      const localRes = await fetch('./models.json?t=' + Date.now());
      if (localRes.ok) {
        const localData = await localRes.json();
        const catalog = ModelEngine.normalizeCatalog(localData);
        if (catalog.length) {
          state.modelCatalog = catalog;
          localStorage.setItem('model_catalog', JSON.stringify(catalog));
          return;
        }
      }
    } catch (e) {
      console.warn('[Model Catalog Load Failed]', e.message || e);
    }
    state.modelCatalog = ModelEngine.normalizeCatalog(MODELS);
  }

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
      if (outcome === 'accepted') MessageRenderer.showToast('✅ تم تثبيت التطبيق بنجاح!', 'success');
      deferredInstall = null;
    });
  }

  function init() {
    lockViewportHeight();
    window.addEventListener('resize', lockViewportHeight);
    window.addEventListener('orientationchange', lockViewportHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', lockViewportHeight);
    }

    UIEngine.setupEventListeners();
    AuthManager.setupGate();
    StateController.load();

    if (state.conversations.length === 0) {
      UIEngine.showWelcomeScreen();
    } else {
      StateController.loadConversation(state.conversations[0].id);
    }

    UIEngine.updateHeaderUI();
    registerServiceWorker();
    setupInstallPrompt();

    loadSystemPrompt().catch(console.warn);
    loadModelCatalog().catch(console.warn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
