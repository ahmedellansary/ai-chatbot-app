// ═══════════════════════════════════════════════════
//  AI CHAT — Main Application Logic with Dev Chat
// ═══════════════════════════════════════════════════

import { chatWithFallback, generateCode, readStream, MODELS, DEV_MODELS } from './models.js';
import {
  ensureRepo, uploadFile, getFile, getCommitHistory,
  rollbackFile, pushAllFiles, enableGitHubPages, GITHUB_USER, GITHUB_REPO
} from './github.js';

// ─── State ───
const state = {
  currentMode: 'MID',
  currentModel: null,
  conversations: [],
  activeConvId: null,
  systemPrompt: '',
  isStreaming: false,
  abortController: null,
  githubReady: false
};

// ─── DOM Refs ───
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ─── Init ───
async function init() {
  loadConversations();
  await loadSystemPrompt();
  setupEventListeners();
  registerServiceWorker();
  setupInstallPrompt();

  // Initialize GitHub in background
  ensureRepo().then(() => {
    state.githubReady = true;
    console.log('[GitHub] Repository ready');
  }).catch(e => console.warn('[GitHub] Init failed:', e.message));

  // Show welcome or active conversation
  if (state.conversations.length === 0) {
    showWelcomeScreen();
  } else {
    loadConversation(state.conversations[0].id);
  }

  updateModeUI();
}

// ─── Service Worker ───
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(console.warn);
  }
}

// ─── Install Prompt ───
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
    if (outcome === 'accepted') showToast('✅ تم تثبيت التطبيق!', 'success');
    deferredInstall = null;
  });
}

// ─── System Prompt ───
async function loadSystemPrompt() {
  const local = localStorage.getItem('system_prompt');
  if (local) {
    state.systemPrompt = local;
    const area = $('sys-prompt-area');
    if (area) area.value = local;
    return;
  }

  try {
    const res = await fetch('./system_prompt.txt');
    if (res.ok) {
      state.systemPrompt = await res.text();
      localStorage.setItem('system_prompt', state.systemPrompt);
      const area = $('sys-prompt-area');
      if (area) area.value = state.systemPrompt;
    }
  } catch {}
}

function saveSystemPrompt(text) {
  state.systemPrompt = text;
  localStorage.setItem('system_prompt', text);

  if (state.githubReady) {
    uploadFile('system_prompt.txt', text, '🧠 Update system prompt')
      .then(() => showToast('✅ تم حفظ التعليمات على GitHub', 'success'))
      .catch(() => showToast('⚠️ حُفظ محلياً — فشل GitHub', 'warning'));
  }
}

// ─── Conversations ───
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
  hideWelcomeScreen();
}

function startDevChat() {
  const existing = state.conversations.find(c => c.isDev);
  if (existing) {
    loadConversation(existing.id);
    return;
  }

  const id = generateId();
  const conv = {
    id,
    title: '🛠️ شات المطور',
    messages: [
      {
        id: generateId(),
        role: 'ai',
        content: `مرحباً بك في **شات المطور**! 🛠️\n\nأنا مهندس البرمجيات المسؤول عن تطوير هذا التطبيق نفسه.\nتستطيع التحدث معي لطلب أي تعديل مثل:\n- 🔤 **"غيّر لغة الواجهة إلى الإنجليزية واجعل اتجاه الكتابة LTR"**\n- 🎨 **"غيّر ثيم التطبيق أو عدّل الألوان"**\n- ⚡ **"أضف زراً جديداً أو ميزة محددة"**\n\nسأقوم بتنفيذ التعديل البرمجي ورفعه مباشرة على GitHub ليتطبق فوراً على هاتفك! ماذا تود أن نعدل؟`,
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
  loadConversation(id);
  renderConversationsList();
}

function loadConversation(id) {
  const conv = state.conversations.find(c => c.id === id);
  if (!conv) return;

  state.activeConvId = id;
  state.currentMode = conv.mode || state.currentMode;

  renderAllMessages(conv.messages);
  updateModeUI();
  highlightActiveConv(id);
  updateHeaderForConv(conv);
  scrollToBottom();
}

function getActiveConv() {
  return state.conversations.find(c => c.id === state.activeConvId);
}

function updateHeaderForConv(conv) {
  const badge = document.querySelector('.current-model-badge .model-name-short');
  const dot = document.querySelector('.model-dot');
  if (conv?.isDev) {
    if (badge) badge.innerHTML = '<span class="dev-active-badge">🛠️ شات المطور الذكي</span>';
    if (dot) dot.style.background = '#fbbf24';
  } else {
    if (badge) badge.textContent = state.currentModel ? state.currentModel.name : 'نيترون AI';
    if (dot) dot.style.background = '#34d399';
  }
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
    conv.title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
    renderConversationsList();
  }

  saveConversations();
  return msg;
}

// ─── Rendering ───
function renderConversationsList() {
  const list = $('conversations-list');
  if (!list) return;

  list.innerHTML = state.conversations.map(conv => `
    <div class="conversation-item ${conv.id === state.activeConvId ? 'active' : ''}"
         data-id="${conv.id}" onclick="window._loadConv('${conv.id}')">
      <div class="conv-title">${conv.isDev ? '🛠️ ' : ''}${escapeHtml(conv.title)}</div>
      <div class="conv-time">${formatTime(conv.createdAt)}</div>
    </div>
  `).join('');
}

function highlightActiveConv(id) {
  $$('.conversation-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
  });
}

function showWelcomeScreen() {
  const chatArea = $('chat-area');
  chatArea.innerHTML = `
    <div class="welcome-screen">
      <div class="welcome-icon">✦</div>
      <h1 class="welcome-title">مرحباً بك في نيترون</h1>
      <p class="welcome-subtitle">مساعدك الذكي المتقدم. اختر المود المناسب وابدأ محادثتك.</p>
      <div class="suggestions-grid">
        <div class="suggestion-card" onclick="window._suggest('اشرح لي كيف يعمل الذكاء الاصطناعي')">
          <span class="s-icon">🧠</span>
          <div class="s-title">اشرح لي</div>
          <div class="s-desc">كيف يعمل الذكاء الاصطناعي</div>
        </div>
        <div class="suggestion-card" onclick="window._startDevPrompt('غيّر لغة الواجهة إلى إنجليزية واجعل اتجاه النصوص LTR')">
          <span class="s-icon">🛠️</span>
          <div class="s-title">تعديل باللغة الإنجليزية</div>
          <div class="s-desc">اطلب من شات المطور تحويل الواجهة لـ English</div>
        </div>
        <div class="suggestion-card" onclick="window._suggest('اكتب لي كود بايثون لقراءة CSV')">
          <span class="s-icon">💻</span>
          <div class="s-title">اكتب كود</div>
          <div class="s-desc">بايثون لقراءة ملف CSV</div>
        </div>
        <div class="suggestion-card" onclick="window._suggest('لخص لي أهم مزايا React.js')">
          <span class="s-icon">📚</span>
          <div class="s-title">لخص لي</div>
          <div class="s-desc">أهم مزايا React.js</div>
        </div>
      </div>
    </div>
  `;
}

function hideWelcomeScreen() {
  const welcome = document.querySelector('.welcome-screen');
  if (welcome) {
    const wrapper = document.createElement('div');
    wrapper.className = 'messages-wrapper';
    $('chat-area').innerHTML = '';
    $('chat-area').appendChild(wrapper);
  }
}

function renderAllMessages(messages) {
  const chatArea = $('chat-area');
  if (messages.length === 0) {
    showWelcomeScreen();
    return;
  }

  chatArea.innerHTML = '<div class="messages-wrapper"></div>';
  const wrapper = chatArea.querySelector('.messages-wrapper');
  messages.forEach(msg => {
    wrapper.appendChild(createMessageElement(msg));
  });
}

function createMessageElement(msg) {
  const group = document.createElement('div');
  group.className = `message-group ${msg.role}`;
  group.dataset.id = msg.id;

  const isDev = getActiveConv()?.isDev;
  const avatarEmoji = msg.role === 'ai' ? (isDev ? '🛠️' : '✦') : '👤';
  const parsedContent = msg.role === 'ai' ? parseMarkdown(msg.content) : escapeHtml(msg.content);

  group.innerHTML = `
    <div class="avatar ${msg.role}">${avatarEmoji}</div>
    <div class="message-content-wrap">
      <div class="message-bubble">${parsedContent}</div>
      ${msg.role === 'ai' ? `
        <div class="message-meta">
          ${msg.model ? `<span class="model-tag">✦ ${msg.model}</span>` : ''}
          ${msg.usedFallback ? '<span class="fallback-badge">⚡ Fallback</span>' : ''}
          <span class="msg-time">${formatTime(msg.timestamp)}</span>
        </div>
        <div class="message-actions">
          <button class="msg-action-btn" onclick="window._copyMsg('${msg.id}')">📋 نسخ</button>
          <button class="msg-action-btn" onclick="window._regenMsg('${msg.id}')">🔄 إعادة</button>
        </div>
      ` : ''}
    </div>
  `;

  return group;
}

function appendMessage(msg) {
  let wrapper = document.querySelector('.messages-wrapper');
  if (!wrapper) {
    $('chat-area').innerHTML = '<div class="messages-wrapper"></div>';
    wrapper = document.querySelector('.messages-wrapper');
  }
  wrapper.appendChild(createMessageElement(msg));
  scrollToBottom();
}

// ─── Streaming AI Reply ───
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
التطبيق يتكون من الملفات التالية:
- index.html (الهيكل الرئيسي، عناصر الواجهة، والنصوص، ولغة التطبيق dir='rtl' أو dir='ltr' و lang='ar'/'en')
- style.css (التصميم والألوان والـ Glassmorphism)
- app.js (منطق الشات والتفاعل والموديلز)
- system_prompt.txt (التعليمات والشخصية)

عندما يطلب منك المستخدم أي تعديل (مثلاً تغيير لغة الواجهة إلى إنجليزية، أو تعديل شكل الأزرار، أو إضافة ميزة):
1. تحدث معه بودية واشرح له التعديل الذي قمت به باختصار.
2. إذا قمت بتعديل أي ملف، ضع كتلة كود JSON كاملة ومغلقة في نهاية ردك بهذا الشكل الدقيق:
\`\`\`json
{
  "file": "index.html",
  "content": "الكود الكامل للملف بعد التعديل دون نقصان",
  "message": "وصف مختصر لما تم تعديله"
}
\`\`\`
اكتب الكود بالكامل صالحاً وجاهزاً للعمل مباشرة.`;
  }

  const apiMessages = [
    { role: 'system', content: systemPromptForCall },
    ...conv.messages
      .filter(m => m.id !== userMsg.id)
      .slice(-15)
      .map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
    { role: 'user', content: userText.trim() }
  ];

  let finalModelInfo = null;
  let fullContent = '';

  try {
    const aiMsgId = generateId();
    const conv2 = getActiveConv();
    const aiMsgObj = {
      id: aiMsgId, role: 'ai', content: '',
      model: isDev ? 'Nemotron Developer' : null,
      usedFallback: false,
      timestamp: new Date().toISOString()
    };
    conv2.messages.push(aiMsgObj);

    hideTyping();
    appendMessage(aiMsgObj);
    const bubbleEl = document.querySelector(`[data-id="${aiMsgId}"] .message-bubble`);

    const stream = chatWithFallback(
      isDev ? 'FAST' : state.currentMode,
      apiMessages,
      state.abortController.signal,
      (model, isFallback) => {
        updateModelBadge(model, isFallback);
        aiMsgObj.model = isDev ? `Developer (${model.name})` : model.name;
        aiMsgObj.usedFallback = isFallback;
      }
    );

    for await (const { chunk, model, usedFallback } of stream) {
      fullContent += chunk;
      finalModelInfo = { model, usedFallback };
      if (bubbleEl) {
        bubbleEl.innerHTML = parseMarkdown(fullContent) + '<span class="cursor-blink">▋</span>';
        scrollToBottom();
      }
    }

    if (bubbleEl) bubbleEl.innerHTML = parseMarkdown(fullContent);
    aiMsgObj.content = fullContent;

    // Check for executable JSON file modification in Dev Mode
    if (isDev) {
      await handleDevFileAutoExecution(fullContent, bubbleEl);
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

// ─── Dev Mode Auto Execution ───
async function handleDevFileAutoExecution(content, bubbleEl) {
  const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/) || content.match(/(\{[\s\S]*"file"[\s\S]*"content"[\s\S]*\})/);
  if (!jsonMatch) return;

  try {
    const data = JSON.parse(jsonMatch[1]);
    if (data.file && data.content) {
      showToast(`🔄 جاري رفع ${data.file} على GitHub...`, 'info');
      await uploadFile(data.file, data.content, `🛠️ Dev Chat: ${data.message || 'Auto-update'}`);
      showToast(`✅ تم تحديث ${data.file} بنجاح!`, 'success');

      // Append interactive card
      const card = document.createElement('div');
      card.className = 'dev-execution-card';
      card.innerHTML = `
        <div class="dev-card-header">
          <span>✅ تم تعديل ملف <code>${data.file}</code> ورفعه على GitHub</span>
        </div>
        <p style="font-size:12px; color: var(--text-secondary); line-height: 1.5;">${data.message || 'تم تحديث الملف بنجاح.'}</p>
        <div class="dev-card-actions">
          <button class="dev-card-btn reload" onclick="location.reload()">🔄 إعادة تحميل التطبيق وتطبيق التعديل</button>
          <button class="dev-card-btn secondary" onclick="window._rollbackDev('${data.file}')">⏪ تراجع عن التعديل</button>
        </div>
      `;
      bubbleEl.appendChild(card);
      scrollToBottom();
    }
  } catch (e) {
    console.warn('[Dev AutoExec Error]', e.message);
  }
}

// ─── Typing Indicator ───
function showTyping() {
  const wrapper = document.querySelector('.messages-wrapper') ||
    (() => {
      const w = document.createElement('div');
      w.className = 'messages-wrapper';
      $('chat-area').appendChild(w);
      return w;
    })();

  const typing = document.createElement('div');
  typing.id = 'typing-indicator';
  typing.className = 'typing-indicator';
  typing.innerHTML = `
    <div class="avatar ai">✦</div>
    <div class="typing-bubble">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  wrapper.appendChild(typing);
  scrollToBottom();
}

function hideTyping() {
  $('typing-indicator')?.remove();
}

// ─── Mode Selector ───
function updateModeUI() {
  $$('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === state.currentMode);
  });
}

function updateModelBadge(model, isFallback) {
  const badge = document.querySelector('.current-model-badge .model-name-short');
  const dot = document.querySelector('.model-dot');
  if (badge) badge.textContent = model.name;
  if (dot) dot.style.background = isFallback ? '#fbbf24' : '#34d399';
  state.currentModel = model;
}

// ─── Markdown Parser ───
function parseMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);

  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const label = lang || 'code';
    return `<div class="code-header">
      <span>${label}</span>
      <button class="copy-code-btn" onclick="window._copyCode(this)">📋 نسخ</button>
    </div><pre><code class="lang-${label}">${code.trim()}</code></pre>`;
  });

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^---$/gm, '<hr>');

  html = html.replace(/^\|(.+)\|$/gm, (_, row) => {
    const cells = row.split('|').map(c => c.trim());
    return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
  });
  html = html.replace(/(<tr>.*<\/tr>\n?)+/g, m => `<table>${m}</table>`);

  html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = `<p>${html}</p>`;

  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[1-3]>)/g, '$1');
  html = html.replace(/(<\/h[1-3]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>|<ol>|<table>|<pre>|<blockquote>|<hr>)/g, '$1');
  html = html.replace(/(<\/ul>|<\/ol>|<\/table>|<\/pre>|<\/blockquote>|<hr>)<\/p>/g, '$1');

  return html;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const now = new Date();
  const diff = now - d;

  if (diff < 60000) return 'الآن';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}د`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}س`;
  return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}

function showToast(message, type = 'info') {
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function scrollToBottom() {
  const chatArea = $('chat-area');
  if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
}

// ─── Input Handling ───
function setupInputHandlers() {
  const input = $('user-input');
  const sendBtn = $('send-btn');

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 200) + 'px';

    const count = $('char-count');
    if (count) count.textContent = input.value.length > 0 ? `${input.value.length}` : '';
    sendBtn.disabled = !input.value.trim() || state.isStreaming;
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!state.isStreaming && input.value.trim()) {
        handleSend();
      }
    }
  });

  sendBtn.addEventListener('click', handleSend);
}

function handleSend() {
  if (state.isStreaming) {
    state.abortController?.abort();
    return;
  }

  const input = $('user-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.style.height = 'auto';
  $('send-btn').disabled = true;
  $('char-count').textContent = '';

  sendMessage(text);
}

// ─── Event Listeners ───
function setupEventListeners() {
  $('sidebar-toggle')?.addEventListener('click', () => {
    $('sidebar').classList.toggle('open');
    $('overlay').classList.toggle('active');
  });

  $('overlay')?.addEventListener('click', () => {
    $('sidebar').classList.remove('open');
    $('overlay').classList.remove('active');
  });

  $('btn-new-chat')?.addEventListener('click', () => {
    newConversation();
    $('sidebar').classList.remove('open');
    $('overlay').classList.remove('active');
  });

  $('btn-dev-chat')?.addEventListener('click', () => {
    startDevChat();
    $('sidebar').classList.remove('open');
    $('overlay').classList.remove('active');
  });

  $$('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentMode = btn.dataset.mode;
      updateModeUI();
      const conv = getActiveConv();
      if (conv) {
        conv.mode = state.currentMode;
        saveConversations();
      }
      showToast(`تم التبديل لـ ${state.currentMode} Mode`, 'info');
    });
  });

  setupInputHandlers();
}

// ─── Global Handlers ───
window._loadConv = (id) => {
  loadConversation(id);
  $('sidebar').classList.remove('open');
  $('overlay').classList.remove('active');
};

window._suggest = (text) => {
  newConversation();
  $('user-input').value = text;
  $('send-btn').disabled = false;
  handleSend();
};

window._startDevPrompt = (text) => {
  startDevChat();
  $('user-input').value = text;
  $('send-btn').disabled = false;
  handleSend();
};

window._copyMsg = (msgId) => {
  const conv = getActiveConv();
  const msg = conv?.messages.find(m => m.id === msgId);
  if (msg) {
    navigator.clipboard.writeText(msg.content)
      .then(() => showToast('📋 تم النسخ', 'success'));
  }
};

window._regenMsg = async (msgId) => {
  const conv = getActiveConv();
  if (!conv) return;
  const idx = conv.messages.findIndex(m => m.id === msgId);
  if (idx < 1) return;

  const userMsg = conv.messages.slice(0, idx).reverse().find(m => m.role === 'user');
  if (!userMsg) return;

  conv.messages.splice(idx, 1);
  saveConversations();
  await sendMessage(userMsg.content);
};

window._copyCode = (btn) => {
  const pre = btn.closest('.code-header').nextElementSibling;
  const code = pre?.querySelector('code')?.textContent || '';
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '✅ تم';
    setTimeout(() => btn.textContent = '📋 نسخ', 2000);
  });
};

window._rollbackDev = async (file) => {
  showToast('🔄 جاري التراجع...', 'info');
  try {
    const commits = await getCommitHistory(file, 4);
    if (commits.length < 2) throw new Error('لا توجد نسخة سابقة');
    await rollbackFile(file, commits[1].sha);
    showToast(`✅ تم التراجع عن تعديل ${file}`, 'success');
    setTimeout(() => location.reload(), 1200);
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
};

document.addEventListener('DOMContentLoaded', init);
