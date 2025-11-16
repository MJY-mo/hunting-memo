// このファイルは settings.js です
// ★ 修正: 「全データ削除」機能を廃止
// ★ 修正: 「使用方法」のアコーディオンセクションを上部に追加

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
                </ul>
                <p id="csv-status" class="text-sm text-center text-gray-500 h-4 mt-2"></p>
            </div>
        </div>
    `;
    
    // イベントリスナー
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

        // ★ 修正: CSVエクスポートのリスナー
        document.getElementById('export-gun-logs-csv-btn').addEventListener('click', exportGunLogsAsCSV);
        document.getElementById('export-catches-csv-btn').addEventListener('click', exportCatchesAsCSV);

    } catch (err) {
        console.error("Failed to load settings in settings page:", err);
        app.innerHTML = `<div class="error-box">設定の読み込みに失敗しました。</div>`;
    }
}


// =======================================================
// ★★★ インポート/エクスポート機能 (v10 スキーマ対応) ★★★
// =======================================================

/**
 * データベースの全データをエクスポートする
 */
async function exportData() {
    const backupData = {
        export_format_version: '10.0', // v10 スキーマ
        export_date: new Date().toISOString(),
        tables: {}
    };
    
    // v10 のテーブルリスト
    const tablesToExport = [
        'hunter_profile', 'settings', 'trap', 'trap_type', 'gun', 'gun_log',
        'catch_records', 'checklist_sets', 'checklist_items', 'game_animal_list',
        'ammo_purchases', 'profile_images'
    ];
    
    // 1. 全テーブルのデータを並列取得
    const dataArrays = await Promise.all(
        tablesToExport.map(tableName => db[tableName].toArray())
    );
    
    // 2. Blobを含むデータをBase64に変換
    const convertedTables = {};
    for (let i = 0; i < tablesToExport.length; i++) {
        const tableName = tablesToExport[i];
        let data = dataArrays[i];
        
        // 画像Blobを含むテーブルの処理
        if (tableName === 'trap' || tableName === 'catch_records' || tableName === 'gun_log' || tableName === 'profile_images') {
            data = await Promise.all(
                data.map(async (item) => ({
                    ...item,
                    image_blob: await blobToBase64(item.image_blob) // ヘルパー関数
                }))
            );
        }
        convertedTables[tableName] = data;
    }

    backupData.tables = convertedTables;

    // 3. ファイル名の決定
    const profile = await db.hunter_profile.get('main');
    const hunterName = profile && profile.name ? profile.name.replace(/ /g, '_') : 'Hunter';
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    const filename = `${hunterName}_backup_v10_${dateStr}.json`;

    // 4. JSONファイルとしてダウンロード
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

    if (!backupData.tables) {
        throw new Error('無効なバックアップファイル形式です。');
    }
    
    const { tables } = backupData;
    
    // 1. Base64をBlobに非同期変換
    const convertTableImages = async (tableName) => {
        if (!tables[tableName]) return [];
        return Promise.all(
            tables[tableName].map(async (item) => ({
                ...item,
                image_blob: await base64ToBlob(item.image_blob) // ヘルパー関数
            }))
        );
    };

    const convertedTrap = await convertTableImages('trap');
    const convertedCatchRecords = await convertTableImages('catch_records');
    const convertedGunLog = await convertTableImages('gun_log');
    const convertedProfileImages = await convertTableImages('profile_images');
    
    // 互換性: 古い 'catch' テーブル
    const convertedCatch = await convertTableImages('catch'); 
    // 互換性: 古い 'photos' 'profile_photos'
    const convertedPhotos = await convertTableImages('photos');
    const convertedProfilePhotos = await convertTableImages('profile_photos');


    // 2. トランザクションですべてのデータを書き込む
    await db.transaction(
        'rw',
        db.tables, // すべてのテーブル
        async () => {
            // 2.1. 全テーブルをクリア
            await Promise.all(db.tables.map(table => table.clear()));
            
            // 2.2. 全テーブルにデータをバルク追加
            await Promise.all([
                db.hunter_profile.bulkAdd(tables.hunter_profile || []),
                db.settings.bulkAdd(tables.settings || []),
                db.trap_type.bulkAdd(tables.trap_type || []),
                db.gun.bulkAdd(tables.gun || []),
                db.ammo_purchases.bulkAdd(tables.ammo_purchases || []),
                db.game_animal_list.bulkAdd(tables.game_animal_list || []),
                db.checklist_sets.bulkAdd(tables.checklist_sets || []),
                db.checklist_items.bulkAdd(tables.checklist_items || []),
                
                // 変換後データを追加
                db.trap.bulkAdd(convertedTrap), 
                db.catch_records.bulkAdd(convertedCatchRecords),
                db.gun_log.bulkAdd(convertedGunLog),
                db.profile_images.bulkAdd(convertedProfileImages),
                
                // 古いデータ形式からのインポート互換
                db.catch_records.bulkAdd(convertedCatch), // catch -> catch_records
                db.profile_images.bulkAdd(convertedProfilePhotos) // profile_photos -> profile_images
            ]);
        }
    );
}

// --- CSVエクスポート機能 (v10スキーマ対応) -----------------------

/**
 * CSV文字列を生成するヘルパー関数
 */
function convertToCSV(data, headers) {
    let csv = '\uFEFF'; // BOM
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

/**
 * CSVをダウンロードさせるヘルパー関数
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

// --- Base64 / Blob ヘルパー ---

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