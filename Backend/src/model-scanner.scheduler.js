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
    
    // Auto-publish working models
    if (status === 'working') {
      const displayName = modelId.includes('/') ? modelId.split('/').pop() : modelId;
      const type = (modelId.includes('pro') || modelId.includes('gpt-4') || modelId.includes('opus') || modelId.includes('sonnet')) ? 'pro' : 'free';
      d.prepare(`
        INSERT INTO ai_models (ma_model, ma_nha_cung_cap, ten_hien_thi, loai, thu_tu_hien_thi, kich_hoat)
        VALUES (?, ?, ?, ?, 0, 1)
        ON CONFLICT(ma_model) DO UPDATE SET kich_hoat = 1, ten_hien_thi = excluded.ten_hien_thi, ngay_cap_nhat = CURRENT_TIMESTAMP
      `).run(modelId, providerId, displayName, type);
    } else {
      // Disable failed models
      d.prepare(`UPDATE ai_models SET kich_hoat = 0 WHERE ma_model = ? AND ma_nha_cung_cap = ?`).run(modelId, providerId);
    }
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

  const working = results.filter(r => r.status === 'working').length;
  console.log(`[ModelScanner] ${cfg.name}: ${working}/${results.length} working`);

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

// Quét khi server khởi động — chỉ scan provider có key, bỏ qua provider không có key
async function scanOnStartup() {
  console.log('[ModelScanner] Startup scan: checking providers with keys...');
  const summary = [];
  for (const providerId of Object.keys(PROVIDER_ENDPOINTS)) {
    const apiKey = getKeyForProvider(providerId);
    // Bỏ qua provider KHÔNG có key, TRỪ các provider không cần key (local CLI / free)
    if (!apiKey && !['opencode'].includes(providerId)) continue;
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

// Khởi động cron job tự động mỗi 6h
function startModelScannerScheduler() {
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  // Scan ngay khi server khởi động (delay 5s để server ổn định)
  setTimeout(() => {
    scanOnStartup().catch(e => console.error('[ModelScanner] Startup scan failed:', e.message));
  }, 5000);

  // sau đó mỗi 6h
  setInterval(() => {
    scanAllProviders().catch(e => console.error('[ModelScanner] Periodic scan failed:', e.message));
  }, SIX_HOURS);

  console.log(`[ModelScanner] Scheduler started: startup scan in 5s, then every 6h`);
}

module.exports = { startModelScannerScheduler, scanAllProviders, scanOnStartup, scanProvider, PROVIDER_ENDPOINTS };
