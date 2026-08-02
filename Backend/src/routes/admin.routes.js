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

function getFlag(code) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
}

router.use(authMiddleware);
router.use(adminMiddleware);

// ─── Trạng thái scan ─────────────────────────────────────────
router.get('/status', (req, res) => {
  const d = getDB();
  if (!d) return res.json({ success: true, status: 'no_data', lastScan: null, online: 0, total: 0 });

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
  const d = getDB();
  if (!d) return res.json({ success: false, error: 'DB not available' });

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
  const d = getDB();
  if (!d) return res.json({ success: false, error: 'DB not available' });

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
  const d = getDB();
  if (!d) {
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
  const d = getDB();
  if (!d) return res.json({ success: false, error: 'DB not available' });

  const history = d.prepare(`
    SELECT id, started_at, finished_at, status, total_channels, online_channels, offline_channels, new_channels, lost_channels
    FROM iptv_scan_log ORDER BY id DESC LIMIT 20
  `).all();

  res.json({ success: true, history });
});

// ─── Kênh mới / mất ──────────────────────────────────────────
router.get('/changes', (req, res) => {
  const d = getDB();
  if (!d) return res.json({ success: false, error: 'DB not available' });

  const lastScan = d.prepare("SELECT id FROM iptv_scan_log WHERE status='done' ORDER BY id DESC LIMIT 1").get();
  const prevScan = d.prepare("SELECT id FROM iptv_scan_log WHERE status='done' AND id < ? ORDER BY id DESC LIMIT 1").get(lastScan?.id);

  if (!lastScan || !prevScan) {
    return res.json({ success: true, need_more_scans: true, message: 'CanMinimum 2 scans to compare' });
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

// ─── Kích hoạt scan thủ công ────────────────────────────────────
router.post('/scan-now', (req, res) => {
  res.json({ success: true, message: 'Scan started! Check /status in 20s.' });

  const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'scan_full.js');
  const cp = exec(`node "${scriptPath}" --auto`, { timeout: 600000 }, (err, stdout, stderr) => {
    if (err) console.error('[Admin Scan] Error:', err.message);
    else console.log('[Admin Scan] OK');
  });
  cp.stdout?.on('data', d => process.stdout.write(d));
  cp.stderr?.on('data', d => process.stderr.write(d));
});

module.exports = router;