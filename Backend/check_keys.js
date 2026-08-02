const sql = require('mssql/msnodesqlv8');

const config = {
  connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=(localdb)\\MSSQLLocalDB;Database=AI_REXI;Trusted_Connection=yes;`
};

async function main() {
  try {
    const pool = await sql.connect(config);
    console.log('Connected to SQL Server!\n');

    // Check khoa_api table
    const keysResult = await pool.request().query(`SELECT TOP 20 * FROM khoa_api`);
    console.log('=== KHOA_API TABLE ===');
    if (keysResult.recordset.length === 0) {
      console.log('(empty)');
    } else {
      keysResult.recordset.forEach(r => {
        const copy = {...r};
        Object.keys(copy).forEach(k => {
          if (typeof copy[k] === 'string' && copy[k].length > 20)
            copy[k] = copy[k].substring(0, 20) + '...[' + copy[k].length + ' chars]';
        });
        console.log(JSON.stringify(copy));
      });
    }

    // Check GROQ key specifically
    const groqResult = await pool.request().query(`SELECT TOP 5 * FROM khoa_api WHERE nha_cung_cap LIKE '%groq%' OR nha_cung_cap LIKE '%GROQ%'`);
    console.log('\n=== GROQ KEYS ===');
    groqResult.recordset.forEach(r => {
      const v = r.gia_tri_khoa || r.api_key || r.key_value || '';
      console.log(`Provider: ${r.nha_cung_cap}, Key: ${String(v).substring(0,20)}...[${String(v).length} chars]`);
    });
    if (groqResult.recordset.length === 0) console.log('(none)');

    await pool.close();
  } catch(e) {
    console.log('Error:', e.message);
  }
}

main();
