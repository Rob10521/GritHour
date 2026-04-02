// After-Work Window — Service Worker
// Network-first strategy: always try to get fresh content, fall back to cache

const CACHE_NAME = 'afterwork-v1';
const ASSETS_TO_CACHE = [
  '/GritHour/',
  '/GritHour/index.html',
  '/GritHour/manifest.json',
  '/GritHour/icons/icon-192.png',
  '/GritHour/icons/icon-512.png'
];

// Install: cache shell assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for HTML (always get latest dashboard), cache-first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // For HTML pages, always try network first (we want fresh data)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh response
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline: serve from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // For other assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
