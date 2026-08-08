/**
 * model-scanner.scheduler.js
 * Cron Job tự động quét tất cả providers mỗi 24h (lúc 3:00 AM)
 * và publish các model đang hoạt động lên CSDL
 *
 * FIX PROD: dùng adapter db.js (SQLite local / PostgreSQL trên Render) thay vì
 * better-sqlite3 file cứng — trước đây chỉ chạy đúng trên máy local.
 */
const db = require('./config/db');

// Biểu thức thời gian theo loại DB
const isSqlite = db.type === 'sqlite';
const NOW = () => (isSqlite ? "datetime('now')" : 'NOW()');

// ─── Promise helpers cho adapter (callback-based) ─────────────
function runSql(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function(err) { err ? reject(err) : resolve(this && this.changes != null ? this.changes : 0); }));
}
function getRow(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
}
function allRows(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || [])));
}
// Chuyển giá trị thời gian từ DB (SQLite text / PG Date) về ms
function toTimeMs(t) {
  if (!t) return NaN;
  if (t instanceof Date) return t.getTime();
  return new Date(String(t).replace(' ', 'T') + 'Z').getTime();
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
async function getKeyForProvider(providerId) {
  try {
    const row = await getRow("SELECT gia_tri_khoa FROM khoa_api WHERE LOWER(ten_nha_cung_cap) = LOWER(?)", [providerId]);
    return row?.gia_tri_khoa?.trim() || null;
  } catch (e) { return null; }
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

// Lưu kết quả quét vào CSDL (bảng đã được tạo bởi init-db khi khởi động)
async function saveScanResult(providerId, modelId, status, latencyMs, errorMsg) {
  try {
    await runSql(`
      INSERT INTO model_scan_cache (ma_model, ma_nha_cung_cap, trang_thai, do_tre_ms, loi_chi_tiet, thoi_gian_quet)
      VALUES (?, ?, ?, ?, ?, ${NOW()})
      ON CONFLICT(ma_model, ma_nha_cung_cap) DO UPDATE SET
        trang_thai = excluded.trang_thai,
        do_tre_ms = excluded.do_tre_ms,
        loi_chi_tiet = excluded.loi_chi_tiet,
        thoi_gian_quet = ${NOW()}
    `, [modelId, providerId, status, latencyMs || 0, errorMsg || null]);
  } catch(e) {
    console.error('[ModelScanner] Save error:', e.message);
  }
}

// Lưu log thời gian quét gần nhất của provider
async function saveProviderScanTime(providerId, total = 0, working = 0) {
  try {
    await runSql(`
      INSERT INTO provider_scan_log (ma_nha_cung_cap, lan_quet_cuoi, tong_model, model_hoat_dong)
      VALUES (?, ${NOW()}, ?, ?)
      ON CONFLICT(ma_nha_cung_cap) DO UPDATE SET
        lan_quet_cuoi = ${NOW()},
        tong_model = excluded.tong_model,
        model_hoat_dong = excluded.model_hoat_dong
    `, [providerId, total, working]);
  } catch(e) {}
}

// Phân loại lý do khi lượt quét ra 0 model working — để Admin hiển thị rõ cho người dùng
function classifyZeroWorkingReason(results) {
  if (!results || results.length === 0) return 'Không có model nào để kiểm tra';
  const errs = results.map(r => String(r.error || '').toLowerCase());
  const allFailed = results.every(r => r.status === 'failed');
  if (allFailed) {
    // Chịu đựng lỗi hỗn hợp: nếu ≥1 nửa số lỗi là rate-limit → kết luận rate-limit
    const rateLimitedCount = errs.filter(e => e.includes('429') || e.includes('rate limit') || e.includes('quota')).length;
    if (rateLimitedCount >= Math.ceil(errs.length / 2)) {
      return 'Rate limit (429) — hết quota free, chờ reset hoặc nạp credits';
    }
    if (errs.some(e => e.includes('401') || e.includes('403') || e.includes('unauthorized') || e.includes('invalid') || e.includes('forbidden'))) {
      return 'API key bị từ chối (401/403) — kiểm tra lại key';
    }
  }
  return 'Không model nào trả lời được (provider đang lỗi / hết hạn)';
}

// Quét toàn bộ một provider
async function scanProvider(providerId) {
  const cfg = PROVIDER_ENDPOINTS[providerId];
  if (!cfg) return { success: false, error: 'Unknown provider' };

  let apiKey = await getKeyForProvider(providerId);
  if (!apiKey && !['opencode'].includes(providerId)) {
    return { success: false, error: 'No API key configured', skipped: true };
  }
  if (!apiKey) apiKey = 'free_key';

  console.log(`[ModelScanner] Scanning ${cfg.name}...`);

  // ⏱️ Ghi thời điểm thử quét NGAY từ đầu (kể cả fetch fail) để cooldown startup áp dụng cho mọi provider
  await saveProviderScanTime(providerId, 0, 0);

  let { success, models, error } = await fetchModels(providerId, apiKey, cfg.endpoint, cfg.auth);
  if (!success) {
    console.error(`[ModelScanner] ${cfg.name} fetch failed: ${error}`);
    return { success: false, error };
  }

  if (models.length === 0) {
    console.error(`[ModelScanner] ${cfg.name}: no models returned`);
    return { success: false, error: 'No models returned from API', provider: providerId };
  }

  console.log(`[ModelScanner] ${cfg.name}: ${models.length} models found. Optimizing scan...`);

  // ─── TỐI UU HÓA 1: Filter model không phải chat ──────────────
  const SKIP_PATTERNS = [/embed/i, /image/i, /dall-e/i, /tts/i, /rerank/i, /moderation/i, /whisper/i, /speech/i, /audio/i, /stable-diffusion/i, /midjourney/i, /vision/i, /embed/i, /inpainting/i, /upscale/i];
  const beforeFilter = models.length;
  models = models.filter(m => !SKIP_PATTERNS.some(p => p.test(m)));
  if (models.length < beforeFilter) {
    console.log(`[ModelScanner] ${cfg.name}: filtered ${beforeFilter - models.length} non-chat models → ${models.length} remaining`);
  }

  // ─── TỐI UU HÓA 2: Skip model đã test gần đây ───────────────
  const results = [];   // khai báo sớm để cả 2 luồng (skip + health test) cùng dùng
  let skipCount = 0;
  try {
    const recent = await allRows(`
      SELECT ma_model, trang_thai, thoi_gian_quet
      FROM model_scan_cache WHERE ma_nha_cung_cap = ?
    `, [providerId]);

    const now = Date.now();
    const WORKING_TTL = 24 * 60 * 60 * 1000;  // 24h — working model giữ nguyên
    const FAILED_TTL = 6 * 60 * 60 * 1000;    // 6h — failed model bỏ qua, không retry sớm
    const recentMap = new Map();
    for (const row of recent) {
      recentMap.set(row.ma_model, { status: row.trang_thai, time: toTimeMs(row.thoi_gian_quet) });
    }

    const modelsToKeep = [];
    const skippedModels = [];  // track models skipped vì vừa test xong
    for (const m of models) {
      const prev = recentMap.get(m);
      if (!prev) { modelsToKeep.push(m); continue; }           // chưa test → cần test
      const age = now - prev.time;
      if (prev.status === 'working' && age < WORKING_TTL) { skippedModels.push(m); continue; } // working 24h → skip
      if (prev.status === 'failed' && age < FAILED_TTL) { skipCount++; continue; }    // failed 6h → skip
      modelsToKeep.push(m);  // hết TTL → test lại
    }
    models = modelsToKeep;

    // Lưu skipped models (vừa test < 24h, đang working) để giữ lại trong DB
    if (skippedModels.length > 0) {
      for (const m of skippedModels) {
        results.push({ id: m, status: 'working', latency_ms: 0, skipped: true });
      }
      console.log(`[ModelScanner] ${cfg.name}: preserved ${skippedModels.length} recently-working models`);
    }
  } catch { /* ignore — scan bình thường nếu DB fail */ }
  if (skipCount > 0) {
    console.log(`[ModelScanner] ${cfg.name}: skipped ${skipCount} recently tested → ${models.length} to scan`);
  }

  // Ưu tiên: model free/mini/flash lên đầu
  const priorityKeywords = ['mini', 'free', 'flash', '70b', 'small', 'lite'];
  models.sort((a, b) => {
    const aPri = priorityKeywords.some(kw => a.toLowerCase().includes(kw));
    const bPri = priorityKeywords.some(kw => b.toLowerCase().includes(kw));
    if (aPri && !bPri) return -1;
    if (!aPri && bPri) return 1;
    return 0;
  });

  // ─── Test health: batch 8, early exit khi provider ổn định ────
  const BATCH = 8;
  const BATCH_DELAY_MS = 600;
  let consecutiveFailures = 0;
  let consecutiveSuccesses = 0;
  const EARLY_SUCCESS_THRESHOLD = 12; // 12 model liên tiếp working → provider ổn, bỏ qua phần còn lại

  for (let i = 0; i < models.length; i += BATCH) {
    const batch = models.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(async modelId => {
      const health = await quickHealthCheck(providerId, apiKey, modelId);
      await saveScanResult(providerId, modelId, health.status, health.latency_ms, health.error);
      return { id: modelId, ...health };
    }));
    results.push(...batchResults);

    // Early bail-out: first batch ALL fail auth → key invalid
    const batchFailed = batchResults.filter(r => r.status === 'failed').length;
    const hasAuthError = batchResults.some(r => {
      const e = (r.error || '').toLowerCase();
      return e.includes('401') || e.includes('403') || e.includes('unauthorized') || e.includes('invalid') || e.includes('forbidden');
    });
    const allFailed = batchFailed === batch.length;
    consecutiveFailures = allFailed && hasAuthError ? consecutiveFailures + batch.length : (allFailed ? consecutiveFailures : 0);
    if (i === 0 && consecutiveFailures >= batch.length) {
      console.log(`[ModelScanner] ${cfg.name}: first batch all auth errors — key invalid, stopping`);
      break;
    }

    // Early success: nếu 12+ model liên tiếp working → provider ổn, bỏ qua phần còn lại
    const batchSuccesses = batchResults.filter(r => r.status === 'working').length;
    consecutiveSuccesses = batchSuccesses > 0 ? consecutiveSuccesses + batchSuccesses : 0;
    if (consecutiveSuccesses >= EARLY_SUCCESS_THRESHOLD && i + BATCH < models.length) {
      console.log(`[ModelScanner] ${cfg.name}: ${consecutiveSuccesses} consecutive working — provider healthy, skipping remaining ${models.length - i - BATCH} models`);
      // Mark skipped models as "skipped" (không gọi API)
      const skipped = models.slice(i + BATCH);
      for (const m of skipped) {
        await saveScanResult(providerId, m, 'skipped', 0, 'provider_healthy');
        results.push({ id: m, status: 'skipped', latency_ms: 0, reason: 'provider_healthy' });
      }
      break;
    }

    // Pacing
    if (i + BATCH < models.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  const workingList = results.filter(r => r.status === 'working');
  const working = workingList.length;

  // Only save scan time if we actually tested models (lưu kèm tổng + số working vào provider_scan_log)
  if (results.length > 0) {
    await saveProviderScanTime(providerId, results.length, working);
  }

  console.log(`[ModelScanner] ${cfg.name}: ${working}/${results.length} working`);

  // 🔄 RESET THÔNG MINH (Smart Reset): mỗi lượt quét = 1 lần reset của chính provider đó.
  // ≥1 model working → XÓA HẾT model cũ + insert đúng danh sách working mới.
  // 0 working (mạng lỗi / rate-limit / key lỗi tạm thời) → GIỮ model cũ + báo rõ lý do, tránh mất trắng provider.
  let keptOld = false;
  let keptOldReason = '';
  if (working > 0) {
    try {
      // 🔒 ATOMIC SWAP: xóa model cũ + insert model mới trong 1 transaction (BEGIN/COMMIT/ROLLBACK)
      // — crash giữa chừng sẽ rollback toàn bộ, KHÔNG bao giờ để bảng rỗng nửa vời giữa 2 DB.
      await db.withTransaction(async (tx) => {
        await tx.run('DELETE FROM ai_models WHERE ma_nha_cung_cap = ?', [providerId]);
        const ins = `
          INSERT INTO ai_models (ma_model, ma_nha_cung_cap, ten_hien_thi, loai, thu_tu_hien_thi, kich_hoat)
          VALUES (?, ?, ?, ?, 0, 1)
        `;
        for (const m of workingList) {
          const modelId = m.id;
          const displayName = modelId.includes('/') ? modelId.split('/').pop() : modelId;
          const type = (modelId.includes('pro') || modelId.includes('gpt-4') || modelId.includes('opus') || modelId.includes('sonnet')) ? 'pro' : 'free';
          await tx.run(ins, [modelId, providerId, displayName, type]);
        }
      });
      console.log(`[ModelScanner] ${cfg.name}: đã replace ${working} model working mới vào DB (xóa model cũ, atomic)`);
    } catch (repErr) {
      console.error(`[ModelScanner] ${cfg.name} replace models error:`, repErr.message);
    }
  } else {
    keptOld = true;
    keptOldReason = classifyZeroWorkingReason(results);
    console.warn(`[ModelScanner] ${cfg.name}: 0 model working — giữ nguyên model cũ. Lý do: ${keptOldReason}`);
  }

  return { success: true, provider: providerId, total: results.length, working, results, keptOld, keptOldReason };
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
async function cleanupStaleModels(providerId) {
  try {
    const del1 = await runSql('DELETE FROM ai_models WHERE ma_nha_cung_cap = ?', [providerId]);
    const del2 = await runSql('DELETE FROM model_scan_cache WHERE ma_nha_cung_cap = ?', [providerId]);
    if (del1 || del2) {
      console.log(`[ModelScanner] Đã dọn model ma của provider '${providerId}' (không còn key)`);
    }
  } catch(e) { /* ignore */ }
}

// ⏱️ Cooldown quét khi khởi động server: nếu provider vừa được quét trong khoảng thời gian này
// (mặc định 6h) thì bỏ qua — tránh đốt quota free + không làm gián đoạn người dùng khi restart.
const STARTUP_SCAN_COOLDOWN_MS = 6 * 60 * 60 * 1000;

// Kiểm tra provider có được quét gần đây chưa (dựa trên provider_scan_log)
async function wasRecentlyScanned(providerId, cooldownMs) {
  try {
    const row = await getRow('SELECT lan_quet_cuoi FROM provider_scan_log WHERE ma_nha_cung_cap = ?', [providerId]);
    if (!row || !row.lan_quet_cuoi) return false;
    const last = toTimeMs(row.lan_quet_cuoi);
    if (isNaN(last)) return false;
    return (Date.now() - last) < cooldownMs;
  } catch (e) { return false; }
}

// Quét khi server khởi động — chỉ scan provider có key, bỏ qua provider không có key
async function scanOnStartup() {
  console.log('[ModelScanner] Startup scan: checking providers with keys...');
  const summary = [];
  for (const providerId of Object.keys(PROVIDER_ENDPOINTS)) {
    const apiKey = await getKeyForProvider(providerId);
    // Bỏ qua provider KHÔNG có key, TRỪ các provider không cần key (local CLI / free)
    if (!apiKey && !['opencode'].includes(providerId)) {
      await cleanupStaleModels(providerId); // provider không có key → dọn model ma cũ của họ
      continue;
    }
    // ⏱️ Cooldown: provider vừa quét < 6h trước → bỏ qua (không đốt quota, không làm phiền người dùng)
    if (await wasRecentlyScanned(providerId, STARTUP_SCAN_COOLDOWN_MS)) {
      console.log(`[ModelScanner] Startup: bỏ qua ${providerId} — đã quét gần đây (cooldown 6h)`);
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

// ─── Startup + Weekly Reset (chỉ quét khi server khởi động + mỗi CN→T2 00:00) ──
let schedulerStarted = false;

async function startModelScannerScheduler() {
  // Scan ngay khi server khởi động (delay 5s để server ổn định)
  setTimeout(() => {
    scanOnStartup().catch(e => console.error('[ModelScanner] Startup scan failed:', e.message));
  }, 5000);

  schedulerStarted = true;
  try {
    await scheduleWeeklyReset();  // ← Weekly reset: CN → T2 00:00 VN
    const schedule = await getWeeklySchedule();
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    console.log(`[ModelScanner] Scheduler started: startup scan in 5s, weekly reset ${dayNames[schedule.day]} ${schedule.time}`);
  } catch (e) {
    console.error('[ModelScanner] Scheduler init error:', e.message);
  }
}

// ─── WEEKLY SCHEDULE: get/set từ DB ─────────────────────────────
// Mặc định: day=1 (Thứ 2), time='00:00'
const DEFAULT_SCHEDULE = { day: 1, time: '00:00' }; // 0=CN,1=T2,...,6=T7

async function getWeeklySchedule() {
  try {
    const row = await getRow("SELECT gia_tri FROM app_settings WHERE khoa = 'weekly_scan_schedule'");
    if (row && row.gia_tri) {
      const parsed = JSON.parse(row.gia_tri);
      if (typeof parsed.day === 'number' && typeof parsed.time === 'string') return parsed;
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_SCHEDULE };
}

async function setWeeklySchedule(day, time) {
  try {
    const val = JSON.stringify({ day, time });
    await runSql(`INSERT INTO app_settings (khoa, gia_tri) VALUES ('weekly_scan_schedule', ?)
      ON CONFLICT(khoa) DO UPDATE SET gia_tri = excluded.gia_tri`, [val]);
    return true;
  } catch { return false; }
}

async function resetWeeklySchedule() {
  await setWeeklySchedule(DEFAULT_SCHEDULE.day, DEFAULT_SCHEDULE.time);
}

// ─── WEEKLY RESET: clear cache + scan full mỗi tuần ─────────────
let weeklyResetTimer = null;

async function resetScanCache() {
  try {
    const row = await getRow('SELECT COUNT(*) as cnt FROM model_scan_cache');
    const count = row?.cnt || 0;
    await runSql('DELETE FROM model_scan_cache');
    console.log(`[ModelScanner] Weekly reset: cleared ${count} cached scan results`);
    return count;
  } catch (e) {
    console.error('[ModelScanner] Weekly reset failed:', e.message);
    return 0;
  }
}

async function msUntilNextWeeklyScan() {
  const { day, time } = await getWeeklySchedule(); // day: 0=CN,1=T2,...,6=T7
  const [hourStr, minStr] = time.split(':');
  const targetHour = parseInt(hourStr, 10);
  const targetMin = parseInt(minStr, 10);

  const now = new Date();
  // Target ở VN timezone (UTC+7) → convert sang UTC
  const targetUtcHour = (targetHour - 7 + 24) % 24;

  // Tính số ngày tới ngày target trong tuần
  const utcDay = now.getUTCDay();
  let daysUntilTarget;
  if (utcDay === day && now.getUTCHours() < targetUtcHour) {
    daysUntilTarget = 0;
  } else if (utcDay === day && now.getUTCHours() === targetUtcHour && now.getUTCMinutes() < targetMin) {
    daysUntilTarget = 0;
  } else {
    daysUntilTarget = ((day - utcDay) + 7) % 7;
    if (daysUntilTarget === 0) daysUntilTarget = 7;
  }

  const target = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilTarget,
    targetUtcHour, targetMin, 0, 0
  ));

  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 7);
  }

  return target.getTime() - now.getTime();
}

async function scheduleWeeklyReset() {
  if (weeklyResetTimer) clearTimeout(weeklyResetTimer);
  const waitMs = await msUntilNextWeeklyScan();
  const days = Math.floor(waitMs / 86400000);
  const hours = Math.floor((waitMs % 86400000) / 3600000);
  const schedule = await getWeeklySchedule();
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  console.log(`[ModelScanner] Weekly reset scheduled: ${dayNames[schedule.day]} ${schedule.time} (${days}d ${hours}h from now)`);

  weeklyResetTimer = setTimeout(async () => {
    try {
      console.log('[ModelScanner] ═══ WEEKLY RESET START ═══');
      await resetScanCache();
      await scanAllProviders();
      console.log('[ModelScanner] ═══ WEEKLY RESET COMPLETE ═══');
    } catch (e) {
      console.error('[ModelScanner] Weekly reset scan failed:', e.message);
    }
    // Quét xong → reset về mặc định (CN→T2 00:00)
    await resetWeeklySchedule();
    console.log('[ModelScanner] Schedule reset to default: CN → T2 00:00');
    await scheduleWeeklyReset(); // Lên lịch tuần tiếp theo (mặc định)
  }, waitMs);
}

module.exports = { startModelScannerScheduler, scanAllProviders, scanOnStartup, scanProvider, PROVIDER_ENDPOINTS, getWeeklySchedule, setWeeklySchedule, resetWeeklySchedule, scheduleWeeklyReset };
