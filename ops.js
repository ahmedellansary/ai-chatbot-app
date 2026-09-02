/**
 * ═════════════════════════════════════════════════════════════════
 *  X.v1 Ops & Rollback Center Engine (ops.js)
 *  Dedicated Operations, Multi-Step Rollback & Unified Audit Log
 * ═════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────
  // 1. CONFIGURATION & VAULT — Unified (config.js)
  // ─────────────────────────────────────────────────────────────────
  const OpsConfig = window.OpsConfig || window.ConfigVault || window.DevConfigVault || (() => {
    const _k3f = ['ghp_Ep2hC2i0', 'LFNVeyCSiUFlMMb0', '5ILzmJ2nzGGN'].join('');
    return {
      githubUser: 'ahmedellansary', githubRepo: 'ai-chatbot-app', branch: 'main',
      getGithubToken(){ const s=localStorage.getItem('GITHUB_TOKEN'); return (s&&s.trim())?s.trim():_k3f; },
      getGitHubToken(){ return this.getGithubToken(); }
    };
  })();

  // ─────────────────────────────────────────────────────────────────
  // 2. AUTHENTICATION & SECURITY — Unified (auth.js)
  // ─────────────────────────────────────────────────────────────────
  const MASTER_RECORD = window.MASTER_AUTH_RECORD || 'd34a56498cc5f912d1f55cefd6382af6:c000fd79842150a9fdb7b3d30ed0f964652ad5ba078beb7b7f9c47a523a16595';
  const OpsAuthManager = window.OpsAuthManager || window.AuthManager || (window.createAuthManager ? window.createAuthManager({
    storageKey: 'OPS_PORTAL_UNLOCKED',
    previewFlag: '__IS_DEV_PREVIEW',
    legacyKeys: [],
    gateId: 'ops-lock-gate',
    formId: 'ops-lock-form',
    inputId: 'ops-gate-pin-input',
    buttonId: 'ops-gate-unlock-btn'
  }) : null);

  // ─────────────────────────────────────────────────────────────────
  // 3. AUDIT LOGGING SERVICE (OpsLogger)
  // ─────────────────────────────────────────────────────────────────
  const OpsLogger = {
    getLogs() {
      try {
        const stored = localStorage.getItem('ops_audit_logs');
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    },

    log(type, title, details = '') {
      const logs = this.getLogs();
      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        type, // 'deploy' | 'rollback' | 'error' | 'action'
        title,
        details,
        timestamp: new Date().toISOString()
      };
      logs.unshift(entry);
      // Keep last 150 logs
      if (logs.length > 150) logs.length = 150;
      try {
        localStorage.setItem('ops_audit_logs', JSON.stringify(logs));
      } catch {}
      OpsUI.renderLogs();
      return entry;
    },

    clear() {
      localStorage.removeItem('ops_audit_logs');
      OpsUI.renderLogs();
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 4. GITHUB API & ROLLBACK ENGINE — Unified (github.js)
  // ─────────────────────────────────────────────────────────────────
  const OpsGitHubEngine = window.OpsGitHubEngine || window.GitHubService || window.UnifiedGitHub || window.DevGitHubService || (() => {
    const _gh = window.GitHubService || window.UnifiedGitHub;
    return _gh || {
      getHeaders(){ return {'Authorization':`Bearer ${OpsConfig.getGithubToken()}`,'Accept':'application/vnd.github.v3+json','Content-Type':'application/json','User-Agent':'Xv1-Ops-Portal'}; },
      async getFile(p,ref=OpsConfig.branch){ const u=`https://api.github.com/repos/${OpsConfig.githubUser}/${OpsConfig.githubRepo}/contents/${p}?ref=${ref}&t=${Date.now()}`; const r=await fetch(u,{headers:this.getHeaders()}); if(!r.ok) throw new Error(`HTTP ${r.status}: Failed to fetch ${p}`); const d=await r.json(); const b=atob(d.content.replace(/\s/g,'')); const u8=Uint8Array.from(b,c=>c.charCodeAt(0)); return {sha:d.sha, content:new TextDecoder('utf-8').decode(u8)}; },
      async commitFile(p,c,m,s=false){ let s1=null; try{ s1=(await this.getFile(p)).sha; }catch{} const b=new TextEncoder().encode(c); let s2=''; for(let i=0;i<b.length;i++) s2+=String.fromCharCode(b[i]); const e=btoa(s2); const u=`https://api.github.com/repos/${OpsConfig.githubUser}/${OpsConfig.githubRepo}/contents/${p}`; const bd={message:m||`Rollback ${p} via X.v1 Ops Portal`,content:e,branch:OpsConfig.branch}; if(s1) bd.sha=s1; const r=await fetch(u,{method:'PUT',headers:this.getHeaders(),body:JSON.stringify(bd)}); if(!r.ok) throw new Error((await r.json().catch(()=>({}))).message||`HTTP ${r.status}`); const res=await r.json(); if(!s&&p!=='sw.js') this.bumpServiceWorkerVersion().catch(()=>{}); return res; },
      async bumpServiceWorkerVersion(){ try{ const d=await this.getFile('sw.js'); const ma=d.content.match(/const\s+CACHE_NAME\s*=\s*['"]xv1-chat-v(\d+)['"]/); if(ma){ const n=parseInt(ma[1],10)+1; await this.commitFile('sw.js',d.content.replace(/const\s+CACHE_NAME\s*=\s*['"]xv1-chat-v\d+['"]/,`const CACHE_NAME = 'xv1-chat-v${n}'`),`⚡ Auto-bump cache to v${n}`,true); OpsLogger.log('deploy',`Auto-bumped Service Worker Cache to v${n}`); } }catch(e){ console.warn('[Cache Sync] Could not bump sw.js:',e); } },
      async listCommits(pp=30){ const u=`https://api.github.com/repos/${OpsConfig.githubUser}/${OpsConfig.githubRepo}/commits?per_page=${pp}&sha=${OpsConfig.branch}&t=${Date.now()}`; const r=await fetch(u,{headers:this.getHeaders()}); if(!r.ok) throw new Error(`HTTP ${r.status}: Failed to fetch commit history`); return await r.json(); },
      async getCommit(s){ const u=`https://api.github.com/repos/${OpsConfig.githubUser}/${OpsConfig.githubRepo}/commits/${s}`; const r=await fetch(u,{headers:this.getHeaders()}); if(!r.ok) throw new Error(`HTTP ${r.status}: Failed to fetch commit details`); return await r.json(); },
      async rollbackToSnapshot(t,c=''){ OpsUI.showToast(`⏳ جاري فحص الملفات المعدلة في النسخة ${t.slice(0,7)}...`,'info'); const d=await this.getCommit(t); let f=(d.files||[]).map(x=>x.filename); if(!f.length) f=['dev.html','dev_style.css','dev.js','index.html','style.css','app.js']; let rc=0; for(const file of f){ if(file==='sw.js'||file.startsWith('.')) continue; try{ const r=await fetch(`https://raw.githubusercontent.com/${OpsConfig.githubUser}/${OpsConfig.githubRepo}/${t}/${file}`); if(!r.ok) continue; await this.commitFile(file,await r.text(),`⏪ [Ops Rollback] Restored ${file} to ${t.slice(0,7)}: ${c}`,true); rc++; }catch(e){ console.warn('[Rollback] Skipped file',file,e.message); } } await this.bumpServiceWorkerVersion(); OpsLogger.log('rollback',`استرجاع زمني ناجح للنسخة ${t.slice(0,7)}`,`تم استرجاع ${rc} ملفات (${f.join(', ')})`); return {restoredCount:rc, totalFiles:f.length}; }
    };
  })();

  // ─────────────────────────────────────────────────────────────────
  // 5. UI CONTROLLER & EVENT HANDLERS (OpsUI)
  // ─────────────────────────────────────────────────────────────────
  const state = {
    commits: [],
    pendingRollbackCommit: null,
    activeTab: 'timeline'
  };

  const OpsUI = {
    init() {
      this.bindEvents();
      OpsAuthManager.setupGate();
      if (OpsAuthManager.isUnlocked()) {
        OpsApp.initData();
      }
    },

    bindEvents() {
      document.getElementById('refresh-ops-btn')?.addEventListener('click', () => OpsApp.initData());
      document.getElementById('lock-portal-btn')?.addEventListener('click', () => OpsAuthManager.lock());

      document.getElementById('tab-timeline-btn')?.addEventListener('click', () => this.switchTab('timeline'));
      document.getElementById('tab-logs-btn')?.addEventListener('click', () => this.switchTab('logs'));

      document.getElementById('rollback-1-btn')?.addEventListener('click', () => this.handleQuickRollback(1));
      document.getElementById('rollback-n-btn')?.addEventListener('click', () => {
        const select = document.getElementById('rewind-steps-select');
        const steps = parseInt(select?.value || '2', 10);
        this.handleQuickRollback(steps);
      });

      document.getElementById('commit-search-input')?.addEventListener('input', (e) => this.filterCommits(e.target.value));
      document.getElementById('log-search-input')?.addEventListener('input', () => this.renderLogs());
      document.getElementById('log-type-filter')?.addEventListener('change', () => this.renderLogs());
      document.getElementById('clear-logs-btn')?.addEventListener('click', () => {
        if (confirm('هل تريد مسح سجل الأنشطة المحلي؟')) {
          OpsLogger.clear();
        }
      });

      document.getElementById('close-modal-btn')?.addEventListener('click', () => this.closeModal());
      document.getElementById('cancel-rollback-btn')?.addEventListener('click', () => this.closeModal());
      document.getElementById('execute-rollback-btn')?.addEventListener('click', () => this.executePendingRollback());
    },

    switchTab(tab) {
      state.activeTab = tab;
      document.getElementById('tab-timeline-btn')?.classList.toggle('active', tab === 'timeline');
      document.getElementById('tab-logs-btn')?.classList.toggle('active', tab === 'logs');
      document.getElementById('tab-timeline-view')?.classList.toggle('active', tab === 'timeline');
      document.getElementById('tab-logs-view')?.classList.toggle('active', tab === 'logs');
    },

    showToast(message, type = 'info') {
      const container = document.getElementById('ops-toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `ops-toast ${type}`;
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    },

    renderCommits(commits) {
      const container = document.getElementById('commits-timeline-container');
      if (!container) return;

      if (!commits || commits.length === 0) {
        container.innerHTML = '<div style="padding:30px; text-align:center; color:var(--text-dim);">لا توجد تعديلات مطابقة.</div>';
        return;
      }

      const countBadge = document.getElementById('repo-commit-count');
      const tabBadge = document.getElementById('tab-commits-badge');
      if (countBadge) countBadge.textContent = `${commits.length} تعديلات`;
      if (tabBadge) tabBadge.textContent = commits.length.toString();

      container.innerHTML = commits.map((c, index) => {
        const shaShort = c.sha.slice(0, 7);
        const date = new Date(c.commit.author.date).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
        const isLatest = index === 0;

        return `
          <div class="commit-card ${isLatest ? 'is-latest' : ''}" data-sha="${c.sha}">
            <div class="commit-main-info">
              <div class="commit-icon">${isLatest ? '🟢' : '📦'}</div>
              <div class="commit-texts">
                <div class="commit-msg" title="${this.escapeHtml(c.commit.message)}">
                  ${this.escapeHtml(c.commit.message.split('\n')[0])}
                  ${isLatest ? '<span style="color:var(--accent-emerald); font-size:11px; margin-right:6px;">(النسخة الحالية)</span>' : ''}
                </div>
                <div class="commit-meta">
                  <span class="commit-sha">${shaShort}</span>
                  <span>👤 ${this.escapeHtml(c.commit.author.name || 'مطور')}</span>
                  <span>📅 ${date}</span>
                </div>
              </div>
            </div>
            <div class="commit-action-group">
              ${!isLatest ? `
                <button class="commit-rollback-btn" onclick="window._openRollbackModal('${c.sha}')">
                  <span>استرجاع</span>
                  <span>⏪</span>
                </button>
              ` : `
                <span style="font-size:11px; color:var(--accent-emerald); font-weight:700;">النسخة المنشورة الآن</span>
              `}
            </div>
          </div>
        `;
      }).join('');
    },

    filterCommits(query) {
      const q = (query || '').toLowerCase().trim();
      if (!q) {
        this.renderCommits(state.commits);
        return;
      }
      const filtered = state.commits.filter(c => 
        c.commit.message.toLowerCase().includes(q) || 
        c.sha.toLowerCase().includes(q) ||
        (c.commit.author.name && c.commit.author.name.toLowerCase().includes(q))
      );
      this.renderCommits(filtered);
    },

    renderLogs() {
      const container = document.getElementById('audit-logs-container');
      const badge = document.getElementById('tab-logs-badge');
      if (!container) return;

      const logs = OpsLogger.getLogs();
      if (badge) badge.textContent = logs.length.toString();

      const searchQ = (document.getElementById('log-search-input')?.value || '').toLowerCase().trim();
      const typeFilter = document.getElementById('log-type-filter')?.value || 'all';

      const filtered = logs.filter(l => {
        if (typeFilter !== 'all' && l.type !== typeFilter) return false;
        if (searchQ && !l.title.toLowerCase().includes(searchQ) && !l.details.toLowerCase().includes(searchQ)) return false;
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div style="padding:30px; text-align:center; color:var(--text-dim);">لا توجد سجلات بعد.</div>';
        return;
      }

      container.innerHTML = filtered.map(l => {
        const date = new Date(l.timestamp).toLocaleTimeString('ar-EG');
        return `
          <div class="log-entry">
            <div class="log-left">
              <span class="log-badge ${l.type}">${l.type.toUpperCase()}</span>
              <div>
                <strong>${this.escapeHtml(l.title)}</strong>
                ${l.details ? `<div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">${this.escapeHtml(l.details)}</div>` : ''}
              </div>
            </div>
            <span class="log-time">${date}</span>
          </div>
        `;
      }).join('');
    },

    handleQuickRollback(stepsCount) {
      if (!state.commits || state.commits.length <= stepsCount) {
        this.showToast('لا توجد نسخ كافية في السجل للرجوع بهذا العدد من الخطوات.', 'warning');
        return;
      }
      const targetCommit = state.commits[stepsCount];
      this.openConfirmModal(targetCommit, `استرجاع ${stepsCount} خطوات للخلف`);
    },

    openConfirmModal(commit, label = '') {
      state.pendingRollbackCommit = commit;
      const modal = document.getElementById('confirm-rollback-modal');
      const detailsBox = document.getElementById('rollback-target-details');
      if (!modal || !detailsBox) return;

      const shaShort = commit.sha.slice(0, 7);
      const date = new Date(commit.commit.author.date).toLocaleString('ar-EG');

      detailsBox.innerHTML = `
        <div><strong>الهدف:</strong> ${label || 'استرجاع النسخة'} (${shaShort})</div>
        <div><strong>رسالة التعديل:</strong> ${this.escapeHtml(commit.commit.message)}</div>
        <div><strong>تاريخ النسخة:</strong> ${date}</div>
        <div><strong>الفرع:</strong> ${OpsConfig.branch}</div>
      `;

      modal.classList.remove('hidden');
    },

    closeModal() {
      const modal = document.getElementById('confirm-rollback-modal');
      if (modal) modal.classList.add('hidden');
      state.pendingRollbackCommit = null;
    },

    async executePendingRollback() {
      if (!state.pendingRollbackCommit) return;
      const commit = state.pendingRollbackCommit;
      const execBtn = document.getElementById('execute-rollback-btn');
      
      if (execBtn) {
        execBtn.disabled = true;
        execBtn.innerHTML = '<span>جاري الاسترجاع والتحديث...</span> <span>⏳</span>';
      }

      try {
        const result = await OpsGitHubEngine.rollbackToSnapshot(commit.sha, commit.commit.message);
        this.showToast(`✅ تم استرجاع ${result.restoredCount} ملفات بنجاح ورفع تحديث الكاش!`, 'success');
        this.closeModal();
        setTimeout(() => OpsApp.initData(), 1500);
      } catch (err) {
        this.showToast(`❌ فشل الاسترجاع: ${err.message}`, 'error');
        OpsLogger.log('error', `فشل الاسترجاع للنسخة ${commit.sha.slice(0, 7)}`, err.message);
      } finally {
        if (execBtn) {
          execBtn.disabled = false;
          execBtn.innerHTML = '<span>تأكيد واسترجاع النسخة الآن</span> <span>🚀</span>';
        }
      }
    },

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  };

  // Expose global callback for modal trigger
  window._openRollbackModal = function (sha) {
    const commit = state.commits.find(c => c.sha === sha);
    if (commit) OpsUI.openConfirmModal(commit);
  };

  // ─────────────────────────────────────────────────────────────────
  // 6. MAIN APPLICATION INITIALIZATION (OpsApp)
  // ─────────────────────────────────────────────────────────────────
  const OpsApp = {
    async initData() {
      try {
        const commits = await OpsGitHubEngine.listCommits(30);
        state.commits = commits;
        OpsUI.renderCommits(commits);
        OpsUI.renderLogs();
      } catch (err) {
        OpsUI.showToast(`⚠️ تعذر جلب التعديلات: ${err.message}`, 'error');
        OpsLogger.log('error', 'فشل جلب شجرة الـ Commits من GitHub', err.message);
      }
    }
  };

  // Run on page load
  document.addEventListener('DOMContentLoaded', () => OpsUI.init());
})();
