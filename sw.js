const CACHE_NAME = 'forgetme-v1';
const urlsToCache = [
  './',
  './index.html',
  './script.js',
  './manifest.json',
  './Assets/favicon24.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});