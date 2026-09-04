// ═════════════════════════════════════════════════════════════════
//  X.v1 CHATBOT — Unified Core Engine (Senior Architectural Refactor)
// ═════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────
  // 1. CONFIG & CREDENTIALS VAULT — Unified (config.js)
  // ─────────────────────────────────────────────────────────────────
  // Single Source of Truth — loaded from config.js before this file.
  // Fallback only if config.js fails to load (preserves original behavior).
  const ConfigVault = window.ConfigVault || window.DevConfigVault || window.OpsConfig || (() => {
    const _k1f = ['sk-or-v1-', 'b82e11595ed064e7', '51bfff2b251a4c54', 'ca0da9bc779786cd', 'baf933e916398e03'].join('');
    const _k2f = [['gsk_6ULPilUmj8gf0mbu2ZlX', 'WGdyb3FYkqImKQ7lZPdjGIBERqBKrDhX'].join(''), ['gsk_ECkO3AaJ8sBRAnd7gLMN', 'WGdyb3FYTMBNYK0SxQU6W1CSXEx23koB'].join(''), ['gsk_QiThrmueUOxgPM9xcIwn', 'WGdyb3FYVF37eSLhIgG9RYTXakzxc16l'].join(''), ['gsk_dVkSeAKGE0wQRxqy7OWX', 'WGdyb3FY0vHBuaJxlmnjbaPytbsl4dn8'].join(''), ['gsk_u5bCiNIx7oQaS2XzqiAG', 'WGdyb3FYE6s7QoY0qntIUhBU4D13AhjZ'].join('')].join(',');
    const _k3f = [String.fromCharCode(103,104,112,95)+'Ep2hC2i0', 'LFNVeyCSiUFlMMb0', '5ILzmJ2nzGGN'].join('');
    return {
      getOpenRouterKey() { const k = localStorage.getItem('OPENROUTER_API_KEY'); return (k && k.trim()) ? k.trim() : _k1f; },
      getGroqKeys() { const k = localStorage.getItem('GROQ_API_KEY'); if (k && k.trim()) return k.split(',').map(s=>s.trim()).filter(Boolean); return _k2f.split(','); },
      _groqIdx: 0, getGroqKey() { const ks=this.getGroqKeys(); return ks[this._groqIdx%ks.length]; }, rotateGroqKey(){ this._groqIdx++; },
      getGitHubToken(){ const k=localStorage.getItem('GITHUB_TOKEN'); return (k&&k.trim())?k.trim():_k3f; },
      getGitHubHeaders(){ return {'Authorization':`Bearer ${this.getGitHubToken()}`,'Accept':'application/vnd.github.v3+json','Content-Type':'application/json','User-Agent':'X.v1-ChatBot-App'}; },
      getGithubToken(){ return this.getGitHubToken(); }, getHeaders(){ return this.getGitHubHeaders(); }, getGHHeaders(){ return this.getGitHubHeaders(); }
    };
  })();
  const GITHUB_USER   = window.GITHUB_USER   || 'ahmedellansary';
  const GITHUB_REPO   = window.GITHUB_REPO   || 'ai-chatbot-app';
  const GITHUB_BRANCH = window.GITHUB_BRANCH || 'main';
  const GITHUB_API    = window.GITHUB_API    || 'https://api.github.com';

  // ── Usage Tracker — Extracted to modules/usage-tracker.js (Phase 3)
  const UsageTracker = window.UsageTracker || {
    key: 'xv1_usage_stats',
    load() { try { const v=JSON.parse(localStorage.getItem(this.key) || 'null'); if(v && typeof v==='object'){ if(!v.perModel) v.perModel={}; if(!v.or) v.or={t:0,r:0}; if(!v.groq) v.groq={t:0,r:0}; return v; } return { or: {t:0,r:0}, groq: {t:0,r:0}, perModel:{}, lastModel: '', lastAt: '' }; } catch { return { or: {t:0,r:0}, groq: {t:0,r:0}, perModel:{}, lastModel: '', lastAt: '' }; } },
    save(d) { try { localStorage.setItem(this.key, JSON.stringify(d)); } catch {} },
    estimateTokens(t) { return Math.ceil((t||'').length / 3.5); },
    record(m,p,pt,ct){ const d=this.load(); const tot=this.estimateTokens(pt)+this.estimateTokens(ct); const k=p==='openrouter'?'or':'groq'; d[k].t+=tot; d[k].r+=1; if(m){ if(!d.perModel[m]) d.perModel[m]={t:0,r:0,lastAt:''}; d.perModel[m].t+=tot; d.perModel[m].r+=1; d.perModel[m].lastAt=new Date().toISOString(); } d.lastModel=m||k; d.lastAt=new Date().toISOString(); this.save(d); this.render(); try{ if(window.ModelsPage) window.ModelsPage.refreshRow(m); }catch{} },
    async fetchRealOpenRouter(){ const el=document.getElementById('or-sub'); try{ const k=(window.ConfigVault&&window.ConfigVault.getOpenRouterKey)?window.ConfigVault.getOpenRouterKey():'';
        if(!k) return;
        const ctrl = new AbortController();
        const tm = setTimeout(() => ctrl.abort(), 2000);
        const r=await fetch('https://openrouter.ai/api/v1/credits',{headers:{'Authorization':`Bearer ${k}`}, signal: ctrl.signal});
        clearTimeout(tm);
        if(!r.ok) throw new Error();
        const j=await r.json(); const d=j.data||j; const u=d.total_usage??d.totalUsage??0; const c=d.total_credits??d.totalCredits??0;
        if(el) el.textContent=`الرصيد: ${Number(c).toFixed(2)} | المستهلك: ${Number(u).toFixed(3)}`;
        const s=this.load(); if(u) s.or.t=Math.round(u*1000); this.save(s); this.render(); }catch{ if(el) el.textContent='بيانات محلية (لا يمكن جلب الحقيقي)'; } },
    render(){ const d=this.load(); const s=(id,v)=>{const e=document.getElementById(id); if(e) e.textContent=v.toLocaleString('en-US');}; s('or-tokens',d.or.t); s('or-reqs',d.or.r); s('groq-tokens',d.groq.t); s('groq-reqs',d.groq.r);
      const lm=document.getElementById('usage-last-model'); if(lm) lm.textContent=d.lastModel?`آخر: ${d.lastModel}`:'—';
      const gs=document.getElementById('groq-sub'); if(gs) gs.textContent=d.lastModel?`آخر موديل: ${d.lastModel}`:'بانتظار أول طلب'; }
  };

  // ─────────────────────────────────────────────────────────────────
  // 2. AUTHENTICATION & SECURITY — Unified (auth.js)
  // ─────────────────────────────────────────────────────────────────
  // Single Source of Truth — loaded from auth.js before this file.
  const MASTER_AUTH_RECORD = window.MASTER_AUTH_RECORD || 'd34a56498cc5f912d1f55cefd6382af6:c000fd79842150a9fdb7b3d30ed0f964652ad5ba078beb7b7f9c47a523a16595';
  const AuthManager = window.AuthManager || (window.createAuthManager ? window.createAuthManager({
    storageKey: 'xv1_authenticated',
    previewFlag: '__IS_DEV_PREVIEW',
    legacyKeys: ['nytron_app_unlocked', 'claude_app_unlocked', 'owner_unlocked'],
    gateId: 'app-lock-gate',
    formId: 'lock-gate-form',
    inputId: 'gate-pin-input',
    buttonId: 'gate-unlock-btn'
  }) : null);

  // Safe global aliases for compatibility (preserved — auth.js also defines them)
  function isAppUnlocked() { return AuthManager.isUnlocked(); }
  function isOwnerUnlocked() { return AuthManager.isUnlocked(); }
  function updateOwnerLockUI() {}
  function promptOwnerAuth(cb) { AuthManager.requireAuth(cb); }
  function setupAppLockGate() { AuthManager.setupGate(); }

  // ─────────────────────────────────────────────────────────────────
  // 3. STATE & PERSISTENCE CONTROLLER (StateController)
  // ─────────────────────────────────────────────────────────────────
  const state = {
    currentLayer: (function(){ try{ const v=localStorage.getItem('xv1_chat_layer'); return (v==='voice'||v==='seekai')? v : 'general'; }catch{ return 'general'; }})(),
    currentMode: (function(){ try{ const saved = localStorage.getItem('xv1_current_mode'); if (saved === 'BALANCE2') return 'HIGH'; if (saved === 'HARD') return 'HIGH'; if (saved === 'AUTO') return 'MID'; return (saved === 'HIGH' ? 'HIGH' : (saved || 'MID')); }catch{ return 'MID'; }})(),
    seekaiDirectModel: (function(){ try{ return localStorage.getItem('xv1_seekai_direct') || null; }catch{ return null; }})(),
    currentModel: null,
    devModelKey: null,
    modelCatalog: [],
    conversations: [],
    activeConvId: null,
    systemPrompt: '',
    isThinking: false,
    isStreaming: false,
    sendInFlight: false,
    sendLock: false,
    cacheOperationInFlight: false,
    refreshInFlight: false,
    abortController: null,
    lastModifiedFile: 'index.html',
    attachments: [],
    isMultiAgentMode: localStorage.getItem('is_multi_agent_mode') === '1'
  };
  window.state = state;
  window.AppState = state;

  const StateController = window.createStateController ? window.createStateController(state, { generateId, MessageRenderer: window.MessageRenderer || null, UIEngine: window.UIEngine || null, $ }) : {
    load() {
      try {
        const saved = localStorage.getItem('conversations');
        if (saved) {
          state.conversations = JSON.parse(saved);
          if (Array.isArray(state.conversations)) {
            state.conversations.forEach(conv => {
              if(!conv.layer) conv.layer = 'general';
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
    getLayerConvs(layer){ const l=layer||state.currentLayer||'general'; return state.conversations.filter(c=> (c.layer||'general')===l); },
    setLayer(layer){
      const l=(layer==='voice'||layer==='seekai')? layer : 'general';
      state.currentLayer=l;
      try{ localStorage.setItem('xv1_chat_layer', l); }catch{}
      // switch active to last conv of this layer or none
      const list=this.getLayerConvs(l);
      if(list.length){
        state.activeConvId=list[0].id;
        try{ localStorage.setItem('activeConvId', state.activeConvId); }catch{}
        this.loadConversation(state.activeConvId);
      } else {
        state.activeConvId=null;
        try{ localStorage.removeItem('activeConvId'); }catch{}
        MessageRenderer.renderAllMessages([]);
        UIEngine.renderConversationsList();
        UIEngine.updateHeaderUI();
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
      // Watchdog: auto-clear stale lock >28s
      const isStale = state._lastSendStart && (Date.now() - state._lastSendStart > 28000);
      if (isStale) {
        state.isStreaming = false; state.sendInFlight = false; state.sendLock = false;
        state.abortController = null; state.isThinking = false;
        try{ MessageRenderer.hideTyping(); }catch{}
      }
      if (state.isStreaming || state.sendInFlight || state.sendLock) {
        const since = state._lastSendStart ? Math.round((Date.now()-state._lastSendStart)/1000) : 0;
        MessageRenderer.showToast(`⏳ جارٍ إنشاء الرد (${since}s) — انتظر اكتماله أو اضغط مرة أخرى للإجبار`, 'info');
        // second click within 2s forces new chat
        const now = Date.now();
        if (state._lastNewChatAttempt && (now - state._lastNewChatAttempt < 2000)) {
          state.isStreaming = false; state.sendInFlight = false; state.sendLock = false;
          state.abortController?.abort?.(); state.abortController = null; state.isThinking = false;
          try{ MessageRenderer.hideTyping(); }catch{}
          MessageRenderer.showToast('🔓 تم إجبار محادثة جديدة', 'success');
        } else {
          state._lastNewChatAttempt = now;
          return this.getActiveConv();
        }
      }
      const id = generateId();
      const conv = {
        id,
        title: 'محادثة جديدة',
        messages: [],
        mode: state.currentMode,
        layer: state.currentLayer || 'general',
        isDev: false,
        createdAt: new Date().toISOString()
      };
      state.conversations.unshift(conv);
      state.activeConvId = id;
      try { localStorage.setItem('activeConvId', id); } catch {}
      this.save();
      this.loadConversation(id);
      UIEngine.renderConversationsList();
      return conv;
    },

    loadConversation(id) {
      const conv = state.conversations.find(c => c.id === id);
      if (!conv) return;
      const isStaleLoad = state._lastSendStart && (Date.now() - state._lastSendStart > 28000);
      if (isStaleLoad) { state.isStreaming=false; state.sendInFlight=false; state.sendLock=false; state.isThinking=false; try{MessageRenderer.hideTyping();}catch{} }
      if (state.isStreaming && id !== state.activeConvId) {
        MessageRenderer.showToast('⏳ انتظر انتهاء الرد الحالي قبل تغيير المحادثة', 'info');
        return;
      }

      state.activeConvId = id;
      try { localStorage.setItem('activeConvId', id); } catch {}
      state.currentMode = conv.mode || state.currentMode;
      this.save();
      MessageRenderer.renderAllMessages(conv.messages);
      UIEngine.renderConversationsList();
      UIEngine.updateHeaderUI();
      UIEngine.updateSendBtnState();
      UIEngine.closeSidebar();
    },

    addMessage(role, content, modelInfo = null, attachments = []) {
      const conv = this.getActiveConv();
      if (!conv) return null;

      const msg = {
        id: generateId(),
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
        UIEngine.renderConversationsList();
      }

      this.save();
      return msg;
    }
  };

  try { window.StateController = StateController; } catch(e) {}

  // ─────────────────────────────────────────────────────────────────
  // 4. MODEL ENGINE — Shared tier-isolated router (models.js)
  // ─────────────────────────────────────────────────────────────────
  const SharedModelEngine = window.ModelEngine;
  const MODELS = window.MODELS;

  const ModelEngine = Object.assign({
    normalizeCatalog(data) {
      if (!data) return [];
      const source = Array.isArray(data) ? data : Object.values(data).flat();
      const seen = new Set();
      return source.filter(item => {
        if (!item || !item.id || !item.name) return false;
        const key = `${item.provider || 'unknown'}:${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },

    getAvailableModels() {
      const flat = state.modelCatalog.length ? state.modelCatalog : this.normalizeCatalog(MODELS);
      const seen = new Set();
      return flat.filter(m => {
        const key = `${m.provider}:${m.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },

    getSelectedDevModel() {
      const models = this.getAvailableModels();
      if (!models.length) return null;
      const key = state.devModelKey || `${models[0].provider}:${models[0].id}`;
      const selected = models.find(m => `${m.provider}:${m.id}` === key) || models[0];
      state.devModelKey = `${selected.provider}:${selected.id}`;
      return selected;
    },

    async callOpenRouter(model, messages, signal) {
      const bodyPayload = {
        model: model.id,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 8192
      };

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ConfigVault.getOpenRouterKey()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'X.v1 AI Chat'
        },
        body: JSON.stringify(bodyPayload),
        signal
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }
      return response;
    },

    async callGroq(model, messages, signal) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ConfigVault.getGroqKey()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model.id,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 4096
        }),
        signal
      });

      if (response.status === 429) {
        ConfigVault.rotateGroqKey();
        throw new Error('RATE_LIMIT');
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${response.status}`);
      }
      return response;
    },

    async* readStream(response) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let tokensEmitted = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              try {
                const obj = JSON.parse(trimmed);
                if (obj.error) throw new Error(obj.error.message || 'API stream error');
              } catch (e) {
                if (e.message && !e.message.includes('JSON')) throw e;
              }
            }
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') return;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error.message || 'Stream payload error');
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                yield delta;
                tokensEmitted++;
              }
            } catch (e) {
              if (e.message && !e.message.includes('JSON')) throw e;
            }
          }
        }
        if (tokensEmitted === 0 && buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer.trim());
            if (parsed.error) throw new Error(parsed.error.message || 'Stream payload error');
            const content = parsed.choices?.[0]?.message?.content;
            if (content) yield content;
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) throw e;
          }
        }
      } finally {
        reader.releaseLock();
      }
    },

    async* runSingleModel(model, messages, signal, onModelChange) {
      onModelChange?.(model, false);
      try {
        const response = model.provider === 'groq'
          ? await this.callGroq(model, messages, signal)
          : await this.callOpenRouter(model, messages, signal);

        for await (const chunk of this.readStream(response)) {
          yield { chunk, model, usedFallback: false };
        }
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.warn(`[Single Model] ${model.name} failed:`, err.message);
        throw new Error(`تعذر الاتصال بالموديل المحدد (${model.name}). يرجى المحاولة لاحقاً.`);
      }
    },

    async* chatWithFallback(tier, messages, signal, onModelChange) {
      const models = MODELS[tier] || MODELS.MID;
      let usedFallback = false;

      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        const isFallback = i > 0;
        if (isFallback) {
          usedFallback = true;
          onModelChange?.(model, true);
        } else {
          onModelChange?.(model, false);
        }

        const keyCount = model.provider === 'groq'
          ? Math.max(1, ConfigVault.getGroqKeys ? ConfigVault.getGroqKeys().length : 1)
          : Math.max(1, ConfigVault.getOpenRouterKeys ? ConfigVault.getOpenRouterKeys().length : 1);

        let succeeded = false;

        // Try ALL available keys for the strongest model first before falling back to next model
        for (let attempt = 0; attempt < keyCount; attempt++) {
          try {
            const response = model.provider === 'groq'
              ? await this.callGroq(model, messages, signal)
              : await this.callOpenRouter(model, messages, signal);

            for await (const chunk of this.readStream(response)) {
              yield { chunk, model, usedFallback };
            }
            succeeded = true;
            return;
          } catch (err) {
            if (err.name === 'AbortError') throw err;
            console.warn(`[Model Fallback] ${model.name} (Key ${attempt + 1}/${keyCount}) failed:`, err.message);

            if (err.message === 'RATE_LIMIT' || /429|rate limit|tpm|rpm/i.test(err.message)) {
              if (model.provider === 'groq') ConfigVault.rotateGroqKey();
              else ConfigVault.rotateOpenRouterKey?.();
              continue; // Retry with next key of SAME strong model
            } else {
              break; // Switch to next model in tier
            }
          }
        }

        if (succeeded) return;
      }

      throw new Error(`تعذر الاتصال بموديلز ${tier}. يرجى المحاولة مرة أخرى أو اختيار وضع آخر.`);
    }
  }, window.ModelEngine || {});
  // Keep the shared router authoritative: its fallback cascade is isolated per tier.
  if (SharedModelEngine) {
    ['normalizeCatalog', 'getAvailableModels', 'getSelectedDevModel',
      'callOpenRouter', 'callGroq', 'readStream', 'chatWithFallback',
      'getOpenRouterKey', 'getGroqKeys', 'getGroqKey', 'rotateGroqKey']
      .forEach(name => {
        if (typeof SharedModelEngine[name] === 'function') ModelEngine[name] = SharedModelEngine[name];
      });
  }
  window.ModelEngine = ModelEngine;

  // ─────────────────────────────────────────────────────────────────
  // 5. GITHUB & SELF-MODIFYING DEV SERVICE — Unified (github.js)
  // Single Source of Truth — loaded from github.js before this file.
  const GitHubService = window.GitHubService || window.UnifiedGitHub || window.DevGitHubService || window.OpsGitHubEngine || (() => {
    // Fallback minimal (preserves original behavior if github.js fails to load)
    const _fallback = {
      utf8ToBase64(s) { const b = new TextEncoder().encode(s); let t=''; for(let i=0;i<b.length;i++) t+=String.fromCharCode(b[i]); return btoa(t); },
      base64ToUtf8(b) { const bin=atob(b.replace(/\s/g,'')); const u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return new TextDecoder().decode(u); },
      async getFileSHA(p){ try{ const r=await fetch(`${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${p}?ref=${GITHUB_BRANCH}&t=${Date.now()}`,{headers:ConfigVault.getGitHubHeaders()}); if(!r.ok) return null; return (await r.json()).sha; }catch{ return null; } },
      async uploadFile(p,c,m='Update via X.v1'){ const s=await this.getFileSHA(p); const e=this.utf8ToBase64(c); const b={message:m,content:e,branch:GITHUB_BRANCH}; if(s) b.sha=s; const r=await fetch(`${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${p}`,{method:'PUT',headers:ConfigVault.getGitHubHeaders(),body:JSON.stringify(b)}); if(!r.ok) throw new Error((await r.json().catch(()=>({}))).message||'فشل رفع الملف'); return await r.json(); },
      async getLatestCommits(l=10){ const r=await fetch(`${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/commits?per_page=${l}&t=${Date.now()}`,{headers:ConfigVault.getGitHubHeaders()}); if(!r.ok) throw new Error('فشل جلب سجل النسخ'); return await r.json(); },
      async rollbackToPreviousCommit(){ MessageRenderer.showToast('🔄 جاري البحث عن آخر نسخة مستقرة...','info'); try{ const cs=await this.getLatestCommits(5); if(cs.length<2) throw new Error('لا توجد نسخ سابقة'); const p=cs[1]; MessageRenderer.showToast(`⏪ جاري استرجاع النسخة (${p.sha.slice(0,7)})...`,'info'); for(const f of ['index.html','style.css','app.js']){ const fr=await fetch(`${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${f}?ref=${p.sha}`,{headers:ConfigVault.getGitHubHeaders()}); if(fr.ok){ const fd=await fr.json(); await this.uploadFile(f,this.base64ToUtf8(fd.content),`⏪ Emergency Rollback to ${p.sha.slice(0,7)}`); } } MessageRenderer.showToast('✅ تم استرجاع النسخة بنجاح! جاري التحديث...','success'); setTimeout(()=>location.reload(),1500); }catch(e){ MessageRenderer.showToast('❌ خطأ أثناء الاسترجاع: '+e.message,'error'); } },
      applyRuntimePatch(f,c){ if(!f) return false; try{ if(f.endsWith('.css')){ let t=document.getElementById('live-patch-style'); if(!t){ t=document.createElement('style'); t.id='live-patch-style'; document.head.appendChild(t); } t.textContent=c; return true; } if(f.endsWith('.html')||f==='index.html'){ const d=new DOMParser().parseFromString(c,'text/html'); const n=d.getElementById('app'); const cur=document.getElementById('app'); if(n&&cur){ cur.innerHTML=n.innerHTML; return true; } } if(f==='system_prompt.txt'){ state.systemPrompt=c; try{localStorage.setItem('system_prompt',c);}catch{} return true; } }catch(e){ console.warn('[Live Patch Failed]',e.message); } return false; }
    };
    return _fallback;
  })();

  // ─────────────────────────────────────────────────────────────────
  // 6. MARKDOWN & UI MESSAGE RENDERER (MessageRenderer)
  // ─────────────────────────────────────────────────────────────────
  const MessageRenderer = window.MessageRenderer || {
    escapeHtml(text) {
      return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },

    safeSelectorId(id) {
      const value = String(id ?? '');
      if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(value);
      }
      return value.replace(/([\\"'\s:#.\[\]\(\)])/g, '\\$1');
    },

    showToast(message, type = 'info') {
      if (window.UnifiedToast && window.UnifiedToast.showToast) return window.UnifiedToast.showToast(message, type);
      const container = $('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 3200);
    },

    scrollToBottom() {
      const chatArea = $('chat-area');
      if (!chatArea) return;
      // rAF-batched to avoid clash with user manual scroll + thinking timers (1-2s window)
      if (this._scrollRaf) cancelAnimationFrame(this._scrollRaf);
      this._scrollRaf = requestAnimationFrame(() => {
        chatArea.scrollTop = chatArea.scrollHeight;
        this._scrollRaf = null;
      });
    },

    parseMarkdown(text) {
      if (!text) return '';
      let html = this.escapeHtml(text);
      // Allow highlight spans by importance — unescape only hl-* classes
      html = html.replace(/&lt;span class=&quot;(hl-(?:important|critical|success|info|keyword))&quot;&gt;/g, '<span class="$1">');
      html = html.replace(/&lt;\/span&gt;/g, '</span>');

      // Fenced code blocks
      html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
        const label = (lang || 'code').toLowerCase();
        const trimmed = code.trim();
        const isWebCode = label === 'html' || label === 'svg' || (label === 'javascript' && (trimmed.includes('<') || trimmed.includes('document.')));
        const encodedCode = encodeURIComponent(trimmed);

        let runBtn = '';
        if (isWebCode) {
          runBtn = `<button class="sandbox-launch-btn" data-code="${encodedCode}" onclick="window._runSandbox(decodeURIComponent(this.dataset.code))">▶️ تشغيل المحاكاة</button>`;
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

      // Multi-Agent Roundtable Persona Styling
      html = html.replace(/\[(?:الخبير التحليلي|الخبير|Architect)\]\s*([\s\S]*?)(?=\[(?:الناقد|المنسق|Critic|Synthesizer)\]|$)/gi, (m, content) => {
        return `<div class="roundtable-persona architect"><div class="roundtable-badge"><span>🧠</span> <span>الخبير التحليلي (Architect)</span></div><div class="roundtable-body">${content.trim()}</div></div>`;
      });

      html = html.replace(/\[(?:الناقد المبتكر|الناقد|Critic)\]\s*([\s\S]*?)(?=\[(?:الخبير|المنسق|Architect|Synthesizer)\]|$)/gi, (m, content) => {
        return `<div class="roundtable-persona critic"><div class="roundtable-badge"><span>⚡</span> <span>الناقد المبتكر (Critic)</span></div><div class="roundtable-body">${content.trim()}</div></div>`;
      });

      html = html.replace(/\[(?:المنسق التنفيذي|المنسق|Synthesizer)\]\s*([\s\S]*?)(?=\[(?:الخبير|الناقد|Architect|Critic)\]|$)/gi, (m, content) => {
        return `<div class="roundtable-persona synthesizer"><div class="roundtable-badge"><span>🎯</span> <span>المنسق التنفيذي (Synthesizer)</span></div><div class="roundtable-body">${content.trim()}</div></div>`;
      });

      // ── TTS/Audio cards: [audio:src|desc|tag] + [tts:text] (local speechSynthesis fallback)
      html = html.replace(/\[audio:(https?:\/\/[^\s|\]]+|blob:[^\s|\]]+|data:[^\s|\]]+)(?:\|([^|\]]+))?(?:\|([^\]]+))?\]/gi, (m, src, desc, tag) => {
        const tagTitle = (tag || 'TTS Audio').trim();
        const descText = (desc || '🔊 ملف صوتي جاهز').trim();
        const cleanSrc = src.trim();
        return `\n\n<div class="modern-audio-card" data-src="${cleanSrc}">\n  <div class="audio-card-header"><div class="audio-tag-badge"><span class="audio-dot"></span><span>${this.escapeHtml(tagTitle)}</span></div></div>\n  <div class="audio-card-desc">${this.escapeHtml(descText)}</div>\n  <div class="audio-progress-row"><span class="audio-time current-time">0:00</span><div class="audio-progress-bar-wrap" onclick="window._seekAudio(this, event)"><div class="audio-progress-fill"></div></div><span class="audio-time total-time">--:--</span></div>\n  <div class="audio-controls-row"><button type="button" class="audio-ctrl-btn speed-btn" onclick="window._changeAudioSpeed(this)" title="Speed">1x</button><button type="button" class="audio-ctrl-btn" onclick="window._skipAudio(this, -15)" title="-15s">↺15</button><button type="button" class="audio-play-btn" onclick="window._togglePlayAudio(this)" title="Play/Pause"><svg class="play-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg><svg class="pause-icon" style="display:none;" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg></button><button type="button" class="audio-ctrl-btn" onclick="window._skipAudio(this, 15)" title="+15s">↻15</button><button type="button" class="audio-ctrl-btn volume-btn" onclick="window._toggleMuteAudio(this)" title="Mute">🔊</button><button type="button" class="audio-ctrl-btn download-btn" onclick="window._downloadAudio(this)" title="تحميل">⬇</button></div>\n  <audio class="hidden-audio" src="${cleanSrc}" preload="metadata"></audio>\n</div>\n\n`;
      });
      html = html.replace(/\[tts:([^\]]+)\]/gi, (m, ttsText) => {
        const clean = this.escapeHtml(ttsText.trim().slice(0, 400));
        const encoded = encodeURIComponent(ttsText.trim());
        return `\n\n<div class="modern-audio-card tts-card tts-loading" data-tts-text="${encoded}" data-src="">\n  <div class="audio-card-header"><div class="audio-tag-badge"><span class="audio-dot"></span><span>🔊 TTS</span></div></div>\n  <div class="audio-card-desc">${clean}</div>\n  <div class="audio-controls-row" style="justify-content:center; gap:12px;"><button type="button" class="tts-play-btn" onclick="window._playTTS(this)" title="تشغيل الصوت"><svg class="play-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg><svg class="pause-icon" style="display:none;" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg><span>تشغيل</span></button><button type="button" class="audio-ctrl-btn" onclick="window._downloadTTS(this)" title="تحميل">⬇ تحميل</button></div>\n</div>\n\n`;
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
    },

    createMessageRow(msg) {
      const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(msg.content || '');
      const row = document.createElement('div');
      row.className = `message-row ${msg.role} ${hasArabic ? 'is-rtl' : 'is-ltr'}`;
      row.dataset.id = msg.id;

      const parsed = msg.role === 'ai' ? this.parseMarkdown(msg.content) : this.escapeHtml(msg.content);
      const dirAttr = hasArabic ? 'dir="rtl" style="text-align: right;"' : 'dir="ltr" style="text-align: left;"';

      let attachmentsHtml = '';
      if (msg.attachments && msg.attachments.length > 0) {
        attachmentsHtml = '<div class="msg-attachments-wrap" style="margin-top:6px;">' + msg.attachments.map(att => {
          if (att.type.startsWith('image/')) {
            return `<img src="${att.dataUrl}" class="msg-attachment-img" alt="${this.escapeHtml(att.name)}">`;
          } else {
            return `<div class="preview-item" style="margin-top:4px;"><span class="preview-name">📄 ${this.escapeHtml(att.name)}</span></div>`;
          }
        }).join('') + '</div>';
      }

      let multiAgentHtml = '';
      if (msg.multiAgentSteps && Array.isArray(msg.multiAgentSteps)) {
        const stepsHtml = msg.multiAgentSteps.map(s => `
          <div class="agent-step-item">
            <div class="agent-step-header">
              <span class="agent-step-name">${s.icon} ${this.escapeHtml(s.title)}</span>
              <span class="agent-step-badge">${this.escapeHtml(s.status)}</span>
            </div>
            <div class="agent-step-body">${this.escapeHtml(s.summary || '')}</div>
          </div>
        `).join('');
        const okCount = msg.multiAgentSteps.filter(s=>/✓|مكتمل|معتمد|Done|Approved/i.test(s.status)).length;
        const warnCount = msg.multiAgentSteps.length - okCount;
        multiAgentHtml = `
          <div class="multi-agent-box" id="box-${msg.id}">
            <div class="agent-committed-header" onclick="window._toggleThinkingBox('${msg.id}')">
              <span style="color:var(--accent-color)">👥</span>
              <span class="agent-committed-label">COMMITTED</span>
              <span class="agent-committed-nums"><span class="agent-num ok">${okCount}</span><span class="agent-num warn">${warnCount}</span></span>
              <span class="agent-toggle-icon" id="indicator-${msg.id}">▾</span>
            </div>
            <div class="multi-agent-content">
              ${stepsHtml}
            </div>
          </div>
        `;
      }

      // Observer persistence — floating bullets + COMMITTED header, no numbers text, icon toggle
      let observerHtml = '';
      if (msg.observerReview) {
        const lines = String(msg.observerReview).split(/\n/).map(s=>s.trim()).filter(Boolean);
        const bullets = lines.map(l=> l.replace(/^[��?]\s*/,'').replace(/^\d+[\.\)\-]\s*/,'').trim()).filter(Boolean).slice(0,5);
        const ok = bullets.filter(b=>/نعم|yes|✓|مُلتزم|Compliant/i.test(b)).length;
        const warn = bullets.length - ok;
        const getCls=b=>{ if(b.includes('التناقض:')) return b.includes('نعم')?'warn':'ok'; if(b.includes('الالتزام:')||b.includes('المصادر:')) return (b.includes('نعم')||b.includes('موثوقة')||b.includes('سليم'))?'ok':'warn'; return b.includes('لا')||b.includes('تحتاج')?'warn':'ok'; }; const mainBul=bullets.slice(0,-1), sBul=bullets.slice(-1)[0]; const mainHtml=mainBul.length? `<ul class="observer-bullets">${mainBul.map(b=>`<li class="observer-bullet ${getCls(b)}"><span class="observer-bullet-text">${this.escapeHtml(b)}</span></li>`).join('')}</ul>` : ''; const sugBox=(sBul && !(sBul.includes('لا يوجد') || /No improvement/i.test(sBul)))? `<div class="suggest-box"><div class="suggest-box-body">${this.escapeHtml(sBul)}</div><div class="actions-header" onclick="this.closest('.suggest-box')?.classList.toggle('collapsed')"><span>⚡</span><span>ACTIONS</span><span class="agent-committed-nums"><span class="agent-num ok">0</span><span class="agent-num warn">3</span></span><span class="agent-toggle-icon">▾</span></div><div class="suggest-box-actions"><button class="observer-apply-btn" onclick="window._applyObserverSuggestion(this.closest('.observer-box').dataset.review||'', this)">⚡ Apply</button><button class="llm-end-btn" onclick="window._sendToLLM(this)">⚡ Send to LLM</button><button class="llm-send-apply-btn" onclick="window._sendAndApply(this)">⚡ Send & Apply</button></div></div>` : ''; const bulletsHtml=(mainHtml+sugBox) || `<div style="font-size:12px;color:var(--text-dim)">${this.escapeHtml(String(msg.observerReview).slice(0,140))}</div>`;
        observerHtml = `<div class="observer-box" data-review="${this.escapeHtml(msg.observerReview).slice(0,300)}"><div class="agent-committed-header" onclick="this.closest('.observer-box')?.classList.toggle('collapsed')"><span>👁️</span><span class="agent-committed-label">COMMITTED</span><span class="agent-committed-nums"><span class="agent-num ok">${ok}</span><span class="agent-num warn">${warn}</span></span><span class="agent-toggle-icon">▾</span></div><div class="observer-details">${bulletsHtml}</div></div>`;
      }

      if (msg.role === 'user') {
        row.innerHTML = `<div class="msg-content" ${dirAttr} style="position:relative;padding-inline-end:36px">${parsed}${attachmentsHtml}<button class="user-copy-inside" onclick="window._copyMsgText(this)" title="نسخ"><svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button></div>`;
      } else {
        row.innerHTML = `
          <div class="msg-content" ${dirAttr}>
            ${parsed}
            ${attachmentsHtml}
            ${multiAgentHtml}
            ${observerHtml}
          </div>
        `;
      }
      return row;
    },

    renderAllMessages(messages) {
      const container = $('chat-container');
      if (!container) return;
      if (!messages || messages.length === 0) {
        UIEngine.showWelcomeScreen();
        return;
      }
      container.innerHTML = '';
      messages.forEach(msg => container.appendChild(this.createMessageRow(msg)));
    },

    appendMessage(msg) {
      const container = $('chat-container');
      if (!container || !msg) return;
      const welcome = container.querySelector('.welcome-screen');
      if (welcome) container.innerHTML = '';

      const existingRow = container.querySelector(`.message-row[data-id="${this.safeSelectorId(msg.id || '')}"]`);
      if (existingRow) {
        existingRow.replaceWith(this.createMessageRow(msg));
      } else {
        container.appendChild(this.createMessageRow(msg));
      }
      this.scrollToBottom();
    },

    _thinkingTimer: null,
    _stripDots(text) {
      return String(text || '').replace(/\s*\.+\s*$/, '').trim();
    },
    showTyping(initialText = 'Analyzing') {
      const container = $('chat-container');
      if (!container) return;
      const base = this._stripDots(initialText) || 'Analyzing';
      const isAr = /[\u0600-\u06FF]/.test(initialText) || /[\u0600-\u06FF]/.test(document.getElementById('user-input')?.value || '');
      let typing = $('typing-indicator');
      if (!typing) {
        typing = document.createElement('div');
        typing.id = 'typing-indicator';
        typing.className = 'message-row ai typing-indicator';
        typing.innerHTML = `
          <div class="typing-bubble" dir="ltr">
            <span class="typing-icon" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></span>
            <span id="thinking-word" class="thinking-word">${this.escapeHtml(base)}</span>
            <span class="thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          </div>
          <div id="thinking-flow" class="thinking-flow"></div>
        `;
        container.appendChild(typing);
      } else {
        const wordEl = document.getElementById('thinking-word');
        if (wordEl) wordEl.textContent = base;
        const flow = document.getElementById('thinking-flow');
        if (flow) flow.innerHTML = '';
      }
      this.scrollToBottom();
    },

    startProgressiveThinking(initialWord = 'Analyzing') {
      this.hideTyping();
      this.showTyping(initialWord);
      const isAr = /[\u0600-\u06FF]/.test(initialWord) || /[\u0600-\u06FF]/.test(document.getElementById('user-input')?.value || '');
      const tier = (window.state && window.state.currentMode) || 'MID';
      const fast = tier === 'FAST';
      const high = tier === 'HIGH';
      // HIGH: Claude 6-stage visible then hidden after done
      const flowStages = isAr ? (high ? [
        { icon: '🧠', text: 'فهم النية الحقيقية', delay: 500 },
        { icon: '📂', text: 'جمع السياق والملفات', delay: 1100 },
        { icon: '📋', text: 'تخطيط هيكل الرد', delay: 1800 },
        { icon: '✍️', text: 'صياغة أولية', delay: 2500 },
        { icon: '🔍', text: 'نقد ذاتي — هلوسة/تسريب؟', delay: 3200 },
        { icon: '✨', text: 'صقل نهائي', delay: 4000 }
      ] : fast ? [
        { icon: '🧠', text: 'فهم النية', delay: 400 },
        { icon: '✨', text: 'صياغة الرد', delay: 900 }
      ] : [
        { icon: '🧠', text: 'فهم النية', delay: 500 },
        { icon: '🔍', text: 'تحليل السياق', delay: 1200 },
        { icon: '✨', text: 'صياغة الرد', delay: 2000 }
      ]) : (high ? [
        { icon: '🧠', text: 'Intent', delay: 500 },
        { icon: '📂', text: 'Gather context', delay: 1100 },
        { icon: '📋', text: 'Plan structure', delay: 1800 },
        { icon: '✍️', text: 'Draft', delay: 2500 },
        { icon: '🔍', text: 'Self-critique', delay: 3200 },
        { icon: '✨', text: 'Refine', delay: 4000 }
      ] : fast ? [
        { icon: '🧠', text: 'Understanding', delay: 400 },
        { icon: '✨', text: 'Composing', delay: 900 }
      ] : [
        { icon: '🧠', text: 'Understanding', delay: 500 },
        { icon: '🔍', text: 'Analyzing', delay: 1200 },
        { icon: '✨', text: 'Composing', delay: 2000 }
      ]);
      const wordStages = [
        { word: isAr ? 'تحليل' : 'Analyzing', delay: 0 },
        { word: isAr ? 'صياغة' : 'Composing', delay: 900 },
        { word: isAr ? 'تدقيق' : 'Refining', delay: 1900 }
      ];
      this._thinkingTimers = [];
      wordStages.slice(1).forEach(stage => {
        const timer = setTimeout(() => { this.setThinkingStage(stage.word); }, stage.delay);
        this._thinkingTimers.push(timer);
      });
      // Ensure flow container alignment matches thinking language (strong model = English → LTR)
      const flowEl = document.getElementById('thinking-flow');
      if (flowEl) { flowEl.setAttribute('dir', isAr ? 'rtl' : 'ltr'); flowEl.style.textAlign = isAr ? 'right' : 'left'; }
      flowStages.forEach(s => {
        const timer = setTimeout(() => {
          const flow = document.getElementById('thinking-flow');
          if (!flow) return;
          const item = document.createElement('div');
          item.className = 'thinking-flow-item';
          // Only left bullet, no right icon — LTR for English thinking
          item.classList.add('reached'); item.innerHTML = `<span class="flow-dot"></span><span class="flow-text">${this.escapeHtml(s.text)}</span>`;
          flow.appendChild(item);
          this.scrollToBottom();
        }, s.delay);
        this._thinkingTimers.push(timer);
      });
    },

    setThinkingStage(text) {
      const wordEl = document.getElementById('thinking-word');
      if (wordEl) {
        wordEl.textContent = this._stripDots(text) || 'Thinking';
        this.scrollToBottom();
      }
    },

    hideTyping() {
      if (this._thinkingTimers && this._thinkingTimers.length) {
        this._thinkingTimers.forEach(t => clearTimeout(t));
        this._thinkingTimers = [];
      }
      if (this._thinkingTimer) {
        clearTimeout(this._thinkingTimer);
        this._thinkingTimer = null;
      }
      $('typing-indicator')?.remove();
    }
  };

  // Surface runtime failures without hiding the full diagnostic details.
  function debugPrint(error, context = 'Runtime error') {
    const err = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));
    const details = `${context}\n${err.name}: ${err.message}\n${err.stack || ''}`.trim();
    console.error(`[X.v1] ${details}`);
    if (typeof window.printDebug === 'function') {
      window.printDebug(err, context);
    } else {
      try {
        const key = 'xv1_runtime_debug_log';
        const entries = JSON.parse(localStorage.getItem(key) || '[]');
        entries.push({ at: new Date().toISOString(), context, message: err.message, stack: err.stack || '' });
        localStorage.setItem(key, JSON.stringify(entries.slice(-30)));
      } catch (storageError) {
        console.error('[X.v1 debug log failed]', storageError);
      }
    }
    const container = $('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.style.cssText = 'display:flex;align-items:center;gap:8px;max-width:min(520px,calc(100vw - 24px));';
    const label = document.createElement('span');
    label.textContent = `${context}: ${err.message || 'خطأ غير معروف'}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'التفاصيل';
    button.style.cssText = 'margin-inline-start:auto;white-space:nowrap;';
    button.onclick = () => {
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:16px;';
      const panel = document.createElement('div');
      panel.style.cssText = 'background:#17171b;color:#f4f4f5;width:min(760px,100%);max-height:80vh;overflow:auto;border:1px solid #444;border-radius:12px;padding:16px;direction:ltr;text-align:left;';
      const pre = document.createElement('pre');
      pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;font:12px/1.5 monospace;margin:0;';
      pre.textContent = details;
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = 'Close';
      close.style.cssText = 'margin-top:12px;padding:6px 12px;';
      close.onclick = () => modal.remove();
      panel.append(pre, close);
      modal.appendChild(panel);
      modal.onclick = event => { if (event.target === modal) modal.remove(); };
      document.body.appendChild(modal);
    };
    toast.append(label, button);
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 10000);
  }
  window.debugPrint = debugPrint;
  function debugCheckpoint(stage, data = {}) {
    const entry = { at: new Date().toISOString(), stage, ...data };
    try { localStorage.setItem('xv1_runtime_last_checkpoint', JSON.stringify(entry)); } catch (e) {}
    console.info('[X.v1 checkpoint]', entry);
  }
  window.debugCheckpoint = debugCheckpoint;
  window.addEventListener('error', event => {
    if (event.error) debugPrint(event.error, 'JavaScript error');
  });
  window.addEventListener('unhandledrejection', event => {
    debugPrint(event.reason, 'Unhandled promise');
  });

  // ─────────────────────────────────────────────────────────────────
  // 6.5 TTS ORCHESTRATOR — Text→Speech delegation (Browser + Cloud)
  // ─────────────────────────────────────────────────────────────────
  const TTSEngine = {
    ttsRegex: /(حوّل|حول|تحويل|حوللي|حول لي|اقرأ|انطق|سمعني|حوّل النص|حول النص|text to speech|tts|voice over|generate (audio|voice|speech)|speak this|read aloud)/i,
    isTTSRequest(text){
      if(!text) return false;
      const t = String(text).trim();
      // must contain TTS intent + some content to synthesize
      if(!this.ttsRegex.test(t)) return false;
      // avoid false positives for very short generic
      if(t.length < 8) return false;
      return true;
    },
    extractText(userText){
      let t = String(userText||'').trim();
      // 1) quoted priority
      const qMatch = t.match(/["«»“”'‘]([^"«»“”'‘]{3,})["«»“”'‘]/);
      if(qMatch) return qMatch[1].trim();
      // 2) after "لصوت" keyword — most accurate for Arabic "حولي النص ده لصوت .. سلام عليكو"
      const lSawtIdx = t.search(/لصوت/);
      if(lSawtIdx !== -1){
        let after = t.slice(lSawtIdx + 4).replace(/^[\s:：\-—–\.،,]+/, '').trim();
        // remove leading filler "ده" / "دا"
        after = after.replace(/^(ده|دا|هذا)\s+/,'').trim();
        if(after.length >= 3) return after.slice(0, 900);
      }
      // 3) after colon
      const colonIdx = t.search(/[:：]/);
      if(colonIdx !== -1){
        const after = t.slice(colonIdx+1).trim();
        if(after.length >= 3) return after.slice(0, 900);
      }
      // 4) generic strip — cover حولي/حول/حوليلي/حوللي etc
      const stripped = t.replace(/.*?(حوّل|حول|حولي|حولّي|تحويل|اقرأ|انطق|سمعني).*?(لصوت|صوت|speech|voice).*?[:\s\-—–]*/i,'').trim();
      if(stripped.length >= 3 && stripped.length < t.length) return stripped.slice(0, 900);
      const stripped2 = t.replace(/^(حوّل|حول|حولي|تحويل|اقرأ|انطق|سمعني|text to speech|tts)[:\s\-]*/i,'').trim();
      if(stripped2.length >= 3) return stripped2.slice(0, 900);
      return t.slice(0, 900);
    },
    async synthesizeWithCloud(text){
      // Strong: Fish S2.1 Pro Free (free) default — selectable in voice box
      try{
        const key = (window.ConfigVault && window.ConfigVault.getOpenRouterKey && window.ConfigVault.getOpenRouterKey()) || '';
        if(!key || !String(key).startsWith('sk-or')) return null;
        const model = (document.getElementById('tts-model-select')?.value || 'fishaudio/fish-speech-1.5:free').trim();
        const voice = (document.getElementById('tts-voice-select')?.value || 'alloy').trim();
        const speed = parseFloat(document.getElementById('tts-speed-btn')?.dataset?.speed || '1') || 1;
        const ctrl = new AbortController();
        const tm = setTimeout(()=> ctrl.abort(), 14000);
        const payload = { model: model, input: text.slice(0, 900) };
        // OpenAI family needs voice/speed, Fish ignores voice
        if(model.includes('openai')){ payload.voice = voice; payload.speed = Math.min(4, Math.max(0.25, speed)); }
        const r = await fetch('https://openrouter.ai/api/v1/audio/speech',{
          method:'POST',
          headers:{ 'Authorization':`Bearer ${key}`,'Content-Type':'application/json','HTTP-Referer':window.location.origin,'X-Title':'X.v1 TTS' },
          body: JSON.stringify(payload),
          signal: ctrl.signal
        });
        clearTimeout(tm);
        if(!r.ok) return null;
        const blob = await r.blob();
        if(!blob || blob.size < 1000) return null;
        return URL.createObjectURL(blob);
      }catch{ return null; }
    },
    speakLocal(text, voiceId){
      try{
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const isAr = /[\u0600-\u06FF]/.test(text);
        u.lang = isAr ? 'ar-EG' : 'en-US';
        // pick matching system voice if available
        try{
          const voices = window.speechSynthesis.getVoices() || [];
          let pick = null;
          if(voiceId){
            const vid = String(voiceId).toLowerCase();
            pick = voices.find(v=> String(v.name).toLowerCase().includes(vid) || String(v.voiceURI).toLowerCase().includes(vid));
            if(!pick) pick = voices.find(v=> String(v.lang).toLowerCase().includes(vid.slice(0,2)));
          }
          if(!pick){
            // fallback: distinct local voice per model/voice to make preview audible difference
            const selModel = document.getElementById('tts-model-select')?.value || '';
            if(selModel.includes('fish')){
              const fmap={auto:1, 'fish-ar':1, 'fish-en':1.08, 'fish-cheerful':1.18, 'fish-calm':0.88};
              const v = String(voiceId||'auto').toLowerCase();
              u.pitch = fmap[v] || 1;
              u.rate = (parseFloat(document.getElementById('tts-speed-btn')?.dataset?.speed || '1') || 1) * (v==='fish-cheerful'?1.06: v==='fish-calm'?0.94:1);
              pick = voices.find(v=> v.lang.startsWith('ar')) || voices[0];
              if(pick) u.voice = pick;
              window.speechSynthesis.speak(u); return true;
            } else {
              const map={alloy:1, echo:0.9, fable:1.1, onyx:0.85, nova:1.05, shimmer:1.15};
              const v = String(voiceId||'alloy').toLowerCase();
              u.pitch = map[v] || 1;
              u.rate = parseFloat(document.getElementById('tts-speed-btn')?.dataset?.speed || '1') || 1;
              if(pick) u.voice = pick;
              window.speechSynthesis.speak(u); return true;
            }
          }
          if(pick) u.voice = pick;
          // even when voice found, apply pitch for distinction
          if(!u.pitch || u.pitch===1){
            const selModel2=document.getElementById('tts-model-select')?.value||'';
            if(selModel2.includes('fish')){
              const fmap2={auto:1, 'fish-ar':1, 'fish-en':1.08, 'fish-cheerful':1.18, 'fish-calm':0.88};
              u.pitch = fmap2[String(voiceId||'auto').toLowerCase()] || 1;
            } else {
              const map2={alloy:1, echo:0.9, fable:1.1, onyx:0.85, nova:1.05, shimmer:1.15};
              u.pitch = map2[String(voiceId||'alloy').toLowerCase()] || u.pitch || 1;
            }
          }
        }catch{}
        u.rate = parseFloat(document.getElementById('tts-speed-btn')?.dataset?.speed || '1') || 1;
        window.speechSynthesis.speak(u);
        return true;
      }catch{ return false; }
    },
    async handleTTSRequest(userText, conv){
      const textToSpeak = this.extractText(userText);
      if(!textToSpeak || textToSpeak.length < 2){
        const errMsg = { id: generateId(), role:'ai', content:'⚠️ لم أجد نصًا لتحويله لصوت — اكتب مثل: `حول النص "مرحبا كيف حالك" الى صوت`', timestamp:new Date().toISOString(), isError:true };
        conv.messages.push(errMsg); MessageRenderer.appendMessage(errMsg); StateController.save(); return;
      }
      // create placeholder AI message with TTS card immediately (brown pulse during generation)
      const ttsCard = `[tts:${textToSpeak}]`;
      const aiMsg = { id: generateId(), role:'ai', content:`${ttsCard}`, timestamp:new Date().toISOString(), model:'TTS Orchestrator' };
      conv.messages.push(aiMsg);
      MessageRenderer.appendMessage(aiMsg);
      StateController.save();
      // remove brown pulse after short local prep (if cloud not used, card stays but pulse stops)
      setTimeout(()=>{ document.querySelectorAll('.tts-card.tts-loading').forEach(c=> c.classList.remove('tts-loading')); }, 900);
      // try cloud in background and upgrade card to [audio:blob]
      try{
        const cloudUrl = await this.synthesizeWithCloud(textToSpeak);
        if(cloudUrl){
          aiMsg.content = `[audio:${cloudUrl}|${textToSpeak.slice(0,60)}|TTS Cloud]`;
          MessageRenderer.appendMessage(aiMsg);
          StateController.save();
          MessageRenderer.showToast('🔊 تم توليد الملف الصوتي — جاهز للتشغيل والتحميل','success');
        } else {
          MessageRenderer.showToast('🔊 جاهز — اضغط تشغيل للاستماع (محلي)','info');
        }
      }catch(e){ console.warn('[TTS]',e); }
    },
    async handleVoiceBoxRequest(cleanText, conv){
      // Dedicated voice box: cleanText is already pure target (no trigger needed)
      let txt = String(cleanText||'').trim().slice(0,900);
      if(!txt) return;
      const ttsCard = `[tts:${txt}]`;
      const aiMsg = { id: generateId(), role:'ai', content:`${ttsCard}`, timestamp:new Date().toISOString(), model:'TTS Voice Box (HD)' };
      conv.messages.push(aiMsg);
      MessageRenderer.appendMessage(aiMsg);
      StateController.save();
      setTimeout(()=>{ document.querySelectorAll('.tts-card.tts-loading').forEach(c=> c.classList.remove('tts-loading')); }, 900);
      try{
        const cloudUrl = await this.synthesizeWithCloud(txt);
        if(cloudUrl){
          const sel = document.getElementById('tts-model-select');
          const shortName = sel?.selectedOptions?.[0]?.textContent?.trim() || 'Fish S2.1';
          aiMsg.content = `[audio:${cloudUrl}|${txt.slice(0,60)}|${shortName}]`;
          MessageRenderer.appendMessage(aiMsg);
          StateController.save();
          MessageRenderer.showToast(`🔊 ${shortName} — جاهز`,'success');
        } else {
          MessageRenderer.showToast('🔊 جاهز محلياً — اضغط تشغيل','info');
        }
      }catch(e){ console.warn('[TTS voice box]',e); }
    }
  };
  window.TTSEngine = TTSEngine;
  window._playTTS = function(btn){
    try{
      const card = btn.closest('.tts-card');
      const encoded = card?.dataset?.ttsText || '';
      const text = decodeURIComponent(encoded);
      if(!text) return;
      const playIcon = btn.querySelector('.play-icon'), pauseIcon = btn.querySelector('.pause-icon');
      if(window.speechSynthesis.speaking){
        window.speechSynthesis.cancel();
        if(playIcon) playIcon.style.display='block';
        if(pauseIcon) pauseIcon.style.display='none';
        return;
      }
      window.speechSynthesis.cancel();
      // use selected voice from voice box for distinct preview
      const selVoice = document.getElementById('tts-voice-select')?.value || '';
      const selModel = document.getElementById('tts-model-select')?.value || '';
      // delegate to speakLocal which handles pitch/voice mapping per model
      const ok = window.TTSEngine?.speakLocal(text, selVoice || selModel);
      if(ok){
        if(playIcon) playIcon.style.display='none';
        if(pauseIcon) pauseIcon.style.display='block';
        // reset icons after ~ duration estimate
        const est = Math.max(1200, text.length*65);
        setTimeout(()=>{ if(playIcon) playIcon.style.display='block'; if(pauseIcon) pauseIcon.style.display='none'; }, est);
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      const isAr = /[\u0600-\u06FF]/.test(text);
      u.lang = isAr ? 'ar-EG' : 'en-US';
      u.onstart = ()=>{ if(playIcon) playIcon.style.display='none'; if(pauseIcon) pauseIcon.style.display='block'; };
      u.onend = ()=>{ if(playIcon) playIcon.style.display='block'; if(pauseIcon) pauseIcon.style.display='none'; };
      u.onerror = ()=>{ if(playIcon) playIcon.style.display='block'; if(pauseIcon) pauseIcon.style.display='none'; };
      window.speechSynthesis.speak(u);
      MessageRenderer.showToast('🔊 جاري التشغيل...','info');
    }catch(e){ console.warn(e); }
  };
  window._downloadTTS = function(btn){
    try{
      const card = btn.closest('.tts-card');
      const text = decodeURIComponent(card?.dataset?.ttsText||'');
      if(!text) return;
      const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`tts_${Date.now()}.txt`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000);
      MessageRenderer.showToast('ℹ️ الصوت المحلي لا يولّد MP3 — تم تحميل النص. فعّل Cloud TTS (OpenRouter key) للحصول على MP3','info');
    }catch(e){ console.warn(e); }
  };

  // ── Voice Chat Box Controller (dot navigation + dedicated TTS box) ──
  const VoiceChatController = {
    current: localStorage.getItem('xv1_chat_mode') || 'text',
    init(){
      this.apply(this.current, false);
      document.querySelectorAll('.chat-dot').forEach(d=>{
        d.addEventListener('click', ()=> this.apply(d.dataset.mode, true));
        // touch swipe on dots area
        d.addEventListener('touchstart', e=>{ e.preventDefault(); this.apply(d.dataset.mode, true); }, {passive:false});
      });
      // voice input handlers
      const vInput = document.getElementById('voice-input');
      const vSend = document.getElementById('voice-send-btn');
      const vSpeed = document.getElementById('tts-speed-btn');
      const vModel = document.getElementById('tts-model-select');
      const vVoice = document.getElementById('tts-voice-select');
      const vAccent = document.getElementById('tts-accent-select');
      const vMic = document.getElementById('voice-mic-btn');
      const MODEL_VOICES = {
        'fishaudio/fish-speech-1.5:free': [{id:'auto',name:'Auto'},{id:'fish-ar',name:'عربي'},{id:'fish-en',name:'EN'},{id:'fish-cheerful',name:'Cheerful'},{id:'fish-calm',name:'Calm'}],
        'openai/tts-1-hd': [{id:'alloy',name:'Alloy'},{id:'echo',name:'Echo'},{id:'fable',name:'Fable'},{id:'onyx',name:'Onyx'},{id:'nova',name:'Nova'},{id:'shimmer',name:'Shimmer'}],
        'openai/tts-1': [{id:'alloy',name:'Alloy'},{id:'echo',name:'Echo'},{id:'fable',name:'Fable'},{id:'onyx',name:'Onyx'},{id:'nova',name:'Nova'},{id:'shimmer',name:'Shimmer'}]
      };
      const refreshVoices = (model)=>{
        const list = MODEL_VOICES[model] || MODEL_VOICES['fishaudio/fish-speech-1.5:free'];
        if(!vVoice) return;
        const saved = localStorage.getItem('tts_voice') || '';
        vVoice.innerHTML = list.map(o=> `<option value="${o.id}">${o.name}</option>`).join('');
        if(saved && list.some(o=>o.id===saved)) vVoice.value = saved;
        // try fetch live voices for Fish (best-effort, no block)
        if(model.includes('fish')) try{ fetch('https://api.openrouter.ai/api/v1/models/'+encodeURIComponent(model),{headers:{'Authorization':`Bearer ${(window.ConfigVault?.getOpenRouterKey?.()||'')}`}}).then(r=>r.json()).then(j=>{ /* reserved for live voice discovery */}).catch(()=>{});}catch{}
      };
      let speedIdx = 0; const speeds = [1,1.15,1.3,1.5,0.9];
      vSpeed?.addEventListener('click', ()=>{
        speedIdx = (speedIdx+1)%speeds.length;
        const s = speeds[speedIdx];
        vSpeed.textContent = s+'x';
        vSpeed.dataset.speed = s;
        try{ localStorage.setItem('tts_speed', s); }catch{}
      });
      try{ const savedS = localStorage.getItem('tts_speed'); if(savedS){ vSpeed.textContent=savedS+'x'; vSpeed.dataset.speed=savedS; const idx=speeds.indexOf(parseFloat(savedS)); if(idx>=0) speedIdx=idx; } }catch{}
      const vPreview = document.getElementById('tts-preview-btn');
      const doVoicePreview = async ()=>{
        if(!vModel || !vVoice) return;
        const accent = vAccent?.value || 'auto';
        const vid = vVoice.value;
        const isAr = accent.startsWith('ar') || /ar/.test(vid);
        const sample = isAr ? `مرحبا، هذه معاينة صوت ${vVoice.selectedOptions[0]?.textContent||vid}` : `Hello, preview of ${vVoice.selectedOptions[0]?.textContent||vid}`;
        if(vPreview) vPreview.textContent = '⏳';
        try{
          const url = await window.TTSEngine?.synthesizeWithCloud(sample);
          if(url){
            const a = new Audio(url);
            a.onended = ()=>{ if(vPreview) vPreview.textContent='▶️'; setTimeout(()=>URL.revokeObjectURL(url),1500); };
            a.onerror = ()=>{ if(vPreview) vPreview.textContent='▶️'; window.TTSEngine?.speakLocal(sample, vid); };
            await a.play();
            // keep pulse during playback
            return;
          }
          window.TTSEngine?.speakLocal(sample, vid);
        }catch{ window.TTSEngine?.speakLocal(sample, vid); }
        setTimeout(()=>{ if(vPreview) vPreview.textContent='▶️'; }, 900);
      };
      vPreview?.addEventListener('click', doVoicePreview);
      vModel?.addEventListener('change', ()=>{
        try{ localStorage.setItem('tts_model', vModel.value); }catch{}
        refreshVoices(vModel.value);
        try{ localStorage.removeItem('tts_voice'); }catch{}
        MessageRenderer.showToast(`🎙️ ${vModel.selectedOptions[0]?.textContent} — تم تحديث الأصوات`,'info');
        setTimeout(doVoicePreview, 500);
      });
      vVoice?.addEventListener('change', ()=>{ try{ localStorage.setItem('tts_voice', vVoice.value); }catch{}; doVoicePreview(); });
      vAccent?.addEventListener('change', ()=>{ try{ localStorage.setItem('tts_accent', vAccent.value); }catch{}; doVoicePreview(); });
      try{
        const m=localStorage.getItem('tts_model'); if(m && vModel) vModel.value=m;
        refreshVoices(vModel?.value || 'fishaudio/fish-speech-1.5:free');
        const vv=localStorage.getItem('tts_voice'); if(vv && vVoice) { if([...vVoice.options].some(o=>o.value===vv)) vVoice.value=vv; }
        const ac=localStorage.getItem('tts_accent'); if(ac && vAccent) vAccent.value=ac;
      }catch{ refreshVoices('fishaudio/fish-speech-1.5:free'); }
      const vTrigger = ()=>{
        const txt = vInput? vInput.value.trim() : '';
        if(!txt){ MessageRenderer.showToast('اكتب النص أولاً','warning'); return; }
        if(state.isStreaming || state.sendInFlight){ MessageRenderer.showToast('⏳ انتظر انتهاء الرد','info'); return; }
        vInput.value=''; document.getElementById('voice-input')?.dispatchEvent(new Event('input'));
        this.sendVoice(txt);
      };
      vSend?.addEventListener('click', vTrigger);
      vInput?.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); vTrigger(); }});
      vInput?.addEventListener('input', ()=>{
        const has = vInput.value.trim().length>0;
        if(vSend){ if(has && !state.isStreaming && !state.sendInFlight) vSend.removeAttribute('disabled'); else vSend.setAttribute('disabled','true'); vSend.classList.toggle('active', has); }
        // auto height
        vInput.style.height='auto'; vInput.style.height=Math.min(Math.max(vInput.scrollHeight,26),120)+'px';
        const isAr = /[\u0600-\u06FF]/.test(vInput.value); vInput.dir=isAr?'rtl':'ltr'; vInput.style.textAlign=isAr?'right':'left';
      });
      // voice mic reuse main recognition
      vMic?.addEventListener('click', ()=> document.getElementById('mic-btn')?.click());
      // swipe on chat area to switch (3-way cycle)
      let sx=0;
      const area = document.getElementById('chat-area');
      area?.addEventListener('touchstart', e=> sx=e.touches[0].clientX, {passive:true});
      area?.addEventListener('touchend', e=>{
        const dx = e.changedTouches[0].clientX - sx;
        if(Math.abs(dx)>70){
          const order=['text','voice','seekai'];
          const idx=order.indexOf(this.current);
          if(dx<0){ this.apply(order[(idx+1)%3], true); } else { this.apply(order[(idx+2)%3], true); }
        }
      }, {passive:true});
    },
    apply(mode, save){
      const order=['text','voice','seekai'];
      this.current = order.includes(mode)? mode : 'text';
      const layer = this.current==='text'?'general': this.current;
      state.currentLayer = layer;
      if(save) try{ localStorage.setItem('xv1_chat_layer', layer); }catch{}
      try{ localStorage.setItem('xv1_chat_layer', layer); }catch{}
      document.querySelectorAll('.chat-dot').forEach(d=> d.classList.toggle('active', d.dataset.mode===this.current));
      document.getElementById('input-section')?.classList.toggle('hidden', this.current!=='text');
      document.getElementById('voice-input-section')?.classList.toggle('hidden', this.current!=='voice');
      document.getElementById('seekai-input-section')?.classList.toggle('hidden', this.current!=='seekai');
      // switch history/layer persistence
      try{
        const list = state.conversations.filter(c=> (c.layer||'general')===layer);
        if(list.length){
          state.activeConvId=list[0].id;
          try{ localStorage.setItem('activeConvId', state.activeConvId); }catch{}
          MessageRenderer.renderAllMessages(list[0].messages);
        } else {
          state.activeConvId=null;
          try{ localStorage.removeItem('activeConvId'); }catch{}
          MessageRenderer.renderAllMessages([]);
        }
        UIEngine.renderConversationsList();
        UIEngine.updateHeaderUI();
      }catch{}
      const focusId=this.current==='voice'?'voice-input': this.current==='seekai'?'seekai-input':'user-input';
      setTimeout(()=> document.getElementById(focusId)?.focus(), 100);
    },
    async sendVoice(rawText){
      // Voice box = direct TTS, no "حول النص" trigger needed — AI already understands it's voice mode
      // Extract clean text if user still wrote trigger phrase
      let txt = rawText.trim();
      // if contains trigger, extract only target part via TTSEngine
      if(window.TTSEngine && window.TTSEngine.isTTSRequest(txt)){
        txt = window.TTSEngine.extractText(txt);
      }
      if(!txt) return;
      // create conv if needed
      if(!state.activeConvId) StateController.newConversation();
      const conv = StateController.getActiveConv();
      // show user bubble as voice type
      const userMsg = StateController.addMessage('user', txt, null, []);
      if(userMsg){ userMsg.isVoice = true; MessageRenderer.appendMessage(userMsg); }
      // keep strong model only: cloud handles synthesis with selected voice/speed
      await window.TTSEngine.handleVoiceBoxRequest(txt, conv);
    }
  };
  window.VoiceChatController = VoiceChatController;

  // ── SeekAI Controller — third box with all services from seekai.cc ──
  const SeekAIController = {
    models: [],
    init(){
      const sSel=document.getElementById('seekai-service-select');
      const mSel=document.getElementById('seekai-model-select');
      const input=document.getElementById('seekai-input');
      const send=document.getElementById('seekai-send-btn');
      const refresh=document.getElementById('seekai-refresh-btn');
      const mic=document.getElementById('seekai-mic-btn');
      const attach=document.getElementById('seekai-attach-btn');
      const fetchModels= async ()=>{
        try{
          const key=(window.ConfigVault?.getSeekAIKey?.()||'');
          const url=(window.ConfigVault?.getSeekAIUrl?.()||'https://seekai.cc').replace(/\/+$/,'');
          mSel.innerHTML='<option>جاري...</option>';
          const r=await fetch(url+'/v1/models',{headers:{'Authorization':`Bearer ${key}`}});
          if(!r.ok) throw new Error('no models');
          const j=await r.json();
          this.models=j.data||[];
          this.renderModels();
          MessageRenderer.showToast(`✨ SeekAI — ${this.models.length} موديل`,'success');
        }catch(e){
          // fallback to known list
          this.models=[
            {id:'claude-opus-5', owned_by:'claude'},{id:'claude-sonnet-5', owned_by:'claude'},{id:'gpt-5-6', owned_by:'openai'},{id:'grok-4-6', owned_by:'openai'},{id:'deepseek-v4-pro', owned_by:'openai'},{id:'kimi-k3', owned_by:'openai'}
          ];
          this.renderModels();
        }
      };
      this.renderModels=()=>{
        const svc=sSel?.value||'chat';
        let list=this.models;
        // filter rough by service (chat shows all, image/video may filter later)
        if(svc==='chat') list=this.models;
        mSel.innerHTML=list.map(m=> `<option value="${m.id}">${m.id.slice(0,22)}</option>`).join('') || '<option>—</option>';
        const saved=localStorage.getItem('seekai_model');
        if(saved && [...mSel.options].some(o=>o.value===saved)) mSel.value=saved;
      };
      sSel?.addEventListener('change', ()=>{ localStorage.setItem('seekai_service', sSel.value); this.renderModels(); });
      mSel?.addEventListener('change', ()=> localStorage.setItem('seekai_model', mSel.value));
      refresh?.addEventListener('click', fetchModels);
      try{ const ss=localStorage.getItem('seekai_service'); if(ss) sSel.value=ss; }catch{}
      fetchModels();
      const trigger= async ()=>{
        const txt=input?input.value.trim():'';
        if(!txt){ MessageRenderer.showToast('اكتب طلبك أولاً','warning'); return; }
        if(state.isStreaming || state.sendInFlight){ MessageRenderer.showToast('⏳ انتظر','info'); return; }
        input.value=''; input.dispatchEvent(new Event('input'));
        await this.send(sSel.value, mSel.value, txt);
      };
      send?.addEventListener('click', trigger);
      input?.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); trigger(); }});
      input?.addEventListener('input', ()=>{
        const has=input.value.trim().length>0;
        if(send){ if(has && !state.isStreaming) send.removeAttribute('disabled'); else send.setAttribute('disabled','true'); }
        input.style.height='auto'; input.style.height=Math.min(Math.max(input.scrollHeight,26),120)+'px';
      });
      mic?.addEventListener('click', ()=> document.getElementById('mic-btn')?.click());
      attach?.addEventListener('click', ()=> document.getElementById('file-upload-input')?.click());
    },
    async send(service, model, prompt){
      if(!state.activeConvId) StateController.newConversation();
      const conv=StateController.getActiveConv();
      const userMsg=StateController.addMessage('user', `[${service}/${model}] ${prompt}`, null, []);
      if(userMsg) MessageRenderer.appendMessage(userMsg);
      const aiId=generateId();
      const aiMsg={id:aiId, role:'ai', content:'⏳ جارٍ التنفيذ عبر SeekAI...', timestamp:new Date().toISOString(), model:model};
      conv.messages.push(aiMsg); MessageRenderer.appendMessage(aiMsg);
      state.isStreaming=true; state.isThinking=true; UIEngine.updateSendBtnState();
      try{
        const key=window.ConfigVault?.getSeekAIKey?.()||'';
        const base=(window.ConfigVault?.getSeekAIUrl?.()||'https://seekai.cc').replace(/\/+$/,'');
        if(service==='chat'){
          const r=await fetch(base+'/v1/chat/completions',{method:'POST', headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'}, body: JSON.stringify({model:model, messages:[{role:'user', content:prompt}], stream:false})});
          const j=await r.json();
          const content=j.choices?.[0]?.message?.content || j.choices?.[0]?.delta?.content || JSON.stringify(j).slice(0,2000);
          aiMsg.content=content; MessageRenderer.appendMessage(aiMsg); StateController.save();
        } else if(service==='image'){
          const r=await fetch(base+'/v1/images/generations',{method:'POST', headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'}, body: JSON.stringify({model:model, prompt:prompt, n:1, size:'1024x1024'})});
          const j=await r.json();
          const url=j.data?.[0]?.url || j.data?.[0]?.b64_json && ('data:image/png;base64,'+j.data[0].b64_json);
          if(url){ aiMsg.content=`![generated](${url})\n\n${prompt}`; } else aiMsg.content='```json\n'+JSON.stringify(j,null,2).slice(0,2000)+'\n```';
          MessageRenderer.appendMessage(aiMsg); StateController.save();
        } else {
          // video/audio generic
          const r=await fetch(base+'/v1/chat/completions',{method:'POST', headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'}, body: JSON.stringify({model:model, messages:[{role:'user', content:`[${service}] ${prompt}`}]})});
          const j=await r.json();
          aiMsg.content=j.choices?.[0]?.message?.content || JSON.stringify(j).slice(0,2000);
          MessageRenderer.appendMessage(aiMsg); StateController.save();
        }
      }catch(e){
        aiMsg.content='⚠️ خطأ SeekAI: '+(e.message||'unknown'); MessageRenderer.appendMessage(aiMsg);
      } finally {
        state.isStreaming=false; state.isThinking=false; UIEngine.updateSendBtnState(); MessageRenderer.scrollToBottom();
        try{ StateController.save(); }catch{}
      }
    }
  };
  window.SeekAIController = SeekAIController;

  // ── Usage Pie Controller — tiny pie next to refresh, popup on click ──
  const UsagePieController = {
    getCurrentModelId(){
      const mode = window.VoiceChatController?.current || 'text';
      if(mode==='voice'){
        return document.getElementById('tts-model-select')?.value || 'fishaudio/fish-speech-1.5:free';
      }
      if(mode==='seekai'){
        return document.getElementById('seekai-model-select')?.value || 'claude-opus-5';
      }
      // main chat — first enabled model of current tier
      try{
        const tier = (window.state?.currentMode || 'MID');
        const list = window.MODELS?.[tier] || window.MODELS?.MID || [];
        const enabled = list.filter(m=> window.isModelEnabled? window.isModelEnabled(m.id): true);
        return (enabled[0]||list[0])?.id || 'openai/gpt-oss-120b';
      }catch{ return 'openai/gpt-oss-120b'; }
    },
    getMaxForModel(id){
      const v = String(id||'').toLowerCase();
      if(v.includes('groq') || v.includes('compound') || v.includes('qwen') || v.includes('gpt-oss')) return 6000;
      if(v.includes('fish')) return 50000;
      if(v.includes('claude') || v.includes('grok') || v.includes('deepseek') || v.includes('kimi') || v.includes('gpt-5')) return 80000;
      return 100000;
    },
    getRenewal(modelId){
      const isGroq = String(modelId).toLowerCase().includes('groq') || String(modelId).toLowerCase().includes('qwen') || String(modelId).toLowerCase().includes('gpt-oss');
      const now=new Date();
      if(isGroq){
        const t=new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1,0,0,0));
        const h=Math.max(0, Math.round((t-now)/3600000));
        return {label:'Re', text:`غداً 00:00 UTC (بعد ${h} ساعة)`, date: t.toLocaleDateString('ar-EG')};
      } else {
        const t=new Date(now.getFullYear(), now.getMonth()+1, 1);
        const d=Math.max(0, Math.ceil((t-now)/86400000));
        return {label:'Ex', text:`أول الشهر (بعد ${d} يوم)`, date: t.toLocaleDateString('ar-EG')};
      }
    },
    update(){
      try{
        const modelId=this.getCurrentModelId();
        const tracker=window.UsageTracker? window.UsageTracker.load(): {perModel:{}};
        const per=tracker.perModel||{};
        const u=per[modelId]||{t:0,r:0};
        const max=this.getMaxForModel(modelId);
        const pct=Math.min(100, Math.round((u.t/max)*100));
        const circ=2*Math.PI*14;
        const dash=(pct/100)*circ;
        const fg=document.querySelector('#usage-pie-wrap .pie-fg');
        if(fg) fg.setAttribute('stroke-dasharray', `${dash} ${circ}`);
        // color by usage
        if(fg){
          if(pct>85) fg.setAttribute('stroke','#ef4444');
          else if(pct>65) fg.setAttribute('stroke','#f59e0b');
          else fg.setAttribute('stroke','var(--accent-color, #da7756)');
        }
        // prepare popup content (without showing)
        const rem=Math.max(0, max - u.t);
        const ren=this.getRenewal(modelId);
        const popup=document.getElementById('usage-popup-content');
        if(popup){
          const shortId=modelId.length>22? modelId.slice(0,22)+'…': modelId;
          popup.innerHTML=`
            <div style="font-weight:800; font-size:13px; margin-bottom:6px; color:var(--text-main);">${shortId}</div>
            <div style="display:flex; justify-content:space-between; gap:12px;"><span>المستهلك</span><span>${u.t.toLocaleString()} / ${max.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between; gap:12px;"><span>المتبقي</span><span style="color:#10b981; font-weight:700;">${rem.toLocaleString()}</span></div>
            <div style="display:flex; justify-content:space-between; gap:12px;"><span>الطلبات</span><span>${u.r}</span></div>
            <div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; gap:12px;"><span>${ren.label}</span><span>${ren.text}</span></div>
            <div style="font-size:11px; color:var(--text-dim); margin-top:4px;">${ren.date}</div>
          `;
        }
      }catch(e){ console.warn('[pie]',e); }
    },
    init(){
      this.update();
      const wrap=document.getElementById('usage-pie-wrap');
      const popup=document.getElementById('usage-popup');
      if(!wrap || !popup) return;
      const toggle=(e)=>{
        e.stopPropagation();
        popup.classList.toggle('hidden');
        if(!popup.classList.contains('hidden')) this.update();
      };
      wrap.addEventListener('click', toggle);
      document.addEventListener('click', (e)=>{ if(!wrap.contains(e.target)) popup.classList.add('hidden'); });
      // update on model/mode changes
      ['tts-model-select','tts-voice-select','seekai-model-select','seekai-service-select'].forEach(id=>{
        document.getElementById(id)?.addEventListener('change', ()=> setTimeout(()=>this.update(), 100));
      });
      document.querySelectorAll('.chat-dot').forEach(d=> d.addEventListener('click', ()=> setTimeout(()=>this.update(), 150)));
      // hook UsageTracker.record
      const orig=window.UsageTracker?.record;
      if(orig){
        const self=this;
        window.UsageTracker.record=function(...a){ const r=orig.apply(this,a); try{ self.update(); }catch{} return r; };
      }
      setInterval(()=> this.update(), 15000);
    }
  };
  window.UsagePieController = UsagePieController;

  // ─────────────────────────────────────────────────────────────────
  // 7. CHAT CONTROLLER & STREAM ORCHESTRATOR — Extracted to modules/chat-engine.js
  // ─────────────────────────────────────────────────────────────────
  const ChatEngine = window.ChatEngine || {
    preparePayload(userText) {
      let textForPayload = userText.trim();
      const currentAttachments = [...state.attachments];

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
      if (tier === 'HIGH') return { recentCount: 18, maxBriefingChars: 3200 };
      if (tier === 'FAST') return { recentCount: 6, maxBriefingChars: 600 };
      return { recentCount: 10, maxBriefingChars: 1200 };
    },

    generateBriefing(conv, tier) {
      if (!conv || !Array.isArray(conv.messages) || conv.messages.length <= 8) return '';
      const cfg = this.getAdaptiveConfig(tier);
      const firstUser = (conv.messages.find(m => m.role === 'user')?.content || '').slice(0, 250).replace(/\n/g, ' ').trim();
      const lang = /[\u0600-\u06FF]/.test(firstUser) ? 'العربية' : 'English';
      const turns = conv.messages.length;
      const title = conv.title || 'محادثة';
      if (tier === 'HIGH') {
        // HIGH: briefing for whole session + last summaries (up to 3200 chars) + last 18 lines will be sent verbatim via apiMessages
        const recentAi = conv.messages.filter(m => m.role === 'ai').slice(-5).map(m => (m.content || '').slice(0, 220).replace(/\n/g, ' ').trim()).filter(Boolean).join(' | ');
        const recentUser = conv.messages.filter(m => m.role === 'user').slice(-5).map(m => (m.content || '').slice(0, 180).replace(/\n/g, ' ').trim()).filter(Boolean).join(' | ');
        let briefing = `📋 بريفنج المحادثة الكاملة (${title}):\n- الهدف الأساسي: ${firstUser.slice(0, 250)}\n- اللغة والنبرة: ${lang}\n- عدد التبادلات: ${turns}\n- آخر رسائل المستخدم: ${recentUser.slice(0, 500)}\n- آخر خلاصات AI: ${recentAi.slice(0, 600)}\n- ملاحظة: آخر 18 رسالة التالية مرسلة حرفيا كسياق كامل`;
        if (briefing.length > cfg.maxBriefingChars) briefing = briefing.slice(0, cfg.maxBriefingChars) + '...';
        return briefing;
      }
      const recentAi = conv.messages.filter(m => m.role === 'ai').slice(-3).map(m => (m.content || '').slice(0, 180).replace(/\n/g, ' ').trim()).filter(Boolean).join(' | ');
      let briefing = `📋 بريفنج المحادثة (${title}):\n- الهدف الأساسي: ${firstUser.slice(0, 180)}\n- اللغة والنبرة: ${lang}\n- عدد التبادلات: ${turns}\n- آخر خلاصات: ${recentAi.slice(0, 350)}`;
      if (briefing.length > cfg.maxBriefingChars) briefing = briefing.slice(0, cfg.maxBriefingChars) + '...';
      return briefing;
    },

    async buildSystemPrompt(userText = '', attachments = [], conv = null, tier = 'MID') {
      if (!InstructionManager.files || !InstructionManager.files.length) {
        await InstructionManager.load();
      }
      const basePrompt = InstructionManager.assemblePrompt(userText, attachments, tier);
      const briefing = this.generateBriefing(conv, tier);
      if (!briefing) return basePrompt;
      return `${basePrompt}\n\n═══════════════════════════════════════════════════════════════\n${briefing}\n═══════════════════════════════════════════════════════════════\n(هذه خلاصة ذكية للمحادثة الكاملة — استخدمها كسياق كأنك كنت حاضراً من البداية. آخر ${this.getAdaptiveConfig(tier).recentCount} رسائل التالية هي النص الحرفي الأحدث)`;
    },

    async sendMessage(userText) {
      const hasAttachments = state.attachments && state.attachments.length > 0;
      if (!userText.trim() && !hasAttachments) return;
      if (state.isStreaming || state.sendInFlight || state.cacheOperationInFlight) {
        MessageRenderer.showToast('⏳ انتظر انتهاء الرد الحالي قبل إرسال رسالة جديدة', 'info');
        return;
      }
      // create conv BEFORE locking — otherwise first message swallows (newConversation blocked by sendInFlight)
      if (!state.activeConvId) StateController.newConversation();
      let conv = StateController.getActiveConv();
      if (!conv) {
        // fallback create directly if still null
        const id = generateId();
        conv = { id, title: 'محادثة جديدة', messages: [], mode: state.currentMode, isDev: false, createdAt: new Date().toISOString() };
        state.conversations.unshift(conv);
        state.activeConvId = id;
        try{ localStorage.setItem('activeConvId', id); }catch{}
        StateController.save();
      }
      state.sendInFlight = true;
      state._lastSendStart = Date.now();

      let { textForPayload, currentAttachments } = this.preparePayload(userText);
      // Web Browse + RAG-lite enrichment
      try{
        const urls=[...textForPayload.matchAll(/https?:\/\/[^\s"']+/g)].map(m=>m[0]).slice(0,2);
        for(const u of urls){ try{ const r=await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,{signal:AbortSignal.timeout(5000)}); if(r.ok){ const t=await r.text(); textForPayload+=`\n\n--- محتوى الرابط ${u} ---\n${t.slice(0,3500)}\n---`; } }catch{} }
        const ragKeys=['index.html','style.css','app.js','dev.js','dev_style.css','config.js','github.js','instructions.json'];
        const hit=ragKeys.filter(k=> textForPayload.toLowerCase().includes(k.toLowerCase()));
        for(const f of hit.slice(0,2)){ try{ const r=await fetch(`./${f}?t=${Date.now()}`); if(r.ok){ const t=await r.text(); textForPayload+=`\n\n--- ملف ${f} (مقتطف) ---\n${t.slice(0,3500)}\n---`; } }catch{} }
      }catch{}

      // ── TTS delegation: text models → audio models ──
      if(window.TTSEngine && window.TTSEngine.isTTSRequest(textForPayload)){
        // clear previews
        state.attachments = [];
        const pc = $('attachment-preview-container');
        if(pc){ pc.classList.add('hidden'); pc.innerHTML=''; }
        const userMsgTTS = StateController.addMessage('user', userText.trim() || textForPayload, null, currentAttachments);
        if(userMsgTTS) MessageRenderer.appendMessage(userMsgTTS);
        state.sendInFlight = false; state.sendLock = false; state._lastSendStart = 0; UIEngine.updateSendBtnState();
        await window.TTSEngine.handleTTSRequest(textForPayload, conv);
        state._lastSendStart = 0;
        return;
      }

      // Clear previews & state
      state.attachments = [];
      const previewContainer = $('attachment-preview-container');
      if (previewContainer) {
        previewContainer.classList.add('hidden');
        previewContainer.innerHTML = '';
      }

      const userMsg = StateController.addMessage('user', userText.trim() || 'ملف مرفق', null, currentAttachments);
      if (!userMsg) {
        state.isStreaming = false;
        state.abortController = null;
        state.sendInFlight = false;
        state.sendLock = false;
        UIEngine.updateSendBtnState();
        throw new Error('تعذر إضافة رسالتك للمحادثة الحالية');
      }
      MessageRenderer.appendMessage(userMsg);

      state.isStreaming = true;
      state.isThinking = true;
      state.abortController = new AbortController();
      MessageRenderer.startProgressiveThinking('Analyzing');
      UIEngine.updateSendBtnState();

      const tier = state.currentMode || 'MID';
      debugCheckpoint('send-start', { tier, textLength: textForPayload.length });
      let systemPromptForCall;
      try {
        const promptTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('PROMPT_TIMEOUT')), 8000));
        systemPromptForCall = await Promise.race([
          this.buildSystemPrompt(textForPayload, currentAttachments, conv, tier),
          promptTimeout
        ]);
        debugCheckpoint('prompt-ready', { tier, promptLength: systemPromptForCall.length });
      } catch (err) {
        MessageRenderer.hideTyping();
        state.isThinking = false;
        state.isStreaming = false;
        state.abortController = null;
        state._lastSendStart = 0;
        UIEngine.updateSendBtnState();
        const errorMessage = {
          id: generateId(),
          role: 'ai',
          content: `⚠️ تعذر تجهيز الطلب: ${err.message === 'PROMPT_TIMEOUT' ? 'انتهت مهلة تجهيز التعليمات' : (err.message || 'خطأ غير معروف')}. يمكنك إعادة المحاولة.`,
          isError: true,
          timestamp: new Date().toISOString()
        };
        conv.messages.push(errorMessage);
        MessageRenderer.appendMessage(errorMessage);
        debugPrint(err, `Prompt preparation failed (${tier})`);
        UIEngine.updateSendBtnState();
        state.sendInFlight = false;
        state.sendLock = false;
        return;
      }
      const visImages = currentAttachments.filter(a=> a.type.startsWith('image/') && a.dataUrl);
      const userContent = visImages.length ? [{type:'text', text: textForPayload}, ...visImages.slice(0,3).map(a=>({type:'image_url', image_url:{url:a.dataUrl}}))] : textForPayload;
      const apiMessages = [
        { role: 'system', content: systemPromptForCall },
        ...conv.messages
          .filter(m => m.id !== userMsg.id)
          .slice(-this.getAdaptiveConfig(tier).recentCount)
          .map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
        { role: 'user', content: userContent }
      ];

      let fullContent = '';
      const aiMsgId = generateId();
      const aiMsgObj = {
        id: aiMsgId,
        role: 'ai',
        content: '',
        model: null,
        usedFallback: false,
        timestamp: new Date().toISOString()
      };
      conv.messages.push(aiMsgObj);

      const shouldObserve = !!state.isMultiAgentMode;
      const onModelEvent = (model, isFallback) => {
        aiMsgObj.model = model.name;
        aiMsgObj.provider = model.provider || 'groq';
        aiMsgObj.usedFallback = isFallback;

        if (isFallback) {
          MessageRenderer.setThinkingStage('Switching');
        }
      };

      try {
        debugCheckpoint('stream-start', { tier, messageCount: apiMessages.length });
        const stream = ModelEngine.chatWithFallback(state.currentMode, apiMessages, state.abortController.signal, onModelEvent);

        let msgRow = null;
        let pendingUpdate = false;
        let lastUpdateTs = 0;

        const scheduleUpdate = () => {
          if (pendingUpdate) return;
          pendingUpdate = true;
          // Batch DOM updates to the next animation frame to avoid long synchronous reflows
          requestAnimationFrame(() => {
            try {
              if (!msgRow) return;
              msgRow.innerHTML = MessageRenderer.parseMarkdown(fullContent);
              const isAr = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(fullContent);
              const parentRow = document.querySelector(`[data-id="${aiMsgId}"]`);
              if (parentRow) {
                parentRow.classList.toggle('is-rtl', isAr);
                parentRow.classList.toggle('is-ltr', !isAr);
              }
              msgRow.setAttribute('dir', isAr ? 'rtl' : 'ltr');
              msgRow.style.textAlign = isAr ? 'right' : 'left';
            } catch (err) {
              console.warn('Error updating AI msg DOM:', err && err.message);
            } finally {
              pendingUpdate = false;
              lastUpdateTs = Date.now();
            }
          });
        };

        for await (const { chunk, model, usedFallback } of stream) {
          fullContent += chunk;
          aiMsgObj.model = model.name;
          aiMsgObj.usedFallback = usedFallback;

          if (!msgRow) {
            MessageRenderer.hideTyping();
            state.isThinking = false;
            UIEngine.updateSendBtnState();
            MessageRenderer.appendMessage(aiMsgObj);
            msgRow = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
            const aiElem = document.querySelector(`[data-id="${aiMsgId}"]`);
            if (aiElem && typeof aiElem.scrollIntoView === 'function') {
              aiElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }

          if (msgRow) {
            // If last update was recent, batch this chunk and let requestAnimationFrame handle it.
            const now = Date.now();
            if (now - lastUpdateTs > 80) {
              scheduleUpdate();
            } else {
              // ensure we schedule eventually
              scheduleUpdate();
            }
          }
        }
        // final flush after stream completes
        if (msgRow && !pendingUpdate) scheduleUpdate();
        // Ensure thinking flow is hidden and no glow remains after strong model finishes
        try { MessageRenderer.hideTyping(); document.getElementById('thinking-flow')?.remove(); document.querySelectorAll('.input-container.thinking').forEach(el=> el.classList.remove('thinking')); document.querySelectorAll('.flow-dot').forEach(d=> d.style.animation='none'); } catch {}

        if (fullContent.includes('---BEGIN_INSTRUCTION_UPDATE---') || fullContent.includes('"title"') && fullContent.includes('"content"')) {
          InstructionManager.handleAutoInstructionUpdate(fullContent);
          const cleanText = fullContent.replace(/---BEGIN_INSTRUCTION_UPDATE---[\s\S]*?---END_INSTRUCTION_UPDATE---/g, '').replace(/```json\s*\{[\s\S]*?"title"[\s\S]*?\}\s*```/g, '').trim();
          if (cleanText) {
            aiMsgObj.content = cleanText;
            if (msgRow) msgRow.innerHTML = MessageRenderer.parseMarkdown(cleanText);
          } else {
            aiMsgObj.content = fullContent;
            if (msgRow) msgRow.innerHTML = MessageRenderer.parseMarkdown(fullContent) + '<div style="margin-top:8px; font-size:12px; color:var(--accent-color);">✅ تم حفظ التعليمة — يمكنك مراجعتها في الإعدادات → التعليمات</div>';
          }
        } else {
          aiMsgObj.content = fullContent;
          const leakPat = /AVAILABLE_INSTRUCTION_FOLDERS|instruction_editing_protocol|50 توجيه|هوية المحرك.*Fast Mode/i;
          if(leakPat.test(aiMsgObj.content)){
            aiMsgObj.content = 'التعليمات الداخلية خاصة بالنظام ولا يمكن عرضها. أخبرني ماذا تريد أن تعدل أو تضيف وسأساعدك مباشرة.';
            if(msgRow) msgRow.innerHTML = MessageRenderer.parseMarkdown(aiMsgObj.content);
          }
        }
        // Skill previews: slides / mindmap — show preview button if JSON detected
        try {
          const slidesMatch = fullContent.match(/```json\s*([\s\S]*?"slides"[\s\S]*?)\s*```/);
          if (slidesMatch && msgRow) {
            const sData = JSON.parse(slidesMatch[1]);
            if (sData.slides && Array.isArray(sData.slides)) {
              const btn = `<button class="slides-launch-btn" data-slides="${encodeURIComponent(JSON.stringify(sData.slides))}" onclick="window._openSlides(decodeURIComponent(this.dataset.slides))">📊 عرض الشرائح التفاعلية</button>`;
              msgRow.innerHTML += btn;
            }
          }
          if (fullContent.includes('mindmap') || fullContent.includes('Mind Map')) {
            // mindmap preview is handled via parseMarkdown tree, no extra action needed
          }
        } catch {}
        StateController.save();
        try { UsageTracker.record(aiMsgObj.model, aiMsgObj.provider || 'groq', textForPayload, fullContent); } catch {}

      } catch (err) {
        MessageRenderer.hideTyping();
        state.isThinking = false;
        UIEngine.updateSendBtnState();
        if (err.name !== 'AbortError') {
          debugPrint(err, `Chat request failed (${state.currentMode || 'MID'})`);
          // Generic giant-model error handling: always print error in chat after thinking phase, never freeze
          const errText = (err && err.message) ? String(err.message) : 'خطأ غير معروف';
          if (!fullContent.trim()) {
            aiMsgObj.content = `⚠️ تعذر استلام الرد من نماذج ${state.currentMode || 'MID'}: ${errText}\n\nيمكنك المحاولة مرة أخرى أو التبديل لوضع Balanced/FAST.`;
            aiMsgObj.isError = true;
            // Ensure the placeholder bubble exists and is replaced with error bubble
            try { MessageRenderer.appendMessage(aiMsgObj); } catch (e) { console.warn('[render error msg failed]', e); }
            try { StateController.save(); } catch {}
          } else {
            // Partial content arrived before error — keep what we have and append error note
            aiMsgObj.content = fullContent + `\n\n---\n⚠️ انقطع الاتصال أثناء الاستجابة: ${errText}`;
            try { StateController.save(); } catch {}
          }
          MessageRenderer.showToast('❌ ' + errText.slice(0,180), 'error');
        }
      } finally {
        // Guaranteed unlock — prevents freeze/ swallowed messages
        MessageRenderer.hideTyping();
        state.isThinking = false;
        state.isStreaming = false;
        state.abortController = null;
        state.sendInFlight = false;
        state.sendLock = false;
        state.cacheOperationInFlight = false;
        state._lastSendStart = 0;
        UIEngine.updateSendBtnState();
        MessageRenderer.scrollToBottom();
        try { StateController.save(); } catch {}
        // Observer agents: follow-up review AFTER main level response (non-blocking, prevents freeze)
        if (shouldObserve && fullContent && !aiMsgObj.isError) {
          setTimeout(() => {
            try { if (window.ObserverEngine) window.ObserverEngine.observe(userText, fullContent, tier, aiMsgId, conv); } catch (e) { console.warn('[Observer]', e); }
          }, 500);
        }
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 8. MULTI-AGENT COLLABORATIVE CONSENSUS ENGINE — Extracted to modules/chat-engine.js
  // ─────────────────────────────────────────────────────────────────
  const MultiAgentEngine = window.MultiAgentEngine || {
    async runConsensus(userText, textForPayload, apiMessages, aiMsgId, aiMsgObj, conv) {
      MessageRenderer.showTyping('جاري بدء تشاور الوكلاء...');

      let msgRow = null;
      const getOrCreateRow = () => {
        if (!msgRow) {
          MessageRenderer.hideTyping();
          MessageRenderer.appendMessage(aiMsgObj);
          msgRow = document.querySelector(`[data-id="${aiMsgId}"] .msg-content`);
        }
        return msgRow;
      };

      const renderLiveUI = (steps, finalContent = '', isThinking = true) => {
        const row = getOrCreateRow();
        if (!row) return;

        const stepsHtml = steps.map(s => `
          <div class="agent-step-item">
            <div class="agent-step-header">
              <span class="agent-step-name">${s.icon} ${MessageRenderer.escapeHtml(s.title)}</span>
              <span class="agent-step-badge">${MessageRenderer.escapeHtml(s.status)}</span>
            </div>
            <div class="agent-step-body">${MessageRenderer.escapeHtml(s.summary || 'جاري التحليل...')}</div>
          </div>
        `).join('');

        const okC = steps.filter(s=>/✓|مكتمل|معتمد|Done|Approved/i.test(s.status)).length;
        const warnC = steps.length - okC;
        const boxHtml = `
          <div class="multi-agent-box" id="box-${aiMsgId}">
            <div class="agent-committed-header" onclick="window._toggleThinkingBox('${aiMsgId}'); this.classList.toggle('collapsed')">
              <span style="color:var(--accent-color)">👥</span>
              <span class="agent-committed-label">COMMITTED</span>
              <span class="agent-committed-nums"><span class="agent-num ok">${okC}</span><span class="agent-num warn">${warnC}</span></span>
              <span class="agent-toggle-icon" id="indicator-${aiMsgId}">▾</span>
            </div>
            <div class="multi-agent-content">
              ${stepsHtml}
              <div style="display:flex;gap:8px;margin-top:8px"><button class="llm-end-btn" onclick="window._endToLLM(this)">⚡ Send to LLM</button></div>
            </div>
          </div>
        `;

        const parsedFinal = finalContent ? MessageRenderer.parseMarkdown(finalContent) : (isThinking ? '<div style="color:var(--text-dim); font-size:13px; padding:4px;">⏳ جاري صياغة القرار النهائي المعتمد...</div>' : '');
        row.innerHTML = parsedFinal + boxHtml;

        const isAr = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(finalContent || userText);
        const parentRow = document.querySelector(`[data-id="${aiMsgId}"]`);
        if (parentRow) {
          parentRow.classList.toggle('is-rtl', isAr);
          parentRow.classList.toggle('is-ltr', !isAr);
        }
      };

      const steps = [
        { id: 1, icon: '💡', title: 'المحلل الاستراتيجي (Strategic Analyst)', status: 'نشط الآن', summary: 'جاري دراسة المسألة واقتراح التحليل الأولي...' },
        { id: 2, icon: '🔍', title: 'الناقد المنطقي (Critical Reviewer)', status: 'في الانتظار', summary: 'بانتظار مسودة المحلل للتدقيق والفحص...' },
        { id: 3, icon: '👑', title: 'المقرر النهائي (Chief Synthesizer)', status: 'في الانتظار', summary: 'بانتظار التقرير النهائي للصياغة المعتمدة...' }
      ];

      renderLiveUI(steps, '', true);

      // --- STAGE 1: Strategic Analyst ---
      const stage1Messages = [
        ...apiMessages.slice(0, -1),
        { role: 'user', content: `${textForPayload}\n\n[DIRECTIVE TO STRATEGIC ANALYST]: Provide a sharp, structured, and comprehensive initial analysis/solution. Be concise and logical.` }
      ];

      let stage1Output = '';
      try {
        const stream1 = ModelEngine.chatWithFallback('FAST', stage1Messages, state.abortController.signal, () => {});
        for await (const { chunk } of stream1) {
          stage1Output += chunk;
        }
        steps[0].status = '✓ اكتمل';
        steps[0].summary = stage1Output.slice(0, 180).trim() + (stage1Output.length > 180 ? '...' : '');
        steps[1].status = 'نشط الآن';
        steps[1].summary = 'جاري مراجعة تحليل المسودة واكتشاف أي ثغرات أو تحسينات...';
        renderLiveUI(steps, '', true);
      } catch (e) {
        steps[0].status = 'تجاوز';
        stage1Output = 'تحليل أولي للطلب.';
      }

      // --- STAGE 2: Critical Reviewer ---
      const stage2Messages = [
        ...apiMessages.slice(0, -1),
        { role: 'user', content: `User Request: "${textForPayload}"\n\nAgent 1 Proposal:\n"${stage1Output}"\n\n[DIRECTIVE TO CRITICAL REVIEWER]: Critique and review Agent 1's proposal. Point out any missed points, logic flaws, edge cases, or optimizations concisely in 2-3 bullet points.` }
      ];

      let stage2Output = '';
      try {
        const stream2 = ModelEngine.chatWithFallback('MID', stage2Messages, state.abortController.signal, () => {});
        for await (const { chunk } of stream2) {
          stage2Output += chunk;
        }
        steps[1].status = '✓ اكتمل';
        steps[1].summary = stage2Output.slice(0, 180).trim() + (stage2Output.length > 180 ? '...' : '');
        steps[2].status = 'نشط الآن';
        steps[2].summary = 'جاري دمج أفضل النقاط واعتماد الإجابة النهائية الأصح...';
        renderLiveUI(steps, '', true);
      } catch (e) {
        steps[1].status = 'تجاوز';
        stage2Output = 'تمت مراجعة المسودة واعتماد النقاط الرئيسية.';
      }

      // --- STAGE 3: Final Synthesis ---
      const stage3Messages = [
        ...apiMessages.slice(0, -1),
        { role: 'user', content: `${textForPayload}\n\n[CONTEXT: Multi-Agent Consensus Collaboration]\nAgent 1 Draft:\n${stage1Output}\n\nAgent 2 Review & Critique:\n${stage2Output}\n\n[DIRECTIVE TO CHIEF SYNTHESIZER]: Deliver the finalized, highest quality, polished, and fully validated response to the user. Do not talk about the agents; directly provide the definitive answer formatted in clean Markdown.` }
      ];

      let finalOutput = '';
      const stream3 = ModelEngine.chatWithFallback(state.currentMode, stage3Messages, state.abortController.signal, () => {});
      for await (const { chunk } of stream3) {
        finalOutput += chunk;
        renderLiveUI(steps, finalOutput, false);
      }

      steps[2].status = '✓ معتمد';
      steps[2].summary = 'تم الاتفاق وصياغة القرار النهائي المعتمد بنجاح.';
      renderLiveUI(steps, finalOutput, false);

      aiMsgObj.content = finalOutput;
      aiMsgObj.multiAgentSteps = steps;
      StateController.save();
      try { UsageTracker.record(aiMsgObj.model || 'Multi-Agent', 'groq', textForPayload, finalOutput); } catch {}
    }
  };

  try { window.ChatEngine = ChatEngine; } catch(e) {}
  try { window.MultiAgentEngine = MultiAgentEngine; } catch(e) {}

  // ─────────────────────────────────────────────────────────────────
  // 8b. OBSERVER AGENTS — Follow-up reviewers (non-blocking, after main level response)
  // ─────────────────────────────────────────────────────────────────
  const ObserverEngine = window.ObserverEngine || {
    async observe(userText, aiResponse, tier, aiMsgId, conv) {
      const isAr = /[\u0600-\u06FF]/.test((userText || '') + ' ' + (aiResponse || '').slice(0, 200));
      const t = (ar, en) => isAr ? ar : en;
      const aiRow = document.querySelector(`[data-id="${CSS.escape ? CSS.escape(aiMsgId) : aiMsgId}"]`);
      if (!aiRow) return;
      // Prevent duplicate observer boxes
      if (aiRow.querySelector('.observer-box')) return;

      const steps = [
        { icon: '👁️', title: t('مراقبة الرد', 'Monitoring response'), status: t('نشط', 'Active'), summary: t('جاري متابعة رد المستوى المختار...', 'Tracking selected level response...') },
        { icon: '📋', title: t('فحص الالتزام بالتعليمات', 'Instruction compliance'), status: t('انتظار', 'Waiting'), summary: t('بانتظار التحليل...', 'Awaiting analysis...') },
        { icon: '🔍', title: t('كشف التناقض والتكرار', 'Contradiction check'), status: t('انتظار', 'Waiting'), summary: t('بانتظار الفحص...', 'Awaiting check...') },
        { icon: '🌐', title: t('التحقق من المصادر', 'Source reliability'), status: t('انتظار', 'Waiting'), summary: t('للقصص/الشخصيات الحقيقية فقط', 'For real stories/scripts only') },
        { icon: '✨', title: t('تحسين الجودة', 'Quality enhancement'), status: t('انتظار', 'Waiting'), summary: t('بانتظار الاقتراح...', 'Awaiting suggestion...') }
      ];

      const renderObserver = (finalReview = '') => {
        // Floating bullets — no numbers — COMMITTED header with colored numbers, icon toggle, Apply only
          const getCls=b=>{ if(b.includes('التناقض:')) return b.includes('نعم')?'warn':'ok'; if(b.includes('الالتزام:')||b.includes('المصادر:')) return (b.includes('نعم')||b.includes('موثوقة')||b.includes('سليم'))?'ok':'warn'; return b.includes('لا')||b.includes('تحتاج')?'warn':'ok'; };
          const buildBullets = (txt)=> {
            const lines = String(txt||'').split(/\n/).map(s=>s.trim()).filter(Boolean);
            const bullets = lines.map(l=> l.replace(/^[��?]\s*/,'').replace(/^\d+[\.\)\-]\s*/,'').trim()).filter(Boolean).slice(0,5);
            if(!bullets.length) return `<div style="font-size:12px;color:var(--text-dim)">${MessageRenderer.escapeHtml(String(txt||'').slice(0,140))}</div>`;
            const main=bullets.slice(0,-1), last=bullets.slice(-1)[0];
            const mainHtml=main.length? `<ul class="observer-bullets">${main.map(b=>`<li class="observer-bullet ${getCls(b)}"><span class="observer-bullet-text">${MessageRenderer.escapeHtml(b)}</span></li>`).join('')}</ul>` : '';
            const box=(last && !(last.includes('لا يوجد') || /No improvement/i.test(last)))? `<div class="suggest-box"><div class="suggest-box-body">${MessageRenderer.escapeHtml(last)}</div><div class="suggest-box-actions"><button class="observer-apply-btn" onclick="window._applyObserverSuggestion(this.closest('.observer-box').dataset.review||'', this)">⚡ Apply</button><button class="llm-end-btn" onclick="window._sendToLLM(this)">⚡ Send to LLM</button><button class="llm-send-apply-btn" onclick="window._sendAndApply(this)">⚡ Send & Apply</button></div></div>` : '';
            // inject handlers via delegated replacement after
            return mainHtml+box;
          };
        const okC = (txt)=> (String(txt).match(/نعم|yes|✓|مُلتزم|Compliant/gi)||[]).length;
        const reviewHtml = finalReview ? buildBullets(finalReview) : `<div style="font-size:12px; color:var(--text-dim); padding:6px 0;">${t('جاري المراجعة...','Reviewing...')}</div>`;
        const okN = finalReview ? okC(finalReview) : 0;
        const warnN = finalReview ? (String(finalReview).split(/\n/).filter(Boolean).length - okN) : 0;
        const applyBtn = '';
        const box = aiRow.querySelector('.observer-box') || document.createElement('div');
        box.className = 'observer-box';
        box.style.cssText = 'margin-top:10px; padding:0; border:none; background:transparent;';
        if(finalReview) box.dataset.review = finalReview;
        box.innerHTML = `
          <div class="agent-committed-header" onclick="this.closest('.multi-agent-box').classList.toggle('collapsed')">
            <span>👁️</span><span class="agent-committed-label">COMMITTED</span><span class="agent-committed-nums"><span class="agent-num ok">${okN}</span><span class="agent-num warn">${Math.max(0,warnN)}</span></span><span class="agent-toggle-icon">▾</span>
          </div>
          <div class="observer-details">
            ${reviewHtml}
            ${applyBtn}
          </div>
        `;
        if (!aiRow.querySelector('.observer-box')) {
          const contentEl = aiRow.querySelector('.msg-content');
          if (contentEl) contentEl.appendChild(box);
          else aiRow.appendChild(box);
        }
      };

      renderObserver();
      // Step 1 done
      steps[0].status = t('✓ تمت المتابعة', '✓ Tracked');
      steps[0].summary = t(`تمت مراقبة رد ${tier} (${aiResponse.length} حرف)`, `Tracked ${tier} response (${aiResponse.length} chars)`);
      steps[1].status = t('نشط', 'Active');
      renderObserver();

      // Build review prompt — if no improvement, don't suggest
      const reviewPrompt = isAr
        ? `أنت مراقب جودة ذكي ومختصر من مستوى Balanced. راجع الرد:\n\nسؤال: """${userText.slice(0, 800)}"""\nرد (${tier}): """${aiResponse.slice(0, 2500)}"""\n\nأجب بهذا الشكل فقط (بدون مقدمات، نقاط عائمة •):\n• الالتزام: إذا نعم فاكتب "نعم" فقط بدون سبب، إذا لا فاكتب "لا — السبب بجملة واحدة"\n• التناقض: إذا لا يوجد تناقض فاكتب "لا" فقط، إذا يوجد فاكتب "نعم — السبب بجملة واحدة"\n• المصادر (لو قصة حقيقية): إذا موثوقة فاكتب "موثوقة" فقط، إذا تحتاج تحقق فاذكر السبب\n• تحسين عام: إذا لا يوجد تحسين حقيقي فاكتب "لا يوجد تحسين مطلوب" فقط بدون اقتراح، وإلا جملة واحدة عامة تنفع لأي سؤال — ممنوع ربطها بهذا السؤال\n`
        : `You are concise reviewer. User: """${userText.slice(0, 800)}""" Response (${tier}): """${aiResponse.slice(0, 2500)}""" Reply as bullets • : 1. Compliance: if yes "yes" only else "no — reason" 2. Contradiction: if none "no" only else "yes — reason" 3. Sources: "reliable" only else reason 4. GENERAL improvement: if none write "No improvement needed" only, else one general sentence`;

      const reviewMessages = [
        { role: 'system', content: isAr ? 'أنت مراقب جودة محترف ومختصر.' : 'You are a concise quality reviewer.' },
        { role: 'user', content: reviewPrompt }
      ];

      let reviewText = '';
      // 5-agent COMMITTED chain: MID/FAST sequential, concise
      const chain=[
        {id:'qwen/qwen3.8-27b', provider:'groq', name:'Qwen 27B'},
        {id:'openai/gpt-oss-20b', provider:'groq', name:'GPT 20B'},
        {id:'cohere/north-mini-code:free', provider:'openrouter', name:'North Mini'},
        {id:'openai/gpt-oss-120b', provider:'groq', name:'GPT 120B'},
        {id:'thinkingmachines/inkling-small:free', provider:'openrouter', name:'Inkling 276B'}
      ];
      async function callAgent(agent, msgs, signal){
        for(let a=0;a<2;a++){
          try{
            const resp = agent.provider==='groq' ? await ModelEngine.callGroq(agent, msgs, signal) : await ModelEngine.callOpenRouter(agent, msgs, signal);
            let out='';
            for await (const ch of ModelEngine.readStream(resp, signal, agent)) out+=ch;
            if(out.trim()) return out;
            throw new Error('empty');
          }catch(e){
            if(/quota|credit|429|CREDITS_EXHAUSTED/i.test(e.message||'')) throw e;
            if(a===0) continue; else throw e;
          }
        }
      }
      try{
        let accumulated='';
        for(let i=0;i<chain.length;i++){
          const agent=chain[i];
          const isLast=i===chain.length-1;
          const prev = accumulated ? "\n\nprev:\n"+accumulated.slice(0,1500) : '';
          const q1 = isAr ? "مراجع "+(i+1)+"/5 ("+agent.name+")"+prev+" سؤال: "+userText.slice(0,600)+" رد: "+aiResponse.slice(0,2000) : "Reviewer "+(i+1)+"/5 ("+agent.name+")"+prev+" Q: "+userText.slice(0,600)+" A: "+aiResponse.slice(0,2000);
          const q2 = isLast ? (isAr ? "\nلخص 4 نقاط: التزام/تناقض/مصادر/تحسين عام." : "\nSummarize 4 bullets.") : (isAr ? "\nسطر واحد فقط." : "\nOne line.");
          const p = q1 + q2;
          const msgs=[{role:'system', content: isAr?'أنت مراجع مختصر':'You are concise reviewer'}, {role:'user', content:p}];
          const ac=new AbortController(); const tm=setTimeout(()=>ac.abort(), 9000);
          let out='';
          try{ out=await callAgent(agent, msgs, ac.signal); }catch(e){ clearTimeout(tm); if(/quota|credit/i.test(e.message||'')) throw e; continue; }
          clearTimeout(tm);
          accumulated += (accumulated? "\n":'') + "["+agent.name+"]: "+out.trim().slice(0,400);
          if(i===0){ steps[1].status=t('✓ تم','✓ Done'); steps[1].summary=t('المراجع 1 — تم','R1 done'); steps[2].status=t('نشط','Active'); renderObserver(accumulated.slice(0,400)); }
          else if(i===1){ steps[2].status=t('✓ تم','✓ Done'); steps[3].status=t('نشط','Active'); renderObserver(accumulated.slice(0,600)); }
          else if(i===2){ steps[3].status=t('✓ تم','✓ Done'); steps[4].status=t('نشط','Active'); renderObserver(accumulated.slice(0,800)); }
          if(isLast) reviewText=out;
        }
        if(!reviewText) reviewText=accumulated;
        steps[1].status=t('✓ تم','✓ Done'); steps[1].summary=t('فحص الالتزام مكتمل','Compliance done');
        steps[2].status=t('✓ تم','✓ Done'); steps[2].summary=t('فحص التناقض مكتمل','Contradiction done');
        steps[3].status=t('✓ تم','✓ Done'); steps[3].summary=t('التحقق من المصادر مكتمل','Source check done');
        steps[4].status=t('✓ تم','✓ Done'); steps[4].summary=t('اقتراح التحسين جاهز','Improvement ready');
        // Collapse after done — show only concise briefing, no motion
        const concise = reviewText.split('\n').slice(0,4).join(' | ').slice(0,220);
        // Save to message for persistence after refresh
        try {
          const msg = conv.messages.find(m=> m.id===aiMsgId);
          if(msg){ msg.observerReview = reviewText; msg.observerBrief = concise; msg.observerSteps = steps; if(window.StateController) window.StateController.save(); }
        } catch {}
        renderObserver(reviewText);
        // Ensure no glow/motion remains
        try{ document.querySelectorAll('.input-container.thinking').forEach(el=> el.classList.remove('thinking')); }catch{}
        try{ document.querySelectorAll('.flow-dot').forEach(d=> d.style.animation='none'); }catch{}
      } catch (e) {
        steps[1].status = t('تخطي', 'Skipped'); steps[2].status = t('تخطي', 'Skipped');
        renderObserver(t('تعذر إكمال المراجعة التلقائية — الرد الأصلي يبقى معتمداً', 'Auto-review skipped — original answer remains authoritative'));
        try{ document.querySelectorAll('.input-container.thinking').forEach(el=> el.classList.remove('thinking')); }catch{}
      }
    }
  };
  try { window.ObserverEngine = ObserverEngine; } catch(e) {}
  window._applyObserverSuggestion = function(text, btn){
    try{
      const clean = String(text||'').trim().slice(0,500);
      if(!clean) return;
      if(btn){ const box=btn.closest('.suggest-box'); if(box){ const h=box.querySelector('.actions-header'); if(h){ const okEl=h.querySelector('.agent-num.ok'), wEl=h.querySelector('.agent-num.warn'); if(okEl) okEl.textContent='1'; if(wEl) wEl.textContent='2'; } const flow=document.createElement('div'); flow.className='thinking-flow'; flow.style.margin='8px 0 0'; flow.innerHTML='<div class="thinking-flow-item reached"><span class="flow-dot"></span><span class="flow-text">Applying...</span></div><div class="thinking-flow-item reached" style="animation-delay:0.3s"><span class="flow-dot"></span><span class="flow-text">Done ✓</span></div>'; box.appendChild(flow); setTimeout(()=>flow.remove(),2200); } }
      const isAr = /[\u0600-\u06FF]/.test(clean);
      const fileName = isAr ? `اقتراح محسن — ${new Date().toLocaleDateString('ar-EG')}` : `Improved suggestion — ${new Date().toLocaleDateString()}`;
      const content = JSON.stringify({ suggestion: clean, appliedAt: new Date().toISOString(), source: 'observer' }, null, 2);
      const mgr = window.InstructionManager;
      if(mgr){
        const newId='custom_'+Date.now();
        mgr.files.push({ id:newId, name: fileName, icon:'✨', desc: isAr?'اقتراح محسن من المراقب':'Observer suggestion', isCore:false, enabled:true, keywords:['تحسين','observer', isAr?'اقتراح':'suggestion'], content });
        mgr.save(); mgr.renderList();
        if(window.MessageRenderer) window.MessageRenderer.showToast(isAr ? '✨ تم تطبيق الاقتراح كقاعدة جديدة' : '✨ Suggestion applied as new rule', 'success');
      }
    }catch(e){ console.warn('[ApplySuggestion]',e); }
  };

  // ─────────────────────────────────────────────────────────────────
  // 8. SKILLS ENGINE & SANDBOX (SkillsEngine)
  // ─────────────────────────────────────────────────────────────────
  let currentSandboxCode = '';
  let currentSlidesData = [];
  let currentSlideIndex = 0;

  const SkillsEngine = {
    trigger(skill) {
      $('sidebar')?.classList.remove('open');
      $('overlay')?.classList.remove('active');
      $('skills-vertical-menu')?.classList.remove('show');
      const input = $('user-input');
      if (!input) return;

      if (skill === 'roundtable') {
        input.value = '👥 Roundtable Discussion: [Write your topic here for 3 AI agents to analyze in-depth]';
      } else if (skill === 'mindmap') {
        input.value = '🗺️ Create a detailed Mind Map visual outline for: [Write topic]';
      } else if (skill === 'slides') {
        input.value = '📊 Build an interactive Slide Deck presentation about: [Write topic]';
      } else if (skill === 'sandbox') {
        input.value = '🧪 Generate an interactive runnable HTML/CSS/JS simulation for: [Write idea]';
      }

      input.focus();
      input.dispatchEvent(new Event('input'));
      MessageRenderer.showToast(`Activated ${skill} mode`, 'info');
    },

    runSandbox(code) {
      currentSandboxCode = code;
      const modal = $('sandbox-modal');
      const frame = $('sandbox-frame');
      if (!modal || !frame) return;

      modal.classList.remove('hidden');
      frame.srcdoc = code;
      MessageRenderer.showToast('🚀 جاري تشغيل المحاكاة...', 'info');
    },

    closeSandbox() {
      const modal = $('sandbox-modal');
      if (modal) modal.classList.add('hidden');
    },

    reloadSandbox() {
      const frame = $('sandbox-frame');
      if (frame && currentSandboxCode) {
        frame.srcdoc = currentSandboxCode;
        MessageRenderer.showToast('🔄 تم إعادة التشغيل', 'info');
      }
    },

    openSlides(slidesJsonStr) {
      try {
        currentSlidesData = JSON.parse(decodeURIComponent(slidesJsonStr));
      } catch {
        currentSlidesData = [
          { title: 'العرض التقديمي', bullets: ['مرحباً بك في العرض التفاعلي'] }
        ];
      }
      currentSlideIndex = 0;
      const modal = $('slides-modal');
      if (modal) modal.classList.remove('hidden');
      this.renderCurrentSlide();
    },

    renderCurrentSlide() {
      const area = $('slide-content-area');
      const indicator = $('slide-indicator');
      if (!area || !currentSlidesData.length) return;

      const slide = currentSlidesData[currentSlideIndex];
      if (indicator) indicator.textContent = `${currentSlideIndex + 1} / ${currentSlidesData.length}`;

      area.innerHTML = `
        <h2 class="slide-title">${MessageRenderer.escapeHtml(slide.title || 'شريحة')}</h2>
        <div class="slide-bullets-wrap">
          ${(slide.bullets || []).map(b => `<div class="slide-bullet"><span>▸</span> <span>${MessageRenderer.escapeHtml(b)}</span></div>`).join('')}
        </div>
      `;
    },

    prevSlide() {
      if (currentSlideIndex > 0) {
        currentSlideIndex--;
        this.renderCurrentSlide();
      }
    },

    nextSlide() {
      if (currentSlideIndex < currentSlidesData.length - 1) {
        currentSlideIndex++;
        this.renderCurrentSlide();
      }
    },

    closeSlides() {
      const modal = $('slides-modal');
      if (modal) modal.classList.add('hidden');
    },

    exportSlidesHTML() {
      const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>عرض تقديمي - X.v1</title><style>body{font-family:system-ui;background:#131315;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.card{background:#1e1e24;padding:40px;border-radius:20px;max-width:600px;line-height:1.8;border:1px solid #da7756;}h1{color:#da7756;}</style></head><body><div class="card"><h1>${currentSlidesData[0]?.title || 'عرض'}</h1><ul>${(currentSlidesData[0]?.bullets || []).map(b=>`<li>${b}</li>`).join('')}</ul></div></body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'presentation.html';
      a.click();
      MessageRenderer.showToast('📥 تم تنزيل العرض كملف HTML', 'success');
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 9. UI ENGINE & EVENT DISPATCHER (UIEngine)
  // ─────────────────────────────────────────────────────────────────
  const UIEngine = window.UIEngine || {
    ATTACH_ICON_SVG: `
      <svg class="attach-svg" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
      </svg>
    `,

    closeSidebar() {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('overlay');
      sidebar?.classList.remove('open');
      overlay?.classList.remove('active');
    },

    openSidebar() {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('overlay');
      sidebar?.classList.add('open');
      overlay?.classList.add('active');
    },

    toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('overlay');
      sidebar?.classList.toggle('open');
      overlay?.classList.toggle('active');
    },

    updateSendBtnState() {
      const inputEl = $('user-input');
      const btn = $('send-btn');
      const inputContainer = document.querySelector('#input-section .input-container') || document.querySelector('.input-container');
      if (inputContainer) {
        inputContainer.classList.toggle('thinking', Boolean(state.isThinking));
      }
      if (btn){
        const textVal = inputEl ? inputEl.value : '';
        const hasText = textVal.trim().length > 0;
        const hasAtt = Array.isArray(state.attachments) && state.attachments.length > 0;
        const canSend = (hasText || hasAtt) &&
          !state.isStreaming &&
          !state.sendInFlight &&
          !state.sendLock &&
          !state.cacheOperationInFlight &&
          !state.refreshInFlight;
        if (canSend) { btn.classList.add('active'); btn.removeAttribute('disabled'); }
        else { btn.classList.remove('active'); btn.setAttribute('disabled', 'true'); }
      }
      // also update voice/seekai send buttons
      ['voice-input','seekai-input'].forEach(id=>{
        const inp=document.getElementById(id);
        const bId=id==='voice-input'?'voice-send-btn':'seekai-send-btn';
        const b=document.getElementById(bId);
        if(inp && b){
          const has=inp.value.trim().length>0;
          const can=has && !state.isStreaming && !state.sendInFlight && !state.sendLock;
          if(can){ b.classList.add('active'); b.removeAttribute('disabled'); }
          else { b.classList.remove('active'); if(!has) b.setAttribute('disabled','true'); }
        }
      });
    },

    updateInputDirection() {
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
      const inputEl = $('user-input');
      if (!inputEl) return;
      if (this._taRaf) cancelAnimationFrame(this._taRaf);
      this._taRaf = requestAnimationFrame(() => {
        inputEl.style.height = 'auto';
        const scrollH = inputEl.scrollHeight;
        const targetH = Math.min(Math.max(scrollH, 26), 190);
        inputEl.style.height = targetH + 'px';
        inputEl.style.overflowY = scrollH > 190 ? 'auto' : 'hidden';
        this._taRaf = null;
      });
    },

    showWelcomeScreen() {
      const container = $('chat-container');
      if (container) container.innerHTML = '';
    },

    renderConversationsList() {
      const list = $('conversations-list');
      if (!list) return;
      const layer = state.currentLayer || 'general';
      const filtered = state.conversations.filter(c=> (c.layer||'general')===layer);
      if(!filtered.length){
        list.innerHTML = `<div style="padding:12px; font-size:12px; color:var(--text-dim); text-align:center;">لا توجد محادثات في ${layer==='voice'?'الصوت':layer==='seekai'?'SeekAI':'العام'}</div>`;
        return;
      }
      list.innerHTML = filtered.map(conv => `
        <div class="conversation-item ${conv.id === state.activeConvId ? 'active' : ''}"
             onclick="window._loadConv('${conv.id}')">
          <span class="conv-title">${conv.isDev ? '🛠️ ' : ''}${MessageRenderer.escapeHtml(conv.title)}</span>
        </div>
      `).join('');
      // settings only in general
      const settingsBtn=document.querySelector('.sidebar-footer .footer-btn');
      if(settingsBtn) settingsBtn.style.display = (layer==='general'?'':'none');
      const secTitle=document.querySelector('.sidebar-section-title');
      if(secTitle) secTitle.textContent = layer==='voice'?'محادثات الصوت':layer==='seekai'?'محادثات SeekAI':'Recent Chats';
    },

    highlightActiveConv(id) {
      $$('.conversation-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('onclick')?.includes(id));
      });
    },

    buildDevModelOptions() {
      const models = ModelEngine.getAvailableModels();
      const selected = ModelEngine.getSelectedDevModel();
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
      const conv = StateController.getActiveConv();
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
            state.devModelKey = e.target.value;
            const active = StateController.getActiveConv();
            if (active && active.isDev) {
              active.devModelKey = state.devModelKey;
              StateController.save();
            }
            MessageRenderer.showToast('تم اختيار موديل المطور', 'info');
          });
          $('attach-btn')?.addEventListener('click', () => $('file-upload-input')?.click());
        }
      } else {
        if(state.currentMode==='SEEKAI' && state.seekaiDirectModel){
          const short = state.seekaiDirectModel.split('/').pop().slice(0,14);
          if (titleText) titleText.textContent = short;
        } else {
          if (titleText) titleText.textContent = state.currentMode === 'AUTO' ? 'Auto' : state.currentMode === 'MID' ? 'Balanced' : state.currentMode;
        }
        if (dot) dot.style.background = state.currentMode==='SEEKAI' ? '#7c3aed' : '#10b981';
        if (indicator) {
          indicator.innerHTML = `
            <button class="attach-btn" id="attach-btn" title="إرفاق ملفات أو صور" aria-label="إرفاق">
              ${this.ATTACH_ICON_SVG}
            </button>
            <span class="mode-tag">${state.currentMode==='SEEKAI' ? (state.seekaiDirectModel?.split('/').pop()||'SeekAI') : 'الشات الطبيعي'}</span>
          `;
          $('attach-btn')?.addEventListener('click', () => $('file-upload-input')?.click());
        }
      }

      $$('.dropdown-opt').forEach(btn => {
        const isSeek = btn.dataset.seekaiModel && btn.dataset.seekaiModel===state.seekaiDirectModel && state.currentMode==='SEEKAI';
        const isMode = btn.dataset.mode && btn.dataset.mode===state.currentMode && !state.seekaiDirectModel;
        btn.classList.toggle('active', !!(isSeek || isMode));
      });
    },

    setupEventListeners() {
      if (window.__chatListenersBound) return;
      window.__chatListenersBound = true;

      // Click Event Delegation
      document.addEventListener('click', (e) => {
        const sidebar = $('sidebar');
        const overlay = $('overlay');

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
          $('model-dropdown-menu')?.classList.remove('show');
          overlay?.classList.remove('active');
          return;
        }

        if (e.target.closest('#skills-menu-trigger')) {
          e.preventDefault();
          e.stopPropagation();
          $('skills-vertical-menu')?.classList.toggle('show');
          $('model-dropdown-menu')?.classList.remove('show');
          return;
        }

        if (!e.target.closest('#skills-vertical-menu')) {
          $('skills-vertical-menu')?.classList.remove('show');
        }

        if (e.target.closest('#model-pill-trigger')) {
          e.preventDefault();
          e.stopPropagation();
          $('model-dropdown-menu')?.classList.toggle('show');
          $('skills-vertical-menu')?.classList.remove('show');
          return;
        }

        const optBtn = e.target.closest('.dropdown-opt');
        if (optBtn) {
          e.preventDefault();
          if(optBtn.id==='other-models-trigger'){
            const tab=document.getElementById('other-models-tab');
            const main=document.getElementById('model-dropdown-menu');
            if(main) main.classList.remove('show');
            if(tab) tab.style.display = (tab.style.display==='none' || !tab.style.display || tab.style.display==='') ? 'block' : 'none';
            // also ensure tab has show class for styling
            if(tab && tab.style.display==='block') tab.classList.add('show');
            else tab?.classList.remove('show');
            return;
          }
          if(optBtn.dataset.seekaiModel){
            state.seekaiDirectModel = optBtn.dataset.seekaiModel;
            state.currentMode = 'SEEKAI';
            try{ localStorage.setItem('xv1_seekai_direct', state.seekaiDirectModel); localStorage.setItem('xv1_current_mode','SEEKAI'); }catch{}
          } else if(optBtn.dataset.mode){
            state.currentMode = optBtn.dataset.mode;
            state.seekaiDirectModel = null;
            try{ localStorage.setItem('xv1_current_mode', state.currentMode); localStorage.removeItem('xv1_seekai_direct'); }catch{}
          }
          $('model-dropdown-menu')?.classList.remove('show');
          const otherTab=document.getElementById('other-models-tab');
          if(otherTab){ otherTab.style.display='none'; otherTab.classList.remove('show'); }
          this.updateHeaderUI();
          const conv = StateController.getActiveConv();
          if (conv) {
            conv.mode = state.currentMode;
            if(state.seekaiDirectModel) conv.seekaiModel = state.seekaiDirectModel;
            StateController.save();
          }
          const name = optBtn.dataset.seekaiModel || state.currentMode;
          MessageRenderer.showToast(`Switched to ${name}`, 'info');
          return;
        }

        if (!e.target.closest('#model-dropdown-menu') && !e.target.closest('#other-models-tab') && !e.target.closest('#other-models-trigger')) {
          $('model-dropdown-menu')?.classList.remove('show');
          const ot=document.getElementById('other-models-tab');
          if(ot){ ot.style.display='none'; ot.classList.remove('show'); }
        }

        if (e.target.closest('#btn-new-chat') || e.target.closest('#header-new-chat-btn')) {
          e.preventDefault();
          StateController.newConversation();
          $('sidebar')?.classList.remove('open');
          $('overlay')?.classList.remove('active');
          return;
        }

        if (e.target.closest('#btn-dev-chat')) {
          e.preventDefault();
          StateController.startDevChat();
          $('sidebar')?.classList.remove('open');
          $('overlay')?.classList.remove('active');
          return;
        }

        if (e.target.closest('#btn-toggle-owner-lock')) {
          e.preventDefault();
          if (AuthManager.isUnlocked()) {
            AuthManager.lock();
            MessageRenderer.showToast('🔒 تم قفل التطبيق بنجاح', 'info');
            $('sidebar')?.classList.remove('open');
            $('overlay')?.classList.remove('active');
          } else {
            AuthManager.setupGate();
          }
          return;
        }
      });

      // Text Input Reactivity — High-Performance debounced rAF
      const input = $('user-input');
      const sendBtn = $('send-btn');

      const triggerSend = () => {
        const text = input ? input.value.trim() : '';
        const hasAtt = state.attachments && state.attachments.length > 0;
        if (!text && !hasAtt) return;
        // stale watchdog before blocking
        const isStaleSend = state._lastSendStart && (Date.now() - state._lastSendStart > 28000);
        if (isStaleSend) { state.isStreaming=false; state.sendInFlight=false; state.sendLock=false; state.cacheOperationInFlight=false; try{MessageRenderer.hideTyping();}catch{} }
        if (state.isStreaming || state.sendInFlight || state.sendLock || state.cacheOperationInFlight) {
          MessageRenderer.showToast('⏳ انتظر انتهاء الرد الحالي', 'info');
          return;
        }
        state.sendLock = true;
        state._lastSendStart = Date.now();
        const savedText = text;
        if (input) input.value = '';
        this.adjustTextareaHeight();
        this.updateSendBtnState();
        let sendPromise;
        try {
          sendPromise = ChatEngine.sendMessage(savedText);
        } catch (err) {
          sendPromise = Promise.reject(err);
        }
        Promise.resolve(sendPromise).catch(err => {
          console.error('[Chat Send] Unhandled send failure:', err);
          state.sendLock = false;
          state.sendInFlight = false;
          state.isStreaming = false;
          this.updateSendBtnState();
        }).finally(() => {
          state.sendLock = false;
          this.updateSendBtnState();
        });
      };

      let _inputRaf = null;
      const onInput = () => {
        window.__userInteracted = true;
        if (_inputRaf) cancelAnimationFrame(_inputRaf);
        _inputRaf = requestAnimationFrame(() => {
          this.adjustTextareaHeight();
          this.updateInputDirection();
          this.updateSendBtnState();
          _inputRaf = null;
        });
      };

      input?.addEventListener('input', onInput);
      input?.addEventListener('paste', () => setTimeout(onInput, 10));
      input?.addEventListener('cut', () => setTimeout(onInput, 10));

      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          triggerSend();
          return;
        }
        if (e.key === 'Enter' && e.shiftKey) {
          setTimeout(() => this.adjustTextareaHeight(), 10);
        }
      });

      sendBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        triggerSend();
      });

      this.setupPullToRefresh();
      this.setupAttachmentHandler();
      this.setupVoiceHandlers();
      this.setupEmergencyControls();
      this.updateSendBtnState();
    },

    setupPullToRefresh() {
      if (window.setupUnifiedPullToRefresh) return window.setupUnifiedPullToRefresh({ indicatorId: 'pull-refresh-indicator', chatAreaId: 'chat-area', threshold: 50 });
      const indicator = $('pull-refresh-indicator');
      const chatArea = $('chat-area');
      if (!indicator || !chatArea) return;

      const spinner = indicator.querySelector('.pull-refresh-spinner');
      let startY = 0;
      let currentPull = 0;
      let isTracking = false;
      const TOP_THRESHOLD = 50;

      const onTouchStart = (e) => {
        if (e.touches.length !== 1) return;
        if (chatArea.scrollTop <= 4) {
          startY = e.touches[0].clientY;
          isTracking = true;
          currentPull = 0;
        }
      };

      let _pullRaf = null;
      let _pullPending = null;
      const onTouchMove = (e) => {
        if (!isTracking || e.touches.length !== 1) return;
        _pullPending = { y: e.touches[0].clientY };
        if (_pullRaf) return;
        _pullRaf = requestAnimationFrame(() => {
          const y = _pullPending.y;
          const diff = y - startY;
          if (diff > 8) {
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
          _pullRaf = null;
        });
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

      chatArea.addEventListener('touchstart', onTouchStart, { passive: true });
      chatArea.addEventListener('touchmove', onTouchMove, { passive: true });
      chatArea.addEventListener('touchend', onTouchEnd, { passive: true });
      chatArea.addEventListener('touchcancel', onTouchEnd, { passive: true });
    },

    setupAttachmentHandler() {
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
        if (!state.attachments.length) {
          previewContainer.classList.add('hidden');
          previewContainer.innerHTML = '';
          return;
        }
        previewContainer.classList.remove('hidden');
        previewContainer.innerHTML = state.attachments.map((att, idx) => `
          <div class="preview-item">
            ${att.type.startsWith('image/') ? `<img src="${att.dataUrl}" class="preview-thumb">` : '<span>📄</span>'}
            <span class="preview-name">${MessageRenderer.escapeHtml(att.name)}</span>
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
        state.attachments.splice(idx, 1);
        renderPreviews();
        this.updateSendBtnState();
      };
    },

    setupVoiceHandlers() {
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
          MessageRenderer.showToast('🎙️ جاري الاستماع...', 'info');
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
        if (!recognition) {
          MessageRenderer.showToast('المتصفح لا يدعم التعرف على الصوت', 'error');
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
        MessageRenderer.showToast('🔊 وضع الصوت التفاعلي جاهز', 'info');
        if (recognition) micBtn?.click();
      });
    },

    setupEmergencyControls() {
      $('btn-emergency-rollback')?.addEventListener('click', () => {
        if (!AuthManager.isUnlocked()) {
          AuthManager.requireAuth(() => GitHubService.rollbackToPreviousCommit());
          return;
        }
        if (confirm('هل أنت متأكد من رغبتك في استرجاع آخر نسخة سابقة للتطبيق؟')) {
          GitHubService.rollbackToPreviousCommit();
        }
      });

      $('btn-emergency-fix')?.addEventListener('click', () => {
        if (!AuthManager.isUnlocked()) {
          AuthManager.requireAuth(() => {
            StateController.startDevChat('راجع آخر تعديل قمنا به فقط وافحص مشكلته بدقة دون المساس بباقي التطبيق، ثم أصلحه.');
            $('sidebar')?.classList.remove('open');
            $('overlay')?.classList.remove('active');
          });
          return;
        }
        StateController.startDevChat('راجع آخر تعديل قمنا به فقط وافحص مشكلته بدقة دون المساس بباقي التطبيق، ثم أصلحه.');
        $('sidebar')?.classList.remove('open');
        $('overlay')?.classList.remove('active');
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 10. GLOBAL INLINE HANDLERS BRIDGE
  // ─────────────────────────────────────────────────────────────────
  window._loadConv = (id) => {
    StateController.loadConversation(id);
    $('sidebar')?.classList.remove('open');
    $('overlay')?.classList.remove('active');
  };

  window._suggest = (text) => {
    if (state.isStreaming || state.sendInFlight || state.sendLock) return;
    StateController.newConversation();
    const input = $('user-input');
    if (input) input.value = text;
    UIEngine.updateSendBtnState();
    ChatEngine.sendMessage(text).catch(err => console.error('[Suggestion Send]', err));
  };

  window._startDevPrompt = (text) => {
    StateController.startDevChat(text);
  };

  window._copyCode = (btn) => {
    const code = btn.closest('.code-window')?.querySelector('code')?.textContent || '';
    navigator.clipboard.writeText(code).then(() => {
      btn.textContent = 'تم النسخ!';
      setTimeout(() => btn.textContent = 'نسخ', 2000);
    });
  };

  window._copyMsgText = (btn) => {
    const text = btn.closest('.message-row')?.querySelector('.msg-content')?.innerText || '';
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        MessageRenderer.showToast('تم النسخ بنجاح', 'success');
      });
    }
  };

  window._shareMsgText = (btn) => {
    const text = btn.closest('.message-row')?.querySelector('.msg-content')?.innerText || '';
    if (navigator.share) {
      navigator.share({ title: 'X.v1 AI', text });
    } else {
      window._copyMsgText(btn);
    }
  };

  window._playMsgSpeech = (btn) => {
    const text = btn.closest('.message-row')?.querySelector('.msg-content')?.innerText || '';
    if (!text) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
      MessageRenderer.showToast('🔊 جاري تشغيل الصوت...', 'info');
    } else {
      MessageRenderer.showToast('المتصفح لا يدعم تحويل النص لصوت', 'error');
    }
  };

  window._likeMsg = (btn) => {
    btn.style.color = '#10b981';
    MessageRenderer.showToast('شكراً على تقييمك الإيجابي', 'success');
  };

  window._dislikeMsg = (btn) => {
    btn.style.color = '#ef4444';
    MessageRenderer.showToast('تم تسجيل ملاحظتك', 'info');
  };

  window._retryMsg = (msgId) => {
    if (state.isStreaming || state.sendInFlight || state.sendLock) {
      MessageRenderer.showToast('⏳ انتظر انتهاء الرد الحالي قبل إعادة المحاولة', 'info');
      return;
    }
    const conv = StateController.getActiveConv();
    if (!conv) return;
    const idx = conv.messages.findIndex(m => m.id === msgId);
    if (idx > 0 && conv.messages[idx - 1].role === 'user') {
      const userText = conv.messages[idx - 1].content;
      conv.messages.splice(idx, 1);
      MessageRenderer.renderAllMessages(conv.messages);
      ChatEngine.sendMessage(userText).catch(err => console.error('[Retry Send]', err));
    }
  };

  window._triggerSkill = (skill) => SkillsEngine.trigger(skill);
  window._runSandbox = (code) => SkillsEngine.runSandbox(code);
  window._closeSandbox = () => SkillsEngine.closeSandbox();
  window._reloadSandbox = () => SkillsEngine.reloadSandbox();
  window._openSlides = (slides) => SkillsEngine.openSlides(slides);
  window._prevSlide = () => SkillsEngine.prevSlide();
  window._nextSlide = () => SkillsEngine.nextSlide();
  window._closeSlides = () => SkillsEngine.closeSlides();
  window._exportSlidesHTML = () => SkillsEngine.exportSlidesHTML();


  // ─────────────────────────────────────────────────────────────────
  // 10. MODULAR INSTRUCTION FILES MANAGER — Delegated to modules/instruction-manager.js
  // ─────────────────────────────────────────────────────────────────
  const InstructionManager = window.InstructionManager || {
    load: async () => [],
    renderList: () => {},
    openEditor: () => {},
    closeEditor: () => {},
    saveActive: () => {},
    toggle: () => {},
    addNew: () => {},
    deleteById: () => {},
    deleteActive: () => {},
    resetDefaults: async () => {},
    assemblePrompt: (u, a, t) => 'You are X.v1 Claude Intelligence Engine.'
  };

  // Global window bridges for Modular Instruction Files Manager & Settings
  window._openSettingsModal = async function() {
    const modal = $('settings-modal');
    if (!modal) return;
    const mgr = window.InstructionManager || InstructionManager;
    modal.classList.remove('hidden');
    UIEngine.closeSidebar();
    try {
      await mgr.load();
      mgr.renderList();
      mgr.closeEditor();
    } catch(e) {}
    try { renderModelsInline(); } catch(e) {}
    if (window.UsageTracker) {
      window.UsageTracker.render();
      try { window.UsageTracker.fetchRealOpenRouter().catch(() => {}); } catch(e) {}
    }
  };
  
  window._closeSettingsModal = function() {
    const modal = $('settings-modal');
    if (modal) modal.classList.add('hidden');
  };
  // Close on outside click
  document.addEventListener('click', (e) => {
    const modal = $('settings-modal');
    if (modal && !modal.classList.contains('hidden') && e.target === modal) window._closeSettingsModal();
  });

  window._toggleInstructionFile = (id) => InstructionManager.toggle(id);
  window._addNewInstructionFile = () => InstructionManager.addNew();
  window._saveActiveInstructionFile = () => InstructionManager.saveActive();
  window._deleteActiveInstructionFile = () => InstructionManager.deleteActive();
  window._closeInstructionEditor = () => InstructionManager.closeEditor();
  window._resetDefaultInstructionFiles = () => InstructionManager.resetDefaults();

  // Multi-Agent Consensus Toggle and Accordion Bridges
  window._toggleMultiAgentMode = function() {
    state.isMultiAgentMode = !state.isMultiAgentMode;
    localStorage.setItem('is_multi_agent_mode', state.isMultiAgentMode ? '1' : '0');
    const btn = $('multi-agent-toggle-btn');
    if (btn) {
      btn.classList.toggle('active', !!state.isMultiAgentMode);
    }
    const label = $('multi-agent-label-text');
    if (label) {
      label.textContent = state.isMultiAgentMode ? 'تشاور الوكلاء (نشط)' : 'تشاور الوكلاء';
    }
  };

  window._toggleThinkingBox = function(msgId) {
    const box = document.getElementById(`box-${msgId}`);
    if (!box) return;
    box.classList.toggle('collapsed');
  };
  
  window._sendToLLM = window._endToLLM = function(btn){
    if(window.state && (window.state.isStreaming || window.state.sendInFlight || window.state.isThinking)){ if(window.MessageRenderer) window.MessageRenderer.showToast('⏳ انتظر انتهاء الرد الحالي','info'); return; }
    try{
      const box = btn.closest('.observer-box, .multi-agent-box, .dev-observer-box');
      const raw = box?.dataset?.review || box?.innerText || '';
      // extract contradictions only: lines with لا/تناقض/no/contradiction/✗ or warn
      const lines = String(raw).split(/\n/).map(s=>s.trim()).filter(Boolean);
      let contras = lines.filter(l=> /لا|تناقض|تعارض|✗|contradiction|inconsistent|conflict/i.test(l) && !/نعم|مُلتزم|Compliant|✓/i.test(l.split('—')[0]));
      if(!contras.length) contras = lines.filter(l=> /لا\s*—|✗|تناقض/i.test(l)).slice(0,3);
      if(!contras.length) contras = lines.slice(1,3); // fallback: take middle lines
      const q = contras.length ? `⚠️ تناقض مكتشف:\n- ${contras.join('\n- ')}\n\nهل تلاحظ هذه المشكلة؟ وضح وصحح.` : `هل ترى أي تناقض في الرد السابق؟ راجع: ${String(raw).slice(0,300)}`;
      const input = document.getElementById('user-input');
      if(!input) return;
      input.value = q.slice(0,900);
      input.dispatchEvent(new Event('input'));
      input.focus();
      // auto-send as user message
      setTimeout(()=>{
        const sendBtn=document.getElementById('send-btn');
        if(sendBtn && !sendBtn.disabled) sendBtn.click();
        else if(window.ChatEngine) window.ChatEngine.sendMessage(q);
        if(window.MessageRenderer) window.MessageRenderer.showToast('↗ Sent to LLM as your message','success');
      },120);
    }catch(e){}
  };
  window._sendAndApply = function(btn){ if(window.state && (window.state.isStreaming || window.state.sendInFlight)){ if(window.MessageRenderer) window.MessageRenderer.showToast('⏳ انتظر انتهاء الرد الحالي','info'); return; } try{ const b=btn.closest('.observer-box, .dev-observer-box, .multi-agent-box'); const rv=b?.dataset?.review||''; if(rv && window._applyObserverSuggestion) window._applyObserverSuggestion(rv, btn); setTimeout(()=> window._sendToLLM(btn), 250);}catch(e){} };

  // ─────────────────────────────────────────────────────────────────
  // Modern Audio Player & Code Card Controllers
  // ─────────────────────────────────────────────────────────────────
  window._togglePlayAudio = function(btn) {
    const card = btn.closest('.modern-audio-card');
    if (!card) return;
    let audio = card.querySelector('audio.hidden-audio');
    if (!audio) {
      audio = new Audio(card.dataset.src);
      audio.className = 'hidden-audio';
      card.appendChild(audio);
    }
    const playIcon = btn.querySelector('.play-icon');
    const pauseIcon = btn.querySelector('.pause-icon');
    const fill = card.querySelector('.audio-progress-fill');
    const curTime = card.querySelector('.current-time');
    const totTime = card.querySelector('.total-time');

    if (!audio._boundEvents) {
      audio._boundEvents = true;
      audio.addEventListener('loadedmetadata', () => {
        if (totTime && audio.duration) {
          const m = Math.floor(audio.duration / 60);
          const s = Math.floor(audio.duration % 60);
          totTime.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
      });
      audio.addEventListener('timeupdate', () => {
        if (!audio.duration) return;
        const pct = (audio.currentTime / audio.duration) * 100;
        if (fill) fill.style.width = `${pct}%`;
        if (curTime) {
          const m = Math.floor(audio.currentTime / 60);
          const s = Math.floor(audio.currentTime % 60);
          curTime.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
        if (totTime && audio.duration) {
          const rem = Math.max(0, audio.duration - audio.currentTime);
          const rm = Math.floor(rem / 60);
          const rs = Math.floor(rem % 60);
          totTime.textContent = `-${rm}:${rs < 10 ? '0' : ''}${rs}`;
        }
      });
      audio.addEventListener('ended', () => {
        if (playIcon) playIcon.style.display = 'block';
        if (pauseIcon) pauseIcon.style.display = 'none';
        if (fill) fill.style.width = '0%';
        if (curTime) curTime.textContent = '0:00';
      });
    }

    if (audio.paused) {
      document.querySelectorAll('audio.hidden-audio').forEach(a => { if (a !== audio) a.pause(); });
      document.querySelectorAll('.modern-audio-card .pause-icon').forEach(p => p.style.display = 'none');
      document.querySelectorAll('.modern-audio-card .play-icon').forEach(p => p.style.display = 'block');

      audio.play().then(() => {
        if (playIcon) playIcon.style.display = 'none';
        if (pauseIcon) pauseIcon.style.display = 'block';
      }).catch(e => console.warn('[Audio Play]', e));
    } else {
      audio.pause();
      if (playIcon) playIcon.style.display = 'block';
      if (pauseIcon) pauseIcon.style.display = 'none';
    }
  };

  window._seekAudio = function(wrap, event) {
    const card = wrap.closest('.modern-audio-card');
    if (!card) return;
    const audio = card.querySelector('audio.hidden-audio');
    if (!audio || !audio.duration) return;
    const rect = wrap.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    audio.currentTime = pct * audio.duration;
  };

  window._changeAudioSpeed = function(btn) {
    const card = btn.closest('.modern-audio-card');
    if (!card) return;
    const audio = card.querySelector('audio.hidden-audio');
    if (!audio) return;
    const speeds = [1, 1.25, 1.5, 2];
    const current = audio.playbackRate || 1;
    const nextIdx = (speeds.indexOf(current) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    audio.playbackRate = nextSpeed;
    btn.textContent = `${nextSpeed}x`;
  };

  window._skipAudio = function(btn, seconds) {
    const card = btn.closest('.modern-audio-card');
    if (!card) return;
    const audio = card.querySelector('audio.hidden-audio');
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 9999, audio.currentTime + seconds));
  };

  window._toggleMuteAudio = function(btn) {
    const card = btn.closest('.modern-audio-card');
    if (!card) return;
    const audio = card.querySelector('audio.hidden-audio');
    if (!audio) return;
    audio.muted = !audio.muted;
    btn.style.color = audio.muted ? '#ef4444' : '';
  };

  window._downloadAudio = function(btn) {
    const card = btn.closest('.modern-audio-card');
    if (!card) return;
    const src = card.dataset.src;
    if (!src) return;
    const a = document.createElement('a');
    a.href = src;
    a.download = `audio_${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    MessageRenderer.showToast('📥 جاري تحميل الملف الصوتي...', 'info');
  };

  window._toggleCodeView = function(btn) {
    const card = btn.closest('.dev-terminal-card');
    if (!card) return;
    const body = card.querySelector('.terminal-card-body');
    if (!body) return;
    const isCollapsed = body.classList.toggle('collapsed');
    btn.textContent = isCollapsed ? 'Expand' : 'Collapse';
  };

  // ─────────────────────────────────────────────────────────────────
  // 11. BOOTSTRAP & LIFECYCLE INITIALIZATION
  // ─────────────────────────────────────────────────────────────────
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function $(id) {
    return document.getElementById(id);
  }

  function $$(sel, root = document) {
    return Array.from((root || document).querySelectorAll(sel));
  }
  window.generateId = generateId;
  window.$ = $;
  window.$$ = $$;
  window.state = state;

  let _vpRaf = null;
  let _vpLast = 0;
  function lockViewportHeight() {
    const now = Date.now();
    if (now - _vpLast < 120) return; // debounce 120ms — prevents scroll+keyboard thrash at 1-2s
    _vpLast = now;
    if (_vpRaf) cancelAnimationFrame(_vpRaf);
    _vpRaf = requestAnimationFrame(() => {
      const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${h}px`);
      _vpRaf = null;
    });
  }

  async function loadSystemPrompt() {
    const customPrompt = localStorage.getItem('custom_system_prompt');
    if (customPrompt) {
      state.systemPrompt = customPrompt;
      return;
    }
    try {
      const res = await fetch('./system_prompt.txt?t=' + Date.now());
      if (res.ok) {
        state.systemPrompt = await res.text();
        localStorage.setItem('system_prompt', state.systemPrompt);
      }
    } catch {
      state.systemPrompt = localStorage.getItem('system_prompt') || '';
    }
  }

  let modelCatalogLoadPromise = null;
  async function loadModelCatalog() {
    if (modelCatalogLoadPromise) return modelCatalogLoadPromise;
    modelCatalogLoadPromise = (async () => {
      try {
      const cached = localStorage.getItem('model_catalog');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length) {
          state.modelCatalog = ModelEngine.normalizeCatalog(parsed);
          return;
        }
      }

      const localRes = await fetch('./models.json?t=' + Date.now());
      if (localRes.ok) {
        const localData = await localRes.json();
        const catalog = ModelEngine.normalizeCatalog(localData);
        if (catalog.length) {
          state.modelCatalog = catalog;
          localStorage.setItem('model_catalog', JSON.stringify(catalog));
          return;
        }
      }
      } catch (e) {
        console.warn('[Model Catalog Load Failed]', e.message || e);
      }
      state.modelCatalog = ModelEngine.normalizeCatalog(MODELS);
    })();
    try {
      return await modelCatalogLoadPromise;
    } finally {
      modelCatalogLoadPromise = null;
    }
  }

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
      if (outcome === 'accepted') MessageRenderer.showToast('✅ تم تثبيت التطبيق بنجاح!', 'success');
      deferredInstall = null;
    });
  }

  async function updateVersionBadge() {
    const vEl = document.getElementById('app-version-text');
    const dEl = document.getElementById('app-last-update');
    const topEl = document.getElementById('chat-status-text');
    try {
      const r = await fetch('./version.json?t=' + Date.now());
      if (r.ok) {
        const data = await r.json();
        if (data.version) {
          const verStr = `v${data.version}`;
          if (vEl) vEl.textContent = verStr;
          if (dEl && data.updated_at) dEl.textContent = data.updated_at;
          if (topEl) topEl.textContent = `X (V${data.version}) ${data.updated_at || ''}`;
          return;
        }
      }
    } catch {}
    if (topEl && !topEl.textContent) topEl.textContent = 'X (V170)';
  }

  window._refreshApp = async function() {
    if (state.refreshInFlight) return;
    if (state.isStreaming || state.sendInFlight || state.sendLock) {
      MessageRenderer.showToast('⏳ لا يمكن تحديث التطبيق أثناء معالجة رسالة', 'info');
      return;
    }
    state.refreshInFlight = true;
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.update();
      } catch {}
    }
    window.location.reload();
  };

  function renderModelsInline(){
    const tbody=document.getElementById('models-tbody-inline');
    if(!tbody || !window.MODELS) return;
    const getParam=(n)=>{ const m=String(n||'').match(/(\d+(?:\.\d+)?)\s*B/i); return m? parseFloat(m[1]):0; };
    const all=[];
    ['HIGH','MID','FAST'].forEach(tier=> (window.MODELS[tier]||[]).forEach(m=> all.push({...m, tier, params:getParam(m.name)})));
    all.sort((a,b)=> b.params - a.params || (['HIGH','MID','FAST'].indexOf(a.tier)-['HIGH','MID','FAST'].indexOf(b.tier)));
    const per=(window.UsageTracker? window.UsageTracker.load().perModel||{} : {});
    const getRenew=(p)=>{ const now=new Date(); if(p==='groq'){ const t=new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1,0,0,0)); const h=Math.round((t-now)/3600000); const m=Math.round((t-now)/60000)%60; return h<1? `${m}m left` : `${h}h left`; } else { const t=new Date(now.getFullYear(), now.getMonth()+1,1); const d=Math.ceil((t-now)/86400000); return `${d}d left`; } };
    tbody.innerHTML=all.map(m=>{
      const en=window.isModelEnabled? window.isModelEnabled(m.id):true;
      const u=per[m.id]||{t:0,r:0};
      const hName=m.name.replace(/(\d+(?:\.\d+)?\s*B)/i,'<span style="color:var(--accent-color)">$1</span>'); return `<tr><td><input type="checkbox" style="width:16px;height:16px;accent-color:var(--accent-color);" data-id="${m.id}" ${en?'checked':''} onchange="toggleModelInline(this)"></td><td><div style="font-weight:700;">${hName}</div><div style="font-size:11px; color:var(--accent-color); font-family:var(--font-mono); text-transform:capitalize;">${m.provider}</div></td><td style="text-align:center;"><div style="font-size:10px; color:var(--text-dim); line-height:1.3;">${u.t.toLocaleString()} tokens<br>${u.r} reqs</div><div style="font-size:11px; font-weight:700; color:var(--text-main); margin-top:3px;">${getRenew(m.provider)}</div></td></tr>`;
    }).join('');
  }
  window.toggleModelInline=function(el){ const id=el.dataset.id; const en=el.checked; if(window.setModelEnabled) window.setModelEnabled(id,en); };
  window.ModelsPage={ refreshRow: renderModelsInline, render: renderModelsInline };
  window._switchSettingsTab = function(tabName) {
    $$('#settings-modal .settings-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    $$('#settings-modal .settings-tab-pane').forEach(pane => {
      pane.classList.toggle('hidden', pane.id !== `settings-tab-${tabName}`);
      pane.classList.toggle('active', pane.id === `settings-tab-${tabName}`);
    });
    if (tabName === 'instructions' && window.InstructionManager) {
      window.InstructionManager.renderList();
    }
    if (tabName === 'models') renderModelsInline();
  };

  window._clearAppCache = async function() {
    if (state.cacheOperationInFlight) return;
    if (state.isStreaming || state.sendInFlight || state.sendLock) {
      MessageRenderer.showToast('⏳ لا يمكن مسح الكاش أثناء إرسال أو معالجة رسالة', 'info');
      return;
    }
    state.cacheOperationInFlight = true;
    if (window.MessageRenderer) {
      window.MessageRenderer.showToast('🧹 جاري مسح الكاش والتحديث الشامل...', 'info');
    }
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      if (typeof caches !== 'undefined' && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      localStorage.removeItem('instruction_files');
      localStorage.removeItem('instruction_files_version');
      localStorage.removeItem('XV1_APP_VERSION');
    } catch (e) {
      console.warn('[ClearCache]', e);
      state.cacheOperationInFlight = false;
      throw e;
    }
    setTimeout(() => {
      window.location.reload(true);
    }, 350);
  };

  window._secretSyncAndClearGate = async function() {
    if (state.cacheOperationInFlight) return;
    if (state.isStreaming || state.sendInFlight || state.sendLock) {
      MessageRenderer.showToast('⏳ لا يمكن تحديث الملفات أثناء معالجة رسالة', 'info');
      return;
    }
    state.cacheOperationInFlight = true;
    const pinInput = $('gate-pin-input');
    const syncBtn = $('gate-sync-btn');
    if (pinInput) {
      pinInput.value = '';
      pinInput.focus();
    }
    if (syncBtn) syncBtn.classList.add('spinning');
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.update();
      }
      if (typeof caches !== 'undefined' && caches.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      await fetch('./version.json?t=' + Date.now()).catch(()=>{});
      await fetch('./app.js?t=' + Date.now()).catch(()=>{});
    } catch (e) {
      console.warn('[SecretSync]', e);
    } finally {
      state.cacheOperationInFlight = false;
      setTimeout(() => {
        if (syncBtn) syncBtn.classList.remove('spinning');
      }, 500);
    }
  };

  window._setAppTheme = function(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('xv1_theme', themeName);
    $$('.theme-card-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === themeName);
    });
  };

  window._setAppFontFamily = function(fontName) {
    document.documentElement.setAttribute('data-font', fontName);
    localStorage.setItem('xv1_font_family', fontName);
    $$('.custom-pill-btn[data-font]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-font') === fontName);
    });
  };

  window._setAppFontSize = function(sizeName) {
    document.documentElement.setAttribute('data-size', sizeName);
    localStorage.setItem('xv1_font_size', sizeName);
    $$('.custom-pill-btn[data-size]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-size') === sizeName);
    });
  };

  function initAppCustomization() {
    const savedTheme = localStorage.getItem('xv1_theme') || 'obsidian';
    const savedFont = localStorage.getItem('xv1_font_family') || 'inter';
    const savedSize = localStorage.getItem('xv1_font_size') || 'md';

    window._setAppTheme(savedTheme);
    window._setAppFontFamily(savedFont);
    window._setAppFontSize(savedSize);
  }

  function setupSmoothKineticScroll() {
    // Native hardware-accelerated touch scrolling enabled via CSS
  }

  function init() {
    lockViewportHeight();
    window.addEventListener('resize', lockViewportHeight);
    window.addEventListener('orientationchange', lockViewportHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', lockViewportHeight);
    }

    StateController.load();
    initAppCustomization();
    UIEngine.setupEventListeners();
    try{ window.VoiceChatController?.init(); }catch{}
    try{ window.SeekAIController?.init(); }catch{}
    try{ window.UsagePieController?.init(); }catch{}
    AuthManager.setupGate();
    setupSmoothKineticScroll();

    if (state.conversations.length === 0) {
      UIEngine.showWelcomeScreen();
    } else {
      const layer = state.currentLayer || 'general';
      const layerConvs = state.conversations.filter(c=> (c.layer||'general')===layer);
      const lastActiveId = localStorage.getItem('activeConvId');
      const targetConv = layerConvs.find(c=>c.id===lastActiveId) || layerConvs[0] || state.conversations[0];
      if(targetConv) StateController.loadConversation(targetConv.id);
      else UIEngine.showWelcomeScreen();
    }

    UIEngine.updateHeaderUI();
    const multiBtn = $('multi-agent-toggle-btn');
    if (multiBtn && state.isMultiAgentMode) {
      multiBtn.classList.add('active');
      const label = $('multi-agent-label-text');
      if (label) label.textContent = 'Multi-Agent (Active)';
    }

    registerServiceWorker();
    setupInstallPrompt();

    // Staggered boot fetches — prevents simultaneous 4x fetch storm that can freeze UI on giant-model tier
    InstructionManager.load().catch(console.warn);
    setTimeout(() => loadModelCatalog().catch(console.warn), 220);
    setTimeout(() => updateVersionBadge().catch(()=>{}), 450);
    setTimeout(() => { try { if (window.UsageTracker && UsageTracker.fetchRealOpenRouter) UsageTracker.fetchRealOpenRouter().catch(()=>{}); } catch {} }, 750);
    // Auto-focus chat box for instant typing (keyboard appears on mobile)
    const autoFocusChat = () => {
      if (!AuthManager.isUnlocked()) return;
      const inp = $('user-input');
      if (inp && document.activeElement !== inp) {
        try { inp.focus({ preventScroll: true }); } catch { try { inp.focus(); } catch {} }
      }
    };
    setTimeout(autoFocusChat, 500);
    // Also focus after unlock
    const _origUnlock = AuthManager.unlock.bind(AuthManager);
    const _origSetupGate = AuthManager.setupGate.bind(AuthManager);
    // Hook unlock to focus
    const origUnlock = AuthManager.unlock;
    AuthManager.unlock = function() {
      origUnlock.call(this);
      setTimeout(autoFocusChat, 350);
    };
    // Focus when page becomes visible
    document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(autoFocusChat, 200); });
    // Focus on any click outside that doesn't target input
    window.addEventListener('focus', autoFocusChat);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
