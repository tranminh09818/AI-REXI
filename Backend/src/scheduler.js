/**
 * IPTV Auto Scheduler — chạy auto scan mỗi 7 ngày
 * Tích hợp vào server.js khi khởi động
 */
const { exec } = require('child_process');
const path = require('path');

const SCAN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày
const SCAN_SCRIPT = path.join(__dirname, '..', 'scripts', 'scan_full.js');

let timer = null;

function runScan() {
  console.log('[IPTV Scheduler] Running auto scan...');
  const cmd = `node "${SCAN_SCRIPT}" --auto`;
  const cp = exec(cmd, { timeout: 3600000 }, (err, stdout, stderr) => {
    if (err) console.error('[IPTV Scheduler] Scan failed:', err.message);
    else console.log('[IPTV Scheduler] Scan completed');
  });
  cp.stdout?.on('data', d => process.stdout.write(d));
  cp.stderr?.on('data', d => process.stderr.write(d));
}

function startScheduler() {
  // ⚠️ KHÔNG tự scan khi khởi động mặc định — scan đầy đủ 9.500+ kênh
  // làm nghẽn CPU/network khiến server chậm và API timeout.
  // Chỉ tự scan lần đầu khi bật IPTV_AUTO_SCAN=1 (hoặc người dùng bấm nút Scan thủ công).
  const autoScan = process.env.IPTV_AUTO_SCAN === '1';
  const firstDelay = 60 * 1000;

  console.log(`[IPTV Scheduler] Auto-scan every 7 days. First scan: ${autoScan ? 'sau ' + (firstDelay/1000) + 's' : 'TẮT (bật IPTV_AUTO_SCAN=1 để tự scan)'}`);

  if (autoScan) {
    setTimeout(() => {
      runScan();
      timer = setInterval(runScan, SCAN_INTERVAL_MS);
    }, firstDelay);
  }
}

function stopScheduler() {
  if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { startScheduler, stopScheduler, runScan };