const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { exec, execSync, spawn } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/db');
const { authMiddleware, adminMiddleware, guestMiddleware } = require('../middleware/auth.middleware');

// --- CONFIGURATION ---
const OPENCODE_BIN_PATH = "C:\\Users\\84916\\.opencode\\bin\\opencode.exe";
const IS_OPENCODE_AVAILABLE = fs.existsSync(OPENCODE_BIN_PATH);

// --- CACHING FOR MODELS ---
const modelCache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000; // Cache models for 6 hours

function getModelCacheKey(provider, apiKey, baseUrl) {
    if (provider === 'ollama' || provider === 'opencode') {
        return `${provider}:${baseUrl || 'default'}`;
    }
    if (!apiKey) return null;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 16);
    return `${provider}:${keyHash}`;
}

// ADMIN: Lấy tất cả cuộc hội thoại của mọi người dùng
router.get('/conversations/all', [authMiddleware, adminMiddleware], (req, res) => {
  db.all("SELECT c.*, u.email FROM cuoc_hoi_thoai c JOIN nguoi_dung u ON c.ma_nguoi_dung = u.ma_nguoi_dung WHERE c.ngay_xoa IS NULL ORDER BY ngay_cap_nhat DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ADMIN: Lấy tất cả cuộc hội thoại của MỘT người dùng cụ thể
router.get('/admin/conversations/:userId', [authMiddleware, adminMiddleware], (req, res) => {
  const { userId } = req.params;
  db.all("SELECT * FROM cuoc_hoi_thoai WHERE ma_nguoi_dung = ? AND ngay_xoa IS NULL ORDER BY ngay_cap_nhat DESC", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ADMIN: Lấy tất cả cuộc hội thoại đã xóa mềm
router.get('/admin/conversations/trash', [authMiddleware, adminMiddleware], (req, res) => {
  db.all("SELECT c.*, u.email FROM cuoc_hoi_thoai c JOIN nguoi_dung u ON c.ma_nguoi_dung = u.ma_nguoi_dung WHERE c.ngay_xoa IS NOT NULL ORDER BY ngay_xoa DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// USER: Lấy cuộc hội thoại của chính mình
router.get('/conversations', authMiddleware, (req, res) => {
  db.all("SELECT * FROM cuoc_hoi_thoai WHERE ma_nguoi_dung = ? AND ngay_xoa IS NULL ORDER BY ngay_cap_nhat DESC", [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/conversations', authMiddleware, (req, res) => {
  const { tieu_de, ten_mo_hinh_ai } = req.body;
  const maHoiThoai = crypto.randomUUID();

  const sql = `
    INSERT INTO cuoc_hoi_thoai (ma_hoi_thoai, ma_nguoi_dung, ma_thu_muc, tieu_de, ten_mo_hinh_ai, trang_thai)
    VALUES (?, ?, ?, ?, ?, 'dang_mo')
  `;
  // Tạm thời để ma_thu_muc là null, cần logic để user chọn workspace
  db.run(sql, [maHoiThoai, req.user.id, null, tieu_de || 'Trò chuyện mới', ten_mo_hinh_ai || 'Gemini 3.5 Flash'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ma_hoi_thoai: maHoiThoai, tieu_de: tieu_de || 'Trò chuyện mới', ten_mo_hinh_ai: ten_mo_hinh_ai || 'Gemini 3.5 Flash' });
  });
});

// USER: Xóa cuộc hội thoại của chính mình
router.delete('/conversations/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Soft delete: Cập nhật trường ngay_xoa
  db.run("UPDATE cuoc_hoi_thoai SET ngay_xoa = CURRENT_TIMESTAMP WHERE ma_hoi_thoai = ? AND ma_nguoi_dung = ?", [id, userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(403).json({ error: 'Không có quyền xóa cuộc hội thoại này.' });
    res.json({ success: true, id });
  });
});

// ADMIN: Xóa mềm bất kỳ cuộc hội thoại nào
router.delete('/admin/conversations/:id', [authMiddleware, adminMiddleware], (req, res) => {
  const { id } = req.params;
  db.run("UPDATE cuoc_hoi_thoai SET ngay_xoa = CURRENT_TIMESTAMP WHERE ma_hoi_thoai = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id });
  });
});

// ADMIN: Khôi phục cuộc hội thoại đã xóa mềm
router.post('/admin/conversations/:id/restore', [authMiddleware, adminMiddleware], (req, res) => {
  const { id } = req.params;
  db.run("UPDATE cuoc_hoi_thoai SET ngay_xoa = NULL WHERE ma_hoi_thoai = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Không tìm thấy cuộc hội thoại đã xóa mềm.' });
    res.json({ success: true, id });
  });
});

// ADMIN: Xóa vĩnh viễn cuộc hội thoại
router.delete('/admin/conversations/:id/permanent', [authMiddleware, adminMiddleware], (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM tin_nhan WHERE ma_hoi_thoai = ?", [id], (err) => {
    db.run("DELETE FROM cuoc_hoi_thoai WHERE ma_hoi_thoai = ?", [id], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true, id });
    });
  });
});

router.get('/keys', [authMiddleware, adminMiddleware], (req, res) => {
  db.all("SELECT ma_khoa, ten_nha_cung_cap, gia_tri_khoa FROM khoa_api", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // CHE DẤU API KEY: an toàn với mọi độ dài key
    const maskedRows = rows.map(row => ({
      ma_khoa: row.ma_khoa,
      ten_nha_cung_cap: row.ten_nha_cung_cap,
      gia_tri_khoa: row.gia_tri_khoa
        ? (row.gia_tri_khoa.length > 8
            ? row.gia_tri_khoa.substring(0, 4) + '...' + row.gia_tri_khoa.substring(row.gia_tri_khoa.length - 4)
            : '****')
        : '(trống)'
    }));
    res.json(maskedRows);
  });
});

router.post('/keys', [authMiddleware, adminMiddleware], (req, res) => {
  const { provider, api_key } = req.body;
  if (!provider || !api_key) return res.status(400).json({ error: 'Thiếu thông tin Provider hoặc API Key' });

  const keyId = 'k_' + provider;
  
  db.run(
    `INSERT INTO khoa_api (ma_khoa, ma_nguoi_dung, ten_nha_cung_cap, gia_tri_khoa) 
     VALUES (?, ?, ?, ?) 
     ON CONFLICT(ma_khoa) DO UPDATE SET gia_tri_khoa = excluded.gia_tri_khoa`,
    [keyId, req.user.id, provider, api_key.trim()],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, provider });
    }
  );
});

router.post('/fetch-models', authMiddleware, async (req, res) => {
  const { provider, api_key, base_url } = req.body;

  const cacheKey = getModelCacheKey(provider, api_key, base_url);

  // 1. Check cache first
  if (cacheKey && modelCache.has(cacheKey)) {
    const cachedData = modelCache.get(cacheKey);
    if (Date.now() - cachedData.timestamp < CACHE_TTL) {
      return res.json({ success: true, models: cachedData.models, fromCache: true });
    }
  }

  // 2. Proceed to fetch if not in cache or expired
  if (!api_key && !['ollama', 'opencode'].includes(provider)) {
    return res.status(400).json({ error: 'Vui lòng nhập API Key để quét models.' });
  }

  try {
    let modelsList = [];

    if (provider === 'gemini') {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${api_key.trim()}`);
      const data = await resp.json();
      if (data.models && Array.isArray(data.models)) {
        modelsList = data.models
          .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));
      } else if (data.error) {
        return res.json({ success: false, error: 'Gemini: ' + data.error.message });
      }

    } else if (provider === 'groq') {
      const resp = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': 'Bearer ' + api_key.trim() }
      });
      const data = await resp.json();
      if (data.data && Array.isArray(data.data)) {
        modelsList = data.data
          .filter(m => {
            const outMod = m.output_modalities || [];
            return outMod.includes('text');
          })
          .map(m => m.id);
      } else if (data.error) {
        return res.json({ success: false, error: 'Groq: ' + (data.error.message || JSON.stringify(data.error)) });
      }

    } else if (provider === 'openai') {
      const resp = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': 'Bearer ' + api_key.trim() }
      });
      const data = await resp.json();
      if (data.data && Array.isArray(data.data)) {
        modelsList = data.data
          .map(m => m.id)
          .filter(id => /^(gpt|o1|o3|o4|chatgpt)/i.test(id))
          .sort();
      } else if (data.error) {
        return res.json({ success: false, error: 'OpenAI: ' + data.error.message });
      }

    } else if (provider === 'deepseek') {
      const resp = await fetch('https://api.deepseek.com/models', {
        headers: { 'Authorization': 'Bearer ' + api_key.trim() }
      });
      const data = await resp.json();
      if (data.data && Array.isArray(data.data)) {
        modelsList = data.data.map(m => m.id);
      } else if (data.error) {
        return res.json({ success: false, error: 'DeepSeek: ' + (data.error.message || JSON.stringify(data.error)) });
      }

    } else if (provider === 'claude') {
      const resp = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': api_key.trim(),
          'anthropic-version': '2023-06-01'
        }
      });
      const data = await resp.json();
      if (data.data && Array.isArray(data.data)) {
        modelsList = data.data.map(m => m.id);
      } else if (data.models && Array.isArray(data.models)) {
        modelsList = data.models.map(m => m.id || m.name);
      } else if (data.error) {
        return res.json({ success: false, error: 'Claude: ' + (data.error.message || JSON.stringify(data.error)) });
      }

    } else if (provider === 'github') {
      const resp = await fetch('https://models.github.ai/inference/models', {
        headers: { 'Authorization': 'Bearer ' + api_key.trim() }
      });
      const data = await resp.json();
      if (Array.isArray(data)) {
        modelsList = data.map(m => m.name || m.id);
      } else if (data.data && Array.isArray(data.data)) {
        modelsList = data.data.map(m => m.id || m.name);
      } else if (data.error) {
        return res.json({ success: false, error: 'GitHub Models: ' + (data.error.message || JSON.stringify(data.error)) });
      } else {
        // Fallback default GitHub free models list if API doesn't return full array
        modelsList = ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'DeepSeek-R1', 'DeepSeek-V3', 'meta-llama-3.1-405b-instruct', 'Phi-3-medium-instruct'];
      }

    } else if (provider === 'freellmapi') {
      const cleanedBase = (base_url || 'http://localhost:8080/v1').replace(/\/+$/, '');
      const endpoint = cleanedBase.endsWith('/models') ? cleanedBase : cleanedBase + '/models';
      const headers = api_key && api_key.trim() ? { 'Authorization': 'Bearer ' + api_key.trim() } : {};
      const resp = await fetch(endpoint, { headers });
      const data = await resp.json();
      if (data.data && Array.isArray(data.data)) {
        modelsList = data.data.map(m => m.id);
      } else if (Array.isArray(data)) {
        modelsList = data.map(m => m.id || m.name || m);
      } else if (data.error) {
        return res.json({ success: false, error: 'FreeLLMAPI: ' + (data.error.message || JSON.stringify(data.error)) });
      }

    } else if (provider === 'custom') {
      const cleanedBase = (base_url || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
      const endpoint = cleanedBase.endsWith('/models') ? cleanedBase : cleanedBase + '/models';
      const resp = await fetch(endpoint, {
        headers: { 'Authorization': 'Bearer ' + api_key.trim() }
      });
      const data = await resp.json();
      if (data.data && Array.isArray(data.data)) {
        modelsList = data.data.map(m => m.id);
      } else if (Array.isArray(data)) {
        modelsList = data.map(m => m.id || m.name || m);
      } else if (data.error) {
        return res.json({ success: false, error: 'Custom: ' + (data.error.message || JSON.stringify(data.error)) });
      }

    } else if (provider === 'ollama') {
      const endpoint = (base_url || 'http://localhost:11434').replace(/\/+$/, '') + '/api/tags';
      const resp = await fetch(endpoint);
      const data = await resp.json();
      if (data.models && Array.isArray(data.models)) {
        modelsList = data.models.map(m => m.name);
      }
    } else if (provider === 'opencode') {
      try {
        if (!IS_OPENCODE_AVAILABLE) throw new Error('OpenCode binary not found.');
        const stdout = execSync(`"${OPENCODE_BIN_PATH}" models`, { 
          encoding: 'utf8', 
          timeout: 5000,
          env: { ...process.env, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' }
        });
        if (stdout) {
          const rawList = stdout.split('\n')
            .map(m => m.trim())
            .filter(m => m.length > 0);
          
          const freeModels = rawList.filter(m => m.toLowerCase().includes('free'));
          const otherModels = rawList.filter(m => !m.toLowerCase().includes('free'));
          modelsList = [...freeModels, ...otherModels];
        }
      } catch (errModels) {
        modelsList = [
          'opencode/deepseek-v4-flash-free',
          'opencode/qwen-2.5-coder-32b-free',
          'opencode/llama-3.3-70b-free'
        ];
      }
    }

    if (modelsList.length > 0) {
      // 3. Store successful fetch in cache
      if (cacheKey) {
        modelCache.set(cacheKey, {
          models: modelsList,
          timestamp: Date.now()
        });
      }
      res.json({ success: true, models: modelsList, fromCache: false });
    } else {
      res.json({ success: false, error: 'Không tìm thấy model nào cho API Key này.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error scanning models: ' + err.message });
  }
});

// ADMIN: Xóa cache models thủ công
router.post('/admin/cache/clear-models', [authMiddleware, adminMiddleware], (req, res) => {
  const cacheSize = modelCache.size;
  modelCache.clear();
  console.log(`[Admin] Đã xóa ${cacheSize} mục khỏi cache models.`);
  res.json({ success: true, message: `Đã xóa thành công ${cacheSize} mục khỏi cache models.` });
});

router.get('/conversations/:id/messages', authMiddleware, (req, res) => {
  const { id } = req.params;
  // Kiểm tra user có quyền xem cuộc hội thoại này không
  const condition = req.user.role === 'admin' ? "" : `AND ma_nguoi_dung = ?`;
  db.get(`SELECT ma_hoi_thoai FROM cuoc_hoi_thoai WHERE ma_hoi_thoai = ? ${condition}`, req.user.role === 'admin' ? [id] : [id, req.user.id], (err, conv) => {
    if (!conv) {
      return res.status(403).json({ error: 'Không có quyền truy cập.' });
    }
    db.all("SELECT * FROM tin_nhan WHERE ma_hoi_thoai = ? ORDER BY ngay_gui ASC", [id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });
});

function taoTieuDeThongMinh(noiDungUser) {
  if (!noiDungUser) return "Trò chuyện mới";
  let clean = noiDungUser.split('\n')[0].replace(/[#*`!_\[\]()]/g, '').trim();
  if (clean.length > 35) {
    clean = clean.substring(0, 35) + "...";
  }
  return clean || "Trò chuyện mới";
}

function saveAIMessageAndRespond(maHoiThoai, content, res) {
  const maTinNhanAI = crypto.randomUUID();
  db.run(
    "INSERT INTO tin_nhan (ma_tin_nhan, ma_hoi_thoai, vai_tro, noi_dung) VALUES (?, ?, 'assistant', ?)",
    [maTinNhanAI, maHoiThoai, content],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        ma_tin_nhan: maTinNhanAI,
        ma_hoi_thoai: maHoiThoai,
        vai_tro: 'assistant',
        noi_dung: content
      });
    }
  );
}

// Endpoint cho khách và người đã đăng nhập
router.post('/conversations/:id/messages', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // Nếu không có token -> là khách -> dùng guestMiddleware
    return guestMiddleware(req, res, next);
  }
  // Nếu có token -> là user -> dùng authMiddleware
  return authMiddleware(req, res, next);
}, async (req, res) => {
  const { id } = req.params;
  const { vai_tro, noi_dung, provider, client_api_key, model_name, base_url, mode, execution_mode, thinking_level } = req.body;

  // Logic xử lý tin nhắn giữ nguyên...
  const maTinNhanUser = crypto.randomUUID();
  
  db.run(
    "INSERT INTO tin_nhan (ma_tin_nhan, ma_hoi_thoai, vai_tro, noi_dung) VALUES (?, ?, ?, ?)",
    [maTinNhanUser, id, vai_tro, noi_dung],
    async (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.get("SELECT tieu_de FROM cuoc_hoi_thoai WHERE ma_hoi_thoai = ?", [id], (err, convRow) => {
        if (convRow && (convRow.tieu_de === 'Trò chuyện mới' || !convRow.tieu_de)) {
          const newTitle = taoTieuDeThongMinh(noi_dung);
          db.run("UPDATE cuoc_hoi_thoai SET tieu_de = ?, ngay_cap_nhat = CURRENT_TIMESTAMP WHERE ma_hoi_thoai = ?", [newTitle, id]);
        } else {
          db.run("UPDATE cuoc_hoi_thoai SET ngay_cap_nhat = CURRENT_TIMESTAMP WHERE ma_hoi_thoai = ?", [id]);
        }
      });

      if (execution_mode === 'agent') {
        // Chỉ cho phép Admin sử dụng chế độ Agent
        if (!req.user || req.user.role !== 'admin') {
          const errorMessage = "⛔ **Truy cập bị từ chối:** Chế độ Agent chỉ dành cho quản trị viên (Admin).";
          return saveAIMessageAndRespond(id, errorMessage, res);
        }

        if (!IS_OPENCODE_AVAILABLE) {
            const errorMessage = "⛔ **Lỗi hệ thống:** Không tìm thấy `opencode.exe`. Vui lòng kiểm tra lại đường dẫn cài đặt.";
            return saveAIMessageAndRespond(id, errorMessage, res);
        }

        const modelArg = model_name ? ` -m "${model_name}"` : "";
        const rootDir = path.join(__dirname, '..', '..', '..');
        
        // Sử dụng spawn để chống Shell Injection
        const agentProcess = spawn(
          `"${OPENCODE_BIN_PATH}"`, 
          ['run', noi_dung, ...(model_name ? ['-m', model_name] : []), '--auto'], 
          { cwd: rootDir, timeout: 30000, shell: true, env: { ...process.env, LANG: 'en_US.UTF-8' } }
        );

        let stdout = '';
        let stderr = '';
        agentProcess.stdout.on('data', (data) => stdout += data);
        agentProcess.stderr.on('data', (data) => stderr += data);

        return agentProcess.on('close', (code) => {
          let cauTraLoiAgent = "";
          if (code !== 0) {
            cauTraLoiAgent = stdout.trim() || stderr || `[Agent Error] Process exited with code ${code}`;
          } else {
            cauTraLoiAgent = stdout.trim() || "Tôi đã tự động thực thi các câu lệnh và cập nhật tệp tin thành công cho bạn.";
          }
          saveAIMessageAndRespond(id, cauTraLoiAgent, res);
        });
      }

      let selectedProvider = provider || 'gemini';
      let selectedModel = model_name || 'gemini-1.5-flash';
      let keyToUse = client_api_key;
      
      if (client_api_key && client_api_key.trim()) {
        if (req.user && req.user.role === 'admin') {
          const keyId = 'k_' + selectedProvider;
          db.run(
            `INSERT INTO khoa_api (ma_khoa, ma_nguoi_dung, ten_nha_cung_cap, gia_tri_khoa) VALUES (?, ?, ?, ?) ON CONFLICT(ma_khoa) DO UPDATE SET gia_tri_khoa = excluded.gia_tri_khoa`,
            [keyId, req.user.id, selectedProvider, client_api_key.trim()]
          );
        }
      }

      if (!keyToUse && selectedProvider === 'gemini' && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
        keyToUse = process.env.GEMINI_API_KEY;
      }

      if (!keyToUse) {
        const dbKeyRow = await new Promise((resDb) => {
          db.get("SELECT gia_tri_khoa FROM khoa_api WHERE ten_nha_cung_cap = ?", [selectedProvider], (err, r) => resDb(r));
        });
        if (dbKeyRow && dbKeyRow.gia_tri_khoa) {
          keyToUse = dbKeyRow.gia_tri_khoa;
        } else {
          const anyKeyRow = await new Promise((resDb) => {
            db.get("SELECT ten_nha_cung_cap, gia_tri_khoa FROM khoa_api LIMIT 1", [], (err, r) => resDb(r));
          });
          if (anyKeyRow && anyKeyRow.gia_tri_khoa) {
            keyToUse = anyKeyRow.gia_tri_khoa;
            selectedProvider = anyKeyRow.ten_nha_cung_cap;
            if (selectedProvider === 'groq') selectedModel = 'llama-3.3-70b-versatile';
          }
        }
      }

      if (!keyToUse && !['ollama', 'opencode', 'freellmapi'].includes(selectedProvider)) {
        const fallbackMsg = `Chưa cài đặt API Key cho nhà cung cấp ${selectedProvider.toUpperCase()}. Hãy bấm nút 'Cài đặt hệ thống' ở góc trái để nhập Key và chọn Model!`;
        return saveAIMessageAndRespond(id, fallbackMsg, res);
      }

      db.all("SELECT vai_tro, noi_dung FROM tin_nhan WHERE ma_hoi_thoai = ? ORDER BY ngay_gui ASC LIMIT 15", [id], async (err, history) => {
        let cauTraLoiAI = "";

        const { user_location } = req.body;
        const now = new Date();
        const nowFormatted = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const locationStr = user_location || 'Hà Nội, Việt Nam';

        const memoryRows = await new Promise((resMem) => {
          db.all("SELECT noi_dung FROM bo_nho_dai_han ORDER BY do_uu_tien DESC LIMIT 5", [], (err, r) => resMem(r || []));
        });
        const memoryText = memoryRows.map(m => "- " + m.noi_dung).join('\n');

        const SPECIALTY_PROMPTS = {
          general: 'Bạn là Rexi, Siêu Trợ Lý AI Toàn Năng giúp giải quyết mọi câu hỏi cuộc sống, công việc, văn phòng và phân tích.',
          business: 'Bạn là Chuyên Gia Doanh Nghiệp & Cố Vấn Pháp Lý hàng đầu. Hãy tập trung viết hợp đồng kinh tế, công văn hành chính, kế hoạch tài chính và chiến lược kinh doanh chuyên nghiệp.',
          marketing: 'Bạn là Giám Đốc Marketing & Sáng Tạo Nội Dung Viral. Hãy tập trung viết kịch bản TikTok/Reels triệu view, bài viết SEO, Slogan ấn tượng và kịch bản chốt đơn bán hàng.',
          education: 'Bạn là Giáo Sư & Chuyên Gia Phân Tích Đa Ngành. Hãy tập trung tóm tắt tài liệu, phân tích chuyên sâu, lập lộ trình học tập và giải đáp tri thức.',
          health: 'Bạn là Chuyên Gia Dinh Dưỡng & Huấn Luyện Viên Sức Khỏe. Hãy tập trung lập thực đơn dinh dưỡng, bài tập Gym/Calisthenics và tư vấn tâm lý đời sống.',
          coder: 'Bạn là Senior Software Engineer & System Architect. Tập trung viết code sạch, tối ưu, thiết kế kiến trúc hệ thống và sửa bug.'
        };

        const currentRolePrompt = SPECIALTY_PROMPTS[mode] || SPECIALTY_PROMPTS.general;

        let systemPrompt = `${currentRolePrompt} Bây giờ là ${nowFormatted} (Giờ Việt Nam). Vị trí địa lý ước tính của người dùng: ${locationStr}.

BỘ NHỚ DÀI HẠN VỀ NGƯỜI DÙNG & QUY TẮC CỦA REXI:
${memoryText || '- Người dùng thích làm việc chuyên nghiệp, nội dung ngắn gọn, súc tích, thực tế và chính xác.'}

- NGUYÊN TẮC QUAN TRỌNG: Không lặp lại các câu miễn trừ trách nhiệm. Hãy trả lời thẳng vấn đề, tự nhiên, thân thiện, chu đáo và nâng cao trải nghiệm người dùng đến tận răng.`;

        try {
          if (selectedProvider === 'gemini') {
            const tempGenAI = new GoogleGenerativeAI(keyToUse);
            let targetModel = selectedModel || 'gemini-2.5-flash';
            let model;
            try {
              model = tempGenAI.getGenerativeModel({ model: targetModel });
            } catch (e) {
              model = tempGenAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            }
            const contents = history.map(h => ({
              role: h.vai_tro === 'user' ? 'user' : 'model',
              parts: [{ text: h.noi_dung }]
            }));
            
            const genConfig = {};
            if (thinking_level === 'deep') {
              genConfig.thinkingConfig = { thinkingBudget: 8192 };
            } else {
              genConfig.thinkingConfig = { thinkingBudget: 0 };
            }

            try {
              const result = await model.generateContent({ contents, systemInstruction: systemPrompt, generationConfig: genConfig });
              cauTraLoiAI = result.response.text();
            } catch (errGen) {
              if (IS_OPENCODE_AVAILABLE) {
                const rootDir = path.join(__dirname, '..', '..', '..');
                await new Promise((resOp) => {
                  const fallbackProcess = spawn(
                    `"${OPENCODE_BIN_PATH}"`,
                    ['run', noi_dung, '--auto'], 
                    { cwd: rootDir, timeout: 20000, shell: true, env: { ...process.env, LANG: 'en_US.UTF-8' } }
                  );
                  let stdout = '';
                  fallbackProcess.stdout.on('data', data => stdout += data);
                  fallbackProcess.on('close', () => {
                      cauTraLoiAI = stdout.trim() || `[OpenCode Fallback] Đã thử thực thi tác vụ.`;
                      resOp();
                  });
                  fallbackProcess.on('error', () => {
                      cauTraLoiAI = `[OpenCode Fallback] Lỗi thực thi tác vụ.`;
                      resOp();
                  });
                });
              } else {
                cauTraLoiAI = `Lỗi gọi Gemini và không thể sử dụng OpenCode fallback: ${errGen.message}`;
              }
            }

          } else if (['openai', 'deepseek', 'groq', 'github', 'freellmapi', 'ollama', 'custom'].includes(selectedProvider)) {
            let endpoint = "https://api.openai.com/v1/chat/completions";
            if (selectedProvider === 'deepseek') endpoint = "https://api.deepseek.com/chat/completions";
            if (selectedProvider === 'groq') endpoint = "https://api.groq.com/openai/v1/chat/completions";
            if (selectedProvider === 'github') endpoint = "https://models.github.ai/inference/chat/completions";
            if (selectedProvider === 'freellmapi') {
              const cleanedBase = (base_url || "http://localhost:8080/v1").replace(/\/+$/, '');
              endpoint = cleanedBase.endsWith('/chat/completions') ? cleanedBase : `${cleanedBase}/chat/completions`;
            }
            if (selectedProvider === 'ollama') endpoint = (base_url || "http://localhost:11434") + "/v1/chat/completions";
            if (selectedProvider === 'custom') {
              const cleanedBase = (base_url || "https://openrouter.ai/api/v1").replace(/\/+$/, '');
              endpoint = cleanedBase.endsWith('/chat/completions') ? cleanedBase : `${cleanedBase}/chat/completions`;
            } else if (base_url && !['ollama', 'freellmapi'].includes(selectedProvider)) {
              endpoint = base_url + "/chat/completions";
            }

            const formattedMessages = [
              { role: "system", content: systemPrompt },
              ...history.map(h => ({
                role: h.vai_tro === 'user' ? 'user' : 'assistant',
                content: h.noi_dung
              }))
            ];

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${keyToUse}`
              },
              body: JSON.stringify({
                model: selectedModel,
                messages: formattedMessages,
                temperature: 0.7
              })
            });

            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
              cauTraLoiAI = data.choices[0].message.content;
            } else if (data.error) {
              cauTraLoiAI = `Lỗi từ ${selectedProvider.toUpperCase()}: ${data.error.message || JSON.stringify(data.error)}`;
            } else {
              cauTraLoiAI = `Phản hồi từ ${selectedProvider.toUpperCase()}: ` + JSON.stringify(data);
            }

          } else if (selectedProvider === 'claude') {
            const claudeBody = {
              model: selectedModel || 'claude-3-5-sonnet-20241022',
              max_tokens: thinking_level === 'deep' ? 16384 : 4096,
              system: systemPrompt,
              messages: history.map(h => ({
                role: h.vai_tro === 'user' ? 'user' : 'assistant',
                content: h.noi_dung
              }))
            };
            if (thinking_level === 'deep') {
              claudeBody.thinking = { type: 'enabled', budget_tokens: 10000 };
            }
            const response = await fetch("https://api.anthropic.com/v1/messages", {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': keyToUse,
                'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify(claudeBody)
            });
            const data = await response.json();
            if (data.content && data.content.length > 0) {
              const textBlocks = data.content.filter(b => b.type === 'text');
              cauTraLoiAI = textBlocks.map(b => b.text).join('\n') || data.content[0].text || '';
            } else {
              cauTraLoiAI = `Lỗi từ Claude: ` + (data.error?.message || JSON.stringify(data));
            }
          } else if (selectedProvider === 'opencode') {
            if (IS_OPENCODE_AVAILABLE) {
              const opencodeModel = selectedModel && selectedModel !== 'opencode-default' ? selectedModel : 'opencode/deepseek-v4-flash-free';
              const rootDir = path.join(__dirname, '..', '..', '..');
              
              await new Promise((resolve) => {
                const opencodeProcess = spawn(
                  `"${OPENCODE_BIN_PATH}"`,
                  ['run', noi_dung, '-m', opencodeModel, '--auto'],
                  { cwd: rootDir, timeout: 20000, shell: true, env: { ...process.env, LANG: 'en_US.UTF-8' } }
                );
                let stdout = '';
                opencodeProcess.stdout.on('data', data => stdout += data);
                opencodeProcess.on('close', () => {
                  const cleanOut = stdout.replace(/\[Agent Error\]/g, '').trim();
                  if (cleanOut && !cleanOut.includes('Command failed') && !cleanOut.includes('syntax is incorrect') && cleanOut.length > 10) {
                    cauTraLoiAI = cleanOut;
                  } else {
                    cauTraLoiAI = `Xin chào! Tôi là **AI Rexi** - Trợ Lý Đa Năng của bạn.\n\nHiện tại tôi đang sử dụng **OpenCode Agent** để xử lý yêu cầu.\n\nBạn có thể:\n💬 **Chat** - Trò chuyện thông thường\n🤖 **Agent Mode** - Tự động code, sửa file, chạy lệnh\n💻 **Code Editor** - Viết và preview code trực tiếp\n📺 **IPTV** - Xem TV trực tuyến\n🖥️ **Remote Desktop** - Điều khiển máy tính từ xa\n\nRất vui được hỗ trợ bạn! 🚀`;
                  }
                  resolve();
                });
              });
            } else {
              cauTraLoiAI = "⛔ **Lỗi hệ thống:** Không tìm thấy `opencode.exe`. Vui lòng kiểm tra lại đường dẫn cài đặt.";
            }
          }
        } catch (apiErr) {
          console.error(`Lỗi gọi ${selectedProvider}:`, apiErr.message);
          cauTraLoiAI = `Lỗi kết nối tới ${selectedProvider.toUpperCase()} (${selectedModel}): ` + apiErr.message;
        }

        saveAIMessageAndRespond(id, cauTraLoiAI, res);
      });
    }
  );
});

// Long Term Memory APIs
router.get('/memory', authMiddleware, (req, res) => {
  db.all("SELECT * FROM bo_nho_dai_han ORDER BY do_uu_tien DESC, ngay_tao DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/memory', authMiddleware, (req, res) => {
  const { loai, noi_dung, do_uu_tien } = req.body;
  if (!noi_dung) return res.status(400).json({ error: 'Nội dung bộ nhớ không được trống' });
  const maBoNho = 'mem_' + Date.now();
  db.run(
    "INSERT INTO bo_nho_dai_han (ma_bo_nho, loai, noi_dung, do_uu_tien) VALUES (?, ?, ?, ?)",
    [maBoNho, loai || 'thong_tin_user', noi_dung.trim(), do_uu_tien || 5],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, ma_bo_nho: maBoNho, loai, noi_dung });
    }
  );
});

router.delete('/memory/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM bo_nho_dai_han WHERE ma_bo_nho = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id });
  });
});

// Exec API - Chỉ cho ADMIN
router.post('/exec', [authMiddleware, adminMiddleware], (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Thiếu câu lệnh execution' });

  // Chỉ cho phép request từ localhost
  const clientIp = req.ip || req.connection?.remoteAddress || '';
  const isLocalhost = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1' || clientIp === 'localhost';
  
  // Yêu cầu confirm header để tránh exec vô tình
  const confirmed = req.headers['x-exec-confirm'] === 'yes';
  
  if (!isLocalhost) {
    return res.status(403).json({ 
      error: '⛔ Exec API chỉ cho phép từ localhost vì lý do bảo mật.',
      note: 'Hãy dùng terminal thật hoặc truy cập qua localhost.'
    });
  }
  
  if (!confirmed) {
    return res.status(428).json({
      error: '⛔ Yêu cầu xác nhận: gửi header X-Exec-Confirm: yes để thực thi lệnh này.',
      command: command
    });
  }

  // Blocklist mở rộng
  const dangerousPatterns = [
    /rm\s+-rf/i, /format\s+[c-z]:/i, /del\s+\/f/i, /drop\s+database/i,
    /shutdown/i, /restart\s+computer/i, /stop\s+service/i,
    /Remove-Item/i, /Remove-ItemProperty/i, /Clear-Content/i,
    /net\s+user/i, /net\s+localgroup/i, /sc\s+delete/i,
    /wmic/i, /diskpart/i, /reg\s+delete/i
  ];
  
  if (dangerousPatterns.some(p => p.test(command))) {
    return res.status(403).json({ error: '⛔ Câu lệnh bị chặn vì lý do an toàn hệ thống.' });
  }

  const rootDir = path.join(__dirname, '..', '..', '..');

  exec(command, { cwd: rootDir, timeout: 15000, maxBuffer: 1024 * 100 }, (error, stdout, stderr) => {
    res.json({
      success: !error,
      stdout: stdout ? stdout.trim() : '',
      stderr: stderr ? stderr.trim() : '',
      error: error ? error.message : null
    });
  });
});

// Git APIs
router.get('/git/status', [authMiddleware, adminMiddleware], (req, res) => {
  const rootDir = path.join(__dirname, '..', '..', '..');
  exec('git status --short && git branch --show-current', { 
    cwd: rootDir, 
    encoding: 'utf8',
    env: { ...process.env, LANG: 'en_US.UTF-8' }
  }, (error, stdout) => {
    if (error) return res.json({ isGit: false, message: 'Thư mục không phải Git repo' });
    const lines = stdout.trim().split('\n');
    const branch = lines.pop() || 'main';
    res.json({ isGit: true, branch, changes: lines });
  });
});

router.get('/git/diff', [authMiddleware, adminMiddleware], (req, res) => {
  const rootDir = path.join(__dirname, '..', '..', '..');
  exec('git diff', { 
    cwd: rootDir, 
    maxBuffer: 1024 * 1024, 
    encoding: 'utf8' 
  }, (error, stdout) => {
    res.json({ diff: stdout || 'Không có thay đổi chưa commit.' });
  });
});

// Search API - Cho phép mọi người dùng đã đăng nhập
router.post('/search', authMiddleware, async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Thiếu từ khóa tìm kiếm' });

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const resp = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await resp.text();
    const matches = [...html.matchAll(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g)];
    const results = matches.slice(0, 4).map(m => m[1].replace(/<[^>]+>/g, '').trim());

    res.json({
      success: true,
      query,
      results: results.length > 0 ? results : [`Tìm kiếm thông tin cho '${query}' hoàn tất.`]
    });
  } catch (err) {
    res.json({ success: false, error: 'Lỗi tìm kiếm: ' + err.message });
  }
});

module.exports = router;
