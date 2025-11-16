// このファイルは info.js です
// ★ 修正: 2025/11/15 ユーザー指摘のUI・ロジック修正を適用
// ★ 修正: [パフォーマンス #1] renderGameAnimalList のクエリを orderBy -> filter の順に修正
// ★ 修正: [パフォーマンス #2] メモリリーク対策 (Blob URL) を適用
// ★ 修正: <label> 警告の修正 (for属性の追加)

/**
 * 「情報」タブのメインページを表示する
 */
async function showInfoPage() {
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
            <div class="card bg-white">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">情報メニュー</h2>
                <div class="space-y-3">
                    <button id="info-game-animal-btn" class="btn btn-secondary w-full justify-start text-left">
                        <span class="w-6">🐾</span> 鳥獣図鑑
                    </button>
                    <button id="info-profile-btn" class="btn btn-secondary w-full justify-start text-left">
                        <span class="w-6">👤</span> 捕獲者情報
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // --- イベントリスナー ---
    
    // 図鑑ボタンのイベントリスナー
    document.getElementById('info-game-animal-btn').addEventListener('click', () => {
        showGameAnimalListPage();
    });
    
    // 捕獲者情報ボタンのリスナー
    document.getElementById('info-profile-btn').addEventListener('click', () => {
        showProfilePage();
    });
}


// --- 狩猟鳥獣 図鑑 (リスト) ---------------------------------

/**
 * 狩猟鳥獣図鑑の「一覧ページ」を表示する
 */
async function showGameAnimalListPage() {
    // 現在のフィルター状態を取得
    const filters = appState.gameAnimalFilters;

    let html = `
        <div class="space-y-4">
            <div class="card bg-white">
                <div class="grid grid-cols-2 gap-4">
                    <div class="form-group mb-0">
                        <label for="game-filter-category" class="form-label">分類:</label>
                        <select id="game-filter-category" class="form-select">
                            <option value="all" ${filters.category === 'all' ? 'selected' : ''}>すべて</option>
                            <option value="哺乳類" ${filters.category === '哺乳類' ? 'selected' : ''}>哺乳類</option>
                            <option value="鳥類" ${filters.category === '鳥類' ? 'selected' : ''}>鳥類</option>
                        </select>
                    </div>
                    
                    <div class="form-group mb-0">
                        <label for="game-filter-status" class="form-label">狩猟対象:</label>
                        <select id="game-filter-status" class="form-select">
                            <option value="all" ${filters.status === 'all' ? 'selected' : ''}>すべて</option>
                            <option value="〇" ${filters.status === '〇' ? 'selected' : ''}>〇 (対象)</option>
                            <option value="×" ${filters.status === '×' ? 'selected' : ''}>× (対象外)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div id="game-animal-list" class="space-y-3">
                <p class="text-gray-500 text-center py-4">読み込み中...</p>
            </div>
        </div>
    `;
    
    app.innerHTML = html;

    // ヘッダーを更新 (戻るボタンはメインメニューへ)
    updateHeader('鳥獣図鑑', true);
    backButton.onclick = () => navigateTo('info', showInfoPage, '情報');

    // フィルターのイベントリスナーを設定
    document.getElementById('game-filter-category').addEventListener('change', (e) => {
        appState.gameAnimalFilters.category = e.target.value;
        renderGameAnimalList(); // リストを再描画
    });
    document.getElementById('game-filter-status').addEventListener('change', (e) => {
        appState.gameAnimalFilters.status = e.target.value;
        renderGameAnimalList(); // リストを再描画
    });

    // リストの初回描画
    await renderGameAnimalList();
}

/**
 * 図鑑リストを描画する (フィルタリング実行)
 * (ロジックは修正済み)
 */
async function renderGameAnimalList() {
    const listElement = document.getElementById('game-animal-list');
    if (!listElement) return;
    
    listElement.innerHTML = `<p class="text-gray-500 text-center py-4">読み込み中...</p>`;

    try {
        const filters = appState.gameAnimalFilters;
        
        // 1. 最初にソートする
        let query = db.game_animal_list.orderBy('species_name');
        
        // 2. データを配列として取得
        let animals = await query.toArray();

        // 3. JavaScript側でフィルター
        if (filters.category !== 'all') {
            animals = animals.filter(animal => animal.category === filters.category);
        }
        if (filters.status !== 'all') {
            animals = animals.filter(animal => animal.is_game_animal === filters.status);
        }

        if (animals.length === 0) {
            listElement.innerHTML = `<p class="text-gray-500 text-center py-4">該当する鳥獣はいません。</p>`;
            return;
        }

        // 4. HTMLを構築
        const listItems = animals.map(animal => {
            const statusBadge = animal.is_game_animal === '〇' 
                ? `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-emerald-600 bg-emerald-200">対象</span>`
                : `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-red-600 bg-red-200">対象外</span>`;

            return `
                <div class="trap-card bg-white" data-id="${animal.id}">
                    <div class="flex-grow">
                        <h3 class="text-lg font-semibold text-blue-600">${escapeHTML(animal.species_name)}</h3>
                        <p class="text-sm">${escapeHTML(animal.category)}</p>
                    </div>
                    <div class="flex-shrink-0 ml-4 flex items-center space-x-2">
                        ${statusBadge}
                        <span>&gt;</span>
                    </div>
                </div>
            `;
        }).join('');
        
        listElement.innerHTML = listItems;

        // 5. 各項目のクリックイベントを設定
        listElement.querySelectorAll('.trap-card').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id, 10);
                showGameAnimalDetailPage(id);
            });
        });

    } catch (err) {
        console.error("Failed to render game animal list:", err);
        listElement.innerHTML = `<div class="error-box">図鑑の読み込みに失敗しました。</div>`;
    }
}

// --- 狩猟鳥獣 図鑑 (詳細) ---------------------------------
// (このセクションは修正なし)
async function showGameAnimalDetailPage(id) {
    try {
        const animal = await db.game_animal_list.get(id);
        if (!animal) {
            app.innerHTML = `<div class="error-box">該当するデータが見つかりません。</div>`;
            return;
        }
        
        let imagesHTML = '';
        const imageFiles = [animal.image_1, animal.image_2].filter(img => img); 

        if (imageFiles.length > 0) {
            imagesHTML = '<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-2 mb-4">写真</h2><div class="info-image-gallery">';
            imageFiles.forEach(filename => {
                const imagePath = `./image/${escapeHTML(filename)}`;
                imagesHTML += `
                    <div class="photo-preview cursor-zoom-in">
                        <img src="${imagePath}" alt="${escapeHTML(animal.species_name)}" class="clickable-image">
                    </div>
                `;
            });
            imagesHTML += '</div></div>';
        }

        let descriptionHTML = '';
        if (animal.description && animal.description !== '（説明文をここに）') {
            descriptionHTML = `
                <div class="card bg-white">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">説明</h2>
                    <p class="text-sm text-gray-700 leading-relaxed">${escapeHTML(animal.description).replace(/\n/g, '<br>')}</p>
                </div>
            `;
        }
        
        const tableData = [
            { label: '分類', value: animal.category },
            { label: '狩猟鳥獣', value: animal.is_game_animal },
            { label: '銃', value: animal.method_gun },
            { label: 'わな', value: animal.method_trap },
            { label: 'あみ', value: animal.method_net },
            { label: '狩猟可能な性別', value: animal.gender },
            { label: '狩猟可能な数', value: animal.count },
            { label: '狩猟禁止区域', value: animal.prohibited_area },
            { label: '主な生息地', value: animal.habitat },
            { label: '備考', value: animal.notes },
        ];

        let tableHTML = `
            <div class="card bg-white">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">基本情報</h2>
                <table class="w-full text-sm">
                    <tbody>
        `;
        tableData.forEach(row => {
            if (row.value && row.value.trim() !== "") { 
                tableHTML += `
                    <tr class="border-b">
                        <th class="w-1/3 text-left font-medium text-gray-600 p-2 bg-gray-50">${escapeHTML(row.label)}</th>
                        <td class="w-2/3 text-gray-800 p-2">${escapeHTML(row.value)}</td>
                    </tr>
                `;
            }
        });
        tableHTML += '</tbody></table></div>';
        
        app.innerHTML = `
            <div class="space-y-4">
                ${imagesHTML}
                ${descriptionHTML}
                ${tableHTML}
            </div>
        `;
        
        updateHeader(escapeHTML(animal.species_name), true);
        backButton.onclick = () => showGameAnimalListPage();

        app.querySelectorAll('.clickable-image').forEach(img => {
            img.addEventListener('click', (e) => {
                showImageModal(e.target.src); 
            });
        });

    } catch (err) {
        console.error("Failed to show game animal detail:", err);
        app.innerHTML = `<div class="error-box">詳細の読み込みに失敗しました: ${err.message}</div>`;
    }
}


// --- 捕獲者情報 ---------------------------------
// (このセクションは修正なし)
async function showProfilePage() { // (旧 showHunterProfilePage)
    try {
        let profile = await db.hunter_profile.get('main');
        
        if (!profile) {
            await populateDefaultHunterProfile(); // main.js
            profile = await db.hunter_profile.get('main');
        }
        
        // 各セクションのHTMLを生成
        // ★ 修正: <label> に for 属性を追加
        const createSection = (key, label) => `
            <div class="form-group">
                <label for="profile-${key}" class="form-label">${label} 期限:</label>
                <input type="date" id="profile-${key}" class="form-input" value="${escapeHTML(profile[key] || '')}">
            </div>
            <div class="form-group">
                <label for="image-uploader-${key}" class="form-label">${label} (写真):</label>
                <input type="file" id="image-uploader-${key}" class="form-input" multiple accept="image/*">
                <div id="image-gallery-${key}" class="image-gallery-grid mt-2">
                    <p class="text-gray-500 text-sm">読み込み中...</p>
                </div>
            </div>
            <hr class="my-4">
        `;

        app.innerHTML = `
            <div class="card bg-white">
                <form id="profile-form" class="space-y-4">
                    
                    <div class="form-group">
                        <label for="profile-name" class="form-label">名前:</label>
                        <input type="text" id="profile-name" class="form-input" value="${escapeHTML(profile.name || '')}">
                    </div>
                    
                    <hr class="my-4">
                    
                    ${createSection('gun_license_renewal', '銃所持許可')}
                    ${createSection('hunting_license_renewal', '狩猟免許')}
                    ${createSection('registration_renewal', '狩猟者登録')}
                    ${createSection('explosives_permit_renewal', '火薬類譲受許可')}
                    
                    <button type="submit" class="btn btn-primary w-full">
                        期限と名前を保存
                    </button>
                </form>
                
                <div id="profile-save-status" class="text-center mt-2 h-4"></div>
            </div>
        `;
        
        updateHeader('捕獲者情報', true);
        backButton.onclick = () => navigateTo('info', showInfoPage, '情報');
        
        // --- イベントリスナー ---
        
        // 1. テキスト情報（名前・期限）の保存
        document.getElementById('profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const statusElement = document.getElementById('profile-save-status');
            statusElement.textContent = '保存中...';
            statusElement.className = 'text-gray-500';

            try {
                const updatedProfile = {
                    key: 'main',
                    name: document.getElementById('profile-name').value,
                    gun_license_renewal: document.getElementById('profile-gun_license_renewal').value,
                    hunting_license_renewal: document.getElementById('profile-hunting_license_renewal').value,
                    registration_renewal: document.getElementById('profile-registration_renewal').value,
                    explosives_permit_renewal: document.getElementById('profile-explosives_permit_renewal').value,
                };
                
                await db.hunter_profile.put(updatedProfile);

                statusElement.textContent = '保存しました！';
                statusElement.className = 'text-green-600';
                setTimeout(() => { statusElement.textContent = ''; }, 2000);

            } catch (err) {
                console.error("Failed to save hunter profile:", err);
                statusElement.textContent = `保存に失敗: ${err.message}`;
                statusElement.className = 'text-red-600';
            }
        });

        // 2. 画像のロードとイベントリスナー設定
        const sections = ['gun_license_renewal', 'hunting_license_renewal', 'registration_renewal', 'explosives_permit_renewal'];
        sections.forEach(key => {
            // 画像をロード (v10 の profile_images を使用)
            loadProfileImages(key);
            
            // アップロードのリスナー
            document.getElementById(`image-uploader-${key}`).addEventListener('change', async (e) => {
                const files = e.target.files;
                if (!files.length) return;

                const statusElement = document.getElementById('profile-save-status');
                statusElement.textContent = '画像処理中...';
                
                try {
                    for (const file of files) {
                        const resizedBlob = await resizeImage(file, 800); // main.js
                        await db.profile_images.add({ // v10
                            type: key,
                            image_blob: resizedBlob
                        });
                    }
                    statusElement.textContent = '画像を追加しました！';
                    statusElement.className = 'text-green-600';
                } catch (err) {
                     console.error("Failed to add profile image:", err);
                     statusElement.textContent = `画像追加に失敗: ${err.message}`;
                     statusElement.className = 'text-red-600';
                }
                
                loadProfileImages(key); // ギャラリーを再描画
                e.target.value = null; // inputをクリア
                setTimeout(() => { statusElement.textContent = ''; }, 2000);
            });
        });

    } catch (err) {
        console.error("Failed to load hunter profile page:", err);
        app.innerHTML = `<div class="error-box">プロファイルページの読み込みに失敗しました: ${err.message}</div>`;
    }
}

/**
 * 捕獲者情報の画像ギャラリーを描画する
 * (v10 の profile_images テーブルを参照)
 * (メモリリーク対策 適用済み)
 * @param {string} type - 'gun_license_renewal' などのキー
 */
async function loadProfileImages(type) {
    const gallery = document.getElementById(`image-gallery-${type}`);
    if (!gallery) return;
    
    gallery.innerHTML = '';
    
    try {
        const images = await db.profile_images.where('type').equals(type).toArray();
        if (images.length === 0) {
            gallery.innerHTML = '<p class="text-gray-500 text-sm">写真はありません</p>';
            return;
        }
        
        images.forEach(image => {
            const blobUrl = URL.createObjectURL(image.image_blob);
            // [パフォーマンス #2] URLをグローバルに保存
            appState.activeBlobUrls.push(blobUrl);
            
            const div = document.createElement('div');
            div.className = 'photo-preview';
            div.innerHTML = `
                <img src="${blobUrl}" alt="許可証の写真" class="clickable-image">
                <button type="button" class="photo-preview-btn-delete" data-id="${image.id}">&times;</button>
            `;
            
            // クリックで拡大
            div.querySelector('img').addEventListener('click', () => showImageModal(blobUrl));
            
            // 削除ボタン
            div.querySelector('.photo-preview-btn-delete').addEventListener('click', async (e) => {
                const id = parseInt(e.currentTarget.dataset.id, 10);
                if (confirm('この写真を削除しますか？')) {
                    try {
                        await db.profile_images.delete(id);
                        // URL.revokeObjectURL(blobUrl); // ← navigateTo で一括解放
                        loadProfileImages(type); // ギャラリーを再描画
                    } catch (err) {
                        alert('削除に失敗しました。');
                    }
                }
            });
            
            gallery.appendChild(div);
        });
        
    } catch (err) {
        console.error(`Failed to load images for ${type}:`, err);
        gallery.innerHTML = '<p class="text-red-500 text-sm">写真の読み込みに失敗</p>';
    }
}