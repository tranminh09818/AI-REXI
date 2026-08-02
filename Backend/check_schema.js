require('dotenv').config({ path: 'D:/AI REXI/.env' });
const mssql = require('mssql/msnodesqlv8');

(async () => {
  const p = await mssql.connect({
    server: process.env.SQLSERVER_HOST,
    database: process.env.SQLSERVER_DB,
    options: { trustedConnection: true },
  });

  const cols = await p.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'nguoi_dung' ORDER BY ORDINAL_POSITION`);
  console.log('=== COLS nguoi_dung ===');
  cols.recordset.forEach(c => console.log(`  ${c.COLUMN_NAME} | ${c.DATA_TYPE}(${c.CHARACTER_MAXIMUM_LENGTH ?? ''}) | null=${c.IS_NULLABLE}`));

  const fks = await p.request().query(`
    SELECT fk.name AS fk_name, tp.name AS child, ref.name AS parent
    FROM sys.foreign_keys fk
    JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
    JOIN sys.tables ref ON fk.referenced_object_id = ref.object_id
    WHERE ref.name = 'nguoi_dung' OR tp.name = 'nguoi_dung'`);
  console.log('=== FKs liên quan nguoi_dung ===');
  fks.recordset.forEach(f => console.log(`  ${f.fk_name}: ${f.child} -> ${f.parent}`));

  const cnt = await p.request().query('SELECT COUNT(*) AS n FROM nguoi_dung');
  console.log('=== So nguoi_dung hien tai:', cnt.recordset[0].n);

  await p.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
