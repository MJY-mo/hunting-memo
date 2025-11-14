// このファイルは info.js です

/**
 * 「情報」タブのメインページを表示する
 */
async function showInfoPage() {
    app.innerHTML = `
        <div class="page-content">
            <h2 class="page-title">情報</h2>
            
            <div classid="info-menu-list">
                <button id="info-game-animal-btn" class="menu-button">
                    <i class="fas fa-paw icon"></i>
                    狩猟鳥獣 図鑑
                </button>
                <button id="info-hunter-profile-btn" class="menu-button">
                    <i class="fas fa-user-edit icon"></i>
                    狩猟者プロファイル
                </button>
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
        <div class="page-content">
            <div class="filter-controls">
                <div class="filter-group">
                    <label for="game-filter-category">分類:</label>
                    <select id="game-filter-category" class="filter-select">
                        <option value="all" ${filters.category === 'all' ? 'selected' : ''}>すべて</option>
                        <option value="哺乳類" ${filters.category === '哺乳類' ? 'selected' : ''}>哺乳類</option>
                        <option value="鳥類" ${filters.category === '鳥類' ? 'selected' : ''}>鳥類</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label for="game-filter-status">狩猟対象:</label>
                    <select id="game-filter-status" class="filter-select">
                        <option value="all" ${filters.status === 'all' ? 'selected' : ''}>すべて</option>
                        <option value="〇" ${filters.status === '〇' ? 'selected' : ''}>〇 (対象)</option>
                        <option value="×" ${filters.status === '×' ? 'selected' : ''}>× (対象外)</option>
                    </select>
                </div>
            </div>

            <ul id="game-animal-list" class="data-list">
                <li><i class="fas fa-spinner fa-spin"></i> 読み込み中...</li>
            </ul>
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
    const listElement = document.getElementById('game-animal-list');
    if (!listElement) return;
    
    listElement.innerHTML = `<li><i class="fas fa-spinner fa-spin"></i> 読み込み中...</li>`;

    try {
        const filters = appState.gameAnimalFilters;
        
        // 1. フィルタリングクエリを作成
        let query = db.game_animal_list;
        
        if (filters.category !== 'all') {
            query = query.where('category').equals(filters.category);
        }
        
        if (filters.status !== 'all') {
            // 'category' で絞り込んでいない場合、インデックスが効かない可能性があるため
            // where...or... を使うか、絞り込み後に filter() する
            if (filters.category === 'all') {
                query = query.where('is_game_animal').equals(filters.status);
            } else {
                // 'category' で絞り込み済みの場合は、そのまま where を追加できる
                query = query.where('is_game_animal').equals(filters.status);
            }
        }
        
        // 2. データを取得 (名前順でソート)
        const animals = await query.sortBy('species_name');

        if (animals.length === 0) {
            listElement.innerHTML = `<li class="no-data">該当する鳥獣はいません。</li>`;
            return;
        }

        // 3. HTMLを構築
        const listItems = animals.map(animal => {
            // 狩猟対象かどうかのバッジ
            const statusBadge = animal.is_game_animal === '〇' 
                ? `<span class="badge badge-success">対象</span>`
                : `<span class="badge badge-danger">対象外</span>`;

            return `
                <li class="data-list-item" data-id="${animal.id}">
                    <div class="item-main-content">
                        <strong>${escapeHTML(animal.species_name)}</strong>
                        <span class="item-sub-text">${escapeHTML(animal.category)}</span>
                    </div>
                    <div class="item-action-content">
                        ${statusBadge}
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </li>
            `;
        }).join('');
        
        listElement.innerHTML = listItems;

        // 4. 各項目のクリックイベントを設定
        listElement.querySelectorAll('.data-list-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id, 10);
                showGameAnimalDetailPage(id);
            });
        });

    } catch (err) {
        console.error("Failed to render game animal list:", err);
        listElement.innerHTML = `<li class="no-data error">図鑑の読み込みに失敗しました。</li>`;
    }
}

// --- 狩猟鳥獣 図鑑 (詳細) ---------------------------------

/**
 * 狩猟鳥獣図鑑の「詳細ページ」を表示する
 * ★ 修正: description, image_1, image_2 を表示するロジックを追加
 * @param {number} id - 表示する鳥獣のDB ID
 */
async function showGameAnimalDetailPage(id) {
    try {
        const animal = await db.game_animal_list.get(id);
        if (!animal) {
            app.innerHTML = `<div class="error-box">該当するデータが見つかりません。</div>`;
            return;
        }

        // --- ★ 画像表示のロジック ★ ---
        let imagesHTML = '';
        const imageFiles = [animal.image_1, animal.image_2].filter(img => img); // null や "" を除外

        if (imageFiles.length > 0) {
            imagesHTML = '<div class="info-image-gallery">';
            imageFiles.forEach(filename => {
                // GitHub Pages (またはデプロイ先) の /image/ フォルダを参照
                const imagePath = `./image/${escapeHTML(filename)}`;
                imagesHTML += `
                    <div class="info-image-container">
                        <img src="${imagePath}" alt="${escapeHTML(animal.species_name)}" class="clickable-image">
                    </div>
                `;
            });
            imagesHTML += '</div>';
        }

        // --- ★ 説明文表示のロジック ★ ---
        let descriptionHTML = '';
        if (animal.description && animal.description !== '（説明文をここに）') {
            descriptionHTML = `
                <div class="info-section">
                    <h4>説明</h4>
                    <p class="info-description">${escapeHTML(animal.description).replace(/\n/g, '<br>')}</p>
                </div>
            `;
        }
        
        // --- データテーブル (既存データ) ---
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

        let tableHTML = '<div class="info-section"><h4>基本情報</h4><table class="info-table">';
        tableData.forEach(row => {
            if (row.value) { // 値が設定されているものだけ表示
                tableHTML += `
                    <tr>
                        <th>${escapeHTML(row.label)}</th>
                        <td>${escapeHTML(row.value)}</td>
                    </tr>
                `;
            }
        });
        tableHTML += '</table></div>';

        // --- 最終的なHTML ---
        app.innerHTML = `
            <div class="page-content info-detail-page">
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
                // Blob URL ではなく、img.src (./image/...) をそのまま渡す
                // (モーダル側はBlob URLでなくても表示できる)
                showImageModal(e.target.src); 
            });
        });

    } catch (err) {
        console.error("Failed to show game animal detail:", err);
        app.innerHTML = `<div class="error-box">詳細の読み込みに失敗しました: ${err.message}</div>`;
    }
}


// --- 狩猟者プロファイル ---------------------------------

/**
 * 狩猟者プロファイルページ（編集フォーム）を表示する
 */
async function showHunterProfilePage() {
    try {
        // 'main' キーでプロファイルを取得
        let profile = await db.hunter_profile.get('main');
        
        if (!profile) {
            // 念のため、もし 'main' が消えていたら再作成を試みる
            await populateDefaultHunterProfile();
            profile = await db.hunter_profile.get('main');
        }

        app.innerHTML = `
            <div class="page-content">
                <form id="hunter-profile-form" class="form-container">
                    
                    <div class="form-group">
                        <label for="profile-name">名前:</label>
                        <input type="text" id="profile-name" value="${escapeHTML(profile.name)}">
                    </div>
                    
                    <h3 class="form-section-title">各種期限</h3>
                    
                    <div class="form-group">
                        <label for="profile-gun-license">銃所持許可 更新期限:</label>
                        <input type="date" id="profile-gun-license" value="${escapeHTML(profile.gun_license_renewal)}">
                    </div>
                    
                    <div class="form-group">
                        <label for="profile-hunting-license">狩猟免許 更新期限:</label>
                        <input type="date" id="profile-hunting-license" value="${escapeHTML(profile.hunting_license_renewal)}">
                    </div>
                    
                    <div class="form-group">
                        <label for="profile-registration">狩猟者登録 更新期限:</label>
                        <input type="date" id="profile-registration" value="${escapeHTML(profile.registration_renewal)}">
                    </div>

                    <div class="form-group">
                        <label for="profile-explosives-permit">火薬類譲受許可 更新期限:</label>
                        <input type="date" id="profile-explosives-permit" value="${escapeHTML(profile.explosives_permit_renewal)}">
                    </div>
                    
                    <button type="submit" class="button button-primary button-full">
                        <i class="fas fa-save"></i> 保存する
                    </button>
                </form>
                
                <div id="profile-save-status" class="save-status"></div>
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
            statusElement.className = 'save-status saving';

            try {
                const updatedProfile = {
                    key: 'main',
                    name: document.getElementById('profile-name').value,
                    gun_license_renewal: document.getElementById('profile-gun-license').value,
                    hunting_license_renewal: document.getElementById('profile-hunting-license').value,
                    registration_renewal: document.getElementById('profile-registration').value,
                    explosives_permit_renewal: document.getElementById('profile-explosives-permit').value,
                };
                
                // 'main' キーでデータを更新 (put は update or insert を行う)
                await db.hunter_profile.put(updatedProfile);

                statusElement.textContent = '保存しました！';
                statusElement.className = 'save-status success';
                
                // 2秒後にメッセージを消す
                setTimeout(() => {
                    statusElement.textContent = '';
                    statusElement.className = 'save-status';
                }, 2000);

            } catch (err) {
                console.error("Failed to save hunter profile:", err);
                statusElement.textContent = `保存に失敗しました: ${err.message}`;
                statusElement.className = 'save-status error';
            }
        });

    } catch (err) {
        console.error("Failed to load hunter profile:", err);
        app.innerHTML = `<div class="error-box">プロファイルの読み込みに失敗しました: ${err.message}</div>`;
    }
}