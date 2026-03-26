// Minimal service worker for PWA installability and badge support on iOS.
// Caching strategies can be added later as needed.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
