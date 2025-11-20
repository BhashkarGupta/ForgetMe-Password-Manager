const CACHE_NAME = 'forgetme-v1';
const urlsToCache = [
  '/ForgetMe-Password-Manager/',
  '/ForgetMe-Password-Manager/index.html',
  '/ForgetMe-Password-Manager/script.js',
  '/ForgetMe-Password-Manager/manifest.json',
  '/ForgetMe-Password-Manager/Assets/favicon24.png'
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