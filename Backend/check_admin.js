require('dotenv').config({ path: 'D:/AI REXI/.env' });
const mssql = require('mssql/msnodesqlv8');

(async () => {
  const p = await mssql.connect({
    server: process.env.SQLSERVER_HOST,
    database: process.env.SQLSERVER_DB,
    options: { trustedConnection: true },
  });
  const r = await p.request().query("SELECT ma_nguoi_dung, email, ten_day_du, phan_quyen, anh_dai_dien FROM nguoi_dung WHERE phan_quyen = 'admin'");
  console.log(JSON.stringify(r.recordset, null, 2));
  await p.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
