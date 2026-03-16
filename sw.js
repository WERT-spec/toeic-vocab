// ===== APP SHELL SERVICE WORKER =====

const SHELL_VERSION = 'v8';
const SHELL_CACHE = `toeic-shell-${SHELL_VERSION}`;
const DATA_CACHE  = 'toeic-data-v1';
const CDN_CACHE   = 'toeic-cdn-v1';

const SHELL_URLS = [
    './', './index.html', './css/style.css',
    './js/debug.js', './js/store.js', './js/audio.js', './js/ui.js',
    './js/views/home.js', './js/views/study.js', './js/views/quiz.js', './js/views/stats.js',
    './js/main.js', './manifest.json',
    './icon-180.png', './icon-192.png', './icon-512.png',
];
const DATA_URLS = ['./js/vocab.js'];
const CDN_URLS = [
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
];

const log = (...args) => console.log('%c[SW]', 'color:#f39c12;font-weight:bold', ...args);

// ===== INSTALL =====
self.addEventListener('install', event => {
    log('install', SHELL_VERSION);
    event.waitUntil(Promise.all([
        caches.open(SHELL_CACHE).then(c => c.addAll(SHELL_URLS)),
        caches.open(DATA_CACHE).then(c => c.addAll(DATA_URLS)),
        caches.open(CDN_CACHE).then(c => Promise.allSettled(CDN_URLS.map(u => c.add(u)))),
    ]));
    self.skipWaiting();
});

// ===== ACTIVATE =====
self.addEventListener('activate', event => {
    log('activate');
    const valid = new Set([SHELL_CACHE, DATA_CACHE, CDN_CACHE]);
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => !valid.has(k)).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// ===== FETCH =====
self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    if (CDN_URLS.some(u => request.url.startsWith(u.split('?')[0]))) {
        return event.respondWith(staleWhileRevalidate(request, CDN_CACHE));
    }
    if (DATA_URLS.some(u => url.pathname.endsWith(u.replace('./', '/')))) {
        return event.respondWith(networkFirst(request, DATA_CACHE));
    }
    event.respondWith(cacheFirst(request, SHELL_CACHE));
});

// ===== MESSAGE =====
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') { log('skipWaiting'); self.skipWaiting(); }
});

// ===== STRATEGIES =====

async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const res = await fetch(request);
        if (res.ok) (await caches.open(cacheName)).put(request, res.clone());
        return res;
    } catch {
        return caches.match('./index.html');
    }
}

async function networkFirst(request, cacheName) {
    try {
        const res = await fetch(request);
        if (res.ok) (await caches.open(cacheName)).put(request, res.clone());
        return res;
    } catch {
        return (await caches.match(request)) || caches.match('./index.html');
    }
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const fetched = fetch(request).then(res => {
        if (res.ok) cache.put(request, res.clone());
        return res;
    }).catch(() => null);
    return cached || fetched;
}
