// Kiểm tra API keys đã lưu trong DB (chỉ in provider + độ dài key, không in key thật)
// db.js tự load dotenv từ D:/AI REXI/.env
const db = require('../Backend/src/config/db');
db.all("SELECT ten_nha_cung_cap, LEN(gia_tri_khoa) AS key_len FROM khoa_api", [], (err, rows) => {
  if (err) { console.error('Lỗi:', err.message); process.exit(1); }
  if (!rows || rows.length === 0) { console.log('Không có API key nào trong DB.'); }
  else { rows.forEach(r => console.log(`Provider: ${r.ten_nha_cung_cap} | key length: ${r.key_len}`)); }
  // Also check env GEMINI key presence
  console.log('Env GEMINI_API_KEY set:', !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE');
  process.exit(0);
});
