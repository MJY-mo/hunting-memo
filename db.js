// このファイルは db.js です

// Dexie.js (IndexedDBラッパー) を初期化
const db = new Dexie('HuntingAppDB');

// --- データベースのスキーマ定義 ---
//
// ★ 修正: v3 に強制バージョンアップ
// v1, v2 の古い定義と複雑な upgrade 処理をすべて破棄し、
// 最新の v3 スキーマのみを定義する。
// これにより、ブラウザは古いDBを破棄し、v3 でクリーンに再作成する。
//
db.version(3).stores({
    /* 罠テーブル */
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open',
    
    /* 罠の種類テーブル */
    trap_type: '++id, &name',
    
    /* 捕獲記録テーブル (予約語 'catch' を回避) */
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age',
    
    /* 銃テーブル */
    gun: '++id, &name, type, caliber, permit_date, permit_expiry',
    
    /* 銃使用履歴テーブル */
    gun_log: '++id, use_date, gun_id, purpose, location',
    
    /* 狩猟鳥獣図鑑テーブル */
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    
    /* チェックリスト */
    checklist_sets: '++id, name',
    
    /* 設定テーブル */
    settings: '&key', // 'theme', 'fontSize'
    
    /* 狩猟者プロファイル */
    hunter_profile: '&key' // 'main'
});

// v1, v2 の定義は意図的に削除 (v3 への強制移行のため)

console.log("Database schema defined (db.js)");