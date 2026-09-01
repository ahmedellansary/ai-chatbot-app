// ═══════════════════════════════════════════════════
//  AI CHAT — Main Application Logic
// ═══════════════════════════════════════════════════

import { chatWithFallback, generateCode, readStream, MODELS } from './models.js';
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
  devModeOpen: false,
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

  // Show welcome screen if no active conversation
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
    navigator.serviceWorker.register('/sw.js').catch(console.warn);
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
  // Try local storage first
  const local = localStorage.getItem('system_prompt');
  if (local) {
    state.systemPrompt = local;
    const area = $('sys-prompt-area');
    if (area) area.value = local;
    return;
  }

  // Fallback: load from file (in same origin)
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

  // Push to GitHub in background
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
    createdAt: new Date().toISOString()
  };
  state.conversations.unshift(conv);
  saveConversations();
  loadConversation(id);
  renderConversationsList();
  hideWelcomeScreen();
}

function loadConversation(id) {
  const conv = state.conversations.find(c => c.id === id);
  if (!conv) return;

  state.activeConvId = id;
  state.currentMode = conv.mode || state.currentMode;

  // Render messages
  renderAllMessages(conv.messages);
  updateModeUI();
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

  // Auto-title from first user message
  if (role === 'user' && conv.messages.filter(m => m.role === 'user').length === 1) {
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
      <div class="conv-title">${escapeHtml(conv.title)}</div>
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
        <div class="suggestion-card" onclick="window._suggest('ترجم لي هذا: Artificial Intelligence is transforming the world')">
          <span class="s-icon">🌐</span>
          <div class="s-title">ترجم لي</div>
          <div class="s-desc">جملة من الإنجليزية للعربية</div>
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

  const avatarEmoji = msg.role === 'ai' ? '✦' : '👤';
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

  // Ensure active conversation
  if (!state.activeConvId) newConversation();

  // Add user message
  const userMsg = addMessage('user', userText.trim());
  appendMessage(userMsg);

  // Show typing indicator
  showTyping();
  state.isStreaming = true;
  state.abortController = new AbortController();

  // Build messages array for API
  const conv = getActiveConv();
  const apiMessages = [
    { role: 'system', content: state.systemPrompt },
    ...conv.messages
      .filter(m => m.id !== userMsg.id)
      .slice(-20) // Last 20 messages for context
      .map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
    { role: 'user', content: userText.trim() }
  ];

  let finalModelInfo = null;
  let fullContent = '';

  try {
    // Create AI message placeholder
    const aiMsgId = generateId();
    const conv2 = getActiveConv();
    const aiMsgObj = {
      id: aiMsgId, role: 'ai', content: '',
      model: null, usedFallback: false,
      timestamp: new Date().toISOString()
    };
    conv2.messages.push(aiMsgObj);

    hideTyping();
    appendMessage(aiMsgObj);
    const bubbleEl = document.querySelector(`[data-id="${aiMsgId}"] .message-bubble`);

    // Stream with fallback
    const stream = chatWithFallback(
      state.currentMode,
      apiMessages,
      state.abortController.signal,
      (model, isFallback) => {
        updateModelBadge(model, isFallback);
        aiMsgObj.model = model.name;
        aiMsgObj.usedFallback = isFallback;
        if (isFallback) showToast(`⚡ تم التبديل لـ ${model.name}`, 'warning');
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

    // Finalize
    if (bubbleEl) bubbleEl.innerHTML = parseMarkdown(fullContent);
    aiMsgObj.content = fullContent;

    // Update meta
    const metaEl = document.querySelector(`[data-id="${aiMsgId}"] .message-meta`);
    if (metaEl && finalModelInfo) {
      metaEl.innerHTML = `
        <span class="model-tag">✦ ${finalModelInfo.model.name}</span>
        ${finalModelInfo.usedFallback ? '<span class="fallback-badge">⚡ Fallback</span>' : ''}
        <span class="msg-time">${formatTime(aiMsgObj.timestamp)}</span>
      `;
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

// ─── Dev Mode ───
async function openDevPanel() {
  state.devModeOpen = true;
  $('dev-panel').classList.add('open');
  $('overlay').classList.add('active');
  document.querySelector('.dev-mode-btn')?.classList.add('active');
}

function closeDevPanel() {
  state.devModeOpen = false;
  $('dev-panel').classList.remove('open');
  $('overlay').classList.remove('active');
  document.querySelector('.dev-mode-btn')?.classList.remove('active');
}

async function runDevCommand(instruction) {
  if (!instruction.trim()) return;
  showDevStatus('🔄 جاري توليد الكود...', 'info');

  // Build list of files to provide context
  const fileList = ['index.html', 'style.css', 'app.js', 'models.js'];
  const filesContext = fileList.map(f => `**${f}** — تحتاج تعديل لو طلب المستخدم`).join('\n');

  const devPrompt = [
    {
      role: 'system',
      content: `أنت مساعد برمجة متخصص في تعديل تطبيقات الويب (HTML/CSS/JS).
عند طلب تعديل:
1. حدد الملف المستهدف بوضوح
2. أعد كتابة المحتوى الكامل للملف بعد التعديل
3. أجب بصيغة JSON: {"file": "اسم_الملف", "content": "المحتوى_الكامل", "message": "وصف التغيير"}
قائمة الملفات: ${filesContext}`
    },
    { role: 'user', content: instruction }
  ];

  try {
    const { response, model } = await generateCode(
      devPrompt,
      new AbortController().signal
    );

    let fullJson = '';
    for await (const chunk of readStream(response)) {
      fullJson += chunk;
    }

    // Extract JSON
    const jsonMatch = fullJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('الموديل لم يُرجع JSON صحيح');

    const { file, content, message } = JSON.parse(jsonMatch[0]);

    if (!file || !content) throw new Error('استجابة غير مكتملة من الموديل');

    showDevStatus(`💾 جاري حفظ ${file}...`, 'info');

    // Upload to GitHub
    if (state.githubReady) {
      await uploadFile(file, content, `🛠️ ${message || instruction}`);
      showDevStatus(`✅ تم تحديث ${file} ورفعه على GitHub`, 'success');
    } else {
      showDevStatus(`✅ تم توليد الكود — GitHub غير متصل`, 'success');
    }

    showToast(`✅ تم تعديل ${file}`, 'success');

  } catch (err) {
    showDevStatus('❌ ' + err.message, 'error');
  }
}

async function rollbackApp() {
  showDevStatus('🔄 جاري الاسترجاع...', 'info');
  try {
    const commits = await getCommitHistory('index.html', 5);
    if (commits.length < 2) throw new Error('لا توجد نسخ سابقة للاسترجاع');

    const prevCommit = commits[1].sha;
    await rollbackFile('index.html', prevCommit);
    await rollbackFile('style.css', prevCommit).catch(() => {});
    await rollbackFile('app.js', prevCommit).catch(() => {});

    showDevStatus('✅ تم الاسترجاع للنسخة السابقة', 'success');
    showToast('✅ تم Rollback بنجاح', 'success');
  } catch (err) {
    showDevStatus('❌ ' + err.message, 'error');
  }
}

function showDevStatus(msg, type) {
  const el = $('dev-status');
  if (el) {
    el.className = `dev-status ${type}`;
    el.textContent = msg;
    el.style.display = 'flex';
  }
}

// ─── Markdown Parser ───
function parseMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);

  // Code blocks with language
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const label = lang || 'code';
    return `<div class="code-header">
      <span>${label}</span>
      <button class="copy-code-btn" onclick="window._copyCode(this)">📋 نسخ</button>
    </div><pre><code class="lang-${label}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold & Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // HR
  html = html.replace(/^---$/gm, '<hr>');

  // Tables
  html = html.replace(/^\|(.+)\|$/gm, (_, row) => {
    const cells = row.split('|').map(c => c.trim());
    return '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
  });
  html = html.replace(/(<tr>.*<\/tr>\n?)+/g, m => `<table>${m}</table>`);

  // Lists
  html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = `<p>${html}</p>`;

  // Clean up empty paragraphs and fix nesting
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[1-3]>)/g, '$1');
  html = html.replace(/(<\/h[1-3]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>|<ol>|<table>|<pre>|<blockquote>|<hr>)/g, '$1');
  html = html.replace(/(<\/ul>|<\/ol>|<\/table>|<\/pre>|<\/blockquote>|<hr>)<\/p>/g, '$1');

  return html;
}

// ─── Utilities ───
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
    // Auto-resize
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 200) + 'px';

    // Char count
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
    // Stop streaming
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

// ─── System Prompt Commands ───
function detectSystemPromptCommand(text) {
  const patterns = [
    /أضف تعليمة[:\s]+(.+)/,
    /add instruction[:\s]+(.+)/i,
    /تذكر دائماً[:\s]+(.+)/,
    /remember always[:\s]+(.+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

// ─── Event Listeners ───
function setupEventListeners() {
  // Sidebar toggle (mobile)
  $('sidebar-toggle')?.addEventListener('click', () => {
    $('sidebar').classList.toggle('open');
    $('overlay').classList.toggle('active');
  });

  // Overlay click
  $('overlay')?.addEventListener('click', () => {
    $('sidebar').classList.remove('open');
    closeDevPanel();
    $('overlay').classList.remove('active');
  });

  // New chat
  $('btn-new-chat')?.addEventListener('click', newConversation);

  // Mode selector
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

  // Dev mode
  document.querySelector('.dev-mode-btn')?.addEventListener('click', () => {
    if (state.devModeOpen) closeDevPanel();
    else openDevPanel();
  });

  $('close-dev-btn')?.addEventListener('click', closeDevPanel);

  // Dev command
  $('dev-run-btn')?.addEventListener('click', () => {
    const instruction = $('dev-instruction')?.value.trim();
    if (instruction) runDevCommand(instruction);
  });

  $('dev-instruction')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) {
      const instruction = e.target.value.trim();
      if (instruction) runDevCommand(instruction);
    }
  });

  // Rollback
  $('dev-rollback-btn')?.addEventListener('click', rollbackApp);

  // System prompt save
  $('save-sys-prompt-btn')?.addEventListener('click', () => {
    const text = $('sys-prompt-area')?.value.trim();
    if (text) {
      saveSystemPrompt(text);
      showToast('✅ تم حفظ التعليمات', 'success');
    }
  });

  // GitHub Pages deploy
  $('deploy-btn')?.addEventListener('click', async () => {
    showDevStatus('🚀 جاري النشر على GitHub Pages...', 'info');
    try {
      const url = await enableGitHubPages();
      showDevStatus(`✅ التطبيق منشور على: ${url}`, 'success');
      showToast('✅ تم النشر!', 'success');
    } catch (err) {
      showDevStatus('❌ ' + err.message, 'error');
    }
  });

  // Input
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

  // Find the user message before this AI reply
  const userMsg = conv.messages.slice(0, idx).reverse().find(m => m.role === 'user');
  if (!userMsg) return;

  // Remove current AI reply and resend
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

// ─── Cursor Blink Style ───
const cursorStyle = document.createElement('style');
cursorStyle.textContent = `
  .cursor-blink {
    display: inline-block;
    animation: blink 0.7s infinite;
    color: var(--accent);
    margin-left: 2px;
  }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
`;
document.head.appendChild(cursorStyle);

// ─── Start ───
document.addEventListener('DOMContentLoaded', init);
