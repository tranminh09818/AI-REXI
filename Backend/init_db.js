/**
 * AI REXI — SQLite Database Initializer
 * Chạy: node init_db.js
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'Database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'tro_ly_ai.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('[DB] Lỗi kết nối:', err.message);
    process.exit(1);
  }
  console.log('[DB] SQLite connected:', dbPath);
  initTables();
});

function initTables() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS nguoi_dung (
      ma_nguoi_dung TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      mat_khau_ma_hoa TEXT NOT NULL,
      ten_day_du TEXT,
      phan_quyen TEXT DEFAULT 'user',
      anh_dai_dien TEXT,
      otp_code TEXT,
      otp_expiry INTEGER,
      trang_thai TEXT DEFAULT 'active',
      ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS cuoc_hoi_thoai (
      ma_hoi_thoai TEXT PRIMARY KEY,
      ma_nguoi_dung TEXT NOT NULL,
      ma_thu_muc TEXT,
      tieu_de TEXT DEFAULT 'Trò chuyện mới',
      ten_mo_hinh_ai TEXT DEFAULT 'Gemini 3.5 Flash',
      trang_thai TEXT DEFAULT 'dang_mo',
      ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
      ngay_cap_nhat DATETIME DEFAULT CURRENT_TIMESTAMP,
      ngay_xoa DATETIME,
      FOREIGN KEY (ma_nguoi_dung) REFERENCES nguoi_dung(ma_nguoi_dung)
    )`,

    `CREATE TABLE IF NOT EXISTS tin_nhan (
      ma_tin_nhan TEXT PRIMARY KEY,
      ma_hoi_thoai TEXT NOT NULL,
      vai_tro TEXT NOT NULL,
      noi_dung TEXT NOT NULL,
      ngay_gui DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ma_hoi_thoai) REFERENCES cuoc_hoi_thoai(ma_hoi_thoai)
    )`,

    `CREATE TABLE IF NOT EXISTS khoa_api (
      ma_khoa TEXT PRIMARY KEY,
      ma_nguoi_dung TEXT,
      ten_nha_cung_cap TEXT NOT NULL,
      gia_tri_khoa TEXT NOT NULL,
      ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ma_nguoi_dung) REFERENCES nguoi_dung(ma_nguoi_dung)
    )`,

    `CREATE TABLE IF NOT EXISTS bo_nho_dai_han (
      ma_bo_nho TEXT PRIMARY KEY,
      loai TEXT DEFAULT 'thong_tin_user',
      noi_dung TEXT NOT NULL,
      do_uu_tien INTEGER DEFAULT 5,
      ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS ky_nang (
      ma_ky_nang TEXT PRIMARY KEY,
      ten_ky_nang TEXT NOT NULL,
      tieu_de TEXT,
      mo_ta TEXT,
      trang_thai TEXT DEFAULT 'kich_hoat'
    )`
  ];

  let pending = stmts.length;
  stmts.forEach((sql) => {
    db.run(sql, (err) => {
      if (err) console.error('[DB] Lỗi tạo bảng:', err.message);
      pending--;
      if (pending === 0) {
        console.log('[DB] ✅ Tất cả bảng đã được tạo thành công!');
        db.close();
      }
    });
  });
}
