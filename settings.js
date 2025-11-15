// このファイルは settings.js です (再修正版)
// ★ 修正: インポート/エクスポート機能が v3 スキーマ (単数形テーブル) を参照するように修正
// ★ 修正: 2025/11/15 ユーザー指摘のUI修正を適用

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
        <input type="file" id="import-file-input" class="hidden" accept="application/json">
    
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
                    <summary class="text-lg text-red-600 font-bold cursor-pointer select-none">
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
                <p id="import-export-status" class="text-sm text-gray-500 text-center mb-2"></p>
                <ul class="space-y-2">
                    <li>
                        <button id="export-data-btn" class="btn btn-primary w-full">データのエクスポート (バックアップ)</button>
                    </li>
                    <li>
                        <button id="import-data-btn" class="btn btn-danger w-full">データのインポート (復元)</button>
                    </li>
                </ul>
            </div>
        </div>
    `;
    
    // イベントリスナーを（ほぼ）全書き換え
    const themeSelect = document.getElementById('setting-theme');
    const fontSizeSelect = document.getElementById('setting-font-size');
    const exportBtn = document.getElementById('export-data-btn');
    const importBtn = document.getElementById('import-data-btn');
    const importInput = document.getElementById('import-file-input');
    const statusEl = document.getElementById('import-export-status');

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

        // 4. エクスポートボタンのイベント
        exportBtn.addEventListener('click', async () => {
            if (!window.confirm('現在の全データをバックアップファイルとしてダウンロードしますか？')) return;
            
            statusEl.textContent = 'エクスポート準備中... (写真が多いと時間がかかります)';
            exportBtn.disabled = true;
            importBtn.disabled = true;
            
            try {
                await exportData();
                statusEl.textContent = 'エクスポートが完了しました。';
            } catch (err) {
                console.error("Export failed:", err);
                statusEl.textContent = 'エクスポートに失敗しました。';
                alert(`エクスポートに失敗しました: ${err.message}`);
            } finally {
                exportBtn.disabled = false;
                importBtn.disabled = false;
            }
        });

        // 5. インポートボタンのイベント
        importBtn.addEventListener('click', () => {
            // 非表示のinputをクリックさせる
            importInput.click();
        });
        
        // 6. ファイルが選択された時のイベント
        importInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // ★★★ 重大な警告 ★★★
            if (!window.confirm(
                "！！！警告！！！\n\n" +
                "データをインポート（復元）すると、\n" +
                "**現在のアプリ内のデータはすべて消去されます。**\n\n" +
                "本当に続行しますか？"
            )) {
                importInput.value = null; // 選択をリセット
                return;
            }

            statusEl.textContent = 'インポート処理中...';
            exportBtn.disabled = true;
            importBtn.disabled = true;

            try {
                await importData(file);
                statusEl.textContent = 'インポートに成功しました。';
                alert('インポートが完了しました。アプリをリロードします。');
                window.location.reload();
            } catch (err) {
                console.error("Import failed:", err);
                statusEl.textContent = 'インポートに失敗しました。';
                alert(`インポートに失敗しました: ${err.message}`);
                exportBtn.disabled = false;
                importBtn.disabled = false;
            }
            
            importInput.value = null; // 選択をリセット
        });

    } catch (err) {
        console.error("Failed to load settings in settings page:", err);
        app.innerHTML = `<div class="error-box">設定の読み込みに失敗しました。</div>`;
    }
}


// =======================================================
// ★★★ インポート/エクスポート機能 (v3 スキーマ対応) ★★★
// =======================================================

/**
 * データベースの全データをエクスポートする
 */
async function exportData() {
    const backupData = {
        export_format_version: '3.0', // v3 スキーマ
        export_date: new Date().toISOString(),
        tables: {}
    };
    
    // ★ 修正: v3 のテーブル名 (単数形) に修正
    const [
        hunter_profile, settings, trap, trap_type, gun, gun_log,
        catch_records, checklist_sets, checklist_items, game_animal_list
    ] = await Promise.all([
        db.hunter_profile.toArray(),
        db.settings.toArray(),
        db.trap.toArray(),
        db.trap_type.toArray(),
        db.gun.toArray(),
        db.gun_log.toArray(),
        db.catch_records.toArray(),
        db.checklist_sets.toArray(),
        db.checklist_items.toArray(),
        db.game_animal_list.toArray() // v3 で追加
    ]);
    
    // 2. BlobをBase64に非同期変換 (trap, catch_records, gun_log)
    // (画像持ちテーブルのみ変換)
    const convertedTrap = await Promise.all(
        trap.map(async (item) => ({
            ...item,
            image_blob: await blobToBase64(item.image_blob)
        }))
    );
    const convertedCatchRecords = await Promise.all(
        catch_records.map(async (item) => ({
            ...item,
            image_blob: await blobToBase64(item.image_blob)
        }))
    );
    const convertedGunLog = await Promise.all(
        gun_log.map(async (item) => ({
            ...item,
            image_blob: await blobToBase64(item.image_blob)
        }))
    );
    
    // 4. バックアップオブジェクトに格納
    backupData.tables = {
        hunter_profile, settings, 
        trap: convertedTrap, // 変換後
        trap_type, 
        gun, 
        gun_log: convertedGunLog, // 変換後
        catch_records: convertedCatchRecords, // 変換後
        checklist_sets, checklist_items, 
        game_animal_list
    };

    // 5. ファイル名の決定
    const profile = await db.hunter_profile.get('main');
    const hunterName = profile && profile.name ? profile.name.replace(/ /g, '_') : 'BLNCR';
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    const filename = `${hunterName}_backup_v3_${dateStr}.json`;

    // 6. JSONファイルとしてダウンロード
    const jsonString = JSON.stringify(backupData);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * JSONファイルからデータをインポートする
 * @param {File} file - ユーザーが選択した .json ファイル
 */
async function importData(file) {
    const fileContent = await file.text();
    const backupData = JSON.parse(fileContent);

    if (!backupData.export_format_version || !backupData.tables) {
        throw new Error('無効なバックアップファイル形式です。');
    }
    
    // v3 スキーマのインポートを想定
    const { tables } = backupData;
    
    // 1. Base64をBlobに非同期変換
    const convertedTrap = await Promise.all(
        (tables.trap || []).map(async (item) => ({
            ...item,
            image_blob: await base64ToBlob(item.image_blob)
        }))
    );
    const convertedCatchRecords = await Promise.all(
        (tables.catch_records || []).map(async (item) => ({
            ...item,
            image_blob: await base64ToBlob(item.image_blob)
        }))
    );
    const convertedGunLog = await Promise.all(
        (tables.gun_log || []).map(async (item) => ({
            ...item,
            image_blob: await base64ToBlob(item.image_blob)
        }))
    );

    // 3. トランザクションですべてのデータを書き込む
    // ★ 修正: v3 のテーブル名 (単数形)
    await db.transaction(
        'rw',
        [
            db.hunter_profile, db.settings,
            db.trap, db.trap_type,
            db.gun, db.gun_log,
            db.catch_records, 
            db.checklist_sets, db.checklist_items,
            db.game_animal_list
        ],
        async () => {
            // 3.1. 全テーブルをクリア
            await Promise.all([
                db.hunter_profile.clear(),
                db.settings.clear(),
                db.trap.clear(),
                db.trap_type.clear(),
                db.gun.clear(),
                db.gun_log.clear(),
                db.catch_records.clear(),
                db.checklist_sets.clear(),
                db.checklist_items.clear(),
                db.game_animal_list.clear()
            ]);
            
            // 3.2. 全テーブルにデータをバルク追加
            await Promise.all([
                db.hunter_profile.bulkAdd(tables.hunter_profile || []),
                db.settings.bulkAdd(tables.settings || []),
                db.trap_type.bulkAdd(tables.trap_type || []),
                db.gun.bulkAdd(tables.gun || []),
                db.checklist_sets.bulkAdd(tables.checklist_sets || []),
                db.checklist_items.bulkAdd(tables.checklist_items || []),
                db.game_animal_list.bulkAdd(tables.game_animal_list || []),
                
                // 変換後データを追加
                db.trap.bulkAdd(convertedTrap), 
                db.catch_records.bulkAdd(convertedCatchRecords),
                db.gun_log.bulkAdd(convertedGunLog)
            ]);
        }
    );
}

/**
 * Blob を Base64 データURL に変換する
 */
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        if (!blob || !(blob instanceof Blob)) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
    });
}

/**
 * Base64 データURL を Blob に変換する
 */
async function base64ToBlob(base64Data) {
    if (!base64Data) {
        return null;
    }
    try {
        const response = await fetch(base64Data);
        return await response.blob();
    } catch (e) {
        console.error("Failed to convert base64 to blob", e);
        return null;
    }
}