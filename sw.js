const CACHE = 'bbf-v1';
const SHELL = ['/index.html', '/'];

// On install: cache the main page immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  // Remove old cache versions
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Only cache same-origin GET requests
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Stale-while-revalidate for the main HTML (serve cache instantly, update in background)
  if (url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        const fresh = fetch(e.request).then(resp => {
          if (resp.ok) cache.put(e.request, resp.clone());
          return resp;
        }).catch(() => null);
        return cached || fresh;
      })
    );
    return;
  }

  // Cache-first for secondary pages (contact, privacy, terms)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if (resp.ok) caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
      return resp;
    }))
  );
});
