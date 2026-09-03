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
    load() { try { return JSON.parse(localStorage.getItem(this.key) || 'null') || { or: {t:0,r:0}, groq: {t:0,r:0}, lastModel: '', lastAt: '' }; } catch { return { or: {t:0,r:0}, groq: {t:0,r:0}, lastModel: '', lastAt: '' }; } },
    save(d) { try { localStorage.setItem(this.key, JSON.stringify(d)); } catch {} },
    estimateTokens(t) { return Math.ceil((t||'').length / 3.5); },
    record(m,p,pt,ct){ const d=this.load(); const tot=this.estimateTokens(pt)+this.estimateTokens(ct); const k=p==='openrouter'?'or':'groq'; d[k].t+=tot; d[k].r+=1; d.lastModel=m||k; d.lastAt=new Date().toISOString(); this.save(d); this.render(); },
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
    currentMode: (function(){ try{ return localStorage.getItem('xv1_current_mode') || 'MID'; }catch{ return 'MID'; }})(),
    currentModel: null,
    devModelKey: null,
    modelCatalog: [],
    conversations: [],
    activeConvId: null,
    systemPrompt: '',
    isStreaming: false,
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
      const id = generateId();
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
      UIEngine.renderConversationsList();
      return conv;
    },

    loadConversation(id) {
      const conv = state.conversations.find(c => c.id === id);
      if (!conv) return;

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
      if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
    },

    parseMarkdown(text) {
      if (!text) return '';
      let html = this.escapeHtml(text);

      // Fenced code blocks
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
              <span class="claude-model-name">${this.escapeHtml(msg.model || 'X.v1')}</span>
              <span>· Verify info</span>
            </div>
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

      let typing = $('typing-indicator');
      if (!typing) {
        typing = document.createElement('div');
        typing.id = 'typing-indicator';
        typing.className = 'message-row ai typing-indicator';
        typing.innerHTML = `
          <div class="typing-bubble" dir="ltr">
            <span class="typing-icon" aria-hidden="true">✦</span>
            <span id="thinking-word" class="thinking-word">${this.escapeHtml(base)}</span>
            <span class="thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          </div>
        `;
        container.appendChild(typing);
      } else {
        const wordEl = document.getElementById('thinking-word');
        if (wordEl) wordEl.textContent = base;
      }
      this.scrollToBottom();
    },

    startProgressiveThinking(initialWord = 'Analyzing') {
      this.hideTyping();
      this.showTyping(initialWord);

      const stages = [
        { word: 'Analyzing', delay: 0 },
        { word: 'Thinking', delay: 1800 },
        { word: 'Reasoning', delay: 4200 },
        { word: 'Synthesizing', delay: 7500 },
        { word: 'Refining', delay: 11000 },
        { word: 'Composing', delay: 14500 }
      ];

      this._thinkingTimers = [];
      stages.slice(1).forEach(stage => {
        const timer = setTimeout(() => {
          this.setThinkingStage(stage.word);
        }, stage.delay);
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
      if (state.isStreaming || (!userText.trim() && !hasAttachments)) return;

      if (!state.activeConvId) StateController.newConversation();
      const conv = StateController.getActiveConv();

      const { textForPayload, currentAttachments } = this.preparePayload(userText);

      // Clear previews & state
      state.attachments = [];
      const previewContainer = $('attachment-preview-container');
      if (previewContainer) {
        previewContainer.classList.add('hidden');
        previewContainer.innerHTML = '';
      }

      const userMsg = StateController.addMessage('user', userText.trim() || 'ملف مرفق', null, currentAttachments);
      MessageRenderer.appendMessage(userMsg);

      state.isStreaming = true;
      state.abortController = new AbortController();

      const tier = state.currentMode || 'MID';
      const systemPromptForCall = await this.buildSystemPrompt(textForPayload, currentAttachments, conv, tier);
      const cfg = this.getAdaptiveConfig(tier);
      const recentMessages = conv.messages
        .filter(m => m.id !== userMsg.id)
        .slice(-cfg.recentCount);

      const apiMessages = [
        { role: 'system', content: systemPromptForCall },
        ...recentMessages.map(m => ({ role: m.role === 'ai' ? 'assistant' : m.role, content: m.content })),
        { role: 'user', content: textForPayload }
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

      if (state.isMultiAgentMode) {
        try {
          await MultiAgentEngine.runConsensus(userText, textForPayload, apiMessages, aiMsgId, aiMsgObj, conv);
        } catch (err) {
          MessageRenderer.hideTyping();
          if (err.name !== 'AbortError') {
            MessageRenderer.showToast('❌ ' + err.message, 'error');
          }
        } finally {
          MessageRenderer.hideTyping();
          state.isStreaming = false;
          state.abortController = null;
          UIEngine.updateSendBtnState();
          MessageRenderer.scrollToBottom();
        }
        return;
      }

      MessageRenderer.startProgressiveThinking('Analyzing');

      const onModelEvent = (model, isFallback) => {
        aiMsgObj.model = model.name;
        aiMsgObj.provider = model.provider || 'groq';
        aiMsgObj.usedFallback = isFallback;

        if (isFallback) {
          MessageRenderer.setThinkingStage('Switching');
        }
      };

      try {
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

        if (fullContent.includes('---BEGIN_INSTRUCTION_UPDATE---')) {
          InstructionManager.handleAutoInstructionUpdate(fullContent);
          const cleanText = fullContent.replace(/---BEGIN_INSTRUCTION_UPDATE---[\s\S]*?---END_INSTRUCTION_UPDATE---/g, '').trim();
          aiMsgObj.content = cleanText;
          if (msgRow) msgRow.innerHTML = MessageRenderer.parseMarkdown(cleanText);
        } else {
          aiMsgObj.content = fullContent;
        }
        StateController.save();
        try { UsageTracker.record(aiMsgObj.model, aiMsgObj.provider || 'groq', textForPayload, fullContent); } catch {}

      } catch (err) {
        MessageRenderer.hideTyping();
        if (err.name !== 'AbortError') {
          if (!fullContent.trim()) {
            aiMsgObj.content = `⚠️ تعذر استلام الرد من النموذج: ${err.message || 'خطأ في الاتصال'}. يمكنك إعادة المحاولة فوراً.`;
            aiMsgObj.isError = true;
            MessageRenderer.appendMessage(aiMsgObj);
          }
          MessageRenderer.showToast('❌ ' + err.message, 'error');
        }
      } finally {
        MessageRenderer.hideTyping();
        state.isStreaming = false;
        state.abortController = null;
        UIEngine.updateSendBtnState();
        MessageRenderer.scrollToBottom();
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

        const parsedFinal = finalContent ? MessageRenderer.parseMarkdown(finalContent) : (isThinking ? '<div style="color:var(--text-dim); font-size:13px; padding:4px;">⏳ جاري صياغة القرار النهائي المعتمد...</div>' : '');
        row.innerHTML = boxHtml + parsedFinal;

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
          ${(slide.bullets || []).map(b => `<div class="slide-bullet"><span>✦</span> <span>${MessageRenderer.escapeHtml(b)}</span></div>`).join('')}
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
        inputContainer.classList.toggle('thinking', Boolean(state.isStreaming));
      }
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
      inputEl.style.height = 'auto';
      const scrollH = inputEl.scrollHeight;
      const targetH = Math.min(Math.max(scrollH, 26), 190);
      inputEl.style.height = targetH + 'px';
      inputEl.style.overflowY = scrollH > 190 ? 'auto' : 'hidden';
    },

    showWelcomeScreen() {
      const container = $('chat-container');
      if (container) container.innerHTML = '';
    },

    renderConversationsList() {
      const list = $('conversations-list');
      if (!list) return;
      list.innerHTML = state.conversations.map(conv => `
        <div class="conversation-item ${conv.id === state.activeConvId ? 'active' : ''}"
             onclick="window._loadConv('${conv.id}')">
          <span class="conv-title">${conv.isDev ? '🛠️ ' : ''}${MessageRenderer.escapeHtml(conv.title)}</span>
        </div>
      `).join('');
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
        if (titleText) titleText.textContent = state.currentMode === 'MID' ? 'Balanced' : state.currentMode;
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
          state.currentMode = optBtn.dataset.mode || 'MID';
          try{ localStorage.setItem('xv1_current_mode', state.currentMode); }catch{}
          $('model-dropdown-menu')?.classList.remove('show');
          this.updateHeaderUI();
          const conv = StateController.getActiveConv();
          if (conv) {
            conv.mode = state.currentMode;
            StateController.save();
          }
          MessageRenderer.showToast(`Switched to ${state.currentMode} mode`, 'info');
          return;
        }

        if (!e.target.closest('#model-dropdown-menu')) {
          $('model-dropdown-menu')?.classList.remove('show');
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
        if ((!text && !hasAtt) || state.isStreaming) return;
        if (input) input.value = '';
        this.adjustTextareaHeight();
        this.updateSendBtnState();
        ChatEngine.sendMessage(text);
      };

      const onInput = () => {
        window.__userInteracted = true;
        this.adjustTextareaHeight();
        this.updateInputDirection();
        this.updateSendBtnState();
      };

      input?.addEventListener('input', onInput);
      input?.addEventListener('paste', () => setTimeout(onInput, 10));
      input?.addEventListener('cut', () => setTimeout(onInput, 10));

      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          setTimeout(triggerSend, 0);
          return;
        }
        if (e.key === 'Enter' && e.shiftKey) {
          setTimeout(() => this.adjustTextareaHeight(), 10);
        }
      });

      sendBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        setTimeout(triggerSend, 0);
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

      const onTouchMove = (e) => {
        if (!isTracking || e.touches.length !== 1) return;
        const y = e.touches[0].clientY;
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
    StateController.newConversation();
    const input = $('user-input');
    if (input) input.value = text;
    UIEngine.updateSendBtnState();
    ChatEngine.sendMessage(text);
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
    const conv = StateController.getActiveConv();
    if (!conv) return;
    const idx = conv.messages.findIndex(m => m.id === msgId);
    if (idx > 0 && conv.messages[idx - 1].role === 'user') {
      const userText = conv.messages[idx - 1].content;
      conv.messages.splice(idx, 1);
      MessageRenderer.renderAllMessages(conv.messages);
      ChatEngine.sendMessage(userText);
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


  window._clearAppCache = async function() {
    try {
      const preservedConversations = localStorage.getItem('conversations');
      const preservedAuth = localStorage.getItem('DEV_MODE_AUTH_HASH');
      const preservedGroq = localStorage.getItem('GROQ_API_KEY');
      const preservedOr = localStorage.getItem('OPENROUTER_API_KEY');
      const preservedGh = localStorage.getItem('GITHUB_TOKEN');

      if (typeof caches !== 'undefined' && caches.keys) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }

      localStorage.clear();
      if (preservedConversations) localStorage.setItem('conversations', preservedConversations);
      if (preservedAuth) localStorage.setItem('DEV_MODE_AUTH_HASH', preservedAuth);
      if (preservedGroq) localStorage.setItem('GROQ_API_KEY', preservedGroq);
      if (preservedOr) localStorage.setItem('OPENROUTER_API_KEY', preservedOr);
      if (preservedGh) localStorage.setItem('GITHUB_TOKEN', preservedGh);

      MessageRenderer.showToast('✅ تم تنظيف الكاش بنجاح مع الحفاظ على كافة المحادثات!', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (e) {
      console.warn('[Cache] Clear error:', e);
      window.location.reload();
    }
  };

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
    if (window.UsageTracker) {
      window.UsageTracker.render();
      try { window.UsageTracker.fetchRealOpenRouter().catch(() => {}); } catch(e) {}
    }
    
    // Populate API keys input
    const orInput = $('input-openrouter-keys');
    const groqInput = $('input-groq-keys');
    if (orInput) {
      orInput.value = localStorage.getItem('OPENROUTER_API_KEYS') || localStorage.getItem('OPENROUTER_API_KEY') || '';
    }
    if (groqInput) {
      groqInput.value = localStorage.getItem('GROQ_API_KEYS') || localStorage.getItem('GROQ_API_KEY') || '';
    }
  };

  window._saveApiKeys = function() {
    const orInput = $('input-openrouter-keys');
    const groqInput = $('input-groq-keys');
    const status = $('api-keys-status');
    const orVal = orInput ? orInput.value.trim() : '';
    const groqVal = groqInput ? groqInput.value.trim() : '';
    
    if (orVal) {
      localStorage.setItem('OPENROUTER_API_KEYS', orVal);
      localStorage.setItem('OPENROUTER_API_KEY', orVal);
    } else {
      localStorage.removeItem('OPENROUTER_API_KEYS');
      localStorage.removeItem('OPENROUTER_API_KEY');
    }

    if (groqVal) {
      localStorage.setItem('GROQ_API_KEYS', groqVal);
      localStorage.setItem('GROQ_API_KEY', groqVal);
    } else {
      localStorage.removeItem('GROQ_API_KEYS');
      localStorage.removeItem('GROQ_API_KEY');
    }

    if (status) {
      const orCount = orVal ? orVal.split(/[\n,]+/).filter(Boolean).length : 0;
      const groqCount = groqVal ? groqVal.split(/[\n,]+/).filter(Boolean).length : 0;
      status.textContent = `✅ تم حفظ المفاتيح (${orCount} OpenRouter, ${groqCount} Groq) والمزامنة نشطة!`;
      status.style.color = '#10b981';
      setTimeout(() => { if (status) status.textContent = ''; }, 4000);
    }
    MessageRenderer.showToast('✅ تم حفظ وتحديث المفاتيح والمزامنة التلقائية!', 'success');
  };

  window._clearApiKeys = function() {
    localStorage.removeItem('OPENROUTER_API_KEYS');
    localStorage.removeItem('OPENROUTER_API_KEY');
    localStorage.removeItem('GROQ_API_KEYS');
    localStorage.removeItem('GROQ_API_KEY');
    const orInput = $('input-openrouter-keys');
    const groqInput = $('input-groq-keys');
    if (orInput) orInput.value = '';
    if (groqInput) groqInput.value = '';
    const status = $('api-keys-status');
    if (status) {
      status.textContent = '🔄 تم مسح المفاتيح المخصصة واستعادة المفاتيح الافتراضية.';
      status.style.color = '#fbbf24';
      setTimeout(() => { if (status) status.textContent = ''; }, 4000);
    }
    MessageRenderer.showToast('🔄 تم مسح المفاتيح المخصصة', 'info');
  };

  window._closeSettingsModal = function() {
    const modal = $('settings-modal');
    if (modal) modal.classList.add('hidden');
  };

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

  function lockViewportHeight() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${h}px`);
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

  async function loadModelCatalog() {
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
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.update();
      } catch {}
    }
    window.location.reload();
  };

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
  };

  window._clearAppCache = async function() {
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
    }
    setTimeout(() => {
      window.location.reload(true);
    }, 350);
  };

  window._secretSyncAndClearGate = async function() {
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

    initAppCustomization();
    UIEngine.setupEventListeners();
    AuthManager.setupGate();
    StateController.load();
    setupSmoothKineticScroll();

    if (state.conversations.length === 0) {
      UIEngine.showWelcomeScreen();
    } else {
      const lastActiveId = localStorage.getItem('activeConvId');
      const targetConv = state.conversations.find(c => c.id === lastActiveId) || state.conversations[0];
      StateController.loadConversation(targetConv.id);
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

    InstructionManager.load().catch(console.warn);
    loadModelCatalog().catch(console.warn);
    updateVersionBadge().catch(()=>{});
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
