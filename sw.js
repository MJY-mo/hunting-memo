// sw.js
const CACHE_NAME = 'hunting-app-v16'; // バージョンを更新
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './js/common.js', // 新しいパス
    './js/pages.js',  // 新しいパス
    './js/app.js',    // 新しいパス
    './libs/dexie.js',
    './libs/tailwindcss.js',
    './libs/exif.min.js',
    './libs/font-awesome/css/all.min.css'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
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