self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('journal-cache-v1').then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/styles/main.css',
                '/manifest.json',
                '/src/app.js', // Assuming the app is compiled to app.js
            ]);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});