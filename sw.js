const CACHE = 'prezzo-netto-v3';
// Path relativi: l'app può stare in una sottocartella (es. GitHub Pages /repo/)
const PRECACHE = [
  './index.html',
  './manifest.webmanifest',
  './libs/xlsx.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Cache ogni risorsa individualmente: un errore non blocca le altre
    await Promise.all(PRECACHE.map(url =>
      cache.add(url).catch(err => console.warn('[SW] cache miss:', url, err))
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  // Solo GET, ignora richieste non-http
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) return cached;

    try {
      const response = await fetch(e.request);
      // Metti in cache le risposte valide dello stesso origin
      if (response.ok && url.origin === self.location.origin) {
        const cache = await caches.open(CACHE);
        cache.put(e.request, response.clone());
      }
      return response;
    } catch {
      // Navigazione offline: restituisci index.html dalla cache
      if (e.request.mode === 'navigate') {
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
      }
      return new Response('Offline', { status: 503 });
    }
  })());
});
