// Kiawah Tides service worker
// Bump this version whenever index.html/app shell changes to force a refresh.
const SHELL_CACHE = 'kiawah-tides-shell-v7';
const DATA_CACHE = 'kiawah-tides-data-v7';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isDataApi =
    url.hostname === 'api.tidesandcurrents.noaa.gov' ||
    url.hostname === 'api.allorigins.win' ||
    url.hostname === 'api.open-meteo.com' ||
    url.hostname === 'api-iwls.dfo-mpo.gc.ca' ||
    url.hostname === 'api-sine.dfo-mpo.gc.ca';

  if (isDataApi) {
    // Network-first, fall back to cache so previously viewed days work offline.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(DATA_CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (event.request.method === 'GET' && url.origin === self.location.origin) {
    // Cache-first for the app shell.
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, copy));
            return response;
          })
        );
      })
    );
  }
});
