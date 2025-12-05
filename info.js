// info.js (修正完全版: 捕獲者情報の写真紐付け対応)

/**
 * 「情報」タブのメインページ
 */
function showInfoPage() {
    navigateTo('info', renderInfoTopPage, '情報');
}

/**
 * トップメニュー
 */
function renderInfoTopPage() {
    updateHeader('情報', false);

    app.innerHTML = `
        <div class="space-y-4">
            <div class="card bg-white hover:bg-gray-50 cursor-pointer" id="btn-game-animal-list">
                <div class="flex items-center p-4">
                    <div class="bg-green-100 p-3 rounded-full mr-4">
                        <i class="fas fa-book text-green-600 text-2xl"></i>
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-gray-800">狩猟鳥獣図鑑</h2>
                        <p class="text-sm text-gray-500">狩猟対象や特徴を確認</p>
                    </div>
                    <div class="ml-auto text-gray-400">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>

            <div class="card bg-white hover:bg-gray-50 cursor-pointer" id="btn-hunter-profile">
                <div class="flex items-center p-4">
                    <div class="bg-blue-100 p-3 rounded-full mr-4">
                        <i class="fas fa-id-card text-blue-600 text-2xl"></i>
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-gray-800">捕獲者情報</h2>
                        <p class="text-sm text-gray-500">免許や許可証の期限・写真管理</p>
                    </div>
                    <div class="ml-auto text-gray-400">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('btn-game-animal-list').onclick = () => showGameAnimalListPage();
    document.getElementById('btn-hunter-profile').onclick = () => showHunterProfilePage();
}

/* --- 鳥獣図鑑関連 (変更なし) --- */
async function showGameAnimalListPage() {
    if (!appState.infoSort) appState.infoSort = 'default';
    if (!appState.infoFilterAttribute) appState.infoFilterAttribute = 'all';

    updateHeader('狩猟鳥獣図鑑', true);
    backButton.onclick = () => showInfoPage();

    app.innerHTML = `
        <div class="space-y-4">
            <div class="card bg-white">
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="form-group mb-0">
                        <label for="info-sort" class="form-label">並び替え:</label>
                        <select id="info-sort" class="form-select">
                            <option value="default">標準 (CSV順)</option>
                            <option value="name">あいうえお順</option>
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label for="info-filter-attribute" class="form-label">属性:</label>
                        <select id="info-filter-attribute" class="form-select">
                            <option value="all">すべて表示</option>
                            <option value="game_animal">狩猟鳥獣</option>
                            <option value="invasive">外来種</option>
                            <option value="mammal">哺乳類</option>
                            <option value="bird">鳥類</option>
                            <option value="gun">銃猟</option>
                            <option value="trap">罠猟</option>
                            <option value="net">網猟</option>
                        </select>
                    </div>
                </div>
                <div id="game-animal-list" class="space-y-3">
                    <p class="text-gray-500 text-center py-4">読み込み中...</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('info-sort').value = appState.infoSort;
    document.getElementById('info-filter-attribute').value = appState.infoFilterAttribute;

    document.getElementById('info-sort').addEventListener('change', (e) => {
        appState.infoSort = e.target.value;
        renderGameAnimalList();
    });
    document.getElementById('info-filter-attribute').addEventListener('change', (e) => {
        appState.infoFilterAttribute = e.target.value;
        renderGameAnimalList();
    });

    await renderGameAnimalList();
}

async function renderGameAnimalList() {
    const listElement = document.getElementById('game-animal-list');
    if (!listElement) return;

    try {
        let animals = await db.game_animal_list.toArray();
        const attr = appState.infoFilterAttribute;
        if (attr !== 'all') {
            animals = animals.filter(a => {
                if (attr === 'game_animal') return a.is_game_animal === '〇';
                if (attr === 'invasive') return (a.notes && a.notes.includes('外来'));
                if (attr === 'mammal') return a.category === '哺乳類';
                if (attr === 'bird') return a.category === '鳥類';
                if (attr === 'gun') return ['○', '〇', '◎'].includes(a.method_gun);
                if (attr === 'trap') return ['○', '〇', '◎'].includes(a.method_trap);
                if (attr === 'net') return ['○', '〇', '◎'].includes(a.method_net);
                return true;
            });
        }

        if (appState.infoSort === 'name') {
            animals.sort((a, b) => a.species_name.localeCompare(b.species_name, 'ja'));
        } else {
            animals.sort((a, b) => a.id - b.id);
        }

        if (animals.length === 0) {
            listElement.innerHTML = `<p class="text-gray-500 text-center py-4">該当する鳥獣はいません。</p>`;
            return;
        }

        listElement.innerHTML = animals.map(animal => {
            let badges = '';
            if (animal.category === '哺乳類') badges += `<span class="badge badge-mammal">哺乳類</span>`;
            else if (animal.category === '鳥類') badges += `<span class="badge badge-bird">鳥類</span>`;
            if (animal.is_game_animal === '〇') badges += `<span class="badge badge-game">狩猟鳥獣</span>`;
            if (animal.notes && animal.notes.includes('外来')) badges += `<span class="badge badge-invasive">外来種</span>`;

            let thumbHTML = '';
            if (animal.image_1) {
                const imgPath = `./image/${escapeHTML(animal.image_1)}`;
                thumbHTML = `<div class="animal-thumb-container"><img src="${imgPath}" alt="${escapeHTML(animal.species_name)}" class="animal-thumb" loading="lazy"></div>`;
            } else {
                thumbHTML = `<div class="animal-thumb-container bg-gray-100 flex items-center justify-center text-gray-300"><i class="fas fa-paw text-2xl"></i></div>`;
            }

            return `
                <div class="animal-card bg-white" data-id="${animal.id}">
                    ${thumbHTML}
                    <div class="animal-info">
                        <div class="animal-header"><h3 class="animal-name">${escapeHTML(animal.species_name)}</h3></div>
                        <div class="animal-badges">${badges}</div>
                    </div>
                    <div class="animal-arrow"><span>&gt;</span></div>
                </div>
            `;
        }).join('');

        listElement.querySelectorAll('.animal-card').forEach(card => {
            card.addEventListener('click', () => showGameAnimalDetail(parseInt(card.dataset.id, 10)));
        });

    } catch (err) {
        console.error("Failed to render game animal list:", err);
    }
}

async function showGameAnimalDetail(id) {
    try {
        const animal = await db.game_animal_list.get(id);
        if (!animal) return;

        updateHeader(animal.species_name, true);
        backButton.onclick = () => showGameAnimalListPage();

        let imagesHTML = '';
        if (animal.image_1) imagesHTML += `<img src="./image/${escapeHTML(animal.image_1)}" class="w-full h-auto rounded mb-2 border">`;
        if (animal.image_2) imagesHTML += `<img src="./image/${escapeHTML(animal.image_2)}" class="w-full h-auto rounded mb-2 border">`;
        if (!imagesHTML) imagesHTML = '<p class="text-gray-400 text-sm">画像はありません</p>';

        const tableRows = [
            ['分類', animal.category],
            ['狩猟鳥獣', animal.is_game_animal],
            ['銃猟', animal.method_gun],
            ['罠猟', animal.method_trap],
            ['網猟', animal.method_net],
            ['性別制限', animal.gender],
            ['捕獲数制限', animal.count],
            ['禁止区域', animal.prohibited_area],
            ['生息地', animal.habitat],
            ['備考', animal.notes]
        ].map(([label, value]) => {
            if (!value || value === 'nan') return '';
            return `<tr class="border-b"><th class="w-1/3 text-left font-medium text-gray-600 p-2 bg-gray-50">${label}</th><td class="w-2/3 p-2">${escapeHTML(value)}</td></tr>`;
        }).join('');

        app.innerHTML = `
            <div class="space-y-4">
                <div class="card bg-white">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-2">写真</h2>
                    ${imagesHTML}
                </div>
                <div class="card bg-white">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-2">特徴・説明</h2>
                    <p class="text-sm text-gray-800 leading-relaxed">${animal.description ? escapeHTML(animal.description).replace(/\n/g, '<br>') : '情報なし'}</p>
                </div>
                <div class="card bg-white">
                    <h2 class="text-lg font-semibold border-b pb-2 mb-0">データ</h2>
                    <table class="w-full text-sm"><tbody>${tableRows}</tbody></table>
                </div>
            </div>
        `;
    } catch (err) {
        console.error(err);
        alert('詳細の読み込みに失敗しました。');
    }
}

/* --- 捕獲者情報 (修正部分) --- */

/**
 * 捕獲者情報ページを表示
 */
async function showHunterProfilePage() {
    updateHeader('捕獲者情報', true);
    backButton.onclick = () => showInfoPage();

    app.innerHTML = `
        <div class="card bg-white">
            <h2 class="text-lg font-semibold border-b pb-2 mb-4">登録情報</h2>
            <div id="hunter-profile-container">
                <p class="text-gray-500">読み込み中...</p>
            </div>
        </div>
    `;
    
    await renderHunterProfile();
}

/**
 * 捕獲者情報セクションを描画
 * ★ 修正: 各項目の下に、その項目タイプ(key)に紐づく画像を表示する
 */
async function renderHunterProfile() {
    const container = document.getElementById('hunter-profile-container');
    try {
        const profile = await db.hunter_profile.get('main') || {};
        
        // 全画像を先に取得
        const allImages = await db.profile_images.toArray();

        // 項目定義
        const fields = [
            { key: 'name', label: '氏名' },
            { key: 'gun_license_renewal', label: '銃所持許可 期限' },
            { key: 'hunting_license_renewal', label: '狩猟免状 期限' },
            { key: 'registration_renewal', label: '狩猟者登録 期限' },
            { key: 'explosives_permit_renewal', label: '火薬類譲受許可 期限' }
        ];

        let html = `
            <div class="text-right mb-2">
                <button id="edit-profile-btn" class="text-blue-600 text-sm hover:underline"><i class="fas fa-edit"></i> 編集</button>
            </div>
        `;

        fields.forEach(field => {
            const value = profile[field.key] || '未設定';
            // この項目(key)に紐づく画像を抽出
            const fieldImages = allImages.filter(img => img.type === field.key);
            
            let imagesHtml = '';
            if (fieldImages.length > 0) {
                imagesHtml = `<div class="flex gap-2 mt-2 overflow-x-auto pb-2">`;
                fieldImages.forEach(img => {
                    const url = URL.createObjectURL(img.image_blob);
                    appState.activeBlobUrls.push(url);
                    imagesHtml += `<img src="${url}" class="h-16 w-16 object-cover rounded border cursor-zoom-in clickable-image">`;
                });
                imagesHtml += `</div>`;
            }

            html += `
                <div class="mb-4 border-b pb-3 last:border-b-0">
                    <div class="flex justify-between items-center">
                        <span class="text-sm font-medium text-gray-500">${field.label}</span>
                        <span class="text-base font-bold text-gray-800">${escapeHTML(value)}</span>
                    </div>
                    ${imagesHtml}
                </div>
            `;
        });

        container.innerHTML = html;

        document.getElementById('edit-profile-btn').addEventListener('click', showHunterProfileEdit);
        container.querySelectorAll('.clickable-image').forEach(img => {
            img.addEventListener('click', (e) => showImageModal(e.target.src));
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = '読み込みエラー';
    }
}

/**
 * 捕獲者情報の編集フォーム
 * ★ 修正: 各項目ごとに入力・保存・写真追加を行うUIに変更
 */
async function showHunterProfileEdit() {
    const profile = await db.hunter_profile.get('main') || {};
    // 全画像を先に取得
    const allImages = await db.profile_images.toArray();

    updateHeader('捕獲者情報の編集', true);
    backButton.onclick = () => showHunterProfilePage();

    const fields = [
        { key: 'name', label: '氏名' },
        { key: 'gun_license_renewal', label: '銃所持許可 期限' },
        { key: 'hunting_license_renewal', label: '狩猟免状 期限' },
        { key: 'registration_renewal', label: '狩猟者登録 期限' },
        { key: 'explosives_permit_renewal', label: '火薬類譲受許可 期限' }
    ];

    app.innerHTML = `
        <div class="card bg-white">
            <h3 class="text-md font-bold mb-4 border-b pb-2">項目別編集</h3>
            <div id="edit-fields-container" class="space-y-6">
                </div>
        </div>
        <input type="file" id="hidden-image-input" accept="image/*" style="display: none;">
    `;

    const container = document.getElementById('edit-fields-container');
    const fileInput = document.getElementById('hidden-image-input');
    let currentTargetKey = null; // どの項目の写真を追加しようとしているか

    // 項目ごとのHTML生成とイベント設定
    fields.forEach(field => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'border-b pb-4 last:border-b-0';
        
        // この項目の画像を取得
        const fieldImages = allImages.filter(img => img.type === field.key);
        let imagesHtml = '';
        fieldImages.forEach(img => {
            const url = URL.createObjectURL(img.image_blob);
            appState.activeBlobUrls.push(url);
            imagesHtml += `
                <div class="relative inline-block mr-2 mb-2">
                    <img src="${url}" class="h-16 w-16 object-cover rounded border">
                    <button class="btn-delete-img absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs" data-id="${img.id}">&times;</button>
                </div>
            `;
        });

        fieldDiv.innerHTML = `
            <label class="form-label">${field.label}</label>
            <div class="flex space-x-2 mb-2">
                <input type="text" id="input-${field.key}" class="form-input flex-1" value="${escapeHTML(profile[field.key] || '')}">
                <button class="btn btn-primary btn-save w-20" data-key="${field.key}">保存</button>
            </div>
            
            <div class="mt-2">
                <div class="flex flex-wrap items-center">
                    ${imagesHtml}
                    <button class="btn-add-img btn btn-secondary btn-sm h-16 w-16 flex flex-col items-center justify-center text-xs text-gray-500 border-dashed border-2" data-key="${field.key}">
                        <i class="fas fa-camera text-lg mb-1"></i>
                        追加
                    </button>
                </div>
            </div>
        `;
        container.appendChild(fieldDiv);
    });

    // --- イベントリスナー ---

    // 1. テキスト保存ボタン
    container.querySelectorAll('.btn-save').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const key = e.target.dataset.key;
            const input = document.getElementById(`input-${key}`);
            const newValue = input.value;
            const originalText = e.target.textContent;

            try {
                const currentProfile = await db.hunter_profile.get('main') || { key: 'main' };
                currentProfile[key] = newValue;
                await db.hunter_profile.put(currentProfile);

                // フィードバック
                e.target.textContent = 'OK';
                e.target.classList.replace('btn-primary', 'btn-success');
                setTimeout(() => {
                    e.target.textContent = originalText;
                    e.target.classList.replace('btn-success', 'btn-primary');
                }, 1500);
            } catch (err) {
                alert('保存失敗');
            }
        });
    });

    // 2. 写真追加ボタン (隠しinputを発火)
    container.querySelectorAll('.btn-add-img').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentTargetKey = e.currentTarget.dataset.key; // どの項目か記録
            fileInput.click();
        });
    });

    // 3. ファイル選択時 (リサイズして保存)
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentTargetKey) return;

        try {
            const resizedBlob = await resizeImage(file, 800); // main.jsの関数
            await db.profile_images.add({
                type: currentTargetKey, // 項目名をtypeとして保存
                image_blob: resizedBlob
            });
            // 画面を再描画して画像を反映
            showHunterProfileEdit();
        } catch (err) {
            console.error(err);
            alert('写真の保存に失敗しました。');
        } finally {
            fileInput.value = ''; // リセット
        }
    });

    // 4. 写真削除ボタン
    container.querySelectorAll('.btn-delete-img').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (confirm('この写真を削除しますか？')) {
                const id = parseInt(e.target.dataset.id);
                await db.profile_images.delete(id);
                showHunterProfileEdit(); // 再描画
            }
        });
    });
}