import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs/design-book");
const outputPath = path.join(outputDir, "QRTaste_Current_Project_Design.xlsx");

const wb = Workbook.create();

const theme = {
  navy: "#111827",
  slate: "#334155",
  muted: "#64748B",
  line: "#CBD5E1",
  panel: "#F8FAFC",
  blue: "#2563EB",
  green: "#059669",
  red: "#E11D48",
  amber: "#D97706",
  purple: "#7C3AED",
  white: "#FFFFFF",
};

const sheetNames = [
  "00_概要",
  "01_画面一覧",
  "02_業務フロー",
  "03_DB設計",
  "04_API_Store設計",
  "05_機能詳細",
  "06_マイグレーション",
  "07_運用_課題",
];

const sheets = Object.fromEntries(sheetNames.map((name) => [name, wb.worksheets.add(name)]));

const setWidths = (sheet, widths) => {
  widths.forEach((width, idx) => {
    sheet.getCell(0, idx).format.columnWidth = width;
  });
};

const title = (sheet, text, subtitle = "") => {
  sheet.showGridLines = false;
  sheet.getRange("A1:H1").merge();
  sheet.getRange("A1").values = [[text]];
  sheet.getRange("A1").format = {
    fill: theme.navy,
    font: { bold: true, color: theme.white, size: 18 },
  };
  sheet.getRange("A1").format.rowHeight = 34;
  if (subtitle) {
    sheet.getRange("A2:H2").merge();
    sheet.getRange("A2").values = [[subtitle]];
    sheet.getRange("A2").format = {
      fill: "#E2E8F0",
      font: { color: theme.slate, italic: true },
    };
  }
};

const writeTable = (sheet, startCell, headers, rows, options = {}) => {
  const startCol = startCell.match(/[A-Z]+/)[0];
  const startRow = Number(startCell.match(/\d+/)[0]);
  const colIndex = [...startCol].reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const rowIndex = startRow - 1;
  const matrix = [headers, ...rows];
  const range = sheet.getRangeByIndexes(rowIndex, colIndex, matrix.length, headers.length);
  range.values = matrix;
  range.format.borders = { preset: "all", style: "thin", color: theme.line };
  range.format.wrapText = true;
  range.format.verticalAlignment = "top";
  const headerRange = sheet.getRangeByIndexes(rowIndex, colIndex, 1, headers.length);
  headerRange.format = {
    fill: options.headerFill || theme.slate,
    font: { bold: true, color: theme.white },
  };
  for (let r = 1; r < matrix.length; r++) {
    if (r % 2 === 0) {
      sheet.getRangeByIndexes(rowIndex + r, colIndex, 1, headers.length).format.fill = theme.panel;
    }
  }
  return range;
};

const badge = (sheet, cell, text, color) => {
  sheet.getRange(cell).values = [[text]];
  sheet.getRange(cell).format = {
    fill: color,
    font: { color: theme.white, bold: true },
    horizontalAlignment: "center",
  };
};

// 00 Overview
{
  const s = sheets["00_概要"];
  title(s, "QRTaste Restaurant Ordering & POS System 設計書", "Current implementation snapshot / 2026-06-17");
  setWidths(s, [22, 26, 26, 26, 26, 26, 20, 20]);
  writeTable(
    s,
    "A4",
    ["項目", "内容"],
    [
      ["プロジェクト", "QRTaste Restaurant Ordering & POS System"],
      ["目的", "QRセルフオーダー、テーブル管理、厨房表示、会計、予約、メニュー設定、サービスコールを統合した飲食店/ホテル向けPOS基盤"],
      ["フロントエンド", "Nuxt 4, Vue 3, TypeScript, Tailwind CSS"],
      ["状態管理", "Pinia store-driven architecture"],
      ["バックエンド", "Supabase REST / Realtime / Auth"],
      ["DB Migration", "npm run migration -> scripts/run-migrations.mjs -> psql"],
      ["認証", "Supabase auth, persistSession enabled, route middleware"],
      ["印刷", "Table QR, Kitchen Order, Bill print flows"],
    ],
  );

  writeTable(
    s,
    "A15",
    ["領域", "実装済み機能", "主要ファイル"],
    [
      ["Dashboard / Live Ops", "テーブル状況、予約表示、厨房注文、サービスコール通知、設定", "app/pages/index.vue"],
      ["Customer QR Order", "カテゴリ別メニュー、数量、カスタム選択、注文メモ、食品のみTakeout、注文履歴", "app/pages/order/[table].vue"],
      ["Table Management", "セッション開始/更新、QR印刷、清掃/利用可、移動、統合、予約連動", "app/pages/admin/table.vue, TableSessionModal.vue"],
      ["Menu Management", "メニューCRUD、アレルゲン、日別提供数、選択グループ紐付け", "app/pages/admin/menu.vue"],
      ["Category / Options", "メインカテゴリ、サブカテゴリ、Mixer/Spicyなどの選択グループ管理", "app/pages/admin/category.vue"],
      ["Billing", "会計一覧、検索/フィルタ、詳細、支払済み、キャンセル、印刷", "app/pages/admin/billing.vue"],
      ["Reservations", "予約一覧、追加/編集/移動、キャンセル/No-show、座席確保", "app/pages/admin/reservation.vue, ReservationModal.vue"],
      ["Service Calls", "Call Staff / Need Water / Need Bill、繰り返し音、通知キュー、クリア", "app/stores/serviceCall.ts, app/pages/index.vue"],
    ],
  );

  badge(s, "D4", "Current", theme.green);
  badge(s, "E4", "Supabase", theme.blue);
  badge(s, "F4", "Mobile First", theme.purple);
}

// 01 Screens
{
  const s = sheets["01_画面一覧"];
  title(s, "画面一覧 / Screen Design", "Pages and major components currently implemented");
  setWidths(s, [24, 30, 44, 40, 28, 28]);
  writeTable(
    s,
    "A4",
    ["区分", "画面/部品", "役割", "主な操作", "データStore", "ファイル"],
    [
      ["Dashboard", "Live Operations", "従業員のメインオペレーション画面", "設定、Logout、QR印刷、注文ステータス更新、サービスコール処理", "table, order, bill, reservation, serviceCall, setting", "app/pages/index.vue"],
      ["Customer", "Self Order", "QRから開く顧客注文画面", "メニュー閲覧、数量選択、カスタム選択、Takeout、注文送信、注文確認、Call Staff", "menu, category, table, order, serviceCall", "app/pages/order/[table].vue"],
      ["Admin", "Table Management", "テーブルマスタ管理", "テーブル追加/編集/削除", "table", "app/pages/admin/table.vue"],
      ["Modal", "Table Session Modal", "席案内・滞在中管理", "開始、更新、清掃、利用可、移動、統合、予約追加/着席/キャンセル", "table, order, reservation", "app/components/TableSessionModal.vue"],
      ["Admin", "Reservation Management", "予約管理専用画面", "検索、ステータスフィルタ、追加、編集/移動、Cancel/No-show、Complete", "reservation, table", "app/pages/admin/reservation.vue"],
      ["Modal", "Reservation Modal", "共通予約追加モーダル", "予約追加、TableSessionからは対象テーブル固定", "reservation, table", "app/components/ReservationModal.vue"],
      ["Admin", "Menu Management", "メニュー商品管理", "追加/編集/削除、アレルゲン、選択グループ設定", "menu, category", "app/pages/admin/menu.vue"],
      ["Admin", "Category Management", "カテゴリ/選択グループ管理", "カテゴリ、サブカテゴリ、Option Group、Option Item CRUD", "category, menu", "app/pages/admin/category.vue"],
      ["Admin", "Availability", "日別メニュー提供数管理", "Unlimited / Limited / Sold Out", "menu", "app/pages/admin/inventory.vue"],
      ["Admin", "Billing", "会計管理", "検索/フィルタ、詳細、支払済み、キャンセル、印刷", "bill, table", "app/pages/admin/billing.vue"],
      ["Modal", "Checkout Modal", "テーブル会計", "会計作成、支払い方法、印刷、注文を請求済みにする", "bill, order, table, setting", "app/components/CheckoutModal.vue"],
      ["Modal", "Table QR Modal", "テーブルQR印刷", "QR生成、印刷", "qrcode", "app/components/TableQrModal.vue"],
      ["Common", "AppToast / Confirm / Settings", "通知、確認、アプリ設定", "toast, confirm, setting", "app/components/*.vue"],
    ],
  );
}

// 02 Flows
{
  const s = sheets["02_業務フロー"];
  title(s, "業務フロー / Business Workflow", "Real-world scenarios supported by the current app");
  setWidths(s, [26, 34, 52, 42, 34]);
  writeTable(
    s,
    "A4",
    ["業務", "開始条件", "流れ", "例外/制約", "関連データ"],
    [
      ["QR注文", "テーブルが存在し、QRページを開く", "顧客がメニューを選択 -> 数量/オプション/メモ -> 注文作成 -> 厨房に表示", "日別残数が0ならSold Out。Takeoutは食品のみ表示。", "orders, menu_items, menu_daily_availability"],
      ["注文カスタム", "メニューにOption Groupが紐付いている", "単一選択(Mixer/Spicy)または複数選択(Pizza Adjustments)を注文アイテムに保存", "Hard-coded Ice/Mixerは廃止。商品ごとに必要な選択だけ表示。", "menu_option_groups, menu_option_items, menu_item_option_groups, orders.items"],
      ["厨房オペレーション", "注文status=pending/preparing/ready", "注文カード表示 -> Preparing -> Ready -> Delivered", "Delivered/Completedは active queue から外れる", "orders.status"],
      ["テーブルセッション", "従業員がテーブルを選択", "客数/時間制限 -> Start Session -> 滞在タイマー表示", "当日予約がある場合、予約10分前までの時間制限必須", "tables, table_reservations"],
      ["テーブル移動", "客が別テーブルへ移る", "Move Sessionで空席へ移動。元テーブルはCleaningへ", "未会計注文は移動先へ引き継ぎ", "tables, orders.table_name"],
      ["テーブル統合", "別席の顧客が合流", "Merge bill/orders into target occupied table", "請求対象を1つにまとめる", "tables, orders"],
      ["清掃/利用可", "チェックアウト後または未注文の席", "Cleaning -> Available", "未会計注文が残る場合はCleaning/Available不可", "tables, orders.is_billed"],
      ["会計", "テーブルの未請求注文あり", "Checkout -> Bill作成 -> Payment Method -> Paid -> Print -> Table Cleaning", "オンライン/バーコード/カード/現金/その他対応", "table_bills, orders"],
      ["予約", "顧客が日時/人数を指定", "Add Reservation -> 当日テーブルカードに表示 -> Seat/Cancel/No-show", "同一テーブル同時刻の重複不可。席数超過不可。", "table_reservations"],
      ["サービスコール", "顧客がCall Staff/Need Water/Need Billを送信", "Dashboardにキュー表示 -> 3秒ごと音 -> 従業員が行き、該当行をタップ -> resolved", "複数コールは古い順に表示。Clear All可能。", "service_calls"],
    ],
  );
}

// 03 DB
{
  const s = sheets["03_DB設計"];
  title(s, "DB設計 / Supabase Tables", "Tables, key columns, and responsibilities");
  setWidths(s, [28, 48, 42, 42, 32]);
  writeTable(
    s,
    "A4",
    ["テーブル", "主なカラム", "役割", "制約/インデックス", "関連画面"],
    [
      ["tables", "id, name, seats, status, customerCount, startTime, timeLimit", "テーブルマスタと現在セッション状態", "status: available/occupied/reserved/cleaning; idx_tables_status", "Dashboard, Table Admin, TableSession"],
      ["table_reservations", "table_id, table_name, customer_name, customer_phone, guest_count, reserved_at, status, notes", "予約情報", "status: reserved/seated/cancelled/completed; table/time index", "Reservation, TableSession"],
      ["menu_categories", "id, name, sort_order, is_active", "メインカテゴリ", "name unique", "Category, Menu, Customer Order"],
      ["menu_sub_categories", "category_id, name, sort_order, is_active", "サブカテゴリ", "category FK", "Category, Menu, Customer Order"],
      ["menu_items", "name, description, price, image_url, category_id, sub_category_id, is_active, is_sold_out, allergens", "商品マスタ", "category index, active index, allergens GIN", "Menu, Customer Order"],
      ["menu_daily_availability", "menu_item_id, service_date, available_quantity, remaining_quantity, is_sold_out", "当日限定の提供数/売切れ管理", "unique(menu_item_id, service_date)", "Availability, Customer Order"],
      ["menu_option_groups", "name, selection_type, sort_order, is_active", "Mixer/Spicyなどの選択グループ", "selection_type: single/multiple", "Category, Menu, Customer Order"],
      ["menu_option_items", "group_id, name, sort_order, is_active", "選択肢", "unique(group_id, name)", "Category, Customer Order"],
      ["menu_item_option_groups", "menu_item_id, option_group_id", "商品と選択グループの関連", "primary key(menu_item_id, option_group_id)", "Menu, Customer Order"],
      ["orders", "table_id, table_name, items jsonb, total_price, status, is_billed, customer_note, order_type, priority", "顧客注文と厨房ステータス", "status: pending/preparing/ready/delivered/completed; order_type dine_in/takeout", "Customer Order, Dashboard, Checkout"],
      ["table_bills", "table_id, table_name, items, subtotal, tax_amount, total_price, payment_method, is_paid, paid_at, status", "会計/請求情報", "payment_method check; status unpaid/paid/cancelled", "Billing, Checkout"],
      ["coupons", "code, discount_type, discount_value, start_date, end_date, is_active", "クーポン基盤", "code unique; discount_type percent/fixed", "Future/Admin"],
      ["service_calls", "table_id, table_name, call_type, status, notes, created_at, resolved_at", "顧客から従業員への呼び出し", "status open/acknowledged/resolved; realtime publication", "Customer Order, Dashboard"],
      ["schema_migrations", "filename, applied_at", "Migration runner applied history", "filename primary key", "npm run migration"],
    ],
  );
}

// 04 Store
{
  const s = sheets["04_API_Store設計"];
  title(s, "API / Store設計", "Pinia stores and Supabase access responsibilities");
  setWidths(s, [28, 38, 48, 40, 28]);
  writeTable(
    s,
    "A4",
    ["Store/Module", "主な状態", "主なActions", "Supabaseテーブル", "ファイル"],
    [
      ["auth", "user/session", "login, logout, restore session", "auth", "app/stores/auth.ts"],
      ["table", "tables", "loadTables, create/update/delete, start/update session, setCleaning, resetTable, moveSession, mergeSession", "tables, orders", "app/stores/table.ts"],
      ["category", "categories, subCategories", "load/create/update/delete category/subcategory", "menu_categories, menu_sub_categories", "app/stores/category.ts"],
      ["menu", "menuItems, dailyAvailability, optionGroups/items/link table", "loadMenu, create/update/delete, setTodayAvailability, reduceTodayAvailability, option group CRUD/link", "menu_items, menu_daily_availability, menu_option_*", "app/stores/menu.ts"],
      ["order", "orders", "loadOrders, createOrder, updateStatus, markOrdersBilled, subscribeOrders", "orders", "app/stores/order.ts"],
      ["bill", "bills", "loadBills, createBill, markPaid, cancelBill, filters/revenue computed", "table_bills", "app/stores/bill.ts"],
      ["reservation", "reservations", "load/create/update/status, conflict check, today/next lookup", "table_reservations", "app/stores/reservation.ts"],
      ["serviceCall", "serviceCalls, realtimeStatus", "load, create, updateStatus, resolveOpenServiceCalls, subscribe/unsubscribe", "service_calls", "app/stores/serviceCall.ts"],
      ["setting", "restaurantName, defaultTimeLimit, taxRate, currencyLabel, enableSoundAlert", "loadSettings, saveSettings", "localStorage", "app/stores/setting.ts"],
      ["toast/confirm", "UI feedback state", "open/close, confirm", "none", "app/stores/toast.ts, confirm.ts"],
    ],
  );
}

// 05 Feature details
{
  const s = sheets["05_機能詳細"];
  title(s, "機能詳細 / Functional Specification", "Current behavior by feature");
  setWidths(s, [28, 42, 48, 46, 30]);
  writeTable(
    s,
    "A4",
    ["機能", "入力/操作", "処理", "出力/表示", "備考"],
    [
      ["日別提供数", "Availability画面でUnlimited/Limited/Sold Out設定", "menu_daily_availabilityへ当日分を保存。注文成功時にremaining_quantityを減算", "Customer Orderで残数/売切れ表示", "翌日はレコードなし扱いでUnlimitedへ戻る"],
      ["Takeout", "数量選択モーダル内の食品のみチェック", "order_typeをtakeout/dine_inで保存", "厨房カードにDINE IN/TAKEOUT表示", "飲料には表示しない設計"],
      ["注文メモ", "顧客がtextareaへ入力", "OrderItem.customization_noteへ保存", "厨房カードに赤字で表示", "アレルギーや要望を同一メモで扱う"],
      ["選択グループ", "Category画面でGroup/Item作成、Menu画面で商品へ紐付け", "singleは1つ、multipleは複数選択として注文item.customizationsへ保存", "顧客には対象商品に必要な選択だけ表示", "例: Rum Mixer, Pizza Adjustments, Spicy Level"],
      ["My Orders", "Customer OrderのView Orders", "現在テーブル/セッションの未会計注文を集約", "注文一覧と現在合計を表示", "注文数が多くても画面を埋めないモーダル形式"],
      ["サービスコール", "Call Staff / Need Water / Need Bill + optional note", "service_callsにopenで保存。Dashboardは2秒poll + realtime", "キュー通知、3秒リマインド音、タップでresolved", "Clear Allあり"],
      ["予約追加", "Reservation画面またはTableSessionからReservationModal", "席数/過去時刻/重複を検証しtable_reservationsへ保存", "予約一覧、当日テーブル表示", "TableSessionからは対象テーブル固定"],
      ["予約着席", "TableSessionでSeat", "予約statusをseatedにし、セッション開始", "客数と安全なtimeLimitを設定", "次予約10分前制約"],
      ["会計", "Checkout Modalで支払い方法選択", "bill作成、ordersをbilled/completedへ更新", "印刷、Billing一覧反映、テーブルCleaning", "検索/フィルタ対応"],
      ["認証維持", "ログイン後", "Supabase client persistSession true + auth plugin/middleware", "再読み込み後もセッション維持", "Logoutで解除"],
    ],
  );
}

// 06 Migrations
{
  const s = sheets["06_マイグレーション"];
  title(s, "Migration設計", "SQL migration files and runner behavior");
  setWidths(s, [34, 52, 50, 30]);
  writeTable(
    s,
    "A4",
    ["ファイル", "内容", "主な対象", "実行方法"],
    [
      ["app/database/init.sql", "初期スキーマ。tables, reservations, categories, menu_items, orders, table_bills", "Core tables and indexes", "manual baseline / migration target"],
      ["20260617_001_v2_pos_foundation.sql", "V2 POS基盤。sold out/allergens/order notes/type/bills status/coupons/service_calls/daily availability", "menu_items, orders, table_bills, coupons, service_calls", "npm run migration"],
      ["20260617_002_daily_menu_availability.sql", "日別提供数管理の安全追加", "menu_daily_availability", "npm run migration"],
      ["20260617_003_menu_option_groups.sql", "Reusable option group system", "menu_option_groups/items/link", "npm run migration"],
      ["20260617_004_service_calls_realtime.sql", "service_callsをSupabase realtime publicationへ追加", "service_calls realtime", "npm run migration"],
      ["scripts/run-migrations.mjs", "schema_migrationsで適用済みSQLを管理し、psqlで順番に実行", "all migration files", "SUPABASE_DB_URL or DATABASE_URL required"],
    ],
  );
  writeTable(
    s,
    "A14",
    ["環境変数", "用途", "例/注意"],
    [
      ["SUPABASE_URL", "Frontend Supabase project URL", "https://xxx.supabase.co"],
      ["SUPABASE_KEY", "Frontend anon key", "Nuxt public config"],
      ["SUPABASE_DB_URL / DATABASE_URL", "Migration runner DB connection", "psql接続文字列。REST API URLではない"],
    ],
  );
}

// 07 Operations / future
{
  const s = sheets["07_運用_課題"];
  title(s, "運用メモ / Remaining Items", "Current operating assumptions and future improvements");
  setWidths(s, [28, 42, 50, 32]);
  writeTable(
    s,
    "A4",
    ["分類", "現在の仕様", "注意点/課題", "優先度"],
    [
      ["Realtime", "orders/service_callsはSupabase realtime + polling fallback", "本番ではpublication/RLS policy確認が必要", "High"],
      ["RLS/Security", "クライアントからSupabase直接アクセス", "Role/policy設計は本番前に必須", "High"],
      ["Migration", "npm run migrationでSQL適用", "DB URLとpsqlが必要。REST API URLでは実行不可", "High"],
      ["Payment", "支払い方法は保存/印刷中心", "実決済 gateway 連携は未実装", "Medium"],
      ["Coupons", "DB基盤あり", "管理画面と請求計算への完全統合は今後", "Medium"],
      ["Analytics", "Revenueカード基盤あり", "日次/週次/月次、Top/Worst items、Peak hourは拡張余地", "Medium"],
      ["Inventory", "食材在庫ではなく日別メニュー提供数として実装", "仕入/原価/材料在庫は対象外", "Low"],
      ["Multi Branch", "branch_id未導入", "将来多店舗化時に全主要テーブルへbranch_id追加", "Future"],
      ["Printing", "ブラウザ印刷", "レシートプリンタ連携は環境別対応が必要", "Medium"],
    ],
  );
}

// General formatting.
for (const name of sheetNames) {
  const s = sheets[name];
  s.freezePanes.freezeRows(3);
  const used = s.getUsedRange();
  if (used) {
    used.format.font = { name: "Aptos", size: 10 };
    used.format.wrapText = true;
    used.format.verticalAlignment = "top";
  }
}

await fs.mkdir(outputDir, { recursive: true });

// Verification renders for all sheets.
for (const name of sheetNames) {
  const preview = await wb.render({
    sheetName: name,
    autoCrop: "all",
    scale: 1,
    format: "png",
  });
  await fs.writeFile(
    path.join(outputDir, `${name}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const errorScan = await wb.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "formula error scan",
});
console.log(errorScan.ndjson);

const overview = await wb.inspect({
  kind: "table",
  range: "00_概要!A1:H25",
  include: "values",
  tableMaxRows: 25,
  tableMaxCols: 8,
});
console.log(overview.ndjson);

const xlsx = await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(outputPath);
console.log(`saved:${outputPath}`);
