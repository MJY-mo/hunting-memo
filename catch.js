// このファイルは catch.js です
// ★ 修正: 'db.catch' を 'db.catch_records' に変更

/**
 * 「捕獲記録」タブのメインページを表示する
 * (タブがクリックされたときの初期化)
 */
function showCatchPage() {
    // 状態をリセット
    appState.currentCatchMethod = 'all';
    appState.currentCatchRelationId = null;
    
    // リストページを表示
    showCatchListPage();
}

/**
 * 捕獲記録の「一覧ページ」を表示する
 */
async function showCatchListPage() {
    // フィルター状態の読み込み
    const filters = appState.catchFilters;
    
    // ★ 修正: currentCatchMethod が 'all' でない場合（＝罠や銃から遷移した場合）
    // フィルターを強制的にリセットする
    if (appState.currentCatchMethod !== 'all') {
        filters.method = 'all';
        filters.species = '';
        filters.gender = 'all';
        filters.age = 'all';
        // ソート順もリセット
        appState.catchSort.key = 'catch_date';
        appState.catchSort.order = 'desc';
    }
    
    const sort = appState.catchSort;

    let html = `
        <div class="page-content">
            <div class="filter-controls">
                
                <div class="filter-group">
                    <label for="catch-filter-method">方法:</label>
                    <select id="catch-filter-method" class="filter-select">
                        <option value="all" ${filters.method === 'all' ? 'selected' : ''}>すべて</option>
                        <option value="trap" ${filters.method === 'trap' ? 'selected' : ''}>罠</option>
                        <option value="gun" ${filters.method === 'gun' ? 'selected' : ''}>銃</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="catch-filter-species">種名:</label>
                    <input type_="text" id="catch-filter-species" class="filter-input" value="${escapeHTML(filters.species)}" placeholder="例: イノシシ">
                </div>
                
                <div class="filter-group">
                    <label for="catch-filter-gender">性別:</label>
                    <select id="catch-filter-gender" class="filter-select">
                        <option value="all" ${filters.gender === 'all' ? 'selected' : ''}>すべて</option>
                        <option value="オス" ${filters.gender === 'オス' ? 'selected' : ''}>オス</option>
                        <option value="メス" ${filters.gender === 'メス' ? 'selected' : ''}>メス</option>
                        <option value="不明" ${filters.gender === '不明' ? 'selected' : ''}>不明</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="catch-filter-age">年齢:</label>
                    <select id="catch-filter-age" class="filter-select">
                        <option value="all" ${filters.age === 'all' ? 'selected' : ''}>すべて</option>
                        <option value="成獣" ${filters.age === '成獣' ? 'selected' : ''}>成獣</option>
                        <option value="亜成獣" ${filters.age === '亜成獣' ? 'selected' : ''}>亜成獣</option>
                        <option value="幼獣" ${filters.age === '幼獣' ? 'selected' : ''}>幼獣</option>
                        <option value="不明" ${filters.age === '不明' ? 'selected' : ''}>不明</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label for="catch-sort-key">ソート:</label>
                    <select id="catch-sort-key" class="filter-select">
                        <option value="catch_date" ${sort.key === 'catch_date' ? 'selected' : ''}>捕獲日</option>
                        <option value="species_name" ${sort.key === 'species_name' ? 'selected' : ''}>種名</option>
                    </select>
                    <select id="catch-sort-order" class="filter-select">
                        <option value="desc" ${sort.order === 'desc' ? 'selected' : ''}>降順</option>
                        <option value="asc" ${sort.order === 'asc' ? 'selected' : ''}>昇順</option>
                    </select>
                </div>
                
                <button id="catch-filter-reset" class="button button-secondary button-small">リセット</button>
            </div>

            <ul id="catch-list" class="data-list">
                <li><i class="fas fa-spinner fa-spin"></i> 読み込み中...</li>
            </ul>
        </div>
    `;
    
    app.innerHTML = html;

    // ヘッダーの制御
    if (appState.currentCatchMethod === 'trap') {
        // 罠から来た場合
        updateHeader('罠の捕獲記録', true);
        backButton.onclick = () => showTrapDetailPage(appState.currentCatchRelationId);
        // 新規登録ボタンを非表示 (罠詳細からのみ登録)
        headerActions.innerHTML = ''; 
    } else if (appState.currentCatchMethod === 'gun') {
        // 銃から来た場合
        updateHeader('銃の捕獲記録', true);
        backButton.onclick = () => showGunLogDetailPage(appState.currentCatchRelationId);
        // 新規登録ボタンを非表示 (銃詳細からのみ登録)
        headerActions.innerHTML = '';
    } else {
        // 通常のタブ表示
        updateHeader('捕獲記録', false);
        
        // 新規登録ボタン（総合）
        const newButton = document.createElement('button');
        newButton.id = 'new-catch-button-general';
        newButton.className = 'button-header-action';
        newButton.innerHTML = '<i class="fas fa-plus"></i>';
        newButton.onclick = () => {
            // 罠にも銃にも紐付かない捕獲記録を作成
            showCatchEditForm(null, { trapId: null, gunLogId: null });
        };
        headerActions.appendChild(newButton);
    }
    
    // --- イベントリスナー設定 ---
    
    // フィルター値の更新とリスト再描画
    const setupFilterListener = (id, stateKey, stateSubKey = null) => {
        document.getElementById(id).addEventListener('change', (e) => {
            if (stateSubKey) {
                appState[stateKey][stateSubKey] = e.target.value;
            } else {
                appState[stateKey] = e.target.value;
            }
            renderCatchList();
        });
    };

    setupFilterListener('catch-filter-method', 'catchFilters', 'method');
    setupFilterListener('catch-filter-gender', 'catchFilters', 'gender');
    setupFilterListener('catch-filter-age', 'catchFilters', 'age');
    setupFilterListener('catch-sort-key', 'catchSort', 'key');
    setupFilterListener('catch-sort-order', 'catchSort', 'order');

    // 種名フィルター (入力中も反映)
    document.getElementById('catch-filter-species').addEventListener('input', (e) => {
        appState.catchFilters.species = e.target.value;
        renderCatchList();
    });

    // リセットボタン
    document.getElementById('catch-filter-reset').addEventListener('click', () => {
        appState.catchFilters.method = 'all';
        appState.catchFilters.species = '';
        appState.catchFilters.gender = 'all';
        appState.catchFilters.age = 'all';
        appState.catchSort.key = 'catch_date';
        appState.catchSort.order = 'desc';
        // フォームをリセットして再描画
        showCatchListPage();
    });

    // リストの初回描画
    await renderCatchList();
}

/**
 * 捕獲リストを描画する (フィルタリング実行)
 */
async function renderCatchList() {
    const listElement = document.getElementById('catch-list');
    if (!listElement) return;
    
    listElement.innerHTML = `<li><i class="fas fa-spinner fa-spin"></i> 読み込み中...</li>`;

    try {
        // ★ 修正: db.catch -> db.catch_records
        let query = db.catch_records;
        
        const filters = appState.catchFilters;
        
        // --- フィルタリング ---
        // 1. 方法 (インデックス利用)
        if (filters.method === 'trap') {
            // trap_id が 0 でないもの (0 は 'general' 登録)
            query = query.where('trap_id').notEqual(0);
        } else if (filters.method === 'gun') {
            // gun_log_id が 0 でないもの
            query = query.where('gun_log_id').notEqual(0);
        }
        
        // 2. 種名 (インデックスが使えないため、Dexieの filter)
        if (filters.species) {
            const speciesFilter = filters.species.toLowerCase();
            query = query.filter(c => c.species_name && c.species_name.toLowerCase().includes(speciesFilter));
        }
        
        // 3. 性別 (インデックス利用)
        if (filters.gender !== 'all') {
            query = query.where('gender').equals(filters.gender);
        }
        
        // 4. 年齢 (インデックス利用)
        if (filters.age !== 'all') {
            query = query.where('age').equals(filters.age);
        }

        // --- 特定の罠/銃からの遷移の場合、さらに絞り込む ---
        if (appState.currentCatchMethod === 'trap') {
            // 罠IDで絞り込み (currentCatchRelationId には trapId が入っている)
            query = query.where('trap_id').equals(appState.currentCatchRelationId);
        } else if (appState.currentCatchMethod === 'gun') {
            // 銃ログIDで絞り込み (currentCatchRelationId には gunLogId が入っている)
            query = query.where('gun_log_id').equals(appState.currentCatchRelationId);
        }
        
        // --- ソート ---
        const sortKey = appState.catchSort.key;
        const sortOrder = appState.catchSort.order;
        
        query = query.orderBy(sortKey);
        const catches = await query.toArray();

        if (sortOrder === 'desc') {
            catches.reverse(); // Dexie は reverse() が簡単
        }

        if (catches.length === 0) {
            listElement.innerHTML = `<li class="no-data">該当する捕獲記録はありません。</li>`;
            return;
        }

        // --- HTML構築 ---
        let listItems = '';
        for (const record of catches) {
            // 関連情報を取得
            let relationText = '';
            if (record.trap_id) {
                const trap = await db.trap.get(record.trap_id);
                relationText = trap 
                    ? `<span class="badge badge-trap">${escapeHTML(trap.trap_number)} (${escapeHTML(trap.type)})</span>`
                    : `<span class="badge badge-secondary">罠 (削除済)</span>`;
            } else if (record.gun_log_id) {
                const log = await db.gun_log.get(record.gun_log_id);
                if (log) {
                    const gun = await db.gun.get(log.gun_id);
                    relationText = gun
                        ? `<span class="badge badge-gun">${escapeHTML(gun.name)}</span>`
                        : `<span class="badge badge-gun">銃 (削除済)</span>`;
                } else {
                    relationText = `<span class="badge badge-secondary">銃使用 (削除済)</span>`;
                }
            } else {
                relationText = `<span class="badge badge-general">直接記録</span>`;
            }

            listItems += `
                <li class="data-list-item" data-id="${record.id}">
                    <div class="item-main-content">
                        <strong>${escapeHTML(record.species_name)}</strong>
                        <span class="item-sub-text">${formatDate(record.catch_date)}</span>
                    </div>
                    <div class="item-action-content">
                        ${relationText}
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </li>
            `;
        }
        
        listElement.innerHTML = listItems;

        // --- クリックイベント ---
        listElement.querySelectorAll('.data-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id, 10);
                showCatchDetailPage(id);
            });
        });

    } catch (err) {
        console.error("Failed to render catch list:", err);
        listElement.innerHTML = `<li class="no-data error">捕獲記録の読み込みに失敗しました: ${err.message}</li>`;
    }
}


// --- 捕獲記録 (詳細) ---------------------------------

/**
 * 捕獲記録の「詳細ページ」を表示する
 * @param {number} id - 表示する捕獲記録のDB ID
 */
async function showCatchDetailPage(id) {
    try {
        // ★ 修正: db.catch -> db.catch_records
        const record = await db.catch_records.get(id);
        if (!record) {
            app.innerHTML = `<div class="error-box">該当するデータが見つかりません。</div>`;
            return;
        }

        // --- 関連情報の表示 ---
        let relationHTML = '';
        if (record.trap_id) {
            const trap = await db.trap.get(record.trap_id);
            relationHTML = `
                <div class="info-section relation-link" data-trap-id="${record.trap_id}">
                    <h4><i class="fas fa-link icon"></i> 関連する罠</h4>
                    <p>${trap ? `${escapeHTML(trap.trap_number)} (${escapeHTML(trap.type)})` : '削除された罠'}</p>
                </div>
            `;
        } else if (record.gun_log_id) {
            const log = await db.gun_log.get(record.gun_log_id);
            if (log) {
                const gun = await db.gun.get(log.gun_id);
                relationHTML = `
                    <div class="info-section relation-link" data-gun-log-id="${record.gun_log_id}">
                        <h4><i class="fas fa-link icon"></i> 関連する銃使用履歴</h4>
                        <p>${gun ? escapeHTML(gun.name) : '不明な銃'} (${formatDate(log.use_date)})</p>
                    </div>
                `;
            }
        } else {
             relationHTML = `
                <div class="info-section">
                    <h4><i class="fas fa-link icon"></i> 関連</h4>
                    <p>この捕獲は、罠や銃使用履歴に紐付いていません。</p>
                </div>
            `;
        }

        // --- 画像の表示 ---
        let imageHTML = '';
        if (record.image_blob) {
            const blobUrl = URL.createObjectURL(record.image_blob);
            imageHTML = `
                <div class="info-section">
                    <h4>写真</h4>
                    <div class="info-image-container">
                        <img src="${blobUrl}" alt="捕獲写真" id="detail-image" class="clickable-image">
                    </div>
                </div>
            `;
        }

        // --- 基本情報のテーブル ---
        const tableData = [
            { label: '種名', value: record.species_name },
            { label: '捕獲日', value: formatDate(record.catch_date) },
            { label: '性別', value: record.gender },
            { label: '年齢', value: record.age },
            { label: '緯度', value: record.latitude },
            { label: '経度', value: record.longitude },
        ];

        let tableHTML = '<div class="info-section"><h4>基本情報</h4><table class="info-table">';
        tableData.forEach(row => {
            if (row.value) { // 値が設定されているものだけ表示
                tableHTML += `
                    <tr>
                        <th>${escapeHTML(row.label)}</th>
                        <td>${escapeHTML(row.value)}</td>
                    </tr>
                `;
            }
        });
        tableHTML += '</table></div>';
        
        // --- メモ ---
        let memoHTML = '';
        if (record.memo) {
            memoHTML = `
                <div class="info-section">
                    <h4>メモ</h4>
                    <p class="info-memo">${escapeHTML(record.memo).replace(/\n/g, '<br>')}</p>
                </div>
            `;
        }

        // --- 最終的なHTML ---
        app.innerHTML = `
            <div class="page-content info-detail-page">
                ${relationHTML}
                ${imageHTML}
                ${tableHTML}
                ${memoHTML}
            </div>
        `;

        // --- ヘッダーの更新 ---
        updateHeader('捕獲記録 詳細', true);
        backButton.onclick = () => {
            // 状態に応じてリストに戻る
            showCatchListPage();
        };

        // アクションボタン（編集・削除）
        headerActions.innerHTML = ''; // クリア
        
        // 編集ボタン
        const editButton = document.createElement('button');
        editButton.className = 'button-header-action';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.onclick = () => showCatchEditForm(id);
        headerActions.appendChild(editButton);

        // 削除ボタン
        const deleteButton = document.createElement('button');
        deleteButton.className = 'button-header-action';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.onclick = () => deleteCatchRecord(id);
        headerActions.appendChild(deleteButton);
        
        // --- イベントリスナー ---
        
        // 画像モーダル
        const imgElement = document.getElementById('detail-image');
        if (imgElement) {
            imgElement.addEventListener('click', () => {
                showImageModal(imgElement.src); // (main.js 側で revokeURL 処理)
            });
        }
        
        // 関連リンク
        const relationLink = document.querySelector('.relation-link');
        if (relationLink) {
            if (relationLink.dataset.trapId) {
                relationLink.addEventListener('click', () => showTrapDetailPage(parseInt(relationLink.dataset.trapId, 10)));
            } else if (relationLink.dataset.gunLogId) {
                relationLink.addEventListener('click', () => showGunLogDetailPage(parseInt(relationLink.dataset.gunLogId, 10)));
            }
        }

    } catch (err) {
        console.error("Failed to show catch detail:", err);
        app.innerHTML = `<div class="error-box">詳細の読み込みに失敗しました: ${err.message}</div>`;
    }
}


// --- 捕獲記録 (編集/新規) -----------------------------

/**
 * 捕獲記録の「編集/新規作成フォーム」を表示する
 * @param {number | null} id - 編集する記録のID (新規の場合は null)
 * @param {object | null} relationIds - 関連ID (新規用)
 * @param {number | null} relationIds.trapId - 関連する罠ID
 * @param {number | null} relationIds.gunLogId - 関連する銃使用ID
 */
async function showCatchEditForm(id, relationIds = null) {
    let record = {
        trap_id: relationIds?.trapId || null,
        gun_log_id: relationIds?.gunLogId || null,
        catch_date: new Date().toISOString().split('T')[0], // デフォルトを今日に
        species_name: '',
        gender: '不明',
        age: '不明',
        memo: '',
        image_blob: null,
        latitude: '',
        longitude: ''
    };
    
    let pageTitle = '新規捕獲記録';
    let currentImageHTML = '';

    if (id) {
        // 編集の場合
        pageTitle = '捕獲記録の編集';
        // ★ 修正: db.catch -> db.catch_records
        const existingRecord = await db.catch_records.get(id);
        if (existingRecord) {
            record = existingRecord;
            
            // 既存画像の表示
            if (record.image_blob) {
                const blobUrl = URL.createObjectURL(record.image_blob);
                currentImageHTML = `
                    <div class="form-group">
                        <label>現在の写真:</label>
                        <div class="info-image-container">
                            <img src="${blobUrl}" alt="既存の写真" id="current-image" class="clickable-image">
                        </div>
                        <button type=_button" id="remove-image-btn" class="button button-danger button-small">写真を削除</button>
                    </div>
                `;
            }
        } else {
            app.innerHTML = `<div class="error-box">編集対象のデータが見つかりません。</div>`;
            return;
        }
    }

    app.innerHTML = `
        <div class="page-content">
            <form id="catch-form" class="form-container">
                <div class="form-group">
                    <label for="catch-species">種名 <span class="required">*</span>:</label>
                    <input type="text" id="catch-species" value="${escapeHTML(record.species_name)}" required list="species-datalist">
                    <datalist id="species-datalist">
                        </datalist>
                </div>

                <div class="form-group">
                    <label for="catch-date">捕獲日 <span class="required">*</span>:</label>
                    <input type="date" id="catch-date" value="${escapeHTML(record.catch_date)}" required>
                </div>

                <div class="form-group">
                    <label for="catch-gender">性別:</label>
                    <select id="catch-gender">
                        <option value="不明" ${record.gender === '不明' ? 'selected' : ''}>不明</option>
                        <option value="オス" ${record.gender === 'オス' ? 'selected' : ''}>オス</option>
                        <option value="メス" ${record.gender === 'メス' ? 'selected' : ''}>メス</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="catch-age">年齢:</label>
                    <select id="catch-age">
                        <option value="不明" ${record.age === '不明' ? 'selected' : ''}>不明</option>
                        <option value="成獣" ${record.age === '成獣' ? 'selected' : ''}>成獣</option>
                        <option value="亜成獣" ${record.age === '亜成獣' ? 'selected' : ''}>亜成獣</option>
                        <option value="幼獣" ${record.age === '幼獣' ? 'selected' : ''}>幼獣</option>
                    </select>
                </div>

                <h3 class="form-section-title">位置情報</h3>
                <div class="form-group-row">
                    <div class="form-group">
                        <label for="catch-latitude">緯度:</label>
                        <input type="number" step="any" id="catch-latitude" value="${escapeHTML(record.latitude)}" placeholder="例: 35.12345">
                    </div>
                    <div class="form-group">
                        <label for="catch-longitude">経度:</label>
                        <input type="number" step="any" id="catch-longitude" value="${escapeHTML(record.longitude)}" placeholder="例: 139.12345">
                    </div>
                </div>
                <button type="button" id="get-catch-gps-btn" class="button button-secondary button-full">
                    <i class="fas fa-map-marker-alt"></i> 現在地を取得
                </button>

                <h3 class="form-section-title">写真</h3>
                ${currentImageHTML}
                <div class="form-group">
                    <label for="catch-image">${id && record.image_blob ? '写真を変更:' : '写真を追加:'}</label>
                    <input type="file" id="catch-image" accept="image/*">
                    <div id="image-preview-container" class="image-preview-container"></div>
                </div>

                <h3 class="form-section-title">メモ</h3>
                <div class="form-group">
                    <textarea id="catch-memo" rows="4">${escapeHTML(record.memo)}</textarea>
                </div>
                
                <button type="submit" class="button button-primary button-full">
                    <i class="fas fa-save"></i> 保存する
                </button>
                <div id="form-error" class="form-error"></div>
            </form>
        </div>
    `;

    // ヘッダーを更新
    updateHeader(pageTitle, true);
    backButton.onclick = () => {
        if (id) {
            showCatchDetailPage(id); // 編集中の場合は詳細に戻る
        } else {
            showCatchListPage(); // 新規の場合はリストに戻る
        }
    };

    // --- フォームの動的処理 ---

    // 1. 図鑑から種名リストをdatalistに読み込む
    loadSpeciesDataList();
    
    // 2. GPS取得ボタン
    document.getElementById('get-catch-gps-btn').addEventListener('click', async (e) => {
        const button = e.currentTarget;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 測位中...';
        button.disabled = true;
        
        try {
            const location = await getCurrentLocation(); // (main.js の共通関数)
            document.getElementById('catch-latitude').value = location.latitude;
            document.getElementById('catch-longitude').value = location.longitude;
        } catch (err) {
            document.getElementById('form-error').textContent = err.message;
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    });
    
    // 3. 画像プレビュー処理
    const imageInput = document.getElementById('catch-image');
    const previewContainer = document.getElementById('image-preview-container');
    let resizedImageBlob = null; // リサイズ後のBlobを保持

    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) {
            previewContainer.innerHTML = '';
            resizedImageBlob = null;
            return;
        }
        
        previewContainer.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 画像処理中...';
        
        try {
            resizedImageBlob = await resizeImage(file, 800); // (main.js の共通関数)
            const previewUrl = URL.createObjectURL(resizedImageBlob);
            
            previewContainer.innerHTML = `
                <img src="${previewUrl}" alt="プレビュー">
                <span class="image-preview-info">
                    リサイズ済み (約 ${Math.round(resizedImageBlob.size / 1024)} KB)
                </span>
            `;
            // メモリリーク防止 (表示後すぐにURLを解放)
            URL.revokeObjectURL(previewUrl); 
            
        } catch (err) {
            console.error("Image resize failed:", err);
            previewContainer.innerHTML = `<span class="error">画像処理に失敗: ${err.message}</span>`;
            resizedImageBlob = null;
        }
    });
    
    // 4. 既存写真の削除ボタン
    const removeBtn = document.getElementById('remove-image-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            // プレビューを削除
            const currentImageDiv = document.getElementById('current-image').closest('.form-group');
            if (currentImageDiv) {
                currentImageDiv.remove();
            }
            // データを null 化 (保存時にDBも更新)
            record.image_blob = null; 
            // 状態を "削除済み" に
            currentImageHTML = '<div class="form-group"><label>現在の写真:</label><p>(削除されます)</p></div>'; 
        });
    }

    // 5. 画像モーダル (既存画像)
    const currentImg = document.getElementById('current-image');
    if (currentImg) {
        currentImg.addEventListener('click', () => {
            showImageModal(currentImg.src);
        });
        // 編集フォームを離れるときに revoke
        backButton.addEventListener('click', () => {
             URL.revokeObjectURL(currentImg.src);
        }, { once: true });
    }

    // 6. フォーム保存処理
    document.getElementById('catch-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const species = document.getElementById('catch-species').value;
        const date = document.getElementById('catch-date').value;
        
        // バリデーション
        if (!species || !date) {
            document.getElementById('form-error').textContent = '種名と捕獲日は必須です。';
            return;
        }
        
        // フォームデータをまとめる
        const formData = {
            trap_id: record.trap_id, // 編集では既存のIDを保持
            gun_log_id: record.gun_log_id, // 編集では既存のIDを保持
            catch_date: date,
            species_name: species,
            gender: document.getElementById('catch-gender').value,
            age: document.getElementById('catch-age').value,
            latitude: document.getElementById('catch-latitude').value,
            longitude: document.getElementById('catch-longitude').value,
            memo: document.getElementById('catch-memo').value,
            image_blob: record.image_blob // デフォルトは既存の画像
        };

        // 新しい画像が選択されていれば、それを採用
        if (resizedImageBlob) {
            formData.image_blob = resizedImageBlob;
        }
        
        try {
            if (id) {
                // 更新
                // ★ 修正: db.catch -> db.catch_records
                await db.catch_records.put({ ...formData, id: id });
                showCatchDetailPage(id); // 詳細ページに戻る
            } else {
                // 新規作成
                // ★ 修正: db.catch -> db.catch_records
                const newId = await db.catch_records.add(formData);
                showCatchDetailPage(newId); // 作成した詳細ページに飛ぶ
            }
        } catch (err) {
            console.error("Failed to save catch record:", err);
            document.getElementById('form-error').textContent = `保存に失敗しました: ${err.message}`;
        }
    });
}

/**
 * datalist用に図鑑から種名リストを読み込む
 */
async function loadSpeciesDataList() {
    const datalist = document.getElementById('species-datalist');
    if (!datalist) return;
    
    try {
        // 狩猟対象 (〇) のみ
        const animals = await db.game_animal_list.where('is_game_animal').equals('〇').toArray();
        // 重複を除外
        const speciesNames = [...new Set(animals.map(a => a.species_name))];
        
        datalist.innerHTML = speciesNames.map(name => 
            `<option value="${escapeHTML(name)}"></option>`
        ).join('');
        
    } catch (err) {
        console.error("Failed to load species datalist:", err);
    }
}


// --- 捕獲記録 (削除) ---------------------------------

/**
 * 捕獲記録を削除する
 * @param {number} id - 削除する記録のID
 */
async function deleteCatchRecord(id) {
    if (!confirm('この捕獲記録を本当に削除しますか？\nこの操作は元に戻せません。')) {
        return;
    }

    try {
        // ★ 修正: db.catch -> db.catch_records
        await db.catch_records.delete(id);
        
        // 削除後はリストに戻る
        showCatchListPage();
        
    } catch (err) {
        console.error("Failed to delete catch record:", err);
        // エラー通知 (
        alert(`削除に失敗しました: ${err.message}`);
    }
}