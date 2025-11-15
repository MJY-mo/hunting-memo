// このファイルは db.js です

// Dexie.js (IndexedDBラッパー) を初期化
const db = new Dexie('HuntingAppDB');

// --- データベースのスキーマ定義 ---
//
// ★ 修正: v10 にバージョンアップ
// ★ 修正: 'profile_images' テーブルを新設 (各種許可証の画像保存用)
//
db.version(10).stores({
    /* 罠テーブル */
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date',
    
    /* 罠の種類テーブル */
    trap_type: '++id, &name',
    
    /* 捕獲記録テーブル */
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    
    /* 銃テーブル */
    gun: '++id, &name, type, caliber',
    
    /* 銃使用履歴テーブル */
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude, ammo_count, companion',
    
    /* 弾の購入履歴テーブル */
    ammo_purchases: '++id, gun_id, purchase_date',
    
    /* 狩猟鳥獣図鑑テーブル */
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    
    /* チェックリスト (セット) */
    checklist_sets: '++id, name',
    
    /* チェックリスト (項目) */
    checklist_items: '++id, list_id, name, is_checked',
    
    /* 設定テーブル */
    settings: '&key', // 'theme', 'fontSize'
    
    /* 狩猟者プロファイル (テキスト情報) */
    hunter_profile: '&key', // 'main'
    
    /* ★ 捕獲者情報 (画像) (v10 で新設) */
    profile_images: '++id, type' // type: 'gun_license', 'hunting_license' など
});


// --- 過去のバージョン (v9) ---
// v9 -> v10 へのアップグレード (テーブル追加) は
// Dexieが自動で処理するため、 .upgrade() 処理は不要です。
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
    // v9 は profile_images が無い
});

// v8 以前の定義も残しておきます (v3->...->v8->v9->v10 と順次アップグレードされるため)
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


console.log("Database schema defined (db.js v10)");