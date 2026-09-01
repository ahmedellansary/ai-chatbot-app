// ==========================================
// SECURE PREVIEW SYSTEM - AUTO AUTH
// ==========================================

const PREVIEW_AUTH_KEY = 'xv1_preview_auth';
const PREVIEW_AUTH_TTL = 30 * 60 * 1000;

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function isPreviewAuthenticated() {
    try {
        const auth = JSON.parse(sessionStorage.getItem(PREVIEW_AUTH_KEY) || 'null');
        if (!auth) return false;
        if (Date.now() - auth.timestamp > PREVIEW_AUTH_TTL) {
            sessionStorage.removeItem(PREVIEW_AUTH_KEY);
            return false;
        }
        return auth.validated === true;
    } catch { return false; }
}

function setPreviewAuthenticated() {
    sessionStorage.setItem(PREVIEW_AUTH_KEY, JSON.stringify({
        validated: true,
        timestamp: Date.now()
    }));
}

const EXPECTED_PASSWORD_HASH = 'YOUR_HASH_HERE';

async function openPreview() {
    if (isPreviewAuthenticated()) {
        await launchPreviewWindow();
        return;
    }
    const password = prompt('🔐 أدخل كلمة السر للمعاينة:');
    if (!password) return;
    const inputHash = await hashPassword(password);
    if (inputHash === EXPECTED_PASSWORD_HASH) {
        setPreviewAuthenticated();
        await launchPreviewWindow();
    } else {
        alert('❌ كلمة السر غير صحيحة');
        sessionStorage.removeItem(PREVIEW_AUTH_KEY);
    }
}

async function launchPreviewWindow() {
    try {
        const code = window.editor?.getValue() || '';
        const fileName = document.getElementById('currentFileName')?.textContent || 'preview.html';
        const previewHTML = buildPreviewHTML(code, fileName);
        const previewWindow = window.open('', '_blank', 'width=1200,height=800');
        if (!previewWindow) { alert('⚠️ يرجى السماح بالنوافذ المنبثقة'); return; }
        previewWindow.document.write(previewHTML);
        previewWindow.document.close();
    } catch (err) {
        console.error('Preview error:', err);
        alert('❌ حدث خطأ أثناء فتح المعاينة');
    }
}

function buildPreviewHTML(code, fileName) {
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>معاينة: ${fileName}</title><style>body{margin:0;padding:0;background:#0d0d10;color:#fff}iframe{width:100vw;height:100vh;border:none}</style></head><body><iframe sandbox="allow-scripts allow-same-origin" srcdoc="${code.replace(/"/g, '&quot;')}"></iframe></body></html>`;
}

document.addEventListener('DOMContentLoaded', () => {
    const previewBtn = document.getElementById('previewBtn') || document.querySelector('[onclick*="preview"]') || document.querySelector('.preview-btn');
    if (previewBtn) previewBtn.addEventListener('click', openPreview);
});
