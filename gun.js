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
                </ul>
            </div>

            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">記録</h2>
                <ul class="space-y-2">
                    <li>
                        <button id="manage-gun-logs-btn" class="btn btn-secondary w-full">
                            銃使用履歴
                        </button>
                    </li>
                    <li>
                        <button id="manage-ammo-btn" class="btn btn-secondary w-full" disabled>
                            弾の出納簿 (未実装)
                        </button>
                    </li>
                </ul>
            </div>
            
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">その他</h2>
                <ul class="space-y-2">
                    <li>
                        <button id="manage-checklist-btn" class="btn btn-secondary w-full" disabled>
                            所持品チェックリスト (未実装)
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

    // ★ 修正: イベントリスナーを追加
    document.getElementById('manage-gun-logs-btn').addEventListener('click', () => {
        showGunLogListPage();
    });
}

// ===============================================
// ★ 所持銃の管理 (前回実装)
// ===============================================

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
// ★★★ 新規 (2/2): 銃使用履歴
// ===============================================

/**
 * 「銃使用履歴」リストページを表示する
 */
async function showGunLogListPage() {
    updateHeader('銃使用履歴', true); // 戻るボタンを表示 (main.jsのデフォルト動作でOK)

    app.innerHTML = `
        <div class="card mb-4">
            <button id="add-new-gun-log-btn" class="btn btn-primary w-full">
                新しい使用履歴を登録する
            </button>
        </div>
        
        <div id="gun-log-list-container" class="space-y-3">
            <p class="text-gray-500 text-center py-4">読み込み中...</p>
        </div>
    `;

    // リストを描画
    await renderGunLogList();

    // 新規登録ボタンのイベント
    document.getElementById('add-new-gun-log-btn').addEventListener('click', () => {
        // null を渡して新規登録フォームを開く
        showGunLogEditForm(null);
    });
}

/**
 * 銃使用履歴リストをDBから読み込んで描画する
 */
async function renderGunLogList() {
    const container = document.getElementById('gun-log-list-container');
    if (!container) return;

    try {
        // 1. 銃のマスタデータを先に取得 (IDと名前を対応させるため)
        const guns = await db.guns.toArray();
        const gunIdToNameMap = new Map(guns.map(gun => [gun.id, gun.gun_name]));

        // 2. 銃使用履歴を日付の新しい順に取得
        const logs = await db.gun_logs.orderBy('use_date').reverse().toArray();
        
        if (logs.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">登録されている使用履歴はありません。</p>`;
            return;
        }

        container.innerHTML = logs.map(log => {
            // 銃IDを名前に変換 (見つからない場合は '不明な銃' )
            const gunName = gunIdToNameMap.get(log.gun_id) || '不明な銃';
            const location = log.location || '場所未設定';
            const purpose = log.purpose || '目的未設定';

            return `
                <div class="trap-card" data-id="${log.id}">
                    <div class="flex-grow min-w-0">
                        <h3 class="text-lg font-semibold text-blue-600 truncate">${formatDate(log.use_date)}</h3>
                        <p class="text-sm text-gray-700 truncate">${escapeHTML(gunName)}</p>
                        <p class="text-sm text-gray-500 truncate">
                            ${escapeHTML(purpose)} / ${escapeHTML(location)}
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
            // DBにammo_dataがなければ空配列をセット
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
                <div id="ammo-list-container" class="space-y-2 mb-3">
                    </div>
                <button type="button" id="add-ammo-row-btn" class="btn btn-secondary w-full">＋ 弾種を追加</button>
            </div>
            
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
    // (trap.js の renderTrapTypeOptions を参考に)
    await renderGunOptions('gun_id', log.gun_id);

    // 2. 使用弾数リストを描画・管理
    const ammoContainer = document.getElementById('ammo-list-container');
    
    // 弾リストを描画する内部関数
    function renderAmmoList() {
        if (log.ammo_data.length === 0) {
            ammoContainer.innerHTML = `<p class="text-gray-500 text-sm">弾種を追加してください</p>`;
        } else {
            ammoContainer.innerHTML = log.ammo_data.map((ammo, index) => `
                <div class="flex items-center space-x-2" data-index="${index}">
                    <input type="text" value="${escapeHTML(ammo.type)}" class="form-input ammo-type-input" placeholder="弾種 (例: 12番 スラッグ)">
                    <input type="number" value="${escapeHTML(ammo.count)}" class="form-input ammo-count-input w-20" placeholder="発数">
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
                    log.ammo_data[index].count = Number(e.target.value) || 0;
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
        
        // データを整形
        const data = {
            gun_id: Number(formData.get('gun_id')),
            use_date: formData.get('use_date'),
            purpose: formData.get('purpose'),
            location: formData.get('location'),
            companion: formData.get('companion'),
            // 弾データはフォーム送信ではなく、 'log.ammo_data' (JS変数) から直接取得
            // (空の行をフィルタリング)
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
    }
}


/**
 * ★★★ 新規 (2/2) ★★★
 * 所持銃の <option> タグをDBから描画するヘルパー関数
 * @param {string} selectId - <select> タグのID
 * @param {number} selectedId - 現在選択されている銃のID
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
            // 先頭に「選択してください」を追加
            optionsHtml = `<option value="">銃を選択してください</option>` + optionsHtml;
        } else {
            optionsHtml = `<option value="">銃が登録されていません</option>`;
        }

        selectEl.innerHTML = optionsHtml;

        // 現在の値（編集中のデータ）を設定
        if (selectedId) {
            selectEl.value = selectedId;
        }

    } catch (err) {
        console.error("Failed to render gun options:", err);
        selectEl.innerHTML = `<option value="">DB読込エラー</option>`;
    }
}