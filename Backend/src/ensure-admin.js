const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./config/db');

let ADMIN_SEED = null;
// FIX PROD: ưu tiên cấu hình từ env (ADMIN_EMAIL + ADMIN_PASSWORD) — dùng được trên Render,
// không phụ thuộc file 'D:/AI REXI/...' chỉ tồn tại trên máy local.
const envEmail = (process.env.ADMIN_EMAIL || '').trim();
const envPassword = (process.env.ADMIN_PASSWORD || '').trim();
if (envEmail && envPassword) {
  ADMIN_SEED = {
    email: envEmail,
    mat_khau_ma_hoa_hash: bcrypt.hashSync(envPassword, 10),
    ten_day_du: (process.env.ADMIN_NAME || 'Admin').trim()
  };
  console.log('[ADMIN-SEED] Admin seed từ env (ADMIN_EMAIL)');
}
if (!ADMIN_SEED) {
  try {
    ADMIN_SEED = require('D:/AI REXI/Database/admin-seed.js');
  } catch (e) {
    // Fallback cuối: môi trường mới (máy khác / Render) không có file D:\ — vẫn đảm bảo
    // tồn tại 1 tài khoản admin để đăng nhập lần đầu, sau đó nên set ADMIN_EMAIL/ADMIN_PASSWORD.
    ADMIN_SEED = { email: 'admin@rexi.com', mat_khau_ma_hoa_hash: null, ten_day_du: 'Administrator' };
    console.warn('[ADMIN-SEED] ⚠️ Không có ADMIN_EMAIL/ADMIN_PASSWORD env và không có admin-seed.js — dùng fallback admin@rexi.com (mật khẩu ngẫu nhiên in bên dưới). Nên set ADMIN_EMAIL + ADMIN_PASSWORD trên Render để cấu hình cố định.');
  }
}

/**
 * Đảm bảo tài khoản admin cố định luôn tồn tại trong DB.
 * Chạy mỗi lần server khởi động.
 */
function ensureAdmin() {
    return new Promise((resolve, reject) => {
        if (!ADMIN_SEED) {
            console.log('[ADMIN-SEED] Skipped: no seed config');
            return resolve();
        }
        // Lấy adapter thực tế (có thể là SQLite/SQLServer/PostgreSQL)
        const dbInstance = db.constructor.name === 'SQLiteAdapter' ? db.db : db;

        // Kiểm tra đối tượng DB có method get không (SQLite)
        const query = typeof dbInstance.get === 'function'
            ? dbInstance.get.bind(dbInstance)
            : null;

        if (!query) {
            // Fallback: nếu không phải SQLite, dùng Promise nhưng không chặn startup
            console.log('[ADMIN-SEED] Skipped: non-SQLite DB detected');
            return resolve();
        }

        dbInstance.get(
            "SELECT ma_nguoi_dung, email, phan_quyen FROM nguoi_dung WHERE email = ?",
            [ADMIN_SEED.email],
            (err, user) => {
                if (err) {
                    console.error('[ADMIN-SEED] Query error:', err);
                    return resolve(); // Không chặn startup
                }

                if (user) {
                    // Chỉ đảm bảo admin role, KHÔNG reset password
                    console.log('[ADMIN-SEED] Admin exists, checking role for', ADMIN_SEED.email);
                    if (user.phan_quyen !== 'admin') {
                        dbInstance.run(
                            "UPDATE nguoi_dung SET phan_quyen = 'admin' WHERE email = ?",
                            [ADMIN_SEED.email],
                            () => resolve()
                        );
                    } else {
                        resolve();
                    }
                } else {
                    // Tạo admin mới
                    const maUser = crypto.randomUUID();
                    // FIX SECURITY: KHÔNG dùng mật khẩu mặc định dễ đoán — tạo ngẫu nhiên nếu seed chưa có hash
                    const seedPassword = ADMIN_SEED.mat_khau_ma_hoa_hash || crypto.randomBytes(9).toString('base64url');
                    const hashedPassword = bcrypt.hashSync(seedPassword, 10);

                    console.log('[ADMIN-SEED] Creating admin:', ADMIN_SEED.email);
                    if (!ADMIN_SEED.mat_khau_ma_hoa_hash) {
                            console.log('[ADMIN-SEED] ⚠️ Mật khẩu admin ban đầu (đăng nhập rồi đổi ngay):', seedPassword);
                    }
                    dbInstance.run(
                        "INSERT INTO nguoi_dung (ma_nguoi_dung, email, mat_khau_ma_hoa, ten_day_du, phan_quyen, anh_dai_dien) VALUES (?, ?, ?, ?, 'admin', ?)",
                        [maUser, ADMIN_SEED.email, hashedPassword, ADMIN_SEED.ten_day_du, null],
                        (err) => {
                            if (err) {
                                console.error('[ADMIN-SEED] Create error:', err);
                            } else {
                                console.log('[ADMIN-SEED] Admin created:', ADMIN_SEED.email);
                            }
                            resolve();
                        }
                    );
                }
            }
        );
    });
                    }

// ─── Guest user cố định ─────────────────────────────────
// Khách chưa đăng nhập vẫn cần một bản ghi nguoi_dung hợp lệ
// để cuoc_hoi_thoai.ma_nguoi_dung thỏa FK fk_hoi_thoai_user.
const GUEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const GUEST_EMAIL = 'guest@rexi.local';

function ensureGuestUser() {
    return new Promise((resolve) => {
        const dbInstance = db.constructor.name === 'SQLiteAdapter' ? db.db : db;
        const query = typeof dbInstance.get === 'function' ? dbInstance.get.bind(dbInstance) : null;
        if (!query) return resolve();

        dbInstance.get(
            "SELECT ma_nguoi_dung FROM nguoi_dung WHERE ma_nguoi_dung = ?",
            [GUEST_USER_ID],
            (err, row) => {
                if (err) {
                    console.error('[GUEST-SEED] Query error:', err);
                    return resolve();
                }
                if (row) return resolve();

                const hashedPassword = bcrypt.hashSync('guest-no-login', 10);
                dbInstance.run(
                    "INSERT INTO nguoi_dung (ma_nguoi_dung, email, mat_khau_ma_hoa, ten_day_du, phan_quyen, anh_dai_dien) VALUES (?, ?, ?, ?, 'guest', ?)",
                    [GUEST_USER_ID, GUEST_EMAIL, hashedPassword, 'Khách', null],
                    (err2) => {
                        if (err2) {
                            // Có thể email guest đã tồn tại với UUID khác — thử khớp theo email
                            dbInstance.get(
                                "SELECT ma_nguoi_dung FROM nguoi_dung WHERE email = ?",
                                [GUEST_EMAIL],
                                (err3, existing) => {
                                    if (!err3 && existing) console.log('[GUEST-SEED] Matched existing guest:', existing.ma_nguoi_dung);
                                    else console.error('[GUEST-SEED] Create error:', err2 && err2.message);
                                    resolve();
                                }
                            );
                        } else {
                            console.log('[GUEST-SEED] Guest user ready:', GUEST_EMAIL);
                            resolve();
                        }
                    }
                );
            }
        );
    });
                    }

module.exports = { ensureAdmin, ensureGuestUser, GUEST_USER_ID };
