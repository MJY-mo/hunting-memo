// このファイルは db.js です

// Dexie.js (IndexedDBラッパー) を初期化
const db = new Dexie('HuntingAppDB');

// --- データベースのスキーマ定義 ---
//
// ★ 修正: v14 にバージョンアップ
// ★ 修正: game_animal_list から description を削除し、ecology(生態) と damage(被害) を追加
//
db.version(14).stores({
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
    
    /* 狩猟鳥獣図鑑テーブル (★修正) */
    game_animal_list: '++id, species_name, category, is_game_animal, ecology, damage, image_1, image_2, [category+species_name], [is_game_animal+species_name]',
    
    /* チェックリスト (セット) */
    checklist_sets: '++id, &name',
    
    /* チェックリスト (項目) */
    checklist_items: '++id, list_id, name, is_checked, &[list_id+name]',
    
    /* 捕獲者情報 (画像) */
    profile_images: '++id, type',
    
    /* 設定テーブル */
    settings: '&key',
    
    /* 狩猟者プロファイル (テキスト情報) */
    hunter_profile: '&key'
});

// (過去のバージョン定義は省略可能ですが、既存ユーザーのために残すのが一般的です)
// v13
db.version(13).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open, close_date, purpose, [is_open+trap_number], [is_open+setup_date], [is_open+close_date]',
    trap_type: '++id, &name',
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude, [gender+catch_date], [age+catch_date], [trap_id+catch_date], [gun_log_id+catch_date], [gender+species_name], [age+species_name], [trap_id+species_name], [gun_log_id+species_name]',
    gun: '++id, &name, type, caliber',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude, ammo_count, companion, [gun_id+use_date], [purpose+use_date]',
    ammo_purchases: '++id, gun_id, purchase_date',
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2, [category+species_name], [is_game_animal+species_name]',
    checklist_sets: '++id, &name',
    checklist_items: '++id, list_id, name, is_checked, &[list_id+name]',
    profile_images: '++id, type',
    settings: '&key',
    hunter_profile: '&key'
});

// (v12以前の定義は省略)
console.log("Database schema defined (db.js v14)");