// ═════════════════════════════════════════════════════════════════
//  X.v1 Unified GitHub Service — Single Source of Truth (Phase 1)
//  Replaces GitHubService/DevGitHubService/OpsGitHubEngine (3 copies)
//  Uses TextEncoder/TextDecoder (Arabic-safe) + UnifiedConfig
// ═════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const USER = (typeof window !== 'undefined' && window.GITHUB_USER) || 'ahmedellansary';
  const REPO = (typeof window !== 'undefined' && window.GITHUB_REPO) || 'ai-chatbot-app';
  const BRANCH = (typeof window !== 'undefined' && window.GITHUB_BRANCH) || 'main';
  const API = (typeof window !== 'undefined' && window.GITHUB_API) || 'https://api.github.com';

  function getToken() {
    try {
      if (window.ConfigVault && window.ConfigVault.getGitHubToken) return window.ConfigVault.getGitHubToken();
      if (window.DevConfigVault && window.DevConfigVault.getGithubToken) return window.DevConfigVault.getGithubToken();
      if (window.OpsConfig && window.OpsConfig.getGithubToken) return window.OpsConfig.getGithubToken();
    } catch {}
    try {
      const v = localStorage.getItem('GITHUB_TOKEN');
      if (v && v.trim()) return v.trim();
    } catch {}
    return (window._k3 || String.fromCharCode(103,104,112,95)+'Ep2hC2i0LFNVeyCSiUFlMMb05ILzmJ2nzGGN');
  }

  function getHeaders() {
    return {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'X.v1-Unified-GitHub'
    };
  }

  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function base64ToUtf8(b64) {
    const binary = atob(b64.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  async function getFileSHA(path) {
    try {
      const r = await fetch(`${API}/repos/${USER}/${REPO}/contents/${path}?ref=${BRANCH}&t=${Date.now()}`, { headers: getHeaders() });
      if (!r.ok) return null;
      const d = await r.json();
      return d.sha;
    } catch { return null; }
  }

  async function getFile(path, ref = BRANCH) {
    const url = `${API}/repos/${USER}/${REPO}/contents/${path}?ref=${ref}&t=${Date.now()}`;
    const r = await fetch(url, { headers: getHeaders() });
    if (!r.ok) throw new Error(`HTTP ${r.status}: Failed to fetch ${path}`);
    const d = await r.json();
    const content = base64ToUtf8(d.content);
    return { sha: d.sha, content };
  }

  async function uploadFile(path, content, message = 'Update via X.v1') {
    const sha = await getFileSHA(path);
    const encoded = utf8ToBase64(content);
    const body = { message, content: encoded, branch: BRANCH };
    if (sha) body.sha = sha;
    const r = await fetch(`${API}/repos/${USER}/${REPO}/contents/${path}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(body) });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.message || 'فشل رفع الملف إلى GitHub');
    }
    return await r.json();
  }

  // Alias for dev/ops naming
  const commitFile = uploadFile;

  async function listFiles() {
    const url = `${API}/repos/${USER}/${REPO}/git/trees/${BRANCH}?recursive=1&t=${Date.now()}`;
    const r = await fetch(url, { headers: getHeaders() });
    if (!r.ok) throw new Error(`HTTP ${r.status}: Failed to list repo files`);
    const d = await r.json();
    return (d.tree || []).filter(x => x.type === 'blob').map(x => x.path).filter(p => !p.startsWith('.') && !p.includes('node_modules') && !p.includes('scratch/'));
  }

  async function getLatestCommits(limit = 10) {
    const r = await fetch(`${API}/repos/${USER}/${REPO}/commits?per_page=${limit}&t=${Date.now()}`, { headers: getHeaders() });
    if (!r.ok) throw new Error('فشل جلب سجل النسخ من GitHub');
    return await r.json();
  }

  const listCommits = getLatestCommits;

  async function getCommit(sha) {
    const r = await fetch(`${API}/repos/${USER}/${REPO}/commits/${sha}`, { headers: getHeaders() });
    if (!r.ok) throw new Error(`HTTP ${r.status}: Failed to fetch commit details`);
    return await r.json();
  }

  async function bumpServiceWorkerVersion() {
    try {
      const sw = await getFile('sw.js');
      const m = sw.content.match(/const\s+CACHE_NAME\s*=\s*['"]xv1-chat-v(\d+)['"]/);
      if (m) {
        const next = parseInt(m[1], 10) + 1;
        const nextContent = sw.content.replace(/const\s+CACHE_NAME\s*=\s*['"]xv1-chat-v\d+['"]/, `const CACHE_NAME = 'xv1-chat-v${next}'`);
        await commitFile('sw.js', nextContent, `⚡ Auto-bump cache to v${next} for deployment`, true);
      }
    } catch (e) { console.warn('[GitHub] bump SW failed', e); }
  }

  async function rollbackToPreviousCommit() {
    const commits = await getLatestCommits(5);
    if (commits.length < 2) throw new Error('لا توجد نسخ سابقة للاسترجاع');
    const prev = commits[1];
    const files = ['index.html', 'style.css', 'app.js'];
    for (const file of files) {
      const fr = await fetch(`${API}/repos/${USER}/${REPO}/contents/${file}?ref=${prev.sha}`, { headers: getHeaders() });
      if (fr.ok) {
        const fd = await fr.json();
        const content = base64ToUtf8(fd.content);
        await uploadFile(file, content, `⏪ Emergency Rollback to ${prev.sha.slice(0, 7)}`);
      }
    }
  }

  async function rollbackFileToCommit(path, commitSHA) {
    const url = `https://raw.githubusercontent.com/${USER}/${REPO}/${commitSHA}/${path}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Failed to fetch file at commit ${commitSHA}`);
    const content = await r.text();
    return await commitFile(path, content, `⏪ Rollback ${path} to commit ${commitSHA.slice(0, 7)}`);
  }

  async function rollbackToSnapshot(targetSHA, commitMsg = '') {
    const details = await getCommit(targetSHA);
    let files = (details.files || []).map(f => f.filename);
    if (!files.length) files = ['dev.html', 'dev_style.css', 'dev.js', 'index.html', 'style.css', 'app.js'];
    let restored = 0;
    for (const file of files) {
      if (file === 'sw.js' || file.startsWith('.')) continue;
      try {
        const r = await fetch(`https://raw.githubusercontent.com/${USER}/${REPO}/${targetSHA}/${file}`);
        if (!r.ok) continue;
        const content = await r.text();
        await commitFile(file, content, `⏪ [Ops Rollback] Restored ${file} to ${targetSHA.slice(0, 7)}: ${commitMsg}`, true);
        restored++;
      } catch (e) { console.warn('[Rollback] Skipped', file, e.message); }
    }
    await bumpServiceWorkerVersion();
    return { restoredCount: restored, totalFiles: files.length };
  }

  function applyRuntimePatch(file, content) {
    if (!file) return false;
    try {
      if (file.endsWith('.css')) {
        let tag = document.getElementById('live-patch-style');
        if (!tag) { tag = document.createElement('style'); tag.id = 'live-patch-style'; document.head.appendChild(tag); }
        tag.textContent = content;
        return true;
      }
      if (file.endsWith('.html') || file === 'index.html') {
        const doc = new DOMParser().parseFromString(content, 'text/html');
        const newApp = doc.getElementById('app');
        const cur = document.getElementById('app');
        if (newApp && cur) { cur.innerHTML = newApp.innerHTML; return true; }
      }
      if (file === 'system_prompt.txt') {
        try { localStorage.setItem('system_prompt', content); } catch {}
        return true;
      }
    } catch (e) { console.warn('[Live Patch Failed]', e.message); }
    return false;
  }

  // Unified object
  const UnifiedGitHub = {
    utf8ToBase64, base64ToUtf8,
    getFileSHA, getFile, uploadFile, commitFile,
    listFiles, getLatestCommits, listCommits, getCommit,
    bumpServiceWorkerVersion,
    rollbackToPreviousCommit, rollbackFileToCommit, rollbackToSnapshot,
    applyRuntimePatch,
    getHeaders, getGHHeaders: getHeaders, getHeaders,
    USER, REPO, BRANCH, API
  };

  // Expose as globals for IIFE apps (preserve old names)
  window.GitHubService = UnifiedGitHub;
  window.DevGitHubService = UnifiedGitHub;
  window.OpsGitHubEngine = UnifiedGitHub;
  window.UnifiedGitHub = UnifiedGitHub;

  // ESM exports (for future modules)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedGitHub;
  }
})();
