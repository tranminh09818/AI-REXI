const sql = require('mssql/msnodesqlv8');
const config = { connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=(localdb)\\MSSQLLocalDB;Database=AI_REXI;Trusted_Connection=yes;' };
(async () => {
  try {
    const pool = await sql.connect(config);
    const r = await pool.request().query('SELECT nha_cung_cap, gia_tri_khoa, trang_thai FROM khoa_api');
    r.recordset.forEach(row => console.log(row.nha_cung_cap + ' | ' + String(row.gia_tri_khoa).substring(0, 30) + '... | ' + row.trang_thai));
    await pool.close();
  } catch(e) { console.log('ERROR: ' + e.message); }
})();
