const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../src/config/db');

const email = process.env.ADMIN_EMAIL || 'admin@rexi.ai';
const ten_day_du = process.env.ADMIN_NAME || 'Admin Rexi';
const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64').replace(/[+/=]/g, ''); // Random password nếu không set env
const maUser = 'a1111111-1111-1111-1111-111111111111';

const hash = bcrypt.hashSync(password, 10);

db.run(
  'INSERT OR IGNORE INTO nguoi_dung (ma_nguoi_dung, email, mat_khau_ma_hoa, ten_day_du, phan_quyen, trang_thai) VALUES (?, ?, ?, ?, ?, ?)',
  [maUser, email, hash, ten_day_du, 'admin', 'active'],
  function (err) {
    if (err) {
      console.error('Loi tao admin:', err.message);
      process.exit(1);
    }
    console.log('Admin account ready:', { email, ten_day_du, password, phan_quyen: 'admin', ma_nguoi_dung: maUser });
    process.exit(0);
  }
);
