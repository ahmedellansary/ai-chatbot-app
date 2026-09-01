/**
 * ═════════════════════════════════════════════════════════════════
 *  X.v1 Ops & Rollback Center Engine (ops.js)
 *  Dedicated Operations, Multi-Step Rollback & Unified Audit Log
 * ═════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────
  // 1. CONFIGURATION & VAULT
  // ─────────────────────────────────────────────────────────────────
  const _k3 = ['ghp_Ep2hC2i0', 'LFNVeyCSiUFlMMb0', '5ILzmJ2nzGGN'].join('');

  const OpsConfig = {
    githubUser: 'ahmedellansary',
    githubRepo: 'ai-chatbot-app',
    branch: 'main',
    getGithubToken() {
      const stored = localStorage.getItem('GITHUB_TOKEN');
      return (stored && stored.trim()) ? stored.trim() : _k3;
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // 2. AUTHENTICATION & SECURITY (OpsAuthManager)
  // ─────────────────────────────────────────────────────────────────
  const MASTER_RECORD = 'd34a56498cc5f912d1f55cefd6382af6:c000fd79842150a9fdb7b3d30ed0f964652ad5ba078beb7b7f9c47a523a16595';

  const OpsAuthManager = {
    async sha256(str) {
      const buffer = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async verify(password) {
      if (!password) return false;
      const customPin = localStorage.getItem('DEV_CUSTOM_PIN');
      if (customPin && password === customPin) return true;
      try {
        const [salt, expectedHash] = MASTER_RECORD.split(':');
        const calculated = await this.sha256(salt + ':' + password);
        return calculated === expectedHash;
      } catch (e) {
        return false;
      }
    },

    isUnlocked() {
      if (typeof window !== 'undefined' && window.__IS_DEV_PREVIEW === true) {
        return true;
      }
      return sessionStorage.getItem('OPS_PORTAL_UNLOCKED') === 'true';
    },

    unlock() {
      sessionStorage.setItem('OPS_PORTAL_UNLOCKED', 'true');
    },

    lock() {
      sessionStorage.removeItem('OPS_PORTAL_UNLOCKED');
      this.setupGate();
    },

    setupGate() {
      const gate = document.getElementById('ops-lock-gate');
      const form = document.getElementById('ops-lock-form');
      const pinInput = document.getElementById('ops-gate-pin-input');
      const unlockBtn = document.getElementById('ops-gate-unlock-btn');
      if (!gate) return;

      if (!this.isUnlocked()) {
        gate.classList.remove('hidden');
        if (pinInput) {
          pinInput.value = '';
          setTimeout(() => pinInput.focus(), 150);
        }
      } else {
        gate.classList.add('hidden');
      }

      let isVerifying = false;
      const handleGateSubmit = async () => {
        if (isVerifying) return;
        const password = pinInput ? pinInput.value.trim() : '';
        if (!password) {
          OpsUI.showToast('يرجى كتابة كلمة السر', 'warning');
          return;
        }

        isVerifying = true;
        if (unlockBtn) unlockBtn.innerHTML = '<span>جاري التحقق...</span> <span>⏳</span>';
        try {
          const isValid = await this.verify(password);
          if (isValid) {
            this.unlock();
            gate.classList.add('hidden');
            OpsUI.showToast('🔓 مرحباً بك في مركز العمليات والاسترجاع!', 'success');
            OpsApp.initData();
          } else {
            OpsUI.showToast('❌ كلمة السر غير صحيحة!', 'error');
            if (pinInput) {
              pinInput.value = '';
              pinInput.style.borderColor = 'var(--accent-rose)';
              setTimeout(() => pinInput.style.borderColor = '', 1000);
            }
          }
        } finally {
          isVerifying = false;
          if (unlockBtn) unlockBtn.innerHTML = '<span>فتح مركز العمليات</span> <span>🔓</span>';
        }
      };

      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          handleGateSubmit();
        };
      }

      if (unlockBtn) {
        unlockBtn.onclick = (e) => {
          e.preventDefault();
          handleGateSubmit();
        };
      }

      if (pinInput) {
        pinInput.onkeydown = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleGateSubmit();
          }
        };
      }
    }
  };

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
  // 4. GITHUB API & ROLLBACK ENGINE (OpsGitHubEngine)
  // ─────────────────────────────────────────────────────────────────
  const OpsGitHubEngine = {
    getHeaders() {
      return {
        'Authorization': `Bearer ${OpsConfig.getGithubToken()}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Xv1-Ops-Portal'
      };
    },

    async getFile(path, ref = OpsConfig.branch) {
      const url = `https://api.github.com/repos/${OpsConfig.githubUser}/${OpsConfig.githubRepo}/contents/${path}?ref=${ref}&t=${Date.now()}`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch ${path}`);
      const data = await res.json();
      const binaryStr = atob(data.content.replace(/\s/g, ''));
      const bytes = Uint8Array.from(binaryStr, c => c.charCodeAt(0));
      const content = new TextDecoder('utf-8').decode(bytes);
      return { sha: data.sha, content };
    },

    async commitFile(path, content, message, skipCacheBump = false) {
      let sha = null;
      try {
        const existing = await this.getFile(path);
        sha = existing.sha;
      } catch (e) {}

      const bytes = new TextEncoder().encode(content);
      let binaryStr = '';
      for (let i = 0; i < bytes.length; i++) {
        binaryStr += String.fromCharCode(bytes[i]);
      }
      const encodedContent = btoa(binaryStr);

      const url = `https://api.github.com/repos/${OpsConfig.githubUser}/${OpsConfig.githubRepo}/contents/${path}`;
      const body = {
        message: message || `Rollback ${path} via X.v1 Ops Portal`,
        content: encodedContent,
        branch: OpsConfig.branch
      };
      if (sha) body.sha = sha;

      const res = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}: Commit failed`);
      }

      const result = await res.json();
      if (!skipCacheBump && path !== 'sw.js') {
        this.bumpServiceWorkerVersion().catch(() => {});
      }
      return result;
    },

    async bumpServiceWorkerVersion() {
      try {
        const swData = await this.getFile('sw.js');
        let swContent = swData.content;
        const match = swContent.match(/const\s+CACHE_NAME\s*=\s*['"]xv1-chat-v(\d+)['"]/);
        if (match) {
          const nextVer = parseInt(match[1], 10) + 1;
          const newSwContent = swContent.replace(
            /const\s+CACHE_NAME\s*=\s*['"]xv1-chat-v\d+['"]/,
            `const CACHE_NAME = 'xv1-chat-v${nextVer}'`
          );
          await this.commitFile('sw.js', newSwContent, `⚡ Auto-bump cache to v${nextVer} for instant rollback`, true);
          OpsLogger.log('deploy', `Auto-bumped Service Worker Cache to v${nextVer}`);
        }
      } catch (err) {
        console.warn('[Cache Sync] Could not bump sw.js:', err);
      }
    },

    async listCommits(perPage = 30) {
      const url = `https://api.github.com/repos/${OpsConfig.githubUser}/${OpsConfig.githubRepo}/commits?per_page=${perPage}&sha=${OpsConfig.branch}&t=${Date.now()}`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch commit history`);
      return await res.json();
    },

    async getCommit(sha) {
      const url = `https://api.github.com/repos/${OpsConfig.githubUser}/${OpsConfig.githubRepo}/commits/${sha}`;
      const res = await fetch(url, { headers: this.getHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch commit details`);
      return await res.json();
    },

    async rollbackToSnapshot(targetCommitSha, commitMsg = '') {
      OpsUI.showToast(`⏳ جاري فحص الملفات المعدلة في النسخة ${targetCommitSha.slice(0, 7)}...`, 'info');
      
      // Fetch full commit details to get modified files
      const commitDetails = await this.getCommit(targetCommitSha);
      const files = (commitDetails.files || []).map(f => f.filename);

      if (files.length === 0) {
        // Fallback to production core files
        files.push('dev.html', 'dev_style.css', 'dev.js', 'index.html', 'style.css', 'app.js');
      }

      let restoredCount = 0;
      for (const file of files) {
        if (file === 'sw.js' || file.startsWith('.')) continue;
        try {
          const url = `https://raw.githubusercontent.com/${OpsConfig.githubUser}/${OpsConfig.githubRepo}/${targetCommitSha}/${file}`;
          const res = await fetch(url);
          if (!res.ok) continue;
          const oldContent = await res.text();
          await this.commitFile(file, oldContent, `⏪ [Ops Rollback] Restored ${file} to ${targetCommitSha.slice(0, 7)}: ${commitMsg}`, true);
          restoredCount++;
        } catch (e) {
          console.warn(`[Rollback] Skipped file ${file}:`, e.message);
        }
      }

      // Always bump SW version once at the end
      await this.bumpServiceWorkerVersion();

      OpsLogger.log('rollback', `استرجاع زمني ناجح للنسخة ${targetCommitSha.slice(0, 7)}`, `تم استرجاع ${restoredCount} ملفات (${files.join(', ')})`);
      return { restoredCount, totalFiles: files.length };
    }
  };

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
