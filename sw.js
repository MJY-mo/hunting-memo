// このファイルは sw.js です
const CACHE_NAME = 'hunting-app-v1'; // バージョン番号。更新時はここを変える

// キャッシュするファイル等のリスト
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
    // アイコン画像 (もし存在すれば)
    './icon-192x192.png', 
    
    // --- 外部ライブラリ (CDN) ---
    // これらもキャッシュしないとオフラインで動きません
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/dexie@4.0.7/dist/dexie.js',
    'https://cdnjs.cloudflare.com/ajax/libs/exif-js/2.3.0/exif.min.js',
    // FontAwesome (settings.jsで使用されているアイコン用)
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' 
];

// インストール処理
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Install');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Caching app shell');
            return cache.addAll(urlsToCache);
        })
    );
    // 新しいSW即時有効化
    self.skipWaiting();
});

// アクティブ化処理 (古いキャッシュの削除)
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activate');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[ServiceWorker] Removing old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // ページをコントロール下に置く
    return self.clients.claim();
});

// フェッチ処理 (キャッシュ優先、なければネットワーク)
self.addEventListener('fetch', (event) => {
    // 外部のCSVファイルなどはキャッシュせずに毎回ネットワークに取りに行く(Network First)か、
    // ここではシンプルに「キャッシュにあればキャッシュ、なければネットワーク」とします。
    // ※「図鑑更新」機能は fetch を使うため、下記ロジックでもネットワーク通信が成功すれば機能します。
    
    event.respondWith(
        caches.match(event.request).then((response) => {
            // キャッシュヒットならそれを返す
            if (response) {
                return response;
            }
            // なければネットワークへ
            return fetch(event.request);
        })
    );
});