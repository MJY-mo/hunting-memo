// このファイルは db.js です

// Dexie.js (IndexedDBラッパー) を初期化
const db = new Dexie('HuntingAppDB');

// --- データベースのスキーマ定義 ---
//
// ★ 修正: v5 にバージョンアップ
// ★ 修正: 'trap' テーブルに 'close_date' をインデックスとして追加
//          (過去の罠をソートするために必須)
//
db.version(5).stores({
    /* 罠テーブル */
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date',
    
    /* 罠の種類テーブル */
    trap_type: '++id, &name',
    
    /* 捕獲記録テーブル */
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    
    /* 銃テーブル */
    gun: '++id, &name, type, caliber, permit_date, permit_expiry',
    
    /* 銃使用履歴テーブル */
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude',
    
    /* 狩猟鳥獣図鑑テーブル */
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    
    /* チェックリスト */
    checklist_sets: '++id, name',
    
    /* 設定テーブル */
    settings: '&key', // 'theme', 'fontSize'
    
    /* 狩猟者プロファイル */
    hunter_profile: '&key' // 'main'
});


// --- 過去のバージョン (v4) ---
// v4 -> v5 へのアップグレードは、カラム追加のみのため、
// Dexieが自動で処理するため、 .upgrade() 処理は不要です。
// 古い定義を参考として残します。
db.version(4).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open', // ← close_date が無かった
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber, permit_date, permit_expiry',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude',
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    checklist_sets: '++id, name',
    settings: '&key',
    hunter_profile: '&key'
});

// v3 の定義 (v4 と同じだった)
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


console.log("Database schema defined (db.js v5)");