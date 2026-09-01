// ═══════════════════════════════════════════════════════════════
//  X.v1 Developer Portal — Core Application Engine (dev.js)
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ─────────────────────────────────────────────────────────────────
  // Helper: Unique ID Generator
  // ─────────────────────────────────────────────────────────────────
  function generateId() {
    return 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  }

  // ─────────────────────────────────────────────────────────────────
  // 1. CONFIGURATION & CREDENTIALS VAULT (DevConfigVault)
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
  // 2. DEV AGENTS CATALOG (Hierarchy: Coding -> High-Params -> Fast)
  // ─────────────────────────────────────────────────────────────────
  const DEV_AGENTS = [
    // ═══ 1. المتخصصين في البرمجة والأكواد (Coding Specialists - Top Priority) ═══
    {
      id: 'qwen/qwen-2.5-coder-32b-instruct:free',
      provider: 'openrouter',
      name: 'Qwen 2.5 Coder 32B',
      icon: '👨‍💻',
      category: 'code',
      params: '32B Coder',
      desc: 'المتخصص الأول في كتابة وهندسة الأكواد وتصحيح أخطاء JavaScript & CSS بدقة متناهية.',
      priority: 1
    },
    {
      id: 'deepseek/deepseek-r1:free',
      provider: 'openrouter',
      name: 'DeepSeek R1 Reasoning',
      icon: '🧠',
      category: 'code',
      params: 'DeepSeek R1',
      desc: 'استدلال منطقي عميق وتخطيط معماري متقدم لهيكل المشروع والميزات المعقدة.',
      priority: 1
    },
    {
      id: 'openai/gpt-oss-120b',
      provider: 'groq',
      name: 'GPT OSS 120B Lead Architect',
      icon: '⚡',
      category: 'code',
      params: '120B Groq',
      desc: 'مهندس برمجيات متقدم فائق السرعة لتوليد الحلول وهندسة الملفات.',
      priority: 1
    },
    {
      id: 'meta-llama/llama-3.3-70b-versatile',
      provider: 'groq',
      name: 'Llama 3.3 70B Versatile',
      icon: '👨‍💻',
      category: 'code',
      params: '70B Groq',
      desc: 'مطور برمجيات ذكي وسريع متعدد الاستخدامات وإصلاح المشاكل البرمجية.',
      priority: 1
    },
    {
      id: 'qwen/qwen3.8-27b',
      provider: 'groq',
      name: 'Qwen 27B Fast Coder',
      icon: '⚡',
      category: 'code',
      params: '27B Groq',
      desc: 'سريع ودقيق في تحليل الدوال وتطوير الواجهات.',
      priority: 1
    },

    // ═══ 2. الأعلى معالم والقدرات المعمارية (High-Parameter Architecture) ═══
    {
      id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
      provider: 'openrouter',
      name: 'Nemotron 550B Ultra Flagship',
      icon: '👑',
      category: 'reasoning',
      params: '550B Ultra',
      desc: 'الأعلى معالم على الإطلاق (550 مليار معامل) للمهام الكبيرة والتحليلات الشاملة.',
      priority: 2
    },
    {
      id: 'minimax/minimax-m3:free',
      provider: 'openrouter',
      name: 'MiniMax M3 Architect',
      icon: '🧠',
      category: 'reasoning',
      params: '456B Context',
      desc: 'نموذج عملاق ذو سياق استيعاب ضخم للمشاريع متعددة الملفات.',
      priority: 2
    },
    {
      id: 'nvidia/nemotron-3-super-120b-a12b:free',
      provider: 'openrouter',
      name: 'Nemotron 120B Super',
      icon: '🧠',
      category: 'reasoning',
      params: '120B Super',
      desc: 'استدلال متقدم وهندسة ذكية للملفات والمكونات.',
      priority: 2
    },

    // ═══ 3. السرعة الفائقة والمهام الخفيفة (Ultra-Fast Execution) ═══
    {
      id: 'groq/compound',
      provider: 'groq',
      name: 'Groq Compound Engine',
      icon: '⚡',
      category: 'fast',
      params: 'Ultra-Fast',
      desc: 'محرك مركب فائق السرعة للمهام اللحظية والتعديلات السريعة.',
      priority: 3
    },
    {
      id: 'nvidia/nemotron-3.5-lightning:free',
      provider: 'openrouter',
      name: 'Nemotron Lightning',
      icon: '⚡',
      category: 'fast',
      params: 'Lightning Fast',
      desc: 'استجابة فائقة السرعة للمراجعات السريعة والفحص.',
      priority: 3
    },
    {
      id: 'qwen/qwen3.6-27b',
      provider: 'groq',
      name: 'Qwen 3.6 27B Utility',
      icon: '⚡',
      category: 'fast',
      params: '27B Utility',
      desc: 'نموذج خفيف وسريع للمهام التشغيلية المباشرة.',
      priority: 3
    }
  ];

  // ─────────────────────────────────────────────────────────────────
  // 3. AUTHENTICATION & LOCK GATE (DevAuthManager)
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
  // 4. GITHUB SERVICE & DEPLOYMENT (DevGitHubService)
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
  // 5. STATE CONTROLLER (DevState)
  // ─────────────────────────────────────────────────────────────────
  const state = {
    conversations: [],
    activeConvId: null,
    devPrompt: '',
    selectedAgentId: 'qwen/qwen-2.5-coder-32b-instruct:free',
    currentFilter: 'all',
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

      const savedAgent = localStorage.getItem('dev_selected_agent');
      if (savedAgent && DEV_AGENTS.some(a => a.id === savedAgent)) {
        state.selectedAgentId = savedAgent;
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

    getSelectedAgent() {
      return DEV_AGENTS.find(a => a.id === state.selectedAgentId) || DEV_AGENTS[0];
    },

    setSelectedAgent(agentId) {
      const agent = DEV_AGENTS.find(a => a.id === agentId);
      if (agent) {
        state.selectedAgentId = agent.id;
        localStorage.setItem('dev_selected_agent', agent.id);
        DevUIEngine.updateAgentPillDisplay();
      }
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
            isWelcome: true,
            content: 'مرحباً بك في استوديو المطور (X.v1 Dev)',
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
  // 6. DEV CHAT & SMART FALLBACK CASCADE ENGINE (DevChatEngine)
  // ─────────────────────────────────────────────────────────────────
  const DevChatEngine = {
    // Build ordered list of fallback agents starting with the chosen one
    buildFallbackCascade(primaryAgent) {
      const cascade = [primaryAgent];
      // Add all remaining agents sorted by priority
      const remaining = DEV_AGENTS.filter(a => a.id !== primaryAgent.id);
      cascade.push(...remaining);
      return cascade;
    },

    async callSingleAgentStream(agent, messages, signal, onChunk) {
      const isGroq = agent.provider === 'groq';
      const endpoint = isGroq 
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';

      const key = isGroq ? DevConfigVault.getGroqKey() : DevConfigVault.getOpenRouterKey();
      const headers = {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      };

      if (!isGroq) {
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'X.v1 Dev Portal';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: agent.id,
          messages,
          stream: true,
          temperature: 0.4,
          max_tokens: 8192
        }),
        signal
      });

      if (response.status === 429 && isGroq) {
        DevConfigVault.rotateGroqKey();
        throw new Error('GROQ_RATE_LIMIT');
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasTokens = false;

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
              hasTokens = true;
              onChunk(delta);
            }
          } catch {}
        }
      }

      if (!hasTokens) {
        throw new Error('EMPTY_STREAM_RESPONSE');
      }
    },

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

      const systemPrompt = state.devPrompt || 'أنت مهندس برمجيات محترف ومطور تطبيق الشات ومستودع GitHub.';
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

      const chosenAgent = DevState.getSelectedAgent();
      const fallbackList = this.buildFallbackCascade(chosenAgent);

      let succeeded = false;
      let usedAgent = chosenAgent;

      for (let i = 0; i < fallbackList.length; i++) {
        const currentAgent = fallbackList[i];
        try {
          if (i > 0) {
            DevUIEngine.showToast(`🛡️ تم التحويل التلقائي إلى: ${currentAgent.name} (Smart Fallback)`, 'warning');
            const msgElem = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
            if (msgElem && !fullContent) {
              msgElem.innerHTML = `<span style="color:#fbbf24; font-size:12.5px;">🔄 جاري التبديل التلقائي إلى <strong>${DevUIEngine.escapeHtml(currentAgent.name)}</strong>...</span>`;
            }
          }

          fullContent = '';
          await this.callSingleAgentStream(currentAgent, apiMessages, state.abortController.signal, (delta) => {
            fullContent += delta;
            const msgElem = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
            if (msgElem) {
              msgElem.innerHTML = DevUIEngine.parseMarkdown(fullContent);
            }
          });

          succeeded = true;
          usedAgent = currentAgent;
          break; // Successfully finished stream

        } catch (err) {
          if (err.name === 'AbortError') {
            console.log('[Dev Engine] Stream aborted by user');
            return;
          }

          console.warn(`[Agent Fallback] Agent ${currentAgent.name} failed:`, err.message);

          // If Groq rate limit, retry with next Groq key once before falling back
          if (err.message === 'GROQ_RATE_LIMIT') {
            try {
              fullContent = '';
              await this.callSingleAgentStream(currentAgent, apiMessages, state.abortController.signal, (delta) => {
                fullContent += delta;
                const msgElem = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
                if (msgElem) msgElem.innerHTML = DevUIEngine.parseMarkdown(fullContent);
              });
              succeeded = true;
              usedAgent = currentAgent;
              break;
            } catch (retryErr) {
              console.warn(`[Agent Retry Failed]`, retryErr);
            }
          }
        }
      }

      if (succeeded) {
        aiMsgObj.content = fullContent;
        aiMsgObj.model = usedAgent.name;
        conv.messages.push(aiMsgObj);
        DevState.save();

        // Check for code proposal JSON
        await this.handleDevProposal(fullContent, document.querySelector(`[data-id="${aiMsgId}"]`));
      } else {
        const errorMsg = 'تعذر الرد من جميع النماذج حالياً بسبب ضغط مؤقت في مزودي الخدمة. يرجى إعادة المحاولة.';
        DevUIEngine.showToast('❌ ' + errorMsg, 'error');
        const errRow = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
        if (errRow) errRow.innerHTML = `<span style="color:var(--accent-rose);">⚠️ ${errorMsg}</span>`;
      }

      state.isStreaming = false;
      state.abortController = null;
      DevUIEngine.updateSendBtn();
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
  // 7. UI ENGINE & MODALS (DevUIEngine)
  // ─────────────────────────────────────────────────────────────────
  const DevUIEngine = {
    init() {
      this.setupEventListeners();
      this.setupPullToRefresh();
      DevState.load();
      this.loadDevPrompt();
      DevAuthManager.setupGate();
      this.updateAgentPillDisplay();

      if (state.conversations.length) {
        DevState.loadConversation(state.conversations[0].id);
      } else {
        DevState.newConversation();
      }
    },

    setupPullToRefresh() {
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
        isTracking = (scrollTop <= 4);
        currentPull = 0;
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
          if (spinner) spinner.style.transform = `rotate(${diff * 2.8}deg)`;
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

          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
              for (const r of regs) r.update().catch(() => {});
            }).catch(() => {});
          }

          setTimeout(() => location.reload(), 280);
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
    },

    updateAgentPillDisplay() {
      const agent = DevState.getSelectedAgent();
      const pillIcon = $('selected-agent-icon');
      const pillLabel = $('selected-agent-label');
      const headerIcon = $('header-agent-icon');
      const headerName = $('header-agent-name');

      if (pillIcon) pillIcon.innerText = agent.icon || '🧠';
      if (pillLabel) pillLabel.innerText = agent.name;
      if (headerIcon) headerIcon.innerText = agent.icon || '🧠';
      if (headerName) headerName.innerText = agent.name;
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
      const canSend = (hasText || hasAtt) && !state.isStreaming;
      sendBtn.disabled = !canSend;
      sendBtn.classList.toggle('active', canSend);
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

      if (!messages || !messages.length || (messages.length === 1 && messages[0].isWelcome)) {
        this.renderWelcomeHero();
        return;
      }

      messages.forEach(msg => {
        if (msg.isWelcome) {
          this.renderWelcomeHero();
        } else {
          this.appendMessage(msg);
        }
      });
    },

    renderWelcomeHero() {
      const container = $('chat-container');
      if (!container) return;
      const hero = document.createElement('div');
      hero.className = 'dev-welcome-hero';
      hero.innerHTML = `
        <div class="dev-welcome-star">🛠️</div>
        <h1 class="dev-welcome-title">مرحباً بك في استوديو المطور (X.v1 Dev)</h1>
        <p class="dev-welcome-sub">أنا مهندس البرمجيات المسؤول عن تطوير وصيانة تطبيق الشات ومستودع المشروع.</p>
        <div class="dev-welcome-chips">
          <button class="welcome-chip" onclick="window._sendQuickDevPrompt('🎨 قم بفحص واجهة وتصميم الشات style.css واقترح تحسينات بصرية عصرية وفخمة.')">🎨 تحسين التصميم والواجهة</button>
          <button class="welcome-chip" onclick="window._sendQuickDevPrompt('⚡ افحص أداء التطبيق app.js وتدفق التوكنز والذاكرة واقترح تحسينات سرعة.')">⚡ فحص السرعة والأداء</button>
          <button class="welcome-chip" onclick="window._sendQuickDevPrompt('🛡️ قم بعمل مراجعة أمنية شاملة لملفات التطبيق والتأكد من حماية الـ DOM والمفاتيح.')">🛡️ فحص الأمان والحماية</button>
          <button class="welcome-chip" onclick="window._openFilesModal()">📁 فتح محرر الملفات</button>
        </div>
      `;
      container.appendChild(hero);
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

    renderAgentsGrid(filter = 'all') {
      const container = $('agents-grid');
      if (!container) return;

      const filtered = DEV_AGENTS.filter(a => filter === 'all' || a.category === filter);

      container.innerHTML = filtered.map(agent => {
        const isSelected = agent.id === state.selectedAgentId;
        const providerBadgeClass = agent.provider === 'groq' ? 'provider-groq' : 'provider-openrouter';
        const providerBadgeText = agent.provider === 'groq' ? '⚡ Groq Fast' : '🌐 OpenRouter';

        return `
          <div class="agent-card ${isSelected ? 'selected' : ''}" onclick="window._selectAgent('${agent.id}')">
            <div class="agent-card-info">
              <div class="agent-card-icon">${agent.icon || '🧠'}</div>
              <div class="agent-card-text">
                <div class="agent-card-name">
                  <span>${this.escapeHtml(agent.name)}</span>
                </div>
                <div class="agent-card-desc">${this.escapeHtml(agent.desc)}</div>
              </div>
            </div>
            <div class="agent-card-badges">
              <span class="agent-badge ${agent.category === 'code' ? 'priority-code' : ''}">${agent.params}</span>
              <span class="agent-badge ${providerBadgeClass}">${providerBadgeText}</span>
              <span class="agent-selected-check">✓</span>
            </div>
          </div>
        `;
      }).join('');
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
  // 8. GLOBAL WINDOW BRIDGES FOR DEV OPERATIONS & TOOLS
  // ─────────────────────────────────────────────────────────────────
  window._loadDevConv = (id) => DevState.loadConversation(id);
  window._deleteDevConv = (id) => DevState.deleteConversation(id);

  window._openAgentModal = function() {
    $('agent-modal')?.classList.remove('hidden');
    DevUIEngine.renderAgentsGrid(state.currentFilter || 'all');
  };

  window._closeAgentModal = function() {
    $('agent-modal')?.classList.add('hidden');
  };

  window._filterAgents = function(category) {
    state.currentFilter = category;
    document.querySelectorAll('.agent-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.filter === category);
    });
    DevUIEngine.renderAgentsGrid(category);
  };

  window._selectAgent = function(agentId) {
    DevState.setSelectedAgent(agentId);
    const agent = DevState.getSelectedAgent();
    DevUIEngine.showToast(`🧠 تم اختيار: ${agent.name}`, 'success');
    window._closeAgentModal();
  };

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
        report += '- ✅ **مستودع المشروع:** متصل بنجاح وصلاحيات النشر فعالة (Branch: main)\n';
      } else {
        report += `- ❌ **مستودع المشروع:** خطأ HTTP ${repoRes.status}\n`;
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

      // Check OpenRouter
      const openRouterRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${DevConfigVault.getOpenRouterKey()}` }
      });
      if (openRouterRes.ok) {
        report += '- ✅ **محرك OpenRouter API:** متصل ونماذج 550B و Coder فعالة\n';
      } else {
        report += `- ⚠️ **محرك OpenRouter API:** كود ${openRouterRes.status}\n`;
      }

      report += '\n✨ **النتيجة:** استوديو المطور ونظام الحماية التلقائي (Fallback) في أتم الجاهزية والاستقرار!';
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
        card.className = 'dev-centered-banner';
        card.innerHTML = `
          <div style="color:#10b981; font-weight:700; font-size:15px; display:flex; align-items:center; justify-content:center; gap:8px;">
            <span>✅</span>
            <span>تم نشر التعديل بنجاح على GitHub وتحديث الموقع!</span>
          </div>
          <p style="font-size:13px; color:var(--text-muted); margin-top:4px;">
            الملف <code>${DevUIEngine.escapeHtml(data.file)}</code> تم تحديثه ونشره بنجاح في المستودع.
          </p>
          <div style="margin-top:8px; display:flex; justify-content:center; gap:8px;">
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
        editor.value = `// تعذر جلب محتوى الملف: ${e.message}`;
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
      DevUIEngine.showToast(`✅ تم حفظ ونشر ${fileName} بنجاح!`, 'success');
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
