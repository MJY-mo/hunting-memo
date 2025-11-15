// このファイルは gun.js です
// ★ 修正: 'db.catch' を 'db.catch_records' に変更
// ★ 修正: DBスキーマ v7 (gunテーブルのカラム削除, gun_log に ammo_count 追加) に対応
// ★ 修正: 2025/11/15 ユーザー指摘のUI・ロジック修正を適用

/**
 * 「銃」タブのメインページを表示する
 */
async function showGunPage() {
    // ★ 修正: UIレイアウトとボタン配置の変更
    app.innerHTML = `
        <div class="space-y-4">
            <h2 class="page-title">所持銃と口径</h2>
            <div id="gun-list" class="space-y-3">
                <p class="text-gray-500 text-center py-4">読み込み中...</p>
            </div>

            <div class="flex space-x-2">
                <button id="new-gun-log-button" class="btn btn-primary flex-1">
                    <i class="fas fa-plus"></i> 新規使用履歴
                </button>
                <button id="new-gun-button" class="btn btn-secondary flex-1">
                    <i class="fas fa-cog"></i> 所持銃の管理
                </button>
            </div>
            
            <h2 class="page-title">銃使用履歴</h2>
            <div id="gun-log-list-container">
                </div>
        </div>
    `;

    // ヘッダーを更新 (ボタンは置かない)
    updateHeader('銃', false);
    headerActions.innerHTML = '';
    
    // ★ 修正: 移動したボタンのリスナー
    document.getElementById('new-gun-button').onclick = () => showGunEditForm(null);
    document.getElementById('new-gun-log-button').onclick = () => showGunLogEditForm(null);


    // 銃リストと銃使用履歴リストの両方を描画
    await renderGunList();
    await renderGunLogList();
}

// --- 銃 (本体) ---------------------------------

/**
 * 所持許可（銃）リストを描画する
 */
async function renderGunList() {
    const listElement = document.getElementById('gun-list');
    if (!listElement) return;

    listElement.innerHTML = `<p class="text-gray-500 text-center py-4">読み込み中...</p>`;
    
    try {
        const guns = await db.gun.orderBy('name').toArray();

        if (guns.length === 0) {
            listElement.innerHTML = `<p class="text-gray-500 text-center py-4">登録されている銃はありません。</p>`;
            return;
        }

        // trap-card と同じスタイルを使用
        listElement.innerHTML = guns.map(gun => `
            <div class="trap-card" data-id="${gun.id}">
                <div class="flex-grow">
                    <h3 class="text-lg font-semibold text-blue-600">${escapeHTML(gun.name)}</h3>
                    <p class="text-sm">${escapeHTML(gun.type)} / ${escapeHTML(gun.caliber)}</p>
                </div>
                <div class="flex-shrink-0 ml-4 flex items-center">
                    <span>&gt;</span>
                </div>
            </div>
        `).join('');
        
        // クリックイベント設定
        listElement.querySelectorAll('.trap-card').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id, 10);
                showGunDetailPage(id);
            });
        });

    } catch (err) {
        console.error("Failed to render gun list:", err);
        listElement.innerHTML = `<div class="error-box">銃リストの読み込みに失敗しました。</div>`;
    }
}

/**
 * 銃の「詳細ページ」を表示する
 */
async function showGunDetailPage(id) {
    try {
        const gun = await db.gun.get(id);
        if (!gun) {
            app.innerHTML = `<div class="error-box">該当するデータが見つかりません。</div>`;
            return;
        }
        
        // ★ 修正: 編集・削除ボタンをページ上部に配置
        const editButtonsHTML = `
            <div class="card">
                <div class="flex space-x-2">
                    <button id="edit-gun-btn" class="btn btn-secondary flex-1">編集</button>
                    <button id="delete-gun-btn" class="btn btn-danger flex-1">削除</button>
                </div>
            </div>
        `;
        
        // ★ 修正: 許可日・期限を削除 (v7 スキーマ対応)
        const tableData = [
            { label: '名前', value: gun.name },
            { label: '銃種', value: gun.type },
            { label: '口径', value: gun.caliber },
        ];

        let tableHTML = `
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">許可情報</h2>
                <table class="w-full text-sm">
                    <tbody>
        `;
        tableData.forEach(row => {
            if (row.value) {
                tableHTML += `
                    <tr class="border-b">
                        <th class="w-1/3 text-left font-medium text-gray-600 p-2 bg-gray-50">${escapeHTML(row.label)}</th>
                        <td class="w-2/3 text-gray-800 p-2">${escapeHTML(row.value)}</td>
                    </tr>
                `;
            }
        });
        tableHTML += '</tbody></table></div>';
        
        // 関連する使用履歴 (ボタン)
        const logButtonHTML = `
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">使用履歴</h2>
                <button id="show-related-logs-btn" class="btn btn-secondary w-full justify-start text-left">
                    <span class="w-6">🐾</span> この銃の使用履歴を見る
                </button>
            </div>
        `;

        app.innerHTML = `
            <div class="space-y-4">
                ${editButtonsHTML}
                ${tableHTML}
                ${logButtonHTML}
            </div>
        `;

        // ヘッダーを更新
        updateHeader(escapeHTML(gun.name), true);
        backButton.onclick = () => showGunPage();
        headerActions.innerHTML = ''; // ヘッダーボタンはクリア

        // ★ 修正: ページ内ボタンのイベントリスナー
        document.getElementById('edit-gun-btn').onclick = () => showGunEditForm(id);
        document.getElementById('delete-gun-btn').onclick = () => deleteGun(id);
        
        // 関連履歴ボタンのリスナー
        document.getElementById('show-related-logs-btn').addEventListener('click', () => {
            appState.gunLogFilters.gun_id = id.toString(); // 銃IDでフィルター
            showGunPage(); // 銃ページに戻る (リストがフィルターされる)
        });

    } catch (err) {
        console.error("Failed to show gun detail:", err);
        app.innerHTML = `<div class="error-box">詳細の読み込みに失敗しました: ${err.message}</div>`;
    }
}

/**
 * 銃の「編集/新規作成フォーム」を表示する
 */
async function showGunEditForm(id) {
    let gun = {
        name: '',
        type: '散弾銃',
        caliber: '',
        // ★ 修正: 許可日・期限を削除 (v7 スキーマ対応)
    };
    
    let pageTitle = '新規 銃登録';

    if (id) {
        pageTitle = '銃の編集';
        const existingGun = await db.gun.get(id);
        if (existingGun) {
            gun = existingGun;
        }
    }

    app.innerHTML = `
        <div class="card">
            <form id="gun-form" class="space-y-4">
                
                <div class="form-group">
                    <label for="gun-name" class="form-label">名前 (ニックネーム) <span class="text-red-500">*</span>:</label>
                    <input type="text" id="gun-name" class="form-input" value="${escapeHTML(gun.name)}" required placeholder="例: Aボルト">
                </div>
                
                <div class="form-group">
                    <label for="gun-type" class="form-label">銃種:</label>
                    <select id="gun-type" class="form-select">
                        <option value="散弾銃" ${gun.type === '散弾銃' ? 'selected' : ''}>散弾銃</option>
                        <option value="ライフル銃" ${gun.type === 'ライフル銃' ? 'selected' : ''}>ライフル銃</option>
                        <option value="その他" ${gun.type === 'その他' ? 'selected' : ''}>その他</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="gun-caliber" class="form-label">口径:</label>
                    <input type="text" id="gun-caliber" class="form-input" value="${escapeHTML(gun.caliber)}" placeholder="例: 12番">
                </div>

                <button type="submit" class="btn btn-primary w-full">
                    保存する
                </button>
                <div id="form-error" class="text-red-600 text-sm text-center mt-2 h-4"></div>
            </form>
        </div>
    `;

    // ヘッダーを更新
    updateHeader(pageTitle, true);
    backButton.onclick = () => {
        if (id) {
            showGunDetailPage(id);
        } else {
            showGunPage();
        }
    };
    
    // フォーム保存処理
    document.getElementById('gun-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('gun-name').value;
        if (!name) {
            document.getElementById('form-error').textContent = '名前は必須です。';
            return;
        }
        
        // ★ 修正: 許可日・期限を削除 (v7 スキーマ対応)
        const formData = {
            name: name,
            type: document.getElementById('gun-type').value,
            caliber: document.getElementById('gun-caliber').value,
        };
        
        try {
            if (id) {
                await db.gun.put({ ...formData, id: id });
                showGunDetailPage(id);
            } else {
                const newId = await db.gun.add(formData);
                showGunDetailPage(newId);
            }
        } catch (err) {
            if (err.name === 'ConstraintError') {
                document.getElementById('form-error').textContent = 'その名前は既に使用されています。';
            } else {
                console.error("Failed to save gun:", err);
                document.getElementById('form-error').textContent = `保存に失敗: ${err.message}`;
            }
        }
    });
}

/**
 * 銃を削除する
 */
async function deleteGun(id) {
    if (!confirm('この銃を本当に削除しますか？\nこの銃に関連する【使用履歴】や【捕獲記録】は削除されません。')) {
        return;
    }
    
    // TODO: 関連する gun_log の gun_id を null にリセットする

    try {
        await db.gun.delete(id);
        showGunPage(); // リストに戻る
        
    } catch (err) {
        console.error("Failed to delete gun:", err);
        alert(`削除に失敗しました: ${err.message}`);
    }
}


// --- 銃使用履歴 (ログ) ---------------------------------

/**
 * 銃使用履歴リストを描画する (フィルター/ソート含む)
 */
async function renderGunLogList() {
    const container = document.getElementById('gun-log-list-container');
    if (!container) return;

    // 状態の読み込み
    const filters = appState.gunLogFilters;
    const sort = appState.gunLogSort;
    
    // 銃のリストを非同期で取得
    const guns = await db.gun.toArray();
    const gunOptions = guns.map(gun => 
        `<option value="${gun.id}" ${filters.gun_id === gun.id.toString() ? 'selected' : ''}>
            ${escapeHTML(gun.name)}
        </option>`
    ).join('');

    // ★ 修正: リセットボタンを廃止し、ソート機能を追加
    container.innerHTML = `
        <div class="card">
            <div class="grid grid-cols-2 gap-4">
                <div class="form-group mb-0">
                    <label for="gun-log-filter-purpose" class="form-label">目的:</label>
                    <select id="gun-log-filter-purpose" class="form-select">
                        <option value="all" ${filters.purpose === 'all' ? 'selected' : ''}>すべて</option>
                        <option value="狩猟" ${filters.purpose === '狩猟' ? 'selected' : ''}>狩猟</option>
                        <option value="有害駆除" ${filters.purpose === '有害駆除' ? 'selected' : ''}>有害駆除</option>
                        <option value="射撃練習" ${filters.purpose === '射撃練習' ? 'selected' : ''}>射撃練習</option>
                        <option value="その他" ${filters.purpose === 'その他' ? 'selected' : ''}>その他</option>
                    </select>
                </div>
                
                <div class="form-group mb-0">
                    <label for="gun-log-filter-gun" class="form-label">銃:</label>
                    <select id="gun-log-filter-gun" class="form-select">
                        <option value="all" ${filters.gun_id === 'all' ? 'selected' : ''}>すべての銃</option>
                        ${gunOptions}
                    </select>
                </div>
                
                <div class="form-group mb-0 col-span-2">
                    <label class="form-label">ソート:</label>
                    <div class="flex space-x-2">
                        <select id="gun-log-sort-key" class="form-select">
                            <option value="use_date" ${sort.key === 'use_date' ? 'selected' : ''}>使用日</option>
                            </select>
                        <select id="gun-log-sort-order" class="form-select w-24">
                            <option value="desc" ${sort.order === 'desc' ? 'selected' : ''}>降順</option>
                            <option value="asc" ${sort.order === 'asc' ? 'selected' : ''}>昇順</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="gun-log-list" class="space-y-3 mt-4">
            <p class="text-gray-500 text-center py-4">読み込み中...</p>
        </ul>
    `;

    // --- イベントリスナー設定 ---
    
    // フィルター
    document.getElementById('gun-log-filter-purpose').addEventListener('change', (e) => {
        filters.purpose = e.target.value;
        renderGunLogListItems();
    });
    document.getElementById('gun-log-filter-gun').addEventListener('change', (e) => {
        filters.gun_id = e.target.value;
        renderGunLogListItems();
    });
    
    // ★ 修正: ソートのリスナーを追加
    document.getElementById('gun-log-sort-key').addEventListener('change', (e) => {
        sort.key = e.target.value;
        renderGunLogListItems();
    });
    document.getElementById('gun-log-sort-order').addEventListener('change', (e) => {
        sort.order = e.target.value;
        renderGunLogListItems();
    });
    
    // ★ 修正: リセットボタンのリスナーを削除
    
    // 履歴リストの描画
    await renderGunLogListItems();
}

/**
 * 銃使用履歴リストの「中身（ul）」を描画する
 */
async function renderGunLogListItems() {
    const listElement = document.getElementById('gun-log-list');
    if (!listElement) return;

    listElement.innerHTML = `<p class="text-gray-500 text-center py-4">読み込み中...</p>`;
    
    try {
        const filters = appState.gunLogFilters;
        const sort = appState.gunLogSort;
        
        let query = db.gun_log;
        
        // 1. 目的フィルター
        if (filters.purpose !== 'all') {
            query = query.where('purpose').equals(filters.purpose);
        }
        
        // 2. 銃フィルター
        if (filters.gun_id !== 'all') {
            query = query.where('gun_id').equals(parseInt(filters.gun_id, 10));
        }
        
        // 3. ソート (use_date)
        query = query.orderBy(sort.key);
        
        const logs = await query.toArray();
        
        if (sort.order === 'desc') {
            logs.reverse();
        }

        if (logs.length === 0) {
            listElement.innerHTML = `<p class="text-gray-500 text-center py-4">銃の使用履歴はありません。</p>`;
            return;
        }

        let listItems = '';
        for (const log of logs) {
            // 銃の名前を非同期で取得
            const gun = log.gun_id ? await db.gun.get(log.gun_id) : null;
            const gunName = gun ? escapeHTML(gun.name) : '不明な銃';
            
            // 関連する捕獲数を非同期で取得
            const catchCount = await db.catch_records.where('gun_log_id').equals(log.id).count();
            const catchBadge = catchCount > 0 
                ? `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-emerald-600 bg-emerald-200">${catchCount}件</span>` 
                : '';
            
            // ★ 修正: ammo_count (消費弾数) を表示
            const ammoText = (log.ammo_count > 0) ? ` / ${log.ammo_count}発` : '';

            listItems += `
                <div class="trap-card" data-id="${log.id}">
                    <div class="flex-grow">
                        <h3 class="text-lg font-semibold text-blue-600">${formatDate(log.use_date)} (${escapeHTML(log.purpose)})</h3>
                        <span class="text-sm">${gunName}${ammoText}</span>
                    </div>
                    <div class="flex-shrink-0 ml-4 flex items-center space-x-2">
                        ${catchBadge}
                        <span>&gt;</span>
                    </div>
                </div>
            `;
        }
        
        listElement.innerHTML = listItems;
        
        // クリックイベント設定
        listElement.querySelectorAll('.trap-card').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id, 10);
                showGunLogDetailPage(id);
            });
        });

    } catch (err) {
        console.error("Failed to render gun log list items:", err);
        listElement.innerHTML = `<div class="error-box">履歴の読み込みに失敗しました。</div>`;
    }
}

/**
 * 銃使用履歴の「詳細ページ」を表示する
 */
async function showGunLogDetailPage(id) {
    try {
        const log = await db.gun_log.get(id);
        if (!log) {
            app.innerHTML = `<div class="error-box">該当するデータが見つかりません。</div>`;
            return;
        }
        
        // 銃の名前を取得
        const gun = log.gun_id ? await db.gun.get(log.gun_id) : null;
        
        // ★ 修正: 編集・削除ボタンをページ上部に配置
        const editButtonsHTML = `
            <div class="card">
                <div class="flex space-x-2">
                    <button id="edit-gun-log-btn" class="btn btn-secondary flex-1">編集</button>
                    <button id="delete-gun-log-btn" class="btn btn-danger flex-1">削除</button>
                </div>
            </div>
        `;
        
        // --- 画像の表示 ---
        let imageHTML = '';
        if (log.image_blob) {
            const blobUrl = URL.createObjectURL(log.image_blob);
            imageHTML = `
                <div class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">写真</h2>
                    <div class="photo-preview cursor-zoom-in">
                        <img src="${blobUrl}" alt="関連写真" id="detail-image" class="clickable-image">
                    </div>
                </div>
            `;
        }
        
        // --- 基本情報のテーブル (★ 修正: ammo_count を追加) ---
        const tableData = [
            { label: '使用日', value: formatDate(log.use_date) },
            { label: '目的', value: log.purpose },
            { label: '使用した銃', value: gun ? escapeHTML(gun.name) : '不明' },
            { label: '消費弾数', value: log.ammo_count },
            { label: '場所', value: log.location },
            { label: '緯度', value: log.latitude },
            { label: '経度', value: log.longitude },
        ];

        let tableHTML = `
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">基本情報</h2>
                <table class="w-full text-sm">
                    <tbody>
        `;
        tableData.forEach(row => {
            // ★ 修正: 0 も表示するように (value が null や undefined でないこと)
            if (row.value !== null && row.value !== undefined && row.value !== '') {
                tableHTML += `
                    <tr class="border-b">
                        <th class="w-1/3 text-left font-medium text-gray-600 p-2 bg-gray-50">${escapeHTML(row.label)}</th>
                        <td class="w-2/3 text-gray-800 p-2">${escapeHTML(row.value)}</td>
                    </tr>
                `;
            }
        });
        tableHTML += '</tbody></table></div>';
        
        // --- メモ ---
        let memoHTML = '';
        if (log.memo) {
            memoHTML = `
                <div class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">メモ</h2>
                    <p class="text-sm text-gray-700 leading-relaxed">${escapeHTML(log.memo).replace(/\n/g, '<br>')}</p>
                </div>
            `;
        }
        
        // --- ★ 修正: ボタンの表記を変更 ---
        const catchButtonHTML = `
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">捕獲記録</h2>
                <div class="space-y-3">
                    <button id="show-related-catches-btn" class="btn btn-secondary w-full justify-start text-left">
                        <span class="w-6">🐾</span> この日の捕獲記録を見る
                    </button>
                    <button id="add-catch-to-log-btn" class="btn btn-primary w-full justify-start text-left">
                        <span class="w-6">＋</span> この使用履歴での捕獲記録を追加
                    </button>
                </div>
            </div>
        `;

        app.innerHTML = `
            <div class="space-y-4">
                ${editButtonsHTML}
                ${imageHTML}
                ${tableHTML}
                ${memoHTML}
                ${catchButtonHTML}
            </div>
        `;

        // ヘッダーを更新
        updateHeader('銃使用履歴 詳細', true);
        backButton.onclick = () => showGunPage();
        headerActions.innerHTML = ''; // ヘッダーボタンはクリア

        // --- イベントリスナー ---
        
        // ★ 修正: ページ内ボタンのリスナー
        document.getElementById('edit-gun-log-btn').onclick = () => showGunLogEditForm(id);
        document.getElementById('delete-gun-log-btn').onclick = () => deleteGunLog(id);
        
        const imgElement = document.getElementById('detail-image');
        if (imgElement) {
            imgElement.addEventListener('click', () => {
                showImageModal(imgElement.src);
            });
            backButton.addEventListener('click', () => {
                URL.revokeObjectURL(imgElement.src);
            }, { once: true });
        }
        
        document.getElementById('show-related-catches-btn').addEventListener('click', () => {
            appState.currentCatchMethod = 'gun';
            appState.currentCatchRelationId = id; // 銃ログID
            navigateTo('catch', showCatchPage, '捕獲記録');
        });

        document.getElementById('add-catch-to-log-btn').addEventListener('click', () => {
            showCatchEditForm(null, { trapId: null, gunLogId: id });
        });

    } catch (err) {
        console.error("Failed to show gun log detail:", err);
        app.innerHTML = `<div class="error-box">履歴詳細の読み込みに失敗しました: ${err.message}</div>`;
    }
}

/**
 * 銃使用履歴の「編集/新規作成フォーム」を表示する
 */
async function showGunLogEditForm(id) {
    let log = {
        use_date: new Date().toISOString().split('T')[0],
        gun_id: null,
        purpose: '狩猟',
        location: '',
        memo: '',
        image_blob: null,
        latitude: '',
        longitude: '',
        ammo_count: 0 // ★ 修正: ammo_count を追加
    };
    
    let pageTitle = '新規 銃使用履歴';
    let currentImageHTML = '';

    // 銃のリストを非同期で取得
    const guns = await db.gun.toArray();
    const gunOptions = guns.map(gun => 
        `<option value="${gun.id}">${escapeHTML(gun.name)}</option>`
    ).join('');
    
    if (guns.length === 0) {
        app.innerHTML = `
            <div class="card error-box">
                銃使用履歴を登録するには、先に「所持銃と口径」を登録してください。
            </div>`;
        backButton.onclick = () => showGunPage();
        return;
    }

    if (id) {
        pageTitle = '銃使用履歴の編集';
        const existingLog = await db.gun_log.get(id);
        if (existingLog) {
            log = existingLog;
            
            if (log.image_blob) {
                const blobUrl = URL.createObjectURL(log.image_blob);
                currentImageHTML = `
                    <div class="form-group">
                        <label class="form-label">現在の写真:</label>
                        <div class="photo-preview cursor-zoom-in">
                            <img src="${blobUrl}" alt="既存の写真" id="current-image" class="clickable-image">
                            <button type="button" id="remove-image-btn" class="photo-preview-btn-delete">&times;</button>
                        </div>
                    </div>
                `;
            }
        }
    } else {
        // 新規の場合、デフォルトの銃を選択
        log.gun_id = guns[0].id;
    }

    app.innerHTML = `
        <div class="card">
            <form id="gun-log-form" class="space-y-4">
                
                <div class="form-group">
                    <label for="gun-log-date" class="form-label">使用日 <span class="text-red-500">*</span>:</label>
                    <input type="date" id="gun-log-date" class="form-input" value="${escapeHTML(log.use_date)}" required>
                </div>
                
                <div class="form-group">
                    <label for="gun-log-gun" class="form-label">使用した銃 <span class="text-red-500">*</span>:</label>
                    <select id="gun-log-gun" class="form-select" required>
                        ${gunOptions}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="gun-log-purpose" class="form-label">目的:</label>
                    <select id="gun-log-purpose" class="form-select">
                        <option value="狩猟" ${log.purpose === '狩猟' ? 'selected' : ''}>狩猟</option>
                        <option value="有害駆除" ${log.purpose === '有害駆除' ? 'selected' : ''}>有害駆除</option>
                        <option value="射撃練習" ${log.purpose === '射撃練習' ? 'selected' : ''}>射撃練習</option>
                        <option value="その他" ${log.purpose === 'その他' ? 'selected' : ''}>その他</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="gun-log-ammo-count" class="form-label">消費弾数:</label>
                    <input type="number" id="gun-log-ammo-count" class="form-input" value="${escapeHTML(log.ammo_count || 0)}" min="0">
                </div>
                
                <div class="form-group">
                    <label for="gun-log-location" class="form-label">場所:</label>
                    <input type="text" id="gun-log-location" class="form-input" value="${escapeHTML(log.location)}" placeholder="例: 〇〇山">
                </div>

                <div class="form-group">
                    <label class="form-label">位置情報</label>
                    <div class="grid grid-cols-2 gap-4">
                        <input type="number" step="any" id="gun-log-latitude" class="form-input" value="${escapeHTML(log.latitude)}">
                        <input type="number" step="any" id="gun-log-longitude" class="form-input" value="${escapeHTML(log.longitude)}">
                    </div>
                    <button type="button" id="get-gun-log-gps-btn" class="btn btn-secondary w-full mt-2">
                        現在地を取得
                    </button>
                </div>

                ${currentImageHTML}
                <div class="form-group">
                    <label for="gun-log-image" class="form-label">${id && log.image_blob ? '写真を変更:' : '写真を追加:'}</label>
                    <input type="file" id="gun-log-image" class="form-input" accept="image/*">
                    <div id="image-preview-container" class="mt-2"></div>
                </div>

                <div class="form-group">
                    <label for="gun-log-memo" class="form-label">メモ:</label>
                    <textarea id="gun-log-memo" rows="4" class="form-input">${escapeHTML(log.memo)}</textarea>
                </div>
                
                <button type="submit" class="btn btn-primary w-full">
                    保存する
                </button>
                <div id="form-error" class="text-red-600 text-sm text-center mt-2 h-4"></div>
            </form>
        </div>
    `;
    
    // 選択肢のデフォルトを設定
    document.getElementById('gun-log-gun').value = log.gun_id;

    // ヘッダーを更新
    updateHeader(pageTitle, true);
    backButton.onclick = () => {
        if (id) {
            showGunLogDetailPage(id);
        } else {
            showGunPage();
        }
    };
    
    // --- フォームの動的処理 ---
    
    // 1. GPS取得ボタン
    document.getElementById('get-gun-log-gps-btn').addEventListener('click', async (e) => {
        const button = e.currentTarget;
        const originalText = button.innerHTML;
        button.innerHTML = '測位中...';
        button.disabled = true;
        
        try {
            const location = await getCurrentLocation();
            document.getElementById('gun-log-latitude').value = location.latitude;
            document.getElementById('gun-log-longitude').value = location.longitude;
        } catch (err) {
            document.getElementById('form-error').textContent = err.message;
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    });
    
    // 2. 画像プレビュー処理
    const imageInput = document.getElementById('gun-log-image');
    const previewContainer = document.getElementById('image-preview-container');
    let resizedImageBlob = null; 

    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        previewContainer.innerHTML = `<p class="text-gray-500">画像処理中...</p>`;
        try {
            resizedImageBlob = await resizeImage(file, 800);
            const previewUrl = URL.createObjectURL(resizedImageBlob);
            previewContainer.innerHTML = `<div class="photo-preview"><img src="${previewUrl}" alt="プレビュー"></div>`;
            URL.revokeObjectURL(previewUrl); 
        } catch (err) {
            previewContainer.innerHTML = `<span class="error">画像処理に失敗</span>`;
            resizedImageBlob = null;
        }
    });
    
    // 3. 既存写真の削除ボタン
    const removeBtn = document.getElementById('remove-image-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            const currentImageDiv = removeBtn.closest('.form-group');
            if (currentImageDiv) currentImageDiv.remove();
            log.image_blob = null; 
            currentImageHTML = '<div class="form-group"><label class="form-label">現在の写真:</label><p class="text-gray-500">(削除されます)</p></div>'; 
        });
    }

    // 4. 画像モーダル (既存画像)
    const currentImg = document.getElementById('current-image');
    if (currentImg) {
        currentImg.addEventListener('click', () => {
            showImageModal(currentImg.src);
        });
        backButton.addEventListener('click', () => {
             URL.revokeObjectURL(currentImg.src);
        }, { once: true });
    }

    // 5. フォーム保存処理
    document.getElementById('gun-log-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // ★ 修正: ammo_count を追加
        const formData = {
            use_date: document.getElementById('gun-log-date').value,
            gun_id: parseInt(document.getElementById('gun-log-gun').value, 10),
            purpose: document.getElementById('gun-log-purpose').value,
            ammo_count: parseInt(document.getElementById('gun-log-ammo-count').value, 10) || 0,
            location: document.getElementById('gun-log-location').value,
            latitude: document.getElementById('gun-log-latitude').value,
            longitude: document.getElementById('gun-log-longitude').value,
            memo: document.getElementById('gun-log-memo').value,
            image_blob: log.image_blob
        };

        if (resizedImageBlob) {
            formData.image_blob = resizedImageBlob;
        }
        
        try {
            if (id) {
                await db.gun_log.put({ ...formData, id: id });
                showGunLogDetailPage(id);
            } else {
                const newId = await db.gun_log.add(formData);
                showGunLogDetailPage(newId);
            }
        } catch (err) {
            console.error("Failed to save gun log:", err);
            document.getElementById('form-error').textContent = `保存に失敗: ${err.message}`;
        }
    });
}

/**
 * 銃使用履歴を削除する
 */
async function deleteGunLog(id) {
    if (!confirm('この銃使用履歴を本当に削除しますか？\nこの履歴に関連する【捕獲記録もすべて削除】されます。\nこの操作は元に戻せません。')) {
        return;
    }

    try {
        await db.transaction('rw', db.gun_log, db.catch_records, async () => {
            
            // 1. 関連する捕獲記録を削除
            await db.catch_records.where('gun_log_id').equals(id).delete();
            
            // 2. 履歴本体を削除
            await db.gun_log.delete(id);
        });
        
        showGunPage(); // リストに戻る
        
    } catch (err) {
        console.error("Failed to delete gun log and related catches:", err);
        alert(`削除に失敗しました: ${err.message}`);
    }
}