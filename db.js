// このファイルは db.js です

// Dexie.js (IndexedDBラッパー) を初期化
const db = new Dexie('HuntingAppDB');

// --- データベースのスキーマ定義 ---
// バージョンは必ず古い順 (v1) から新しい順 (v2) に記述する

// v1 スキーマ (変更前の古い定義)
db.version(1).stores({
    trap: '++id, trap_number, type, setup_date, latitude, longitude, memo, image_blob, is_open',
    trap_type: '++id, &name',
    catch: '++id, trap_id, gun_log_id, catch_date, species_name, gender, age, memo, image_blob, latitude, longitude',
    gun: '++id, &name, type, caliber, permit_date, permit_expiry',
    gun_log: '++id, use_date, gun_id, purpose, location, memo, image_blob, latitude, longitude',
    game_animal_list: '++id, species_name, category, is_game_animal', 
    settings: '&key',
    hunter_profile: '&key'
});


// v2 スキーマ (最新の定義)
// ★ 修正: 'catch' -> 'catch_records' (予約語回避)
// ★ 修正: 'checklist_sets' を追加
// ★ 修正: 'game_animal_list' にカラム追加
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
    
    /* 狩猟鳥獣図鑑テーブル (★ v2でカラム追加) */
    game_animal_list: '++id, species_name, category, is_game_animal, description, image_1, image_2',
    
    /* ★ チェックリスト (v2で追加) */
    checklist_sets: '++id, name',
    
    /* 設定テーブル */
    settings: '&key', // 'theme', 'fontSize'
    
    /* 狩猟者プロファイル */
    hunter_profile: '&key', // 'main'

    /* v1で定義されていた 'catch' は、v2のstoresに含めないことで削除扱いとする */
    catch: null

}).upgrade(async (tx) => {
    // v1 -> v2 へのアップグレード処理
    // この処理は、v1のDBが存在する場合にのみ1回だけ実行される
    
    // (1) 古い 'catch' テーブルのデータを新しい 'catch_records' に移行
    console.log("Upgrading DB from v1 to v2... Migrating 'catch' to 'catch_records'...");
    try {
        const oldCatches = await tx.table('catch').toArray();
        if (oldCatches.length > 0) {
            await tx.table('catch_records').bulkAdd(oldCatches);
            console.log(`Migrated ${oldCatches.length} records.`);
        }
    } catch (err) {
        console.error("Failed to migrate 'catch' to 'catch_records'", err);
    }
    
    // (2) 'game_animal_list' はスキーマが変わった (カラム追加)
    // 既存の v1 データを削除し、main.js で v2 データを再投入させる
    console.log("Upgrading DB from v1 to v2... Clearing 'game_animal_list' for v2 re-population.");
    try {
        await tx.table('game_animal_list').clear();
    } catch (err) {
        console.error("Failed to clear 'game_animal_list' for upgrade", err);
    }
});


console.log("Database schema defined (db.js)");