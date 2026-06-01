/* Minimal service worker so admin PWA can satisfy installability (Chrome). */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  /* Network-only — required for install prompt eligibility. */
});
