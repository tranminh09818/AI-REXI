const sql = require('mssql/msnodesqlv8');
const bcrypt = require('bcryptjs');
const conn = { connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=.\\SQLEXPRESS;Database={AI REXI};Trusted_Connection=yes;` };
(async () => {
  try {
    const pool = await sql.connect(conn);
    const hash = bcrypt.hashSync('admin123', 10);
    const r = await pool.request()
      .input('hash', sql.NVarChar, hash)
      .input('email', sql.NVarChar, 'admin')
      .query("UPDATE nguoi_dung SET mat_khau_ma_hoa = @hash WHERE email = @email");
    console.log('Rows updated:', r.rowsAffected);
    await pool.close();
  } catch (e) { console.error('ERR:', e.message); }
})();
