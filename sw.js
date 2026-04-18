const CACHE_NAME = 'pharmai-cache-v5';

const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './style.css',        // Removed the /css/ folder path
  './app.js',           // Removed the /js/ folder paths
  './auth.js',
  './cdss.js',
  './calculators.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block',
  'https://unpkg.com/tesseract.js@v2.1.0/dist/tesseract.min.js'
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
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
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache same-origin requests or specific external URLs
  if (!event.request.url.startsWith(self.location.origin) && !urlsToCache.includes(event.request.url)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) return response;
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        );
      })
  );
});
