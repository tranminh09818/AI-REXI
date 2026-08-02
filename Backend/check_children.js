require('dotenv').config({ path: 'D:/AI REXI/.env' });
const mssql = require('mssql/msnodesqlv8');

(async () => {
  const p = await mssql.connect({
    server: process.env.SQLSERVER_HOST,
    database: process.env.SQLSERVER_DB,
    options: { trustedConnection: true },
  });

  for (const t of ['khoa_api', 'thu_muc_du_an', 'cuoc_hoi_thoai']) {
    const cols = await p.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${t}' ORDER BY ORDINAL_POSITION`);
    console.log(`=== COLS ${t} ===`);
    console.log('  ' + cols.recordset.map(c => c.COLUMN_NAME).join(', '));
  }

  const ka = await p.request().query('SELECT ma_nguoi_dung, COUNT(*) AS n FROM khoa_api GROUP BY ma_nguoi_dung');
  console.log('=== khoa_api theo user ===');
  ka.recordset.forEach(r => console.log(`  ${r.ma_nguoi_dung}: ${r.n}`));

  const hd = await p.request().query('SELECT ma_nguoi_dung, COUNT(*) AS n FROM cuoc_hoi_thoai GROUP BY ma_nguoi_dung');
  console.log('=== cuoc_hoi_thoai theo user ===');
  hd.recordset.forEach(r => console.log(`  ${r.ma_nguoi_dung}: ${r.n}`));

  const da = await p.request().query('SELECT ma_nguoi_dung, COUNT(*) AS n FROM thu_muc_du_an GROUP BY ma_nguoi_dung');
  console.log('=== thu_muc_du_an theo user ===');
  da.recordset.forEach(r => console.log(`  ${r.ma_nguoi_dung}: ${r.n}`));

  await p.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
