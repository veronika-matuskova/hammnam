// Source template: scripts/build.mjs writes dist/sw.js with CACHE_NAME and APP_SHELL filled in from
// content hashes of the built files. Do not edit the two generated lines below by hand.
const CACHE_NAME = 'ham-mnam-shell-dev'; // generated: CACHE_NAME
const APP_SHELL = []; // generated: APP_SHELL

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // cache: 'reload' bypasses the HTTP cache, so unhashed files (index.html, manifest, icons)
      // are fetched fresh and match the hashed assets of this build.
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('ham-mnam-shell-') && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Third-party requests (Supabase REST) always go straight to the network and are never cached.
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations, falling back to the precached index.html of this build.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first for the precached app shell (CSS/JS filenames are content-hashed).
  event.respondWith(
    caches.match(request).then((cachedResponse) => cachedResponse || fetch(request))
  );
});
