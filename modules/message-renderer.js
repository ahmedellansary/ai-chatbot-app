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
      let langTitle = 'Code';
      let icon = '>_';

      if (label === 'bash' || label === 'sh' || label === 'shell' || label === 'cmd' || label === 'powershell') {
        langTitle = 'Bash Command';
        icon = '>_';
      } else if (label === 'js' || label === 'javascript') {
        langTitle = 'JavaScript';
        icon = '⚡';
      } else if (label === 'python' || label === 'py') {
        langTitle = 'Python';
        icon = '🐍';
      } else if (label === 'html') {
        langTitle = 'HTML';
        icon = '🌐';
      } else if (label === 'css') {
        langTitle = 'CSS';
        icon = '🎨';
      } else if (label === 'json') {
        langTitle = 'JSON';
        icon = '📦';
      } else if (label === 'sql') {
        langTitle = 'SQL';
        icon = '🗄️';
      } else if (label && label !== 'code') {
        langTitle = label.toUpperCase();
        icon = '📄';
      }

      const isWebCode = label === 'html' || label === 'svg' || (label === 'javascript' && (trimmed.includes('<') || trimmed.includes('document.')));
      const encodedCode = encodeURIComponent(trimmed);
      let runBtn = '';
      if (isWebCode) {
        runBtn = `<button class="sandbox-launch-btn" onclick="window._runSandbox(decodeURIComponent('${encodedCode}'))">▶️ تشغيل المحاكاة</button>`;
      }

      const firstLine = trimmed.split('\n')[0] || '';
      const preview = firstLine.length > 55 ? firstLine.slice(0, 52) + '...' : firstLine;
      const linesCount = trimmed.split('\n').length;
      const shouldCollapse = linesCount > 18;

      return `\n<div class="dev-terminal-card">
        <div class="terminal-card-header">
          <div class="terminal-header-left">
            <span class="terminal-icon-badge">${icon}</span>
            <span class="terminal-lang-title">${langTitle}</span>
            <span class="terminal-cmd-preview">${preview}</span>
          </div>
          <div class="terminal-header-right">
            ${runBtn}
            ${shouldCollapse ? '<button type="button" class="terminal-action-btn view-btn" onclick="window._toggleCodeView(this)">Expand</button>' : ''}
            <button type="button" class="terminal-action-btn copy-btn" onclick="window._copyCode(this)">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>Copy</span>
            </button>
          </div>
        </div>
        <div class="terminal-card-body ${shouldCollapse ? 'collapsed' : ''}">
          <pre><code class="language-${label}">${trimmed}</code></pre>
        </div>
        <div class="terminal-card-footer">
          <div class="terminal-footer-status">
            <span class="terminal-status-pill">Exit Code: 0</span>
          </div>
          <div class="terminal-footer-meta">
            <span>${linesCount} lines</span>
          </div>
        </div>
      </div>\n`;
    });
    html = html.replace(/\[audio:(https?:\/\/[^\s|\]]+)(?:\|([^|\]]+))?(?:\|([^\]]+))?\]/gi, (m, src, desc, tag) => {
      const tagTitle = (tag || 'ElevenLabs AI Sound').trim();
      const descText = (desc || 'Generated Audio Track').trim();
      const cleanSrc = src.trim();
      return `\n<div class="modern-audio-card" data-src="${cleanSrc}">
        <div class="audio-card-header">
          <div class="audio-tag-badge">
            <span class="audio-dot"></span>
            <span>${tagTitle}</span>
          </div>
        </div>
        <div class="audio-card-desc">${descText}</div>
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
      </div>\n`;
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
    html = html.replace(/^### (.+)$/gm, '\n\n<h3>$1</h3>\n\n');
    html = html.replace(/^## (.+)$/gm, '\n\n<h2>$1</h2>\n\n');
    html = html.replace(/^# (.+)$/gm, '\n\n<h1>$1</h1>\n\n');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `\n\n<ul>${m}</ul>\n\n`);

    const blocks = html.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    const formattedBlocks = blocks.map(block => {
      if (/^<(h[1-6]|ul|ol|div|pre|blockquote)/i.test(block)) {
        return block;
      }
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    });
    return formattedBlocks.join('\n');
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
