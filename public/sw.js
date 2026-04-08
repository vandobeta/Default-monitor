const CACHE_NAME = 'unlockpro-wasm-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  // In a real app, you would cache the compiled WASM binaries and FDL payloads here
  // '/wasm/exploit_engine.wasm',
  // '/payloads/fdl1.bin',
  // '/payloads/fdl2.bin'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // For API requests, try network first, then fallback to cache (or just network)
  if (event.request.url.includes('/api/')) {
    return; // Let API requests pass through to the network
  }

  // Cache-first strategy for static assets and WASM payloads
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
