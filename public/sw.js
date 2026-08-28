const CACHE = 'sound-field-kit-v2';
const SHELL = [
  '/',
  '/index.html',
  '/assets/app.js',
  '/assets/app.css',
  '/assets/field-station-960.webp',
  '/assets/field-station-960.avif',
  '/assets/field-station-960.jpg',
  '/assets/field-station-1536.webp',
  '/assets/field-station-1536.avif',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.webmanifest',
  '/offline.html',
  '/legal.css',
  '/privacy/',
  '/terms/'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(SHELL.map(async (url) => {
      const response = await fetch(url, { cache: 'reload' });
      if (!response.ok) throw new Error(`Could not precache ${url}`);
      await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (await caches.match(request, { ignoreVary: true })) || (await caches.match('/index.html', { ignoreVary: true })) || caches.match('/offline.html', { ignoreVary: true }))
    );
    return;
  }
  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    }))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
