/* 戰情籤 — Service Worker
   頁面本體與 data/*.json 走「網路優先」：資料每天換，快取優先會看到昨天的籤。
   d/ 詳情檔走「快取優先、背景更新」：點進去不等待，下次自動換新。
   殼件（css／icons／manifest）走快取優先。 */
const V = 'sixways-v1';
const SHELL = ['./', './index.html', './base.css', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V)
    .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  const fresh = req.mode === 'navigate' || p.endsWith('/') || p.endsWith('.html') || /\/data\/[a-z]+\.json$/.test(p);
  if (fresh) {
    e.respondWith(fetch(req)
      .then(r => { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => {
      if (r && r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(req, c)); }
      return r;
    }).catch(() => hit);
    return hit || net;
  }));
});
