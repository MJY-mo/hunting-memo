// このファイルは sw.js です
// ★ 修正: キャッシュ名を v2 に更新
// ★ 修正: Tailwind CSS の読み込みに { mode: 'no-cors' } を追加してCORSエラーを回避

const CACHE_NAME = 'hunting-app-v2'; // バージョンアップ

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
    './icon-192x192.png', // アイコンがあれば
    
    // --- 外部ライブラリ (CDN) ---
    
    // ★ 重要: Tailwind CSS は CORSヘッダーを返さないことがあるため、
    // 'no-cors' モードでリクエストオブジェクトとして定義し、不透明レスポンスとしてキャッシュする
    new Request('https://cdn.tailwindcss.com', { mode: 'no-cors' }),

    // 以下のCDN (unpkg, cdnjs) は通常CORS対応しているため、文字列のままでOK
    'https://unpkg.com/dexie@4.0.7/dist/dexie.js',
    'https://cdnjs.cloudflare.com/ajax/libs/exif-js/2.3.0/exif.min.js',
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
                    // バージョンが違うキャッシュ（v1など）をすべて削除
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