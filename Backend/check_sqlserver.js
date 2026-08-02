const sql = require('mssql/msnodesqlv8');
const conn = {
  connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=.\\SQLEXPRESS;Database={AI REXI};Trusted_Connection=yes;`
};
(async () => {
  try {
    const pool = await sql.connect(conn);
    const r1 = await pool.request().query("SELECT TOP 10 ma_nguoi_dung, email, phan_quyen FROM nguoi_dung");
    console.log('USERS:');
    r1.recordset.forEach(u => console.log(' ', u.email, '|', u.phan_quyen));
    const r2 = await pool.request().query("SELECT ma_khoa, ten_nha_cung_cap, LEFT(gia_tri_khoa,8) + '...' AS key_head FROM khoa_api");
    console.log('API KEYS:');
    r2.recordset.forEach(k => console.log(' ', k.ten_nha_cung_cap, '=>', k.key_head));
    await pool.close();
  } catch (e) {
    console.error('ERR:', e.message);
  }
})();
