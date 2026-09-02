// ═════════════════════════════════════════════════════════════════
//  X.v1 State Controller — Extracted Module (Phase 3 Refactor)
//  Manages conversations persistence and active conversation
// ═════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  window.createStateController = function (state, deps) {
    // Use live lookup for deps to handle load order (Phase 3)
    const getDeps = () => ({
      generateId: (typeof generateId !== 'undefined' ? generateId : window.generateId) || (deps && deps.generateId) || (() => Date.now().toString(36) + Math.random().toString(36).slice(2)),
      MessageRenderer: window.MessageRenderer || (deps && deps.MessageRenderer) || null,
      UIEngine: window.UIEngine || (deps && deps.UIEngine) || null,
      $: (typeof $ !== 'undefined' ? $ : window.$) || (deps && deps.$) || ((id) => document.getElementById(id))
    });

    return {
      load() {
        try {
          const saved = localStorage.getItem('conversations');
          if (saved) {
            state.conversations = JSON.parse(saved);
            if (Array.isArray(state.conversations)) {
              state.conversations.forEach(conv => {
                if (Array.isArray(conv.messages)) {
                  conv.messages = conv.messages.filter(m => {
                    if (!m || !m.content) return false;
                    if (m.content.includes('preResponseSanity') || m.content.includes('Output blocked by pre-response')) return false;
                    return true;
                  });
                }
              });
              this.save();
            }
          }
        } catch (e) {
          console.warn('[State] Failed to load conversations', e);
          state.conversations = [];
        }
      },

      save() {
        try {
          localStorage.setItem('conversations', JSON.stringify(state.conversations));
        } catch (e) {
          console.warn('[State] Failed to save conversations', e);
        }
      },

      getActiveConv() {
        return state.conversations.find(c => c.id === state.activeConvId);
      },

      newConversation() {
        const { generateId: gen, UIEngine: ui } = getDeps();
        const id = (gen || (() => Date.now().toString(36) + Math.random().toString(36).slice(2)))();
        const conv = {
          id,
          title: 'محادثة جديدة',
          messages: [],
          mode: state.currentMode,
          isDev: false,
          createdAt: new Date().toISOString()
        };
        state.conversations.unshift(conv);
        state.activeConvId = id;
        try { localStorage.setItem('activeConvId', id); } catch {}
        this.save();
        this.loadConversation(id);
        const _ui = window.UIEngine || ui;
        if (_ui && _ui.renderConversationsList) _ui.renderConversationsList();
        return conv;
      },

      loadConversation(id) {
        const { MessageRenderer: mr, UIEngine: ui } = getDeps();
        const _mr = window.MessageRenderer || mr;
        const _ui = window.UIEngine || ui;
        const conv = state.conversations.find(c => c.id === id);
        if (!conv) return;
        state.activeConvId = id;
        try { localStorage.setItem('activeConvId', id); } catch {}
        state.currentMode = conv.mode || state.currentMode;
        this.save();
        if (_mr && _mr.renderAllMessages) _mr.renderAllMessages(conv.messages);
        if (_ui) {
          if (_ui.renderConversationsList) _ui.renderConversationsList();
          if (_ui.updateHeaderUI) _ui.updateHeaderUI();
          if (_ui.updateSendBtnState) _ui.updateSendBtnState();
          if (_ui.closeSidebar) _ui.closeSidebar();
        }
      },

      addMessage(role, content, modelInfo = null, attachments = []) {
        const { generateId: gen, UIEngine: ui } = getDeps();
        const conv = this.getActiveConv();
        if (!conv) return null;
        const msg = {
          id: (gen || (() => Date.now().toString(36) + Math.random().toString(36).slice(2)))(),
          role,
          content,
          model: modelInfo?.model?.name || null,
          usedFallback: modelInfo?.usedFallback || false,
          attachments: attachments || [],
          timestamp: new Date().toISOString()
        };
        conv.messages.push(msg);
        if (role === 'user' && !conv.isDev && conv.messages.filter(m => m.role === 'user').length === 1) {
          conv.title = content.slice(0, 36) + (content.length > 36 ? '...' : '');
          const _ui = window.UIEngine || ui;
          if (_ui && _ui.renderConversationsList) _ui.renderConversationsList();
        }
        this.save();
        return msg;
      }
    };
  };
})();
