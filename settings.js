// このファイルは settings.js です

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
            <div class="card bg-white">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">使用方法</h2>
                <div class="space-y-2">
                    <details class="text-sm">
                        <summary class="text-md font-semibold cursor-pointer select-none">
                            <span class="w-6 inline-block">⛓️</span> 罠タブ
                        </summary>
                        <div class="mt-2 pt-2 border-t text-gray-700 space-y-2">
                           <p>罠の設置・管理を行います。</p>
                           <ul class="list-disc list-inside space-y-1">
                                <li><strong>種類を管理:</strong> 「種類を管理」のボタンから、罠の種類（型式や構造）の候補を編集できます。</li>
                                <li><strong>新規設置:</strong> 「新規設置」ボタンから、新しく架設する罠を入力します。</li>
                                <li><strong>設置中の罠:</strong> 現在設置している罠の一覧です。クリックすると詳細が見られます。</li>
                                <li><strong>過去の罠:</strong> 設置中の罠を編集し「解除」した罠がここに移動します。</li>
                                <li><strong>罠の詳細:</strong>
                                    <ul class="list-disc list-inside ml-4">
                                        <li>ページ上部にあるボタンから、編集や削除ができます。</li>
                                        <li>「この罠での捕獲記録を追加」: この罠に紐付いた捕獲記録を作成します。</li>
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
                                        <li>「所持銃の管理」ボタンから、所持している銃の名前、銃種、口径を登録できます。</li>
                                        <li>銃の名前のリストをタップすると、各銃の「詳細ページ」へ移動します。</li>
                                    </ul>
                                </li>
                                <li><strong>銃の詳細:</strong>
                                    <ul class="list-disc list-inside ml-4">
                                        <li>ページ上部にあるボタンから、編集や削除ができます。</li>
                                        <li>「弾の管理」セクションで、その銃の弾の「購入」を記録し、使用履歴と連動した「消費」から「残弾」を自動計算します。</li>
                                    </ul>
                                </li>
                                <li><strong>銃使用履歴:</strong>
                                    <ul class="list-disc list-inside ml-4">
                                        <li>「新規使用履歴」ボタンから、いつ、どの銃を、どの目的で使ったかを記録します。</li>
                                        <li>「消費弾数」「目的」「同行者」もここで記録できます。</li>
                                        <li>使用履歴リストをタップすると「使用履歴詳細」ページへ移動します。</li>
                                    </ul>
                                </li>
                                <li><strong>使用履歴詳細:</strong>
                                    <ul class="list-disc list-inside ml-4">
                                        <li>「編集」「削除」ボタンはページ上部にあります。</li>
                                        <li>「この使用履歴での捕獲記録を追加」: この履歴に紐付いた捕獲記録を作成します。</li>
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
                                <li>「罠」または「銃」タブの詳細ページから追加された捕獲記録のリストを閲覧できます。</li>
                                <li>罠や銃から紐付いて作成された捕獲記録は、詳細ページから元の罠や銃の履歴にジャンプできます。</li>
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
                                <li>まず「リスト作成」で「単独忍び猟」や「グループ巻狩り」などのリストセットを作成します。</li>
                                <li>作成したリストセットをクリックすると、そのリストの項目編集画面に移ります。</li>
                                <li>「項目管理」から「許可証」「銃」「弾」「ナイフ」などの項目を追加・削除できます。</li>
                                <li>項目一覧のチェックボックスは、タップするだけでON/OFFが保存されます。</li>
                                <li>「チェックをリセット」で、そのリストのすべての項目を一括でOFFに戻せます。</li>
                            </ul>
                        </div>
                    </details>
                    <details class="text-sm">
                        <summary class="text-md font-semibold cursor-pointer select-none">
                            <span class="w-6 inline-block">📖</span> 情報タブ
                        </summary>
                        <div class="mt-2 pt-2 border-t text-gray-700 space-y-2">
                            <ul class="list-disc list-inside space-y-1">
                                <li><strong>鳥獣図鑑:</strong> 狩猟や有害鳥獣駆除の対象の鳥獣を一覧できます。</li>
                                <li><strong>捕獲者情報:</strong>
                                    <ul class="list-disc list-inside ml-4">
                                        <li>銃所持許可証や狩猟免許などの「期限」をテキストで保存できます。</li>
                                        <li>各期限の欄に、許可証や免許証の「写真」を複数枚アップロードして保存できます。</li>
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
                                <li><strong>データ管理:</strong> バックアップやCSV出力をここで行います。</li>
                                <li><strong>システム更新:</strong> アプリの挙動がおかしい時や、最新版が反映されない時に「最新の状態に更新」を行ってください。</li>
                            </ul>
                        </div>
                    </details>
                </div>
            </div>

            <div class="card bg-white">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">表示設定</h2>
                <div class="form-group">
                    <label for="setting-theme" class="form-label">背景色:</label>
                    <select id="setting-theme" class="form-select">
                        ${themeOption('light', 'ライト (デフォルト)')}
                        ${themeOption('sepia', 'セピア')}
                        ${themeOption('lightgreen', 'ライトグリーン')}
                        ${themeOption('lightblue', 'ライトブルー')}
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
            
            <div class="card bg-white">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">アプリについて</h2>
                <details open> <summary class="text-lg text-red-600 font-bold cursor-pointer select-none">
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

            <div class="card bg-white">
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
                
                <hr class="my-4">
                
                <h3 class="text-md font-semibold mb-2">CSV出力</h3>
                <ul class="space-y-2">
                    <li>
                        <button id="export-gun-logs-csv-btn" class="btn btn-secondary w-full">
                            <i class="fas fa-file-csv"></i> 銃使用履歴 をCSVで出力
                        </button>
                    </li>
                    <li>
                        <button id="export-catches-csv-btn" class="btn btn-secondary w-full">
                            <i class="fas fa-file-csv"></i> 捕獲記録 をCSVで出力
                        </button>
                    </li>
                    
                    <hr class="my-2">
                    <button id="update-game-list-btn" class="btn btn-secondary w-full">
                        <i class="fas fa-sync"></i> 図鑑データをCSVから更新
                    </button>
                    <p id="csv-status" class="text-sm text-center text-gray-500 h-4"></p>
                </ul>
            </div>

            <div class="card bg-white border border-yellow-300">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4 text-yellow-700">システム更新</h2>
                <p class="text-sm text-gray-600 mb-3">
                    アプリの表示がおかしい場合や、最新の機能が反映されていない場合に押してください。<br>
                    キャッシュ（一時保存されたプログラム）を削除して再読み込みします。<br>
                    <strong>※登録済みのデータは消えません。</strong>
                </p>
                <button id="force-app-update-btn" class="btn btn-warning w-full font-bold">
                    <i class="fas fa-sync"></i> アプリを最新の状態に更新
                </button>
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
    
    // JSONインポート
    const importFileInput = document.getElementById('import-file-input');
    document.getElementById('import-data-btn').addEventListener('click', () => {
        if (importFileInput) { 
            importFileInput.click();
        }
    });
    if (importFileInput) {
        importFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importAllData(e.target.files[0]);
            }
        });
    }
    
    // CSVエクスポート
    document.getElementById('export-gun-logs-csv-btn').addEventListener('click', exportGunLogsAsCSV);
    document.getElementById('export-catches-csv-btn').addEventListener('click', exportCatchesAsCSV);

    // 図鑑更新ボタン
    document.getElementById('update-game-list-btn').addEventListener('click', async () => {
        if (!confirm('GitHubから最新のCSVをダウンロードし、鳥獣図鑑を上書きしますか？')) {
            return;
        }
        const statusEl = document.getElementById('csv-status');
        statusEl.textContent = '図鑑を更新中...';
        try {
            await populateGameAnimalListIfNeeded(true); 
            statusEl.textContent = '図鑑を更新しました！';
        } catch (err) {
            console.error("Failed to force update game list:", err);
            statusEl.textContent = '図鑑の更新に失敗しました。';
        } finally {
             setTimeout(() => { statusEl.textContent = ''; }, 3000);
        }
    });

    // ★ 追加: アプリ強制更新ボタンの処理
    document.getElementById('force-app-update-btn').addEventListener('click', async () => {
        if (!confirm('アプリのキャッシュをクリアして再読み込みしますか？\n（登録データは消えません）')) {
            return;
        }

        // ボタンを無効化
        const btn = document.getElementById('force-app-update-btn');
        btn.disabled = true;
        btn.textContent = '更新中...';

        try {
            // 1. Service Worker の登録解除
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            // 2. Cache Storage の全削除
            if ('caches' in window) {
                const keys = await caches.keys();
                for (const key of keys) {
                    await caches.delete(key);
                }
            }

            // 3. ページを強制リロード
            window.location.reload(true);

        } catch (err) {
            console.error("Failed to clear cache:", err);
            alert('キャッシュのクリアに失敗しました。手動でブラウザのキャッシュを削除してください。');
            btn.disabled = false;
            btn.textContent = 'アプリを最新の状態に更新';
        }
    });
}

// --- JSON (バックアップ) 機能 ---
async function exportAllData() {
    const statusEl = document.getElementById('import-export-status');
    statusEl.textContent = 'エクスポート準備中...';
    try {
        const exportData = {};
        const tablesToExport = [
            'hunter_profile', 'settings', 'trap', 'trap_type', 'gun', 'gun_log',
            'catch_records', 'checklist_sets', 'checklist_items', 'game_animal_list',
            'ammo_purchases', 'profile_images'
        ];
        for (const tableName of tablesToExport) {
            if (db[tableName]) {
                exportData[tableName] = await db[tableName].toArray();
            }
        }
        const blobTables = ['trap', 'catch_records', 'gun_log', 'profile_images'];
        for (const tableName of blobTables) {
             if (exportData[tableName]) {
                exportData[tableName] = await Promise.all(
                    exportData[tableName].map(async (item) => ({
                        ...item,
                        image_blob: await blobToBase64(item.image_blob)
                    }))
                );
             }
        }
        const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        a.download = `hunting_app_backup_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        statusEl.textContent = 'エクスポートが完了しました。';
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
    } catch (err) {
        console.error("Failed to export data:", err);
        statusEl.textContent = 'エクスポートに失敗しました。';
    }
}

async function importAllData(file) {
    if (!confirm('本当にデータをインポートしますか？\n【現在のデータはすべて上書きされます！】\nこの操作は元に戻せません。')) {
        return;
    }
    const statusEl = document.getElementById('import-export-status');
    statusEl.textContent = 'インポート中...';
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        const tables = data.tables || data;
        const convertTableImages = async (tableName) => {
            if (!tables[tableName]) return [];
            return Promise.all(
                tables[tableName].map(async (item) => ({
                    ...item,
                    image_blob: await base64ToBlob(item.image_blob)
                }))
            );
        };
        const convertedTrap = await convertTableImages('trap');
        const convertedCatchRecords = await convertTableImages('catch_records');
        const convertedGunLog = await convertTableImages('gun_log');
        const convertedProfileImages = await convertTableImages('profile_images');
        const convertedCatch = await convertTableImages('catch'); 

        await db.transaction('rw', db.tables, async () => {
            await Promise.all(db.tables.map(table => table.clear()));
            await Promise.all([
                db.hunter_profile.bulkAdd(tables.hunter_profile || []),
                db.settings.bulkAdd(tables.settings || []),
                db.trap_type.bulkAdd(tables.trap_type || []),
                db.gun.bulkAdd(tables.gun || []),
                db.ammo_purchases.bulkAdd(tables.ammo_purchases || []),
                db.game_animal_list.bulkAdd(tables.game_animal_list || []),
                db.checklist_sets.bulkAdd(tables.checklist_sets || []),
                db.checklist_items.bulkAdd(tables.checklist_items || []),
                db.trap.bulkAdd(convertedTrap), 
                db.catch_records.bulkAdd(convertedCatchRecords),
                db.gun_log.bulkAdd(convertedGunLog),
                db.profile_images.bulkAdd(convertedProfileImages),
                db.catch_records.bulkAdd(convertedCatch),
            ]);
        });
        statusEl.textContent = 'インポートが完了しました。リロードします...';
        await loadAndApplySettings();
        location.reload();
    } catch (err) {
        console.error("Failed to import data:", err);
        statusEl.textContent = 'インポートに失敗しました。ファイルが破損しているか、形式が違います。';
    }
}

// --- CSVエクスポート機能 ---
function convertToCSV(data, headers) {
    let csv = '\uFEFF';
    csv += headers.join(',') + '\r\n';
    data.forEach(row => {
        const values = headers.map(header => {
            let value = row[header];
            if (value === null || value === undefined) {
                value = '';
            }
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
        const guns = await db.gun.toArray();
        const gunMap = new Map(guns.map(g => [g.id, g.name]));
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
        const traps = await db.trap.toArray();
        const trapMap = new Map(traps.map(t => [t.id, t.trap_number]));
        const gunLogs = await db.gun_log.toArray();
        const gunLogMap = new Map(gunLogs.map(gl => [gl.id, gl.use_date])); 
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

// --- Base64 / Blob ヘルパー ---
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