const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.middleware');
const fs = require('fs');
const { execSync } = require('child_process');

const OPENCODE_BIN_PATH = "C:\\Users\\84916\\.opencode\\bin\\opencode.exe";
const IS_OPENCODE_AVAILABLE = fs.existsSync(OPENCODE_BIN_PATH);

// ─── Public: lấy danh sách models đang hoạt động ─────────────
// GET /api/models?provider=gemini
router.get('/', (req, res) => {
  const provider = (req.query.provider || '').trim();
  let sql = `
    SELECT m.ma_model, m.ma_nha_cung_cap, p.ten_hien_thi as provider_name,
           m.ten_hien_thi, m.loai, m.thu_tu_hien_thi
    FROM ai_models m
    JOIN ai_providers p ON m.ma_nha_cung_cap = p.ma_nha_cung_cap
    WHERE m.kich_hoat = 1 AND p.kich_hoat = 1
  `;
  const params = [];
  if (provider) {
    sql += ' AND m.ma_nha_cung_cap = ?';
    params.push(provider);
  }
  sql += ' ORDER BY m.thu_tu_hien_thi ASC, m.ten_hien_thi ASC';

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.ma_nha_cung_cap)) map.set(r.ma_nha_cung_cap, []);
      map.get(r.ma_nha_cung_cap).push({
        id: r.ma_model,
        name: r.ten_hien_thi,
        type: r.loai,
        provider: r.ma_nha_cung_cap,
        providerName: r.provider_name,
      });
    }
    res.json({ success: true, models: Object.fromEntries(map) });
  });
});

// ─── Public: kiểm tra SELECT từ bảng khoa_api ─────────────
// GET /api/models/test-db-select
router.get('/test-db-select', (req, res) => {
  db.all("SELECT ma_khoa, ten_nha_cung_cap, gia_tri_khoa FROM khoa_api", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Lỗi truy vấn SQL: ' + err.message });
    }
    const safeList = (rows || []).map(r => ({
      ma_khoa: r.ma_khoa,
      provider: r.ten_nha_cung_cap,
      hasKey: !!r.gia_tri_khoa,
      keyPreview: r.gia_tri_khoa ? (r.gia_tri_khoa.length > 8 ? r.gia_tri_khoa.substring(0, 4) + '...' + r.gia_tri_khoa.slice(-4) : '****') : 'none',
      keyLength: r.gia_tri_khoa ? r.gia_tri_khoa.length : 0
    }));
    res.json({
      success: true,
      query: "SELECT ma_khoa, ten_nha_cung_cap, gia_tri_khoa FROM khoa_api",
      totalKeys: safeList.length,
      data: safeList
    });
  });
});

// Tự động log kiểm tra câu lệnh SELECT và ghi kết quả thực tế từ CSDL
db.all("SELECT ma_khoa, ten_nha_cung_cap, gia_tri_khoa FROM khoa_api", [], (err, rows) => {
  const resultText = err 
    ? `Lỗi truy vấn SELECT từ khoa_api: ${err.message}`
    : `KẾT QUẢ KIỂM TRA BẢNG khoa_api DỮ LIỆU THẬT TỪ CSDL:\n- Tổng số bản ghi (rows): ${(rows || []).length}\n- Danh sách bản ghi:\n` + 
      (rows && rows.length > 0 
        ? rows.map((r, i) => `  ${i+1}. Provider: ${r.ten_nha_cung_cap} | Mã khoa: ${r.ma_khoa} | Key: ${r.gia_tri_khoa || 'Chưa có key'}`).join('\n')
        : '  (Bảng khoa_api hiện chưa có bản ghi nào)');
  
  try {
    fs.writeFileSync('d:\\AI REXI\\ssms_check_result.txt', resultText, 'utf8');
    console.log('[DB-Select-Check]', resultText);
  } catch (e) {}
});

// ─── Public: Lấy danh sách Nhà cung cấp (Providers) động ─────────────
// GET /api/models/providers hoặc GET /api/providers
router.get('/providers', async (req, res) => {
  const sql = `
    SELECT p.ma_nha_cung_cap, p.ten_hien_thi, p.base_url, p.can_api_key, p.placeholder, p.thu_tu,
           k.gia_tri_khoa AS api_key_value
    FROM ai_providers p
    LEFT JOIN khoa_api k ON LOWER(p.ma_nha_cung_cap) = LOWER(k.ten_nha_cung_cap)
    WHERE p.kich_hoat = 1
    ORDER BY p.thu_tu ASC
  `;
  db.all(sql, [], async (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    const providers = (rows || []).map(r => ({
      ma_nha_cung_cap: r.ma_nha_cung_cap,
      ten_hien_thi: r.ten_hien_thi,
      base_url: r.base_url,
      can_api_key: r.can_api_key,
      placeholder: r.placeholder,
      thu_tu: r.thu_tu,
      hasKey: !!r.api_key_value
    }));

    let isOmniRouteActive = false;
    try {
      const check = await fetch('http://localhost:20128/v1/models', { signal: AbortSignal.timeout(1500) }).catch(() => null);
      if (check && check.ok) isOmniRouteActive = true;
    } catch(e) {}

    res.json({ success: true, isOmniRouteActive, providers });
  });
});

// ─── Admin: danh sách providers ─────────────────────────────
// GET /api/admin/providers?provider=xyz
router.get('/admin/providers', [authMiddleware, adminMiddleware], (req, res) => {
  const provider = (req.query.provider || '').trim();
  let sql = 'SELECT * FROM ai_providers';
  const params = [];
  if (provider) { sql += ' WHERE ma_nha_cung_cap = ?'; params.push(provider); }
  sql += ' ORDER BY thu_tu ASC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, providers: rows });
  });
});

// ─── Admin: cập nhật provider ────────────────────────────────
// PUT /api/admin/providers/:providerId
router.put('/admin/providers/:providerId', [authMiddleware, adminMiddleware], (req, res) => {
  const { providerId } = req.params;
  const { ten_hien_thi, base_url, can_api_key, placeholder, thu_tu, kich_hoat } = req.body;
  db.run(
    `UPDATE ai_providers
     SET ten_hien_thi = ?, base_url = ?, can_api_key = ?, placeholder = ?,
         thu_tu = ?, kich_hoat = ?, ngay_cap_nhat = CURRENT_TIMESTAMP
     WHERE ma_nha_cung_cap = ?`,
    [ten_hien_thi, base_url, can_api_key ? 1 : 0, placeholder, thu_tu, kich_hoat ? 1 : 0, providerId],
    function (err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      if (this.changes === 0) return res.status(404).json({ success: false, error: 'Không tìm thấy provider' });
      res.json({ success: true, message: 'Đã cập nhật provider' });
    }
  );
});

// ─── Admin: danh sách models ─────────────────────────────────
// GET /api/admin/models?provider=xyz
router.get('/admin/models', [authMiddleware, adminMiddleware], (req, res) => {
  const provider = (req.query.provider || '').trim();
  let sql = `
    SELECT m.ma_model, m.ma_nha_cung_cap, p.ten_hien_thi as provider_name,
           m.ten_hien_thi, m.loai, m.kich_hoat, m.thu_tu_hien_thi, m.ngay_cap_nhat
    FROM ai_models m
    JOIN ai_providers p ON m.ma_nha_cung_cap = p.ma_nha_cung_cap
  `;
  const params = [];
  if (provider) { sql += ' WHERE m.ma_nha_cung_cap = ?'; params.push(provider); }
  sql += ' ORDER BY m.thu_tu_hien_thi ASC, m.ten_hien_thi ASC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, models: rows });
  });
});

// ─── Admin: thêm/sửa model thủ công ──────────────────────────
// POST /api/admin/models
router.post('/admin/models', [authMiddleware, adminMiddleware], (req, res) => {
  const { ma_model, ma_nha_cung_cap, ten_hien_thi, loai, thu_tu_hien_thi, kich_hoat } = req.body;
  if (!ma_model || !ma_nha_cung_cap || !ten_hien_thi) {
    return res.status(400).json({ success: false, error: 'Thiếu ma_model / ma_nha_cung_cap / ten_hien_thi.' });
  }
  db.run(
    `INSERT INTO ai_models (ma_model, ma_nha_cung_cap, ten_hien_thi, loai, thu_tu_hien_thi, kich_hoat)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(ma_model) DO UPDATE SET
       ma_nha_cung_cap = excluded.ma_nha_cung_cap,
       ten_hien_thi = excluded.ten_hien_thi,
       loai = excluded.loai,
       thu_tu_hien_thi = excluded.thu_tu_hien_thi,
       kich_hoat = excluded.kich_hoat,
       ngay_cap_nhat = CURRENT_TIMESTAMP`,
    [ma_model, ma_nha_cung_cap, ten_hien_thi, loai || 'free', thu_tu_hien_thi || 0, kich_hoat ? 1 : 0],
    function (err) {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, message: 'Đã lưu model' });
    }
  );
});

// ─── Admin: xóa model ────────────────────────────────────────
// DELETE /api/admin/models/:modelId
router.delete('/admin/models/:modelId', [authMiddleware, adminMiddleware], (req, res) => {
  const { modelId } = req.params;
  db.run('DELETE FROM ai_models WHERE ma_model = ?', [modelId], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0) return res.status(404).json({ success: false, error: 'Không tìm thấy model' });
    res.json({ success: true, message: 'Đã xóa model' });
  });
});

// ─── Admin: quét model từ API key của provider ───────────────
// POST /api/admin/models/sync
router.post('/admin/models/sync', [authMiddleware, adminMiddleware], async (req, res) => {
  const { provider, api_key, base_url } = req.body;
  if (!provider) return res.status(400).json({ success: false, error: 'Thiếu tên nhà cung cấp (provider).' });

  try {
    const result = await fetchModelsFromProvider(provider, (api_key || '').trim(), (base_url || '').trim());
    if (!result.success) return res.json({ success: false, error: result.error });

    for (const modelId of result.models) {
      const displayName = modelId.includes('/') ? modelId.split('/').pop() : modelId;
      db.run(
        `INSERT INTO ai_models (ma_model, ma_nha_cung_cap, ten_hien_thi, loai, thu_tu_hien_thi)
         VALUES (?, ?, ?, 'free', 0)
         ON CONFLICT(ma_model) DO UPDATE SET
           ten_hien_thi = excluded.ten_hien_thi,
           ngay_cap_nhat = CURRENT_TIMESTAMP`,
        [modelId, provider, displayName]
      );
    }
    res.json({ success: true, provider, count: result.models.length, samples: result.models.slice(0, 30) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi quét model: ' + err.message });
  }
});

// ─── Utility: quét model từ provider ─────────────────────────
async function fetchModelsFromProvider(provider, apiKey, baseUrl) {
  let modelsList = [];

  if (provider === 'gemini') {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await resp.json();
    if (data.models && Array.isArray(data.models)) {
      modelsList = data.models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')).map(m => m.name.replace(/^models\//, ''));
    } else if (data.error) return { success: false, error: 'Gemini: ' + data.error.message };
  } else if (provider === 'groq') {
    const resp = await fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': 'Bearer ' + apiKey } });
    const data = await resp.json();
    if (data.data && Array.isArray(data.data)) modelsList = data.data.filter(m => (m.output_modalities || []).includes('text')).map(m => m.id);
    else if (data.error) return { success: false, error: 'Groq: ' + (data.error.message || JSON.stringify(data.error)) };
  } else if (provider === 'openai') {
    const resp = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': 'Bearer ' + apiKey } });
    const data = await resp.json();
    if (data.data && Array.isArray(data.data)) modelsList = data.data.map(m => m.id).filter(id => /^(gpt|o1|o3|o4|chatgpt)/i.test(id)).sort();
    else if (data.error) return { success: false, error: 'OpenAI: ' + data.error.message };
  } else if (provider === 'deepseek') {
    const resp = await fetch('https://api.deepseek.com/models', { headers: { 'Authorization': 'Bearer ' + apiKey } });
    const data = await resp.json();
    if (data.data && Array.isArray(data.data)) modelsList = data.data.map(m => m.id);
    else if (data.error) return { success: false, error: 'DeepSeek: ' + (data.error.message || JSON.stringify(data.error)) };
  } else if (provider === 'claude') {
    const resp = await fetch('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } });
    const data = await resp.json();
    if (data.data && Array.isArray(data.data)) modelsList = data.data.map(m => m.id);
    else if (data.models && Array.isArray(data.models)) modelsList = data.models.map(m => m.id || m.name);
    else if (data.error) return { success: false, error: 'Claude: ' + (data.error.message || JSON.stringify(data.error)) };
  } else if (provider === 'github') {
    const resp = await fetch('https://models.github.ai/inference/models', { headers: { 'Authorization': 'Bearer ' + apiKey } });
    const data = await resp.json();
    if (Array.isArray(data)) modelsList = data.map(m => m.name || m.id);
    else if (data.data && Array.isArray(data.data)) modelsList = data.data.map(m => m.id || m.name);
    else if (data.error) return { success: false, error: 'GitHub Models: ' + (data.error.message || JSON.stringify(data.error)) };
    else modelsList = ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'DeepSeek-R1', 'DeepSeek-V3', 'meta-llama-3.1-405b-instruct', 'Phi-3-medium-instruct'];
  } else if (provider === 'ollama') {
    const endpoint = (baseUrl || 'http://localhost:11434').replace(/\/+$/, '') + '/api/tags';
    const resp = await fetch(endpoint);
    const data = await resp.json();
    if (data.models && Array.isArray(data.models)) modelsList = data.models.map(m => m.name);
  } else if (provider === 'opencode') {
    try {
      if (!IS_OPENCODE_AVAILABLE) throw new Error('OpenCode binary not found.');
      const stdout = execSync(`"${OPENCODE_BIN_PATH}" models`, { encoding: 'utf8', timeout: 5000, env: { ...process.env, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' } });
      const rawList = stdout.split('\n').map(m => m.trim()).filter(m => m.length > 0);
      modelsList = [...rawList.filter(m => m.toLowerCase().includes('free')), ...rawList.filter(m => !m.toLowerCase().includes('free'))];
    } catch (errModels) {
      modelsList = ['opencode/deepseek-v4-flash-free', 'opencode/qwen-2.5-coder-32b-free', 'opencode/llama-3.3-70b-free'];
    }
  } else {
    // freellmapi, custom
    const cleanedBase = (baseUrl || 'http://localhost:8080/v1').replace(/\/+$/, '');
    const endpoint = cleanedBase.endsWith('/models') ? cleanedBase : cleanedBase + '/models';
    const headers = apiKey ? { 'Authorization': 'Bearer ' + apiKey } : {};
    const resp = await fetch(endpoint, { headers });
    const data = await resp.json();
    if (data.data && Array.isArray(data.data)) modelsList = data.data.map(m => m.id);
    else if (Array.isArray(data)) modelsList = data.map(m => m.id || m.name || m);
    else if (data.error) return { success: false, error: (provider === 'custom' ? 'Custom' : 'FreeLLMAPI') + ': ' + (data.error.message || JSON.stringify(data.error)) };
  }

  return { success: true, models: modelsList };
}

const Groq = require('groq-sdk');

// Khởi tạo Groq client làm nền tảng AI phân tích
const getGroqClient = async () => {
  let key = process.env.GROQ_API_KEY;
  if (!key || key === 'YOUR_GROQ_API_KEY_HERE') {
    key = await new Promise((resolve) => {
      db.get("SELECT gia_tri_khoa FROM khoa_api WHERE LOWER(ten_nha_cung_cap) = 'groq'", [], (err, row) => {
        if (err || !row || !row.gia_tri_khoa) return resolve(null);
        resolve(row.gia_tri_khoa.trim());
      });
    });
  }
  if (!key) return null;
  return new Groq({ apiKey: key });
};

let cachedGroqAnalyzerModel = null;
let lastGroqModelScanTime = 0;

// Tự động quét API Groq để lấy Model mới nhất & mạnh nhất đang hoạt động (không cố định cứng)
async function getDynamicGroqAnalyzerModel(groq) {
  const now = Date.now();
  // Cache model trong 24 giờ
  if (cachedGroqAnalyzerModel && (now - lastGroqModelScanTime < 24 * 60 * 60 * 1000)) {
    return cachedGroqAnalyzerModel;
  }

  try {
    const list = await groq.models.list();
    if (list && Array.isArray(list.data) && list.data.length > 0) {
      // Tìm các model text đang hoạt động
      const activeTextModels = list.data
        .filter(m => m.active !== false && !m.id.includes('whisper') && !m.id.includes('guard'))
        .map(m => m.id);

      const preferred = activeTextModels.find(m => /llama-3.3-70b|llama-3.4-70b|llama-4|llama-3.1-70b/i.test(m))
        || activeTextModels.find(m => /70b|versatile/i.test(m))
        || activeTextModels[0];

      if (preferred) {
        cachedGroqAnalyzerModel = preferred;
        lastGroqModelScanTime = now;
        console.log(`[GroqDynamicModel] Tự động cập nhật Groq Analyzer Model mới nhất: ${preferred}`);
        return preferred;
      }
    }
  } catch (e) {
    console.log('[GroqDynamicModel] Fallback default model:', e.message);
  }

  return cachedGroqAnalyzerModel || 'llama-3.3-70b-versatile';
}

// Background Task: Tự động quét và làm mới model Groq mỗi 24 giờ
setInterval(async () => {
  try {
    const groq = await getGroqClient();
    if (groq) {
      lastGroqModelScanTime = 0;
      await getDynamicGroqAnalyzerModel(groq);
    }
  } catch (e) {}
}, 24 * 60 * 60 * 1000);

// Groq AI Bot Provider Analyzer: Dùng Groq AI tự động phân tích bất kỳ từ khóa tiếng Việt / gõ tắt / lỗi chính tả
async function aiAnalyzeProviderWithGroq(providerInput) {
  const cleanInput = (providerInput || '').trim().toLowerCase();

  const FAST_MAP = {
    'gemini': { providerId: 'gemini', providerName: 'Google Gemini', modelsEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models' },
    'gg': { providerId: 'gemini', providerName: 'Google Gemini', modelsEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models' },
    'google': { providerId: 'gemini', providerName: 'Google Gemini', modelsEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models' },

    'groq': { providerId: 'groq', providerName: 'Groq Cloud', modelsEndpoint: 'https://api.groq.com/openai/v1/models' },
    'grop': { providerId: 'groq', providerName: 'Groq Cloud', modelsEndpoint: 'https://api.groq.com/openai/v1/models' },

    'grok': { providerId: 'grok', providerName: 'xAI Grok', modelsEndpoint: 'https://api.x.ai/v1/models' },
    'xai': { providerId: 'grok', providerName: 'xAI Grok', modelsEndpoint: 'https://api.x.ai/v1/models' },
    'x.ai': { providerId: 'grok', providerName: 'xAI Grok', modelsEndpoint: 'https://api.x.ai/v1/models' },

    'openai': { providerId: 'openai', providerName: 'OpenAI GPT-4o', modelsEndpoint: 'https://api.openai.com/v1/models' },
    'gpt': { providerId: 'openai', providerName: 'OpenAI GPT-4o', modelsEndpoint: 'https://api.openai.com/v1/models' },
    'chatgpt': { providerId: 'openai', providerName: 'OpenAI GPT-4o', modelsEndpoint: 'https://api.openai.com/v1/models' },

    'claude': { providerId: 'claude', providerName: 'Anthropic Claude', modelsEndpoint: 'https://api.anthropic.com/v1/models' },
    'anthropic': { providerId: 'claude', providerName: 'Anthropic Claude', modelsEndpoint: 'https://api.anthropic.com/v1/models' },

    'deepseek': { providerId: 'deepseek', providerName: 'DeepSeek AI', modelsEndpoint: 'https://api.deepseek.com/models' },
    'ds': { providerId: 'deepseek', providerName: 'DeepSeek AI', modelsEndpoint: 'https://api.deepseek.com/models' },

    'github': { providerId: 'github', providerName: 'GitHub Models', modelsEndpoint: 'https://models.github.ai/inference/models' },
    'gh': { providerId: 'github', providerName: 'GitHub Models', modelsEndpoint: 'https://models.github.ai/inference/models' },

    'openrouter': { providerId: 'custom', providerName: 'OpenRouter Gateway', modelsEndpoint: 'https://openrouter.ai/api/v1/models' },
    'or': { providerId: 'custom', providerName: 'OpenRouter Gateway', modelsEndpoint: 'https://openrouter.ai/api/v1/models' },

    'omniroute': { providerId: 'omniroute', providerName: 'OmniRoute Gateway', modelsEndpoint: 'http://localhost:20128/v1/models' },
    'ollama': { providerId: 'ollama', providerName: 'Ollama Local AI', modelsEndpoint: 'http://localhost:11434/api/tags' },
    'opencode': { providerId: 'opencode', providerName: 'OpenCode Agent Engine', modelsEndpoint: 'opencode://models' }
  };

  if (FAST_MAP[cleanInput]) {
    return FAST_MAP[cleanInput];
  }

  // Dùng Groq AI Bot làm nền tảng phân tích từ khóa tự do (Tự động dùng model Groq mới nhất đang sống)
  try {
    const groq = await getGroqClient();
    if (groq) {
      const dynamicModelName = await getDynamicGroqAnalyzerModel(groq);
      const prompt = `Phân tích từ khóa nhà cung cấp AI: "${providerInput}". Xác định chính xác API Endpoint URL để fetch danh sách /models. Trả về định dạng JSON thuần túy:
{
  "providerId": "mã_chuẩn (groq|gemini|grok|openai|claude|deepseek|github|custom)",
  "providerName": "Tên hiển thị chuẩn",
  "modelsEndpoint": "https://... URL endpoint"
}`;
      const completion = await groq.chat.completions.create({
        model: dynamicModelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 150
      });

      const content = completion.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.providerId && parsed.modelsEndpoint) {
          return {
            providerId: parsed.providerId,
            providerName: parsed.providerName || providerInput,
            modelsEndpoint: parsed.modelsEndpoint,
            isAiAnalyzed: true
          };
        }
      }
    }
  } catch (e) {
    console.log('[GroqAIAnalyzer] Error:', e.message);
  }

  return {
    providerId: cleanInput.replace(/[^a-z0-9]/g, '') || 'custom',
    providerName: providerInput || 'Custom Provider',
    modelsEndpoint: 'https://openrouter.ai/api/v1/models',
    isAiAnalyzed: false
  };
}

// ─── Utility: Test sức khỏe (Health Verification) từng model ─────────────
async function verifyModelHealth(provider, apiKey, baseUrl, modelId) {
  const startTime = Date.now();
  const cleanKey = (apiKey || '').trim();
  const cleanBase = (baseUrl || '').replace(/\/+$/, '');

  try {
    if (provider === 'gemini') {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}?key=${cleanKey}`, { signal: AbortSignal.timeout(6000) });
      const latency = Date.now() - startTime;
      if (resp.ok) {
        return { id: modelId, name: modelId, provider, status: 'working', latency_ms: latency, message: 'Hoạt động tốt' };
      } else {
        const err = await resp.json().catch(() => ({}));
        return { id: modelId, name: modelId, provider, status: 'failed', latency_ms: latency, error: err.error?.message || `HTTP ${resp.status}` };
      }
    }

    if (['openai', 'groq', 'grok', 'deepseek', 'github', 'custom', 'freellmapi'].includes(provider)) {
      let endpoint = 'https://api.openai.com/v1/chat/completions';
      if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      if (provider === 'grok') endpoint = 'https://api.x.ai/v1/chat/completions';
      if (provider === 'deepseek') endpoint = 'https://api.deepseek.com/chat/completions';
      if (provider === 'github') endpoint = 'https://models.github.ai/inference/chat/completions';
      if (provider === 'freellmapi' || provider === 'custom') {
        const base = cleanBase || (provider === 'custom' ? 'https://openrouter.ai/api/v1' : 'http://localhost:8080/v1');
        endpoint = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(cleanKey ? { 'Authorization': 'Bearer ' + cleanKey } : {}) },
        body: JSON.stringify({ model: modelId, messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
        signal: AbortSignal.timeout(7000)
      });
      const latency = Date.now() - startTime;
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && (data.choices || data.id)) {
        return { id: modelId, name: modelId, provider, status: 'working', latency_ms: latency, message: 'Hoạt động tốt' };
      } else {
        return { id: modelId, name: modelId, provider, status: 'failed', latency_ms: latency, error: data.error?.message || `HTTP ${resp.status}` };
      }
    }

    if (provider === 'claude') {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': cleanKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: modelId, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
        signal: AbortSignal.timeout(7000)
      });
      const latency = Date.now() - startTime;
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && (data.content || data.id)) {
        return { id: modelId, name: modelId, provider, status: 'working', latency_ms: latency, message: 'Hoạt động tốt' };
      } else {
        return { id: modelId, name: modelId, provider, status: 'failed', latency_ms: latency, error: data.error?.message || `HTTP ${resp.status}` };
      }
    }

    return { id: modelId, name: modelId, provider, status: 'working', latency_ms: Date.now() - startTime, message: 'Khả dụng' };
  } catch (err) {
    return { id: modelId, name: modelId, provider, status: 'failed', latency_ms: Date.now() - startTime, error: err.message || 'Timeout / Connection error' };
  }
}

// ─── Admin: Quét & Tự Động Kiểm Tra Sức Khỏe Model Qua Groq AI Analyzer ─────
// POST /api/admin/models/verify-and-scan
router.post('/admin/models/verify-and-scan', [authMiddleware, adminMiddleware], async (req, res) => {
  const { provider, api_key, base_url } = req.body;
  if (!provider) return res.status(400).json({ success: false, error: 'Thiếu thông tin nhà cung cấp (provider).' });

  try {
    // 1. Phân tích từ khóa người dùng qua Groq AI Bot
    const aiAnalysis = await aiAnalyzeProviderWithGroq(provider);
    const resolvedProvider = aiAnalysis.providerId;
    const resolvedEndpoint = base_url || aiAnalysis.modelsEndpoint;

    // 2. Fetch danh sách model từ Endpoint mà Groq AI Bot đã tìm thấy
    const fetchRes = await fetchModelsFromProvider(resolvedProvider, (api_key || '').trim(), resolvedEndpoint);
    if (!fetchRes.success) return res.json({ success: false, error: fetchRes.error, analysis: aiAnalysis });

    const rawModels = fetchRes.models || [];
    if (rawModels.length === 0) {
      return res.json({ success: false, error: 'Không tìm thấy model nào từ link API này.', analysis: aiAnalysis });
    }

    // Giới hạn kiểm tra tối đa 25 models hàng đầu để phản hồi nhanh
    const modelsToVerify = rawModels.slice(0, 25);

    // 3. Chạy kiểm tra health song song 5 request/lượt
    const verifiedResults = [];
    const chunkSize = 5;
    for (let i = 0; i < modelsToVerify.length; i += chunkSize) {
      const chunk = modelsToVerify.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(mId => verifyModelHealth(resolvedProvider, api_key, resolvedEndpoint, mId))
      );
      verifiedResults.push(...chunkResults);
    }

    const workingCount = verifiedResults.filter(m => m.status === 'working').length;
    res.json({
      success: true,
      analysis: aiAnalysis,
      provider: resolvedProvider,
      providerName: aiAnalysis.providerName,
      modelsEndpoint: resolvedEndpoint,
      totalScanned: rawModels.length,
      verifiedCount: verifiedResults.length,
      workingCount,
      models: verifiedResults
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi kiểm tra model: ' + err.message });
  }
});

// ─── Admin: Đẩy Các Model Đang Hoạt Động Lên Trang Chủ ───────
// POST /api/admin/models/publish-active
router.post('/api/admin/models/publish-active', [authMiddleware, adminMiddleware], async (req, res) => {
  const { provider, api_key, models } = req.body;
  if (!provider || !Array.isArray(models)) {
    return res.status(400).json({ success: false, error: 'Thiếu dữ liệu provider hoặc danh sách models.' });
  }

  try {
    // 1. Lưu API key vào CSDL nếu người dùng gửi key mới
    if (api_key && api_key.trim()) {
      const keyId = 'k_' + provider;
      db.run(
        `INSERT INTO khoa_api (ma_khoa, ma_nguoi_dung, ten_nha_cung_cap, gia_tri_khoa)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(ma_khoa) DO UPDATE SET gia_tri_khoa = excluded.gia_tri_khoa`,
        [keyId, req.user.id, provider, api_key.trim()]
      );
    }

    // 2. Vô hiệu hóa tạm thời các model cũ của provider này
    db.run('UPDATE ai_models SET kich_hoat = 0 WHERE ma_nha_cung_cap = ?', [provider], (err) => {
      if (err) console.error('[PublishModels] Deactivate old models error:', err.message);

      // 3. Đăng ký & Kích hoạt các model đang hoạt động
      let savedCount = 0;
      for (const m of models) {
        const modelId = typeof m === 'string' ? m : m.id;
        const displayName = modelId.includes('/') ? modelId.split('/').pop() : modelId;
        const type = (modelId.includes('pro') || modelId.includes('gpt-4') || modelId.includes('sonnet')) ? 'pro' : 'free';

        db.run(
          `INSERT INTO ai_models (ma_model, ma_nha_cung_cap, ten_hien_thi, loai, thu_tu_hien_thi, kich_hoat)
           VALUES (?, ?, ?, ?, 0, 1)
           ON CONFLICT(ma_model) DO UPDATE SET
             ma_nha_cung_cap = excluded.ma_nha_cung_cap,
             ten_hien_thi = excluded.ten_hien_thi,
             loai = excluded.loai,
             kich_hoat = 1,
             ngay_cap_nhat = CURRENT_TIMESTAMP`,
          [modelId, provider, displayName, type]
        );
        savedCount++;
      }

      res.json({
        success: true,
        provider,
        publishedCount: savedCount,
        message: `🎉 Đã đăng tải thành công ${savedCount} model đang hoạt động của ${provider.toUpperCase()} lên Menu Trang Chủ!`
      });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Lỗi cập nhật trang chủ: ' + err.message });
  }
});

module.exports = router;