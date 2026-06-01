/* Admin-only service worker (scope /admin) for optional PWA install on Android. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  /* Pass-through — do not cache Next.js assets. */
});
