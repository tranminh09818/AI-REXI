const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'rexi_salt_2026').digest('hex');
}

router.post('/auth/register', (req, res) => {
  const { email, password, full_name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email và mật khẩu không được để trống' });
  }

  const maUser = crypto.randomUUID();
  const hashedPassword = hashPassword(password);
  const tenDayDu = full_name || email.split('@')[0];

  db.get("SELECT ma_nguoi_dung FROM nguoi_dung WHERE email = ?", [email.trim().toLowerCase()], (err, row) => {
    if (row) {
      return res.status(400).json({ error: 'Email này đã được đăng ký tài khoản.' });
    }

    db.run(
      `INSERT INTO nguoi_dung (ma_nguoi_dung, email, mat_khau_ma_hoa, ten_day_du, cai_dat_ca_nhan)
       VALUES (?, ?, ?, ?, '{}')`,
      [maUser, email.trim().toLowerCase(), hashedPassword, tenDayDu],
      (err) => {
        if (err) return res.status(500).json({ error: 'Lỗi đăng ký: ' + err.message });
        
        const maThuMuc = crypto.randomUUID();
        db.run(
          `INSERT INTO thu_muc_du_an (ma_thu_muc, ma_nguoi_dung, ten_thu_muc, duong_dan_may_tinh)
           VALUES (?, ?, 'My Rexi Workspace', 'D:\\\\AI REXI')`,
          [maThuMuc, maUser]
        );

        res.json({
          success: true,
          user: { ma_nguoi_dung: maUser, email: email.trim().toLowerCase(), ten_day_du: tenDayDu }
        });
      }
    );
  });
});

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập Email và Mật khẩu' });
  }

  const hashedPassword = hashPassword(password);

  db.get(
    "SELECT ma_nguoi_dung, email, ten_day_du FROM nguoi_dung WHERE email = ? AND mat_khau_ma_hoa = ?",
    [email.trim().toLowerCase(), hashedPassword],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) {
        return res.status(401).json({ error: 'Email hoặc mật khẩu không chính xác.' });
      }

      res.json({
        success: true,
        user: { ma_nguoi_dung: row.ma_nguoi_dung, email: row.email, ten_day_du: row.ten_day_du }
      });
    }
  );
});

router.get('/auth/me', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Chưa đăng nhập' });

  db.get("SELECT ma_nguoi_dung, email, ten_day_du FROM nguoi_dung WHERE ma_nguoi_dung = ?", [userId], (err, row) => {
    if (err || !row) return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    res.json({ user: row });
  });
});

router.post('/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email không được để trống' });

  db.get("SELECT ma_nguoi_dung, ten_day_du FROM nguoi_dung WHERE email = ?", [email.trim().toLowerCase()], (err, row) => {
    if (!row) {
      return res.status(404).json({ error: 'Email này chưa được đăng ký tài khoản.' });
    }

    const newPassword = Math.random().toString(36).slice(-8).toUpperCase();
    const hashedNew = hashPassword(newPassword);

    db.run("UPDATE nguoi_dung SET mat_khau_ma_hoa = ? WHERE email = ?", [hashedNew, email.trim().toLowerCase()], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      console.log('[Auth] Password reset for', email, '→ New temp password:', newPassword);

      res.json({
        success: true,
        message: 'Mật khẩu tạm thời đã được tạo thành công.',
        _dev_temp_password: newPassword
      });
    });
  });
});

router.post('/auth/google', async (req, res) => {
  const { credential, email, name, picture } = req.body;
  if (!email) return res.status(400).json({ error: 'Thiếu thông tin Google OAuth' });

  const maUserGoogle = 'google_' + crypto.createHash('md5').update(email).digest('hex');

  db.get("SELECT * FROM nguoi_dung WHERE email = ?", [email.toLowerCase()], (err, existing) => {
    if (existing) {
      return res.json({ success: true, user: { ma_nguoi_dung: existing.ma_nguoi_dung, email: existing.email, ten_day_du: existing.ten_day_du, avatar_url: picture || null, provider: 'google' } });
    }

    db.run(
      `INSERT OR IGNORE INTO nguoi_dung (ma_nguoi_dung, email, mat_khau_ma_hoa, ten_day_du, cai_dat_ca_nhan)
       VALUES (?, ?, 'google_oauth_no_password', ?, '{}')`,
      [maUserGoogle, email.toLowerCase(), name || email.split('@')[0]],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ success: true, user: { ma_nguoi_dung: maUserGoogle, email: email.toLowerCase(), ten_day_du: name || email.split('@')[0], avatar_url: picture || null, provider: 'google' } });
      }
    );
  });
});

router.delete('/admin/users/:ma_nguoi_dung', (req, res) => {
  const { ma_nguoi_dung } = req.params;
  if (ma_nguoi_dung === 'u1111111-1111-1111-1111-111111111111') {
    return res.status(400).json({ error: 'Không thể xóa tài khoản Admin mặc định!' });
  }
  
  db.run("DELETE FROM tin_nhan WHERE ma_hoi_thoai IN (SELECT ma_hoi_thoai FROM cuoc_hoi_thoai WHERE ma_nguoi_dung = ?)", [ma_nguoi_dung], (err) => {
    db.run("DELETE FROM cuoc_hoi_thoai WHERE ma_nguoi_dung = ?", [ma_nguoi_dung], (err2) => {
      db.run("DELETE FROM nguoi_dung WHERE ma_nguoi_dung = ?", [ma_nguoi_dung], (err3) => {
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ success: true, message: 'Đã xóa tài khoản và mọi dữ liệu liên quan thành công!' });
      });
    });
  });
});

router.post('/admin/keys', (req, res) => {
  const { ten_nha_cung_cap, gia_tri_khoa } = req.body;
  if (!ten_nha_cung_cap || !gia_tri_khoa) {
    return res.status(400).json({ error: 'Thiếu thông tin Provider hoặc API Key' });
  }

  const keyId = 'k_' + ten_nha_cung_cap;
  const maUser = "u1111111-1111-1111-1111-111111111111";

  db.run(
    `INSERT INTO khoa_api (ma_khoa, ma_nguoi_dung, ten_nha_cung_cap, gia_tri_khoa) 
     VALUES (?, ?, ?, ?) 
     ON CONFLICT(ma_khoa) DO UPDATE SET gia_tri_khoa = excluded.gia_tri_khoa`,
    [keyId, maUser, ten_nha_cung_cap, gia_tri_khoa.trim()],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Cấu hình API Key hệ thống thành công!' });
    }
  );
});

module.exports = router;
