// このファイルは info.js です (再々修正版)

/**
 * 「情報」タブのメインページを表示する
 */
async function showInfoPage() {
    app.innerHTML = `
        <div class="space-y-4">
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">情報メニュー</h2>
                <div class="space-y-3">
                    <button id="info-game-animal-btn" class="btn btn-secondary w-full justify-start text-left">
                        <span class="w-6">🦌</span> 狩猟鳥獣 図鑑
                    </button>
                    <button id="info-hunter-profile-btn" class="btn btn-secondary w-full justify-start text-left">
                        <span class="w-6">👤</span> 狩猟者プロファイル
                    </button>
                </div>
            </div>
        </div>
    `;

    // 図鑑ボタンのイベントリスナー
    document.getElementById('info-game-animal-btn').addEventListener('click', () => {
        showGameAnimalListPage();
    });
    
    // 狩猟者プロファイルボタンのイベントリスナー
    document.getElementById('info-hunter-profile-btn').addEventListener('click', () => {
        showHunterProfilePage();
    });

    // ヘッダーを更新
    updateHeader('情報', false);
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
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">絞り込み</h2>
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
            
            <div id="game-animal-list-container" class="space-y-3">
                <p class="text-center text-gray-500 py-4">読み込み中...</p>
            </div>
        </div>
    `;
    
    app.innerHTML = html;

    // ヘッダーを更新 (戻るボタンはメインメニューへ)
    updateHeader('狩猟鳥獣 図鑑', true);
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
 */
async function renderGameAnimalList() {
    const listContainer = document.getElementById('game-animal-list-container');
    if (!listContainer) return;
    
    listContainer.innerHTML = `<p class="text-center text-gray-500 py-4">読み込み中...</p>`;

    try {
        const filters = appState.gameAnimalFilters;
        
        // 1. フィルタリングクエリを作成
        let query = db.game_animal_list;
        
        if (filters.category !== 'all') {
            query = query.where('category').equals(filters.category);
        }
        
        if (filters.status !== 'all') {
            if (filters.category === 'all') {
                query = query.where('is_game_animal').equals(filters.status);
            } else {
                query = query.where('is_game_animal').equals(filters.status);
            }
        }
        
        // 2. データを取得 (名前順でソート)
        // ★ 修正: .sortBy(...) -> .orderBy(...).toArray()
        // (query が Table または WhereClause のため)
        const animals = await query.orderBy('species_name').toArray();

        if (animals.length === 0) {
            listContainer.innerHTML = `<p class="text-center text-gray-500 py-4">該当する鳥獣はいません。</p>`;
            return;
        }

        // 3. HTMLを構築 (trap-card スタイルを流用)
        const listItems = animals.map(animal => {
            // 狩猟対象かどうかのバッジ (Tailwind クラスに変更)
            const statusBadge = animal.is_game_animal === '〇' 
                ? `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-emerald-600 bg-emerald-200">対象</span>`
                : `<span class="text-xs font-semibold inline-block py-1 px-2 rounded text-red-600 bg-red-200">対象外</span>`;

            return `
                <div class="trap-card" data-id="${animal.id}">
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
        
        listContainer.innerHTML = listItems;

        // 4. 各項目のクリックイベントを設定
        listContainer.querySelectorAll('.trap-card').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id, 10);
                showGameAnimalDetailPage(id);
            });
        });

    } catch (err) {
        console.error("Failed to render game animal list:", err);
        listContainer.innerHTML = `<div class="error-box">図鑑の読み込みに失敗しました。</div>`;
    }
}

// --- 狩猟鳥獣 図鑑 (詳細) ---------------------------------
// (このセクションは修正なし)
/**
 * 狩猟鳥獣図鑑の「詳細ページ」を表示する
 */
async function showGameAnimalDetailPage(id) {
    try {
        const animal = await db.game_animal_list.get(id);
        if (!animal) {
            app.innerHTML = `<div class="error-box">該当するデータが見つかりません。</div>`;
            return;
        }

        // --- ★ 画像表示のロジック (Tailwind クラスでギャラリーを構成) ---
        let imagesHTML = '';
        const imageFiles = [animal.image_1, animal.image_2].filter(img => img); // null や "" を除外

        if (imageFiles.length > 0) {
            imagesHTML = `
                <div class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">写真</h2>
                    <div class="grid grid-cols-2 gap-2">
            `;
            imageFiles.forEach(filename => {
                // GitHub Pages (またはデプロイ先) の /image/ フォルダを参照
                const imagePath = `./image/${escapeHTML(filename)}`;
                imagesHTML += `
                    <div class="photo-preview cursor-zoom-in">
                        <img src="${imagePath}" alt="${escapeHTML(animal.species_name)}" class="clickable-image">
                    </div>
                `;
            });
            imagesHTML += '</div></div>';
        }

        // --- ★ 説明文表示のロジック ★ ---
        let descriptionHTML = '';
        if (animal.description && animal.description !== '（説明文をここに）') {
            descriptionHTML = `
                <div class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">説明</h2>
                    <p class="text-sm text-gray-700 leading-relaxed">
                        ${escapeHTML(animal.description).replace(/\n/g, '<br>')}
                    </p>
                </div>
            `;
        }
        
        // --- データテーブル (Tailwind クラスでテーブルを構成) ---
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
            <div class="card">
                <h2 class="text-lg font-semibold border-b pb-2 mb-4">基本情報</h2>
                <table class="w-full text-sm">
                    <tbody>
        `;
        tableData.forEach(row => {
            if (row.value) { // 値が設定されているものだけ表示
                tableHTML += `
                    <tr class="border-b">
                        <th class="w-1/3 text-left font-medium text-gray-600 p-2 bg-gray-50">${escapeHTML(row.label)}</th>
                        <td class="w-2/3 text-gray-800 p-2">${escapeHTML(row.value)}</td>
                    </tr>
                `;
            }
        });
        tableHTML += '</tbody></table></div>';

        // --- 最終的なHTML (space-y-4 でカード間のマージンを確保) ---
        app.innerHTML = `
            <div class="space-y-4">
                ${imagesHTML}
                ${descriptionHTML}
                ${tableHTML}
            </div>
        `;
        
        // ヘッダーを更新 (種名を表示、戻るボタンはリストへ)
        updateHeader(escapeHTML(animal.species_name), true);
        backButton.onclick = () => showGameAnimalListPage();

        // ★ 画像クリックでモーダル表示 (共通ヘルパー関数)
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


// --- 狩猟者プロファイル ---------------------------------
// (このセクションは修正なし)
/**
 * 狩猟者プロファイルページ（編集フォーム）を表示する
 */
async function showHunterProfilePage() {
    try {
        // 'main' キーでプロファイルを取得
        let profile = await db.hunter_profile.get('main');
        
        if (!profile) {
            await populateDefaultHunterProfile();
            profile = await db.hunter_profile.get('main');
        }

        app.innerHTML = `
            <div class="space-y-4">
                <form id="hunter-profile-form" class="card">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-4">狩猟者プロファイル</h2>
                
                    <div class="form-group">
                        <label for="profile-name" class="form-label">名前:</label>
                        <input type="text" id="profile-name" class="form-input" value="${escapeHTML(profile.name)}">
                    </div>
                    
                    <h3 class="text-md font-semibold mt-6 mb-2">各種期限</h3>
                    
                    <div class="form-group">
                        <label for="profile-gun-license" class="form-label">銃所持許可 更新期限:</label>
                        <input type="date" id="profile-gun-license" class="form-input" value="${escapeHTML(profile.gun_license_renewal)}">
                    </div>
                    
                    <div class="form-group">
                        <label for="profile-hunting-license" class="form-label">狩猟免許 更新期限:</label>
                        <input type="date" id="profile-hunting-license" class="form-input" value="${escapeHTML(profile.hunting_license_renewal)}">
                    </div>
                    
                    <div class="form-group">
                        <label for="profile-registration" class="form-label">狩猟者登録 更新期限:</label>
                        <input type="date" id="profile-registration" class="form-input" value="${escapeHTML(profile.registration_renewal)}">
                    </div>

                    <div class="form-group">
                        <label for="profile-explosives-permit" class="form-label">火薬類譲受許可 更新期限:</label>
                        <input type="date" id="profile-explosives-permit" class="form-input" value="${escapeHTML(profile.explosives_permit_renewal)}">
                    </div>
                    
                    <div class="mt-6">
                        <button type="submit" class="btn btn-primary w-full">
                            保存する
                        </button>
                    </div>
                    
                    <div id="profile-save-status" class="text-center text-sm text-green-600 mt-3 h-4"></div>
                </form>
            </div>
        `;
        
        // ヘッダーを更新
        updateHeader('狩猟者プロファイル', true);
        backButton.onclick = () => navigateTo('info', showInfoPage, '情報');
        
        // 保存ボタンの処理
        document.getElementById('hunter-profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const statusElement = document.getElementById('profile-save-status');
            statusElement.textContent = '保存中...';
            statusElement.classList.remove('text-red-600');
            statusElement.classList.add('text-gray-500');

            try {
                const updatedProfile = {
                    key: 'main',
                    name: document.getElementById('profile-name').value,
                    gun_license_renewal: document.getElementById('profile-gun-license').value,
                    hunting_license_renewal: document.getElementById('profile-hunting-license').value,
                    registration_renewal: document.getElementById('profile-registration').value,
                    explosives_permit_renewal: document.getElementById('profile-explosives-permit').value,
                };
                
                await db.hunter_profile.put(updatedProfile);

                statusElement.textContent = '保存しました！';
                statusElement.classList.remove('text-gray-500');
                statusElement.classList.add('text-green-600');
                
                // 2秒後にメッセージを消す
                setTimeout(() => {
                    statusElement.textContent = '';
                }, 2000);

            } catch (err) {
                console.error("Failed to save hunter profile:", err);
                statusElement.textContent = `保存に失敗しました: ${err.message}`;
                statusElement.classList.remove('text-gray-500', 'text-green-600');
                statusElement.classList.add('text-red-600');
            }
        });

    } catch (err) {
        console.error("Failed to load hunter profile:", err);
        app.innerHTML = `<div class="error-box">プロファイルの読み込みに失敗しました: ${err.message}</div>`;
    }
}