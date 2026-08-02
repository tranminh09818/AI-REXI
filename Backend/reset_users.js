require('dotenv').config({ path: 'D:/AI REXI/.env' });
const mssql = require('mssql/msnodesqlv8');
const bcrypt = require('bcryptjs');

const ADMIN_ID = 'a1111111-1111-1111-1111-111111111111';
const DELETE_IDS = [
  'da717253-9d1a-451b-8989-c0e2e7819966',
  'f97ffe9d-3a18-4603-9890-354bf1330b5b',
  'guest-default',
  'u1111111-1111-1111-1111-111111111111',
];

(async () => {
  const p = await mssql.connect({
    server: process.env.SQLSERVER_HOST,
    database: process.env.SQLSERVER_DB,
    options: { trustedConnection: true },
  });

  // 1. Cập nhật admin
  const hash = await bcrypt.hash('admin@rexi.com', 10);
  const upd = await p.request()
    .input('pass', mssql.NVarChar, hash)
    .input('id', mssql.NVarChar, ADMIN_ID)
    .query("UPDATE nguoi_dung SET email = 'admin', mat_khau_ma_hoa = @pass, ten_day_du = 'Admin Rexi', phan_quyen = 'admin' WHERE ma_nguoi_dung = @id");
  console.log('Admin updated rows:', upd.rowsAffected[0]);

  for (const id of DELETE_IDS) {
    const convos = await p.request().input('id', mssql.NVarChar, id)
      .query("SELECT ma_hoi_thoai FROM cuoc_hoi_thoai WHERE ma_nguoi_dung = @id");
    for (const c of convos.recordset) {
      const cid = c.ma_hoi_thoai;
      const del = (sql) => p.request().input('cid', mssql.NVarChar, cid).query(sql).catch(() => console.log('  (skip)', sql.slice(0, 40)));
      await del("DELETE FROM cac_buoc_xu_ly WHERE ma_tin_nhan IN (SELECT ma_tin_nhan FROM tin_nhan WHERE ma_hoi_thoai = @cid)");
      await del("DELETE FROM tin_nhan_ghim WHERE ma_tin_nhan IN (SELECT ma_tin_nhan FROM tin_nhan WHERE ma_hoi_thoai = @cid)");
      await del("DELETE FROM danh_gia_cau_tra_loi WHERE ma_tin_nhan IN (SELECT ma_tin_nhan FROM tin_nhan WHERE ma_hoi_thoai = @cid)");
      await del("DELETE FROM tin_nhan WHERE ma_hoi_thoai = @cid");
      await del("DELETE FROM tien_trinh_chay_ngam WHERE ma_hoi_thoai = @cid");
      await del("DELETE FROM hoi_thoai_ky_nang WHERE ma_hoi_thoai = @cid");
      await del("DELETE FROM luot_su_dung_token WHERE ma_hoi_thoai = @cid");
      await del("DELETE FROM tags_hoi_thoai WHERE ma_hoi_thoai = @cid");
      await del("DELETE FROM tai_lieu_dau_ra WHERE ma_hoi_thoai = @cid");
      await del("DELETE FROM cuoc_hoi_thoai WHERE ma_hoi_thoai = @cid");
    }
    await p.request().input('id', mssql.NVarChar, id).query("DELETE FROM thu_muc_du_an WHERE ma_nguoi_dung = @id");
    await p.request().input('id', mssql.NVarChar, id).query("DELETE FROM nguoi_dung WHERE ma_nguoi_dung = @id");
    console.log('Deleted user:', id, '(', convos.recordset.length, 'convos)');
  }

  const r = await p.request().query("SELECT ma_nguoi_dung, email, ten_day_du, phan_quyen FROM nguoi_dung");
  console.log('=== Remaining users ===');
  r.recordset.forEach(u => console.log(`  ${u.ma_nguoi_dung} | ${u.email} | ${u.ten_day_du} | ${u.phan_quyen}`));

  const keys = await p.request().query('SELECT COUNT(*) AS n FROM khoa_api');
  console.log('Keys remain:', keys.recordset[0].n);

  await p.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
