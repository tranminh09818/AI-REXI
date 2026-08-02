// Test SSE streaming qua Vite proxy (port 5173) — Chat Mode Gemini
const BASE = 'http://localhost:5173/api';

async function main() {
  const createRes = await fetch(`${BASE}/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tieu_de: 'Test Proxy Stream', ten_mo_hinh_ai: 'gemini-2.5-flash' })
  });
  if (!createRes.ok) { console.error('Tạo conversation thất bại:', createRes.status, await createRes.text()); process.exit(1); }
  const conv = await createRes.json();
  console.log('[Proxy] Đã tạo conversation:', conv.ma_hoi_thoai);

  const t0 = Date.now();
  const res = await fetch(`${BASE}/chat/conversations/${conv.ma_hoi_thoai}/messages/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vai_tro: 'user', noi_dung: 'Nói "xin chào" bằng 1 từ.', provider: 'gemini', model_name: 'gemini-2.5-flash', execution_mode: 'chat', mode: 'general' })
  });
  console.log('[Proxy] HTTP:', res.status, '| CT:', res.headers.get('content-type'));
  if (!(res.headers.get('content-type')||'').includes('text/event-stream')) { console.error('[Proxy] Không phải SSE:', await res.text()); process.exit(1); }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '', tokens = 0, firstAt = null, full = '', done = false, errored = false;
  const timer = setTimeout(() => { console.log(`\n[Proxy] TIMEOUT 30s tokens=${tokens} done=${done}`); console.log('[Proxy] text:', full.slice(0,200)); reader.cancel(); process.exit(tokens>0?0:1); }, 30000);

  while (true) {
    const { done: rd, value } = await reader.read();
    if (rd) break;
    buffer += decoder.decode(value, { stream: true });
    const evs = buffer.split('\n\n'); buffer = evs.pop();
    for (const e of evs) {
      const ln = e.trim(); if (!ln.startsWith('data: ')) continue;
      let p; try { p = JSON.parse(ln.slice(6)); } catch { continue; }
      if (p.type === 'token') { tokens++; if (!firstAt) firstAt = Date.now(); full += p.text; process.stdout.write(p.text); }
      else if (p.type === 'done') { done = true; console.log(`\n[Proxy] ✅ DONE @${Date.now()-t0}ms`); }
      else if (p.type === 'error') { errored = true; console.log('\n[Proxy] ❌', p.message); }
    }
  }
  clearTimeout(timer);
  console.log(`\n[Proxy] Xong. tokens=${tokens} done=${done} error=${errored} | token đầu: ${firstAt?firstAt-t0:'?'}ms`);
  console.log('[Proxy] text:', full.slice(0,300));
  process.exit(tokens>0?0:1);
}
main().catch(e=>{console.error('[Proxy] Lỗi:',e.message);process.exit(1);});
