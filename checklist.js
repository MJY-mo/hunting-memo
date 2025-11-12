// このファイルは checklist.js です

/**
 * 「チェック」タブがクリックされたときに main.js から呼ばれるメイン関数
 * (チェックリストの「セット」一覧を表示する)
 */
async function showChecklistPage() {
    // navigateTo は main.js で定義されたグローバル関数
    navigateTo('checklist', renderChecklistSets, 'チェックリスト一覧');
}

/**
 * チェックリストの「セット」一覧を描画する
 */
async function renderChecklistSets() {
    // 戻るボタンを非表示
    updateHeader('チェックリスト一覧', false);
    
    app.innerHTML = `
        <div class="space-y-4">
            <div class="card">
                <form id="add-list-set-form" class="flex space-x-2">
                    <div class="form-group flex-grow mb-0">
                        <label for="new-list-name" class="sr-only">新しいリスト名</label>
                        <input type="text" id="new-list-name" class="form-input" placeholder="例: 単独忍び猟" required>
                    </div>
                    <button type="submit" class="btn btn-primary h-fit mt-1">リスト作成</button>
                </form>
            </div>
            
            <div id="checklist-sets-container" class="space-y-3">
                <p class="text-gray-500 text-center py-4">読み込み中...</p>
            </div>
        </div>
    `;

    // リストセット一覧を描画
    await renderChecklistSetList();

    // フォームの送信イベント
    document.getElementById('add-list-set-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('new-list-name');
        const newName = input.value.trim();
        
        if (!newName) return;

        try {
            // DBに追加
            await db.checklist_lists.add({ name: newName });
            input.value = ''; // フォームをクリア
            await renderChecklistSetList(); // リストを再描画
        } catch (err) {
            if (err.name === 'ConstraintError') {
                alert(`「${newName}」は既に使用されています。`);
            } else {
                console.error("Failed to add checklist set:", err);
                alert('リストの作成に失敗しました。');
            }
        }
    });
}

/**
 * チェックリストのセット一覧をDBから描画する
 */
async function renderChecklistSetList() {
    const container = document.getElementById('checklist-sets-container');
    if (!container) return;

    try {
        const lists = await db.checklist_lists.orderBy('name').toArray();
        
        if (lists.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">チェックリストがありません。作成してください。</p>`;
            return;
        }

        container.innerHTML = lists.map(list => `
            <div class="trap-card" data-id="${list.id}" data-name="${escapeHTML(list.name)}">
                <h3 class="text-lg font-semibold text-blue-600">${escapeHTML(list.name)}</h3>
                <span>&gt;</span>
            </div>
        `).join('');

        // 描画された各カードにクリックイベントを設定
        container.querySelectorAll('.trap-card').forEach(card => {
            card.addEventListener('click', () => {
                const listId = Number(card.dataset.id);
                const listName = card.dataset.name;
                showChecklistItemsPage(listId, listName); // そのリストの項目ページへ
            });
        });

    } catch (err) {
        console.error("Failed to render checklist sets:", err);
        container.innerHTML = `<div class="error-box">リスト一覧の読み込みに失敗しました。</div>`;
    }
}


// ===============================================
// ★★★ チェックリストの「項目」管理 ★★★
// ===============================================

/**
 * 「所持品チェックリスト」の項目ページを表示する
 * (旧 showChecklistPage のロジック)
 * @param {number} listId - 表示するリストセットのID
 * @param {string} listName - 表示するリストセットの名前
 */
async function showChecklistItemsPage(listId, listName) {
    updateHeader(listName, true); // リスト名をヘッダーに、戻るボタンを表示
    
    // 戻るボタンの動作を上書き
    backButton.onclick = () => {
        showChecklistPage(); // リストセット一覧に戻る
    };

    app.innerHTML = `
        <div class="space-y-4">
            <div class="card">
                <div class="flex justify-between items-center border-b pb-2 mb-4">
                    <h2 class="text-lg font-semibold">チェックリスト</h2>
                    <button id="checklist-reset-btn" class="btn btn-secondary btn-sm">全解除</button>
                </div>
                <div id="checklist-container" class="space-y-3">
                    <p class="text-gray-500 text-center py-4">読み込み中...</p>
                </div>
            </div>
            
            <div class="card">
                <details>
                    <summary class="text-lg font-semibold cursor-pointer select-none">
                        チェック項目の管理 (タップで開く)
                    </summary>
                    <div class="mt-4 pt-4 border-t space-y-4">
                        <form id="add-item-form" class="flex space-x-2 mb-4">
                            <div class="form-group flex-grow mb-0">
                                <label for="new-item-name" class="sr-only">新しい項目</label>
                                <input type="text" id="new-item-name" class="form-input" placeholder="例: 銃許可証" required>
                            </div>
                            <button type="submit" class="btn btn-primary h-fit mt-1">追加</button>
                        </form>
                        
                        <div id="item-management-list" class="space-y-2">
                            <p class="text-gray-500">読み込み中...</p>
                        </div>
                    </div>
                </details>
            </div>
            
            <div class="card bg-red-50 border border-red-200">
                <h2 class="text-lg font-semibold text-red-700 mb-2">リストの削除</h2>
                <p class="text-sm text-red-600 mb-3">このリスト「${escapeHTML(listName)}」と、リスト内のすべての項目を削除します。</p>
                <button id="delete-list-set-btn" class="btn btn-danger w-full">このリストセットを削除</button>
            </div>
        </div>
    `;

    // --- イベントリスナーを設定 ---

    // 1. 全解除ボタン
    document.getElementById('checklist-reset-btn').addEventListener('click', async () => {
        if (!window.confirm('すべてのチェックを解除しますか？')) return;
        
        try {
            // このリストIDに属する項目のみ 'checked' を false に更新
            const items = await db.checklist_items.where('list_id').equals(listId).toArray();
            const updates = items.map(item => ({
                key: item.id, // Primary Key で更新
                changes: { checked: false }
            }));
            
            if (updates.length > 0) {
                await db.checklist_items.bulkUpdate(updates);
            }
            
            await renderChecklist(listId); // チェックリストを再描画
        } catch (err) {
            console.error("Failed to reset checklist:", err);
            alert('全解除に失敗しました。');
        }
    });

    // 2. 項目追加フォーム
    document.getElementById('add-item-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('new-item-name');
        const itemName = input.value.trim();
        
        if (!itemName) return;

        try {
            // DBに { list_id, name, checked: false } で追加
            await db.checklist_items.add({ 
                list_id: listId, 
                name: itemName, 
                checked: false 
            });
            input.value = ''; // フォームをクリア
            
            // 両方のリストを再描画
            await renderChecklist(listId);
            await renderItemManagementList(listId);
        } catch (err) {
            if (err.name === 'ConstraintError') {
                alert(`「${itemName}」は既にこのリストに追加されています。`);
            } else {
                console.error("Failed to add checklist item:", err);
                alert('項目の追加に失敗しました。');
            }
        }
    });
    
    // 3. リストセット削除ボタン
    document.getElementById('delete-list-set-btn').addEventListener('click', async () => {
        if (!window.confirm(`リスト「${listName}」を本当に削除しますか？\nリスト内のすべての項目も削除されます。`)) return;
        
        try {
            // 1. 関連する項目をすべて削除
            await db.checklist_items.where('list_id').equals(listId).delete();
            // 2. リストセット自体を削除
            await db.checklist_lists.delete(listId);
            
            alert('リストを削除しました。');
            showChecklistPage(); // リスト一覧に戻る
            
        } catch (err) {
            console.error("Failed to delete checklist set:", err);
            alert('リストの削除に失敗しました。');
        }
    });

    // --- 初期描画 ---
    await renderChecklist(listId);
    await renderItemManagementList(listId);
}

/**
 * チェックリスト本体 (チェックボックス付き) を描画する
 * @param {number} listId - 表示するリストセットのID
 */
async function renderChecklist(listId) {
    const container = document.getElementById('checklist-container');
    if (!container) return;

    try {
        const items = await db.checklist_items.where('list_id').equals(listId).sortBy('name');
        
        if (items.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">項目がありません。「チェック項目の管理」から追加してください。</p>`;
            return;
        }

        container.innerHTML = items.map(item => `
            <label class="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" class="form-checkbox h-5 w-5 text-blue-600 rounded" data-id="${item.id}" ${item.checked ? 'checked' : ''}>
                <span class="text-gray-700">${escapeHTML(item.name)}</span>
            </label>
        `).join('');

        // 各チェックボックスに「変更時DB保存」イベントを追加
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const itemId = Number(e.target.dataset.id);
                const isChecked = e.target.checked;
                try {
                    // DBの 'checked' 状態を更新
                    await db.checklist_items.update(itemId, { checked: isChecked });
                } catch (err) {
                    console.error("Failed to update check state:", err);
                    alert('チェック状態の保存に失敗しました。');
                }
            });
        });

    } catch (err) {
        console.error("Failed to render checklist:", err);
        container.innerHTML = `<div class="error-box">チェックリストの読み込みに失敗しました。</div>`;
    }
}

/**
 * 項目の管理リスト (削除ボタン付き) を描画する
 * @param {number} listId - 表示するリストセットのID
 */
async function renderItemManagementList(listId) {
    const container = document.getElementById('item-management-list');
    if (!container) return;

    try {
        const items = await db.checklist_items.where('list_id').equals(listId).sortBy('name');
        
        if (items.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-sm">登録されている項目はありません。</p>`;
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span class="text-gray-700">${escapeHTML(item.name)}</span>
                <button class="btn-delete-item text-red-500 hover:text-red-700 text-sm font-semibold" data-id="${item.id}" data-name="${escapeHTML(item.name)}">
                    削除
                </button>
            </div>
        `).join('');

        // 削除ボタンにイベントリスナーを設定
        container.querySelectorAll('.btn-delete-item').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const itemId = Number(e.target.dataset.id);
                const itemName = e.target.dataset.name;
                
                if (window.confirm(`項目「${itemName}」を削除しますか？`)) {
                    try {
                        await db.checklist_items.delete(itemId);
                        // 両方のリストを再描画
                        await renderChecklist(listId);
                        await renderItemManagementList(listId);
                    } catch (err) {
                        console.error("Failed to delete checklist item:", err);
                        alert('削除に失敗しました。');
                    }
                }
            });
        });

    } catch (err) {
        console.error("Failed to render item management list:", err);
        container.innerHTML = `<div class="error-box">項目管理リストの読み込みに失敗しました。</div>`;
    }
}