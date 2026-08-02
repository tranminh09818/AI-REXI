// Test SSE streaming endpoint cho AI REXI
// 1. Tạo conversation (guest)
// 2. Gọi /messages/stream ở Agent Mode → phải nhận event 'status' gần như ngay lập tức
const BASE = 'http://localhost:5000/api';

async function main() {
  // Bước 1: tạo conversation
  const createRes = await fetch(`${BASE}/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tieu_de: 'Test Stream', ten_mo_hinh_ai: 'opencode' })
  });
  if (!createRes.ok) { console.error('Tạo conversation thất bại:', createRes.status, await createRes.text()); process.exit(1); }
  const conv = await createRes.json();
  const convId = conv.ma_hoi_thoai;
  console.log('[Test] Đã tạo conversation:', convId);

  // Bước 2: gọi stream endpoint (Agent Mode)
  const t0 = Date.now();
  const res = await fetch(`${BASE}/chat/conversations/${convId}/messages/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vai_tro: 'user',
      noi_dung: 'Hãy viết 1 dòng chào tiếng Việt',
      provider: 'opencode',
      model_name: 'opencode/deepseek-v4-flash-free',
      execution_mode: 'agent',
      mode: 'general'
    })
  });

  console.log('[Test] HTTP status:', res.status, '| Content-Type:', res.headers.get('content-type'));

  if (!res.headers.get('content-type') || !res.headers.get('content-type').includes('text/event-stream')) {
    console.error('[Test] KHÔNG phải SSE! Body:', await res.text());
    process.exit(1);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventCount = 0;
  let firstEventAt = null;
  let gotStatus = false;
  let gotToken = false;
  let gotDone = false;

  const TIMEOUT_MS = 25000;
  const timer = setTimeout(() => {
    console.log(`\n[Test] TIMEOUT sau ${TIMEOUT_MS}ms. Tổng event: ${eventCount}`);
    console.log('[Test] gotStatus=' + gotStatus, 'gotToken=' + gotToken, 'gotDone=' + gotDone);
    if (firstEventAt) console.log('[Test] Event đầu tiên xuất hiện sau:', firstEventAt - t0, 'ms');
    reader.cancel();
    process.exit(gotStatus ? 0 : 1);
  }, TIMEOUT_MS);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop();
    for (const evt of events) {
      const line = evt.trim();
      if (!line.startsWith('data: ')) continue;
      eventCount++;
      if (!firstEventAt) firstEventAt = Date.now();
      let payload;
      try { payload = JSON.parse(line.slice(6)); } catch (e) { console.log('[Test] (raw)', line.slice(0, 80)); continue; }
      const elapsed = Date.now() + 'ms';
      if (payload.type === 'status') { gotStatus = true; console.log(`[Test] ✅ STATUS @${Date.now()-t0}ms:`, payload.message); }
      else if (payload.type === 'token') { gotToken = true; process.stdout.write(payload.text); }
      else if (payload.type === 'error') { console.log(`\n[Test] ❌ ERROR:`, payload.message); }
      else if (payload.type === 'done') { gotDone = true; console.log(`\n[Test] ✅ DONE @${Date.now()-t0}ms | ma_tin_nhan:`, payload.ma_tin_nhan, '| độ dài nội dung:', (payload.noi_dung||'').length); }
      else { console.log('[Test] event khác:', payload.type); }
    }
  }
  clearTimeout(timer);
  console.log(`\n[Test] Stream kết thúc. Tổng event: ${eventCount}`);
  console.log('[Test] gotStatus=' + gotStatus, 'gotToken=' + gotToken, 'gotDone=' + gotDone);
  if (firstEventAt) console.log('[Test] Event đầu tiên sau:', firstEventAt - t0, 'ms');
  process.exit(gotStatus ? 0 : 1);
}

main().catch(e => { console.error('[Test] Lỗi:', e.message); process.exit(1); });
