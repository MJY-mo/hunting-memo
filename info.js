// このファイルは info.js です

/**
 * 「情報」タブがクリックされたときに main.js から呼ばれるメイン関数
 */
function showInfoPage() {
    // navigateTo は main.js で定義されたグローバル関数
    navigateTo('info', renderInfoMenu, '情報');
}

/**
 * ★★★ 新規 (4/4): 情報タブのメインメニューを描画する
 */
function renderInfoMenu() {
    // 戻るボタンを非表示
    updateHeader('情報', false);

    // app は main.js で定義されたグローバル変数
    app.innerHTML = `
        <div class="space-y-4">
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">基本情報</h2>
                <ul class="space-y-2">
                    <li>
                        <button id="show-hunter-data-btn" class="btn btn-secondary w-full">
                            狩猟者データの管理
                        </button>
                    </li>
                </ul>
            </div>
            
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">法令情報 (未実装)</h2>
                <ul class="space-y-2">
                    <li><button class="btn btn-secondary w-full" disabled>狩猟法</button></li>
                    <li><button class="btn btn-secondary w-full" disabled>狩猟鳥獣</button></li>
                    <li><button class="btn btn-secondary w-full" disabled>猟期一覧</button></li>
                </ul>
            </div>
        </div>
    `;
    
    // --- イベントリスナーを設定 ---
    document.getElementById('show-hunter-data-btn').addEventListener('click', () => {
        showHunterDataPage();
    });
}

/**
 * ★★★ 新規 (4/4): 狩猟者データの「表示」ページ
 */
async function showHunterDataPage() {
    updateHeader('狩猟者データ', true);
    // 戻るボタンの動作を上書き (main.js デフォルトでOKだが念のため)
    backButton.onclick = () => showInfoPage();
    
    // ヘッダーに「編集」ボタンを追加
    headerActions.innerHTML = `<button id="edit-profile-btn" class="btn btn-primary">編集</button>`;
    document.getElementById('edit-profile-btn').onclick = () => showHunterDataEditPage();

    try {
        const profile = await db.hunter_profile.get('main');
        if (!profile) throw new Error("Profile not found");
        
        app.innerHTML = `
            <div class="card space-y-4">
                
                <div class="form-group">
                    <label class="form-label">名前</label>
                    <p class="text-gray-700">${escapeHTML(profile.name) || '(未設定)'}</p>
                </div>
                
                <hr>

                <div class="space-y-2">
                    <h3 class="text-lg font-semibold">銃所持許可証</h3>
                    <div class="form-group">
                        <label class="form-label">次回の更新</label>
                        <p class="text-gray-700">${escapeHTML(profile.gun_license_renewal) || '(未設定)'}</p>
                    </div>
                    <label class="form-label">写真</label>
                    ${renderPhotoPreview('gun_license_photo', profile.gun_license_photo)}
                </div>
                
                <hr>

                <div class="space-y-2">
                    <h3 class="text-lg font-semibold">狩猟免許</h3>
                    <div class="form-group">
                        <label class="form-label">次回の更新</label>
                        <p class="text-gray-700">${escapeHTML(profile.hunting_license_renewal) || '(未設定)'}</p>
                    </div>
                    <label class="form-label">写真</label>
                    ${renderPhotoPreview('hunting_license_photo', profile.hunting_license_photo)}
                </div>
                
                <hr>
                
                <div class="space-y-2">
                    <h3 class="text-lg font-semibold">狩猟登録証 / 許可証</h3>
                    <div class="form-group">
                        <label class="form-label">次回の更新 (または有効期限)</label>
                        <p class="text-gray-700">${escapeHTML(profile.registration_renewal) || '(未設定)'}</p>
                    </div>
                    <label class="form-label">写真</label>
                    ${renderPhotoPreview('registration_photo', profile.registration_photo)}
                </div>

            </div>
        `;
        
        // 画像プレビューに拡大イベントを付与
        attachModalClickEvents();
        
    } catch (err) {
        console.error("Failed to load hunter data:", err);
        app.innerHTML = `<div class="error-box">狩猟者データの読み込みに失敗しました。</div>`;
    }
}

/**
 * ★★★ 新規 (4/4): 狩猟者データの「編集」ページ
 */
async function showHunterDataEditPage() {
    updateHeader('狩猟者データを編集', true);
    // 戻るボタンの動作を上書き
    backButton.onclick = () => showHunterDataPage(); // 表示ページに戻る
    
    // 画像Blobを一時保存する変数
    let tempPhotos = {
        gun_license_photo: null,
        hunting_license_photo: null,
        registration_photo: null
    };
    // 削除フラグ
    let deleteFlags = {
        gun_license_photo: false,
        hunting_license_photo: false,
        registration_photo: false
    };

    try {
        const profile = await db.hunter_profile.get('main');
        if (!profile) throw new Error("Profile not found");

        // フォームHTML
        app.innerHTML = `
            <form id="hunter-profile-form" class="card space-y-4">
                
                <div class="form-group">
                    <label for="name" class="form-label">名前</label>
                    <input type="text" id="name" name="name" class="form-input" value="${escapeHTML(profile.name || '')}">
                </div>
                
                <hr>

                <div class="space-y-2">
                    <h3 class="text-lg font-semibold">銃所持許可証</h3>
                    <div class="form-group">
                        <label for="gun_license_renewal" class="form-label">次回の更新 (年/月)</label>
                        <input type="text" id="gun_license_renewal" name="gun_license_renewal" class="form-input" value="${escapeHTML(profile.gun_license_renewal || '')}" placeholder="例: 2025年10月">
                    </div>
                    <label class="form-label">写真</label>
                    ${renderPhotoPreview('gun_license_photo', profile.gun_license_photo)}
                    ${renderPhotoEditControls('gun_license_photo', !!profile.gun_license_photo)}
                </div>
                
                <hr>

                <div class="space-y-2">
                    <h3 class="text-lg font-semibold">狩猟免許</h3>
                    <div class="form-group">
                        <label for="hunting_license_renewal" class="form-label">次回の更新 (年/月)</label>
                        <input type="text" id="hunting_license_renewal" name="hunting_license_renewal" class="form-input" value="${escapeHTML(profile.hunting_license_renewal || '')}" placeholder="例: 2026年9月">
                    </div>
                    <label class="form-label">写真</label>
                    ${renderPhotoPreview('hunting_license_photo', profile.hunting_license_photo)}
                    ${renderPhotoEditControls('hunting_license_photo', !!profile.hunting_license_photo)}
                </div>
                
                <hr>
                
                <div class="space-y-2">
                    <h3 class="text-lg font-semibold">狩猟登録証 / 許可証</h3>
                    <div class="form-group">
                        <label for="registration_renewal" class="form-label">次回の更新 (または有効期限)</label>
                        <input type="text" id="registration_renewal" name="registration_renewal" class="form-input" value="${escapeHTML(profile.registration_renewal || '')}" placeholder="例: 2025年3月">
                    </div>
                    <label class="form-label">写真</label>
                    ${renderPhotoPreview('registration_photo', profile.registration_photo)}
                    ${renderPhotoEditControls('registration_photo', !!profile.registration_photo)}
                </div>
                
                <hr class="my-4">
                <div class="space-y-4">
                    <button type="submit" id="save-profile-btn" class="btn btn-primary w-full">保存</button>
                    <button type="button" id="cancel-btn" class="btn btn-secondary w-full">キャンセル</button>
                </div>
            </form>
        `;

        // --- イベントリスナーを設定 ---
        
        // 1. キャンセルボタン
        document.getElementById('cancel-btn').onclick = () => showHunterDataPage();

        // 2. 写真の 変更/削除/拡大 イベント
        setupPhotoEventListeners('gun_license_photo', tempPhotos, deleteFlags);
        setupPhotoEventListeners('hunting_license_photo', tempPhotos, deleteFlags);
        setupPhotoEventListeners('registration_photo', tempPhotos, deleteFlags);
        attachModalClickEvents(); // 拡大表示

        // 3. 保存ボタン
        document.getElementById('hunter-profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('save-profile-btn');
            saveBtn.disabled = true;
            saveBtn.classList.add('btn-loading');
            saveBtn.textContent = '保存中...';
            
            const formData = new FormData(e.target);
            
            // 更新データオブジェクト
            const dataToUpdate = {
                name: formData.get('name'),
                gun_license_renewal: formData.get('gun_license_renewal'),
                hunting_license_renewal: formData.get('hunting_license_renewal'),
                registration_renewal: formData.get('registration_renewal')
            };
            
            // 画像の変更をマージ
            if (deleteFlags.gun_license_photo) {
                dataToUpdate.gun_license_photo = null;
            } else if (tempPhotos.gun_license_photo) {
                dataToUpdate.gun_license_photo = tempPhotos.gun_license_photo;
            }
            
            if (deleteFlags.hunting_license_photo) {
                dataToUpdate.hunting_license_photo = null;
            } else if (tempPhotos.hunting_license_photo) {
                dataToUpdate.hunting_license_photo = tempPhotos.hunting_license_photo;
            }
            
            if (deleteFlags.registration_photo) {
                dataToUpdate.registration_photo = null;
            } else if (tempPhotos.registration_photo) {
                dataToUpdate.registration_photo = tempPhotos.registration_photo;
            }

            try {
                // 'main' キーのデータを更新
                await db.hunter_profile.update('main', dataToUpdate);
                showHunterDataPage(); // 保存後に表示ページに戻る
            } catch (err) {
                console.error("Failed to save profile:", err);
                alert('保存に失敗しました。');
                saveBtn.disabled = false;
                saveBtn.classList.remove('btn-loading');
                saveBtn.textContent = '保存';
            }
        });

    } catch (err) {
        console.error("Failed to load hunter data for edit:", err);
        app.innerHTML = `<div class="error-box">編集ページの読み込みに失敗しました。</div>`;
    }
}


// --- 狩猟者データ用ヘルパー関数 ---

/**
 * 写真プレビューのHTMLを生成する
 * @param {string} key - 'gun_license_photo' など
 * @param {Blob | null} blobData - 画像Blob
 */
function renderPhotoPreview(key, blobData) {
    let content = '<span class="placeholder">(写真なし)</span>';
    let url = null;
    
    if (blobData) {
        try {
            url = URL.createObjectURL(blobData);
            content = `<img src="${url}" alt="${key} の写真" data-url="${url}">`;
        } catch (e) {
            console.error("Failed to create ObjectURL for preview:", e);
            content = '<span class="placeholder">(画像エラー)</span>';
        }
    }
    
    return `<div class="photo-preview" id="preview-${key}">${content}</div>`;
}

/**
 * 写真 変更/削除 ボタンのHTMLを生成する (編集画面用)
 * @param {string} key - 'gun_license_photo' など
 * @param {boolean} hasExistingPhoto - 既存の写真があるか
 */
function renderPhotoEditControls(key, hasExistingPhoto) {
    return `
        <div class="flex space-x-2 mt-2">
            <label for="upload-${key}" class="btn btn-secondary flex-1">写真${hasExistingPhoto ? '変更' : '追加'}</label>
            <input type="file" id="upload-${key}" class="hidden" accept="image/*" data-key="${key}">
            ${hasExistingPhoto ? `<button type="button" id="delete-${key}" class="btn btn-danger" data-key="${key}">削除</button>` : ''}
        </div>
        <p id="status-${key}" class="text-sm text-gray-500 text-center"></p>
    `;
}

/**
 * 写真の 変更/削除/拡大 イベントリスナーをセットアップする (編集画面用)
 * @param {string} key - 'gun_license_photo' など
 * @param {object} tempPhotos - Blobを一時保存するオブジェクト
 * @param {object} deleteFlags - 削除フラグを保存するオブジェクト
 */
function setupPhotoEventListeners(key, tempPhotos, deleteFlags) {
    const uploadInput = document.getElementById(`upload-${key}`);
    const deleteBtn = document.getElementById(`delete-${key}`);
    const previewEl = document.getElementById(`preview-${key}`);
    const statusEl = document.getElementById(`status-${key}`);

    // 1. ファイル選択 (変更)
    uploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        statusEl.textContent = 'リサイズ中...';
        try {
            // main.js の resizeImage を呼び出す
            const resizedBlob = await resizeImage(file, 800);
            tempPhotos[key] = resizedBlob; // 一時保存
            deleteFlags[key] = false; // 削除フラグをリセット
            
            // プレビューを更新
            const url = URL.createObjectURL(resizedBlob);
            previewEl.innerHTML = `<img src="${url}" alt="新しい写真" data-url="${url}">`;
            statusEl.textContent = '写真が変更されました (未保存)';
            
            // 削除ボタンがなければ動的に追加 (「写真なし」からの変更)
            if (!document.getElementById(`delete-${key}`)) {
                const newDeleteBtn = document.createElement('button');
                newDeleteBtn.type = 'button';
                newDeleteBtn.id = `delete-${key}`;
                newDeleteBtn.className = 'btn btn-danger';
                newDeleteBtn.dataset.key = key;
                newDeleteBtn.textContent = '削除';
                uploadInput.closest('.flex').appendChild(newDeleteBtn);
                // 新しく作ったボタンにリスナーを再設定
                setupDeleteListener(newDeleteBtn.id, key, tempPhotos, deleteFlags);
            }

        } catch (err) {
            console.error("Photo processing failed:", err);
            statusEl.textContent = '写真の処理に失敗しました。';
        }
        uploadInput.value = null; // inputをリセット
    });
    
    // 2. 削除ボタン
    if (deleteBtn) {
        setupDeleteListener(deleteBtn.id, key, tempPhotos, deleteFlags);
    }
}

/** 削除ボタンのリスナーをセットアップ (上記関数から分離) */
function setupDeleteListener(btnId, key, tempPhotos, deleteFlags) {
    const deleteBtn = document.getElementById(btnId);
    if (!deleteBtn) return;
    
    deleteBtn.onclick = (e) => {
        e.preventDefault();
        if (!window.confirm('この写真を削除しますか？\n（保存ボタンを押すまで確定されません）')) {
            return;
        }
        
        deleteFlags[key] = true; // 削除フラグを立てる
        tempPhotos[key] = null; // 一時Blobをクリア
        
        // プレビューをリセット
        const previewEl = document.getElementById(`preview-${key}`);
        previewEl.innerHTML = '<span class="placeholder">(写真なし)</span>';
        
        // ステータスを更新
        document.getElementById(`status-${key}`).textContent = '写真は削除されます (未保存)';
        
        // 削除ボタン自体を隠す
        deleteBtn.remove();
    };
}


/**
 * ページ内の全プレビュー画像に拡大モーダルのクリックイベントを付与する (表示/編集 共通)
 */
function attachModalClickEvents() {
    document.querySelectorAll('.photo-preview img').forEach(img => {
        // 既存のリスナーを削除 (二重登録防止)
        img.onclick = null; 
        
        img.onclick = (e) => {
            const blobUrl = e.target.dataset.url;
            if (blobUrl) {
                // main.js の showImageModal を呼び出す
                showImageModal(blobUrl);
            }
        };
    });
}