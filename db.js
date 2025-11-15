// このファイルは db.js です

// Dexie.js (IndexedDBラッパー) を初期化
const db = new Dexie('HuntingAppDB');

// --- データベースのスキーマ定義 ---
//
// ★ 修正: v8 にバージョンアップ
// ★ 修正: 'gun_log' テーブルに 'ammo_count' (消費弾数) と 'companion' (同行者) を追加
// ★ 修正: 'ammo_purchases' (弾の購入履歴) テーブルを新設
//
db.version(8).stores({
    /* 罠テーブル */
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date',
    
    /* 罠の種類テーブル */
    trap_type: '++id, &name',
    
    /* 捕獲記録テーブル */
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    
    /* 銃テーブル (v6でカラム削除済み) */
    gun: '++id, &name, type, caliber',
    
    /* 銃使用履歴テーブル (★ v8 でカラム追加) */
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude, ammo_count, companion',
    
    /* ★ 弾の購入履歴テーブル (v8 で新設) */
    ammo_purchases: '++id, gun_id, purchase_date, amount', // gun_id と purchase_date で検索する
    
    /* 狩猟鳥獣図鑑テーブル */
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    
    /* チェックリスト */
    checklist_sets: '++id, name',
    
    /* 設定テーブル */
    settings: '&key', // 'theme', 'fontSize'
    
    /* 狩猟者プロファイル */
    hunter_profile: '&key' // 'main'
});


// --- 過去のバージョン (v7) ---
// v7 -> v8 へのアップグレード (カラム追加・テーブル追加) は
// Dexieが自動で処理するため、 .upgrade() 処理は不要です。
db.version(7).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date',
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude, ammo_count', // ← v7 は companion が無い
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    checklist_sets: '++id, name',
    settings: '&key',
    hunter_profile: '&key'
});

// v6 以前の定義も残しておきます
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


console.log("Database schema defined (db.js v8)");