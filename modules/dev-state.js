// ═════════════════════════════════════════════════════════════════
//  X.v1 DevState — Extracted Module (Dev Refactor)
//  Factory: window.createDevState(state, opts) → DevState
//  Preserves exact behavior of dev.js inline fallback
// ═════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  window.createDevState = function (state, opts) {
    opts = opts || {};
    var getDeps = function () {
      return {
        DevUIEngine: window.DevUIEngine || null,
        DEV_AGENTS: window.DEV_AGENTS || opts.DEV_AGENTS || (typeof DEV_AGENTS !== 'undefined' ? DEV_AGENTS : []),
        generateId: window.generateId || opts.generateId || (typeof generateId !== 'undefined' ? generateId : function () { return 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8); }),
        $: window.$ || opts.$ || function (id) { return document.getElementById(id); }
      };
    };

    return {
      load: function () {
        var deps = getDeps();
        var AGENTS = deps.DEV_AGENTS;
        try {
          var saved = localStorage.getItem('dev_conversations');
          state.conversations = saved ? JSON.parse(saved) : [];
        } catch (e) {
          state.conversations = [];
        }
        var savedAgent = localStorage.getItem('dev_selected_agent');
        if (savedAgent && AGENTS.some(function (a) { return a.id === savedAgent; })) {
          state.selectedAgentId = savedAgent;
        }
      },

      save: function () {
        try {
          localStorage.setItem('dev_conversations', JSON.stringify(state.conversations));
        } catch (e) {}
      },

      getActiveConv: function () {
        return state.conversations.find(function (c) { return c.id === state.activeConvId; });
      },

      getSelectedAgent: function () {
        var deps = getDeps();
        var AGENTS = deps.DEV_AGENTS;
        return AGENTS.find(function (a) { return a.id === state.selectedAgentId; }) || AGENTS[0];
      },

      setSelectedAgent: function (agentId) {
        var deps = getDeps();
        var AGENTS = deps.DEV_AGENTS;
        var UIEngine = window.DevUIEngine || deps.DevUIEngine;
        var agent = AGENTS.find(function (a) { return a.id === agentId; });
        if (agent) {
          state.selectedAgentId = agent.id;
          localStorage.setItem('dev_selected_agent', agent.id);
          if (UIEngine && UIEngine.updateAgentPillDisplay) UIEngine.updateAgentPillDisplay();
        }
      },

      newConversation: function () {
        var deps = getDeps();
        var gen = deps.generateId;
        var UIEngine = window.DevUIEngine || deps.DevUIEngine;
        var id = gen();
        var conv = {
          id: id,
          title: '🛠️ جلسة تطوير جديدة',
          messages: [
            {
              id: gen(),
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
        if (UIEngine && UIEngine.renderConversationsList) UIEngine.renderConversationsList();
        return conv;
      },

      loadConversation: function (id) {
        var deps = getDeps();
        var UIEngine = window.DevUIEngine || deps.DevUIEngine;
        state.activeConvId = id;
        var conv = this.getActiveConv();
        if (!conv) return;
        if (UIEngine) {
          if (UIEngine.renderMessages) UIEngine.renderMessages(conv.messages);
          if (UIEngine.renderConversationsList) UIEngine.renderConversationsList();
        }
      },

      deleteConversation: function (id) {
        var deps = getDeps();
        var UIEngine = window.DevUIEngine || deps.DevUIEngine;
        state.conversations = state.conversations.filter(function (c) { return c.id !== id; });
        this.save();
        if (state.activeConvId === id) {
          if (state.conversations.length) {
            this.loadConversation(state.conversations[0].id);
          } else {
            this.newConversation();
          }
        } else {
          if (UIEngine && UIEngine.renderConversationsList) UIEngine.renderConversationsList();
        }
      },

      addMessage: function (role, content) {
        var deps = getDeps();
        var gen = deps.generateId;
        var conv = this.getActiveConv();
        if (!conv) return null;
        var msg = {
          id: gen(),
          role: role,
          content: content,
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
  };
})();
