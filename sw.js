const CACHE_NAME = 'kagoshima-travel-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&family=Zen+Old+Mincho:wght@400;700&family=M+PLUS+Rounded+1c:wght@300;500;700&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS.filter(a => !a.startsWith('http'))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 判斷是不是「頁面導覽」或 index.html 本身 —— 這些內容常更新，要優先問伺服器
function isFreshContent(request) {
  return request.mode === 'navigate' || request.url.endsWith('/index.html') || request.url.endsWith('/');
}

self.addEventListener('fetch', e => {
  const req = e.request;

  if (isFreshContent(req)) {
    // Network-first：先試著拿最新版，失敗（離線）才退回快取
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // 其他靜態資源（icon、字體等）維持 cache-first，速度快、不常變
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && req.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
