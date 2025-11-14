// このファイルは db.js です

// Dexie.js (IndexedDBラッパー) を初期化
const db = new Dexie('HuntingAppDB');

// --- データベースのスキーマ定義 ---
//
// ★ 修正: v2 
// ★ 修正: 'catch' -> 'catch_records' (JS予約語 'catch' との衝突回避)
// ★ 修正: 'checklist_sets' テーブルを追加
db.version(2).stores({
    /* 罠テーブル */
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open',
    
    /* 罠の種類テーブル */
    trap_type: '++id, &name',
    
    /* 捕獲記録テーブル (★ v2でリネーム) */
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    
    /* 銃テーブル */
    gun: '++id, &name, type, caliber, permit_date, permit_expiry',
    
    /* 銃使用履歴テーブル */
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude',
    
    /* 狩猟鳥獣図鑑テーブル */
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    
    /* ★ チェックリスト (v2で追加) */
    checklist_sets: '++id, name', // 'items' は配列なのでインデックス不要
    
    /* 設定テーブル */
    settings: '&key', // 'theme', 'fontSize'
    
    /* 狩猟者プロファイル */
    hunter_profile: '&key' // 'main'
});

// v1 スキーマ (古い定義)
// v1 -> v2 へのデータ移行は複雑なため、
// 開発中はDBをクリアしてv2から開始することを推奨
db.version(1).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open',
    trap_type: '++id, &name',
    catch: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber, permit_date, permit_expiry',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude',
    game_animal_list: '++id, species_name, category, is_game_animal', 
    settings: '&key',
    hunter_profile: '&key'
}).upgrade(tx => {
    // v1 -> v2 へのアップグレード
    // (catch -> catch_records へのデータ移行はここで行うが、
    // 開発中はDB削除の方が早いため、ここでは移行をスキップ)
    console.log("Upgrading schema from v1 to v2...");
    // v1 の 'catch' テーブルは v2 の定義で 'catch: null' がないため、
    // 自動的に削除されないが、v2 では 'catch_records' を使う
});


console.log("Database schema defined (db.js)");