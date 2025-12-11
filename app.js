const db = new Dexie('HuntingAppDB');
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
    currentPage: 'trap', currentTrapId: null, currentGunLogId: null,
    currentCatchMethod: 'all', currentCatchRelationId: null,
    trapView: 'open',
    trapFilters: { type: 'all' }, trapSortOpen: { key: 'trap_number', order: 'asc' }, trapSortClosed: { key: 'close_date', order: 'desc' },
    gunLogFilters: { purpose: 'all', gun_id: 'all' }, gunLogSort: { key: 'use_date', order: 'desc' },
    catchFilters: { method: 'all', species: '', gender: 'all', age: 'all' }, catchSort: { key: 'catch_date', order: 'desc' },
    gameAnimalFilters: { category: 'all', status: 'all' },
    infoSort: 'default', infoFilterAttribute: 'all',
    activeBlobUrls: [], isEditing: false
};

window.addEventListener('load', () => {
    db.open().then(async () => {
        await loadAndApplySettings();
        await populateDefaultTrapTypes();
        await populateDefaultHunterProfile();
        await populateGameAnimalListIfNeeded(false);
        setupTabs();
        navigateTo('trap', showTrapPage, '罠');
    }).catch(err => {
        console.error(err);
        app.innerHTML = `<div class="error-box">起動エラー: ${err.message}</div>`;
    });
});

async function populateDefaultTrapTypes() {
    try { await db.trap_type.bulkAdd([{ name: 'くくり罠' }, { name: '箱罠' }]); } catch (e) {}
}
async function populateDefaultHunterProfile() {
    try { await db.hunter_profile.add({ key: 'main', name: '', gun_license_renewal: '', hunting_license_renewal: '', registration_renewal: '', explosives_permit_renewal: '' }); } catch (e) {}
}

async function populateGameAnimalListIfNeeded(forceUpdate = false) {
    try {
        const count = await db.game_animal_list.count();
        if (count > 0 && !forceUpdate) return;
        
        const CSV_URL = 'https://raw.githubusercontent.com/MJY-mo/hunting-memo/refs/heads/main/%E7%8B%A9%E7%8C%9F%E9%B3%A5%E7%8D%A3.csv'; 
        const res = await fetch(`${CSV_URL}?t=${Date.now()}`);
        if (!res.ok) throw new Error(`CSV Fetch Failed`);
        
        const records = parseCSV(await res.text());
        let start = (records[0][0] && records[0][0].includes('分類')) ? 1 : 0;
        const animals = [];
        for (let i = start; i < records.length; i++) {
            const r = records[i];
            if (r.length < 3) continue;
            animals.push({
                category: r[0]||'', is_game_animal: r[1]||'', species_name: r[2]||'',
                method_gun: r[3]||'', method_trap: r[4]||'', method_net: r[5]||'',
                gender: r[6]||'', count: r[7]||'', prohibited_area: r[8]||'',
                habitat: r[9]||'', notes: r[10]||'',
                ecology: r[11]||'', damage: r[12]||'',
                image_1: r[13]||'', image_2: r[14]||''
            });
        }
        await db.transaction('rw', db.game_animal_list, async () => {
            await db.game_animal_list.clear();
            await db.game_animal_list.bulkAdd(animals);
        });
    } catch (err) {
        console.error(err);
        const el = document.getElementById('csv-status');
        if (el) el.textContent = '更新失敗: ' + err.message;
    }
}

async function loadAndApplySettings() {
    try {
        let t = await db.settings.get('theme');
        if(!t) { t={key:'theme',value:'light'}; await db.settings.put(t); }
        applyTheme(t.value);
        let s = await db.settings.get('fontSize');
        if(!s) { s={key:'fontSize',value:'medium'}; await db.settings.put(s); }
        applyFontSize(s.value);
    } catch(e){}
}
function applyTheme(v) {
    const r = document.documentElement;
    r.className='';
    if(v!=='light') r.classList.add(`theme-${v}`);
}
function applyFontSize(v) {
    const r = document.documentElement;
    r.classList.remove('font-size-xsmall','font-size-small','font-size-medium','font-size-large','font-size-xlarge');
    r.classList.add(`font-size-${v}`);
}

function setupTabs() {
    tabs.trap.addEventListener('click', () => { appState.trapView='open'; navigateTo('trap', showTrapPage, '罠'); });
    tabs.gun.addEventListener('click', () => navigateTo('gun', showGunPage, '銃'));
    tabs.catch.addEventListener('click', () => navigateTo('catch', showCatchPage, '捕獲'));
    tabs.checklist.addEventListener('click', () => navigateTo('checklist', showChecklistPage, 'チェック'));
    tabs.info.addEventListener('click', () => navigateTo('info', showInfoPage, '情報'));
    tabs.settings.addEventListener('click', () => navigateTo('settings', showSettingsPage, '設定'));
}

function navigateTo(pid, func, title) {
    if (appState.activeBlobUrls.length) {
        appState.activeBlobUrls.forEach(u => URL.revokeObjectURL(u));
        appState.activeBlobUrls = [];
    }
    appState.currentPage = pid;
    Object.values(tabs).forEach(t => { if(t) { t.classList.remove('tab-active'); t.classList.add('tab-inactive'); }});
    if (tabs[pid]) { tabs[pid].classList.remove('tab-inactive'); tabs[pid].classList.add('tab-active'); }
    updateHeader(title, false);
    try { func(); } catch (e) { console.error(e); app.innerHTML = `<div class="error-box">${e.message}</div>`; }
}

function updateHeader(title, showBack) {
    headerTitle.textContent = title;
    backButton.classList.toggle('hidden', !showBack);
    if (showBack) {
        backButton.onclick = () => {
            const p = appState.currentPage;
            if(p==='trap') navigateTo('trap', showTrapPage, '罠');
            else if(p==='gun') navigateTo('gun', showGunPage, '銃');
            else if(p==='catch') navigateTo('catch', showCatchPage, '捕獲');
            else if(p==='checklist') navigateTo('checklist', showChecklistPage, 'チェック');
            else if(p==='info') navigateTo('info', showInfoPage, '情報');
            else if(p==='settings') navigateTo('settings', showSettingsPage, '設定');
            else navigateTo('trap', showTrapPage, '罠');
        };
    }
    headerActions.innerHTML = '';
}

function getCurrentLocation() {
    return new Promise((res, rej) => {
        if (!navigator.geolocation) return rej(new Error('GPS非対応'));
        navigator.geolocation.getCurrentPosition(p => res({latitude:p.coords.latitude, longitude:p.coords.longitude}), e => rej(new Error('測位失敗')));
    });
}
function escapeHTML(s) { return (s==null?'':s.toString()).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function formatDate(d) {
    if(!d) return '-';
    try {
        const p = d.split('-'); if(p.length===3) return `${p[0]}/${p[1]}/${p[2]}`;
        const dt = new Date(d); if(isNaN(dt.getTime())) return d;
        return `${dt.getFullYear()}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getDate().toString().padStart(2,'0')}`;
    } catch { return d; }
}
function parseCSV(txt) {
    const res=[]; let q=false, col=0, c=0; txt=txt.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
    for(;c<txt.length;c++) {
        let cc=txt[c], nc=txt[c+1];
        res[res.length-1]=res[res.length-1]||[]; res[res.length-1][col]=res[res.length-1][col]||'';
        if(cc=='"'&&q&&nc=='"'){res[res.length-1][col]+=cc; ++c; continue;}
        if(cc=='"'){q=!q; continue;}
        if(cc==','&&!q){++col; continue;}
        if(cc=='\n'&&!q){++col; if(col>0){res.push([]); col=0;} continue;}
        res[res.length-1][col]+=cc;
    }
    return res;
}
function resizeImage(file, max=800) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = e => {
            const i = new Image();
            i.onload = () => {
                EXIF.getData(i, function() {
                    let w=i.width, h=i.height, o=EXIF.getTag(this,"Orientation");
                    if(w>h){if(w>max){h=Math.round(h*(max/w));w=max}}else{if(h>max){w=Math.round(w*(max/h));h=max}}
                    const c=document.createElement('canvas'), ctx=c.getContext('2d');
                    if(o>=5&&o<=8){c.width=h;c.height=w;}else{c.width=w;c.height=h;}
                    switch(o){case 2:ctx.transform(-1,0,0,1,w,0);break;case 3:ctx.transform(-1,0,0,-1,w,h);break;case 4:ctx.transform(1,0,0,-1,0,h);break;case 5:ctx.transform(0,1,1,0,0,0);break;case 6:ctx.transform(0,1,-1,0,h,0);break;case 7:ctx.transform(0,-1,-1,0,h,w);break;case 8:ctx.transform(0,-1,1,0,0,w);break;}
                    if(o>=5&&o<=8)ctx.drawImage(i,0,0,h,w);else ctx.drawImage(i,0,0,w,h);
                    c.toBlob(b=>res(b),'image/jpeg',0.8);
                });
            };
            i.onerror = () => rej(new Error('画像読込失敗'));
            i.src = e.target.result;
        };
        r.readAsDataURL(file);
    });
}
function showImageModal(src) {
    closeImageModal();
    const d=document.createElement('div'); d.id='image-modal-overlay'; d.className='image-modal-overlay';
    d.innerHTML=`<div class="image-modal-content"><img src="${src}"></div>`;
    d.onclick=closeImageModal; document.body.appendChild(d);
}
function closeImageModal() { const d=document.getElementById('image-modal-overlay'); if(d)d.remove(); }

async function showTrapPage() {
    const view = appState.trapView;
    const filters = appState.trapFilters;
    const sort = view==='open' ? appState.trapSortOpen : appState.trapSortClosed;
    const types = await db.trap_type.toArray();
    const opts = types.map(t=>`<option value="${escapeHTML(t.name)}" ${filters.type===t.name?'selected':''}>${escapeHTML(t.name)}</option>`).join('');
    
    app.innerHTML = `
        <div class="space-y-2">
            <div class="sub-tab-container">
                <div id="tab-open" class="sub-tab-btn ${view==='open'?'active':''}">設置中</div>
                <div id="tab-closed" class="sub-tab-btn ${view==='closed'?'active':''}">過去の罠</div>
            </div>
            <div class="flex space-x-2">
                <button id="btn-new" class="btn btn-primary flex-1" ${view==='closed'?'disabled':''}><i class="fas fa-plus"></i> 新規設置</button>
                <button id="btn-type" class="btn btn-secondary flex-1"><i class="fas fa-cog"></i> 種類管理</button>
            </div>
            <div class="card bg-white">
                <div class="grid grid-cols-2 gap-2">
                    <div class="form-group mb-0"><label class="form-label">種類</label><select id="filter-type" class="form-select"><option value="all">全て</option>${opts}</select></div>
                    <div class="form-group mb-0"><label class="form-label">順序</label><div class="flex space-x-2"><select id="sort-key" class="form-select"><option value="trap_number" ${sort.key==='trap_number'?'selected':''}>番号</option><option value="${view==='open'?'setup_date':'close_date'}" ${sort.key!=='trap_number'?'selected':''}>日付</option></select><select id="sort-order" class="form-select w-24"><option value="asc" ${sort.order==='asc'?'selected':''}>昇順</option><option value="desc" ${sort.order==='desc'?'selected':''}>降順</option></select></div></div>
                </div>
            </div>
            <div id="trap-list" class="space-y-1"><p class="text-center text-gray-500 py-4">読み込み中...</p></div>
        </div>
    `;
    updateHeader('罠管理', false);
    document.getElementById('tab-open').onclick = () => { appState.trapView='open'; showTrapPage(); };
    document.getElementById('tab-closed').onclick = () => { appState.trapView='closed'; showTrapPage(); };
    document.getElementById('btn-new').onclick = () => { if(view!=='closed') showTrapEditForm(null); };
    document.getElementById('btn-type').onclick = showTrapTypeManagement;
    document.getElementById('filter-type').onchange = (e) => { filters.type=e.target.value; renderTrapList(); };
    document.getElementById('sort-key').onchange = (e) => { sort.key=e.target.value; renderTrapList(); };
    document.getElementById('sort-order').onchange = (e) => { sort.order=e.target.value; renderTrapList(); };
    await renderTrapList();
}

async function renderTrapList() {
    const el = document.getElementById('trap-list');
    if(!el) return;
    try {
        const view = appState.trapView;
        const filters = appState.trapFilters;
        const sort = view==='open' ? appState.trapSortOpen : appState.trapSortClosed;
        let traps = await db.trap.where('is_open').equals(view==='open'?1:0).toArray();
        if(filters.type!=='all') traps = traps.filter(t=>t.type===filters.type);
        
        traps.sort((a,b) => {
            const va=a[sort.key], vb=b[sort.key];
            if(sort.key==='trap_number') return sort.order==='asc' ? String(va).localeCompare(String(vb),undefined,{numeric:true}) : String(vb).localeCompare(String(va),undefined,{numeric:true});
            if(va<vb) return sort.order==='asc'?-1:1; if(va>vb) return sort.order==='asc'?1:-1; return 0;
        });

        if(!traps.length) { el.innerHTML = '<p class="text-center text-gray-500 py-4">なし</p>'; return; }
        const counts = await Promise.all(traps.map(t=>db.catch_records.where('trap_id').equals(t.id).count()));

        el.innerHTML = traps.map((t,i) => `
            <div class="trap-card bg-white" data-id="${t.id}">
                <div><h3 class="font-bold text-blue-600">No. ${escapeHTML(t.trap_number)}</h3><p>${escapeHTML(t.type)} <span class="text-xs text-gray-400">(${formatDate(t.setup_date)})</span></p>${t.close_date?`<p class="text-xs text-gray-500">撤去: ${formatDate(t.close_date)}</p>`:''}</div>
                <div class="flex items-center gap-2">${counts[i]>0?`<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold">${counts[i]}</span>`:''}<i class="fas fa-chevron-right text-gray-300"></i></div>
            </div>
        `).join('');
        el.querySelectorAll('.trap-card').forEach(d => d.onclick = () => showTrapDetailPage(parseInt(d.dataset.id)));
    } catch(e) { el.innerHTML='<div class="error-box">エラー</div>'; }
}

async function showTrapDetailPage(id) {
    const t = await db.trap.get(id);
    if(!t) return;
    updateHeader(`No.${t.trap_number}`, true);
    backButton.onclick = showTrapPage;
    const cCount = await db.catch_records.where('trap_id').equals(id).count();
    
    let img = '';
    if(t.image_blob) {
        const u = URL.createObjectURL(t.image_blob); appState.activeBlobUrls.push(u);
        img = `<div class="card bg-white"><div class="photo-preview cursor-zoom-in"><img src="${u}" onclick="showImageModal(this.src)"></div></div>`;
    }
    let info = `<div class="card bg-white"><table class="w-full text-sm">`;
    [['番号',t.trap_number],['種類',t.type],['設置日',formatDate(t.setup_date)],['状態',t.is_open?'設置中':'撤去済'],['撤去日',formatDate(t.close_date)],['座標',`${t.latitude||'-'}, ${t.longitude||'-'}`]].forEach(r=> info+=`<tr><th class="text-left w-1/3 text-gray-500 py-1">${r[0]}</th><td>${escapeHTML(r[1])}</td></tr>`);
    info += `</table></div>`;

    app.innerHTML = `
        <div class="space-y-2">
            <div class="flex gap-2"><button id="btn-edit" class="btn btn-secondary flex-1">編集</button><button id="btn-del" class="btn btn-danger flex-1">削除</button></div>
            ${img}${info}${t.memo?`<div class="card bg-white"><h3 class="font-bold border-b mb-1">メモ</h3><p class="text-sm">${escapeHTML(t.memo)}</p></div>`:''}
            <div class="card bg-white"><div class="flex justify-between items-center mb-2"><h3 class="font-bold">捕獲記録 (${cCount})</h3><button id="btn-add-c" class="btn btn-sm btn-primary"><i class="fas fa-plus"></i></button></div><button id="btn-view-c" class="btn btn-secondary w-full text-sm">一覧を見る</button></div>
            ${t.is_open ? `<div class="card bg-white border border-red-200"><label class="form-label">撤去日</label><div class="flex gap-2"><input type="date" id="c-date" class="form-input" value="${new Date().toISOString().split('T')[0]}"><button id="btn-close" class="btn btn-success whitespace-nowrap">撤去する</button></div></div>`:''}
        </div>
    `;
    document.getElementById('btn-edit').onclick = () => showTrapEditForm(id);
    document.getElementById('btn-del').onclick = async () => { if(confirm('削除？')) { await db.trap.delete(id); showTrapPage(); } };
    document.getElementById('btn-add-c').onclick = () => showCatchEditForm(null, {trapId:id});
    document.getElementById('btn-view-c').onclick = () => { appState.currentCatchMethod='trap'; appState.currentCatchRelationId=id; navigateTo('catch', showCatchListPage, '罠の捕獲記録'); };
    if(t.is_open) document.getElementById('btn-close').onclick = async () => { if(confirm('撤去しますか？')) { await db.trap.update(id,{is_open:0, close_date:document.getElementById('c-date').value}); showTrapDetailPage(id); } };
}

async function showTrapEditForm(id) {
    let t = { trap_number:'', type:'', setup_date:new Date().toISOString().split('T')[0], latitude:'', longitude:'', memo:'', image_blob:null, is_open:1 };
    if(id) t = await db.trap.get(id);
    const types = await db.trap_type.toArray();
    updateHeader(id?'罠編集':'新規設置', true);
    backButton.onclick = () => id ? showTrapDetailPage(id) : showTrapPage();

    let imgP = '';
    if(t.image_blob) {
        const u = URL.createObjectURL(t.image_blob); appState.activeBlobUrls.push(u);
        imgP = `<div class="form-group"><label class="form-label">現在:</label><div class="photo-preview"><img src="${u}"><button type="button" id="rm-img" class="photo-preview-btn-delete">&times;</button></div></div>`;
    }

    app.innerHTML = `
        <div class="card bg-white">
            <form id="form" class="space-y-3">
                <div class="form-group"><label class="form-label">番号</label><input id="no" class="form-input" value="${escapeHTML(t.trap_number)}" required></div>
                <div class="form-group"><label class="form-label">種類</label><select id="type" class="form-select">${types.map(y=>`<option ${y.name===t.type?'selected':''}>${y.name}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">設置日</label><input type="date" id="date" class="form-input" value="${t.setup_date}"></div>
                <div class="form-group"><label class="form-label">位置</label><div class="flex gap-2 mb-1"><input type="number" step="any" id="lat" class="form-input" value="${t.latitude}" placeholder="緯度"><input type="number" step="any" id="lon" class="form-input" value="${t.longitude}" placeholder="経度"></div><button type="button" id="gps" class="btn btn-secondary w-full text-sm">現在地</button></div>
                ${imgP}
                <div class="form-group"><label class="form-label">写真</label><input type="file" id="img" class="form-input" accept="image/*"></div>
                <div class="form-group"><label class="form-label">メモ</label><textarea id="memo" class="form-input">${t.memo}</textarea></div>
                <button class="btn btn-primary w-full">保存</button>
            </form>
        </div>
    `;
    document.getElementById('gps').onclick = async () => { try{const l=await getCurrentLocation(); document.getElementById('lat').value=l.latitude; document.getElementById('lon').value=l.longitude;}catch(e){alert(e.message)} };
    if(document.getElementById('rm-img')) document.getElementById('rm-img').onclick = function(){ this.closest('.form-group').remove(); t.image_blob = null; };
    let blob = t.image_blob;
    document.getElementById('img').onchange = async (e) => { if(e.target.files[0]) blob = await resizeImage(e.target.files[0]); };
    document.getElementById('form').onsubmit = async (e) => {
        e.preventDefault();
        const d = { trap_number:document.getElementById('no').value, type:document.getElementById('type').value, setup_date:document.getElementById('date').value, latitude:document.getElementById('lat').value, longitude:document.getElementById('lon').value, memo:document.getElementById('memo').value, image_blob:blob, is_open:id?t.is_open:1 };
        if(id) await db.trap.update(id, d); else id = await db.trap.add(d);
        showTrapDetailPage(id);
    };
}

async function showTrapTypeManagement() {
    updateHeader('種類管理', true);
    backButton.onclick = showTrapPage;
    const render = async () => {
        const types = await db.trap_type.toArray();
        app.innerHTML = `
            <div class="card bg-white mb-2"><form id="add-type" class="flex gap-2"><input id="new-name" class="form-input" required><button class="btn btn-primary">追加</button></form></div>
            <div class="space-y-1">${types.map(t=>`<div class="card bg-white flex justify-between py-2"><span>${escapeHTML(t.name)}</span><button class="btn btn-danger btn-sm del" data-id="${t.id}">×</button></div>`).join('')}</div>
        `;
        document.getElementById('add-type').onsubmit = async (e) => { e.preventDefault(); await db.trap_type.add({name:document.getElementById('new-name').value}); render(); };
        document.querySelectorAll('.del').forEach(b => b.onclick = async (e) => { if(confirm('削除？')) { await db.trap_type.delete(parseInt(e.target.dataset.id)); render(); } });
    };
    render();
}

async function showGunPage() {
    updateHeader('銃管理', false);
    app.innerHTML = `
        <div class="space-y-2">
            <div class="flex gap-2"><button id="btn-new" class="btn btn-primary flex-1"><i class="fas fa-plus"></i> 使用記録</button><button id="btn-manage" class="btn btn-secondary flex-1"><i class="fas fa-cog"></i> 所持銃</button></div>
            <div class="card bg-white"><div class="grid grid-cols-2 gap-2">
                <div class="form-group mb-0"><label class="form-label">目的</label><select id="filter-pur" class="form-select"><option value="all">全て</option><option value="狩猟">狩猟</option><option value="射撃">射撃</option><option value="有害駆除">有害駆除</option><option value="その他">その他</option></select></div>
                <div class="form-group mb-0"><label class="form-label">銃</label><select id="filter-gun" class="form-select"><option value="all">全て</option>${(await db.gun.toArray()).map(g=>`<option value="${g.id}">${g.name}</option>`).join('')}</select></div>
            </div></div>
            <div id="gun-list" class="space-y-1"></div>
        </div>
    `;
    document.getElementById('btn-new').onclick = () => showGunLogEdit(null);
    document.getElementById('btn-manage').onclick = showGunManage;
    const render = async () => {
        const pur = document.getElementById('filter-pur').value;
        const gid = document.getElementById('filter-gun').value;
        let logs = await db.gun_log.orderBy('use_date').reverse().toArray();
        if(pur!=='all') logs = logs.filter(l=>l.purpose===pur);
        if(gid!=='all') logs = logs.filter(l=>l.gun_id==gid);
        if(!logs.length) { document.getElementById('gun-list').innerHTML='<p class="text-center text-gray-500 py-4">なし</p>'; return; }
        const guns = await db.gun.toArray();
        const gMap = new Map(guns.map(g=>[g.id, g.name]));
        const counts = await Promise.all(logs.map(l=>db.catch_records.where('gun_log_id').equals(l.id).count()));
        document.getElementById('gun-list').innerHTML = logs.map((l,i) => `
            <div class="trap-card bg-white" onclick="showGunLogDetail(${l.id})">
                <div><h3 class="font-bold text-blue-600">${formatDate(l.use_date)}</h3><p>${escapeHTML(l.purpose)} / ${escapeHTML(gMap.get(l.gun_id)||'-')}</p></div>
                <div class="flex items-center gap-2">${counts[i]>0?`<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold">${counts[i]}</span>`:''}<i class="fas fa-chevron-right text-gray-300"></i></div>
            </div>
        `).join('');
    };
    document.getElementById('filter-pur').onchange = render;
    document.getElementById('filter-gun').onchange = render;
    render();
}

async function showGunManage() {
    updateHeader('所持銃', true);
    backButton.onclick = showGunPage;
    const guns = await db.gun.toArray();
    app.innerHTML = `<div class="space-y-2"><div class="card bg-white"><button id="add" class="btn btn-primary w-full">銃を追加</button></div>${guns.map(g=>`<div class="trap-card bg-white" onclick="showGunDetail(${g.id})"><div><h3 class="font-bold">${escapeHTML(g.name)}</h3><p>${escapeHTML(g.type)} / ${escapeHTML(g.caliber)}</p></div><i class="fas fa-chevron-right text-gray-300"></i></div>`).join('')}</div>`;
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
            <div class="card bg-white">
                <h3 class="font-bold border-b mb-2">弾管理</h3>
                <div class="flex justify-between mb-2"><span>残弾:</span><span class="font-bold text-xl">${p-c} 発</span></div>
                <form id="add-ammo" class="flex gap-2"><input type="date" id="ad" class="form-input w-1/3" value="${new Date().toISOString().split('T')[0]}"><input type="number" id="an" class="form-input flex-1" placeholder="購入数"><button class="btn btn-sm btn-primary">追加</button></form>
            </div>
        </div>
    `;
    document.getElementById('edit').onclick = () => showGunEdit(id);
    document.getElementById('del').onclick = async () => { if(confirm('削除？')) { await db.gun.delete(id); showGunManage(); } };
    document.getElementById('add-ammo').onsubmit = async (e) => { e.preventDefault(); await db.ammo_purchases.add({gun_id:id, purchase_date:document.getElementById('ad').value, amount:parseInt(document.getElementById('an').value)}); showGunDetail(id); };
}

async function showGunEdit(id) {
    let g = { name:'', type:'', caliber:'' };
    if(id) g = await db.gun.get(id);
    updateHeader('銃編集', true);
    backButton.onclick = () => id ? showGunDetail(id) : showGunManage();
    app.innerHTML = `
        <div class="card bg-white">
            <form id="form" class="space-y-3">
                <div class="form-group"><label class="form-label">名前</label><input id="name" class="form-input" value="${g.name}" required></div>
                <div class="form-group"><label class="form-label">種類</label><input id="type" class="form-input" value="${g.type}"></div>
                <div class="form-group"><label class="form-label">口径</label><input id="cal" class="form-input" value="${g.caliber}"></div>
                <button class="btn btn-primary w-full">保存</button>
            </form>
        </div>
    `;
    document.getElementById('form').onsubmit = async (e) => { e.preventDefault(); const d = { name:document.getElementById('name').value, type:document.getElementById('type').value, caliber:document.getElementById('cal').value }; if(id) await db.gun.update(id, d); else id = await db.gun.add(d); showGunDetail(id); };
}

async function showGunLogEdit(id) {
    let l = { use_date:new Date().toISOString().split('T')[0], gun_id:'', purpose:'狩猟', ammo_count:0, location:'', companion:'', memo:'', image_blob:null };
    if(id) l = await db.gun_log.get(id);
    const guns = await db.gun.toArray();
    updateHeader(id?'使用記録':'新規記録', true);
    backButton.onclick = showGunPage;
    let imgP = '';
    if(l.image_blob) { const u = URL.createObjectURL(l.image_blob); appState.activeBlobUrls.push(u); imgP = `<div class="form-group"><div class="photo-preview"><img src="${u}"><button id="rm-img" type="button" class="photo-preview-btn-delete">&times;</button></div></div>`; }
    app.innerHTML = `
        <div class="card bg-white">
            <form id="form" class="space-y-3">
                <div class="form-group"><label class="form-label">日付</label><input type="date" id="date" class="form-input" value="${l.use_date}"></div>
                <div class="form-group"><label class="form-label">銃</label><select id="gun" class="form-select">${guns.map(g=>`<option value="${g.id}" ${g.id==l.gun_id?'selected':''}>${g.name}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">目的</label><select id="pur" class="form-select">${['狩猟','射撃','駆除'].map(p=>`<option ${p==l.purpose?'selected':''}>${p}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">弾数</label><input type="number" id="ammo" class="form-input" value="${l.ammo_count}"></div>
                <div class="form-group"><label class="form-label">場所</label><input id="loc" class="form-input" value="${l.location}"></div>
                <div class="form-group"><label class="form-label">同行</label><input id="comp" class="form-input" value="${l.companion}"></div>
                <div class="form-group"><div class="flex gap-2 mb-1"><input id="lat" class="form-input" placeholder="緯度" value="${l.latitude}"><input id="lon" class="form-input" placeholder="経度" value="${l.longitude}"></div><button type="button" id="gps" class="btn btn-secondary w-full text-sm">現在地</button></div>
                ${imgP}
                <div class="form-group"><input type="file" id="img" class="form-input" accept="image/*"></div>
                <div class="form-group"><textarea id="memo" class="form-input">${l.memo}</textarea></div>
                <button class="btn btn-primary w-full">保存</button>
            </form>
        </div>
    `;
    document.getElementById('gps').onclick = async () => { try{const l=await getCurrentLocation(); document.getElementById('lat').value=l.latitude; document.getElementById('lon').value=l.longitude;}catch(e){alert(e.message)} };
    if(document.getElementById('rm-img')) document.getElementById('rm-img').onclick = function(){ this.closest('.form-group').remove(); l.image_blob = null; };
    let blob = l.image_blob;
    document.getElementById('img').onchange = async (e) => { if(e.target.files[0]) blob = await resizeImage(e.target.files[0]); };
    document.getElementById('form').onsubmit = async (e) => {
        e.preventDefault();
        const d = { use_date:document.getElementById('date').value, gun_id:parseInt(document.getElementById('gun').value), purpose:document.getElementById('pur').value, ammo_count:parseInt(document.getElementById('ammo').value), location:document.getElementById('loc').value, companion:document.getElementById('comp').value, latitude:document.getElementById('lat').value, longitude:document.getElementById('lon').value, memo:document.getElementById('memo').value, image_blob:blob };
        if(id) await db.gun_log.update(id, d); else await db.gun_log.add(d);
        showGunPage();
    };
}

async function showGunLogDetail(id) { showGunLogEdit(id); }

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
    if(method!=='all') backButton.onclick = () => method==='trap' ? showTrapDetailPage(relId) : showGunLogDetail(relId);
    app.innerHTML = `
        <div class="space-y-2">
            ${method==='all' ? '<div class="card bg-white p-2 mb-2"><input id="search" class="form-input" placeholder="種名検索..."></div>' : ''}
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
    if(document.getElementById('search')) document.getElementById('search').oninput = (e) => render(recs.filter(r=>r.species_name.includes(e.target.value)));
}

async function showCatchEdit(id, pre={}) {
    let r = { catch_date:new Date().toISOString().split('T')[0], species_name:'', gender:'不明', age:'不明', image_blob:null, ...pre };
    if(id) r = await db.catch_records.get(id);
    updateHeader('捕獲記録', true);
    backButton.onclick = showCatchListPage;
    let imgP = '';
    if(r.image_blob) { const u = URL.createObjectURL(r.image_blob); appState.activeBlobUrls.push(u); imgP = `<div class="form-group"><div class="photo-preview"><img src="${u}"><button type="button" id="rm-img" class="photo-preview-btn-delete">&times;</button></div></div>`; }
    app.innerHTML = `
        <div class="card bg-white">
            <form id="form" class="space-y-3">
                <div class="form-group"><label class="form-label">日付</label><input type="date" id="date" class="form-input" value="${r.catch_date}"></div>
                <div class="form-group"><label class="form-label">種名</label><input id="spec" class="form-input" value="${r.species_name}" list="sl"><datalist id="sl"></datalist></div>
                <div class="flex gap-2"><div class="form-group flex-1"><label class="form-label">性別</label><select id="gen" class="form-select">${['不明','オス','メス'].map(v=>`<option ${v==r.gender?'selected':''}>${v}</option>`).join('')}</select></div><div class="form-group flex-1"><label class="form-label">年齢</label><select id="age" class="form-select">${['不明','成獣','幼獣'].map(v=>`<option ${v==r.age?'selected':''}>${v}</option>`).join('')}</select></div></div>
                <div class="form-group"><div class="flex gap-2"><input id="lat" class="form-input" value="${r.latitude}" placeholder="緯度"><input id="lon" class="form-input" value="${r.longitude}" placeholder="経度"></div></div>
                ${imgP}
                <div class="form-group"><input type="file" id="img" class="form-input" accept="image/*"></div>
                <div class="form-group"><textarea id="memo" class="form-input">${r.memo}</textarea></div>
                <button class="btn btn-primary w-full">保存</button>
            </form>
            ${id ? `<button id="del" class="btn btn-danger w-full mt-2">削除</button>`:''}
        </div>
    `;
    db.game_animal_list.where('is_game_animal').equals('〇').toArray().then(L => document.getElementById('sl').innerHTML = [...new Set(L.map(a=>a.species_name))].map(n=>`<option value="${n}"></option>`).join(''));
    if(document.getElementById('rm-img')) document.getElementById('rm-img').onclick = function(){ this.closest('.form-group').remove(); r.image_blob = null; };
    let blob = r.image_blob;
    document.getElementById('img').onchange = async (e) => { if(e.target.files[0]) blob = await resizeImage(e.target.files[0]); };
    document.getElementById('form').onsubmit = async (e) => {
        e.preventDefault();
        const d = { catch_date: document.getElementById('date').value, species_name: document.getElementById('spec').value, gender: document.getElementById('gen').value, age: document.getElementById('age').value, latitude: document.getElementById('lat').value, longitude: document.getElementById('lon').value, memo: document.getElementById('memo').value, image_blob: blob, trap_id: id?r.trap_id:pre.trapId, gun_log_id: id?r.gun_log_id:pre.gunLogId };
        if(id) await db.catch_records.update(id, d); else await db.catch_records.add(d);
        showCatchListPage();
    };
    if(id) document.getElementById('del').onclick = async () => { if(confirm('削除？')) { await db.catch_records.delete(id); showCatchListPage(); } };
}
async function showCatchEditForm(id, pre) { showCatchEdit(id, pre); }

function showChecklistPage() { navigateTo('checklist', renderChecklistSets, 'チェックリスト'); }
async function renderChecklistSets() {
    updateHeader('チェックリスト', false);
    const sets = await db.checklist_sets.toArray();
    app.innerHTML = `
        <div class="space-y-2">
            <div class="card bg-white p-2 flex gap-2"><input id="new-set" class="form-input" placeholder="リスト名"><button id="add" class="btn btn-primary">作成</button></div>
            <div id="list" class="space-y-1"></div>
        </div>
    `;
    document.getElementById('list').innerHTML = sets.map(s => `<div class="trap-card bg-white" onclick="showChecklistDetail(${s.id})"><h3 class="font-bold">${escapeHTML(s.name)}</h3><button class="btn btn-danger btn-sm del" data-id="${s.id}">削除</button></div>`).join('');
    document.getElementById('add').onclick = async () => { await db.checklist_sets.add({name:document.getElementById('new-set').value}); renderChecklistSets(); };
    document.querySelectorAll('.del').forEach(b => b.onclick = async (e) => { e.stopPropagation(); if(confirm('削除？')) { await db.checklist_items.where('list_id').equals(parseInt(e.target.dataset.id)).delete(); await db.checklist_sets.delete(parseInt(e.target.dataset.id)); renderChecklistSets(); } });
}

async function showChecklistDetail(id) {
    const set = await db.checklist_sets.get(id);
    let mode = 'check';
    const render = async () => {
        updateHeader(set.name, true);
        backButton.onclick = showChecklistPage;
        const items = await db.checklist_items.where('list_id').equals(id).toArray();
        let html = `<div class="sub-tab-container"><div id="t-check" class="sub-tab-btn ${mode==='check'?'active':''}">チェック</div><div id="t-edit" class="sub-tab-btn ${mode==='edit'?'active':''}">編集</div></div>`;
        if(mode==='check') {
            html += `<div class="card bg-white p-2 mb-2"><button id="reset" class="btn btn-secondary w-full">リセット</button></div><div class="space-y-1">${items.map(i => `<div class="card bg-white flex items-center p-2 cursor-pointer row" data-id="${i.id}"><div class="w-6 h-6 border rounded mr-3 flex items-center justify-center ${i.is_checked?'bg-blue-600 border-blue-600 text-white':''}">${i.is_checked?'✓':''}</div><span class="${i.is_checked?'text-gray-400 line-through':''} checklist-item">${escapeHTML(i.name)}</span></div>`).join('')}</div>`;
        } else {
            html += `<div class="card bg-white p-2 flex gap-2 mb-2"><input id="new-i" class="form-input"><button id="add-i" class="btn btn-primary">追加</button></div><div class="space-y-1">${items.map(i => `<div class="card bg-white flex justify-between p-2"><span>${escapeHTML(i.name)}</span><button class="btn btn-danger btn-sm del-i" data-id="${i.id}">×</button></div>`).join('')}</div>`;
        }
        app.innerHTML = html;
        document.getElementById('t-check').onclick = () => { mode='check'; render(); };
        document.getElementById('t-edit').onclick = () => { mode='edit'; render(); };
        if(mode==='check') {
            document.getElementById('reset').onclick = async () => { await db.checklist_items.where('list_id').equals(id).modify({is_checked:false}); render(); };
            document.querySelectorAll('.row').forEach(r => r.onclick = async (e) => { const i = items.find(x => x.id === parseInt(e.currentTarget.dataset.id)); await db.checklist_items.update(i.id, {is_checked: !i.is_checked}); render(); });
        } else {
            document.getElementById('add-i').onclick = async () => { await db.checklist_items.add({list_id:id, name:document.getElementById('new-i').value, is_checked:false}); render(); };
            document.querySelectorAll('.del-i').forEach(b => b.onclick = async (e) => { await db.checklist_items.delete(parseInt(e.target.dataset.id)); render(); });
        }
    };
    render();
}

function showInfoPage() { navigateTo('info', renderInfoTopPage, '情報'); }
function renderInfoTopPage() {
    updateHeader('情報', false);
    app.innerHTML = `<div class="space-y-2"><div class="card bg-white flex items-center gap-3 p-3 cursor-pointer" onclick="showGameAnimalListPage()"><div class="bg-green-100 p-2 rounded text-green-600 text-xl"><i class="fas fa-book"></i></div><div><h3 class="font-bold">図鑑</h3><p class="text-xs text-gray-500">生態・被害</p></div><i class="fas fa-chevron-right ml-auto text-gray-300"></i></div><div class="card bg-white flex items-center gap-3 p-3 cursor-pointer" onclick="showHunterProfilePage()"><div class="bg-blue-100 p-2 rounded text-blue-600 text-xl"><i class="fas fa-id-card"></i></div><div><h3 class="font-bold">情報</h3><p class="text-xs text-gray-500">許可証管理</p></div><i class="fas fa-chevron-right ml-auto text-gray-300"></i></div></div>`;
}

async function showGameAnimalListPage() {
    updateHeader('図鑑', true);
    backButton.onclick = showInfoPage;
    let animals = await db.game_animal_list.toArray();
    app.innerHTML = `<div class="space-y-2"><div class="card bg-white p-2 flex gap-2"><input id="search" class="form-input" placeholder="検索..."></div><div id="ga-list" class="space-y-1"></div></div>`;
    const render = (list) => {
        document.getElementById('ga-list').innerHTML = list.map(a => `<div class="animal-card bg-white" onclick="showGameAnimalDetail(${a.id})"><div class="flex items-center gap-2"><div class="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">${a.image_1 ? `<img src="./image/${escapeHTML(a.image_1)}" class="w-full h-full object-cover">` : '<i class="fas fa-paw text-gray-300 m-auto"></i>'}</div><div><h3 class="font-bold">${escapeHTML(a.species_name)}</h3><span class="text-xs bg-gray-100 px-1 rounded">${escapeHTML(a.category)}</span></div></div><i class="fas fa-chevron-right text-gray-300"></i></div>`).join('');
    };
    render(animals);
    document.getElementById('search').oninput = (e) => render(animals.filter(a => a.species_name.includes(e.target.value)));
}

async function showGameAnimalDetail(id) {
    const a = await db.game_animal_list.get(id);
    updateHeader(a.species_name, true);
    backButton.onclick = showGameAnimalListPage;
    let imgs = '';
    if(a.image_1) imgs += `<img src="./image/${a.image_1}" class="w-full h-48 object-cover rounded mb-1">`;
    if(a.image_2) imgs += `<img src="./image/${a.image_2}" class="w-full h-48 object-cover rounded">`;
    let st = a.is_game_animal==='〇'?'狩猟鳥獣':'非狩猟鳥獣';
    if(a.is_game_animal==='〇') {
        let m=[]; if(['○','〇','◎'].includes(a.method_gun)) m.push('銃'); if(['○','〇','◎'].includes(a.method_trap)) m.push('罠'); if(['○','〇','◎'].includes(a.method_net)) m.push('網');
        if(m.length) st=m.join('・');
    }
    let prohib = a.prohibited_area; if(!prohib || prohib==='nan' || prohib==='-') prohib = null;
    let rows = '';
    [['狩猟',st],['制限',a.count],['禁止区域',prohib],['生息地',a.habitat],['備考',a.notes]].forEach(r => { if(r[1]&&r[1]!=='nan') rows+=`<tr><th class="text-left w-1/3 text-gray-500">${r[0]}</th><td>${escapeHTML(r[1])}</td></tr>`; });
    app.innerHTML = `<div class="space-y-2">${imgs?`<div class="card p-1">${imgs}</div>`:''}<div class="card"><h3 class="font-bold border-b mb-1">生態</h3><p class="text-sm">${a.ecology||'-'}</p></div><div class="card"><h3 class="font-bold border-b mb-1">被害・特徴</h3><p class="text-sm">${a.damage||'-'}</p></div><div class="card"><h3 class="font-bold border-b mb-1">データ</h3><table class="w-full text-sm">${rows}</table></div></div>`;
}

async function showHunterProfilePage() {
    updateHeader('登録情報', true);
    backButton.onclick = showInfoPage;
    const p = await db.hunter_profile.get('main') || {};
    const imgs = await db.profile_images.toArray();
    const fields = [{k:'name',l:'氏名'},{k:'gun_license_renewal',l:'銃所持許可'},{k:'hunting_license_renewal',l:'狩猟免状'},{k:'registration_renewal',l:'登録証'},{k:'explosives_permit_renewal',l:'火薬許可'}];
    app.innerHTML = `<div class="space-y-2"><div class="card bg-white text-right py-1"><button id="edit" class="text-blue-600 text-sm">編集モードへ</button></div>${fields.map(f => {
        const myImgs = imgs.filter(i=>i.type===f.k);
        let imgHTML = '';
        if(myImgs.length) imgHTML = `<div class="flex gap-1 mt-1 overflow-x-auto">` + myImgs.map(i=>`<img src="${URL.createObjectURL(i.image_blob)}" class="h-12 w-12 rounded border object-cover" onclick="showImageModal(this.src)">`).join('') + `</div>`;
        return `<div class="card bg-white"><div class="flex justify-between"><span class="text-gray-500 text-sm">${f.l}</span><span class="font-bold">${escapeHTML(p[f.k]||'')}</span></div>${imgHTML}</div>`;
    }).join('')}</div>`;
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
        let imgHTML = myImgs.map(i => `<div class="relative inline-block mr-1"><img src="${URL.createObjectURL(i.image_blob)}" class="h-12 w-12 rounded object-cover"><button class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center del-img" data-id="${i.id}">×</button></div>`).join('');
        const div = document.createElement('div'); div.className = 'card bg-white';
        div.innerHTML = `<label class="form-label">${f.l}</label><div class="flex gap-2 mb-2"><input id="in-${f.k}" class="form-input flex-1" value="${escapeHTML(p[f.k]||'')}"><button class="btn btn-primary w-16 save" data-key="${f.k}">保存</button></div><div class="flex items-center flex-wrap">${imgHTML}<button class="btn btn-secondary btn-sm h-12 w-12 flex flex-col items-center justify-center text-xs add-img" data-key="${f.k}"><i class="fas fa-camera"></i></button></div>`;
        editor.appendChild(div);
    });
    editor.querySelectorAll('.save').forEach(b => b.onclick = async (e) => { const k = e.target.dataset.key; p[k] = document.getElementById(`in-${k}`).value; await db.hunter_profile.put(p); e.target.textContent='OK'; setTimeout(()=>e.target.textContent='保存',1000); });
    editor.querySelectorAll('.add-img').forEach(b => b.onclick = (e) => { targetKey=e.currentTarget.dataset.key; fileIn.click(); });
    editor.querySelectorAll('.del-img').forEach(b => b.onclick = async (e) => { await db.profile_images.delete(parseInt(e.target.dataset.id)); showHunterProfileEdit(); });
    fileIn.onchange = async (e) => { if(e.target.files[0]) { const b = await resizeImage(e.target.files[0]); await db.profile_images.add({type:targetKey, image_blob:b}); showHunterProfileEdit(); } fileIn.value = ''; };
}

function showSettingsPage() {
    updateHeader('設定', false);
    app.innerHTML = `<div class="space-y-2"><div class="card bg-white"><h3 class="font-bold border-b mb-2">表示</h3><div class="flex gap-2 mb-2"><select id="theme" class="form-select flex-1"><option value="light">ライト</option><option value="sepia">セピア</option><option value="lightgreen">緑</option></select></div><div class="flex gap-2"><select id="size" class="form-select flex-1"><option value="small">小</option><option value="medium">中</option><option value="large">大</option></select></div></div><div class="card bg-white"><h3 class="font-bold border-b mb-2">データ</h3><button id="backup" class="btn btn-secondary w-full mb-1">バックアップ</button><button id="restore" class="btn btn-secondary w-full">復元</button><input type="file" id="f-res" hidden></div><div class="card bg-white border border-yellow-300"><button id="update" class="btn btn-warning w-full">アプリ更新</button></div></div>`;
    document.getElementById('theme').onchange = e => { db.settings.put({key:'theme',value:e.target.value}); applyTheme(e.target.value); };
    document.getElementById('size').onchange = e => { db.settings.put({key:'fontSize',value:e.target.value}); applyFontSize(e.target.value); };
    document.getElementById('backup').onclick = exportAllData;
    document.getElementById('restore').onclick = () => document.getElementById('f-res').click();
    document.getElementById('f-res').onchange = (e) => importAllData(e.target.files[0]);
    document.getElementById('update').onclick = () => location.reload(true);
}

async function exportAllData() {
    const d = {}; for(const t of db.tables) d[t.name] = await t.toArray();
    for(const t of ['trap','catch_records','gun_log','profile_images']) if(d[t]) d[t] = await Promise.all(d[t].map(async i => ({...i, image_blob: await blobToBase64(i.image_blob)})));
    const b = new Blob([JSON.stringify(d)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `backup.json`; a.click();
}
async function importAllData(file) {
    if(!confirm('上書きしますか？')) return;
    try {
        const d = JSON.parse(await file.text()); const tabs = d.tables||d;
        await db.transaction('rw', db.tables, async () => {
            await Promise.all(db.tables.map(t=>t.clear()));
            for(const t of db.tables) if(tabs[t.name]) await t.bulkAdd(t.name.match(/trap|catch|gun_log|profile/)?await Promise.all(tabs[t.name].map(async i=>({...i,image_blob:await base64ToBlob(i.image_blob)}))):tabs[t.name]);
        });
        alert('完了'); location.reload();
    } catch { alert('失敗'); }
}
function blobToBase64(b) { return new Promise((res,rej)=>{ if(!b){res(null);return;} const r=new FileReader(); r.onload=()=>res(r.result); r.readAsDataURL(b); }); }
async function base64ToBlob(d) { if(!d)return null; return (await fetch(d)).blob(); }