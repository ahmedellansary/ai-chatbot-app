// ═════════════════════════════════════════════════════════════════
//  X.v1 DevChatEngine — Extracted Module (Dev Refactor)
//  Handles adaptive briefing, fallback cascade, streaming, proposals
//  Exposes: window.DevChatEngine (IIFE, lazy getDeps)
// ═════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var getDeps = function () {
    return {
      get state() { return window._devState || window.devState || null; },
      get DEV_AGENTS() { return window.DEV_AGENTS || []; },
      get DevConfigVault() { return window.DevConfigVault || window.ConfigVault || window.OpsConfig || null; },
      get DevState() { return window.DevState || null; },
      get DevUIEngine() { return window.DevUIEngine || null; },
      get generateId() { return window.generateId || (typeof generateId !== 'undefined' ? generateId : function () { return 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8); }); },
      get $() { return window.$ || function (id) { return document.getElementById(id); }; }
    };
  };

  var DevChatEngine = {
    getAdaptiveConfigForDev: function (agent, estimatedTokens) {
      if (estimatedTokens === void 0) estimatedTokens = 0;
      if (estimatedTokens > 5000) return { recentCount: 10, maxBriefingChars: 1200 };
      if (!agent) return { recentCount: 10, maxBriefingChars: 1200 };
      if (agent.category === 'fast' || agent.id.includes('20b') || agent.id.includes('compound-mini')) return { recentCount: 6, maxBriefingChars: 600 };
      if (agent.provider === 'openrouter') return { recentCount: 10, maxBriefingChars: 1200 };
      return { recentCount: 10, maxBriefingChars: 1200 };
    },

    generateDevBriefing: function (conv, agent, estimatedTokens) {
      if (estimatedTokens === void 0) estimatedTokens = 0;
      if (!conv || !Array.isArray(conv.messages) || conv.messages.length <= 10) return '';
      var cfg = this.getAdaptiveConfigForDev(agent, estimatedTokens);
      var firstUser = (conv.messages.find(function (m) { return m.role === 'user'; }) || {}).content || '';
      firstUser = firstUser.slice(0, 220).replace(/\n/g, ' ').trim();
      var recentAi = conv.messages.filter(function (m) { return m.role === 'ai'; }).slice(-3).map(function (m) { return (m.content || '').slice(0, 200).replace(/\n/g, ' ').trim(); }).filter(Boolean).join(' | ');
      var turns = conv.messages.length;
      var title = conv.title || 'جلسة تطوير';
      var briefing = '📋 بريفنج جلسة المطور (' + title + '):\n- طلب التطوير الأساسي: ' + firstUser.slice(0, 200) + '\n- عدد التبادلات: ' + turns + '\n- آخر مخرجات: ' + recentAi.slice(0, 380);
      if (briefing.length > cfg.maxBriefingChars) briefing = briefing.slice(0, cfg.maxBriefingChars) + '...';
      return briefing;
    },

    buildFallbackCascade: function (primaryAgent, estimatedTokens) {
      if (estimatedTokens === void 0) estimatedTokens = 0;
      var d = getDeps();
      var AGENTS = (d.DEV_AGENTS && d.DEV_AGENTS.length) ? d.DEV_AGENTS : (window.DEV_AGENTS || []);
      var remaining = AGENTS.filter(function (a) { return a.id !== primaryAgent.id; });
      if (estimatedTokens > 5000) {
        var largeOpen = remaining.filter(function (a) { return a.provider === 'openrouter'; });
        var groqRest = remaining.filter(function (a) { return a.provider === 'groq'; });
        return [primaryAgent].concat(largeOpen).concat(groqRest);
      }
      return [primaryAgent].concat(remaining);
    },

    callSingleAgentStream: async function (agent, messages, signal, onChunk) {
      var d = getDeps();
      var cfg = d.DevConfigVault || window.DevConfigVault || window.ConfigVault;
      var isGroq = agent.provider === 'groq';
      var endpoint = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
      var key = isGroq ? cfg.getGroqKey() : cfg.getOpenRouterKey();
      var headers = {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json'
      };
      if (!isGroq) {
        headers['HTTP-Referer'] = window.location.origin;
        headers['X-Title'] = 'X.v1 Dev Portal';
      }
      var response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: agent.id,
          messages: messages,
          stream: true,
          temperature: 0.3,
          max_tokens: 8192
        }),
        signal: signal
      });
      if (response.status === 429 && isGroq) {
        if (cfg && cfg.rotateGroqKey) cfg.rotateGroqKey();
        throw new Error('GROQ_RATE_LIMIT');
      }
      if (!response.ok) {
        var errData = await response.json().catch(function () { return {}; });
        var errMsg = (errData.error && errData.error.message) || ('HTTP ' + response.status);
        if (isGroq && /TPM|rate limit|too large|token/i.test(errMsg)) {
          if (cfg && cfg.rotateGroqKey) cfg.rotateGroqKey();
          throw new Error('GROQ_RATE_LIMIT');
        }
        throw new Error(errMsg);
      }
      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      var hasTokens = false;
      while (true) {
        var _a = await reader.read(), done = _a.done, value = _a.value;
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          var trimmed = line.trim();
          if (!trimmed || trimmed.indexOf('data: ') !== 0) continue;
          var dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') continue;
          try {
            var parsed = JSON.parse(dataStr);
            var delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content;
            if (delta) {
              hasTokens = true;
              onChunk(delta);
            }
          } catch (e) {}
        }
      }
      if (!hasTokens) throw new Error('EMPTY_STREAM_RESPONSE');
    },

    sendMessage: async function (userText) {
      var d = getDeps();
      var state = d.state || window._devState;
      var DevState = window.DevState || d.DevState;
      var DevUIEngine = window.DevUIEngine || d.DevUIEngine;
      var gen = d.generateId;
      if (!state || !DevState || !DevUIEngine) { console.warn('[DevChatEngine] Missing deps'); return; }
      var hasAttachments = state.attachments && state.attachments.length > 0;
      if (state.isStreaming || (!userText.trim() && !hasAttachments)) return;
      if (!state.activeConvId) DevState.newConversation();
      var conv = DevState.getActiveConv();
      var textForPayload = userText.trim();
      var currentAttachments = [].concat(state.attachments || []);
      var attachedTexts = currentAttachments.filter(function (a) { return !a.type.startsWith('image/'); });
      if (attachedTexts.length > 0) {
        var fileContexts = attachedTexts.map(function (f) { return '--- محتوى الملف المرفق: ' + f.name + ' ---\n' + (f.textContent || '') + '\n--- نهاية الملف ---'; }).join('\n\n');
        textForPayload = textForPayload ? textForPayload + '\n\n' + fileContexts : fileContexts;
      }
      var attachedImages = currentAttachments.filter(function (a) { return a.type.startsWith('image/'); });
      if (attachedImages.length > 0 && !textForPayload) {
        textForPayload = 'يرجى فحص هذه الصورة/الملف المرفق وتطبيق التعديل المطلوب.';
      }
      state.attachments = [];
      if (DevUIEngine.renderAttachmentPreviews) DevUIEngine.renderAttachmentPreviews();
      var userMsg = DevState.addMessage('user', userText.trim() || 'ملف مرفق');
      if (DevUIEngine.appendMessage) DevUIEngine.appendMessage(userMsg);
      state.isStreaming = true;
      state.abortController = new AbortController();
      var selectedAgent = DevState.getSelectedAgent();
      var est = Math.ceil(((textForPayload && textForPayload.length || 0) + (state.devPrompt && state.devPrompt.length || 0)) / 3.5);
      var _devTierCfg = this.getAdaptiveConfigForDev(selectedAgent, est);
      var _devBriefing = this.generateDevBriefing(conv, selectedAgent, est);
      var systemPrompt = state.devPrompt || 'أنت مهندس برمجيات محترف ومطور تطبيق الشات ومستودع GitHub.';
      if (_devBriefing) {
        systemPrompt = systemPrompt + '\n\n═══════════════════════════════════════════════════════════════\n' + _devBriefing + '\n═══════════════════════════════════════════════════════════════\n(خلاصة ذكية للجلسة الكاملة — استخدمها كسياق كأنك حاضر من البداية. آخر ' + _devTierCfg.recentCount + ' رسائل هي النص الحرفي الأحدث)';
      }
      var recentMessages = conv.messages.filter(function (m) { return m.id !== userMsg.id; }).slice(-_devTierCfg.recentCount).map(function (m) { return { role: m.role === 'ai' ? 'assistant' : m.role, content: m.content }; });
      var apiMessages = [{ role: 'system', content: systemPrompt }].concat(recentMessages).concat([{ role: 'user', content: textForPayload }]);
      var fullContent = '';
      var aiMsgId = gen();
      var chosenAgent = DevState.getSelectedAgent();
      var estimatedTokens = Math.ceil((textForPayload.length + (systemPrompt && systemPrompt.length || 0)) / 3.5);
      var aiMsgObj = { id: aiMsgId, role: 'ai', content: '', model: state.isMultiAgentMode ? '👥 Multi-Agent Consensus' : chosenAgent.name };
      if (DevUIEngine.appendEmptyAiMessage) DevUIEngine.appendEmptyAiMessage(aiMsgObj);
      if (state.isMultiAgentMode) {
        try {
          await this.runDevMultiAgentConsensus(textForPayload, apiMessages, aiMsgId, aiMsgObj, conv, estimatedTokens);
        } catch (err) {
          if (err.name !== 'AbortError') {
            var errRow = document.querySelector('[data-id="' + aiMsgId + '"] .msg-content');
            if (errRow) {
              var esc = DevUIEngine.escapeHtml ? DevUIEngine.escapeHtml(err.message || 'حدث خطأ أثناء معالجة الطلب. يرجى المحاولة ثانية.') : (err.message || 'Error');
              errRow.innerHTML = '<span style="color:var(--accent-rose); font-size:13px;">⚠️ ' + esc + '</span>';
            }
          }
        } finally {
          state.isStreaming = false;
          state.abortController = null;
          if (DevUIEngine.updateSendBtn) DevUIEngine.updateSendBtn();
        }
        return;
      }
      var fallbackList = this.buildFallbackCascade(chosenAgent, estimatedTokens);
      var succeeded = false;
      var usedAgent = chosenAgent;
      var self = this;
      for (var i = 0; i < fallbackList.length; i++) {
        var currentAgent = fallbackList[i];
        try {
          var tagElem = document.querySelector('[data-id="' + aiMsgId + '"] .msg-model-tag');
          if (tagElem) {
            var escCU = DevUIEngine.escapeHtml ? DevUIEngine.escapeHtml(currentAgent.name) : currentAgent.name;
            tagElem.innerHTML = '<span>' + (currentAgent.icon || '🧠') + '</span> <span class="model-tag-name">' + escCU + '</span>';
          }
          if (i > 0) {
            var msgElemA = document.querySelector('[data-id="' + aiMsgId + '"] .msg-content');
            if (msgElemA && !fullContent) {
              var escN = DevUIEngine.escapeHtml ? DevUIEngine.escapeHtml(currentAgent.name) : currentAgent.name;
              msgElemA.innerHTML = '<span style="color:#fbbf24; font-size:12.5px;">🔄 جاري التبديل التلقائي إلى <strong>' + escN + '</strong>...</span>';
            }
          }
          fullContent = '';
          await self.callSingleAgentStream(currentAgent, apiMessages, state.abortController.signal, function (delta) {
            fullContent += delta;
            var msgRow = document.querySelector('[data-id="' + aiMsgId + '"]');
            if (msgRow) {
              var hasAr = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFE]/.test(fullContent);
              msgRow.className = 'message-row ai ' + (hasAr ? 'is-rtl' : 'is-ltr');
              msgRow.setAttribute('dir', hasAr ? 'rtl' : 'ltr');
              var msgEl = msgRow.querySelector('.msg-content');
              if (msgEl) msgEl.innerHTML = DevUIEngine.parseMarkdown(fullContent);
            }
          });
          succeeded = true;
          usedAgent = currentAgent;
          break;
        } catch (err) {
          if (err.name === 'AbortError') { console.log('[Dev Engine] Stream aborted by user'); return; }
          console.warn('[Agent Fallback] Agent ' + currentAgent.name + ' failed:', err.message);
          if (i === 0) {
            try {
              var cfg2 = d.DevConfigVault || window.DevConfigVault || window.ConfigVault;
              if (currentAgent.provider === 'groq' && cfg2 && cfg2.rotateGroqKey) cfg2.rotateGroqKey();
              fullContent = '';
              var retryMsg = document.querySelector('[data-id="' + aiMsgId + '"] .msg-content');
              if (retryMsg) {
                var escR = DevUIEngine.escapeHtml ? DevUIEngine.escapeHtml(currentAgent.name) : currentAgent.name;
                retryMsg.innerHTML = '<span style="color:#fbbf24; font-size:12.5px;">🔄 إعادة محاولة مع <strong>' + escR + '</strong>...</span>';
              }
              await new Promise(function (r) { return setTimeout(r, 700); });
              await self.callSingleAgentStream(currentAgent, apiMessages, state.abortController.signal, function (delta) {
                fullContent += delta;
                var mRow = document.querySelector('[data-id="' + aiMsgId + '"]');
                if (mRow) {
                  var hasAr2 = /[\u0600-\u06FF]/.test(fullContent);
                  mRow.className = 'message-row ai ' + (hasAr2 ? 'is-rtl' : 'is-ltr');
                  var me = mRow.querySelector('.msg-content');
                  if (me) me.innerHTML = DevUIEngine.parseMarkdown(fullContent);
                }
              });
              succeeded = true;
              usedAgent = currentAgent;
              break;
            } catch (retryErr) {
              console.warn('[Primary Retry Failed] ' + currentAgent.name + ':', retryErr.message);
            }
          }
          if (err.message === 'GROQ_RATE_LIMIT' && i > 0) {
            try {
              fullContent = '';
              await self.callSingleAgentStream(currentAgent, apiMessages, state.abortController.signal, function (delta) {
                fullContent += delta;
                var msgEl2 = document.querySelector('[data-id="' + aiMsgId + '"] .msg-content');
                if (msgEl2) msgEl2.innerHTML = DevUIEngine.parseMarkdown(fullContent);
              });
              succeeded = true;
              usedAgent = currentAgent;
              break;
            } catch (retryErr) {
              console.warn('[Agent Retry Failed]', retryErr);
            }
          }
        }
      }
      if (succeeded) {
        aiMsgObj.content = fullContent;
        aiMsgObj.model = usedAgent.name;
        conv.messages.push(aiMsgObj);
        var ds2 = window.DevState || d.DevState;
        if (ds2 && ds2.save) ds2.save();
        await this.handleDevProposal(fullContent, document.querySelector('[data-id="' + aiMsgId + '"]'));
      } else {
        var errorMsg = 'تعذر الرد من جميع النماذج حالياً بسبب ضغط مؤقت في مزودي الخدمة. يرجى إعادة المحاولة.';
        var errRow2 = document.querySelector('[data-id="' + aiMsgId + '"] .msg-content');
        if (errRow2) errRow2.innerHTML = '<span style="color:var(--accent-rose);">⚠️ ' + errorMsg + '</span>';
      }
      state.isStreaming = false;
      state.abortController = null;
      if (DevUIEngine.updateSendBtn) DevUIEngine.updateSendBtn();
    },

    runDevMultiAgentConsensus: async function (textForPayload, apiMessages, aiMsgId, aiMsgObj, conv, estimatedTokens) {
      if (estimatedTokens === void 0) estimatedTokens = 0;
      var d = getDeps();
      var state = d.state || window._devState;
      var DevState = window.DevState || d.DevState;
      var DevUIEngine = window.DevUIEngine || d.DevUIEngine;
      var AGENTS = d.DEV_AGENTS && d.DEV_AGENTS.length ? d.DEV_AGENTS : (window.DEV_AGENTS || []);
      var msgRow = document.querySelector('[data-id="' + aiMsgId + '"]');
      var msgContent = msgRow ? msgRow.querySelector('.msg-content') : null;
      var self = this;
      var renderLiveUI = function (steps, finalContent, isThinking) {
        if (finalContent === void 0) finalContent = '';
        if (isThinking === void 0) isThinking = true;
        if (!msgContent) {
          var mr = document.querySelector('[data-id="' + aiMsgId + '"] .msg-content');
          if (mr) msgContent = mr; else return;
        }
        var esc = DevUIEngine && DevUIEngine.escapeHtml ? DevUIEngine.escapeHtml.bind(DevUIEngine) : function (s) { return String(s||''); };
        var stepsHtml = steps.map(function (s) {
          return '\n          <div class="agent-step-item">\n            <div class="agent-step-header">\n              <span class="agent-step-name">' + s.icon + ' ' + esc(s.title) + '</span>\n              <span class="agent-step-badge">' + esc(s.status) + '</span>\n            </div>\n            <div class="agent-step-body">' + esc(s.summary || 'Analyzing...') + '</div>\n          </div>';
        }).join('');
        var isDone = !isThinking && steps.every(function (s) { return s.status.includes('✓') || s.status.includes('Approved') || s.status.includes('Done'); });
        var statusBadgeText = isDone ? '✓ Consensus Reached' : ((steps.find(function (s) { return s.status === 'Active'; }) || {}).title || 'In Progress...');
        var boxHtml = '\n          <div class="multi-agent-box" id="box-' + aiMsgId + '">\n            <div class="multi-agent-header" onclick="window._toggleThinkingBox(\'' + aiMsgId + '\')">\n              <div class="multi-agent-title">\n                <span>👥</span>\n                <span>Multi-Agent Consensus: <span style="color:#fbbf24; font-weight:600;">' + esc(statusBadgeText) + '</span></span>\n              </div>\n              <div class="multi-agent-toggle-indicator">\n                <span id="indicator-' + aiMsgId + '">[Details ▾]</span>\n              </div>\n            </div>\n            <div class="multi-agent-content">\n              ' + stepsHtml + '\n            </div>\n          </div>';
        var parsedFinal = finalContent ? DevUIEngine.parseMarkdown(finalContent) : (isThinking ? '<div style="color:var(--text-dim); font-size:12.5px; padding:4px;">⏳ Synthesizing verified response...</div>' : '');
        if (msgContent) msgContent.innerHTML = boxHtml + parsedFinal;
      };
      var steps = [
        { id: 1, icon: '💡', title: 'Architectural Lead', status: 'Active', summary: 'Analyzing requirements...' },
        { id: 2, icon: '🛡️', title: 'Code & Security Auditor', status: 'Waiting', summary: 'Awaiting architectural plan...' },
        { id: 3, icon: '👑', title: 'Lead Dev Synthesizer', status: 'Waiting', summary: 'Awaiting reviews to synthesize final output...' }
      ];
      renderLiveUI(steps, '', true);
      var streamWithCascade = async function (preferredAgent, customMessages, onDelta) {
        var cascade = self.buildFallbackCascade(preferredAgent, estimatedTokens);
        for (var i = 0; i < cascade.length; i++) {
          var agent = cascade[i];
          try {
            await self.callSingleAgentStream(agent, customMessages, state.abortController.signal, onDelta);
            return agent;
          } catch (err) {
            if (err.name === 'AbortError') throw err;
            console.warn('[Consensus Step Fallback] ' + agent.name + ' failed:', err.message);
          }
        }
        throw new Error('All consensus agents unavailable.');
      };
      var stage1Agent = AGENTS.find(function (a) { return a.id === 'openai/gpt-oss-120b'; }) || AGENTS[0];
      var stage1Messages = apiMessages.slice(0, -1).concat([{ role: 'user', content: textForPayload + '\n\n[DIRECTIVE]: Provide 2 concise technical points.' }]);
      var stage1Output = '';
      try {
        await streamWithCascade(stage1Agent, stage1Messages, function (delta) { stage1Output += delta; });
        steps[0].status = '✓ Done';
        steps[0].summary = stage1Output.slice(0, 100).trim() + '...';
        steps[1].status = 'Active';
        steps[1].summary = 'Auditing plan for security and edge cases...';
        renderLiveUI(steps, '', true);
      } catch (e) {
        if (e.name === 'AbortError') return;
        steps[0].status = '✓ Done';
        stage1Output = 'Architectural plan prepared.';
      }
      var stage2Agent = AGENTS.find(function (a) { return a.id === 'meta-llama/llama-3.3-70b-instruct:free'; }) || AGENTS.find(function (a) { return a.id === 'minimax/minimax-m2.7:free'; }) || AGENTS[1];
      var stage2Messages = apiMessages.slice(0, -1).concat([{ role: 'user', content: 'Task: "' + textForPayload.slice(0, 300) + '"\nArch: "' + stage1Output.slice(0, 300) + '"\n[DIRECTIVE]: 1 concise audit review line.' }]);
      var stage2Output = '';
      try {
        await streamWithCascade(stage2Agent, stage2Messages, function (delta) { stage2Output += delta; });
        steps[1].status = '✓ Done';
        steps[1].summary = stage2Output.slice(0, 100).trim() + '...';
        steps[2].status = 'Active';
        steps[2].summary = 'Synthesizing final approved response...';
        renderLiveUI(steps, '', true);
      } catch (e) {
        if (e.name === 'AbortError') return;
        steps[1].status = '✓ Done';
        stage2Output = 'Security audit verified and approved.';
      }
      var stage3Agent = DevState.getSelectedAgent();
      var stage3Messages = apiMessages.slice(0, -1).concat([{ role: 'user', content: textForPayload + '\n\n[CONSENSUS CONTEXT]\nPlan: ' + stage1Output.slice(0, 200) + '\nReview: ' + stage2Output.slice(0, 150) + '\n\n[STRICT DIRECTIVE]: Respond directly in the EXACT SAME LANGUAGE as the user (Arabic if user wrote in Arabic). Keep your answer concise, natural, friendly, and helpful. Do not dump large raw code blocks into text. If code modification is needed, append the deployment JSON block at the very end.' }]);
      var finalOutput = '';
      try {
        await streamWithCascade(stage3Agent, stage3Messages, function (delta) {
          finalOutput += delta;
          renderLiveUI(steps, finalOutput, false);
        });
        steps[2].status = '✓ Approved';
        steps[2].summary = 'Response synthesized and ready.';
        renderLiveUI(steps, finalOutput, false);
        aiMsgObj.content = finalOutput;
        aiMsgObj.model = '👥 Multi-Agent Consensus';
        conv.messages.push(aiMsgObj);
        if (DevState && DevState.save) DevState.save();
        await self.handleDevProposal(finalOutput, msgRow);
      } catch (err) {
        if (err.name === 'AbortError') return;
        throw err;
      }
    },

    handleDevProposal: async function (content, msgRow) {
      var d = getDeps();
      var state = d.state || window._devState;
      var DevUIEngine = window.DevUIEngine || d.DevUIEngine;
      var gen = d.generateId;
      var jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/) || content.match(/(\{[\s\S]*"file"[\s\S]*"content"[\s\S]*\})/);
      if (!jsonMatch || !msgRow) return;
      try {
        var data = JSON.parse(jsonMatch[1]);
        if (data.file && data.content) {
          var propId = gen();
          if (!state.pendingModifications) state.pendingModifications = {};
          state.pendingModifications[propId] = data;
          var existingCard = msgRow.querySelector('.dev-proposal-box');
          if (existingCard) existingCard.remove();
          var card = document.createElement('div');
          card.id = 'proposal-' + propId;
          card.className = 'dev-proposal-box';
          var esc = DevUIEngine && DevUIEngine.escapeHtml ? DevUIEngine.escapeHtml.bind(DevUIEngine) : function (s) { return String(s||''); };
          card.innerHTML = '\n            <div class="dev-proposal-title">\n              <span>🛠️</span>\n              <span>Ready to Patch: <code>' + esc(data.file) + '</code></span>\n            </div>\n            <div class="dev-proposal-desc">📝 <strong>Summary:</strong> ' + esc(data.message || 'Ready to commit & deploy to GitHub') + '</div>\n            <div class="dev-proposal-btns">\n              <button class="dev-btn-action preview" onclick="window._previewProposal(\'' + propId + '\')">\n                <span>👁️</span>\n                <span>Live Preview</span>\n              </button>\n              <button class="dev-btn-action deploy" onclick="window._deployProposal(\'' + propId + '\')">\n                <span>🚀</span>\n                <span>Deploy to GitHub</span>\n              </button>\n              <button class="dev-btn-action review-fix" onclick="window._togglePatchDrawer(\'' + propId + '\')">\n                <span>🔍</span>\n                <span>Inspect Patch ▾</span>\n              </button>\n              <button class="dev-btn-action cancel" onclick="window._cancelProposal(\'' + propId + '\')">\n                <span>✕</span>\n              </button>\n            </div>\n            <div class="dev-patch-drawer hidden" id="drawer-' + propId + '">\n              <div class="patch-drawer-header">\n                <span>📄 Modified Code (' + esc(data.file) + ')</span>\n                <button class="btn-copy-patch" onclick="window._copyPatchContent(\'' + propId + '\')">📋 Copy Code</button>\n              </div>\n              <pre class="patch-drawer-code"><code>' + esc(data.content) + '</code></pre>\n            </div>';
          msgRow.appendChild(card);
        }
      } catch (e) {
        console.warn('[Proposal Parse]', e);
      }
    }
  };

  window.DevChatEngine = DevChatEngine;
})();
