// xing.report service worker — installability + a fast/offline SHELL only.
// Trust rule (CLAUDE.md #1): live numbers must never be served stale. So this
// worker NEVER intercepts /api/* — those always hit the network, and the page
// shows its own "couldn't load" message offline. It only network-first-caches
// the page shell, so a fresh deploy always wins online and an offline open
// still renders the frame (which then reports it can't reach the numbers).
const V = 'xing-shell-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== V).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // never touch the API or any non-GET — data stays live, writes pass through
  if (e.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  // network-first for page loads; cached shell only as an offline fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const copy = r.clone(); caches.open(V).then((c) => c.put('/', copy)); return r; })
        .catch(() => caches.match('/'))
    );
  }
});
