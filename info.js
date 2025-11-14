// このファイルは info.js です

/**
 * 「情報」タブがクリックされたときに main.js から呼ばれるメイン関数
 */
function showInfoPage() {
    // navigateTo は main.js で定義されたグローバル関数
    navigateTo('info', renderInfoMenu, '情報');
}

/**
 * ★★★ 修正: 情報タブのメインメニューを描画する
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
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">法令情報</h2>
                <ul class="space-y-2">
                    <li><button id="show-game-animal-list-csv-btn" class="btn btn-secondary w-full">狩猟鳥獣一覧</button></li>
                    <li><button id="show-game-animals-btn" class="btn btn-secondary w-full">図鑑</button></li>
                </ul>
            </div>
        </div>
    `;
    
    // --- イベントリスナーを設定 ---
    document.getElementById('show-hunter-data-btn').addEventListener('click', () => {
        showHunterDataPage();
    });
    
    document.getElementById('show-game-animal-list-csv-btn').addEventListener('click', () => {
        showGameAnimalListPageCSV();
    });
    document.getElementById('show-game-animals-btn').addEventListener('click', () => {
        showGameAnimalListPage();
    });
}

// ===============================================
// ★★★ 狩猟者データ (変更なし) ★★★
// ===============================================

/**
 * 狩猟者データの「表示」ページ (変更なし)
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
                
                <hr>
                <div class="space-y-2">
                    <h3 class="text-lg font-semibold">火薬類の譲受許可証</h3>
                    <div class="form-group">
                        <label class="form-label">次回の更新 (または有効期限)</label>
                        <p class="text-gray-700">${escapeHTML(profile.explosives_permit_renewal) || '(未設定)'}</p>
                    </div>
                    <label class="form-label">写真</label>
                    <div id="gallery-explosives_permit" class="grid grid-cols-3 gap-2 mb-3">
                        <p class="text-sm text-gray-500">読み込み中...</p>
                    </div>
                </div>

            </div>
        `;
        
        // 4つのギャラリーを非同期で描画
        await renderProfilePhotoGallery('gun_license', 'gallery-gun_license', false);
        await renderProfilePhotoGallery('hunting_license', 'gallery-hunting_license', false);
        await renderProfilePhotoGallery('registration', 'gallery-registration', false);
        await renderProfilePhotoGallery('explosives_permit', 'gallery-explosives_permit', false);
        
    } catch (err) {
        console.error("Failed to load hunter data:", err);
        app.innerHTML = `<div class="error-box">狩猟者データの読み込みに失敗しました。</div>`;
    }
}

/**
 * 狩猟者データの「編集」ページ (変更なし)
 */
async function showHunterDataEditPage() {
    updateHeader('狩猟者データを編集', true);
    // 戻るボタンの動作を上書き
    backButton.onclick = () => showHunterDataPage(); // 表示ページに戻る
    
    // 画像Blobを一時保存する変数
    let tempPhotos = {
        gun_license: [],
        hunting_license: [],
        registration: [],
        explosives_permit: []
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
                
                <hr>
                <div class="space-y-2">
                    <h3 class="text-lg font-semibold">火薬類の譲受許可証</h3>
                    <div class="form-group">
                        <label for="explosives_permit_renewal" class="form-label">次回の更新 (または有効期限)</label>
                        <input type="text" id="explosives_permit_renewal" name="explosives_permit_renewal" class="form-input" value="${escapeHTML(profile.explosives_permit_renewal || '')}" placeholder="例: 2025年6月">
                    </div>
                    <label class="form-label">写真</label>
                    <div id="gallery-explosives_permit" class="grid grid-cols-3 gap-2 mb-3"></div>
                    ${renderPhotoEditControls('explosives_permit')}
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
        await renderProfilePhotoGallery('gun_license', 'gallery-gun_license', true, tempPhotos, photosToDelete);
        setupProfilePhotoUpload('gun_license', tempPhotos, photosToDelete);
        
        await renderProfilePhotoGallery('hunting_license', 'gallery-hunting_license', true, tempPhotos, photosToDelete);
        setupProfilePhotoUpload('hunting_license', tempPhotos, photosToDelete);

        await renderProfilePhotoGallery('registration', 'gallery-registration', true, tempPhotos, photosToDelete);
        setupProfilePhotoUpload('registration', tempPhotos, photosToDelete);

        await renderProfilePhotoGallery('explosives_permit', 'gallery-explosives_permit', true, tempPhotos, photosToDelete);
        setupProfilePhotoUpload('explosives_permit', tempPhotos, photosToDelete);

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
                registration_renewal: formData.get('registration_renewal'),
                explosives_permit_renewal: formData.get('explosives_permit_renewal')
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
 * 写真「追加」ボタンのHTMLを生成する (編集画面用)
 * (変更なし)
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
 * 複数写真ギャラリーを描画
 * (変更なし)
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
                        // プレースホルダーの再チェック
                        if (container.querySelectorAll('div').length === 0) {
                             container.innerHTML = `<p class="text-sm text-gray-500 col-span-3">(写真なし)</p>`;
                        }
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
 * 複数写真アップロードリスナー
 * (変更なし)
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

// ===============================================
// ★★★ 狩猟鳥獣図鑑 (v14) ★★★
// ===============================================

/**
 * 「狩猟鳥獣」図鑑リストページを表示する
 */
async function showGameAnimalListPage() {
    // ★★★ 修正: ヘッダータイトル ★★★
    updateHeader('図鑑', true); 
    // 戻るボタンの動作を上書き
    backButton.onclick = () => showInfoPage();

    // 絞り込み条件の初期化 (main.js で定義済み)
    if (!appState.gameAnimalFilters) {
        appState.gameAnimalFilters = { category: 'all', status: 'all' };
    }

    app.innerHTML = `
        <div class="card mb-4">
            <div class="grid grid-cols-2 gap-3">
                <div class="form-group mb-0">
                    <label for="filter-game-category" class="form-label">種類</label>
                    <select id="filter-game-category" class="form-select mt-1">
                        <option value="all">すべて</option>
                        <option value="哺乳類">哺乳類</option>
                        <option value="鳥類">鳥類</option>
                    </select>
                </div>
                <div class="form-group mb-0">
                    <label for="filter-game-status" class="form-label">ステータス</label>
                    <select id="filter-game-status" class="form-select mt-1">
                        <option value="all">すべて</option>
                        <option value="game">狩猟鳥獣</option>
                        <option value="pest">有害鳥獣のみ</option>
                    </select>
                </div>
            </div>
        </div>

        <div id="game-animal-list-container" class="space-y-3">
            <p class="text-gray-500 text-center py-4">読み込み中...</p>
        </div>
    `;
    
    // 絞り込みプルダウンに現在の状態を反映
    const categorySelect = document.getElementById('filter-game-category');
    const statusSelect = document.getElementById('filter-game-status');
    categorySelect.value = appState.gameAnimalFilters.category;
    statusSelect.value = appState.gameAnimalFilters.status;

    // --- イベントリスナーを設定 ---
    categorySelect.addEventListener('change', (e) => {
        appState.gameAnimalFilters.category = e.target.value;
        renderGameAnimalList(); // 再描画
    });
    statusSelect.addEventListener('change', (e) => {
        appState.gameAnimalFilters.status = e.target.value;
        renderGameAnimalList(); // 再描画
    });

    // リストを初期描画
    await renderGameAnimalList();
}

/**
 * 狩猟鳥獣リストをDBから読み込んで描画する
 */
async function renderGameAnimalList() {
    const container = document.getElementById('game-animal-list-container');
    if (!container) return;

    try {
        // 1. 絞り込み
        const { category, status } = appState.gameAnimalFilters;
        let query = db.game_animals.toCollection();

        if (category !== 'all') {
            query = query.filter(animal => animal.category === category);
        }
        if (status === 'game') {
            query = query.filter(animal => animal.is_game_animal === true);
        } else if (status === 'pest') {
            query = query.filter(animal => animal.is_game_animal === false);
        }
        
        // 2. データを取得
        const animals = await query.sortBy('species_name');

        if (animals.length === 0) {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">該当する鳥獣はありません。</p>`;
            return;
        }

        // 3. 描画
        container.innerHTML = animals.map(animal => {
            const statusText = animal.is_game_animal ? '狩猟鳥獣' : '有害鳥獣';
            const statusClass = animal.is_game_animal ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

            return `
                <div class="trap-card" data-id="${animal.id}">
                    <div class="flex-grow min-w-0">
                        <h3 class="text-lg font-semibold text-blue-600 truncate">${escapeHTML(animal.species_name)}</h3>
                        <p class="text-sm text-gray-500 truncate">${escapeHTML(animal.category)}</p>
                    </div>
                    <span class="text-sm font-bold px-3 py-1 rounded-full ${statusClass} flex-shrink-0 ml-2">
                        ${statusText}
                    </span>
                </div>
            `;
        }).join('');

        // 4. クリックイベント
        container.querySelectorAll('.trap-card').forEach(card => {
            card.addEventListener('click', () => {
                const animalId = Number(card.dataset.id);
                showGameAnimalDetailPage(animalId); // 詳細ページへ
            });
        });

    } catch (err) {
        console.error("Failed to render game animal list:", err);
        container.innerHTML = `<div class="error-box">鳥獣リストの読み込みに失敗しました。</div>`;
    }
}

/**
 * 狩猟鳥獣の「詳細」ページ
 */
async function showGameAnimalDetailPage(animalId) {
    try {
        const animal = await db.game_animals.get(animalId);
        if (!animal) throw new Error("Animal not found");

        updateHeader(animal.species_name, true); 
        // 戻るボタンの動作を上書き
        backButton.onclick = () => showGameAnimalListPage();

        const statusText = animal.is_game_animal ? '狩猟鳥獣' : '有害鳥獣';
        const statusClass = animal.is_game_animal ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

        app.innerHTML = `
            <div class="card space-y-4">
                
                <div class="flex justify-between items-start">
                    <div>
                        <h2 class="text-xl font-semibold">${escapeHTML(animal.species_name)}</h2>
                        <p class="text-gray-500">${escapeHTML(animal.category)}</p>
                    </div>
                    <span class="text-sm font-bold px-3 py-1 rounded-full ${statusClass} flex-shrink-0 ml-2">
                        ${statusText}
                    </span>
                </div>
                
                ${(animal.notes && animal.notes.trim() !== "") ? `
                <hr>
                <div>
                    <h3 class="text-md font-semibold mb-1">備考</h3>
                    <p class="text-gray-700">${escapeHTML(animal.notes)}</p>
                </div>
                ` : ''}
                
            </div>
        `;

    } catch (err) {
        console.error("Failed to load game animal detail:", err);
        app.innerHTML = `<div class="error-box">鳥獣詳細の読み込みに失敗しました。</div>`;
    }
}

// ===============================================
// ★★★ 新規: 狩猟鳥獣一覧 (CSV) ★★★
// ===============================================

/**
 * 「狩猟鳥獣一覧」ページ (CSVベース)
 */
async function showGameAnimalListPageCSV() {
    updateHeader('狩猟鳥獣一覧', true); 
    // 戻るボタンの動作を上書き
    backButton.onclick = () => showInfoPage();

    app.innerHTML = `
        <div class="card">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-300" style="border-collapse: collapse;">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">種類</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">種名</th>
                            <th class="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">網</th>
                            <th class="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">わな</th>
                            <th class="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">銃器</th>
                            <th class="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">備考</th>
                        </tr>
                    </thead>
                    <tbody id="game-csv-list-container" class="divide-y divide-gray-200">
                        <tr><td colspan="6" class="p-4 text-center text-gray-500">読み込み中...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // リストを描画
    await renderGameAnimalListCSV();
}

/**
 * ★★★ 修正: 狩猟鳥獣一覧(CSV)をDBから読み込んでテーブルに描画する
 */
async function renderGameAnimalListCSV() {
    const container = document.getElementById('game-csv-list-container');
    if (!container) return;
    
    // style.css のテーマ変数を利用
    const textColor = 'var(--color-text-primary)';
    const borderColor = 'var(--color-border)';

    try {
        // ★★★ 修正: バグ修正。先に toArray() で全件取得 ★★★
        const animals = await db.game_animal_list.toArray();
            
        // ★★★ 修正: JSの .sort() で並び替え ★★★
        animals.sort((a, b) => {
            // カテゴリでソート (鳥類 -> 哺乳類)
            if (a.category > b.category) return -1;
            if (a.category < b.category) return 1;
            // カテゴリが同じなら種名でソート
            return a.species_name.localeCompare(b.species_name, 'ja');
        });
            
        // カテゴリでグループ化
        const grouped = animals.reduce((acc, animal) => {
            (acc[animal.category] = acc[animal.category] || []).push(animal);
            return acc;
        }, {});

        if (animals.length === 0) {
            container.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">データがありません。</td></tr>`;
            return;
        }

        let html = '';
        // ★★★ 修正: ソート順を ['鳥類', '哺乳類'] に固定 ★★★
        ['鳥類', '哺乳類'].forEach(category => {
            if (grouped[category]) {
                // カテゴリ行
                html += `
                    <tr class="bg-gray-100" style="background-color: var(--color-bg-primary);">
                        <td colspan="6" class="px-3 py-2 text-sm font-bold" style="color: ${textColor}; border: 1px solid ${borderColor};">
                            ${escapeHTML(category)}
                        </td>
                    </tr>
                `;
                // データ行
                grouped[category].forEach(animal => {
                    html += `
                        <tr class="hover:bg-gray-50" style="background-color: var(--color-bg-secondary);">
                            <td class="px-3 py-2 text-sm" style="color: ${textColor}; border: 1px solid ${borderColor};">${escapeHTML(animal.category)}</td>
                            <td class="px-3 py-2 text-sm font-medium" style="color: ${textColor}; border: 1px solid ${borderColor};">${escapeHTML(animal.species_name)}</td>
                            <td class="px-3 py-2 text-sm text-center" style="color: ${textColor}; border: 1px solid ${borderColor};">${escapeHTML(animal.method_net)}</td>
                            <td class="px-3 py-2 text-sm text-center" style="color: ${textColor}; border: 1px solid ${borderColor};">${escapeHTML(animal.method_trap)}</td>
                            <td class="px-3 py-2 text-sm text-center" style="color: ${textColor}; border: 1px solid ${borderColor};">${escapeHTML(animal.method_gun)}</td>
                            <td class="px-3 py-2 text-sm" style="color: ${textColor}; border: 1px solid ${borderColor};">${escapeHTML(animal.notes)}</td>
                        </tr>
                    `;
                });
            }
        });
        
        container.innerHTML = html;

    } catch (err) {
        console.error("Failed to render game animal list (CSV):", err);
        container.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-600">リストの読み込みに失敗しました。</td></tr>`;
    }
}