// ===== APP SHELL ARCHITECTURE =====
// SHELL_CACHE: 永久快取殼層（HTML/CSS/JS/圖示）—— cache-first，只在新版 SW 安裝時更新
// DATA_CACHE:  單字資料（vocab.js）—— network-first，有網路時更新，無網路用快取
// CDN_CACHE:   外部 CDN 資源 —— stale-while-revalidate

const SHELL_VERSION = 'v4';
const SHELL_CACHE = `toeic-shell-${SHELL_VERSION}`;
const DATA_CACHE  = 'toeic-data-v1';
const CDN_CACHE   = 'toeic-cdn-v1';

const SHELL_URLS = [
  './',
  './index.html',
  './css/style.css',
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
];

const DATA_URLS = [
  './js/vocab.js',
];

const CDN_URLS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
];

// ===== INSTALL: 預快取殼層與初始資料 =====
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // 殼層：原子性快取，任一失敗則安裝失敗（確保 shell 完整）
      caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_URLS)),
      // 資料：初次快取 vocab.js
      caches.open(DATA_CACHE).then(cache => cache.addAll(DATA_URLS)),
      // CDN：best-effort，失敗不影響安裝
      caches.open(CDN_CACHE).then(cache =>
        Promise.allSettled(CDN_URLS.map(url => cache.add(url)))
      ),
    ])
  );
  // 強制接管：確保新版 SW 立即啟用，清除舊快取
  self.skipWaiting();
});

// ===== ACTIVATE: 清除舊版快取 =====
self.addEventListener('activate', event => {
  const validCaches = new Set([SHELL_CACHE, DATA_CACHE, CDN_CACHE]);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => !validCaches.has(k)).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ===== FETCH: 依資源類型選擇策略 =====
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 只處理 GET 請求
  if (request.method !== 'GET') return;

  // CDN 資源：stale-while-revalidate
  if (CDN_URLS.some(u => request.url.startsWith(u.split('?')[0]))) {
    event.respondWith(staleWhileRevalidate(request, CDN_CACHE));
    return;
  }

  // 單字資料：network-first（確保資料最新）
  if (DATA_URLS.some(u => url.pathname.endsWith(u.replace('./', '/')))) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // 殼層與其他本地資源：cache-first
  event.respondWith(cacheFirst(request, SHELL_CACHE));
});

// ===== MESSAGE: 接收頁面指令 =====
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ===== 策略實作 =====

// Cache-First：快取優先，快取沒有才去網路，適合殼層
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // 離線且無快取：回傳殼層 index.html（SPA fallback）
    return caches.match('./index.html');
  }
}

// Network-First：網路優先，失敗才用快取，適合單字資料
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match('./index.html');
  }
}

// Stale-While-Revalidate：先回快取，背景更新，適合 CDN
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || fetchPromise;
}
