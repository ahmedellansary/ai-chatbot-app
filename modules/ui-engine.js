// ═════════════════════════════════════════════════════════════════
//  X.v1 UI Engine — Extracted Module (Phase 3 Refactor)
//  Handles header UI, event delegation, attachments, voice, pull-to-refresh
// ═════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const getDeps = () => ({
    get state() { return window.state || null; },
    get MessageRenderer() { return window.MessageRenderer || null; },
    get ModelEngine() { return window.ModelEngine || null; },
    get StateController() { return window.StateController || null; },
    get ChatEngine() { return window.ChatEngine || null; },
    get AuthManager() { return window.AuthManager || null; },
    get GitHubService() { return window.GitHubService || null; },
    get $() { return window.$ || ((id) => document.getElementById(id)); },
    get $$() { return window.$$ || ((sel) => document.querySelectorAll(sel)); }
  });

  const UIEngine = {
    ATTACH_ICON_SVG: `
      <svg class="attach-svg" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
      </svg>
    `,

    updateSendBtnState() {
      const _d = getDeps();
      const state = _d.state || window.state;
      const $ = _d.$ || window.$;
      const inputEl = $('user-input');
      const btn = $('send-btn');
      if (!btn) return;
      const textVal = inputEl ? inputEl.value : '';
      const hasText = textVal.trim().length > 0;
      const hasAtt = Array.isArray(state.attachments) && state.attachments.length > 0;
      const canSend = (hasText || hasAtt) && !state.isStreaming;

      if (canSend) {
        btn.classList.add('active');
        btn.removeAttribute('disabled');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('disabled', 'true');
      }
    },

    updateInputDirection() {
      const _d = getDeps();
      const $ = _d.$ || window.$;
      const inputEl = $('user-input');
      const val = inputEl ? inputEl.value : '';
      const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(val);
      if (inputEl) {
        if (hasArabic) {
          inputEl.dir = 'rtl';
          inputEl.style.textAlign = 'right';
        } else {
          inputEl.dir = 'ltr';
          inputEl.style.textAlign = 'left';
        }
      }
    },

    adjustTextareaHeight() {
      const _d = getDeps();
      const $ = _d.$ || window.$;
      const inputEl = $('user-input');
      if (!inputEl) return;
      inputEl.style.height = 'auto';
      const scrollH = inputEl.scrollHeight;
      const targetH = Math.min(Math.max(scrollH, 26), 190);
      inputEl.style.height = targetH + 'px';
      inputEl.style.overflowY = scrollH > 190 ? 'auto' : 'hidden';
    },

    showWelcomeScreen() {
      const _d = getDeps();
      const $ = _d.$ || window.$;
      const container = $('chat-container');
      if (container) container.innerHTML = '';
    },

    renderConversationsList() {
      const _d = getDeps();
      const state = _d.state || window.state;
      const $ = _d.$ || window.$;
      const MessageRenderer = _d.MessageRenderer || window.MessageRenderer;
      const list = $('conversations-list');
      if (!list) return;
      const mr = MessageRenderer || window.MessageRenderer;
      const esc = mr ? mr.escapeHtml : (s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));
      list.innerHTML = state.conversations.map(conv => `
        <div class="conversation-item ${conv.id === state.activeConvId ? 'active' : ''}"
             onclick="window._loadConv('${conv.id}')">
          <span class="conv-title">${conv.isDev ? '🛠️ ' : ''}${esc(conv.title)}</span>
        </div>
      `).join('');
    },

    highlightActiveConv(id) {
      const _d = getDeps();
      const $$ = _d.$$ || window.$$;
      $$('.conversation-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('onclick')?.includes(id));
      });
    },

    buildDevModelOptions() {
      const _d = getDeps();
      const ModelEngine = _d.ModelEngine || window.ModelEngine;
      const me = ModelEngine || window.ModelEngine;
      if (!me) return '';
      const models = me.getAvailableModels();
      const selected = me.getSelectedDevModel();
      const options = models.map(model => {
        const key = `${model.provider}:${model.id}`;
        const isSelected = selected && selected.provider === model.provider && selected.id === model.id;
        return `<option value="${key}" ${isSelected ? 'selected' : ''}>${model.name}</option>`;
      }).join('');

      return `
        <button class="attach-btn" id="attach-btn" title="إرفاق ملفات أو صور" aria-label="إرفاق">
          ${this.ATTACH_ICON_SVG}
        </button>
        <span class="mode-tag dev-mode-tag" style="color:#fbbf24; background:rgba(217,119,6,0.15);">وضع المطور</span>
        <select id="dev-model-select" class="dev-model-select" aria-label="اختيار موديل المطور">
          ${options}
        </select>
      `;
    },

    updateHeaderUI() {
      const _d = getDeps();
      const state = _d.state || window.state;
      const $ = _d.$ || window.$;
      const $$ = _d.$$ || window.$$;
      const StateController = _d.StateController || window.StateController;
      const MessageRenderer = _d.MessageRenderer || window.MessageRenderer;
      const sc = StateController || window.StateController;
      const mr = MessageRenderer || window.MessageRenderer;
      const conv = sc ? sc.getActiveConv() : null;
      const titleText = $('header-title-text');
      const dot = document.querySelector('.status-dot');
      const indicator = $('input-mode-indicator');

      if (conv?.isDev) {
        if (titleText) titleText.textContent = 'DEV';
        if (dot) dot.style.background = '#fbbf24';
        if (indicator) {
          indicator.innerHTML = this.buildDevModelOptions();
          const select = $('dev-model-select');
          select?.addEventListener('change', (e) => {
            const st = getDeps().state || window.state;
            const _sc = getDeps().StateController || window.StateController;
            const _mr = getDeps().MessageRenderer || window.MessageRenderer;
            st.devModelKey = e.target.value;
            const active = _sc ? _sc.getActiveConv() : null;
            if (active && active.isDev) {
              active.devModelKey = st.devModelKey;
              _sc.save();
            }
            if (_mr) _mr.showToast('تم اختيار موديل المطور', 'info');
          });
          $('attach-btn')?.addEventListener('click', () => $('file-upload-input')?.click());
        }
      } else {
        if (titleText) titleText.textContent = state.currentMode;
        if (dot) dot.style.background = '#10b981';
        if (indicator) {
          indicator.innerHTML = `
            <button class="attach-btn" id="attach-btn" title="إرفاق ملفات أو صور" aria-label="إرفاق">
              ${this.ATTACH_ICON_SVG}
            </button>
            <span class="mode-tag">الشات الطبيعي</span>
          `;
          $('attach-btn')?.addEventListener('click', () => $('file-upload-input')?.click());
        }
      }

      $$('.dropdown-opt').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === state.currentMode);
      });
    },

    setupEventListeners() {
      const _d = getDeps();
      const state = _d.state || window.state;
      const $ = _d.$ || window.$;
      const $$ = _d.$$ || window.$$;
      if (window.__chatListenersBound) return;
      window.__chatListenersBound = true;

      // Click Event Delegation
      document.addEventListener('click', (e) => {
        const _dd = getDeps();
        const _state = _dd.state || window.state;
        const _$ = _dd.$ || window.$;
        const _StateController = _dd.StateController || window.StateController;
        const _MessageRenderer = _dd.MessageRenderer || window.MessageRenderer;
        const _AuthManager = _dd.AuthManager || window.AuthManager;
        const sidebar = _$('sidebar');
        const overlay = _$('overlay');

        if (e.target.closest('#sidebar-toggle') || e.target.closest('#header-dots-btn')) {
          e.preventDefault();
          e.stopPropagation();
          const isOpen = sidebar?.classList.contains('open');
          if (isOpen) {
            sidebar?.classList.remove('open');
            overlay?.classList.remove('active');
          } else {
            sidebar?.classList.add('open');
            overlay?.classList.add('active');
          }
          return;
        }

        if (e.target.closest('#close-sidebar-btn')) {
          e.preventDefault();
          sidebar?.classList.remove('open');
          overlay?.classList.remove('active');
          return;
        }

        // Close sidebar if click occurs outside of the sidebar
        if (sidebar?.classList.contains('open') && !e.target.closest('#sidebar')) {
          sidebar.classList.remove('open');
          overlay?.classList.remove('active');
        }

        if (e.target.closest('#overlay')) {
          sidebar?.classList.remove('open');
          _$('model-dropdown-menu')?.classList.remove('show');
          overlay?.classList.remove('active');
          return;
        }

        if (e.target.closest('#skills-menu-trigger')) {
          e.preventDefault();
          e.stopPropagation();
          _$('skills-vertical-menu')?.classList.toggle('show');
          _$('model-dropdown-menu')?.classList.remove('show');
          return;
        }

        if (!e.target.closest('#skills-vertical-menu')) {
          _$('skills-vertical-menu')?.classList.remove('show');
        }

        if (e.target.closest('#model-pill-trigger')) {
          e.preventDefault();
          e.stopPropagation();
          _$('model-dropdown-menu')?.classList.toggle('show');
          _$('skills-vertical-menu')?.classList.remove('show');
          return;
        }

        const optBtn = e.target.closest('.dropdown-opt');
        if (optBtn) {
          e.preventDefault();
          _state.currentMode = optBtn.dataset.mode || 'MID';
          _$('model-dropdown-menu')?.classList.remove('show');
          this.updateHeaderUI();
          const conv = _StateController ? _StateController.getActiveConv() : null;
          if (conv) {
            conv.mode = _state.currentMode;
            if (_StateController) _StateController.save();
          }
          if (_MessageRenderer) _MessageRenderer.showToast(`Switched to ${_state.currentMode} mode`, 'info');
          return;
        }

        if (!e.target.closest('#model-dropdown-menu')) {
          _$('model-dropdown-menu')?.classList.remove('show');
        }

        if (e.target.closest('#btn-new-chat') || e.target.closest('#header-new-chat-btn')) {
          e.preventDefault();
          if (_StateController) _StateController.newConversation();
          _$('sidebar')?.classList.remove('open');
          _$('overlay')?.classList.remove('active');
          return;
        }

        if (e.target.closest('#btn-dev-chat')) {
          e.preventDefault();
          if (_StateController) _StateController.startDevChat();
          _$('sidebar')?.classList.remove('open');
          _$('overlay')?.classList.remove('active');
          return;
        }

        if (e.target.closest('#btn-toggle-owner-lock')) {
          e.preventDefault();
          const _AuthManager2 = _AuthManager || window.AuthManager;
          const _MessageRenderer2 = _MessageRenderer || window.MessageRenderer;
          if (_AuthManager2 && _AuthManager2.isUnlocked()) {
            _AuthManager2.lock();
            if (_MessageRenderer2) _MessageRenderer2.showToast('🔒 تم قفل التطبيق بنجاح', 'info');
            _$('sidebar')?.classList.remove('open');
            _$('overlay')?.classList.remove('active');
          } else if (_AuthManager2) {
            _AuthManager2.setupGate();
          }
          return;
        }
      });

      // Text Input Reactivity
      const input = $('user-input');
      const sendBtn = $('send-btn');

      const onInput = () => {
        this.adjustTextareaHeight();
        this.updateInputDirection();
        this.updateSendBtnState();
      };

      ['input', 'keyup', 'change', 'paste', 'cut'].forEach(evt => {
        input?.addEventListener(evt, onInput);
        document.addEventListener(evt, (e) => {
          if (e.target && e.target.id === 'user-input') onInput();
        });
      });

      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          // Enter creates a newline naturally without sending
          setTimeout(() => this.adjustTextareaHeight(), 10);
        }
      });

      sendBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        const _dd2 = getDeps();
        const _state2 = _dd2.state || window.state;
        const _ChatEngine = _dd2.ChatEngine || window.ChatEngine;
        const ce = _ChatEngine || window.ChatEngine;
        const text = input ? input.value.trim() : '';
        const hasAtt = _state2.attachments && _state2.attachments.length > 0;
        if ((!text && !hasAtt) || _state2.isStreaming) return;
        if (input) input.value = '';
        this.adjustTextareaHeight();
        this.updateSendBtnState();
        if (ce) ce.sendMessage(text);
      });

      this.setupPullToRefresh();
      this.setupAttachmentHandler();
      this.setupVoiceHandlers();
      this.setupEmergencyControls();
      this.updateSendBtnState();
    },

    setupPullToRefresh() {
      const _d = getDeps();
      const $ = _d.$ || window.$;
      if (window.setupUnifiedPullToRefresh) return window.setupUnifiedPullToRefresh({ indicatorId: 'pull-refresh-indicator', chatAreaId: 'chat-area', threshold: 50 });
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

    setupAttachmentHandler() {
      const _d = getDeps();
      const state = _d.state || window.state;
      const $ = _d.$ || window.$;
      const MessageRenderer = _d.MessageRenderer || window.MessageRenderer;
      const mr = MessageRenderer || window.MessageRenderer;
      const fileInput = $('file-upload-input');
      const previewContainer = $('attachment-preview-container');
      if (!fileInput || !previewContainer) return;

      document.addEventListener('click', (e) => {
        if (e.target.closest('#attach-btn')) {
          e.preventDefault();
          fileInput.click();
        }
      });

      const readFileAsDataURL = (file) => new Promise(res => {
        const r = new FileReader();
        r.onload = ev => res(ev.target.result);
        r.readAsDataURL(file);
      });

      const readFileAsText = (file) => new Promise(res => {
        const r = new FileReader();
        r.onload = ev => res(ev.target.result);
        r.readAsText(file);
      });

      const renderPreviews = () => {
        const _st = getDeps().state || window.state;
        const _mr = getDeps().MessageRenderer || window.MessageRenderer;
        if (!_st.attachments.length) {
          previewContainer.classList.add('hidden');
          previewContainer.innerHTML = '';
          return;
        }
        previewContainer.classList.remove('hidden');
        const esc = _mr ? _mr.escapeHtml : (s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));
        previewContainer.innerHTML = _st.attachments.map((att, idx) => `
          <div class="preview-item">
            ${att.type.startsWith('image/') ? `<img src="${att.dataUrl}" class="preview-thumb">` : '<span>📄</span>'}
            <span class="preview-name">${esc(att.name)}</span>
            <button class="preview-remove" onclick="window._removeAttachment(${idx})">✕</button>
          </div>
        `).join('');
      };

      fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        for (const file of files) {
          if (file.type.startsWith('image/')) {
            const dataUrl = await readFileAsDataURL(file);
            state.attachments.push({ name: file.name, type: file.type, dataUrl });
          } else {
            const textContent = await readFileAsText(file);
            state.attachments.push({ name: file.name, type: file.type, textContent });
          }
        }

        renderPreviews();
        this.updateSendBtnState();
        fileInput.value = '';
      });

      window._removeAttachment = (idx) => {
        const _st2 = getDeps().state || window.state;
        _st2.attachments.splice(idx, 1);
        renderPreviews();
        this.updateSendBtnState();
      };
    },

    setupVoiceHandlers() {
      const _d = getDeps();
      const $ = _d.$ || window.$;
      const MessageRenderer = _d.MessageRenderer || window.MessageRenderer;
      const mr = MessageRenderer || window.MessageRenderer;
      const micBtn = $('mic-btn');
      const voiceModeBtn = $('voice-mode-btn');
      const input = $('user-input');

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      let recognition = null;

      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'ar-EG';

        recognition.onstart = () => {
          micBtn?.classList.add('recording');
          if (mr) mr.showToast('🎙️ جاري الاستماع...', 'info');
        };

        recognition.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (input) {
            input.value = transcript;
            input.dispatchEvent(new Event('input'));
          }
        };

        recognition.onerror = (e) => {
          console.warn('Speech error:', e.error);
          micBtn?.classList.remove('recording');
        };

        recognition.onend = () => {
          micBtn?.classList.remove('recording');
        };
      }

      micBtn?.addEventListener('click', () => {
        const _mr = getDeps().MessageRenderer || window.MessageRenderer;
        const _m = _mr || window.MessageRenderer;
        if (!recognition) {
          if (_m) _m.showToast('المتصفح لا يدعم التعرف على الصوت', 'error');
          return;
        }
        try {
          if (micBtn.classList.contains('recording')) {
            recognition.stop();
          } else {
            recognition.start();
          }
        } catch (e) {
          console.warn(e);
        }
      });

      voiceModeBtn?.addEventListener('click', () => {
        const _mr = getDeps().MessageRenderer || window.MessageRenderer;
        const _m = _mr || window.MessageRenderer;
        if (_m) _m.showToast('🔊 وضع الصوت التفاعلي جاهز', 'info');
        if (recognition) micBtn?.click();
      });
    },

    setupEmergencyControls() {
      const _d = getDeps();
      const $ = _d.$ || window.$;
      const AuthManager = _d.AuthManager || window.AuthManager;
      const GitHubService = _d.GitHubService || window.GitHubService;
      const StateController = _d.StateController || window.StateController;
      const am = AuthManager || window.AuthManager;
      const gs = GitHubService || window.GitHubService;
      const sc = StateController || window.StateController;
      $('btn-emergency-rollback')?.addEventListener('click', () => {
        const _am = getDeps().AuthManager || window.AuthManager;
        const _gs = getDeps().GitHubService || window.GitHubService;
        const _a = _am || window.AuthManager;
        const _g = _gs || window.GitHubService;
        if (!_a.isUnlocked()) {
          _a.requireAuth(() => _g.rollbackToPreviousCommit());
          return;
        }
        if (confirm('هل أنت متأكد من رغبتك في استرجاع آخر نسخة سابقة للتطبيق؟')) {
          _g.rollbackToPreviousCommit();
        }
      });

      $('btn-emergency-fix')?.addEventListener('click', () => {
        const _am = getDeps().AuthManager || window.AuthManager;
        const _sc = getDeps().StateController || window.StateController;
        const _a = _am || window.AuthManager;
        const _s = _sc || window.StateController;
        if (!_a.isUnlocked()) {
          _a.requireAuth(() => {
            _s.startDevChat('راجع آخر تعديل قمنا به فقط وافحص مشكلته بدقة دون المساس بباقي التطبيق، ثم أصلحه.');
            $('sidebar')?.classList.remove('open');
            $('overlay')?.classList.remove('active');
          });
          return;
        }
        _s.startDevChat('راجع آخر تعديل قمنا به فقط وافحص مشكلته بدقة دون المساس بباقي التطبيق، ثم أصلحه.');
        $('sidebar')?.classList.remove('open');
        $('overlay')?.classList.remove('active');
      });
    }
  };

  window.UIEngine = UIEngine;
})();
