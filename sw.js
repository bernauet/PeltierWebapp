const CACHE_NAME = 'peltier-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // We don't cache anything by default for real-time control to prevent stale logic.
  event.respondWith(fetch(event.request));
});
