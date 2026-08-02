/**
 * IPTV Production Scanner — quét toàn bộ 250 nước, check online, lưu SQLite
 * 
 * node scripts/scan_full.js          # manual
 * node scripts/scan_full.js --auto   # auto (weekly scheduler)
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const DB_PATH = path.join(__dirname, '..', '..', 'Database', 'tro_ly_ai.db');
const Database = require('better-sqlite3');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const CONFIG = { concurrency: 30, fetchTimeout: 15000, checkTimeout: 8000, countriesUrl: 'https://iptv-org.github.io/api/countries.json' };
const COUNTRY_CODE_MAP = { 'UK': 'gb' };

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS iptv_scan_log (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT NOT NULL, finished_at TEXT, status TEXT DEFAULT 'running', total_channels INTEGER DEFAULT 0, online_channels INTEGER DEFAULT 0, offline_channels INTEGER DEFAULT 0, countries_scanned INTEGER DEFAULT 0, new_channels INTEGER DEFAULT 0, lost_channels INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS iptv_channels (id INTEGER PRIMARY KEY AUTOINCREMENT, country TEXT NOT NULL, country_name TEXT DEFAULT '', group_name TEXT DEFAULT '', channel_name TEXT NOT NULL, url TEXT NOT NULL, logo TEXT DEFAULT '', status TEXT DEFAULT 'unknown', latency_ms INTEGER DEFAULT 0, http_code INTEGER DEFAULT 0, last_checked TEXT, last_online TEXT, first_seen TEXT DEFAULT (datetime('now')), scan_id INTEGER REFERENCES iptv_scan_log(id));
    CREATE INDEX IF NOT EXISTS idx_iptv_url ON iptv_channels(url);
    CREATE INDEX IF NOT EXISTS idx_iptv_country ON iptv_channels(country);
    CREATE INDEX IF NOT EXISTS idx_iptv_status ON iptv_channels(status);
  `);
}

function parseM3U(txt, countryCode) {
  const channels = []; let cur = null; const seen = new Set();
  for (const raw of txt.split('\n')) {
    const line = raw.replace('\r', '').trim();
    if (!line || line.startsWith('#EXTVLCOPT') || line.startsWith('#KODIPROP') || line.startsWith('#EXTM3U')) continue;
    if (line.startsWith('#EXTINF:')) {
      const lastComma = line.lastIndexOf(',');
      const name = lastComma >= 0 ? line.substring(lastComma + 1).trim() : 'Unknown';
      if (/geo-blocked|not 24.?7|offline|discontinued|blocked|dead/i.test(name)) { cur = null; continue; }
      const logo = (line.match(/tvg-logo="([^"]+)"/) || [])[1] || '';
      const group = (line.match(/group-title="([^"]+)"/) || [])[1] || '';
      cur = { name: name.replace(/\s+/g, ' ').trim(), logo, group, country: countryCode };
    } else if (line.startsWith('http') && cur) {
      const url = line.split(/[\s"'\r\n]/)[0].trim();
      if (!seen.has(url+'|'+cur.name)) { seen.add(url+'|'+cur.name); channels.push({...cur, url}); }
      cur = null;
    }
  }
  return channels;
}

async function fetchM3U(url) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), CONFIG.fetchTimeout);
  try { const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: ctrl.signal }); clearTimeout(t); if (!r.ok) return null; return await r.text(); }
  catch { clearTimeout(t); return null; }
}

function checkStatus(url) {
  return new Promise(resolve => {
    const start = Date.now(), lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, { timeout: CONFIG.checkTimeout, headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      const latency = Date.now() - start, ok = res.statusCode >= 200 && res.statusCode < 400;
      res.resume(); res.on('end', () => resolve({ status: ok ? 'online' : 'offline', code: res.statusCode, latency }));
    });
    req.on('error', () => resolve({ status: 'offline', code: -1, latency: Date.now() - start }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'timeout', code: null, latency: CONFIG.checkTimeout }); });
  });
}

async function main() {
  initDB();
  const isAuto = process.argv.includes('--auto');
  const startTime = new Date().toISOString();
  
  console.log('=== IPTV FULL SCAN' + (isAuto ? ' (AUTO)' : '') + ' ===');
  console.log('Start: ' + startTime + '\n');

  let scanId = 0;
  const scan = db.prepare('INSERT INTO iptv_scan_log (started_at, status) VALUES (?, ?)').run(startTime, 'running');
  scanId = scan.lastInsertRowid;

  // ─── 1. Fetch countries ───
  console.log('[1/4] Fetching countries...');
  const cntryRes = await fetch(CONFIG.countriesUrl, { signal: AbortSignal.timeout(15000) });
  const cntryData = await cntryRes.json();
  const countries = cntryData.map(c => ({ code: c.code.toUpperCase(), name: c.name, flag: c.flag || '' }));
  console.log(` -> ${countries.length} countries\n`);

  // ─── 2. Fetch M3U playlists ───
  console.log('[2/4] Fetching M3U playlists...');
  const fetchQueue = [...countries]; let done = 0; const total = fetchQueue.length;
  let allChannels = []; const fetchStart = Date.now();

  const fWorker = async () => {
    while (fetchQueue.length > 0) {
      const c = fetchQueue.shift();
      const code = COUNTRY_CODE_MAP[c.code] || c.code.toLowerCase();
      const txt = await fetchM3U(`https://iptv-org.github.io/iptv/countries/${code}.m3u`);
      const ch = txt ? parseM3U(txt, c.code) : [];
      allChannels.push(...ch); done++;
      if (ch.length > 0) console.log(`   ${c.flag||' '} ${c.code} ${String(ch.length).padStart(5)} ch | ${c.name}`);
    }
  };
  await Promise.all(Array(10).fill(null).map(() => fWorker()));
  console.log(` -> ${allChannels.length.toLocaleString()} channels (${((Date.now()-fetchStart)/1000).toFixed(1)}s)\n`);

  // ─── 3. Check online/offline ───
  console.log(`[3/4] Checking ${allChannels.length.toLocaleString()} channels...`);
  const checkQueue = [...allChannels]; let check = 0; let onlineCount = 0;
  const checkTotal = checkQueue.length; const checkStart = Date.now();

  const cWorker = async () => {
    while (checkQueue.length > 0) {
      const ch = checkQueue.shift();
      const r = await checkStatus(ch.url);
      if (r.status === 'online') onlineCount++;
      
      if (db) {
        try {
          const existing = db.prepare('SELECT id FROM iptv_channels WHERE url = ?').get(ch.url);
          const cInfo = countries.find(c => c.code === ch.country);
          if (!existing) {
            db.prepare(`
              INSERT INTO iptv_channels (country, country_name, group_name, channel_name, url, logo, status, latency_ms, http_code, last_checked, last_online, scan_id)
              VALUES (?,?,?,?,?,?,?,?,?,datetime('now'),?,?)`).run(
              ch.country, cInfo?.name||'', ch.group, ch.name, ch.url, ch.logo,
              r.status, r.latency||0, r.code||0, r.status==='online' ? startTime : null, scanId);
          } else {
            db.prepare(`
              UPDATE iptv_channels SET status=?,latency_ms=?,http_code=?,last_checked=datetime('now'),scan_id=?,
                last_online=CASE WHEN ? THEN datetime('now') ELSE last_online END
              WHERE url=?`).run(r.status, r.latency||0, r.code||0, scanId, r.status==='online'?1:0, ch.url);
          }
        } catch(e) {}
      }
      
      check++;
      if (check % 100 === 0 || check === checkTotal) {
        const el = Math.floor((Date.now() - checkStart) / 1000);
        const pct = ((check/checkTotal)*100).toFixed(1); process.stdout.write(`\r  ${check}/${checkTotal} ${pct}% | ${onlineCount} online (${((onlineCount/check)*100).toFixed(1)}%) | ${el}s  `);
      }
    }
  };
  await Promise.all(Array(CONFIG.concurrency).fill(null).map(() => cWorker()));
  process.stdout.write('\n');
  const checkTime = ((Date.now() - checkStart) / 1000).toFixed(0);
  console.log(`  Done: ${onlineCount.toLocaleString()} online / ${allChannels.length.toLocaleString()} (${((onlineCount/allChannels.length)*100).toFixed(1)}%) in ${checkTime}s\n`);

  // ─── 4. Diff (new/lost) ───
  let newCount = 0, lostCount = 0;
  if (db) {
    const prevScan = db.prepare("SELECT id FROM iptv_scan_log WHERE id < ? AND status='done' ORDER BY id DESC LIMIT 1").get(scanId);
    if (prevScan) {
      const before = db.prepare(`SELECT url FROM iptv_channels WHERE status='online' AND scan_id = ?`).all(prevScan.id).map(r => r.url);
      const now = db.prepare(`SELECT url FROM iptv_channels WHERE status='online' AND scan_id = ?`).all(scanId).map(r => r.url);
      const beforeSet = new Set(before), nowSet = new Set(now);
      newCount = now.filter(u => !beforeSet.has(u)).length;
      lostCount = before.filter(u => !nowSet.has(u)).length;
      console.log(`[4/4] Diff: +${newCount} new, -${lostCount} lost channels`);
    }
  }

  // ─── Finish ───
  const finishTime = new Date().toISOString();
  if (db) {
    db.prepare(`UPDATE iptv_scan_log SET status='done',finished_at=?,total_channels=?,online_channels=?,offline_channels=?,countries_scanned=?,new_channels=?,lost_channels=? WHERE id=?`)
      .run(finishTime, allChannels.length, onlineCount, allChannels.length - onlineCount, countries.length, newCount, lostCount, scanId);
    console.log('\n  Saved scan #' + scanId);
  }
}

main().catch(e => { console.error('FATAL:', e.message);
  if (db) try { db.prepare("UPDATE iptv_scan_log SET status='failed',finished_at=datetime('now') WHERE status='running'").run(); } catch {}
  process.exit(1);
});
