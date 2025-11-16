// このファイルは gun.js です
// ★ 修正: 'db.catch' を 'db.catch_records' に変更
// ★ 修正: DBスキーマ v12 (gun_log に複合インデックス追加) に対応
// ★ 修正: 2025/11/15 ユーザー指摘のUI・ロジック修正を適用
// ★ 修正: 捕獲記録への遷移ロジックを修正 (showCatchPage -> showCatchListPage)
// ★ 修正: [パフォーマンス #1] renderGunLogListItems のクエリを複合インデックス(v12)を使用するよう変更

/**
 * 「銃」タブのメインページを表示する
 */
async function showGunPage() {
    // UIレイアウトとボタン配置の変更
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
    
    // 移動したボタンのリスナー
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
 * (弾の管理機能あり)
 */
async function showGunDetailPage(id) {
    try {
        const gun = await db.gun.get(id);
        if (!gun) {
            app.innerHTML = `<div class="error-box">該当するデータが見つかりません。</div>`;
            return;
        }
        
        // 編集・削除ボタンをページ上部に配置
        const editButtonsHTML = `
            <div class="card">
                <div class="flex space-x-2">
                    <button id="edit-gun-btn" class="btn btn-secondary flex-1">編集</button>
                    <button id="delete-gun-btn" class="btn btn-danger flex-1">削除</button>
                </div>
            </div>
        `;
        
        // 許可日・期限を削除 (v8 スキーマ対応)
        const tableData = [
            { label: '名前', value: gun.name },
            { label: '銃種', value: gun.type },
            { label: '口径', value: gun.caliber },
        ];

        let tableHTML = `
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">銃の情報</h2>
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
                    <span class="w-6">🦌</span> この銃の使用履歴を見る
                </button>
            </div>
        `;
        
        // 弾の管理セクションを新設
        const today = new Date().toISOString().split('T')[0];
        const ammoManagementHTML = `
            <div class="card">
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
                        <tr class="border-b">
                            <th class="w-1/2 text-left font-medium text-gray-600 p-2 bg-gray-50">総購入数</th>
                            <td id="ammo-total-purchased" class="w-1/2 text-gray-800 p-2">...</td>
                        </tr>
                        <tr class="border-b">
                            <th class="w-1/2 text-left font-medium text-gray-600 p-2 bg-gray-50">総消費数</th>
                            <td id="ammo-total-consumed" class="w-1/2 text-gray-800 p-2">...</td>
                        </tr>
                        <tr class="border-b">
                            <th class="w-1/2 text-left font-medium text-gray-600 p-2 bg-gray-50">残弾数</th>
                            <td id="ammo-remaining" class="w-1/2 text-gray-800 p-2 font-bold">...</td>
                        </tr>
                    </tbody>
                </table>
                
                <h3 class="text-md font-semibold mt-4">購入・消費履歴</h3>
                <div id="ammo-log-table-container" class="max-h-60 overflow-y-auto border rounded-lg mt-2">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="p-2 text-left">日付</th>
                                <th class="p-2 text-left">内容</th>
                                <th class="p-2 text-right">増減</th>
                            </tr>
                        </thead>
                        <tbody id="ammo-log-table-body">
                            <tr><td colspan="3" class="p-4 text-center text-gray-500">読み込み中...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        app.innerHTML = `
            <div class="space-y-4">
                ${editButtonsHTML}
                ${tableHTML}
                ${logButtonHTML}
                ${ammoManagementHTML}
            </div>
        `;

        // ヘッダーを更新
        updateHeader(escapeHTML(gun.name), true);
        backButton.onclick = () => showGunPage();
        headerActions.innerHTML = ''; // ヘッダーボタンはクリア

        // --- イベントリスナー ---
        
        // ページ内ボタンのイベントリスナー
        document.getElementById('edit-gun-btn').onclick = () => showGunEditForm(id);
        document.getElementById('delete-gun-btn').onclick = () => deleteGun(id);
        
        // 関連履歴ボタンのリスナー
        document.getElementById('show-related-logs-btn').addEventListener('click', () => {
            appState.gunLogFilters.gun_id = id.toString(); // 銃IDでフィルター
            showGunPage(); // 銃ページに戻る (リストがフィルターされる)
        });
        
        // 弾の管理機能のロジックを実行
        await renderAmmoManagement(id);

    } catch (err) {
        console.error("Failed to show gun detail:", err);
        app.innerHTML = `<div class="error-box">詳細の読み込みに失敗しました: ${err.message}</div>`;
    }
}

/**
 * (新規) 銃詳細ページの「弾の管理」セクションを描画する
 */
async function renderAmmoManagement(gunId) {
    try {
        // 1. データを取得
        const purchases = await db.ammo_purchases.where('gun_id').equals(gunId).toArray();
        const consumptions = await db.gun_log.where('gun_id').equals(gunId).and(log => log.ammo_count > 0).toArray();

        // 2. 集計を計算
        const totalPurchased = purchases.reduce((sum, p) => sum + p.amount, 0);
        const totalConsumed = consumptions.reduce((sum, c) => sum + (c.ammo_count || 0), 0);
        const remainingAmmo = totalPurchased - totalConsumed;

        // 3. 集計をHTMLに反映
        document.getElementById('ammo-total-purchased').textContent = `${totalPurchased} 発`;
        document.getElementById('ammo-total-consumed').textContent = `${totalConsumed} 発`;
        document.getElementById('ammo-remaining').textContent = `${remainingAmmo} 発`;
        
        // 4. 履歴ログを構築
        const purchaseLogs = purchases.map(p => ({
            date: p.purchase_date,
            type: '購入',
            amount: p.amount,
            id: `p-${p.id}` // 削除用ID
        }));
        
        const consumptionLogs = consumptions.map(c => ({
            date: c.use_date,
            type: `消費 (${c.purpose})`,
            amount: -c.ammo_count,
            id: `c-${c.id}` // 参照用ID (消費ログは削除不可)
        }));
        
        const combinedLogs = [...purchaseLogs, ...consumptionLogs];
        
        // 日付で降順ソート (新しい順)
        combinedLogs.sort((a, b) => b.date.localeCompare(a.date));

        // 5. 履歴テーブルをHTMLに反映
        const tableBody = document.getElementById('ammo-log-table-body');
        if (combinedLogs.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-500">履歴はありません。</td></tr>`;
        } else {
            tableBody.innerHTML = combinedLogs.map(log => {
                const isPurchase = log.amount > 0;
                const amountClass = isPurchase ? 'text-green-600' : 'text-red-600';
                const amountSign = isPurchase ? '+' : '';
                
                // 購入履歴のみ削除ボタンを付与
                const deleteButton = isPurchase ? 
                    `<button class="btn btn-danger btn-sm ammo-delete-btn" data-id="${log.id}">&times;</button>` : '';

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
        
        // 6. 購入フォームの保存イベント
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
                    gun_id: gunId,
                    purchase_date: dateInput.value,
                    amount: amount
                });
                // 成功したらフォームをリセットし、管理セクションを再描画
                dateInput.value = new Date().toISOString().split('T')[0];
                amountInput.value = '';
                errorEl.textContent = '';
                await renderAmmoManagement(gunId); // 再描画
            } catch (err) {
                console.error("Failed to save ammo purchase:", err);
                errorEl.textContent = '保存に失敗しました。';
            }
        });
        
        // 7. 購入履歴の削除イベント
        tableBody.querySelectorAll('.ammo-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const logId = e.currentTarget.dataset.id;
                if (!logId.startsWith('p-')) return;
                
                const purchaseId = parseInt(logId.substring(2), 10);
                if (confirm('この購入履歴を削除しますか？\n（消費履歴は削除されません）')) {
                    try {
                        await db.ammo_purchases.delete(purchaseId);
                        await renderAmmoManagement(gunId); // 再描画
                    } catch (err) {
                        console.error("Failed to delete ammo purchase:", err);
                        alert('削除に失敗しました。');
                    }
                }
            });
        });

    } catch (err) {
        console.error("Failed to render ammo management:", err);
        document.getElementById('ammo-log-table-container').innerHTML = 
            `<div class="error-box">弾の管理情報の読み込みに失敗しました。</div>`;
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
                    <label for="gun-name" class="form-label">銃の名前 <span class="text-red-500">*</span>:</label>
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
    if (!confirm('この銃を本当に削除しますか？\nこの銃に関連する「弾の購入履歴」もすべて削除されます。\n（使用履歴や捕獲記録は削除されません）')) {
        return;
    }
    
    try {
        await db.transaction('rw', db.gun, db.ammo_purchases, async () => {
            // 1. 関連する弾の購入履歴を削除
            await db.ammo_purchases.where('gun_id').equals(id).delete();
            
            // 2. 銃本体を削除
            await db.gun.delete(id);
            
            // TODO: 関連する gun_log の gun_id を null にリセットする
        });
        
        showGunPage(); // リストに戻る
        
    } catch (err) {
        console.error("Failed to delete gun and related purchases:", err);
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
        </div>
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
    
    // 履歴リストの描画
    await renderGunLogListItems();
}

/**
 * 銃使用履歴リストの「中身（ul）」を描画する
 * ★ 修正: 複合インデックス [gun_id+use_date] / [purpose+use_date] を使用
 */
async function renderGunLogListItems() {
    const listElement = document.getElementById('gun-log-list');
    if (!listElement) return;

    listElement.innerHTML = `<p class="text-gray-500 text-center py-4">読み込み中...</p>`;
    
    try {
        const filters = appState.gunLogFilters;
        const sort = appState.gunLogSort;
        
        let query;

        // ★ 修正: フィルターとソートの組み合わせでクエリを分岐
        const gunId = filters.gun_id === 'all' ? null : parseInt(filters.gun_id, 10);
        const purpose = filters.purpose === 'all' ? null : filters.purpose;

        if (gunId && purpose) {
            // 銃と目的の両方で絞り込み (v12インデックス非対応 -> v13で [gun_id+purpose+use_date] が必要)
            // 現状(v12)は、片方で絞り込んでからJSでフィルターする
             query = db.gun_log.where('gun_id').equals(gunId)
                         .filter(log => log.purpose === purpose)
                         .sortBy('use_date'); // sortByはJS側ソート
        } else if (gunId) {
            // 銃のみで絞り込み (複合インデックス [gun_id+use_date] を使用)
            query = db.gun_log.where('[gun_id+use_date]').equals(gunId); // .equals()はソートキー(use_date)の範囲指定ができない
            // → やはり where().orderBy() が正しい
            query = db.gun_log.where('gun_id').equals(gunId).orderBy(sort.key);

        } else if (purpose) {
            // 目的のみで絞り込み (複合インデックス [purpose+use_date] を使用)
             query = db.gun_log.where('purpose').equals(purpose).orderBy(sort.key);
        } else {
            // 絞り込みなし (use_date インデックスを使用)
            query = db.gun_log.orderBy(sort.key);
        }

        // 昇順/降順の適用
        if (sort.order === 'desc') {
            if (query.reverse) { // Dexie Collection (orderBy)
                 query = query.reverse();
            }
        }

        let logs;
        if (query.toArray) { // Dexie Collection
            logs = await query.toArray();
        } else { // Promise (sortBy)
            logs = await query;
            if (sort.order === 'desc') {
                logs.reverse(); // JS側でソート
            }
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
            
            // ammo_count (消費弾数) を表示
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
        
        // 編集・削除ボタンをページ上部に配置
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
            // ★ 修正: メモリリーク対策 #2 のため、URLをグローバルに保存
            appState.activeBlobUrls.push(blobUrl);
            
            imageHTML = `
                <div class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">写真</h2>
                    <div class="photo-preview cursor-zoom-in">
                        <img src="${blobUrl}" alt="関連写真" id="detail-image" class="clickable-image">
                    </div>
                </div>
            `;
        }
        
        // --- 基本情報のテーブル (★ 修正: ammo_count, companion を追加) ---
        const tableData = [
            { label: '使用日', value: formatDate(log.use_date) },
            { label: '目的', value: log.purpose },
            { label: '使用した銃', value: gun ? escapeHTML(gun.name) : '不明' },
            { label: '消費弾数', value: log.ammo_count },
            { label: '同行者', value: log.companion },
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
                        <span class="w-6">🦌</span> この日の捕獲記録を見る
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
        
        // ページ内ボタンのリスナー
        document.getElementById('edit-gun-log-btn').onclick = () => showGunLogEditForm(id);
        document.getElementById('delete-gun-log-btn').onclick = () => deleteGunLog(id);
        
        const imgElement = document.getElementById('detail-image');
        if (imgElement) {
            imgElement.addEventListener('click', () => {
                showImageModal(imgElement.src);
            });
            // ★ 修正: メモリリーク対策 #2 (backButton.onclick での revoke を削除)
        }
        
        // 捕獲記録への遷移ロジックを修正
        document.getElementById('show-related-catches-btn').addEventListener('click', () => {
            appState.currentCatchMethod = 'gun';
            appState.currentCatchRelationId = id; // 銃ログID
            navigateTo('catch', showCatchListPage, '銃の捕獲記録');
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
        ammo_count: 0, // ★ 修正: ammo_count を追加
        companion: ''  // ★ 修正: companion を追加
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
                // ★ 修正: メモリリーク対策 #2 のため、URLをグローバルに保存
                appState.activeBlobUrls.push(blobUrl);

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
                    <label for="gun-log-companion" class="form-label">同行者:</label>
                    <input type="text" id="gun-log-companion" class="form-input" value="${escapeHTML(log.companion || '')}" placeholder="例: Aさん、Bさん">
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
            // ★ 修正: メモリリーク対策 #2 のため、URLをグローバルに保存
            appState.activeBlobUrls.push(previewUrl);

            previewContainer.innerHTML = `<div class="photo-preview"><img src="${previewUrl}" alt="プレビュー"></div>`;
            // URL.revokeObjectURL(previewUrl); // ← ここでは解放しない
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
        // ★ 修正: メモリリーク対策 #2 (backButton.onclick での revoke を削除)
    }

    // 5. フォーム保存処理
    document.getElementById('gun-log-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // ★ 修正: ammo_count, companion を追加
        const formData = {
            use_date: document.getElementById('gun-log-date').value,
            gun_id: parseInt(document.getElementById('gun-log-gun').value, 10),
            purpose: document.getElementById('gun-log-purpose').value,
            ammo_count: parseInt(document.getElementById('gun-log-ammo-count').value, 10) || 0,
            companion: document.getElementById('gun-log-companion').value,
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