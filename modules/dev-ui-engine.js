// ═════════════════════════════════════════════════════════════════
//  X.v1 DevUIEngine — Extracted Module (Dev Refactor)
//  Handles init, prompts, rendering, dropdowns, attachments, messages
//  Exposes: window.DevUIEngine (IIFE, lazy getDeps)
// ═════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var getDeps = function () {
    return {
      get state() { return window._devState || window.devState || null; },
      get DEV_AGENTS() { return window.DEV_AGENTS || []; },
      get DevState() { return window.DevState || null; },
      get DevChatEngine() { return window.DevChatEngine || null; },
      get DevGitHubService() { return window.DevGitHubService || window.GitHubService || window.UnifiedGitHub || null; },
      get DevAuthManager() { return window.DevAuthManager || window.AuthManager || null; },
      get DevConfigVault() { return window.DevConfigVault || window.ConfigVault || null; },
      get generateId() { return window.generateId || (typeof generateId !== 'undefined' ? generateId : function () { return 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8); }); },
      get $() { return window.$ || function (id) { return document.getElementById(id); }; },
      get $$() { return window.$$ || function (sel) { return document.querySelectorAll(sel); }; }
    };
  };

  function _get$(id){ var d=getDeps(); var fn=d.$||window.$; if(fn) return fn(id); return document.getElementById(id); }

  var DevUIEngine = {
    setupSmoothKineticScroll: function () {},

    init: function () {
      var d = getDeps();
      var DevState = window.DevState || d.DevState;
      var DevAuthManager = window.DevAuthManager || d.DevAuthManager || window.AuthManager;
      this.setupEventListeners();
      this.setupModelDropdown();
      this.setupPullToRefresh();
      this.setupSmoothKineticScroll();
      if (DevState && DevState.load) DevState.load();
      this.loadDevPrompt();
      if (DevAuthManager && DevAuthManager.setupGate) DevAuthManager.setupGate();
      this.updateAgentPillDisplay();
      var st = d.state || window._devState;
      var multiBtn = _get$('dev-multi-agent-toggle-btn');
      if (multiBtn && st && st.isMultiAgentMode) {
        multiBtn.classList.add('active');
        var label = _get$('dev-multi-agent-label-text');
        if (label) label.textContent = 'Multi-Agent (Active)';
      }
      if (st) {
        if (st.conversations && st.conversations.length) {
          if (DevState && DevState.loadConversation) DevState.loadConversation(st.conversations[0].id);
        } else {
          if (DevState && DevState.newConversation) DevState.newConversation();
        }
      }
      if (typeof updateDevVersionBadge === 'function') { try{ updateDevVersionBadge().catch(function(){}); }catch(e){} }
      else if (window.updateDevVersionBadge) { try{ window.updateDevVersionBadge().catch(function(){});}catch(e){} }
    },

    loadDevPrompt: async function () {
      var d = getDeps();
      var st = d.state || window._devState;
      if (!st) return;
      try {
        var res = await fetch('./dev_prompt.txt?t=' + Date.now());
        if (res.ok) st.devPrompt = await res.text();
        else {
          var saved = localStorage.getItem('custom_dev_prompt');
          if (saved) st.devPrompt = saved;
        }
      } catch (e) {
        var saved2 = localStorage.getItem('custom_dev_prompt');
        if (saved2) st.devPrompt = saved2;
      }
      this.syncLiveRepoMap();
    },

    syncLiveRepoMap: async function () {
      var d = getDeps();
      var st = d.state || window._devState;
      var gh = window.DevGitHubService || d.DevGitHubService;
      if (!st || !gh) return;
      try {
        var files = await gh.listFiles();
        if (files && files.length > 0) {
          st.liveRepoFiles = files;
          var mapHeader = '\n\n═══════════════════════════════════════════════════════════════\n🗺️ LIVE GITHUB REPO DIRECTORY MAP (Auto-Synced on Startup):\n═══════════════════════════════════════════════════════════════\nActive Repository Files in main branch:\n' + files.map(function (f) { return '- ' + f; }).join('\n') + '\n\nUse this live file directory to know exactly which file to inspect and propose modifications for when requested by the user.';
          if (!st.devPrompt) st.devPrompt = '';
          if (st.devPrompt.includes('LIVE GITHUB REPO DIRECTORY MAP')) {
            st.devPrompt = st.devPrompt.replace(/═══════+\s*🗺️ LIVE GITHUB REPO DIRECTORY MAP[\s\S]*$/, mapHeader.trim());
          } else {
            st.devPrompt += mapHeader;
          }
          console.log('[DevStudio] Live Repo Map Synced:', files.length, 'files');
        }
      } catch (e) {
        console.log('[DevStudio] Live Repo Map sync skipped:', e.message);
      }
    },

    updateAgentPillDisplay: function () {
      var d = getDeps();
      var DevState = window.DevState || d.DevState;
      if (!DevState) return;
      var agent = DevState.getSelectedAgent();
      if (!agent) return;
      var pillLabel = _get$('selected-agent-label');
      var pillIcon = _get$('selected-agent-icon');
      var shortName = agent.name.replace(' Lead Architect', '').replace(' Fast Coder', '').replace(' Rapid Coder', '');
      if (pillLabel) pillLabel.textContent = shortName;
      if (pillIcon) pillIcon.textContent = agent.icon || '👨‍💻';
    },

    setupPullToRefresh: function () {
      if (window.setupUnifiedPullToRefresh) return window.setupUnifiedPullToRefresh({ indicatorId: 'pull-refresh-indicator', chatAreaId: 'chat-area', threshold: 50 });
      var indicator = _get$('pull-refresh-indicator');
      if (!indicator) return;
      var spinner = indicator.querySelector('.pull-refresh-spinner');
      var startY = 0; var currentPull = 0; var isTracking = false; var TOP_THRESHOLD = 50;
      var onTouchStart = function (e) {
        if (e.touches.length !== 1) return;
        var chatArea = _get$('chat-area');
        if (!chatArea) return;
        if (chatArea.scrollTop <= 4) { startY = e.touches[0].clientY; isTracking = true; currentPull = 0; }
      };
      var onTouchMove = function (e) {
        if (!isTracking || e.touches.length !== 1) return;
        var y = e.touches[0].clientY; var diff = y - startY;
        if (diff > 8) {
          if (e.cancelable) e.preventDefault();
          currentPull = diff;
          var visualPull = Math.min(diff * 0.45, 75);
          indicator.classList.add('visible');
          indicator.style.opacity = '1';
          indicator.style.transform = 'translate3d(-50%, ' + (visualPull - 25) + 'px, 0) scale(1)';
          if (spinner) spinner.style.transform = 'rotate(' + (diff * 2.8) + 'deg)';
        } else { indicator.classList.remove('visible'); indicator.style.opacity = '0'; }
      };
      var onTouchEnd = function () {
        if (!isTracking) return; isTracking = false;
        if (currentPull >= TOP_THRESHOLD) {
          indicator.classList.add('refreshing');
          indicator.style.transform = 'translate3d(-50%, 18px, 0) scale(1)';
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function (regs) { for (var i=0;i<regs.length;i++) regs[i].update().catch(function(){}); }).catch(function(){});
          }
          setTimeout(function(){ location.reload(); }, 320);
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

    setupEventListeners: function () {
      var d = getDeps();
      var state = d.state || window._devState;
      var input = _get$('user-input');
      var sendBtn = _get$('send-btn');
      var newChatBtn = _get$('btn-new-dev-chat');
      var sidebarToggle = _get$('sidebar-toggle');
      var self = this;
      if (input) {
        input.addEventListener('input', function () {
          input.style.height = 'auto';
          input.style.height = Math.min(input.scrollHeight, 180) + 'px';
          var hasAr = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFE]/.test(input.value || '');
          input.setAttribute('dir', hasAr ? 'rtl' : 'ltr');
          self.updateSendBtn();
        });
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            setTimeout(function () { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 180) + 'px'; }, 10);
          }
        });
      }
      if (sendBtn) sendBtn.onclick = function () { self.handleSend(); };
      if (newChatBtn) {
        newChatBtn.onclick = function () {
          var ds = window.DevState || getDeps().DevState;
          if (ds && ds.newConversation) ds.newConversation();
        };
      }
      if (sidebarToggle) {
        sidebarToggle.onclick = function (e) {
          e.stopPropagation();
          var sidebar = _get$('sidebar'); var overlay = _get$('overlay');
          var isOpen = sidebar && sidebar.classList.contains('open');
          if (isOpen) { if(sidebar) sidebar.classList.remove('open'); if(overlay) overlay.classList.remove('active'); }
          else { if(sidebar) sidebar.classList.add('open'); if(overlay) overlay.classList.add('active'); }
        };
      }
      document.addEventListener('click', function (e) {
        var sidebar = _get$('sidebar'); var overlay = _get$('overlay');
        if (e.target.closest('#close-sidebar-btn') || e.target.closest('#overlay')) {
          e.preventDefault(); if(sidebar) sidebar.classList.remove('open'); if(overlay) overlay.classList.remove('active'); return;
        }
        if (sidebar && sidebar.classList.contains('open') && !e.target.closest('#sidebar') && !e.target.closest('#sidebar-toggle')) {
          sidebar.classList.remove('open'); if(overlay) overlay.classList.remove('active');
        }
      });
      this.setupAttachmentHandler();
    },

    setupAttachmentHandler: function () {
      var d = getDeps();
      var state = d.state || window._devState;
      var attachBtn = _get$('attach-btn');
      var attachInput = _get$('attach-input');
      var self = this;
      if (!attachBtn || !attachInput) return;
      attachBtn.onclick = function () { attachInput.click(); };
      attachInput.onchange = async function (e) {
        var files = Array.from(e.target.files || []);
        if (!files.length) return;
        for (var idx=0; idx<files.length; idx++) {
          var f = files[idx];
          var isImg = f.type.startsWith('image/');
          var att = { id: (window.generateId ? window.generateId() : ('dev_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8))), name: f.name, size: f.size, type: f.type || 'text/plain', textContent: '', dataUrl: '' };
          if (isImg) {
            att.dataUrl = await new Promise(function (resolve) {
              var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.readAsDataURL(f);
            });
          } else {
            att.textContent = await new Promise(function (resolve) {
              var r = new FileReader(); r.onload = function () { resolve(r.result); }; r.readAsText(f);
            });
          }
          if (state) state.attachments.push(att);
        }
        attachInput.value = '';
        self.renderAttachmentPreviews();
        self.updateSendBtn();
      };
    },

    setupModelDropdown: function () {
      var d = getDeps();
      var AGENTS = d.DEV_AGENTS || window.DEV_AGENTS || [];
      var pill = _get$('model-pill-trigger');
      var menu = _get$('model-dropdown-menu');
      var self = this;
      if (!pill || !menu) return;
      var renderMenu = function () {
        var DevState = window.DevState || d.DevState;
        var activeAgent = DevState ? DevState.getSelectedAgent() : AGENTS[0];
        menu.innerHTML = '\n          <div style="padding:6px 8px; font-size:11px; font-weight:700; color:var(--text-dim); display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); margin-bottom:4px;">\n            <span>🤖 اختر النموذج / الوكيل</span>\n            <button type="button" onclick="event.stopPropagation(); window._openAgentModal();" style="background:transparent; border:none; color:#fbbf24; cursor:pointer; font-size:11px; font-weight:600;">🔍 التفاصيل</button>\n          </div>' + AGENTS.map(function (agent) {
          var isActive = activeAgent && agent.id === activeAgent.id;
          var providerText = agent.provider === 'groq' ? '⚡ Groq' : '🌐 OpenRouter';
          var shortName = agent.name.replace(' Lead Architect', '').replace(' Fast Coder', '').replace(' Rapid Coder', '');
          return '\n            <button type="button" class="dropdown-opt ' + (isActive ? 'active' : '') + '" onclick="window._selectAgentFromDropdown(\'' + agent.id + '\')">\n              <div class="opt-title">\n                <span>' + (agent.icon || '🧠') + ' ' + self.escapeHtml(shortName) + '</span>\n                ' + (isActive ? '<span style="color:#fbbf24; font-size:12px; font-weight:bold;">✓</span>' : '') + '\n              </div>\n              <div class="opt-meta">\n                <span class="opt-tag">' + (agent.params || '') + '</span>\n                <span class="opt-tag ' + agent.provider + '">' + providerText + '</span>\n              </div>\n            </button>';
        }).join('');
      };
      pill.onclick = function (e) { e.preventDefault(); e.stopPropagation(); renderMenu(); menu.classList.toggle('show'); };
      document.addEventListener('click', function (e) {
        if (menu && !menu.contains(e.target) && !pill.contains(e.target)) menu.classList.remove('show');
      });
    },

    renderAttachmentPreviews: function () {
      var d = getDeps();
      var state = d.state || window._devState;
      var container = _get$('attachment-preview-container');
      var self = this;
      if (!container) return;
      if (!state || !state.attachments || !state.attachments.length) { container.classList.add('hidden'); container.innerHTML = ''; return; }
      container.classList.remove('hidden');
      container.innerHTML = state.attachments.map(function (a) {
        var isImg = a.type.startsWith('image/');
        var thumbHtml = isImg && a.dataUrl ? '<img src="' + a.dataUrl + '" class="preview-thumb" alt="Preview">' : '<span style="font-size:16px;">📄</span>';
        return '\n          <div class="preview-item">\n            ' + thumbHtml + '\n            <span class="preview-name" title="' + self.escapeHtml(a.name) + '">' + self.escapeHtml(a.name) + '</span>\n            <button type="button" class="preview-remove" onclick="window._removeDevAttachment(\'' + a.id + '\')" title="Remove">✕</button>\n          </div>';
      }).join('');
    },

    handleSend: function () {
      var input = _get$('user-input');
      var d = getDeps();
      var eng = window.DevChatEngine || d.DevChatEngine;
      if (!input) return;
      var text = input.value;
      input.value = '';
      input.style.height = 'auto';
      this.updateSendBtn();
      if (eng && eng.sendMessage) eng.sendMessage(text);
    },

    updateSendBtn: function () {
      var d = getDeps();
      var state = d.state || window._devState;
      var input = _get$('user-input');
      var sendBtn = _get$('send-btn');
      if (!input || !sendBtn || !state) return;
      var hasAtt = state.attachments && state.attachments.length > 0;
      var hasText = input.value.trim().length > 0;
      var canSend = (hasText || hasAtt) && !state.isStreaming;
      sendBtn.disabled = !canSend;
      sendBtn.classList.toggle('active', canSend);
    },

    renderConversationsList: function () {
      var d = getDeps();
      var state = d.state || window._devState;
      var container = _get$('conversations-list');
      var self = this;
      if (!container || !state) return;
      container.innerHTML = state.conversations.map(function (c) {
        return '\n        <div class="conv-item ' + (c.id === state.activeConvId ? 'active' : '') + '" onclick="window._loadDevConv(\'' + c.id + '\')">\n          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + self.escapeHtml(c.title || 'جلسة تطوير') + '</span>\n          <button class="conv-item-del" onclick="event.stopPropagation(); window._deleteDevConv(\'' + c.id + '\')" title="حذف الجلسة">✕</button>\n        </div>';
      }).join('');
    },

    renderMessages: function (messages) {
      var container = _get$('chat-container');
      if (!container) return;
      container.innerHTML = '';
      if (!messages || !messages.length) return;
      for (var i=0;i<messages.length;i++) { var msg=messages[i]; if (!msg.isWelcome) this.appendMessage(msg); }
    },

    renderWelcomeHero: function () {},

    appendMessage: function (msg) {
      var d = getDeps();
      var AGENTS = d.DEV_AGENTS || window.DEV_AGENTS || [];
      var container = _get$('chat-container');
      if (!container) return;
      var row = document.createElement('div');
      var hasAr = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFE]/.test(msg.content || '');
      row.className = 'message-row ' + msg.role + ' ' + (hasAr ? 'is-rtl' : 'is-ltr');
      row.setAttribute('dir', hasAr ? 'rtl' : 'ltr');
      row.dataset.id = msg.id;
      var modelBadgeHtml = '';
      if (msg.role === 'ai') {
        var modelName = msg.model || 'AI Developer';
        var matchedAgent = AGENTS.find(function (a) { return a.name === modelName; });
        var icon = matchedAgent && matchedAgent.icon ? matchedAgent.icon : '🧠';
        modelBadgeHtml = '<div class="msg-model-tag"><span>' + icon + '</span> <span class="model-tag-name">' + this.escapeHtml(modelName) + '</span></div>';
      }
      var contentHtml = msg.role === 'ai' ? this.parseMarkdown(msg.content) : this.escapeHtml(msg.content);
      row.innerHTML = '\n        <div class="msg-content">' + contentHtml + '</div>\n        ' + modelBadgeHtml + '\n      ';
      container.appendChild(row);
      // handle proposal if ai
      if (msg.role === 'ai') {
        var eng = window.DevChatEngine || d.DevChatEngine;
        if (eng && eng.handleDevProposal) try{ eng.handleDevProposal(msg.content, row); }catch(e){}
      }
      this.scrollToBottom();
    },

    appendEmptyAiMessage: function (msgObj) {
      var d = getDeps();
      var AGENTS = d.DEV_AGENTS || window.DEV_AGENTS || [];
      var container = _get$('chat-container');
      if (!container) return;
      var row = document.createElement('div');
      row.className = 'message-row ai is-rtl';
      row.setAttribute('dir', 'rtl');
      row.dataset.id = msgObj.id;
      var modelName = msgObj.model || 'جاري التحليل...';
      var matchedAgent = AGENTS.find(function (a) { return a.name === modelName; });
      var icon = matchedAgent && matchedAgent.icon ? matchedAgent.icon : '🧠';
      row.innerHTML = '\n        <div class="msg-content"><span style="color:var(--text-dim);">جاري التحليل وتجهيز التعديل...</span></div>\n        <div class="msg-model-tag"><span>' + icon + '</span> <span class="model-tag-name">' + this.escapeHtml(modelName) + '</span></div>\n      ';
      container.appendChild(row);
      this.scrollToBottom();
    },

    renderAgentsGrid: function (filter) {
      if (filter === void 0) filter = 'all';
      var d = getDeps();
      var AGENTS = d.DEV_AGENTS || window.DEV_AGENTS || [];
      var state = d.state || window._devState;
      var container = _get$('agents-grid');
      if (!container) return;
      var self = this;
      var filtered = AGENTS.filter(function (a) { return filter === 'all' || a.category === filter; });
      container.innerHTML = filtered.map(function (agent) {
        var isSelected = state && agent.id === state.selectedAgentId;
        var providerBadgeClass = agent.provider === 'groq' ? 'provider-groq' : 'provider-openrouter';
        var providerBadgeText = agent.provider === 'groq' ? '⚡ Groq Fast' : '🌐 OpenRouter';
        return '\n          <div class="agent-card ' + (isSelected ? 'selected' : '') + '" onclick="window._selectAgent(\'' + agent.id + '\')">\n            <div class="agent-card-info">\n              <div class="agent-card-icon">' + (agent.icon || '🧠') + '</div>\n              <div class="agent-card-text">\n                <div class="agent-card-name">\n                  <span>' + self.escapeHtml(agent.name) + '</span>\n                </div>\n                <div class="agent-card-desc">' + self.escapeHtml(agent.desc) + '</div>\n              </div>\n            </div>\n            <div class="agent-card-badges">\n              <span class="agent-badge ' + (agent.category === 'code' ? 'priority-code' : '') + '">' + agent.params + '</span>\n              <span class="agent-badge ' + providerBadgeClass + '">' + providerBadgeText + '</span>\n              <span class="agent-selected-check">✓</span>\n            </div>\n          </div>';
      }).join('');
    },

    scrollToBottom: function () {
      var area = _get$('chat-area');
      if (area) area.scrollTop = area.scrollHeight;
    },

    escapeHtml: function (str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    parseMarkdown: function (text) {
      if (!text) return '';
      var out = text;
      out = out.replace(/```json\s*\{[\s\S]*?"file"[\s\S]*?"content"[\s\S]*?\}\s*```/g, '');
      out = out.replace(/\{[\s\S]*?"file"\s*:\s*["'][^"']+["'][\s\S]*?"content"\s*:[\s\S]*?\}/g, '');
      out = out.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, function (m, lang, code) {
        var self2 = DevUIEngine;
        return '<pre><code>' + self2.escapeHtml(code.trim()) + '</code></pre>';
      });
      out = out.replace(/`([^`]+)`/g, function (m, code) { return '<code>' + DevUIEngine.escapeHtml(code) + '</code>'; });
      out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      out = out.replace(/^### (.*$)/gim, '<h4 style="margin:8px 0; color:#fbbf24;">$1</h4>');
      out = out.replace(/^## (.*$)/gim, '<h3 style="margin:10px 0; color:#fbbf24;">$1</h3>');
      out = out.replace(/^# (.*$)/gim, '<h2 style="margin:12px 0; color:#fbbf24;">$1</h2>');
      out = out.replace(/\n/g, '<br>');
      return out;
    },

    showToast: function (message, type) {
      if (type === void 0) type = 'info';
      if (window.UnifiedToast && window.UnifiedToast.showToast) return window.UnifiedToast.showToast(message, type);
      var container = _get$('toast-container');
      if (!container) return;
      var t = document.createElement('div');
      t.className = 'toast ' + type;
      t.innerHTML = '<span>' + this.escapeHtml(message) + '</span>';
      container.appendChild(t);
      setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { try{ t.remove(); }catch(e){} }, 300); }, 3500);
    }
  };

  window.DevUIEngine = DevUIEngine;
})();
