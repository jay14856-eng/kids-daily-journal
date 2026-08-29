self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('journal-cache-v1').then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './styles/main.css',
        './manifest.json',
        './app.js'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});