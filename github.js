// GitHub API helpers that do not ship with committed credentials.
const appConfig = window.AppConfig || {};
const getGitHubToken = appConfig.getGitHubToken || (() => {
  try {
    const runtimeConfig = (window && window.__APP_CONFIG__) || {};
    const runtimeValue = runtimeConfig.GITHUB_TOKEN;
    if (runtimeValue !== undefined && runtimeValue !== null && String(runtimeValue).trim()) {
      return String(runtimeValue).trim();
    }

    return (localStorage.getItem('GITHUB_TOKEN') || '').trim();
  } catch {
    return '';
  }
});

const GITHUB_USER = 'ahmedellansary';
const GITHUB_REPO = 'ai-chatbot-app';
const GITHUB_BRANCH = 'main';
const GITHUB_API = 'https://api.github.com';

const getGHHeaders = appConfig.getGitHubHeaders || (() => {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'AI-ChatBot-App'
  };

  const token = getGitHubToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
});

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

async function uploadFile(path, content, message = 'Update via AI Chat') {
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
    { method: 'PUT', headers: getGHHeaders(), body: JSON.stringify(body) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'فشل رفع الملف');
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
  const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
  return await uploadFile(path, content, `⏪ Rollback to ${commitSHA.slice(0, 7)}`);
}

export {
  uploadFile,
  getCommitHistory,
  rollbackFile,
  GITHUB_USER,
  GITHUB_REPO
};