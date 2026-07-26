const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', '..', 'Database', 'tro_ly_ai.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Lỗi kết nối cơ sở dữ liệu SQLite:', err.message);
  } else {
    console.log('Đã kết nối thành công với cơ sở dữ liệu SQLite tại ' + dbPath);
    db.run("PRAGMA foreign_keys = ON;");
    taoUserMauNeuChuaCo();
  }
});

function taoUserMauNeuChuaCo() {
  const maUser = "u1111111-1111-1111-1111-111111111111";
  const maThuMuc = "w2222222-2222-2222-2222-222222222222";

  db.get("SELECT ma_nguoi_dung FROM nguoi_dung WHERE ma_nguoi_dung = ?", [maUser], (err, row) => {
    if (!row) {
      db.run(`
        INSERT INTO nguoi_dung (ma_nguoi_dung, email, mat_khau_ma_hoa, ten_day_du, cai_dat_ca_nhan) 
        VALUES (?, 'user@rexi.ai', 'hashed_pass', 'Người Dùng Thử Nghiệm', '{}')
      `, [maUser], (err) => {
        if (!err) {
          db.run(`
            INSERT INTO thu_muc_du_an (ma_thu_muc, ma_nguoi_dung, ten_thu_muc, duong_dan_may_tinh)
            VALUES (?, ?, 'AI REXI Project', 'D:\\AI REXI')
          `, [maThuMuc, maUser]);

          const skillsList = [
            ["s1", "ponytail", "Chế độ tối giản", "Tự động rút gọn code, ưu tiên thư viện lõi.", "kich_hoat"],
            ["s2", "windows-interactive-screenshot", "Chụp ảnh màn hình", "Agent chụp màn hình máy tính thông qua Scheduled Tasks.", "kich_hoat"],
            ["s3", "web-browser", "Duyệt Web", "Tìm kiếm thông tin thời gian thực.", "kich_hoat"]
          ];
          skillsList.forEach(s => {
            db.run("INSERT OR IGNORE INTO ky_nang (ma_ky_nang, ten_ky_nang, tieu_de, mo_ta, trang_thai) VALUES (?, ?, ?, ?, ?)", s);
          });
        }
      });
    }
  });
}

module.exports = db;
