// このファイルは db.js です

// Dexie.js (IndexedDBラッパー) を初期化
const db = new Dexie('HuntingAppDB');

// --- データベースのスキーマ定義 ---
//
// ★ 修正: v6 にバージョンアップ
// ★ 修正: 'gun' テーブルから permit_date, permit_expiry を削除
//
db.version(6).stores({
    /* 罠テーブル */
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date',
    
    /* 罠の種類テーブル */
    trap_type: '++id, &name',
    
    /* 捕獲記録テーブル */
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    
    /* 銃テーブル (★ v6 でカラム削除) */
    gun: '++id, &name, type, caliber',
    
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


// --- 過去のバージョン (v5) ---
// v5 -> v6 へのアップグレードは、カラム削除のみのため、
// Dexieが自動で処理するため、 .upgrade() 処理は不要です。
db.version(5).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date',
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber, permit_date, permit_expiry', // ← v5 には存在した
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude',
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    checklist_sets: '++id, name',
    settings: '&key',
    hunter_profile: '&key'
});

// v4 以前の定義も残しておきます (v3->v4->v5->v6 と順次アップグレードされるため)
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


console.log("Database schema defined (db.js v6)");