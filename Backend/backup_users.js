require('dotenv').config({ path: 'D:/AI REXI/.env' });
const mssql = require('mssql/msnodesqlv8');

(async () => {
  const p = await mssql.connect({
    server: process.env.SQLSERVER_HOST,
    database: process.env.SQLSERVER_DB,
    options: { trustedConnection: true },
  });

  // Backup admin + keys
  const admin = await p.request().query("SELECT * FROM nguoi_dung WHERE ma_nguoi_dung = 'a1111111-1111-1111-1111-111111111111'");
  const keys = await p.request().query("SELECT * FROM khoa_api");
  const conversations = await p.request().query("SELECT * FROM cuoc_hoi_thoai");
  const projects = await p.request().query("SELECT * FROM thu_muc_du_an");

  const backup = {
    timestamp: new Date().toISOString(),
    users: admin.recordset,
    khoa_api: keys.recordset,
    cuoc_hoi_thoai: conversations.recordset,
    thu_muc_du_an: projects.recordset,
  };
  require('fs').writeFileSync('D:/Temp/opencode/backup_users_20260731.json', JSON.stringify(backup, null, 2));
  console.log('Backup OK:', backup.users.length, 'admin,', backup.khoa_api.length, 'keys,', backup.cuoc_hoi_thoai.length, 'convos');
  await p.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
