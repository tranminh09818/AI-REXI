const sql = require('mssql/msnodesqlv8');
const conn = { connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=.\\SQLEXPRESS;Database={AI REXI};Trusted_Connection=yes;` };
(async () => {
  try {
    const pool = await sql.connect(conn);
    const r = await pool.request()
      .input('newEmail', sql.NVarChar, 'admin@rexi.com')
      .input('oldEmail', sql.NVarChar, 'admin')
      .query("UPDATE nguoi_dung SET email = @newEmail WHERE email = @oldEmail");
    console.log('Rows updated:', r.rowsAffected);
    const chk = await pool.request().query("SELECT email, phan_quyen FROM nguoi_dung WHERE email LIKE '%rexi.com%' OR email='admin'");
    chk.recordset.forEach(u => console.log(' ', u.email, '|', u.phan_quyen));
    await pool.close();
  } catch (e) { console.error('ERR:', e.message); }
})();
