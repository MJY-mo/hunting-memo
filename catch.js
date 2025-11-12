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

    // フィルタリングの準備
    let query = db.catches;
    if (method === 'trap') {
        const trap = await db.traps.get(relationId);
        title = `罠 [${trap.trap_number}] の捕獲`;
        headerNote = `<p class="text-sm text-gray-500 mb-3 -mt-3 text-center">罠: ${escapeHTML(trap.trap_number)}</p>`;
        query = db.catches.where('method').equals('trap').and(log => log.relation_id === relationId);
    } else if (method === 'gun') {
        const gunLog = await db.gun_logs.get(relationId);
        title = `銃使用履歴 [${formatDate(gunLog.use_date)}] の捕獲`;
        headerNote = `<p class="text-sm text-gray-500 mb-3 -mt-3 text-center">銃使用日: ${formatDate(gunLog.use_date)}</p>`;
        query = db.catches.where('method').equals('gun').and(log => log.relation_id === relationId);
    }
    
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

    // リストを描画
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
 * @param {Dexie.Collection} query - 実行するクエリ
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

        const logs = await query.orderBy('catch_date').reverse().toArray();
        
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

    // デフォルト値
    log = {
        catch_date: new Date().toISOString().split('T')[0], // 本日の日付
        method: method,
        relation_id: relationId,
        species: '',
        gender: '不明',
        age: '不明',
        hit_location: ''
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

                    ${log.method === 'gun' ? `
                    <div class="form-group">
                        <label for="hit_location" class="form-label">着弾位置</label>
                        <input type="text" id="hit_location" name="hit_location" value="${escapeHTML(log.hit_location || '')}" class="form-input" placeholder="例: 頸部、胸部">
                    </div>
                    ` : ''}
                </div>
            </div>

            <hr class="my-4">
            <div>
                <h3 class="text-lg font-semibold border-b pb-2 mb-4">写真</h3>
                <p class="text-gray-500 text-sm">(写真の添付機能は未実装です)</p>
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
            hit_location: (log.method === 'gun') ? formData.get('hit_location') : '',
            // method と relation_id は隠しパラメータとして保持
            method: log.method,
            relation_id: log.relation_id
        };

        try {
            if (isNew) {
                await db.catches.add(data);
            } else {
                data.id = catchId; // 忘れずにIDをセット
                await db.catches.put(data);
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
            if (window.confirm(`この捕獲記録（${log.species}）を本当に削除しますか？`)) {
                try {
                    await db.catches.delete(catchId);
                    alert('捕獲記録を削除しました。');
                    showCatchListPage(method, relationId);
                } catch (err) {
                    console.error("Failed to delete catch log:", err);
                    alert(`削除に失敗しました: ${err.message}`);
                }
            }
        });
    }
}