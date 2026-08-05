const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', '..', 'Database', 'tro_ly_ai.db');
const db = new Database(dbPath);
const row = db.prepare("SELECT gia_tri_khoa FROM khoa_api WHERE ten_nha_cung_cap = 'kiraai'").get();
const key = row && row.gia_tri_khoa;
if (!key) { console.log('RESULT: Khong tim thay key kiraai trong DB'); process.exit(0); }
console.log('Key kiraai: tim thay (do dai ' + key.length + ')');
const BASE = 'https://kiraai.vn/api/v1';
const TO = 10000;

(async () => {
  try {
    const r1 = await fetch(BASE + '/models', { headers: { Authorization: 'Bearer ' + key }, signal: AbortSignal.timeout(TO) });
    const t1 = await r1.text();
    console.log('\n=== GET /models ===');
    console.log('HTTP', r1.status);
    let tryModel = null;
    try { 
      const j = JSON.parse(t1); 
      const ids = (j.data || []).map(m => m.id + (m.is_free ? '(free)' : ''));
      console.log('Tat ca model ids:', ids.join(', '));
      const kimi = (j.data || []).find(m => m.id === 'kimi-k3-free');
      console.log('kimi-k3-free co trong list?', !!kimi);
      const free = (j.data || []).find(m => m.is_free);
      const any = (j.data || [])[0];
      tryModel = (kimi && kimi.id) || (free && free.id) || (any && any.id);
    }
    catch { console.log('Body:', t1.slice(0, 400)); }
    // Chat test: thu kimi-k3-free, sau do thu kira-mini-1.0 (free) va kira-3.5-flash
    for (const m of ['kimi-k3-free', 'kira-mini-1.0', 'kira-3.5-flash'].filter(Boolean)) {
      await chatTest(m, key, BASE, TO);
    }
  } catch (e) { console.log('/models ->', e.name === 'TimeoutError' ? 'TIMEOUT' : e.message); }
})();

async function chatTest(model, key, BASE, TO) {
  try {
    const r2 = await fetch(BASE + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({ model: model, messages: [{ role: 'user', content: 'Hi, ban la model gi? Ngan.' }], max_tokens: 40 }),
      signal: AbortSignal.timeout(TO)
    });
    const t2 = await r2.text();
    console.log('\n=== POST /chat/completions (model: ' + model + ') ===');
    console.log('HTTP', r2.status);
    try { const j = JSON.parse(t2); const c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content; console.log('Reply:', c ? c.slice(0, 300) : JSON.stringify(j).slice(0, 400)); }
    catch { console.log('Body:', t2.slice(0, 400)); }
  } catch (e) { console.log('\n/chat [' + model + '] ->', e.name === 'TimeoutError' ? 'TIMEOUT (khong phan hoi trong 10s)' : e.message); }
}


