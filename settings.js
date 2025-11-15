// このファイルは settings.js です
// ★ 修正: 'db.catch' を 'db.catch_records' に変更
// ★ 修正: 2025/11/15 ユーザー指摘のUI・ロジック修正を適用 (UI, 戻るボタン, 哺乳類フィルタ)
// ★ 修正: 捕獲タブの「新規記録」ボタンを廃止
// ★ 修正: 2025/11/15 ユーザー指摘のUI修正を適用 (ボタン色, 注意書き)
// ★ 修正: 銃使用履歴と捕獲記録のCSVダウンロード機能を追加

/**
 * 「設定」タブのメインページを表示する
 */
function showSettingsPage() {
    navigateTo('settings', renderSettingsMenu, '設定');
}

/**
 * 設定タブのメインメニューを描画する
 */
async function renderSettingsMenu() {
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
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">データ管理 (バックアップ)</h2>
                <div class="space-y-3">
                    <button id="export-data-btn" class="btn btn-primary w-full">
                        <i class="fas fa-download"></i> 全データのエクスポート (.json)
                    </button>
                    <button id="import-data-btn" class="btn btn-secondary w-full">
                        <i class="fas fa-upload"></i> データのインポート (.json)
                    </button>
                    <input type="file" id="import-file-input" class="hidden" accept="application/json">
                    
                    <button id="delete-all-data-btn" class="btn btn-danger w-full">
                        <i class="fas fa-trash-alt"></i> 全データの削除 (リセット)
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
            
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">データ管理 (CSV)</h2>
                <div class="space-y-3">
                    <button id="export-gun-logs-csv-btn" class="btn btn-secondary w-full">
                        <i class="fas fa-file-csv"></i> 銃使用履歴 をCSVで出力
                    </button>
                    <button id="export-catches-csv-btn" class="btn btn-secondary w-full">
                        <i class="fas fa-file-csv"></i> 捕獲記録 をCSVで出力
                    </button>
                    <p id="csv-status" class="text-sm text-center text-gray-500 h-4"></p>
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
    
    // JSONエクスポート
    document.getElementById('export-data-btn').addEventListener('click', exportAllData);
    
    // JSONインポート (ボタンがファイル入力をクリックする)
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
    
    // ★ 新規: CSVエクスポートのリスナー
    document.getElementById('export-gun-logs-csv-btn').addEventListener('click', exportGunLogsAsCSV);
    document.getElementById('export-catches-csv-btn').addEventListener('click', exportCatchesAsCSV);
}


// --- JSON (バックアップ) 機能 ---------------------------------

/**
 * データベースの全データをエクスポートする
 */
async function exportAllData() {
    const statusEl = document.getElementById('data-status');
    statusEl.textContent = 'エクスポート準備中...';
    try {
        const exportData = {};
        
        // 全テーブルのデータを収集 (v10 スキーマ)
        exportData.trap = await db.trap.toArray();
        exportData.trap_type = await db.trap_type.toArray();
        exportData.catch_records = await db.catch_records.toArray();
        exportData.gun = await db.gun.toArray();
        exportData.gun_log = await db.gun_log.toArray();
        exportData.ammo_purchases = await db.ammo_purchases.toArray();
        exportData.game_animal_list = await db.game_animal_list.toArray();
        exportData.checklist_sets = await db.checklist_sets.toArray();
        exportData.checklist_items = await db.checklist_items.toArray();
        exportData.settings = await db.settings.toArray();
        exportData.hunter_profile = await db.hunter_profile.toArray();
        exportData.profile_images = await db.profile_images.toArray();
        
        // (画像データはBlobのままエクスポート)

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


// --- ★ 新規: CSVエクスポート機能 -----------------------------

/**
 * CSV文字列を生成するヘルパー関数
 * @param {Array<object>} data - オブジェクトの配列
 * @param {Array<string>} headers - CSVのヘッダー配列
 * @returns {string} CSV文字列
 */
function convertToCSV(data, headers) {
    // BOM を追加してExcelでの文字化けを防ぐ
    let csv = '\uFEFF';
    
    // ヘッダー行
    csv += headers.join(',') + '\r\n';
    
    // データ行
    data.forEach(row => {
        const values = headers.map(header => {
            let value = row[header];
            if (value === null || value === undefined) {
                value = '';
            }
            // 値にカンマや改行、ダブルクォートが含まれる場合はエスケープ
            let escaped = value.toString().replace(/"/g, '""');
            if (escaped.search(/([,\r\n"])/g) >= 0) {
                escaped = `"${escaped}"`;
            }
            return escaped;
        });
        csv += values.join(',') + '\r\n';
    });
    
    return csv;
}

/**
 * CSVをダウンロードさせるヘルパー関数
 * @param {string} csvString - CSV文字列
 * @param {string} filename - ダウンロードファイル名
 */
function downloadCSV(csvString, filename) {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
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
 * 銃使用履歴をCSVでエクスポートする
 */
async function exportGunLogsAsCSV() {
    const statusEl = document.getElementById('csv-status');
    statusEl.textContent = '銃使用履歴を作成中...';
    
    try {
        const logs = await db.gun_log.orderBy('use_date').toArray();
        if (logs.length === 0) {
            statusEl.textContent = '出力する履歴がありません。';
            setTimeout(() => { statusEl.textContent = ''; }, 3000);
            return;
        }

        // 銃のIDと名前のマップを作成
        const guns = await db.gun.toArray();
        const gunMap = new Map(guns.map(g => [g.id, g.name]));

        // CSV用データに整形
        const dataForCSV = logs.map(log => ({
            ID: log.id,
            使用日: log.use_date,
            銃: gunMap.get(log.gun_id) || '不明',
            目的: log.purpose,
            消費弾数: log.ammo_count || 0,
            同行者: log.companion || '',
            場所: log.location || '',
            緯度: log.latitude || '',
            経度: log.longitude || '',
            メモ: log.memo || ''
        }));
        
        const headers = ['ID', '使用日', '銃', '目的', '消費弾数', '同行者', '場所', '緯度', '経度', 'メモ'];
        const csv = convertToCSV(dataForCSV, headers);
        
        const timestamp = new Date().toISOString().split('T')[0];
        downloadCSV(csv, `gun_logs_${timestamp}.csv`);
        
        statusEl.textContent = '銃使用履歴を出力しました。';

    } catch (err) {
        console.error("Failed to export gun logs:", err);
        statusEl.textContent = 'CSVエクスポートに失敗しました。';
    } finally {
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
    }
}

/**
 * 捕獲記録をCSVでエクスポートする
 */
async function exportCatchesAsCSV() {
    const statusEl = document.getElementById('csv-status');
    statusEl.textContent = '捕獲記録を作成中...';

    try {
        const catches = await db.catch_records.orderBy('catch_date').toArray();
        if (catches.length === 0) {
            statusEl.textContent = '出力する記録がありません。';
            setTimeout(() => { statusEl.textContent = ''; }, 3000);
            return;
        }

        // 関連データのマップを作成
        const traps = await db.trap.toArray();
        const trapMap = new Map(traps.map(t => [t.id, t.trap_number]));
        
        const gunLogs = await db.gun_log.toArray();
        const gunLogMap = new Map(gunLogs.map(gl => [gl.id, gl.use_date])); // ひとまず日付を紐付け

        // CSV用データに整形
        const dataForCSV = catches.map(record => {
            let method = '不明';
            let relation = '';
            if (record.trap_id) {
                method = '罠';
                relation = trapMap.get(record.trap_id) || `(削除済罠 ID:${record.trap_id})`;
            } else if (record.gun_log_id) {
                method = '銃';
                relation = gunLogMap.get(record.gun_log_id) ? `(使用日:${gunLogMap.get(record.gun_log_id)})` : `(削除済履歴 ID:${record.gun_log_id})`;
            }

            return {
                ID: record.id,
                捕獲日: record.catch_date,
                種名: record.species_name,
                性別: record.gender,
                年齢: record.age,
                方法: method,
                関連情報: relation,
                緯度: record.latitude || '',
                経度: record.longitude || '',
                メモ: record.memo || ''
            };
        });
        
        const headers = ['ID', '捕獲日', '種名', '性別', '年齢', '方法', '関連情報', '緯度', '経度', 'メモ'];
        const csv = convertToCSV(dataForCSV, headers);
        
        const timestamp = new Date().toISOString().split('T')[0];
        downloadCSV(csv, `catch_records_${timestamp}.csv`);
        
        statusEl.textContent = '捕獲記録を出力しました。';

    } catch (err) {
        console.error("Failed to export catches:", err);
        statusEl.textContent = 'CSVエクスポートに失敗しました。';
    } finally {
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
    }
}