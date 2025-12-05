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
    
    // --- ★ 修正: ローカルのライブラリファイルを指定 ---
    './libs/tailwindcss.js',
    './libs/dexie.js',
    './libs/exif.min.js',
    './libs/font-awesome/css/all.min.css',
    
    // Font Awesomeのフォントファイルもキャッシュ推奨 (アイコンが表示されないのを防ぐため)
    // ※使用しているバージョン(v6系)に合わせてファイル名を指定
    './libs/font-awesome/webfonts/fa-solid-900.woff2',
    './libs/font-awesome/webfonts/fa-solid-900.ttf'

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