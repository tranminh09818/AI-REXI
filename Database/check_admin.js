const Database = require('better-sqlite3');
const db = new Database('tro_ly_ai.db');
const users = db.prepare('SELECT ma_nguoi_dung, email, ten_day_du, phan_quyen FROM nguoi_dung WHERE phan_quyen = "admin"').all();
console.log(users);