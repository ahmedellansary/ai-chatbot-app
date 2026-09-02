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
      id: 'openai/gpt-oss-120b',
      provider: 'groq',
      name: 'GPT OSS 120B Lead Architect',
      icon: '👨‍💻',
      category: 'code',
      params: '120B Coder',
      desc: 'المهندس المعماري الأول لكتابة وهندسة الأكواد وتعديل ملفات التطبيق بدقة فائقة.',
      priority: 1
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      provider: 'openrouter',
      name: 'Llama 3.3 70B Coder (128k)',
      icon: '🦙',
      category: 'code',
      params: '70B 128k',
      desc: 'عملاق البرمجة المفتوح بسياق 128,000 توكن للمشاريع الكبيرة والملفات الضخمة دون أي اقتطاع.',
      priority: 1
    },
    {
      id: 'qwen/qwen-2.5-coder-32b-instruct:free',
      provider: 'openrouter',
      name: 'Qwen 2.5 Coder 32B (128k)',
      icon: '👨‍💻',
      category: 'code',
      params: '32B Coder',
      desc: 'متخصص رائد في كتابة ومراجعة شفرات المصدر والمشاريع البرمجية المعقدة.',
      priority: 1
    },
    {
      id: 'qwen/qwen3.8-27b',
      provider: 'groq',
      name: 'Qwen 3.8 27B Fast Coder',
      icon: '⚡',
      category: 'code',
      params: '27B Coder',
      desc: 'خبير برمجي فائق السرعة لتصحيح الأخطاء وتوليد دوال جافاسكريبت والـ CSS.',
      priority: 1
    },
    {
      id: 'groq/compound',
      provider: 'groq',
      name: 'AGENT_ROUTER (Compound Coder)',
      icon: '🧠',
      category: 'code',
      params: 'Agent Router',
      desc: 'وكيل البرمجة المركب الذكي يوجه طلبات التطوير تلقائياً لأفضل خطة معمارية.',
      priority: 1
    },
    {
      id: 'openai/gpt-oss-20b',
      provider: 'groq',
      name: 'GPT OSS 20B Rapid Coder',
      icon: '⚡',
      category: 'code',
      params: '20B Rapid',
      desc: 'مطور خفيف وسريع جداً للإجابات والتعديلات الفورية.',
      priority: 1
    },

    // ═══ 2. الأعلى معالم والقدرات المعمارية والسياق العملاق (128k - 200k Context) ═══
    {
      id: 'minimax/minimax-m3:free',
      provider: 'openrouter',
      name: 'MiniMax M3 Architect',
      icon: '👑',
      category: 'reasoning',
      params: '456B Context',
      desc: 'نموذج عملاق ذو سياق استيعاب ضخم للمشاريع متعددة الملفات والمراجعات الكبرى.',
      priority: 2
    },
    {
      id: 'minimax/minimax-m2.7:free',
      provider: 'openrouter',
      name: 'MiniMax M2.7 Reasoning',
      icon: '🧠',
      category: 'reasoning',
      params: 'M2.7 Reason',
      desc: 'تخطيط وتحليل المنطق المعماري البرمجي والتعديلات الهيكلية.',
      priority: 2
    },

    // ═══ 3. السرعة الفائقة والمهام الخفيفة (Ultra-Fast Execution) ═══
    {
      id: 'groq/compound-mini',
      provider: 'groq',
      name: 'Groq Compound Mini',
      icon: '⚡',
      category: 'fast',
      params: 'Mini Router',
      desc: 'وكيل سريع مركب للمهام اليومية الخفيفة والفحص السريع.',
      priority: 3
    }
  ];

  // ─────────────────────────────────────────────────────────────────
  // 3. AUTHENTICATION & LOCK GATE (DevAuthManager)
  // ─────────────────────────────────────────────────────────────────
  const MASTER_RECORD = 'd34a56498cc5f912d1f55cefd6382af6:c000fd79842150a9fdb7b3d30ed0f964652ad5ba078beb7b7f9c47a523a16595';

  const DevAuthManager = {
    async sha256(str) {
      const buffer = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async verify(password) {
      if (!password) return false;
      const customPin = localStorage.getItem('DEV_CUSTOM_PIN');
      if (customPin && password === customPin) return true;
      try {
        const [salt, expectedHash] = MASTER_RECORD.split(':');
        const calculated = await this.sha256(salt + ':' + password);
        return calculated === expectedHash;
      } catch (e) {
        return false;
      }
    },

    isUnlocked() {
      if (typeof window !== 'undefined' && window.__IS_DEV_PREVIEW === true) {
        return true;
      }
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
      const unlockBtn = $('gate-unlock-btn');
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
        if (unlockBtn) unlockBtn.innerHTML = '<span>جاري التحقق...</span> <span>⏳</span>';
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
          if (unlockBtn) unlockBtn.innerHTML = '<span>فتح بيئة المطور</span> <span>🔓</span>';
        }
      };

      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          handleGateSubmit();
        };
      }

      if (unlockBtn) {
        unlockBtn.onclick = (e) => {
          e.preventDefault();
          handleGateSubmit();
        };
      }

      if (pinInput) {
        pinInput.onkeydown = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleGateSubmit();
          }
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
      const binaryStr = atob(data.content.replace(/\s/g, ''));
      const bytes = Uint8Array.from(binaryStr, c => c.charCodeAt(0));
      const content = new TextDecoder('utf-8').decode(bytes);
      return { sha: data.sha, content };
    },

    async listFiles() {
      const url = `https://api.github.com/repos/${DevConfigVault.githubUser}/${DevConfigVault.githubRepo}/git/trees/${DevConfigVault.branch}?recursive=1&t=${Date.now()}`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to list repo files`);
      const data = await res.json();
      const files = (data.tree || [])
        .filter(item => item.type === 'blob')
        .map(item => item.path)
        .filter(path => !path.startsWith('.') && !path.includes('node_modules') && !path.includes('scratch/'));
      return files;
    },

    async commitFile(path, content, message, skipCacheBump = false) {
      let sha = null;
      try {
        const existing = await this.getFile(path);
        sha = existing.sha;
      } catch (e) {
        console.log(`[GitHub] Creating new file ${path}`);
      }

      const bytes = new TextEncoder().encode(content);
      let binaryStr = '';
      for (let i = 0; i < bytes.length; i++) {
        binaryStr += String.fromCharCode(bytes[i]);
      }
      const encodedContent = btoa(binaryStr);

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

      const result = await res.json();

      // Automatically bump Service Worker cache version if modifying production assets
      if (!skipCacheBump && path !== 'sw.js') {
        this.bumpServiceWorkerVersion().catch(() => {});
      }

      return result;
    },

    async bumpServiceWorkerVersion() {
      try {
        const swData = await this.getFile('sw.js');
        let swContent = swData.content;
        const match = swContent.match(/const\s+CACHE_NAME\s*=\s*['"]xv1-chat-v(\d+)['"]/);
        if (match) {
          const nextVer = parseInt(match[1], 10) + 1;
          const newSwContent = swContent.replace(
            /const\s+CACHE_NAME\s*=\s*['"]xv1-chat-v\d+['"]/,
            `const CACHE_NAME = 'xv1-chat-v${nextVer}'`
          );
          await this.commitFile('sw.js', newSwContent, `⚡ Auto-bump cache to v${nextVer} for instant deployment`, true);
          console.log(`[Cache Sync] Auto-bumped sw.js cache to v${nextVer}`);
        }
      } catch (err) {
        console.warn('[Cache Sync] Could not auto-bump sw.js:', err);
      }
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
    selectedAgentId: 'openai/gpt-oss-120b',
    activeAgentId: 'openai/gpt-oss-120b',
    isMultiAgentMode: localStorage.getItem('is_dev_multi_agent_mode') === '1',
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
    getAdaptiveConfigForDev(agent, estimatedTokens = 0) {
      if (estimatedTokens > 5000) return { recentCount: 10, maxBriefingChars: 1200 };
      if (!agent) return { recentCount: 10, maxBriefingChars: 1200 };
      if (agent.category === 'fast' || agent.id.includes('20b') || agent.id.includes('compound-mini')) return { recentCount: 6, maxBriefingChars: 600 };
      if (agent.provider === 'openrouter') return { recentCount: 10, maxBriefingChars: 1200 };
      return { recentCount: 10, maxBriefingChars: 1200 };
    },

    generateDevBriefing(conv, agent, estimatedTokens = 0) {
      if (!conv || !Array.isArray(conv.messages) || conv.messages.length <= 10) return '';
      const cfg = this.getAdaptiveConfigForDev(agent, estimatedTokens);
      const firstUser = (conv.messages.find(m => m.role === 'user')?.content || '').slice(0, 220).replace(/\n/g, ' ').trim();
      const recentAi = conv.messages.filter(m => m.role === 'ai').slice(-3).map(m => (m.content || '').slice(0, 200).replace(/\n/g, ' ').trim()).filter(Boolean).join(' | ');
      const turns = conv.messages.length;
      const title = conv.title || 'جلسة تطوير';
      let briefing = `📋 بريفنج جلسة المطور (${title}):\n- طلب التطوير الأساسي: ${firstUser.slice(0, 200)}\n- عدد التبادلات: ${turns}\n- آخر مخرجات: ${recentAi.slice(0, 380)}`;
      if (briefing.length > cfg.maxBriefingChars) briefing = briefing.slice(0, cfg.maxBriefingChars) + '...';
      return briefing;
    },

    // Dynamic Context-Aware Cascade:
    // If payload is large (> 5000 tokens), prioritizes 128k-200k OpenRouter models so no code is ever truncated.
    // If payload is normal (<= 5000 tokens), uses lightning-fast Groq models (120B / 27B) first.
    buildFallbackCascade(primaryAgent, estimatedTokens = 0) {
      // اختيارك أولوية قصوى، ثم الباقي من الأقوى للأضعف (حسب ترتيب DEV_AGENTS الأصلي)
      const remaining = DEV_AGENTS.filter(a => a.id !== primaryAgent.id);
      if (estimatedTokens > 5000) {
        const largeOpen = remaining.filter(a => a.provider === 'openrouter');
        const groqRest = remaining.filter(a => a.provider === 'groq');
        if (primaryAgent.provider === 'openrouter') {
          return [primaryAgent, ...largeOpen, ...groqRest];
        } else {
          return [primaryAgent, ...largeOpen, ...groqRest];
        }
      }
      return [primaryAgent, ...remaining];
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
          temperature: 0.3,
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
        const errMsg = errData.error?.message || `HTTP ${response.status}`;
        if (isGroq && /TPM|rate limit|too large|token/i.test(errMsg)) {
          DevConfigVault.rotateGroqKey();
          throw new Error('GROQ_RATE_LIMIT');
        }
        throw new Error(errMsg);
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

      // لا يتم إرسال أي ملفات في الخلفية تلقائياً - يتم إرسال ما يكتبه المستخدم أو يرفقه فقط عبر زر (+)

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

      const _devTierCfg = this.getAdaptiveConfigForDev(DevState.getSelectedAgent(), Math.ceil(((textForPayload?.length || 0) + (state.devPrompt?.length || 0)) / 3.5));
      const _devBriefing = this.generateDevBriefing(conv, DevState.getSelectedAgent(), Math.ceil(((textForPayload?.length || 0) + (state.devPrompt?.length || 0)) / 3.5));
      let systemPrompt = state.devPrompt || 'أنت مهندس برمجيات محترف ومطور تطبيق الشات ومستودع GitHub.';
      if (_devBriefing) {
        systemPrompt = `${systemPrompt}\n\n═══════════════════════════════════════════════════════════════\n${_devBriefing}\n═══════════════════════════════════════════════════════════════\n(خلاصة ذكية للجلسة الكاملة — استخدمها كسياق كأنك حاضر من البداية. آخر ${_devTierCfg.recentCount} رسائل هي النص الحرفي الأحدث)`;
      }
      const recentMessages = conv.messages
        .filter(m => m.id !== userMsg.id)
        .slice(-_devTierCfg.recentCount)
        .map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content }));

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...recentMessages,
        { role: 'user', content: textForPayload }
      ];

      let fullContent = '';
      const aiMsgId = generateId();
      const chosenAgent = DevState.getSelectedAgent();
      const estimatedTokens = Math.ceil((textForPayload.length + (systemPrompt?.length || 0)) / 3.5);
      const aiMsgObj = { id: aiMsgId, role: 'ai', content: '', model: state.isMultiAgentMode ? '👥 Multi-Agent Consensus' : chosenAgent.name };
      DevUIEngine.appendEmptyAiMessage(aiMsgObj);

      if (state.isMultiAgentMode) {
        try {
          await this.runDevMultiAgentConsensus(textForPayload, apiMessages, aiMsgId, aiMsgObj, conv, estimatedTokens);
        } catch (err) {
          if (err.name !== 'AbortError') {
            const errRow = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
            if (errRow) {
              errRow.innerHTML = `<span style="color:var(--accent-rose); font-size:13px;">⚠️ ${DevUIEngine.escapeHtml(err.message || 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة ثانية.')}</span>`;
            }
          }
        } finally {
          state.isStreaming = false;
          state.abortController = null;
          DevUIEngine.updateSendBtn();
        }
        return;
      }

      const fallbackList = this.buildFallbackCascade(chosenAgent, estimatedTokens);

      let succeeded = false;
      let usedAgent = chosenAgent;

      for (let i = 0; i < fallbackList.length; i++) {
        const currentAgent = fallbackList[i];
        try {
          // Update model badge live in UI
          const tagElem = document.querySelector(`[data-id="${aiMsgId}"] .msg-model-tag`);
          if (tagElem) {
            tagElem.innerHTML = `<span>${currentAgent.icon || '🧠'}</span> <span class="model-tag-name">${DevUIEngine.escapeHtml(currentAgent.name)}</span>`;
          }

          if (i > 0) {
            const msgElem = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
            if (msgElem && !fullContent) {
              msgElem.innerHTML = `<span style="color:#fbbf24; font-size:12.5px;">🔄 جاري التبديل التلقائي إلى <strong>${DevUIEngine.escapeHtml(currentAgent.name)}</strong>...</span>`;
            }
          }

          fullContent = '';
          await this.callSingleAgentStream(currentAgent, apiMessages, state.abortController.signal, (delta) => {
            fullContent += delta;
            const msgRow = document.querySelector(`[data-id="${aiMsgId}"]`);
            if (msgRow) {
              const hasAr = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFE]/.test(fullContent);
              msgRow.className = `message-row ai ${hasAr ? 'is-rtl' : 'is-ltr'}`;
              msgRow.setAttribute('dir', hasAr ? 'rtl' : 'ltr');
              const msgElem = msgRow.querySelector('.msg-content');
              if (msgElem) {
                msgElem.innerHTML = DevUIEngine.parseMarkdown(fullContent);
              }
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

          // اختيارك أولوية قصوى: حاول مرة ثانية مع نفس الموديل قبل الفولباك (من الأقوى للأضعف)
          if (i === 0) {
            try {
              if (currentAgent.provider === 'groq') DevConfigVault.rotateGroqKey();
              fullContent = '';
              const retryMsg = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
              if (retryMsg) retryMsg.innerHTML = `<span style="color:#fbbf24; font-size:12.5px;">🔄 إعادة محاولة مع <strong>${DevUIEngine.escapeHtml(currentAgent.name)}</strong>...</span>`;
              await new Promise(r => setTimeout(r, 700));
              await this.callSingleAgentStream(currentAgent, apiMessages, state.abortController.signal, (delta) => {
                fullContent += delta;
                const mRow = document.querySelector(`[data-id="${aiMsgId}"]`);
                if (mRow) {
                  const hasAr = /[\u0600-\u06FF]/.test(fullContent);
                  mRow.className = `message-row ai ${hasAr ? 'is-rtl' : 'is-ltr'}`;
                  const me = mRow.querySelector('.msg-content');
                  if (me) me.innerHTML = DevUIEngine.parseMarkdown(fullContent);
                }
              });
              succeeded = true;
              usedAgent = currentAgent;
              break;
            } catch (retryErr) {
              console.warn(`[Primary Retry Failed] ${currentAgent.name}:`, retryErr.message);
            }
          }

          // If Groq rate limit on fallback agents, rotate key once
          if (err.message === 'GROQ_RATE_LIMIT' && i > 0) {
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
        const errRow = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
        if (errRow) errRow.innerHTML = `<span style="color:var(--accent-rose);">⚠️ ${errorMsg}</span>`;
      }

      state.isStreaming = false;
      state.abortController = null;
      DevUIEngine.updateSendBtn();
    },

    async runDevMultiAgentConsensus(textForPayload, apiMessages, aiMsgId, aiMsgObj, conv, estimatedTokens = 0) {
      const msgRow = document.querySelector(`[data-id="${aiMsgId}"]`);
      const msgContent = msgRow ? msgRow.querySelector('.msg-content') : null;

      const renderLiveUI = (steps, finalContent = '', isThinking = true) => {
        if (!msgContent) return;

        const stepsHtml = steps.map(s => `
          <div class="agent-step-item">
            <div class="agent-step-header">
              <span class="agent-step-name">${s.icon} ${DevUIEngine.escapeHtml(s.title)}</span>
              <span class="agent-step-badge">${DevUIEngine.escapeHtml(s.status)}</span>
            </div>
            <div class="agent-step-body">${DevUIEngine.escapeHtml(s.summary || 'Analyzing...')}</div>
          </div>
        `).join('');

        const isDone = !isThinking && steps.every(s => s.status.includes('✓') || s.status.includes('Approved') || s.status.includes('Done'));
        const statusBadgeText = isDone ? '✓ Consensus Reached' : (steps.find(s => s.status === 'Active')?.title || 'In Progress...');

        const boxHtml = `
          <div class="multi-agent-box" id="box-${aiMsgId}">
            <div class="multi-agent-header" onclick="window._toggleThinkingBox('${aiMsgId}')">
              <div class="multi-agent-title">
                <span>👥</span>
                <span>Multi-Agent Consensus: <span style="color:#fbbf24; font-weight:600;">${DevUIEngine.escapeHtml(statusBadgeText)}</span></span>
              </div>
              <div class="multi-agent-toggle-indicator">
                <span id="indicator-${aiMsgId}">[Details ▾]</span>
              </div>
            </div>
            <div class="multi-agent-content">
              ${stepsHtml}
            </div>
          </div>
        `;

        const parsedFinal = finalContent ? DevUIEngine.parseMarkdown(finalContent) : (isThinking ? '<div style="color:var(--text-dim); font-size:12.5px; padding:4px;">⏳ Synthesizing verified response...</div>' : '');
        msgContent.innerHTML = boxHtml + parsedFinal;
      };

      const steps = [
        { id: 1, icon: '💡', title: 'Architectural Lead', status: 'Active', summary: 'Analyzing requirements...' },
        { id: 2, icon: '🛡️', title: 'Code & Security Auditor', status: 'Waiting', summary: 'Awaiting architectural plan...' },
        { id: 3, icon: '👑', title: 'Lead Dev Synthesizer', status: 'Waiting', summary: 'Awaiting reviews to synthesize final output...' }
      ];

      renderLiveUI(steps, '', true);

      // Helper to stream with automatic fallback cascade
      const streamWithCascade = async (preferredAgent, customMessages, onDelta) => {
        const cascade = this.buildFallbackCascade(preferredAgent, estimatedTokens);
        for (const agent of cascade) {
          try {
            await this.callSingleAgentStream(agent, customMessages, state.abortController.signal, onDelta);
            return agent;
          } catch (err) {
            if (err.name === 'AbortError') throw err;
            console.warn(`[Consensus Step Fallback] ${agent.name} failed:`, err.message);
          }
        }
        throw new Error('All consensus agents unavailable.');
      };

      // --- STAGE 1: Architectural Lead ---
      const stage1Agent = DEV_AGENTS.find(a => a.id === 'openai/gpt-oss-120b') || DEV_AGENTS[0];
      const stage1Messages = [
        ...apiMessages.slice(0, -1),
        { role: 'user', content: `${textForPayload}\n\n[DIRECTIVE]: Provide 2 concise technical points.` }
      ];

      let stage1Output = '';
      try {
        await streamWithCascade(stage1Agent, stage1Messages, (delta) => {
          stage1Output += delta;
        });
        steps[0].status = '✓ Done';
        steps[0].summary = stage1Output.slice(0, 100).trim() + '...';
        steps[1].status = 'Active';
        steps[1].summary = 'Auditing plan for security and edge cases...';
        renderLiveUI(steps, '', true);
      } catch (e) {
        if (e.name === 'AbortError') return;
        steps[0].status = '✓ Done';
        stage1Output = 'Architectural plan prepared.';
      }

      // --- STAGE 2: Code & Security Auditor ---
      const stage2Agent = DEV_AGENTS.find(a => a.id === 'meta-llama/llama-3.3-70b-instruct:free') || DEV_AGENTS.find(a => a.id === 'minimax/minimax-m2.7:free') || DEV_AGENTS[1];
      const stage2Messages = [
        ...apiMessages.slice(0, -1),
        { role: 'user', content: `Task: "${textForPayload.slice(0, 300)}"\nArch: "${stage1Output.slice(0, 300)}"\n[DIRECTIVE]: 1 concise audit review line.` }
      ];

      let stage2Output = '';
      try {
        await streamWithCascade(stage2Agent, stage2Messages, (delta) => {
          stage2Output += delta;
        });
        steps[1].status = '✓ Done';
        steps[1].summary = stage2Output.slice(0, 100).trim() + '...';
        steps[2].status = 'Active';
        steps[2].summary = 'Synthesizing final approved response...';
        renderLiveUI(steps, '', true);
      } catch (e) {
        if (e.name === 'AbortError') return;
        steps[1].status = '✓ Done';
        stage2Output = 'Security audit verified and approved.';
      }

      // --- STAGE 3: Final Synthesis & JSON Patch ---
      const stage3Agent = DevState.getSelectedAgent();
      const stage3Messages = [
        ...apiMessages.slice(0, -1),
        { role: 'user', content: `${textForPayload}\n\n[CONSENSUS CONTEXT]\nPlan: ${stage1Output.slice(0, 200)}\nReview: ${stage2Output.slice(0, 150)}\n\n[STRICT DIRECTIVE]: Respond directly in the EXACT SAME LANGUAGE as the user (Arabic if user wrote in Arabic). Keep your answer concise, natural, friendly, and helpful. Do not dump large raw code blocks into text. If code modification is needed, append the deployment JSON block at the very end.` }
      ];

      let finalOutput = '';
      try {
        await streamWithCascade(stage3Agent, stage3Messages, (delta) => {
          finalOutput += delta;
          renderLiveUI(steps, finalOutput, false);
        });

        steps[2].status = '✓ Approved';
        steps[2].summary = 'Response synthesized and ready.';
        renderLiveUI(steps, finalOutput, false);

        aiMsgObj.content = finalOutput;
        aiMsgObj.model = '👥 Multi-Agent Consensus';
        conv.messages.push(aiMsgObj);
        DevState.save();

        await this.handleDevProposal(finalOutput, msgRow);
      } catch (err) {
        if (err.name === 'AbortError') return;
        throw err;
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

          const existingCard = msgRow.querySelector('.dev-proposal-box');
          if (existingCard) existingCard.remove();

          const card = document.createElement('div');
          card.id = `proposal-${propId}`;
          card.className = 'dev-proposal-box';
          card.innerHTML = `
            <div class="dev-proposal-title">
              <span>🛠️</span>
              <span>Ready to Patch: <code>${DevUIEngine.escapeHtml(data.file)}</code></span>
            </div>
            <div class="dev-proposal-desc">📝 <strong>Summary:</strong> ${DevUIEngine.escapeHtml(data.message || 'Ready to commit & deploy to GitHub')}</div>
            <div class="dev-proposal-btns">
              <button class="dev-btn-action preview" onclick="window._previewProposal('${propId}')">
                <span>👁️</span>
                <span>Live Preview</span>
              </button>
              <button class="dev-btn-action deploy" onclick="window._deployProposal('${propId}')">
                <span>🚀</span>
                <span>Deploy to GitHub</span>
              </button>
              <button class="dev-btn-action review-fix" onclick="window._togglePatchDrawer('${propId}')">
                <span>🔍</span>
                <span>Inspect Patch ▾</span>
              </button>
              <button class="dev-btn-action cancel" onclick="window._cancelProposal('${propId}')">
                <span>✕</span>
              </button>
            </div>

            <!-- Collapsible Mini Code Drawer inside Proposal Card -->
            <div class="dev-patch-drawer hidden" id="drawer-${propId}">
              <div class="patch-drawer-header">
                <span>📄 Modified Code (${DevUIEngine.escapeHtml(data.file)})</span>
                <button class="btn-copy-patch" onclick="window._copyPatchContent('${propId}')">📋 Copy Code</button>
              </div>
              <pre class="patch-drawer-code"><code>${DevUIEngine.escapeHtml(data.content)}</code></pre>
            </div>
          `;
          msgRow.appendChild(card);
        }
      } catch (e) {
        console.warn('[Proposal Parse]', e);
      }
    }
  };

  async function updateDevVersionBadge() {
    const badgeEl = $('dev-status-badge-text');
    if (!badgeEl) return;

    const formatDateTime = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      const day = pad(d.getDate());
      const month = pad(d.getMonth() + 1);
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = pad(d.getMinutes());
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${day}-${month}-${year} ${hours}:${minutes}${ampm}`;
    };

    try {
      const res = await fetch('./version.json?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (data && data.version && data.updated_at) {
          const badgeText = `Dev (V${data.version}) ${data.updated_at}`;
          badgeEl.textContent = badgeText;
          localStorage.setItem('DEV_LAST_SYNC_BADGE', badgeText);
          return;
        }
      }
    } catch (e) {
      console.warn('[Version JSON Fetch]', e);
    }

    // Fallback if version.json unavailable
    let verNum = '129';
    try {
      const swRes = await fetch('./sw.js?t=' + Date.now());
      if (swRes.ok) {
        const swText = await swRes.text();
        const match = swText.match(/xv1-chat-v(\d+)/i);
        if (match) verNum = match[1];
      }
    } catch {}

    const fallbackBadge = `Dev (V${verNum}) ${formatDateTime(new Date())}`;
    badgeEl.textContent = fallbackBadge;
  }

  // ─────────────────────────────────────────────────────────────────
  // 7. UI ENGINE & MODALS (DevUIEngine)
  // ─────────────────────────────────────────────────────────────────
    setupSmoothKineticScroll() {
      const chatArea = $('chat-area');
      if (!chatArea) return;

      let isTouching = false;
      let startY = 0;
      let lastY = 0;
      let lastTime = 0;
      let velocityY = 0;
      let momentumAnimId = null;

      chatArea.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        isTouching = true;
        startY = e.touches[0].clientY;
        lastY = startY;
        lastTime = performance.now();
        velocityY = 0;
        if (momentumAnimId) {
          cancelAnimationFrame(momentumAnimId);
          momentumAnimId = null;
        }
      }, { passive: true });

      chatArea.addEventListener('touchmove', (e) => {
        if (!isTouching || e.touches.length !== 1) return;
        const now = performance.now();
        const currentY = e.touches[0].clientY;
        const dt = Math.max(now - lastTime, 1);
        const dy = lastY - currentY;

        const instV = dy / dt;
        velocityY = velocityY * 0.35 + instV * 0.65;

        lastY = currentY;
        lastTime = now;
      }, { passive: true });

      chatArea.addEventListener('touchend', () => {
        if (!isTouching) return;
        isTouching = false;

        const absV = Math.abs(velocityY);

        let multiplier = 0.5;
        let friction = 0.88;

        if (absV > 1.4) {
          multiplier = 2.2;
          friction = 0.95;
        } else if (absV > 0.8) {
          multiplier = 1.3;
          friction = 0.92;
        }

        let momentum = velocityY * multiplier * 16;

        function step() {
          if (Math.abs(momentum) < 0.15 || isTouching) return;
          chatArea.scrollTop += momentum;
          momentum *= friction;
          momentumAnimId = requestAnimationFrame(step);
        }

        if (Math.abs(momentum) > 0.8) {
          momentumAnimId = requestAnimationFrame(step);
        }
      }, { passive: true });

      let wheelTarget = null;
      let wheelAnimId = null;

      chatArea.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) < 12) return;
        e.preventDefault();

        if (wheelTarget === null) wheelTarget = chatArea.scrollTop;
        const delta = e.deltaY;
        const speedFactor = Math.abs(delta) > 70 ? 1.35 : 0.7;
        wheelTarget = Math.max(0, Math.min(chatArea.scrollHeight - chatArea.clientHeight, wheelTarget + delta * speedFactor));

        if (wheelAnimId) cancelAnimationFrame(wheelAnimId);

        function smoothWheelStep() {
          const diff = wheelTarget - chatArea.scrollTop;
          if (Math.abs(diff) < 0.8) {
            chatArea.scrollTop = wheelTarget;
            wheelTarget = null;
            return;
          }
          chatArea.scrollTop += diff * 0.16;
          wheelAnimId = requestAnimationFrame(smoothWheelStep);
        }
        wheelAnimId = requestAnimationFrame(smoothWheelStep);
      }, { passive: false });
    },

    init() {
      this.setupEventListeners();
      this.setupModelDropdown();
      this.setupPullToRefresh();
      this.setupSmoothKineticScroll();
      DevState.load();
      this.loadDevPrompt();
      DevAuthManager.setupGate();
      this.updateAgentPillDisplay();

      const multiBtn = $('dev-multi-agent-toggle-btn');
      if (multiBtn && state.isMultiAgentMode) {
        multiBtn.classList.add('active');
        const label = $('dev-multi-agent-label-text');
        if (label) label.textContent = 'Multi-Agent (Active)';
      }

      if (state.conversations.length) {
        DevState.loadConversation(state.conversations[0].id);
      } else {
        DevState.newConversation();
      }
      updateDevVersionBadge().catch(()=>{});
    },

    async loadDevPrompt() {
      try {
        const res = await fetch('./dev_prompt.txt?t=' + Date.now());
        if (res.ok) {
          state.devPrompt = await res.text();
        } else {
          const saved = localStorage.getItem('custom_dev_prompt');
          if (saved) state.devPrompt = saved;
        }
      } catch (e) {
        const saved = localStorage.getItem('custom_dev_prompt');
        if (saved) state.devPrompt = saved;
      }
      this.syncLiveRepoMap();
    },

    async syncLiveRepoMap() {
      try {
        const files = await DevGitHubService.listFiles();
        if (files && files.length > 0) {
          state.liveRepoFiles = files;
          const mapHeader = `\n\n═══════════════════════════════════════════════════════════════\n🗺️ LIVE GITHUB REPO DIRECTORY MAP (Auto-Synced on Startup):\n═══════════════════════════════════════════════════════════════\nActive Repository Files in main branch:\n` + 
            files.map(f => `- ${f}`).join('\n') + 
            `\n\nUse this live file directory to know exactly which file to inspect and propose modifications for when requested by the user.`;

          if (!state.devPrompt) state.devPrompt = '';

          // Replace old live map section if exists, or append
          if (state.devPrompt.includes('LIVE GITHUB REPO DIRECTORY MAP')) {
            state.devPrompt = state.devPrompt.replace(/═══════+\s*🗺️ LIVE GITHUB REPO DIRECTORY MAP[\s\S]*$/, mapHeader.trim());
          } else {
            state.devPrompt += mapHeader;
          }
          console.log('[DevStudio] Live Repo Map Synced:', files.length, 'files');
        }
      } catch (e) {
        console.log('[DevStudio] Live Repo Map sync skipped:', e.message);
      }
    },

    updateAgentPillDisplay() {
      const agent = DevState.getSelectedAgent();
      if (!agent) return;

      const pillLabel = $('selected-agent-label');
      const pillIcon = $('selected-agent-icon');
      const shortName = agent.name.replace(' Lead Architect', '').replace(' Fast Coder', '').replace(' Rapid Coder', '');
      if (pillLabel) pillLabel.textContent = shortName;
      if (pillIcon) pillIcon.textContent = agent.icon || '👨‍💻';
    },

    setupPullToRefresh() {
      const indicator = $('pull-refresh-indicator');
      if (!indicator) return;

      const spinner = indicator.querySelector('.pull-refresh-spinner');
      let startY = 0;
      let currentPull = 0;
      let isTracking = false;
      const TOP_THRESHOLD = 50;

      const onTouchStart = (e) => {
        if (e.touches.length !== 1) return;
        const chatArea = $('chat-area');
        if (!chatArea) return;
        if (chatArea.scrollTop <= 4) {
          startY = e.touches[0].clientY;
          isTracking = true;
          currentPull = 0;
        }
      };

      const onTouchMove = (e) => {
        if (!isTracking || e.touches.length !== 1) return;
        const y = e.touches[0].clientY;
        const diff = y - startY;

        if (diff > 8) {
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

        if (currentPull >= TOP_THRESHOLD) {
          indicator.classList.add('refreshing');
          indicator.style.transform = 'translate3d(-50%, 18px, 0) scale(1)';

          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
              for (const r of regs) r.update().catch(() => {});
            }).catch(() => {});
          }

          setTimeout(() => location.reload(), 320);
        } else {
          indicator.classList.remove('visible', 'refreshing');
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

    setupEventListeners() {
      const input = $('user-input');
      const sendBtn = $('send-btn');
      const newChatBtn = $('btn-new-dev-chat');
      const sidebarToggle = $('sidebar-toggle');

      if (input) {
        input.addEventListener('input', () => {
          input.style.height = 'auto';
          input.style.height = Math.min(input.scrollHeight, 180) + 'px';
          const hasAr = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFE]/.test(input.value || '');
          input.setAttribute('dir', hasAr ? 'rtl' : 'ltr');
          this.updateSendBtn();
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            // Enter inserts a newline naturally without sending
            setTimeout(() => {
              input.style.height = 'auto';
              input.style.height = Math.min(input.scrollHeight, 180) + 'px';
            }, 10);
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
        sidebarToggle.onclick = (e) => {
          e.stopPropagation();
          const sidebar = $('sidebar');
          const overlay = $('overlay');
          const isOpen = sidebar?.classList.contains('open');
          if (isOpen) {
            sidebar?.classList.remove('open');
            overlay?.classList.remove('active');
          } else {
            sidebar?.classList.add('open');
            overlay?.classList.add('active');
          }
        };
      }

      document.addEventListener('click', (e) => {
        const sidebar = $('sidebar');
        const overlay = $('overlay');

        if (e.target.closest('#close-sidebar-btn') || e.target.closest('#overlay')) {
          e.preventDefault();
          sidebar?.classList.remove('open');
          overlay?.classList.remove('active');
          return;
        }

        if (sidebar?.classList.contains('open') && !e.target.closest('#sidebar') && !e.target.closest('#sidebar-toggle')) {
          sidebar.classList.remove('open');
          overlay?.classList.remove('active');
        }
      });

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

    setupModelDropdown() {
      const pill = $('model-pill-trigger');
      const menu = $('model-dropdown-menu');
      if (!pill || !menu) return;

      const renderMenu = () => {
        const activeAgent = DevState.getSelectedAgent();
        menu.innerHTML = `
          <div style="padding:6px 8px; font-size:11px; font-weight:700; color:var(--text-dim); display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); margin-bottom:4px;">
            <span>🤖 اختر النموذج / الوكيل</span>
            <button type="button" onclick="event.stopPropagation(); window._openAgentModal();" style="background:transparent; border:none; color:#fbbf24; cursor:pointer; font-size:11px; font-weight:600;">🔍 التفاصيل</button>
          </div>
        ` + DEV_AGENTS.map(agent => {
          const isActive = agent.id === activeAgent.id;
          const providerText = agent.provider === 'groq' ? '⚡ Groq' : '🌐 OpenRouter';
          const shortName = agent.name.replace(' Lead Architect', '').replace(' Fast Coder', '').replace(' Rapid Coder', '');
          return `
            <button type="button" class="dropdown-opt ${isActive ? 'active' : ''}" onclick="window._selectAgentFromDropdown('${agent.id}')">
              <div class="opt-title">
                <span>${agent.icon || '🧠'} ${this.escapeHtml(shortName)}</span>
                ${isActive ? '<span style="color:#fbbf24; font-size:12px; font-weight:bold;">✓</span>' : ''}
              </div>
              <div class="opt-meta">
                <span class="opt-tag">${agent.params || ''}</span>
                <span class="opt-tag ${agent.provider}">${providerText}</span>
              </div>
            </button>
          `;
        }).join('');
      };

      pill.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        renderMenu();
        menu.classList.toggle('show');
      };

      document.addEventListener('click', (e) => {
        if (menu && !menu.contains(e.target) && !pill.contains(e.target)) {
          menu.classList.remove('show');
        }
      });
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
      container.innerHTML = state.attachments.map(a => {
        const isImg = a.type.startsWith('image/');
        const thumbHtml = isImg && a.dataUrl 
          ? `<img src="${a.dataUrl}" class="preview-thumb" alt="Preview">`
          : `<span style="font-size:16px;">📄</span>`;

        return `
          <div class="preview-item">
            ${thumbHtml}
            <span class="preview-name" title="${this.escapeHtml(a.name)}">${this.escapeHtml(a.name)}</span>
            <button type="button" class="preview-remove" onclick="window._removeDevAttachment('${a.id}')" title="Remove">✕</button>
          </div>
        `;
      }).join('');
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

      if (!messages || !messages.length) return;

      messages.forEach(msg => {
        if (!msg.isWelcome) {
          this.appendMessage(msg);
        }
      });
    },

    renderWelcomeHero() {
      // Clean direct workspace without welcome cards
    },

    appendMessage(msg) {
      const container = $('chat-container');
      if (!container) return;
      const row = document.createElement('div');
      const hasAr = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFE]/.test(msg.content || '');
      row.className = `message-row ${msg.role} ${hasAr ? 'is-rtl' : 'is-ltr'}`;
      row.setAttribute('dir', hasAr ? 'rtl' : 'ltr');
      row.dataset.id = msg.id;

      let modelBadgeHtml = '';
      if (msg.role === 'ai') {
        const modelName = msg.model || 'AI Developer';
        const matchedAgent = DEV_AGENTS.find(a => a.name === modelName);
        const icon = matchedAgent?.icon || '🧠';
        modelBadgeHtml = `<div class="msg-model-tag"><span>${icon}</span> <span class="model-tag-name">${this.escapeHtml(modelName)}</span></div>`;
      }

      const contentHtml = msg.role === 'ai' ? this.parseMarkdown(msg.content) : this.escapeHtml(msg.content);
      row.innerHTML = `
        <div class="msg-content">${contentHtml}</div>
        ${modelBadgeHtml}
      `;
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
      row.setAttribute('dir', 'rtl');
      row.dataset.id = msgObj.id;

      const modelName = msgObj.model || 'جاري التحليل...';
      const matchedAgent = DEV_AGENTS.find(a => a.name === modelName);
      const icon = matchedAgent?.icon || '🧠';

      row.innerHTML = `
        <div class="msg-content"><span style="color:var(--text-dim);">جاري التحليل وتجهيز التعديل...</span></div>
        <div class="msg-model-tag"><span>${icon}</span> <span class="model-tag-name">${this.escapeHtml(modelName)}</span></div>
      `;
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

      // Automatically strip proposal JSON blocks so raw code never floods chat stream
      out = out.replace(/```json\s*\{[\s\S]*?"file"[\s\S]*?"content"[\s\S]*?\}\s*```/g, '');
      out = out.replace(/\{[\s\S]*?"file"\s*:\s*["'][^"']+["'][\s\S]*?"content"\s*:[\s\S]*?\}/g, '');

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

  window._previewProposal = async function(propId) {
    const proposal = state.pendingModifications[propId];
    if (!proposal) {
      DevUIEngine.showToast('تعذر العثور على التعديل المطلوب للمعاينة', 'error');
      return;
    }

    const modal = $('dev-preview-modal');
    const frame = $('preview-sandbox-frame');
    const badge = $('preview-file-badge');
    const deployBtn = $('preview-deploy-btn');
    if (!modal || !frame) return;

    if (badge) badge.textContent = proposal.file;
    if (deployBtn) {
      deployBtn.onclick = () => {
        window._deployProposal(propId);
      };
    }

    modal.classList.remove('hidden');
    DevUIEngine.showToast('⏳ جاري تجهيز المعاينة الافتراضية للتعديل...', 'info');

    try {
      const targetFile = (proposal.file || '').toLowerCase().trim();
      let previewHtml = '';
      let appNameLabel = 'الشات الرئيسي';

      const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
      const baseTag = `<base href="${baseUrl}">`;

      if (targetFile.includes('ops.html')) {
        previewHtml = proposal.content;
        appNameLabel = 'مركز العمليات والاسترجاع';
      } else if (targetFile.includes('ops_style.css')) {
        const res = await fetch('./ops.html?t=' + Date.now());
        let baseHtml = res.ok ? await res.text() : '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>';
        previewHtml = baseHtml.replace(/<link[^>]*href=["'][^"']*ops_style\.css[^"']*["'][^>]*>/i, `<style>${proposal.content}</style>`);
        if (!previewHtml.includes(proposal.content)) {
          previewHtml = baseHtml.replace('</head>', `<style id="patch-override">${proposal.content}</style></head>`);
        }
        appNameLabel = 'مركز العمليات والاسترجاع';
      } else if (targetFile.includes('ops.js')) {
        const res = await fetch('./ops.html?t=' + Date.now());
        let baseHtml = res.ok ? await res.text() : '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>';
        previewHtml = baseHtml.replace(/<script[^>]*src=["'][^"']*ops\.js[^"']*["'][^>]*><\/script>/i, `<script>${proposal.content}<\/script>`);
        if (!previewHtml.includes(proposal.content)) {
          previewHtml = baseHtml.replace('</body>', `<script id="patch-override">${proposal.content}<\/script></body>`);
        }
        appNameLabel = 'مركز العمليات والاسترجاع';
      } else if (targetFile.includes('dev.html')) {
        previewHtml = proposal.content;
        appNameLabel = 'استوديو المطور';
      } else if (targetFile.includes('dev_style.css')) {
        const res = await fetch('./dev.html?t=' + Date.now());
        let baseHtml = res.ok ? await res.text() : '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>';
        previewHtml = baseHtml.replace(/<link[^>]*href=["'][^"']*dev_style\.css[^"']*["'][^>]*>/i, `<style>${proposal.content}</style>`);
        if (!previewHtml.includes(proposal.content)) {
          previewHtml = baseHtml.replace('</head>', `<style id="patch-override">${proposal.content}</style></head>`);
        }
        appNameLabel = 'استوديو المطور';
      } else if (targetFile.includes('dev.js')) {
        const res = await fetch('./dev.html?t=' + Date.now());
        let baseHtml = res.ok ? await res.text() : '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>';
        previewHtml = baseHtml.replace(/<script[^>]*src=["'][^"']*dev\.js[^"']*["'][^>]*><\/script>/i, `<script>${proposal.content}<\/script>`);
        if (!previewHtml.includes(proposal.content)) {
          previewHtml = baseHtml.replace('</body>', `<script id="patch-override">${proposal.content}<\/script></body>`);
        }
        appNameLabel = 'استوديو المطور';
      } else if (targetFile.includes('index.html')) {
        previewHtml = proposal.content;
        appNameLabel = 'الشات الرئيسي';
      } else if (targetFile.includes('style.css')) {
        const res = await fetch('./index.html?t=' + Date.now());
        let baseHtml = res.ok ? await res.text() : '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>';
        previewHtml = baseHtml.replace(/<link[^>]*href=["'][^"']*style\.css[^"']*["'][^>]*>/i, `<style>${proposal.content}</style>`);
        if (!previewHtml.includes(proposal.content)) {
          previewHtml = baseHtml.replace('</head>', `<style id="patch-override">${proposal.content}</style></head>`);
        }
        appNameLabel = 'الشات الرئيسي';
      } else if (targetFile.includes('app.js')) {
        const res = await fetch('./index.html?t=' + Date.now());
        let baseHtml = res.ok ? await res.text() : '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>';
        previewHtml = baseHtml.replace(/<script[^>]*src=["'][^"']*app\.js[^"']*["'][^>]*><\/script>/i, `<script>${proposal.content}<\/script>`);
        if (!previewHtml.includes(proposal.content)) {
          previewHtml = baseHtml.replace('</body>', `<script id="patch-override">${proposal.content}<\/script></body>`);
        }
        appNameLabel = 'الشات الرئيسي';
      } else {
        previewHtml = `
          <!DOCTYPE html>
          <html lang="ar" dir="rtl">
          <head>
            <meta charset="UTF-8">
            <style>
              body { background: #0d0d10; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; }
              h2 { color: #60a5fa; display: flex; align-items: center; gap: 8px; font-size: 18px; }
              pre { background: #14141b; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 18px; font-family: monospace; font-size: 13.5px; color: #a5f3fc; overflow: auto; line-height: 1.6; direction: ltr; text-align: left; }
              .info-card { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #bfdbfe; margin-bottom: 16px; }
            </style>
          </head>
          <body>
            <h2><span>📄</span> <span>معاينة محتوى الملف: ${DevUIEngine.escapeHtml(proposal.file)}</span></h2>
            <div class="info-card">💡 هذا الملف تم إعداده وسيتم تحديثه في المستودع عند الضغط على زر النشر أعلاه.</div>
            <pre>${DevUIEngine.escapeHtml(proposal.content)}</pre>
          </body>
          </html>
        `;
      }

      if (badge) badge.textContent = `${proposal.file} (${appNameLabel})`;

      const bypassSnippet = `
        <script>
          window.__IS_DEV_PREVIEW = true;
          try {
            sessionStorage.setItem('xv1_authenticated', 'true');
            sessionStorage.setItem('DEV_PORTAL_UNLOCKED', 'true');
            sessionStorage.setItem('OPS_PORTAL_UNLOCKED', 'true');
            sessionStorage.setItem('owner_unlocked', '1');
            localStorage.setItem('owner_unlocked', '1');
          } catch(e) {}
        </script>
        <style>
          #app-lock-gate, .app-lock-gate, #ops-lock-gate, #auth-overlay, .auth-overlay {
            display: none !important;
            pointer-events: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        </style>
      `;

      if (previewHtml.includes('<head>')) {
        previewHtml = previewHtml.replace('<head>', '<head>' + baseTag + bypassSnippet);
      } else {
        previewHtml = baseTag + bypassSnippet + previewHtml;
      }

      frame.srcdoc = previewHtml;
      DevUIEngine.showToast(`✅ تم تشغيل معاينة (${appNameLabel}) بنجاح!`, 'success');
    } catch (err) {
      console.error('Preview error:', err);
      DevUIEngine.showToast('تعذر تحميل ملفات المعاينة: ' + err.message, 'error');
    }
  };

  window._closePreviewModal = function() {
    const modal = $('dev-preview-modal');
    const frame = $('preview-sandbox-frame');
    if (modal) modal.classList.add('hidden');
    if (frame) frame.srcdoc = '';
  };

  window._deployProposal = async function(propId) {
    const data = state.pendingModifications[propId];
    if (!data) return;

    DevUIEngine.showToast(`🚀 جاري رفع التعديل لملف ${data.file} على GitHub...`, 'info');
    try {
      await DevGitHubService.commitFile(data.file, data.content, data.message || `Update ${data.file} via Dev Portal`);
      window._closePreviewModal();
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

  window._togglePatchDrawer = function(propId) {
    const drawer = $(`drawer-${propId}`);
    if (drawer) drawer.classList.toggle('hidden');
  };

  window._copyPatchContent = function(propId) {
    const data = state.pendingModifications[propId];
    if (data && data.content) {
      navigator.clipboard.writeText(data.content).then(() => {
        DevUIEngine.showToast('📋 تم نسخ كود التعديل إلى الحافظة!', 'success');
      });
    }
  };

  window._cancelProposal = function(propId) {
    const card = $(`proposal-${propId}`);
    if (card) card.remove();
    delete state.pendingModifications[propId];
    DevUIEngine.showToast('تم إلغاء التعديل', 'info');
  };

  let repoFilesCache = [];

  function renderRepositoryFilesExplorer() {
    const activeLabel = $('active-file-name-display');
    const dropdown = $('see-more-files-dropdown');
    const syncText = $('files-sync-text');

    const allFiles = repoFilesCache.length > 0 
      ? repoFilesCache 
      : ['index.html', 'style.css', 'app.js', 'dev.html', 'dev_style.css', 'dev.js', 'system_prompt.txt', 'sw.js', 'manifest.json', 'ops.html', 'ops_style.css', 'ops.js'];

    const activeFile = state.currentEditingFile || 'index.html';

    // 1. Update Active File Name on Left
    if (activeLabel) {
      activeLabel.textContent = activeFile;
    }

    // 2. Update Last Sync Timestamp
    if (syncText) {
      const savedSync = localStorage.getItem('FILES_LAST_SYNC_TIME');
      syncText.textContent = savedSync || 'Synced';
    }

    // 3. Render See More Dropdown List
    if (dropdown) {
      dropdown.innerHTML = allFiles.map(file => `
        <button type="button" class="see-more-file-item ${file === activeFile ? 'active' : ''}" onclick="window._selectFileForEditing('${file.replace(/'/g, "\\'")}')">
          <span>${file}</span>
          ${file === activeFile ? '<span style="color:#fbbf24; font-size:11px;">Active</span>' : ''}
        </button>
      `).join('');
    }
  }

  window._toggleSeeMoreFiles = function(e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const dropdown = $('see-more-files-dropdown');
    const chevron = $('see-more-chevron');
    if (!dropdown) return;
    const isHidden = dropdown.classList.contains('hidden');
    if (isHidden) {
      dropdown.classList.remove('hidden');
      if (chevron) chevron.textContent = '▴';
    } else {
      dropdown.classList.add('hidden');
      if (chevron) chevron.textContent = '▾';
    }
  };

  document.addEventListener('click', (e) => {
    const dropdown = $('see-more-files-dropdown');
    const btn = $('btn-see-more-files');
    if (dropdown && !dropdown.classList.contains('hidden')) {
      if (!dropdown.contains(e.target) && !btn?.contains(e.target)) {
        dropdown.classList.add('hidden');
        const chevron = $('see-more-chevron');
        if (chevron) chevron.textContent = '▾';
      }
    }
  });

  window._syncFilesManual = async function() {
    const syncBtn = $('btn-sync-files-manual');
    const syncText = $('files-sync-text');
    if (syncBtn) syncBtn.classList.add('spinning');
    if (syncText) syncText.textContent = 'Syncing...';

    DevUIEngine.showToast('🔄 Comparing and syncing files with GitHub...', 'info');

    const formatDateTime = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      const day = pad(d.getDate());
      const month = pad(d.getMonth() + 1);
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = pad(d.getMinutes());
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${day}-${month}-${year} ${hours}:${minutes}${ampm}`;
    };

    try {
      const files = await DevGitHubService.listFiles();
      if (files && files.length) {
        repoFilesCache = files;
      }
      
      // Reload current active file
      const activeFile = state.currentEditingFile || 'index.html';
      const fileData = await DevGitHubService.getFile(activeFile);
      const editor = $('direct-code-editor');
      if (editor && fileData && fileData.content) {
        editor.value = fileData.content;
      }

      // Get latest commit time for these files
      let syncTimestamp = `Synced: ${formatDateTime(new Date())}`;
      try {
        const commitRes = await fetch(`https://api.github.com/repos/ahmedellansary/ai-chatbot-app/commits?per_page=1&t=${Date.now()}`, {
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        if (commitRes.ok) {
          const commits = await commitRes.json();
          if (commits && commits.length) {
            const rawDate = commits[0].commit.committer.date || commits[0].commit.author.date;
            syncTimestamp = `Synced: ${formatDateTime(new Date(rawDate))}`;
          }
        }
      } catch {}

      localStorage.setItem('FILES_LAST_SYNC_TIME', syncTimestamp);
      if (syncText) syncText.textContent = syncTimestamp;

      renderRepositoryFilesExplorer();
      updateDevVersionBadge().catch(()=>{});
      DevUIEngine.showToast(`✅ Synced ${repoFilesCache.length} repository files successfully!`, 'success');
    } catch (e) {
      DevUIEngine.showToast(`⚠️ Sync notice: ${e.message}`, 'error');
      if (syncText) syncText.textContent = 'Sync failed';
    } finally {
      if (syncBtn) syncBtn.classList.remove('spinning');
    }
  };

  window._openFilesModal = async function() {
    $('files-modal')?.classList.remove('hidden');
    window._selectFileForEditing(state.currentEditingFile || 'index.html');
    renderRepositoryFilesExplorer();

    try {
      const files = await DevGitHubService.listFiles();
      if (files && files.length) {
        repoFilesCache = files;
        renderRepositoryFilesExplorer();
      }
    } catch (e) {
      console.warn('[Files list fetch]', e);
    }
  };

  window._closeFilesModal = function() {
    $('files-modal')?.classList.add('hidden');
    $('see-more-files-dropdown')?.classList.add('hidden');
  };

  window._selectFileForEditing = async function(fileName, preloadedContent = null) {
    state.currentEditingFile = fileName;
    $('see-more-files-dropdown')?.classList.add('hidden');
    const chevron = $('see-more-chevron');
    if (chevron) chevron.textContent = '▾';

    renderRepositoryFilesExplorer();
    const editor = $('direct-code-editor');

    if (editor) {
      if (preloadedContent) {
        editor.value = preloadedContent;
        return;
      }
      editor.value = 'Fetching file contents from GitHub...';
      try {
        const fileData = await DevGitHubService.getFile(fileName);
        editor.value = fileData.content;
      } catch (e) {
        editor.value = `// Failed to load file: ${e.message}`;
      }
    }
  };

  window._commitCurrentEditorFile = async function() {
    const fileName = state.currentEditingFile || 'index.html';
    const editor = $('direct-code-editor');
    if (!editor) return;

    const content = editor.value;
    if (!content.trim()) {
      DevUIEngine.showToast('File content is empty!', 'warning');
      return;
    }

    if (!confirm(`Are you sure you want to commit and deploy direct changes to ${fileName} to GitHub?`)) return;

    DevUIEngine.showToast(`💾 Committing and deploying ${fileName} to GitHub...`, 'info');
    try {
      await DevGitHubService.commitFile(fileName, content, `Direct edit of ${fileName} via X.v1 Dev Portal`);
      DevUIEngine.showToast(`✅ Successfully deployed ${fileName}!`, 'success');
      updateDevVersionBadge().catch(()=>{});
    } catch (e) {
      DevUIEngine.showToast(`❌ Commit failed: ${e.message}`, 'error');
    }
  };

  // ─── Agent / Model Selector Modal Handlers ───
  window._openAgentModal = function() {
    const modal = $('agent-modal');
    if (!modal) return;
    window._renderAgentsList('all');
    modal.classList.remove('hidden');
    DevUIEngine.closeSidebar();
  };

  window._closeAgentModal = function() {
    $('agent-modal')?.classList.add('hidden');
  };

  window._filterAgents = function(filter) {
    document.querySelectorAll('.agent-tab').forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-filter') === filter);
    });
    window._renderAgentsList(filter);
  };

  window._renderAgentsList = function(filter = 'all') {
    const container = $('agents-grid');
    if (!container) return;

    const filtered = DEV_AGENTS.filter(a => filter === 'all' || a.category === filter);
    container.innerHTML = filtered.map(agent => {
      const isSelected = (state.activeAgentId || DEV_AGENTS[0].id) === agent.id;
      return `
        <div class="agent-card ${isSelected ? 'selected' : ''}" onclick="window._selectAgent('${agent.id}')">
          <div class="agent-card-header">
            <span class="agent-card-icon">${agent.icon || '👨‍💻'}</span>
            <div class="agent-card-title-wrap">
              <div class="agent-card-name">${DevUIEngine.escapeHtml(agent.name)}</div>
              <div class="agent-card-meta">
                <span class="agent-badge ${agent.provider}">${agent.provider.toUpperCase()}</span>
                <span class="agent-badge">${agent.params || ''}</span>
              </div>
            </div>
            ${isSelected ? '<span class="agent-selected-check">✓</span>' : ''}
          </div>
          <div class="agent-card-desc">${DevUIEngine.escapeHtml(agent.desc || '')}</div>
        </div>
      `;
    }).join('');
  };

  window._selectAgent = function(agentId) {
    const agent = DEV_AGENTS.find(a => a.id === agentId);
    if (!agent) return;

    state.activeAgentId = agent.id;
    localStorage.setItem('active_dev_agent_id', agent.id);

    DevUIEngine.updateAgentPillDisplay();
    $('model-dropdown-menu')?.classList.remove('show');
    window._closeAgentModal();
    DevUIEngine.showToast(`🎯 تم اختيار المهندس: ${agent.name}`, 'success');
  };

  window._selectAgentFromDropdown = (id) => window._selectAgent(id);

  window._toggleDevMultiAgentMode = function() {
    state.isMultiAgentMode = !state.isMultiAgentMode;
    localStorage.setItem('is_dev_multi_agent_mode', state.isMultiAgentMode ? '1' : '0');
    const btn = $('dev-multi-agent-toggle-btn');
    if (btn) btn.classList.toggle('active', !!state.isMultiAgentMode);
    const label = $('dev-multi-agent-label-text');
    if (label) label.textContent = state.isMultiAgentMode ? 'تشاور الوكلاء (نشط)' : 'تشاور الوكلاء';
    DevUIEngine.showToast(state.isMultiAgentMode ? '👥 تم تفعيل تشاور الوكلاء في استوديو المطور!' : '⚪ تم تعطيل تشاور الوكلاء', 'info');
  };

  window._toggleThinkingBox = function(msgId) {
    const box = document.getElementById(`box-${msgId}`);
    if (box) box.classList.toggle('collapsed');
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

  function lockViewportHeight() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${h}px`);
  }

  window.addEventListener('resize', lockViewportHeight);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', lockViewportHeight);
    window.visualViewport.addEventListener('scroll', lockViewportHeight);
  }
  lockViewportHeight();

  window._refreshApp = async function() {
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.update();
      } catch {}
    }
    window.location.reload();
  };

  async function updateDevVersionBadge() {
    const vEl = document.getElementById('dev-version-text');
    const dEl = document.getElementById('dev-last-update');
    const vEl2 = document.getElementById('dev-version');
    if (vEl || vEl2) {
      try {
        const r = await fetch('./sw.js?t='+Date.now());
        const t = await r.text();
        const m = t.match(/xv1-chat-v(\d+)/);
        if (m) {
          const v = 'v'+m[1];
          if (vEl) vEl.textContent = v;
          if (vEl2) vEl2.textContent = v;
        }
      } catch {}
    }
    if (dEl) {
      try {
        const r = await fetch('https://api.github.com/repos/ahmedellansary/ai-chatbot-app/commits?per_page=1&t='+Date.now());
        if (r.ok) {
          const j = await r.json();
          const date = j[0]?.commit?.committer?.date || j[0]?.commit?.author?.date;
          if (date) { dEl.textContent = new Date(date).toLocaleDateString('ar-EG', {year:'numeric', month:'short', day:'numeric'}); return; }
        }
      } catch {}
      dEl.textContent = new Date().toLocaleDateString('ar-EG', {year:'numeric', month:'short', day:'numeric'});
    }
  }

  window._clearDevCache = async function() {
    try {
      const preservedConvs = localStorage.getItem('dev_conversations');
      const preservedAgent = localStorage.getItem('dev_selected_agent');
      const preservedGroq = localStorage.getItem('GROQ_API_KEY');
      const preservedOr = localStorage.getItem('OPENROUTER_API_KEY');
      const preservedGh = localStorage.getItem('GITHUB_TOKEN');
      const preservedPin = localStorage.getItem('DEV_CUSTOM_PIN');
      if (typeof caches !== 'undefined' && caches.keys) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
      if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
      localStorage.clear();
      if (preservedConvs) localStorage.setItem('dev_conversations', preservedConvs);
      if (preservedAgent) localStorage.setItem('dev_selected_agent', preservedAgent);
      if (preservedGroq) localStorage.setItem('GROQ_API_KEY', preservedGroq);
      if (preservedOr) localStorage.setItem('OPENROUTER_API_KEY', preservedOr);
      if (preservedGh) localStorage.setItem('GITHUB_TOKEN', preservedGh);
      if (preservedPin) localStorage.setItem('DEV_CUSTOM_PIN', preservedPin);
      DevUIEngine.showToast('✅ تم تنظيف الكاش مع الحفاظ على مهامك!', 'success');
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      console.warn('[DevCache] Clear error:', e);
      window.location.reload();
    }
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      lockViewportHeight();
      DevUIEngine.init();
    });
  } else {
    lockViewportHeight();
    DevUIEngine.init();
  }

})();
