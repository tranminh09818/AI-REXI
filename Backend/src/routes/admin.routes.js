/**
 * Admin IPTV Monitor Routes
 * 
 * GET  /api/admin/iptv/status       - Trạng thái scan mới nhất
 * GET  /api/admin/iptv/stats        - Thống kê tổng hợp (theo quốc gia, danh mục)
 * GET  /api/admin/iptv/channels     - Danh sách kênh (filter: country, status, search, page)
 * GET  /api/admin/iptv/countries    - Danh sách quốc gia có kênh + flag + số lượng
 * GET  /api/admin/iptv/scan-history - Lịch sử các lần scan
 * GET  /api/admin/iptv/changes      - Kênh mới/mất giữa 2 lần scan gần nhất
 * POST /api/admin/iptv/scan-now     - Kích hoạt scan thủ công
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.middleware');

const DB_PATH = path.join(__dirname, '..', '..', '..', 'Database', 'tro_ly_ai.db');
let db;
try { db = new (require('better-sqlite3'))(DB_PATH); } catch(e) { db = null; }
function getDB() {
  if (!db) { try { db = new (require('better-sqlite3'))(DB_PATH); } catch(e) { return null; } }
  return db;
}

// Đảm bảo các bảng IPTV tồn tại (giống schema trong scripts/scan_full.js)
// → Admin không bị crash khi scan lần đầu chưa chạy.
function ensureSchema() {
  const d = getDB();
  if (!d) return null;
  try {
    d.exec(`
      CREATE TABLE IF NOT EXISTS iptv_scan_log (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT NOT NULL, finished_at TEXT, status TEXT DEFAULT 'running', total_channels INTEGER DEFAULT 0, online_channels INTEGER DEFAULT 0, offline_channels INTEGER DEFAULT 0, countries_scanned INTEGER DEFAULT 0, new_channels INTEGER DEFAULT 0, lost_channels INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS iptv_channels (id INTEGER PRIMARY KEY AUTOINCREMENT, country TEXT NOT NULL, country_name TEXT DEFAULT '', group_name TEXT DEFAULT '', channel_name TEXT NOT NULL, url TEXT NOT NULL, logo TEXT DEFAULT '', status TEXT DEFAULT 'unknown', latency_ms INTEGER DEFAULT 0, http_code INTEGER DEFAULT 0, last_checked TEXT, last_online TEXT, first_seen TEXT DEFAULT (datetime('now')), scan_id INTEGER REFERENCES iptv_scan_log(id));
      CREATE TABLE IF NOT EXISTS iptv_notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT DEFAULT '', data TEXT DEFAULT '{}', is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
      CREATE INDEX IF NOT EXISTS idx_iptv_url ON iptv_channels(url);
      CREATE INDEX IF NOT EXISTS idx_iptv_country ON iptv_channels(country);
      CREATE INDEX IF NOT EXISTS idx_iptv_status ON iptv_channels(status);
      CREATE INDEX IF NOT EXISTS idx_notif_read ON iptv_notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notif_created ON iptv_notifications(created_at DESC);
    `);
    return d;
  } catch (e) { return null; }
}

function tableExists(name) {
  const d = getDB();
  if (!d) return false;
  try { return !!d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(name); } catch { return false; }
}

const NO_DATA = { success: true, no_data: true, message: 'Chưa có dữ liệu scan. Hãy bấm nút "Quét kênh" để bắt đầu lần đầu tiên.' };

function getFlag(code) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
}

router.use(authMiddleware);
router.use(adminMiddleware);

// ─── Trạng thái scan ─────────────────────────────────────────
router.get('/status', (req, res) => {
  const d = ensureSchema();
  if (!d || !tableExists('iptv_channels')) return res.json({ success: true, status: 'no_data', lastScan: null, online: 0, total: 0 });

  const lastScan = d.prepare("SELECT * FROM iptv_scan_log WHERE status='done' ORDER BY id DESC LIMIT 1").get();
  const totalOnline = d.prepare("SELECT COUNT(*) as cnt FROM iptv_channels WHERE status='online' AND last_checked IS NOT NULL").get();
  const totalAll = d.prepare("SELECT COUNT(*) as cnt FROM iptv_channels WHERE last_checked IS NOT NULL").get();
  const running = d.prepare("SELECT * FROM iptv_scan_log WHERE status='running' ORDER BY id DESC LIMIT 1").get();

  res.json({
    success: true,
    last_scan: lastScan || null,
    is_running: !!running,
    running_since: running?.started_at || null,
    total_online: totalOnline?.cnt || 0,
    total_channels: totalAll?.cnt || 0,
  });
});

// ─── Thống kê ────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const d = ensureSchema();
  if (!d || !tableExists('iptv_channels')) return res.json(NO_DATA);

  const totalOnline = d.prepare("SELECT COUNT(*) as cnt FROM iptv_channels WHERE status='online' AND last_checked IS NOT NULL").get()?.cnt || 0;
  const totalAll = d.prepare("SELECT COUNT(*) as cnt FROM iptv_channels WHERE last_checked IS NOT NULL").get()?.cnt || 0;
  const countriesScanned = d.prepare("SELECT COUNT(DISTINCT country) as cnt FROM iptv_channels WHERE last_checked IS NOT NULL").get()?.cnt || 0;

  const byCountry = d.prepare(`
    SELECT country, MIN(country_name) as name,
      COUNT(*) as total,
      SUM(CASE WHEN status='online' THEN 1 ELSE 0 END) as online,
      SUM(CASE WHEN status='offline' THEN 1 ELSE 0 END) as offline,
      ROUND(AVG(CASE WHEN latency_ms > 0 THEN CAST(latency_ms AS REAL) ELSE NULL END)) as avg_latency
    FROM iptv_channels WHERE last_checked IS NOT NULL
    GROUP BY country ORDER BY total DESC
  `).all();

  const byGroup = d.prepare(`
    SELECT group_name, COUNT(*) as total,
      SUM(CASE WHEN status='online' THEN 1 ELSE 0 END) as online
    FROM iptv_channels WHERE last_checked IS NOT NULL
    GROUP BY group_name ORDER BY total DESC
  `).all();

  res.json({
    success: true,
    summary: {
      total_online: totalOnline,
      total_all: totalAll,
      countries_scanned: countriesScanned,
      online_pct: totalAll > 0 ? ((totalOnline / totalAll) * 100).toFixed(1) : '0',
    },
    by_country: byCountry,
    by_group: byGroup,
  });
});

// ─── Danh sách kênh (phân trang + filter) ────────────────────
router.get('/channels', (req, res) => {
  const d = ensureSchema();
  if (!d || !tableExists('iptv_channels')) return res.json(NO_DATA);

  const { country, status, category, search, page = 1, limit = 100 } = req.query;
  const pg = Math.max(1, parseInt(page));
  const lm = Math.min(500, Math.max(10, parseInt(limit) || 100));
  const offset = (pg - 1) * lm;

  const clauses = ['last_checked IS NOT NULL'];
  const params = [];

  if (country) { clauses.push('country = ?'); params.push(country.toUpperCase()); }
  if (status) { clauses.push('status = ?'); params.push(status); }
  if (category) { clauses.push('group_name = ?'); params.push(category); }
  if (search) { clauses.push("channel_name LIKE ?"); params.push(`%${search}%`); }

  const whereClause = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const total = d.prepare(`SELECT COUNT(*) as cnt FROM iptv_channels ${whereClause}`).get(...params)?.cnt || 0;

  const rows = d.prepare(`
    SELECT * FROM iptv_channels ${whereClause}
    ORDER BY status DESC, latency_ms ASC LIMIT ? OFFSET ?
  `).all(...params, lm, offset);

  res.json({ success: true, total, page: pg, limit: lm, channels: rows });
});

// ─── Danh sách quốc gia (đầy đủ 250 nước + số lượng kênh) ────
router.get('/countries', (req, res) => {
  const d = ensureSchema();
  if (!d || !tableExists('iptv_channels')) {
    // Fallback: trả về 250 quốc gia từ file data nếu DB chưa có
    try {
      const dataFile = path.join(__dirname, '..', '..', '..', 'Frontend', 'src', 'data', 'iptvCountries.js');
      const raw = fs.readFileSync(dataFile, 'utf-8');
      const match = raw.match(/export const ALL_IPTV_COUNTRIES = (\[[\s\S]*?\])/);
      if (match) {
        const countries = JSON.parse(match[1].replace(/'/g, '"'));
        return res.json({
          success: true,
          count: countries.length,
          note: '(chưa có dữ liệu scan)',
          countries: countries.map(c => ({
            code: c.code,
            name: c.name,
            flag: getFlag(c.code),
            total: 0,
            online: 0,
            offline: 0,
            avg_latency: 0,
          })).sort((a, b) => a.name.localeCompare(b.name)),
        });
      }
    } catch (e) { /* fallback */ }
    return res.json({ success: false, error: 'No data' });
  }

  const dbCountries = d.prepare(`
    SELECT country, MIN(country_name) as name,
      COUNT(*) as total,
      SUM(CASE WHEN status='online' THEN 1 ELSE 0 END) as online,
      SUM(CASE WHEN status='offline' THEN 1 ELSE 0 END) as offline,
      ROUND(AVG(CASE WHEN latency_ms > 0 THEN CAST(latency_ms AS REAL) ELSE NULL END)) as avg_latency
    FROM iptv_channels WHERE last_checked IS NOT NULL
    GROUP BY country ORDER BY total DESC
  `).all();

  // Lấy danh sách đầy đủ 250 quốc guốc gia từ frontend data
  let allCountries = [];
  try {
    const dataFile = path.join(__dirname, '..', '..', '..', 'Frontend', 'src', 'data', 'iptvCountries.js');
    const raw = fs.readFileSync(dataFile, 'utf-8');
    const match = raw.match(/export const ALL_IPTV_COUNTRIES = (\[[\s\S]*?\])/);
    if (match) {
      allCountries = JSON.parse(match[1].replace(/'/g, '"'));
    }
  } catch (e) {}

  // Merge: tất cả quốc gia, có data xanh k có = 0
  const merged = allCountries.map(ac => {
    const found = dbCountries.find(dc => dc.country === ac.code);
    return {
      code: ac.code,
      name: ac.name,
      flag: getFlag(ac.code),
      total: found?.total || 0,
      online: found?.online || 0,
      offline: found?.offline || 0,
      avg_latency: found?.avg_latency || 0,
    };
  });

  merged.sort((a, b) => (b.total - a.total) || a.name.localeCompare(b.name));

  res.json({ success: true, count: merged.length, countries: merged });
});

// ─── Lịch sử scan ───────────────────────────────────────────────
router.get('/scan-history', (req, res) => {
  const d = ensureSchema();
  if (!d || !tableExists('iptv_scan_log')) return res.json(NO_DATA);

  const history = d.prepare(`
    SELECT id, started_at, finished_at, status, total_channels, online_channels, offline_channels, new_channels, lost_channels
    FROM iptv_scan_log ORDER BY id DESC LIMIT 20
  `).all();

  res.json({ success: true, history });
});

// ─── Kênh mới / mất ──────────────────────────────────────────
router.get('/changes', (req, res) => {
  const d = ensureSchema();
  if (!d || !tableExists('iptv_channels')) return res.json(NO_DATA);

  const lastScan = d.prepare("SELECT id FROM iptv_scan_log WHERE status='done' ORDER BY id DESC LIMIT 1").get();
  const prevScan = d.prepare("SELECT id FROM iptv_scan_log WHERE status='done' AND id < ? ORDER BY id DESC LIMIT 1").get(lastScan?.id);

  if (!lastScan || !prevScan) {
    return res.json({ success: true, need_more_scans: true, message: 'Cần ít nhất 2 lần scan để so sánh' });
  }

  const nowOnline = d.prepare("SELECT url, channel_name, country, group_name FROM iptv_channels WHERE status='online' AND scan_id = ?").all(lastScan.id);
  const prevOnline = d.prepare("SELECT url, channel_name, country, group_name FROM iptv_channels WHERE status='online' AND scan_id = ?").all(prevScan.id);

  const nowSet = new Set(nowOnline.map(r => r.url));
  const prevSet = new Set(prevOnline.map(r => r.url));

  const newChans = nowOnline.filter(r => !prevSet.has(r.url));
  const lostChans = prevOnline.filter(r => !nowSet.has(r.url));

  res.json({
    success: true,
    scan_now: lastScan.id,
    scan_prev: prevScan.id,
    new_count: newChans.length,
    lost_count: lostChans.length,
    new_channels: newChans.slice(0, 200),
    lost_channels: lostChans.slice(0, 200),
  });
});

// ─── Thêm kênh mới ──────────────────────────────────────────
router.post('/channels', (req, res) => {
  const d = ensureSchema();
  if (!d || !tableExists('iptv_channels')) return res.json(NO_DATA);

  const { channel_name, name, url, logo, group_name, group, country, country_name, status, latency_ms } = req.body;
  const chName = (channel_name || name || '').trim();
  const grp = (group_name || group || '').trim();
  const ctry = (country || '').toUpperCase().trim();
  const st = ['online', 'offline', 'unknown'].includes(status) ? status : 'unknown';

  if (!chName || !url) return res.json({ success: false, error: 'Cần nhập tên kênh và URL' });
  if (!/^https?:\/\//.test(url)) return res.json({ success: false, error: 'URL phải bắt đầu bằng http:// hoặc https://' });

  const dup = d.prepare('SELECT id FROM iptv_channels WHERE url = ?').get(url);
  if (dup) return res.json({ success: false, error: 'Kênh với URL này đã tồn tại' });

  const info = d.prepare(`
    INSERT INTO iptv_channels (country, country_name, group_name, channel_name, url, logo, status, latency_ms, last_checked)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(ctry || 'XX', country_name || '', grp, chName, url, logo || '', st, parseInt(latency_ms) || 0);

  res.json({ success: true, id: info.lastInsertRowid, message: 'Đã thêm kênh thành công' });
});

// ─── Cập nhật kênh ──────────────────────────────────────────
router.put('/channels/:id', (req, res) => {
  const d = ensureSchema();
  if (!d || !tableExists('iptv_channels')) return res.json(NO_DATA);

  const id = parseInt(req.params.id);
  if (!id) return res.json({ success: false, error: 'ID không hợp lệ' });

  const row = d.prepare('SELECT * FROM iptv_channels WHERE id = ?').get(id);
  if (!row) return res.json({ success: false, error: 'Không tìm thấy kênh' });

  const { channel_name, name, url, logo, group_name, group, country, country_name, status, latency_ms } = req.body;
  const chName = (channel_name || name || row.channel_name || '').trim();
  const grp = (group_name || group || row.group_name || '').trim();
  const ctry = (country !== undefined && country !== null && country !== '') ? String(country).toUpperCase() : row.country;
  const cName = country_name !== undefined ? country_name : row.country_name;
  const st = ['online', 'offline', 'unknown'].includes(status) ? status : row.status;
  const newUrl = (url || row.url || '').trim();
  const lat = latency_ms !== undefined ? (parseInt(latency_ms) || 0) : row.latency_ms;

  if (!chName || !newUrl) return res.json({ success: false, error: 'Cần nhập tên kênh và URL' });

  if (newUrl !== row.url) {
    const dup = d.prepare('SELECT id FROM iptv_channels WHERE url = ? AND id != ?').get(newUrl, id);
    if (dup) return res.json({ success: false, error: 'Kênh với URL này đã tồn tại' });
  }

  d.prepare(`
    UPDATE iptv_channels SET channel_name=?, url=?, logo=?, group_name=?, country=?, country_name=?, status=?, latency_ms=?, last_checked=datetime('now') WHERE id=?
  `).run(chName, newUrl, logo !== undefined ? logo : row.logo, grp, ctry, cName || '', st, lat, id);

  res.json({ success: true, message: 'Đã cập nhật kênh' });
});

// ─── Xóa kênh ──────────────────────────────────────────────
router.delete('/channels/:id', (req, res) => {
  const d = ensureSchema();
  if (!d || !tableExists('iptv_channels')) return res.json(NO_DATA);

  const id = parseInt(req.params.id);
  if (!id) return res.json({ success: false, error: 'ID không hợp lệ' });

  const row = d.prepare('SELECT id FROM iptv_channels WHERE id = ?').get(id);
  if (!row) return res.json({ success: false, error: 'Không tìm thấy kênh' });

  d.prepare('DELETE FROM iptv_channels WHERE id = ?').run(id);
  res.json({ success: true, message: 'Đã xóa kênh' });
});

// ─── Export M3U / JSON / CSV ────────────────────────────────
router.get('/channels/export/:format', (req, res) => {
  const d = ensureSchema();
  if (!d || !tableExists('iptv_channels')) return res.json(NO_DATA);

  const { format } = req.params;
  const { country, status, search, category } = req.query;
  const clauses = ['last_checked IS NOT NULL'];
  const params = [];
  if (country) { clauses.push('country = ?'); params.push(country.toUpperCase()); }
  if (status) { clauses.push('status = ?'); params.push(status); }
  if (category) { clauses.push('group_name = ?'); params.push(category); }
  if (search) { clauses.push('channel_name LIKE ?'); params.push(`%${search}%`); }
  const whereClause = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const rows = d.prepare(`SELECT * FROM iptv_channels ${whereClause} ORDER BY country, group_name, channel_name`).all(...params);

  const stamp = Date.now();
  if (format === 'm3u') {
    const body = '#EXTM3U\n' + rows.map(ch =>
      `#EXTINF:-1${ch.logo ? ` tvg-logo="${ch.logo}"` : ''} tvg-id="${(ch.country || 'xx').toLowerCase()}${ch.id}" tvg-name="${ch.channel_name}" group-title="${ch.group_name || 'Unknown'}",${ch.channel_name}\n${ch.url}`
    ).join('\n');
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Content-Disposition', `attachment; filename=iptv-channels-${stamp}.m3u`);
    return res.send(body);
  }
  if (format === 'csv') {
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = 'id,name,url,logo,country,group,status,ping_ms,last_checked\n';
    const body = header + rows.map(ch =>
      [ch.id, esc(ch.channel_name), esc(ch.url), esc(ch.logo), esc(ch.country), esc(ch.group_name), ch.status, ch.latency_ms || '', ch.last_checked || ''].join(',')
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=iptv-channels-${stamp}.csv`);
    return res.send(body);
  }
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=iptv-channels-${stamp}.json`);
    return res.json({ success: true, count: rows.length, exported_at: new Date().toISOString(), channels: rows });
  }
  res.json({ success: false, error: "Định dạng không hợp lệ. Hỗ trợ: m3u, json, csv" });
});

// ─── Notifications ────────────────────────────────────────────
router.get('/notifications', (req, res) => {
  const d = ensureSchema();
  if (!d || !tableExists('iptv_notifications')) return res.json({ success: true, unread: 0, notifications: [] });

  const { limit = 30 } = req.query;
  const rows = d.prepare('SELECT * FROM iptv_notifications ORDER BY created_at DESC LIMIT ?').all(parseInt(limit));
  const unread = d.prepare('SELECT COUNT(*) as c FROM iptv_notifications WHERE is_read = 0').get()?.c || 0;
  res.json({ success: true, unread, notifications: rows });
});

router.put('/notifications/read-all', (req, res) => {
  const d = ensureSchema();
  if (!d || !tableExists('iptv_notifications')) return res.json({ success: true });
  d.prepare('UPDATE iptv_notifications SET is_read = 1 WHERE is_read = 0').run();
  res.json({ success: true, message: 'Đã đánh dấu tất cả đã đọc' });
});

router.put('/notifications/:id/read', (req, res) => {
  const d = ensureSchema();
  if (!d || !tableExists('iptv_notifications')) return res.json({ success: true });
  const id = parseInt(req.params.id);
  if (!id) return res.json({ success: false, error: 'ID không hợp lệ' });
  d.prepare('UPDATE iptv_notifications SET is_read = 1 WHERE id = ?').run(id);
  res.json({ success: true });
});

router.delete('/notifications/:id', (req, res) => {
  const d = ensureSchema();
  if (!d || !tableExists('iptv_notifications')) return res.json({ success: true });
  const id = parseInt(req.params.id);
  if (!id) return res.json({ success: false, error: 'ID không hợp lệ' });
  d.prepare('DELETE FROM iptv_notifications WHERE id = ?').run(id);
  res.json({ success: true });
});

// ─── Kích hoạt scan thủ công ────────────────────────────────────
router.post('/scan-now', (req, res) => {
  res.json({ success: true, message: 'Scan started! Check /status in 20s.' });

  // Tạo notification "đang scan"
  try {
    const d = ensureSchema();
    if (d && tableExists('iptv_notifications')) {
      d.prepare("INSERT INTO iptv_notifications (type, title, message) VALUES (?, ?, ?)").run('scan_started', 'Bắt đầu quét', 'Đã kích hoạt quét kênh thủ công. Quá trình quét có thể mất vài phút...');
    }
  } catch {}

  const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'scan_full.js');
  const cp = exec(`node "${scriptPath}" --auto`, { timeout: 600000 }, (err, stdout, stderr) => {
    if (err) console.error('[Admin Scan] Error:', err.message);
    else console.log('[Admin Scan] OK');
  });
  cp.stdout?.on('data', d => process.stdout.write(d));
  cp.stderr?.on('data', d => process.stderr.write(d));
});

module.exports = router;