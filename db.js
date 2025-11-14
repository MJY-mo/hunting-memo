// このファイルは db.js です (修正版 v4)

// Dexie.js (IndexedDBラッパー) を初期化
const db = new Dexie('HuntingAppDB');

// --- データベースのスキーマ定義 ---
//
// ★ 修正: v4 にバージョンアップ
//
db.version(4).stores({
    /* 罠テーブル */
    // ★ 修正: ソート用に 'close_date' をインデックスに追加
    trap: '++id, trap_number, type, setup_date, close_date, latitude, longitude, memo, image_blob, is_open',
    
    /* 罠の種類テーブル */
    trap_type: '++id, &name',
    
    /* 捕獲記録テーブル (予約語 'catch' を回避) */
    catch_records: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age',
    
    /* 銃テーブル */
    gun: '++id, &name, type, caliber, permit_date, permit_expiry',
    
    /* 銃使用履歴テーブル */
    // ★ 修正: ソート用に 'use_date' をインデックスに追加 (gun.js で使用)
    gun_log: '++id, use_date, gun_id, purpose, location',
    
    /* 狩猟鳥獣図鑑テーブル */
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    
    /* チェックリスト */
    checklist_sets: '++id, &name', // ★ 修正: 独自のインデックス (名前の重複を許可しない)
    
    /* チェックリスト項目 */
    // ★ 修正: スキーマ v3 で欠落していた 'checklist_items' を追加
    // (list_id と name の組み合わせでユニーク)
    checklist_items: '++id, list_id, name, checked, &[list_id+name]',

    /* 設定テーブル */
    settings: '&key', // 'theme', 'fontSize'
    
    /* 狩猟者プロファイル */
    hunter_profile: '&key' // 'main'
});

// v3 の 'upgrade' 処理は不要 (v4 でクリーンに再定義)

console.log("Database schema defined (db.js v4)");