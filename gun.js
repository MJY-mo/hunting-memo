// このファイルは gun.js です

/**
 * 「銃」タブがクリックされたときに main.js から呼ばれるメイン関数
 */
function showGunPage() {
    // navigateTo は main.js で定義されたグローバル関数
    navigateTo('gun', renderGunMenu, '銃');
}

/**
 * 銃タブのメインメニューを描画する
 */
function renderGunMenu() {
    // 戻るボタンを非表示
    updateHeader('銃', false);

    // app は main.js で定義されたグローバル変数
    app.innerHTML = `
        <div class="p-4 bg-white shadow rounded-lg">
            <h2 class="text-xl font-semibold mb-4">銃タブ</h2>
            <p class="text-gray-600">ここは「銃」タブのコンテンツです。</p>
            <p class="text-gray-600 mt-2">
                （ここに「銃使用履歴」「弾の出納簿」「所持銃の管理」のメニューを作成します）
            </p>
        </div>
    `;
    
    // TODO: 各メニューへのイベントリスナーを追加
}