// ═════════════════════════════════════════════════════════════════
//  X.v1 Usage Tracker — Extracted Module (Phase 3 Refactor)
//  Handles real OpenRouter credits + local Groq tracking
// ═════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const UsageTracker = {
    key: 'xv1_usage_stats',
    load() {
      try { return JSON.parse(localStorage.getItem(this.key) || 'null') || { or: {t:0,r:0}, groq: {t:0,r:0}, lastModel: '', lastAt: '' }; } catch { return { or: {t:0,r:0}, groq: {t:0,r:0}, lastModel: '', lastAt: '' }; }
    },
    save(d) { try { localStorage.setItem(this.key, JSON.stringify(d)); } catch {} },
    estimateTokens(text) { return Math.ceil((text||'').length / 3.5); },
    record(modelName, provider, promptText, completionText) {
      const d = this.load();
      const pt = this.estimateTokens(promptText);
      const ct = this.estimateTokens(completionText);
      const tot = pt + ct;
      const p = provider === 'openrouter' ? 'or' : 'groq';
      d[p].t += tot; d[p].r += 1;
      d.lastModel = modelName || p;
      d.lastAt = new Date().toISOString();
      this.save(d);
      this.render();
    },
    async fetchRealOpenRouter() {
      const el = document.getElementById('or-sub');
      try {
        const cfg = window.ConfigVault;
        const key = cfg ? cfg.getOpenRouterKey() : (localStorage.getItem('OPENROUTER_API_KEY') || '');
        const r = await fetch('https://openrouter.ai/api/v1/credits', { headers: { 'Authorization': `Bearer ${key}` } });
        if (!r.ok) throw new Error();
        const j = await r.json();
        const data = j.data || j;
        const used = data.total_usage ?? data.totalUsage ?? 0;
        const credits = data.total_credits ?? data.totalCredits ?? 0;
        if (el) el.textContent = `الرصيد: ${Number(credits).toFixed(2)} | المستهلك: ${Number(used).toFixed(3)}`;
        const d = this.load();
        if (used) d.or.t = Math.round(used * 1000);
        this.save(d); this.render();
      } catch { if (el) el.textContent = 'بيانات محلية (لا يمكن جلب الحقيقي)'; }
    },
    render() {
      const d = this.load();
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v.toLocaleString('en-US'); };
      set('or-tokens', d.or.t); set('or-reqs', d.or.r);
      set('groq-tokens', d.groq.t); set('groq-reqs', d.groq.r);
      const lm = document.getElementById('usage-last-model'); if (lm) lm.textContent = d.lastModel ? `آخر: ${d.lastModel}` : '—';
      const gs = document.getElementById('groq-sub'); if (gs) gs.textContent = d.lastModel ? `آخر موديل: ${d.lastModel}` : 'بانتظار أول طلب';
    }
  };

  window.UsageTracker = UsageTracker;
})();
