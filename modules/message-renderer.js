// ═════════════════════════════════════════════════════════════════
//  X.v1 Message Renderer — Extracted Module (Phase 3 Refactor)
//  Handles Markdown, HTML escaping, message rows, toasts
// ═════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  function escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeSelectorId(id) {
    const value = String(id ?? '');
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(value);
    }
    return value.replace(/([\\"'\s:#.\[\]\(\)])/g, '\\$1');
  }

  function showToast(message, type = 'info') {
    if (window.UnifiedToast && window.UnifiedToast.showToast) return window.UnifiedToast.showToast(message, type);
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  function scrollToBottom() {
    const chatArea = document.getElementById('chat-area');
    if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
  }

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

  function createMessageRow(msg) {
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(msg.content || '');
    const row = document.createElement('div');
    row.className = `message-row ${msg.role} ${hasArabic ? 'is-rtl' : 'is-ltr'}`;
    row.dataset.id = msg.id;
    const parsed = msg.role === 'ai' ? parseMarkdown(msg.content) : escapeHtml(msg.content);
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
    let multiAgentHtml = '';
    if (msg.multiAgentSteps && Array.isArray(msg.multiAgentSteps)) {
      const stepsHtml = msg.multiAgentSteps.map(s => `
        <div class="agent-step-item">
          <div class="agent-step-header">
            <span class="agent-step-name">${s.icon} ${escapeHtml(s.title)}</span>
            <span class="agent-step-badge">${escapeHtml(s.status)}</span>
          </div>
          <div class="agent-step-body">${escapeHtml(s.summary || '')}</div>
        </div>
      `).join('');
      multiAgentHtml = `
        <div class="multi-agent-box collapsed" id="box-${msg.id}">
          <div class="multi-agent-header" onclick="window._toggleThinkingBox('${msg.id}')">
            <div class="multi-agent-title">
              <span>👥</span>
              <span>تشاور الوكلاء (${msg.multiAgentSteps.length} وكلاء مشاركين)</span>
            </div>
            <div class="multi-agent-toggle-indicator">
              <span id="indicator-${msg.id}">[إخفاء / عرض النقاش] ▾</span>
            </div>
          </div>
          <div class="multi-agent-content">
            ${stepsHtml}
          </div>
        </div>
      `;
    }
    if (msg.role === 'user') {
      row.innerHTML = `<div class="msg-content" ${dirAttr}>${parsed}${attachmentsHtml}</div>`;
    } else {
      row.innerHTML = `
        <div class="msg-content" ${dirAttr}>
          ${multiAgentHtml}
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
          <button class="claude-action-btn" onclick="window._retryMsg('${msg.id}')" title="إعادة المحاولة">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
            </svg>
          </button>
        </div>
        <div class="claude-footer-note">
          <div class="claude-terracotta-star">✦</div>
          <div class="claude-disclaimer-text">
            <span class="claude-model-name">${escapeHtml(msg.model || 'X.v1')}</span>
            <span>· Verify info</span>
          </div>
        </div>
      `;
    }
    return row;
  }

  function renderAllMessages(messages) {
    const container = document.getElementById('chat-container');
    if (!container) return;
    if (!messages || messages.length === 0) {
      if (window.UIEngine && window.UIEngine.showWelcomeScreen) window.UIEngine.showWelcomeScreen();
      return;
    }
    container.innerHTML = '';
    messages.forEach(msg => container.appendChild(createMessageRow(msg)));
  }

  function appendMessage(msg) {
    const container = document.getElementById('chat-container');
    if (!container || !msg) return;
    const welcome = container.querySelector('.welcome-screen');
    if (welcome) container.innerHTML = '';
    const existingRow = container.querySelector(`.message-row[data-id="${safeSelectorId(msg.id || '')}"]`);
    if (existingRow) {
      existingRow.replaceWith(createMessageRow(msg));
    } else {
      container.appendChild(createMessageRow(msg));
    }
    scrollToBottom();
  }

  let _thinkingTimer = null;
  function _stripDots(text) { return String(text || '').replace(/\s*\.+\s*$/, '').trim(); }
  function showTyping(initialText = 'Analyzing') {
    const container = document.getElementById('chat-container');
    if (!container) return;
    const base = _stripDots(initialText) || 'Analyzing';
    let typing = document.getElementById('typing-indicator');
    if (!typing) {
      typing = document.createElement('div');
      typing.id = 'typing-indicator';
      typing.className = 'message-row ai typing-indicator';
      typing.innerHTML = `
        <div class="typing-bubble" dir="ltr">
          <span class="typing-icon" aria-hidden="true">✦</span>
          <span id="thinking-word" class="thinking-word">${escapeHtml(base)}</span>
          <span class="thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        </div>
      `;
      container.appendChild(typing);
    } else {
      const wordEl = document.getElementById('thinking-word');
      if (wordEl) wordEl.textContent = base;
    }
    scrollToBottom();
  }
  function setThinkingStage(text) {
    const wordEl = document.getElementById('thinking-word');
    if (wordEl) { wordEl.textContent = _stripDots(text) || 'Thinking'; scrollToBottom(); }
  }
  function hideTyping() {
    if (_thinkingTimer) { clearTimeout(_thinkingTimer); _thinkingTimer = null; }
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  const MessageRenderer = {
    escapeHtml, safeSelectorId, showToast, scrollToBottom,
    parseMarkdown, createMessageRow, renderAllMessages, appendMessage,
    showTyping, setThinkingStage, hideTyping,
    get _thinkingTimer() { return _thinkingTimer; },
    set _thinkingTimer(v) { _thinkingTimer = v; }
  };

  window.MessageRenderer = MessageRenderer;
})();
