// このファイルは gun.js です
// ★ 修正: 弾の購入フォームのイベントリスナー重複登録バグを修正
// ★ 修正: <label>のアクセシビリティ警告対応 (<span>への変更)

/**
 * 「銃」タブのメインページを表示する
 */
async function showGunPage() {
    // 状態の読み込み
    const filters = appState.gunLogFilters;
    const sort = appState.gunLogSort;

    // 銃リストの取得 (フィルター用)
    const guns = await db.gun.toArray();
    const gunOptions = guns.map(gun => 
        `<option value="${gun.id}" ${filters.gun_id == gun.id ? 'selected' : ''}>${escapeHTML(gun.name)}</option>`
    ).join('');

    app.innerHTML = `
        <div class="space-y-4">
            <div class="flex space-x-2">
                <button id="new-gun-log-btn" class="btn btn-primary flex-1">
                    <i class="fas fa-plus"></i> 新規使用履歴
                </button>
                <button id="manage-guns-btn" class="btn btn-secondary flex-1">
                    <i class="fas fa-cog"></i> 所持銃の管理
                </button>
            </div>

            <div class="card bg-white">
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group mb-0">
                        <label class="form-label">目的:</label>
                        <select id="gun-log-filter-purpose" class="form-select">
                            <option value="all" ${filters.purpose === 'all' ? 'selected' : ''}>すべて</option>
                            <option value="狩猟" ${filters.purpose === '狩猟' ? 'selected' : ''}>狩猟</option>
                            <option value="射撃" ${filters.purpose === '射撃' ? 'selected' : ''}>射撃</option>
                            <option value="有害駆除" ${filters.purpose === '有害駆除' ? 'selected' : ''}>有害駆除</option>
                            <option value="その他" ${filters.purpose === 'その他' ? 'selected' : ''}>その他</option>
                        </select>
                    </div>
                    
                    <div class="form-group mb-0">
                        <label class="form-label">銃:</label>
                        <select id="gun-log-filter-gun" class="form-select">
                            <option value="all" ${filters.gun_id === 'all' ? 'selected' : ''}>すべて</option>
                            ${gunOptions}
                        </select>
                    </div>

                    <div class="form-group mb-0 col-span-2">
                        <span class="form-label">ソート:</span>
                        <div class="flex space-x-2">
                            <select id="gun-log-sort-key" class="form-select">
                                <option value="use_date" ${sort.key === 'use_date' ? 'selected' : ''}>使用日</option>
                                <option value="ammo_count" ${sort.key === 'ammo_count' ? 'selected' : ''}>消費弾数</option>
                            </select>
                            <select id="gun-log-sort-order" class="form-select w-24">
                                <option value="desc" ${sort.order === 'desc' ? 'selected' : ''}>降順</option>
                                <option value="asc" ${sort.order === 'asc' ? 'selected' : ''}>昇順</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div id="gun-log-list" class="space-y-3">
                <p class="text-gray-500 text-center py-4">読み込み中...</p>
            </div>
        </div>
    `;

    updateHeader('銃・使用履歴', false);
    
    // イベントリスナー
    document.getElementById('new-gun-log-btn').onclick = () => showGunLogEditForm(null);
    
    // 「所持銃の管理」画面へ (銃リストを表示するだけのシンプルな画面として実装)
    document.getElementById('manage-guns-btn').onclick = () => showGunListManagementPage();

    document.getElementById('gun-log-filter-purpose').addEventListener('change', (e) => {
        filters.purpose = e.target.value;
        renderGunLogList();
    });
    document.getElementById('gun-log-filter-gun').addEventListener('change', (e) => {
        filters.gun_id = e.target.value;
        renderGunLogList();
    });
    document.getElementById('gun-log-sort-key').addEventListener('change', (e) => {
        sort.key = e.target.value;
        renderGunLogList();
    });
    document.getElementById('gun-log-sort-order').addEventListener('change', (e) => {
        sort.order = e.target.value;
        renderGunLogList();
    });

    await renderGunLogList();
}

/**
 * 銃の使用履歴リストを描画する
 */
async function renderGunLogList() {
    const listElement = document.getElementById('gun-log-list');
    if (!listElement) return;

    listElement.innerHTML = `<p class="text-gray-500 text-center py-4">読み込み中...</p>`;

    try {
        const filters = appState.gunLogFilters;
        const sort = appState.gunLogSort;

        let query = db.gun_log.orderBy(sort.key);
        if (sort.order === 'desc') {
            query = query.reverse();
        }

        let logs = await query.toArray();

        // フィルタリング
        if (filters.purpose !== 'all') {
            logs = logs.filter(log => log.purpose === filters.purpose);
        }
        if (filters.gun_id !== 'all') {
            const gunId = parseInt(filters.gun_id, 10);
            logs = logs.filter(log => log.gun_id === gunId);
        }

        if (logs.length === 0) {
            listElement.innerHTML = `<p class="text-gray-500 text-center py-4">履歴はありません。</p>`;
            return;
        }

        // 銃情報の取得 (ID -> 名前)
        const guns = await db.gun.toArray();
        const gunMap = new Map(guns.map(g => [g.id, g.name]));

        // 捕獲数カウント
        const countPromises = logs.map(log => 
            db.catch_records.where('gun_log_id').equals(log.id).count()
        );
        const catchCounts = await Promise.all(countPromises);

        listElement.innerHTML = logs.map((log, index) => {
            const gunName = gunMap.get(log.gun_id) || '(削除された銃)';
            const catchCount = catchCounts[index];
            const catchBadge = catchCount > 0 
                ? `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-emerald-600 bg-emerald-200">${catchCount}件</span>` 
                : '';
            
            return `
                <div class="trap-card bg-white" data-id="${log.id}">
                    <div class="flex-grow">
                        <h3 class="text-lg font-semibold text-blue-600">${formatDate(log.use_date)}</h3>
                        <p class="text-sm text-gray-600">${escapeHTML(log.purpose)} / ${escapeHTML(gunName)}</p>
                        ${log.ammo_count ? `<p class="text-sm text-gray-500">消費: ${log.ammo_count}発</p>` : ''}
                    </div>
                    <div class="flex-shrink-0 ml-4 flex items-center space-x-2">
                        ${catchBadge}
                        <span>&gt;</span>
                    </div>
                </div>
            `;
        }).join('');

        listElement.querySelectorAll('.trap-card').forEach(item => {
            item.addEventListener('click', () => {
                showGunLogDetailPage(parseInt(item.dataset.id, 10));
            });
        });

    } catch (err) {
        console.error("Failed to render gun log list:", err);
        listElement.innerHTML = `<div class="error-box">履歴の読み込みに失敗しました。</div>`;
    }
}

// --- 所持銃の管理 (リスト表示) ---

async function showGunListManagementPage() {
    updateHeader('所持銃の管理', true);
    backButton.onclick = () => showGunPage();

    app.innerHTML = `
        <div class="space-y-4">
            <div class="card bg-white">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">新しい銃を登録</h2>
                <button id="add-new-gun-btn" class="btn btn-primary w-full"><i class="fas fa-plus"></i> 銃を追加する</button>
            </div>
            
            <div id="gun-management-list" class="space-y-3">
                <p class="text-gray-500 text-center py-4">読み込み中...</p>
            </div>
        </div>
    `;

    document.getElementById('add-new-gun-btn').onclick = () => showGunEditForm(null); // 新規作成フォームへ

    const listElement = document.getElementById('gun-management-list');
    try {
        const guns = await db.gun.toArray();
        if (guns.length === 0) {
            listElement.innerHTML = `<p class="text-gray-500 text-center py-4">登録されている銃はありません。</p>`;
            return;
        }

        listElement.innerHTML = guns.map(gun => `
            <div class="trap-card bg-white" data-id="${gun.id}">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800">${escapeHTML(gun.name)}</h3>
                    <p class="text-sm text-gray-600">${escapeHTML(gun.type)} / ${escapeHTML(gun.caliber)}</p>
                </div>
                <span>&gt;</span>
            </div>
        `).join('');

        listElement.querySelectorAll('.trap-card').forEach(item => {
            item.addEventListener('click', () => {
                showGunDetailPage(parseInt(item.dataset.id, 10)); // 詳細ページへ
            });
        });

    } catch (err) {
        console.error(err);
        listElement.innerHTML = `<div class="error-box">読み込みエラー</div>`;
    }
}


// --- 銃 (詳細 & 弾管理) ---------------------------------

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
        
        const editButtonsHTML = `
            <div class="card bg-white">
                <div class="flex space-x-2">
                    <button id="edit-gun-btn" class="btn btn-secondary flex-1"><i class="fas fa-edit"></i> 編集</button>
                    <button id="delete-gun-btn" class="btn btn-danger flex-1"><i class="fas fa-trash"></i> 削除</button>
                </div>
            </div>
        `;
        
        const tableData = [
            { label: '名前', value: gun.name },
            { label: '銃種', value: gun.type },
            { label: '口径', value: gun.caliber },
        ];
        let tableHTML = `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-2 mb-4">銃の情報</h2><table class="w-full text-sm"><tbody>`;
        tableData.forEach(row => { 
            if(row.value) tableHTML += `<tr class="border-b"><th class="w-1/3 text-left font-medium text-gray-600 p-2 bg-gray-50">${escapeHTML(row.label)}</th><td class="w-2/3 text-gray-800 p-2">${escapeHTML(row.value)}</td></tr>`; 
        });
        tableHTML += '</tbody></table></div>';

        const logButtonHTML = `
            <div class="card bg-white">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">使用履歴</h2>
                <button id="show-related-logs-btn" class="btn btn-secondary w-full justify-start text-left">
                    <span class="w-6"><i class="fas fa-history"></i></span> この銃の使用履歴を見る
                </button>
            </div>
        `;

        const today = new Date().toISOString().split('T')[0];
        const ammoManagementHTML = `
            <div class="card bg-white">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">弾の管理</h2>
                <form id="ammo-purchase-form" class="space-y-3 mb-4">
                    <div class="form-group">
                        <label for="ammo-purchase-date" class="form-label">購入日:</label>
                        <input type="date" id="ammo-purchase-date" class="form-input" value="${today}" required>
                    </div>
                    <div class="form-group">
                        <label for="ammo-purchase-amount" class="form-label">購入数:</label>
                        <input type="number" id="ammo-purchase-amount" class="form-input" min="1" required>
                    </div>
                    <button type="submit" class="btn btn-primary w-full">購入を記録</button>
                    <div id="ammo-form-error" class="text-red-600 text-sm text-center h-4"></div>
                </form>
                <h3 class="text-md font-semibold mt-4">集計</h3>
                <table class="w-full text-sm my-2">
                    <tbody>
                        <tr class="border-b"><th class="w-1/2 text-left font-medium text-gray-600 p-2 bg-gray-50">総購入数</th><td id="ammo-total-purchased" class="w-1/2 text-gray-800 p-2">...</td></tr>
                        <tr class="border-b"><th class="w-1/2 text-left font-medium text-gray-600 p-2 bg-gray-50">総消費数</th><td id="ammo-total-consumed" class="w-1/2 text-gray-800 p-2">...</td></tr>
                        <tr class="border-b"><th class="w-1/2 text-left font-medium text-gray-600 p-2 bg-gray-50">残弾数</th><td id="ammo-remaining" class="w-1/2 text-gray-800 p-2 font-bold">...</td></tr>
                    </tbody>
                </table>
                <h3 class="text-md font-semibold mt-4">購入・消費履歴</h3>
                <div id="ammo-log-table-container" class="max-h-60 overflow-y-auto border rounded-lg mt-2">
                    <table class="w-full text-sm"><thead class="bg-gray-50 sticky top-0"><tr><th class="p-2 text-left">日付</th><th class="p-2 text-left">内容</th><th class="p-2 text-right">増減</th></tr></thead><tbody id="ammo-log-table-body"><tr><td colspan="3" class="p-4 text-center text-gray-500">読み込み中...</td></tr></tbody></table>
                </div>
            </div>
        `;

        app.innerHTML = `<div class="space-y-4">${editButtonsHTML}${tableHTML}${logButtonHTML}${ammoManagementHTML}</div>`;

        updateHeader(escapeHTML(gun.name), true);
        backButton.onclick = () => showGunListManagementPage(); // リストに戻る
        headerActions.innerHTML = '';

        // イベントリスナー
        document.getElementById('edit-gun-btn').onclick = () => showGunEditForm(id);
        document.getElementById('delete-gun-btn').onclick = () => deleteGun(id);
        document.getElementById('show-related-logs-btn').addEventListener('click', () => {
            appState.gunLogFilters.gun_id = id.toString(); 
            showGunPage(); 
        });
        
        // ★ 修正: イベントリスナーの登録をここに移動 (重複登録バグの修正)
        document.getElementById('ammo-purchase-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const dateInput = document.getElementById('ammo-purchase-date');
            const amountInput = document.getElementById('ammo-purchase-amount');
            const errorEl = document.getElementById('ammo-form-error');
            
            const amount = parseInt(amountInput.value, 10);
            if (!dateInput.value || !amount || amount <= 0) {
                errorEl.textContent = '日付と正しい購入数を入力してください。';
                return;
            }
            
            try {
                await db.ammo_purchases.add({
                    gun_id: id,
                    purchase_date: dateInput.value,
                    amount: amount
                });
                
                // 入力欄をリセット
                dateInput.value = new Date().toISOString().split('T')[0];
                amountInput.value = '';
                errorEl.textContent = '';
                
                // データ部分だけ再描画
                await renderAmmoManagement(id);
            } catch (err) {
                console.error("Failed to save ammo purchase:", err);
                errorEl.textContent = '保存に失敗しました。';
            }
        });

        // 初回データ描画
        await renderAmmoManagement(id);

    } catch (err) {
        console.error("Failed to show gun detail:", err);
        app.innerHTML = `<div class="error-box">詳細の読み込みに失敗しました: ${err.message}</div>`;
    }
}

/**
 * 弾の管理セクション（テーブルと集計）を更新する
 */
async function renderAmmoManagement(gunId) {
    try {
        const purchases = await db.ammo_purchases.where('gun_id').equals(gunId).toArray();
        const consumptions = await db.gun_log.where('gun_id').equals(gunId).and(log => log.ammo_count > 0).toArray();

        const totalPurchased = purchases.reduce((sum, p) => sum + p.amount, 0);
        const totalConsumed = consumptions.reduce((sum, c) => sum + (c.ammo_count || 0), 0);
        const remainingAmmo = totalPurchased - totalConsumed;

        const elTotalPurchased = document.getElementById('ammo-total-purchased');
        const elTotalConsumed = document.getElementById('ammo-total-consumed');
        const elRemaining = document.getElementById('ammo-remaining');
        
        if (elTotalPurchased) elTotalPurchased.textContent = `${totalPurchased} 発`;
        if (elTotalConsumed) elTotalConsumed.textContent = `${totalConsumed} 発`;
        if (elRemaining) elRemaining.textContent = `${remainingAmmo} 発`;
        
        const purchaseLogs = purchases.map(p => ({ date: p.purchase_date, type: '購入', amount: p.amount, id: `p-${p.id}` }));
        const consumptionLogs = consumptions.map(c => ({ date: c.use_date, type: `消費 (${c.purpose})`, amount: -c.ammo_count, id: `c-${c.id}` }));
        
        const combinedLogs = [...purchaseLogs, ...consumptionLogs];
        combinedLogs.sort((a, b) => b.date.localeCompare(a.date));

        const tableBody = document.getElementById('ammo-log-table-body');
        if (!tableBody) return;

        if (combinedLogs.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-500">履歴はありません。</td></tr>`;
        } else {
            tableBody.innerHTML = combinedLogs.map(log => {
                const isPurchase = log.amount > 0;
                const amountClass = isPurchase ? 'text-green-600' : 'text-red-600';
                const amountSign = isPurchase ? '+' : '';
                const deleteButton = isPurchase ? `<button class="btn btn-danger btn-sm ammo-delete-btn" style="padding: 0.1rem 0.4rem; font-size: 0.7rem;" data-id="${log.id}">&times;</button>` : '';

                return `
                    <tr class="border-b">
                        <td class="p-2">${formatDate(log.date)}</td>
                        <td class="p-2">${escapeHTML(log.type)}</td>
                        <td class="p-2 text-right font-medium ${amountClass} flex justify-end items-center space-x-2">
                            <span>${amountSign}${log.amount}</span>
                            ${deleteButton}
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        // 削除ボタンのリスナー (再描画のたびに再設定が必要)
        tableBody.querySelectorAll('.ammo-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const logId = e.currentTarget.dataset.id;
                if (!logId.startsWith('p-')) return;
                const purchaseId = parseInt(logId.substring(2), 10);
                if (confirm('この購入履歴を削除しますか？')) {
                    try {
                        await db.ammo_purchases.delete(purchaseId);
                        await renderAmmoManagement(gunId); 
                    } catch (err) {
                        alert('削除に失敗しました。');
                    }
                }
            });
        });

    } catch (err) {
        console.error("Failed to render ammo management:", err);
    }
}

// --- 銃 (編集/新規) -----------------------------

async function showGunEditForm(id) {
    let gun = { name: '', type: '', caliber: '' };
    let pageTitle = '新規 銃登録';

    if (id) {
        pageTitle = '銃の編集';
        const existingGun = await db.gun.get(id);
        if (existingGun) {
            gun = existingGun;
        } else {
            app.innerHTML = `<div class="error-box">編集対象のデータが見つかりません。</div>`;
            return;
        }
    }

    app.innerHTML = `
        <div class="card bg-white">
            <form id="gun-form" class="space-y-4">
                <div class="form-group">
                    <label for="gun-name" class="form-label">銃の名前 <span class="text-red-500">*</span>:</label>
                    <input type="text" id="gun-name" class="form-input" value="${escapeHTML(gun.name)}" placeholder="例: ミロク上下二連" required>
                </div>
                <div class="form-group">
                    <label for="gun-type" class="form-label">種類:</label>
                    <input type="text" id="gun-type" class="form-input" value="${escapeHTML(gun.type)}" placeholder="例: 散弾銃">
                </div>
                <div class="form-group">
                    <label for="gun-caliber" class="form-label">口径:</label>
                    <input type="text" id="gun-caliber" class="form-input" value="${escapeHTML(gun.caliber)}" placeholder="例: 12番">
                </div>
                <button type="submit" class="btn btn-primary w-full">保存する</button>
                <div id="gun-form-error" class="text-red-600 text-sm text-center mt-2 h-4"></div>
            </form>
        </div>
    `;

    updateHeader(pageTitle, true);
    backButton.onclick = () => {
        if (id) showGunDetailPage(id);
        else showGunListManagementPage();
    };

    document.getElementById('gun-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('gun-name').value.trim();
        if (!name) {
            document.getElementById('gun-form-error').textContent = '名前は必須です。';
            return;
        }

        const formData = {
            name: name,
            type: document.getElementById('gun-type').value.trim(),
            caliber: document.getElementById('gun-caliber').value.trim()
        };

        try {
            if (id) {
                await db.gun.update(id, formData);
                showGunDetailPage(id);
            } else {
                const newId = await db.gun.add(formData);
                showGunDetailPage(newId);
            }
        } catch (err) {
            console.error("Failed to save gun:", err);
            if (err.name === 'ConstraintError') {
                document.getElementById('gun-form-error').textContent = 'その名前の銃は既に登録されています。';
            } else {
                document.getElementById('gun-form-error').textContent = '保存に失敗しました。';
            }
        }
    });
}

async function deleteGun(id) {
    if (!confirm('この銃を本当に削除しますか？\n関連する【使用履歴】や【弾の購入履歴】も削除されます。')) return;
    try {
        await db.transaction('rw', db.gun, db.gun_log, db.ammo_purchases, async () => {
            await db.gun_log.where('gun_id').equals(id).delete();
            await db.ammo_purchases.where('gun_id').equals(id).delete();
            await db.gun.delete(id);
        });
        showGunListManagementPage();
    } catch (err) {
        alert('削除に失敗しました。');
    }
}


// --- 銃使用履歴 (詳細) ---------------------------------

async function showGunLogDetailPage(id) {
    try {
        const log = await db.gun_log.get(id);
        if (!log) {
            app.innerHTML = `<div class="error-box">データが見つかりません。</div>`;
            return;
        }
        
        const gun = await db.gun.get(log.gun_id);
        const gunName = gun ? gun.name : '(削除された銃)';

        // 捕獲記録の確認
        const catchCount = await db.catch_records.where('gun_log_id').equals(id).count();

        // 編集・削除ボタン
        const editButtonsHTML = `
            <div class="card bg-white">
                <div class="flex space-x-2">
                    <button id="edit-log-btn" class="btn btn-secondary flex-1">編集</button>
                    <button id="delete-log-btn" class="btn btn-danger flex-1">削除</button>
                </div>
            </div>
        `;

        // 画像
        let imageHTML = '';
        if (log.image_blob) {
            const blobUrl = URL.createObjectURL(log.image_blob);
            appState.activeBlobUrls.push(blobUrl);
            imageHTML = `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-2 mb-4">写真</h2><div class="photo-preview cursor-zoom-in"><img src="${blobUrl}" alt="写真" id="detail-image" class="clickable-image"></div></div>`;
        }

        // 基本情報
        const tableData = [
            { label: '使用日', value: formatDate(log.use_date) },
            { label: '銃', value: gunName },
            { label: '目的', value: log.purpose },
            { label: '場所', value: log.location },
            { label: '消費弾数', value: log.ammo_count ? `${log.ammo_count} 発` : '0 発' },
            { label: '同行者', value: log.companion },
            { label: '緯度', value: log.latitude },
            { label: '経度', value: log.longitude },
        ];
        let tableHTML = `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-2 mb-4">使用記録</h2><table class="w-full text-sm"><tbody>`;
        tableData.forEach(row => { if(row.value) tableHTML += `<tr class="border-b"><th class="w-1/3 text-left font-medium text-gray-600 p-2 bg-gray-50">${escapeHTML(row.label)}</th><td class="w-2/3 text-gray-800 p-2">${escapeHTML(row.value)}</td></tr>`; });
        tableHTML += '</tbody></table></div>';

        // メモ
        let memoHTML = '';
        if (log.memo) {
            memoHTML = `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-2 mb-4">メモ</h2><p class="text-sm text-gray-700 leading-relaxed">${escapeHTML(log.memo).replace(/\n/g, '<br>')}</p></div>`;
        }

        // 捕獲記録ボタン
        const catchButtonHTML = `
            <div class="card bg-white">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">捕獲記録 (${catchCount}件)</h2>
                <div class="space-y-3">
                    <button id="show-related-catches-btn" class="btn btn-secondary w-full justify-start text-left"><span class="w-6"><i class="fas fa-paw"></i></span> この履歴の捕獲記録を見る</button>
                    <button id="add-catch-to-log-btn" class="btn btn-primary w-full justify-start text-left"><span class="w-6"><i class="fas fa-plus"></i></span> この履歴で捕獲記録を追加</button>
                </div>
            </div>
        `;

        app.innerHTML = `<div class="space-y-4">${editButtonsHTML}${imageHTML}${tableHTML}${memoHTML}${catchButtonHTML}</div>`;

        updateHeader('使用履歴 詳細', true);
        backButton.onclick = () => showGunPage();
        headerActions.innerHTML = '';

        document.getElementById('edit-log-btn').onclick = () => showGunLogEditForm(id);
        document.getElementById('delete-log-btn').onclick = () => deleteGunLog(id);
        
        const imgElement = document.getElementById('detail-image');
        if (imgElement) imgElement.addEventListener('click', () => showImageModal(imgElement.src));

        document.getElementById('show-related-catches-btn').addEventListener('click', () => {
            appState.currentCatchMethod = 'gun';
            appState.currentCatchRelationId = id;
            navigateTo('catch', showCatchListPage, '銃の捕獲記録');
        });
        document.getElementById('add-catch-to-log-btn').addEventListener('click', () => {
            showCatchEditForm(null, { trapId: null, gunLogId: id });
        });

    } catch (err) {
        console.error("Failed to show log detail:", err);
        app.innerHTML = `<div class="error-box">読み込みエラー</div>`;
    }
}

// --- 銃使用履歴 (編集/新規) -----------------------------

async function showGunLogEditForm(id) {
    let log = {
        use_date: new Date().toISOString().split('T')[0],
        gun_id: '',
        purpose: '狩猟',
        location: '',
        ammo_count: '',
        companion: '',
        latitude: '',
        longitude: '',
        memo: '',
        image_blob: null
    };
    let pageTitle = '新規 使用履歴';
    let currentImageHTML = '';

    const guns = await db.gun.toArray();
    const gunOptions = guns.map(gun => `<option value="${gun.id}">${escapeHTML(gun.name)}</option>`).join('');

    if (id) {
        pageTitle = '使用履歴の編集';
        const existing = await db.gun_log.get(id);
        if (existing) {
            log = existing;
            if (log.image_blob) {
                const blobUrl = URL.createObjectURL(log.image_blob);
                appState.activeBlobUrls.push(blobUrl);
                currentImageHTML = `<div class="form-group"><label class="form-label">現在の写真:</label><div class="photo-preview cursor-zoom-in"><img src="${blobUrl}" id="current-image" class="clickable-image"><button type="button" id="remove-image-btn" class="photo-preview-btn-delete">&times;</button></div></div>`;
            }
        }
    }

    app.innerHTML = `
        <div class="card bg-white">
            <form id="gun-log-form" class="space-y-4">
                <div class="form-group">
                    <label class="form-label">日付 <span class="text-red-500">*</span>:</label>
                    <input type="date" id="log-date" class="form-input" value="${escapeHTML(log.use_date)}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">使用した銃 <span class="text-red-500">*</span>:</label>
                    <select id="log-gun" class="form-select" required>
                        <option value="" disabled ${!log.gun_id ? 'selected' : ''}>選択してください</option>
                        ${guns.map(g => `<option value="${g.id}" ${g.id == log.gun_id ? 'selected' : ''}>${escapeHTML(g.name)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">目的:</label>
                    <select id="log-purpose" class="form-select">
                        <option value="狩猟" ${log.purpose === '狩猟' ? 'selected' : ''}>狩猟</option>
                        <option value="射撃" ${log.purpose === '射撃' ? 'selected' : ''}>射撃</option>
                        <option value="有害駆除" ${log.purpose === '有害駆除' ? 'selected' : ''}>有害駆除</option>
                        <option value="その他" ${log.purpose === 'その他' ? 'selected' : ''}>その他</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">場所:</label>
                    <input type="text" id="log-location" class="form-input" value="${escapeHTML(log.location)}">
                </div>
                <div class="form-group">
                    <label class="form-label">消費弾数:</label>
                    <input type="number" id="log-ammo" class="form-input" value="${escapeHTML(log.ammo_count)}" min="0">
                </div>
                <div class="form-group">
                    <label class="form-label">同行者:</label>
                    <input type="text" id="log-companion" class="form-input" value="${escapeHTML(log.companion)}">
                </div>
                
                <div class="form-group">
                    <span class="form-label">位置情報</span>
                    <div class="grid grid-cols-2 gap-4">
                        <input type="number" step="any" id="log-latitude" class="form-input" value="${escapeHTML(log.latitude)}" placeholder="緯度">
                        <input type="number" step="any" id="log-longitude" class="form-input" value="${escapeHTML(log.longitude)}" placeholder="経度">
                    </div>
                    <button type="button" id="get-gps-btn" class="btn btn-secondary w-full mt-2">現在地を取得</button>
                </div>

                ${currentImageHTML}
                <div class="form-group">
                    <label class="form-label">${id && log.image_blob ? '写真を変更:' : '写真を追加:'}</label>
                    <input type="file" id="log-image" class="form-input" accept="image/*">
                    <div id="image-preview-container" class="mt-2"></div>
                </div>

                <div class="form-group">
                    <label class="form-label">メモ:</label>
                    <textarea id="log-memo" rows="4" class="form-input">${escapeHTML(log.memo)}</textarea>
                </div>
                
                <button type="submit" class="btn btn-primary w-full">保存する</button>
                <div id="form-error" class="text-red-600 text-sm text-center mt-2 h-4"></div>
            </form>
        </div>
    `;

    updateHeader(pageTitle, true);
    backButton.onclick = () => {
        if (id) showGunLogDetailPage(id);
        else showGunPage();
    };

    // GPSボタン
    document.getElementById('get-gps-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.innerHTML = '測位中...'; btn.disabled = true;
        try {
            const loc = await getCurrentLocation();
            document.getElementById('log-latitude').value = loc.latitude;
            document.getElementById('log-longitude').value = loc.longitude;
        } catch (err) {
            document.getElementById('form-error').textContent = err.message;
        } finally {
            btn.innerHTML = '現在地を取得'; btn.disabled = false;
        }
    });

    // 画像処理 (trap.js, catch.js と同様のロジック)
    const imageInput = document.getElementById('log-image');
    const previewContainer = document.getElementById('image-preview-container');
    let resizedImageBlob = null;

    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) { previewContainer.innerHTML = ''; resizedImageBlob = null; return; }
        previewContainer.innerHTML = `<p class="text-gray-500">画像処理中...</p>`;
        try {
            resizedImageBlob = await resizeImage(file, 800);
            const previewUrl = URL.createObjectURL(resizedImageBlob);
            appState.activeBlobUrls.push(previewUrl);
            previewContainer.innerHTML = `<div class="photo-preview"><img src="${previewUrl}"></div>`;
        } catch (err) {
            previewContainer.innerHTML = `<p class="text-red-500">失敗: ${err.message}</p>`;
        }
    });

    if (document.getElementById('remove-image-btn')) {
        document.getElementById('remove-image-btn').onclick = function() {
            this.closest('.form-group').remove();
            log.image_blob = null;
        };
    }
    if (document.getElementById('current-image')) {
        document.getElementById('current-image').onclick = (e) => showImageModal(e.target.src);
    }

    // 保存処理
    document.getElementById('gun-log-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('log-date').value;
        const gunId = document.getElementById('log-gun').value;
        if (!date || !gunId) {
            document.getElementById('form-error').textContent = '日付と銃は必須です。';
            return;
        }

        const formData = {
            use_date: date,
            gun_id: parseInt(gunId, 10),
            purpose: document.getElementById('log-purpose').value,
            location: document.getElementById('log-location').value,
            ammo_count: parseInt(document.getElementById('log-ammo').value, 10) || 0,
            companion: document.getElementById('log-companion').value,
            latitude: document.getElementById('log-latitude').value,
            longitude: document.getElementById('log-longitude').value,
            memo: document.getElementById('log-memo').value,
            image_blob: log.image_blob
        };
        if (resizedImageBlob) formData.image_blob = resizedImageBlob;

        try {
            if (id) {
                await db.gun_log.put({ ...formData, id: id });
                showGunLogDetailPage(id);
            } else {
                const newId = await db.gun_log.add(formData);
                showGunLogDetailPage(newId);
            }
        } catch (err) {
            document.getElementById('form-error').textContent = '保存に失敗しました。';
        }
    });
}

async function deleteGunLog(id) {
    if (!confirm('この記録を削除しますか？')) return;
    try {
        await db.transaction('rw', db.gun_log, db.catch_records, async () => {
            // 紐づく捕獲記録のリンクも解除(削除まではしない) or 削除？ -> 罠同様削除が安全
            // ここでは紐づけ解除だけに留める実装にするか、削除するか。
            // 罠の場合は削除したが、銃の場合は「その時撃った獲物」なので削除でよい。
            await db.catch_records.where('gun_log_id').equals(id).delete();
            await db.gun_log.delete(id);
        });
        showGunPage();
    } catch (err) {
        alert('削除に失敗しました。');
    }
}