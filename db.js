// このファイルは db.js です

// Dexie.js (index.htmlで読み込み済み) を使ってデータベースを定義します。
const db = new Dexie('BLNCRHuntingApp');

// データベースのスキーマ（構造）を定義
// '++id': 自動採番のプライマリキー
// '&trap_number': ユニーク（重複禁止）なインデックス
// 'close_date': 罠の開閉状態で検索するためのインデックス
// 'category': 区分で検索するためのインデックス


// --- ★ 修正: version(1) を先に定義します ---
db.version(1).stores({
  traps: `
    ++id,
    &trap_number,
    trap_type,
    close_date
  `,
  guns: `
    ++id,
    &gun_name
  `,
  gun_logs: `
    ++id,
    gun_id,
    use_date,
    purpose
  `,
  ammo_purchases: `
    ++id,
    ammo_type,
    purchase_date
  `,
  catches: `
    ++id,
    catch_date,
    method,
    relation_id,
    [method+catch_date]
  `,
  photos: `
    ++id,
    catch_id
  `,
  settings: `
    &key
  `
});

// --- ★ 修正: version(2) を v1 の後に定義します ---
// (v1 から v2 へのアップグレードが正しく動作するようになります)
db.version(2).stores({
  // 1. 罠管理ストア (categoryインデックスを追加)
  traps: `
    ++id,
    &trap_number,
    trap_type,
    close_date,
    category,
    [category+close_date]
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