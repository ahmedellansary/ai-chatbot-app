const CACHE_NAME = 'xv1-chat-v162';

// Install immediately
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Activate immediately & clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: NETWORK-FIRST for all assets to ensure INSTANT updates
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Bypass cache completely for AI & GitHub APIs
  if (url.hostname.includes('openrouter') ||
      url.hostname.includes('groq') ||
      url.hostname.includes('api.github') ||
      url.hostname.includes('elevenlabs')) {
    return;
  }

  // Network-First Strategy: always get fresh files from network first
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache ONLY if offline / network failed
        return caches.match(event.request);
      })
  );
});
