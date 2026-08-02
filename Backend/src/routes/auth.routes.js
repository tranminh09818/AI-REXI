const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authMiddleware, adminMiddleware, JWT_SECRET } = require('../middleware/auth.middleware');

function generateToken(user) {
    const payload = { id: user.ma_nguoi_dung, role: user.phan_quyen };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function sanitizeUser(user) {
    return {
        ma_nguoi_dung: user.ma_nguoi_dung,
        email: user.email,
        ten_day_du: user.ten_day_du,
        phan_quyen: user.phan_quyen,
        anh_dai_dien: user.anh_dai_dien || null
    };
}

// Tìm user hoặc tạo mới theo email
function findOrCreateUser(email, name, avatar, provider, done) {
    db.get("SELECT * FROM nguoi_dung WHERE email = ?", [email], (err, user) => {
        if (err) return done(err);
        if (user) {
            const updates = [];
            const params = [];
            if (name && name !== user.ten_day_du) { updates.push("ten_day_du = ?"); params.push(name); }
            if (avatar && avatar !== user.anh_dai_dien) { updates.push("anh_dai_dien = ?"); params.push(avatar); }
            if (updates.length > 0) {
                params.push(user.ma_nguoi_dung);
                db.run(`UPDATE nguoi_dung SET ${updates.join(', ')} WHERE ma_nguoi_dung = ?`, params, () => {
                    user.ten_day_du = name || user.ten_day_du;
                    user.anh_dai_dien = avatar || user.anh_dai_dien;
                    done(null, user);
                });
            } else {
                done(null, user);
            }
        } else {
            const maUser = crypto.randomUUID();
            const placeholderPass = crypto.randomBytes(16).toString('hex');
            db.run(
                "INSERT INTO nguoi_dung (ma_nguoi_dung, email, mat_khau_ma_hoa, ten_day_du, phan_quyen, anh_dai_dien) VALUES (?, ?, ?, ?, 'user', ?)",
                [maUser, email, placeholderPass, name || email.split('@')[0], avatar || null],
                function(err) {
                    if (err) return done(err);
                    done(null, {
                        ma_nguoi_dung: maUser,
                        email,
                        ten_day_du: name || email.split('@')[0],
                        phan_quyen: 'user',
                        anh_dai_dien: avatar || null
                    });
                }
            );
        }
    });
}

// Đăng ký
router.post('/register', async (req, res) => {
    const { account, email, password, ten_day_du } = req.body;
    const accountName = (account || email || '').trim();
    if (!accountName || !password) {
        return res.status(400).json({ error: 'Tài khoản và mật khẩu là bắt buộc.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const maUser = crypto.randomUUID();

    db.run(
        "INSERT INTO nguoi_dung (ma_nguoi_dung, email, mat_khau_ma_hoa, ten_day_du, phan_quyen) VALUES (?, ?, ?, ?, 'user')",
        [maUser, accountName, hashedPassword, ten_day_du || 'Người dùng mới'],
        (err) => {
            if (err) {
                return res.status(500).json({ error: 'Email này có thể đã tồn tại.' });
            }
            res.status(201).json({ success: true, message: 'Đăng ký thành công!' });
        }
    );
});

// Đăng nhập (Hỗ trợ cả email đầy đủ lẫn nickname/username ngắn như 'admin')
router.post('/login', (req, res) => {
    const { account, email, password } = req.body;
    const accountName = (account || email || '').trim();
    if (!accountName || !password) {
        return res.status(400).json({ error: 'Vui lòng nhập tài khoản và mật khẩu.' });
    }

    db.get(
        "SELECT * FROM nguoi_dung WHERE LOWER(email) = LOWER(?) OR LOWER(email) = LOWER(?) OR LOWER(email) LIKE LOWER(?)",
        [accountName, accountName === 'admin' ? 'admin@rexi.com' : accountName, accountName + '@%'],
        async (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng.' });
            }

            let isMatch = await bcrypt.compare(password, user.mat_khau_ma_hoa);

            if (!isMatch) {
                return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng.' });
            }

            const token = generateToken(user);
            res.json({ success: true, token, user: sanitizeUser(user) });
        }
    );
});

// Đăng nhập Google
router.post('/google', (req, res) => {
    const { credential } = req.body;
    if (!credential) {
        return res.status(400).json({ error: 'Thiếu Google credential.' });
    }

    try {
        const parts = credential.split('.');
        if (parts.length !== 3) {
            return res.status(400).json({ error: 'Credential không hợp lệ.' });
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        const email = payload.email;
        const name = payload.name || payload.given_name || email.split('@')[0];
        const avatar = payload.picture || null;

        if (!email) {
            return res.status(400).json({ error: 'Không lấy được email từ Google.' });
        }

        findOrCreateUser(email, name, avatar, 'google', (err, user) => {
            if (err) {
                console.error('[Auth] Google login error:', err);
                return res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập Google.' });
            }

            const token = generateToken(user);
            res.json({ success: true, token, user: sanitizeUser(user) });
        });

    } catch (e) {
        console.error('[Auth] Google credential decode error:', e);
        return res.status(400).json({ error: 'Credential Google không hợp lệ.' });
    }
});

// FORGOT / RESET PASSWORD
router.post('/forgot-password', (req, res) => {
    const { account, email } = req.body;
    const accountName = (account || email || '').trim();
    if (!accountName) {
        return res.status(400).json({ error: 'Vui lòng nhập tài khoản.' });
    }

    db.get("SELECT * FROM nguoi_dung WHERE email = ?", [accountName], (err, user) => {
        if (err || !user) {
            return res.json({ success: true, message: 'Nếu tài khoản tồn tại, mã OTP đã được tạo.' });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = Date.now() + 10 * 60 * 1000;

        db.run(
            "UPDATE nguoi_dung SET otp_code = ?, otp_expiry = ? WHERE ma_nguoi_dung = ?",
            [otpCode, otpExpiry, user.ma_nguoi_dung],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Lỗi hệ thống.' });
                }
                console.log(`[Auth] OTP for ${accountName}: ${otpCode}`);
                const payload = { success: true, message: 'Mã OTP đã được tạo.' };
                if (process.env.NODE_ENV !== 'production') payload.otp_debug = otpCode;
                res.json(payload);
            }
        );
    });
});

router.post('/reset-password', async (req, res) => {
    const { account, email, otp_code, new_password } = req.body;
    const accountName = (account || email || '').trim();
    if (!accountName || !otp_code || !new_password) {
        return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin.' });
    }
    if (new_password.length < 6) {
        return res.status(400).json({ error: 'Mật khẩu mới tối thiểu 6 ký tự.' });
    }

    db.get("SELECT * FROM nguoi_dung WHERE email = ?", [accountName], async (err, user) => {
        if (err || !user) {
            return res.status(400).json({ error: 'Tài khoản không tồn tại.' });
        }

        if (!user.otp_code || user.otp_code !== otp_code) {
            return res.status(400).json({ error: 'Mã OTP không đúng.' });
        }

        if (!user.otp_expiry || Date.now() > user.otp_expiry) {
            return res.status(400).json({ error: 'Mã OTP đã hết hạn. Vui lòng yêu cầu lại.' });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        db.run(
            "UPDATE nguoi_dung SET mat_khau_ma_hoa = ?, otp_code = NULL, otp_expiry = NULL WHERE ma_nguoi_dung = ?",
            [hashedPassword, user.ma_nguoi_dung],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Lỗi cập nhật mật khẩu.' });
                }
                res.json({ success: true, message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập.' });
            }
        );
    });
});

// ADMIN: Lấy danh sách tất cả người dùng
router.get('/users', [authMiddleware, adminMiddleware], (req, res) => {
    const { search = '', page = 1, limit = 8 } = req.query;
    const lm = parseInt(limit) || 8;
    const pg = parseInt(page) || 1;
    const offset = (pg - 1) * lm;

    const searchCondition = `WHERE email LIKE ? OR ten_day_du LIKE ?`;
    const searchParams = [`%${search}%`, `%${search}%`];

    const countQuery = `SELECT COUNT(*) as total FROM nguoi_dung ${search ? searchCondition : ''}`;

    db.get(countQuery, search ? searchParams : [], (err, row) => {
        if (err) return res.status(500).json({ error: 'Lỗi truy vấn CSDL (count).' });

        const totalUsers = row ? (row.total || row.TOTAL || 0) : 0;
        const totalPages = Math.ceil(totalUsers / lm) || 1;

        const dataQuery = `
            SELECT ma_nguoi_dung, email, ten_day_du, phan_quyen, trang_thai, anh_dai_dien, ngay_tao 
            FROM nguoi_dung 
            ${search ? searchCondition : ''}
            ORDER BY ngay_tao DESC 
            LIMIT ? OFFSET ?
        `;

        db.all(dataQuery, search ? [...searchParams, lm, offset] : [lm, offset], (err, users) => {
            if (err) {
                console.error('[ADMIN-USERS] Data query error:', err);
                return res.status(500).json({ error: 'Lỗi truy vấn CSDL (data).' });
            }

            res.json({ users: users || [], totalPages, currentPage: pg, totalUsers });
        });
    });
});

// ADMIN: Đổi phân quyền user
router.put('/users/:id/role', [authMiddleware, adminMiddleware], (req, res) => {
    const { id } = req.params;
    const { phan_quyen } = req.body;
    if (!['user', 'admin'].includes(phan_quyen)) {
        return res.status(400).json({ error: 'Phân quyền không hợp lệ. Chỉ chấp nhận: user, admin' });
    }
    if (req.user.id === id) {
        return res.status(400).json({ error: 'Không thể thay đổi quyền của chính mình.' });
    }
    db.run('UPDATE nguoi_dung SET phan_quyen = ? WHERE ma_nguoi_dung = ?', [phan_quyen, id], function(err) {
        if (err) return res.status(500).json({ error: 'Lỗi cập nhật phân quyền.' });
        if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy user.' });
        res.json({ success: true, message: `Đã đổi quyền thành ${phan_quyen}` });
    });
});

// ADMIN: Khoá / Mở khoá tài khoản
router.put('/users/:id/status', [authMiddleware, adminMiddleware], (req, res) => {
    const { id } = req.params;
    const { trang_thai } = req.body;
    if (!['active', 'banned'].includes(trang_thai)) {
        return res.status(400).json({ error: 'Trạng thái không hợp lệ. Chỉ chấp nhận: active, banned' });
    }
    if (req.user.id === id) {
        return res.status(400).json({ error: 'Không thể khoá tài khoản của chính mình.' });
    }
    db.run('UPDATE nguoi_dung SET trang_thai = ? WHERE ma_nguoi_dung = ?', [trang_thai, id], function(err) {
        if (err) return res.status(500).json({ error: 'Lỗi cập nhật trạng thái.' });
        if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy user.' });
        res.json({ success: true, trang_thai });
    });
});

// ADMIN: Thống kê hệ thống
router.get('/stats', [authMiddleware, adminMiddleware], (req, res) => {
    const results = {};
    db.get('SELECT COUNT(*) as total FROM nguoi_dung', [], (err, row) => {
        results.tong_user = row?.total || 0;
        db.get("SELECT COUNT(*) as total FROM nguoi_dung WHERE phan_quyen = 'admin'", [], (err2, row2) => {
            results.tong_admin = row2?.total || 0;
            db.get("SELECT COUNT(*) as total FROM nguoi_dung WHERE trang_thai = 'banned'", [], (err3, row3) => {
                results.tong_bi_khoa = row3?.total || 0;
                db.get('SELECT COUNT(*) as total FROM cuoc_hoi_thoai WHERE ngay_xoa IS NULL', [], (err4, row4) => {
                    results.tong_hoi_thoai = row4?.total || 0;
                    db.get('SELECT COUNT(*) as total FROM tin_nhan', [], (err5, row5) => {
                        results.tong_tin_nhan = row5?.total || 0;
                        db.get('SELECT COUNT(*) as total FROM cuoc_hoi_thoai WHERE ngay_xoa IS NOT NULL', [], (err6, row6) => {
                            results.tong_xoa_mem = row6?.total || 0;
                            res.json(results);
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;
