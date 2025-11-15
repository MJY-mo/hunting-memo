// このファイルは settings.js です
// ★ 修正: 2025/11/15 ユーザー指摘のUI修正を適用

/**
 * 「設定」タブのメインページを表示する
 */
async function showSettingsPage() {
    // 現在の設定をDBから読み込む
    let currentTheme = 'light';
    let currentFontSize = 'medium';

    try {
        const themeSetting = await db.settings.get('theme');
        if (themeSetting) currentTheme = themeSetting.value;
        
        const fontSizeSetting = await db.settings.get('fontSize');
        if (fontSizeSetting) currentFontSize = fontSizeSetting.value;
    } catch (err) {
        console.error("Failed to load settings:", err);
        // エラーでも続行
    }
    
    const themeOption = (value, label) => `
        <option value="${value}" ${currentTheme === value ? 'selected' : ''}>${label}</option>
    `;
    const fontOption = (value, label) => `
        <option value="${value}" ${currentFontSize === value ? 'selected' : ''}>${label}</option>
    `;

    app.innerHTML = `
        <div class="space-y-4">
            <h2 class="page-title">設定</h2>
            
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">外観</h2>
                <div class="form-group">
                    <label for="setting-theme" class="form-label">テーマ:</label>
                    <select id="setting-theme" class="form-select">
                        ${themeOption('light', 'ライト')}
                        ${themeOption('dark', 'ダーク')}
                        ${themeOption('sepia', 'セピア')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="setting-font-size" class="form-label">文字サイズ:</label>
                    <select id="setting-font-size" class="form-select">
                        ${fontOption('xsmall', '極小')}
                        ${fontOption('small', '小')}
                        ${fontOption('medium', '中')}
                        ${fontOption('large', '大')}
                        ${fontOption('xlarge', '極大')}
                    </select>
                </div>
            </div>
            
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">データ管理</h2>
                <div class="space-y-3">
                    <button id="export-data-btn" class="btn btn-primary w-full">
                        全データのエクスポート
                    </button>
                    <button id="import-data-btn" class="btn btn-secondary w-full">
                        データのインポート
                    </button>
                    <input type="file" id="import-file-input" class="hidden" accept="application/json">
                    
                    <button id="delete-all-data-btn" class="btn btn-danger w-full">
                        全データの削除 (リセット)
                    </button>
                    
                    <p id="data-status" class="text-sm text-center text-gray-500 h-4"></p>
                    
                    <p class="text-lg text-red-600 font-bold">
                        使用上の注意（データ管理）
                    </p>
                    <p class="text-sm text-gray-600 leading-relaxed">
                        データはすべてお使いのブラウザ（端末）内に保存されています。機種変更やブラウザのアンインストール、キャッシュ削除を行うとデータは失われます。
                        定期的に「全データのエクスポート」を行い、ご自身でバックアップを保存してください。
                    </p>
                </div>
            </div>
        </div>
    `;

    // ヘッダーを更新
    updateHeader('設定', false);
    
    // --- イベントリスナー ---
    
    // テーマ変更
    document.getElementById('setting-theme').addEventListener('change', async (e) => {
        const newTheme = e.target.value;
        try {
            await db.settings.put({ key: 'theme', value: newTheme });
            applyTheme(newTheme); // main.js の共通関数
        } catch (err) {
            console.error("Failed to save theme setting:", err);
        }
    });

    // 文字サイズ変更
    document.getElementById('setting-font-size').addEventListener('change', async (e) => {
        const newSize = e.target.value;
        try {
            await db.settings.put({ key: 'fontSize', value: newSize });
            applyFontSize(newSize); // main.js の共通関数
        } catch (err) {
            console.error("Failed to save font size setting:", err);
        }
    });
    
    // エクスポート
    document.getElementById('export-data-btn').addEventListener('click', exportAllData);
    
    // インポート (ボタンがファイル入力をクリックする)
    const importFileInput = document.getElementById('import-file-input');
    document.getElementById('import-data-btn').addEventListener('click', () => {
        importFileInput.click();
    });
    importFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importAllData(e.target.files[0]);
        }
    });
    
    // 全削除
    document.getElementById('delete-all-data-btn').addEventListener('click', deleteAllData);
}

/**
 * データベースの全データをエクスポートする
 */
async function exportAllData() {
    const statusEl = document.getElementById('data-status');
    statusEl.textContent = 'エクスポート準備中...';
    try {
        const exportData = {};
        
        // 全テーブルのデータを収集
        exportData.trap = await db.trap.toArray();
        exportData.trap_type = await db.trap_type.toArray();
        exportData.catch_records = await db.catch_records.toArray();
        exportData.gun = await db.gun.toArray();
        exportData.gun_log = await db.gun_log.toArray();
        exportData.ammo_purchases = await db.ammo_purchases.toArray(); // v8
        exportData.game_animal_list = await db.game_animal_list.toArray(); // (通常は不要だが念のため)
        exportData.checklist_sets = await db.checklist_sets.toArray(); // v9
        exportData.checklist_items = await db.checklist_items.toArray(); // v9
        exportData.settings = await db.settings.toArray();
        exportData.hunter_profile = await db.hunter_profile.toArray();
        exportData.profile_images = await db.profile_images.toArray(); // v10

        // Blobを作成
        const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // ダウンロードリンクを作成してクリック
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        a.download = `hunting_app_backup_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        
        // 後片付け
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        statusEl.textContent = 'エクスポートが完了しました。';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);

    } catch (err) {
        console.error("Failed to export data:", err);
        statusEl.textContent = 'エクスポートに失敗しました。';
    }
}

/**
 * データをインポートする
 * @param {File} file - インポートする JSON ファイル
 */
async function importAllData(file) {
    if (!confirm('本当にデータをインポートしますか？\n【現在のデータはすべて上書きされます！】\nこの操作は元に戻せません。')) {
        return;
    }

    const statusEl = document.getElementById('data-status');
    statusEl.textContent = 'インポート中...';

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // トランザクションですべてのデータを書き込む
        await db.transaction('rw', db.tables, async () => {
            // 全テーブルをクリア
            for (const table of db.tables) {
                await table.clear();
            }
            
            // 各テーブルにデータを投入
            // (v10 スキーマ)
            if (data.trap) await db.trap.bulkAdd(data.trap);
            if (data.trap_type) await db.trap_type.bulkAdd(data.trap_type);
            if (data.catch_records) await db.catch_records.bulkAdd(data.catch_records);
            if (data.gun) await db.gun.bulkAdd(data.gun);
            if (data.gun_log) await db.gun_log.bulkAdd(data.gun_log);
            if (data.ammo_purchases) await db.ammo_purchases.bulkAdd(data.ammo_purchases);
            if (data.game_animal_list) await db.game_animal_list.bulkAdd(data.game_animal_list);
            if (data.checklist_sets) await db.checklist_sets.bulkAdd(data.checklist_sets);
            if (data.checklist_items) await db.checklist_items.bulkAdd(data.checklist_items);
            if (data.settings) await db.settings.bulkAdd(data.settings);
            if (data.hunter_profile) await db.hunter_profile.bulkAdd(data.hunter_profile);
            if (data.profile_images) await db.profile_images.bulkAdd(data.profile_images);

            // 古い 'catch' テーブル (v1-v4) に対応
            if (data.catch) await db.catch_records.bulkAdd(data.catch);
        });

        statusEl.textContent = 'インポートが完了しました。リロードします...';
        
        // 設定を再適用してリロード
        await loadAndApplySettings();
        location.reload();

    } catch (err) {
        console.error("Failed to import data:", err);
        statusEl.textContent = 'インポートに失敗しました。ファイルが破損しているか、形式が違います。';
    }
}

/**
 * データベースの全データを削除する
 */
async function deleteAllData() {
    if (!confirm('本当にすべてのデータを削除しますか？\n【バックアップしていないデータは失われます！】\nこの操作は元に戻せません。')) {
        return;
    }
    if (prompt('確認のため、半角で「delete」と入力してください。') !== 'delete') {
        alert('入力が一致しなかったため、キャンセルしました。');
        return;
    }
    
    const statusEl = document.getElementById('data-status');
    statusEl.textContent = '全データを削除中...';

    try {
        // 全テーブルをクリア
        await db.transaction('rw', db.tables, async () => {
            for (const table of db.tables) {
                await table.clear();
            }
        });
        
        statusEl.textContent = '全データを削除しました。リロードします...';
        
        // デフォルトデータを再投入してリロード
        // (db.open() は自動で走る)
        await populateDefaultTrapTypes();
        await populateDefaultHunterProfile();
        await populateGameAnimalListIfNeeded();
        await loadAndApplySettings();
        
        location.reload();

    } catch (err) {
        console.error("Failed to delete all data:", err);
        statusEl.textContent = 'データの削除に失敗しました。';
    }
}