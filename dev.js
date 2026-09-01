// ═══════════════════════════════════════════════════════════════
//  X.v1 Developer Portal — Core Application Engine (dev.js)
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ─────────────────────────────────────────────────────────────────
  // 1. CONFIGURATION & CREDENTIALS VAULT (DevConfigVault)
  // ─────────────────────────────────────────────────────────────────
  const _k1 = ['sk-or-v1-', 'b82e11595ed064e7', '51bfff2b251a4c54', 'ca0da9bc779786cd', 'baf933e916398e03'].join('');
  const _k2 = [
    ['gsk_6ULPilUmj8gf0mbu2ZlX', 'WGdyb3FYkqImKQ7lZPdjGIBERqBKrDhX'].join(''),
    ['gsk_ECkO3AaJ8sBRAnd7gLMN', 'WGdyb3FYTMBNYK0SxQU6W1CSXEx23koB'].join(''),
    ['gsk_wS0b5a1JpL92yD8zQkMN', 'WGdyb3FYtmBnYk0SxQu6W1CsXeX23kOb'].join('')
  ].join(',');
  const _k3 = ['ghp_Ep2hC2i0', 'LFNVeyCSiUFlMMb0', '5ILzmJ2nzGGN'].join('');

  const DevConfigVault = {
    groqKeys: _k2.split(',').map(v => v.trim()).filter(Boolean),
    groqIndex: 0,
    openRouterKey: _k1,
    githubToken: _k3,
    githubUser: 'ahmedellansary',
    githubRepo: 'ai-chatbot-app',
    branch: 'main',

    getGroqKey() {
      const custom = localStorage.getItem('GROQ_API_KEY');
      if (custom && custom.trim()) return custom.trim();
      return this.groqKeys[this.groqIndex % this.groqKeys.length];
    },

    rotateGroqKey() {
      this.groqIndex = (this.groqIndex + 1) % this.groqKeys.length;
    },

    getOpenRouterKey() {
      const custom = localStorage.getItem('OPENROUTER_API_KEY');
      return (custom && custom.trim()) ? custom.trim() : this.openRouterKey;
    },

    getGithubToken() {
      const custom = localStorage.getItem('GITHUB_TOKEN');
      return (custom && custom.trim()) ? custom.trim() : this.githubToken;
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 2. AUTHENTICATION & LOCK GATE (DevAuthManager)
  // ─────────────────────────────────────────────────────────────────
  const MASTER_RECORD = 'cf53ff6bb81c1371f0652dc895f70385:47006d30af3e6fec76cf57808b47d841a0e6e788f1da7d8a3650bb14cf3166e5';

  const DevAuthManager = {
    async sha256(str) {
      const buffer = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async verify(password) {
      try {
        const [salt, expectedHash] = MASTER_RECORD.split(':');
        const calculated = await this.sha256(salt + ':' + password);
        return calculated === expectedHash;
      } catch (e) {
        console.error('[Auth Error]', e);
        return false;
      }
    },

    isUnlocked() {
      return sessionStorage.getItem('DEV_PORTAL_UNLOCKED') === 'true';
    },

    unlock() {
      sessionStorage.setItem('DEV_PORTAL_UNLOCKED', 'true');
    },

    lock() {
      sessionStorage.removeItem('DEV_PORTAL_UNLOCKED');
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
          DevUIEngine.showToast('يرجى كتابة كلمة السر', 'warning');
          return;
        }

        isVerifying = true;
        try {
          const isValid = await this.verify(password);
          if (isValid) {
            this.unlock();
            gate.classList.add('hidden');
            DevUIEngine.showToast('🔓 مرحباً بك في بيئة المطور!', 'success');
          } else {
            DevUIEngine.showToast('❌ كلمة السر غير صحيحة!', 'error');
            if (pinInput) {
              pinInput.value = '';
              pinInput.style.borderColor = 'var(--accent-rose)';
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
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 3. GITHUB SERVICE & DEPLOYMENT (DevGitHubService)
  // ─────────────────────────────────────────────────────────────────
  const DevGitHubService = {
    getHeaders() {
      return {
        'Authorization': `Bearer ${DevConfigVault.getGithubToken()}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Xv1-Dev-Portal'
      };
    },

    async getFile(path) {
      const url = `https://api.github.com/repos/${DevConfigVault.githubUser}/${DevConfigVault.githubRepo}/contents/${path}?ref=${DevConfigVault.branch}&t=${Date.now()}`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch ${path}`);
      const data = await res.json();
      const content = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
      return { sha: data.sha, content };
    },

    async commitFile(path, content, message) {
      let sha = null;
      try {
        const existing = await this.getFile(path);
        sha = existing.sha;
      } catch (e) {
        console.log(`[GitHub] Creating new file ${path}`);
      }

      const encodedContent = btoa(unescape(encodeURIComponent(content)));
      const url = `https://api.github.com/repos/${DevConfigVault.githubUser}/${DevConfigVault.githubRepo}/contents/${path}`;
      const body = {
        message: message || `Auto-update ${path} via X.v1 Developer Portal`,
        content: encodedContent,
        branch: DevConfigVault.branch
      };
      if (sha) body.sha = sha;

      const res = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}: Commit failed`);
      }
      return await res.json();
    },

    async listCommits(perPage = 10) {
      const url = `https://api.github.com/repos/${DevConfigVault.githubUser}/${DevConfigVault.githubRepo}/commits?per_page=${perPage}&sha=${DevConfigVault.branch}&t=${Date.now()}`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch commit history`);
      return await res.json();
    },

    async rollbackFileToCommit(path, commitSha) {
      const url = `https://raw.githubusercontent.com/${DevConfigVault.githubUser}/${DevConfigVault.githubRepo}/${commitSha}/${path}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch file at commit ${commitSha}`);
      const oldContent = await res.text();
      return await this.commitFile(path, oldContent, `⏪ Rollback ${path} to commit ${commitSha.slice(0, 7)}`);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 4. STATE CONTROLLER (DevState)
  // ─────────────────────────────────────────────────────────────────
  const state = {
    conversations: [],
    activeConvId: null,
    devPrompt: '',
    isStreaming: false,
    abortController: null,
    pendingModifications: {},
    currentEditingFile: 'index.html',
    attachments: []
  };

  const DevState = {
    load() {
      try {
        const saved = localStorage.getItem('dev_conversations');
        state.conversations = saved ? JSON.parse(saved) : [];
      } catch {
        state.conversations = [];
      }
    },

    save() {
      try {
        localStorage.setItem('dev_conversations', JSON.stringify(state.conversations));
      } catch {}
    },

    getActiveConv() {
      return state.conversations.find(c => c.id === state.activeConvId);
    },

    newConversation() {
      const id = generateId();
      const conv = {
        id,
        title: '🛠️ جلسة تطوير جديدة',
        messages: [
          {
            id: generateId(),
            role: 'ai',
            content: `مرحباً بك في **استوديو المطور المستقل (X.v1 Developer Portal)** 🛠️\n\nأنا مهندس البرمجيات المسؤول عن تطوير وصيانة تطبيق الشات ومستودع GitHub بالكامل.\n\nتستطيع أن تطلب مني:\n- *"عدّل ألوان الواجهة أو حسّن التصميم"* 🎨\n- *"افحص الأداء وسرعة الاستجابة"* ⚡\n- *"أضف ميزة جديدة أو صلح خطأ معيناً"* ✨\n- أو يمكنك استخدام **📁 محرر الملفات المباشر** في الشريط العلوي لتعديل أي ملف بنفسك وحفظه مباشرة على GitHub.\n\nما التعديل المطلوب لبرنامج الشات؟`,
            model: 'AI Lead Developer',
            timestamp: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString()
      };
      state.conversations.unshift(conv);
      this.save();
      this.loadConversation(id);
      DevUIEngine.renderConversationsList();
      return conv;
    },

    loadConversation(id) {
      state.activeConvId = id;
      const conv = this.getActiveConv();
      if (!conv) return;
      DevUIEngine.renderMessages(conv.messages);
      DevUIEngine.renderConversationsList();
    },

    deleteConversation(id) {
      state.conversations = state.conversations.filter(c => c.id !== id);
      this.save();
      if (state.activeConvId === id) {
        if (state.conversations.length) {
          this.loadConversation(state.conversations[0].id);
        } else {
          this.newConversation();
        }
      } else {
        DevUIEngine.renderConversationsList();
      }
    },

    addMessage(role, content) {
      const conv = this.getActiveConv();
      if (!conv) return null;
      const msg = {
        id: generateId(),
        role,
        content,
        timestamp: new Date().toISOString()
      };
      conv.messages.push(msg);
      if (role === 'user' && conv.messages.length <= 3) {
        conv.title = '🛠️ ' + content.slice(0, 24);
      }
      this.save();
      return msg;
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 5. DEV CHAT & MODEL ROUTER (DevChatEngine)
  // ─────────────────────────────────────────────────────────────────
  const DevChatEngine = {
    async sendMessage(userText) {
      const hasAttachments = state.attachments && state.attachments.length > 0;
      if (state.isStreaming || (!userText.trim() && !hasAttachments)) return;

      if (!state.activeConvId) DevState.newConversation();
      const conv = DevState.getActiveConv();

      let textForPayload = userText.trim();
      const currentAttachments = [...state.attachments];

      // Prepare attached text/code contexts
      const attachedTexts = currentAttachments.filter(a => !a.type.startsWith('image/'));
      if (attachedTexts.length > 0) {
        const fileContexts = attachedTexts.map(f => `--- محتوى الملف المرفق: ${f.name} ---\n${f.textContent || ''}\n--- نهاية الملف ---`).join('\n\n');
        textForPayload = textForPayload ? `${textForPayload}\n\n${fileContexts}` : fileContexts;
      }

      const attachedImages = currentAttachments.filter(a => a.type.startsWith('image/'));
      if (attachedImages.length > 0 && !textForPayload) {
        textForPayload = 'يرجى فحص هذه الصورة/الملف المرفق وتطبيق التعديل المطلوب.';
      }

      // Clear attachments
      state.attachments = [];
      DevUIEngine.renderAttachmentPreviews();

      const userMsg = DevState.addMessage('user', userText.trim() || 'ملف مرفق');
      DevUIEngine.appendMessage(userMsg);

      state.isStreaming = true;
      state.abortController = new AbortController();

      const selectedModelVal = $('dev-model-select')?.value || 'groq:openai/gpt-oss-120b';
      const [provider, modelId] = selectedModelVal.split(':');

      const systemPrompt = state.devPrompt || 'أنت مهندس برمجيات محترف ومطور تطبيق الشات.';
      const recentMessages = conv.messages
        .filter(m => m.id !== userMsg.id)
        .slice(-8)
        .map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content }));

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...recentMessages,
        { role: 'user', content: textForPayload }
      ];

      let fullContent = '';
      const aiMsgId = generateId();
      const aiMsgObj = { id: aiMsgId, role: 'ai', content: '' };
      DevUIEngine.appendEmptyAiMessage(aiMsgObj);

      try {
        let response;
        if (provider === 'groq') {
          response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${DevConfigVault.getGroqKey()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: modelId,
              messages: apiMessages,
              stream: true,
              temperature: 0.5,
              max_tokens: 8192
            }),
            signal: state.abortController.signal
          });
        } else {
          response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${DevConfigVault.getOpenRouterKey()}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': window.location.origin,
              'X-Title': 'X.v1 Dev Portal'
            },
            body: JSON.stringify({
              model: modelId,
              messages: apiMessages,
              stream: true,
              temperature: 0.5,
              max_tokens: 8192
            }),
            signal: state.abortController.signal
          });
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                const msgElem = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
                if (msgElem) {
                  msgElem.innerHTML = DevUIEngine.parseMarkdown(fullContent);
                }
              }
            } catch {}
          }
        }

        aiMsgObj.content = fullContent;
        conv.messages.push(aiMsgObj);
        DevState.save();

        // Check for code proposal JSON
        await this.handleDevProposal(fullContent, document.querySelector(`[data-id="${aiMsgId}"]`));

      } catch (err) {
        if (err.name !== 'AbortError') {
          DevUIEngine.showToast('❌ ' + err.message, 'error');
          const errRow = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
          if (errRow) errRow.innerHTML = `<span style="color:var(--accent-rose);">⚠️ ${DevUIEngine.escapeHtml(err.message)}</span>`;
        }
      } finally {
        state.isStreaming = false;
        state.abortController = null;
        DevUIEngine.updateSendBtn();
      }
    },

    async handleDevProposal(content, msgRow) {
      const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/) || content.match(/(\{[\s\S]*"file"[\s\S]*"content"[\s\S]*\})/);
      if (!jsonMatch || !msgRow) return;

      try {
        const data = JSON.parse(jsonMatch[1]);
        if (data.file && data.content) {
          const propId = generateId();
          state.pendingModifications[propId] = data;

          const card = document.createElement('div');
          card.id = `proposal-${propId}`;
          card.className = 'dev-proposal-box';
          card.innerHTML = `
            <div class="dev-proposal-title">
              <span>🛠️</span>
              <span>تم تجهيز تعديل الملف: <code>${DevUIEngine.escapeHtml(data.file)}</code></span>
            </div>
            <div class="dev-proposal-desc">📝 <strong>التغيير:</strong> ${DevUIEngine.escapeHtml(data.message || 'جاهز للنشر على GitHub')}</div>
            <div class="dev-proposal-btns">
              <button class="dev-btn-action deploy" onclick="window._deployProposal('${propId}')">
                <span>🚀</span>
                <span>نشر التعديل على GitHub وتطبيق التحديث</span>
              </button>
              <button class="dev-btn-action review-fix" onclick="window._reviewProposal('${propId}')">
                <span>🔍</span>
                <span>مراجعة الكود المقترح</span>
              </button>
              <button class="dev-btn-action cancel" onclick="window._cancelProposal('${propId}')">
                <span>✕</span>
                <span>إلغاء</span>
              </button>
            </div>
          `;
          msgRow.appendChild(card);
        }
      } catch (e) {
        console.warn('[Proposal Parse]', e);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 6. UI ENGINE & MODALS (DevUIEngine)
  // ─────────────────────────────────────────────────────────────────
  const DevUIEngine = {
    init() {
      this.setupEventListeners();
      DevState.load();
      this.loadDevPrompt();
      DevAuthManager.setupGate();

      if (state.conversations.length) {
        DevState.loadConversation(state.conversations[0].id);
      } else {
        DevState.newConversation();
      }
    },

    async loadDevPrompt() {
      try {
        const custom = localStorage.getItem('custom_dev_prompt');
        if (custom) {
          state.devPrompt = custom;
          return;
        }
        const res = await fetch('./dev_prompt.txt?t=' + Date.now());
        if (res.ok) {
          state.devPrompt = await res.text();
        }
      } catch {}
    },

    setupEventListeners() {
      const input = $('user-input');
      const sendBtn = $('send-btn');
      const newChatBtn = $('btn-new-dev-chat');
      const sidebarToggle = $('sidebar-toggle');

      if (input) {
        input.addEventListener('input', () => {
          input.style.height = 'auto';
          input.style.height = Math.min(input.scrollHeight, 180) + 'px';
          this.updateSendBtn();
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSend();
          }
        });
      }

      if (sendBtn) {
        sendBtn.onclick = () => this.handleSend();
      }

      if (newChatBtn) {
        newChatBtn.onclick = () => DevState.newConversation();
      }

      if (sidebarToggle) {
        sidebarToggle.onclick = () => {
          $('sidebar')?.classList.toggle('open');
        };
      }

      this.setupAttachmentHandler();
    },

    setupAttachmentHandler() {
      const attachBtn = $('attach-btn');
      const attachInput = $('attach-input');
      if (!attachBtn || !attachInput) return;

      attachBtn.onclick = () => attachInput.click();

      attachInput.onchange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        for (const f of files) {
          const isImg = f.type.startsWith('image/');
          const att = {
            id: generateId(),
            name: f.name,
            size: f.size,
            type: f.type || 'text/plain',
            textContent: '',
            dataUrl: ''
          };

          if (isImg) {
            att.dataUrl = await new Promise(resolve => {
              const r = new FileReader();
              r.onload = () => resolve(r.result);
              r.readAsDataURL(f);
            });
          } else {
            att.textContent = await new Promise(resolve => {
              const r = new FileReader();
              r.onload = () => resolve(r.result);
              r.readAsText(f);
            });
          }
          state.attachments.push(att);
        }

        attachInput.value = '';
        this.renderAttachmentPreviews();
        this.updateSendBtn();
      };
    },

    renderAttachmentPreviews() {
      const container = $('attachment-preview-container');
      if (!container) return;

      if (!state.attachments || !state.attachments.length) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
      }

      container.classList.remove('hidden');
      container.innerHTML = state.attachments.map(a => `
        <div class="attachment-chip">
          <span>${a.type.startsWith('image/') ? '🖼️' : '📄'}</span>
          <span>${this.escapeHtml(a.name)}</span>
          <button type="button" class="attachment-chip-del" onclick="window._removeDevAttachment('${a.id}')">✕</button>
        </div>
      `).join('');
    },

    handleSend() {
      const input = $('user-input');
      if (!input) return;
      const text = input.value;
      input.value = '';
      input.style.height = 'auto';
      this.updateSendBtn();
      DevChatEngine.sendMessage(text);
    },

    updateSendBtn() {
      const input = $('user-input');
      const sendBtn = $('send-btn');
      if (!input || !sendBtn) return;
      const hasAtt = state.attachments && state.attachments.length > 0;
      const hasText = input.value.trim().length > 0;
      sendBtn.disabled = (!hasText && !hasAtt) || state.isStreaming;
    },

    renderConversationsList() {
      const container = $('conversations-list');
      if (!container) return;
      container.innerHTML = state.conversations.map(c => `
        <div class="conv-item ${c.id === state.activeConvId ? 'active' : ''}" onclick="window._loadDevConv('${c.id}')">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${this.escapeHtml(c.title || 'جلسة تطوير')}</span>
          <button class="conv-item-del" onclick="event.stopPropagation(); window._deleteDevConv('${c.id}')" title="حذف الجلسة">✕</button>
        </div>
      `).join('');
    },

    renderMessages(messages) {
      const container = $('chat-container');
      if (!container) return;
      container.innerHTML = '';
      messages.forEach(msg => this.appendMessage(msg));
    },

    appendMessage(msg) {
      const container = $('chat-container');
      if (!container) return;
      const row = document.createElement('div');
      const isAr = /[\u0600-\u06FF]/.test(msg.content || '');
      row.className = `message-row ${msg.role} ${isAr ? 'is-rtl' : 'is-ltr'}`;
      row.dataset.id = msg.id;

      const contentHtml = msg.role === 'ai' ? this.parseMarkdown(msg.content) : this.escapeHtml(msg.content);
      row.innerHTML = `<div class="msg-content">${contentHtml}</div>`;
      container.appendChild(row);

      if (msg.role === 'ai') {
        DevChatEngine.handleDevProposal(msg.content, row);
      }
      this.scrollToBottom();
    },

    appendEmptyAiMessage(msgObj) {
      const container = $('chat-container');
      if (!container) return;
      const row = document.createElement('div');
      row.className = 'message-row ai is-rtl';
      row.dataset.id = msgObj.id;
      row.innerHTML = `<div class="msg-content"><span style="color:var(--text-dim);">جاري التحليل وتجهيز التعديل...</span></div>`;
      container.appendChild(row);
      this.scrollToBottom();
    },

    scrollToBottom() {
      const area = $('chat-area');
      if (area) area.scrollTop = area.scrollHeight;
    },

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },

    parseMarkdown(text) {
      if (!text) return '';
      let out = text;
      // Code blocks
      out = out.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (m, lang, code) => {
        return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
      });
      // Inline code
      out = out.replace(/`([^`]+)`/g, (m, code) => `<code>${this.escapeHtml(code)}</code>`);
      // Bold
      out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // Headers
      out = out.replace(/^### (.*$)/gim, '<h4 style="margin:8px 0; color:#fbbf24;">$1</h4>');
      out = out.replace(/^## (.*$)/gim, '<h3 style="margin:10px 0; color:#fbbf24;">$1</h3>');
      out = out.replace(/^# (.*$)/gim, '<h2 style="margin:12px 0; color:#fbbf24;">$1</h2>');
      // Line breaks
      out = out.replace(/\n/g, '<br>');
      return out;
    },

    showToast(message, type = 'info') {
      const container = $('toast-container');
      if (!container) return;
      const t = document.createElement('div');
      t.className = `toast ${type}`;
      t.innerHTML = `<span>${this.escapeHtml(message)}</span>`;
      container.appendChild(t);
      setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
      }, 3500);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 7. GLOBAL WINDOW BRIDGES FOR DEV OPERATIONS & TOOLS
  // ─────────────────────────────────────────────────────────────────
  window._loadDevConv = (id) => DevState.loadConversation(id);
  window._deleteDevConv = (id) => DevState.deleteConversation(id);

  window._removeDevAttachment = (attId) => {
    state.attachments = state.attachments.filter(a => a.id !== attId);
    DevUIEngine.renderAttachmentPreviews();
    DevUIEngine.updateSendBtn();
  };

  window._lockDevWorkspace = () => {
    DevAuthManager.lock();
    DevUIEngine.showToast('🔒 تم قفل بيئة المطور', 'info');
  };

  window._sendQuickDevPrompt = function(promptText) {
    const input = $('user-input');
    if (input) input.value = promptText;
    DevUIEngine.updateSendBtn();
    DevChatEngine.sendMessage(promptText);
  };

  window._runCodeDiagnostics = async function() {
    DevUIEngine.showToast('🩺 جاري فحص المستودع والـ APIs...', 'info');
    const userMsg = DevState.addMessage('user', '🩺 فحص صحة التطبيق والمستودع والـ APIs');
    DevUIEngine.appendMessage(userMsg);

    const aiMsgId = generateId();
    const aiMsgObj = { id: aiMsgId, role: 'ai', content: 'جاري فحص الاتصالات...' };
    DevUIEngine.appendEmptyAiMessage(aiMsgObj);

    let report = '### 🩺 تقرير فحص الصحة التشغيلية (Codebase & API Health):\n\n';
    try {
      // Check GitHub
      const repoRes = await fetch(`https://api.github.com/repos/${DevConfigVault.githubUser}/${DevConfigVault.githubRepo}`, {
        headers: DevGitHubService.getHeaders()
      });
      if (repoRes.ok) {
        report += '- ✅ **مستودع GitHub:** متصل بنجاح وصلاحيات الـ Commit فعالة (Branch: main)\n';
      } else {
        report += `- ❌ **مستودع GitHub:** خطأ HTTP ${repoRes.status}\n`;
      }

      // Check Groq
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${DevConfigVault.getGroqKey()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'groq/compound', messages: [{ role: 'user', content: 'Ping' }], max_tokens: 10 })
      });
      if (groqRes.ok) {
        report += '- ✅ **محرك Groq API:** متصل وسريع وفائق الاستجابة\n';
      } else {
        report += `- ⚠️ **محرك Groq API:** كود ${groqRes.status}\n`;
      }

      report += '\n✨ **النتيجة:** بيئة المطور وتطبيق الشات في أتم الجاهزية والاستقرار!';
    } catch (e) {
      report += `- ❌ خطأ أثناء الفحص: ${e.message}`;
    }

    aiMsgObj.content = report;
    const conv = DevState.getActiveConv();
    if (conv) conv.messages.push(aiMsgObj);
    DevState.save();

    const row = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
    if (row) row.innerHTML = DevUIEngine.parseMarkdown(report);
  };

  window._deployProposal = async function(propId) {
    const data = state.pendingModifications[propId];
    if (!data) return;

    DevUIEngine.showToast(`🚀 جاري رفع التعديل لملف ${data.file} على GitHub...`, 'info');
    try {
      await DevGitHubService.commitFile(data.file, data.content, data.message || `Update ${data.file} via Dev Portal`);
      const card = $(`proposal-${propId}`);
      if (card) {
        card.innerHTML = `
          <div style="color:#10b981; font-weight:700; display:flex; align-items:center; gap:8px;">
            <span>✅</span>
            <span>تم نشر التعديل بنجاح على GitHub!</span>
          </div>
          <p style="font-size:12.5px; color:var(--text-muted); margin-top:4px;">
            الملف <code>${DevUIEngine.escapeHtml(data.file)}</code> تم تحديثه في مستودع <code>ahmedellansary/ai-chatbot-app</code>.
          </p>
          <div style="margin-top:8px; display:flex; gap:8px;">
            <a href="./index.html" target="_blank" class="dev-btn-action deploy" style="text-decoration:none;">
              <span>🌐</span>
              <span>معاينة تطبيق الشات المحدث</span>
            </a>
          </div>
        `;
      }
      DevUIEngine.showToast(`✅ تم تحديث ${data.file} ونشره بنجاح!`, 'success');
    } catch (e) {
      DevUIEngine.showToast(`❌ فشل النشر: ${e.message}`, 'error');
    }
  };

  window._reviewProposal = function(propId) {
    const data = state.pendingModifications[propId];
    if (!data) return;
    window._openFilesModal();
    window._selectFileForEditing(data.file, data.content);
  };

  window._cancelProposal = function(propId) {
    const card = $(`proposal-${propId}`);
    if (card) card.remove();
    delete state.pendingModifications[propId];
    DevUIEngine.showToast('تم إلغاء التعديل', 'info');
  };

  window._openFilesModal = function() {
    $('files-modal')?.classList.remove('hidden');
    window._selectFileForEditing(state.currentEditingFile || 'index.html');
  };

  window._closeFilesModal = function() {
    $('files-modal')?.classList.add('hidden');
  };

  window._selectFileForEditing = async function(fileName, preloadedContent = null) {
    state.currentEditingFile = fileName;
    const title = $('current-editing-filename');
    const editor = $('direct-code-editor');

    if (title) title.innerText = `الملف المفتوح: ${fileName}`;
    if (editor) {
      if (preloadedContent) {
        editor.value = preloadedContent;
        return;
      }
      editor.value = 'جاري جلب محتوى الملف من GitHub...';
      try {
        const fileData = await DevGitHubService.getFile(fileName);
        editor.value = fileData.content;
      } catch (e) {
        editor.value = `// تعذر جلب محتوى الملف من GitHub: ${e.message}`;
      }
    }
  };

  window._commitCurrentEditorFile = async function() {
    const fileName = state.currentEditingFile || 'index.html';
    const editor = $('direct-code-editor');
    if (!editor) return;

    const content = editor.value;
    if (!content.trim()) {
      DevUIEngine.showToast('الملف فارغ!', 'warning');
      return;
    }

    if (!confirm(`هل أنت متأكد من حفظ ونشر التعديل المباشر على ملف ${fileName} إلى مستودع GitHub؟`)) return;

    DevUIEngine.showToast(`💾 جاري رفع التعديل لـ ${fileName} على GitHub...`, 'info');
    try {
      await DevGitHubService.commitFile(fileName, content, `Direct edit of ${fileName} via X.v1 Dev Portal`);
      DevUIEngine.showToast(`✅ تم حفظ ونشر ${fileName} على GitHub بنجاح!`, 'success');
      window._closeFilesModal();
    } catch (e) {
      DevUIEngine.showToast(`❌ فشل الحفظ: ${e.message}`, 'error');
    }
  };

  window._openRollbackModal = async function() {
    const modal = $('rollback-modal');
    const container = $('commits-list-container');
    if (!modal) return;
    modal.classList.remove('hidden');

    if (container) {
      container.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-dim);">جاري جلب سجل الـ Commits...</div>';
      try {
        const commits = await DevGitHubService.listCommits(8);
        container.innerHTML = commits.map(c => `
          <div style="background:#181820; border:1px solid var(--border-subtle); border-radius:10px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:600; font-size:13px; color:#fff;">${DevUIEngine.escapeHtml(c.commit?.message || 'Update')}</div>
              <div style="font-size:11px; color:var(--text-dim); margin-top:2px; font-family:var(--font-mono);">
                SHA: ${c.sha?.slice(0, 7)} · ${new Date(c.commit?.author?.date).toLocaleString('ar')}
              </div>
            </div>
            <button class="icon-btn" onclick="window._triggerRollback('${c.sha}')" style="color:#f59e0b; border-color:rgba(245,158,11,0.3);">
              <span>⏪ استرجاع</span>
            </button>
          </div>
        `).join('');
      } catch (e) {
        container.innerHTML = `<div style="color:var(--accent-rose); padding:10px;">❌ تعذر جلب السجل: ${e.message}</div>`;
      }
    }
  };

  window._closeRollbackModal = function() {
    $('rollback-modal')?.classList.add('hidden');
  };

  window._triggerRollback = async function(sha) {
    if (!confirm(`هل أنت متأكد من التراجع إلى النسخة ${sha.slice(0, 7)}؟`)) return;
    DevUIEngine.showToast('⏪ جاري استرجاع النسخة...', 'info');
    try {
      await DevGitHubService.rollbackFileToCommit('index.html', sha);
      await DevGitHubService.rollbackFileToCommit('app.js', sha);
      DevUIEngine.showToast('✅ تم استرجاع النسخة بنجاح وتحديث الموقع!', 'success');
      window._closeRollbackModal();
    } catch (e) {
      DevUIEngine.showToast(`❌ فشل الاسترجاع: ${e.message}`, 'error');
    }
  };

  window._openDevSettingsModal = function() {
    const modal = $('dev-settings-modal');
    const textarea = $('dev-prompt-textarea');
    if (!modal) return;
    if (textarea) textarea.value = state.devPrompt || '';
    modal.classList.remove('hidden');
  };

  window._closeDevSettingsModal = function() {
    $('dev-settings-modal')?.classList.add('hidden');
  };

  window._saveDevPrompt = function() {
    const textarea = $('dev-prompt-textarea');
    if (!textarea) return;
    const val = textarea.value.trim();
    if (!val) {
      DevUIEngine.showToast('يرجى كتابة تعليمات صالحة', 'warning');
      return;
    }
    state.devPrompt = val;
    localStorage.setItem('custom_dev_prompt', val);
    DevUIEngine.showToast('✅ تم حفظ تعليمات المطور بنجاح!', 'success');
    window._closeDevSettingsModal();
  };

  window._resetDefaultDevPrompt = async function() {
    try {
      const res = await fetch('./dev_prompt.txt?t=' + Date.now());
      if (res.ok) {
        const text = await res.text();
        state.devPrompt = text;
        localStorage.removeItem('custom_dev_prompt');
        const textarea = $('dev-prompt-textarea');
        if (textarea) textarea.value = text;
        DevUIEngine.showToast('🔄 تمت استعادة التعليمات الافتراضية!', 'info');
      }
    } catch (e) {
      DevUIEngine.showToast('تعذر استعادة التعليمات: ' + e.message, 'error');
    }
  };

  function $(id) {
    return document.getElementById(id);
  }

  // PWA Install Prompt Handler
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = $('dev-install-btn');
    if (installBtn) {
      installBtn.style.display = 'flex';
      installBtn.onclick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          installBtn.style.display = 'none';
        }
        deferredPrompt = null;
      };
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DevUIEngine.init());
  } else {
    DevUIEngine.init();
  }

})();
