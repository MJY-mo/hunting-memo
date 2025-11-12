// このファイルは trap.js です

// ★ 定数定義
const MAX_OPEN_TRAPS = 30; // 開いている罠の上限

/**
 * ★★★ 新規 (3/3): 「罠」タブのメインメニュー ★★★
 * (main.js の navigateTo('trap', ...) から呼ばれる)
 */
function showTrapPage() {
    // navigateTo は main.js で定義されたグローバル関数
    // (引数が navigateTo と同じだが、これは罠タブのメインメニュー用)
    navigateTo('trap', renderTrapMenu, '罠');
}

/**
 * ★★★ 新規 (3/3): 罠タブのメインメニューを描画する
 */
function renderTrapMenu() {
    // 戻るボタンを非表示
    updateHeader('罠', false);

    // app は main.js で定義されたグローバル変数
    app.innerHTML = `
        <div class="space-y-4">
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">罠の記録</h2>
                <ul class="space-y-2">
                    <li>
                        <button id="show-trap-status-btn" class="btn btn-secondary w-full">
                            罠の架設状態管理
                        </button>
                    </li>
                </ul>
            </div>
            
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">設定</h2>
                <ul class="space-y-2">
                    <li>
                        <button id="manage-trap-types-btn" class="btn btn-secondary w-full">
                            罠の種類の管理
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    `;
    
    // --- イベントリスナーを設定 ---
    document.getElementById('show-trap-status-btn').addEventListener('click', () => {
        // 架設状態管理（設置中リスト）へ
        appState.trapView = 'open'; // 常に「設置中」から開く
        showTrapStatusPage();
    });
    
    document.getElementById('manage-trap-types-btn').addEventListener('click', () => {
        showManageTrapTypesPage();
    });
}


/**
 * ★★★ 修正 (3/3): `showTrapPage` から `showTrapStatusPage` にリネーム ★★★
 * 「罠の架設状態管理」のメイン関数 (デフォルト = 開いている罠)
 */
async function showTrapStatusPage() {
    // main.js のグローバル状態を更新
    appState.trapView = 'open';
    // ヘッダーを「罠 (設置中)」に設定
    // ★ 修正: 戻るボタンを表示 (罠メインメニューに戻る)
    updateHeader('罠 (設置中)', true); 
    
    // 絞り込み条件の初期化
    if (!appState.trapFilters) {
        appState.trapFilters = { type: 'all' };
    }

    // メインコンテンツ（app）を描画
    app.innerHTML = `
        <div class="card mb-4">
            <div>
                <label for="filter-type" class="form-label">種類で絞り込み</label>
                <select id="filter-type" class="form-select mt-1">
                    <option value="all">すべての種類</option>
                    </select>
            </div>
        </div>

        <div id="trap-list-container" class="space-y-3">
            <p class="text-gray-500 text-center py-4">罠データを読み込み中...</p>
        </div>

        <button id="add-trap-btn" title="新しい罠を登録"
            class="fixed bottom-36 right-5 z-10 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-3xl hover:bg-blue-700">
            +
        </button>
        
        <button id="show-closed-btn" title="罠設置履歴を見る"
            class="fixed bottom-20 right-5 z-10 w-14 h-14 bg-gray-500 text-white rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-gray-600">
            履歴
        </button>
    `;
    
    // 罠の種類のプルダウンを描画
    await renderTrapTypeOptions('filter-type', appState.trapFilters.type, true);
    
    // --- イベントリスナーを設定 ---
    
    // ＋ボタン（新規追加）
    document.getElementById('add-trap-btn').addEventListener('click', async () => {
        try {
            const openTrapsCount = await db.traps
                .filter(trap => trap.close_date === null || trap.close_date === '')
                .count();
            
            if (openTrapsCount >= MAX_OPEN_TRAPS) {
                alert(`開いている罠が上限（${MAX_OPEN_TRAPS}個）に達しています。新しい罠を登録するには、既存の罠を「閉め日」に設定（回収済みに）してください。`);
            } else {
                showTrapEditForm(null); 
            }
        } catch (err) {
            console.error("Failed to count open traps:", err);
            alert("エラーが発生しました。");
        }
    });

    // 履歴ボタン
    document.getElementById('show-closed-btn').addEventListener('click', () => {
        showClosedTrapPage(); // 過去の罠ページを表示
    });

    // 種類絞り込み
    document.getElementById('filter-type').addEventListener('change', (e) => {
        appState.trapFilters.type = e.target.value;
        renderTrapList(); // 絞り込みして再描画
    });

    // 罠一覧を描画
    await renderTrapList();
}

/**
 * ★ 新規: 過去の罠（閉じている罠）のページ
 */
async function showClosedTrapPage() {
    // main.js のグローバル状態を更新
    appState.trapView = 'closed';
    // ★ 修正: 戻るボタンを表示
    updateHeader('罠設置履歴', true);

    // 絞り込み条件の初期化
    if (!appState.trapFilters) {
        appState.trapFilters = { type: 'all' };
    }

    // メインコンテンツ（app）を描画
    app.innerHTML = `
        <div class="card mb-4">
            <div>
                <label for="filter-type" class="form-label">種類で絞り込み</label>
                <select id="filter-type" class="form-select mt-1">
                    <option value="all">すべての種類</option>
                    </select>
            </div>
        </div>

        <div id="trap-list-container" class="space-y-3">
            <p class="text-gray-500 text-center py-4">過去の罠データを読み込み中...</p>
        </div>
        
        <button id="show-open-btn" title="開いている罠を見る"
            class="fixed bottom-20 right-5 z-10 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-sm font-semibold hover:bg-blue-700">
            設置中
        </button>
    `;
    
    // 罠の種類のプルダウンを描画
    await renderTrapTypeOptions('filter-type', appState.trapFilters.type, true);

    // --- イベントリスナーを設定 ---
    
    // 設置中ボタン
    document.getElementById('show-open-btn').addEventListener('click', () => {
        // ★★★ 修正 (3/3): showTrapPage -> showTrapStatusPage ★★★
        showTrapStatusPage(); // 開いている罠ページを表示
    });

    // 種類絞り込み
    document.getElementById('filter-type').addEventListener('change', (e) => {
        appState.trapFilters.type = e.target.value;
        renderClosedTrapList(); // 絞り込みして再描画
    });

    // 過去の罠一覧を描画
    await renderClosedTrapList();
}


/**
 * 罠の種類の <option> タグをDBから描画するヘルパー関数
 * (変更なし)
 */
async function renderTrapTypeOptions(selectId, selectedValue, includeAll = false) {
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;

    try {
        const types = await db.trap_types.orderBy('name').toArray();
        
        let optionsHtml = '';
        if (includeAll) {
            optionsHtml += `<option value="all">すべての種類</option>`;
        }

        optionsHtml += types.map(type => `
            <option value="${escapeHTML(type.name)}">
                ${escapeHTML(type.name)}
            </option>
        `).join('');
        
        if (includeAll) {
            selectEl.innerHTML = optionsHtml;
        } else {
            selectEl.innerHTML = optionsHtml;
        }

        // 現在の値を設定
        selectEl.value = selectedValue;

    } catch (err) {
        console.error("Failed to render trap type options:", err);
        selectEl.innerHTML = `<option value="">DB読込エラー</option>`;
    }
}


/**
 * 罠一覧（開いている罠）をDBから描画する関数
 * (変更なし)
 */
async function renderTrapList() {
    const container = document.getElementById('trap-list-container');
    if (!container) return; 

    try {
        // .filter() を使った安全な絞り込み
        let query = db.traps.filter(trap => 
            trap.close_date === null || trap.close_date === ''
        );

        const { type } = appState.trapFilters;
        if (type !== 'all') {
            query = query.filter(trap => trap.trap_type === type);
        }
        
        let traps = await query.sortBy('trap_number');

        if (traps.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">設置中の罠はありません。</p>`;
            return;
        }

        // 罠カードのHTMLを生成
        container.innerHTML = traps.map(trap => {
            const statusClass = 'bg-green-100 text-green-700';
            const statusText = '設置中';
            const categoryText = trap.category ? trap.category : '未分類';

            return `
                <div class="trap-card" data-id="${trap.id}">
                    <div class="flex-grow min-w-0">
                        <h3 class="text-lg font-semibold text-blue-600 truncate">${escapeHTML(trap.trap_number)}</h3>
                        <p class="text-sm text-gray-500 truncate">
                            ${escapeHTML(trap.trap_type)} / ${escapeHTML(categoryText)} / 設置: ${formatDate(trap.setup_date)}
                        </p>
                    </div>
                    <span class="text-sm font-bold px-3 py-1 rounded-full ${statusClass} flex-shrink-0 ml-2">
                        ${statusText}
                    </span>
                </div>
            `;
        }).join('');

        // 描画された各カードにクリックイベントを設定
        container.querySelectorAll('.trap-card').forEach(card => {
            card.addEventListener('click', () => {
                const trapId = Number(card.dataset.id);
                showTrapEditForm(trapId); 
            });
        });

    } catch (err) {
        console.error("Failed to render trap list:", err);
        container.innerHTML = `<div class="error-box">罠一覧の読み込みに失敗しました。</div>`;
    }
}

/**
 * ★ 新規: 過去の罠一覧（閉じている罠）を描画する関数
 * (変更なし)
 */
async function renderClosedTrapList() {
    const container = document.getElementById('trap-list-container');
    if (!container) return;

    try {
        let query = db.traps.filter(trap => 
            trap.close_date !== null && trap.close_date !== ''
        );

        const { type } = appState.trapFilters;
        if (type !== 'all') {
            query = query.filter(trap => trap.trap_type === type);
        }
        
        let traps = await query.reverse().sortBy('close_date');

        if (traps.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">過去に設置した罠はありません。</p>`;
            return;
        }

        container.innerHTML = traps.map(trap => {
            const statusClass = 'bg-gray-100 text-gray-500';
            const statusText = '回収済';
            const categoryText = trap.category ? trap.category : '未分類';

            return `
                <div class="trap-card" data-id="${trap.id}">
                    <div class="flex-grow min-w-0">
                        <h3 class="text-lg font-semibold text-gray-600 truncate">${escapeHTML(trap.trap_number)}</h3>
                        <p class="text-sm text-gray-500 truncate">
                            ${escapeHTML(trap.trap_type)} / ${escapeHTML(categoryText)} / 回収: ${formatDate(trap.close_date)}
                        </p>
                    </div>
                    <span class="text-sm font-bold px-3 py-1 rounded-full ${statusClass} flex-shrink-0 ml-2">
                        ${statusText}
                    </span>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.trap-card').forEach(card => {
            card.addEventListener('click', () => {
                const trapId = Number(card.dataset.id);
                showTrapEditForm(trapId); 
            });
        });

    } catch (err) {
        console.error("Failed to render closed trap list:", err);
        container.innerHTML = `<div class="error-box">過去の罠一覧の読み込みに失敗しました。</div>`;
    }
}


/**
 * 罠の新規登録・編集フォームを表示する関数
 * @param {number | null} trapId 編集する罠のID (新規の場合は null)
 */
async function showTrapEditForm(trapId) {
    const isNew = (trapId === null);
    let trap = {}; 
    let defaultTrapType = 'くくり罠'; // デフォルト値

    try {
        const firstType = await db.trap_types.orderBy('name').first();
        if (firstType) {
            defaultTrapType = firstType.name;
        }
    } catch (e) {
        console.error("Failed to get default trap type", e);
    }

    if (isNew) {
        trap = {
            trap_number: '',
            trap_type: defaultTrapType, 
            category: '狩猟',
            setup_date: new Date().toISOString().split('T')[0], // 本日の日付
            close_date: '',
            latitude: '',
            longitude: '',
            additional_data: {
                bait: '',
                location_memo: ''
            }
        };
        updateHeader('新規の罠', true);
    } else {
        try {
            trap = await db.traps.get(trapId);
            if (!trap) {
                alert('罠データが見つかりません。');
                // ★★★ 修正 (3/3): showTrapPage -> showTrapStatusPage ★★★
                (appState.trapView === 'open') ? showTrapStatusPage() : showClosedTrapPage();
                return;
            }
            if (!trap.additional_data) trap.additional_data = {};
            if (!trap.category) trap.category = '狩猟'; 
            if (!trap.trap_type) trap.trap_type = defaultTrapType; 
            updateHeader(`罠の編集: ${trap.trap_number}`, true);
        } catch (err) {
            console.error("Failed to get trap data:", err);
            alert('罠データの取得に失敗しました。');
            // ★★★ 修正 (3/3): showTrapPage -> showTrapStatusPage ★★★
            (appState.trapView === 'open') ? showTrapStatusPage() : showClosedTrapPage();
            return;
        }
    }

    // ★ 修正: 戻るボタンの動作を、現在のビュー（open/closed）に合わせる
    backButton.onclick = () => {
        // ★★★ 修正 (3/3): showTrapPage -> showTrapStatusPage ★★★
        (appState.trapView === 'open') ? showTrapStatusPage() : showClosedTrapPage();
    };

    // フォームのHTMLを描画
    // (変更なし)
    app.innerHTML = `
        <form id="trap-form" class="card space-y-4">
            
            <div>
                <h3 class="text-lg font-semibold border-b pb-2 mb-4">基本情報</h3>
                <div class="space-y-4">
                    <div class="form-group">
                        <label for="trap_number" class="form-label">罠ナンバー (必須・重複不可)</label>
                        <input type="text" id="trap_number" name="trap_number" value="${escapeHTML(trap.trap_number)}" class="form-input" required>
                    </div>

                    <div class="form-group">
                        <label for="category" class="form-label">区分</label>
                        <select id="category" name="category" class="form-select">
                            <option value="狩猟" ${trap.category === '狩猟' ? 'selected' : ''}>狩猟</option>
                            <option value="有害鳥獣捕獲" ${trap.category === '有害鳥獣捕獲' ? 'selected' : ''}>有害鳥獣捕獲</option>
                            <option value="個体数調整" ${trap.category === '個体数調整' ? 'selected' : ''}>個体数調整</option>
                            <option value="学術研究" ${trap.category === '学術研究' ? 'selected' : ''}>学術研究</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="trap_type" class="form-label">種類</label>
                        <select id="trap_type" name="trap_type" class="form-select">
                            </select>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div class="form-group">
                            <label for="setup_date" class="form-label">開け日（設置日）</label>
                            <input type="date" id="setup_date" name="setup_date" value="${escapeHTML(trap.setup_date || '')}" class="form-input">
                        </div>
                        <div class="form-group">
                            <label for="close_date" class="form-label">閉め日（回収日）</label>
                            <input type="date" id="close_date" name="close_date" value="${escapeHTML(trap.close_date || '')}" class="form-input">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="bait" class="form-label">誘引（エサなど）</label>
                        <input type="text" id="bait" name="bait" value="${escapeHTML(trap.additional_data.bait || '')}" class="form-input" placeholder="米ぬか、くず野菜など">
                    </div>
                </div>
            </div>

            <hr class="my-4">
            <div>
                <h3 class="text-lg font-semibold border-b pb-2 mb-4">位置情報</h3>
                <div class="space-y-4">
                    <button type="button" id="get-location-btn" class="btn btn-secondary w-full">📍 現在地を取得</button>
                    <p id="location-status" class="text-sm text-gray-500 text-center"></p>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="form-group">
                            <label for="latitude" class="form-label">緯度</label>
                            <input type="number" step="any" id="latitude" name="latitude" value="${escapeHTML(trap.latitude || '')}" class="form-input" placeholder="35.123456">
                        </div>
                        <div class="form-group">
                            <label for="longitude" class="form-label">経度</label>
                            <input type="number" step="any" id="longitude" name="longitude" value="${escapeHTML(trap.longitude || '')}" class="form-input" placeholder="139.123456">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="location_memo" class="form-label">位置メモ</label>
                        <input type="text" id="location_memo" name="location_memo" value="${escapeHTML(trap.additional_data.location_memo || '')}" class="form-input" placeholder="沢沿いの獣道、左岸など">
                    </div>
                </div>
            </div>
            
            ${!isNew ? `
            <hr class="my-4">
            <div>
                <h3 class="text-lg font-semibold border-b pb-2 mb-4">捕獲記録</h3>
                <button type="button" id="show-catch-log-btn" class="btn btn-secondary w-full">
                    🐾 この罠の捕獲記録を表示/登録
                </button>
            </div>
            ` : ''}
            
            <hr class="my-4">
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <button type="button" id="cancel-btn" class="btn btn-secondary">キャンセル</button>
                    <button type="submit" id="save-trap-btn" class="btn btn-primary">保存</button>
                </div>
                ${!isNew ? `
                    <button type="button" id="delete-trap-btn" class="btn btn-danger w-full mt-4">この罠を削除</button>
                ` : ''}
            </div>
        </form>
    `;

    // フォームの「種類」プルダウンを描画（「すべて」は含めない）
    await renderTrapTypeOptions('trap_type', trap.trap_type, false);

    // --- フォームのイベントリスナーを設定 ---
    document.getElementById('cancel-btn').addEventListener('click', () => {
        // ★★★ 修正 (3/3): showTrapPage -> showTrapStatusPage ★★★
        (appState.trapView === 'open') ? showTrapStatusPage() : showClosedTrapPage();
    });

    // (変更なし)
    // GPS取得ボタン
    document.getElementById('get-location-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const statusEl = document.getElementById('location-status');
        btn.disabled = true;
        btn.classList.add('btn-loading');
        statusEl.textContent = 'GPS測位中...';

        try {
            const { latitude, longitude } = await getCurrentLocation(); // main.js
            document.getElementById('latitude').value = latitude.toFixed(6);
            document.getElementById('longitude').value = longitude.toFixed(6);
            statusEl.textContent = '現在地を取得しました。';
        } catch (err) {
            statusEl.textContent = `エラー: ${err.message}`;
        } finally {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
        }
    });

    // (変更なし)
    // 保存ボタン
    document.getElementById('trap-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const saveBtn = document.getElementById('save-trap-btn');
        saveBtn.disabled = true;
        saveBtn.classList.add('btn-loading');
        saveBtn.textContent = '保存中...';

        const formData = new FormData(form);
        
        const data = {
            trap_number: formData.get('trap_number'),
            trap_type: formData.get('trap_type'), 
            category: formData.get('category'),
            setup_date: formData.get('setup_date'),
            close_date: formData.get('close_date') === '' ? null : formData.get('close_date'),
            latitude: formData.get('latitude') === '' ? null : Number(formData.get('latitude')),
            longitude: formData.get('longitude') === '' ? null : Number(formData.get('longitude')),
            additional_data: {
                bait: formData.get('bait'),
                location_memo: formData.get('location_memo')
            }
        };

        try {
            if (isNew) {
                const openTrapsCount = await db.traps
                    .filter(trap => trap.close_date === null || trap.close_date === '')
                    .count();
                
                if (openTrapsCount >= MAX_OPEN_TRAPS && (data.close_date === null || data.close_date === '')) {
                     alert(`開いている罠が上限（${MAX_OPEN_TRAPS}個）に達しています。`);
                     throw new Error("Trap limit reached"); // 保存を中止
                }
                
                await db.traps.add(data);
            } else {
                data.id = trapId; // 忘れずにIDをセット
                await db.traps.put(data);
            }
            
            // ★ 修正: 戻る場所を判断 (保存した罠の状態に応じて)
            const isClosed = (data.close_date !== null && data.close_date !== '');
            if (isClosed) {
                showClosedTrapPage();
            } else {
                // ★★★ 修正 (3/3): showTrapPage -> showTrapStatusPage ★★★
                showTrapStatusPage();
            }

        } catch (err) {
            if (err.name === 'ConstraintError') {
                alert(`保存失敗: 罠ナンバー「${data.trap_number}」は既に使用されています。`);
            } else if (err.message !== "Trap limit reached") {
                console.error("Failed to save trap:", err);
                alert(`保存に失敗しました: ${err.message}`);
            }
            saveBtn.disabled = false;
            saveBtn.classList.remove('btn-loading');
            saveBtn.textContent = '保存';
        }
    });

    // 削除ボタン（編集時のみ）
    if (!isNew) {
        // (変更なし)
        document.getElementById('delete-trap-btn').addEventListener('click', async () => {
            if (window.confirm(`罠「${trap.trap_number}」を本当に削除しますか？\n（この罠に関連する捕獲記録は削除されません）`)) {
                try {
                    await db.traps.delete(trapId);
                    alert('罠を削除しました。');
                    // ★★★ 修正 (3/3): showTrapPage -> showTrapStatusPage ★★★
                    (appState.trapView === 'open') ? showTrapStatusPage() : showClosedTrapPage();
                } catch (err) {
                    console.error("Failed to delete trap:", err);
                    alert(`削除に失敗しました: ${err.message}`);
                }
            }
        });

        // (変更なし)
        // 捕獲記録ボタンのリスナー
        document.getElementById('show-catch-log-btn').addEventListener('click', () => {
            // catch.js の showCatchListPage 関数を呼び出す
            showCatchListPage('trap', trapId);
        });
    }
}


// =======================================================
// ★★★ 新規 (3/3): settings.js から以下の2関数を移植 ★★★
// =======================================================

/**
 * 「罠の種類を管理」ページを表示する
 */
async function showManageTrapTypesPage() {
    // ★ 修正: ヘッダータイトルと戻るボタン
    updateHeader('罠の種類を管理', true); 
    // ★ 修正: 戻るボタンの動作を 罠メインメニュー に
    backButton.onclick = () => {
        showTrapPage();
    };

    app.innerHTML = `
        <div class="card space-y-4">
            <form id="add-trap-type-form" class="flex space-x-2">
                <div class="form-group flex-grow">
                    <label for="new_trap_type" class="sr-only">新しい罠の種類</label>
                    <input type="text" id="new_trap_type" class="form-input" placeholder="例: 囲い罠" required>
                </div>
                <button type="submit" class="btn btn-primary h-fit mt-1">追加</button>
            </form>
            
            <hr>
            
            <h3 class="text-md font-semibold">既存の種類</h3>
            <div id="trap-type-list" class="space-y-2">
                <p class="text-gray-500">読み込み中...</p>
            </div>
        </div>
    `;

    // 既存のリストを描画
    await renderTrapTypeList();

    // フォームの送信イベント
    document.getElementById('add-trap-type-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('new_trap_type');
        const newName = input.value.trim();
        
        if (!newName) return;

        try {
            // DBに追加
            await db.trap_types.add({ name: newName });
            input.value = ''; // フォームをクリア
            await renderTrapTypeList(); // リストを再描画
        } catch (err) {
            if (err.name === 'ConstraintError') {
                alert(`「${newName}」は既に追加されています。`);
            } else {
                console.error("Failed to add trap type:", err);
                alert('追加に失敗しました。');
            }
        }
    });
}

/**
 * 罠の種類リストをDBから読み込んで描画する
 */
async function renderTrapTypeList() {
    const container = document.getElementById('trap-type-list');
    if (!container) return;

    try {
        const types = await db.trap_types.orderBy('name').toArray();
        
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
                
                // TODO: 将来的に、この種類を使用している罠があるかチェックする
                
                if (window.confirm(`「${typeName}」を削除しますか？\n（この種類が設定された既存の罠は変更されません）`)) {
                    try {
                        await db.trap_types.delete(typeName);
                        await renderTrapTypeList(); // リストを再描画
                    } catch (err) {
                        console.error("Failed to delete trap type:", err);
                        alert('削除に失敗しました。');
                    }
                }
            });
        });

    } catch (err) {
        console.error("Failed to render trap type list:", err);
        container.innerHTML = `<div class="error-box">リストの読み込みに失敗しました。</div>`;
    }
}