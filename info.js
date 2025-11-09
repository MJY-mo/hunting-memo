// このファイルは info.js です

/**
 * 「情報」タブがクリックされたときに main.js から呼ばれるメイン関数
 */
function showInfoPage() {
    // navigateTo は main.js で定義されたグローバル関数
    navigateTo('info', renderInfoMenu, '情報');
}

/**
 * 情報タブのメインメニューを描画する
 */
function renderInfoMenu() {
    // 戻るボタンを非表示
    updateHeader('情報', false);

    // app は main.js で定義されたグローバル変数
    app.innerHTML = `
        <div class="p-4 bg-white shadow rounded-lg">
            <h2 class="text-xl font-semibold mb-4">情報タブ</h2>
            <p class="text-gray-600">ここは「情報」タブのコンテンツです。</p>
            <p class="text-gray-600 mt-2">
                （ここに「狩猟法」「狩猟鳥獣」「猟期一覧」「狩猟者データ」のメニューを作成します）
            </p>
        </div>
    `;
    
    // TODO: 各メニューへのイベントリスナーを追加
}