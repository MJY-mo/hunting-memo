// このファイルは main.js です
// ★ 修正: populateGameAnimalListIfNeeded を、GitHub CSV から fetch するロジックに変更
// ★ 修正: [パフォーマンス #2] メモリリーク対策のため、URL解放ロジックを navigateTo に集約
// ★ 修正: 2025/11/15 ユーザー指摘 (テーマ変更ロジック) を適用

// --- グローバル変数・DOM要素 ---
const app = document.getElementById('app');
const headerTitle = document.getElementById('headerTitle');
const backButton = document.getElementById('backButton');
const headerActions = document.getElementById('headerActions');

const tabs = {
    trap: document.getElementById('tab-trap'),
    gun: document.getElementById('tab-gun'),
    catch: document.getElementById('tab-catch'),
    checklist: document.getElementById('tab-checklist'),
    info: document.getElementById('tab-info'),
    settings: document.getElementById('tab-settings'),
};

// アプリケーションの状態管理
const appState = {
    currentPage: 'trap', // 現在表示中のタブ
    currentTrapId: null, // 編集中の罠ID
    currentGunLogId: null, // 編集中の銃使用履歴ID
    
    // 捕獲記録の表示状態
    currentCatchMethod: 'all', // 'all', 'trap', 'gun'
    currentCatchRelationId: null, // trapId または gunLogId
    
    // 罠タブの状態
    trapView: 'open', // 'open' (開いている罠) または 'closed' (過去の罠)
    trapFilters: {
        type: 'all'
    },
    trapSortOpen: {
        key: 'trap_number',
        order: 'asc'
    },
    trapSortClosed: {
        key: 'close_date',
        order: 'desc'
    },
    
    // 銃使用履歴の状態
    gunLogFilters: {
        purpose: 'all',
        gun_id: 'all'
    },
    gunLogSort: {
        key: 'use_date', 
        order: 'desc'    
    },
    
    // 捕獲一覧の状態
    catchFilters: {
        method: 'all',
        species: '', 
        gender: 'all',
        age: 'all'
    },
    catchSort: {
        key: 'catch_date', 
        order: 'desc'      
    },
    
    gameAnimalFilters: {
        category: 'all', // 'all', '哺乳類', '鳥類'
        status: 'all'    // 'all', '〇', '×'
    },
    
    // [パフォーマンス #2] メモリリーク対策
    activeBlobUrls: [] // ページ表示に使ったBlob URLを一時的に保持
};

// --- アプリ初期化 ---
window.addEventListener('load', () => {
    console.log("Window loaded. Initializing app...");
    
    // 1. データベースを開く試行
    db.open().then(async () => {
        console.log("Database opened successfully.");
        
        // 2. 設定を読み込んで適用
        await loadAndApplySettings();

        // 3. デフォルトの罠種類をDBに投入
        await populateDefaultTrapTypes();
        
        // 4. デフォルトの狩猟者プロファイルを作成 (存在しない場合)
        await populateDefaultHunterProfile();
        
        // 5. 狩猟鳥獣「一覧」データ(図鑑兼用)をDBに投入 (初回のみ)
        await populateGameAnimalListIfNeeded(false); // forceUpdate = false
        
        // 6. タブ切り替えのリスナーを設定
        setupTabs();
        
        // 7. 初期タブ（「罠」タブ）
        navigateTo('trap', showTrapPage, '罠');
    }).catch(err => {
        console.error("Failed to open database:", err);
        app.innerHTML = `<div class="error-box">データベースの起動に失敗しました。アプリが使用できません。</div>`;
    });
});

/**
 * アプリ起動時に、デフォルトの罠種類をDBに登録する
 */
async function populateDefaultTrapTypes() {
    try {
        await db.trap_type.bulkAdd([
            { name: 'くくり罠' },
            { name: '箱罠' }
        ]);
        console.log("Default trap types populated (if they didn't exist).");
    } catch (err) {
        if (err.name === 'BulkError') {
            console.log("Default trap types already exist (BulkError ignored).");
        } else {
            console.error("Failed to populate default trap types:", err);
        }
    }
}

/**
 * 狩猟者プロファイルのデフォルト行を作成する
 */
async function populateDefaultHunterProfile() {
    try {
        // 'main' というキーで単一のプロファイルを作成
        await db.hunter_profile.add({
            key: 'main',
            name: '',
            gun_license_renewal: '',
            hunting_license_renewal: '',
            registration_renewal: '',
            explosives_permit_renewal: ''
        });
        console.log("Default hunter profile created.");
    } catch (err) {
        if (err.name === 'ConstraintError') {
            // 既に 'main' が存在する場合は何もしない
            console.log("Hunter profile already exists.");
        } else {
            console.error("Failed to create default hunter profile:", err);
        }
    }
}


/**
 * 狩猟鳥獣データを「必要であれば」DBに登録する
 * (GitHubからCSVをフェッチして更新する)
 * @param {boolean} forceUpdate - true の場合、既存データをクリアして強制的に更新する
 */
async function populateGameAnimalListIfNeeded(forceUpdate = false) {
    try {
        // 1. データが既に存在するか(件数)をチェック
        const count = await db.game_animal_list.count();
        
        // 2. 1件以上データがあり、強制更新(forceUpdate)でないなら、何もしない
        if (count > 0 && !forceUpdate) {
            console.log(`Game animal list is already populated (${count} items). Skipping.`);
            return;
        }

        // 3. データが0件か、強制更新の場合、GitHubからフェッチして投入
        console.log(forceUpdate ? "Forcing update of game animal list from GitHub..." : "Game animal list is empty. Populating from GitHub...");
        
        const CSV_URL = 'https://raw.githubusercontent.com/MJY-mo/hunting-memo/refs/heads/main/%E7%8B%A9%E7%8C%9F%E9%B3%A5%E7%8D%A3.csv'; 
        
        const response = await fetch(CSV_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch CSV: ${response.statusText}`);
        }
        const csvText = await response.text();
        
        // CSVをパース (「カンマを含まない」前提の簡易パーサー)
        const lines = csvText.trim().split('\n');
        const header = lines[0].trim().split(',');
        
        // CSVヘッダーとDBキーのマッピング
        const keys = [
            'category', 'is_game_animal', 'species_name', 'method_gun', 'method_trap', 'method_net', 
            'gender', 'count', 'prohibited_area', 
            'habitat', 'notes', 'description', 'image_1', 'image_2'
        ];

        const animals = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue; // 空行はスキップ
            
            const values = lines[i].split(',');
            const animal = {};
            for (let j = 0; j < keys.length; j++) {
                animal[keys[j]] = values[j] ? values[j].trim() : '';
            }
            animals.push(animal);
        }
        
        if (animals.length === 0) {
            throw new Error('CSVデータが空か、パースに失敗しました。');
        }

        // データを一旦クリアして、CSVのデータのみで再登録
        await db.transaction('rw', db.game_animal_list, async () => {
            await db.game_animal_list.clear();
            await db.game_animal_list.bulkAdd(animals);
        });
        
        console.log(`Game animal list populated successfully (${animals.length} items).`);
        
    } catch (err) {
        console.error("Failed to populate game animal list (from CSV):", err);
        const statusEl = document.getElementById('csv-status'); // settings.js にある要素
        if (statusEl) {
            statusEl.textContent = '図鑑の更新に失敗しました。';
        }
    }
}


/**
 * DBから設定を読み込み、HTMLにクラスを適用する
 */
async function loadAndApplySettings() {
    try {
        // 1. テーマ設定の読み込みと適用
        let themeSetting = await db.settings.get('theme');
        if (!themeSetting) {
            themeSetting = { key: 'theme', value: 'light' };
            await db.settings.put(themeSetting);
        }
        applyTheme(themeSetting.value);
        
        // 2. 文字サイズ設定の読み込みと適用
        let fontSizeSetting = await db.settings.get('fontSize');
        if (!fontSizeSetting) {
            fontSizeSetting = { key: 'fontSize', value: 'medium' };
            await db.settings.put(fontSizeSetting);
        }
        applyFontSize(fontSizeSetting.value);

    } catch (err) {
        console.error("Failed to load settings:", err);
    }
}

/**
 * ★ 修正: テーマを適用する (背景色と「文字色」の両方を変更)
 * @param {string} themeValue - 'light', 'dark', 'sepia'
 */
function applyTheme(themeValue) {
    const root = document.documentElement; // <html> タグ
    
    // 以前のクラスを削除 (v17互換のため)
    root.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
    
    let primaryBgColor;
    let primaryTextColor; // ★ テキスト色の変数を追加
    
    if (themeValue === 'dark') {
        primaryBgColor = '#1f2937'; // bg-gray-800
        primaryTextColor = '#f3f4f6'; // ★ ダークモード時のテキスト色 (明るいグレー)
    } else if (themeValue === 'sepia') {
        primaryBgColor = '#f7f3e8'; // セピア背景 (例)
        primaryTextColor = '#1f2937'; // ★ セピア時のテキスト色 (濃いグレー)
    } else {
        // light (default)
        primaryBgColor = '#f3f4f6'; // bg-gray-100
        primaryTextColor = '#111827'; // ★ ライト時のテキスト色 (黒に近いグレー)
    }
    
    // CSS変数をセット
    root.style.setProperty('--color-bg-primary', primaryBgColor);
    root.style.setProperty('--color-text-primary', primaryTextColor); // ★ テキスト色をセット
}
/**
 * 文字サイズを適用する (settings.js からも呼ばれる)
 */
function applyFontSize(sizeValue) {
    const root = document.documentElement; // <html> タグ
    root.classList.remove('font-size-xsmall', 'font-size-small', 'font-size-medium', 'font-size-large', 'font-size-xlarge');
    
    if (sizeValue === 'xsmall') {
        root.classList.add('font-size-xsmall');
    } else if (sizeValue === 'small') {
        root.classList.add('font-size-small');
    } else if (sizeValue === 'large') {
        root.classList.add('font-size-large');
    } else if (sizeValue === 'xlarge') {
        root.classList.add('font-size-xlarge');
    } else {
        root.classList.add('font-size-medium');
    }
}


// --- タブ切り替えロジック ---
function setupTabs() {
    tabs.trap.addEventListener('click', () => {
        appState.trapView = 'open'; 
        navigateTo('trap', showTrapPage, '罠');
    });
    tabs.gun.addEventListener('click', () => navigateTo('gun', showGunPage, '銃'));
    tabs.info.addEventListener('click', () => navigateTo('info', showInfoPage, '情報'));
    tabs.settings.addEventListener('click', () => navigateTo('settings', showSettingsPage, '設定'));
    tabs.catch.addEventListener('click', () => navigateTo('catch', showCatchPage, '捕獲'));
    tabs.checklist.addEventListener('click', () => navigateTo('checklist', showChecklistPage, 'チェック'));
}

/**
 * 画面を切り替える（タブが押されたときに呼ばれる）
 * ★ 修正: [パフォーマンス #2] メモリリーク対策
 */
function navigateTo(pageId, pageFunction, title) {
    
    // ★★★ クリーンアップ処理 (ここから) ★★★
    // ページ遷移の直前に、古いページで使ったBlob URLをすべて解放する
    if (appState.activeBlobUrls && appState.activeBlobUrls.length > 0) {
        // console.log("Revoking URLs:", appState.activeBlobUrls);
        appState.activeBlobUrls.forEach(url => URL.revokeObjectURL(url));
        appState.activeBlobUrls = []; // 配列を空にする
    }
    // ★★★ (ここまで) ★★★

    appState.currentPage = pageId;
    
    Object.values(tabs).forEach(tab => {
        if (tab) tab.classList.replace('tab-active', 'tab-inactive');
    });
    if (tabs[pageId]) {
        tabs[pageId].classList.replace('tab-inactive', 'tab-active');
    }

    updateHeader(title, false);
    
    try {
        pageFunction();
    } catch (err) {
        console.error(`Failed to execute page function for ${pageId}:`, err);
        app.innerHTML = `<div class="error-box">ページの描画に失敗しました: ${err.message}</div>`;
    }
}

/**
 * ヘッダーを更新する
 */
function updateHeader(title, showBack = false) {
    headerTitle.textContent = title;
    backButton.classList.toggle('hidden', !showBack);
    
    if (showBack) {
        backButton.onclick = () => {
            if (appState.currentPage === 'trap') {
                navigateTo('trap', showTrapPage, '罠');
            }
            else if (appState.currentPage === 'gun') {
                navigateTo('gun', showGunPage, '銃');
            }
            else if (appState.currentPage === 'catch') {
                navigateTo('catch', showCatchPage, '捕獲');
            }
            else if (appState.currentPage === 'checklist') {
                navigateTo('checklist', showChecklistPage, 'チェック');
            }
            else if (appState.currentPage === 'info') {
                 navigateTo('info', showInfoPage, '情報');
            }
            else if (appState.currentPage === 'settings') {
                 navigateTo('settings', showSettingsPage, '設定');
            }
            else navigateTo('trap', showTrapPage, '罠'); // デフォルトに戻る
        };
    }

    headerActions.innerHTML = '';
}

// --- 共通ヘルパー関数 ---

/**
 * GPS位置情報を取得する
 */
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('お使いのブラウザはGPS機能に対応していません。'));
            return;
        }
        
        const options = {
            enableHighAccuracy: true,
            timeout: 10000, // 10秒
            maximumAge: 0 // キャッシュしない
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (err) => {
                if (err.code === 1) {
                    reject(new Error('GPSの使用が許可されませんでした。設定を確認してください。'));
                } else if (err.code === 2) {
                    reject(new Error('GPSの測位に失敗しました。場所を変えてお試しください。'));
                } else if (err.code === 3) {
                    reject(new Error('GPSの測位がタイムアウトしました。'));
                } else {
                    reject(new Error(`不明なGPSエラーが発生しました: ${err.message}`));
                }
            },
            options
        );
    });
}

/**
 * HTMLエスケープ
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return str.toString()
         .replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;')
         .replace(/'/g, '&#39;');
}

/**
 * 日付フォーマット (YYYY/MM/DD)
 */
function formatDate(dateString) {
    if (!dateString) return '未設定';
    try {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const month = parts[1];
            const day = parts[2];
            return `${year}/${month}/${day}`;
        }
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; 
        
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}/${month}/${day}`;

    } catch (e) {
        return dateString;
    }
}


/**
 * 画像リサイズ関数
 */
function resizeImage(file, maxSize = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // EXIFから向き情報を取得
                EXIF.getData(img, function() {
                    const orientation = EXIF.getTag(this, "Orientation");
                    
                    let width = img.width;
                    let height = img.height;

                    // リサイズ計算
                    if (width > height) {
                        if (width > maxSize) {
                            height = Math.round(height * (maxSize / width));
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = Math.round(width * (maxSize / height));
                            height = maxSize;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // EXIFの向きに応じて canvas のサイズと描画を調整
                    if (orientation && orientation >= 5 && orientation <= 8) {
                        // 90度回転
                        canvas.width = height;
                        canvas.height = width;
                    } else {
                        // 通常
                        canvas.width = width;
                        canvas.height = height;
                    }

                    // 向きを補正
                    switch (orientation) {
                        case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
                        case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
                        case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
                        case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
                        case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
                        case 7: ctx.transform(0, -1, -1, 0, height, width); break;
                        case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
                        default: break;
                    }

                    // 90度回転(5-8)の場合、描画する画像サイズも入れ替える
                    if (orientation >= 5 && orientation <= 8) {
                        ctx.drawImage(img, 0, 0, height, width);
                    } else {
                        ctx.drawImage(img, 0, 0, width, height);
                    }

                    // 高画質なJPEG Blobとして出力 (品質80%)
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Canvas to Blob conversion failed'));
                                return;
                            }
                            resolve(blob);
                        },
                        'image/jpeg',
                        0.8
                    );
                });
            };
            img.onerror = (e) => reject(new Error('Image loading failed'));
            img.src = e.target.result; // FileReaderの結果をImageのsrcに
        };
        reader.onerror = (e) => reject(new Error('File reading failed'));
        reader.readAsDataURL(file); // EXIF.js が Data URL を必要とするため
    });
}

// ★★★ 画像拡大モーダル ★★★
/**
 * 画像を拡大表示するモーダルを表示する
 * @param {string} blobUrl - URL.createObjectURL() で生成したURL (または通常の画像パス)
 */
function showImageModal(blobUrl) {
    // 既存のモーダルがあれば削除
    closeImageModal();
    
    // モーダルを作成
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'image-modal-overlay';
    modalOverlay.className = 'image-modal-overlay'; // style.css で定義
    
    const modalContent = document.createElement('div');
    modalContent.className = 'image-modal-content';
    
    const img = document.createElement('img');
    img.src = blobUrl;
    
    modalContent.appendChild(img);
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // オーバーレイクリックで閉じる
    modalOverlay.onclick = () => {
        closeImageModal();
    };
}

/**
 * 画像拡大モーダルを閉じる
 */
function closeImageModal() {
    const modalOverlay = document.getElementById('image-modal-overlay');
    if (modalOverlay) {
        // メモリリーク防止のため、imgのsrcを解放
        // ★ 修正: [パフォーマンス #2] (ここでは解放しない)
        const img = modalOverlay.querySelector('img');
        if (img && img.src.startsWith('blob:')) {
            // URL.revokeObjectURL(img.src);
        }
        modalOverlay.remove();
    }
}