// ============================================================================
// js/app.js - アプリ初期化、ナビゲーション、設定適用 (戻るボタン対応版)
// ============================================================================

// ----------------------------------------------------------------------------
// 1. アプリ初期化 (Entry Point)
// ----------------------------------------------------------------------------
window.addEventListener('load', () => {
    // 背景用DIVの初期化
    let bgDiv = document.getElementById('global-bg');
    if (!bgDiv) {
        bgDiv = document.createElement('div');
        bgDiv.id = 'global-bg';
        bgDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; z-index:-1; background-size:cover; background-position:center; pointer-events:none; transition: opacity 0.3s;';
        document.body.prepend(bgDiv);
    }

    // 戻るボタン制御用の変数を初期化
    appState.isDetailView = false;   // 現在詳細ページにいるか
    appState.onBackAction = null;    // 戻る時に実行する関数

    console.log("Window loaded. Initializing app...");
    
    db.open().then(async () => {
        console.log("Database opened successfully.");
        
        await loadAndApplySettings();
        await populateDefaultTrapTypes();
        await populateDefaultHunterProfile();
        await populateGameAnimalListIfNeeded(false);
        
        setupTabs();
        
        // 初期状態を履歴にセット
        history.replaceState({ page: 'home' }, null, '');

        navigateTo('trap', showTrapPage, '罠');
        
    }).catch(err => {
        console.error("Failed to open database:", err);
        app.innerHTML = `<div class="error-box">データベースの起動に失敗しました。<br>${err.message}</div>`;
    });
});

// ----------------------------------------------------------------------------
// 2. ナビゲーション & 戻るボタン管理 (Router & History)
// ----------------------------------------------------------------------------

// ▼ スマホの「戻るボタン」が押された時の処理 ▼
window.addEventListener('popstate', (event) => {
    // 詳細モードで、戻るアクションが登録されている場合
    if (appState.onBackAction) {
        // 保存しておいた「戻る時の処理（一覧に戻るなど）」を実行
        const action = appState.onBackAction;
        
        // フラグ類をリセット
        appState.onBackAction = null;
        appState.isDetailView = false;
        
        // 実行
        action();
    } else {
        // 戻るアクションがない（トップページなど）場合は、
        // アプリを終了させるかブラウザの挙動に任せる
        // (PWAの場合はここでアプリが最小化される等の挙動になる)
    }
});

function setupTabs() {
    // タブ切り替え時は履歴スタックをリセットするような挙動にする
    const handleTabClick = (pageId, func, title) => {
        // 詳細ビューにいる時にタブを押した場合、フラグをリセット
        appState.isDetailView = false;
        appState.onBackAction = null;
        navigateTo(pageId, func, title);
    };

    if(tabs.trap) tabs.trap.addEventListener('click', () => handleTabClick('trap', showTrapPage, '罠'));
    if(tabs.gun) tabs.gun.addEventListener('click', () => handleTabClick('gun', showGunPage, '銃'));
    if(tabs.catch) tabs.catch.addEventListener('click', () => handleTabClick('catch', showCatchPage, '捕獲'));
    if(tabs.checklist) tabs.checklist.addEventListener('click', () => handleTabClick('checklist', showChecklistPage, 'チェック'));
    if(tabs.info) tabs.info.addEventListener('click', () => handleTabClick('info', showInfoPage, '情報'));
    if(tabs.settings) tabs.settings.addEventListener('click', () => handleTabClick('settings', showSettingsPage, '設定'));
}

function navigateTo(pageId, pageFunction, title) {
    if (appState.activeBlobUrls && appState.activeBlobUrls.length > 0) {
        appState.activeBlobUrls.forEach(url => URL.revokeObjectURL(url));
        appState.activeBlobUrls = [];
    }
    
    appState.currentPage = pageId;
    
    Object.values(tabs).forEach(tab => { 
        if(tab) tab.classList.replace('tab-active', 'tab-inactive'); 
    });
    if (tabs[pageId]) tabs[pageId].classList.replace('tab-inactive', 'tab-active');
    
    updateHeader(title, false);
    
    try { 
        pageFunction(); 
    } catch (err) { 
        console.error(`Failed to render page: ${pageId}`, err); 
        app.innerHTML = `<div class="error-box">エラー: ${err.message}</div>`; 
    }
}

// ▼ ヘッダー更新関数（ここが戻るボタン連携の肝） ▼
function updateHeader(title, showBack = false, onBackClick = null) {
    if(headerTitle) headerTitle.textContent = title;
    
    if(backButton) {
        backButton.classList.toggle('hidden', !showBack);

        if (showBack) {
            // --- 詳細画面（戻るボタンあり）に来た時 ---

            // まだ詳細モードでなければ、履歴に「詳細」を追加する
            if (!appState.isDetailView) {
                history.pushState({ mode: 'detail' }, null, '');
                appState.isDetailView = true;
            }

            // 「戻る」を実行した時の処理を保存しておく
            // (指定がなければ、現在のタブのトップに戻るデフォルト動作)
            appState.onBackAction = onBackClick || (() => {
                const defaultActions = {
                    trap: showTrapPage,
                    gun: showGunPage,
                    catch: showCatchPage,
                    checklist: showChecklistPage,
                    info: showInfoPage,
                    settings: showSettingsPage
                };
                const action = defaultActions[appState.currentPage];
                if (action) navigateTo(appState.currentPage, action, title); // タイトルは仮
            });

            // アプリ内の「戻るボタン」を押した時は、
            // 直接関数を呼ばず、ブラウザの履歴を戻す（→ popstateが発火 → onBackActionが実行される）
            backButton.onclick = () => {
                history.back();
            };

        } else {
            // --- トップ画面（戻るボタンなし）に来た時 ---
            appState.isDetailView = false;
            appState.onBackAction = null;
        }
    }
    
    if(headerActions) headerActions.innerHTML = '';
}

// ----------------------------------------------------------------------------
// 3. 設定適用ロジック
// ----------------------------------------------------------------------------

async function loadAndApplySettings() {
    try {
        let themeSetting = await db.settings.get('theme');
        if (!themeSetting) { 
            themeSetting = { key: 'theme', value: 'light' }; 
            await db.settings.put(themeSetting); 
        }
        applyTheme(themeSetting.value);
        
        let fontSizeSetting = await db.settings.get('fontSize');
        if (!fontSizeSetting) { 
            fontSizeSetting = { key: 'fontSize', value: 'medium' }; 
            await db.settings.put(fontSizeSetting); 
        }
        applyFontSize(fontSizeSetting.value);
        
        await applyBackgroundImage();
    } catch (err) { console.error("Settings load failed:", err); }
}

async function applyBackgroundImage() {
    const bgDiv = document.getElementById('global-bg');
    if(!bgDiv) return;

    const imgRec = await db.settings.get('backgroundImage');
    const opRec = await db.settings.get('backgroundOpacity');
    const opacity = opRec ? parseFloat(opRec.value) : 0.3;
    bgDiv.style.opacity = opacity;

    if (imgRec && imgRec.value) {
        const url = URL.createObjectURL(imgRec.value);
        bgDiv.style.backgroundImage = `url(${url})`;
    } else {
        bgDiv.style.backgroundImage = 'none';
    }
}

function applyTheme(themeValue) {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-sepia', 'theme-light-green', 'theme-light-blue');
    root.classList.add(
        themeValue === 'sepia' ? 'theme-sepia' : 
        themeValue === 'lightgreen' ? 'theme-light-green' : 
        themeValue === 'lightblue' ? 'theme-light-blue' : 
        'theme-light'
    );
}

function applyFontSize(sizeValue) {
    const root = document.documentElement;
    root.classList.remove('font-size-xsmall', 'font-size-small', 'font-size-medium', 'font-size-large', 'font-size-xlarge');
    root.classList.add(`font-size-${sizeValue}`);
}