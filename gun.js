// このファイルは gun.js です (ロジック修正版)
// ★ 修正: 'db.catch' を 'db.catch_records' に変更
// ★ 修正: DBスキーマ v3/v4 (gun, gun_log) に対応
// ★ 修正: Dexieのクエリロジックを修正 (orderBy)

/**
 * 「銃」タブのメインページを表示する
 */
async function showGunPage() {
    app.innerHTML = `
        <div class="space-y-4">
            <div class="card">
                <div class="flex justify-between items-center border-b pb-2 mb-4">
                    <h2 class="text-lg font-semibold">所持許可（銃）</h2>
                </div>
                <div id="gun-list" class="space-y-3">
                    <p class="text-gray-500 text-center py-4">読み込み中...</p>
                </div>
            </div>
            
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">銃使用履歴</h2>
                <div id="gun-log-list-container" class="space-y-4">
                    <p class="text-gray-500 text-center py-4">読み込み中...</p>
                </div>
            </div>
        </div>
    `;

    // ヘッダーを更新
    updateHeader('銃', false);
    
    headerActions.innerHTML = ''; // クリア
    const newGunButton = document.createElement('button');
    newGunButton.id = 'new-gun-button';
    newGunButton.className = 'btn btn-primary'; 
    newGunButton.textContent = '新規登録';
    newGunButton.onclick = () => showGunEditForm(null);
    headerActions.appendChild(newGunButton);

    await renderGunList();
    await renderGunLogList();
}

// --- 銃 (本体) ---------------------------------
// (このセクションは修正なし)
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

        listElement.innerHTML = guns.map(gun => `
            <div class="trap-card" data-id="${gun.id}">
                <div class="flex-grow">
                    <h3 class="text-lg font-semibold text-blue-600">${escapeHTML(gun.name)}</h3>
                    <p class="text-sm">${escapeHTML(gun.type)} / ${escapeHTML(gun.caliber)}</p>
                </div>
                <span>&gt;</span>
            </div>
        `).join('');
        
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
        
        const logButtonHTML = `
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">関連メニュー</h2>
                <button id="show-related-logs-btn" class="btn btn-secondary w-full justify-start text-left">
                    <span class="w-6">📜</span> この銃の使用履歴を見る
                </button>
            </div>
        `;

        app.innerHTML = `
            <div class="space-y-4">
                ${tableHTML}
                ${logButtonHTML}
            </div>
        `;

        updateHeader(escapeHTML(gun.name), true);
        backButton.onclick = () => showGunPage();

        headerActions.innerHTML = ''; // クリア
        
        const editButton = document.createElement('button');
        editButton.className = 'btn btn-secondary';
        editButton.textContent = '編集';
        editButton.onclick = () => showGunEditForm(id);
        headerActions.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger ml-2';
        deleteButton.textContent = '削除';
        deleteButton.onclick = () => deleteGun(id);
        headerActions.appendChild(deleteButton);
        
        document.getElementById('show-related-logs-btn').addEventListener('click', () => {
            appState.gunLogFilters.gun_id = id.toString(); 
            showGunPage(); 
        });

    } catch (err) {
        console.error("Failed to show gun detail:", err);
        app.innerHTML = `<div class="error-box">詳細の読み込みに失敗しました: ${err.message}</div>`;
    }
}

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

                <div class="form-group">
                    <label for="gun-permit-date" class="form-label">許可日:</label>
                    <input type="date" id="gun-permit-date" class="form-input" value="${escapeHTML(gun.permit_date)}">
                </div>
                
                <div class="form-group">
                    <label for="gun-permit-expiry" class="form-label">許可期限:</label>
                    <input type="date" id="gun-permit-expiry" class="form-input" value="${escapeHTML(gun.permit_expiry)}">
                </div>

                <button type="submit" class="btn btn-primary w-full">
                    保存する
                </button>
                <div id="form-error" class="text-red-600 text-sm text-center mt-2 h-4"></div>
            </form>
        </div>
    `;

    updateHeader(pageTitle, true);
    backButton.onclick = () => {
        if (id) {
            showGunDetailPage(id);
        } else {
            showGunPage();
        }
    };
    
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

async function deleteGun(id) {
    if (!confirm('この銃を本当に削除しますか？\nこの銃に関連する【使用履歴】や【捕獲記録】は削除されません。')) {
        return;
    }
    
    try {
        await db.gun.delete(id);
        showGunPage(); 
        
    } catch (err) {
        console.error("Failed to delete gun:", err);
        alert(`削除に失敗しました: ${err.message}`);
    }
}


// --- 銃使用履歴 (ログ) ---------------------------------
// (このセクションは修正なし)
async function renderGunLogList() {
    const container = document.getElementById('gun-log-list-container');
    if (!container) return;

    const filters = appState.gunLogFilters;
    
    const guns = await db.gun.toArray();
    const gunOptions = guns.map(gun => 
        `<option value="${gun.id}" ${filters.gun_id === gun.id.toString() ? 'selected' : ''}>
            ${escapeHTML(gun.name)}
        </option>`
    ).join('');

    container.innerHTML = `
        <div class="space-y-4">
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
            </div>
            
            <button id="gun-log-filter-reset" class="btn btn-secondary w-full">フィルターリセット</button>
        </div>
        
        <div class="flex justify-between items-center mt-4 pt-4 border-t">
            <h3 class="text-md font-semibold">履歴一覧</h3>
            <button id="new-gun-log-button" class="btn btn-primary btn-sm">
                新規使用履歴
            </button>
        </div>
        
        <div id="gun-log-list" class="space-y-3 mt-3">
            <p class="text-gray-500 text-center py-4">読み込み中...</p>
        </div>
    `;

    document.getElementById('gun-log-filter-purpose').addEventListener('change', (e) => {
        filters.purpose = e.target.value;
        renderGunLogListItems();
    });
    document.getElementById('gun-log-filter-gun').addEventListener('change', (e) => {
        filters.gun_id = e.target.value;
        renderGunLogListItems();
    });
    document.getElementById('gun-log-filter-reset').addEventListener('click', () => {
        filters.purpose = 'all';
        filters.gun_id = 'all';
        renderGunLogList(); 
    });
    document.getElementById('new-gun-log-button').addEventListener('click', () => {
        showGunLogEditForm(null);
    });

    await renderGunLogListItems();
}

/**
 * 銃使用履歴リストの「中身（ul）」を描画する
 * ★★★ ロジック修正 ★★★
 */
async function renderGunLogListItems() {
    const listElement = document.getElementById('gun-log-list');
    if (!listElement) return;

    listElement.innerHTML = `<p class="text-gray-500 text-center py-4">読み込み中...</p>`;
    
    try {
        const filters = appState.gunLogFilters;
        const sort = appState.gunLogSort;
        
        // 1. 基本クエリ (db.gun_log)
        let query = db.gun_log;
        
        // 2. ソート (インデックスを利用)
        // (db.js v4 で 'use_date' をインデックスに追加した)
        query = query.orderBy(sort.key);
        
        // 3. 昇順/降順
        if (sort.order === 'desc') {
            query = query.reverse();
        }

        // 4. ★★★ データベースから配列として取得 ★★★
        let logs = await query.toArray();
        
        // 5. ★★★ フィルター (JavaScript側で実行) ★★★
        
        // 5.1. 目的フィルター
        if (filters.purpose !== 'all') {
            logs = logs.filter(log => log.purpose === filters.purpose);
        }
        
        // 5.2. 銃フィルター
        if (filters.gun_id !== 'all') {
            const filterGunId = parseInt(filters.gun_id, 10);
            logs = logs.filter(log => log.gun_id === filterGunId);
        }

        if (logs.length === 0) {
            listElement.innerHTML = `<p class="text-gray-500 text-center py-4">銃の使用履歴はありません。</p>`;
            return;
        }

        let listItems = '';
        for (const log of logs) {
            const gun = log.gun_id ? await db.gun.get(log.gun_id) : null;
            const gunName = gun ? escapeHTML(gun.name) : '不明な銃';
            
            const catchCount = await db.catch_records.where('gun_log_id').equals(log.id).count();
            const catchBadge = catchCount > 0 
                ? `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-emerald-600 bg-emerald-200">${catchCount}件</span>` 
                : '';

            listItems += `
                <div class="trap-card" data-id="${log.id}">
                    <div class="flex-grow">
                        <h3 class="text-lg font-semibold">${formatDate(log.use_date)} (${escapeHTML(log.purpose)})</h3>
                        <p class="text-sm">${gunName}</p>
                    </div>
                    <div class="flex-shrink-0 ml-4 flex items-center space-x-2">
                        ${catchBadge}
                        <span>&gt;</span>
                    </div>
                </div>
            `;
        }
        
        listElement.innerHTML = listItems;
        
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

// --- 銃使用履歴 (詳細・編集・削除) -------------------
// (このセクションは修正なし)
async function showGunLogDetailPage(id) {
    try {
        const log = await db.gun_log.get(id);
        if (!log) {
            app.innerHTML = `<div class="error-box">該当するデータが見つかりません。</div>`;
            return;
        }
        
        const gun = log.gun_id ? await db.gun.get(log.gun_id) : null;
        
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
        
        const tableData = [
            { label: '使用日', value: formatDate(log.use_date) },
            { label: '目的', value: log.purpose },
            { label: '使用した銃', value: gun ? escapeHTML(gun.name) : '不明' },
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
        
        let memoHTML = '';
        if (log.memo) {
            memoHTML = `
                <div class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">メモ</h2>
                    <p class="text-sm text-gray-700 leading-relaxed">
                        ${escapeHTML(log.memo).replace(/\n/g, '<br>')}
                    </p>
                </div>
            `;
        }
        
        const catchButtonHTML = `
            <div class="card">
                 <h2 class="text-lg font-semibold border-b pb-2 mb-4">捕獲記録</h2>
                <div class="space-y-3">
                    <button id="show-related-catches-btn" class="btn btn-secondary w-full justify-start text-left">
                         <span class="w-6">🐾</span> この日の捕獲記録を見る
                    </button>
                    <button id="add-catch-to-log-btn" class="btn btn-primary w-full justify-start text-left">
                        <span class="w-6">＋</span> この日に捕獲した
                    </button>
                </div>
            </div>
        `;

        app.innerHTML = `
            <div class="space-y-4">
                ${imageHTML}
                ${tableHTML}
                ${memoHTML}
                ${catchButtonHTML}
            </div>
        `;

        updateHeader('銃使用履歴 詳細', true);
        backButton.onclick = () => showGunPage();
        
        headerActions.innerHTML = ''; // クリア
        
        const editButton = document.createElement('button');
        editButton.className = 'btn btn-secondary';
        editButton.textContent = '編集';
        editButton.onclick = () => showGunLogEditForm(id);
        headerActions.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger ml-2';
        deleteButton.textContent = '削除';
        deleteButton.onclick = () => deleteGunLog(id);
        headerActions.appendChild(deleteButton);

        const imgElement = document.getElementById('detail-image');
        if (imgElement) {
            imgElement.addEventListener('click', () => {
                showImageModal(imgElement.src);
            });
        }
        
        document.getElementById('show-related-catches-btn').addEventListener('click', () => {
            appState.currentCatchMethod = 'gun';
            appState.currentCatchRelationId = id; 
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
                    <label for="gun-log-location" class="form-label">場所:</label>
                    <input type="text" id="gun-log-location" class="form-input" value="${escapeHTML(log.location)}" placeholder="例: 〇〇山">
                </div>

                <div class="form-group">
                    <label class="form-label">位置情報</label>
                    <div class="grid grid-cols-2 gap-4">
                        <input type="number" step="any" id="gun-log-latitude" class="form-input" value="${escapeHTML(log.latitude)}" placeholder="緯度">
                        <input type="number" step="any" id="gun-log-longitude" class="form-input" value="${escapeHTML(log.longitude)}" placeholder="経度">
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
    
    document.getElementById('gun-log-gun').value = log.gun_id;

    updateHeader(pageTitle, true);
    backButton.onclick = () => {
        if (id) {
            showGunLogDetailPage(id);
        } else {
            showGunPage();
        }
    };
    
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
            previewContainer.innerHTML = `
                <div class="photo-preview">
                    <img src="${previewUrl}" alt="プレビュー">
                </div>`;
            URL.revokeObjectURL(previewUrl); 
        } catch (err) {
            previewContainer.innerHTML = `<p class="text-red-500">画像処理に失敗</p>`;
            resizedImageBlob = null;
        }
    });
    
    const removeBtn = document.getElementById('remove-image-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            const currentImageDiv = removeBtn.closest('.form-group');
            if (currentImageDiv) currentImageDiv.remove();
            log.image_blob = null; 
            currentImageHTML = '<div class="form-group"><label class="form-label">現在の写真:</label><p class="text-gray-500">(削除されます)</p></div>'; 
        });
    }

    const currentImg = document.getElementById('current-image');
    if (currentImg) {
        currentImg.addEventListener('click', () => {
            showImageModal(currentImg.src);
        });
        backButton.addEventListener('click', () => {
             URL.revokeObjectURL(currentImg.src);
        }, { once: true });
    }

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

async function deleteGunLog(id) {
    if (!confirm('この銃使用履歴を本当に削除しますか？\nこの履歴に関連する【捕獲記録もすべて削除】されます。\nこの操作は元に戻せません。')) {
        return;
    }

    try {
        await db.transaction('rw', db.gun_log, db.catch_records, async () => {
            await db.catch_records.where('gun_log_id').equals(id).delete();
            await db.gun_log.delete(id);
        });
        
        showGunPage(); 
        
    } catch (err) {
        console.error("Failed to delete gun log and related catches:", err);
        alert(`削除に失敗しました: ${err.message}`);
    }
}