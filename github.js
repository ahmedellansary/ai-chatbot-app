// ═══════════════════════════════════════════════════
//  AI CHAT — GitHub API Integration (Dev Mode)
// ═══════════════════════════════════════════════════

const GITHUB_TOKEN  = localStorage.getItem('GITHUB_TOKEN') || '';
const GITHUB_USER   = 'ahmedellansary';
const GITHUB_REPO   = 'ai-chatbot-app'; // Will be created automatically
const GITHUB_BRANCH = 'main';
const GITHUB_API    = 'https://api.github.com';

const GH_HEADERS = {
  'Authorization': `Bearer ${GITHUB_TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
  'User-Agent': 'AI-ChatBot-App'
};

// ─── Check / Create Repository ───
async function ensureRepo() {
  const res = await fetch(`${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}`, {
    headers: GH_HEADERS
  });

  if (res.ok) return true;

  // Repo doesn't exist — create it
  const createRes = await fetch(`${GITHUB_API}/user/repos`, {
    method: 'POST',
    headers: GH_HEADERS,
    body: JSON.stringify({
      name: GITHUB_REPO,
      description: 'AI Chatbot PWA — Self-modifying intelligent assistant',
      private: false,
      auto_init: true
    })
  });

  if (!createRes.ok) throw new Error('فشل إنشاء المستودع على GitHub');
  await new Promise(r => setTimeout(r, 2000)); // Wait for init
  return true;
}

// ─── Get File SHA (needed for updates) ───
async function getFileSHA(path) {
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
    { headers: GH_HEADERS }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha;
}

// ─── Upload / Update File ───
async function uploadFile(path, content, message = 'Update via AI Chat Dev Mode') {
  const sha = await getFileSHA(path);
  const encoded = btoa(unescape(encodeURIComponent(content)));

  const body = {
    message,
    content: encoded,
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`,
    { method: 'PUT', headers: GH_HEADERS, body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'فشل رفع الملف');
  }
  return await res.json();
}

// ─── Get File Content ───
async function getFile(path) {
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
    { headers: GH_HEADERS }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
}

// ─── Get Commit History (for Rollback) ───
async function getCommitHistory(path, limit = 10) {
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/commits?path=${path}&per_page=${limit}`,
    { headers: GH_HEADERS }
  );
  if (!res.ok) return [];
  return await res.json();
}

// ─── Restore File to Previous Commit ───
async function rollbackFile(path, commitSHA) {
  // Get file content at that commit
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}?ref=${commitSHA}`,
    { headers: GH_HEADERS }
  );
  if (!res.ok) throw new Error('فشل استرجاع النسخة السابقة');
  const data = await res.json();
  const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));

  // Upload as new commit (rollback)
  return await uploadFile(path, content, `⏪ Rollback to ${commitSHA.slice(0, 7)}`);
}

// ─── Batch Upload All App Files ───
async function pushAllFiles(files) {
  await ensureRepo();
  const results = [];
  for (const [path, content] of Object.entries(files)) {
    try {
      const result = await uploadFile(path, content, '🚀 Initial deploy from AI Chat');
      results.push({ path, success: true });
    } catch (err) {
      results.push({ path, success: false, error: err.message });
    }
  }
  return results;
}

// ─── Get GitHub Pages URL ───
async function enableGitHubPages() {
  // Enable Pages on main branch root
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/pages`,
    {
      method: 'POST',
      headers: GH_HEADERS,
      body: JSON.stringify({ source: { branch: GITHUB_BRANCH, path: '/' } })
    }
  );
  // Returns 201 (created) or 409 (already enabled)
  const data = await res.json().catch(() => ({}));
  return data.html_url || `https://${GITHUB_USER}.github.io/${GITHUB_REPO}/`;
}

export {
  ensureRepo,
  uploadFile,
  getFile,
  getCommitHistory,
  rollbackFile,
  pushAllFiles,
  enableGitHubPages,
  GITHUB_USER,
  GITHUB_REPO
};
