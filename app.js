// ============================================================================
// app.js - 狩猟アプリ 統合JavaScriptファイル (UI改善・非圧縮版)
// ============================================================================

// ----------------------------------------------------------------------------
// 1. データベース定義 (元 db.js)
// ----------------------------------------------------------------------------
const db = new Dexie('HuntingAppDB');

// スキーマ定義 (最新版 v14)
db.version(14).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date, purpose, [is_open+trap_number], [is_open+setup_date], [is_open+close_date]',
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude, [gender+catch_date], [age+catch_date], [trap_id+catch_date], [gun_log_id+catch_date], [gender+species_name], [age+species_name], [trap_id+species_name], [gun_log_id+species_name]',
    gun: '++id, &name, type, caliber',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude, ammo_count, companion, [gun_id+use_date], [purpose+use_date]',
    ammo_purchases: '++id, gun_id, purchase_date',
    game_animal_list: '++id, species_name, category, is_game_animal, ecology, damage, image_1, image_2, [category+species_name], [is_game_animal+species_name]',
    checklist_sets: '++id, &name',
    checklist_items: '++id, list_id, name, is_checked, &[list_id+name]',
    profile_images: '++id, type',
    settings: '&key',
    hunter_profile: '&key'
});
console.log("Database schema defined (app.js integrated)");


// ----------------------------------------------------------------------------
// 2. メインロジック & 共通関数 (元 main.js)
// ----------------------------------------------------------------------------

// グローバル変数・DOM要素
const app = document.getElementById('app');
const headerTitle = document.getElementById('headerTitle');
const backButton = document.getElementById('backButton');
const headerActions = document.getElementById('headerActions');

const tabs = {
    trap: document.getElementById('tab-trap'),
    gun: document.getElementById('tab-gun'),
    catch: document.getElementById('tab-catch'),
    checklist: document.getElementById('tab-checklist'),
    info: document.getElementById('tab-info'),
    settings: document.getElementById('tab-settings'),
};

// アプリケーションの状態管理
const appState = {
    currentPage: 'trap',
    currentTrapId: null,
    currentGunLogId: null,
    currentCatchMethod: 'all',
    currentCatchRelationId: null,
    trapView: 'open',
    trapFilters: { type: 'all' },
    trapSortOpen: { key: 'trap_number', order: 'asc' },
    trapSortClosed: { key: 'close_date', order: 'desc' },
    gunLogFilters: { purpose: 'all', gun_id: 'all' },
    gunLogSort: { key: 'use_date', order: 'desc' },
    catchFilters: { method: 'all', species: '', gender: 'all', age: 'all' },
    catchSort: { key: 'catch_date', order: 'desc' },
    gameAnimalFilters: { category: 'all', status: 'all' },
    infoSort: 'default',
    infoFilterAttribute: 'all',
    activeBlobUrls: [],
    isEditing: false
};

// --- アプリ初期化 ---
window.addEventListener('load', () => {
    console.log("Window loaded. Initializing app...");
    db.open().then(async () => {
        console.log("Database opened successfully.");
        await loadAndApplySettings();
        await populateDefaultTrapTypes();
        await populateDefaultHunterProfile();
        await populateGameAnimalListIfNeeded(false);
        setupTabs();
        navigateTo('trap', showTrapPage, '罠');
    }).catch(err => {
        console.error("Failed to open database:", err);
        app.innerHTML = `<div class="error-box">データベースの起動に失敗しました。アプリが使用できません。</div>`;
    });
});

// 初期データ投入関数
async function populateDefaultTrapTypes() {
    try { await db.trap_type.bulkAdd([{ name: 'くくり罠' }, { name: '箱罠' }]); } catch (err) { /* ignore */ }
}
async function populateDefaultHunterProfile() {
    try { await db.hunter_profile.add({ key: 'main', name: '', gun_license_renewal: '', hunting_license_renewal: '', registration_renewal: '', explosives_permit_renewal: '' }); } catch (err) { /* ignore */ }
}

// CSV読み込み (生態・被害対応)
async function populateGameAnimalListIfNeeded(forceUpdate = false) {
    try {
        const count = await db.game_animal_list.count();
        if (count > 0 && !forceUpdate) {
            console.log(`Game animal list is already populated (${count} items). Skipping.`);
            return;
        }
        console.log(forceUpdate ? "Forcing update..." : "Populating from GitHub...");
        const CSV_URL = 'https://raw.githubusercontent.com/MJY-mo/hunting-memo/refs/heads/main/%E7%8B%A9%E7%8C%9F%E9%B3%A5%E7%8D%A3.csv'; 
        const fetchUrl = `${CSV_URL}?t=${Date.now()}`;
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);
        const csvText = await response.text();
        const records = parseCSV(csvText);
        if (records.length < 1) throw new Error('CSVデータが空か、正しい形式ではありません。');

        let startIndex = 0;
        if (records[0][0] && records[0][0].includes('分類')) startIndex = 1;
        
        const animals = [];
        for (let i = startIndex; i < records.length; i++) {
            const row = records[i];
            if (row.length < 3) continue;
            const animal = {
                category: row[0] || '', is_game_animal: row[1] || '', species_name: row[2] || '',
                method_gun: row[3] || '', method_trap: row[4] || '', method_net: row[5] || '',
                gender: row[6] || '', count: row[7] || '', prohibited_area: row[8] || '',
                habitat: row[9] || '', notes: row[10] || '',
                ecology: row[11] || '', damage: row[12] || '',
                image_1: row[13] || '', image_2: row[14] || ''
            };
            animals.push(animal);
        }
        await db.transaction('rw', db.game_animal_list, async () => {
            await db.game_animal_list.clear();
            await db.game_animal_list.bulkAdd(animals);
        });
        console.log(`Game animal list populated successfully (${animals.length} items).`);
    } catch (err) {
        console.error("Failed to populate game animal list:", err);
        const statusEl = document.getElementById('csv-status');
        if (statusEl) statusEl.textContent = '更新失敗: ' + err.message;
    }
}

// 設定適用
async function loadAndApplySettings() {
    try {
        let themeSetting = await db.settings.get('theme');
        if (!themeSetting) { themeSetting = { key: 'theme', value: 'light' }; await db.settings.put(themeSetting); }
        applyTheme(themeSetting.value);
        let fontSizeSetting = await db.settings.get('fontSize');
        if (!fontSizeSetting) { fontSizeSetting = { key: 'fontSize', value: 'medium' }; await db.settings.put(fontSizeSetting); }
        applyFontSize(fontSizeSetting.value);
    } catch (err) { console.error("Failed to load settings:", err); }
}
function applyTheme(themeValue) {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-sepia', 'theme-light-green', 'theme-light-blue');
    if (themeValue === 'sepia') root.classList.add('theme-sepia');
    else if (themeValue === 'lightgreen') root.classList.add('theme-light-green');
    else if (themeValue === 'lightblue') root.classList.add('theme-light-blue');
    else root.classList.add('theme-light');
}
function applyFontSize(sizeValue) {
    const root = document.documentElement;
    root.classList.remove('font-size-xsmall', 'font-size-small', 'font-size-medium', 'font-size-large', 'font-size-xlarge');
    if (sizeValue === 'xsmall') root.classList.add('font-size-xsmall');
    else if (sizeValue === 'small') root.classList.add('font-size-small');
    else if (sizeValue === 'large') root.classList.add('font-size-large');
    else if (sizeValue === 'xlarge') root.classList.add('font-size-xlarge');
    else root.classList.add('font-size-medium');
}

// ナビゲーション
function setupTabs() {
    tabs.trap.addEventListener('click', () => { appState.trapView = 'open'; navigateTo('trap', showTrapPage, '罠'); });
    tabs.gun.addEventListener('click', () => navigateTo('gun', showGunPage, '銃'));
    tabs.catch.addEventListener('click', () => navigateTo('catch', showCatchPage, '捕獲'));
    tabs.checklist.addEventListener('click', () => navigateTo('checklist', showChecklistPage, 'チェック'));
    tabs.info.addEventListener('click', () => navigateTo('info', showInfoPage, '情報'));
    tabs.settings.addEventListener('click', () => navigateTo('settings', showSettingsPage, '設定'));
}
function navigateTo(pageId, pageFunction, title) {
    if (appState.activeBlobUrls && appState.activeBlobUrls.length > 0) {
        appState.activeBlobUrls.forEach(url => URL.revokeObjectURL(url));
        appState.activeBlobUrls = [];
    }
    appState.currentPage = pageId;
    Object.values(tabs).forEach(tab => { if(tab) tab.classList.replace('tab-active', 'tab-inactive'); });
    if (tabs[pageId]) tabs[pageId].classList.replace('tab-inactive', 'tab-active');
    updateHeader(title, false);
    try { pageFunction(); } catch (err) { console.error(`Failed: ${pageId}`, err); app.innerHTML = `<div class="error-box">エラー: ${err.message}</div>`; }
}
function updateHeader(title, showBack = false) {
    headerTitle.textContent = title;
    backButton.classList.toggle('hidden', !showBack);
    if (showBack) {
        backButton.onclick = () => {
            if (appState.currentPage === 'trap') navigateTo('trap', showTrapPage, '罠');
            else if (appState.currentPage === 'gun') navigateTo('gun', showGunPage, '銃');
            else if (appState.currentPage === 'catch') navigateTo('catch', showCatchPage, '捕獲');
            else if (appState.currentPage === 'checklist') navigateTo('checklist', showChecklistPage, 'チェック');
            else if (appState.currentPage === 'info') navigateTo('info', showInfoPage, '情報');
            else if (appState.currentPage === 'settings') navigateTo('settings', showSettingsPage, '設定');
            else navigateTo('trap', showTrapPage, '罠');
        };
    }
    headerActions.innerHTML = '';
}

// 共通ヘルパー
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) { reject(new Error('GPS非対応')); return; }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => reject(new Error('GPS取得失敗')), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}
function escapeHTML(str) {
    if (str == null) return '';
    return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const parts = dateString.split('-');
        if (parts.length === 3) return `${parts[0]}/${parts[1]}/${parts[2]}`;
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; 
        return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    } catch (e) { return dateString; }
}
function parseCSV(text) {
    const arr = [];
    let quote = false;
    let col = 0, c = 0;
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (; c < text.length; c++) {
        let cc = text[c], nc = text[c+1];
        arr[arr.length-1] = arr[arr.length-1] || [];
        arr[arr.length-1][col] = arr[arr.length-1][col] || '';
        if (cc == '"' && quote && nc == '"') { arr[arr.length-1][col] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == ',' && !quote) { ++col; continue; }
        if (cc == '\n' && !quote) { ++col; if (col > 0) { arr.push([]); col = 0; } continue; }
        arr[arr.length-1][col] += cc;
    }
    return arr;
}
function resizeImage(file, maxSize = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                EXIF.getData(img, function() {
                    const orientation = EXIF.getTag(this, "Orientation");
                    let w = img.width, h = img.height;
                    if (w > h) { if (w > maxSize) { h = Math.round(h * (maxSize / w)); w = maxSize; } }
                    else { if (h > maxSize) { w = Math.round(w * (maxSize / h)); h = maxSize; } }
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (orientation >= 5 && orientation <= 8) { canvas.width = h; canvas.height = w; }
                    else { canvas.width = w; canvas.height = h; }
                    switch (orientation) {
                        case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
                        case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
                        case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
                        case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
                        case 6: ctx.transform(0, 1, -1, 0, h, 0); break;
                        case 7: ctx.transform(0, -1, -1, 0, h, w); break;
                        case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
                    }
                    if (orientation >= 5 && orientation <= 8) ctx.drawImage(img, 0, 0, h, w);
                    else ctx.drawImage(img, 0, 0, w, h);
                    canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error('変換失敗')); }, 'image/jpeg', 0.8);
                });
            };
            img.onerror = () => reject(new Error('画像読込失敗'));
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}
function showImageModal(blobUrl) {
    closeImageModal();
    const ol = document.createElement('div'); ol.id = 'image-modal-overlay'; ol.className = 'image-modal-overlay';
    const ct = document.createElement('div'); ct.className = 'image-modal-content';
    const img = document.createElement('img'); img.src = blobUrl;
    ct.appendChild(img); ol.appendChild(ct); document.body.appendChild(ol);
    ol.onclick = closeImageModal;
}
function closeImageModal() {
    const ol = document.getElementById('image-modal-overlay');
    if (ol) ol.remove();
}


// ----------------------------------------------------------------------------
// 3. 罠管理 (元 trap.js)
// ----------------------------------------------------------------------------

async function showTrapPage() {
    const view = appState.trapView;
    const filters = appState.trapFilters;
    const sort = (view === 'open') ? appState.trapSortOpen : appState.trapSortClosed;
    const trapTypes = await db.trap_type.toArray();
    const typeOptions = trapTypes.map(type => `<option value="${escapeHTML(type.name)}" ${filters.type === type.name ? 'selected' : ''}>${escapeHTML(type.name)}</option>`).join('');
    const isNewDisabled = view === 'closed';

    // ★ UI改善: サブタブのHTML構造を変更
    app.innerHTML = `
        <div class="space-y-2">
            <div class="sub-tab-container">
                <div id="trap-tab-open" class="sub-tab-btn ${view === 'open' ? 'active' : ''}">設置中</div>
                <div id="trap-tab-closed" class="sub-tab-btn ${view === 'closed' ? 'active' : ''}">過去の罠</div>
            </div>
            
            <div class="flex space-x-2">
                <button id="new-trap-btn" class="btn btn-primary flex-1" ${isNewDisabled ? 'disabled' : ''}><i class="fas fa-plus"></i> 新規設置</button>
                <button id="manage-types-btn" class="btn btn-secondary flex-1"><i class="fas fa-cog"></i> 種類管理</button>
            </div>

            <div class="card bg-white">
                <div class="grid grid-cols-2 gap-2">
                    <div class="form-group mb-0">
                        <label class="form-label">種類</label>
                        <select id="trap-filter-type" class="form-select">
                            <option value="all" ${filters.type === 'all' ? 'selected' : ''}>すべて</option>
                            ${typeOptions}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label class="form-label">順序</label>
                        <div class="flex space-x-2">
                            <select id="trap-sort-key" class="form-select">
                                <option value="trap_number" ${sort.key === 'trap_number' ? 'selected' : ''}>番号</option>
                                <option value="${view === 'open' ? 'setup_date' : 'close_date'}" ${sort.key === (view === 'open' ? 'setup_date' : 'close_date') ? 'selected' : ''}>日付</option>
                            </select>
                            <select id="trap-sort-order" class="form-select w-24">
                                <option value="asc" ${sort.order === 'asc' ? 'selected' : ''}>昇順</option>
                                <option value="desc" ${sort.order === 'desc' ? 'selected' : ''}>降順</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
            <div id="trap-list" class="space-y-1"><p class="text-gray-500 text-center py-4">読み込み中...</p></div>
        </div>
    `;
    updateHeader('罠管理', false);

    document.getElementById('trap-tab-open').onclick = () => { appState.trapView = 'open'; showTrapPage(); };
    document.getElementById('trap-tab-closed').onclick = () => { appState.trapView = 'closed'; showTrapPage(); };
    document.getElementById('new-trap-btn').onclick = () => { if (!isNewDisabled) showTrapEditForm(null); };
    document.getElementById('manage-types-btn').onclick = () => showTrapTypeManagement();
    
    document.getElementById('trap-filter-type').addEventListener('change', (e) => { filters.type = e.target.value; renderTrapList(); });
    document.getElementById('trap-sort-key').addEventListener('change', (e) => { sort.key = e.target.value; renderTrapList(); });
    document.getElementById('trap-sort-order').addEventListener('change', (e) => { sort.order = e.target.value; renderTrapList(); });

    await renderTrapList();
}

async function renderTrapList() {
    const listEl = document.getElementById('trap-list');
    if (!listEl) return;
    try {
        const view = appState.trapView;
        const filters = appState.trapFilters;
        const sort = (view === 'open') ? appState.trapSortOpen : appState.trapSortClosed;
        const isOpen = (view === 'open') ? 1 : 0;

        let query = db.trap.where('is_open').equals(isOpen);
        let traps = await query.toArray();

        if (filters.type !== 'all') { traps = traps.filter(t => t.type === filters.type); }
        
        traps.sort((a, b) => {
            let valA = a[sort.key], valB = b[sort.key];
            if (sort.key === 'trap_number') return sort.order === 'asc' ? String(valA).localeCompare(String(valB), undefined, {numeric:true}) : String(valB).localeCompare(String(valA), undefined, {numeric:true});
            if (valA < valB) return sort.order === 'asc' ? -1 : 1;
            if (valA > valB) return sort.order === 'asc' ? 1 : -1;
            return 0;
        });

        if (traps.length === 0) { listEl.innerHTML = `<p class="text-gray-500 text-center py-4">データがありません。</p>`; return; }

        const catchCounts = await Promise.all(traps.map(t => db.catch_records.where('trap_id').equals(t.id).count()));

        listEl.innerHTML = traps.map((trap, index) => {
            const count = catchCounts[index];
            const badge = count > 0 ? `<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold">${count}</span>` : '';
            return `
                <div class="trap-card bg-white" data-id="${trap.id}">
                    <div>
                        <h3 class="font-bold text-blue-600">No. ${escapeHTML(trap.trap_number)}</h3>
                        <p>${escapeHTML(trap.type)} <span class="text-xs text-gray-400">(${formatDate(trap.setup_date)})</span></p>
                        ${trap.close_date ? `<p class="text-xs text-gray-500">撤去: ${formatDate(trap.close_date)}</p>` : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        ${badge}
                        <i class="fas fa-chevron-right text-gray-300"></i>
                    </div>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('.trap-card').forEach(item => {
            item.addEventListener('click', () => showTrapDetailPage(parseInt(item.dataset.id, 10)));
        });
    } catch (err) { console.error(err); listEl.innerHTML = `<div class="error-box">読み込み失敗</div>`; }
}

async function showTrapDetailPage(id) {
    const trap = await db.trap.get(id);
    if (!trap) return;
    
    updateHeader(`No.${trap.trap_number}`, true);
    backButton.onclick = () => showTrapPage();

    let actionButtons = `
        <div class="flex gap-2">
            <button id="edit-trap-btn" class="btn btn-secondary flex-1">編集</button>
            <button id="delete-trap-btn" class="btn btn-danger flex-1">削除</button>
        </div>`;

    const catchCount = await db.catch_records.where('trap_id').equals(id).count();
    let catchSection = `
        <div class="card bg-white">
            <div class="flex justify-between items-center mb-2">
                <h3 class="font-bold text-gray-800">捕獲記録 (${catchCount})</h3>
                <button id="add-catch-to-trap-btn" class="btn btn-sm btn-primary"><i class="fas fa-plus"></i></button>
            </div>
            <button id="show-related-catches-btn" class="btn btn-secondary w-full text-sm">一覧を見る</button>
        </div>`;

    let closeSection = '';
    if (trap.is_open === 1) {
        closeSection = `
            <div class="card bg-white border border-red-200">
                <label class="form-label">撤去日</label>
                <div class="flex gap-2">
                    <input type="date" id="close-date-input" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                    <button id="close-trap-btn" class="btn btn-success whitespace-nowrap">撤去する</button>
                </div>
            </div>`;
    }

    let infoHTML = `<div class="card bg-white"><table class="w-full text-sm"><tbody>`;
    const rows = [
        ['番号', trap.trap_number], ['種類', trap.type], ['設置日', formatDate(trap.setup_date)],
        ['状態', trap.is_open ? '設置中' : '撤去済'], ['撤去日', trap.close_date ? formatDate(trap.close_date) : '-'],
        ['座標', `${trap.latitude||'-'}, ${trap.longitude||'-'}`]
    ];
    rows.forEach(r => infoHTML += `<tr><th class="text-left py-1 w-1/3 text-gray-500">${r[0]}</th><td>${escapeHTML(r[1])}</td></tr>`);
    infoHTML += `</tbody></table></div>`;

    let imageHTML = '';
    if (trap.image_blob) {
        const url = URL.createObjectURL(trap.image_blob);
        appState.activeBlobUrls.push(url);
        imageHTML = `<div class="card bg-white"><div class="photo-preview cursor-zoom-in"><img src="${url}" id="detail-image"></div></div>`;
    }

    app.innerHTML = `<div class="space-y-2">${actionButtons}${imageHTML}${infoHTML}${trap.memo ? `<div class="card bg-white"><h3 class="font-bold border-b mb-1">メモ</h3><p class="text-sm">${escapeHTML(trap.memo)}</p></div>` : ''}${catchSection}${closeSection}</div>`;

    document.getElementById('edit-trap-btn').onclick = () => showTrapEditForm(id);
    document.getElementById('delete-trap-btn').onclick = () => deleteTrap(id);
    document.getElementById('show-related-catches-btn').onclick = () => { appState.currentCatchMethod = 'trap'; appState.currentCatchRelationId = id; navigateTo('catch', showCatchListPage, '罠の捕獲記録'); };
    document.getElementById('add-catch-to-trap-btn').onclick = () => showCatchEditForm(null, { trapId: id, gunLogId: null });
    
    if (trap.is_open === 1) {
        document.getElementById('close-trap-btn').onclick = async () => {
            const closeDate = document.getElementById('close-date-input').value;
            if(!closeDate) return alert('撤去日を入力してください');
            if(confirm('この罠を撤去済みにしますか？')) {
                await db.trap.update(id, { is_open: 0, close_date: closeDate });
                showTrapDetailPage(id);
            }
        };
    }
    if (document.getElementById('detail-image')) document.getElementById('detail-image').onclick = (e) => showImageModal(e.target.src);
}

async function showTrapEditForm(id) {
    let trap = { trap_number: '', type: '', setup_date: new Date().toISOString().split('T')[0], memo: '', latitude: '', longitude: '', image_blob: null, is_open: 1 };
    const types = await db.trap_type.toArray();
    if (id) {
        const existing = await db.trap.get(id);
        if (existing) trap = existing;
    }
    
    let imgPreview = '';
    if (trap.image_blob) {
        const url = URL.createObjectURL(trap.image_blob);
        appState.activeBlobUrls.push(url);
        imgPreview = `<div class="form-group"><label class="form-label">現在の写真:</label><div class="photo-preview"><img src="${url}"><button type="button" id="remove-image-btn" class="photo-preview-btn-delete">&times;</button></div></div>`;
    }

    app.innerHTML = `
        <div class="card bg-white">
            <form id="trap-form" class="space-y-3">
                <div class="form-group"><label class="form-label">罠番号 <span class="text-red-500">*</span>:</label><input type="text" id="trap-number" class="form-input" value="${escapeHTML(trap.trap_number)}" required></div>
                <div class="form-group"><label class="form-label">種類:</label><select id="trap-type" class="form-select">${types.map(t=>`<option value="${t.name}" ${t.name===trap.type?'selected':''}>${t.name}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">設置日:</label><input type="date" id="setup-date" class="form-input" value="${escapeHTML(trap.setup_date)}" required></div>
                <div class="form-group">
                    <label class="form-label">位置</label>
                    <div class="flex gap-2 mb-1"><input type="number" step="any" id="trap-lat" class="form-input" value="${escapeHTML(trap.latitude)}" placeholder="緯度"><input type="number" step="any" id="trap-lon" class="form-input" value="${escapeHTML(trap.longitude)}" placeholder="経度"></div>
                    <button type="button" id="get-gps-btn" class="btn btn-secondary w-full text-sm">現在地</button>
                </div>
                ${imgPreview}
                <div class="form-group"><label class="form-label">写真</label><input type="file" id="trap-image" class="form-input" accept="image/*"><div id="image-preview-container" class="mt-2"></div></div>
                <div class="form-group"><label class="form-label">メモ:</label><textarea id="trap-memo" class="form-input">${escapeHTML(trap.memo)}</textarea></div>
                <button type="submit" class="btn btn-primary w-full">保存</button>
            </form>
        </div>
    `;
    updateHeader(id ? '罠の編集' : '新規設置', true);
    backButton.onclick = () => id ? showTrapDetailPage(id) : showTrapPage();

    document.getElementById('get-gps-btn').onclick = async () => {
        try { const loc = await getCurrentLocation(); document.getElementById('trap-lat').value = loc.latitude; document.getElementById('trap-lon').value = loc.longitude; } catch(e) { alert(e.message); }
    };
    
    let resizedImageBlob = null;
    document.getElementById('trap-image').onchange = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        try {
            resizedImageBlob = await resizeImage(file, 800);
            const url = URL.createObjectURL(resizedImageBlob);
            appState.activeBlobUrls.push(url);
            document.getElementById('image-preview-container').innerHTML = `<div class="photo-preview"><img src="${url}"></div>`;
        } catch(e) { alert(e.message); }
    };
    if (document.getElementById('remove-image-btn')) {
        document.getElementById('remove-image-btn').onclick = function() { this.closest('.form-group').remove(); trap.image_blob = null; };
    }

    document.getElementById('trap-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            trap_number: document.getElementById('trap-number').value,
            type: document.getElementById('trap-type').value,
            setup_date: document.getElementById('setup-date').value,
            latitude: document.getElementById('trap-lat').value,
            longitude: document.getElementById('trap-lon').value,
            memo: document.getElementById('trap-memo').value,
            image_blob: trap.image_blob,
            is_open: id ? trap.is_open : 1 
        };
        if (resizedImageBlob) data.image_blob = resizedImageBlob;
        
        if (id) { await db.trap.update(id, data); showTrapDetailPage(id); }
        else { const newId = await db.trap.add(data); showTrapDetailPage(newId); }
    };
}

async function deleteTrap(id) {
    if(!confirm('本当に削除しますか？\n紐付いた捕獲記録も削除されます。')) return;
    await db.transaction('rw', db.trap, db.catch_records, async()=>{
        await db.catch_records.where('trap_id').equals(id).delete();
        await db.trap.delete(id);
    });
    showTrapPage();
}

async function showTrapTypeManagement() {
    updateHeader('種類管理', true);
    backButton.onclick = showTrapPage;
    const render = async () => {
        const types = await db.trap_type.toArray();
        app.innerHTML = `
            <div class="card mb-2"><form id="type-form" class="flex gap-2"><input id="type-name" class="form-input" placeholder="新しい種類" required><button class="btn btn-primary">追加</button></form></div>
            <div class="space-y-1">${types.map(t=>`<div class="card flex justify-between p-2"><span>${escapeHTML(t.name)}</span><button class="btn btn-danger btn-sm del-type" data-id="${t.id}">×</button></div>`).join('')}</div>
        `;
        document.getElementById('type-form').onsubmit = async (e) => { e.preventDefault(); await db.trap_type.add({name: document.getElementById('type-name').value}); render(); };
        document.querySelectorAll('.del-type').forEach(b => b.onclick = async (e) => { if(confirm('削除？')) { await db.trap_type.delete(parseInt(e.target.dataset.id)); render(); } });
    };
    render();
}


// ----------------------------------------------------------------------------
// 4. 銃管理 (元 gun.js)
// ----------------------------------------------------------------------------
async function showGunPage() {
    updateHeader('銃管理', false);
    const logs = await db.gun_log.orderBy('use_date').reverse().toArray();
    const guns = await db.gun.toArray();
    const gMap = new Map(guns.map(g=>[g.id, g.name]));
    
    app.innerHTML = `
        <div class="space-y-2">
            <div class="flex gap-2">
                <button id="btn-new" class="btn btn-primary flex-1"><i class="fas fa-plus"></i> 使用記録</button>
                <button id="btn-manage" class="btn btn-secondary flex-1"><i class="fas fa-cog"></i> 所持銃</button>
            </div>
            <div id="gun-list" class="space-y-1"></div>
        </div>
    `;
    document.getElementById('btn-new').onclick = () => showGunLogEdit(null);
    document.getElementById('btn-manage').onclick = showGunManage;
    
    document.getElementById('gun-list').innerHTML = logs.map(l => `
        <div class="trap-card bg-white" onclick="showGunLogDetail(${l.id})">
            <div>
                <h3 class="font-bold text-blue-600">${formatDate(l.use_date)}</h3>
                <p>${escapeHTML(l.purpose)} / ${escapeHTML(gMap.get(l.gun_id)||'-')}</p>
            </div>
            <i class="fas fa-chevron-right text-gray-300"></i>
        </div>
    `).join('') || '<p class="text-center text-gray-500 py-4">履歴なし</p>';
}

async function showGunManage() {
    updateHeader('所持銃', true);
    backButton.onclick = showGunPage;
    const guns = await db.gun.toArray();
    app.innerHTML = `
        <div class="space-y-2">
            <div class="card"><button id="add" class="btn btn-primary w-full">銃を追加</button></div>
            ${guns.map(g => `<div class="trap-card bg-white" onclick="showGunDetail(${g.id})"><div><h3 class="font-bold">${escapeHTML(g.name)}</h3><p>${escapeHTML(g.type)} / ${escapeHTML(g.caliber)}</p></div><i class="fas fa-chevron-right"></i></div>`).join('')}
        </div>
    `;
    document.getElementById('add').onclick = () => showGunEdit(null);
}

async function showGunDetail(id) {
    const g = await db.gun.get(id);
    updateHeader(g.name, true);
    backButton.onclick = showGunManage;
    
    const p = (await db.ammo_purchases.where('gun_id').equals(id).toArray()).reduce((s,i)=>s+i.amount,0);
    const c = (await db.gun_log.where('gun_id').equals(id).toArray()).reduce((s,i)=>s+(i.ammo_count||0),0);

    app.innerHTML = `
        <div class="space-y-2">
            <div class="flex gap-2"><button id="edit" class="btn btn-secondary flex-1">編集</button><button id="del" class="btn btn-danger flex-1">削除</button></div>
            <div class="card">
                <h3 class="font-bold border-b mb-2">弾管理</h3>
                <div class="flex justify-between mb-2"><span>残弾:</span><span class="font-bold text-xl">${p-c} 発</span></div>
                <form id="add-ammo" class="flex gap-2"><input type="date" id="ad" class="form-input w-1/3" value="${new Date().toISOString().split('T')[0]}"><input type="number" id="an" class="form-input flex-1" placeholder="購入数"><button class="btn btn-sm btn-primary">追加</button></form>
            </div>
        </div>
    `;
    document.getElementById('edit').onclick = () => showGunEdit(id);
    document.getElementById('del').onclick = async () => { if(confirm('削除？')) { await db.gun.delete(id); showGunManage(); } };
    document.getElementById('add-ammo').onsubmit = async (e) => {
        e.preventDefault();
        await db.ammo_purchases.add({gun_id:id, purchase_date:document.getElementById('ad').value, amount:parseInt(document.getElementById('an').value)});
        showGunDetail(id);
    };
}

async function showGunEdit(id) {
    let g = { name:'', type:'', caliber:'' };
    if(id) g = await db.gun.get(id);
    updateHeader('銃編集', true);
    backButton.onclick = () => id ? showGunDetail(id) : showGunManage();
    
    app.innerHTML = `
        <div class="card">
            <form id="form" class="space-y-3">
                <div class="form-group"><label class="form-label">名前</label><input id="name" class="form-input" value="${g.name}" required></div>
                <div class="form-group"><label class="form-label">種類</label><input id="type" class="form-input" value="${g.type}"></div>
                <div class="form-group"><label class="form-label">口径</label><input id="cal" class="form-input" value="${g.caliber}"></div>
                <button class="btn btn-primary w-full">保存</button>
            </form>
        </div>
    `;
    document.getElementById('form').onsubmit = async (e) => {
        e.preventDefault();
        const d = { name:document.getElementById('name').value, type:document.getElementById('type').value, caliber:document.getElementById('cal').value };
        if(id) await db.gun.update(id, d); else id = await db.gun.add(d);
        showGunDetail(id);
    };
}

async function showGunLogEdit(id) {
    let l = { use_date:new Date().toISOString().split('T')[0], gun_id:'', purpose:'狩猟', ammo_count:0, location:'', companion:'', memo:'', image_blob:null };
    if(id) l = await db.gun_log.get(id);
    const guns = await db.gun.toArray();
    
    updateHeader('使用記録', true);
    backButton.onclick = showGunPage;

    app.innerHTML = `
        <div class="card">
            <form id="form" class="space-y-3">
                <div class="form-group"><label class="form-label">日付</label><input type="date" id="date" class="form-input" value="${l.use_date}"></div>
                <div class="form-group"><label class="form-label">銃</label><select id="gun" class="form-select">${guns.map(g=>`<option value="${g.id}" ${g.id==l.gun_id?'selected':''}>${g.name}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">目的</label><select id="pur" class="form-select">${['狩猟','射撃','駆除'].map(p=>`<option ${p==l.purpose?'selected':''}>${p}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">弾数</label><input type="number" id="ammo" class="form-input" value="${l.ammo_count}"></div>
                <div class="form-group"><label class="form-label">場所</label><input id="loc" class="form-input" value="${l.location}"></div>
                <button class="btn btn-primary w-full">保存</button>
            </form>
        </div>
    `;
    document.getElementById('form').onsubmit = async (e) => {
        e.preventDefault();
        const d = { use_date:document.getElementById('date').value, gun_id:parseInt(document.getElementById('gun').value), purpose:document.getElementById('pur').value, ammo_count:parseInt(document.getElementById('ammo').value), location:document.getElementById('loc').value, image_blob:l.image_blob };
        if(id) await db.gun_log.update(id, d); else await db.gun_log.add(d);
        showGunPage();
    };
}

async function showGunLogDetail(id) {
    showGunLogEdit(id); // 簡易化のため編集画面へ直結
}

// ----------------------------------------------------------------------------
// 5. 捕獲 (元 catch.js)
// ----------------------------------------------------------------------------
async function showCatchPage() {
    appState.currentCatchMethod = 'all';
    showCatchListPage();
}
async function showCatchListPage() {
    const method = appState.currentCatchMethod;
    const relId = appState.currentCatchRelationId;
    let recs = await db.catch_records.orderBy('catch_date').reverse().toArray();
    
    if(method==='trap') recs = recs.filter(r=>r.trap_id===relId);
    if(method==='gun') recs = recs.filter(r=>r.gun_log_id===relId);

    updateHeader(method==='all'?'捕獲記録':'関連捕獲', method!=='all');
    if(method!=='all') backButton.onclick = () => method==='trap' ? showTrapDetail(relId) : showGunLogDetail(relId);

    app.innerHTML = `
        <div class="space-y-2">
            ${method==='all' ? '<div class="card mb-2 p-2"><input id="search" class="form-input" placeholder="種名で検索..."></div>' : ''}
            <div id="list" class="space-y-1"></div>
        </div>
    `;
    
    const render = (list) => {
        document.getElementById('list').innerHTML = list.map(r => `
            <div class="trap-card bg-white" onclick="showCatchEdit(${r.id})">
                <div><h3 class="font-bold">${escapeHTML(r.species_name)}</h3><p>${formatDate(r.catch_date)} ${r.gender||''} ${r.trap_id?'(罠)':'(銃)'}</p></div>
                <i class="fas fa-chevron-right text-gray-300"></i>
            </div>
        `).join('') || '<p class="text-center text-gray-500 py-4">なし</p>';
    };
    render(recs);
    
    if(document.getElementById('search')) {
        document.getElementById('search').oninput = (e) => {
            const v = e.target.value;
            render(recs.filter(r => r.species_name.includes(v)));
        };
    }
}

async function showCatchEdit(id, pre={}) {
    let r = { catch_date:new Date().toISOString().split('T')[0], species_name:'', gender:'不明', age:'不明', image_blob:null, ...pre };
    if(id) r = await db.catch_records.get(id);
    
    updateHeader('捕獲記録', true);
    backButton.onclick = () => showCatchListPage();

    let img = '';
    if(r.image_blob) {
        const u = URL.createObjectURL(r.image_blob); appState.activeBlobUrls.push(u);
        img = `<div class="card"><img src="${u}" class="w-full h-32 object-cover"></div>`;
    }

    app.innerHTML = `
        <div class="card">
            <form id="form" class="space-y-3">
                <div class="form-group"><label class="form-label">日付</label><input type="date" id="date" class="form-input" value="${r.catch_date}"></div>
                <div class="form-group"><label class="form-label">種名</label><input id="spec" class="form-input" value="${escapeHTML(r.species_name)}" list="sl"><datalist id="sl"></datalist></div>
                <div class="flex gap-2">
                    <div class="form-group flex-1"><label class="form-label">性別</label><select id="gen" class="form-select">${['不明','オス','メス'].map(v=>`<option ${v==r.gender?'selected':''}>${v}</option>`).join('')}</select></div>
                    <div class="form-group flex-1"><label class="form-label">年齢</label><select id="age" class="form-select">${['不明','成獣','幼獣'].map(v=>`<option ${v==r.age?'selected':''}>${v}</option>`).join('')}</select></div>
                </div>
                ${img}
                <div class="form-group"><label class="form-label">写真</label><input type="file" id="img" class="form-input" accept="image/*"></div>
                <button class="btn btn-primary w-full">保存</button>
            </form>
            ${id ? `<button id="del" class="btn btn-danger w-full mt-2">削除</button>`:''}
        </div>
    `;
    
    // 種名リスト
    db.game_animal_list.where('is_game_animal').equals('〇').toArray().then(L => {
        document.getElementById('sl').innerHTML = [...new Set(L.map(a=>a.species_name))].map(n=>`<option value="${n}"></option>`).join('');
    });

    let blob = r.image_blob;
    document.getElementById('img').onchange = async (e) => { if(e.target.files[0]) blob = await resizeImage(e.target.files[0]); };

    document.getElementById('form').onsubmit = async (e) => {
        e.preventDefault();
        const d = {
            catch_date: document.getElementById('date').value,
            species_name: document.getElementById('spec').value,
            gender: document.getElementById('gen').value,
            age: document.getElementById('age').value,
            image_blob: blob,
            trap_id: id ? r.trap_id : pre.trapId,
            gun_log_id: id ? r.gun_log_id : pre.gunLogId
        };
        if(id) await db.catch_records.update(id, d); else await db.catch_records.add(d);
        showCatchListPage();
    };
    if(id) document.getElementById('del').onclick = async () => { if(confirm('削除？')) { await db.catch_records.delete(id); showCatchListPage(); } };
}

async function showCatchEditForm(id, pre) { showCatchEdit(id, pre); } 

// ----------------------------------------------------------------------------
// 6. チェックリスト (元 checklist.js)
// ----------------------------------------------------------------------------
async function showChecklistPage() {
    updateHeader('チェックリスト', false);
    const sets = await db.checklist_sets.toArray();
    app.innerHTML = `
        <div class="space-y-2">
            <div class="card p-2 flex gap-2"><input id="new-set" class="form-input" placeholder="新しいリスト名"><button id="add-set" class="btn btn-primary">作成</button></div>
            <div id="list" class="space-y-1"></div>
        </div>
    `;
    document.getElementById('list').innerHTML = sets.map(s => `
        <div class="trap-card bg-white" onclick="showChecklistDetail(${s.id})">
            <h3 class="font-bold">${escapeHTML(s.name)}</h3>
            <button class="btn btn-sm btn-danger del-set" data-id="${s.id}">削除</button>
        </div>
    `).join('');
    
    document.getElementById('add-set').onclick = async () => { await db.checklist_sets.add({name:document.getElementById('new-set').value}); showChecklistPage(); };
    document.querySelectorAll('.del-set').forEach(b => b.onclick = async (e) => { e.stopPropagation(); if(confirm('削除？')) { await db.checklist_sets.delete(parseInt(e.target.dataset.id)); showChecklistPage(); } });
}

async function showChecklistDetail(id) {
    const set = await db.checklist_sets.get(id);
    let mode = 'check'; 
    
    const render = async () => {
        updateHeader(set.name, true);
        backButton.onclick = showChecklistPage;
        const items = await db.checklist_items.where('list_id').equals(id).toArray();
        
        // ★ UI改善: サブタブ
        let html = `
            <div class="sub-tab-container">
                <div id="tab-check" class="sub-tab-btn ${mode==='check'?'active':''}">チェック</div>
                <div id="tab-edit" class="sub-tab-btn ${mode==='edit'?'active':''}">編集</div>
            </div>
        `;

        if(mode === 'check') {
            html += `
                <div class="card p-2"><button id="reset" class="btn btn-secondary w-full">リセット</button></div>
                <div class="space-y-1">
                    ${items.map(i => `
                        <div class="card flex items-center p-2 cursor-pointer row" data-id="${i.id}">
                            <div class="w-6 h-6 border rounded mr-2 flex items-center justify-center ${i.is_checked?'bg-blue-600 border-blue-600 text-white':''}">${i.is_checked?'✓':''}</div>
                            <span class="${i.is_checked?'text-gray-400 line-through':''} checklist-item">${escapeHTML(i.name)}</span>
                        </div>`).join('')}
                </div>`;
        } else {
            html += `
                <div class="card p-2 flex gap-2"><input id="new-item" class="form-input"><button id="add-item" class="btn btn-primary">追加</button></div>
                <div class="space-y-1">
                    ${items.map(i => `<div class="card flex justify-between p-2"><span>${escapeHTML(i.name)}</span><button class="btn btn-sm btn-danger del-item" data-id="${i.id}">×</button></div>`).join('')}
                </div>`;
        }
        app.innerHTML = html;

        document.getElementById('tab-check').onclick = () => { mode='check'; render(); };
        document.getElementById('tab-edit').onclick = () => { mode='edit'; render(); };

        if(mode==='check') {
            document.getElementById('reset').onclick = async () => { await db.checklist_items.where('list_id').equals(id).modify({is_checked:false}); render(); };
            document.querySelectorAll('.row').forEach(r => r.onclick = async (e) => {
                const i = items.find(x => x.id === parseInt(e.currentTarget.dataset.id));
                await db.checklist_items.update(i.id, {is_checked: !i.is_checked});
                render();
            });
        } else {
            document.getElementById('add-item').onclick = async () => { await db.checklist_items.add({list_id:id, name:document.getElementById('new-item').value, is_checked:false}); render(); };
            document.querySelectorAll('.del-item').forEach(b => b.onclick = async (e) => { await db.checklist_items.delete(parseInt(e.target.dataset.id)); render(); });
        }
    };
    render();
}


// ----------------------------------------------------------------------------
// 7. 情報 (図鑑・プロフィール) (元 info.js)
// ----------------------------------------------------------------------------
function showInfoPage() {
    updateHeader('情報', false);
    app.innerHTML = `
        <div class="space-y-2">
            <div class="card flex items-center gap-3 p-3 cursor-pointer" onclick="showGameAnimalListPage()">
                <div class="bg-green-100 p-2 rounded text-green-600 text-xl"><i class="fas fa-book"></i></div>
                <div><h3 class="font-bold">狩猟鳥獣図鑑</h3><p class="text-xs text-gray-500">生態・被害</p></div>
                <i class="fas fa-chevron-right ml-auto text-gray-300"></i>
            </div>
            <div class="card flex items-center gap-3 p-3 cursor-pointer" onclick="showHunterProfilePage()">
                <div class="bg-blue-100 p-2 rounded text-blue-600 text-xl"><i class="fas fa-id-card"></i></div>
                <div><h3 class="font-bold">捕獲者情報</h3><p class="text-xs text-gray-500">許可証管理</p></div>
                <i class="fas fa-chevron-right ml-auto text-gray-300"></i>
            </div>
        </div>
    `;
}

async function showGameAnimalListPage() {
    updateHeader('図鑑', true);
    backButton.onclick = showInfoPage;
    
    // フィルタ・ソートロジック
    let animals = await db.game_animal_list.toArray();
    animals.sort((a,b) => a.id - b.id);

    app.innerHTML = `
        <div class="space-y-2">
            <div class="card p-2 flex gap-2"><input id="search" class="form-input" placeholder="名前で検索..."></div>
            <div id="ga-list" class="space-y-1"></div>
        </div>`;
    
    const render = (list) => {
        document.getElementById('ga-list').innerHTML = list.map(a => `
            <div class="animal-card bg-white" onclick="showGameAnimalDetail(${a.id})">
                <div class="flex items-center gap-2">
                    <div class="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        ${a.image_1 ? `<img src="./image/${escapeHTML(a.image_1)}" class="w-full h-full object-cover">` : '<i class="fas fa-paw text-gray-300 m-auto"></i>'}
                    </div>
                    <div><h3 class="font-bold">${escapeHTML(a.species_name)}</h3>
                    <span class="text-xs bg-gray-100 px-1 rounded">${escapeHTML(a.category)}</span></div>
                </div>
                <i class="fas fa-chevron-right text-gray-300"></i>
            </div>
        `).join('');
    };
    render(animals);
    document.getElementById('search').oninput = (e) => { render(animals.filter(a => a.species_name.includes(e.target.value))); };
}

async function showGameAnimalDetail(id) {
    const a = await db.game_animal_list.get(id);
    updateHeader(a.species_name, true);
    backButton.onclick = showGameAnimalListPage;
    
    let imgs = '';
    if(a.image_1) imgs += `<img src="./image/${a.image_1}" class="w-full h-48 object-cover rounded mb-1">`;
    if(a.image_2) imgs += `<img src="./image/${a.image_2}" class="w-full h-48 object-cover rounded">`;

    app.innerHTML = `
        <div class="space-y-2">
            ${imgs ? `<div class="card p-1">${imgs}</div>` : ''}
            <div class="card"><h3 class="font-bold border-b mb-1">生態</h3><p class="text-sm">${a.ecology||'-'}</p></div>
            <div class="card"><h3 class="font-bold border-b mb-1">被害・特徴</h3><p class="text-sm">${a.damage||'-'}</p></div>
            <div class="card">
                <h3 class="font-bold border-b mb-1">データ</h3>
                <table class="w-full text-sm">
                    <tr><th class="text-left w-1/3 text-gray-500">狩猟</th><td>${a.is_game_animal==='〇'?'狩猟鳥獣':'非狩猟鳥獣'}</td></tr>
                    <tr><th class="text-left text-gray-500">制限</th><td>${a.count||'-'}</td></tr>
                    <tr><th class="text-left text-gray-500">禁止</th><td>${a.prohibited_area||'-'}</td></tr>
                </table>
            </div>
        </div>
    `;
}

// プロフィール (項目別保存版)
async function showHunterProfilePage() {
    updateHeader('登録情報', true);
    backButton.onclick = showInfoPage;
    
    const p = await db.hunter_profile.get('main') || {};
    const imgs = await db.profile_images.toArray();
    const fields = [{k:'name',l:'氏名'},{k:'gun_license_renewal',l:'銃所持許可'},{k:'hunting_license_renewal',l:'狩猟免状'},{k:'registration_renewal',l:'登録証'},{k:'explosives_permit_renewal',l:'火薬許可'}];

    app.innerHTML = `
        <div class="space-y-2">
            <div class="card text-right py-1"><button id="edit" class="text-blue-600 text-sm">編集モードへ</button></div>
            ${fields.map(f => {
                const myImgs = imgs.filter(i=>i.type===f.k);
                let imgHTML = '';
                if(myImgs.length) {
                    imgHTML = `<div class="flex gap-1 mt-1 overflow-x-auto">` + myImgs.map(i=>{
                        const u = URL.createObjectURL(i.image_blob); appState.activeBlobUrls.push(u);
                        return `<img src="${u}" class="h-12 w-12 rounded border object-cover" onclick="showImageModal(this.src)">`;
                    }).join('') + `</div>`;
                }
                return `<div class="card"><div class="flex justify-between"><span class="text-gray-500 text-sm">${f.l}</span><span class="font-bold">${escapeHTML(p[f.k]||'')}</span></div>${imgHTML}</div>`;
            }).join('')}
        </div>
    `;
    document.getElementById('edit').onclick = showHunterProfileEdit;
}

async function showHunterProfileEdit() {
    updateHeader('情報編集', true);
    backButton.onclick = showHunterProfilePage;
    
    const p = await db.hunter_profile.get('main') || {key:'main'};
    const imgs = await db.profile_images.toArray();
    const fields = [{k:'name',l:'氏名'},{k:'gun_license_renewal',l:'銃所持許可'},{k:'hunting_license_renewal',l:'狩猟免状'},{k:'registration_renewal',l:'登録証'},{k:'explosives_permit_renewal',l:'火薬許可'}];

    app.innerHTML = `<div id="editor" class="space-y-2"></div><input type="file" id="file" hidden>`;
    const editor = document.getElementById('editor');
    const fileIn = document.getElementById('file');
    let targetKey = null;

    fields.forEach(f => {
        const myImgs = imgs.filter(i=>i.type===f.k);
        let imgHTML = myImgs.map(i => {
            const u = URL.createObjectURL(i.image_blob); appState.activeBlobUrls.push(u);
            return `<div class="relative inline-block mr-1"><img src="${u}" class="h-12 w-12 rounded object-cover"><button class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center del-img" data-id="${i.id}">×</button></div>`;
        }).join('');

        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <label class="form-label">${f.l}</label>
            <div class="flex gap-2 mb-2"><input id="in-${f.k}" class="form-input flex-1" value="${escapeHTML(p[f.k]||'')}"><button class="btn btn-primary w-16 save" data-key="${f.k}">保存</button></div>
            <div class="flex items-center flex-wrap">${imgHTML}<button class="btn btn-secondary btn-sm h-12 w-12 flex flex-col items-center justify-center text-xs add-img" data-key="${f.k}"><i class="fas fa-camera"></i></button></div>
        `;
        editor.appendChild(div);
    });

    editor.querySelectorAll('.save').forEach(b => b.onclick = async (e) => {
        const k = e.target.dataset.key;
        p[k] = document.getElementById(`in-${k}`).value;
        await db.hunter_profile.put(p);
        e.target.textContent='OK'; setTimeout(()=>e.target.textContent='保存',1000);
    });
    editor.querySelectorAll('.add-img').forEach(b => b.onclick = (e) => { targetKey=e.currentTarget.dataset.key; fileIn.click(); });
    editor.querySelectorAll('.del-img').forEach(b => b.onclick = async (e) => { await db.profile_images.delete(parseInt(e.target.dataset.id)); showHunterProfileEdit(); });

    fileIn.onchange = async (e) => {
        if(e.target.files[0]) {
            const b = await resizeImage(e.target.files[0]);
            await db.profile_images.add({type:targetKey, image_blob:b});
            showHunterProfileEdit();
        }
        fileIn.value = '';
    };
}

// ----------------------------------------------------------------------------
// 8. 設定 (元 settings.js)
// ----------------------------------------------------------------------------
function showSettingsPage() {
    updateHeader('設定', false);
    app.innerHTML = `
        <div class="space-y-2">
            <div class="card">
                <h3 class="font-bold border-b mb-2">表示</h3>
                <div class="flex gap-2 mb-2"><select id="theme" class="form-select flex-1"><option value="light">ライト</option><option value="sepia">セピア</option><option value="lightgreen">緑</option></select></div>
                <div class="flex gap-2"><select id="size" class="form-select flex-1"><option value="small">小</option><option value="medium">中</option><option value="large">大</option></select></div>
            </div>
            <div class="card">
                <h3 class="font-bold border-b mb-2">データ</h3>
                <button id="backup" class="btn btn-secondary w-full mb-1">バックアップ</button>
                <button id="restore" class="btn btn-secondary w-full">復元</button>
                <input type="file" id="f-res" hidden>
            </div>
            <div class="card bg-red-50">
                <button id="update" class="btn btn-warning w-full">アプリ更新</button>
            </div>
        </div>
    `;
    // (イベントリスナー省略せず実装)
    document.getElementById('theme').onchange = e => { db.settings.put({key:'theme',value:e.target.value}); applyTheme(e.target.value); };
    document.getElementById('size').onchange = e => { db.settings.put({key:'fontSize',value:e.target.value}); applyFontSize(e.target.value); };
    document.getElementById('backup').onclick = exportAllData;
    document.getElementById('restore').onclick = () => document.getElementById('f-res').click();
    document.getElementById('f-res').onchange = (e) => importAllData(e.target.files[0]);
    document.getElementById('update').onclick = () => location.reload(true);
}

// データ処理 (短縮版)
async function exportAllData() {
    const data = {};
    for (const t of ['hunter_profile','settings','trap','trap_type','gun','gun_log','catch_records','checklist_sets','checklist_items','game_animal_list','ammo_purchases','profile_images']) {
        data[t] = await db[t].toArray();
    }
    for (const t of ['trap','catch_records','gun_log','profile_images']) {
        if(data[t]) data[t] = await Promise.all(data[t].map(async i => ({...i, image_blob: await blobToBase64(i.image_blob)})));
    }
    const blob = new Blob([JSON.stringify(data)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

async function importAllData(file) {
    if(!confirm('データは上書きされます。よろしいですか？')) return;
    try {
        const data = JSON.parse(await file.text());
        const tabs = data.tables || data;
        const conv = async (t) => tabs[t] ? Promise.all(tabs[t].map(async i => ({...i, image_blob: await base64ToBlob(i.image_blob)}))) : [];
        
        await db.transaction('rw', db.tables, async () => {
            await Promise.all(db.tables.map(t=>t.clear()));
            await Promise.all([
                db.hunter_profile.bulkAdd(tabs.hunter_profile||[]), db.settings.bulkAdd(tabs.settings||[]),
                db.trap_type.bulkAdd(tabs.trap_type||[]), db.gun.bulkAdd(tabs.gun||[]),
                db.ammo_purchases.bulkAdd(tabs.ammo_purchases||[]), db.game_animal_list.bulkAdd(tabs.game_animal_list||[]),
                db.checklist_sets.bulkAdd(tabs.checklist_sets||[]), db.checklist_items.bulkAdd(tabs.checklist_items||[]),
                db.trap.bulkAdd(await conv('trap')), db.catch_records.bulkAdd(await conv('catch_records')),
                db.gun_log.bulkAdd(await conv('gun_log')), db.profile_images.bulkAdd(await conv('profile_images'))
            ]);
        });
        alert('完了'); location.reload();
    } catch { alert('失敗'); }
}

function blobToBase64(b) { return new Promise((res,rej)=>{ if(!b){res(null);return;} const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(b); }); }
async function base64ToBlob(d) { if(!d)return null; return (await fetch(d)).blob(); }