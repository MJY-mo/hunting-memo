// このファイルは settings.js です
// ★ 修正: 「全データ削除」機能を廃止
// ★ 修正: 「使用方法」のアコーディオンセクションを上部に追加
// ★ 修正: 「図鑑データをCSVから更新」ボタンを追加

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
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">使用方法</h2>
                <div class="space-y-2">
                
                    <details class="text-sm">
                        <summary class="text-md font-semibold cursor-pointer select-none">
                            <span class="w-6 inline-block">⛓️</span> 罠タブ
                        </summary>
                        <div class="mt-2 pt-2 border-t text-gray-700 space-y-2">
                            <p>罠の設置・管理を行います。</p>
                            <ul class="list-disc list-inside space-y-1">
                                <li><strong>新規設置:</strong> フィルターの上にある「新規設置」ボタンから、新しい罠の場所、種類、番号を登録します。</li>
                                <li><strong>種類を管理:</strong> 「新規設置」の隣にあるボタンから、罠の種類（くくり罠、箱罠など）のリストを編集できます。</li>
                                <li><strong>設置中の罠:</strong> 現在設置している罠の一覧です。クリックすると詳細が見れます。</li>
                                <li><strong>過去の罠:</strong> 「解除」した罠がここに移動します。「新規設置」ボタンはこのタブでは押せません。</li>
                                <li><strong>罠の詳細:</strong>
                                    <ul class="list-disc list-inside ml-4">
                                        <li>「編集」「削除」ボタンはページ上部にあります。</li>
                                        <li>「この罠での捕獲記録を追加」: この罠に紐付いた捕獲記録を直接作成できます。</li>
                                        <li>「この罠を解除する」: 日付を選択し、緑のボタンを押すと「過去の罠」に移動します。</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                    </details>
                    
                    <details class="text-sm">
                        <summary class="text-md font-semibold cursor-pointer select-none">
                            <span class="w-6 inline-block">🔫</span> 銃タブ
                        </summary>
                        <div class="mt-2 pt-2 border-t text-gray-700 space-y-2">
                            <p>銃と、その使用履歴を管理します。</p>
                            <ul class="list-disc list-inside space-y-1">
                                <li><strong>所持銃と口径:</strong>
                                    <ul class="list-disc list-inside ml-4">
                                        <li>「所持銃の管理」ボタンから、所持している銃のニックネーム、銃種、口径を登録できます。</li>
                                        <li>このリストをクリックすると、各銃の「詳細ページ」へ移動します。</li>
                                    </ul>
                                </li>
                                <li><strong>銃の詳細:</strong>
                                    <ul class="list-disc list-inside ml-4">
                                        <li>「編集」「削除」ボタンはページ上部にあります。</li>
                                        <li>「弾の管理」セクションで、その銃の弾の「購入」を記録し、「消費」（使用履歴と連動）と「残弾」を自動計算します。購入履歴は個別に削除できます。</li>
                                    </ul>
                                </li>
                                <li><strong>銃使用履歴:</strong>
                                    <ul class="list-disc list-inside ml-4">
                                        <li>「新規使用履歴」ボタンから、いつ、どの銃を、どの目的で使ったかを記録します。</li>
                                        <li>「消費弾数」と「同行者」もここで記録できます。</li>
                                        <li>リストをクリックすると「使用履歴詳細」ページへ移動します。</li>
                                    </ul>
                                </li>
                                <li><strong>使用履歴詳細:</strong>
                                    <ul class="list-disc list-inside ml-4">
                                        <li>「編集」「削除」ボタンはページ上部にあります。</li>
                                        <li>「この使用履歴での捕獲記録を追加」: この履歴に紐付いた捕獲記録を直接作成できます。</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                    </details>
                    
                    <details class="text-sm">
                        <summary class="text-md font-semibold cursor-pointer select-none">
                            <span class="w-6 inline-block">🦌</span> 捕獲タブ
                        </summary>
                        <div class="mt-2 pt-2 border-t text-gray-700 space-y-2">
                            <p>すべての捕獲記録を一覧・検索する場所です。</p>
                            <ul class="list-disc list-inside space-y-1">
                                <li>新規の捕獲記録は、このタブからは追加できません。</li>
                                <li>「罠」または「銃」タブの詳細ページから「捕獲記録を追加」ボタンを押して作成してください。</li>
                                <li>フィルターで「方法: 罠」や「種名: イノシシ」などで絞り込めます。</li>
                                <li>罠や銃から紐付いて作成された捕獲記録は、詳細ページから元の罠や銃の履歴にジャンプできます。</li>
                                <li>捕獲記録の編集フォームで「戻る」ボタンを押すと、捕獲リストではなく、元いた罠や銃の詳細ページに戻ります。</li>
                            </ul>
                        </div>
                    </details>
                    
                    <details class="text-sm">
                        <summary class="text-md font-semibold cursor-pointer select-none">
                            <span class="w-6 inline-block">✅</span> チェックタブ
                        </summary>
                        <div class="mt-2 pt-2 border-t text-gray-700 space-y-2">
                            <p>出猟前の持ち物確認などに使います。</p>
                            <ul class="list-disc list-inside space-y-1">
                                <li>最初に「リスト作成」で「単独忍び猟」や「グループ巻狩り」などのリストセットを作成します。</li>
                                <li>作成したリストセットをクリックすると、そのリストの項目編集画面に移ります。</li>
                                <li>「項目管理」から「銃」「弾」「ナイフ」などの項目を追加・削除できます。</li>
                                <li>項目一覧のチェックボックスは、タップするだけでON/OFFが保存されます。</li>
                                <li>「チェックをリセット」で、そのリストのすべての項目をOFFに戻せます。</li>
                            </ul>
                        </div>
                    </details>
                    
                    <details class="text-sm">
                        <summary class="text-md font-semibold cursor-pointer select-none">
                            <span class="w-6 inline-block">📖</span> 情報タブ
                        </summary>
                        <div class="mt-2 pt-2 border-t text-gray-700 space-y-2">
                            <ul class="list-disc list-inside space-y-1">
                                <li><strong>鳥獣図鑑:</strong> 狩猟対象の鳥獣を一覧できます。</li>
                                <li><strong>捕獲者情報:</strong>
                                    <ul class="list-disc list-inside ml-4">
                                        <li>猟銃や狩猟免許などの「期限」をテキストで保存できます。</li>
                                        <li>各期限の欄に、許可証や免許証の「写真」を複数枚アップロードして保存・削除できます。</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                    </details>
                    
                    <details class="text-sm">
                        <summary class="text-md font-semibold cursor-pointer select-none">
                            <span class="w-6 inline-block">⚙️</span> 設定タブ
                        </summary>
                        <div class="mt-2 pt-2 border-t text-gray-700 space-y-2">
                            <ul class="list-disc list-inside space-y-1">
                                <li><strong>外観:</strong> アプリの色（テーマ）や文字サイズを変更できます。</li>
                                <li><strong>データ管理 (バックアップ):</strong>
                                    <ul class="list-disc list-inside ml-4">
                                        <li>「全データのエクスポート (.json)」: 現在の全データ（画像含む）をバックアップファイルとしてダウンロードします。</li>
                                        <li>「データのインポート (.json)」: バックアップファイルを選択し、データを復元します。<strong>（現在のデータは全て消去されます）</strong></li>
                                    </ul>
                                </li>
                                <li><strong>データ管理 (CSV):</strong>
                                    <ul class="list-disc list-inside ml-4">
                                        <li>「銃使用履歴」「捕獲記録」を個別にCSVファイルとしてダウンロードします。Excelでの集計などに使えます。</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                    </details>
                    
                </div>
            </div>

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
                    
                    <hr class="my-2">
                    <button id="update-game-list-btn" class="btn btn-secondary w-full">
                        <i class="fas fa-sync"></i> 図鑑データをCSVから更新
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
    
    // CSVエクスポートのリスナー
    document.getElementById('export-gun-logs-csv-btn').addEventListener('click', exportGunLogsAsCSV);
    document.getElementById('export-catches-csv-btn').addEventListener('click', exportCatchesAsCSV);

    // ★ 新規: 図鑑更新ボタンのリスナー
    document.getElementById('update-game-list-btn').addEventListener('click', async () => {
        if (!confirm('GitHubから最新のCSVをダウンロードし、鳥獣図鑑を上書きしますか？')) {
            return;
        }
        const statusEl = document.getElementById('csv-status');
        statusEl.textContent = '図鑑を更新中...';
        try {
            // main.js の関数を forceUpdate=true で呼び出す
            await populateGameAnimalListIfNeeded(true); 
            statusEl.textContent = '図鑑を更新しました！';
        } catch (err) {
            console.error("Failed to force update game list:", err);
            statusEl.textContent = '図鑑の更新に失敗しました。';
        } finally {
             setTimeout(() => { statusEl.textContent = ''; }, 3000);
        }
    });
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


// --- CSVエクスポート機能 -----------------------------

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

        // CSV用データに整形 (v10 スキーマ)
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
        const gunLogMap = new Map(gunLogs.map(gl => [gl.id, gl.use_date])); 

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