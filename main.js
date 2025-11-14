// このファイルは main.js です

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
    
    // ★★★ 新規: 狩猟鳥獣図鑑の絞り込み状態 ★★★
    gameAnimalFilters: {
        category: 'all', // 'all', '哺乳類', '鳥類'
        status: 'all'    // 'all', 'game', 'pest'
    }
};

// --- アプリ初期化 ---
// ページのすべてのリソース（他のJSファイルを含む）が読み込まれてから起動
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
        
        // ★★★ 新規: 狩猟鳥獣データをDBに投入 ★★★
        await populateDefaultGameAnimals();

        // 5. タブ切り替えのリスナーを設定
        setupTabs();
        
        // 6. 初期タブ（「罠」タブ）
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
        await db.trap_types.bulkAdd([
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
 * ★★★ 新規: 狩猟鳥獣のデフォルトデータをDBに登録する ★★★
 */
async function populateDefaultGameAnimals() {
    try {
        // 既にデータが1件でもあれば、登録処理をスキップ
        const count = await db.game_animals.count();
        if (count > 0) {
            console.log("Game animals data already populated.");
            return;
        }

        // ユーザー提供のCSVに基づくデータ
        const animals = [
            { species_name: "イノシシ", category: "哺乳類", is_game_animal: true, notes: "" },
            { species_name: "ニホンジカ", category: "哺乳類", is_game_animal: true, notes: "" },
            { species_name: "クマ", category: "哺乳類", is_game_animal: true, notes: "地域による" },
            { species_name: "タヌキ", category: "哺乳類", is_game_animal: true, notes: "" },
            { species_name: "キツネ", category: "哺乳類", is_game_animal: true, notes: "" },
            { species_name: "キジ", category: "鳥類", is_game_animal: true, notes: "" },
            { species_name: "ヤマドリ", category: "鳥類", is_game_animal: true, notes: "" },
            { species_name: "マガモ", category: "鳥類", is_game_animal: true, notes: "" },
            { species_name: "カルガモ", category: "鳥類", is_game_animal: true, notes: "" },
            { species_name: "ヒヨドリ", category: "鳥類", is_game_animal: true, notes: "" },
            { species_name: "ハクビシン", category: "哺乳類", is_game_animal: false, notes: "有害鳥獣" },
            { species_name: "アライグマ", category: "哺乳類", is_game_animal: false, notes: "有害鳥獣" },
            { species_name: "カラス（ハシブトガラス、ハシボソガラス）", category: "鳥類", is_game_animal: false, notes: "有害鳥獣" }
        ];
        
        await db.game_animals.bulkAdd(animals);
        console.log("Default game animals populated.");
    } catch (err) {
        console.error("Failed to populate game animals:", err);
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
            // デフォルト値をDBに保存
            themeSetting = { key: 'theme', value: 'light' };
            await db.settings.put(themeSetting);
        }
        applyTheme(themeSetting.value);
        
        // 2. 文字サイズ設定の読み込みと適用
        let fontSizeSetting = await db.settings.get('fontSize');
        if (!fontSizeSetting) {
            // デフォルト値をDBに保存
            fontSizeSetting = { key: 'fontSize', value: 'medium' };
            await db.settings.put(fontSizeSetting);
        }
        applyFontSize(fontSizeSetting.value);

    } catch (err) {
        console.error("Failed to load settings:", err);
        // エラーが発生しても、デフォルトのスタイルで続行
    }
}

/**
 * テーマを適用する (settings.js からも呼ばれる)
 * @param {string} themeValue - 'light', 'dark', 'sepia'
 */
function applyTheme(themeValue) {
    const root = document.documentElement; // <html> タグ
    root.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
    if (themeValue === 'dark') {
        root.classList.add('theme-dark');
    } else if (themeValue === 'sepia') {
        root.classList.add('theme-sepia');
    } else {
        root.classList.add('theme-light');
    }
}

/**
 * 文字サイズを適用する (settings.js からも呼ばれる)
 * @param {string} sizeValue - 'xsmall', 'small', 'medium', 'large', 'xlarge'
 */
function applyFontSize(sizeValue) {
    const root = document.documentElement; // <html> タグ
    // すべてのクラスを一旦削除
    root.classList.remove('font-size-xsmall', 'font-size-small', 'font-size-medium', 'font-size-large', 'font-size-xlarge');
    
    // 該当するクラスを追加
    if (sizeValue === 'xsmall') {
        root.classList.add('font-size-xsmall');
    } else if (sizeValue === 'small') {
        root.classList.add('font-size-small');
    } else if (sizeValue === 'large') {
        root.classList.add('font-size-large');
    } else if (sizeValue === 'xlarge') {
        root.classList.add('font-size-xlarge');
    } else {
        // 'medium' または不明な値は 'medium' にフォールバック
        root.classList.add('font-size-medium');
    }
}


// --- タブ切り替えロジック ---
function setupTabs() {
    // 各タブが押されたら、navigateTo 関数を正しい引数で呼び出す
    tabs.trap.addEventListener('click', () => {
        appState.trapView = 'open'; 
        navigateTo('trap', showTrapPage, '罠');
    });
    tabs.gun.addEventListener('click', () => navigateTo('gun', showGunPage, '銃'));
    tabs.info.addEventListener('click', () => navigateTo('info', showInfoPage, '情報'));
    tabs.settings.addEventListener('click', () => navigateTo('settings', showSettingsPage, '設定'));
    tabs.catch.addEventListener('click', () => navigateTo('catch', showCatchPage, '捕獲記録'));
    tabs.checklist.addEventListener('click', () => navigateTo('checklist', showChecklistPage, 'チェックリスト'));
}

/**
 * 画面を切り替える（タブが押されたときに呼ばれる）
 * @param {string} pageId - 'trap', 'gun', 'info', 'settings', 'catch', 'checklist'
 * @param {function} pageFunction - 実行する描画関数 (例: showTrapPage)
 * @param {string} title - ヘッダーに表示するタイトル
 */
function navigateTo(pageId, pageFunction, title) {
    appState.currentPage = pageId;
    
    // すべてのタブを非アクティブ化
    Object.values(tabs).forEach(tab => {
        if (tab) tab.classList.replace('tab-active', 'tab-inactive');
    });
    // 押されたタブをアクティブ化
    if (tabs[pageId]) {
        tabs[pageId].classList.replace('tab-inactive', 'tab-active');
    }

    // ヘッダーを更新 (戻るボタンはデフォルトで非表示)
    updateHeader(title, false);
    
    // 該当するページの描画関数を実行
    try {
        pageFunction();
    } catch (err) {
        console.error(`Failed to execute page function for ${pageId}:`, err);
        app.innerHTML = `<div class="error-box">ページの描画に失敗しました: ${err.message}</div>`;
    }
}

/**
 * ヘッダーを更新する
 * @param {string} title - 表示するタイトル
 * @param {boolean} showBack - 戻るボタンを表示するか
 */
function updateHeader(title, showBack = false) {
    headerTitle.textContent = title;
    backButton.classList.toggle('hidden', !showBack);
    
    // 戻るボタンのデフォルト動作（タブ一覧に戻る）
    // (各画面で、必要に応じてこの onclick は上書きされます)
    if (showBack) {
        backButton.onclick = () => {
            if (appState.currentPage === 'trap') {
                navigateTo('trap', showTrapPage, '罠');
            }
            else if (appState.currentPage === 'gun') {
                navigateTo('gun', showGunPage, '銃');
            }
            else if (appState.currentPage === 'catch') {
                navigateTo('catch', showCatchPage, '捕獲記録');
            }
            else if (appState.currentPage === 'checklist') {
                navigateTo('checklist', showChecklistPage, 'チェックリスト');
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

    // ヘッダーアクションボタンを一旦クリア
    headerActions.innerHTML = '';
}

// --- 共通ヘルパー関数 ---
// (GPS, escapeHTML, formatDate, resizeImage は変更なし)
/**
 * GPS位置情報を取得する (ユーザーの要望)
 * (trap.js などから呼び出して使う)
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('お使いのブラウザはGPS機能に対応していません。'));
            return;
        }
        
        // 高精度モードで、タイムアウトを10秒に設定
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
 * HTMLエスケープ (安全のため)
 * @param {string | number | null | undefined} str
 * @returns {string}
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
 * @param {string | null | undefined} dateString
 * @returns {string}
 */
function formatDate(dateString) {
    if (!dateString) return '未設定';
    try {
        // YYYY-MM-DD 形式を正しくパースする
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const month = parts[1];
            const day = parts[2];
            return `${year}/${month}/${day}`;
        }
        // パースできない場合は元の文字列か、簡易的な変換を試みる
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // 無効な日付
        
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}/${month}/${day}`;

    } catch (e) {
        return dateString; // パース失敗時は元の文字列を返す
    }
}


/**
 * 画像リサイズ関数
 * (変更なし)
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
 * @param {string} blobUrl - URL.createObjectURL() で生成したURL
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
        const img = modalOverlay.querySelector('img');
        if (img && img.src.startsWith('blob:')) {
            URL.revokeObjectURL(img.src);
        }
        modalOverlay.remove();
    }
}