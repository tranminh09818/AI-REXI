// Test SSE streaming — CHAT MODE với Gemini (token streaming thật)
const BASE = 'http://localhost:5000/api';

async function main() {
  const createRes = await fetch(`${BASE}/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tieu_de: 'Test Stream Chat', ten_mo_hinh_ai: 'gemini-2.5-flash' })
  });
  if (!createRes.ok) { console.error('Tạo conversation thất bại:', createRes.status, await createRes.text()); process.exit(1); }
  const conv = await createRes.json();
  const convId = conv.ma_hoi_thoai;
  console.log('[Test] Đã tạo conversation:', convId);

  const t0 = Date.now();
  const res = await fetch(`${BASE}/chat/conversations/${convId}/messages/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vai_tro: 'user',
      noi_dung: 'Viết 3 câu chào tiếng Việt ngắn gọn.',
      provider: 'gemini',
      model_name: 'gemini-2.5-flash',
      execution_mode: 'chat',
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
  let firstTokenAt = null;
  let tokenCount = 0;
  let gotDone = false;
  let gotError = false;
  let fullText = '';

  const TIMEOUT_MS = 30000;
  const timer = setTimeout(() => {
    console.log(`\n[Test] TIMEOUT ${TIMEOUT_MS}ms. events=${eventCount} tokens=${tokenCount} done=${gotDone}`);
    if (firstTokenAt) console.log('[Test] Token đầu tiên sau:', firstTokenAt - t0, 'ms');
    console.log('[Test] Nội dung nhận được (' + fullText.length + ' chars):', fullText.slice(0, 200));
    reader.cancel();
    process.exit(tokenCount > 0 ? 0 : 1);
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
      let payload;
      try { payload = JSON.parse(line.slice(6)); } catch (e) { continue; }
      if (payload.type === 'token') {
        tokenCount++;
        if (!firstTokenAt) firstTokenAt = Date.now();
        fullText += payload.text;
        process.stdout.write(payload.text);
      } else if (payload.type === 'error') {
        gotError = true;
        console.log('\n[Test] ❌ ERROR:', payload.message);
      } else if (payload.type === 'done') {
        gotDone = true;
        console.log(`\n[Test] ✅ DONE @${Date.now()-t0}ms | ma_tin_nhan: ${payload.ma_tin_nhan} | độ dài: ${(payload.noi_dung||'').length}`);
      } else {
        console.log('[Test] event:', payload.type, payload.message || '');
      }
    }
  }
  clearTimeout(timer);
  console.log(`\n[Test] Hoàn tất. events=${eventCount} tokens=${tokenCount} done=${gotDone} error=${gotError}`);
  if (firstTokenAt) console.log('[Test] ⏱️  Token đầu tiên sau:', firstTokenAt - t0, 'ms');
  console.log('[Test] Tổng nội dung (' + fullText.length + ' chars):', fullText.slice(0, 300));
  process.exit(tokenCount > 0 ? 0 : 1);
}

main().catch(e => { console.error('[Test] Lỗi:', e.message); process.exit(1); });
