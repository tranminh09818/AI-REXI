const db = require('./src/config/db');
db.get("SELECT TOP 1 gia_tri_khoa FROM khoa_api WHERE LOWER(ten_nha_cung_cap)='groq'",[],(e,r)=>{
  console.log(r ? r.gia_tri_khoa : 'NONE');
  process.exit(0);
});
setTimeout(()=>process.exit(1),5000);
