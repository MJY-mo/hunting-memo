// このファイルは catch.js です
// ★ 修正: 'db.catch' を 'db.catch_records' に変更
// ★ 修正: 2025/11/15 ユーザー指摘のUI・ロジック修正を適用
// ★ 修正: trap.js と同様の新しいUI (Tailwind CSS) に全面書き換え

/**
 * 「捕獲記録」タブのメインページを表示する
 */
function showCatchPage() {
    appState.currentCatchMethod = 'all';
    appState.currentCatchRelationId = null;
    showCatchListPage();
}

/**
 * 捕獲記録の「一覧ページ」を表示する
 */
async function showCatchListPage() {
    const filters = appState.catchFilters;
    
    // 罠や銃から来た場合はフィルターをリセット
    if (appState.currentCatchMethod !== 'all') {
        Object.assign(filters, {
            method: 'all', species: '', gender: 'all', age: 'all'
        });
        Object.assign(appState.catchSort, {
            key: 'catch_date', order: 'desc'
        });
    }
    
    const sort = appState.catchSort;

    let html = `
        <div class="space-y-4">
            <div class="card">
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group mb-0">
                        <label for="catch-filter-method" class="form-label">方法:</label>
                        <select id="catch-filter-method" class="form-select">
                            <option value="all" ${filters.method === 'all' ? 'selected' : ''}>すべて</option>
                            <option value="trap" ${filters.method === 'trap' ? 'selected' : ''}>罠</option>
                            <option value="gun" ${filters.method === 'gun' ? 'selected' : ''}>銃</option>
                        </select>
                    </div>
                    
                    <div class="form-group mb-0">
                        <label for="catch-filter-species" class="form-label">種名:</label>
                        <input type="text" id="catch-filter-species" class="form-input" value="${escapeHTML(filters.species)}" placeholder="例: イノシシ">
                    </div>
                    
                    <div class="form-group mb-0">
                        <label for="catch-filter-gender" class="form-label">性別:</label>
                        <select id="catch-filter-gender" class="form-select">
                            <option value="all" ${filters.gender === 'all' ? 'selected' : ''}>すべて</option>
                            <option value="オス" ${filters.gender === 'オス' ? 'selected' : ''}>オス</option>
                            <option value="メス" ${filters.gender === 'メス' ? 'selected' : ''}>メス</option>
                            <option value="不明" ${filters.gender === '不明' ? 'selected' : ''}>不明</option>
                        </select>
                    </div>
                    
                    <div class="form-group mb-0">
                        <label for="catch-filter-age" class="form-label">年齢:</label>
                        <select id="catch-filter-age" class="form-select">
                            <option value="all" ${filters.age === 'all' ? 'selected' : ''}>すべて</option>
                            <option value="成獣" ${filters.age === '成獣' ? 'selected' : ''}>成獣</option>
                            <option value="亜成獣" ${filters.age === '亜成獣' ? 'selected' : ''}>亜成獣</option>
                            <option value="幼獣" ${filters.age === '幼獣' ? 'selected' : ''}>幼獣</option>
                            <option value="不明" ${filters.age === '不明' ? 'selected' : ''}>不明</option>
                        </select>
                    </div>

                    <div class="form-group mb-0 col-span-2">
                        <label for="catch-sort-key" class="form-label">ソート:</label>
                        <div class="flex space-x-2">
                            <select id="catch-sort-key" class="form-select">
                                <option value="catch_date" ${sort.key === 'catch_date' ? 'selected' : ''}>捕獲日</option>
                                <option value="species_name" ${sort.key === 'species_name' ? 'selected' : ''}>種名</option>
                            </select>
                            <select id="catch-sort-order" class="form-select w-24">
                                <option value="desc" ${sort.order === 'desc' ? 'selected' : ''}>降順</option>
                                <option value="asc" ${sort.order === 'asc' ? 'selected' : ''}>昇順</option>
                            </select>
                        </div>
                    </div>
                    
                    <button id="catch-filter-reset" class="btn btn-secondary col-span-2">リセット</button>
                </div>
            </div>

            <div id="catch-list" class="space-y-3">
                <p class="text-gray-500 text-center py-4">読み込み中...</p>
            </ul>
        </div>
    `;
    
    app.innerHTML = html;
    headerActions.innerHTML = ''; // ヘッダーボタンをクリア

    // ヘッダーの制御
    if (appState.currentCatchMethod === 'trap') {
        updateHeader('罠の捕獲記録', true);
        backButton.onclick = () => showTrapDetailPage(appState.currentCatchRelationId);
    } else if (appState.currentCatchMethod === 'gun') {
        updateHeader('銃の捕獲記録', true);
        backButton.onclick = () => showGunLogDetailPage(appState.currentCatchRelationId);
    } else {
        // 通常のタブ表示
        updateHeader('捕獲記録', false);
        
        // 新規登録ボタン（総合）
        const newButton = document.createElement('button');
        newButton.id = 'new-catch-button-general';
        newButton.className = 'btn btn-primary';
        newButton.textContent = '新規記録';
        newButton.onclick = () => {
            showCatchEditForm(null, { trapId: null, gunLogId: null });
        };
        headerActions.appendChild(newButton);
    }
    
    // --- イベントリスナー設定 ---
    
    const setupFilterListener = (id, stateKey, stateSubKey = null) => {
        document.getElementById(id).addEventListener('change', (e) => {
            if (stateSubKey) {
                appState[stateKey][stateSubKey] = e.target.value;
            } else {
                appState[stateKey] = e.target.value;
            }
            renderCatchList();
        });
    };

    setupFilterListener('catch-filter-method', 'catchFilters', 'method');
    setupFilterListener('catch-filter-gender', 'catchFilters', 'gender');
    setupFilterListener('catch-filter-age', 'catchFilters', 'age');
    setupFilterListener('catch-sort-key', 'catchSort', 'key');
    setupFilterListener('catch-sort-order', 'catchSort', 'order');

    document.getElementById('catch-filter-species').addEventListener('input', (e) => {
        appState.catchFilters.species = e.target.value;
        renderCatchList();
    });

    document.getElementById('catch-filter-reset').addEventListener('click', () => {
        appState.catchFilters.method = 'all';
        appState.catchFilters.species = '';
        appState.catchFilters.gender = 'all';
        appState.catchFilters.age = 'all';
        appState.catchSort.key = 'catch_date';
        appState.catchSort.order = 'desc';
        showCatchListPage();
    });

    await renderCatchList();
}

/**
 * 捕獲リストを描画する (フィルタリング実行)
 */
async function renderCatchList() {
    const listElement = document.getElementById('catch-list');
    if (!listElement) return;
    
    listElement.innerHTML = `<p class="text-gray-500 text-center py-4">読み込み中...</p>`;

    try {
        let query = db.catch_records;
        const filters = appState.catchFilters;
        
        // --- フィルタリング (Dexie) ---
        if (filters.method === 'trap') {
            query = query.where('trap_id').notEqual(0);
        } else if (filters.method === 'gun') {
            query = query.where('gun_log_id').notEqual(0);
        }
        if (filters.gender !== 'all') {
            query = query.where('gender').equals(filters.gender);
        }
        if (filters.age !== 'all') {
            query = query.where('age').equals(filters.age);
        }
        if (appState.currentCatchMethod === 'trap') {
            query = query.where('trap_id').equals(appState.currentCatchRelationId);
        } else if (appState.currentCatchMethod === 'gun') {
            query = query.where('gun_log_id').equals(appState.currentCatchRelationId);
        }

        // --- ソート ---
        const sortKey = appState.catchSort.key;
        query = query.orderBy(sortKey);
        
        const catches = await query.toArray();
        
        if (appState.catchSort.order === 'desc') {
            catches.reverse();
        }

        // --- フィルタリング (JS) ---
        let filteredCatches = catches;
        if (filters.species) {
            const speciesFilter = filters.species.toLowerCase();
            filteredCatches = catches.filter(c => c.species_name && c.species_name.toLowerCase().includes(speciesFilter));
        }

        if (filteredCatches.length === 0) {
            listElement.innerHTML = `<p class="text-gray-500 text-center py-4">該当する捕獲記録はありません。</p>`;
            return;
        }

        // --- HTML構築 ---
        let listItems = '';
        for (const record of filteredCatches) {
            let relationText = '';
            if (record.trap_id) {
                const trap = await db.trap.get(record.trap_id);
                relationText = trap 
                    ? `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-blue-600 bg-blue-200">${escapeHTML(trap.trap_number)}</span>`
                    : `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-gray-600 bg-gray-200">罠 (削除済)</span>`;
            } else if (record.gun_log_id) {
                const log = await db.gun_log.get(record.gun_log_id);
                if (log) {
                    const gun = await db.gun.get(log.gun_id);
                    relationText = gun
                        ? `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-red-600 bg-red-200">${escapeHTML(gun.name)}</span>`
                        : `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-gray-600 bg-gray-200">銃 (削除済)</span>`;
                } else {
                    relationText = `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-gray-600 bg-gray-200">銃使用 (削除済)</span>`;
                }
            } else {
                relationText = `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-gray-600 bg-gray-200">直接記録</span>`;
            }

            // trap-card と同じスタイルを適用
            listItems += `
                <div class="trap-card" data-id="${record.id}">
                    <div class="flex-grow">
                        <h3 class="text-lg font-semibold text-blue-600">${escapeHTML(record.species_name)}</h3>
                        <p class="text-sm">${formatDate(record.catch_date)}</p>
                    </div>
                    <div class="flex-shrink-0 ml-4 flex items-center space-x-2">
                        ${relationText}
                        <span>&gt;</span>
                    </div>
                </div>
            `;
        }
        
        listElement.innerHTML = listItems;

        // --- クリックイベント ---
        listElement.querySelectorAll('.trap-card').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id, 10);
                showCatchDetailPage(id);
            });
        });

    } catch (err) {
        console.error("Failed to render catch list:", err);
        listElement.innerHTML = `<div class="error-box">捕獲記録の読み込みに失敗しました: ${err.message}</div>`;
    }
}


// --- 捕獲記録 (詳細) ---------------------------------

async function showCatchDetailPage(id) {
    try {
        const record = await db.catch_records.get(id);
        if (!record) {
            app.innerHTML = `<div class="error-box">該当するデータが見つかりません。</div>`;
            return;
        }

        // --- 編集・削除ボタン ---
        const editButtonsHTML = `
            <div class="card">
                <div class="flex space-x-2">
                    <button id="edit-catch-btn" class="btn btn-secondary flex-1">編集</button>
                    <button id="delete-catch-btn" class="btn btn-danger flex-1">削除</button>
                </div>
            </div>
        `;

        // --- 関連情報の表示 ---
        let relationHTML = '';
        if (record.trap_id) {
            const trap = await db.trap.get(record.trap_id);
            relationHTML = `
                <div class="card cursor-pointer" id="relation-link" data-trap-id="${record.trap_id}">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">関連する罠</h2>
                    <p>${trap ? `${escapeHTML(trap.trap_number)} (${escapeHTML(trap.type)})` : '削除された罠'}</p>
                </div>
            `;
        } else if (record.gun_log_id) {
            const log = await db.gun_log.get(record.gun_log_id);
            if (log) {
                const gun = await db.gun.get(log.gun_id);
                relationHTML = `
                    <div class="card cursor-pointer" id="relation-link" data-gun-log-id="${record.gun_log_id}">
                        <h2 class="text-lg font-semibold border-b pb-2 mb-4">関連する銃使用履歴</h2>
                        <p>${gun ? escapeHTML(gun.name) : '不明な銃'} (${formatDate(log.use_date)})</p>
                    </div>
                `;
            }
        } else {
             relationHTML = `
                <div class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">関連</h2>
                    <p class="text-sm text-gray-500">この捕獲は、罠や銃使用履歴に紐付いていません。</p>
                </div>
            `;
        }

        // --- 画像の表示 ---
        let imageHTML = '';
        if (record.image_blob) {
            const blobUrl = URL.createObjectURL(record.image_blob);
            imageHTML = `
                <div class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">写真</h2>
                    <div class="photo-preview cursor-zoom-in">
                        <img src="${blobUrl}" alt="捕獲写真" id="detail-image" class="clickable-image">
                    </div>
                </div>
            `;
        }

        // --- 基本情報のテーブル ---
        const tableData = [
            { label: '種名', value: record.species_name },
            { label: '捕獲日', value: formatDate(record.catch_date) },
            { label: '性別', value: record.gender },
            { label: '年齢', value: record.age },
            { label: '緯度', value: record.latitude },
            { label: '経度', value: record.longitude },
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
        
        // --- メモ ---
        let memoHTML = '';
        if (record.memo) {
            memoHTML = `
                <div class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">メモ</h2>
                    <p class="text-sm text-gray-700 leading-relaxed">${escapeHTML(record.memo).replace(/\n/g, '<br>')}</p>
                </div>
            `;
        }

        app.innerHTML = `
            <div class="space-y-4">
                ${editButtonsHTML}
                ${relationHTML}
                ${imageHTML}
                ${tableHTML}
                ${memoHTML}
            </div>
        `;

        // --- ヘッダーの更新 ---
        updateHeader('捕獲記録 詳細', true);
        backButton.onclick = () => {
            // 状態に応じてリストに戻る
            showCatchListPage();
        };
        headerActions.innerHTML = ''; // ヘッダーボタンはクリア

        // --- イベントリスナー ---
        
        document.getElementById('edit-catch-btn').onclick = () => showCatchEditForm(id);
        document.getElementById('delete-catch-btn').onclick = () => deleteCatchRecord(id);

        const imgElement = document.getElementById('detail-image');
        if (imgElement) {
            imgElement.addEventListener('click', () => {
                showImageModal(imgElement.src);
            });
            backButton.addEventListener('click', () => {
                URL.revokeObjectURL(imgElement.src);
            }, { once: true });
        }
        
        const relationLink = document.getElementById('relation-link');
        if (relationLink) {
            if (relationLink.dataset.trapId) {
                relationLink.addEventListener('click', () => showTrapDetailPage(parseInt(relationLink.dataset.trapId, 10)));
            } else if (relationLink.dataset.gunLogId) {
                relationLink.addEventListener('click', () => showGunLogDetailPage(parseInt(relationLink.dataset.gunLogId, 10)));
            }
        }

    } catch (err) {
        console.error("Failed to show catch detail:", err);
        app.innerHTML = `<div class="error-box">詳細の読み込みに失敗しました: ${err.message}</div>`;
    }
}


// --- 捕獲記録 (編集/新規) -----------------------------

async function showCatchEditForm(id, relationIds = null) {
    let record = {
        trap_id: relationIds?.trapId || null,
        gun_log_id: relationIds?.gunLogId || null,
        catch_date: new Date().toISOString().split('T')[0],
        species_name: '',
        gender: '不明',
        age: '不明',
        memo: '',
        image_blob: null,
        latitude: '',
        longitude: ''
    };
    
    let pageTitle = '新規捕獲記録';
    let currentImageHTML = '';

    if (id) {
        pageTitle = '捕獲記録の編集';
        const existingRecord = await db.catch_records.get(id);
        if (existingRecord) {
            record = existingRecord;
            
            if (record.image_blob) {
                const blobUrl = URL.createObjectURL(record.image_blob);
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
            <form id="catch-form" class="space-y-4">
                <div class="form-group">
                    <label for="catch-species" class="form-label">種名 <span class="text-red-500">*</span>:</label>
                    <input type="text" id="catch-species" class="form-input" value="${escapeHTML(record.species_name)}" required list="species-datalist">
                    <datalist id="species-datalist">
                        </datalist>
                </div>

                <div class="form-group">
                    <label for="catch-date" class="form-label">捕獲日 <span class="text-red-500">*</span>:</label>
                    <input type="date" id="catch-date" class="form-input" value="${escapeHTML(record.catch_date)}" required>
                </div>

                <div class="form-group">
                    <label for="catch-gender" class="form-label">性別:</label>
                    <select id="catch-gender" class="form-select">
                        <option value="不明" ${record.gender === '不明' ? 'selected' : ''}>不明</option>
                        <option value="オス" ${record.gender === 'オス' ? 'selected' : ''}>オス</option>
                        <option value="メス" ${record.gender === 'メス' ? 'selected' : ''}>メス</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="catch-age" class="form-label">年齢:</label>
                    <select id="catch-age" class="form-select">
                        <option value="不明" ${record.age === '不明' ? 'selected' : ''}>不明</option>
                        <option value="成獣" ${record.age === '成獣' ? 'selected' : ''}>成獣</option>
                        <option value="亜成獣" ${record.age === '亜成獣' ? 'selected' : ''}>亜成獣</option>
                        <option value="幼獣" ${record.age === '幼獣' ? 'selected' : ''}>幼獣</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">位置情報</label>
                    <div class="grid grid-cols-2 gap-4">
                        <input type="number" step="any" id="catch-latitude" class="form-input" value="${escapeHTML(record.latitude)}" placeholder="緯度">
                        <input type="number" step="any" id="catch-longitude" class="form-input" value="${escapeHTML(record.longitude)}" placeholder="経度">
                    </div>
                    <button type="button" id="get-catch-gps-btn" class="btn btn-secondary w-full mt-2">
                        現在地を取得
                    </button>
                </div>

                ${currentImageHTML}
                <div class="form-group">
                    <label for="catch-image" class="form-label">${id && record.image_blob ? '写真を変更:' : '写真を追加:'}</label>
                    <input type="file" id="catch-image" class="form-input" accept="image/*">
                    <div id="image-preview-container" class="mt-2"></div>
                </div>

                <div class="form-group">
                    <label for="catch-memo" class="form-label">メモ:</label>
                    <textarea id="catch-memo" rows="4" class="form-input">${escapeHTML(record.memo)}</textarea>
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
    
    // ★ 修正(8): 戻るボタンの遷移先を動的に変更
    backButton.onclick = () => {
        if (id) {
            // 編集中の場合: 詳細ページに戻る
            showCatchDetailPage(id); 
        } else if (relationIds && relationIds.trapId) {
            // 新規 (罠から): 罠の詳細ページに戻る
            showTrapDetailPage(relationIds.trapId); 
        } else if (relationIds && relationIds.gunLogId) {
            // 新規 (銃から): 銃の詳細ページに戻る
            showGunLogDetailPage(relationIds.gunLogId);
        } else {
            // 新規 (総合): 捕獲リストに戻る
            showCatchListPage();
        }
    };

    // --- フォームの動的処理 ---

    // ★ 修正(6): 罠からの呼び出しかどうかを判定
    const isTrapCatch = (relationIds && relationIds.trapId != null);
    // 1. 図鑑から種名リストをdatalistに読み込む (哺乳類フィルターを渡す)
    loadSpeciesDataList(isTrapCatch);
    
    // 2. GPS取得ボタン
    document.getElementById('get-catch-gps-btn').addEventListener('click', async (e) => {
        const button = e.currentTarget;
        const originalText = button.innerHTML;
        button.innerHTML = '測位中...';
        button.disabled = true;
        
        try {
            const location = await getCurrentLocation(); // (main.js の共通関数)
            document.getElementById('catch-latitude').value = location.latitude;
            document.getElementById('catch-longitude').value = location.longitude;
        } catch (err) {
            document.getElementById('form-error').textContent = err.message;
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    });
    
    // 3. 画像プレビュー処理
    const imageInput = document.getElementById('catch-image');
    const previewContainer = document.getElementById('image-preview-container');
    let resizedImageBlob = null; // リサイズ後のBlobを保持

    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) {
            previewContainer.innerHTML = '';
            resizedImageBlob = null;
            return;
        }
        
        previewContainer.innerHTML = `<p class="text-gray-500">画像処理中...</p>`;
        
        try {
            resizedImageBlob = await resizeImage(file, 800); // (main.js の共通関数)
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
    
    // 4. 既存写真の削除ボタン
    const removeBtn = document.getElementById('remove-image-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            const currentImageDiv = removeBtn.closest('.form-group');
            if (currentImageDiv) currentImageDiv.remove();
            record.image_blob = null; 
            currentImageHTML = '<div class="form-group"><label class="form-label">現在の写真:</label><p class="text-gray-500">(削除されます)</p></div>'; 
        });
    }

    // 5. 画像モーダル (既存画像)
    const currentImg = document.getElementById('current-image');
    if (currentImg) {
        currentImg.addEventListener('click', () => {
            showImageModal(currentImg.src);
        });
        backButton.addEventListener('click', () => {
             URL.revokeObjectURL(currentImg.src);
        }, { once: true });
    }

    // 6. フォーム保存処理
    document.getElementById('catch-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const species = document.getElementById('catch-species').value;
        const date = document.getElementById('catch-date').value;
        
        if (!species || !date) {
            document.getElementById('form-error').textContent = '種名と捕獲日は必須です。';
            return;
        }
        
        const formData = {
            trap_id: record.trap_id,
            gun_log_id: record.gun_log_id,
            catch_date: date,
            species_name: species,
            gender: document.getElementById('catch-gender').value,
            age: document.getElementById('catch-age').value,
            latitude: document.getElementById('catch-latitude').value,
            longitude: document.getElementById('catch-longitude').value,
            memo: document.getElementById('catch-memo').value,
            image_blob: record.image_blob
        };

        if (resizedImageBlob) {
            formData.image_blob = resizedImageBlob;
        }
        
        try {
            if (id) {
                await db.catch_records.put({ ...formData, id: id });
                showCatchDetailPage(id); 
            } else {
                const newId = await db.catch_records.add(formData);
                showCatchDetailPage(newId); 
            }
        } catch (err) {
            console.error("Failed to save catch record:", err);
            document.getElementById('form-error').textContent = `保存に失敗しました: ${err.message}`;
        }
    });
}

/**
 * datalist用に図鑑から種名リストを読み込む
 * ★ 修正(6): 哺乳類のみに絞り込む機能を追加
 * @param {boolean} filterForMammals - 哺乳類のみに絞り込むか
 */
async function loadSpeciesDataList(filterForMammals = false) {
    const datalist = document.getElementById('species-datalist');
    if (!datalist) return;
    
    try {
        let query = db.game_animal_list.where('is_game_animal').equals('〇');

        // ★ 修正(6): 哺乳類フィルター
        if (filterForMammals) {
            query = query.where('category').equals('哺乳類');
        }

        const animals = await query.toArray();
        const speciesNames = [...new Set(animals.map(a => a.species_name))];
        
        datalist.innerHTML = speciesNames.map(name => 
            `<option value="${escapeHTML(name)}"></option>`
        ).join('');
        
    } catch (err) {
        console.error("Failed to load species datalist:", err);
    }
}


// --- 捕獲記録 (削除) ---------------------------------

async function deleteCatchRecord(id) {
    if (!confirm('この捕獲記録を本当に削除しますか？\nこの操作は元に戻せません。')) {
        return;
    }

    try {
        await db.catch_records.delete(id);
        showCatchListPage();
        
    } catch (err) {
        console.error("Failed to delete catch record:", err);
        alert(`削除に失敗しました: ${err.message}`);
    }
}