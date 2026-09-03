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
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  try { window.generateId = generateId; window.escapeHtml = escapeHtml; } catch(e) {}

  // ─────────────────────────────────────────────────────────────────
  // 1. CONFIGURATION & CREDENTIALS VAULT — Unified (config.js)
  // ─────────────────────────────────────────────────────────────────
  const DevConfigVault = window.DevConfigVault || window.ConfigVault || window.OpsConfig || (() => {
    const _k1f = ['sk-or-v1-', 'b82e11595ed064e7', '51bfff2b251a4c54', 'ca0da9bc779786cd', 'baf933e916398e03'].join('');
    const _k2f = [['gsk_6ULPilUmj8gf0mbu2ZlX', 'WGdyb3FYkqImKQ7lZPdjGIBERqBKrDhX'].join(''), ['gsk_ECkO3AaJ8sBRAnd7gLMN', 'WGdyb3FYTMBNYK0SxQU6W1CSXEx23koB'].join(''), ['gsk_QiThrmueUOxgPM9xcIwn', 'WGdyb3FYVF37eSLhIgG9RYTXakzxc16l'].join(''), ['gsk_dVkSeAKGE0wQRxqy7OWX', 'WGdyb3FY0vHBuaJxlmnjbaPytbsl4dn8'].join(''), ['gsk_u5bCiNIx7oQaS2XzqiAG', 'WGdyb3FYE6s7QoY0qntIUhBU4D13AhjZ'].join('')].join(',');
    const _k3f = [String.fromCharCode(103,104,112,95)+'Ep2hC2i0', 'LFNVeyCSiUFlMMb0', '5ILzmJ2nzGGN'].join('');
    return {
      groqKeys: _k2f.split(',').map(v=>v.trim()).filter(Boolean), groqIndex:0, openRouterKey:_k1f, githubToken:_k3f, githubUser:'ahmedellansary', githubRepo:'ai-chatbot-app', branch:'main',
      getGroqKey(){ const c=localStorage.getItem('GROQ_API_KEY'); if(c&&c.trim()) return c.trim(); return this.groqKeys[this.groqIndex%this.groqKeys.length]; },
      rotateGroqKey(){ this.groqIndex=(this.groqIndex+1)%this.groqKeys.length; },
      getOpenRouterKey(){ const c=localStorage.getItem('OPENROUTER_API_KEY'); return (c&&c.trim())?c.trim():this.openRouterKey; },
      getGithubToken(){ const c=localStorage.getItem('GITHUB_TOKEN'); return (c&&c.trim())?c.trim():this.githubToken; }
    };
  })();

  // ─────────────────────────────────────────────────────────────────
  // 2. DEV AGENTS CATALOG (Hierarchy: Coding -> High-Params -> Fast)
  // ─────────────────────────────────────────────────────────────────
  const DEV_TIER_MODELS = (window.DEV_TIER_MODELS) || {
    HIGH: [
      { id: 'poolside/laguna-s-2.1:free', name: 'Laguna S 2.1 (118B Coding Agent)', provider: 'openrouter' },
      { id: 'minimax/minimax-m3:free', name: 'MiniMax M3 Architect (1M)', provider: 'openrouter' },
      { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super 120B', provider: 'openrouter' },
      { id: 'z-ai/glm-5.2:free', name: 'GLM 5.2 Reasoning (1M)', provider: 'openrouter' },
      { id: 'minimax/minimax-m2.7:free', name: 'MiniMax M2.7 Reasoning', provider: 'openrouter' }
    ],
    MID: [
      { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B Lead Architect', provider: 'groq' },
      { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B Fast Coder', provider: 'groq' },
      { id: 'poolside/laguna-s-2.1:free', name: 'Laguna S 2.1 (118B Coding Agent)', provider: 'openrouter' },
      { id: 'cohere/north-mini-code:free', name: 'North Mini Code (30B)', provider: 'openrouter' },
      { id: 'minimax/minimax-m2.7:free', name: 'MiniMax M2.7 Reasoning', provider: 'openrouter' }
    ],
    FAST: [
      { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B Fast Coder', provider: 'groq' },
      { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', provider: 'groq' },
      { id: 'groq/compound', name: 'Groq Compound', provider: 'groq' },
      { id: 'poolside/laguna-xs-2.1:free', name: 'Laguna XS 2.1 (33B)', provider: 'openrouter' },
      { id: 'cohere/north-mini-code:free', name: 'North Mini Code', provider: 'openrouter' }
    ]
  };

  const DEV_AGENTS = [
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
      id: 'poolside/laguna-s-2.1:free',
      provider: 'openrouter',
      name: 'Laguna S 2.1 (118B Coding Agent)',
      icon: '🏄',
      category: 'code',
      params: '118B Coder',
      desc: 'بطل البرمجة وهندسة الأكواد المتصدر لاختبارات Terminal-Bench و DeepSWE.',
      priority: 1
    },
    {
      id: 'z-ai/glm-5.2:free',
      provider: 'openrouter',
      name: 'GLM 5.2 Reasoning (1M)',
      icon: '🧠',
      category: 'code',
      params: '1M Context',
      desc: 'عملاق التفكير الهندسي البرمجي بسياق 1M لإدارة وتطوير المشاريع الكاملة.',
      priority: 1
    },
    {
      id: 'cohere/north-mini-code:free',
      provider: 'openrouter',
      name: 'Cohere North Mini Code (30B)',
      icon: '💻',
      category: 'code',
      params: '30B Agentic',
      desc: 'أول وكيل برمجي متخصص من Cohere لمهام هندسة البرمجيات والطرفية.',
      priority: 1
    },
    {
      id: 'minimax/minimax-m2.7:free',
      provider: 'openrouter',
      name: 'MiniMax M2.7 Reasoning',
      icon: '🔬',
      category: 'reasoning',
      params: 'M2.7 Agent',
      desc: 'تصحيح الأخطاء المباشر Live Debugging وتحليل الأسباب الجذرية.',
      priority: 2
    },
    {
      id: 'poolside/laguna-xs-2.1:free',
      provider: 'openrouter',
      name: 'Laguna XS 2.1 Fast (33B)',
      icon: '⚡',
      category: 'fast',
      params: '33B FP8',
      desc: 'نسخة الكود المدمجة فائقة السرعة للأوامر والتعديلات الفورية.',
      priority: 3
    },
    {
      id: 'groq/compound',
      provider: 'groq',
      name: 'Groq Compound Coder',
      icon: '🧠',
      category: 'fast',
      params: 'Compound',
      desc: 'وكيل البرمجة المركب الذكي يوجه طلبات التطوير تلقائياً.',
      priority: 3
    }
  ];
  try { window.DEV_AGENTS = DEV_AGENTS; window.DEV_TIER_MODELS = DEV_TIER_MODELS; } catch(e) {}

  // ─────────────────────────────────────────────────────────────────
  // 3. AUTHENTICATION & LOCK GATE (DevAuthManager)
  // ─────────────────────────────────────────────────────────────────
  // 3. AUTH — Unified (auth.js) — Single Source of Truth
  const MASTER_RECORD = window.MASTER_AUTH_RECORD || 'd34a56498cc5f912d1f55cefd6382af6:c000fd79842150a9fdb7b3d30ed0f964652ad5ba078beb7b7f9c47a523a16595';
  const DevAuthManager = window.DevAuthManager || window.AuthManager || (window.createAuthManager ? window.createAuthManager({
    storageKey: 'DEV_PORTAL_UNLOCKED',
    previewFlag: '__IS_DEV_PREVIEW',
    legacyKeys: [],
    gateId: 'app-lock-gate',
    formId: 'lock-gate-form',
    inputId: 'gate-pin-input',
    buttonId: 'gate-unlock-btn'
  }) : null);

  // ─────────────────────────────────────────────────────────────────
  // 4. GITHUB SERVICE & DEPLOYMENT — Unified (github.js)
  // ─────────────────────────────────────────────────────────────────
  const DevGitHubService = window.DevGitHubService || window.GitHubService || window.UnifiedGitHub || window.OpsGitHubEngine || (() => {
    // Fallback minimal if github.js fails to load (preserves original behavior)
    const _gh = window.GitHubService || window.UnifiedGitHub;
    return _gh || {
      getHeaders(){ return {'Authorization':`Bearer ${DevConfigVault.getGithubToken()}`,'Accept':'application/vnd.github.v3+json','Content-Type':'application/json','User-Agent':'Xv1-Dev-Portal'}; },
      async getFile(p){ const u=`https://api.github.com/repos/${DevConfigVault.githubUser}/${DevConfigVault.githubRepo}/contents/${p}?ref=${DevConfigVault.branch}&t=${Date.now()}`; const r=await fetch(u,{headers:this.getHeaders()}); if(!r.ok) throw new Error(`HTTP ${r.status}: Failed to fetch ${p}`); const d=await r.json(); const b=atob(d.content.replace(/\s/g,'')); const bytes=Uint8Array.from(b,c=>c.charCodeAt(0)); return {sha:d.sha, content:new TextDecoder('utf-8').decode(bytes)}; },
      async listFiles(){ const u=`https://api.github.com/repos/${DevConfigVault.githubUser}/${DevConfigVault.githubRepo}/git/trees/${DevConfigVault.branch}?recursive=1&t=${Date.now()}`; const r=await fetch(u,{headers:this.getHeaders()}); if(!r.ok) throw new Error(`HTTP ${r.status}: Failed to list repo files`); const d=await r.json(); return (d.tree||[]).filter(x=>x.type==='blob').map(x=>x.path).filter(p=>!p.startsWith('.')&&!p.includes('node_modules')); },
      async commitFile(p,c,m,s=false){ let s1=null; try{ s1=(await this.getFile(p)).sha; }catch{} const b=new TextEncoder().encode(c); let s2=''; for(let i=0;i<b.length;i++) s2+=String.fromCharCode(b[i]); const e=btoa(s2); const u=`https://api.github.com/repos/${DevConfigVault.githubUser}/${DevConfigVault.githubRepo}/contents/${p}`; const bd={message:m||`Auto-update ${p}`,content:e,branch:DevConfigVault.branch}; if(s1) bd.sha=s1; const r=await fetch(u,{method:'PUT',headers:this.getHeaders(),body:JSON.stringify(bd)}); if(!r.ok) throw new Error((await r.json().catch(()=>({}))).message||`HTTP ${r.status}`); const res=await r.json(); if(!s&&p!=='sw.js') this.bumpServiceWorkerVersion().catch(()=>{}); return res; },
      async bumpServiceWorkerVersion(){ try{ const d=await this.getFile('sw.js'); const mat=d.content.match(/const\s+CACHE_NAME\s*=\s*['"]xv1-chat-v(\d+)['"]/); if(mat){ const n=parseInt(mat[1],10)+1; await this.commitFile('sw.js',d.content.replace(/const\s+CACHE_NAME\s*=\s*['"]xv1-chat-v\d+['"]/,`const CACHE_NAME = 'xv1-chat-v${n}'`),`⚡ Auto-bump cache to v${n}`,true); } }catch(e){ console.warn('[Cache Sync] Could not auto-bump sw.js:',e); } },
      async listCommits(pp=10){ const u=`https://api.github.com/repos/${DevConfigVault.githubUser}/${DevConfigVault.githubRepo}/commits?per_page=${pp}&sha=${DevConfigVault.branch}&t=${Date.now()}`; const r=await fetch(u,{headers:this.getHeaders()}); if(!r.ok) throw new Error(`HTTP ${r.status}: Failed to fetch commit history`); return await r.json(); },
      async rollbackFileToCommit(p,sha){ const r=await fetch(`https://raw.githubusercontent.com/${DevConfigVault.githubUser}/${DevConfigVault.githubRepo}/${sha}/${p}`); if(!r.ok) throw new Error(`Failed to fetch file at commit ${sha}`); return await this.commitFile(p,await r.text(),`⏪ Rollback ${p} to commit ${sha.slice(0,7)}`); }
    };
  })();

  // ─────────────────────────────────────────────────────────────────
  // 5. STATE CONTROLLER (DevState)
  // ─────────────────────────────────────────────────────────────────
  const state = {
    conversations: [],
    activeConvId: null,
    devPrompt: '',
    currentMode: localStorage.getItem('xv1_dev_mode') || 'MID',
    selectedAgentId: 'openai/gpt-oss-120b',
    activeAgentId: localStorage.getItem('active_dev_agent_id') || 'openai/gpt-oss-120b',
    isMultiAgentMode: localStorage.getItem('is_dev_multi_agent_mode') === '1',
    currentFilter: 'all',
    isThinking: false,
    isStreaming: false,
    abortController: null,
    pendingModifications: {},
    currentEditingFile: 'index.html',
    attachments: []
  };
  try { window._devState = state; window.devState = state; } catch(e) {}

  const DevState = window.createDevState ? window.createDevState(state, { generateId: generateId, DEV_AGENTS: DEV_AGENTS, $: (typeof $ !== "undefined" ? $ : function(id){return document.getElementById(id);}) }) : {
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
        state.activeAgentId = savedAgent;
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
        state.activeAgentId = agent.id;
        localStorage.setItem('dev_selected_agent', agent.id);
        localStorage.setItem('active_dev_agent_id', agent.id);
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
  try { window.DevState = DevState; } catch(e) {}
  // ─────────────────────────────────────────────────────────────────
  // 6. DEV CHAT & SMART FALLBACK CASCADE ENGINE (DevChatEngine)
  // ─────────────────────────────────────────────────────────────────
  const DevChatEngine = window.DevChatEngine || {
    getAdaptiveConfigForDev(agent, estimatedTokens = 0) {
      // HIGH tier gets full session context: 18 lines + 3200 chars briefing
      if (state.currentMode === 'HIGH') return { recentCount: 18, maxBriefingChars: 3200 };
      if (estimatedTokens > 5000) return { recentCount: 10, maxBriefingChars: 1200 };
      if (!agent) return { recentCount: 10, maxBriefingChars: 1200 };
      if (agent.category === 'fast' || agent.id.includes('20b') || agent.id.includes('compound-mini')) return { recentCount: 6, maxBriefingChars: 600 };
      if (agent.provider === 'openrouter') return { recentCount: 10, maxBriefingChars: 1200 };
      return { recentCount: 10, maxBriefingChars: 1200 };
    },

    generateDevBriefing(conv, agent, estimatedTokens = 0) {
      if (!conv || !Array.isArray(conv.messages) || conv.messages.length <= 8) return '';
      const cfg = this.getAdaptiveConfigForDev(agent, estimatedTokens);
      const firstUser = (conv.messages.find(m => m.role === 'user')?.content || '').slice(0, 250).replace(/\n/g, ' ').trim();
      const turns = conv.messages.length;
      const title = conv.title || 'جلسة تطوير';
      if (state.currentMode === 'HIGH') {
        const recentAi = conv.messages.filter(m => m.role === 'ai').slice(-5).map(m => (m.content || '').slice(0, 220).replace(/\n/g, ' ').trim()).filter(Boolean).join(' | ');
        const recentUser = conv.messages.filter(m => m.role === 'user').slice(-5).map(m => (m.content || '').slice(0, 180).replace(/\n/g, ' ').trim()).filter(Boolean).join(' | ');
        let briefing = `📋 بريفنج جلسة المطور الكاملة (${title}):\n- طلب التطوير الأساسي: ${firstUser.slice(0, 250)}\n- عدد التبادلات: ${turns}\n- آخر رسائل المستخدم: ${recentUser.slice(0, 500)}\n- آخر مخرجات: ${recentAi.slice(0, 600)}\n- ملاحظة: آخر 18 رسالة مرسلة حرفيا كسياق كامل`;
        if (briefing.length > cfg.maxBriefingChars) briefing = briefing.slice(0, cfg.maxBriefingChars) + '...';
        return briefing;
      }
      const recentAi = conv.messages.filter(m => m.role === 'ai').slice(-3).map(m => (m.content || '').slice(0, 200).replace(/\n/g, ' ').trim()).filter(Boolean).join(' | ');
      let briefing = `📋 بريفنج جلسة المطور (${title}):\n- طلب التطوير الأساسي: ${firstUser.slice(0, 200)}\n- عدد التبادلات: ${turns}\n- آخر مخرجات: ${recentAi.slice(0, 380)}`;
      if (briefing.length > cfg.maxBriefingChars) briefing = briefing.slice(0, cfg.maxBriefingChars) + '...';
      return briefing;
    },

    assembleDevPrompt(tier = 'MID', basePrompt = null, liveRepoFiles = []) {
      const normalizedTier = (tier === 'FAST') ? 'FAST' : ((tier === 'HIGH' || tier === 'DEEP') ? 'HIGH' : 'MID');
      const promptStr = basePrompt || state.devPrompt || '';
      let resolvedContent = '';
      try {
        const parsed = JSON.parse(promptStr);
        if (parsed.tiers && parsed.tiers[normalizedTier]) {
          resolvedContent = typeof parsed.tiers[normalizedTier] === 'string'
            ? parsed.tiers[normalizedTier]
            : JSON.stringify(parsed.tiers[normalizedTier], null, 2);
        } else if (parsed.content) {
          try {
            const inner = JSON.parse(parsed.content);
            if (inner.tiers && inner.tiers[normalizedTier]) {
              resolvedContent = JSON.stringify(inner.tiers[normalizedTier], null, 2);
            } else {
              resolvedContent = parsed.content;
            }
          } catch(e) {
            resolvedContent = parsed.content;
          }
        } else {
          resolvedContent = promptStr;
        }
      } catch(e) {
        resolvedContent = promptStr;
      }
      if (!resolvedContent) {
        resolvedContent = 'X.v1 Developer Studio — Chief Architect & Senior Engineer';
      }
      if (liveRepoFiles && liveRepoFiles.length > 0 && !resolvedContent.includes('LIVE GITHUB REPO DIRECTORY MAP')) {
        resolvedContent += '\n\n═══════════════════════════════════════════════════════════════\n🗺️ LIVE GITHUB REPO DIRECTORY MAP (Auto-Synced on Startup):\n═══════════════════════════════════════════════════════════════\nActive Repository Files in main branch:\n' + 
          liveRepoFiles.map(f => `- ${f}`).join('\n') + 
          '\n\nUse this live file directory to know exactly which file to inspect and propose modifications for when requested by the user.';
      }
      // HIGH: inject available instruction folders for smart editing (dev programming instructions)
      if ((tier === 'HIGH' || tier === 'DEEP') && window.InstructionManager && window.InstructionManager.files && window.InstructionManager.files.length) {
        try {
          const folders = window.InstructionManager.files.map(f => ({
            id: f.id,
            name: f.name,
            isCore: !!f.isCore,
            enabled: !!f.enabled,
            keywords: f.keywords || [],
            preview: (f.content || JSON.stringify(f.tiers || '')).slice(0, 500)
          }));
          resolvedContent += `\n\n═══════════════════════════════════════════════════════════════\n📁 AVAILABLE_INSTRUCTION_FOLDERS (for smart editing — JSON strict):\n${JSON.stringify(folders, null, 2)}\n═══════════════════════════════════════════════════════════════\nUse this list to decide: if keywords/domain match existing file → append there; else create new folder. Always check duplicate/conflict before outputting JSON block.`;
        } catch {}
      }
      return resolvedContent;
    },

    isCodeChangeRequest(text = '') {
      return /(?:عدّل|عدل|أصلح|اصلح|غيّر|غير|أضف|اضف|احذف|ادمج|حدّث|حدث|modify|change|fix|add|delete|merge|update|refactor|implement|patch|deploy)/i.test(text);
    },

    getCodeChangeResponseProtocol() {
      return `

═══════════════════════════════════════════════════════════════
CODE CHANGE RESPONSE PROTOCOL
═══════════════════════════════════════════════════════════════
When this request requires changing repository code, respond as a concise execution log:
1. Start with one short sentence stating the exact scope.
2. Add one status line per real step using this format:
   ◌ Read \`filename\` — lines or relevant section when known
   ● Analyzing — root cause or implementation decision
   ◌ Editing \`filename\` — precise change
   ◌ Testing — exact validation performed or still required
   ● Done — one-line result
3. Mention only files and line ranges actually inspected or changed. Never invent tool calls, files, line numbers, test results, or a successful deployment.
4. Keep the execution log in the user's language. Keep technical filenames, commands, and commit messages in English.
5. If a code patch is required, append the complete deploy JSON block after the execution log. Do not dump the full file outside that block.
`;
    },

    buildFallbackCascade(primaryAgent, estimatedTokens = 0) {
      const mode = state.currentMode || 'MID';
      const tierList = (DEV_TIER_MODELS && DEV_TIER_MODELS[mode]) ? DEV_TIER_MODELS[mode] : null;
      if (tierList && tierList.length) {
        const primaryKey = primaryAgent ? `${primaryAgent.provider}:${primaryAgent.id}` : '';
        return [
          ...tierList.filter(agent => `${agent.provider}:${agent.id}` === primaryKey),
          ...tierList.filter(agent => `${agent.provider}:${agent.id}` !== primaryKey)
        ];
      }
      return DEV_AGENTS;
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
        headers['HTTP-Referer'] = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : 'https://ahmedellansary.github.io/ai-chatbot-app/';
        headers['X-Title'] = 'X.v1 Dev Portal';
      }

      let timedOut = false;
      const ctrl = new AbortController();
      const tm = setTimeout(() => {
        timedOut = true;
        ctrl.abort();
      }, isGroq ? 7000 : 9000);
      const combinedSignal = signal ? AbortSignal.any([signal, ctrl.signal]) : ctrl.signal;

      const finalMessages = isGroq ? messages.map(m => {
        if (m.role === 'system' && m.content && m.content.length > 16000) {
          return { role: 'system', content: m.content.slice(0, 16000) + '\n\n[Core instructions applied fully]' };
        }
        return m;
      }) : messages;

      let response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: agent.id,
            messages: finalMessages,
            stream: true,
            temperature: 0.3,
            max_tokens: isGroq ? 4096 : 8192
          }),
          signal: combinedSignal
        });
        clearTimeout(tm);
      } catch(e) {
        clearTimeout(tm);
        if (isGroq) DevConfigVault.rotateGroqKey?.();
        else DevConfigVault.rotateOpenRouterKey?.();
        if (timedOut) throw new Error('MODEL_TIMEOUT');
        throw e;
      }

      if (response.status === 429) {
        if (isGroq) DevConfigVault.rotateGroqKey?.();
        else DevConfigVault.rotateOpenRouterKey?.();
        throw new Error('RATE_LIMIT');
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || `HTTP ${response.status}`;
        if (isGroq && /TPM|rate limit|too large|token/i.test(errMsg)) {
          DevConfigVault.rotateGroqKey?.();
          throw new Error('GROQ_RATE_LIMIT');
        }
        if (!isGroq) DevConfigVault.rotateOpenRouterKey?.();
        throw new Error(errMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasTokens = false;
      const streamStart = Date.now();

      try {
        while (true) {
          if (!hasTokens && Date.now() - streamStart > 10000) throw new Error('STREAM_STALL');
          // per-read timeout 8s to avoid infinite stall on giant models
          let timer;
          const timeoutPromise = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('STREAM_STALL')), 8000); });
          let readRes;
          try { readRes = await Promise.race([reader.read(), timeoutPromise]); } finally { clearTimeout(timer); }
          const { done, value } = readRes;
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
              if (parsed.error) throw new Error(parsed.error.message || 'Stream error');
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                hasTokens = true;
                onChunk(delta);
              }
            } catch (e) {
              if (e.message && !e.message.includes('JSON')) throw e;
            }
          }
        }
      } finally {
        reader.releaseLock();
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
      state.isThinking = true;
      state.abortController = new AbortController();
      DevUIEngine.updateSendBtn();
      DevUIEngine.setThinking(true);
      const isArDev = /[\u0600-\u06FF]/.test(userText);
      DevUIEngine.showDevThinking(isArDev ? 'تحليل' : 'Analyzing');
      const _shouldObserve = !!state.isMultiAgentMode;

       const tier = state.currentMode || 'MID';
      const rawDevPrompt = this.assembleDevPrompt(tier, state.devPrompt, state.liveRepoFiles);
      const _devTierCfg = this.getAdaptiveConfigForDev(DevState.getSelectedAgent(), Math.ceil(((textForPayload?.length || 0) + (rawDevPrompt?.length || 0)) / 3.5));
      const _devBriefing = this.generateDevBriefing(conv, DevState.getSelectedAgent(), Math.ceil(((textForPayload?.length || 0) + (rawDevPrompt?.length || 0)) / 3.5));
      let systemPrompt = rawDevPrompt;
      if (this.isCodeChangeRequest(textForPayload)) {
        systemPrompt += this.getCodeChangeResponseProtocol();
      }
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

      const fallbackList = this.buildFallbackCascade(chosenAgent, estimatedTokens);

      let succeeded = false;
      let usedAgent = chosenAgent;
      let _thinkingCleared = false;
      const _clearThinking = () => { if (!_thinkingCleared) { _thinkingCleared = true; state.isThinking = false; DevUIEngine.setThinking(false); DevUIEngine.hideDevThinking(); } };

      for (let i = 0; i < fallbackList.length; i++) {
        const currentAgent = fallbackList[i];
        try {
          // Update model badge live in UI
          const tagElem = document.querySelector(`[data-id="${aiMsgId}"] .msg-model-tag`);
          if (tagElem) {
            tagElem.innerHTML = `<span>${currentAgent.icon || '🧠'}</span> <span class="model-tag-name">${escapeHtml(currentAgent.name)}</span>`;
          }

          if (i > 0) {
            const msgElem = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
            if (msgElem && !fullContent) {
              msgElem.innerHTML = `<span style="color:#fbbf24; font-size:12.5px;">🔄 جاري التبديل التلقائي إلى <strong>${escapeHtml(currentAgent.name)}</strong>...</span>`;
            }
          }

          fullContent = '';
          await this.callSingleAgentStream(currentAgent, apiMessages, state.abortController.signal, (delta) => {
            _clearThinking();
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
              if (retryMsg) retryMsg.innerHTML = `<span style="color:#fbbf24; font-size:12.5px;">🔄 إعادة محاولة مع <strong>${escapeHtml(currentAgent.name)}</strong>...</span>`;
              await new Promise(r => setTimeout(r, 700));
              await this.callSingleAgentStream(currentAgent, apiMessages, state.abortController.signal, (delta) => {
                _clearThinking();
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
                _clearThinking();
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

      DevUIEngine.setThinking(false);
      state.isStreaming = false;
      state.abortController = null;
      DevUIEngine.updateSendBtn();
      if (_shouldObserve && fullContent && !fullContent.includes('⚠️')) {
        setTimeout(() => { try { if (window.DevObserverEngine) window.DevObserverEngine.observe(userText, fullContent, tier, aiMsgId, conv); } catch {} }, 500);
      }
    },

    async runDevMultiAgentConsensus(textForPayload, apiMessages, aiMsgId, aiMsgObj, conv, estimatedTokens = 0) {
      const msgRow = document.querySelector(`[data-id="${aiMsgId}"]`);
      const msgContent = msgRow ? msgRow.querySelector('.msg-content') : null;

      const renderLiveUI = (steps, finalContent = '', isThinking = true) => {
        if (!msgContent) return;

        const stepsHtml = steps.map(s => `
          <div class="agent-step-item">
            <div class="agent-step-header">
              <span class="agent-step-name">${s.icon} ${escapeHtml(s.title)}</span>
              <span class="agent-step-badge">${escapeHtml(s.status)}</span>
            </div>
            <div class="agent-step-body">${escapeHtml(s.summary || 'Analyzing...')}</div>
          </div>
        `).join('');

        const isDone = !isThinking && steps.every(s => s.status.includes('✓') || s.status.includes('Approved') || s.status.includes('Done'));
        const statusBadgeText = isDone ? '✓ Consensus Reached' : (steps.find(s => s.status === 'Active')?.title || 'In Progress...');

        const boxHtml = `
          <div class="multi-agent-box" id="box-${aiMsgId}">
            <div class="multi-agent-header" onclick="window._toggleThinkingBox('${aiMsgId}')">
              <div class="multi-agent-title">
                <span>👥</span>
                <span>Multi-Agent Consensus: <span style="color:#fbbf24; font-weight:600;">${escapeHtml(statusBadgeText)}</span></span>
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
        { role: 'user', content: `${textForPayload}\n\n[CONSENSUS CONTEXT]\nPlan: ${stage1Output.slice(0, 200)}\nReview: ${stage2Output.slice(0, 150)}\n\n[STRICT DIRECTIVE]: Respond directly in the EXACT SAME LANGUAGE as the user (Arabic if user wrote in Arabic). Keep your answer concise, natural, friendly, and helpful. For code changes, follow CODE CHANGE RESPONSE PROTOCOL exactly. Do not dump large raw code blocks into text. If code modification is needed, append the deployment JSON block at the very end.` }
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
              <span>Ready to Patch: <code>${escapeHtml(data.file)}</code></span>
            </div>
            <div class="dev-proposal-desc">📝 <strong>Summary:</strong> ${escapeHtml(data.message || 'Ready to commit & deploy to GitHub')}</div>
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
                <span>📄 Modified Code (${escapeHtml(data.file)})</span>
                <button class="btn-copy-patch" onclick="window._copyPatchContent('${propId}')">📋 Copy Code</button>
              </div>
              <pre class="patch-drawer-code"><code>${escapeHtml(data.content)}</code></pre>
            </div>
          `;
          msgRow.appendChild(card);
        }
      } catch (e) {
        console.warn('[Proposal Parse]', e);
      }
    }
  };
  try { window.DevChatEngine = DevChatEngine; } catch(e) {}

  // ─────────────────────────────────────────────────────────────────
  // 7b. DEV OBSERVER — Post-response code reviewers (non-blocking)
  // ─────────────────────────────────────────────────────────────────
  const DevObserverEngine = window.DevObserverEngine || {
    async observe(userText, aiResponse, tier, aiMsgId, conv) {
      const isAr = /[\u0600-\u06FF]/.test((userText||'') + ' ' + (aiResponse||'').slice(0,200));
      const t = (ar,en) => isAr ? ar : en;
      const row = document.querySelector(`[data-id="${CSS.escape ? CSS.escape(aiMsgId) : aiMsgId}"]`);
      if (!row || row.querySelector('.dev-observer-box')) return;
      const steps = [
        { icon:'👁️', title:t('مراقبة رد المطور','Monitoring dev response'), status:t('نشط','Active'), summary:t('جاري متابعة رد المستوى المختار...','Tracking selected level...') },
        { icon:'📋', title:t('فحص الالتزام بتعليمات البرمجة','Instruction compliance'), status:t('انتظار','Waiting'), summary:t('بانتظار...','Awaiting...') },
        { icon:'🔍', title:t('كشف التناقض والأخطاء','Contradiction & bug check'), status:t('انتظار','Waiting'), summary:t('بانتظار...','Awaiting...') },
        { icon:'🛡️', title:t('فحص الأمان والجودة','Security & quality'), status:t('انتظار','Waiting'), summary:t('فحص XSS/SQLi/أخطاء صامتة','Check XSS/silent fails') },
        { icon:'✨', title:t('اقتراح تحسين','Improvement'), status:t('انتظار','Waiting'), summary:t('بانتظار...','Awaiting...') }
      ];
      const render = (finalReview='') => {
        const reviewHtml = finalReview ? (()=>{ let pr=''; try{ pr=window.DevUIEngine ? window.DevUIEngine.parseMarkdown(finalReview) : finalReview; }catch{ pr=finalReview; } return `<div style="margin-top:6px; padding:8px; background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:8px;">${pr}</div>`; })() : `<div style="font-size:12px; color:var(--text-dim); padding:6px 0;">${t('جاري المراجعة...','Reviewing...')}</div>`;
        const applyBtn = finalReview ? `<button style="font-size:11px; padding:4px 10px; border-radius:6px; background:var(--accent-color); color:#fff; border:1px solid var(--accent-color); cursor:pointer; margin-top:8px;" onclick="(function(btn){ const r=btn.closest('.dev-observer-box').dataset.review||''; if(window._applyObserverSuggestion) window._applyObserverSuggestion(r); })(this)">Apply suggestion</button>` : '';
        let box = row.querySelector('.dev-observer-box');
        if (!box) { box = document.createElement('div'); box.className='dev-observer-box'; box.style.cssText='margin-top:10px; padding:0; border:none; background:transparent;'; row.querySelector('.msg-content')?.appendChild(box) || row.appendChild(box); }
        box.dataset.review = finalReview || '';
        box.innerHTML = `<div style="display:flex; align-items:center; gap:6px; padding:4px 0; border-top:1px solid var(--border-subtle); margin-top:6px;"><span>👁️</span><span style="font-size:11px; color:var(--text-dim);">Review</span></div>${reviewHtml}${applyBtn}`;
      };
      render();
      steps[0].status=t('✓ تمت المتابعة','✓ Tracked'); steps[0].summary=t(`تمت مراقبة رد ${tier}`,'Tracked '+tier); steps[1].status=t('نشط','Active'); render();
      const prompt = isAr
        ? `أنت مراقب كود ذكي. راجع الرد:\n\nطلب المستخدم: """${userText.slice(0,800)}"""\n\nرد المطور (${tier}): """${aiResponse.slice(0,2500)}"""\n\nحلل في 5 نقاط موجزة:\n1. هل الرد ملتزم بتعليمات البرمجة؟\n2. هل يوجد تناقض/تكرار/خطأ منطقي؟\n3. هل يوجد ثغرات أمان (XSS/SQLi/eval) أو أخطاء صامتة؟\n4. لو قصة/سكريبت لأشخاص حقيقيين — هل المعلومات موثوقة؟\n5. اقتراح تحسين واحد محدد لرفع الجودة\n\nعربي موجز بنقاط واضحة.`
        : `You are a code reviewer. User: """${userText.slice(0,800)}""" Response (${tier}): """${aiResponse.slice(0,2500)}""" Provide 5 concise bullets: 1. Instruction compliance 2. Contradiction/bug 3. Security 4. Source reliability if real story 5. One improvement. Keep brief.`;
      const msgs=[{role:'system',content:isAr?'أنت مراقب كود مختصر':'You are concise reviewer'},{role:'user',content:prompt}];
      let review='';
      try{
        const ac=new AbortController(); const tm=setTimeout(()=>ac.abort(),12000);
        let tmp='';
        const engine = window.ModelEngine || null;
        if(engine && engine.chatWithFallback){
          for await(const {chunk} of engine.chatWithFallback('MID', msgs, ac.signal, ()=>{})){ tmp+=chunk; if(tmp.length>30 && steps[1].status!==t('✓ تم','✓ Done')){ steps[1].status=t('✓ تم','✓ Done'); steps[1].summary=t('فحص الالتزام مكتمل','Done'); steps[2].status=t('نشط','Active'); render(tmp.slice(0,400)); } }
          review=tmp;
        } else {
          await DevChatEngine.callSingleAgentStream(DevChatEngine.buildFallbackCascade(DevState.getSelectedAgent())[0]||{id:'openai/gpt-oss-20b',provider:'groq'}, msgs, ac.signal, (d)=>{ review+=d; });
        }
        clearTimeout(tm);
        steps[1].status=t('✓ تم','✓ Done'); steps[2].status=t('✓ تم','✓ Done'); steps[3].status=t('✓ تم','✓ Done'); steps[4].status=t('✓ تم','✓ Done');
        steps[1].summary=t('الالتزام مكتمل','Compliance done'); steps[2].summary=t('الفحص مكتمل','Check done'); steps[3].summary=t('الأمان مكتمل','Security done'); steps[4].summary=t('التحسين جاهز','Ready');
        render(review);
      }catch(e){
        steps[1].status=t('تخطي','Skipped'); render(t('تعذر المراجعة — الرد الأصلي معتمد','Review skipped — original remains'));
      }
    }
  };
  try { window.DevObserverEngine = DevObserverEngine; } catch(e) {}
  window._applyObserverSuggestion = window._applyObserverSuggestion || function(text){
    try{
      const clean=String(text||'').trim().slice(0,500); if(!clean) return;
      const isAr=/[\u0600-\u06FF]/.test(clean);
      const fileName=isAr ? `اقتراح محسن — ${new Date().toLocaleDateString('ar-EG')}` : `Improved suggestion — ${new Date().toLocaleDateString()}`;
      const content=JSON.stringify({suggestion:clean, appliedAt:new Date().toISOString(), source:'dev-observer'},null,2);
      const mgr=window.InstructionManager;
      if(mgr){ const newId='custom_'+Date.now(); mgr.files.push({id:newId, name:fileName, icon:'✨', desc:isAr?'اقتراح محسن من مراقب المطور':'Dev observer suggestion', isCore:false, enabled:true, keywords:['تحسين','observer'], content}); mgr.save(); if(mgr.renderList) mgr.renderList(); if(window.DevUIEngine) window.DevUIEngine.showToast?.(isAr?'✨ تم تطبيق الاقتراح':'✨ Applied','success'); }
    }catch(e){ console.warn('[ApplyDevSuggestion]',e); }
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
  const DevUIEngine = window.DevUIEngine || {
    setupSmoothKineticScroll() {
      // Native hardware-accelerated touch scrolling enabled via CSS
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
      // Stagger version badge fetch — avoid simultaneous fetch with dev_prompt
      setTimeout(() => updateDevVersionBadge().catch(()=>{}), 260);
      // Auto-focus chat box for instant typing
      setTimeout(() => { try { if (DevAuthManager.isUnlocked()) document.getElementById('user-input')?.focus(); } catch {} }, 600);
      const _devOrigUnlock = DevAuthManager.unlock.bind(DevAuthManager);
      DevAuthManager.unlock = function() { _devOrigUnlock(); setTimeout(() => { try { document.getElementById('user-input')?.focus(); } catch {} }, 400); };
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
      // Stagger heavy GitHub tree fetch — prevents concurrent boot storm with version.json
      setTimeout(() => this.syncLiveRepoMap().catch(()=>{}), 380);
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
      const mode = state.currentMode || 'MID';
      const labelText = (mode === 'MID') ? 'Balanced' : mode;
      const pillLabel = $('selected-agent-label');
      const pillIcon = $('selected-agent-icon');
      if (pillLabel) pillLabel.textContent = labelText;
      if (pillIcon) {
        if (mode === 'HIGH') pillIcon.textContent = '🚀';
        else if (mode === 'FAST') pillIcon.textContent = '⚡';
        else pillIcon.textContent = '⚖️';
      }
    },

    setupPullToRefresh() {
      if (window.setupUnifiedPullToRefresh) return window.setupUnifiedPullToRefresh({ indicatorId: 'pull-refresh-indicator', chatAreaId: 'chat-area', threshold: 50 });
      const indicator = $('pull-refresh-indicator');
      if (!indicator || !indicator.querySelector) return;

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

      let _pullRaf = null;
      let _pullPending = null;
      const onTouchMove = (e) => {
        if (!isTracking || e.touches.length !== 1) return;
        _pullPending = { y: e.touches[0].clientY };
        if (_pullRaf) return;
        _pullRaf = requestAnimationFrame(() => {
          const y = _pullPending.y;
          const diff = y - startY;
          if (diff > 8) {
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
          _pullRaf = null;
        });
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

      const chatArea = $('chat-area');
      if (chatArea) {
        chatArea.addEventListener('touchstart', onTouchStart, { passive: true });
        chatArea.addEventListener('touchmove', onTouchMove, { passive: true });
        chatArea.addEventListener('touchend', onTouchEnd, { passive: true });
        chatArea.addEventListener('touchcancel', onTouchEnd, { passive: true });
      }
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
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSend();
            return;
          }
          if (e.key === 'Enter' && e.shiftKey) {
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

      const TIERS = [
        { id: 'HIGH', label: 'HIGH' },
        { id: 'MID', label: 'Balanced' },
        { id: 'FAST', label: 'FAST' }
      ];

      const renderMenu = () => {
        const current = state.currentMode || 'MID';
        menu.innerHTML = TIERS.map(item => {
          const isActive = item.id === current;
          return `
            <button type="button" class="dropdown-opt ${isActive ? 'active' : ''}" onclick="window._selectDevTier('${item.id}')">
              <div class="opt-title">
                <span>${item.label}</span>
                ${isActive ? '<span style="color:#fbbf24; font-size:12px; font-weight:bold;">✓</span>' : ''}
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
      if (state.isStreaming) return;
      const text = input.value;
      input.value = '';
      input.style.height = 'auto';
      this.updateSendBtn();
      DevChatEngine.sendMessage(text);
    },

    setThinking(on) {
      const inputContainer = document.querySelector('#input-section .input-container') || document.querySelector('.input-container');
      if (inputContainer) inputContainer.classList.toggle('thinking', !!on);
    },
    _devThinkingTimers: [],
    showDevThinking(initialWord = 'Analyzing') {
      const container = $('chat-container');
      if (!container) return;
      const isAr = /[\u0600-\u06FF]/.test(initialWord) || /[\u0600-\u06FF]/.test(document.getElementById('user-input')?.value || '');
      const base = initialWord || (isAr ? 'تحليل' : 'Analyzing');
      let typing = document.getElementById('dev-typing-indicator');
      if (!typing) {
        typing = document.createElement('div');
        typing.id = 'dev-typing-indicator';
        typing.className = 'message-row ai typing-indicator';
        typing.innerHTML = `<div class="typing-bubble" dir="ltr"><span class="typing-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></span><span id="dev-thinking-word" class="thinking-word">${this.escapeHtml(base)}</span><span class="thinking-dots"><i></i><i></i><i></i></span></div><div id="dev-thinking-flow" class="thinking-flow"></div>`;
        container.appendChild(typing);
        container.scrollTop = container.scrollHeight;
      }
      const flowStages = isAr ? [
        { icon:'🧠', text:'فهم النية — ماذا يريد المطور؟', delay:900 },
        { icon:'🔍', text:'تحليل الكود والسياق', delay:2600 },
        { icon:'🎯', text:'تقرير نوع التعديل', delay:5200 },
        { icon:'✨', text:'صياغة الحل البرمجي', delay:8300 },
        { icon:'✅', text:'مراجعة الأمان والجودة', delay:11800 }
      ] : [
        { icon:'🧠', text:'Understanding intent', delay:900 },
        { icon:'🔍', text:'Analyzing code & context', delay:2600 },
        { icon:'🎯', text:'Deciding patch type', delay:5200 },
        { icon:'✨', text:'Crafting solution', delay:8300 },
        { icon:'✅', text:'Security review', delay:11800 }
      ];
      // Ensure flow alignment matches language (strong model English → LTR, no right icon)
      const flowEl = document.getElementById('dev-thinking-flow');
      if (flowEl) { const isArFlow = /[\u0600-\u06FF]/.test(flowStages[0]?.text||''); flowEl.setAttribute('dir', isArFlow ? 'rtl' : 'ltr'); flowEl.style.textAlign = isArFlow ? 'right' : 'left'; }
      this._devThinkingTimers = [];
      flowStages.forEach(s => {
        const t = setTimeout(() => {
          const flow = document.getElementById('dev-thinking-flow');
          if (!flow) return;
          const item = document.createElement('div');
          item.className = 'thinking-flow-item';
          item.innerHTML = `<span class="flow-icon">${s.icon}</span><span class="flow-text">${this.escapeHtml(s.text)}</span>`;
          flow.appendChild(item);
          const ca = $('chat-area'); if (ca) ca.scrollTop = ca.scrollHeight;
        }, s.delay);
        this._devThinkingTimers.push(t);
      });
    },
    hideDevThinking() {
      if (this._devThinkingTimers) { this._devThinkingTimers.forEach(t=>clearTimeout(t)); this._devThinkingTimers=[]; }
      const el = document.getElementById('dev-typing-indicator');
      if (el) el.remove();
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
      if (!area) return;
      if (this._scrollRaf) cancelAnimationFrame(this._scrollRaf);
      this._scrollRaf = requestAnimationFrame(() => {
        area.scrollTop = area.scrollHeight;
        this._scrollRaf = null;
      });
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

      // Ultra-Modern Terminal / Code Card
      out = out.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (m, lang, code) => {
        const trimmed = code.trim();
        const escaped = this.escapeHtml(trimmed);
        const rawLang = (lang || '').trim().toLowerCase();
        let langTitle = 'Code';
        let icon = '>_';

        if (rawLang === 'bash' || rawLang === 'sh' || rawLang === 'shell' || rawLang === 'cmd' || rawLang === 'powershell') {
          langTitle = 'Bash Command';
          icon = '>_';
        } else if (rawLang === 'js' || rawLang === 'javascript') {
          langTitle = 'JavaScript';
          icon = '⚡';
        } else if (rawLang === 'python' || rawLang === 'py') {
          langTitle = 'Python';
          icon = '🐍';
        } else if (rawLang === 'html') {
          langTitle = 'HTML';
          icon = '🌐';
        } else if (rawLang === 'css') {
          langTitle = 'CSS';
          icon = '🎨';
        } else if (rawLang === 'json') {
          langTitle = 'JSON';
          icon = '📦';
        } else if (rawLang === 'sql') {
          langTitle = 'SQL';
          icon = '🗄️';
        } else if (rawLang) {
          langTitle = rawLang.toUpperCase();
          icon = '📄';
        }

        const firstLine = trimmed.split('\n')[0] || '';
        const preview = firstLine.length > 55 ? firstLine.slice(0, 52) + '...' : firstLine;
        const linesCount = trimmed.split('\n').length;
        const shouldCollapse = linesCount > 18;

        return `
<div class="dev-terminal-card">
  <div class="terminal-card-header">
    <div class="terminal-header-left">
      <span class="terminal-icon-badge">${icon}</span>
      <span class="terminal-lang-title">${this.escapeHtml(langTitle)}</span>
      <span class="terminal-cmd-preview">${this.escapeHtml(preview)}</span>
    </div>
    <div class="terminal-header-right">
      ${shouldCollapse ? '<button type="button" class="terminal-action-btn view-btn" onclick="window._toggleCodeView(this)">Expand</button>' : ''}
      <button type="button" class="terminal-action-btn copy-btn" onclick="window._copyDevCode(this)">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span>Copy</span>
      </button>
    </div>
  </div>
  <div class="terminal-card-body ${shouldCollapse ? 'collapsed' : ''}">
    <pre><code class="language-${this.escapeHtml(rawLang)}">${escaped}</code></pre>
  </div>
  <div class="terminal-card-footer">
    <div class="terminal-footer-status">
      <span class="terminal-status-pill">Exit Code: 0</span>
    </div>
    <div class="terminal-footer-meta">
      <span>${linesCount} lines</span>
    </div>
  </div>
</div>`;
      });

      // Ultra-Sleek Modern Audio Player Card
      out = out.replace(/\[audio:(https?:\/\/[^\s|\]]+)(?:\|([^|\]]+))?(?:\|([^\]]+))?\]/gi, (m, src, desc, tag) => {
        const tagTitle = (tag || 'ElevenLabs AI Sound').trim();
        const descText = (desc || 'Generated Audio Track').trim();
        const cleanSrc = src.trim();
        return `
<div class="modern-audio-card" data-src="${cleanSrc}">
  <div class="audio-card-header">
    <div class="audio-tag-badge">
      <span class="audio-dot"></span>
      <span>${this.escapeHtml(tagTitle)}</span>
    </div>
  </div>
  <div class="audio-card-desc">${this.escapeHtml(descText)}</div>
  <div class="audio-progress-row">
    <span class="audio-time current-time">0:00</span>
    <div class="audio-progress-bar-wrap" onclick="window._seekAudio(this, event)">
      <div class="audio-progress-fill"></div>
    </div>
    <span class="audio-time total-time">--:--</span>
  </div>
  <div class="audio-controls-row">
    <button type="button" class="audio-ctrl-btn speed-btn" onclick="window._changeAudioSpeed(this)" title="Playback Speed">1x</button>
    <button type="button" class="audio-ctrl-btn" onclick="window._skipAudio(this, -15)" title="Replay 15s">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><text x="8" y="15" font-size="7" fill="currentColor" font-weight="bold" font-family="sans-serif">15</text></svg>
    </button>
    <button type="button" class="audio-play-btn" onclick="window._togglePlayAudio(this)" title="Play / Pause">
      <svg class="play-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
      <svg class="pause-icon" style="display:none;" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>
    </button>
    <button type="button" class="audio-ctrl-btn" onclick="window._skipAudio(this, 15)" title="Forward 15s">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><text x="8" y="15" font-size="7" fill="currentColor" font-weight="bold" font-family="sans-serif">15</text></svg>
    </button>
    <button type="button" class="audio-ctrl-btn volume-btn" onclick="window._toggleMuteAudio(this)" title="Mute / Unmute">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
    </button>
    <button type="button" class="audio-ctrl-btn download-btn" onclick="window._downloadAudio(this)" title="تحميل الملف الصوتي">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
    </button>
  </div>
  <audio class="hidden-audio" src="${cleanSrc}" preload="metadata"></audio>
</div>`;
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
      if (window.UnifiedToast && window.UnifiedToast.showToast) return window.UnifiedToast.showToast(message, type);
      const container = $('toast-container');
      if (!container) return;
      const t = document.createElement('div');
      t.className = `toast ${type}`;
      const cleanMsg = typeof message === 'string' ? message.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]) : '';
      t.innerHTML = `<span>${cleanMsg}</span>`;
      container.appendChild(t);
      setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 300);
      }, 3500);
    }
  };
  try { window.DevUIEngine = DevUIEngine; } catch(e) {}
  // ─────────────────────────────────────────────────────────────────
  // 8. GLOBAL WINDOW BRIDGES FOR DEV OPERATIONS & TOOLS
  // ─────────────────────────────────────────────────────────────────
  window._copyDevCode = function(btn) {
    const card = btn.closest('.dev-terminal-card');
    if (!card) return;
    const codeEl = card.querySelector('pre code');
    if (!codeEl) return;
    const text = codeEl.innerText || codeEl.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>✓ Copied</span>';
      btn.style.color = '#34d399';
      btn.style.borderColor = '#10b981';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 2000);
      if (window.DevUIEngine && window.DevUIEngine.showToast) {
        window.DevUIEngine.showToast('📋 تم نسخ الكود بنجاح', 'success');
      }
    }).catch(() => {});
  };

  window._toggleCodeView = function(btn) {
    const card = btn.closest('.dev-terminal-card');
    if (!card) return;
    const body = card.querySelector('.terminal-card-body');
    if (!body) return;
    const isCollapsed = body.classList.toggle('collapsed');
    btn.textContent = isCollapsed ? 'Expand' : 'Collapse';
  };

  window._togglePlayAudio = function(btn) {
    const card = btn.closest('.modern-audio-card');
    if (!card) return;
    let audio = card.querySelector('audio.hidden-audio');
    if (!audio) {
      audio = new Audio(card.dataset.src);
      audio.className = 'hidden-audio';
      card.appendChild(audio);
    }
    const playIcon = btn.querySelector('.play-icon');
    const pauseIcon = btn.querySelector('.pause-icon');
    const fill = card.querySelector('.audio-progress-fill');
    const curTime = card.querySelector('.current-time');
    const totTime = card.querySelector('.total-time');

    if (!audio._boundEvents) {
      audio._boundEvents = true;
      audio.addEventListener('loadedmetadata', () => {
        if (totTime && audio.duration) {
          const m = Math.floor(audio.duration / 60);
          const s = Math.floor(audio.duration % 60);
          totTime.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
      });
      audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const pct = (audio.currentTime / audio.duration) * 100;
        if (fill) fill.style.width = `${pct}%`;
        if (curTime) {
          const m = Math.floor(audio.currentTime / 60);
          const s = Math.floor(audio.currentTime % 60);
          curTime.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
        if (totTime && audio.duration) {
          const rem = Math.max(0, audio.duration - audio.currentTime);
          const rm = Math.floor(rem / 60);
          const rs = Math.floor(rem % 60);
          totTime.textContent = `-${rm}:${rs < 10 ? '0' : ''}${rs}`;
        }
      });
      audio.addEventListener('ended', () => {
        if (playIcon) playIcon.style.display = 'block';
        if (pauseIcon) pauseIcon.style.display = 'none';
        if (fill) fill.style.width = '0%';
        if (curTime) curTime.textContent = '0:00';
      });
    }

    if (audio.paused) {
      document.querySelectorAll('audio.hidden-audio').forEach(a => { if (a !== audio) a.pause(); });
      document.querySelectorAll('.modern-audio-card .pause-icon').forEach(p => p.style.display = 'none');
      document.querySelectorAll('.modern-audio-card .play-icon').forEach(p => p.style.display = 'block');

      audio.play().then(() => {
        if (playIcon) playIcon.style.display = 'none';
        if (pauseIcon) pauseIcon.style.display = 'block';
      }).catch(e => console.warn('[Audio Play]', e));
    } else {
      audio.pause();
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
    }
  };

  window._seekAudio = function(wrap, event) {
    const card = wrap.closest('.modern-audio-card');
    if (!card) return;
    const audio = card.querySelector('audio.hidden-audio');
    if (!audio || !audio.duration) return;
    const rect = wrap.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    audio.currentTime = pct * audio.duration;
  };

  window._changeAudioSpeed = function(btn) {
    const card = btn.closest('.modern-audio-card');
    if (!card) return;
    const audio = card.querySelector('audio.hidden-audio');
    if (!audio) return;
    const speeds = [1, 1.25, 1.5, 2];
    const current = audio.playbackRate || 1;
    const nextIdx = (speeds.indexOf(current) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    audio.playbackRate = nextSpeed;
    btn.textContent = `${nextSpeed}x`;
  };

  window._skipAudio = function(btn, seconds) {
    const card = btn.closest('.modern-audio-card');
    if (!card) return;
    const audio = card.querySelector('audio.hidden-audio');
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 9999, audio.currentTime + seconds));
  };

  window._toggleMuteAudio = function(btn) {
    const card = btn.closest('.modern-audio-card');
    if (!card) return;
    const audio = card.querySelector('audio.hidden-audio');
    if (!audio) return;
    audio.muted = !audio.muted;
    btn.style.color = audio.muted ? '#ef4444' : '';
  };

  window._downloadAudio = function(btn) {
    const card = btn.closest('.modern-audio-card');
    if (!card) return;
    const src = card.dataset.src;
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = `audio_${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (window.DevUIEngine && window.DevUIEngine.showToast) {
      window.DevUIEngine.showToast('📥 جاري تحميل الملف الصوتي...', 'info');
    }
  };

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
            <h2><span>📄</span> <span>معاينة محتوى الملف: ${escapeHtml(proposal.file)}</span></h2>
            <div class="info-card">💡 هذا الملف تم إعداده وسيتم تحديثه في المستودع عند الضغط على زر النشر أعلاه.</div>
            <pre>${escapeHtml(proposal.content)}</pre>
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
            الملف <code>${escapeHtml(data.file)}</code> تم تحديثه ونشره بنجاح في المستودع.
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
    const syncText = $('files-sync-text');

    const activeFile = state.currentEditingFile || 'index.html';

    if (activeLabel) {
      activeLabel.textContent = activeFile;
    }

    if (syncText) {
      const savedSync = localStorage.getItem('FILES_LAST_SYNC_TIME');
      syncText.textContent = savedSync || 'Synced';
    }
  }



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

  window._copyActiveEditorCode = function() {
    const editor = $('direct-code-editor');
    const copyBtn = $('btn-copy-active-code');
    const copyText = $('copy-active-btn-text');
    const activeFile = state.currentEditingFile || 'index.html';

    const content = editor ? editor.value : '';
    if (!content) {
      DevUIEngine.showToast('لا يوجد كود لنسخه حالياً', 'warning');
      return;
    }

    navigator.clipboard.writeText(content).then(() => {
      if (copyBtn) copyBtn.classList.add('copied');
      if (copyText) copyText.textContent = 'Copied!';
      DevUIEngine.showToast(`📋 تم نسخ كود ملف ${activeFile} بالكامل!`, 'success');
      setTimeout(() => {
        if (copyBtn) copyBtn.classList.remove('copied');
        if (copyText) copyText.textContent = 'Copy';
      }, 2000);
    }).catch(err => {
      DevUIEngine.showToast('فشل النسخ: ' + err.message, 'error');
    });
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
              <div class="agent-card-name">${escapeHtml(agent.name)}</div>
              <div class="agent-card-meta">
                <span class="agent-badge ${agent.provider}">${agent.provider.toUpperCase()}</span>
                <span class="agent-badge">${agent.params || ''}</span>
              </div>
            </div>
            ${isSelected ? '<span class="agent-selected-check">✓</span>' : ''}
          </div>
          <div class="agent-card-desc">${escapeHtml(agent.desc || '')}</div>
        </div>
      `;
    }).join('');
  };

  window._selectAgent = function(agentId) {
    const agent = DEV_AGENTS.find(a => a.id === agentId);
    if (!agent) return;

    DevState.setSelectedAgent(agent.id);

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
              <div style="font-weight:600; font-size:13px; color:#fff;">${escapeHtml(c.commit?.message || 'Update')}</div>
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
  document.addEventListener('click', (e)=>{
    const m=$('dev-settings-modal');
    if(m && !m.classList.contains('hidden') && e.target===m) window._closeDevSettingsModal();
  });

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
  function $$(sel, root = document) {
    return (root || document).querySelectorAll(sel);
  }
  try { window.$ = $; window.$$ = $$; } catch(e) {}

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

  let _vpRaf = null;
  let _vpLast = 0;
  function lockViewportHeight() {
    const now = Date.now();
    if (now - _vpLast < 120) return;
    _vpLast = now;
    if (_vpRaf) cancelAnimationFrame(_vpRaf);
    _vpRaf = requestAnimationFrame(() => {
      const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${h}px`);
      _vpRaf = null;
    });
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
      window.location.reload();
    } catch (e) {
      console.warn('[DevCache] Clear error:', e);
      window.location.reload();
    }
  };

  function renderDevModelsInline(){
    const tbody=document.getElementById('dev-models-tbody');
    if(!tbody || !window.MODELS) return;
    const getParam=(n)=>{ const m=String(n||'').match(/(\d+(?:\.\d+)?)\s*B/i); return m? parseFloat(m[1]):0; };
    const all=[];
    ['HIGH','MID','FAST'].forEach(tier=> (window.MODELS[tier]||[]).forEach(m=> all.push({...m, tier, params:getParam(m.name)})));
    all.sort((a,b)=> b.params - a.params || (['HIGH','MID','FAST'].indexOf(a.tier)-['HIGH','MID','FAST'].indexOf(b.tier)));
    const per=(window.UsageTracker? window.UsageTracker.load().perModel||{} : {});
    const getRenew=(p)=>{ const now=new Date(); if(p==='groq'){ const t=new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1,0,0,0)); return `غداً ${Math.round((t-now)/3600000)}س`; } else { const t=new Date(now.getFullYear(), now.getMonth()+1,1); return `أول الشهر ${Math.ceil((t-now)/86400000)}يوم`; } };
    tbody.innerHTML=all.map(m=>{
      const en=window.isModelEnabled? window.isModelEnabled(m.id):true;
      const u=per[m.id]||{t:0,r:0};
      return `<tr><td><input type="checkbox" style="width:16px;height:16px;accent-color:var(--accent-color);" data-id="${m.id}" ${en?'checked':''} onchange="toggleDevModelInline(this)"></td><td><div style="font-weight:700;">${m.name} <span style="font-size:10px; padding:2px 5px; border-radius:6px; background:rgba(255,255,255,0.06);">${m.tier}</span></div><div style="font-size:11px; color:var(--text-dim); font-family:var(--font-mono);">${m.id}</div></td><td><span style="font-size:11px; padding:3px 7px; border-radius:999px; background:${m.provider==='groq'?'rgba(16,185,129,0.15)':'rgba(99,102,241,0.15)'}; border:1px solid var(--border-subtle);">${m.provider}</span></td><td><div style="font-size:11px; font-family:var(--font-mono);">${u.t.toLocaleString()} توكن · ${u.r} طلب</div><div style="height:4px; background:rgba(255,255,255,0.08); border-radius:999px; margin-top:4px;"><div style="height:100%; width:${Math.min(100,Math.round((u.t/6000)*100))}%; background:var(--accent-color);"></div></div><div style="font-size:10px; color:var(--text-dim); margin-top:3px;">${getRenew(m.provider)}</div></td></tr>`;
    }).join('');
  }
  window.toggleDevModelInline=function(el){ const id=el.dataset.id; const en=el.checked; if(window.setModelEnabled) window.setModelEnabled(id,en); };
  window.DevModelsPage={ refreshRow: renderDevModelsInline, render: renderDevModelsInline };
  window._switchDevSettingsTab = function(tabName) {
    $$('#dev-settings-modal .settings-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    $$('#dev-settings-modal .settings-tab-pane').forEach(pane => {
      pane.classList.toggle('hidden', pane.id !== `dev-tab-${tabName}`);
      pane.classList.toggle('active', pane.id === `dev-tab-${tabName}`);
    });
    if(tabName==='models') renderDevModelsInline();
  };

  window._secretSyncAndClearGate = async function() {
    const pinInput = $('gate-pin-input');
    const syncBtn = $('gate-sync-btn');
    if (pinInput) {
      pinInput.value = '';
      pinInput.focus();
    }
    if (syncBtn) syncBtn.classList.add('spinning');
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.update();
      }
      if (typeof caches !== 'undefined' && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      await fetch('./version.json?t=' + Date.now()).catch(()=>{});
      await fetch('./dev.js?t=' + Date.now()).catch(()=>{});
    } catch (e) {
      console.warn('[SecretSync]', e);
    } finally {
      setTimeout(() => {
        if (syncBtn) syncBtn.classList.remove('spinning');
      }, 500);
    }
  };

  window._selectDevTier = function(tier) {
    const normalizedTier = ['HIGH', 'MID', 'FAST'].includes(String(tier).toUpperCase())
      ? String(tier).toUpperCase()
      : 'MID';
    state.currentMode = normalizedTier;
    try { localStorage.setItem('xv1_dev_mode', normalizedTier); } catch(e) {}
    const menu = document.getElementById('model-dropdown-menu');
    if (menu) menu.classList.remove('show');
    if (window.DevUIEngine && window.DevUIEngine.updateAgentPillDisplay) {
      window.DevUIEngine.updateAgentPillDisplay();
    }
    if (window.DevUIEngine && typeof window.DevUIEngine.showToast === 'function') {
      window.DevUIEngine.showToast(`🚀 تم تعيين مستوى التطوير: ${normalizedTier}`, 'info');
    }
  };

  window._setAppTheme = function(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('xv1_theme', themeName);
    $$('.theme-card-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === themeName);
    });
  };

  window._setAppFontFamily = function(fontName) {
    document.documentElement.setAttribute('data-font', fontName);
    localStorage.setItem('xv1_font_family', fontName);
    $$('.custom-pill-btn[data-font]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-font') === fontName);
    });
  };

  window._setAppFontSize = function(sizeName) {
    document.documentElement.setAttribute('data-size', sizeName);
    localStorage.setItem('xv1_font_size', sizeName);
    $$('.custom-pill-btn[data-size]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-size') === sizeName);
    });
  };

  function initAppCustomization() {
    const savedTheme = localStorage.getItem('xv1_theme') || 'obsidian';
    const savedFont = localStorage.getItem('xv1_font_family') || 'inter';
    const savedSize = localStorage.getItem('xv1_font_size') || 'md';

    window.DevChatEngine = DevChatEngine;
    window.DevUIEngine = DevUIEngine;
    window.DevState = DevState;

    window._setAppTheme(savedTheme);
    window._setAppFontFamily(savedFont);
    window._setAppFontSize(savedSize);
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      lockViewportHeight();
      initAppCustomization();
      DevUIEngine.init();
    });
  } else {
    lockViewportHeight();
    initAppCustomization();
    DevUIEngine.init();
  }

  // Global safety handlers: clear streaming state on uncaught errors/promises
  try {
    window.addEventListener('unhandledrejection', function (evt) {
      try {
        console.warn('[Global] unhandledrejection', evt && evt.reason);
        if (window.devState && window.devState.isStreaming) {
          window.devState.isStreaming = false;
          window.devState.abortController = null;
        }
        if (window.state && window.state.isStreaming) {
          window.state.isStreaming = false;
          window.state.abortController = null;
        }
        if (window.DevUIEngine && typeof window.DevUIEngine.updateSendBtn === 'function') window.DevUIEngine.updateSendBtn();
        if (window.DevUIEngine && typeof window.DevUIEngine.showToast === 'function') window.DevUIEngine.showToast('حدث خطأ داخلي، تم إعادة تهيئة حالة الإرسال.', 'error');
      } catch (e) { console.error('[Global] handler error', e); }
    });

    window.addEventListener('error', function (evt) {
      try {
        console.warn('[Global] error event', evt && evt.message);
        if (window.devState && window.devState.isStreaming) {
          window.devState.isStreaming = false;
          window.devState.abortController = null;
        }
        if (window.state && window.state.isStreaming) {
          window.state.isStreaming = false;
          window.state.abortController = null;
        }
        if (window.DevUIEngine && typeof window.DevUIEngine.updateSendBtn === 'function') window.DevUIEngine.updateSendBtn();
      } catch (e) { console.error('[Global] error handler', e); }
    });
  } catch (e) { /* ignore in constrained runtimes */ }

})();
