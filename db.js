// このファイルは db.js です

// Dexie.js (index.htmlで読み込み済み) を使ってデータベースを定義します。
const db = new Dexie('BLNCRHuntingApp');

// データベースのスキーマ（構造）を定義
// '++id': 自動採番のプライマリキー
// '&trap_number': ユニーク（重複禁止）なインデックス
// 'use_date': 並び替え(ソート)に使うインデックス
// '[method+catch_date]': 複合インデックス
//
// ★ 私たちが設計した「将来の拡張性」を考慮し、
// スキーマ(schema)には検索/ソートに必要な最小限の
// 項目（インデックス）のみを定義します。
//
// `details: {}` や `additional_data: {}` のような
// 柔軟なオブジェクトは、スキーマに明記する必要はありません。
// これがDexie/IndexedDBの柔軟なところです。

db.version(1).stores({
  // 1. 罠管理ストア
  traps: `
    ++id,
    &trap_number,
    trap_type,
    close_date
  `,

  // 2. 所持銃マスタストア
  guns: `
    ++id,
    &gun_name
  `,

  // 3. 銃使用履歴ストア
  gun_logs: `
    ++id,
    gun_id,
    use_date,
    purpose
  `,

  // 4. 弾購入履歴ストア
  ammo_purchases: `
    ++id,
    ammo_type,
    purchase_date
  `,

  // 5. 捕獲個体ストア
  catches: `
    ++id,
    catch_date,
    method,
    relation_id,
    [method+catch_date]
  `,

  // 6. 写真ストア
  photos: `
    ++id,
    catch_id
  `,

  // 7. 設定ストア
  settings: `
    &key
  `
});

// これで、他のJSファイル (main.js, trap.js など) から
// 'db' というグローバル変数としてアクセスできます。
console.log("Database schema defined (db.js)");