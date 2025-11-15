// このファイルは trap.js です
// ★ 修正: 'db.catch' を 'db.catch_records' に変更
// ★ 修正: DBスキーマ v5 (close_date) に対応
// ★ 修正: クエリロジックを修正 (orderByが先)
// ★ 修正: 2025/11/15 ユーザー指摘のUI・ロジック修正を適用

/**
 * 「罠」タブのメインページ（一覧）を表示する
 */
async function showTrapPage() {
    // 状態の読み込み
    const view = appState.trapView;
    const filters = appState.trapFilters;
    const sort = (view === 'open') ? appState.trapSortOpen : appState.trapSortClosed;

    const trapTypes = await db.trap_type.toArray();
    const typeOptions = trapTypes.map(type => 
        `<option value="${escapeHTML(type.name)}" ${filters.type === type.name ? 'selected' : ''}>
            ${escapeHTML(type.name)}
        </option>`
    ).join('');

    // ★ 修正: 「過去の罠」閲覧中は新規設置ボタンを無効化
    const isNewDisabled = view === 'closed';

    let html = `
        <div class="space-y-4">
            <div class="flex border-b border-gray-300">
                <button id="trap-tab-open" class="flex-1 py-3 px-4 text-center text-base font-medium 
                    ${view === 'open' ? 'text-blue-600 border-b-2 border-blue-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}">
                    設置中の罠
                </button>
                <button id="trap-tab-closed" class="flex-1 py-3 px-4 text-center text-base font-medium 
                    ${view === 'closed' ? 'text-blue-600 border-b-2 border-blue-600 font-semibold' : 'text-gray-500 hover:bg-gray-50'}">
                    過去の罠
                </button>
            </div>

            <div class="flex space-x-2">
                <button id="new-trap-button" class="btn btn-primary flex-1" ${isNewDisabled ? 'disabled' : ''}>
                    <i class="fas fa-plus"></i> 新規設置
                </button>
                <button id="manage-trap-types-btn" class="btn btn-secondary flex-1">
                    <i class="fas fa-cog"></i> 種類を管理
                </button>
            </div>

            <div class="card">
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group mb-0">
                        <label for="trap-filter-type" class="form-label">種類:</label>
                        <select id="trap-filter-type" class="form-select">
                            <option value="all" ${filters.type === 'all' ? 'selected' : ''}>すべて</option>
                            ${typeOptions}
                        </select>
                    </div>
                    
                    <div class="form-group mb-0">
                        <label for="trap-sort-key" class="form-label">ソート:</label>
                        <div class="flex space-x-2">
                            <select id="trap-sort-key" class="form-select">
                                ${view === 'open' ? `
                                    <option value="trap_number" ${sort.key === 'trap_number' ? 'selected' : ''}>罠番号</option>
                                    <option value="setup_date" ${sort.key === 'setup_date' ? 'selected' : ''}>設置日</option>
                                ` : `
                                    <option value="close_date" ${sort.key === 'close_date' ? 'selected' : ''}>解除日</option>
                                    <option value="trap_number" ${sort.key === 'trap_number' ? 'selected' : ''}>罠番号</option>
                                `}
                            </select>
                            <select id="trap-sort-order" class="form-select w-24">
                                <option value="asc" ${sort.order === 'asc' ? 'selected' : ''}>昇順</option>
                                <option value="desc" ${sort.order === 'desc' ? 'selected' : ''}>降順</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div id="trap-list" class="space-y-3">
                <p class="text-gray-500 text-center py-4">読み込み中...</p>
            </div>
        </div>
    `;
    
    app.innerHTML = html;

    // ヘッダーを更新 (ボタンは置かない)
    updateHeader('罠', false);
    headerActions.innerHTML = ''; 
    
    // --- イベントリスナー設定 ---
    
    document.getElementById('trap-tab-open').addEventListener('click', () => {
        appState.trapView = 'open';
        showTrapPage(); 
    });
    document.getElementById('trap-tab-closed').addEventListener('click', () => {
        appState.trapView = 'closed';
        showTrapPage(); 
    });
    
    document.getElementById('trap-filter-type').addEventListener('change', (e) => {
        filters.type = e.target.value;
        renderTrapList(); 
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

    // 移動したボタンのリスナー
    const newTrapBtn = document.getElementById('new-trap-button');
    if (newTrapBtn) {
        newTrapBtn.onclick = () => showTrapEditForm(null);
    }
    document.getElementById('manage-trap-types-btn').onclick = () => {
        // 管理画面から戻ってきたら、罠ページを再描画
        showTrapTypeManagementPage(() => showTrapPage());
    };

    // リストの初回描画
    await renderTrapList();
}

/**
 * 罠リストを描画する (フィルタリング実行)
 * (ロジックは修正済み)
 */
async function renderTrapList() {
    const listElement = document.getElementById('trap-list');
    if (!listElement) return;

    listElement.innerHTML = `<p class="text-gray-500 text-center py-4">読み込み中...</p>`;
    
    try {
        const view = appState.trapView;
        const filters = appState.trapFilters;
        const sort = (view === 'open') ? appState.trapSortOpen : appState.trapSortClosed;

        // 1. ソートキーでまず並び替える
        let query = db.trap.orderBy(sort.key);

        // 2. 昇順/降順の適用
        if (sort.order === 'desc') {
            query = query.reverse();
        }

        // 3. データベースから配列として取得
        let traps = await query.toArray();

        // 4. JavaScript側でフィルターを実行
        
        // 4a. 設置中/過去 フィルター
        traps = traps.filter(trap => trap.is_open === (view === 'open' ? 1 : 0));

        // 4b. 種類フィルター
        if (filters.type !== 'all') {
            traps = traps.filter(trap => trap.type === filters.type);
        }
        
        if (traps.length === 0) {
            listElement.innerHTML = `<p class="text-gray-500 text-center py-4">
                ${view === 'open' ? '設置中の罠はありません。' : '過去の罠はありません。'}
            </p>`;
            return;
        }

        // 6. HTML構築
        let listItems = '';
        for (const trap of traps) {
            const catchCount = await db.catch_records.where('trap_id').equals(trap.id).count();
            
            const catchBadge = catchCount > 0 
                ? `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-emerald-600 bg-emerald-200">${catchCount}件</span>` 
                : '';

            // ★ 修正: view === 'closed' の場合、タイトル色を変更
            const titleColor = view === 'open' ? 'text-blue-600' : 'text-gray-500';

            listItems += `
                <div class="trap-card" data-id="${trap.id}">
                    <div class="flex-grow">
                        <h3 class="text-lg font-semibold ${titleColor}">${escapeHTML(trap.trap_number)}</h3>
                        <p class="text-sm">${escapeHTML(trap.type)} / ${formatDate(trap.setup_date)}</p>
                    </div>
                    <div class="flex-shrink-0 ml-4 flex items-center space-x-2">
                        ${catchBadge}
                        <span>&gt;</span>
                    </div>
                </div>
            `;
        }
        
        listElement.innerHTML = listItems;
        
        // 7. クリックイベント設定
        listElement.querySelectorAll('.trap-card').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id, 10);
                showTrapDetailPage(id);
            });
        });

    } catch (err) {
        console.error("Failed to render trap list:", err);
        listElement.innerHTML = `<div class="error-box">罠リストの読み込みに失敗しました。</div>`;
    }
}

// --- 罠 (詳細) ---------------------------------

/**
 * 罠の「詳細ページ」を表示する
 */
async function showTrapDetailPage(id) {
    try {
        const trap = await db.trap.get(id);
        if (!trap) {
            app.innerHTML = `<div class="error-box">該当するデータが見つかりません。</div>`;
            return;
        }
        
        // --- 編集・削除ボタンをページ上部に配置 ---
        const editButtonsHTML = `
            <div class="card">
                <div class="flex space-x-2">
                    <button id="edit-trap-btn" class="btn btn-secondary flex-1">編集</button>
                    <button id="delete-trap-btn" class="btn btn-danger flex-1">削除</button>
                </div>
            </div>
        `;
        
        let imageHTML = '';
        if (trap.image_blob) {
            const blobUrl = URL.createObjectURL(trap.image_blob);
            imageHTML = `
                <div class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">設置写真</h2>
                    <div class="photo-preview cursor-zoom-in">
                        <img src="${blobUrl}" alt="設置写真" id="detail-image" class="clickable-image">
                    </div>
                </div>
            `;
        }

        const tableData = [
            { label: '罠番号', value: trap.trap_number },
            { label: '種類', value: trap.type },
            { label: '設置日', value: formatDate(trap.setup_date) },
            { label: '緯度', value: trap.latitude },
            { label: '経度', value: trap.longitude },
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
        if (trap.memo) {
            memoHTML = `
                <div class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">メモ</h2>
                    <p class="text-sm text-gray-700 leading-relaxed">
                        ${escapeHTML(trap.memo).replace(/\n/g, '<br>')}
                    </p>
                </div>
            `;
        }
        
        // --- ボタンの表記を変更 ---
        const catchButtonHTML = `
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">捕獲記録</h2>
                <div class="space-y-3">
                    <button id="show-related-catches-btn" class="btn btn-secondary w-full justify-start text-left">
                        <span class="w-6">🐾</span> この罠の捕獲記録を見る
                    </button>
                    <button id="add-catch-to-trap-btn" class="btn btn-primary w-full justify-start text-left">
                        <span class="w-6">＋</span> この罠での捕獲記録を追加
                    </button>
                </div>
            </div>
        `;
        
        // --- 解除ボタンを緑色にし、日付入力追加 ---
        const today = new Date().toISOString().split('T')[0];
        const closeButtonHTML = trap.is_open
            ? `<div class="card">
                 <h2 class="text-lg font-semibold border-b pb-2 mb-4">罠の管理</h2>
                 <div class="form-group">
                    <label for="trap-close-date" class="form-label">解除日:</label>
                    <input type="date" id="trap-close-date" class="form-input" value="${today}">
                 </div>
                 <button id="close-trap-btn" class="btn btn-success w-full mt-2">
                     この罠を解除する (過去の罠に移動)
                 </button>
               </div>`
            : `<div class="card text-center">
                 <p class="text-sm text-gray-500">この罠は ${formatDate(trap.close_date)} に解除されました。</p>
               </div>`;

        app.innerHTML = `
            <div class="space-y-4">
                ${editButtonsHTML}
                ${imageHTML}
                ${tableHTML}
                ${memoHTML}
                ${catchButtonHTML}
                ${closeButtonHTML}
            </div>
        `;

        // ヘッダーを更新 (戻るボタンのみ)
        updateHeader(escapeHTML(trap.trap_number), true);
        backButton.onclick = () => showTrapPage();
        headerActions.innerHTML = ''; // ヘッダーのアクションボタンはクリア

        // --- イベントリスナー ---
        
        // ページ内のボタンにリスナーをアタッチ
        document.getElementById('edit-trap-btn').onclick = () => showTrapEditForm(id);
        document.getElementById('delete-trap-btn').onclick = () => deleteTrap(id);
        
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
            appState.currentCatchMethod = 'trap';
            appState.currentCatchRelationId = id; 
            navigateTo('catch', showCatchPage, '捕獲記録');
        });

        document.getElementById('add-catch-to-trap-btn').addEventListener('click', () => {
            showCatchEditForm(null, { trapId: id, gunLogId: null });
        });

        // 解除ボタンのリスナーを修正
        const closeBtn = document.getElementById('close-trap-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                let closeDate = document.getElementById('trap-close-date').value;
                if (!closeDate) {
                    closeDate = new Date().toISOString().split('T')[0];
                }
                closeTrap(id, closeDate); // 日付を渡す
            });
        }

    } catch (err) {
        console.error("Failed to show trap detail:", err);
        app.innerHTML = `<div class="error-box">詳細の読み込みに失敗しました: ${err.message}</div>`;
    }
}

// --- 罠 (編集/新規) -----------------------------

/**
 * 罠の「編集/新規作成フォーム」を表示する
 */
async function showTrapEditForm(id) {
    let trap = {
        trap_number: '',
        type: '',
        setup_date: new Date().toISOString().split('T')[0], 
        latitude: '',
        longitude: '',
        memo: '',
        image_blob: null,
        is_open: 1 
    };
    
    let pageTitle = '新規 罠設置';
    let currentImageHTML = '';

    const trapTypes = await db.trap_type.toArray();
    const typeOptions = trapTypes.map(type => 
        `<option value="${escapeHTML(type.name)}"></option>`
    ).join('');
    
    if (id) {
        pageTitle = '罠の編集';
        const existingTrap = await db.trap.get(id);
        if (existingTrap) {
            trap = existingTrap;
            
            if (trap.image_blob) {
                const blobUrl = URL.createObjectURL(trap.image_blob);
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
        } else {
            app.innerHTML = `<div class="error-box">編集対象のデータが見つかりません。</div>`;
            return;
        }
    }

    app.innerHTML = `
        <div class="card">
            <form id="trap-form" class="space-y-4">
                
                <div class="form-group">
                    <label for="trap-number" class="form-label">罠番号 <span class="text-red-500">*</span>:</label>
                    <input type="text" id="trap-number" class="form-input" value="${escapeHTML(trap.trap_number)}" required>
                </div>

                <div class="form-group">
                    <label for="trap-type" class="form-label">種類 <span class="text-red-500">*</span>:</label>
                    <input type="text" id="trap-type" class="form-input" value="${escapeHTML(trap.type)}" required list="trap-type-datalist" placeholder="「くくり罠」など入力">
                    <datalist id="trap-type-datalist">
                        ${typeOptions}
                    </datalist>
                    </div>

                <div class="form-group">
                    <label for="trap-setup-date" class="form-label">設置日 <span class="text-red-500">*</span>:</label>
                    <input type="date" id="trap-setup-date" class="form-input" value="${escapeHTML(trap.setup_date)}" required>
                </div>

                <div class="form-group">
                    <label class="form-label">設置場所</label>
                    <div class="grid grid-cols-2 gap-4">
                        <input type="number" step="any" id="trap-latitude" class="form-input" value="${escapeHTML(trap.latitude)}" placeholder="緯度">
                        <input type="number" step="any" id="trap-longitude" class="form-input" value="${escapeHTML(trap.longitude)}" placeholder="経度">
                    </div>
                    <button type="button" id="get-trap-gps-btn" class="btn btn-secondary w-full mt-2">
                        現在地を取得
                    </button>
                </div>

                ${currentImageHTML}

                <div class="form-group">
                    <label for="trap-image" class="form-label">${id && trap.image_blob ? '写真を変更:' : '写真を追加:'}</label>
                    <input type="file" id="trap-image" class="form-input" accept="image/*">
                    <div id="image-preview-container" class="mt-2"></div>
                </div>

                <div class="form-group">
                    <label for="trap-memo" class="form-label">メモ:</label>
                    <textarea id="trap-memo" rows="4" class="form-input">${escapeHTML(trap.memo)}</textarea>
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
            showTrapDetailPage(id); 
        } else {
            showTrapPage(); 
        }
    };
    
    document.getElementById('get-trap-gps-btn').addEventListener('click', async (e) => {
        const button = e.currentTarget;
        const originalText = button.innerHTML;
        button.innerHTML = '測位中...';
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
    
    const imageInput = document.getElementById('trap-image');
    const previewContainer = document.getElementById('image-preview-container');
    let resizedImageBlob = null; 

    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) {
            previewContainer.innerHTML = '';
            resizedImageBlob = null;
            return;
        }
        
        previewContainer.innerHTML = `<p class="text-gray-500">画像処理中...</p>`;
        
        try {
            resizedImageBlob = await resizeImage(file, 800);
            const previewUrl = URL.createObjectURL(resizedImageBlob);
            
            previewContainer.innerHTML = `
                <div class="photo-preview">
                    <img src="${previewUrl}" alt="プレビュー">
                </div>
            `;
            URL.revokeObjectURL(previewUrl); 
            
        } catch (err) {
            console.error("Image resize failed:", err);
            previewContainer.innerHTML = `<p class="text-red-500">画像処理に失敗: ${err.message}</p>`;
            resizedImageBlob = null;
        }
    });
    
    const removeBtn = document.getElementById('remove-image-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            const currentImageDiv = removeBtn.closest('.form-group');
            if (currentImageDiv) currentImageDiv.remove();
            trap.image_blob = null; 
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
    
    document.getElementById('trap-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const trapNumber = document.getElementById('trap-number').value;
        const trapType = document.getElementById('trap-type').value;
        const setupDate = document.getElementById('trap-setup-date').value;
        
        if (!trapNumber || !trapType || !setupDate) {
            document.getElementById('form-error').textContent = '罠番号、種類、設置日は必須です。';
            return;
        }
        
        const formData = {
            trap_number: trapNumber,
            type: trapType,
            setup_date: setupDate,
            latitude: document.getElementById('trap-latitude').value,
            longitude: document.getElementById('trap-longitude').value,
            memo: document.getElementById('trap-memo').value,
            image_blob: trap.image_blob 
        };

        if (resizedImageBlob) {
            formData.image_blob = resizedImageBlob;
        }
        
        try {
            if (id) {
                await db.trap.put({ ...formData, is_open: trap.is_open, id: id });
                showTrapDetailPage(id); 
            } else {
                const newId = await db.trap.add({ ...formData, is_open: 1 });
                showTrapDetailPage(newId); 
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
 * ★ 修正: 解除日(closeDate) を受け取るように変更
 * @param {number} id - 解除する罠のID
 * @param {string} closeDate - YYYY-MM-DD形式の解除日
 */
async function closeTrap(id, closeDate) {
    if (!confirm(`罠を ${formatDate(closeDate)} 付で「解除」しますか？\n「設置中の罠」から「過去の罠」に移動します。`)) {
        return;
    }
    
    try {
        await db.trap.update(id, { is_open: 0, close_date: closeDate });
        
        showTrapDetailPage(id);
        
    } catch (err) {
        console.error("Failed to close trap:", err);
        alert(`罠の解除に失敗しました: ${err.message}`);
    }
}

async function deleteTrap(id) {
    if (!confirm('この罠を本当に削除しますか？\nこの罠に関連する【捕獲記録もすべて削除】されます。\nこの操作は元に戻せません。')) {
        return;
    }

    try {
        await db.transaction('rw', db.trap, db.catch_records, async () => {
            await db.catch_records.where('trap_id').equals(id).delete();
            await db.trap.delete(id);
        });
        
        showTrapPage();
        
    } catch (err) {
        console.error("Failed to delete trap and related catches:", err);
        alert(`削除に失敗しました: ${err.message}`);
    }
}

// --- 罠種類 (管理) -----------------------------
// (このセクションは修正なし)
async function showTrapTypeManagementPage(onCloseCallback) {
    app.innerHTML = `
        <div class="space-y-4">
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">新しい罠の種類を追加</h2>
                <form id="new-trap-type-form" class="flex space-x-2">
                    <div class="form-group flex-grow mb-0">
                        <label for="new-trap-type-name" class="sr-only">名前</label>
                        <input type="text" id="new-trap-type-name" class="form-input" placeholder="例: 囲い罠" required>
                    </div>
                    <button type="submit" class="btn btn-primary h-fit mt-1">追加</button>
                </form>
                <div id="type-form-error" class="text-red-600 text-sm text-center mt-2 h-4"></div>
            </div>
            
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">既存の罠の種類</h2>
                <div id="trap-type-list" class="space-y-2">
                    <p class="text-gray-500">読み込み中...</p>
                </div>
            </div>
        </div>
    `;

    updateHeader('罠の種類の管理', true);
    backButton.onclick = onCloseCallback; 

    async function renderTrapTypeList() {
        const listEl = document.getElementById('trap-type-list');
        try {
            const types = await db.trap_type.toArray();
            if (types.length === 0) {
                listEl.innerHTML = `<p class="text-gray-500 text-sm">登録済みの種類はありません。</p>`;
                return;
            }
            
            listEl.innerHTML = types.map(type => `
                <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span class="text-gray-700">${escapeHTML(type.name)}</span>
                    ${(type.name === 'くくり罠' || type.name === '箱罠') ? 
                        '<span class="text-sm text-gray-400">(デフォルト)</span>' : 
                        `<button class="btn btn-danger btn-sm" data-id="${type.id}">削除</button>`
                    }
                </div>
            `).join('');
            
            listEl.querySelectorAll('.btn-danger').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = parseInt(e.currentTarget.dataset.id, 10);
                    if (confirm('この種類を削除しますか？')) {
                        try {
                            await db.trap_type.delete(id);
                            renderTrapTypeList(); 
                        } catch (err) {
                            alert(`削除に失敗: ${err.message}`);
                        }
                    }
                });
            });
            
        } catch (err) {
            listEl.innerHTML = `<div class="error-box">読み込み失敗</div>`;
        }
    }
    
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
            input.value = ''; 
            errorEl.textContent = '';
            renderTrapTypeList(); 
        } catch (err) {
            if (err.name === 'ConstraintError') {
                errorEl.textContent = 'その名前は既に使用されています。';
            } else {
                errorEl.textContent = `追加に失敗: ${err.message}`;
            }
        }
    });
    
    renderTrapTypeList();
}