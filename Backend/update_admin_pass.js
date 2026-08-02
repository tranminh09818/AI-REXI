const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('D:/AI REXI/Database/tro_ly_ai.db');

const newPass = 'admin123';
const hash = bcrypt.hashSync(newPass, 10);

db.prepare("UPDATE nguoi_dung SET mat_khau_ma_hoa = ? WHERE email = 'admin'").run(hash);
console.log('Updated admin password to:', newPass, 'hash:', hash);