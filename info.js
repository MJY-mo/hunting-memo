// このファイルは info.js です (修正版: トップメニュー追加 & 図鑑機能刷新)

/**
 * 「情報」タブのメインページを表示する
 */
function showInfoPage() {
    navigateTo('info', renderInfoTopPage, '情報');
}

/**
 * 情報タブのトップメニュー（分岐画面）を描画
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
                        <p class="text-sm text-gray-500">免許や許可証の期限管理</p>
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

/**
 * 狩猟鳥獣図鑑ページを表示
 */
async function showGameAnimalListPage() {
    // 状態の初期化 (初回のみ)
    if (!appState.infoSort) appState.infoSort = 'default';
    if (!appState.infoFilterAttribute) appState.infoFilterAttribute = 'all';

    updateHeader('狩猟鳥獣図鑑', true);
    backButton.onclick = () => showInfoPage(); // メニューに戻る

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
                            <option value="game_animal">狩猟鳥獣 (〇)</option>
                            <option value="invasive">外来種</option>
                            <option value="mammal">哺乳類</option>
                            <option value="bird">鳥類</option>
                            <option value="gun">銃猟 可</option>
                            <option value="trap">罠猟 可</option>
                            <option value="net">網猟 可 (〇のみ)</option>
                        </select>
                    </div>
                </div>

                <div id="game-animal-list" class="space-y-3">
                    <p class="text-gray-500 text-center py-4">読み込み中...</p>
                </div>
            </div>
        </div>
    `;

    // コントロールの状態復元
    document.getElementById('info-sort').value = appState.infoSort;
    document.getElementById('info-filter-attribute').value = appState.infoFilterAttribute;

    // イベントリスナー
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

/**
 * 鳥獣図鑑リストを描画する
 */
async function renderGameAnimalList() {
    const listElement = document.getElementById('game-animal-list');
    if (!listElement) return;

    try {
        let animals = await db.game_animal_list.toArray();

        // 1. フィルタリング
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

        // 2. 並び替え
        if (appState.infoSort === 'name') {
            animals.sort((a, b) => a.species_name.localeCompare(b.species_name, 'ja'));
        } else {
            animals.sort((a, b) => a.id - b.id);
        }

        if (animals.length === 0) {
            listElement.innerHTML = `<p class="text-gray-500 text-center py-4">該当する鳥獣はいません。</p>`;
            return;
        }

        // 3. HTML生成
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
        listElement.innerHTML = `<div class="error-box">読み込みエラー</div>`;
    }
}

/**
 * 鳥獣詳細ページ
 */
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

/**
 * 捕獲者情報ページを表示
 */
async function showHunterProfilePage() {
    updateHeader('捕獲者情報', true);
    backButton.onclick = () => showInfoPage(); // メニューに戻る

    app.innerHTML = `
        <div class="card bg-white">
            <h2 class="text-lg font-semibold border-b pb-2 mb-4">捕獲者情報</h2>
            <div id="hunter-profile-container">
                <p class="text-gray-500">読み込み中...</p>
            </div>
        </div>
    `;
    
    await renderHunterProfile();
}

/**
 * 捕獲者情報セクションを描画
 */
async function renderHunterProfile() {
    const container = document.getElementById('hunter-profile-container');
    try {
        const profile = await db.hunter_profile.get('main');
        if (!profile) return;

        const renderField = (label, key) => `
            <div class="mb-3 border-b pb-2">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-medium text-gray-600">${label}</span>
                    <span class="text-sm font-bold text-gray-800">${escapeHTML(profile[key] || '未設定')}</span>
                </div>
            </div>
        `;

        container.innerHTML = `
            <div class="space-y-1">
                <div class="text-right mb-2">
                    <button id="edit-profile-btn" class="text-blue-600 text-sm hover:underline">編集</button>
                </div>
                ${renderField('氏名', 'name')}
                ${renderField('銃所持許可 期限', 'gun_license_renewal')}
                ${renderField('狩猟免状 期限', 'hunting_license_renewal')}
                ${renderField('狩猟者登録 期限', 'registration_renewal')}
                ${renderField('火薬類譲受許可 期限', 'explosives_permit_renewal')}
            </div>
        `;

        document.getElementById('edit-profile-btn').addEventListener('click', showHunterProfileEdit);

    } catch (err) {
        container.innerHTML = '読み込みエラー';
    }
}

/**
 * 捕獲者情報の編集フォーム
 */
async function showHunterProfileEdit() {
    const profile = await db.hunter_profile.get('main');
    updateHeader('捕獲者情報の編集', true);
    backButton.onclick = () => showHunterProfilePage();

    const fields = [
        ['name', '氏名'],
        ['gun_license_renewal', '銃所持許可 期限'],
        ['hunting_license_renewal', '狩猟免状 期限'],
        ['registration_renewal', '狩猟者登録 期限'],
        ['explosives_permit_renewal', '火薬類譲受許可 期限']
    ];

    const inputs = fields.map(([key, label]) => `
        <div class="form-group">
            <label class="form-label">${label}</label>
            <input type="text" id="prof-${key}" class="form-input" value="${escapeHTML(profile[key] || '')}">
        </div>
    `).join('');

    app.innerHTML = `
        <div class="card bg-white">
            <form id="profile-form" class="space-y-4">
                ${inputs}
                <button type="submit" class="btn btn-primary w-full">保存</button>
            </form>
        </div>
    `;

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newData = { key: 'main' };
        fields.forEach(([key]) => {
            newData[key] = document.getElementById(`prof-${key}`).value;
        });
        await db.hunter_profile.put(newData);
        showHunterProfilePage();
    });
}