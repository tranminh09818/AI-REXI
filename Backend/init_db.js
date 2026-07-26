const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'Database', 'tro_ly_ai.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS bo_nho_dai_han (
    ma_bo_nho TEXT PRIMARY KEY,
    loai TEXT,
    noi_dung TEXT NOT NULL,
    do_uu_tien INTEGER DEFAULT 5,
    ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS thu_muc_hoi_thoai (
    ma_thu_muc TEXT PRIMARY KEY,
    ten TEXT NOT NULL,
    mau_sac TEXT DEFAULT '#6366f1',
    bieu_tuong TEXT DEFAULT '📁'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tags_hoi_thoai (
    ma_hoi_thoai TEXT NOT NULL,
    tag TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cron_tasks (
    ma_task TEXT PRIMARY KEY,
    ten TEXT NOT NULL,
    cron_expr TEXT NOT NULL,
    lenh TEXT NOT NULL,
    kich_hoat INTEGER DEFAULT 1,
    lan_chay_cuoi DATETIME
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tin_nhan_ghim (
    ma_tin_nhan TEXT PRIMARY KEY,
    ghi_chu TEXT,
    ngay_ghim DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert initial default memory for testing if empty
  db.get("SELECT COUNT(*) as count FROM bo_nho_dai_han", [], (err, row) => {
    if (row && row.count === 0) {
      db.run("INSERT INTO bo_nho_dai_han (ma_bo_nho, loai, noi_dung) VALUES ('m1', 'phong_cach_code', 'Ưu tiên sử dụng ES6 modules, async/await và viết code sạch có comment bằng tiếng Việt.')");
      db.run("INSERT INTO bo_nho_dai_han (ma_bo_nho, loai, noi_dung) VALUES ('m2', 'thong_tin_user', 'Người dùng tên là Tuấn, thích giao diện tối màu Cyberpunk / Tokyo Night và cần trợ lý AI hỗ trợ lập trình nhanh.')");
    }
    console.log('✅ CSDL tro_ly_ai.db đã khởi tạo đầy đủ các bảng mới thành công!');
    db.close();
  });
});

