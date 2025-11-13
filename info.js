// このファイルは info.js です

/**
 * 「情報」タブがクリックされたときに main.js から呼ばれるメイン関数
 */
function showInfoPage() {
    // navigateTo は main.js で定義されたグローバル関数
    navigateTo('info', renderInfoMenu, '情報');
}

/**
 * 情報タブのメインメニューを描画する
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
 * ★★★ 修正: 狩猟者データの「表示」ページ (複数画像対応) ★★★
 */
async function showHunterDataPage() {
    updateHeader('狩猟者データ', true);
    // 戻るボタンの動作を上書き
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
                    <div id="gallery-gun_license" class="grid grid-cols-3 gap-2 mb-3">
                        <p class="text-sm text-gray-500">読み込み中...</p>
                    </div>
                </div>
                
                <hr>

                <div class="space-y-2">
                    <h3 class="text-lg font-semibold">狩猟免許</h3>
                    <div class="form-group">
                        <label class="form-label">次回の更新</label>
                        <p class="text-gray-700">${escapeHTML(profile.hunting_license_renewal) || '(未設定)'}</p>
                    </div>
                    <label class="form-label">写真</label>
                    <div id="gallery-hunting_license" class="grid grid-cols-3 gap-2 mb-3">
                        <p class="text-sm text-gray-500">読み込み中...</p>
                    </div>
                </div>
                
                <hr>
                
                <div class="space-y-2">
                    <h3 class="text-lg font-semibold">狩猟登録証 / 許可証</h3>
                    <div class="form-group">
                        <label class="form-label">次回の更新 (または有効期限)</label>
                        <p class="text-gray-700">${escapeHTML(profile.registration_renewal) || '(未設定)'}</p>
                    </div>
                    <label class="form-label">写真</label>
                    <div id="gallery-registration" class="grid grid-cols-3 gap-2 mb-3">
                        <p class="text-sm text-gray-500">読み込み中...</p>
                    </div>
                </div>

            </div>
        `;
        
        // ★ 修正: 3つのギャラリーを非同期で描画 (編集モード=false)
        await renderProfilePhotoGallery('gun_license', 'gallery-gun_license', false);
        await renderProfilePhotoGallery('hunting_license', 'gallery-hunting_license', false);
        await renderProfilePhotoGallery('registration', 'gallery-registration', false);
        
    } catch (err) {
        console.error("Failed to load hunter data:", err);
        app.innerHTML = `<div class="error-box">狩猟者データの読み込みに失敗しました。</div>`;
    }
}

/**
 * ★★★ 修正: 狩猟者データの「編集」ページ (複数画像対応) ★★★
 */
async function showHunterDataEditPage() {
    updateHeader('狩猟者データを編集', true);
    // 戻るボタンの動作を上書き
    backButton.onclick = () => showHunterDataPage(); // 表示ページに戻る
    
    // 画像Blobを一時保存する変数
    let tempPhotos = {
        gun_license: [],
        hunting_license: [],
        registration: []
    };
    // 削除フラグ
    let photosToDelete = []; // 削除対象の Photo ID

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
                    <div id="gallery-gun_license" class="grid grid-cols-3 gap-2 mb-3"></div>
                    ${renderPhotoEditControls('gun_license')}
                </div>
                
                <hr>

                <div class="space-y-2">
                    <h3 class="text-lg font-semibold">狩猟免許</h3>
                    <div class="form-group">
                        <label for="hunting_license_renewal" class="form-label">次回の更新 (年/月)</label>
                        <input type="text" id="hunting_license_renewal" name="hunting_license_renewal" class="form-input" value="${escapeHTML(profile.hunting_license_renewal || '')}" placeholder="例: 2026年9月">
                    </div>
                    <label class="form-label">写真</label>
                    <div id="gallery-hunting_license" class="grid grid-cols-3 gap-2 mb-3"></div>
                    ${renderPhotoEditControls('hunting_license')}
                </div>
                
                <hr>
                
                <div class="space-y-2">
                    <h3 class="text-lg font-semibold">狩猟登録証 / 許可証</h3>
                    <div class="form-group">
                        <label for="registration_renewal" class="form-label">次回の更新 (または有効期限)</label>
                        <input type="text" id="registration_renewal" name="registration_renewal" class="form-input" value="${escapeHTML(profile.registration_renewal || '')}" placeholder="例: 2025年3月">
                    </div>
                    <label class="form-label">写真</label>
                    <div id="gallery-registration" class="grid grid-cols-3 gap-2 mb-3"></div>
                    ${renderPhotoEditControls('registration')}
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
        // (編集モード=true でギャラリーを描画し、アップロードリスナーを設定)
        await renderProfilePhotoGallery('gun_license', 'gallery-gun_license', true, tempPhotos, photosToDelete);
        setupProfilePhotoUpload('gun_license', tempPhotos, photosToDelete);
        
        await renderProfilePhotoGallery('hunting_license', 'gallery-hunting_license', true, tempPhotos, photosToDelete);
        setupProfilePhotoUpload('hunting_license', tempPhotos, photosToDelete);

        await renderProfilePhotoGallery('registration', 'gallery-registration', true, tempPhotos, photosToDelete);
        setupProfilePhotoUpload('registration', tempPhotos, photosToDelete);

        // 3. 保存ボタン
        document.getElementById('hunter-profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('save-profile-btn');
            saveBtn.disabled = true;
            saveBtn.classList.add('btn-loading');
            saveBtn.textContent = '保存中...';
            
            const formData = new FormData(e.target);
            
            // 1. テキストデータ更新
            const dataToUpdate = {
                name: formData.get('name'),
                gun_license_renewal: formData.get('gun_license_renewal'),
                hunting_license_renewal: formData.get('hunting_license_renewal'),
                registration_renewal: formData.get('registration_renewal')
            };
            
            try {
                // 'main' キーのテキストデータを更新
                await db.hunter_profile.update('main', dataToUpdate);

                // 2. 削除対象の写真をDBから削除
                if (photosToDelete.length > 0) {
                    await db.profile_photos.bulkDelete(photosToDelete);
                }
                
                // 3. 新規追加のBlobをDBに保存
                const photosToAdd = [];
                for (const type in tempPhotos) {
                    for (const blob of tempPhotos[type]) {
                        photosToAdd.push({
                            type: type, // 'gun_license' など
                            image_data: blob
                        });
                    }
                }
                if (photosToAdd.length > 0) {
                    await db.profile_photos.bulkAdd(photosToAdd);
                }

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
 * ★★★ 修正: 複数写真用の「追加」ボタン ★★★
 * 写真「追加」ボタンのHTMLを生成する (編集画面用)
 * @param {string} key - 'gun_license' など
 */
function renderPhotoEditControls(key) {
    return `
        <div class="form-group mt-2">
            <label for="upload-${key}" class="btn btn-secondary w-full">＋ 写真を追加</label>
            <input type="file" id="upload-${key}" class="hidden" accept="image/*" multiple data-key="${key}">
        </div>
        <p id="status-${key}" class="text-sm text-gray-500 text-center"></p>
    `;
}

/**
 * ★★★ 新規: 複数写真ギャラリーを描画 ★★★
 * (catch.js の renderPhotoList を改造)
 * @param {string} type - 'gun_license' など
 * @param {string} containerId - 描画先のコンテナID
 * @param {boolean} isEditMode - 削除ボタンを付けるか
 * @param {object} [tempPhotos] - (編集モード用) 新規Blob配列
 * @param {Array<number>} [photosToDelete] - (編集モード用) 削除ID配列
 */
async function renderProfilePhotoGallery(type, containerId, isEditMode, tempPhotos = null, photosToDelete = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ''; // いったんクリア
    let photoCount = 0;

    // 1. 既存の写真をDBから読み込む
    const existingPhotos = await db.profile_photos.where('type').equals(type).toArray();
    existingPhotos.forEach(photo => {
        // 編集モードで、削除対象に含まれていなければ表示
        if (!isEditMode || !photosToDelete.includes(photo.id)) {
            let url;
            try {
                url = URL.createObjectURL(photo.image_data);
            } catch (e) {
                console.error("Failed to create ObjectURL for existing photo:", e);
                return; // Blobが不正ならスキップ
            }
            
            const div = document.createElement('div');
            // style.css で .photo-preview を定義済み
            div.className = 'photo-preview';
            
            let deleteBtnHtml = '';
            if (isEditMode) {
                // style.css で .photo-preview-btn-delete を定義済み
                deleteBtnHtml = `<button class="photo-preview-btn-delete" data-photoid="${photo.id}">×</button>`;
            }
            
            div.innerHTML = `
                <img src="${url}" alt="${type} の写真" data-url="${url}">
                ${deleteBtnHtml}
            `;
            
            // 拡大イベント
            div.querySelector('img').onclick = () => showImageModal(URL.createObjectURL(photo.image_data));
            
            // 削除イベント
            if (isEditMode) {
                div.querySelector('button').onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation(); // 拡大イベントを抑制
                    if (window.confirm('この写真を削除しますか？ (保存を押すまで確定されません)')) {
                        photosToDelete.push(photo.id); // 削除リストに追加
                        div.remove(); // 画面から削除
                    }
                };
            }
            container.appendChild(div);
            photoCount++;
        }
    });
    
    // 2. (編集モードのみ) 新規追加のBlobを表示
    if (isEditMode && tempPhotos[type].length > 0) {
        tempPhotos[type].forEach((blob, index) => {
            const url = URL.createObjectURL(blob);
            const div = document.createElement('div');
            div.className = 'photo-preview opacity-80'; // 新規追加は少し薄く
            
            div.innerHTML = `
                <img src="${url}" alt="新規の写真" data-url="${url}">
                <button class="photo-preview-btn-delete" data-blobindex="${index}">×</button>
            `;
            
            // 拡大イベント
            div.querySelector('img').onclick = () => showImageModal(URL.createObjectURL(blob));
            
            // 削除イベント
            div.querySelector('button').onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                tempPhotos[type].splice(index, 1); // 配列から削除
                // ギャラリー全体を再描画
                renderProfilePhotoGallery(type, containerId, isEditMode, tempPhotos, photosToDelete);
            };
            container.appendChild(div);
            photoCount++;
        });
    }
    
    // 3. 1枚も写真がない場合のプレースホルダー
    if (photoCount === 0) {
        container.innerHTML = `<p class="text-sm text-gray-500 col-span-3">(写真なし)</p>`;
    }

    // 4. メモリリーク防止
    setTimeout(() => {
        container.querySelectorAll('img').forEach(img => {
            if (img.src.startsWith('blob:')) {
                URL.revokeObjectURL(img.src);
            }
        });
    }, 1000);
}

/**
 * ★★★ 新規: 複数写真アップロードリスナー ★★★
 * 写真の「追加」ボタンにイベントリスナーを設定する (編集画面用)
 * (catch.js のロジックを改造)
 * @param {string} key - 'gun_license' など
 * @param {object} tempPhotos - Blobを一時保存するオブジェクト
 * @param {Array<number>} photosToDelete - 削除ID配列
 */
function setupProfilePhotoUpload(key, tempPhotos, photosToDelete) {
    const uploadInput = document.getElementById(`upload-${key}`);
    const statusEl = document.getElementById(`status-${key}`);
    const containerId = `gallery-${key}`;
    
    uploadInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        statusEl.textContent = `写真${files.length}件をリサイズ中...`;
        
        try {
            const resizePromises = [];
            for (const file of files) {
                // main.js の resizeImage を呼び出す
                resizePromises.push(resizeImage(file, 800));
            }
            
            const resizedBlobs = await Promise.all(resizePromises);
            tempPhotos[key].push(...resizedBlobs); // 処理済みのBlobを配列に追加
            
            statusEl.textContent = `写真${files.length}件を追加しました (未保存)`;
            // プレビューを更新 (編集モード=true)
            await renderProfilePhotoGallery(key, containerId, true, tempPhotos, photosToDelete);
            
        } catch (err) {
            console.error("Photo processing failed:", err);
            statusEl.textContent = '写真の処理に失敗しました。';
        }
        
        // inputをリセット
        uploadInput.value = null;
    });
}