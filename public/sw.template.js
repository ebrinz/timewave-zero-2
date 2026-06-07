/* eslint-disable */
// Generated into out/sw.js by scripts/build-sw.mjs (placeholders replaced at build).
const VERSION = '__VERSION__';
const CACHE = 'twz-__VERSION__';
const PRECACHE = __PRECACHE__;
const SHELL = '__SHELL__';

// Precache each URL, stripping the redirect flag — a redirected response cannot
// satisfy a navigation request (the browser fails it), and some static hosts
// redirect directory/index paths.
async function precache(cache) {
  await Promise.all(PRECACHE.map(async (url) => {
    try {
      const res = await fetch(url, { cache: 'reload' });
      if (!res.ok) return;
      const body = await res.blob();
      await cache.put(url, new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers }));
    } catch {}
  }));
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(precache).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Static export uses trailingSlash: a navigate to '/x/' maps to precached '/x/index.html'.
  const cacheKey = req.mode === 'navigate'
    ? new Request(req.url.replace(/\/$/, '') + '/index.html')
    : req;
  e.respondWith(
    caches.match(cacheKey).then(async (hit) => {
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) {
          const copy = res.clone();
          e.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)));
        }
        return res;
      } catch {
        return req.mode === 'navigate' ? caches.match(SHELL) : Response.error();
      }
    }),
  );
});
