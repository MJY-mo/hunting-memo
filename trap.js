// このファイルは trap.js です
// ★ 修正: 'db.catch' を 'db.catch_records' に変更

/**
 * 「罠」タブのメインページ（一覧）を表示する
 */
async function showTrapPage() {
    // 状態の読み込み
    const view = appState.trapView;
    const filters = appState.trapFilters;
    const sort = (view === 'open') ? appState.trapSortOpen : appState.trapSortClosed;

    // 罠種類のリストを非同期で取得
    const trapTypes = await db.trap_type.toArray();
    const typeOptions = trapTypes.map(type => 
        `<option value="${escapeHTML(type.name)}" ${filters.type === type.name ? 'selected' : ''}>
            ${escapeHTML(type.name)}
        </option>`
    ).join('');

    let html = `
        <div class="page-content">
            <div class="tab-container">
                <button id="trap-tab-open" class="tab-button ${view === 'open' ? 'tab-active' : 'tab-inactive'}">
                    設置中の罠
                </button>
                <button id="trap-tab-closed" class="tab-button ${view === 'closed' ? 'tab-active' : 'tab-inactive'}">
                    過去の罠
                </button>
            </div>

            <div class="filter-controls">
                <div class="filter-group">
                    <label for="trap-filter-type">種類:</label>
                    <select id="trap-filter-type" class="filter-select">
                        <option value="all" ${filters.type === 'all' ? 'selected' : ''}>すべて</option>
                        ${typeOptions}
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="trap-sort-key">ソート:</label>
                    <select id="trap-sort-key" class="filter-select">
                        ${view === 'open' ? `
                            <option value="trap_number" ${sort.key === 'trap_number' ? 'selected' : ''}>罠番号</option>
                            <option value="setup_date" ${sort.key === 'setup_date' ? 'selected' : ''}>設置日</option>
                        ` : `
                            <option value="close_date" ${sort.key === 'close_date' ? 'selected' : ''}>解除日</option>
                            <option value="trap_number" ${sort.key === 'trap_number' ? 'selected' : ''}>罠番号</option>
                        `}
                    </select>
                    <select id="trap-sort-order" class="filter-select">
                        <option value="asc" ${sort.order === 'asc' ? 'selected' : ''}>昇順</option>
                        <option value="desc" ${sort.order === 'desc' ? 'selected' : ''}>降順</option>
                    </select>
                </div>
            </div>

            <ul id="trap-list" class="data-list">
                <li><i class="fas fa-spinner fa-spin"></i> 読み込み中...</li>
            </ul>
        </div>
    `;
    
    app.innerHTML = html;

    // ヘッダーを更新
    updateHeader('罠', false);
    
    // 新規罠登録ボタン
    const newButton = document.createElement('button');
    newButton.id = 'new-trap-button';
    newButton.className = 'button-header-action';
    newButton.innerHTML = '<i class="fas fa-plus"></i>';
    newButton.onclick = () => showTrapEditForm(null); // 新規登録
    headerActions.appendChild(newButton);
    
    // --- イベントリスナー設定 ---
    
    // タブ切り替え
    document.getElementById('trap-tab-open').addEventListener('click', () => {
        appState.trapView = 'open';
        showTrapPage(); // ページ全体を再描画
    });
    document.getElementById('trap-tab-closed').addEventListener('click', () => {
        appState.trapView = 'closed';
        showTrapPage(); // ページ全体を再描画
    });
    
    // フィルターとソート
    document.getElementById('trap-filter-type').addEventListener('change', (e) => {
        filters.type = e.target.value;
        renderTrapList(); // リスト部分のみ再描画
    });
    document.getElementById('trap-sort-key').addEventListener('change', (e) => {
        const currentSort = (view === 'open') ? appState.trapSortOpen : appState.trapSortClosed;
        currentSort.key = e.target.value;
        renderTrapList();
    });
    document.getElementById('trap-sort-order').addEventListener('change', (e) => {
        const currentSort = (view === 'open') ? appState.trapSortOpen : appState.trapSortClosed;
        currentSort.order = e.target.value;
        renderTrapList();
    });

    // リストの初回描画
    await renderTrapList();
}

/**
 * 罠リストを描画する (フィルタリング実行)
 */
async function renderTrapList() {
    const listElement = document.getElementById('trap-list');
    if (!listElement) return;

    listElement.innerHTML = `<li><i class="fas fa-spinner fa-spin"></i> 読み込み中...</li>`;
    
    try {
        const view = appState.trapView;
        const filters = appState.trapFilters;
        const sort = (view === 'open') ? appState.trapSortOpen : appState.trapSortClosed;

        // 1. 基本クエリ (is_open で '設置中' か '過去' か)
        let query = db.trap.where('is_open').equals(view === 'open' ? 1 : 0);

        // 2. 種類フィルター
        if (filters.type !== 'all') {
            query = query.where('type').equals(filters.type);
        }
        
        // 3. ソート
        query = query.orderBy(sort.key);

        // 4. データ取得
        const traps = await query.toArray();

        // 5. 昇順/降順の適用
        if (sort.order === 'desc') {
            traps.reverse();
        }

        if (traps.length === 0) {
            listElement.innerHTML = `<li class="no-data">
                ${view === 'open' ? '設置中の罠はありません。' : '過去の罠はありません。'}
            </li>`;
            return;
        }

        // 6. HTML構築
        let listItems = '';
        for (const trap of traps) {
            // ★ 修正: db.catch -> db.catch_records
            // この罠に関連する捕獲数を非同期で取得
            const catchCount = await db.catch_records.where('trap_id').equals(trap.id).count();
            
            const catchBadge = catchCount > 0 
                ? `<span class="badge badge-success">${catchCount}件</span>` 
                : '';

            listItems += `
                <li class="data-list-item" data-id="${trap.id}">
                    <div class="item-main-content">
                        <strong>${escapeHTML(trap.trap_number)}</strong>
                        <span class="item-sub-text">${escapeHTML(trap.type)} / ${formatDate(trap.setup_date)}</span>
                    </div>
                    <div class="item-action-content">
                        ${catchBadge}
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </li>
            `;
        }
        
        listElement.innerHTML = listItems;
        
        // 7. クリックイベント設定
        listElement.querySelectorAll('.data-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id, 10);
                showTrapDetailPage(id);
            });
        });

    } catch (err) {
        console.error("Failed to render trap list:", err);
        listElement.innerHTML = `<li class="no-data error">罠リストの読み込みに失敗しました: ${err.message}</li>`;
    }
}

// --- 罠 (詳細) ---------------------------------

/**
 * 罠の「詳細ページ」を表示する
 * @param {number} id - 表示する罠のDB ID
 */
async function showTrapDetailPage(id) {
    try {
        const trap = await db.trap.get(id);
        if (!trap) {
            app.innerHTML = `<div class="error-box">該当するデータが見つかりません。</div>`;
            return;
        }
        
        // --- 画像の表示 ---
        let imageHTML = '';
        if (trap.image_blob) {
            const blobUrl = URL.createObjectURL(trap.image_blob);
            imageHTML = `
                <div class="info-section">
                    <h4>設置写真</h4>
                    <div class="info-image-container">
                        <img src="${blobUrl}" alt="設置写真" id="detail-image" class="clickable-image">
                    </div>
                </div>
            `;
        }

        // --- 基本情報のテーブル ---
        const tableData = [
            { label: '罠番号', value: trap.trap_number },
            { label: '種類', value: trap.type },
            { label: '設置日', value: formatDate(trap.setup_date) },
            { label: '緯度', value: trap.latitude },
            { label: '経度', value: trap.longitude },
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
        if (trap.memo) {
            memoHTML = `
                <div class="info-section">
                    <h4>メモ</h4>
                    <p class="info-memo">${escapeHTML(trap.memo).replace(/\n/g, '<br>')}</p>
                </div>
            `;
        }
        
        // --- 関連する捕獲記録 (ボタン) ---
        const catchButtonHTML = `
            <div class="info-section">
                <button id="show-related-catches-btn" class="menu-button">
                    <i class="fas fa-fish icon"></i>
                    この罠の捕獲記録を見る
                </button>
                <button id="add-catch-to-trap-btn" class="menu-button">
                    <i class="fas fa-plus icon"></i>
                    この罠で捕獲した
                </button>
            </div>
        `;
        
        // --- 罠の解除ボタン (設置中の場合のみ) ---
        const closeButtonHTML = trap.is_open
            ? `<div class="info-section">
                 <button id="close-trap-btn" class="button button-danger button-full">
                     <i class="fas fa-times-circle"></i> この罠を解除する
                 </button>
               </div>`
            : `<div class="info-section"><p class="text-center text-muted">この罠は ${formatDate(trap.close_date)} に解除されました。</p></div>`;


        // --- 最終的なHTML ---
        app.innerHTML = `
            <div class="page-content info-detail-page">
                ${imageHTML}
                ${tableHTML}
                ${memoHTML}
                ${catchButtonHTML}
                ${closeButtonHTML}
            </div>
        `;

        // --- ヘッダーの更新 ---
        updateHeader(escapeHTML(trap.trap_number), true);
        backButton.onclick = () => showTrapPage();

        // アクションボタン（編集・削除）
        headerActions.innerHTML = ''; // クリア
        
        // 編集ボタン
        const editButton = document.createElement('button');
        editButton.className = 'button-header-action';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.onclick = () => showTrapEditForm(id);
        headerActions.appendChild(editButton);

        // 削除ボタン
        const deleteButton = document.createElement('button');
        deleteButton.className = 'button-header-action';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.onclick = () => deleteTrap(id);
        headerActions.appendChild(deleteButton);
        
        // --- イベントリスナー ---
        
        // 画像モーダル
        const imgElement = document.getElementById('detail-image');
        if (imgElement) {
            imgElement.addEventListener('click', () => {
                showImageModal(imgElement.src); // (main.js 側で revokeURL 処理)
            });
        }
        
        // 関連する捕獲記録を見る
        document.getElementById('show-related-catches-btn').addEventListener('click', () => {
            appState.currentCatchMethod = 'trap';
            appState.currentCatchRelationId = id; // 罠ID
            navigateTo('catch', showCatchPage, '捕獲記録');
        });

        // この罠で捕獲
        document.getElementById('add-catch-to-trap-btn').addEventListener('click', () => {
            showCatchEditForm(null, { trapId: id, gunLogId: null });
        });

        // 罠を解除
        const closeBtn = document.getElementById('close-trap-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeTrap(id));
        }

    } catch (err) {
        console.error("Failed to show trap detail:", err);
        app.innerHTML = `<div class="error-box">詳細の読み込みに失敗しました: ${err.message}</div>`;
    }
}

// --- 罠 (編集/新規) -----------------------------

/**
 * 罠の「編集/新規作成フォーム」を表示する
 * @param {number | null} id - 編集する罠のID (新規の場合は null)
 */
async function showTrapEditForm(id) {
    let trap = {
        trap_number: '',
        type: '',
        setup_date: new Date().toISOString().split('T')[0], // デフォルトを今日に
        latitude: '',
        longitude: '',
        memo: '',
        image_blob: null,
        is_open: 1 // 新規は '設置中'
    };
    
    let pageTitle = '新規 罠設置';
    let currentImageHTML = '';

    // 罠種類のリストを非同期で取得
    const trapTypes = await db.trap_type.toArray();
    const typeOptions = trapTypes.map(type => 
        `<option value="${escapeHTML(type.name)}">${escapeHTML(type.name)}</option>`
    ).join('');
    
    // 編集の場合
    if (id) {
        pageTitle = '罠の編集';
        const existingTrap = await db.trap.get(id);
        if (existingTrap) {
            trap = existingTrap;
            
            // 既存画像の表示
            if (trap.image_blob) {
                const blobUrl = URL.createObjectURL(trap.image_blob);
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
        } else {
            app.innerHTML = `<div class="error-box">編集対象のデータが見つかりません。</div>`;
            return;
        }
    }

    app.innerHTML = `
        <div class="page-content">
            <form id="trap-form" class="form-container">
                
                <div class="form-group">
                    <label for="trap-number">罠番号 <span class="required">*</span>:</label>
                    <input type="text" id="trap-number" value="${escapeHTML(trap.trap_number)}" required>
                </div>

                <div class="form-group">
                    <label for="trap-type">種類 <span class="required">*</span>:</label>
                    <input type="text" id="trap-type" value="${escapeHTML(trap.type)}" required list="trap-type-datalist" placeholder="「くくり罠」など入力">
                    <datalist id="trap-type-datalist">
                        ${typeOptions}
                    </datalist>
                    <button type="button" id="manage-trap-types-btn" class="button-link">種類を管理...</button>
                </div>

                <div class="form-group">
                    <label for="trap-setup-date">設置日 <span class="required">*</span>:</label>
                    <input type="date" id="trap-setup-date" value="${escapeHTML(trap.setup_date)}" required>
                </div>

                <h3 class="form-section-title">設置場所</h3>
                <div class="form-group-row">
                    <div class="form-group">
                        <label for="trap-latitude">緯度:</label>
                        <input type="number" step="any" id="trap-latitude" value="${escapeHTML(trap.latitude)}" placeholder="例: 35.12345">
                    </div>
                    <div class="form-group">
                        <label for="trap-longitude">経度:</label>
                        <input type="number" step="any" id="trap-longitude" value="${escapeHTML(trap.longitude)}" placeholder="例: 139.12345">
                    </div>
                </div>
                <button type="button" id="get-trap-gps-btn" class="button button-secondary button-full">
                    <i class="fas fa-map-marker-alt"></i> 現在地を取得
                </button>

                <h3 class="form-section-title">写真</h3>
                ${currentImageHTML}
                <div class="form-group">
                    <label for="trap-image">${id && trap.image_blob ? '写真を変更:' : '写真を追加:'}</label>
                    <input type="file" id="trap-image" accept="image/*">
                    <div id="image-preview-container" class="image-preview-container"></div>
                </div>

                <h3 class="form-section-title">メモ</h3>
                <div class="form-group">
                    <textarea id="trap-memo" rows="4">${escapeHTML(trap.memo)}</textarea>
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
            showTrapDetailPage(id); // 編集中の場合は詳細に戻る
        } else {
            showTrapPage(); // 新規の場合はリストに戻る
        }
    };
    
    // --- フォームの動的処理 ---
    
    // 1. GPS取得ボタン (main.js の getCurrentLocation を使用)
    document.getElementById('get-trap-gps-btn').addEventListener('click', async (e) => {
        const button = e.currentTarget;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 測位中...';
        button.disabled = true;
        
        try {
            const location = await getCurrentLocation();
            document.getElementById('trap-latitude').value = location.latitude;
            document.getElementById('trap-longitude').value = location.longitude;
        } catch (err) {
            document.getElementById('form-error').textContent = err.message;
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    });
    
    // 2. 画像プレビュー処理 (main.js の resizeImage を使用)
    const imageInput = document.getElementById('trap-image');
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
            resizedImageBlob = await resizeImage(file, 800);
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
    
    // 3. 既存写真の削除ボタン
    const removeBtn = document.getElementById('remove-image-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            // プレビューを削除
            const currentImageDiv = document.getElementById('current-image').closest('.form-group');
            if (currentImageDiv) {
                currentImageDiv.remove();
            }
            // データを null 化 (保存時にDBも更新)
            trap.image_blob = null; 
            // 状態を "削除済み" に
            currentImageHTML = '<div class="form-group"><label>現在の写真:</label><p>(削除されます)</p></div>'; 
        });
    }
    
    // 4. 画像モーダル (既存画像)
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

    // 5. 「種類を管理」ボタン
    document.getElementById('manage-trap-types-btn').addEventListener('click', () => {
        showTrapTypeManagementPage(() => {
            // 管理画面から戻ってきたときのコールバック
            showTrapEditForm(id); // フォームを再描画（datalistを更新）
        });
    });

    // 6. フォーム保存処理
    document.getElementById('trap-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const trapNumber = document.getElementById('trap-number').value;
        const trapType = document.getElementById('trap-type').value;
        const setupDate = document.getElementById('trap-setup-date').value;
        
        // バリデーション
        if (!trapNumber || !trapType || !setupDate) {
            document.getElementById('form-error').textContent = '罠番号、種類、設置日は必須です。';
            return;
        }
        
        // フォームデータをまとめる
        const formData = {
            trap_number: trapNumber,
            type: trapType,
            setup_date: setupDate,
            latitude: document.getElementById('trap-latitude').value,
            longitude: document.getElementById('trap-longitude').value,
            memo: document.getElementById('trap-memo').value,
            image_blob: trap.image_blob // デフォルトは既存の画像
        };

        // 新しい画像が選択されていれば、それを採用
        if (resizedImageBlob) {
            formData.image_blob = resizedImageBlob;
        }
        
        try {
            if (id) {
                // 更新 (is_open 状態は変更しない)
                await db.trap.put({ ...formData, is_open: trap.is_open, id: id });
                showTrapDetailPage(id); // 詳細ページに戻る
            } else {
                // 新規作成
                const newId = await db.trap.add({ ...formData, is_open: 1 });
                showTrapDetailPage(newId); // 作成した詳細ページに飛ぶ
            }
        } catch (err) {
            console.error("Failed to save trap:", err);
            document.getElementById('form-error').textContent = `保存に失敗しました: ${err.message}`;
        }
    });
}

// --- 罠 (削除・解除) -----------------------------

/**
 * 罠を解除する (is_open: 0 にする)
 * @param {number} id - 解除する罠のID
 */
async function closeTrap(id) {
    if (!confirm('この罠を「解除」しますか？\n「設置中の罠」から「過去の罠」に移動します。')) {
        return;
    }
    
    try {
        const closeDate = new Date().toISOString().split('T')[0]; // 解除日
        await db.trap.update(id, { is_open: 0, close_date: closeDate });
        
        // 詳細ページを再描画
        showTrapDetailPage(id);
        
    } catch (err) {
        console.error("Failed to close trap:", err);
        alert(`罠の解除に失敗しました: ${err.message}`);
    }
}

/**
 * 罠を削除する (関連する捕獲記録も削除)
 * @param {number} id - 削除する罠のID
 */
async function deleteTrap(id) {
    if (!confirm('この罠を本当に削除しますか？\nこの罠に関連する【捕獲記録もすべて削除】されます。\nこの操作は元に戻せません。')) {
        return;
    }

    try {
        // トランザクション
        await db.transaction('rw', db.trap, db.catch_records, async () => { // ★ 修正: db.catch -> db.catch_records
            
            // 1. 関連する捕獲記録を削除
            // ★ 修正: db.catch -> db.catch_records
            await db.catch_records.where('trap_id').equals(id).delete();
            
            // 2. 罠本体を削除
            await db.trap.delete(id);
        });
        
        // 削除後はリストに戻る
        showTrapPage();
        
    } catch (err) {
        console.error("Failed to delete trap and related catches:", err);
        alert(`削除に失敗しました: ${err.message}`);
    }
}

// --- 罠種類 (管理) -----------------------------

/**
 * 罠の種類を管理するページを表示
 * @param {function} onCloseCallback - このページを閉じたときに実行するコールバック
 */
async function showTrapTypeManagementPage(onCloseCallback) {
    app.innerHTML = `
        <div class="page-content">
            <form id="new-trap-type-form" class="form-container">
                <h3 class="form-section-title">新しい罠の種類を追加</h3>
                <div class="form-group-row">
                    <input type="text" id="new-trap-type-name" placeholder="例: 囲い罠" class="form-control" required>
                    <button type="submit" class="button button-primary">追加</button>
                </div>
                <div id="type-form-error" class="form-error"></div>
            </form>
            
            <h3 class="form-section-title">既存の罠の種類</h3>
            <ul id="trap-type-list" class="data-list">
                <li><i class="fas fa-spinner fa-spin"></i> 読み込み中...</li>
            </ul>
        </div>
    `;

    // ヘッダーを更新
    updateHeader('罠の種類の管理', true);
    backButton.onclick = onCloseCallback; // 戻るボタンでコールバックを実行

    // --- 既存リストの描画 ---
    async function renderTrapTypeList() {
        const listEl = document.getElementById('trap-type-list');
        try {
            const types = await db.trap_type.toArray();
            if (types.length === 0) {
                listEl.innerHTML = `<li class="no-data">登録済みの種類はありません。</li>`;
                return;
            }
            
            listEl.innerHTML = types.map(type => `
                <li class="data-list-item">
                    <div class="item-main-content">
                        <strong>${escapeHTML(type.name)}</strong>
                    </div>
                    <div class="item-action-content">
                        ${(type.name === 'くくり罠' || type.name === '箱罠') ? 
                            '<span class="text-muted">(デフォルト)</span>' : 
                            `<button class="button-danger-link" data-id="${type.id}"><i class="fas fa-trash"></i></button>`
                        }
                    </div>
                </li>
            `).join('');
            
            // 削除ボタンのイベント
            listEl.querySelectorAll('.button-danger-link').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = parseInt(e.currentTarget.dataset.id, 10);
                    if (confirm('この種類を削除しますか？')) {
                        try {
                            await db.trap_type.delete(id);
                            renderTrapTypeList(); // リスト再描画
                        } catch (err) {
                            alert(`削除に失敗: ${err.message}`);
                        }
                    }
                });
            });
            
        } catch (err) {
            listEl.innerHTML = `<li class="no-data error">読み込み失敗</li>`;
        }
    }
    
    // --- 新規追加フォーム ---
    document.getElementById('new-trap-type-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('new-trap-type-name');
        const errorEl = document.getElementById('type-form-error');
        const name = input.value.trim();
        
        if (!name) {
            errorEl.textContent = '名前を入力してください。';
            return;
        }
        
        try {
            await db.trap_type.add({ name: name });
            input.value = ''; // フォームをクリア
            errorEl.textContent = '';
            renderTrapTypeList(); // リスト再描画
        } catch (err) {
            if (err.name === 'ConstraintError') {
                errorEl.textContent = 'その名前は既に使用されています。';
            } else {
                errorEl.textContent = `追加に失敗: ${err.message}`;
            }
        }
    });
    
    // 初回描画
    renderTrapTypeList();
}