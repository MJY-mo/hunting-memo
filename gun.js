// このファイルは gun.js です
// ★ 修正: 'db.catch' を 'db.catch_records' に変更

/**
 * 「銃」タブのメインページを表示する
 */
async function showGunPage() {
    app.innerHTML = `
        <div class="page-content">
            <h2 class="page-title">所持許可（銃）</h2>
            <ul id="gun-list" class="data-list">
                <li><i class="fas fa-spinner fa-spin"></i> 読み込み中...</li>
            </ul>
            
            <h2 class="page-title">銃使用履歴</h2>
            <div id="gun-log-list-container">
                </div>
        </div>
    `;

    // ヘッダーを更新
    updateHeader('銃', false);
    
    // 新規銃登録ボタン
    const newGunButton = document.createElement('button');
    newGunButton.id = 'new-gun-button';
    newGunButton.className = 'button-header-action';
    newGunButton.innerHTML = '<i class="fas fa-plus"></i>';
    newGunButton.onclick = () => showGunEditForm(null);
    headerActions.appendChild(newGunButton);

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

    listElement.innerHTML = `<li><i class="fas fa-spinner fa-spin"></i> 読み込み中...</li>`;
    
    try {
        const guns = await db.gun.orderBy('name').toArray();

        if (guns.length === 0) {
            listElement.innerHTML = `<li class="no-data">登録されている銃はありません。</li>`;
            return;
        }

        listElement.innerHTML = guns.map(gun => `
            <li class="data-list-item" data-id="${gun.id}">
                <div class="item-main-content">
                    <strong>${escapeHTML(gun.name)}</strong>
                    <span class="item-sub-text">${escapeHTML(gun.type)} / ${escapeHTML(gun.caliber)}</span>
                </div>
                <div class="item-action-content">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </li>
        `).join('');
        
        // クリックイベント設定
        listElement.querySelectorAll('.data-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id, 10);
                showGunDetailPage(id);
            });
        });

    } catch (err) {
        console.error("Failed to render gun list:", err);
        listElement.innerHTML = `<li class="no-data error">銃リストの読み込みに失敗しました。</li>`;
    }
}

/**
 * 銃の「詳細ページ」を表示する
 * @param {number} id - 表示する銃のDB ID
 */
async function showGunDetailPage(id) {
    try {
        const gun = await db.gun.get(id);
        if (!gun) {
            app.innerHTML = `<div class="error-box">該当するデータが見つかりません。</div>`;
            return;
        }
        
        const tableData = [
            { label: '名前', value: gun.name },
            { label: '銃種', value: gun.type },
            { label: '口径', value: gun.caliber },
            { label: '許可日', value: formatDate(gun.permit_date) },
            { label: '許可期限', value: formatDate(gun.permit_expiry) },
        ];

        let tableHTML = '<div class="info-section"><h4>許可情報</h4><table class="info-table">';
        tableData.forEach(row => {
            if (row.value) {
                tableHTML += `
                    <tr>
                        <th>${escapeHTML(row.label)}</th>
                        <td>${escapeHTML(row.value)}</td>
                    </tr>
                `;
            }
        });
        tableHTML += '</table></div>';
        
        // 関連する使用履歴 (ボタン)
        const logButtonHTML = `
            <div class="info-section">
                <button id="show-related-logs-btn" class="menu-button">
                    <i class="fas fa-history icon"></i>
                    この銃の使用履歴を見る
                </button>
            </div>
        `;

        app.innerHTML = `
            <div class="page-content info-detail-page">
                ${tableHTML}
                ${logButtonHTML}
            </div>
        `;

        // ヘッダーを更新
        updateHeader(escapeHTML(gun.name), true);
        backButton.onclick = () => showGunPage();

        // アクションボタン（編集・削除）
        headerActions.innerHTML = ''; // クリア
        
        const editButton = document.createElement('button');
        editButton.className = 'button-header-action';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.onclick = () => showGunEditForm(id);
        headerActions.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'button-header-action';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.onclick = () => deleteGun(id);
        headerActions.appendChild(deleteButton);
        
        // イベントリスナー
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
 * @param {number | null} id - 編集する銃のID (新規の場合は null)
 */
async function showGunEditForm(id) {
    let gun = {
        name: '',
        type: '散弾銃',
        caliber: '',
        permit_date: '',
        permit_expiry: ''
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
        <div class="page-content">
            <form id="gun-form" class="form-container">
                
                <div class="form-group">
                    <label for="gun-name">名前 (ニックネーム) <span class="required">*</span>:</label>
                    <input type="text" id="gun-name" value="${escapeHTML(gun.name)}" required placeholder="例: Aボルト">
                </div>
                
                <div class="form-group">
                    <label for="gun-type">銃種:</label>
                    <select id="gun-type">
                        <option value="散弾銃" ${gun.type === '散弾銃' ? 'selected' : ''}>散弾銃</option>
                        <option value="ライフル銃" ${gun.type === 'ライフル銃' ? 'selected' : ''}>ライフル銃</option>
                        <option value="その他" ${gun.type === 'その他' ? 'selected' : ''}>その他</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="gun-caliber">口径:</label>
                    <input type="text" id="gun-caliber" value="${escapeHTML(gun.caliber)}" placeholder="例: 12番">
                </div>

                <div class="form-group">
                    <label for="gun-permit-date">許可日:</label>
                    <input type="date" id="gun-permit-date" value="${escapeHTML(gun.permit_date)}">
                </div>
                
                <div class="form-group">
                    <label for="gun-permit-expiry">許可期限:</label>
                    <input type="date" id="gun-permit-expiry" value="${escapeHTML(gun.permit_expiry)}">
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
        
        const formData = {
            name: name,
            type: document.getElementById('gun-type').value,
            caliber: document.getElementById('gun-caliber').value,
            permit_date: document.getElementById('gun-permit-date').value,
            permit_expiry: document.getElementById('gun-permit-expiry').value,
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
 * @param {number} id - 削除する銃のID
 */
async function deleteGun(id) {
    if (!confirm('この銃を本当に削除しますか？\nこの銃に関連する【使用履歴】や【捕獲記録】は削除されません。')) {
        return;
    }
    
    // TODO: 関連する gun_log の gun_id を null にリセットする
    // (現在は Dexie のリレーション機能を使っていないため、手動で行う必要がある)
    // 現時点では、gun_log は残るが、銃の名前が表示できなくなる

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

    // HTMLを構築
    container.innerHTML = `
        <div class="filter-controls">
            <div class="filter-group">
                <label for="gun-log-filter-purpose">目的:</label>
                <select id="gun-log-filter-purpose" class="filter-select">
                    <option value="all" ${filters.purpose === 'all' ? 'selected' : ''}>すべて</option>
                    <option value="狩猟" ${filters.purpose === '狩猟' ? 'selected' : ''}>狩猟</option>
                    <option value="有害駆除" ${filters.purpose === '有害駆除' ? 'selected' : ''}>有害駆除</option>
                    <option value="射撃練習" ${filters.purpose === '射撃練習' ? 'selected' : ''}>射撃練習</option>
                    <option value="その他" ${filters.purpose === 'その他' ? 'selected' : ''}>その他</option>
                </select>
            </div>
            
            <div class="filter-group">
                <label for="gun-log-filter-gun">銃:</label>
                <select id="gun-log-filter-gun" class="filter-select">
                    <option value="all" ${filters.gun_id === 'all' ? 'selected' : ''}>すべての銃</option>
                    ${gunOptions}
                </select>
            </div>
            
            <button id="gun-log-filter-reset" class="button button-secondary button-small">リセット</button>
        </div>
        
        <div class="list-header">
            <span>使用履歴</span>
            <button id="new-gun-log-button" class="button button-primary button-small">
                <i class="fas fa-plus"></i> 新規使用履歴
            </button>
        </div>
        
        <ul id="gun-log-list" class="data-list">
            <li><i class="fas fa-spinner fa-spin"></i> 読み込み中...</li>
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
    // リセット
    document.getElementById('gun-log-filter-reset').addEventListener('click', () => {
        filters.purpose = 'all';
        filters.gun_id = 'all';
        renderGunLogList(); // フィルターUI自体を再描画
    });
    // 新規登録
    document.getElementById('new-gun-log-button').addEventListener('click', () => {
        showGunLogEditForm(null);
    });

    // 履歴リストの描画
    await renderGunLogListItems();
}

/**
 * 銃使用履歴リストの「中身（ul）」を描画する
 */
async function renderGunLogListItems() {
    const listElement = document.getElementById('gun-log-list');
    if (!listElement) return;

    listElement.innerHTML = `<li><i class="fas fa-spinner fa-spin"></i> 読み込み中...</li>`;
    
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
            listElement.innerHTML = `<li class="no-data">銃の使用履歴はありません。</li>`;
            return;
        }

        let listItems = '';
        for (const log of logs) {
            // 銃の名前を非同期で取得
            const gun = log.gun_id ? await db.gun.get(log.gun_id) : null;
            const gunName = gun ? escapeHTML(gun.name) : '不明な銃';
            
            // ★ 修正: db.catch -> db.catch_records
            // 関連する捕獲数を非同期で取得
            const catchCount = await db.catch_records.where('gun_log_id').equals(log.id).count();
            const catchBadge = catchCount > 0 
                ? `<span class="badge badge-success">${catchCount}件</span>` 
                : '';

            listItems += `
                <li class="data-list-item" data-id="${log.id}">
                    <div class="item-main-content">
                        <strong>${formatDate(log.use_date)} (${escapeHTML(log.purpose)})</strong>
                        <span class="item-sub-text">${gunName}</span>
                    </div>
                    <div class="item-action-content">
                        ${catchBadge}
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </li>
            `;
        }
        
        listElement.innerHTML = listItems;
        
        // クリックイベント設定
        listElement.querySelectorAll('.data-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id, 10);
                showGunLogDetailPage(id);
            });
        });

    } catch (err) {
        console.error("Failed to render gun log list items:", err);
        listElement.innerHTML = `<li class="no-data error">履歴の読み込みに失敗しました。</li>`;
    }
}

/**
 * 銃使用履歴の「詳細ページ」を表示する
 * @param {number} id - 表示する履歴のDB ID
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
        
        // --- 画像の表示 ---
        let imageHTML = '';
        if (log.image_blob) {
            const blobUrl = URL.createObjectURL(log.image_blob);
            imageHTML = `
                <div class="info-section">
                    <h4>写真</h4>
                    <div class="info-image-container">
                        <img src="${blobUrl}" alt="関連写真" id="detail-image" class="clickable-image">
                    </div>
                </div>
            `;
        }
        
        // --- 基本情報のテーブル ---
        const tableData = [
            { label: '使用日', value: formatDate(log.use_date) },
            { label: '目的', value: log.purpose },
            { label: '使用した銃', value: gun ? escapeHTML(gun.name) : '不明' },
            { label: '場所', value: log.location },
            { label: '緯度', value: log.latitude },
            { label: '経度', value: log.longitude },
        ];

        let tableHTML = '<div class="info-section"><h4>基本情報</h4><table class="info-table">';
        tableData.forEach(row => {
            if (row.value) {
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
        if (log.memo) {
            memoHTML = `
                <div class="info-section">
                    <h4>メモ</h4>
                    <p class="info-memo">${escapeHTML(log.memo).replace(/\n/g, '<br>')}</p>
                </div>
            `;
        }
        
        // --- 関連する捕獲記録 (ボタン) ---
        const catchButtonHTML = `
            <div class="info-section">
                <button id="show-related-catches-btn" class="menu-button">
                    <i class="fas fa-fish icon"></i>
                    この日の捕獲記録を見る
                </button>
                <button id="add-catch-to-log-btn" class="menu-button">
                    <i class="fas fa-plus icon"></i>
                    この日に捕獲した
                </button>
            </div>
        `;

        app.innerHTML = `
            <div class="page-content info-detail-page">
                ${imageHTML}
                ${tableHTML}
                ${memoHTML}
                ${catchButtonHTML}
            </div>
        `;

        // ヘッダーを更新
        updateHeader('銃使用履歴 詳細', true);
        backButton.onclick = () => showGunPage();
        
        // アクションボタン（編集・削除）
        headerActions.innerHTML = ''; // クリア
        
        const editButton = document.createElement('button');
        editButton.className = 'button-header-action';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.onclick = () => showGunLogEditForm(id);
        headerActions.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'button-header-action';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.onclick = () => deleteGunLog(id);
        headerActions.appendChild(deleteButton);

        // --- イベントリスナー ---
        
        // 画像モーダル
        const imgElement = document.getElementById('detail-image');
        if (imgElement) {
            imgElement.addEventListener('click', () => {
                showImageModal(imgElement.src);
            });
        }
        
        // 関連する捕獲記録を見る
        document.getElementById('show-related-catches-btn').addEventListener('click', () => {
            appState.currentCatchMethod = 'gun';
            appState.currentCatchRelationId = id; // 銃ログID
            navigateTo('catch', showCatchPage, '捕獲記録');
        });

        // この日に捕獲
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
 * @param {number | null} id - 編集する履歴のID (新規の場合は null)
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
        longitude: ''
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
            <div class="error-box">
                銃使用履歴を登録するには、先に「所持許可（銃）」を登録してください。
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
                        <label>現在の写真:</label>
                        <div class="info-image-container">
                            <img src="${blobUrl}" alt="既存の写真" id="current-image" class="clickable-image">
                        </div>
                        <button type="button" id="remove-image-btn" class="button button-danger button-small">写真を削除</button>
                    </div>
                `;
            }
        }
    } else {
        // 新規の場合、デフォルトの銃を選択
        log.gun_id = guns[0].id;
    }

    app.innerHTML = `
        <div class="page-content">
            <form id="gun-log-form" class="form-container">
                
                <div class="form-group">
                    <label for="gun-log-date">使用日 <span class="required">*</span>:</label>
                    <input type="date" id="gun-log-date" value="${escapeHTML(log.use_date)}" required>
                </div>
                
                <div class="form-group">
                    <label for="gun-log-gun">使用した銃 <span class="required">*</span>:</label>
                    <select id="gun-log-gun" required>
                        ${gunOptions}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="gun-log-purpose">目的:</label>
                    <select id="gun-log-purpose">
                        <option value="狩猟" ${log.purpose === '狩猟' ? 'selected' : ''}>狩猟</option>
                        <option value="有害駆除" ${log.purpose === '有害駆除' ? 'selected' : ''}>有害駆除</option>
                        <option value="射撃練習" ${log.purpose === '射撃練習' ? 'selected' : ''}>射撃練習</option>
                        <option value="その他" ${log.purpose === 'その他' ? 'selected' : ''}>その他</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="gun-log-location">場所:</label>
                    <input type="text" id="gun-log-location" value="${escapeHTML(log.location)}" placeholder="例: 〇〇山">
                </div>

                <h3 class="form-section-title">位置情報</h3>
                <div class="form-group-row">
                    <div class="form-group">
                        <label for="gun-log-latitude">緯度:</label>
                        <input type="number" step="any" id="gun-log-latitude" value="${escapeHTML(log.latitude)}">
                    </div>
                    <div class="form-group">
                        <label for="gun-log-longitude">経度:</label>
                        <input type="number" step="any" id="gun-log-longitude" value="${escapeHTML(log.longitude)}">
                    </div>
                </div>
                <button type="button" id="get-gun-log-gps-btn" class="button button-secondary button-full">
                    <i class="fas fa-map-marker-alt"></i> 現在地を取得
                </button>

                <h3 class="form-section-title">写真</h3>
                ${currentImageHTML}
                <div class="form-group">
                    <label for="gun-log-image">${id && log.image_blob ? '写真を変更:' : '写真を追加:'}</label>
                    <input type="file" id="gun-log-image" accept="image/*">
                    <div id="image-preview-container" class="image-preview-container"></div>
                </div>

                <h3 class="form-section-title">メモ</h3>
                <div class="form-group">
                    <textarea id="gun-log-memo" rows="4">${escapeHTML(log.memo)}</textarea>
                </div>
                
                <button type="submit" class="button button-primary button-full">
                    <i class="fas fa-save"></i> 保存する
                </button>
                <div id="form-error" class="form-error"></div>
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
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 測位中...';
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
        previewContainer.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 画像処理中...';
        try {
            resizedImageBlob = await resizeImage(file, 800);
            const previewUrl = URL.createObjectURL(resizedImageBlob);
            previewContainer.innerHTML = `<img src="${previewUrl}" alt="プレビュー">`;
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
            const currentImageDiv = document.getElementById('current-image').closest('.form-group');
            if (currentImageDiv) currentImageDiv.remove();
            log.image_blob = null; 
            currentImageHTML = '<div class="form-group"><label>現在の写真:</label><p>(削除されます)</p></div>'; 
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
        
        const formData = {
            use_date: document.getElementById('gun-log-date').value,
            gun_id: parseInt(document.getElementById('gun-log-gun').value, 10),
            purpose: document.getElementById('gun-log-purpose').value,
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
 * @param {number} id - 削除する履歴のID
 */
async function deleteGunLog(id) {
    if (!confirm('この銃使用履歴を本当に削除しますか？\nこの履歴に関連する【捕獲記録もすべて削除】されます。\nこの操作は元に戻せません。')) {
        return;
    }

    try {
        // ★ 修正: db.catch -> db.catch_records
        await db.transaction('rw', db.gun_log, db.catch_records, async () => {
            
            // 1. 関連する捕獲記録を削除
            // ★ 修正: db.catch -> db.catch_records
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