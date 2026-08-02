// Test WS frame streaming cho browser stream (chạy từ Backend dir để có module 'ws')
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:5000/api/services/browser/stream');
let n = 0;
ws.on('open', () => console.log('[WS] connected'));
ws.on('message', (d) => {
  n++;
  if (n <= 2) {
    try { const m = JSON.parse(d); console.log('[WS] frame #' + n + ' | type=' + m.type + ' | dataLen=' + (m.data ? m.data.length : 0)); } catch (e) {}
  }
});
ws.on('error', (e) => console.log('[WS] error:', e.message));
setTimeout(() => {
  console.log('[WS] total frames in 4s:', n);
  ws.close();
  process.exit(0);
}, 4000);
