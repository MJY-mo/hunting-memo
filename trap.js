// このファイルは trap.js です

/**
 * 「罠」タブがクリックされたときに main.js から呼ばれるメイン関数
 */
async function showTrapPage() {
    // 戻るボタンを非表示にし、ヘッダーを「罠」に設定
    // (navigateTo内で呼ばれるので、ここでは不要)
    // updateHeader('罠', false);
    
    // 現在の絞り込み条件（グローバル状態として保持）
    // (鳥類図鑑アプリの appState.listControls に相当)
    if (!appState.trapFilters) {
        appState.trapFilters = {
            status: 'all', // all, open, closed
            type: 'all'    // all, くくり罠, 箱罠, ...
        };
    }

    // メインコンテンツ（app）を描画
    app.innerHTML = `
        <!-- 絞り込みUI (カードで囲む) -->
        <div class="card mb-4">
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label for="filter-status" class="form-label">状態</label>
                    <select id="filter-status" class="form-select mt-1">
                        <option value="all">すべて</option>
                        <option value="open">開（設置中）</option>
                        <option value="closed">閉（回収済）</option>
                    </select>
                </div>
                <div>
                    <label for="filter-type" class="form-label">種類</label>
                    <select id="filter-type" class="form-select mt-1">
                        <option value="all">すべて</option>
                        <option value="くくり罠">くくり罠</option>
                        <option value="箱罠">箱罠</option>
                        <!-- TODO: DBから種類を動的に読み込む -->
                    </select>
                </div>
            </div>
        </div>

        <!-- 罠一覧リスト -->
        <div id="trap-list-container" class="space-y-3">
            <p class="text-gray-500 text-center py-4">罠データを読み込み中...</p>
        </div>

        <!-- 新規追加ボタン (FAB) -->
        <button id="add-trap-btn" title="新しい罠を登録"
            class="fixed bottom-20 right-5 z-10 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-3xl hover:bg-blue-700">
            +
        </button>
    `;
    
    // ★ 修正: 絞り込みセレクタが描画された *後* にリスナーを登録
    
    // 絞り込みのセレクトボックスに現在の状態を反映
    document.getElementById('filter-status').value = appState.trapFilters.status;
    document.getElementById('filter-type').value = appState.trapFilters.type;

    // --- イベントリスナーを設定 ---
    // (id='add-trap-btn' がHTMLに存在するので、エラーは解消されます)
    document.getElementById('add-trap-btn').addEventListener('click', () => {
        // 新規登録フォームを表示
        showTrapEditForm(null); 
    });

    document.getElementById('filter-status').addEventListener('change', (e) => {
        appState.trapFilters.status = e.target.value;
        renderTrapList(); // 絞り込みして再描画
    });
    
    document.getElementById('filter-type').addEventListener('change', (e) => {
        appState.trapFilters.type = e.target.value;
        renderTrapList(); // 絞り込みして再描画
    });

    // 罠一覧を描画
    await renderTrapList();
}

/**
 * 罠一覧をDBから読み込み、フィルタリングして描画する関数
 */
async function renderTrapList() {
    const container = document.getElementById('trap-list-container');
    if (!container) return; // ページ切り替えなどでコンテナがない場合は何もしない

    try {
        // Dexieの 'traps' テーブルから 'trap_number' でソートして全件取得
        let traps = await db.traps.orderBy('trap_number').toArray();

        // --- 絞り込みロジック (ユーザー要望) ---
        const { status, type } = appState.trapFilters;

        if (status !== 'all') {
            traps = traps.filter(trap => {
                // close_date が存在し、かつ空文字でないなら「閉」
                const isClosed = (trap.close_date && trap.close_date.length > 0);
                return (status === 'open') ? !isClosed : isClosed;
            });
        }
        
        if (type !== 'all') {
            traps = traps.filter(trap => trap.trap_type === type);
        }
        // --- 絞り込みここまで ---

        if (traps.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">登録されている罠はありません。</p>`;
            return;
        }

        // 罠カードのHTMLを生成
        container.innerHTML = traps.map(trap => {
            const isClosed = (trap.close_date && trap.close_date.length > 0);
            const statusClass = isClosed ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700';
            const statusText = isClosed ? '閉' : '開';

            // --- ここが「横長のタイルバー表示」のHTMLです (style.cssの.trap-cardを参照) ---
            return `
                <div class="trap-card" data-id="${trap.id}">
                    <div>
                        <h3 class="text-lg font-semibold text-blue-600">${escapeHTML(trap.trap_number)}</h3>
                        <p class="text-sm text-gray-600">${escapeHTML(trap.trap_type)}</p>
                        <p class="text-xs text-gray-500">設置日: ${formatDate(trap.setup_date)}</p>
                    </div>
                    <span class="text-sm font-bold px-3 py-1 rounded-full ${statusClass}">
                        ${statusText}
                    </span>
                </div>
            `;
        }).join('');

        // 描画された各カードにクリックイベントを設定
        container.querySelectorAll('.trap-card').forEach(card => {
            card.addEventListener('click', () => {
                const trapId = Number(card.dataset.id);
                // 編集フォームを表示
                showTrapEditForm(trapId); 
            });
        });

    } catch (err) {
        console.error("Failed to render trap list:", err);
        container.innerHTML = `<div class="error-box">罠一覧の読み込みに失敗しました。</div>`;
    }
}

/**
 * 罠の新規登録・編集フォームを表示する関数
 * @param {number | null} trapId 編集する罠のID (新規の場合は null)
 */
async function showTrapEditForm(trapId) {
    const isNew = (trapId === null);
    let trap = {}; // デフォルトの空オブジェクト

    if (isNew) {
        // 新規登録時のデフォルト値
        trap = {
            trap_number: '',
            trap_type: 'くくり罠',
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
        // 編集時はDBからデータを取得
        try {
            trap = await db.traps.get(trapId);
            if (!trap) {
                alert('罠データが見つかりません。');
                showTrapPage(); // 一覧に戻る
                return;
            }
            // 拡張用データがない場合に備える
            if (!trap.additional_data) trap.additional_data = {};
            updateHeader(`罠の編集: ${trap.trap_number}`, true);
        } catch (err) {
            console.error("Failed to get trap data:", err);
            alert('罠データの取得に失敗しました。');
            showTrapPage();
            return;
        }
    }

    // 戻るボタンの動作を設定 (main.jsのデフォルト動作を上書き)
    backButton.onclick = () => showTrapPage();

    // フォームのHTMLを描画
    // ★★★ UI改善: フォーム全体を1つのカードで囲み、セクション間は <hr> で区切る ★★★
    app.innerHTML = `
        <form id="trap-form" class="card space-y-4">
            
            <!-- 基本情報セクション -->
            <div>
                <h3 class="text-lg font-semibold border-b pb-2 mb-4">基本情報</h3>
                <div class="space-y-4"> <!-- 各フォーム要素の間のスペース -->
                    <div class="form-group">
                        <label for="trap_number" class="form-label">罠ナンバー (必須・重複不可)</label>
                        <input type="text" id="trap_number" name="trap_number" value="${escapeHTML(trap.trap_number)}" class="form-input" required>
                    </div>

                    <div class="form-group">
                        <label for="trap_type" class="form-label">種類</label>
                        <select id="trap_type" name="trap_type" class="form-select">
                            <option value="くくり罠" ${trap.trap_type === 'くくり罠' ? 'selected' : ''}>くくり罠</option>
                            <option value="箱罠" ${trap.trap_type === '箱罠' ? 'selected' : ''}>箱罠</option>
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

            <!-- 位置情報セクション -->
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
            
            <!-- 操作ボタンセクション -->
            <hr class="my-4">
            <div class="space-y-4">
                <!-- 保存・キャンセルボタン -->
                <div class="grid grid-cols-2 gap-3">
                    <button type="button" id="cancel-btn" class="btn btn-secondary">キャンセル</button>
                    <button type="submit" id="save-trap-btn" class="btn btn-primary">保存</button>
                </div>

                <!-- 削除ボタン（編集時のみ） -->
                ${!isNew ? `
                    <button type="button" id="delete-trap-btn" class="btn btn-danger w-full mt-4">この罠を削除</button>
                ` : ''}
            </div>
        </form>
    `;

    // --- フォームのイベントリスナーを設定 ---
    document.getElementById('cancel-btn').addEventListener('click', () => {
        showTrapPage(); // 一覧に戻る
    });

    // GPS取得ボタン
    document.getElementById('get-location-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget; // e.target
        const statusEl = document.getElementById('location-status');
        btn.disabled = true;
        btn.classList.add('btn-loading');
        statusEl.textContent = 'GPS測位中...';

        try {
            // main.js の getCurrentLocation() を呼び出す
            const { latitude, longitude } = await getCurrentLocation();
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

    // 保存ボタン
    document.getElementById('trap-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const saveBtn = document.getElementById('save-trap-btn');
        saveBtn.disabled = true;
        saveBtn.classList.add('btn-loading');
        saveBtn.textContent = '保存中...';

        const formData = new FormData(form);
        
        // データを整形
        const data = {
            trap_number: formData.get('trap_number'),
            trap_type: formData.get('trap_type'),
            setup_date: formData.get('setup_date'),
            close_date: formData.get('close_date') === '' ? null : formData.get('close_date'),
            latitude: formData.get('latitude') === '' ? null : Number(formData.get('latitude')),
            longitude: formData.get('longitude') === '' ? null : Number(formData.get('longitude')),
            // 拡張用データ
            additional_data: {
                bait: formData.get('bait'),
                location_memo: formData.get('location_memo')
            }
        };

        try {
            if (isNew) {
                // 新規追加
                await db.traps.add(data);
            } else {
                // 更新 (IDも忘れずに)
                data.id = trapId;
                await db.traps.put(data);
            }
            showTrapPage(); // 保存成功したら一覧に戻る

        } catch (err) {
            if (err.name === 'ConstraintError') {
                alert(`保存失敗: 罠ナンバー「${data.trap_number}」は既に使用されています。`);
            } else {
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
        document.getElementById('delete-trap-btn').addEventListener('click', async () => {
            // TODO: 鳥類図鑑アプリのようなカスタムモーダルを実装する
            if (window.confirm(`罠「${trap.trap_number}」を本当に削除しますか？\n（この罠に関連する捕獲記録は削除されません）`)) {
                try {
                    await db.traps.delete(trapId);
                    alert('罠を削除しました。');
                    showTrapPage(); // 一覧に戻る
                } catch (err) {
                    console.error("Failed to delete trap:", err);
                    alert(`削除に失敗しました: ${err.message}`);
                }
            }
        });
    }
}