/* Workout Tracker – Service Worker
 * Cache-Version bei jedem Deploy hochzählen (CACHE_VERSION) und mit js/version.js abgleichen.
 * Strategie: Precache der App-Shell, danach cache-first für gleiche Origin (offlinefähig),
 * Netzwerk-Fallback und Update im Hintergrund (stale-while-revalidate).
 */
const CACHE_VERSION = 34;
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
  'js/icons.js',
  'js/sheet.js',
  'js/pool.js',
  'js/muscle-info.js',
  'js/exercises.js',
  'js/exercises-view.js',
  'js/controls.js',
  'js/rest.js',
  'js/plans.js',
  'js/plans-view.js',
  'js/session.js',
  'js/timer.js',
  'js/warmup-info.js',
  'js/training-view.js',
  'js/progress.js',
  'js/progress-info.js',
  'js/progress-view.js',
  'js/input.js',
  'js/sets.js',
  'js/set-info.js',
  'js/set-view.js',
  'js/groups.js',
  'js/group-view.js',
  'js/week.js',
  'js/figure.js',
  'js/motion.js',
  'js/motion-front.js',
  'js/motion-female.js',
  'js/anim-data.js',
  'js/anim-bar.js',
  'js/anim-view.js',
  'js/muscle-view.js',
  'js/muscle-pick.js',
  'js/routine-data.js',
  'js/routines.js',
  'js/routine-view.js',
  'js/progression.js',
  'js/progression-view.js',
  'js/history.js',
  'js/diary-view.js',
  'js/views.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    // cache: 'reload' umgeht den HTTP-Cache des Servers (GitHub Pages: ~10 min), sonst landen nach einem Deploy alte Dateien im neuen Cache.
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())
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
      // Skripte und Styles im Hintergrund per Revalidierung holen (nicht aus dem HTTP-Cache), Navigationen unverändert.
      const network = (req.mode === 'navigate' ? fetch(req) : fetch(req.url, { cache: 'no-cache' }))
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      event.waitUntil(network.catch(() => {})); // Aktualisierung im Hintergrund nicht vorzeitig abbrechen lassen
      return cached || network;
    })
  );
});
