// このファイルは catch.js です

/**
 * 「捕獲」タブがクリックされたときに main.js から呼ばれるメイン関数
 */
function showCatchPage() {
    // デフォルトは全件表示
    showCatchListPage('all', null);
}

/**
 * 捕獲記録リストページを表示する
 * @param {string} method - 'all', 'trap', 'gun'
 * @param {number | null} relationId - 関連するID (trapId または gunLogId)
 */
async function showCatchListPage(method, relationId) {
    // グローバルな状態を保存 (編集画面から戻る時に使う)
    appState.currentPage = 'catch';
    appState.currentCatchMethod = method;
    appState.currentCatchRelationId = relationId;

    let title = '捕獲記録 (すべて)';
    let headerNote = ''; // ヘッダー下の注釈

    // ★★★ 修正: クエリの構築方法を .orderBy().filter() に変更 ★★★
    
    // 1. 最初に日付でソートするクエリを作成
    let query = db.catches.orderBy('catch_date');

    // 2. method と relationId に応じて絞り込み (filter) を行う
    if (method === 'trap') {
        const trap = await db.traps.get(relationId);
        title = `罠 [${trap.trap_number}] の捕獲`;
        headerNote = `<p class="text-sm text-gray-500 mb-3 -mt-3 text-center">罠: ${escapeHTML(trap.trap_number)}</p>`;
        
        query = query.filter(log => log.method === 'trap' && log.relation_id === relationId);

    } else if (method === 'gun') {
        const gunLog = await db.gun_logs.get(relationId);
        title = `銃使用履歴 [${formatDate(gunLog.use_date)}] の捕獲`;
        headerNote = `<p class="text-sm text-gray-500 mb-3 -mt-3 text-center">銃使用日: ${formatDate(gunLog.use_date)}</p>`;
        
        query = query.filter(log => log.method === 'gun' && log.relation_id === relationId);
    }
    // ★★★ 修正ここまで ★★★

    // タブが 'catch' でない場合 (罠や銃の編集画面から飛んできた場合)、
    // 戻るボタンを表示し、タブを 'catch' に強制的に設定
    const showBack = (method !== 'all');
    updateHeader(title, showBack);
    if (showBack) {
        // 戻るボタンの動作を上書き
        backButton.onclick = () => {
            if (method === 'trap') {
                showTrapEditForm(relationId);
            } else if (method === 'gun') {
                showGunLogEditForm(relationId);
            }
        };
        // タブを「捕獲」に強制的に合わせる
        Object.values(tabs).forEach(tab => tab.classList.replace('tab-active', 'tab-inactive'));
        tabs.catch.classList.replace('tab-inactive', 'tab-active');
    }

    app.innerHTML = `
        ${headerNote}
        ${(method !== 'all') ? `
            <div class="card mb-4">
                <button id="add-new-catch-btn" class="btn btn-primary w-full">
                    新しい捕獲個体を登録する
                </button>
            </div>
        ` : ''}
        
        <div id="catch-list-container" class="space-y-3">
            <p class="text-gray-500 text-center py-4">読み込み中...</p>
        </div>
    `;

    // 絞り込み/ソート済みのクエリを渡す
    await renderCatchList(query);

    // 新規登録ボタンのイベント
    if (method !== 'all') {
        document.getElementById('add-new-catch-btn').addEventListener('click', () => {
            showCatchEditForm(null, method, relationId);
        });
    }
}

/**
 * 捕獲個体リストをDBから読み込んで描画する
 * @param {Dexie.Collection} query - 実行するクエリ (★既にソート済み)
 */
async function renderCatchList(query) {
    const container = document.getElementById('catch-list-container');
    if (!container) return;

    try {
        // 罠と銃のマスタデータ (名前解決用)
        const traps = await db.traps.toArray();
        const trapMap = new Map(traps.map(t => [t.id, t.trap_number]));
        const gunLogs = await db.gun_logs.toArray();
        const gunLogMap = new Map(gunLogs.map(g => [g.id, formatDate(g.use_date)]));
        const guns = await db.guns.toArray();
        const gunMap = new Map(guns.map(g => [g.id, g.gun_name]));

        // ★★★ 修正: query は既に orderBy 済みなので、.reverse() だけ呼ぶ ★★★
        const logs = await query.reverse().toArray();
        
        if (logs.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">捕獲記録はありません。</p>`;
            return;
        }

        container.innerHTML = logs.map(log => {
            const species = log.species || '種類不明';
            const gender = log.gender || '性別不明';
            const age = log.age || '成幼不明';
            
            let sourceInfo = ''; // 捕獲手段
            if(log.method === 'trap') {
                sourceInfo = `罠: ${escapeHTML(trapMap.get(log.relation_id) || '不明')}`;
            } else if (log.method === 'gun') {
                const gunLog = gunLogs.find(g => g.id === log.relation_id);
                const gunName = gunLog ? gunMap.get(gunLog.gun_id) : '不明';
                sourceInfo = `銃: ${escapeHTML(gunName || '不明')} (${gunLogMap.get(log.relation_id) || '不明日'})`;
            }

            return `
                <div class="trap-card" data-id="${log.id}">
                    <div class="flex-grow min-w-0">
                        <h3 class="text-lg font-semibold text-blue-600 truncate">${formatDate(log.catch_date)}</h3>
                        <p class="text-sm text-gray-700 truncate">${escapeHTML(species)} (${gender}, ${age})</p>
                        <p class="text-sm text-gray-500 truncate">
                            ${sourceInfo}
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
                // method と relationId は現在のグローバル状態を引き継ぐ
                showCatchEditForm(logId, appState.currentCatchMethod, appState.currentCatchRelationId); 
            });
        });

    } catch (err) {
        console.error("Failed to render catch list:", err);
        container.innerHTML = `<div class="error-box">捕獲リストの読み込みに失敗しました。</div>`;
    }
}

/**
 * 捕獲個体の新規登録・編集フォームを表示する
 * @param {number | null} catchId 編集する個体のID (新規の場合は null)
 * @param {string} method - 'all', 'trap', 'gun'
 * @param {number | null} relationId - 関連するID (trapId または gunLogId)
 */
async function showCatchEditForm(catchId, method, relationId) {
    const isNew = (catchId === null);
    let log = {}; 

    // ★★★ 新規 (写真管理用) ★★★
    // フォーム内で一時的に保持するBlobの配列
    let newPhotoBlobs = []; 
    // 削除対象の既存Photo IDの配列
    let photosToDelete = [];

    // デフォルト値
    log = {
        catch_date: new Date().toISOString().split('T')[0], // 本日の日付
        method: method,
        relation_id: relationId,
        species: '',
        gender: '不明',
        age: '不明',
        // ★ 修正: 'hit_location' -> 'location_detail'
        location_detail: '' 
    };

    if (isNew) {
        updateHeader('新規の捕獲個体', true);
    } else {
        updateHeader('捕獲個体の編集', true);
        try {
            const loadedLog = await db.catches.get(catchId);
            if (!loadedLog) {
                alert('捕獲データが見つかりません。');
                showCatchListPage(method, relationId);
                return;
            }
            log = loadedLog; // DBからのデータで上書き
        } catch (err) {
            alert('捕獲データの取得に失敗しました。');
            showCatchListPage(method, relationId);
            return;
        }
    }

    // ★ 戻るボタンの動作を上書き
    backButton.onclick = () => {
        showCatchListPage(method, relationId);
    };

    // ★★★ 修正: ラベルを動的に変更 (ご要望 1 & 2) ★★★
    let locationLabel = '詳細位置';
    let locationPlaceholder = '';
    if (log.method === 'gun') {
        locationLabel = '着弾位置';
        locationPlaceholder = '例: 頸部、胸部';
    } else if (log.method === 'trap') {
        locationLabel = 'かかった位置';
        locationPlaceholder = '例: 右前脚、首';
    }

    app.innerHTML = `
        <form id="catch-form" class="card space-y-4">
            
            <div>
                <h3 class="text-lg font-semibold border-b pb-2 mb-4">基本情報</h3>
                <div class="space-y-4">
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div class="form-group">
                            <label for="catch_date" class="form-label">捕獲日</label>
                            <input type="date" id="catch_date" name="catch_date" value="${escapeHTML(log.catch_date || '')}" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label for="species" class="form-label">種類 (獣種名)</label>
                            <input type="text" id="species" name="species" value="${escapeHTML(log.species || '')}" class="form-input" placeholder="例: ニホンジカ" required>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="form-group">
                            <label for="gender" class="form-label">雌雄</label>
                            <select id="gender" name="gender" class="form-select">
                                <option value="不明" ${log.gender === '不明' ? 'selected' : ''}>不明</option>
                                <option value="オス" ${log.gender === 'オス' ? 'selected' : ''}>オス</option>
                                <option value="メス" ${log.gender === 'メス' ? 'selected' : ''}>メス</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="age" class="form-label">成幼</label>
                            <select id="age" name="age" class="form-select">
                                <option value="不明" ${log.age === '不明' ? 'selected' : ''}>不明</option>
                                <option value="成獣" ${log.age === '成獣' ? 'selected' : ''}>成獣</option>
                                <option value="幼獣" ${log.age === '幼獣' ? 'selected' : ''}>幼獣</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="location_detail" class="form-label">${locationLabel} (着弾位置/かかった位置)</label>
                        <input type="text" id="location_detail" name="location_detail" value="${escapeHTML(log.location_detail || '')}" class="form-input" placeholder="${locationPlaceholder}">
                    </div>
                </div>
            </div>

            <hr class="my-4">
            <div>
                <h3 class="text-lg font-semibold border-b pb-2 mb-4">写真</h3>
                <div id="photo-preview-container" class="grid grid-cols-3 gap-2 mb-3">
                    </div>
                <div class="form-group">
                    <label for="photo-upload" class="btn btn-secondary w-full">＋ 写真を選択</label>
                    <input type="file" id="photo-upload" class="hidden" accept="image/*" multiple>
                </div>
                <p id="photo-status" class="text-sm text-gray-500 text-center"></p>
            </div>
            
            <hr class="my-4">
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <button type="button" id="cancel-btn" class="btn btn-secondary">キャンセル</button>
                    <button type="submit" id="save-btn" class="btn btn-primary">保存</button>
                </div>
                ${!isNew ? `
                    <button type="button" id="delete-btn" class="btn btn-danger w-full mt-4">この捕獲記録を削除</button>
                ` : ''}
            </div>
        </form>
    `;

    // --- フォームのイベントリスナーを設定 ---

    // 1. キャンセルボタン
    document.getElementById('cancel-btn').addEventListener('click', () => {
        showCatchListPage(method, relationId);
    });

    // 2. 保存ボタン
    document.getElementById('catch-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const saveBtn = document.getElementById('save-btn');
        saveBtn.disabled = true;
        saveBtn.classList.add('btn-loading');
        saveBtn.textContent = '保存中...';

        const formData = new FormData(form);
        
        // データを整形
        const data = {
            catch_date: formData.get('catch_date'),
            species: formData.get('species').trim(),
            gender: formData.get('gender'),
            age: formData.get('age'),
            // ★ 修正: 'location_detail' を保存
            location_detail: formData.get('location_detail'),
            method: log.method,
            relation_id: log.relation_id
        };

        try {
            let savedCatchId = catchId;
            
            if (isNew) {
                // 新規の場合は、add() して新しいIDを取得
                savedCatchId = await db.catches.add(data);
            } else {
                // 編集の場合は、put()
                data.id = catchId; // 忘れずにIDをセット
                await db.catches.put(data);
            }
            
            // ★★★ 新規 (写真保存処理) ★★★
            // 1. 削除対象の写真をDBから削除
            if (photosToDelete.length > 0) {
                await db.photos.bulkDelete(photosToDelete);
            }
            // 2. 新規追加のBlobをDBに保存
            if (newPhotoBlobs.length > 0) {
                const photosToAdd = newPhotoBlobs.map(blob => ({
                    catch_id: savedCatchId,
                    image_data: blob
                }));
                await db.photos.bulkAdd(photosToAdd);
            }
            
            showCatchListPage(method, relationId); // 保存後にリストに戻る

        } catch (err) {
            console.error("Failed to save catch log:", err);
            alert(`保存に失敗しました: ${err.message}`);
            saveBtn.disabled = false;
            saveBtn.classList.remove('btn-loading');
            saveBtn.textContent = '保存';
        }
    });

    // 3. 削除ボタン（編集時のみ）
    if (!isNew) {
        document.getElementById('delete-btn').addEventListener('click', async () => {
            if (window.confirm(`この捕獲記録（${log.species}）を本当に削除しますか？\n（関連する写真もすべて削除されます）`)) {
                try {
                    // ★ 修正: 関連する写真も削除
                    await db.photos.where('catch_id').equals(catchId).delete();
                    await db.catches.delete(catchId);
                    
                    alert('捕獲記録と関連写真を削除しました。');
                    showCatchListPage(method, relationId);
                } catch (err) {
                    console.error("Failed to delete catch log:", err);
                    alert(`削除に失敗しました: ${err.message}`);
                }
            }
        });
    }

    // ★★★ 新規 (写真機能のリスナー) ★★★
    const photoInput = document.getElementById('photo-upload');
    const photoPreviewContainer = document.getElementById('photo-preview-container');
    const photoStatus = document.getElementById('photo-status');
    
    // 写真プレビューを描画する内部関数
    const renderPhotoList = async () => {
        photoPreviewContainer.innerHTML = ''; // いったんクリア
        
        // 1. 既存の写真をDBから読み込む
        if (!isNew) {
            const existingPhotos = await db.photos.where('catch_id').equals(catchId).toArray();
            existingPhotos.forEach(photo => {
                // 削除対象に含まれていなければ表示
                if (!photosToDelete.includes(photo.id)) {
                    let url;
                    try {
                        url = URL.createObjectURL(photo.image_data);
                    } catch (e) {
                        console.error("Failed to create ObjectURL for existing photo:", e);
                        return; // Blobが不正ならスキップ
                    }
                    
                    const div = document.createElement('div');
                    div.className = 'relative';
                    div.innerHTML = `
                        <img src="${url}" class="w-full h-24 object-cover rounded shadow" alt="既存の写真">
                        <button class="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm" data-photoid="${photo.id}">×</button>
                    `;
                    div.querySelector('button').onclick = (e) => {
                        e.preventDefault();
                        if (window.confirm('この写真を削除しますか？')) {
                            photosToDelete.push(photo.id); // 削除リストに追加
                            div.remove(); // 画面から削除
                        }
                    };
                    photoPreviewContainer.appendChild(div);
                }
            });
        }
        
        // 2. 新規追加のBlobを表示 (newPhotoBlobs)
        newPhotoBlobs.forEach((blob, index) => {
            const url = URL.createObjectURL(blob);
            const div = document.createElement('div');
            div.className = 'relative opacity-80'; // 新規追加は少し薄く
            div.innerHTML = `
                <img src="${url}" class="w-full h-24 object-cover rounded shadow" alt="新規の写真">
                <button class="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm" data-blobindex="${index}">×</button>
            `;
            div.querySelector('button').onclick = (e) => {
                e.preventDefault();
                newPhotoBlobs.splice(index, 1); // 配列から削除
                renderPhotoList(); // リストを再描画
            };
            photoPreviewContainer.appendChild(div);
        });

        // メモリリーク防止のため、表示に使ったObject URLをクリーンアップ
        // (非同期で実行)
        setTimeout(() => {
            photoPreviewContainer.querySelectorAll('img').forEach(img => {
                // img.src が "blob:..." で始まっているか確認
                if (img.src.startsWith('blob:')) {
                    URL.revokeObjectURL(img.src);
                }
            });
        }, 1000);
    };

    // 写真ファイルが選択された時の処理
    photoInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        photoStatus.textContent = `写真${files.length}件をリサイズ中...`;
        
        try {
            const resizePromises = [];
            for (const file of files) {
                // main.js の resizeImage を呼び出す
                resizePromises.push(resizeImage(file, 800));
            }
            
            const resizedBlobs = await Promise.all(resizePromises);
            newPhotoBlobs.push(...resizedBlobs); // 処理済みのBlobを配列に追加
            
            photoStatus.textContent = `写真${files.length}件を追加しました。`;
            await renderPhotoList(); // プレビューを更新
            
        } catch (err) {
            console.error("Photo processing failed:", err);
            photoStatus.textContent = '写真の処理に失敗しました。';
        }
        
        // inputをリセットして、同じファイルを選び直せるようにする
        photoInput.value = null;
    });

    // 初期描画（編集時のみ）
    if (!isNew) {
        renderPhotoList();
    }
}