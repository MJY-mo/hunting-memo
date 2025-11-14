// このファイルは db.js です

// Dexie.js (index.htmlで読み込み済み) を使ってデータベースを定義します。
const db = new Dexie('BLNCRHuntingApp');

// データベースのスキーマ（構造）を定義
// (v1〜v14 までは変更なしのため省略)
// --- version(1) ---
db.version(1).stores({
  traps: `
    ++id,
    &trap_number,
    trap_type,
    close_date
  `,
  guns: `
    ++id,
    &gun_name
  `,
  gun_logs: `
    ++id,
    gun_id,
    use_date,
    purpose
  `,
  ammo_purchases: `
    ++id,
    ammo_type,
    purchase_date
  `,
  catches: `
    ++id,
    catch_date,
    method,
    relation_id,
    [method+catch_date]
  `,
  photos: `
    ++id,
    catch_id
  `,
  settings: `
    &key
  `
});

// --- version(2) ---
db.version(2).stores({
  // 1. 罠管理ストア (categoryインデックスを追加)
  traps: `
    ++id,
    &trap_number,
    trap_type,
    close_date,
    category,
    [category+close_date]
  `,
  // (他のストアは変更なし)
  guns: `++id, &gun_name`,
  gun_logs: `++id, gun_id, use_date, purpose`,
  ammo_purchases: `++id, ammo_type, purchase_date`,
  catches: `++id, catch_date, method, relation_id, [method+catch_date]`,
  photos: `++id, catch_id`,
  settings: `&key`
});

// --- version(3) ---
db.version(3).stores({
  // 1. 罠の種類マスタストア
  trap_types: `
    &name
  `,
  // (既存のストアは変更なし)
  traps: `++id, &trap_number, trap_type, close_date, category, [category+close_date]`,
  guns: `++id, &gun_name`,
  gun_logs: `++id, gun_id, use_date, purpose`,
  ammo_purchases: `++id, ammo_type, purchase_date`,
  catches: `++id, catch_date, method, relation_id, [method+catch_date]`,
  photos: `++id, catch_id`,
  settings: `&key`
});

// --- version(4) ---
db.version(4).stores({
  // 3. 銃使用履歴ストア
  gun_logs: `
    ++id,
    gun_id,
    use_date,
    purpose,
    location,
    companion,
    ammo_data
  `,
  
  // (既存のストアは変更なし)
  trap_types: `&name`,
  traps: `++id, &trap_number, trap_type, close_date, category, [category+close_date]`,
  guns: `++id, &gun_name`,
  ammo_purchases: `++id, ammo_type, purchase_date`,
  catches: `++id, catch_date, method, relation_id, [method+catch_date]`,
  photos: `++id, catch_id`,
  settings: `&key`
});

// --- version(5) ---
db.version(5).stores({
  // 4. 弾購入履歴ストア
  ammo_purchases: `
    ++id,
    ammo_type,
    purchase_date,
    purchase_count
  `,

  // (既存のストアは変更なし)
  gun_logs: `++id, gun_id, use_date, purpose, location, companion, ammo_data`,
  trap_types: `&name`,
  traps: `++id, &trap_number, trap_type, close_date, category, [category+close_date]`,
  guns: `++id, &gun_name`,
  catches: `++id, catch_date, method, relation_id, [method+catch_date]`,
  photos: `++id, catch_id`,
  settings: `&key`
});


// --- version(6) ---
db.version(6).stores({
  // 5. 捕獲個体ストア
  catches: `
    ++id,
    catch_date,
    method,
    relation_id,
    species,
    gender,
    age,
    hit_location,
    [method+catch_date]
  `,
  // (既存のストアは変更なし)
  ammo_purchases: `++id, ammo_type, purchase_date, purchase_count`,
  gun_logs: `++id, gun_id, use_date, purpose, location, companion, ammo_data`,
  trap_types: `&name`,
  traps: `++id, &trap_number, trap_type, close_date, category, [category+close_date]`,
  guns: `++id, &gun_name`,
  photos: `++id, catch_id`,
  settings: `&key`
});


// --- version(7) ---
db.version(7).stores({
  // 5. 捕獲個体ストア
  catches: `
    ++id,
    catch_date,
    method,
    relation_id,
    species,
    gender,
    age,
    location_detail,
    [method+catch_date]
  `,
  // 6. 写真ストア
  photos: `
    ++id,
    catch_id,
    image_data
  `,

  // (既存のストアは変更なし)
  ammo_purchases: `++id, ammo_type, purchase_date, purchase_count`,
  gun_logs: `++id, gun_id, use_date, purpose, location, companion, ammo_data`,
  trap_types: `&name`,
  traps: `++id, &trap_number, trap_type, close_date, category, [category+close_date]`,
  guns: `++id, &gun_name`,
  settings: `&key`
}).upgrade(tx => {
    // v6 -> v7 への移行
    return tx.catches.toCollection().modify(catchItem => {
        if (catchItem.hit_location !== undefined) {
            catchItem.location_detail = catchItem.hit_location;
            delete catchItem.hit_location;
        }
    });
});

// --- version(8) ---
db.version(8).stores({
  // 8. 所持品チェックリスト項目ストア
  checklist_items: `
    &name,
    checked
  `,

  // (既存のストアは変更なし)
  catches: `++id, catch_date, method, relation_id, species, gender, age, location_detail, [method+catch_date]`,
  photos: `++id, catch_id, image_data`,
  ammo_purchases: `++id, ammo_type, purchase_date, purchase_count`,
  gun_logs: `++id, gun_id, use_date, purpose, location, companion, ammo_data`,
  trap_types: `&name`,
  traps: `++id, &trap_number, trap_type, close_date, category, [category+close_date]`,
  guns: `++id, &gun_name`,
  settings: `&key`
});

// --- version(9) ---
db.version(9).stores({
  // 9. チェックリストのセット
  checklist_lists: `
    ++id,
    &name
  `,
  // 8. checklist_items を変更 (PKを++idに、list_idを追加)
  checklist_items: `
    ++id,
    list_id,
    name,
    checked,
    [list_id+name]
  `,
  
  // (既存のストアは変更なし)
  catches: `++id, catch_date, method, relation_id, species, gender, age, location_detail, [method+catch_date]`,
  photos: `++id, catch_id, image_data`,
  ammo_purchases: `++id, ammo_type, purchase_date, purchase_count`,
  gun_logs: `++id, gun_id, use_date, purpose, location, companion, ammo_data`,
  trap_types: `&name`,
  traps: `++id, &trap_number, trap_type, close_date, category, [category+close_date]`,
  guns: `++id, &gun_name`,
  settings: `&key`
}).upgrade(async (tx) => {
    // v8 -> v9 への移行
    const defaultListId = await tx.checklist_lists.add({ name: 'デフォルトリスト' });
    const oldItems = [];
    await tx.table('checklist_items').each(item => {
        oldItems.push({
            list_id: defaultListId,
            name: item.name,
            checked: item.checked
        });
    });
    await tx.table('checklist_items').clear();
    if (oldItems.length > 0) {
        await tx.checklist_items.bulkAdd(oldItems);
    }
    console.log("Upgraded checklist_items from v8 to v9 and migrated data to 'デフォルトリスト'.");
});


// --- version(10) ---
db.version(10).stores({
  // 10. 実包の種類マスタストア
  ammo_types: `
    &name
  `,
  // (既存のストアは変更なし)
  checklist_lists: `++id, &name`,
  checklist_items: `++id, list_id, name, checked, [list_id+name]`,
  catches: `++id, catch_date, method, relation_id, species, gender, age, location_detail, [method+catch_date]`,
  photos: `++id, catch_id, image_data`,
  ammo_purchases: `++id, ammo_type, purchase_date, purchase_count`,
  gun_logs: `++id, gun_id, use_date, purpose, location, companion, ammo_data`,
  trap_types: `&name`,
  traps: `++id, &trap_number, trap_type, close_date, category, [category+close_date]`,
  guns: `++id, &gun_name`,
  settings: `&key`
});


// --- version(11) ---
db.version(11).stores({
  // 11. 狩猟者データストア
  hunter_profile: `
    &key,
    name,
    gun_license_renewal,
    gun_license_photo,
    hunting_license_renewal,
    hunting_license_photo,
    registration_renewal,
    registration_photo
  `,
  
  // (既存のストアは変更なし)
  ammo_types: `&name`,
  checklist_lists: `++id, &name`,
  checklist_items: `++id, list_id, name, checked, [list_id+name]`,
  catches: `++id, catch_date, method, relation_id, species, gender, age, location_detail, [method+catch_date]`,
  photos: `++id, catch_id, image_data`,
  ammo_purchases: `++id, ammo_type, purchase_date, purchase_count`,
  gun_logs: `++id, gun_id, use_date, purpose, location, companion, ammo_data`,
  trap_types: `&name`,
  traps: `++id, &trap_number, trap_type, close_date, category, [category+close_date]`,
  guns: `++id, &gun_name`,
  settings: `&key`
});

// --- version(12) ---
db.version(12).stores({
  // 11. 狩猟者データストアから写真Blobを削除
  hunter_profile: `
    &key,
    name,
    gun_license_renewal,
    hunting_license_renewal,
    registration_renewal
  `,
  // 12. 狩猟者データの写真ストアを新設
  profile_photos: `
    ++id,
    type,
    image_data
  `,
  
  // (既存のストアは変更なし)
  ammo_types: `&name`,
  checklist_lists: `++id, &name`,
  checklist_items: `++id, list_id, name, checked, [list_id+name]`,
  catches: `++id, catch_date, method, relation_id, species, gender, age, location_detail, [method+catch_date]`,
  photos: `++id, catch_id, image_data`,
  ammo_purchases: `++id, ammo_type, purchase_date, purchase_count`,
  gun_logs: `++id, gun_id, use_date, purpose, location, companion, ammo_data`,
  trap_types: `&name`,
  traps: `++id, &trap_number, trap_type, close_date, category, [category+close_date]`,
  guns: `++id, &gun_name`,
  settings: `&key`
}).upgrade(async (tx) => {
    // v11 -> v12 への移行
    const photosToAdd = [];
    const profile = await tx.table('hunter_profile').get('main');
    
    if (profile) {
        if (profile.gun_license_photo) {
            photosToAdd.push({ type: 'gun_license', image_data: profile.gun_license_photo });
        }
        if (profile.hunting_license_photo) {
            photosToAdd.push({ type: 'hunting_license', image_data: profile.hunting_license_photo });
        }
        if (profile.registration_photo) {
            photosToAdd.push({ type: 'registration', image_data: profile.registration_photo });
        }
    }

    if (photosToAdd.length > 0) {
        await tx.profile_photos.bulkAdd(photosToAdd);
    }
    
    await tx.table('hunter_profile').toCollection().modify(profile => {
        delete profile.gun_license_photo;
        delete profile.hunting_license_photo;
        delete profile.registration_photo;
    });
    
    console.log("Upgraded hunter_profile from v11 to v12 and migrated photos.");
});

// --- version(13) ---
db.version(13).stores({
  // 11. 狩猟者データストアに火薬類許可証の更新日を追加
  hunter_profile: `
    &key,
    name,
    gun_license_renewal,
    hunting_license_renewal,
    registration_renewal,
    explosives_permit_renewal
  `,
  // (profile_photos ストアは変更なし)
  profile_photos: `++id, type, image_data`,
  
  // (既存のストアは変更なし)
  ammo_types: `&name`,
  checklist_lists: `++id, &name`,
  checklist_items: `++id, list_id, name, checked, [list_id+name]`,
  catches: `++id, catch_date, method, relation_id, species, gender, age, location_detail, [method+catch_date]`,
  photos: `++id, catch_id, image_data`,
  ammo_purchases: `++id, ammo_type, purchase_date, purchase_count`,
  gun_logs: `++id, gun_id, use_date, purpose, location, companion, ammo_data`,
  trap_types: `&name`,
  traps: `++id, &trap_number, trap_type, close_date, category, [category+close_date]`,
  guns: `++id, &gun_name`,
  settings: `&key`
}).upgrade(async (tx) => {
    // v12 -> v13 への移行
    await tx.table('hunter_profile').where('key').equals('main').modify(profile => {
        profile.explosives_permit_renewal = '';
    });
    console.log("Upgraded hunter_profile from v12 to v13, added explosives_permit_renewal.");
});

// --- version(15) ---
db.version(15).stores({
  // 13. 狩猟鳥獣ストア
  game_animals: `
    ++id,
    &species_name,
    category,
    is_game_animal,
    notes
  `,

  // (既存のストアは変更なし)
  hunter_profile: `&key, name, gun_license_renewal, hunting_license_renewal, registration_renewal, explosives_permit_renewal`,
  profile_photos: `++id, type, image_data`,
  ammo_types: `&name`,
  checklist_lists: `++id, &name`,
  checklist_items: `++id, list_id, name, checked, [list_id+name]`,
  catches: `++id, catch_date, method, relation_id, species, gender, age, location_detail, [method+catch_date]`,
  photos: `++id, catch_id, image_data`,
  ammo_purchases: `++id, ammo_type, purchase_date, purchase_count`,
  gun_logs: `++id, gun_id, use_date, purpose, location, companion, ammo_data`,
  trap_types: `&name`,
  traps: `++id, &trap_number, trap_type, close_date, category, [category+close_date]`,
  guns: `++id, &gun_name`,
  settings: `&key`
}).upgrade(async (tx) => {
    // v14 -> v15 への移行
    const animalsData = [
        { species_name: "イノシシ", notes: "" },
        { species_name: "ニホンジカ", notes: "" },
        { species_name: "クマ", notes: "地域による" },
        { species_name: "タヌキ", notes: "" },
        { species_name: "キツネ", notes: "" },
        { species_name: "キジ", notes: "" },
        { species_name: "ヤマドリ", notes: "" },
        { species_name: "マガモ", notes: "" },
        { species_name: "カルガモ", notes: "" },
        { species_name: "ヒヨドリ", notes: "" },
        { species_name: "ハクビシン", notes: "有害鳥獣" },
        { species_name: "アライグマ", notes: "有害鳥獣" },
        { species_name: "カラス（ハシブトガラス、ハシボソガラス）", notes: "有害鳥獣" }
    ];
    
    await tx.game_animals.toCollection().modify(animal => {
        const data = animalsData.find(d => d.species_name === animal.species_name);
        if (data) {
            animal.notes = data.notes;
        }
    });
    
    console.log("Upgraded game_animals from v14 to v15, added notes data.");
});


// --- ★★★ 新規: version(16) を追加 ★★★ ---
// (狩猟鳥獣「一覧」CSV用ストアを追加)
db.version(16).stores({
  // 14. 狩猟鳥獣一覧ストア (CSV)
  game_animal_list: `
    ++id,
    &species_name,
    category,
    method_net,
    method_trap,
    method_gun,
    notes
  `,
  
  // (既存のストアは変更なし)
  game_animals: `++id, &species_name, category, is_game_animal, notes`,
  hunter_profile: `&key, name, gun_license_renewal, hunting_license_renewal, registration_renewal, explosives_permit_renewal`,
  profile_photos: `++id, type, image_data`,
  ammo_types: `&name`,
  checklist_lists: `++id, &name`,
  checklist_items: `++id, list_id, name, checked, [list_id+name]`,
  catches: `++id, catch_date, method, relation_id, species, gender, age, location_detail, [method+catch_date]`,
  photos: `++id, catch_id, image_data`,
  ammo_purchases: `++id, ammo_type, purchase_date, purchase_count`,
  gun_logs: `++id, gun_id, use_date, purpose, location, companion, ammo_data`,
  trap_types: `&name`,
  traps: `++id, &trap_number, trap_type, close_date, category, [category+close_date]`,
  guns: `++id, &gun_name`,
  settings: `&key`
});


// これで、他のJSファイル (main.js, trap.js など) から
// 'db' というグローバル変数としてアクセスできます。
console.log("Database schema defined (db.js)");