const cacheName = "testPWA-v1.02";

self.addEventListener('install', (e) => {
    console.log('[Service Worker] Install');
    e.waitUntil((async () => {
        const cache = await caches.open(cacheName);
        cache.addAll(["./logo.png"]);
        console.log('[Service Worker] Caching all: app shell and content');
        self.skipWaiting();
        console.log('[Service Worker] Installed.');
    })());
});

self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Actived');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(cacheName => (cacheName !== cacheName))
                    .map(cacheName => caches.delete(cacheName))
            );
        })
    );
});

self.addEventListener("fetch", event => {
    console.log("work fetch:", event.request);
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
            .catch((e) => {
                console.log("catch fetch: ", e);
                return new Response(new Blob(["Hello"]), { "status" : 200 });
            })
    )
});
