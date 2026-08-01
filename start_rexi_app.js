const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('   AI REXI — RAM Guardian & Launcher (Max 5GB Free)  ');
console.log('====================================================');

// Helper to check available RAM (in MB)
function getFreeMemoryMB() {
  try {
    const out = execSync('wmic OS get FreePhysicalMemory /format:value', { encoding: 'utf-8', timeout: 5000 });
    const match = out.match(/FreePhysicalMemory=(\d+)/);
    if (match) return Math.round(parseInt(match[1], 10) / 1024);
  } catch (e) {
    // fallback
  }
  return 0;
}

const initialFree = getFreeMemoryMB();
if (initialFree > 0) {
  console.log(`[RAM Guardian] Current Free RAM: ${(initialFree / 1024).toFixed(2)} GB`);
}

console.log('[Runner] Starting Backend with --max-old-space-size=512...');
// Start Backend with memory ceiling (512MB Max Heap)
const backendProc = exec('node --max-old-space-size=512 server.js', { cwd: path.join(__dirname, 'Backend') });
backendProc.stdout.on('data', d => console.log('[Backend]', d.toString().trim()));
backendProc.stderr.on('data', d => console.error('[Backend ERR]', d.toString().trim()));

console.log('[Runner] Starting Frontend...');
// Start Frontend
const frontendProc = exec('npx vite', { cwd: path.join(__dirname, 'Frontend') });
frontendProc.stdout.on('data', d => console.log('[Frontend]', d.toString().trim()));
frontendProc.stderr.on('data', d => console.error('[Frontend ERR]', d.toString().trim()));

fs.writeFileSync(path.join(__dirname, 'runner_started.txt'), 'OK ' + new Date().toISOString());

// RAM Monitoring Loop every 30 seconds
setInterval(() => {
  const freeMB = getFreeMemoryMB();
  if (freeMB > 0) {
    const freeGB = (freeMB / 1024).toFixed(2);
    if (freeMB < 5120) {
      console.warn(`[RAM Warning] Free RAM is ${freeGB} GB (< 5.0 GB minimum required). Triggering optimization...`);
      // Trigger GC / trimming if needed
      try {
        if (global.gc) global.gc();
      } catch (e) {}
    }
  }
}, 30000);
