// ============================================================================
// js/app.js - アプリ初期化、ナビゲーション、設定適用 (戻るボタン連動版)
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

    console.log("Window loaded. Initializing app...");
    
    db.open().then(async () => {
        console.log("Database opened successfully.");
        
        await loadAndApplySettings();
        await populateDefaultTrapTypes();
        await populateDefaultHunterProfile();
        await populateGameAnimalListIfNeeded(false);
        
        setupNavigation();
        
        // 初期表示
        showTrapPage();
        
    }).catch(e => {
        console.error("Database open failed:", e);
        alert('データベースの起動に失敗しました。アプリを再読み込みしてください。');
    });
});

// ----------------------------------------------------------------------------
// 2. ナビゲーション & ヘッダー制御 (戻るボタン連動)
// ----------------------------------------------------------------------------

function setupNavigation() {
    // タブ切り替えイベント
    tabs.trap.onclick = () => navigateTo('trap', showTrapPage, '罠管理');
    tabs.gun.onclick = () => navigateTo('gun', showGunPage, '銃・使用履歴');
    tabs.catch.onclick = () => navigateTo('catch', showCatchPage, '捕獲記録');
    tabs.checklist.onclick = () => navigateTo('checklist', showChecklistPage, 'チェックリスト');
    tabs.info.onclick = () => navigateTo('info', showInfoPage, '情報');
    tabs.settings.onclick = () => navigateTo('settings', showSettingsPage, '設定');

    // ★追加: スマホの物理戻るボタン(popstate)の監視
    window.addEventListener('popstate', (event) => {
        // 詳細画面が表示されている状態で戻るボタンが押された場合
        if (appState.isDetailView) {
            // 画面上の「戻るボタン」に設定されている関数を実行する
            if (backButton && typeof backButton.onclick === 'function') {
                backButton.onclick(); 
                // 注意: onclick内で updateHeader(..., false) が呼ばれ、isDetailViewがfalseになります
            } else {
                // 万が一設定がない場合は罠一覧へ戻す
                showTrapPage();
            }
        }
    });
}

// タブ移動処理
function navigateTo(pageKey, pageFunc, title) {
    appState.currentPage = pageKey;
    
    // タブの見た目を更新
    Object.keys(tabs).forEach(key => {
        const btn = tabs[key];
        if (key === pageKey) {
            btn.classList.replace('tab-inactive', 'tab-active');
            btn.classList.add('text-blue-600');
            btn.querySelector('i').classList.add('text-blue-600');
        } else {
            btn.classList.replace('tab-active', 'tab-inactive');
            btn.classList.remove('text-blue-600');
            btn.querySelector('i').classList.remove('text-blue-600');
        }
    });

    // ページ描画実行
    pageFunc();
}

// ヘッダー更新 (★ここでHistory APIを操作します)
function updateHeader(title, showBack = false) {
    // タイトル設定
    if (headerTitle) headerTitle.textContent = title;
    
    // 戻るボタンの表示制御
    if (backButton) {
        if (showBack) {
            backButton.classList.remove('hidden');
            
            // ★詳細画面に入った時、履歴を追加する
            // (まだ詳細モードでない場合のみpushStateする)
            if (!appState.isDetailView) {
                appState.isDetailView = true;
                history.pushState({ mode: 'detail' }, null, '');
            }
            
        } else {
            backButton.classList.add('hidden');
            
            // ★一覧画面に戻った時
            appState.isDetailView = false;
            // ここで history.back() は呼びません（無限ループ防止のため）。
            // ユーザーがボタンを押した場合は履歴が1つ進んだ状態になりますが、
            // 次に物理戻るボタンを押したときに popstate が発火し、この関数が再度呼ばれて整合性が保たれます。
            
            backButton.onclick = null; // イベントリスナー解除
        }
    }
}

// ----------------------------------------------------------------------------
// 3. 設定読み込み関連
// ----------------------------------------------------------------------------

async function loadAndApplySettings() {
    try {
        const theme = await db.settings.get('theme');
        if (theme) applyTheme(theme.value);
        
        const fontSizeSetting = await db.settings.get('fontSize');
        if (!fontSizeSetting) {
            // デフォルト設定
            await db.settings.put({ key: 'fontSize', value: 'medium' });
        } else {
            applyFontSize(fontSizeSetting.value);
        }
        
        await applyBackgroundImage();
    } catch (err) { console.error("Settings load failed:", err); }
}

async function applyBackgroundImage() {
    const bgDiv = document.getElementById('global-bg');
    if(!bgDiv) return;

    try {
        const imgRec = await db.settings.get('backgroundImage');
        const opRec = await db.settings.get('backgroundOpacity');
        const opacity = opRec ? parseFloat(opRec.value) : 0.3;
        bgDiv.style.opacity = opacity;

        if (imgRec && imgRec.value) {
            // 画像データ(Blob)をURLに変換
            // common.js で定義した base64ToBlob は import/export時用なので、
            // ここではDBから取得したBlobを直接使うか、古い形式(Base64文字列)なら変換する
            let blob = imgRec.value;
            // もし古いデータでBase64文字列のまま保存されていた場合の互換処理
            if (typeof blob === 'string') {
                 // base64ToBlobがcommon.jsにある前提
                 blob = base64ToBlob(blob);
            }

            if (blob) {
                const url = URL.createObjectURL(blob);
                bgDiv.style.backgroundImage = `url(${url})`;
            }
        } else {
            bgDiv.style.backgroundImage = 'none';
        }
    } catch (e) {
        console.error('背景設定の適用に失敗:', e);
    }
}

function applyTheme(themeValue) {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-sepia', 'theme-light-green', 'theme-light-blue');
    root.classList.add(
        themeValue === 'sepia' ? 'theme-sepia' : 
        themeValue === 'lightgreen' ? 'theme-light-green' : 
        themeValue === 'lightblue' ? 'theme-light-blue' : 
        themeValue === 'dark' ? 'theme-dark' :
        'theme-light'
    );
}

function applyFontSize(size) {
    const root = document.documentElement;
    // Tailwindの基本文字サイズ(rem)を操作する代わりに、bodyのクラス等で調整
    // ここでは簡易的にhtmlのfont-sizeを変更してremの基準を変える手法をとります
    // default 14px (0.875rem) based on Tailwind 'text-sm' in body
    
    let scale = 100;
    if (size === 'xsmall') scale = 85;
    if (size === 'small') scale = 92;
    if (size === 'medium') scale = 100;
    if (size === 'large') scale = 110;
    if (size === 'xlarge') scale = 125;

    root.style.fontSize = `${scale}%`;
}