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
    conversations: [],
    activeConvId: null,
    systemPrompt: '',
    isStreaming: false,
    abortController: null,
    lastModifiedFile: 'index.html'
  };

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  // ─── Core Init ───
  async function init() {
    loadConversations();
    await loadSystemPrompt();
    setupEventListeners();
    registerServiceWorker();
    setupInstallPrompt();

    if (state.conversations.length === 0) {
      showWelcomeScreen();
    } else {
      loadConversation(state.conversations[0].id);
    }

    updateHeaderUI();
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
        max_tokens: 4096
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
        max_tokens: 4096
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
    const existing = state.conversations.find(c => c.isDev);
    let devConvId = existing ? existing.id : null;

    if (!existing) {
      const id = generateId();
      const conv = {
        id,
        title: '🛠️ شات المطور',
        messages: [
          {
            id: generateId(),
            role: 'ai',
            content: `مرحباً بك في **شات المطور الذكي** 🛠️\n\nأنا مهندس برمجيات التطبيق (AI Lead Developer). أستطيع تعديل التطبيق وتحديث ملفاته ورفعها على GitHub فوراً.\n\nتستطيع أن تطلب مني:\n- *"غيّر لغة الواجهة إلى الإنجليزية وخلي النصوص LTR"*\n- *"عدّل ألوان أو أحجام العناصر"*\n- *"أضف ميزة أو زر جديد"*\n\n🔒 **الأمان التام:** سأعرض عليك بطاقة تفاعلية لتأكيد النشر، ومعك زر **استرجاع فوري (Rollback)** وزر **مراجعة آخر تعديل فقط** لتجنب أي هلوسة. ما التعديل المطلوب؟`,
            model: 'Nemotron Lead Developer',
            usedFallback: false,
            timestamp: new Date().toISOString()
          }
        ],
        mode: 'FAST',
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
      $('send-btn').disabled = false;
      $('send-btn').click();
    }
  }

  function loadConversation(id) {
    const conv = state.conversations.find(c => c.id === id);
    if (!conv) return;

    state.activeConvId = id;
    state.currentMode = conv.mode || state.currentMode;

    renderAllMessages(conv.messages);
    updateHeaderUI();
    highlightActiveConv(id);
    scrollToBottom();
  }

  function getActiveConv() {
    return state.conversations.find(c => c.id === state.activeConvId);
  }

  function addMessage(role, content, modelInfo = null) {
    const conv = getActiveConv();
    if (!conv) return;

    const msg = {
      id: generateId(),
      role,
      content,
      model: modelInfo?.model?.name || null,
      usedFallback: modelInfo?.usedFallback || false,
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

  function updateHeaderUI() {
    const conv = getActiveConv();
    const titleText = $('header-title-text');
    const dot = document.querySelector('.status-dot');
    const indicator = $('input-mode-indicator');

    if (conv?.isDev) {
      if (titleText) titleText.textContent = '🛠️ شات المطور';
      if (dot) dot.style.background = '#fbbf24';
      if (indicator) indicator.innerHTML = '<span class="mode-tag" style="color:#fbbf24; background:rgba(217,119,6,0.15);">وضع المطور (تعديل حي)</span>';
    } else {
      if (titleText) titleText.textContent = `نيترون · ${state.currentMode}`;
      if (dot) dot.style.background = '#10b981';
      if (indicator) indicator.innerHTML = '<span class="mode-tag">الشات الطبيعي</span>';
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
        <h1 class="welcome-title">مرحباً بك في نيترون</h1>
        <p class="welcome-sub">مساعد الذكاء الاصطناعي الذاتي. اسأل أي سؤال أو ادخل وضع المطور لتعديل التطبيق.</p>
        <div class="welcome-chips">
          <button class="welcome-chip" onclick="window._suggest('اشرح لي الذكاء الاصطناعي في 3 نقاط مبسطة')">🧠 ما هو الذكاء الاصطناعي؟</button>
          <button class="welcome-chip" onclick="window._startDevPrompt('غيّر لغة الواجهة إلى الإنجليزية وخلي اتجاه النصوص LTR')">🛠️ تغيير الواجهة إلى English</button>
          <button class="welcome-chip" onclick="window._suggest('اكتب لي خطة عمل لتطبيق ويب حديث')">💼 خطة عمل لتطبيق ويب</button>
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

    row.innerHTML = `
      <div class="msg-content">${parsed}</div>
      ${msg.role === 'ai' && msg.model ? `
        <div class="message-meta">
          <span class="meta-badge">✦ ${escapeHtml(msg.model)}</span>
          ${msg.usedFallback ? '<span class="meta-badge" style="color:var(--warning);">⚡ Fallback</span>' : ''}
        </div>
      ` : ''}
    `;

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
    if (state.isStreaming || !userText.trim()) return;

    if (!state.activeConvId) newConversation();

    const conv = getActiveConv();
    const isDev = conv?.isDev;

    const userMsg = addMessage('user', userText.trim());
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

    const apiMessages = [
      { role: 'system', content: systemPromptForCall },
      ...conv.messages
        .filter(m => m.id !== userMsg.id)
        .slice(-15)
        .map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
      { role: 'user', content: userText.trim() }
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

      hideTyping();
      appendMessage(aiMsgObj);

      const msgRow = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);

      const stream = chatWithFallback(
        isDev ? 'FAST' : state.currentMode,
        apiMessages,
        state.abortController.signal,
        (model, isFallback) => {
          aiMsgObj.model = isDev ? `Developer (${model.name})` : model.name;
          aiMsgObj.usedFallback = isFallback;
        }
      );

      for await (const { chunk, model, usedFallback } of stream) {
        fullContent += chunk;
        finalModelInfo = { model, usedFallback };
        if (msgRow) {
          msgRow.innerHTML = parseMarkdown(fullContent);
          scrollToBottom();
        }
      }

      aiMsgObj.content = fullContent;

      if (isDev) {
        await handleDevProposal(fullContent, msgRow);
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
      state.isStreaming = false;
      state.abortController = null;
      $('send-btn').disabled = false;
      scrollToBottom();
    }
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
    const data = window._pendingDevModifications[propId];
    if (!data) return;

    const card = document.getElementById(`proposal-${propId}`);
    if (card) {
      card.innerHTML = `<div class="dev-proposal-title">🔄 جاري النشر على GitHub وتحديث السيرفر...</div>`;
    }

    try {
      showToast(`🔄 جاري رفع ${data.file} على GitHub...`, 'info');
      await uploadFileToGitHub(data.file, data.content, `🛠️ Dev Mode: ${data.message || 'Update'}`);
      showToast(`✅ تم النشر على GitHub بنجاح!`, 'success');

      if (card) {
        card.innerHTML = `
          <div class="dev-proposal-title" style="color:var(--success);">✅ تم النشر وتحديث ملف <code>${escapeHtml(data.file)}</code> بنجاح!</div>
          <p class="dev-proposal-desc">تم حفظ التعديل في المستودع. اضغط على الزر أدناه لتطبيقه على شاشتك فوراً:</p>
          <div class="dev-proposal-btns">
            <button class="dev-btn-action reload" onclick="location.reload()">
              🔄 تطبيق التعديل الآن (Reload)
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
    $('send-btn').disabled = false;
    $('send-btn').click();
  };

  window._cancelProposal = (propId) => {
    const card = document.getElementById(`proposal-${propId}`);
    if (card) card.remove();
    delete window._pendingDevModifications[propId];
    showToast('تم إلغاء التعديل', 'info');
  };

  window._emergencyRollback = rollbackToPreviousCommit;

  // ─── Emergency Controls Handler ───
  function setupEmergencyControls() {
    $('btn-emergency-rollback')?.addEventListener('click', () => {
      if (confirm('هل أنت متأكد من رغبتك في استرجاع آخر نسخة سابقة للتطبيق؟')) {
        rollbackToPreviousCommit();
      }
    });

    $('btn-emergency-fix')?.addEventListener('click', () => {
      startDevChat('راجع آخر تعديل قمنا به فقط وافحص مشكلته بدقة دون المساس بباقي التطبيق، ثم أصلحه.');
      $('sidebar').classList.remove('open');
      $('overlay').classList.remove('active');
    });
  }

  // ─── Typing Indicator ───
  function showTyping() {
    const container = $('chat-container');
    if (!container) return;

    const typing = document.createElement('div');
    typing.id = 'typing-indicator';
    typing.className = 'message-row ai';
    typing.innerHTML = `<div class="msg-content" style="color:var(--text-muted); font-size:14px;">✦ جاري التفكير...</div>`;
    container.appendChild(typing);
    scrollToBottom();
  }

  function hideTyping() {
    $('typing-indicator')?.remove();
  }

  // ─── Markdown Parser ───
  function parseMarkdown(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const label = lang || 'code';
      return `<div class="code-header-bar">
        <span>${label}</span>
        <button class="copy-btn" onclick="window._copyCode(this)">نسخ</button>
      </div><pre><code>${code.trim()}</code></pre>`;
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
  function setupEventListeners() {
    $('sidebar-toggle')?.addEventListener('click', () => {
      $('sidebar').classList.add('open');
      $('overlay').classList.add('active');
    });

    $('close-sidebar-btn')?.addEventListener('click', () => {
      $('sidebar').classList.remove('open');
      $('overlay').classList.remove('active');
    });

    $('overlay')?.addEventListener('click', () => {
      $('sidebar').classList.remove('open');
      $('model-dropdown-menu')?.classList.remove('show');
      $('overlay').classList.remove('active');
    });

    $('model-pill-trigger')?.addEventListener('click', (e) => {
      e.stopPropagation();
      $('model-dropdown-menu').classList.toggle('show');
    });

    $$('.dropdown-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        state.currentMode = btn.dataset.mode;
        $('model-dropdown-menu').classList.remove('show');
        updateHeaderUI();
        const conv = getActiveConv();
        if (conv) {
          conv.mode = state.currentMode;
          saveConversations();
        }
        showToast(`تم التبديل لوضع ${state.currentMode}`, 'info');
      });
    });

    $('btn-new-chat')?.addEventListener('click', () => {
      newConversation();
      $('sidebar').classList.remove('open');
      $('overlay').classList.remove('active');
    });

    $('header-new-chat-btn')?.addEventListener('click', newConversation);

    $('btn-dev-chat')?.addEventListener('click', () => {
      startDevChat();
      $('sidebar').classList.remove('open');
      $('overlay').classList.remove('active');
    });

    setupEmergencyControls();

    const input = $('user-input');
    const sendBtn = $('send-btn');

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 180) + 'px';
      sendBtn.disabled = !input.value.trim() || state.isStreaming;
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!state.isStreaming && input.value.trim()) {
          const text = input.value.trim();
          input.value = '';
          input.style.height = 'auto';
          sendBtn.disabled = true;
          sendMessage(text);
        }
      }
    });

    sendBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if (!text || state.isStreaming) return;
      input.value = '';
      input.style.height = 'auto';
      sendBtn.disabled = true;
      sendMessage(text);
    });
  }

  // ─── Global Helpers ───
  window._loadConv = (id) => {
    loadConversation(id);
    $('sidebar').classList.remove('open');
    $('overlay').classList.remove('active');
  };

  window._suggest = (text) => {
    newConversation();
    $('user-input').value = text;
    $('send-btn').disabled = false;
    $('send-btn').click();
  };

  window._startDevPrompt = (text) => {
    startDevChat(text);
  };

  window._copyCode = (btn) => {
    const code = btn.closest('.code-header-bar').nextElementSibling?.querySelector('code')?.textContent || '';
    navigator.clipboard.writeText(code).then(() => {
      btn.textContent = 'تم النسخ!';
      setTimeout(() => btn.textContent = 'نسخ', 2000);
    });
  };

  document.addEventListener('DOMContentLoaded', init);
})();
