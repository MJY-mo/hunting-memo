// このファイルは trap.js です

// ★ 定数定義
const MAX_OPEN_TRAPS = 30; // 開いている罠の上限

/**
 * 「罠」タブのメイン関数 (デフォルト = 開いている罠)
 */
async function showTrapPage() {
    // main.js のグローバル状態を更新
    appState.trapView = 'open';
    // ヘッダーを「罠 (設置中)」に設定
    updateHeader('罠 (設置中)', false);
    
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
                    <option value="くくり罠">くくり罠</option>
                    <option value="箱罠">箱罠</option>
                </select>
            </div>
        </div>

        <div id="trap-list-container" class="space-y-3">
            <p class="text-gray-500 text-center py-4">罠データを読み込み中...</p>
        </div>

        <button id="add-trap-btn" title="新しい罠を登録"
            class="fixed bottom-20 right-5 z-10 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-3xl hover:bg-blue-700">
            +
        </button>
        
        <button id="show-closed-btn" title="過去の罠を見る"
            class="fixed bottom-36 right-5 z-10 w-14 h-14 bg-gray-500 text-white rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-gray-600">
            履歴
        </button>
    `;
    
    // 絞り込みのセレクトボックスに現在の状態を反映
    document.getElementById('filter-type').value = appState.trapFilters.type;

    // --- イベントリスナーを設定 ---
    
    // ＋ボタン（新規追加）
    document.getElementById('add-trap-btn').addEventListener('click', async () => {
        // ★ 修正: 開いている罠の数をチェック
        try {
            // --- ★★★ 修正 (1/3) ★★★ ---
            // .where().or() という無効な構文、および 'null' が 'invalid key' となるエラーを回避するため、
            // .filter() を使った安全なカウント方法に変更します。
            const openTrapsCount = await db.traps
                .filter(trap => trap.close_date === null || trap.close_date === '')
                .count();
            // --- 修正ここまで ---
            
            if (openTrapsCount >= MAX_OPEN_TRAPS) {
                alert(`開いている罠が上限（${MAX_OPEN_TRAPS}個）に達しています。新しい罠を登録するには、既存の罠を「閉め日」に設定（回収済みに）してください。`);
            } else {
                // 上限以下の場合のみフォームを表示
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
    // ヘッダーを「過去の罠」に設定
    updateHeader('過去の罠', false);

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
                    <option value="くくり罠">くくり罠</option>
                    <option value="箱罠">箱罠</option>
                </select>
            </div>
        </div>

        <div id="trap-list-container" class="space-y-3">
            <p class="text-gray-500 text-center py-4">過去の罠データを読み込み中...</p>
        </div>
        
        <button id="show-open-btn" title="開いている罠を見る"
            class="fixed bottom-20 right-5 z-10 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-xl hover:bg-blue-700">
            設置中
        </button>
    `;
    
    // 絞り込みのセレクトボックスに現在の状態を反映
    document.getElementById('filter-type').value = appState.trapFilters.type;

    // --- イベントリスナーを設定 ---
    
    // 設置中ボタン
    document.getElementById('show-open-btn').addEventListener('click', () => {
        showTrapPage(); // 開いている罠ページを表示
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
 * 罠一覧（開いている罠）をDBから描画する関数
 */
async function renderTrapList() {
    const container = document.getElementById('trap-list-container');
    if (!container) return; 

    try {
        // --- ★★★ 修正 (2/3) ★★★ ---
        // .where().anyOf([null, ...]) が "invalid key" エラーを起こすため、
        // .filter() を使った安全な絞り込みに変更します。
        // (close_date が null または 空文字 のものを検索)
        let query = db.traps.filter(trap => 
            trap.close_date === null || trap.close_date === ''
        );
        // --- 修正ここまで ---

        // ★ 修正: 絞り込みロジック (種類のみ)
        const { type } = appState.trapFilters;
        if (type !== 'all') {
            // クエリを連結
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
            // ★ 修正: 「区分」を表示
            const categoryText = trap.category ? trap.category : '未分類';

            return `
                <div class="trap-card" data-id="${trap.id}">
                    <div>
                        <h3 class="text-lg font-semibold text-blue-600">${escapeHTML(trap.trap_number)}</h3>
                        <p class="text-sm text-gray-600">${escapeHTML(trap.trap_type)}</p>
                        <p class="text-sm text-gray-500">${escapeHTML(categoryText)}</p>
                        <p class="text-xs text-gray-500 mt-1">設置日: ${formatDate(trap.setup_date)}</p>
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
                showTrapEditForm(trapId); 
            });
        });

    } catch (err) {
        // エラーログはコンソールに詳細を出す
        console.error("Failed to render trap list:", err);
        container.innerHTML = `<div class="error-box">罠一覧の読み込みに失敗しました。</div>`;
    }
}

/**
 * ★ 新規: 過去の罠一覧（閉じている罠）を描画する関数
 */
async function renderClosedTrapList() {
    const container = document.getElementById('trap-list-container');
    if (!container) return;

    try {
        // ★ 修正: DBクエリで「閉じている罠」のみを取得
        // (close_date が null でも空文字でもない)
        let query = db.traps.filter(trap => 
            trap.close_date !== null && trap.close_date !== ''
        );

        // ★ 修正: 絞り込みロジック (種類のみ)
        const { type } = appState.trapFilters;
        if (type !== 'all') {
            query = query.filter(trap => trap.trap_type === type);
        }
        
        // 閉じている罠は、閉じた日が新しい順にソート
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
                    <div>
                        <h3 class="text-lg font-semibold text-gray-600">${escapeHTML(trap.trap_number)}</h3>
                        <p class="text-sm text-gray-600">${escapeHTML(trap.trap_type)}</p>
                        <p class="text-sm text-gray-500">${escapeHTML(categoryText)}</p>
                        <p class="text-xs text-gray-500 mt-1">回収日: ${formatDate(trap.close_date)}</p>
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

    if (isNew) {
        // 新規登録時のデフォルト値
        trap = {
            trap_number: '',
            trap_type: 'くくり罠',
            category: '狩猟', // ★ 修正: category のデフォルト値
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
                (appState.trapView === 'open') ? showTrapPage() : showClosedTrapPage();
                return;
            }
            if (!trap.additional_data) trap.additional_data = {};
            if (!trap.category) trap.category = '狩猟'; // 古いデータ用のフォールバック
            updateHeader(`罠の編集: ${trap.trap_number}`, true);
        } catch (err) {
            console.error("Failed to get trap data:", err);
            alert('罠データの取得に失敗しました。');
            (appState.trapView === 'open') ? showTrapPage() : showClosedTrapPage();
            return;
        }
    }

    // ★ 修正: 戻るボタンの動作を現在のビュー（open/closed）に合わせる
    backButton.onclick = () => {
        (appState.trapView === 'open') ? showTrapPage() : showClosedTrapPage();
    };

    // フォームのHTMLを描画
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

    // --- フォームのイベントリスナーを設定 ---
    document.getElementById('cancel-btn').addEventListener('click', () => {
        // ★ 修正: 現在のビューに戻る
        (appState.trapView === 'open') ? showTrapPage() : showClosedTrapPage();
    });

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
            category: formData.get('category'), // ★ 修正: category を追加
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
                // ★ 修正: 30個の上限を再チェック (保存直前)
                // --- ★★★ 修正 (3/3) ★★★ ---
                // .where().or() という無効な構文を、.filter() を使った
                // 正しいカウント方法に変更します。
                const openTrapsCount = await db.traps
                    .filter(trap => trap.close_date === null || trap.close_date === '')
                    .count();
                // --- 修正ここまで ---
                
                if (openTrapsCount >= MAX_OPEN_TRAPS && (data.close_date === null || data.close_date === '')) {
                     alert(`開いている罠が上限（${MAX_OPEN_TRAPS}個）に達しています。`);
                     throw new Error("Trap limit reached"); // 保存を中止
                }
                
                await db.traps.add(data);
            } else {
                data.id = trapId;
                await db.traps.put(data);
            }
            
            // ★ 修正: 戻る場所を判断 (保存した罠の状態に応じて)
            const isClosed = (data.close_date !== null && data.close_date !== '');
            if (isClosed) {
                showClosedTrapPage();
            } else {
                showTrapPage();
            }

        } catch (err) {
            if (err.name === 'ConstraintError') {
                alert(`保存失敗: 罠ナンバー「${data.trap_number}」は既に使用されています。`);
            } else if (err.message !== "Trap limit reached") { // 上限エラーは既にalert済み
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
            if (window.confirm(`罠「${trap.trap_number}」を本当に削除しますか？\n（この罠に関連する捕獲記録は削除されません）`)) {
                try {
                    await db.traps.delete(trapId);
                    alert('罠を削除しました。');
                    (appState.trapView === 'open') ? showTrapPage() : showClosedTrapPage();
                } catch (err) {
                    console.error("Failed to delete trap:", err);
                    alert(`削除に失敗しました: ${err.message}`);
                }
            }
        });
    }
}