// このファイルは settings.js です

/**
 * 「設定」タブがクリックされたときに main.js から呼ばれるメイン関数
 */
function showSettingsPage() {
    // navigateTo は main.js で定義されたグローバル関数
    navigateTo('settings', renderSettingsMenu, '設定');
}

/**
 * 設定タブのメインメニューを描画する
 */
function renderSettingsMenu() {
    // 戻るボタンを非表示
    updateHeader('設定', false);

    // app は main.js で定義されたグローバル変数
    app.innerHTML = `
        <div class="space-y-4">
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">データ管理</h2>
                <ul class="space-y-2">
                    <li>
                        <button class="btn btn-secondary w-full" disabled>データのエクスポート (未実装)</button>
                    </li>
                    <li>
                        <button class="btn btn-secondary w-full" disabled>データのインポート (未実装)</button>
                    </li>
                </ul>
            </div>
            
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">項目管理</h2>
                <ul class="space-y-2">
                    <li>
                        <button id="manage-trap-types-btn" class="btn btn-secondary w-full">罠の種類の管理</button>
                    </li>
                    </ul>
            </div>
        </div>
    `;
    
    // --- イベントリスナーを設定 ---
    document.getElementById('manage-trap-types-btn').addEventListener('click', () => {
        showManageTrapTypesPage();
    });
}

/**
 * ★★★ 新規 (3/4) ★★★
 * 「罠の種類を管理」ページを表示する
 */
async function showManageTrapTypesPage() {
    updateHeader('罠の種類を管理', true); // 戻るボタンを表示

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
 * ★★★ 新規 (3/4) ★★★
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