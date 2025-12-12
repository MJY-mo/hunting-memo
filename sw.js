// このファイルは sw.js です
const CACHE_NAME = 'hunting-app-v6'; // ★ v5に更新

// キャッシュするファイルリスト
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './favicon.ico',
    './icon-192x192.png',
    
    // ライブラリ
    './libs/tailwindcss.js',
    './libs/dexie.js',
    './libs/exif.min.js',
    './libs/font-awesome/css/all.min.css'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
                })
            );
        })
    );
    return self.clients.claim();
});

// フェッチ処理
self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('?t=')) return; 

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const url = event.request.url;
                const isImage = url.match(/\.(jpg|jpeg|png|gif|svg)$/i) || url.includes('/image/');
                const isFont = url.match(/\.(woff|woff2|ttf|eot)$/i) || url.includes('/webfonts/');

                if (isImage || isFont) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            });
        })
    );
});