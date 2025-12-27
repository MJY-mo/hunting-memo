// ============================================================================
// js/common.js - 共通設定、DB定義、ユーティリティ (修正版)
// ============================================================================

// ----------------------------------------------------------------------------
// 1. グローバル変数 & DOM要素参照
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

// アプリ全体の状態管理
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
    isEditing: false,
    isDetailView: false,
    onBackAction: null
};

// ----------------------------------------------------------------------------
// 2. データベース定義 (Dexie.js)
// ----------------------------------------------------------------------------
const db = new Dexie('HuntingAppDB');

// バージョン17 (purposeカラム追加対応)
db.version(17).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date, purpose, [is_open+trap_number], [is_open+setup_date], [is_open+close_date]',
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, weight, gender, age, memo, image_blob, latitude, longitude, [gender+catch_date], [age+catch_date], [trap_id+catch_date], [gun_log_id+catch_date], [gender+species_name], [age+species_name], [trap_id+species_name], [gun_log_id+species_name]',
    gun: '++id, &name, type, caliber',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude, ammo_count, companion, [gun_id+use_date], [purpose+use_date]',
    ammo_purchases: '++id, gun_id, purchase_date',
    game_animal_list: '++id, species_name, category, is_game_animal, ecology, damage, image_1, image_2, [category+species_name], [is_game_animal+species_name]',
    checklist_sets: '++id, &name',
    checklist_items: '++id, list_id, name, is_checked, &[list_id+name]',
    profile_images: '++id, type',
    settings: '&key',
    hunter_profile: '&key',
    additional_photos: '++id, parent_type, parent_id, [parent_type+parent_id]'
});

// ----------------------------------------------------------------------------
// 環境判定フラグ (Androidアプリ版のみ true)
// ----------------------------------------------------------------------------
function isNativeApp() {
    const ua = navigator.userAgent;
    return /Android/i.test(ua) && /wv/i.test(ua);
}

// ----------------------------------------------------------------------------
// 3. 共通ヘルパー関数
// ----------------------------------------------------------------------------

// トースト通知
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// GPS取得
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('GPS非対応'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => reject(new Error('GPS取得失敗')),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}

// ★修正箇所: HTMLエスケープ (正しい記述に修正)
function escapeHTML(str) {
    if (str == null) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 日付フォーマット
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

// CSVパース
function parseCSV(text) {
    const arr = [[]];
    let quote = false;
    let col = 0, c = 0;
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (; c < text.length; c++) {
        let cc = text[c], nc = text[c+1];
        arr[arr.length-1][col] = arr[arr.length-1][col] || '';
        if (cc === '"' && quote && nc === '"') { arr[arr.length-1][col] += cc; ++c; continue; }
        if (cc === '"') { quote = !quote; continue; }
        if (cc === ',' && !quote) { ++col; arr[arr.length-1][col] = arr[arr.length-1][col] || ''; continue; }
        if (cc === '\n' && !quote) { arr.push([]); col = 0; continue; }
        arr[arr.length-1][col] += cc;
    }
    return arr;
}

// 画像リサイズ (EXIF回転対応)
function resizeImage(file, maxSize = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                EXIF.getData(img, function() {
                    const orientation = EXIF.getTag(this, "Orientation");
                    let w = img.width, h = img.height;
                    
                    if (w > h) {
                        if (w > maxSize) { h = Math.round(h * (maxSize / w)); w = maxSize; }
                    } else {
                        if (h > maxSize) { w = Math.round(w * (maxSize / h)); h = maxSize; }
                    }

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

                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('変換失敗'));
                    }, 'image/jpeg', 0.8);
                });
            };
            img.onerror = () => reject(new Error('画像読込失敗'));
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ★修正箇所: Googleマップボタン生成 (記述ミスを修正)
function generateMapButton(lat, lon) {
    if (!lat || !lon) return '';
    // $マークが抜けていたのと、URL形式を修正しました
    const url = `https://www.google.com/maps?q=${lat},${lon}`;
    
    return `
        <a href="${url}" target="_blank" class="btn btn-secondary flex items-center justify-center gap-2 mt-2" style="text-decoration:none; color: #2563eb; font-weight:bold;">
            <i class="fas fa-map-marked-alt"></i> Googleマップで確認
        </a>
    `;
}

// 画像モーダル
function showImageModal(blobUrl) {
    closeImageModal();
    const ol = document.createElement('div');
    ol.id = 'image-modal-overlay';
    ol.className = 'image-modal-overlay';
    const closeBtn = document.createElement('div');
    closeBtn.className = 'modal-close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = (e) => { e.stopPropagation(); closeImageModal(); };
    ol.appendChild(closeBtn);
    
    const ct = document.createElement('div');
    ct.className = 'image-modal-content';
    const img = document.createElement('img');
    img.src = blobUrl;
    ct.appendChild(img);
    ol.appendChild(ct);
    document.body.appendChild(ol);

    let scale = 1, pointX = 0, pointY = 0, startX = 0, startY = 0, initialDistance = 0, isDragging = false;
    const updateTransform = () => { img.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`; };

    ol.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            initialDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        } else if (e.touches.length === 1 && scale > 1) {
            isDragging = true; startX = e.touches[0].pageX - pointX; startY = e.touches[0].pageY - pointY;
        }
    }, { passive: false });

    ol.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 2 && initialDistance > 0) {
            const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            scale = Math.min(Math.max(1, scale + (dist - initialDistance) * 0.005), 5);
            if (scale === 1) { pointX = 0; pointY = 0; }
            updateTransform();
            initialDistance = dist;
        } else if (e.touches.length === 1 && isDragging && scale > 1) {
            pointX = e.touches[0].pageX - startX; pointY = e.touches[0].pageY - startY;
            updateTransform();
        }
    }, { passive: false });

    ol.addEventListener('touchend', (e) => {
        isDragging = false;
        if (e.touches.length < 2) initialDistance = 0;
        if (scale <= 1) { scale = 1; pointX = 0; pointY = 0; updateTransform(); }
    });
    ct.onclick = (e) => { if (scale <= 1.1) closeImageModal(); };
}

function closeImageModal() {
    const ol = document.getElementById('image-modal-overlay');
    if (ol) ol.remove();
}

// ----------------------------------------------------------------------------
// 4. データ管理関数 (KML・CSV対応)
// ----------------------------------------------------------------------------

async function exportAllData() {
    const data = {};
    const tables = [
        'hunter_profile', 'settings', 'trap', 'trap_type', 'gun', 'gun_log', 
        'catch_records', 'checklist_sets', 'checklist_items', 'game_animal_list', 
        'ammo_purchases', 'profile_images', 'additional_photos'
    ];

    for (const t of tables) {
        data[t] = await db[t].toArray();
    }

    const blobTables = ['trap', 'catch_records', 'gun_log', 'profile_images', 'additional_photos'];
    for (const t of blobTables) {
        if(data[t]) {
            data[t] = await Promise.all(data[t].map(async i => ({
                ...i, 
                image_blob: await blobToBase64(i.image_blob)
            })));
        }
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
                db.hunter_profile.bulkAdd(tabs.hunter_profile||[]), 
                db.settings.bulkAdd(tabs.settings||[]),
                db.trap_type.bulkAdd(tabs.trap_type||[]), 
                db.gun.bulkAdd(tabs.gun||[]),
                db.ammo_purchases.bulkAdd(tabs.ammo_purchases||[]), 
                db.game_animal_list.bulkAdd(tabs.game_animal_list||[]),
                db.checklist_sets.bulkAdd(tabs.checklist_sets||[]), 
                db.checklist_items.bulkAdd(tabs.checklist_items||[]),
                db.trap.bulkAdd(await conv('trap')), 
                db.catch_records.bulkAdd(await conv('catch_records')),
                db.gun_log.bulkAdd(await conv('gun_log')), 
                db.profile_images.bulkAdd(await conv('profile_images')),
                db.additional_photos.bulkAdd(await conv('additional_photos'))
            ]);
        });
        showToast('データの復元が完了しました', 'success');
        setTimeout(() => location.reload(), 1500);
    } catch { showToast('データの読み込みに失敗しました', 'error'); }
}
async function exportGunLogsAsCSV() {
    const guns = await db.gun.toArray();
    const logs = await db.gun_log.toArray();
    const purchases = await db.ammo_purchases.toArray();
    const catches = await db.catch_records.toArray();

    if (logs.length === 0 && purchases.length === 0) return showToast('記録がありません', 'error');

    let allRows = [];

    for (const gun of guns) {
        const gunLogs = logs.filter(l => l.gun_id === gun.id);
        const gunPurchases = purchases.filter(p => p.gun_id === gun.id);
        let history = [];

        gunPurchases.forEach(p => {
            history.push({
                date: p.purchase_date,
                buy: p.amount,
                use: 0,
                location: '(購入)', 
                gunName: gun.name,
                purpose: '購入',
                companion_game: '-'
            });
        });

        gunLogs.forEach(l => {
            const relatedCatches = catches.filter(c => c.gun_log_id === l.id);
            const gameNames = relatedCatches.map(c => c.species_name).join('・');
            let details = l.companion || '';
            if (gameNames) details += (details ? ' / ' : '') + '捕獲:' + gameNames;
            if (!details) details = '-';

            history.push({
                date: l.use_date,
                buy: 0,
                use: l.ammo_count || 0,
                location: l.location || '',
                gunName: gun.name,
                purpose: l.purpose || '',
                companion_game: details
            });
        });

        history.sort((a, b) => a.date.localeCompare(b.date));

        let balance = 0;
        history.forEach(row => {
            balance = balance + row.buy - row.use;
            row.balance = balance;
        });

        allRows = allRows.concat(history);
    }

    const headers = ['年月日', '購入数', '使用数', '残数', '購入先・使用場所', '使用銃', '仕様内容', '同行者・獲物等'];
    const csvContent = allRows.map(row => {
        return [
            row.date,
            row.buy || '',
            row.use || '',
            row.balance,
            row.location,
            row.gunName,
            row.purpose,
            row.companion_game
        ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',');
    });

    const csv = '\uFEFF' + headers.join(',') + '\r\n' + csvContent.join('\r\n');
    downloadCSV(csv, 'hunting_log_book.csv');
}

async function exportCatchesAsCSV() {
    const recs = await db.catch_records.orderBy('catch_date').toArray();
    if(!recs.length) return showToast('記録がありません', 'error');
    const headers = ['ID','捕獲日','種名','性別','年齢','緯度','経度','メモ'];
    const csv = '\uFEFF' + headers.join(',') + '\r\n' + recs.map(r => [r.id, r.catch_date, r.species_name, r.gender, r.age, r.latitude, r.longitude, r.memo].map(v=>`"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\r\n');
    downloadCSV(csv, 'catch_records.csv');
}

// KMLエクスポート機能
async function exportAllDataAsKML() {
    const traps = await db.trap.toArray();
    const catches = await db.catch_records.toArray();
    const gunLogs = await db.gun_log.toArray();
    
    const validTraps = traps.filter(t => t.latitude && t.longitude);
    const validCatches = catches.filter(c => c.latitude && c.longitude);
    const validGuns = gunLogs.filter(g => g.latitude && g.longitude);
    
    if(validTraps.length === 0 && validCatches.length === 0 && validGuns.length === 0) {
        return showToast('位置情報付きのデータがありません', 'error');
    }

    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>狩猟記録マップ</name>
  <Style id="trap_open"><IconStyle><color>ff0000ff</color><scale>1.1</scale><Icon><href>http://googleusercontent.com/maps.google.com/mapfiles/ms/icons/red-dot.png</href></Icon></IconStyle></Style>
  <Style id="trap_closed"><IconStyle><color>ff888888</color><scale>0.8</scale><Icon><href>http://googleusercontent.com/maps.google.com/mapfiles/ms/icons/blue-dot.png</href></Icon></IconStyle></Style>
  <Style id="catch"><IconStyle><scale>1.1</scale><Icon><href>http://googleusercontent.com/maps.google.com/mapfiles/ms/icons/green-dot.png</href></Icon></IconStyle></Style>
  <Style id="gun"><IconStyle><scale>0.9</scale><Icon><href>http://googleusercontent.com/maps.google.com/mapfiles/ms/icons/yellow-dot.png</href></Icon></IconStyle></Style>
`;

    validTraps.forEach(t => {
        kml += `<Placemark>
    <name>罠No.${t.trap_number}</name>
    <description><![CDATA[種類: ${t.type}<br>設置日: ${t.setup_date}<br>${t.is_open?'設置中':'撤去済'}]]></description>
    <styleUrl>#${t.is_open ? 'trap_open' : 'trap_closed'}</styleUrl>
    <Point><coordinates>${t.longitude},${t.latitude},0</coordinates></Point>
  </Placemark>`;
    });

    validCatches.forEach(c => {
        kml += `<Placemark>
    <name>捕獲: ${c.species_name}</name>
    <description><![CDATA[日付: ${c.catch_date}<br>${c.gender}/${c.age}]]></description>
    <styleUrl>#catch</styleUrl>
    <Point><coordinates>${c.longitude},${c.latitude},0</coordinates></Point>
  </Placemark>`;
    });

    validGuns.forEach(g => {
        kml += `<Placemark>
    <name>発砲: ${g.purpose}</name>
    <description><![CDATA[日付: ${g.use_date}<br>${g.location}]]></description>
    <styleUrl>#gun</styleUrl>
    <Point><coordinates>${g.longitude},${g.latitude},0</coordinates></Point>
  </Placemark>`;
    });

    kml += `</Document></kml>`;

    const blob = new Blob([kml], {type: 'application/vnd.google-earth.kml+xml'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `hunting_map_${new Date().toISOString().slice(0,10)}.kml`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function downloadCSV(csv, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function blobToBase64(b) { return new Promise((res,rej)=>{ if(!b){res(null);return;} const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(b); }); }
function base64ToBlob(base64) {
    if (!base64) return null;
    try {
        const arr = base64.split(',');
        if (arr.length < 2) return null; 
        
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        console.error('画像の復元に失敗しました:', e);
        return null; 
    }
}

// ----------------------------------------------------------------------------
// 5. 初期データ投入ロジック
// ----------------------------------------------------------------------------

async function populateDefaultTrapTypes() {
    try { await db.trap_type.bulkAdd([{ name: 'くくり罠' }, { name: '箱罠' }]); } catch (err) { /* ignore */ }
}
async function populateDefaultHunterProfile() {
    try { await db.hunter_profile.add({ key: 'main', name: '', gun_license_renewal: '', hunting_license_renewal: '', registration_renewal: '', explosives_permit_renewal: '' }); } catch (err) { /* ignore */ }
}
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