// このファイルは db.js です

// Dexie.js (IndexedDBラッパー) を初期化
const db = new Dexie('HuntingAppDB');

// --- データベースのスキーマ定義 ---
// スキーマ（テーブル構造）を変更した場合は、
// 必ず version() の番号を1つ上げる (例: 1 -> 2)
//
// ★ 修正: v2 にバージョンアップ
// ★ 修正: game_animal_list に description, image_1, image_2 を追加
db.version(2).stores({
    /* 罠テーブル */
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open',
    
    /* 罠の種類テーブル (&name は name カラムをユニークキーにする) */
    trap_type: '++id, &name',
    
    /* 捕獲記録テーブル (trap_id と gun_log_id は外部キー) */
    catch: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    
    /* 銃テーブル (&name は name カラムをユニークキーにする) */
    gun: '++id, &name, type, caliber, permit_date, permit_expiry',
    
    /* 銃使用履歴テーブル (gun_id は外部キー) */
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude',
    
    /* ★ 狩猟鳥獣図鑑テーブル (v2 でカラム追加) */
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    
    /* 設定テーブル (&key は key カラムをユニークキーにする) */
    settings: '&key', // 'theme', 'fontSize'
    
    /* 狩猟者プロファイル (&key は key カラムをユニークキーにする) */
    hunter_profile: '&key' // 'main'
});

// v1 -> v2 へのアップグレード処理 (v1 にしか無かったテーブルを削除するなど)
// ※ 今回はテーブル削除やデータ移行はないため、空の関数を定義
db.version(1).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open',
    trap_type: '++id, &name',
    catch: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber, permit_date, permit_expiry',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude',
    
    // v1 スキーマ (game_animal_list の定義が古い)
    game_animal_list: '++id, species_name, category, is_game_animal', 
    
    settings: '&key', // 'theme', 'fontSize'
    hunter_profile: '&key' // 'main'
}).upgrade(tx => {
    // v1 -> v2 へのアップグレード時に、古い game_animal_list の
    // description, image_1, image_2 にデフォルト値を入れることも可能だが、
    // main.js で初回起動時に全投入するロジックがあるため、ここでは何もしない。
    // (もしv1でデータが残っていても、v2でカラムが追加されるだけ)
    console.log("Upgrading schema from v1 to v2...");
});


console.log("Database schema defined (db.js)");