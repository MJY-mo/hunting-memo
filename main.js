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
    info: document.getElementById('tab-info'),
    settings: document.getElementById('tab-settings'),
 
   
};

// アプリケーションの状態管理
const appState = {
    currentPage: 'trap', // 現在表示中のタブ
    currentTrapId: null, // 編集中の罠ID
    currentGunLogId: null, // 編集中の銃使用履歴ID
    // ★ 捕獲記録の表示状態
    currentCatchMethod: 'all', // 'all', 'trap', 'gun'
    currentCatchRelationId: null, // trapId または gunLogId
    
    trapView: 'open', // 'open' (開いている罠) または 'closed' (過去の罠)
    trapFilters: { // 罠の絞り込み状態
        type: 'all'    // all, くくり罠, 箱罠, ...
    }
};

// --- アプリ初期化 ---
// ページのすべてのリソース（他のJSファイルを含む）が読み込まれてから起動
window.addEventListener('load', () => {
    console.log("Window loaded. Initializing app...");
    
    // 1. データベースを開く試行
    db.open().then(async () => {
        console.log("Database opened successfully.");
        
        // 2. デフォルトの罠種類をDBに投入 (存在しない場合のみ)
        await populateDefaultTrapTypes();
        
        // 3. タブ切り替えのリスナーを設定
        setupTabs();
        
        // 4. 初期タブ（「罠」タブ）を表示
        navigateTo('trap', showTrapPage, '罠 (設置中)');
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


// --- タブ切り替えロジック ---
function setupTabs() {
    // 各タブが押されたら、navigateTo 関数を正しい引数で呼び出す
    tabs.trap.addEventListener('click', () => {
        appState.trapView = 'open'; 
        navigateTo('trap', showTrapPage, '罠 (設置中)');
    });
    tabs.gun.addEventListener('click', () => navigateTo('gun', showGunPage, '銃'));
    tabs.info.addEventListener('click', () => navigateTo('info', showInfoPage, '情報'));
    tabs.settings.addEventListener('click', () => navigateTo('settings', showSettingsPage, '設定'));
    
    // ★★★ 新規 (1/5) ★★★
    tabs.catch.addEventListener('click', () => navigateTo('catch', showCatchPage, '捕獲記録'));
}

/**
 * 画面を切り替える（タブが押されたときに呼ばれる）
 * @param {string} pageId - 'trap', 'gun', 'info', 'settings', 'catch'
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
                if (appState.trapView === 'open') {
                    navigateTo('trap', showTrapPage, '罠 (設置中)');
                } else {
                    navigateTo('trap', showClosedTrapPage, '罠設置履歴');
                }
            }
            else if (appState.currentPage === 'gun') {
                navigateTo('gun', showGunPage, '銃');
            }
            // ★★★ 新規 (1/5) ★★★
            else if (appState.currentPage === 'catch') {
                navigateTo('catch', showCatchPage, '捕獲記録');
            }
            // ★★★ ここまで ★★★
            else if (appState.currentPage === 'info') navigateTo('info', showInfoPage, '情報');
            else if (appState.currentPage === 'settings') navigateTo('settings', showSettingsPage, '設定');
            else navigateTo('trap', showTrapPage, '罠 (設置中)'); // デフォルトに戻る
        };
    }

    // ヘッダーアクションボタンを一旦クリア
    headerActions.innerHTML = '';
}

// --- 共通ヘルパー関数 ---
// (変更なしのため省略)
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