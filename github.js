// ═══════════════════════════════════════════════════
//  X.v1 — GitHub API Service Module (ESM)
// ═══════════════════════════════════════════════════

const _k3 = ['ghp_Ep2hC2i0', 'LFNVeyCSiUFlMMb0', '5ILzmJ2nzGGN'].join('');

const getGitHubToken = () => {
  const k = (typeof window !== 'undefined' && window.AppConfig && window.AppConfig.getGitHubToken && window.AppConfig.getGitHubToken()) ||
            (typeof localStorage !== 'undefined' ? localStorage.getItem('GITHUB_TOKEN') : null);
  return (k && k.trim()) ? k.trim() : _k3;
};

const GITHUB_USER   = 'ahmedellansary';
const GITHUB_REPO   = 'ai-chatbot-app';
const GITHUB_BRANCH = 'main';
const GITHUB_API    = 'https://api.github.com';

const getGHHeaders = () => ({
  'Authorization': `Bearer ${getGitHubToken()}`,
  'Accept': 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
  'User-Agent': 'X.v1-ChatBot-App'
});

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUtf8(b64) {
  const binary = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function getFileSHA(path) {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}&t=${Date.now()}`,
      { headers: getGHHeaders() }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.sha;
  } catch {
    return null;
  }
}

async function uploadFile(path, content, message = 'Update via X.v1 AI') {
  const sha = await getFileSHA(path);
  const encoded = utf8ToBase64(content);

  const body = {
    message,
    content: encoded,
    branch: GITHUB_BRANCH
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`,
    { method: 'PUT', headers: getGHHeaders(), body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'فشل رفع الملف إلى GitHub');
  }
  return await res.json();
}

async function getCommitHistory(limit = 10) {
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/commits?per_page=${limit}&t=${Date.now()}`,
    { headers: getGHHeaders() }
  );
  if (!res.ok) return [];
  return await res.json();
}

async function rollbackFile(path, commitSHA) {
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}?ref=${commitSHA}`,
    { headers: getGHHeaders() }
  );
  if (!res.ok) throw new Error('فشل استرجاع النسخة السابقة');
  const data = await res.json();
  const content = base64ToUtf8(data.content);
  return await uploadFile(path, content, `⏪ Rollback to ${commitSHA.slice(0, 7)}`);
}

export {
  uploadFile,
  getCommitHistory,
  rollbackFile,
  GITHUB_USER,
  GITHUB_REPO,
  utf8ToBase64,
  base64ToUtf8
};