const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

const email = 'admin';
const ten_day_du = 'Admin Rexi';
const password = 'admin@rexi.com';

const hash = bcrypt.hashSync(password, 10);

db.run('DELETE FROM nguoi_dung WHERE phan_quyen = ? AND email <> ?', ['admin', 'guest-default'], function (err) {
  if (err) {
    console.error('Loi xoa admin cu:', err.message);
    process.exit(1);
  }

  db.run(
    'INSERT INTO nguoi_dung (ma_nguoi_dung, email, mat_khau_ma_hoa, ten_day_du, phan_quyen, trang_thai) VALUES (?, ?, ?, ?, ?, ?)',
    ['a1111111-1111-1111-1111-111111111111', email, hash, ten_day_du, 'admin', 'active'],
    function (err, info) {
      if (err) {
        console.error('Loi tao admin moi:', err.message);
        process.exit(1);
      }
      console.log('Admin moi:', { email, password, ten_day_du, phan_quyen: 'admin', inserted: info && info.changes === 1 });
      process.exit(0);
    }
  );
});
