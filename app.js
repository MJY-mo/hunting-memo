// ============================================================================
// app.js - 狩猟アプリ 統合JavaScriptファイル (v15: 重量追加 & マップ連携版)
// ============================================================================

// ----------------------------------------------------------------------------
// 1. データベース定義
// ----------------------------------------------------------------------------
const db = new Dexie('HuntingAppDB');

// スキーマ定義 (v15: catch_recordsにweightを追加)
db.version(15).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date, purpose, [is_open+trap_number], [is_open+setup_date], [is_open+close_date]',
    trap_type: '++id, &name',
    // ↓ weight を追加
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, weight, gender, age, memo, image_blob, latitude, longitude, [gender+catch_date], [age+catch_date], [trap_id+catch_date], [gun_log_id+catch_date], [gender+species_name], [age+species_name], [trap_id+species_name], [gun_log_id+species_name]',
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

// ----------------------------------------------------------------------------
// 2. メインロジック & 共通関数
// ----------------------------------------------------------------------------

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

// CSV読み込み
async function populateGameAnimalListIfNeeded(forceUpdate = false) {
    try {
        const count = await db.game_animal_list.count();
        if (count > 0 && !forceUpdate) return;
        
        const CSV_URL = 'https://raw.githubusercontent.com/MJY-mo/hunting-memo/refs/heads/main/%E7%8B%A9%E7%8C%9F%E9%B3%A5%E7%8D%A3.csv'; 
        const fetchUrl = `${CSV_URL}?t=${Date.now()}`;
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);
        const csvText = await response.text();
        const records = parseCSV(csvText);
        
        let startIndex = 0;
        if (records[0][0] && records[0][0].includes('分類')) startIndex = 1;
        
        const animals = [];
        for (let i = startIndex; i < records.length; i++) {
            const row = records[i];
            if (row.length < 3) continue;
            animals.push({
                category: row[0] || '', is_game_animal: row[1] || '', species_name: row[2] || '',
                method_gun: row[3] || '', method_trap: row[4] || '', method_net: row[5] || '',
                gender: row[6] || '', count: row[7] || '', prohibited_area: row[8] || '',
                habitat: row[9] || '', notes: row[10] || '',
                ecology: row[11] || '', damage: row[12] || '',
                image_1: row[13] || '', image_2: row[14] || ''
            });
        }
        if (animals.length === 0) throw new Error('有効なデータが見つかりませんでした。');

        await db.transaction('rw', db.game_animal_list, async () => {
            await db.game_animal_list.clear();
            await db.game_animal_list.bulkAdd(animals);
        });
    } catch (err) {
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
    root.classList.add(themeValue === 'sepia' ? 'theme-sepia' : themeValue === 'lightgreen' ? 'theme-light-green' : themeValue === 'lightblue' ? 'theme-light-blue' : 'theme-light');
}
function applyFontSize(sizeValue) {
    const root = document.documentElement;
    root.classList.remove('font-size-xsmall', 'font-size-small', 'font-size-medium', 'font-size-large', 'font-size-xlarge');
    root.classList.add(`font-size-${sizeValue}`);
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
    if (!dateString) return '未設定';
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
// ==========================================
// ★ ピンチズーム対応 画像モーダル関数
// ==========================================
function showImageModal(blobUrl) {
    closeImageModal(); // 既存があれば閉じる

    // オーバーレイ作成
    const ol = document.createElement('div');
    ol.id = 'image-modal-overlay';
    ol.className = 'image-modal-overlay';

    // 閉じるボタン作成
    const closeBtn = document.createElement('div');
    closeBtn.className = 'modal-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = (e) => {
        e.stopPropagation(); // 親への伝播を止める
        closeImageModal();
    };
    ol.appendChild(closeBtn);

    // 画像コンテナ
    const ct = document.createElement('div');
    ct.className = 'image-modal-content';

    // 画像要素
    const img = document.createElement('img');
    img.src = blobUrl;
    ct.appendChild(img);
    ol.appendChild(ct);
    document.body.appendChild(ol);

    // --- ズーム & ドラッグ ロジック ---
    let scale = 1;
    let pointX = 0;
    let pointY = 0;
    let startX = 0;
    let startY = 0;
    let initialDistance = 0;
    let isDragging = false;

    // スタイル適用
    const updateTransform = () => {
        img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
    };

    // タッチ開始
    ol.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            // 2本指: ピンチ開始
            e.preventDefault();
            initialDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
        } else if (e.touches.length === 1) {
            // 1本指: ドラッグ開始（拡大中のみ）
            if (scale > 1) {
                isDragging = true;
                startX = e.touches[0].pageX - pointX;
                startY = e.touches[0].pageY - pointY;
            }
        }
    }, { passive: false });

    // タッチ移動
    ol.addEventListener('touchmove', (e) => {
        e.preventDefault(); // 画面スクロール防止

        if (e.touches.length === 2) {
            // ピンチ中
            const currentDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            
            if (initialDistance > 0) {
                // 距離の変化率でスケールを変更
                const diff = currentDistance - initialDistance;
                // 感度調整（急激な変化を防ぐ）
                const newScale = scale + (diff * 0.005);
                
                // 制限（1倍〜5倍）
                scale = Math.min(Math.max(1, newScale), 5);
                
                // 1倍に戻ったら位置もリセット
                if (scale === 1) {
                    pointX = 0;
                    pointY = 0;
                }
                
                updateTransform();
                initialDistance = currentDistance; // 基準距離を更新
            }
        } else if (e.touches.length === 1 && isDragging && scale > 1) {
            // ドラッグ中
            pointX = e.touches[0].pageX - startX;
            pointY = e.touches[0].pageY - startY;
            updateTransform();
        }
    }, { passive: false });

    // タッチ終了
    ol.addEventListener('touchend', (e) => {
        isDragging = false;
        if (e.touches.length < 2) {
            initialDistance = 0;
        }
        // 指を離した時に拡大していなければ位置リセット
        if (scale <= 1) {
            scale = 1;
            pointX = 0;
            pointY = 0;
            updateTransform();
        }
    });

    // クリックで閉じる（拡大していない時のみ）
    ct.onclick = (e) => {
        if (scale <= 1.1) closeImageModal(); // ほぼ等倍なら閉じる
    };
}

function closeImageModal() {
    const ol = document.getElementById('image-modal-overlay');
    if (ol) ol.remove();
}
// ★新規追加: Googleマップボタン生成
function generateMapButton(lat, lon) {
    if (!lat || !lon) return '';
    // Googleマップアプリを検索モードで開く (オフラインマップ対応)
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    return `
        <a href="${url}" target="_blank" class="btn btn-secondary flex items-center justify-center gap-2 mt-2" style="text-decoration:none; color: #2563eb; font-weight:bold;">
            <i class="fas fa-map-marked-alt"></i> Googleマップで確認
        </a>
    `;
}


// ----------------------------------------------------------------------------
// 3. 罠管理機能 (元 trap.js)
// ----------------------------------------------------------------------------

async function showTrapPage() {
    const view = appState.trapView;
    const filters = appState.trapFilters;
    const sort = (view === 'open') ? appState.trapSortOpen : appState.trapSortClosed;
    const trapTypes = await db.trap_type.toArray();
    const typeOptions = trapTypes.map(type => `<option value="${escapeHTML(type.name)}" ${filters.type === type.name ? 'selected' : ''}>${escapeHTML(type.name)}</option>`).join('');
    const isNewDisabled = view === 'closed';

    const tabOpenClass = view === 'open' ? 'sub-tab-active' : 'sub-tab-inactive';
    const tabClosedClass = view === 'closed' ? 'sub-tab-active' : 'sub-tab-inactive';

    let html = `
        <div class="space-y-2">
            <div class="sub-tab-container">
                <button id="trap-tab-open" class="sub-tab-button ${tabOpenClass}">設置中</button>
                <button id="trap-tab-closed" class="sub-tab-button ${tabClosedClass}">過去の罠</button>
            </div>
            <div class="flex space-x-2">
                <button id="new-trap-btn" class="btn btn-primary flex-1" ${isNewDisabled ? 'disabled' : ''}><i class="fas fa-plus"></i> 新規設置</button>
                <button id="manage-types-btn" class="btn btn-secondary flex-1"><i class="fas fa-cog"></i> 種類を管理</button>
            </div>
            <div class="card bg-white">
                <div class="grid grid-cols-2 gap-2">
                    <div class="form-group mb-0">
                        <label class="form-label">種類:</label>
                        <select id="trap-filter-type" class="form-select">
                            <option value="all" ${filters.type === 'all' ? 'selected' : ''}>すべて</option>
                            ${typeOptions}
                        </select>
                    </div>
                    <div class="form-group mb-0">
                        <label class="form-label">ソート:</label>
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
    app.innerHTML = html;
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
            const badge = count > 0 ? `<span class="badge bg-emerald-100 text-emerald-800">${count}件</span>` : '';
            return `
                <div class="trap-card flex items-center" data-id="${trap.id}">
                    <div class="flex-grow">
                        <div class="flex items-center">
                            <h3 class="text-lg font-semibold text-blue-600 mr-2">No. ${escapeHTML(trap.trap_number)}</h3>
                            ${badge}
                        </div>
                        <p class="text-sm text-gray-600">${escapeHTML(trap.type)} <span class="text-gray-400">|</span> ${formatDate(trap.setup_date)}</p>
                        ${trap.close_date ? `<p class="text-xs text-gray-500">撤去: ${formatDate(trap.close_date)}</p>` : ''}
                    </div>
                    <div class="flex-shrink-0 ml-2"><span>&gt;</span></div>
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
    
    updateHeader(`罠 No.${trap.trap_number}`, true);
    backButton.onclick = () => showTrapPage();

    // 編集・削除ボタン
    let actionButtons = `
        <div class="card bg-white"><div class="flex space-x-2">
            <button id="edit-trap-btn" class="btn btn-secondary flex-1">編集</button>
            <button id="delete-trap-btn" class="btn btn-danger flex-1">削除</button>
        </div></div>`;

    // 捕獲記録ボタン
    const catchCount = await db.catch_records.where('trap_id').equals(id).count();
    let catchSection = `
        <div class="card bg-white">
            <h2 class="text-lg font-semibold border-b pb-1 mb-2">捕獲記録 (${catchCount}件)</h2>
            <div class="space-y-2">
                <button id="show-related-catches-btn" class="btn btn-secondary w-full justify-start text-left"><span class="w-6"><i class="fas fa-paw"></i></span> この罠の捕獲記録を見る</button>
                <button id="add-catch-to-trap-btn" class="btn btn-primary w-full justify-start text-left"><span class="w-6"><i class="fas fa-plus"></i></span> この罠での捕獲記録を追加</button>
            </div>
        </div>`;

    // 撤去ボタン (設置中の場合のみ)
    let closeSection = '';
    if (trap.is_open === 1) {
        closeSection = `
            <div class="card bg-white border border-red-200">
                <h2 class="text-lg font-semibold border-b pb-1 mb-2 text-red-600">罠の撤去</h2>
                <div class="form-group">
                    <label class="form-label">撤去日:</label>
                    <input type="date" id="close-date-input" class="form-input" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <button id="close-trap-btn" class="btn btn-success w-full">この罠を解除する (過去へ移動)</button>
            </div>`;
    }

    // ★ マップボタン生成
    const mapBtn = generateMapButton(trap.latitude, trap.longitude);

    // 基本情報
    let infoHTML = `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">基本情報</h2><table class="w-full text-sm"><tbody>`;
    const rows = [
        ['番号', trap.trap_number], ['種類', trap.type], ['設置日', formatDate(trap.setup_date)],
        ['状態', trap.is_open ? '設置中' : '撤去済'], ['撤去日', trap.close_date ? formatDate(trap.close_date) : '-'],
        ['緯度', trap.latitude], ['経度', trap.longitude]
    ];
    rows.forEach(r => infoHTML += `<tr class="border-b"><th class="w-1/3 text-left p-1 bg-gray-50">${r[0]}</th><td class="p-1">${escapeHTML(r[1])}</td></tr>`);
    infoHTML += `</tbody></table>${mapBtn}</div>`;

    // 画像
    let imageHTML = '';
    if (trap.image_blob) {
        const url = URL.createObjectURL(trap.image_blob);
        appState.activeBlobUrls.push(url);
        imageHTML = `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">写真</h2><div class="photo-preview cursor-zoom-in"><img src="${url}" id="detail-image"></div></div>`;
    }

    app.innerHTML = `<div class="space-y-2">${actionButtons}${imageHTML}${infoHTML}${trap.memo ? `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">メモ</h2><p class="text-sm">${escapeHTML(trap.memo)}</p></div>` : ''}${catchSection}${closeSection}</div>`;

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
    let trap = { trap_number: '', type: '', setup_date: new Date().toISOString().split('T')[0], memo: '', latitude: '', longitude: '', image_blob: null };
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
            <form id="trap-form" class="space-y-2">
                <div class="form-group"><label class="form-label">罠番号 <span class="text-red-500">*</span>:</label><input type="text" id="trap-number" class="form-input" value="${escapeHTML(trap.trap_number)}" required></div>
                <div class="form-group"><label class="form-label">種類:</label><select id="trap-type" class="form-select">${types.map(t=>`<option value="${t.name}" ${t.name===trap.type?'selected':''}>${t.name}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">設置日:</label><input type="date" id="setup-date" class="form-input" value="${escapeHTML(trap.setup_date)}" required></div>
                <div class="form-group">
                    <span class="form-label">位置情報</span>
                    <div class="grid grid-cols-2 gap-2"><input type="number" step="any" id="trap-lat" class="form-input" value="${escapeHTML(trap.latitude)}" placeholder="緯度"><input type="number" step="any" id="trap-lon" class="form-input" value="${escapeHTML(trap.longitude)}" placeholder="経度"></div>
                    <button type="button" id="get-gps-btn" class="btn btn-secondary w-full mt-2">現在地を取得</button>
                </div>
                ${imgPreview}
                <div class="form-group"><label class="form-label">写真を追加/変更:</label><input type="file" id="trap-image" class="form-input" accept="image/*"><div id="image-preview-container" class="mt-2"></div></div>
                <div class="form-group"><label class="form-label">メモ:</label><textarea id="trap-memo" class="form-input">${escapeHTML(trap.memo)}</textarea></div>
                <button type="submit" class="btn btn-primary w-full py-3">保存</button>
            </form>
        </div>
    `;
    updateHeader(id ? '罠の編集' : '新規設置', true);
    backButton.onclick = () => id ? showTrapDetailPage(id) : showTrapPage();

    // イベントリスナー (GPS, 画像処理, 保存)
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
            is_open: id ? trap.is_open : 1 // 新規なら1
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
    updateHeader('罠種類の管理', true);
    backButton.onclick = () => showTrapPage();
    app.innerHTML = `
        <div class="card bg-white mb-2"><form id="type-form" class="flex gap-2"><input id="type-name" class="form-input" placeholder="新しい種類" required><button class="btn btn-primary">追加</button></form></div>
        <div id="type-list" class="space-y-1"></div>
    `;
    const render = async () => {
        const list = await db.trap_type.toArray();
        document.getElementById('type-list').innerHTML = list.map(t=>`<div class="card bg-white flex justify-between p-2"><span>${escapeHTML(t.name)}</span><button class="btn btn-danger btn-sm del-type" data-id="${t.id}">削除</button></div>`).join('');
        document.querySelectorAll('.del-type').forEach(b => b.onclick = async (e)=>{
            if(confirm('削除しますか？')) { await db.trap_type.delete(parseInt(e.target.dataset.id)); render(); }
        });
    };
    render();
    document.getElementById('type-form').onsubmit = async (e) => {
        e.preventDefault();
        try { await db.trap_type.add({name: document.getElementById('type-name').value}); document.getElementById('type-name').value=''; render(); } catch { alert('エラー'); }
    };
}


// ----------------------------------------------------------------------------
// 4. 銃管理機能 (元 gun.js)
// ----------------------------------------------------------------------------

async function showGunPage() {
    const filters = appState.gunLogFilters;
    const sort = appState.gunLogSort;
    const guns = await db.gun.toArray();
    const gunOptions = guns.map(g => `<option value="${g.id}" ${filters.gun_id == g.id ? 'selected' : ''}>${escapeHTML(g.name)}</option>`).join('');

    app.innerHTML = `
        <div class="space-y-2">
            <div class="flex space-x-2">
                <button id="new-gun-log-btn" class="btn btn-primary flex-1"><i class="fas fa-plus"></i> 新規使用履歴</button>
                <button id="manage-guns-btn" class="btn btn-secondary flex-1"><i class="fas fa-cog"></i> 所持銃の管理</button>
            </div>
            <div class="card bg-white">
                <div class="grid grid-cols-2 gap-2">
                    <div class="form-group mb-0"><label class="form-label">目的:</label><select id="gun-filter-purpose" class="form-select"><option value="all">すべて</option><option value="狩猟">狩猟</option><option value="射撃">射撃</option><option value="有害駆除">有害駆除</option><option value="その他">その他</option></select></div>
                    <div class="form-group mb-0"><label class="form-label">銃:</label><select id="gun-filter-id" class="form-select"><option value="all">すべて</option>${gunOptions}</select></div>
                </div>
            </div>
            <div id="gun-log-list" class="space-y-1"><p class="text-gray-500 text-center py-4">読み込み中...</p></div>
        </div>
    `;
    updateHeader('銃・使用履歴', false);
    
    document.getElementById('gun-filter-purpose').value = filters.purpose;
    
    document.getElementById('new-gun-log-btn').onclick = () => showGunLogEditForm(null);
    document.getElementById('manage-guns-btn').onclick = () => showGunListManagementPage();
    document.getElementById('gun-filter-purpose').onchange = (e) => { filters.purpose = e.target.value; renderGunLogList(); };
    document.getElementById('gun-filter-id').onchange = (e) => { filters.gun_id = e.target.value; renderGunLogList(); };

    await renderGunLogList();
}

async function renderGunLogList() {
    const listEl = document.getElementById('gun-log-list');
    if (!listEl) return;
    const { purpose, gun_id } = appState.gunLogFilters;
    let logs = await db.gun_log.orderBy('use_date').reverse().toArray();
    
    if (purpose !== 'all') logs = logs.filter(l => l.purpose === purpose);
    if (gun_id !== 'all') logs = logs.filter(l => l.gun_id == gun_id);

    if (logs.length === 0) { listEl.innerHTML = '<p class="text-gray-500 text-center">履歴なし</p>'; return; }

    const guns = await db.gun.toArray();
    const gunMap = new Map(guns.map(g => [g.id, g.name]));
    const catchCounts = await Promise.all(logs.map(l => db.catch_records.where('gun_log_id').equals(l.id).count()));

    listEl.innerHTML = logs.map((log, i) => {
        const count = catchCounts[i];
        const badge = count > 0 ? `<span class="badge bg-emerald-100 text-emerald-800">${count}件</span>` : '';
        return `
            <div class="trap-card flex items-center" data-id="${log.id}">
                <div class="flex-grow">
                    <div class="flex items-center">
                        <h3 class="text-lg font-semibold text-blue-600 mr-2">${formatDate(log.use_date)}</h3>
                        ${badge}
                    </div>
                    <p class="text-sm text-gray-600">${escapeHTML(log.purpose)} / ${escapeHTML(gunMap.get(log.gun_id) || '削除済')}</p>
                    ${log.ammo_count ? `<p class="text-sm text-gray-500">消費: ${log.ammo_count}発</p>` : ''}
                </div>
                <div class="flex-shrink-0 ml-2"><span>&gt;</span></div>
            </div>`;
    }).join('');
    
    listEl.querySelectorAll('.trap-card').forEach(d => d.onclick = () => showGunLogDetailPage(parseInt(d.dataset.id)));
}

async function showGunListManagementPage() {
    updateHeader('所持銃の管理', true);
    backButton.onclick = () => showGunPage();
    app.innerHTML = `
        <div class="space-y-2">
            <div class="card bg-white"><button id="add-gun-btn" class="btn btn-primary w-full"><i class="fas fa-plus"></i> 銃を追加</button></div>
            <div id="gun-mgmt-list" class="space-y-1"></div>
        </div>
    `;
    document.getElementById('add-gun-btn').onclick = () => showGunEditForm(null);
    const listEl = document.getElementById('gun-mgmt-list');
    const guns = await db.gun.toArray();
    if(guns.length===0) listEl.innerHTML = '<p class="text-center text-gray-500">登録なし</p>';
    else listEl.innerHTML = guns.map(g => `<div class="trap-card bg-white flex justify-between items-center" data-id="${g.id}"><div><h3 class="text-lg font-semibold">${escapeHTML(g.name)}</h3><p class="text-sm text-gray-600">${escapeHTML(g.type)} / ${escapeHTML(g.caliber)}</p></div><span>&gt;</span></div>`).join('');
    listEl.querySelectorAll('.trap-card').forEach(d => d.onclick = () => showGunDetailPage(parseInt(d.dataset.id)));
}

async function showGunDetailPage(id) {
    const gun = await db.gun.get(id);
    if (!gun) return;
    updateHeader(gun.name, true);
    backButton.onclick = () => showGunListManagementPage();

    // 編集・削除
    const actions = `<div class="card bg-white"><div class="flex space-x-2"><button id="edit-gun" class="btn btn-secondary flex-1">編集</button><button id="del-gun" class="btn btn-danger flex-1">削除</button></div></div>`;
    
    // 基本情報
    let info = `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">銃の情報</h2><table class="w-full text-sm"><tbody>`;
    [['名前', gun.name], ['種類', gun.type], ['口径', gun.caliber]].forEach(r => info += `<tr class="border-b"><th class="w-1/3 text-left p-1 bg-gray-50">${r[0]}</th><td class="p-1">${escapeHTML(r[1])}</td></tr>`);
    info += `</tbody></table></div>`;

    // 履歴ボタン
    const histBtn = `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">使用履歴</h2><button id="show-hist" class="btn btn-secondary w-full text-left"><span class="w-6"><i class="fas fa-history"></i></span> この銃の履歴を見る</button></div>`;

    // 弾管理
    const today = new Date().toISOString().split('T')[0];
    const ammoHTML = `
        <div class="card bg-white">
            <h2 class="text-lg font-semibold border-b pb-1 mb-2">弾の管理</h2>
            <form id="ammo-purchase-form" class="space-y-2 mb-4">
                <div class="form-group"><label class="form-label">購入日:</label><input type="date" id="ammo-date" class="form-input" value="${today}" required></div>
                <div class="form-group"><label class="form-label">購入数:</label><input type="number" id="ammo-amount" class="form-input" min="1" required></div>
                <button type="submit" class="btn btn-primary w-full">購入を記録</button>
            </form>
            <h3 class="text-md font-semibold mt-4">集計</h3>
            <table class="w-full text-sm my-2"><tbody>
                <tr class="border-b"><th class="w-1/2 text-left bg-gray-50 p-1">総購入数</th><td id="ammo-total-p" class="p-1">...</td></tr>
                <tr class="border-b"><th class="w-1/2 text-left bg-gray-50 p-1">総消費数</th><td id="ammo-total-c" class="p-1">...</td></tr>
                <tr class="border-b"><th class="w-1/2 text-left bg-gray-50 p-1">残弾数</th><td id="ammo-rem" class="p-1 font-bold">...</td></tr>
            </tbody></table>
            <h3 class="text-md font-semibold mt-4">履歴</h3>
            <div id="ammo-log-list" class="max-h-60 overflow-y-auto border rounded-lg mt-2"><table class="w-full text-sm"><thead class="bg-gray-50 sticky top-0"><tr><th class="p-1 text-left">日付</th><th class="p-1 text-left">内容</th><th class="p-1 text-right">数</th></tr></thead><tbody id="ammo-tbody"></tbody></table></div>
        </div>`;

    app.innerHTML = `<div class="space-y-2">${actions}${info}${histBtn}${ammoHTML}</div>`;

    document.getElementById('edit-gun').onclick = () => showGunEditForm(id);
    document.getElementById('del-gun').onclick = async () => { if(confirm('削除しますか？')) { await db.gun.delete(id); showGunListManagementPage(); }};
    document.getElementById('show-hist').onclick = () => { appState.gunLogFilters.gun_id = id; showGunPage(); };

    // 弾購入イベント
    document.getElementById('ammo-purchase-form').onsubmit = async (e) => {
        e.preventDefault();
        try {
            await db.ammo_purchases.add({ gun_id: id, purchase_date: document.getElementById('ammo-date').value, amount: parseInt(document.getElementById('ammo-amount').value) });
            document.getElementById('ammo-amount').value = '';
            renderAmmoInfo(id);
        } catch { alert('保存失敗'); }
    };
    renderAmmoInfo(id);
}

async function renderAmmoInfo(gunId) {
    const purchases = await db.ammo_purchases.where('gun_id').equals(gunId).toArray();
    const logs = await db.gun_log.where('gun_id').equals(gunId).and(l => l.ammo_count > 0).toArray();
    
    const pTotal = purchases.reduce((s, p) => s + p.amount, 0);
    const cTotal = logs.reduce((s, l) => s + (l.ammo_count || 0), 0);
    
    document.getElementById('ammo-total-p').textContent = `${pTotal} 発`;
    document.getElementById('ammo-total-c').textContent = `${cTotal} 発`;
    document.getElementById('ammo-rem').textContent = `${pTotal - cTotal} 発`;

    const combined = [
        ...purchases.map(p => ({ d: p.purchase_date, t: '購入', a: p.amount, id: p.id, isP: true })),
        ...logs.map(l => ({ d: l.use_date, t: `消費 (${l.purpose})`, a: -l.ammo_count, id: l.id, isP: false }))
    ].sort((a, b) => b.d.localeCompare(a.d));

    document.getElementById('ammo-tbody').innerHTML = combined.map(r => `
        <tr class="border-b">
            <td class="p-1">${formatDate(r.d)}</td><td class="p-1">${escapeHTML(r.t)}</td>
            <td class="p-1 text-right ${r.a > 0 ? 'text-green-600' : 'text-red-600'}">
                ${r.a > 0 ? '+' : ''}${r.a}
                ${r.isP ? `<button class="btn btn-danger btn-sm ml-2 del-ammo" data-id="${r.id}">&times;</button>` : ''}
            </td>
        </tr>
    `).join('');
    
    document.querySelectorAll('.del-ammo').forEach(b => b.onclick = async (e) => {
        if(confirm('削除しますか？')) { await db.ammo_purchases.delete(parseInt(e.target.dataset.id)); renderAmmoInfo(gunId); }
    });
}

async function showGunEditForm(id) {
    let gun = { name: '', type: '', caliber: '' };
    if (id) gun = await db.gun.get(id);
    
    updateHeader(id ? '銃の編集' : '銃の登録', true);
    backButton.onclick = () => id ? showGunDetailPage(id) : showGunListManagementPage();

    app.innerHTML = `
        <div class="card bg-white">
            <form id="gun-form" class="space-y-2">
                <div class="form-group"><label class="form-label">名前:</label><input id="g-name" class="form-input" value="${escapeHTML(gun.name)}" required></div>
                <div class="form-group"><label class="form-label">種類:</label><input id="g-type" class="form-input" value="${escapeHTML(gun.type)}"></div>
                <div class="form-group"><label class="form-label">口径:</label><input id="g-cal" class="form-input" value="${escapeHTML(gun.caliber)}"></div>
                <button class="btn btn-primary w-full py-3">保存</button>
            </form>
        </div>
    `;
    document.getElementById('gun-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = { name: document.getElementById('g-name').value, type: document.getElementById('g-type').value, caliber: document.getElementById('g-cal').value };
        try {
            if(id) { await db.gun.update(id, data); showGunDetailPage(id); }
            else { const nid = await db.gun.add(data); showGunDetailPage(nid); }
        } catch { alert('保存失敗'); }
    };
}

async function showGunLogDetailPage(id) {
    const log = await db.gun_log.get(id);
    if (!log) return;
    const gun = await db.gun.get(log.gun_id);
    
    updateHeader('使用履歴詳細', true);
    backButton.onclick = () => showGunPage();

    const catchCount = await db.catch_records.where('gun_log_id').equals(id).count();
    
    // 画像
    let imgHTML = '';
    if(log.image_blob) {
        const u = URL.createObjectURL(log.image_blob); appState.activeBlobUrls.push(u);
        imgHTML = `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">写真</h2><div class="photo-preview cursor-zoom-in"><img src="${u}" onclick="showImageModal(this.src)"></div></div>`;
    }

    // ★ マップボタン生成
    const mapBtn = generateMapButton(log.latitude, log.longitude);

    // 情報
    let info = `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">記録</h2><table class="w-full text-sm"><tbody>`;
    [['日付', formatDate(log.use_date)], ['銃', gun?gun.name:'-'], ['目的', log.purpose], ['場所', log.location], ['弾数', log.ammo_count+'発'], ['同行', log.companion]].forEach(r=> info+=`<tr class="border-b"><th class="w-1/3 text-left bg-gray-50 p-1">${r[0]}</th><td class="p-1">${escapeHTML(r[1])}</td></tr>`);
    info += `</tbody></table>${mapBtn}</div>`;

    app.innerHTML = `
        <div class="space-y-2">
            <div class="card bg-white"><div class="flex space-x-2"><button id="edit-log" class="btn btn-secondary flex-1">編集</button><button id="del-log" class="btn btn-danger flex-1">削除</button></div></div>
            ${imgHTML}${info}
            <div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">捕獲記録 (${catchCount})</h2><div class="space-y-2">
                <button id="view-catch" class="btn btn-secondary w-full text-left"><span class="w-6"><i class="fas fa-paw"></i></span> 捕獲記録を見る</button>
                <button id="add-catch" class="btn btn-primary w-full text-left"><span class="w-6"><i class="fas fa-plus"></i></span> 捕獲記録を追加</button>
            </div></div>
        </div>
    `;
    
    document.getElementById('edit-log').onclick = () => showGunLogEditForm(id);
    document.getElementById('del-log').onclick = () => deleteGunLog(id);
    document.getElementById('view-catch').onclick = () => { appState.currentCatchMethod='gun'; appState.currentCatchRelationId=id; navigateTo('catch', showCatchListPage, '銃の捕獲記録'); };
    document.getElementById('add-catch').onclick = () => showCatchEditForm(null, { trapId:null, gunLogId: id });
}

async function showGunLogEditForm(id) {
    let log = { use_date: new Date().toISOString().split('T')[0], gun_id: '', purpose: '狩猟', location: '', ammo_count: '', companion: '', latitude: '', longitude: '', memo: '', image_blob: null };
    if (id) log = await db.gun_log.get(id);
    const guns = await db.gun.toArray();

    updateHeader(id?'使用履歴 編集':'新規使用履歴', true);
    backButton.onclick = () => id ? showGunLogDetailPage(id) : showGunPage();

    let imgPreview = '';
    if(log.image_blob) {
        const u = URL.createObjectURL(log.image_blob); appState.activeBlobUrls.push(u);
        imgPreview = `<div class="form-group"><label class="form-label">現在の写真:</label><div class="photo-preview"><img src="${u}"><button type="button" id="rm-img" class="photo-preview-btn-delete">&times;</button></div></div>`;
    }

    app.innerHTML = `
        <div class="card bg-white">
            <form id="log-form" class="space-y-2">
                <div class="form-group"><label class="form-label">日付:</label><input type="date" id="l-date" class="form-input" value="${log.use_date}" required></div>
                <div class="form-group"><label class="form-label">銃:</label><select id="l-gun" class="form-select" required><option value="">選択</option>${guns.map(g=>`<option value="${g.id}" ${g.id==log.gun_id?'selected':''}>${g.name}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">目的:</label><select id="l-purpose" class="form-select">${['狩猟','射撃','有害駆除','その他'].map(p=>`<option value="${p}" ${p==log.purpose?'selected':''}>${p}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">消費弾数:</label><input type="number" id="l-ammo" class="form-input" value="${log.ammo_count}"></div>
                <div class="form-group"><label class="form-label">場所:</label><input id="l-loc" class="form-input" value="${escapeHTML(log.location)}"></div>
                <div class="form-group"><label class="form-label">同行者:</label><input id="l-comp" class="form-input" value="${escapeHTML(log.companion)}"></div>
                <div class="form-group"><span class="form-label">位置</span><div class="grid grid-cols-2 gap-2"><input type="number" step="any" id="l-lat" class="form-input" value="${escapeHTML(log.latitude)}" placeholder="緯度"><input type="number" step="any" id="l-lon" class="form-input" value="${escapeHTML(log.longitude)}" placeholder="経度"></div><button type="button" id="gps-btn" class="btn btn-secondary w-full mt-2">GPS取得</button></div>
                ${imgPreview}
                <div class="form-group"><label class="form-label">写真:</label><input type="file" id="l-img" class="form-input" accept="image/*"><div id="preview" class="mt-2"></div></div>
                <div class="form-group"><label class="form-label">メモ:</label><textarea id="l-memo" class="form-input">${escapeHTML(log.memo)}</textarea></div>
                <button class="btn btn-primary w-full py-3">保存</button>
            </form>
        </div>
    `;

    document.getElementById('gps-btn').onclick = async () => { try{ const l = await getCurrentLocation(); document.getElementById('l-lat').value=l.latitude; document.getElementById('l-lon').value=l.longitude; }catch(e){alert(e.message);} };
    if(document.getElementById('rm-img')) document.getElementById('rm-img').onclick = function(){ this.closest('.form-group').remove(); log.image_blob = null; };
    
    let resizedBlob = null;
    document.getElementById('l-img').onchange = async (e) => {
        if(!e.target.files[0]) return;
        resizedBlob = await resizeImage(e.target.files[0]);
        const u = URL.createObjectURL(resizedBlob); appState.activeBlobUrls.push(u);
        document.getElementById('preview').innerHTML = `<div class="photo-preview"><img src="${u}"></div>`;
    };

    document.getElementById('log-form').onsubmit = async (e) => {
        e.preventDefault();
        const d = {
            use_date: document.getElementById('l-date').value,
            gun_id: parseInt(document.getElementById('l-gun').value),
            purpose: document.getElementById('l-purpose').value,
            ammo_count: parseInt(document.getElementById('l-ammo').value)||0,
            location: document.getElementById('l-loc').value,
            companion: document.getElementById('l-comp').value,
            latitude: document.getElementById('l-lat').value,
            longitude: document.getElementById('l-lon').value,
            memo: document.getElementById('l-memo').value,
            image_blob: log.image_blob
        };
        if(resizedBlob) d.image_blob = resizedBlob;
        
        if(id) { await db.gun_log.update(id, d); showGunLogDetailPage(id); }
        else { const nid = await db.gun_log.add(d); showGunLogDetailPage(nid); }
    };
}

async function deleteGunLog(id) {
    if(confirm('削除しますか？\n捕獲記録も削除されます。')) {
        await db.transaction('rw', db.gun_log, db.catch_records, async()=>{
            await db.catch_records.where('gun_log_id').equals(id).delete();
            await db.gun_log.delete(id);
        });
        showGunPage();
    }
}


// ----------------------------------------------------------------------------
// 5. 捕獲記録機能 (元 catch.js)
// ----------------------------------------------------------------------------

function showCatchPage() {
    appState.currentCatchMethod = 'all';
    appState.currentCatchRelationId = null;
    showCatchListPage();
}

async function showCatchListPage() {
    const filters = appState.catchFilters;
    if (appState.currentCatchMethod === 'all') {
        Object.assign(filters, { method: 'all', species: '', gender: 'all', age: 'all' });
    }
    
    let filterHTML = '';
    if (appState.currentCatchMethod === 'all') {
        filterHTML = `
            <div class="card bg-white mb-2">
                <div class="grid grid-cols-2 gap-2">
                    <div class="form-group mb-0"><label class="form-label">種名:</label><input id="c-spec" class="form-input" list="spec-list" value="${filters.species}"><datalist id="spec-list"></datalist></div>
                    <div class="form-group mb-0"><label class="form-label">方法:</label><select id="c-meth" class="form-select"><option value="all">全て</option><option value="trap">罠</option><option value="gun">銃</option></select></div>
                </div>
            </div>`;
    }

    app.innerHTML = `
        <div class="space-y-2">
            ${filterHTML}
            <div id="catch-list" class="space-y-1"><p class="text-center text-gray-500 py-4">読み込み中...</p></div>
        </div>
    `;
    
    let title = '捕獲記録';
    if(appState.currentCatchMethod === 'trap') title = '罠の捕獲記録';
    if(appState.currentCatchMethod === 'gun') title = '銃の捕獲記録';
    updateHeader(title, appState.currentCatchMethod !== 'all');
    if (appState.currentCatchMethod !== 'all') {
        backButton.onclick = () => appState.currentCatchMethod === 'trap' ? showTrapDetailPage(appState.currentCatchRelationId) : showGunLogDetailPage(appState.currentCatchRelationId);
    }

    if (appState.currentCatchMethod === 'all') {
        loadSpeciesDataList();
        document.getElementById('c-spec').onchange = (e) => { filters.species = e.target.value; renderCatchList(); };
        document.getElementById('c-meth').onchange = (e) => { filters.method = e.target.value; renderCatchList(); };
    }
    renderCatchList();
}

async function loadSpeciesDataList() {
    const animals = await db.game_animal_list.where('is_game_animal').equals('〇').toArray();
    const names = [...new Set(animals.map(a=>a.species_name))];
    document.getElementById('spec-list').innerHTML = names.map(n=>`<option value="${n}">`).join('');
}

async function renderCatchList() {
    const listEl = document.getElementById('catch-list');
    let records = await db.catch_records.orderBy('catch_date').reverse().toArray();
    
    // フィルタリング
    if (appState.currentCatchMethod === 'trap') records = records.filter(r => r.trap_id === appState.currentCatchRelationId);
    else if (appState.currentCatchMethod === 'gun') records = records.filter(r => r.gun_log_id === appState.currentCatchRelationId);
    else {
        const f = appState.catchFilters;
        if(f.method === 'trap') records = records.filter(r => r.trap_id);
        if(f.method === 'gun') records = records.filter(r => r.gun_log_id);
        if(f.species) records = records.filter(r => r.species_name.includes(f.species));
    }

    if (records.length === 0) { listEl.innerHTML = '<p class="text-center text-gray-500">記録なし</p>'; return; }

    listEl.innerHTML = records.map(r => {
        const methodBadge = r.trap_id ? '<span class="badge bg-orange-100 text-orange-800">罠</span>' : '<span class="badge bg-blue-100 text-blue-800">銃</span>';
        return `
            <div class="trap-card flex items-center justify-between" data-id="${r.id}">
                <div>
                    <h3 class="text-lg font-semibold text-gray-800">${escapeHTML(r.species_name)}</h3>
                    <p class="text-sm text-gray-600">${formatDate(r.catch_date)} ${r.gender||''} ${r.age||''}</p>
                    <div class="mt-1">${methodBadge}</div>
                </div>
                <span>&gt;</span>
            </div>`;
    }).join('');
    listEl.querySelectorAll('.trap-card').forEach(d => d.onclick = () => showCatchDetailPage(parseInt(d.dataset.id)));
}

async function showCatchDetailPage(id) {
    const r = await db.catch_records.get(id);
    if (!r) return;
    updateHeader('捕獲詳細', true);
    backButton.onclick = () => showCatchListPage();

    let methodInfo = '';
    if (r.trap_id) {
        const t = await db.trap.get(r.trap_id);
        methodInfo = `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">捕獲方法: 罠</h2><button class="btn btn-secondary w-full text-left" onclick="showTrapDetailPage(${r.trap_id})">罠 No.${t?t.trap_number:'削除済'} を見る</button></div>`;
    } else if (r.gun_log_id) {
        const g = await db.gun_log.get(r.gun_log_id);
        methodInfo = `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">捕獲方法: 銃</h2><button class="btn btn-secondary w-full text-left" onclick="showGunLogDetailPage(${r.gun_log_id})">使用履歴 (${g?formatDate(g.use_date):'削除済'}) を見る</button></div>`;
    }

    let imgHTML = '';
    if(r.image_blob) {
        const u = URL.createObjectURL(r.image_blob); appState.activeBlobUrls.push(u);
        imgHTML = `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">写真</h2><div class="photo-preview cursor-zoom-in"><img src="${u}" onclick="showImageModal(this.src)"></div></div>`;
    }

    // ★ マップボタン生成
    const mapBtn = generateMapButton(r.latitude, r.longitude);

    let info = `<div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">データ</h2><table class="w-full text-sm"><tbody>`;
    [
        ['種名', r.species_name], 
        ['重量', r.weight ? r.weight + ' kg' : '-'], // ★重量表示追加
        ['日付', formatDate(r.catch_date)], 
        ['性別', r.gender], ['年齢', r.age], 
        ['緯度', r.latitude], ['経度', r.longitude], 
        ['メモ', r.memo]
    ].forEach(row => info += `<tr class="border-b"><th class="w-1/3 text-left bg-gray-50 p-1">${row[0]}</th><td class="p-1">${escapeHTML(row[1])}</td></tr>`);
    info += `</tbody></table>${mapBtn}</div>`;

    app.innerHTML = `<div class="space-y-2"><div class="card bg-white"><div class="flex space-x-2"><button id="edit-c" class="btn btn-secondary flex-1">編集</button><button id="del-c" class="btn btn-danger flex-1">削除</button></div></div>${imgHTML}${info}${methodInfo}</div>`;

    document.getElementById('edit-c').onclick = () => showCatchEditForm(id, {});
    document.getElementById('del-c').onclick = async () => { if(confirm('削除しますか？')) { await db.catch_records.delete(id); showCatchListPage(); }};
}

async function showCatchEditForm(id, { trapId, gunLogId }) {
    let r = { catch_date: new Date().toISOString().split('T')[0], species_name: '', weight: '', gender: '不明', age: '不明', latitude: '', longitude: '', memo: '', image_blob: null };
    if (id) r = await db.catch_records.get(id);
    
    // GPS継承
    if (!id && trapId) { const t = await db.trap.get(trapId); if(t) { r.latitude=t.latitude; r.longitude=t.longitude; } }
    if (!id && gunLogId) { const g = await db.gun_log.get(gunLogId); if(g) { r.latitude=g.latitude; r.longitude=g.longitude; r.catch_date=g.use_date; } }

    updateHeader(id?'捕獲記録 編集':'新規捕獲記録', true);
    backButton.onclick = () => id ? showCatchDetailPage(id) : (trapId ? showTrapDetailPage(trapId) : (gunLogId ? showGunLogDetailPage(gunLogId) : showCatchListPage()));

    let imgPreview = '';
    if(r.image_blob) {
        const u = URL.createObjectURL(r.image_blob); appState.activeBlobUrls.push(u);
        imgPreview = `<div class="form-group"><label class="form-label">現在の写真:</label><div class="photo-preview"><img src="${u}"><button type="button" id="rm-img" class="photo-preview-btn-delete">&times;</button></div></div>`;
    }

    app.innerHTML = `
        <div class="card bg-white">
            <form id="catch-form" class="space-y-2">
                <div class="form-group"><label class="form-label">日付:</label><input type="date" id="c-date" class="form-input" value="${r.catch_date}" required></div>
                <div class="form-group"><label class="form-label">種名:</label><input id="c-spec" class="form-input" list="spec-list" value="${escapeHTML(r.species_name)}" required><datalist id="spec-list"></datalist></div>
                
                <div class="form-group"><label class="form-label">個体重量 (kg):</label><input type="number" step="0.1" id="c-weight" class="form-input" value="${escapeHTML(r.weight)}" placeholder="例: 45.5"></div>

                <div class="grid grid-cols-2 gap-2">
                    <div class="form-group"><label class="form-label">性別:</label><select id="c-gen" class="form-select">${['不明','オス','メス'].map(v=>`<option ${v==r.gender?'selected':''}>${v}</option>`).join('')}</select></div>
                    <div class="form-group"><label class="form-label">年齢:</label><select id="c-age" class="form-select">${['不明','成獣','幼獣'].map(v=>`<option ${v==r.age?'selected':''}>${v}</option>`).join('')}</select></div>
                </div>
                <div class="form-group"><span class="form-label">位置</span><div class="grid grid-cols-2 gap-2"><input type="number" step="any" id="c-lat" class="form-input" value="${escapeHTML(r.latitude)}"><input type="number" step="any" id="c-lon" class="form-input" value="${escapeHTML(r.longitude)}"></div></div>
                ${imgPreview}
                <div class="form-group"><label class="form-label">写真:</label><input type="file" id="c-img" class="form-input" accept="image/*"><div id="preview" class="mt-2"></div></div>
                <div class="form-group"><label class="form-label">メモ:</label><textarea id="c-memo" class="form-input">${escapeHTML(r.memo)}</textarea></div>
                <button class="btn btn-primary w-full py-3">保存</button>
            </form>
        </div>
    `;
    loadSpeciesDataList();
    if(document.getElementById('rm-img')) document.getElementById('rm-img').onclick = function(){ this.closest('.form-group').remove(); r.image_blob = null; };
    
    let resizedBlob = null;
    document.getElementById('c-img').onchange = async (e) => {
        if(!e.target.files[0]) return;
        resizedBlob = await resizeImage(e.target.files[0]);
        const u = URL.createObjectURL(resizedBlob); appState.activeBlobUrls.push(u);
        document.getElementById('preview').innerHTML = `<div class="photo-preview"><img src="${u}"></div>`;
    };

    document.getElementById('catch-form').onsubmit = async (e) => {
        e.preventDefault();
        const d = {
            catch_date: document.getElementById('c-date').value,
            species_name: document.getElementById('c-spec').value,
            weight: document.getElementById('c-weight').value, // ★保存
            gender: document.getElementById('c-gen').value,
            age: document.getElementById('c-age').value,
            latitude: document.getElementById('c-lat').value,
            longitude: document.getElementById('c-lon').value,
            memo: document.getElementById('c-memo').value,
            image_blob: r.image_blob,
            trap_id: id ? r.trap_id : trapId,
            gun_log_id: id ? r.gun_log_id : gunLogId
        };
        if(resizedBlob) d.image_blob = resizedBlob;
        
        if(id) { await db.catch_records.update(id, d); showCatchDetailPage(id); }
        else { const nid = await db.catch_records.add(d); showCatchDetailPage(nid); }
    };
}


// ----------------------------------------------------------------------------
// 6. チェックリスト機能 (元 checklist.js)
// ----------------------------------------------------------------------------

function showChecklistPage() { navigateTo('checklist', renderChecklistSets, 'チェックリスト一覧'); }

async function renderChecklistSets() {
    updateHeader('チェックリスト一覧', false);
    app.innerHTML = `
        <div class="space-y-2">
            <div class="card bg-white"><form id="add-set-form" class="flex gap-2"><input id="new-set-name" class="form-input" placeholder="例: 単独猟" required><button class="btn btn-primary">作成</button></form></div>
            <div id="set-list" class="space-y-1"></div>
        </div>
    `;
    
    const sets = await db.checklist_sets.toArray();
    document.getElementById('set-list').innerHTML = sets.map(s => `
        <div class="trap-card flex justify-between items-center" data-id="${s.id}">
            <h3 class="text-lg font-semibold">${escapeHTML(s.name)}</h3>
            <div class="flex items-center gap-2"><button class="btn btn-danger btn-sm del-set" data-id="${s.id}">削除</button><span>&gt;</span></div>
        </div>
    `).join('');

    document.getElementById('set-list').querySelectorAll('.trap-card').forEach(d => {
        if(d.tagName === 'BUTTON') return; // 削除ボタン回避
        d.onclick = (e) => { if(!e.target.classList.contains('del-set')) showChecklistDetail(parseInt(d.dataset.id)); };
    });
    document.querySelectorAll('.del-set').forEach(b => b.onclick = async (e) => {
        if(confirm('削除しますか？')) {
            const id = parseInt(e.target.dataset.id);
            await db.checklist_items.where('list_id').equals(id).delete();
            await db.checklist_sets.delete(id);
            renderChecklistSets();
        }
    });

    document.getElementById('add-set-form').onsubmit = async (e) => {
        e.preventDefault();
        try { await db.checklist_sets.add({name: document.getElementById('new-set-name').value}); renderChecklistSets(); } catch { alert('作成失敗'); }
    };
}

async function showChecklistDetail(listId) {
    const set = await db.checklist_sets.get(listId);
    if(!set) return;
    updateHeader(set.name, true);
    backButton.onclick = () => renderChecklistSets();

    app.innerHTML = `
        <div class="space-y-2">
            <div class="sub-tab-container">
                <button id="mode-check" class="sub-tab-button sub-tab-active">チェック</button>
                <button id="mode-edit" class="sub-tab-button sub-tab-inactive">項目管理</button>
            </div>
            <div id="check-content"></div>
        </div>
    `;
    
    const renderCheck = async () => {
        const items = await db.checklist_items.where('list_id').equals(listId).toArray();
        const html = `
            <div class="card bg-white mb-2"><button id="reset-check" class="btn btn-secondary w-full">チェックをリセット</button></div>
            <div class="space-y-1">
                ${items.map(i => `
                    <div class="card bg-white flex items-center p-2 cursor-pointer item-row" data-id="${i.id}">
                        <div class="w-6 h-6 rounded border border-gray-400 flex items-center justify-center mr-3 ${i.is_checked ? 'bg-blue-600 border-blue-600' : 'bg-white'}">
                            ${i.is_checked ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
                        </div>
                        <span class="${i.is_checked ? 'text-gray-400 line-through' : 'text-gray-800'} checklist-item-text">${escapeHTML(i.name)}</span>
                    </div>
                `).join('')}
            </div>
        `;
        document.getElementById('check-content').innerHTML = html;
        document.getElementById('reset-check').onclick = async () => {
            await db.checklist_items.where('list_id').equals(listId).modify({is_checked: false});
            renderCheck();
        };
        document.querySelectorAll('.item-row').forEach(r => r.onclick = async () => {
            const item = await db.checklist_items.get(parseInt(r.dataset.id));
            await db.checklist_items.update(item.id, {is_checked: !item.is_checked});
            renderCheck();
        });
    };

    const renderEdit = async () => {
        const items = await db.checklist_items.where('list_id').equals(listId).toArray();
        const html = `
            <div class="card bg-white mb-2"><form id="add-item-form" class="flex gap-2"><input id="new-item-name" class="form-input" placeholder="項目名" required><button class="btn btn-primary">追加</button></form></div>
            <div class="space-y-1">
                ${items.map(i => `<div class="card bg-white flex justify-between p-2"><span class="checklist-item-text">${escapeHTML(i.name)}</span><button class="btn btn-danger btn-sm del-item" data-id="${i.id}">削除</button></div>`).join('')}
            </div>
        `;
        document.getElementById('check-content').innerHTML = html;
        document.getElementById('add-item-form').onsubmit = async (e) => {
            e.preventDefault();
            try { await db.checklist_items.add({list_id: listId, name: document.getElementById('new-item-name').value, is_checked: false}); renderEdit(); } catch { alert('追加失敗'); }
        };
        document.querySelectorAll('.del-item').forEach(b => b.onclick = async (e) => {
            if(confirm('削除しますか？')) { await db.checklist_items.delete(parseInt(e.target.dataset.id)); renderEdit(); }
        });
    };

    renderCheck(); // 初期表示
    document.getElementById('mode-check').onclick = () => { 
        document.getElementById('mode-check').className = "sub-tab-button sub-tab-active";
        document.getElementById('mode-edit').className = "sub-tab-button sub-tab-inactive";
        renderCheck();
    };
    document.getElementById('mode-edit').onclick = () => { 
        document.getElementById('mode-edit').className = "sub-tab-button sub-tab-active";
        document.getElementById('mode-check').className = "sub-tab-button sub-tab-inactive";
        renderEdit();
    };
}


// ----------------------------------------------------------------------------
// 7. 情報 (図鑑・プロフィール) (元 info.js)
// ----------------------------------------------------------------------------

function showInfoPage() { navigateTo('info', renderInfoTopPage, '情報'); }

function renderInfoTopPage() {
    updateHeader('情報', false);
    app.innerHTML = `
        <div class="space-y-2">
            <div class="card bg-white hover:bg-gray-50 cursor-pointer p-4 flex items-center" onclick="showGameAnimalListPage()">
                <div class="bg-green-100 p-2 rounded-full mr-4"><i class="fas fa-book text-green-600 text-2xl"></i></div>
                <div><h2 class="text-lg font-bold">狩猟鳥獣図鑑</h2><p class="text-sm text-gray-500">生態・被害・特徴</p></div>
                <i class="fas fa-chevron-right ml-auto text-gray-400"></i>
            </div>
            <div class="card bg-white hover:bg-gray-50 cursor-pointer p-4 flex items-center" onclick="showHunterProfilePage()">
                <div class="bg-blue-100 p-2 rounded-full mr-4"><i class="fas fa-id-card text-blue-600 text-2xl"></i></div>
                <div><h2 class="text-lg font-bold">捕獲者情報</h2><p class="text-sm text-gray-500">免許・許可証管理</p></div>
                <i class="fas fa-chevron-right ml-auto text-gray-400"></i>
            </div>
        </div>
    `;
}

// 図鑑一覧
async function showGameAnimalListPage() {
    if (!appState.infoSort) appState.infoSort = 'default';
    if (!appState.infoFilterAttribute) appState.infoFilterAttribute = 'all';
    updateHeader('狩猟鳥獣図鑑', true);
    backButton.onclick = () => showInfoPage();

    app.innerHTML = `
        <div class="space-y-2">
            <div class="card bg-white">
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <div class="form-group mb-0"><label class="form-label">並び替え:</label><select id="i-sort" class="form-select"><option value="default">標準</option><option value="name">あいうえお順</option></select></div>
                    <div class="form-group mb-0"><label class="form-label">属性:</label><select id="i-filter" class="form-select"><option value="all">すべて</option><option value="game_animal">狩猟鳥獣</option><option value="invasive">外来種</option><option value="mammal">哺乳類</option><option value="bird">鳥類</option><option value="gun">銃猟</option><option value="trap">罠猟</option><option value="net">網猟</option></select></div>
                </div>
                <div id="ga-list" class="space-y-1"><p class="text-center py-4">読み込み中...</p></div>
            </div>
        </div>`;
    
    document.getElementById('i-sort').value = appState.infoSort;
    document.getElementById('i-filter').value = appState.infoFilterAttribute;
    document.getElementById('i-sort').onchange = (e) => { appState.infoSort = e.target.value; renderGAList(); };
    document.getElementById('i-filter').onchange = (e) => { appState.infoFilterAttribute = e.target.value; renderGAList(); };
    renderGAList();
}

async function renderGAList() {
    const listEl = document.getElementById('ga-list');
    let animals = await db.game_animal_list.toArray();
    const attr = appState.infoFilterAttribute;
    
    if (attr !== 'all') {
        animals = animals.filter(a => {
            if (attr === 'game_animal') return a.is_game_animal === '〇';
            if (attr === 'invasive') return a.notes && a.notes.includes('外来');
            if (attr === 'mammal') return a.category === '哺乳類';
            if (attr === 'bird') return a.category === '鳥類';
            if (attr === 'gun') return ['○', '〇', '◎'].includes(a.method_gun);
            if (attr === 'trap') return ['○', '〇', '◎'].includes(a.method_trap);
            if (attr === 'net') return ['○', '〇', '◎'].includes(a.method_net);
            return true;
        });
    }
    if (appState.infoSort === 'name') animals.sort((a, b) => a.species_name.localeCompare(b.species_name, 'ja'));
    else animals.sort((a, b) => a.id - b.id);

    if(animals.length === 0) { listEl.innerHTML = '<p class="text-center">該当なし</p>'; return; }

    listEl.innerHTML = animals.map(a => {
        let badges = '';
        if (a.category === '哺乳類') badges += `<span class="badge bg-amber-100 text-amber-800">哺乳類</span>`;
        if (a.category === '鳥類') badges += `<span class="badge bg-sky-100 text-sky-800">鳥類</span>`;
        if (a.is_game_animal === '〇') badges += `<span class="badge bg-green-100 text-green-800">狩猟鳥獣</span>`;
        if (a.notes && a.notes.includes('外来')) badges += `<span class="badge bg-red-100 text-red-800">外来種</span>`;
        
        const img = a.image_1 ? `<img src="./image/${escapeHTML(a.image_1)}" class="animal-thumb">` : `<div class="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300"><i class="fas fa-paw"></i></div>`;
        return `
            <div class="animal-card bg-white" data-id="${a.id}">
                <div class="animal-thumb-container">${img}</div>
                <div class="animal-info"><div class="animal-header"><h3 class="animal-name">${escapeHTML(a.species_name)}</h3></div><div class="animal-badges">${badges}</div></div>
                <div class="animal-arrow"><span>&gt;</span></div>
            </div>`;
    }).join('');
    listEl.querySelectorAll('.animal-card').forEach(d => d.onclick = () => showGameAnimalDetail(parseInt(d.dataset.id)));
}

async function showGameAnimalDetail(id) {
    const animal = await db.game_animal_list.get(id);
    if (!animal) return;
    updateHeader(animal.species_name, true);
    backButton.onclick = () => showGameAnimalListPage();

    let imgs = '';
    if(animal.image_1) imgs += `<img src="./image/${escapeHTML(animal.image_1)}" class="w-full h-auto rounded mb-2 border">`;
    if(animal.image_2) imgs += `<img src="./image/${escapeHTML(animal.image_2)}" class="w-full h-auto rounded mb-2 border">`;
    if(!imgs) imgs = '<p class="text-gray-400 text-sm">画像なし</p>';

    let methods = [];
    if(animal.is_game_animal === '〇') {
        const s = ['○', '〇', '◎'];
        if(s.includes(animal.method_gun)) methods.push('銃');
        if(s.includes(animal.method_trap)) methods.push('罠');
        if(s.includes(animal.method_net)) methods.push('網');
    }
    const statusVal = methods.length > 0 ? methods.join('・') : (animal.is_game_animal === '〇' ? '狩猟鳥獣' : '非狩猟鳥獣');
    const genderVal = (animal.gender && animal.gender.includes('オスのみ')) ? animal.gender : null;
    let prohibitedVal = animal.prohibited_area;
    if (!prohibitedVal || prohibitedVal === 'nan' || prohibitedVal === '-') prohibitedVal = null;

    let rows = '';
    [['狩猟', statusVal], ['性別制限', genderVal], ['捕獲数制限', animal.count], ['狩猟禁止区域', prohibitedVal], ['生息地', animal.habitat], ['備考', animal.notes]].forEach(r => {
        if(r[1] && r[1]!=='nan') rows += `<tr class="border-b"><th class="w-1/3 text-left bg-gray-50 p-1">${r[0]}</th><td class="p-1">${escapeHTML(r[1])}</td></tr>`;
    });

    app.innerHTML = `
        <div class="space-y-2">
            <div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">写真</h2>${imgs}</div>
            <div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">生態</h2><p class="text-sm leading-relaxed">${animal.ecology ? escapeHTML(animal.ecology).replace(/\n/g, '<br>') : '情報なし'}</p></div>
            <div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-2">被害・特徴</h2><p class="text-sm leading-relaxed">${animal.damage ? escapeHTML(animal.damage).replace(/\n/g, '<br>') : '情報なし'}</p></div>
            <div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-0">データ</h2><table class="w-full text-sm"><tbody>${rows}</tbody></table></div>
        </div>
    `;
}

// 捕獲者情報
async function showHunterProfilePage() {
    updateHeader('捕獲者情報', true);
    backButton.onclick = () => showInfoPage();
    app.innerHTML = `
        <div class="card bg-white"><h2 class="text-lg font-semibold border-b pb-1 mb-4">登録情報</h2><div id="h-prof-con"><p>読み込み中...</p></div></div>
    `;
    const container = document.getElementById('h-prof-con');
    const profile = await db.hunter_profile.get('main') || {};
    const images = await db.profile_images.toArray();
    
    const fields = [
        {k:'name', l:'氏名'}, {k:'gun_license_renewal', l:'銃所持許可 期限'},
        {k:'hunting_license_renewal', l:'狩猟免状 期限'}, {k:'registration_renewal', l:'狩猟者登録 期限'},
        {k:'explosives_permit_renewal', l:'火薬類譲受許可 期限'}
    ];

    let html = `<div class="text-right mb-2"><button id="edit-prof" class="text-blue-600 text-sm hover:underline"><i class="fas fa-edit"></i> 編集</button></div>`;
    
    fields.forEach(f => {
        const val = profile[f.k] || '未設定';
        const imgs = images.filter(i => i.type === f.k);
        let imgHtml = '';
        if(imgs.length>0) {
            imgHtml = `<div class="flex gap-2 mt-2 overflow-x-auto pb-2">`;
            imgs.forEach(i => { const u = URL.createObjectURL(i.image_blob); appState.activeBlobUrls.push(u); imgHtml+=`<img src="${u}" class="h-16 w-16 object-cover rounded border cursor-zoom-in" onclick="showImageModal(this.src)">`; });
            imgHtml += `</div>`;
        }
        html += `<div class="mb-4 border-b pb-3 last:border-b-0"><div class="flex justify-between items-center"><span class="text-sm font-medium text-gray-500">${f.l}</span><span class="text-base font-bold">${escapeHTML(val)}</span></div>${imgHtml}</div>`;
    });
    container.innerHTML = html;
    document.getElementById('edit-prof').onclick = () => showHunterProfileEdit();
}

async function showHunterProfileEdit() {
    const profile = await db.hunter_profile.get('main') || {};
    const images = await db.profile_images.toArray();
    updateHeader('捕獲者情報の編集', true);
    backButton.onclick = () => showHunterProfilePage();

    const fields = [
        {k:'name', l:'氏名'}, {k:'gun_license_renewal', l:'銃所持許可 期限'},
        {k:'hunting_license_renewal', l:'狩猟免状 期限'}, {k:'registration_renewal', l:'狩猟者登録 期限'},
        {k:'explosives_permit_renewal', l:'火薬類譲受許可 期限'}
    ];

    app.innerHTML = `
        <div class="card bg-white"><h3 class="text-md font-bold mb-4 border-b pb-2">項目別編集</h3><div id="edit-fields" class="space-y-6"></div></div>
        <input type="file" id="h-img-in" accept="image/*" style="display: none;">
    `;
    const container = document.getElementById('edit-fields');
    const fileInput = document.getElementById('h-img-in');
    let targetKey = null;

    fields.forEach(f => {
        const div = document.createElement('div');
        div.className = 'border-b pb-4 last:border-b-0';
        const imgs = images.filter(i => i.type === f.k);
        let imgHtml = '';
        imgs.forEach(i => {
            const u = URL.createObjectURL(i.image_blob); appState.activeBlobUrls.push(u);
            imgHtml += `<div class="relative inline-block mr-2 mb-2"><img src="${u}" class="h-16 w-16 object-cover rounded border"><button class="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs del-p-img" data-id="${i.id}">&times;</button></div>`;
        });

        div.innerHTML = `
            <label class="form-label">${f.l}</label>
            <div class="flex space-x-2 mb-2"><input type="text" id="in-${f.k}" class="form-input flex-1" value="${escapeHTML(profile[f.k]||'')}"><button class="btn btn-primary w-20 save-p" data-key="${f.k}">保存</button></div>
            <div class="mt-2"><div class="flex flex-wrap items-center">${imgHtml}<button class="btn btn-secondary btn-sm h-16 w-16 flex flex-col items-center justify-center text-xs text-gray-500 border-dashed border-2 add-p-img" data-key="${f.k}"><i class="fas fa-camera text-lg mb-1"></i>追加</button></div></div>
        `;
        container.appendChild(div);
    });

    container.querySelectorAll('.save-p').forEach(b => b.onclick = async (e) => {
        const k = e.target.dataset.key;
        const v = document.getElementById(`in-${k}`).value;
        const orgTxt = e.target.textContent;
        try {
            const p = await db.hunter_profile.get('main') || {key:'main'};
            p[k] = v;
            await db.hunter_profile.put(p);
            e.target.textContent = 'OK'; e.target.classList.replace('btn-primary','btn-success');
            setTimeout(()=>{e.target.textContent=orgTxt; e.target.classList.replace('btn-success','btn-primary');},1500);
        } catch{alert('保存失敗');}
    });

    container.querySelectorAll('.add-p-img').forEach(b => b.onclick = (e) => { targetKey = e.currentTarget.dataset.key; fileInput.click(); });
    container.querySelectorAll('.del-p-img').forEach(b => b.onclick = async (e) => {
        if(confirm('削除しますか？')){ await db.profile_images.delete(parseInt(e.target.dataset.id)); showHunterProfileEdit(); }
    });

    fileInput.onchange = async (e) => {
        if(!e.target.files[0] || !targetKey) return;
        try {
            const blob = await resizeImage(e.target.files[0], 800);
            await db.profile_images.add({ type: targetKey, image_blob: blob });
            showHunterProfileEdit();
        } catch { alert('画像保存失敗'); }
        fileInput.value = '';
    };
}


// ----------------------------------------------------------------------------
// 8. 設定機能 (元 settings.js)
// ----------------------------------------------------------------------------

function showSettingsPage() { navigateTo('settings', renderSettingsMenu, '設定'); }

async function renderSettingsMenu() {
    let curTheme='light', curSize='medium';
    try {
        const t = await db.settings.get('theme'); if(t) curTheme=t.value;
        const s = await db.settings.get('fontSize'); if(s) curSize=s.value;
    } catch {}

    const themeOpt = (v,l) => `<option value="${v}" ${curTheme===v?'selected':''}>${l}</option>`;
    const sizeOpt = (v,l) => `<option value="${v}" ${curSize===v?'selected':''}>${l}</option>`;

    // ヘルプ用HTML生成ヘルパー
    const helpItem = (icon, title, content) => `
        <details class="text-sm group">
            <summary class="font-bold cursor-pointer select-none py-2 text-blue-800 hover:text-blue-600 flex items-center">
                <span class="mr-2">${icon}</span> ${title}
            </summary>
            <div class="pb-3 pl-4 border-b border-gray-200 text-gray-700 leading-relaxed">
                <ul class="list-disc pl-4 space-y-1">
                    ${content}
                </ul>
            </div>
        </details>
    `;

    app.innerHTML = `
        <div class="space-y-2">
            <div class="card bg-white">
                <h2 class="text-lg font-semibold border-b pb-1 mb-2">使用方法・機能ガイド</h2>
                <div class="space-y-0 divide-y divide-gray-100">
                    ${helpItem('📱', '基本操作・オフライン', `
                        <li><b>オフライン対応:</b> 電波の届かない山奥でも全機能（記録・編集・閲覧）が使用可能です。</li>
                        <li><b>マップ連携:</b> 詳細画面のボタンでGoogleマップを開きます。<br><span class="text-xs text-gray-500">※山奥ではGoogleマップの「オフラインマップ」事前DLを推奨。</span></li>
                        <li><b>画像ズーム:</b> 写真をタップで拡大。2本指ピンチでズーム、ドラッグで移動できます。</li>
                    `)}
                    ${helpItem('⛓️', '罠の管理フロー', `
                        <li><b>設置:</b> 「新規設置」で場所・種類を登録。GPSボタンで位置を自動入力。</li>
                        <li><b>記録:</b> 設置中の罠一覧から対象を選び、「捕獲記録を追加」で獲物を記録します。罠と紐付きます。</li>
                        <li><b>撤去:</b> 撤去・空弾きの際は、詳細画面下の「罠の撤去」を実行してください。「過去の罠」へ移動します。</li>
                    `)}
                    ${helpItem('🔫', '銃・弾の管理', `
                        <li><b>銃の登録:</b> 「所持銃の管理」から手持ちの銃を登録します。</li>
                        <li><b>使用履歴:</b> 出猟や射撃の記録をつけます。「消費弾数」を入力すると残弾計算に反映されます。</li>
                        <li><b>弾の在庫:</b> 「所持銃の管理」＞(銃選択)＞「弾の管理」で弾の購入数を入力すると、現在の残弾数が自動計算されます。</li>
                    `)}
                    ${helpItem('🦌', '捕獲記録・分析', `
                        <li><b>記録項目:</b> 写真、種名、性別、年齢に加え、個体重量(kg)も記録可能です。</li>
                        <li><b>紐付け:</b> 罠タブや銃タブから記録を作成すると、使用した道具が自動的に記録に紐付きます。</li>
                        <li><b>CSV出力:</b> 下記「データ管理」から、全記録をExcel等で扱えるCSV形式で出力できます。</li>
                    `)}
                    ${helpItem('✅', 'チェックリスト', `
                        <li><b>モード切替:</b> タブで「チェック(実行用)」と「項目管理(編集用)」を切り替えます。</li>
                        <li><b>活用:</b> 「単独猟」「グループ猟」などシーン別のリストを作成し、出猟前の忘れ物防止に役立ててください。</li>
                    `)}
                    ${helpItem('📖', '情報・図鑑', `
                        <li><b>狩猟鳥獣図鑑:</b> 特徴・生態・被害対策を閲覧可能。検索や猟法別フィルターも備えています。</li>
                        <li><b>捕獲者情報:</b> 免許や許可証の期限メモ、写真登録が可能です。手元にない時の確認に便利です。</li>
                    `)}
                    ${helpItem('💾', 'バックアップ', `
                        <li><b>保存:</b> 「バックアップ」で全データ(写真含む)を1ファイルに保存します。定期的な保存を推奨します。</li>
                        <li><b>復元:</b> 機種変更時などは、保存したファイルを読み込むことでデータを完全に引き継げます。</li>
                    `)}
                </div>
            </div>

            <div class="card bg-white">
                <h2 class="text-lg font-semibold border-b pb-1 mb-2">表示設定</h2>
                <div class="form-group mb-2"><label class="form-label">背景色:</label><select id="st-theme" class="form-select">${themeOpt('light','ライト')}${themeOpt('sepia','セピア')}${themeOpt('lightgreen','グリーン')}${themeOpt('lightblue','ブルー')}</select></div>
                <div class="form-group"><label class="form-label">文字サイズ:</label><select id="st-size" class="form-select">${sizeOpt('xsmall','極小')}${sizeOpt('small','小')}${sizeOpt('medium','中')}${sizeOpt('large','大')}${sizeOpt('xlarge','特大')}</select></div>
            </div>

            <div class="card bg-white">
                <h2 class="text-lg font-semibold border-b pb-1 mb-2">データ管理</h2>
                <div class="grid grid-cols-2 gap-2 mb-4">
                    <button id="exp-btn" class="btn btn-primary mb-0">バックアップ(保存)</button>
                    <button id="imp-btn" class="btn btn-danger mb-0">復元(読込)</button>
                </div>
                <input type="file" id="imp-file" style="display:none">
                
                <h3 class="text-sm font-bold text-gray-500 mb-1">CSV出力</h3>
                <div class="grid grid-cols-2 gap-2 mb-2">
                    <button id="csv-gun" class="btn btn-secondary mb-0">銃履歴CSV</button>
                    <button id="csv-catch" class="btn btn-secondary mb-0">捕獲記録CSV</button>
                </div>
                
                <hr class="border-gray-300 my-2">
                <button id="upd-dic" class="btn btn-secondary w-full">図鑑データをCSVから更新</button>
                <p id="csv-st" class="text-xs text-center text-gray-500 h-4 mt-1"></p>
            </div>

            <div class="card bg-white border-orange-200">
                <h2 class="text-lg font-semibold border-b pb-1 mb-2 text-orange-700">システム</h2>
                <button id="sys-upd" class="btn btn-warning w-full font-bold">アプリを最新にリロード</button>
            </div>
        </div>
    `;

    // --- イベントリスナー (変更なし) ---
    document.getElementById('st-theme').onchange = async (e) => { await db.settings.put({key:'theme',value:e.target.value}); applyTheme(e.target.value); };
    document.getElementById('st-size').onchange = async (e) => { await db.settings.put({key:'fontSize',value:e.target.value}); applyFontSize(e.target.value); };
    
    document.getElementById('exp-btn').onclick = exportAllData;
    document.getElementById('imp-btn').onclick = () => document.getElementById('imp-file').click();
    document.getElementById('imp-file').onchange = (e) => { if(e.target.files.length>0) importAllData(e.target.files[0]); };
    
    document.getElementById('csv-gun').onclick = exportGunLogsAsCSV;
    document.getElementById('csv-catch').onclick = exportCatchesAsCSV;
    document.getElementById('upd-dic').onclick = async () => {
        if(confirm('図鑑データをサーバー(GitHub)から取得して更新しますか？')) {
            document.getElementById('csv-st').textContent = '通信中...';
            try { await populateGameAnimalListIfNeeded(true); document.getElementById('csv-st').textContent = '完了'; } catch { document.getElementById('csv-st').textContent = '失敗'; }
        }
    };
    
    document.getElementById('sys-upd').onclick = async () => {
        if(confirm('キャッシュを削除してリロードしますか？\n(表示がおかしい場合に有効です)')) {
            if('serviceWorker' in navigator) (await navigator.serviceWorker.getRegistrations()).forEach(r=>r.unregister());
            if('caches' in window) (await caches.keys()).forEach(k=>caches.delete(k));
            location.reload(true);
        }
    };
}

// データ処理
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
    if(!confirm('現在のデータは上書きされます。よろしいですか？')) return;
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

async function exportGunLogsAsCSV() {
    const logs = await db.gun_log.orderBy('use_date').toArray();
    if(!logs.length) return alert('なし');
    const guns = await db.gun.toArray(); const gMap = new Map(guns.map(g=>[g.id,g.name]));
    const headers = ['ID','使用日','銃','目的','弾数','同行者','場所','緯度','経度','メモ'];
    const csv = '\uFEFF' + headers.join(',') + '\r\n' + logs.map(l => [l.id, l.use_date, gMap.get(l.gun_id)||'', l.purpose, l.ammo_count, l.companion, l.location, l.latitude, l.longitude, l.memo].map(v=>`"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\r\n');
    downloadCSV(csv, 'gun_logs.csv');
}

async function exportCatchesAsCSV() {
    const recs = await db.catch_records.orderBy('catch_date').toArray();
    if(!recs.length) return alert('なし');
    const headers = ['ID','捕獲日','種名','性別','年齢','緯度','経度','メモ'];
    const csv = '\uFEFF' + headers.join(',') + '\r\n' + recs.map(r => [r.id, r.catch_date, r.species_name, r.gender, r.age, r.latitude, r.longitude, r.memo].map(v=>`"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\r\n');
    downloadCSV(csv, 'catch_records.csv');
}

function downloadCSV(csv, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function blobToBase64(b) { return new Promise((res,rej)=>{ if(!b){res(null);return;} const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(b); }); }
async function base64ToBlob(d) { if(!d)return null; return (await fetch(d)).blob(); }