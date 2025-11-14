// このファイルは gun.js です

/**
 * 「銃」タブがクリックされたときに main.js から呼ばれるメイン関数
 */
function showGunPage() {
    // navigateTo は main.js で定義されたグローバル関数
    navigateTo('gun', renderGunMenu, '銃');
}

/**
 * 銃タブのメインメニューを描画する
 */
function renderGunMenu() {
    // 戻るボタンを非表示
    updateHeader('銃', false);

    // app は main.js で定義されたグローバル変数
    app.innerHTML = `
        <div class="space-y-4">
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">銃の管理</h2>
                <ul class="space-y-2">
                    <li>
                        <button id="manage-guns-btn" class="btn btn-secondary w-full">
                            所持銃の管理
                        </button>
                    </li>
                    <li>
                        <button id="manage-ammo-types-btn" class="btn btn-secondary w-full">
                            実包の種類の登録
                        </button>
                    </li>
                </ul>
            </div>

            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">銃の記録</h2>
                <ul class="space-y-2">
                    <li>
                        <button id="manage-gun-logs-btn" class="btn btn-secondary w-full">
                            銃使用履歴
                        </button>
                    </li>
                    <li>
                        <button id="manage-ammo-purchase-btn" class="btn btn-secondary w-full">
                            弾の購入履歴
                        </button>
                    </li>
                    <li>
                        <button id="manage-ammo-ledger-btn" class="btn btn-secondary w-full">
                            弾の出納簿 (IN/OUT)
                        </button>
                    </li>
                </ul>
            </div>
            
        </div>
    `;
    
    // --- イベントリスナーを設定 ---
    document.getElementById('manage-guns-btn').addEventListener('click', () => {
        showGunListPage();
    });

    document.getElementById('manage-ammo-types-btn').addEventListener('click', () => {
        showAmmoTypeListPage();
    });

    document.getElementById('manage-gun-logs-btn').addEventListener('click', () => {
        showGunLogListPage();
    });

    document.getElementById('manage-ammo-purchase-btn').addEventListener('click', () => {
        showAmmoPurchaseListPage();
    });

    document.getElementById('manage-ammo-ledger-btn').addEventListener('click', () => {
        showAmmoLedgerPage();
    });
}

// ===============================================
// ★ 所持銃の管理
// ===============================================
// (変更なしのため省略)
/**
 * 「所持銃の管理」リストページを表示する
 */
async function showGunListPage() {
    updateHeader('所持銃の管理', true); // 戻るボタンを表示

    app.innerHTML = `
        <div class="card mb-4">
            <button id="add-new-gun-btn" class="btn btn-primary w-full">
                新しい銃を登録する
            </button>
        </div>
        
        <div id="gun-list-container" class="space-y-3">
            <p class="text-gray-500 text-center py-4">読み込み中...</p>
        </div>
    `;

    // リストを描画
    await renderGunList();

    // 新規登録ボタンのイベント
    document.getElementById('add-new-gun-btn').addEventListener('click', () => {
        // null を渡して新規登録フォームを開く
        showGunEditForm(null);
    });
}

/**
 * 所持銃リストをDBから読み込んで描画する
 */
async function renderGunList() {
    const container = document.getElementById('gun-list-container');
    if (!container) return;

    try {
        const guns = await db.guns.orderBy('gun_name').toArray();
        
        if (guns.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">登録されている銃はありません。</p>`;
            return;
        }

        container.innerHTML = guns.map(gun => `
            <div class="trap-card" data-id="${gun.id}">
                <div>
                    <h3 class="text-lg font-semibold text-blue-600">${escapeHTML(gun.gun_name)}</h3>
                </div>
                <span>&gt;</span>
            </div>
        `).join('');

        // 描画された各カードにクリックイベントを設定
        container.querySelectorAll('.trap-card').forEach(card => {
            card.addEventListener('click', () => {
                const gunId = Number(card.dataset.id);
                showGunEditForm(gunId); // 編集フォームを開く
            });
        });

    } catch (err) {
        console.error("Failed to render gun list:", err);
        container.innerHTML = `<div class="error-box">所持銃リストの読み込みに失敗しました。</div>`;
    }
}


/**
 * 所持銃の新規登録・編集フォームを表示する
 * @param {number | null} gunId 編集する銃のID (新規の場合は null)
 */
async function showGunEditForm(gunId) {
    const isNew = (gunId === null);
    let gun = { gun_name: '' }; // デフォルト

    if (isNew) {
        updateHeader('新しい銃を登録', true);
    } else {
        updateHeader('銃の編集', true);
        try {
            gun = await db.guns.get(gunId);
            if (!gun) {
                alert('銃データが見つかりません。');
                showGunListPage();
                return;
            }
        } catch (err) {
            alert('銃データの取得に失敗しました。');
            showGunListPage();
            return;
        }
    }

    // ★ 戻るボタンの動作を上書き
    backButton.onclick = () => {
        showGunListPage();
    };

    app.innerHTML = `
        <form id="gun-form" class="card space-y-4">
            
            <div>
                <h3 class="text-lg font-semibold border-b pb-2 mb-4">基本情報</h3>
                <div class="space-y-4">
                    <div class="form-group">
                        <label for="gun_name" class="form-label">銃の名前 (必須・重複不可)</label>
                        <input type="text" id="gun_name" name="gun_name" value="${escapeHTML(gun.gun_name)}" class="form-input" required
                               placeholder="例: ベネリM2、Aボルト 30-06 など">
                    </div>
                </div>
            </div>
            
            <hr class="my-4">
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <button type="button" id="cancel-btn" class="btn btn-secondary">キャンセル</button>
                    <button type="submit" id="save-gun-btn" class="btn btn-primary">保存</button>
                </div>
                ${!isNew ? `
                    <button type="button" id="delete-gun-btn" class="btn btn-danger w-full mt-4">この銃を削除</button>
                ` : ''}
            </div>
        </form>
    `;

    // --- フォームのイベントリスナーを設定 ---
    
    // キャンセルボタン
    document.getElementById('cancel-btn').addEventListener('click', () => {
        showGunListPage();
    });

    // 保存ボタン
    document.getElementById('gun-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const saveBtn = document.getElementById('save-gun-btn');
        saveBtn.disabled = true;
        saveBtn.classList.add('btn-loading');
        saveBtn.textContent = '保存中...';

        const gunName = form.gun_name.value.trim();
        
        try {
            if (isNew) {
                await db.guns.add({ gun_name: gunName });
            } else {
                await db.guns.put({ id: gunId, gun_name: gunName });
            }
            showGunListPage(); // 保存後にリストに戻る

        } catch (err) {
            if (err.name === 'ConstraintError') {
                alert(`保存失敗: 銃の名前「${gunName}」は既に使用されています。`);
            } else {
                console.error("Failed to save gun:", err);
                alert(`保存に失敗しました: ${err.message}`);
            }
            saveBtn.disabled = false;
            saveBtn.classList.remove('btn-loading');
            saveBtn.textContent = '保存';
        }
    });

    // 削除ボタン（編集時のみ）
    if (!isNew) {
        document.getElementById('delete-gun-btn').addEventListener('click', async () => {
            if (window.confirm(`銃「${gun.gun_name}」を本当に削除しますか？\n（この銃に関連する使用履歴は削除されません）`)) {
                try {
                    await db.guns.delete(gunId);
                    alert('銃を削除しました。');
                    showGunListPage();
                } catch (err) {
                    console.error("Failed to delete gun:", err);
                    alert(`削除に失敗しました: ${err.message}`);
                }
            }
        });
    }
}

// ===============================================
// ★ 銃使用履歴 (OUT)
// ===============================================

/**
 * ★★★ 修正: 「銃使用履歴」リストページ (絞り込み・並び替えUI追加) ★★★
 */
async function showGunLogListPage() {
    updateHeader('銃使用履歴', true); 

    app.innerHTML = `
        <div class="card mb-4">
            <button id="add-new-gun-log-btn" class="btn btn-primary w-full">
                新しい使用履歴を登録する
            </button>
        </div>

        <div class="card mb-4">
            <div class="grid grid-cols-2 gap-3">
                <div class="form-group mb-0">
                    <label for="filter-gun-purpose" class="form-label">目的で絞り込み</label>
                    <select id="filter-gun-purpose" class="form-select mt-1">
                        <option value="all">すべての目的</option>
                        <option value="狩猟">狩猟</option>
                        <option value="許可捕獲">許可捕獲</option>
                        <option value="訓練">訓練</option>
                        <option value="講習">講習</option>
                    </select>
                </div>
                <div class="form-group mb-0">
                    <label for="filter-gun-id" class="form-label">銃で絞り込み</label>
                    <select id="filter-gun-id" class="form-select mt-1">
                        <option value="all">すべての銃</option>
                        </select>
                </div>
            </div>
        </div>
        
        <div class="card mb-4 grid grid-cols-2 gap-3">
            <div>
                <label for="sort-key-gunlog" class="form-label">並び替え</label>
                <select id="sort-key-gunlog" class="form-select mt-1">
                    <option value="use_date">使用日</option>
                    <option value="gun_name">銃の名前</option>
                    <option value="purpose">目的</option>
                </select>
            </div>
            <div>
                <label for="sort-order-gunlog" class="form-label">順序</label>
                <select id="sort-order-gunlog" class="form-select mt-1">
                    <option value="asc">昇順 (A→Z / 古→新)</option>
                    <option value="desc">降順 (Z→A / 新→古)</option>
                </select>
            </div>
        </div>
        
        <div id="gun-log-list-container" class="space-y-3">
            <p class="text-gray-500 text-center py-4">読み込み中...</p>
        </div>
    `;

    // ★★★ 新規: 絞り込み・並び替えのプルダウンを描画＆状態反映 ★★★
    
    // 1. 銃フィルターのプルダウンを描画
    // (renderGunOptions は「銃を選択」が先頭に入るので、'all' を手動で追加)
    await renderGunOptions('filter-gun-id', null);
    const gunFilterSelect = document.getElementById('filter-gun-id');
    gunFilterSelect.insertAdjacentHTML('afterbegin', '<option value="all">すべての銃</option>');

    // 2. 各プルダウンのDOMを取得
    const filterPurposeSelect = document.getElementById('filter-gun-purpose');
    const filterGunSelect = document.getElementById('filter-gun-id');
    const sortKeySelect = document.getElementById('sort-key-gunlog');
    const sortOrderSelect = document.getElementById('sort-order-gunlog');

    // 3. appState から現在の状態を反映
    filterPurposeSelect.value = appState.gunLogFilters.purpose;
    filterGunSelect.value = appState.gunLogFilters.gun_id;
    sortKeySelect.value = appState.gunLogSort.key;
    sortOrderSelect.value = appState.gunLogSort.order;

    // 4. イベントリスナーを設定
    filterPurposeSelect.addEventListener('change', (e) => {
        appState.gunLogFilters.purpose = e.target.value;
        renderGunLogList();
    });
    filterGunSelect.addEventListener('change', (e) => {
        appState.gunLogFilters.gun_id = e.target.value;
        renderGunLogList();
    });
    sortKeySelect.addEventListener('change', (e) => {
        appState.gunLogSort.key = e.target.value;
        renderGunLogList();
    });
    sortOrderSelect.addEventListener('change', (e) => {
        appState.gunLogSort.order = e.target.value;
        renderGunLogList();
    });
    
    // ★★★ 修正ここまで ★★★

    // リストを描画
    await renderGunLogList();

    // 新規登録ボタンのイベント
    document.getElementById('add-new-gun-log-btn').addEventListener('click', () => {
        showGunLogEditForm(null);
    });
}

/**
 * ★★★ 修正: 銃使用履歴リスト (絞り込み・並び替えロジック追加) ★★★
 */
async function renderGunLogList() {
    const container = document.getElementById('gun-log-list-container');
    if (!container) return;

    try {
        // 1. 銃のマスタデータを先に取得 (IDと名前を対応させるため)
        const guns = await db.guns.toArray();
        const gunIdToNameMap = new Map(guns.map(gun => [gun.id, gun.gun_name]));

        // 2. 絞り込みと並び替えの状態を取得
        const { key, order } = appState.gunLogSort;
        const { purpose, gun_id } = appState.gunLogFilters;

        // 3. Dexieクエリを作成 (JS .filter() を使う)
        let query = db.gun_logs.toCollection(); // .toCollection() で全件取得

        // 4. 絞り込み (filter)
        if (purpose !== 'all') {
            query = query.filter(log => log.purpose === purpose);
        }
        if (gun_id !== 'all') {
            query = query.filter(log => log.gun_id === Number(gun_id));
        }

        // 5. データを配列として取得
        let logs = await query.toArray();
        
        // 6. JavaScript側で並び替え (名前ソートに対応するため)
        
        // 6a. ソート用の名前を全ログに付与
        logs.forEach(log => {
            log.gunName = gunIdToNameMap.get(log.gun_id) || '不明な銃';
        });
        
        // 6b. ソートキーを決定 (keyが 'gun_name' なら 'gunName' を使う)
        const sortKey = (key === 'gun_name') ? 'gunName' : key;
        
        // 6c. JSの .sort() を実行
        logs.sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];

            let comparison = 0;
            if (valA > valB) {
                comparison = 1;
            } else if (valA < valB) {
                comparison = -1;
            }
            // 昇順(asc)ならそのまま、降順(desc)なら反転
            return (order === 'asc') ? comparison : -comparison;
        });

        // 7. 結果を描画
        if (logs.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">該当する使用履歴はありません。</p>`;
            return;
        }

        container.innerHTML = logs.map(log => {
            // (gunName はソート時に付与済み)
            const gunName = log.gunName; 
            const location = log.location || '場所未設定';
            const purposeText = log.purpose || '目的未設定';

            return `
                <div class="trap-card" data-id="${log.id}">
                    <div class="flex-grow min-w-0">
                        <h3 class="text-lg font-semibold text-blue-600 truncate">${formatDate(log.use_date)}</h3>
                        <p class="text-sm text-gray-700 truncate">${escapeHTML(gunName)}</p>
                        <p class="text-sm text-gray-500 truncate">
                            ${escapeHTML(purposeText)} / ${escapeHTML(location)}
                        </p>
                    </div>
                    <span>&gt;</span>
                </div>
            `;
        }).join('');

        // 描画された各カードにクリックイベントを設定
        container.querySelectorAll('.trap-card').forEach(card => {
            card.addEventListener('click', () => {
                const logId = Number(card.dataset.id);
                showGunLogEditForm(logId); // 編集フォームを開く
            });
        });

    } catch (err) {
        console.error("Failed to render gun log list:", err);
        container.innerHTML = `<div class="error-box">使用履歴リストの読み込みに失敗しました。</div>`;
    }
}


/**
 * 銃使用履歴の新規登録・編集フォームを表示する
 * @param {number | null} logId 編集する履歴のID (新規の場合は null)
 */
async function showGunLogEditForm(logId) {
    const isNew = (logId === null);
    let log = {}; 

    // デフォルト値
    log = {
        gun_id: null,
        use_date: new Date().toISOString().split('T')[0], // 本日の日付
        purpose: '狩猟',
        location: '',
        companion: '',
        ammo_data: [] // { type: '弾種', count: 10 }
    };

    if (isNew) {
        updateHeader('新規の使用履歴', true);
    } else {
        updateHeader('履歴の編集', true);
        try {
            const loadedLog = await db.gun_logs.get(logId);
            if (!loadedLog) {
                alert('履歴データが見つかりません。');
                showGunLogListPage();
                return;
            }
            log = loadedLog; // DBからのデータで上書き
            if (!log.ammo_data) log.ammo_data = []; 
        } catch (err) {
            alert('履歴データの取得に失敗しました。');
            showGunLogListPage();
            return;
        }
    }

    // ★ 戻るボタンの動作を上書き
    backButton.onclick = () => {
        showGunLogListPage();
    };

    app.innerHTML = `
        <form id="gun-log-form" class="card space-y-4">
            
            <div>
                <h3 class="text-lg font-semibold border-b pb-2 mb-4">基本情報</h3>
                <div class="space-y-4">
                    
                    <div class="form-group">
                        <label for="gun_id" class="form-label">使用した銃</label>
                        <select id="gun_id" name="gun_id" class="form-select" required>
                            <option value="">銃を選択してください</option>
                            </select>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="form-group">
                            <label for="use_date" class="form-label">使用日</label>
                            <input type="date" id="use_date" name="use_date" value="${escapeHTML(log.use_date || '')}" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label for="purpose" class="form-label">使用目的</label>
                            <select id="purpose" name="purpose" class="form-select">
                                <option value="狩猟" ${log.purpose === '狩猟' ? 'selected' : ''}>狩猟</option>
                                <option value="許可捕獲" ${log.purpose === '許可捕獲' ? 'selected' : ''}>許可捕獲</option>
                                <option value="訓練" ${log.purpose === '訓練' ? 'selected' : ''}>訓練</option>
                                <option value="講習" ${log.purpose === '講習' ? 'selected' : ''}>講習</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="location" class="form-label">使用場所</label>
                        <input type="text" id="location" name="location" value="${escapeHTML(log.location || '')}" class="form-input" placeholder="例: 岐阜市 太郎丸">
                    </div>

                    <div class="form-group">
                        <label for="companion" class="form-label">同行者</label>
                        <input type="text" id="companion" name="companion" value="${escapeHTML(log.companion || '')}" class="form-input" placeholder="例: 単独、○○ 太郎">
                    </div>

                </div>
            </div>

            <hr class="my-4">
            <div>
                <h3 class="text-lg font-semibold border-b pb-2 mb-4">使用弾数</h3>
                <datalist id="ammo-type-suggestions"></datalist>
                
                <div id="ammo-list-container" class="space-y-2 mb-3">
                    </div>
                <button type="button" id="add-ammo-row-btn" class="btn btn-secondary w-full">＋ 弾種を追加</button>
            </div>

            ${!isNew && (log.purpose === '狩猟' || log.purpose === '許可捕獲') ? `
            <hr class="my-4">
            <div>
                <h3 class="text-lg font-semibold border-b pb-2 mb-4">捕獲記録</h3>
                <button type="button" id="show-catch-log-btn" class="btn btn-secondary w-full">
                    🐾 この使用履歴の捕獲記録を表示/登録
                </button>
            </div>
            ` : ''}
            
            <hr class="my-4">
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <button type="button" id="cancel-btn" class="btn btn-secondary">キャンセル</button>
                    <button type="submit" id="save-gun-log-btn" class="btn btn-primary">保存</button>
                </div>
                ${!isNew ? `
                    <button type="button" id="delete-gun-log-btn" class="btn btn-danger w-full mt-4">この履歴を削除</button>
                ` : ''}
            </div>
        </form>
    `;

    // --- フォームのイベントリスナーを設定 ---

    // 1. 所持銃プルダウンを描画
    await renderGunOptions('gun_id', log.gun_id);

    // ★ 弾種候補の datalist を描画
    await renderAmmoTypeDatalist('ammo-type-suggestions');

    // 2. 使用弾数リストを描画・管理
    const ammoContainer = document.getElementById('ammo-list-container');
    
    // 弾リストを描画する内部関数
    function renderAmmoList() {
        if (log.ammo_data.length === 0) {
            ammoContainer.innerHTML = `<p class="text-gray-500 text-sm">弾種を追加してください</p>`;
        } else {
            ammoContainer.innerHTML = log.ammo_data.map((ammo, index) => `
                <div class="flex items-center space-x-2" data-index="${index}">
                    <input type="text" value="${escapeHTML(ammo.type)}" class="form-input ammo-type-input" placeholder="弾種 (例: 12番 スラッグ)" list="ammo-type-suggestions">
                    <input type="number" value="${escapeHTML(ammo.count)}" class="form-input ammo-count-input w-20" placeholder="発数" min="0">
                    <button type="button" class="btn-remove-ammo text-red-500 font-bold p-1">×</button>
                </div>
            `).join('');
        }
        
        // 削除ボタンのリスナー
        ammoContainer.querySelectorAll('.btn-remove-ammo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = Number(e.target.closest('[data-index]').dataset.index);
                log.ammo_data.splice(index, 1); // 配列から削除
                renderAmmoList(); // 再描画
            });
        });
        
        // 入力が変更されたら log.ammo_data を更新
        ammoContainer.querySelectorAll('.ammo-type-input, .ammo-count-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = Number(e.target.closest('[data-index]').dataset.index);
                const isType = e.target.classList.contains('ammo-type-input');
                if (isType) {
                    log.ammo_data[index].type = e.target.value;
                } else {
                    log.ammo_data[index].count = Math.max(0, Number(e.target.value) || 0);
                }
            });
        });
    }

    // 弾種追加ボタンのリスナー
    document.getElementById('add-ammo-row-btn').addEventListener('click', () => {
        log.ammo_data.push({ type: '', count: 0 });
        renderAmmoList(); // 再描画
    });

    renderAmmoList(); // 初期描画

    // 3. キャンセルボタン
    document.getElementById('cancel-btn').addEventListener('click', () => {
        showGunLogListPage();
    });

    // 4. 保存ボタン
    document.getElementById('gun-log-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const saveBtn = document.getElementById('save-gun-log-btn');
        saveBtn.disabled = true;
        saveBtn.classList.add('btn-loading');
        saveBtn.textContent = '保存中...';

        const formData = new FormData(form);
        
        const data = {
            gun_id: Number(formData.get('gun_id')),
            use_date: formData.get('use_date'),
            purpose: formData.get('purpose'),
            location: formData.get('location'),
            companion: formData.get('companion'),
            ammo_data: log.ammo_data.filter(ammo => ammo.type && ammo.count > 0)
        };

        try {
            if (isNew) {
                await db.gun_logs.add(data);
            } else {
                data.id = logId; // 忘れずにIDをセット
                await db.gun_logs.put(data);
            }
            showGunLogListPage(); // 保存後にリストに戻る

        } catch (err) {
            console.error("Failed to save gun log:", err);
            alert(`保存に失敗しました: ${err.message}`);
            saveBtn.disabled = false;
            saveBtn.classList.remove('btn-loading');
            saveBtn.textContent = '保存';
        }
    });

    // 5. 削除ボタン（編集時のみ）
    if (!isNew) {
        document.getElementById('delete-gun-log-btn').addEventListener('click', async () => {
            if (window.confirm(`この使用履歴を本当に削除しますか？`)) {
                try {
                    await db.gun_logs.delete(logId);
                    alert('履歴を削除しました。');
                    showGunLogListPage();
                } catch (err) {
                    console.error("Failed to delete gun log:", err);
                    alert(`削除に失敗しました: ${err.message}`);
                }
            }
        });

        const catchBtn = document.getElementById('show-catch-log-btn');
        if (catchBtn) {
            catchBtn.addEventListener('click', () => {
                // catch.js の showCatchListPage 関数を呼び出す
                showCatchListPage('gun', logId);
            });
        }
    }
}


/**
 * 所持銃の <option> タグをDBから描画するヘルパー関数
 * (変更なし)
 */
async function renderGunOptions(selectId, selectedId) {
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;

    try {
        const guns = await db.guns.orderBy('gun_name').toArray();
        
        let optionsHtml = '';
        if (guns.length > 0) {
            optionsHtml = guns.map(gun => `
                <option value="${gun.id}">
                    ${escapeHTML(gun.gun_name)}
                </option>
            `).join('');
            // ★★★ 修正: 「すべての銃」ではなく、「銃を選択」をデフォルトに
            optionsHtml = `<option value="">銃を選択してください</option>` + optionsHtml;
        } else {
            optionsHtml = `<option value="">銃が登録されていません</option>`;
        }

        selectEl.innerHTML = optionsHtml;

        if (selectedId) {
            selectEl.value = selectedId;
        }

    } catch (err) {
        console.error("Failed to render gun options:", err);
        selectEl.innerHTML = `<option value="">DB読込エラー</option>`;
    }
}


// ===============================================
// ★ 弾の購入履歴 (IN)
// ===============================================
// (変更なしのため省略)
/**
 * 「弾の購入履歴」リストページを表示する
 */
async function showAmmoPurchaseListPage() {
    updateHeader('弾の購入履歴', true); 

    app.innerHTML = `
        <div class="card mb-4">
            <button id="add-new-ammo-purchase-btn" class="btn btn-primary w-full">
                新しい購入履歴を登録する
            </button>
        </div>
        
        <div id="ammo-purchase-list-container" class="space-y-3">
            <p class="text-gray-500 text-center py-4">読み込み中...</p>
        </div>
    `;

    // リストを描画
    await renderAmmoPurchaseList();

    // 新規登録ボタンのイベント
    document.getElementById('add-new-ammo-purchase-btn').addEventListener('click', () => {
        showAmmoPurchaseEditForm(null);
    });
}

/**
 * 弾の購入履歴リストをDBから読み込んで描画する
 */
async function renderAmmoPurchaseList() {
    const container = document.getElementById('ammo-purchase-list-container');
    if (!container) return;

    try {
        const logs = await db.ammo_purchases.orderBy('purchase_date').reverse().toArray();
        
        if (logs.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">登録されている購入履歴はありません。</p>`;
            return;
        }

        container.innerHTML = logs.map(log => {
            const ammoType = log.ammo_type || '弾種不明';
            const count = log.purchase_count || 0;

            return `
                <div class="trap-card" data-id="${log.id}">
                    <div class="flex-grow min-w-0">
                        <h3 class="text-lg font-semibold text-blue-600 truncate">${formatDate(log.purchase_date)}</h3>
                        <p class="text-sm text-gray-700 truncate">${escapeHTML(ammoType)}</p>
                    </div>
                    <span class="text-lg font-bold text-gray-900">${count} 発</span>
                </div>
            `;
        }).join('');

        // 描画された各カードにクリックイベントを設定
        container.querySelectorAll('.trap-card').forEach(card => {
            card.addEventListener('click', () => {
                const logId = Number(card.dataset.id);
                showAmmoPurchaseEditForm(logId); // 編集フォームを開く
            });
        });

    } catch (err) {
        console.error("Failed to render ammo purchase list:", err);
        container.innerHTML = `<div class="error-box">購入履歴リストの読み込みに失敗しました。</div>`;
    }
}

/**
 * 弾の購入履歴の新規登録・編集フォームを表示する
 * @param {number | null} logId 編集する履歴のID (新規の場合は null)
 */
async function showAmmoPurchaseEditForm(logId) {
    const isNew = (logId === null);
    let log = {}; 

    // デフォルト値
    log = {
        purchase_date: new Date().toISOString().split('T')[0], // 本日の日付
        ammo_type: '',
        purchase_count: 0
    };

    if (isNew) {
        updateHeader('新規の購入履歴', true);
    } else {
        updateHeader('購入履歴の編集', true);
        try {
            const loadedLog = await db.ammo_purchases.get(logId);
            if (!loadedLog) {
                alert('履歴データが見つかりません。');
                showAmmoPurchaseListPage();
                return;
            }
            log = loadedLog; // DBからのデータで上書き
        } catch (err) {
            alert('履歴データの取得に失敗しました。');
            showAmmoPurchaseListPage();
            return;
        }
    }

    // ★ 戻るボタンの動作を上書き
    backButton.onclick = () => {
        showAmmoPurchaseListPage();
    };

    app.innerHTML = `
        <form id="ammo-purchase-form" class="card space-y-4">
            
            <div>
                <h3 class="text-lg font-semibold border-b pb-2 mb-4">購入情報</h3>
                <div class="space-y-4">
                    
                    <div class="form-group">
                        <label for="purchase_date" class="form-label">購入日</label>
                        <input type="date" id="purchase_date" name="purchase_date" value="${escapeHTML(log.purchase_date || '')}" class="form-input" required>
                    </div>

                    <div class="form-group">
                        <label for="ammo_type" class="form-label">弾種</label>
                        <input type="text" id="ammo_type" name="ammo_type" value="${escapeHTML(log.ammo_type || '')}" class="form-input" placeholder="例: 12番 スラッグ" required list="ammo-type-suggestions">
                        <datalist id="ammo-type-suggestions"></datalist>
                    </div>

                    <div class="form-group">
                        <label for="purchase_count" class="form-label">購入数</label>
                        <input type="number" id="purchase_count" name="purchase_count" value="${escapeHTML(log.purchase_count || 0)}" class="form-input" min="0" required>
                    </div>
                </div>
            </div>
            
            <hr class="my-4">
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <button type="button" id="cancel-btn" class="btn btn-secondary">キャンセル</button>
                    <button type="submit" id="save-btn" class="btn btn-primary">保存</button>
                </div>
                ${!isNew ? `
                    <button type="button" id="delete-btn" class="btn btn-danger w-full mt-4">この履歴を削除</button>
                ` : ''}
            </div>
        </form>
    `;

    // --- フォームのイベントリスナーを設定 ---

    // ★ 弾種候補の datalist を描画
    await renderAmmoTypeDatalist('ammo-type-suggestions');

    // 1. キャンセルボタン
    document.getElementById('cancel-btn').addEventListener('click', () => {
        showAmmoPurchaseListPage();
    });

    // 2. 保存ボタン
    document.getElementById('ammo-purchase-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const saveBtn = document.getElementById('save-btn');
        saveBtn.disabled = true;
        saveBtn.classList.add('btn-loading');
        saveBtn.textContent = '保存中...';

        const formData = new FormData(form);
        
        // データを整形
        const data = {
            purchase_date: formData.get('purchase_date'),
            ammo_type: formData.get('ammo_type').trim(),
            purchase_count: Math.max(0, Number(formData.get('purchase_count')) || 0)
        };

        try {
            if (isNew) {
                await db.ammo_purchases.add(data);
            } else {
                data.id = logId; // 忘れずにIDをセット
                await db.ammo_purchases.put(data);
            }
            showAmmoPurchaseListPage(); // 保存後にリストに戻る

        } catch (err) {
            console.error("Failed to save ammo purchase:", err);
            alert(`保存に失敗しました: ${err.message}`);
            saveBtn.disabled = false;
            saveBtn.classList.remove('btn-loading');
            saveBtn.textContent = '保存';
        }
    });

    // 3. 削除ボタン（編集時のみ）
    if (!isNew) {
        document.getElementById('delete-btn').addEventListener('click', async () => {
            if (window.confirm(`この購入履歴を本当に削除しますか？`)) {
                try {
                    await db.ammo_purchases.delete(logId);
                    alert('履歴を削除しました。');
                    showAmmoPurchaseListPage();
                } catch (err) {
                    console.error("Failed to delete ammo purchase:", err);
                    alert(`削除に失敗しました: ${err.message}`);
                }
            }
        });
    }
}


// ===============================================
// ★ 弾の出納簿 (IN/OUT)
// ===============================================
// (変更なし)
/**
 * 「弾の出納簿」ページを表示する
 * (購入(IN)と使用(OUT)を弾種ごとに集計し、差引残高を表示する)
 */
async function showAmmoLedgerPage() {
    updateHeader('弾の出納簿', true); // 戻るボタンを表示

    app.innerHTML = `
        <div class="card">
            <h2 class="text-lg font-semibold border-b pb-2 mb-4">弾種ごとの出納サマリー</h2>
            <div id="ammo-ledger-container">
                <p class="text-gray-500 text-center py-4">集計中...</p>
            </div>
        </div>
    `;

    const container = document.getElementById('ammo-ledger-container');
    
    try {
        // 集計用のMap ( { "12番スラッグ": { in: 100, out: 50 }, ... } )
        const ledger = new Map();
        
        // 1. 購入履歴 (IN) を集計
        const purchases = await db.ammo_purchases.toArray();
        for (const log of purchases) {
            const ammoType = log.ammo_type.trim();
            const count = Number(log.purchase_count) || 0;
            
            if (ammoType && count > 0) {
                const current = ledger.get(ammoType) || { in: 0, out: 0 };
                current.in += count;
                ledger.set(ammoType, current);
            }
        }

        // 2. 使用履歴 (OUT) を集計
        const uses = await db.gun_logs.toArray();
        for (const log of uses) {
            if (log.ammo_data && Array.isArray(log.ammo_data)) {
                for (const ammo of log.ammo_data) {
                    const ammoType = ammo.type.trim();
                    const count = Number(ammo.count) || 0;
                    
                    if (ammoType && count > 0) {
                        const current = ledger.get(ammoType) || { in: 0, out: 0 };
                        current.out += count;
                        ledger.set(ammoType, current);
                    }
                }
            }
        }

        // 3. 結果を描画
        if (ledger.size === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">履歴データがありません。</p>`;
            return;
        }

        // 弾種でソートして表示
        const sortedLedger = Array.from(ledger.entries()).sort((a, b) => a[0].localeCompare(b[0]));

        container.innerHTML = `
            <ul class="divide-y divide-gray-200">
                ${sortedLedger.map(([type, data]) => {
                    const balance = data.in - data.out;
                    // 残高に応じて色を決定
                    const balanceClass = balance < 0 ? 'text-red-600' : 'text-gray-900';
                    
                    return `
                    <li class="py-3">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-gray-800 font-semibold">${escapeHTML(type)}</span>
                            <span class="text-xl font-bold ${balanceClass}">${balance} 発</span>
                        </div>
                        <div class="flex justify-between items-center text-sm text-gray-500">
                            <span>購入(IN): ${data.in}</span>
                            <span>使用(OUT): ${data.out}</span>
                        </div>
                    </li>
                `}).join('')}
            </ul>
        `;

    } catch (err) {
        console.error("Failed to calculate ammo ledger:", err);
        container.innerHTML = `<div class="error-box">集計に失敗しました。</div>`;
    }
}


// ===============================================
// ★★★ 実包の種類マスタ管理 ★★★
// ===============================================
// (変更なし)
/**
 * 「実包の種類を登録」ページを表示する
 */
async function showAmmoTypeListPage() {
    updateHeader('実包の種類の登録', true); // 戻るボタンを表示
    
    // 戻るボタンの動作を上書き
    backButton.onclick = () => {
        showGunPage();
    };

    app.innerHTML = `
        <div class="card space-y-4">
            <form id="add-ammo-type-form" class="flex space-x-2">
                <div class="form-group flex-grow mb-0">
                    <label for="new_ammo_type" class="sr-only">新しい実包の種類</label>
                    <input type="text" id="new_ammo_type" class="form-input" placeholder="例: 12番 7.5号 28g" required>
                </div>
                <button type="submit" class="btn btn-primary h-fit mt-1">追加</button>
            </form>
            
            <hr>
            
            <h3 class="text-md font-semibold">登録済みの種類</h3>
            <div id="ammo-type-list" class="space-y-2">
                <p class="text-gray-500">読み込み中...</p>
            </div>
        </div>
    `;

    // 既存のリストを描画
    await renderAmmoTypeList();

    // フォームの送信イベント
    document.getElementById('add-ammo-type-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('new_ammo_type');
        const newName = input.value.trim();
        
        if (!newName) return;

        try {
            // DBに追加
            await db.ammo_types.add({ name: newName });
            input.value = ''; // フォームをクリア
            await renderAmmoTypeList(); // リストを再描画
        } catch (err) {
            if (err.name === 'ConstraintError') {
                alert(`「${newName}」は既に追加されています。`);
            } else {
                console.error("Failed to add ammo type:", err);
                alert('追加に失敗しました。');
            }
        }
    });
}

/**
 * 実包の種類リストをDBから読み込んで描画する
 */
async function renderAmmoTypeList() {
    const container = document.getElementById('ammo-type-list');
    if (!container) return;

    try {
        const types = await db.ammo_types.orderBy('name').toArray();
        
        if (types.length === 0) {
            container.innerHTML = `<p class="text-gray-500">登録されている種類はありません。</p>`;
            return;
        }

        container.innerHTML = types.map(type => `
            <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span class="text-gray-700">${escapeHTML(type.name)}</span>
                <button class="btn-delete-type text-red-500 hover:text-red-700 text-sm font-semibold" data-name="${escapeHTML(type.name)}">
                    削除
                </button>
            </div>
        `).join('');

        // 削除ボタンにイベントリスナーを設定
        container.querySelectorAll('.btn-delete-type').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const typeName = e.target.dataset.name;
                
                // TODO: 将来的に、この弾種を使用している履歴があるかチェックする
                
                if (window.confirm(`「${typeName}」を削除しますか？\n（この弾種が設定された既存の履歴は変更されません）`)) {
                    try {
                        await db.ammo_types.delete(typeName);
                        await renderAmmoTypeList(); // リストを再描画
                    } catch (err) {
                        console.error("Failed to delete ammo type:", err);
                        alert('削除に失敗しました。');
                    }
                }
            });
        });

    } catch (err) {
        console.error("Failed to render ammo type list:", err);
        container.innerHTML = `<div class="error-box">リストの読み込みに失敗しました。</div>`;
    }
}

/**
 * 弾種の <option> タグを <datalist> に描画するヘルパー関数
 * (変更なし)
 */
async function renderAmmoTypeDatalist(datalistId) {
    const datalistEl = document.getElementById(datalistId);
    if (!datalistEl) return;

    try {
        const types = await db.ammo_types.orderBy('name').toArray();
        
        datalistEl.innerHTML = types.map(type => `
            <option value="${escapeHTML(type.name)}"></option>
        `).join('');

    } catch (err) {
        console.error("Failed to render ammo type datalist:", err);
        // ここでのエラーは致命的ではないので、アラートは出さない
    }
}