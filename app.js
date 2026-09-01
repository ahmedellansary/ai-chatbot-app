// ═════════════════════════════════════════════════════════════════
//  AI CHAT — Clean Claude & ChatGPT Logic Engine
// ═════════════════════════════════════════════════════════════════

import { chatWithFallback, readStream, MODELS } from './models.js';
import { ensureRepo, uploadFile, getCommitHistory, rollbackFile } from './github.js';

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

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ─── Initialization ───
async function init() {
  loadConversations();
  await loadSystemPrompt();
  setupEventListeners();
  registerServiceWorker();
  setupInstallPrompt();

  ensureRepo().then(() => {
    state.githubReady = true;
  }).catch(console.warn);

  if (state.conversations.length === 0) {
    showWelcomeScreen();
  } else {
    loadConversation(state.conversations[0].id);
  }

  updateHeaderUI();
}

// ─── PWA & Service Worker ───
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
    if (outcome === 'accepted') showToast('✅ تم تثبيت التطبيق!', 'success');
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
    const res = await fetch('./system_prompt.txt');
    if (res.ok) {
      state.systemPrompt = await res.text();
      localStorage.setItem('system_prompt', state.systemPrompt);
    }
  } catch {}
}

// ─── Conversations Management ───
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
        content: `مرحباً بك في **شات المطور** 🛠️\n\nأنا مهندس البرمجيات المسؤول عن تعديل هذا التطبيق نفسه.\n\nتستطيع أن تطلب مني أي تعديل مثل:\n- *"غيّر لغة الواجهة إلى الإنجليزية"* \n- *"غيّر شكل الأزرار والألوان"*\n- *"أضف ميزة جديدة"*\n\nسأقوم بتجهيز التعديل وسؤالك عبر بطاقة تأكيد قبل النشر على GitHub!`,
        model: 'Nemotron Developer',
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
    conv.title = content.slice(0, 40) + (content.length > 40 ? '...' : '');
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
  const label = $('header-model-label');
  const dot = document.querySelector('.model-dot-indicator');

  if (conv?.isDev) {
    if (label) label.textContent = '🛠️ شات المطور';
    if (dot) dot.style.background = '#fbbf24';
  } else {
    if (label) label.textContent = `نيترون · ${state.currentMode}`;
    if (dot) dot.style.background = '#10b981';
  }

  $$('.dropdown-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === state.currentMode);
  });
}

function showWelcomeScreen() {
  const container = $('chat-container');
  if (!container) return;

  container.innerHTML = `
    <div class="welcome-screen">
      <div class="brand-icon" style="width:48px;height:48px;font-size:22px;border-radius:12px;">✦</div>
      <h1 class="welcome-title">كيف يمكنني مساعدتك؟</h1>
      <p class="welcome-sub">اختر موضوعاً للبدء أو اكتب رسالتك مباشرة في الأسفل.</p>
      <div class="welcome-chips">
        <button class="welcome-chip" onclick="window._suggest('اشرح لي مفهوم الذكاء الاصطناعي ببساطة')">🧠 ما هو الذكاء الاصطناعي؟</button>
        <button class="welcome-chip" onclick="window._startDevPrompt('غيّر لغة الواجهة إلى الإنجليزية وخلي اتجاه الصفحة LTR')">🛠️ تغيير الواجهة لـ English</button>
        <button class="welcome-chip" onclick="window._suggest('اكتب لي كود بايثون سريع لقراءة ملف JSON')">💻 كود بايثون لقراءة JSON</button>
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

// ─── Messaging & AI Streaming ───
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
الملفات المتاحة:
- index.html (الهيكل واللغة LTR/RTL)
- style.css (التصميم والألوان)
- app.js (منطق الشات)
- system_prompt.txt (التعليمات)

عندما يطلب منك المستخدم تعديل:
1. اشرح له التعديل بودية.
2. ضع كتلة كود JSON كاملة في نهاية ردك بالشكل:
\`\`\`json
{
  "file": "index.html",
  "content": "الكود الكامل للملف بعد التعديل",
  "message": "وصف التعديل"
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

// ─── Dev Mode Proposal Card Logic ───
window._pendingDevModifications = {};

async function handleDevProposal(content, msgContainer) {
  const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/) || content.match(/(\{[\s\S]*"file"[\s\S]*"content"[\s\S]*\})/);
  if (!jsonMatch) return;

  try {
    const data = JSON.parse(jsonMatch[1]);
    if (data.file && data.content) {
      const propId = generateId();
      window._pendingDevModifications[propId] = data;

      const card = document.createElement('div');
      card.id = `proposal-${propId}`;
      card.className = 'dev-proposal-box';
      card.innerHTML = `
        <div class="dev-proposal-title">🛠️ تم إعداد التعديل لملف: <code>${escapeHtml(data.file)}</code></div>
        <p class="dev-proposal-desc">📝 <strong>التغيير:</strong> ${escapeHtml(data.message || 'جاهز للنشر على GitHub')}</p>
        <div class="dev-proposal-btns">
          <button class="dev-btn-action deploy" onclick="window._deployProposal('${propId}')">
            🚀 نشر التعديل على GitHub
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
    card.innerHTML = `<div class="dev-proposal-title">🔄 جاري النشر على GitHub...</div>`;
  }

  try {
    showToast(`🔄 جاري رفع ${data.file} على GitHub...`, 'info');
    await uploadFile(data.file, data.content, `🛠️ Dev: ${data.message || 'Update'}`);
    showToast(`✅ تم النشر على GitHub بنجاح!`, 'success');

    if (card) {
      card.innerHTML = `
        <div class="dev-proposal-title" style="color:var(--success);">✅ تم النشر على GitHub وتحديث الملف بنجاح!</div>
        <p class="dev-proposal-desc">الملف <code>${escapeHtml(data.file)}</code> محدث الآن على المستودع.</p>
        <div class="dev-proposal-btns">
          <button class="dev-btn-action reload" onclick="location.reload()">
            🔄 إعادة تحميل التطبيق وتطبيق التعديل
          </button>
          <button class="dev-btn-action cancel" onclick="window._rollbackDev('${data.file}')">
            ⏪ تراجع
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

window._cancelProposal = (propId) => {
  const card = document.getElementById(`proposal-${propId}`);
  if (card) card.remove();
  delete window._pendingDevModifications[propId];
  showToast('تم إلغاء التعديل', 'info');
};

window._rollbackDev = async (file) => {
  showToast('🔄 جاري التراجع...', 'info');
  try {
    const commits = await getCommitHistory(file, 4);
    if (commits.length < 2) throw new Error('لا توجد نسخة سابقة');
    await rollbackFile(file, commits[1].sha);
    showToast(`✅ تم التراجع عن تعديل ${file}`, 'success');
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    showToast('❌ ' + e.message, 'error');
  }
};

// ─── Typing Indicator ───
function showTyping() {
  const container = $('chat-container');
  if (!container) return;

  const typing = document.createElement('div');
  typing.id = 'typing-indicator';
  typing.className = 'message-row ai';
  typing.innerHTML = `<div class="msg-content" style="color:var(--text-muted);">جاري التفكير...</div>`;
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
  setTimeout(() => toast.remove(), 3000);
}

function scrollToBottom() {
  const chatArea = $('chat-area');
  if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
}

// ─── Event Handlers ───
function setupEventListeners() {
  // Sidebar toggles
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
    $('mode-dropdown-menu')?.classList.remove('show');
    $('overlay').classList.remove('active');
  });

  // Model Dropdown
  $('model-pill-trigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    $('mode-dropdown-menu').classList.toggle('show');
  });

  $$('.dropdown-item').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentMode = btn.dataset.mode;
      $('mode-dropdown-menu').classList.remove('show');
      updateHeaderUI();
      const conv = getActiveConv();
      if (conv) {
        conv.mode = state.currentMode;
        saveConversations();
      }
      showToast(`تم التبديل لـ ${state.currentMode}`, 'info');
    });
  });

  // New Chat
  $('btn-new-chat')?.addEventListener('click', () => {
    newConversation();
    $('sidebar').classList.remove('open');
    $('overlay').classList.remove('active');
  });

  $('header-new-chat-btn')?.addEventListener('click', newConversation);

  // Dev Chat
  $('btn-dev-chat')?.addEventListener('click', () => {
    startDevChat();
    $('sidebar').classList.remove('open');
    $('overlay').classList.remove('active');
  });

  // Input Box Auto-resize & Send
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
  startDevChat();
  $('user-input').value = text;
  $('send-btn').disabled = false;
  $('send-btn').click();
};

window._copyCode = (btn) => {
  const code = btn.closest('.code-header-bar').nextElementSibling?.querySelector('code')?.textContent || '';
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'تم النسخ!';
    setTimeout(() => btn.textContent = 'نسخ', 2000);
  });
};

document.addEventListener('DOMContentLoaded', init);
