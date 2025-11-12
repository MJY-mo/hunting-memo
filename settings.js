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
        <div class="space-y-4">
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">データ管理</h2>
                <ul class="space-y-2">
                    <li>
                        <button class="btn btn-secondary w-full" disabled>データのエクスポート (未実装)</button>
                    </li>
                    <li>
                        <button class="btn btn-secondary w-full" disabled>データのインポート (未実装)</button>
                    </li>
                </ul>
            </div>
        </div>
    `;
    
    // ★★★ 修正 (2/3): イベントリスナーを削除 ★★★
}

// ★★★ 修正 (2/3): 以下の2関数を (trap.js に移植するため) 削除 ★★★
// showManageTrapTypesPage()
// renderTrapTypeList()