require('dotenv').config({ path: 'D:/AI REXI/.env' });
const mssql = require('mssql/msnodesqlv8');

(async () => {
  const p = await mssql.connect({
    server: process.env.SQLSERVER_HOST,
    database: process.env.SQLSERVER_DB,
    options: { trustedConnection: true },
  });
  const fks = await p.request().query(`
    SELECT fk.name AS fk_name, tp.name AS child, ref.name AS parent
    FROM sys.foreign_keys fk
    JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
    JOIN sys.tables ref ON fk.referenced_object_id = ref.object_id
    ORDER BY ref.name`);
  console.log('=== ALL FKs ===');
  fks.recordset.forEach(f => console.log(`  ${f.fk_name}: ${f.child} -> ${f.parent}`));

  const tok = await p.request().query('SELECT COUNT(*) AS n FROM luot_su_dung_token');
  console.log('luot_su_dung_token:', tok.recordset[0].n);

  // check tin_nhan cols
  const tn = await p.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tin_nhan'`);
  console.log('tin_nhan cols:', tn.recordset.map(c => c.COLUMN_NAME).join(', '));
  const lsdt = await p.request().query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'luot_su_dung_token'`);
  console.log('luot_su_dung_token cols:', lsdt.recordset.map(c => c.COLUMN_NAME).join(', '));

  await p.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
