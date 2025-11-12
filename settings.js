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
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">アプリについて</h2>
                
                <details class="mb-2">
                    <summary class="text-md font-semibold cursor-pointer select-none">
                        基本的な使用方法 (タップで開く)
                    </summary>
                    <div class="mt-2 pt-2 border-t text-sm text-gray-700 space-y-2">
                        <p>このアプリは、狩猟に関する記録をオフラインで管理するためのPWA（プログレッシブ・ウェブ・アプリ）です。</p>
                        <ul class="list-disc list-inside">
                            <li><strong>データ保存:</strong> 入力されたすべてのデータ（罠、銃、捕獲記録など）は、お使いのブラウザ（スマホ）の内部ストレージにのみ保存されます。</li>
                            <li><strong>タブ操作:</strong> 画面下部のタブで各機能（罠、銃、捕獲など）を切り替えます。</li>
                            <li><strong>項目管理:</strong> 「罠」や「銃」タブ内の管理メニューから、罠の種類や実包の種類などを自分で追加・編集できます。</li>
                        </ul>
                    </div>
                </details>

                <details>
                    <summary class="text-md font-semibold cursor-pointer select-none">
                        使用上の注意 (データ管理)
                    </summary>
                    <div class="mt-2 pt-2 border-t text-sm text-red-700 space-y-2">
                        <p class="font-bold">！重要！ データはサーバーに保存されません。</p>
                        <ul class="list-disc list-inside">
                            <li>データはすべて、今お使いのデバイス（スマホやPC）のブラウザ内に保存されます。</li>
                            <li><strong>ブラウザのキャッシュや履歴を（設定から）完全に消去すると、すべてのデータが失われ、復元できません。</strong></li>
                            <li>機種変更の際、データは自動で引き継がれません。（将来的にエクスポート/インポート機能を実装予定です）</li>
                            <li>アプリの更新（バグ修正など）でデータが消えることはありませんが、万が一に備えて重要なデータは別途メモを取ることを推奨します。</li>
                        </ul>
                    </div>
                </details>

            </div>
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
    
    // (イベントリスナーは現在不要)
}