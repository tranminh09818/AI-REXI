require('dotenv').config({ path: 'D:/AI REXI/.env' });
const mssql = require('mssql/msnodesqlv8');

(async () => {
  const p = await mssql.connect({
    server: process.env.SQLSERVER_HOST,
    database: process.env.SQLSERVER_DB,
    options: { trustedConnection: true },
  });

  const all = await p.request().query('SELECT ma_nguoi_dung, email, ten_day_du, phan_quyen FROM nguoi_dung');
  console.log('=== ALL USERS ===');
  all.recordset.forEach(u => console.log(`  ${u.ma_nguoi_dung} | ${u.email} | ${u.ten_day_du} | ${u.phan_quyen}`));

  const fk = await p.request().query(`
    SELECT fk.name AS fk_name, tp.name AS child, delete_referential_action_desc
    FROM sys.foreign_keys fk
    JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
    WHERE fk.referenced_object_id = OBJECT_ID('nguoi_dung')`);
  console.log('=== FK DELETE RULES ===');
  fk.recordset.forEach(f => console.log(`  ${f.fk_name} (${f.child}): ${f.delete_referential_action_desc}`));

  for (const t of ['thu_muc_du_an', 'cuoc_hoi_thoai', 'khoa_api']) {
    const r = await p.request().query(`SELECT COUNT(*) AS n FROM ${t}`);
    console.log(`  ${t}: ${r.recordset[0].n} rows`);
  }

  await p.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
