// このファイルは main.js です
// ★ 修正: CSVを「UTF-8」として確実に読み込む（文字化け対策）
// ★ 修正: 更新ボタンを押すたびに最新データを取得する（キャッシュ対策）
// ★ 修正: 説明文の「、」や改行に対応したCSV読み込みロジック

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
    
    // メモリリーク対策: 画像URL管理
    activeBlobUrls: [] 
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


// ★★★ ここからCSV読み込み関連の修正・強化 ★★★

/**
 * 狩猟鳥獣データをGitHubから取得してDBに登録する
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

        console.log(forceUpdate ? "Forcing update of game animal list from GitHub..." : "Game animal list is empty. Populating from GitHub...");
        
        // ★ キャッシュ対策: URL末尾にタイムスタンプ(?t=...)を付与して最新を強制取得
        const CSV_URL = 'https://raw.githubusercontent.com/MJY-mo/hunting-memo/refs/heads/main/%E7%8B%A9%E7%8C%9F%E9%B3%A5%E7%8D%A3.csv'; 
        const fetchUrl = `${CSV_URL}?t=${Date.now()}`;

        const response = await fetch(fetchUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch CSV: ${response.statusText}`);
        }

        // ★ 文字化け対策: .text() を使用してブラウザ標準のUTF-8デコードに任せる
        const csvText = await response.text();

        // ★ CSV解析: 強力なパーサーを使用
        const records = parseCSV(csvText);

        if (records.length < 1) { 
            throw new Error('CSVデータが空か、正しい形式ではありません。');
        }

        // ★ ヘッダー行の自動判定
        // 1行目の1列目に「分類」が含まれていれば、それはヘッダー行とみなしてスキップ
        let startIndex = 0;
        if (records[0][0] && records[0][0].includes('分類')) {
            startIndex = 1; 
            console.log("Header row detected. Starting from row 2.");
        } else {
            console.log("No header detected. Starting from row 1.");
        }
        
        const animals = [];
        
        for (let i = startIndex; i < records.length; i++) {
            const row = records[i];
            if (row.length < 3) continue; // 明らかに列が足りない行はスキップ
            
            // --- CSVの列定義 (CSVファイルの列順序と一致させる) ---
            // 0: 分類, 1: 狩猟鳥獣か, 2: 種名, 3: 銃猟, 4: 罠猟, 5: 網猟
            // 6: 性別, 7: 数, 8: 禁止区域, 9: 生息地, 10: 備考
            // 11: 説明, 12: 画像1, 13: 画像2
            
            const animal = {
                category:        row[0] || '',
                is_game_animal:  row[1] || '',
                species_name:    row[2] || '',
                method_gun:      row[3] || '',
                method_trap:     row[4] || '',
                method_net:      row[5] || '',
                gender:          row[6] || '',
                count:           row[7] || '',
                prohibited_area: row[8] || '',
                habitat:         row[9] || '',
                notes:           row[10] || '',
                description:     row[11] || '',
                image_1:         row[12] || '',
                image_2:         row[13] || ''
            };
            animals.push(animal);
        }
        
        if (animals.length === 0) {
            throw new Error('有効なデータが見つかりませんでした。');
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
            statusEl.textContent = '更新失敗: ' + err.message;
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
 * テーマを適用する (<html> タグにクラスを設定)
 */
function applyTheme(themeValue) {
    const root = document.documentElement; // <html> タグ
    
    // 既存のテーマクラスをすべて削除
    root.classList.remove('theme-light', 'theme-dark', 'theme-sepia', 'theme-light-green', 'theme-light-blue');

    if (themeValue === 'sepia') {
        root.classList.add('theme-sepia');
    } else if (themeValue === 'lightgreen') {
        root.classList.add('theme-light-green');
    } else if (themeValue === 'lightblue') {
        root.classList.add('theme-light-blue');
    } else {
        // 'light' (default)
        root.classList.add('theme-light');
    }
}

/**
 * 文字サイズを適用する
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
 */
function navigateTo(pageId, pageFunction, title) {
    
    // クリーンアップ処理
    if (appState.activeBlobUrls && appState.activeBlobUrls.length > 0) {
        appState.activeBlobUrls.forEach(url => URL.revokeObjectURL(url));
        appState.activeBlobUrls = []; 
    }

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
            timeout: 10000, 
            maximumAge: 0 
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
 * CSVパーサー (引用符付きセルや改行に対応した強化版)
 * @param {string} text - CSVテキストデータ
 * @returns {Array<Array<string>>} 2次元配列
 */
function parseCSV(text) {
    const arr = [];
    let quote = false;  // 'true' means we're inside a quoted field
    let col = 0, c = 0; // Current column and char index
    
    // Normalize newlines
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    for (; c < text.length; c++) {
        let cc = text[c], nc = text[c+1];        // Current char, next char
        arr[arr.length-1] = arr[arr.length-1] || []; // Create a new row if necessary
        arr[arr.length-1][col] = arr[arr.length-1][col] || ''; // Create a new column (start with empty string) if necessary

        // If the current char is a quote
        if (cc == '"' && quote && nc == '"') { 
            // If it's a double quote inside a quoted field, decode it to a single quote
            arr[arr.length-1][col] += cc; 
            ++c; // Skip the next quote
            continue; 
        }
        
        if (cc == '"') { 
            // Toggle quote state
            quote = !quote; 
            continue; 
        }
        
        if (cc == ',' && !quote) { 
            // If it's a comma and NOT inside a quote, move to next column
            ++col; 
            continue; 
        }
        
        if (cc == '\n' && !quote) { 
            // If it's a newline and NOT inside a quote, move to next row
            ++col; 
            if (col > 0) { // Only start new row if current row is not empty
                arr.push([]); // Start new row
                col = 0; 
            }
            continue; 
        }
        
        // Otherwise, append the current char to the current column
        arr[arr.length-1][col] += cc;
    }
    return arr;
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
                EXIF.getData(img, function() {
                    const orientation = EXIF.getTag(this, "Orientation");
                    
                    let width = img.width;
                    let height = img.height;

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

                    if (orientation && orientation >= 5 && orientation <= 8) {
                        canvas.width = height;
                        canvas.height = width;
                    } else {
                        canvas.width = width;
                        canvas.height = height;
                    }

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

                    // 画像描画の方向修正ロジック (canvasサイズ変更後)
                    if (orientation >= 5 && orientation <= 8) {
                        ctx.drawImage(img, 0, 0, height, width);
                    } else {
                        ctx.drawImage(img, 0, 0, width, height);
                    }

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
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
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
        modalOverlay.remove();
    }
}