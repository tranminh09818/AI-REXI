/**
 * model-scanner.scheduler.js
 * Cron Job tự động quét tất cả providers mỗi 24h (lúc 3:00 AM)
 * và publish các model đang hoạt động lên CSDL
 */
const path = require('path');
const db_path = path.join(__dirname, '..', '..', 'Database', 'tro_ly_ai.db');
let _db;
function getDB() {
  if (!_db) { try { _db = new (require('better-sqlite3'))(db_path); } catch(e) { return null; } }
  return _db;
}

// Danh sách tất cả providers và endpoint của chúng
const PROVIDER_ENDPOINTS = {
  gemini:      { name: 'Google Gemini',     endpoint: 'https://generativelanguage.googleapis.com/v1beta/models', auth: 'key' },
  openrouter:  { name: 'OpenRouter',        endpoint: 'https://openrouter.ai/api/v1/models',                   auth: 'bearer' },
  groq:        { name: 'Groq Cloud',        endpoint: 'https://api.groq.com/openai/v1/models',                 auth: 'bearer' },
  nvidia:      { name: 'Nvidia NIM',        endpoint: 'https://integrate.api.nvidia.com/v1/models',            auth: 'bearer' },
  mistral:     { name: 'Mistral AI',        endpoint: 'https://api.mistral.ai/v1/models',                      auth: 'bearer' },
  cerebras:    { name: 'Cerebras',          endpoint: 'https://api.cerebras.ai/v1/models',                     auth: 'bearer' },
  cohere:      { name: 'Cohere AI',         endpoint: 'https://api.cohere.ai/v2/models',                       auth: 'bearer' },
  openai:      { name: 'OpenAI',            endpoint: 'https://api.openai.com/v1/models',                      auth: 'bearer' },
  deepseek:    { name: 'DeepSeek',          endpoint: 'https://api.deepseek.com/models',                       auth: 'bearer' },
  opencode:    { name: 'OpenCode',          endpoint: 'https://opencode.ai/api/v1/models',                     auth: 'bearer' },
  github:      { name: 'GitHub Models',    endpoint: 'https://models.inference.ai.azure.com/models',          auth: 'bearer' },
  grok:        { name: 'xAI Grok',          endpoint: 'https://api.x.ai/v1/models',                            auth: 'bearer' },
  claude:      { name: 'Anthropic Claude',  endpoint: 'https://api.anthropic.com/v1/models',                   auth: 'bearer' },
};

// Lấy API key từ CSDL cho một provider
function getKeyForProvider(providerId) {
  const d = getDB();
  if (!d) return null;
  const row = d.prepare("SELECT gia_tri_khoa FROM khoa_api WHERE LOWER(ten_nha_cung_cap) = LOWER(?)").get(providerId);
  return row?.gia_tri_khoa?.trim() || null;
}

// Fetch danh sách model từ endpoint
async function fetchModels(providerId, apiKey, endpoint, authType) {
try {
    // OpenCode là CLI local (opencode.exe) — gọi opencode models để lấy danh sách động
    if (providerId === 'opencode') {
      const { spawn } = require('child_process');
      const os = require('os');
      const opencodeBin = process.env.OPENCODE_BIN_PATH || (os.homedir() ? require('path').join(os.homedir(), '.opencode', 'bin', 'opencode.exe') : '');
      const modelsRaw = await new Promise(resolve => {
        let out = '';
        try {
          const proc = spawn(opencodeBin, ['models'], { windowsHide: true, timeout: 20000 });
          const timer = setTimeout(() => { try { proc.kill(); } catch(e){} resolve(''); }, 20000);
          proc.stdout.on('data', d => { out += d.toString(); });
          proc.on('error', () => { clearTimeout(timer); resolve(''); });
          proc.on('close', () => { clearTimeout(timer); resolve(out); });
        } catch(e) { resolve(''); }
      });
      const models = modelsRaw.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && l.includes('/') && l.startsWith('opencode/'));
      if (models.length === 0) return { success: false, error: 'No opencode local models found via CLI' };
      return { success: true, models };
    }

    const headers = { 'Accept': 'application/json' };
    if (authType === 'bearer' && apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    
    let url = endpoint;
    if (authType === 'key' && apiKey) url = `${endpoint}?key=${apiKey}`;

    const resp = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return { success: false, error: `HTTP ${resp.status}` };

    const data = await resp.json();
    let models = [];
    if (Array.isArray(data)) models = data.map(m => m.id || m.name || m);
    else if (Array.isArray(data.data)) models = data.data.map(m => m.id || m.name || m);
    else if (Array.isArray(data.models)) models = data.models.map(m => m.id || m.name || m);
    
    // Filter only string IDs
    models = models.filter(m => typeof m === 'string' && m.length > 0);

    // OpenRouter: CHỈ quét model :free (giá $0) — vì tài khoản có thể chưa nạp credits,
    // model trả phí sẽ fail 'Insufficient credits' + quét 400 model sẽ đốt hết quota free 50/ngày
    if (providerId === 'openrouter') {
      const before = models.length;
      models = models.filter(m => m.endsWith(':free') || m.includes(':free'));
      if (models.length > 0 && models.length < before) {
        console.log(`[ModelScanner] OpenRouter: lọc ${before} model → chỉ giữ ${models.length} model :free (trả phí bỏ qua)`);
      }
    }

    // FIX: If no models found, check for error messages in response
    if (models.length === 0) {
      const errMsg = data.error || data.message || data.detail || '';
      if (errMsg) return { success: false, error: errMsg };
      return { success: false, error: 'No models returned from API' };
    }

    return { success: true, models };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// Test health một model cụ thể (quick ping)
async function quickHealthCheck(providerId, apiKey, modelId) {
  const start = Date.now();

  try {
    const CHAT_ENDPOINTS = {
      gemini: `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      groq: 'https://api.groq.com/openai/v1/chat/completions',
      openrouter: 'https://openrouter.ai/api/v1/chat/completions',
      nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions',
      mistral: 'https://api.mistral.ai/v1/chat/completions',
      cerebras: 'https://api.cerebras.ai/v1/chat/completions',
      cohere: 'https://api.cohere.ai/v2/chat',
      openai: 'https://api.openai.com/v1/chat/completions',
      deepseek: 'https://api.deepseek.com/chat/completions',
      opencode: 'https://opencode.ai/api/v1/chat/completions',
      github: 'https://models.inference.ai.azure.com/chat/completions',
      grok: 'https://api.x.ai/v1/chat/completions',
    };

    const endpoint = CHAT_ENDPOINTS[providerId];
    if (!endpoint) return { status: 'working', latency_ms: 1, reason: 'no_test' };

    // Gemini uses a different format
    if (providerId === 'gemini') {
      const cleanModelId = modelId.replace(/^models\//, '');
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelId}:generateContent?key=${apiKey}`;
      const resp = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 1 } }),
        signal: AbortSignal.timeout(12000)
      });
      const latency = Date.now() - start;
      return resp.ok ? { status: 'working', latency_ms: latency } : { status: 'failed', latency_ms: latency, error: `HTTP ${resp.status}` };
    }

    // Cohere uses different format
    if (providerId === 'cohere') {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
        signal: AbortSignal.timeout(12000)
      });
      const latency = Date.now() - start;
      const data = await resp.json().catch(() => ({}));
      return resp.ok ? { status: 'working', latency_ms: latency } : { status: 'failed', latency_ms: latency, error: data.message || `HTTP ${resp.status}` };
    }

    // OpenCode là CLI local — không cần API key, chỉ cần opencode.exe hoạt động
    if (providerId === 'opencode') {
      const { spawn } = require('child_process');
      const os = require('os');
      const opencodeBin = process.env.OPENCODE_BIN_PATH || (os.homedir() ? require('path').join(os.homedir(), '.opencode', 'bin', 'opencode.exe') : '');
      return await new Promise(resolve => {
        let proc;
        try {
          proc = spawn(opencodeBin, ['--version'], { windowsHide: true, timeout: 8000 });
        } catch(e) {
          return resolve({ status: 'failed', latency_ms: Date.now() - start, error: 'opencode.exe not found' });
        }
        const timer = setTimeout(() => { try { proc.kill(); } catch(e){} resolve({ status: 'failed', latency_ms: Date.now() - start, error: 'timeout' }); }, 8000);
        proc.stdout.on('data', () => {});
        proc.on('error', err => { clearTimeout(timer); resolve({ status: 'failed', latency_ms: Date.now() - start, error: err.message }); });
        proc.on('close', code => {
          clearTimeout(timer);
          resolve(code === 0 ? { status: 'working', latency_ms: Date.now() - start } : { status: 'failed', latency_ms: Date.now() - start, error: 'exit ' + code });
        });
      });
    }

    // OpenAI-compatible format for the rest
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
      signal: AbortSignal.timeout(12000)
    });
    const latency = Date.now() - start;
    const data = await resp.json().catch(() => ({}));
    if (resp.ok && (data.choices || data.id)) return { status: 'working', latency_ms: latency };
    return { status: 'failed', latency_ms: latency, error: data.error?.message || `HTTP ${resp.status}` };
  } catch(e) {
    return { status: 'failed', latency_ms: Date.now() - start, error: e.message };
  }
}

// Lưu kết quả quét vào CSDL
function saveScanResult(providerId, modelId, status, latencyMs, errorMsg) {
  const d = getDB();
  if (!d) return;



  try {
    // Tạo bảng nếu chưa có
    d.exec(`
      CREATE TABLE IF NOT EXISTS model_scan_cache (
        ma_model TEXT NOT NULL,
        ma_nha_cung_cap TEXT NOT NULL,
        trang_thai TEXT NOT NULL,
        do_tre_ms INTEGER DEFAULT 0,
        loi_chi_tiet TEXT,
        thoi_gian_quet TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (ma_model, ma_nha_cung_cap)
      )
    `);
    
    d.prepare(`
      INSERT INTO model_scan_cache (ma_model, ma_nha_cung_cap, trang_thai, do_tre_ms, loi_chi_tiet, thoi_gian_quet)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(ma_model, ma_nha_cung_cap) DO UPDATE SET
        trang_thai = excluded.trang_thai,
        do_tre_ms = excluded.do_tre_ms,
        loi_chi_tiet = excluded.loi_chi_tiet,
        thoi_gian_quet = datetime('now')
    `).run(modelId, providerId, status, latencyMs || 0, errorMsg || null);
    
  } catch(e) {
    console.error('[ModelScanner] Save error:', e.message);
  }
}

// Lưu log thời gian quét gần nhất của provider
function saveProviderScanTime(providerId) {
  const d = getDB();
  if (!d) return;
  try {
    d.exec(`CREATE TABLE IF NOT EXISTS provider_scan_log (
      ma_nha_cung_cap TEXT PRIMARY KEY,
      lan_quet_cuoi TEXT DEFAULT (datetime('now')),
      tong_model INTEGER DEFAULT 0,
      model_hoat_dong INTEGER DEFAULT 0
    )`);
    d.prepare(`
      INSERT INTO provider_scan_log (ma_nha_cung_cap, lan_quet_cuoi)
      VALUES (?, datetime('now'))
      ON CONFLICT(ma_nha_cung_cap) DO UPDATE SET lan_quet_cuoi = datetime('now')
    `).run(providerId);
  } catch(e) {}
}

// Quét toàn bộ một provider
async function scanProvider(providerId) {
  const cfg = PROVIDER_ENDPOINTS[providerId];
  if (!cfg) return { success: false, error: 'Unknown provider' };

  let apiKey = getKeyForProvider(providerId);
  if (!apiKey && !['opencode'].includes(providerId)) {
    return { success: false, error: 'No API key configured', skipped: true };
  }
  if (!apiKey) apiKey = 'free_key';

  console.log(`[ModelScanner] Scanning ${cfg.name}...`);

  const { success, models, error } = await fetchModels(providerId, apiKey, cfg.endpoint, cfg.auth);
  if (!success) {
    console.error(`[ModelScanner] ${cfg.name} fetch failed: ${error}`);
    return { success: false, error };
  }

  if (models.length === 0) {
    console.error(`[ModelScanner] ${cfg.name}: no models returned`);
    return { success: false, error: 'No models returned from API', provider: providerId };
  }


  console.log(`[ModelScanner] ${cfg.name}: ${models.length} models found. Testing health...`);

  // Ưu tiên tuyệt đối đưa kira-mini-1.0 và các model free lên ĐẦU danh sách quét
  const priorityModels = ['kira-mini-1.0', 'gemini-1.5-flash', 'llama-3.3-70b', 'gpt-4o-mini'];
  const priorityKeywords = ['mini', 'free', 'flash', '70b', 'small', 'lite'];
  models.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    if (aLower === 'kira-mini-1.0') return -1;
    if (bLower === 'kira-mini-1.0') return 1;
    const aPri = priorityKeywords.some(kw => aLower.includes(kw));
    const bPri = priorityKeywords.some(kw => bLower.includes(kw));
    if (aPri && !bPri) return -1;
    if (!aPri && bPri) return 1;
    return 0;
  });

  // Test health in parallel batches of 15 (quét TOÀN BỘ model provider đã trả về)
  const modelsToTest = models;
  const results = [];
  const BATCH = 15;
  let consecutiveFailures = 0;

  const filteredModels = modelsToTest;
  for (let i = 0; i < filteredModels.length; i += BATCH) {
    const batch = filteredModels.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(async modelId => {
      const health = await quickHealthCheck(providerId, apiKey, modelId);
      saveScanResult(providerId, modelId, health.status, health.latency_ms, health.error);
      return { id: modelId, ...health };
    }));
    results.push(...batchResults);

    // Early bail-out: only if first batch ALL fail with AUTH errors (401/403 = invalid key)
    // Balance errors (429/402) should NOT trigger bail-out — user just needs to top up
    const batchFailed = batchResults.filter(r => r.status === 'failed').length;
    const hasAuthError = batchResults.some(r => {
      const e = (r.error || '').toLowerCase();
      return e.includes('401') || e.includes('403') || e.includes('unauthorized') || e.includes('invalid') || e.includes('forbidden');
    });
    const allFailed = batchFailed === batch.length;
    consecutiveFailures = allFailed && hasAuthError ? consecutiveFailures + batch.length : (allFailed ? consecutiveFailures : 0);
    if (i === 0 && consecutiveFailures >= batch.length) {
      console.log(`[ModelScanner] ${cfg.name}: first batch all failed with auth errors — key likely invalid, stopping early`);
      break;
    }
  }

  // Only save scan time if we actually tested models
  if (results.length > 0) {
    saveProviderScanTime(providerId);
  }

  const workingList = results.filter(r => r.status === 'working');
  const working = workingList.length;
  console.log(`[ModelScanner] ${cfg.name}: ${working}/${results.length} working`);

  // 🔄 REPLACE POLICY (an toàn): Chỉ khi lượt quét mới có ≥1 model working thì mới thay thế toàn bộ model cũ
  // của provider bằng đúng danh sách working mới (transaction để delete+insert nguyên tử).
  // Nếu 0 working (key lỗi / lỗi mạng tạm thời) → GIỮ NGUYÊN model cũ đang hoạt động, tránh mất trắng provider.
  if (working > 0) {
    try {
      const d = getDB();
      if (d) {
        const replaceTx = d.transaction(() => {
          d.prepare('DELETE FROM ai_models WHERE ma_nha_cung_cap = ?').run(providerId);
          const ins = d.prepare(`
            INSERT INTO ai_models (ma_model, ma_nha_cung_cap, ten_hien_thi, loai, thu_tu_hien_thi, kich_hoat)
            VALUES (?, ?, ?, ?, 0, 1)
          `);
          for (const m of workingList) {
            const modelId = m.id;
            const displayName = modelId.includes('/') ? modelId.split('/').pop() : modelId;
            const type = (modelId.includes('pro') || modelId.includes('gpt-4') || modelId.includes('opus') || modelId.includes('sonnet')) ? 'pro' : 'free';
            ins.run(modelId, providerId, displayName, type);
          }
        });
        replaceTx();
        console.log(`[ModelScanner] ${cfg.name}: đã replace ${working} model working mới vào DB (xóa model cũ)`);
      }
    } catch (repErr) {
      console.error(`[ModelScanner] ${cfg.name} replace models error:`, repErr.message);
    }
  } else {
    console.warn(`[ModelScanner] ${cfg.name}: 0 model working trong lượt quét này — giữ nguyên model cũ đang hoạt động`);
  }

  return { success: true, provider: providerId, total: results.length, working, results };
}

// Quét tất cả providers tuần tự
async function scanAllProviders() {
  console.log('[ModelScanner] Starting full scan of all providers...');
  const summary = [];
  for (const providerId of Object.keys(PROVIDER_ENDPOINTS)) {
    try {
      const result = await scanProvider(providerId);
      summary.push({ providerId, ...result });
    } catch(e) {
      console.error(`[ModelScanner] Error scanning ${providerId}:`, e.message);
      summary.push({ providerId, success: false, error: e.message });
    }
  }
  console.log('[ModelScanner] Full scan complete.');

  // Notify connected frontends via SSE
  const working = summary.reduce((a, s) => a + (s.working || 0), 0);
  const total = summary.reduce((a, s) => a + (s.total || 0), 0);
  if (typeof global !== 'undefined' && global.__modelScanComplete) {
    global.__modelScanComplete({ working, total, providers: summary.length });
  }

  return summary;
}

// Dọn "model ma": model của provider không còn key thì không thể hoạt động → xóa sạch
function cleanupStaleModels(providerId) {
  try {
    const d = getDB();
    if (!d) return;
    const del1 = d.prepare('DELETE FROM ai_models WHERE ma_nha_cung_cap = ?').run(providerId);
    const del2 = d.prepare('DELETE FROM model_scan_cache WHERE ma_nha_cung_cap = ?').run(providerId);
    if (del1.changes > 0 || del2.changes > 0) {
      console.log(`[ModelScanner] Đã dọn ${del1.changes} model ma của provider '${providerId}' (không còn key)`);
    }
  } catch(e) { /* ignore */ }
}

// Quét khi server khởi động — chỉ scan provider có key, bỏ qua provider không có key
async function scanOnStartup() {
  console.log('[ModelScanner] Startup scan: checking providers with keys...');
  const summary = [];
  for (const providerId of Object.keys(PROVIDER_ENDPOINTS)) {
    const apiKey = getKeyForProvider(providerId);
    // Bỏ qua provider KHÔNG có key, TRỪ các provider không cần key (local CLI / free)
    if (!apiKey && !['opencode'].includes(providerId)) {
      cleanupStaleModels(providerId); // provider không có key → dọn model ma cũ của họ
      continue;
    }
    try {
      const result = await scanProvider(providerId);
      summary.push({ providerId, ...result });
    } catch(e) {
      console.error(`[ModelScanner] Startup scan error ${providerId}:`, e.message);
    }
  }
  const working = summary.reduce((a, s) => a + (s.working || 0), 0);
  const total = summary.reduce((a, s) => a + (s.total || 0), 0);
  console.log(`[ModelScanner] Startup scan complete: ${working}/${total} working models from ${summary.length} providers`);

  // Notify connected frontends
  if (typeof global !== 'undefined' && global.__modelScanComplete) {
    global.__modelScanComplete({ working, total, providers: summary.length, startup: true });
  }

  return summary;
}

// ─── Thời gian quét cố định hàng ngày (cấu hình được từ Admin) ────────
// Mặc định 3:00 AM. Lưu HH:MM (vd '03:30') trong bảng app_settings (key-value).
const DEFAULT_SCAN_TIME = '03:00';

// Chuyển đổi giá trị lưu trong DB thành { hour, minute }.
// Hỗ trợ cả dữ liệu cũ ('3' / 5 = giờ nguyên) lẫn mới ('03:30').
function normalizeScanTime(raw) {
  const s = String(raw ?? '').trim();
  if (/^\d{1,2}$/.test(s)) {
    const h = parseInt(s, 10);
    return (h >= 0 && h <= 23) ? { hour: h, minute: 0 } : { hour: 3, minute: 0 };
  }
  const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m) {
    const h = parseInt(m[1], 10);
    const mi = parseInt(m[2], 10);
    if (h >= 0 && h <= 23 && mi >= 0 && mi <= 59) return { hour: h, minute: mi };
  }
  return { hour: 3, minute: 0 };
}

function getScanTime() {
  try {
    const d = getDB();
    if (!d) return normalizeScanTime(DEFAULT_SCAN_TIME);
    d.exec(`CREATE TABLE IF NOT EXISTS app_settings (
      khoa TEXT PRIMARY KEY,
      gia_tri TEXT
    )`);
    const row = d.prepare("SELECT gia_tri FROM app_settings WHERE khoa = 'model_scan_time'").get();
    if (row) return normalizeScanTime(row.gia_tri);
    // Tương thích dữ liệu cũ: key 'model_scan_hour' (giờ nguyên)
    const oldRow = d.prepare("SELECT gia_tri FROM app_settings WHERE khoa = 'model_scan_hour'").get();
    if (oldRow) return normalizeScanTime(oldRow.gia_tri);
    return normalizeScanTime(DEFAULT_SCAN_TIME);
  } catch(e) { return normalizeScanTime(DEFAULT_SCAN_TIME); }
}

function setScanTime(hour, minute) {
  const h = parseInt(hour, 10);
  const m = parseInt(minute ?? 0, 10);
  if (!(h >= 0 && h <= 23) || !(m >= 0 && m <= 59)) return false;
  try {
    const d = getDB();
    if (!d) return false;
    d.exec(`CREATE TABLE IF NOT EXISTS app_settings (
      khoa TEXT PRIMARY KEY,
      gia_tri TEXT
    )`);
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    d.prepare(`INSERT INTO app_settings (khoa, gia_tri) VALUES ('model_scan_time', ?)
      ON CONFLICT(khoa) DO UPDATE SET gia_tri = excluded.gia_tri`).run(timeStr);
    // Dọn key cũ (nếu tồn tại từ bản trước)
    try { d.prepare(`DELETE FROM app_settings WHERE khoa = 'model_scan_hour'`).run(); } catch(e) {}
    return true;
  } catch(e) { return false; }
}

// Tương thích ngược: giữ hàm cũ dùng cho log/API cũ
function getScanHour() { return getScanTime().hour; }
function setScanHour(hour) { return setScanTime(hour, 0); }

// Tính số ms tới lần quét kế tiếp theo thời gian cố định (mặc định 3:00 AM)
function msUntilNextScanTime() {
  const { hour, minute } = getScanTime();
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1); // nếu đã qua giờ hôm nay → ngày mai
  return next.getTime() - now.getTime();
}

// Quét vào giờ cố định mỗi ngày (mặc định 3:00 AM, đổi được từ Admin)
let pendingScanTimer = null;
let schedulerStarted = false;

const scheduleNextScan = () => {
  const waitMs = msUntilNextScanTime();
  const { hour, minute } = getScanTime();
  console.log(`[ModelScanner] Scheduler: lần quét kế tiếp lúc ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (${Math.round(waitMs / 60000)} phút nữa)`);
  pendingScanTimer = setTimeout(async () => {
    try {
      await scanAllProviders();
    } catch(e) { console.error('[ModelScanner] Periodic scan failed:', e.message); }
    scheduleNextScan();
  }, waitMs);
};

// Đổi giờ quét từ Admin → lập lịch lại ngay (áp dụng tức thì, không phải chờ ngày mai)
function rescheduleModelScan() {
  if (!schedulerStarted) return; // scheduler chưa được bật → không tự khởi động vòng lặp
  if (pendingScanTimer) { clearTimeout(pendingScanTimer); pendingScanTimer = null; }
  scheduleNextScan();
}

// Khởi động cron: scan ngay khi bật (5s) + quét vào giờ cố định mỗi ngày
function startModelScannerScheduler() {
  // Scan ngay khi server khởi động (delay 5s để server ổn định)
  setTimeout(() => {
    scanOnStartup().catch(e => console.error('[ModelScanner] Startup scan failed:', e.message));
  }, 5000);

  schedulerStarted = true;
  scheduleNextScan();

  const t = getScanTime();
  console.log(`[ModelScanner] Scheduler started: startup scan in 5s, then daily at ${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`);
}

module.exports = { startModelScannerScheduler, scanAllProviders, scanOnStartup, scanProvider, PROVIDER_ENDPOINTS, getScanHour, setScanHour, getScanTime, setScanTime, rescheduleModelScan };
