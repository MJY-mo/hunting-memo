// このファイルは catch.js です (ロジック修正版)
// ★ 修正: 'db.catch' を 'db.catch_records' に変更
// ★ 修正: DBスキーマ v3/v4 に対応
// ★ 修正: Dexieのクエリロジックを修正 (orderBy)

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
    
    if (appState.currentCatchMethod !== 'all') {
        filters.method = 'all';
        filters.species = '';
        filters.gender = 'all';
        filters.age = 'all';
        appState.catchSort.key = 'catch_date';
        appState.catchSort.order = 'desc';
    }
    
    const sort = appState.catchSort;

    let html = `
        <div class="space-y-4">
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">絞り込み</h2>
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
                </div>

                <div class="form-group mt-4 mb-0">
                    <label class="form-label">ソート:</label>
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
                
                <button id="catch-filter-reset" class="btn btn-secondary w-full mt-4">フィルターリセット</button>
            </div>

            <div id="catch-list" class="space-y-3">
                <p class="text-gray-500 text-center py-4">読み込み中...</p>
            </div>
        </div>
    `;
    
    app.innerHTML = html;

    // ヘッダーの制御
    if (appState.currentCatchMethod === 'trap') {
        updateHeader('罠の捕獲記録', true);
        backButton.onclick = () => showTrapDetailPage(appState.currentCatchRelationId);
        headerActions.innerHTML = ''; 
    } else if (appState.currentCatchMethod === 'gun') {
        updateHeader('銃の捕獲記録', true);
        backButton.onclick = () => showGunLogDetailPage(appState.currentCatchRelationId);
        headerActions.innerHTML = '';
    } else {
        updateHeader('捕獲記録', false);
        
        headerActions.innerHTML = ''; // クリア
        const newButton = document.createElement('button');
        newButton.id = 'new-catch-button-general';
        newButton.className = 'btn btn-primary';
        newButton.textContent = '新規登録';
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
 * ★★★ ロジック修正 ★★★
 */
async function renderCatchList() {
    const listElement = document.getElementById('catch-list');
    if (!listElement) return;
    
    listElement.innerHTML = `<p class="text-gray-500 text-center py-4">読み込み中...</p>`;

    try {
        let query = db.catch_records;
        const filters = appState.catchFilters;
        
        // --- 絞り込み (インデックスが使えるもの) ---
        // 1. 特定の罠/銃からの遷移 (最優先)
        if (appState.currentCatchMethod === 'trap') {
            query = query.where('trap_id').equals(appState.currentCatchRelationId);
        } else if (appState.currentCatchMethod === 'gun') {
            query = query.where('gun_log_id').equals(appState.currentCatchRelationId);
        }

        // --- ソート ---
        const sortKey = appState.catchSort.key;
        const sortOrder = appState.catchSort.order;
        
        // 2. ソート (インデックスを利用)
        // (db.js v4 で 'catch_date', 'species_name' をインデックスに追加した)
        query = query.orderBy(sortKey);

        // 3. 昇順/降順
        if (sortOrder === 'desc') {
            query = query.reverse(); 
        }

        // 4. ★★★ データベースから配列として取得 ★★★
        let catches = await query.toArray();

        // 5. ★★★ フィルター (JavaScript側で実行) ★★★

        // 5.1. 方法
        if (filters.method === 'trap') {
            catches = catches.filter(c => c.trap_id > 0);
        } else if (filters.method === 'gun') {
            catches = catches.filter(c => c.gun_log_id > 0);
        }
        
        // 5.2. 種名
        if (filters.species) {
            const speciesFilter = filters.species.toLowerCase();
            catches = catches.filter(c => c.species_name && c.species_name.toLowerCase().includes(speciesFilter));
        }
        
        // 5.3. 性別
        if (filters.gender !== 'all') {
            catches = catches.filter(c => c.gender === filters.gender);
        }
        
        // 5.4. 年齢
        if (filters.age !== 'all') {
            catches = catches.filter(c => c.age === filters.age);
        }

        if (catches.length === 0) {
            listElement.innerHTML = `<p class="text-gray-500 text-center py-4">該当する捕獲記録はありません。</p>`;
            return;
        }

        // --- HTML構築 ---
        let listItems = '';
        for (const record of catches) {
            let relationText = '';
            if (record.trap_id) {
                const trap = await db.trap.get(record.trap_id);
                relationText = trap 
                    ? `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-blue-600 bg-blue-200">${escapeHTML(trap.trap_number)}</span>`
                    : `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-gray-600 bg-gray-200">罠(削除済)</span>`;
            } else if (record.gun_log_id) {
                const log = await db.gun_log.get(record.gun_log_id);
                if (log) {
                    const gun = await db.gun.get(log.gun_id);
                    relationText = gun
                        ? `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-purple-600 bg-purple-200">${escapeHTML(gun.name)}</span>`
                        : `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-purple-600 bg-purple-200">銃(削除済)</span>`;
                } else {
                    relationText = `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-gray-600 bg-gray-200">銃使用(削除済)</span>`;
                }
            } else {
                relationText = `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-gray-600 bg-gray-200">直接記録</span>`;
            }

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

        listElement.querySelectorAll('.trap-card').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id, 10);
                showCatchDetailPage(id);
            });
        });

    } catch (err) {
        console.error("Failed to render catch list:", err);
        listElement.innerHTML = `<div class="error-box">捕獲記録の読み込みに失敗しました。</div>`;
    }
}


// --- 捕獲記録 (詳細) ---------------------------------
// (このセクションは修正なし)
async function showCatchDetailPage(id) {
    try {
        const record = await db.catch_records.get(id);
        if (!record) {
            app.innerHTML = `<div class="error-box">該当するデータが見つかりません。</div>`;
            return;
        }

        let relationHTML = '';
        if (record.trap_id) {
            const trap = await db.trap.get(record.trap_id);
            relationHTML = `
                <div class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">関連する罠</h2>
                    <button id="relation-link-btn" class="btn btn-secondary w-full" data-trap-id="${record.trap_id}">
                        ${trap ? `${escapeHTML(trap.trap_number)} (${escapeHTML(trap.type)})` : '削除された罠'}
                    </button>
                </div>
            `;
        } else if (record.gun_log_id) {
            const log = await db.gun_log.get(record.gun_log_id);
            relationHTML = `
                <div class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">関連する銃使用履歴</h2>
            `;
            if (log) {
                const gun = await db.gun.get(log.gun_id);
                relationHTML += `
                    <button id="relation-link-btn" class="btn btn-secondary w-full" data-gun-log-id="${record.gun_log_id}">
                        ${gun ? escapeHTML(gun.name) : '不明な銃'} (${formatDate(log.use_date)})
                    </button>`;
            } else {
                relationHTML += `<p class="text-gray-500">関連する履歴は削除されました。</p>`;
            }
            relationHTML += `</div>`;
        } else {
             relationHTML = `
                <div class="card">
                    <p class="text-sm text-gray-500">この捕獲は、罠や銃使用履歴に紐付いていません。</p>
                </div>
            `;
        }

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
        
        let memoHTML = '';
        if (record.memo) {
            memoHTML = `
                <div class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">メモ</h2>
                    <p class="text-sm text-gray-700 leading-relaxed">
                        ${escapeHTML(record.memo).replace(/\n/g, '<br>')}
                    </p>
                </div>
            `;
        }

        app.innerHTML = `
            <div class="space-y-4">
                ${relationHTML}
                ${imageHTML}
                ${tableHTML}
                ${memoHTML}
            </div>
        `;

        updateHeader('捕獲記録 詳細', true);
        backButton.onclick = () => {
            showCatchListPage();
        };

        headerActions.innerHTML = ''; // クリア
        
        const editButton = document.createElement('button');
        editButton.className = 'btn btn-secondary';
        editButton.textContent = '編集';
        editButton.onclick = () => showCatchEditForm(id);
        headerActions.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger ml-2';
        deleteButton.textContent = '削除';
        deleteButton.onclick = () => deleteCatchRecord(id);
        headerActions.appendChild(deleteButton);
        
        const imgElement = document.getElementById('detail-image');
        if (imgElement) {
            imgElement.addEventListener('click', () => {
                showImageModal(imgElement.src); 
            });
        }
        
        const relationBtn = document.getElementById('relation-link-btn');
        if (relationBtn) {
            if (relationBtn.dataset.trapId) {
                relationBtn.addEventListener('click', () => showTrapDetailPage(parseInt(relationBtn.dataset.trapId, 10)));
            } else if (relationBtn.dataset.gunLogId) {
                relationBtn.addEventListener('click', () => showGunLogDetailPage(parseInt(relationBtn.dataset.gunLogId, 10)));
            }
        }

    } catch (err) {
        console.error("Failed to show catch detail:", err);
        app.innerHTML = `<div class="error-box">詳細の読み込みに失敗しました: ${err.message}</div>`;
    }
}


// --- 捕獲記録 (編集/新規) -----------------------------
// (このセクションは修正なし)
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

    updateHeader(pageTitle, true);
    backButton.onclick = () => {
        if (id) {
            showCatchDetailPage(id); 
        } else {
            showCatchListPage(); 
        }
    };

    loadSpeciesDataList();
    
    document.getElementById('get-catch-gps-btn').addEventListener('click', async (e) => {
        const button = e.currentTarget;
        const originalText = button.innerHTML;
        button.innerHTML = '測位中...';
        button.disabled = true;
        
        try {
            const location = await getCurrentLocation(); 
            document.getElementById('catch-latitude').value = location.latitude;
            document.getElementById('catch-longitude').value = location.longitude;
        } catch (err) {
            document.getElementById('form-error').textContent = err.message;
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    });
    
    const imageInput = document.getElementById('catch-image');
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
            record.image_blob = null; 
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

async function loadSpeciesDataList() {
    const datalist = document.getElementById('species-datalist');
    if (!datalist) return;
    
    try {
        const animals = await db.game_animal_list.where('is_game_animal').equals('〇').toArray();
        const speciesNames = [...new Set(animals.map(a => a.species_name))];
        
        datalist.innerHTML = speciesNames.map(name => 
            `<option value="${escapeHTML(name)}"></option>`
        ).join('');
        
    } catch (err) {
        console.error("Failed to load species datalist:", err);
    }
}


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