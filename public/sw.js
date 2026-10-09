// Offline support: caches the app shell and assets; never caches /api calls.
const CACHE = 'bryn-study-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Page loads: try network briefly, fall back to cached shell when offline/slow.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(req, { signal: ctrl.signal });
        clearTimeout(t);
        if (res.ok) cache.put('/index.html', res.clone());
        return res;
      } catch {
        return (await cache.match('/index.html')) || (await cache.match('/')) || Response.error();
      }
    })());
    return;
  }

  // Assets: serve from cache instantly, refresh in background.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req)
      .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
