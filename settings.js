// このファイルは settings.js です

/**
 * 「設定」タブがクリックされたときに main.js から呼ばれるメイン関数
 */
function showSettingsPage() {
    // navigateTo は main.js で定義されたグローバル関数
    navigateTo('settings', renderSettingsMenu, '設定');
}

/**
 * 設定タブのメインメニューを描画する
 */
function renderSettingsMenu() {
    // 戻るボタンを非表示
    updateHeader('設定', false);

    // app は main.js で定義されたグローバル変数
    app.innerHTML = `
        <div class="p-4 bg-white shadow rounded-lg">
            <h2 class="text-xl font-semibold mb-4">設定タブ</h2>
            <p class="text-gray-600">ここは「設定」タブのコンテンツです。</p>
            <p class="text-gray-600 mt-2">
                （ここに「テーマ設定」「データのエクスポート/インポート」のメニューを作成します）
            </p>
        </div>
    `;
    
    // TODO: 各メニューへのイベントリスナーを追加
}