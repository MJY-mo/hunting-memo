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
async function renderSettingsMenu() {
    // 戻るボタンを非表示
    updateHeader('設定', false);

    // app は main.js で定義されたグローバル変数
    app.innerHTML = `
        <div class="space-y-4">

            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">表示設定</h2>
                
                <div class="form-group">
                    <label for="setting-theme" class="form-label">背景色</label>
                    <select id="setting-theme" class="form-select">
                        <option value="light">ライト (デフォルト)</option>
                        <option value="dark">ダーク</option>
                        <option value="sepia">セピア</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="setting-font-size" class="form-label">文字サイズ</label>
                    <select id="setting-font-size" class="form-select">
                        <option value="xsmall">特小 (12px)</option>
                        <option value="small">小 (14px)</option>
                        <option value="medium">中 (16px - デフォルト)</option>
                        <option value="large">大 (18px)</option>
                        <option value="xlarge">特大 (20px)</option>
                    </select>
                </div>
            </div>

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
    
    // ★★★ 修正 (3/3): イベントリスナー (変更なし) ★★★
    const themeSelect = document.getElementById('setting-theme');
    const fontSizeSelect = document.getElementById('setting-font-size');

    try {
        // 1. DBから現在の設定値を読み込み、プルダウンに反映
        const themeSetting = await db.settings.get('theme');
        if (themeSetting) {
            themeSelect.value = themeSetting.value;
        }
        
        const fontSizeSetting = await db.settings.get('fontSize');
        if (fontSizeSetting) {
            fontSizeSelect.value = fontSizeSetting.value;
        }

        // 2. テーマ変更時のイベント
        themeSelect.addEventListener('change', async (e) => {
            const newValue = e.target.value;
            try {
                // DBに保存
                await db.settings.put({ key: 'theme', value: newValue });
                // 即時適用 (main.js の関数を呼び出す)
                applyTheme(newValue);
            } catch (err) {
                console.error("Failed to save theme setting:", err);
                alert('テーマの保存に失敗しました。');
            }
        });

        // 3. 文字サイズ変更時のイベント
        fontSizeSelect.addEventListener('change', async (e) => {
            const newValue = e.target.value;
            try {
                // DBに保存
                await db.settings.put({ key: 'fontSize', value: newValue });
                // 即時適用 (main.js の関数を呼び出す)
                applyFontSize(newValue);
            } catch (err) {
                console.error("Failed to save font size setting:", err);
                alert('文字サイズの保存に失敗しました。');
            }
        });

    } catch (err) {
        console.error("Failed to load settings in settings page:", err);
        app.innerHTML = `<div class="error-box">設定の読み込みに失敗しました。</div>`;
    }
}