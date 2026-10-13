/* Workout Tracker – Service Worker
 * Cache-Version bei jedem Deploy hochzählen (CACHE_VERSION) und mit js/version.js abgleichen.
 * Strategie: Precache der App-Shell, danach cache-first für gleiche Origin (offlinefähig),
 * Netzwerk-Fallback und Update im Hintergrund (stale-while-revalidate).
 */
const CACHE_VERSION = 1;
const CACHE_NAME = `wt-cache-v${CACHE_VERSION}`;

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/glass.css',
  'js/app.js',
  'js/version.js',
  'js/util.js',
  'js/model.js',
  'js/migrate.js',
  'js/store.js',
  'js/backup.js',
  'js/ui.js',
  'js/views.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('wt-cache-') && k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
