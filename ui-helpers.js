// ═════════════════════════════════════════════════════════════════
//  X.v1 Unified UI Helpers — Single Source of Truth (Phase 2 Refactor)
//  Replaces duplicated showToast / setupPullToRefresh across 3 apps
// ═════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── Unified Toast ──
  function showToast(message, type = 'info') {
    // Try chat container
    let container = document.getElementById('toast-container');
    // Try ops container
    if (!container) container = document.getElementById('ops-toast-container');
    if (!container) return;

    // Remove existing toasts to prevent stacking
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const toast = document.createElement('div');
    const isOps = container.id === 'ops-toast-container';
    toast.className = isOps ? `ops-toast ${type}` : `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    const duration = type === 'error' ? 3500 : 2500;
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => { try { toast.remove(); } catch {} }, 300);
    }, duration);
  }

  // ── Unified Pull-to-Refresh (Top only) ──
  function setupPullToRefresh(opts = {}) {
    const indicatorId = opts.indicatorId || 'pull-refresh-indicator';
    const chatAreaId = opts.chatAreaId || 'chat-area';
    const onRefresh = opts.onRefresh || null;
    const indicator = document.getElementById(indicatorId);
    if (!indicator) return;
    const spinner = indicator.querySelector('.pull-refresh-spinner');
    let startY = 0, currentPull = 0, isTracking = false;
    const TOP_THRESHOLD = opts.threshold || 50;

    const onTouchStart = (e) => {
      if (e.touches.length !== 1) return;
      const chatArea = document.getElementById(chatAreaId);
      if (!chatArea) return;
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
        if (e.cancelable) e.preventDefault();
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
        if (typeof onRefresh === 'function') {
          onRefresh();
        } else {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
              for (const r of regs) r.update().catch(() => {});
            }).catch(() => {});
          }
          setTimeout(() => location.reload(), 320);
        }
      } else {
        indicator.classList.remove('visible', 'refreshing');
        indicator.style.opacity = '0';
        indicator.style.transform = 'translate3d(-50%, -80px, 0) scale(0.85)';
        if (spinner) spinner.style.transform = '';
      }
      currentPull = 0;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  // Expose
  window.UnifiedToast = { showToast };
  window.showToast = showToast;
  window.setupUnifiedPullToRefresh = setupPullToRefresh;
  window.UnifiedPullToRefresh = { setup: setupPullToRefresh };
})();
