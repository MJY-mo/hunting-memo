// このファイルは gun.js です

/**
 * 「銃」タブがクリックされたときに main.js から呼ばれるメイン関数
 */
function showGunPage() {
    // navigateTo は main.js で定義されたグローバル関数
    navigateTo('gun', renderGunMenu, '銃');
}

/**
 * 銃タブのメインメニューを描画する
 */
function renderGunMenu() {
    // 戻るボタンを非表示
    updateHeader('銃', false);

    // app は main.js で定義されたグローバル変数
    app.innerHTML = `
        <div class="space-y-4">
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">銃の管理</h2>
                <ul class="space-y-2">
                    <li>
                        <button id="manage-guns-btn" class="btn btn-secondary w-full">
                            所持銃の管理
                        </button>
                    </li>
                </ul>
            </div>

            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">記録</h2>
                <ul class="space-y-2">
                    <li>
                        <button id="manage-gun-logs-btn" class="btn btn-secondary w-full" disabled>
                            銃使用履歴 (未実装)
                        </button>
                    </li>
                    <li>
                        <button id="manage-ammo-btn" class="btn btn-secondary w-full" disabled>
                            弾の出納簿 (未実装)
                        </button>
                    </li>
                </ul>
            </div>
            
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">その他</h2>
                <ul class="space-y-2">
                    <li>
                        <button id="manage-checklist-btn" class="btn btn-secondary w-full" disabled>
                            所持品チェックリスト (未実装)
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    `;
    
    // --- イベントリスナーを設定 ---
    document.getElementById('manage-guns-btn').addEventListener('click', () => {
        showGunListPage();
    });
}

/**
 * ★★★ 新規 (1/2) ★★★
 * 「所持銃の管理」リストページを表示する
 */
async function showGunListPage() {
    updateHeader('所持銃の管理', true); // 戻るボタンを表示

    app.innerHTML = `
        <div class="card mb-4">
            <button id="add-new-gun-btn" class="btn btn-primary w-full">
                新しい銃を登録する
            </button>
        </div>
        
        <div id="gun-list-container" class="space-y-3">
            <p class="text-gray-500 text-center py-4">読み込み中...</p>
        </div>
    `;

    // リストを描画
    await renderGunList();

    // 新規登録ボタンのイベント
    document.getElementById('add-new-gun-btn').addEventListener('click', () => {
        // null を渡して新規登録フォームを開く
        showGunEditForm(null);
    });
}

/**
 * ★★★ 新規 (1/2) ★★★
 * 所持銃リストをDBから読み込んで描画する
 */
async function renderGunList() {
    const container = document.getElementById('gun-list-container');
    if (!container) return;

    try {
        const guns = await db.guns.orderBy('gun_name').toArray();
        
        if (guns.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">登録されている銃はありません。</p>`;
            return;
        }

        container.innerHTML = guns.map(gun => `
            <div class="trap-card" data-id="${gun.id}">
                <div>
                    <h3 class="text-lg font-semibold text-blue-600">${escapeHTML(gun.gun_name)}</h3>
                    </div>
                <span>&gt;</span>
            </div>
        `).join('');

        // 描画された各カードにクリックイベントを設定
        container.querySelectorAll('.trap-card').forEach(card => {
            card.addEventListener('click', () => {
                const gunId = Number(card.dataset.id);
                showGunEditForm(gunId); // 編集フォームを開く
            });
        });

    } catch (err) {
        console.error("Failed to render gun list:", err);
        container.innerHTML = `<div class="error-box">所持銃リストの読み込みに失敗しました。</div>`;
    }
}


/**
 * ★★★ 新規 (1/2) ★★★
 * 所持銃の新規登録・編集フォームを表示する
 * @param {number | null} gunId 編集する銃のID (新規の場合は null)
 */
async function showGunEditForm(gunId) {
    const isNew = (gunId === null);
    let gun = { gun_name: '' }; // デフォルト

    if (isNew) {
        updateHeader('新しい銃を登録', true);
    } else {
        updateHeader('銃の編集', true);
        try {
            gun = await db.guns.get(gunId);
            if (!gun) {
                alert('銃データが見つかりません。');
                showGunListPage();
                return;
            }
        } catch (err) {
            alert('銃データの取得に失敗しました。');
            showGunListPage();
            return;
        }
    }

    // ★ main.js 側の修正も必要だが、ここで戻るボタンの動作を上書き
    backButton.onclick = () => {
        showGunListPage();
    };

    app.innerHTML = `
        <form id="gun-form" class="card space-y-4">
            
            <div>
                <h3 class="text-lg font-semibold border-b pb-2 mb-4">基本情報</h3>
                <div class="space-y-4">
                    <div class="form-group">
                        <label for="gun_name" class="form-label">銃の名前 (必須・重複不可)</label>
                        <input type="text" id="gun_name" name="gun_name" value="${escapeHTML(gun.gun_name)}" class="form-input" required
                               placeholder="例: ベネリM2、Aボルト 30-06 など">
                    </div>
                    
                    </div>
            </div>
            
            <hr class="my-4">
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <button type="button" id="cancel-btn" class="btn btn-secondary">キャンセル</button>
                    <button type="submit" id="save-gun-btn" class="btn btn-primary">保存</button>
                </div>
                ${!isNew ? `
                    <button type="button" id="delete-gun-btn" class="btn btn-danger w-full mt-4">この銃を削除</button>
                ` : ''}
            </div>
        </form>
    `;

    // --- フォームのイベントリスナーを設定 ---
    
    // キャンセルボタン
    document.getElementById('cancel-btn').addEventListener('click', () => {
        showGunListPage();
    });

    // 保存ボタン
    document.getElementById('gun-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const saveBtn = document.getElementById('save-gun-btn');
        saveBtn.disabled = true;
        saveBtn.classList.add('btn-loading');
        saveBtn.textContent = '保存中...';

        const gunName = form.gun_name.value.trim();
        
        try {
            if (isNew) {
                await db.guns.add({ gun_name: gunName });
            } else {
                // gunId と更新データを渡す
                await db.guns.put({ id: gunId, gun_name: gunName });
            }
            showGunListPage(); // 保存後にリストに戻る

        } catch (err) {
            if (err.name === 'ConstraintError') {
                alert(`保存失敗: 銃の名前「${gunName}」は既に使用されています。`);
            } else {
                console.error("Failed to save gun:", err);
                alert(`保存に失敗しました: ${err.message}`);
            }
            saveBtn.disabled = false;
            saveBtn.classList.remove('btn-loading');
            saveBtn.textContent = '保存';
        }
    });

    // 削除ボタン（編集時のみ）
    if (!isNew) {
        document.getElementById('delete-gun-btn').addEventListener('click', async () => {
            
            // TODO: 将来的に、この銃を使用している「使用履歴」がないかチェックする
            
            if (window.confirm(`銃「${gun.gun_name}」を本当に削除しますか？\n（この銃に関連する使用履歴は削除されません）`)) {
                try {
                    await db.guns.delete(gunId);
                    alert('銃を削除しました。');
                    showGunListPage();
                } catch (err) {
                    console.error("Failed to delete gun:", err);
                    alert(`削除に失敗しました: ${err.message}`);
                }
            }
        });
    }
}