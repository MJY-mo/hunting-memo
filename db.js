// このファイルは db.js です

// Dexie.js (index.htmlで読み込み済み) を使ってデータベースを定義します。
const db = new Dexie('BLNCRHuntingApp');

// データベースのスキーマ（構造）を定義
// '++id': 自動採番のプライマリキー
// '&trap_number': ユニーク（重複禁止）なインデックス
// 'close_date': 罠の開閉状態で検索するためのインデックス
// 'category': 区分で検索するためのインデックス


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
    // v6 -> v7 への移行 (catchesテーブルの 'hit_location' を 'location_detail' にリネーム)
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
    // 1. 'デフォルトリスト' を作成
    const defaultListId = await tx.checklist_lists.add({ name: 'デフォルトリスト' });
    // 2. v8の checklist_items データを読み取り
    const oldItems = [];
    await tx.table('checklist_items').each(item => {
        oldItems.push({
            list_id: defaultListId,
            name: item.name,
            checked: item.checked
        });
    });
    // 3. v8のストアをクリア
    await tx.table('checklist_items').clear();
    // 4. v9のストアにデータをバルク追加
    if (oldItems.length > 0) {
        await tx.checklist_items.bulkAdd(oldItems);
    }
    console.log("Upgraded checklist_items from v8 to v9 and migrated data to 'デフォルトリスト'.");
});


// --- ★★★ 新規: version(10) を追加 ★★★ ---
// (実包の種類マスタストアを追加)
db.version(10).stores({
  // 10. 実包の種類マスタストア
  ammo_types: `
    &name
  `,

  // (既存のストアは変更なし・定義を省略すると維持されます)
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