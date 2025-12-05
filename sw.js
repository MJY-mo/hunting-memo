// このファイルは sw.js です
// ★ 修正: バージョンを v3 に更新
// ★ 修正: libs フォルダ内のファイルをキャッシュリストに追加
// ★ 修正: 画像やフォントを「表示した瞬間に自動保存」する機能 (Runtime Caching) を追加

const CACHE_NAME = 'hunting-app-v3';

// 最初に必ずキャッシュしておくファイル (アプリの本体)
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './main.js',
    './db.js',
    './trap.js',
    './gun.js',
    './catch.js',
    './checklist.js',
    './info.js',
    './settings.js',
    './manifest.json',
    './favicon.ico',
    './icon-192x192.png',

    // --- ローカルライブラリ ---
    './libs/tailwindcss.js',
    './libs/dexie.js',
    './libs/exif.min.js',
    './libs/font-awesome/css/all.min.css'
    // ※フォントファイル自体は、下の「自動保存ロジック」でカバーします
];

// インストール処理
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Pre-caching app shell');
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// アクティブ化処理 (古いキャッシュの削除)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// ★★★ フェッチ処理 (重要：自動保存ロジックを追加) ★★★
self.addEventListener('fetch', (event) => {
    // CSVの更新リクエスト(?t=...)はキャッシュしない
    if (event.request.url.includes('?t=')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // 1. キャッシュにあれば、それを返す (高速化 & オフライン対応)
            if (cachedResponse) {
                return cachedResponse;
            }

            // 2. キャッシュになければ、ネットワークから取りに行く
            return fetch(event.request).then((networkResponse) => {
                // エラーレスポンスならそのまま返す
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // 3. 画像やフォントファイルなら、次回のオフライン用にキャッシュに保存する
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