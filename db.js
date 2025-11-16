// このファイルは db.js です

// Dexie.js (IndexedDBラッパー) を初期化
const db = new Dexie('HuntingAppDB');

// --- データベースのスキーマ定義 ---
//
// ★ 修正: v12 にバージョンアップ
// ★ 修正: パフォーマンス向上のため、複合インデックスを多数追加
//
db.version(12).stores({
    /* 罠テーブル */
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date, purpose, [is_open+trap_number], [is_open+setup_date], [is_open+close_date]',
    
    /* 罠の種類テーブル */
    trap_type: '++id, &name',
    
    /* 捕獲記録テーブル */
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude, [gender+catch_date], [age+catch_date], [trap_id+catch_date], [gun_log_id+catch_date], [gender+species_name], [age+species_name], [trap_id+species_name], [gun_log_id+species_name]',
    
    /* 銃テーブル */
    gun: '++id, &name, type, caliber',
    
    /* 銃使用履歴テーブル */
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude, ammo_count, companion, [gun_id+use_date], [purpose+use_date]',
    
    /* 弾の購入履歴テーブル */
    ammo_purchases: '++id, gun_id, purchase_date',
    
    /* 狩猟鳥獣図鑑テーブル */
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2, [category+species_name], [is_game_animal+species_name]',
    
    /* チェックリスト (セット) */
    checklist_sets: '++id, name',
    
    /* チェックリスト (項目) */
    checklist_items: '++id, list_id, name, is_checked',
    
    /* 捕獲者情報 (画像) */
    profile_images: '++id, type',
    
    /* 設定テーブル */
    settings: '&key',
    
    /* 狩猟者プロファイル (テキスト情報) */
    hunter_profile: '&key'
});


// --- 過去のバージョン (v11) ---
// v11 -> v12 へのアップグレード (インデックス追加) は
// Dexieが自動で処理するため、 .upgrade() 処理は不要です。
db.version(11).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date, purpose',
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude, ammo_count, companion',
    ammo_purchases: '++id, gun_id, purchase_date',
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    checklist_sets: '++id, name',
    checklist_items: '++id, list_id, name, is_checked',
    profile_images: '++id, type',
    settings: '&key',
    hunter_profile: '&key'
});

// v10 以前の定義も残しておきます (v3->...->v10->v11->v12 と順次アップグレードされるため)
db.version(10).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date, purpose',
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude, ammo_count, companion',
    ammo_purchases: '++id, gun_id, purchase_date',
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    checklist_sets: '++id, name',
    checklist_items: '++id, list_id, name, is_checked',
    profile_images: '++id, type',
    settings: '&key',
    hunter_profile: '&key'
});
db.version(9).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date',
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude, ammo_count, companion',
    ammo_purchases: '++id, gun_id, purchase_date',
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    checklist_sets: '++id, name',
    checklist_items: '++id, list_id, name, is_checked',
    settings: '&key',
    hunter_profile: '&key'
});
db.version(8).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date',
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude, ammo_count, companion',
    ammo_purchases: '++id, gun_id, purchase_date',
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    checklist_sets: '++id, name',
    settings: '&key',
    hunter_profile: '&key'
});
db.version(7).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date',
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude, ammo_count',
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    checklist_sets: '++id, name',
    settings: '&key',
    hunter_profile: '&key'
});
db.version(6).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date',
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude',
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    checklist_sets: '++id, name',
    settings: '&key',
    hunter_profile: '&key'
});
db.version(5).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date',
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber, permit_date, permit_expiry', 
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude',
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    checklist_sets: '++id, name',
    settings: '&key',
    hunter_profile: '&key'
});
db.version(4).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open',
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber, permit_date, permit_expiry',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude',
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    checklist_sets: '++id, name',
    settings: '&key',
    hunter_profile: '&key'
});
db.version(3).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open',
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber, permit_date, permit_expiry',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude',
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    checklist_sets: '++id, name',
    settings: '&key',
    hunter_profile: '&key'
});

console.log("Database schema defined (db.js v12)");