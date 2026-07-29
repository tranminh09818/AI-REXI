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
  // Chạy lần đầu sau 60s (đợi server khởi động xong)
  const firstDelay = 60 * 1000;

  console.log(`[IPTV Scheduler] Auto-scan every 7 days. First scan in ${firstDelay/1000}s.`);

  setTimeout(() => {
    runScan();
    // Sau đó cứ mỗi 7 ngày quét lại
    timer = setInterval(runScan, SCAN_INTERVAL_MS);
  }, firstDelay);
}

function stopScheduler() {
  if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { startScheduler, stopScheduler, runScan };