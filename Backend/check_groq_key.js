const db = require('better-sqlite3')('D:/AI REXI/Database/tro_ly_ai.db', { readonly: true });
const rows = db.prepare("SELECT ma_khoa, ten_nha_cung_cap, gia_tri_khoa FROM khoa_api").all();
rows.forEach(r => {
  const k = r.gia_tri_khoa || '';
  const masked = k.length > 10 ? k.substring(0, 6) + '...' + k.substring(k.length - 4) : '(short:' + k.length + ')';
  console.log(r.ten_nha_cung_cap, '=>', masked, 'len=' + k.length);
});
