const CACHE_NAME = 'toeic-vocab-cache-v2';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './js/vocab.js',
  './js/store.js',
  './js/audio.js',
  './js/ui.js',
  './js/views/home.js',
  './js/views/study.js',
  './js/views/quiz.js',
  './js/views/stats.js',
  './js/main.js',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Fetch from network
        return fetch(event.request).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                // Ignore tailwind cdn cross-origin errors by not caching them if they fail, 
                // but we already put it in urlsToCache so it might be fine or we cache it opaquely.
                // For safety, only cache http/https requests
                if(event.request.url.startsWith('http')) {
                   cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        );
      })
  );
});
