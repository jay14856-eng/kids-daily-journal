self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('journal-cache-v1').then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/styles/main.css',
                '/app.js', // Assuming the compiled JS file is named app.js
                // Add any other assets you want to cache
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

self.addEventListener('activate', (event) => {
    const cacheWhitelist = ['journal-cache-v1'];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});