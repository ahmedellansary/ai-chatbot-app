// ═════════════════════════════════════════════════════════════════
//  X.v1 Chat Engine — Extracted Module (Phase 3 Refactor)
//  Handles payload, adaptive briefing, streaming, multi-agent
// ═════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const getDeps = () => ({
    StateController: window.StateController || null,
    MessageRenderer: window.MessageRenderer || null,
    ModelEngine: window.ModelEngine || null,
    InstructionManager: window.InstructionManager || null,
    UsageTracker: window.UsageTracker || null,
    UIEngine: window.UIEngine || null,
    generateId: window.generateId || (() => Date.now().toString(36) + Math.random().toString(36).slice(2)),
    $: window.$ || ((id) => document.getElementById(id)),
    get state() { return window.state || null; }
  });

  const ChatEngine = {
    preparePayload(userText) {
      const state = getDeps().state;
      if (!state) return { textForPayload: userText.trim(), currentAttachments: [] };
      let textForPayload = userText.trim();
      const currentAttachments = [...(state.attachments || [])];
      const attachedTexts = currentAttachments.filter(a => !a.type.startsWith('image/'));
      if (attachedTexts.length > 0) {
        const fileContexts = attachedTexts.map(f => `--- محتوى الملف المرفق: ${f.name} ---\n${f.textContent || ''}\n--- نهاية الملف ---`).join('\n\n');
        textForPayload = textForPayload ? `${textForPayload}\n\n${fileContexts}` : fileContexts;
      }
      const attachedImages = currentAttachments.filter(a => a.type.startsWith('image/'));
      if (attachedImages.length > 0 && !textForPayload) {
        textForPayload = 'يرجى فحص هذه الصورة المرفقة والإجابة عنها.';
      }
      return { textForPayload, currentAttachments };
    },

    getAdaptiveConfig(tier) {
      if (tier === 'FAST') return { recentCount: 6, maxBriefingChars: 600 };
      return { recentCount: 10, maxBriefingChars: 1200 };
    },

    generateBriefing(conv, tier) {
      if (!conv || !Array.isArray(conv.messages) || conv.messages.length <= 12) return '';
      const cfg = this.getAdaptiveConfig(tier);
      const firstUser = (conv.messages.find(m => m.role === 'user')?.content || '').slice(0, 200).replace(/\n/g, ' ').trim();
      const recentAi = conv.messages.filter(m => m.role === 'ai').slice(-3).map(m => (m.content || '').slice(0, 180).replace(/\n/g, ' ').trim()).filter(Boolean).join(' | ');
      const lang = /[\u0600-\u06FF]/.test(firstUser) ? 'العربية' : 'English';
      const turns = conv.messages.length;
      const title = conv.title || 'محادثة';
      let briefing = `📋 بريفنج المحادثة (${title}):\n- الهدف الأساسي: ${firstUser.slice(0, 180)}\n- اللغة والنبرة: ${lang}\n- عدد التبادلات: ${turns}\n- آخر خلاصات: ${recentAi.slice(0, 350)}`;
      if (briefing.length > cfg.maxBriefingChars) briefing = briefing.slice(0, cfg.maxBriefingChars) + '...';
      return briefing;
    },

    async buildSystemPrompt(userText = '', attachments = [], conv = null, tier = 'MID') {
      const { InstructionManager: im } = getDeps();
      const _im = window.InstructionManager || im;
      if (!_im || !_im.files || !_im.files.length) {
        if (_im && _im.load) await _im.load();
      }
      const basePrompt = _im ? _im.assemblePrompt(userText, attachments) : 'You are X.v1, an advanced AI assistant.';
      const briefing = this.generateBriefing(conv, tier);
      if (!briefing) return basePrompt;
      return `${basePrompt}\n\n═══════════════════════════════════════════════════════════════\n${briefing}\n═══════════════════════════════════════════════════════════════\n(هذه خلاصة ذكية للمحادثة الكاملة — استخدمها كسياق كأنك كنت حاضراً من البداية. آخر ${this.getAdaptiveConfig(tier).recentCount} رسائل التالية هي النص الحرفي الأحدث)`;
    },

    async sendMessage(userText) {
      const { StateController: sc, MessageRenderer: mr, ModelEngine: me, UIEngine: ui, generateId: gen, $: $fn } = getDeps();
      const _sc = window.StateController || sc;
      const _mr = window.MessageRenderer || mr;
      const _me = window.ModelEngine || me;
      const _ui = window.UIEngine || ui;
      const _gen = gen || window.generateId || (() => Date.now().toString(36) + Math.random().toString(36).slice(2));
      const _$ = $fn || window.$ || ((id) => document.getElementById(id));
      const state = getDeps().state;
      if (!state || !_sc || !_mr || !_me) { console.warn('[ChatEngine] Missing deps'); return; }
      const hasAttachments = state.attachments && state.attachments.length > 0;
      if (state.isStreaming || (!userText.trim() && !hasAttachments)) return;
      if (!state.activeConvId) _sc.newConversation();
      const conv = _sc.getActiveConv();
      const { textForPayload, currentAttachments } = this.preparePayload(userText);
      state.attachments = [];
      const previewContainer = _$('attachment-preview-container');
      if (previewContainer) { previewContainer.classList.add('hidden'); previewContainer.innerHTML = ''; }
      const userMsg = _sc.addMessage('user', userText.trim() || 'ملف مرفق', null, currentAttachments);
      _mr.appendMessage(userMsg);
      state.isStreaming = true;
      state.abortController = new AbortController();
      const tier = state.currentMode || 'MID';
      const systemPromptForCall = await this.buildSystemPrompt(textForPayload, currentAttachments, conv, tier);
      const cfg = this.getAdaptiveConfig(tier);
      const recentMessages = conv.messages.filter(m => m.id !== userMsg.id).slice(-cfg.recentCount);
      const apiMessages = [
        { role: 'system', content: systemPromptForCall },
        ...recentMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
        { role: 'user', content: textForPayload }
      ];
      let fullContent = '';
      const aiMsgId = _gen();
      const aiMsgObj = { id: aiMsgId, role: 'ai', content: '', model: null, usedFallback: false, timestamp: new Date().toISOString() };
      conv.messages.push(aiMsgObj);
      if (state.isMultiAgentMode) {
        try {
          const ma = window.MultiAgentEngine;
          if (ma) await ma.runConsensus(userText, textForPayload, apiMessages, aiMsgId, aiMsgObj, conv);
          else throw new Error('MultiAgentEngine not available');
        } catch (err) {
          _mr.hideTyping();
          if (err.name !== 'AbortError') _mr.showToast('❌ ' + err.message, 'error');
        } finally {
          _mr.hideTyping();
          state.isStreaming = false;
          state.abortController = null;
          if (_ui && _ui.updateSendBtnState) _ui.updateSendBtnState();
          _mr.scrollToBottom();
        }
        return;
      }
      _mr.showTyping('Analyzing...');
      const onModelEvent = (model, isFallback) => {
        aiMsgObj.model = model.name;
        aiMsgObj.provider = model.provider || 'groq';
        aiMsgObj.usedFallback = isFallback;
        const connectText = isFallback ? `Switching to ${model.name}...` : `Connecting to ${model.name}...`;
        _mr.setThinkingStage(connectText);
        if (_mr._thinkingTimer) clearTimeout(_mr._thinkingTimer);
        _mr._thinkingTimer = setTimeout(() => { _mr.setThinkingStage('Reasoning...'); }, 550);
      };
      try {
        const stream = _me.chatWithFallback(state.currentMode, apiMessages, state.abortController.signal, onModelEvent);
        let msgRow = null;
        for await (const { chunk, model, usedFallback } of stream) {
          fullContent += chunk;
          aiMsgObj.model = model.name;
          aiMsgObj.usedFallback = usedFallback;
          if (!msgRow) {
            _mr.hideTyping();
            _mr.appendMessage(aiMsgObj);
            msgRow = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
            const aiElem = document.querySelector(`[data-id="${aiMsgId}"]`);
            if (aiElem && typeof aiElem.scrollIntoView === 'function') aiElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          if (msgRow) {
            msgRow.innerHTML = _mr.parseMarkdown(fullContent);
            const isAr = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(fullContent);
            const parentRow = document.querySelector(`[data-id="${aiMsgId}"]`);
            if (parentRow) { parentRow.classList.toggle('is-rtl', isAr); parentRow.classList.toggle('is-ltr', !isAr); }
            msgRow.setAttribute('dir', isAr ? 'rtl' : 'ltr');
            msgRow.style.textAlign = isAr ? 'right' : 'left';
          }
        }
        const _im = window.InstructionManager || getDeps().InstructionManager;
        if (fullContent.includes('---BEGIN_INSTRUCTION_UPDATE---')) {
          if (_im) _im.handleAutoInstructionUpdate(fullContent);
          const cleanText = fullContent.replace(/---BEGIN_INSTRUCTION_UPDATE---[\s\S]*?---END_INSTRUCTION_UPDATE---/g, '').trim();
          aiMsgObj.content = cleanText;
          if (msgRow) msgRow.innerHTML = _mr.parseMarkdown(cleanText);
        } else {
          aiMsgObj.content = fullContent;
        }
        _sc.save();
        try { const ut = window.UsageTracker; if (ut) ut.record(aiMsgObj.model, aiMsgObj.provider || 'groq', textForPayload, fullContent); } catch {}
      } catch (err) {
        _mr.hideTyping();
        if (err.name !== 'AbortError') {
          if (!fullContent.trim()) {
            const idx = conv.messages.findIndex(m => m.id === aiMsgId);
            if (idx !== -1) conv.messages.splice(idx, 1);
            const emptyElem = document.querySelector(`[data-id="${aiMsgId}"]`);
            if (emptyElem) emptyElem.remove();
          }
          _mr.showToast('❌ ' + err.message, 'error');
        }
      } finally {
        _mr.hideTyping();
        state.isStreaming = false;
        state.abortController = null;
        if (_ui && _ui.updateSendBtnState) _ui.updateSendBtnState();
        _mr.scrollToBottom();
      }
    }
  };

  const MultiAgentEngine = {
    async runConsensus(userText, textForPayload, apiMessages, aiMsgId, aiMsgObj, conv) {
      const { MessageRenderer: mr, ModelEngine: me } = getDeps();
      const _mr = window.MessageRenderer || mr;
      const _me = window.ModelEngine || me;
      const state = getDeps().state;
      if (!_mr || !_me || !state) return;
      _mr.showTyping('جاري بدء تشاور الوكلاء...');
      let msgRow = null;
      const getOrCreateRow = () => {
        if (!msgRow) { _mr.hideTyping(); _mr.appendMessage(aiMsgObj); msgRow = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`); }
        return msgRow;
      };
      const renderLiveUI = (steps, finalContent = '', isThinking = true) => {
        const row = getOrCreateRow(); if (!row) return;
        const stepsHtml = steps.map(s => `
          <div class="agent-step-item">
            <div class="agent-step-header">
              <span class="agent-step-name">${s.icon} ${_mr.escapeHtml(s.title)}</span>
              <span class="agent-step-badge">${_mr.escapeHtml(s.status)}</span>
            </div>
            <div class="agent-step-body">${_mr.escapeHtml(s.summary || 'جاري التحليل...')}</div>
          </div>
        `).join('');
        const boxHtml = `
          <div class="multi-agent-box" id="box-${aiMsgId}">
            <div class="multi-agent-header" onclick="window._toggleThinkingBox('${aiMsgId}')">
              <div class="multi-agent-title">
                <span>👥</span>
                <span>تشاور الوكلاء (${steps.length} وكلاء مشاركين)</span>
              </div>
              <div class="multi-agent-toggle-indicator">
                <span id="indicator-${aiMsgId}">[إخفاء / عرض النقاش] ▾</span>
              </div>
            </div>
            <div class="multi-agent-content">
              ${stepsHtml}
            </div>
          </div>
        `;
        const parsedFinal = finalContent ? _mr.parseMarkdown(finalContent) : (isThinking ? '<div style="color:var(--text-dim); font-size:13px; padding:4px;">⏳ جاري صياغة القرار النهائي المعتمد...</div>' : '');
        row.innerHTML = boxHtml + parsedFinal;
        const isAr = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(finalContent || userText);
        const parentRow = document.querySelector(`[data-id="${aiMsgId}"]`);
        if (parentRow) { parentRow.classList.toggle('is-rtl', isAr); parentRow.classList.toggle('is-ltr', !isAr); }
      };
      const steps = [
        { id: 1, icon: '💡', title: 'المحلل الاستراتيجي (Strategic Analyst)', status: 'نشط الآن', summary: 'جاري دراسة المسألة واقتراح التحليل الأولي...' },
        { id: 2, icon: '🔍', title: 'الناقد المنطقي (Critical Reviewer)', status: 'في الانتظار', summary: 'بانتظار مسودة المحلل للتدقيق والفحص...' },
        { id: 3, icon: '👑', title: 'المقرر النهائي (Chief Synthesizer)', status: 'في الانتظار', summary: 'بانتظار التقرير النهائي للصياغة المعتمدة...' }
      ];
      renderLiveUI(steps, '', true);
      const stage1Messages = [...apiMessages.slice(0, -1), { role: 'user', content: `${textForPayload}\n\n[DIRECTIVE TO STRATEGIC ANALYST]: Provide a sharp, structured, and comprehensive initial analysis/solution. Be concise and logical.` }];
      let stage1Output = '';
      try {
        const stream1 = _me.chatWithFallback('FAST', stage1Messages, state.abortController.signal, () => {});
        for await (const { chunk } of stream1) stage1Output += chunk;
        steps[0].status = '✓ اكتمل'; steps[0].summary = stage1Output.slice(0, 180).trim() + (stage1Output.length > 180 ? '...' : '');
        steps[1].status = 'نشط الآن'; steps[1].summary = 'جاري مراجعة تحليل المسودة واكتشاف أي ثغرات أو تحسينات...';
        renderLiveUI(steps, '', true);
      } catch (e) { steps[0].status = 'تجاوز'; stage1Output = 'تحليل أولي للطلب.'; }
      const stage2Messages = [...apiMessages.slice(0, -1), { role: 'user', content: `User Request: "${textForPayload}"\n\nAgent 1 Proposal:\n"${stage1Output}"\n\n[DIRECTIVE TO CRITICAL REVIEWER]: Critique and review Agent 1's proposal. Point out any missed points, logic flaws, edge cases, or optimizations concisely in 2-3 bullet points.` }];
      let stage2Output = '';
      try {
        const stream2 = _me.chatWithFallback('MID', stage2Messages, state.abortController.signal, () => {});
        for await (const { chunk } of stream2) stage2Output += chunk;
        steps[1].status = '✓ اكتمل'; steps[1].summary = stage2Output.slice(0, 180).trim() + (stage2Output.length > 180 ? '...' : '');
        steps[2].status = 'نشط الآن'; steps[2].summary = 'جاري دمج أفضل النقاط واعتماد الإجابة النهائية الأصح...';
        renderLiveUI(steps, '', true);
      } catch (e) { steps[1].status = 'تجاوز'; stage2Output = 'تمت مراجعة المسودة واعتماد النقاط الرئيسية.'; }
      const stage3Messages = [...apiMessages.slice(0, -1), { role: 'user', content: `${textForPayload}\n\n[CONTEXT: Multi-Agent Consensus Collaboration]\nAgent 1 Draft:\n${stage1Output}\n\nAgent 2 Review & Critique:\n${stage2Output}\n\n[DIRECTIVE TO CHIEF SYNTHESIZER]: Deliver the finalized, highest quality, polished, and fully validated response to the user. Do not talk about the agents; directly provide the definitive answer formatted in clean Markdown.` }];
      let finalOutput = '';
      const stream3 = _me.chatWithFallback(state.currentMode, stage3Messages, state.abortController.signal, () => {});
      for await (const { chunk } of stream3) { finalOutput += chunk; renderLiveUI(steps, finalOutput, false); }
      steps[2].status = '✓ معتمد'; steps[2].summary = 'تم الاتفاق وصياغة القرار النهائي المعتمد بنجاح.';
      renderLiveUI(steps, finalOutput, false);
      aiMsgObj.content = finalOutput;
      aiMsgObj.multiAgentSteps = steps;
      const sc = window.StateController;
      if (sc) sc.save();
      try { const ut = window.UsageTracker; if (ut) ut.record(aiMsgObj.model || 'Multi-Agent', 'groq', textForPayload, finalOutput); } catch {}
    }
  };

  window.ChatEngine = ChatEngine;
  window.MultiAgentEngine = MultiAgentEngine;
})();
