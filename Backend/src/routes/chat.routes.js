const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { exec, execSync, spawn } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/db');
const { stripAnsi, AnsiStreamCleaner } = require('../utils/stripAnsi');
const { authMiddleware, adminMiddleware, guestMiddleware, guestAgentMiddleware, getGuestLimits } = require('../middleware/auth.middleware');
const { GUEST_USER_ID } = require('../ensure-admin');

// ─── AI REXI BRAIN INTEGRATION ────────────────────────────────
const brain = require('../services/brain/intelligence/intelligence');
const { extractEntities } = require('../services/brain/nlp/entity-extractor');
const { loadSmartMemory, updateProfileFromMessage, saveMemoryAuto } = brain;

// --- CONFIGURATION ---
const OPENCODE_BIN_PATH = process.env.OPENCODE_BIN_PATH || (process.env.USERPROFILE ? require("path").join(process.env.USERPROFILE, ".opencode", "bin", "opencode.exe") : "");
const IS_OPENCODE_AVAILABLE = fs.existsSync(OPENCODE_BIN_PATH);

// Env chuẩn cho mọi spawn opencode/agent: tắt màu ANSI ở NGUỒN để tránh rò rỉ mã "[[35m..." vào chat.
// (stripAnsi + AnsiStreamCleaner ở các handler là lớp an toàn phụ khi tool vẫn phun mã màu.)
const NO_COLOR_ENV = { ...process.env, LANG: 'en_US.UTF-8', NO_COLOR: '1', FORCE_COLOR: '0', TERM: 'dumb', CLICOLOR: '0', CLICOLOR_FORCE: '0' };

// --- CACHING FOR MODELS ---
const modelCache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000; // Cache models for 6 hours

// Cleanup cache định kỳ để tránh memory leak
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, cached] of modelCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      modelCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[ModelCache] Cleaned ${cleaned} expired entries. Active: ${modelCache.size}`);
  }
}, 30 * 60 * 1000); // Cleanup mỗi 30 phút

function getModelCacheKey(provider, apiKey, baseUrl) {
    if (provider === 'opencode') {
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
router.get('/conversations', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return guestMiddleware(req, res, next);
  }
  return authMiddleware(req, res, next);
}, (req, res) => {
  const userId = req.user ? req.user.id : null;
  if (!userId) {
    return res.json([]);
  }
  db.all("SELECT * FROM cuoc_hoi_thoai WHERE ma_nguoi_dung = ? AND ngay_xoa IS NULL ORDER BY ngay_cap_nhat DESC", [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

router.post('/conversations', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return guestMiddleware(req, res, next);
  }
  return authMiddleware(req, res, next);
}, (req, res) => {
  const { tieu_de, ten_mo_hinh_ai } = req.body;
  const maHoiThoai = crypto.randomUUID();
  const userId = req.user ? req.user.id : GUEST_USER_ID;

  const sql = `
    INSERT INTO cuoc_hoi_thoai (ma_hoi_thoai, ma_nguoi_dung, ma_thu_muc, tieu_de, ten_mo_hinh_ai, trang_thai)
    VALUES (?, ?, ?, ?, ?, 'dang_mo')
  `;
  db.run(sql, [maHoiThoai, userId, null, tieu_de || 'Trò chuyện mới', ten_mo_hinh_ai || 'Gemini 3.5 Flash'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ma_hoi_thoai: maHoiThoai, tieu_de: tieu_de || 'Trò chuyện mới', ten_mo_hinh_ai: ten_mo_hinh_ai || 'Gemini 3.5 Flash' });
  });
});

// GUEST: Lấy thông tin giới hạn
router.get('/guest-limits', (req, res) => {
  const limits = getGuestLimits(req);
  res.json({ success: true, limits, isLoggedIn: !!req.user });
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


// ADMIN: Phản hồi tin nhắn trong cuộc hội thoại (vai_tro: 'admin')
router.post('/admin/conversations/:id/reply', [authMiddleware, adminMiddleware], (req, res) => {
  const { id } = req.params;
  const { noi_dung } = req.body;
  if (!noi_dung || !noi_dung.trim()) {
    return res.status(400).json({ error: 'Nội dung tin nhắn không được trống' });
  }
  const maTinNhan = crypto.randomUUID();
  db.run(
    "INSERT INTO tin_nhan (ma_tin_nhan, ma_hoi_thoai, vai_tro, noi_dung) VALUES (?, ?, 'admin', ?)",
    [maTinNhan, id, noi_dung.trim()],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.run("UPDATE cuoc_hoi_thoai SET ngay_cap_nhat = CURRENT_TIMESTAMP WHERE ma_hoi_thoai = ?", [id]);
      res.json({
        ma_tin_nhan: maTinNhan,
        ma_hoi_thoai: id,
        vai_tro: 'admin',
        noi_dung: noi_dung.trim(),
        admin_name: req.user.ten_day_du || req.user.email
      });
    }
  );
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
    if (err) {
      console.error('[Conversations Delete Messages Error]', err.message);
    }
    db.run("DELETE FROM cuoc_hoi_thoai WHERE ma_hoi_thoai = ?", [id], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true, id });
    });
  });
});

router.get('/keys', [authMiddleware, adminMiddleware], (req, res) => {
  // Xóa dứt điểm các provider đã loại bỏ khỏi CSDL
  const REMOVED = ['bazaarlink', 'kiraai', 'ollama', 'freellmapi', 'tokenrouter'];
  const ph = REMOVED.map(() => '?').join(',');
  db.run(`DELETE FROM khoa_api WHERE LOWER(ten_nha_cung_cap) IN (${ph})`, REMOVED);
  db.run(`DELETE FROM model_scan_cache WHERE LOWER(ma_nha_cung_cap) IN (${ph})`, REMOVED);
  db.run(`UPDATE ai_models SET kich_hoat = 0 WHERE LOWER(ma_nha_cung_cap) IN (${ph})`, REMOVED);

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
  if (!api_key && !['opencode'].includes(provider)) {
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
        // KHÔNG dùng danh sách model mẫu — trả lỗi để thấy API trả sai định dạng
        return res.json({ success: false, error: 'GitHub Models: API trả về định dạng không hợp lệ (không dùng dữ liệu mẫu)' });
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
        // KHÔNG chèn model mẫu khi CLI lỗi — báo lỗi rõ ràng
        return res.json({ success: false, error: 'OpenCode: ' + (errModels.message || 'CLI lỗi — không thể lấy danh sách model') });
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
    if (err) return res.status(500).json({ error: err.message });
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

function cleanAIThinkingProcess(text) {
  if (!text || typeof text !== 'string') return text;
  let cleaned = text;

  // 1. Loại bỏ các thẻ suy luận <think>...</think>
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Loại bỏ đoạn nháp suy luận bằng tiếng Anh "Here's a thinking process: ..."
  if (/Here'?s a thinking process:/i.test(cleaned)) {
    const finalMatch = cleaned.match(/(?:Output matches draft|Final Output|Output):\s*([✅\s\S]+)$/i);
    if (finalMatch && finalMatch[1]) {
      cleaned = finalMatch[1].replace(/^[✅\s]+/, '').trim();
    } else {
      const draftMatch = cleaned.match(/Draft:\s*"([^"]+)"/i);
      if (draftMatch && draftMatch[1]) {
        cleaned = draftMatch[1].trim();
      } else {
        const parts = cleaned.split(/\n\n+/);
        const nonThinkingParts = parts.filter(p => !/Here'?s a thinking process:/i.test(p) && !/^\d+\.\s*\*\*/.test(p.trim()));
        if (nonThinkingParts.length > 0) {
          cleaned = nonThinkingParts.join('\n\n').trim();
        }
      }
    }
  }

  return cleaned || text;
}

function saveAIMessageAndRespond(maHoiThoai, content, res) {
  const cleanContent = cleanAIThinkingProcess(content);
  const maTinNhanAI = crypto.randomUUID();
  db.run(
    "INSERT INTO tin_nhan (ma_tin_nhan, ma_hoi_thoai, vai_tro, noi_dung) VALUES (?, ?, 'assistant', ?)",
    [maTinNhanAI, maHoiThoai, cleanContent],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        ma_tin_nhan: maTinNhanAI,
        ma_hoi_thoai: maHoiThoai,
        vai_tro: 'assistant',
        noi_dung: cleanContent
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
  const { vai_tro, noi_dung, provider, client_api_key, model_name, base_url, mode, execution_mode, thinking_level, skill_id } = req.body;

  // Logic xử lý tin nhắn giữ nguyên...
  const maTinNhanUser = crypto.randomUUID();
  
  db.run(
    "INSERT INTO tin_nhan (ma_tin_nhan, ma_hoi_thoai, vai_tro, noi_dung) VALUES (?, ?, ?, ?)",
    [maTinNhanUser, id, vai_tro, noi_dung],
    async (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Tăng số lượng tin nhắn đã dùng cho khách CHỈ KHI thực sự gửi tin nhắn thành công
      if (!req.user && req.session) {
        req.session.messageCount = (req.session.messageCount || 0) + 1;
      }

      db.get("SELECT tieu_de FROM cuoc_hoi_thoai WHERE ma_hoi_thoai = ?", [id], (err, convRow) => {
        if (convRow && (convRow.tieu_de === 'Trò chuyện mới' || !convRow.tieu_de)) {
          const newTitle = taoTieuDeThongMinh(noi_dung);
          db.run("UPDATE cuoc_hoi_thoai SET tieu_de = ?, ngay_cap_nhat = CURRENT_TIMESTAMP WHERE ma_hoi_thoai = ?", [newTitle, id]);
        } else {
          db.run("UPDATE cuoc_hoi_thoai SET ngay_cap_nhat = CURRENT_TIMESTAMP WHERE ma_hoi_thoai = ?", [id]);
        }
      });

      if (execution_mode === 'agent') {
        // Cho phép tất cả user đã đăng nhập + Guest sử dụng Agent Mode
        const isAdmin = req.user && req.user.role === 'admin';
        const isGuest = !req.user;
        
        if (isGuest && req.session.agentTaskCount >= 3) {
          const errorMessage = "🔒 **Đã hết lượt Agent Mode miễn phí!**\n\nBạn đã sử dụng hết **3 tasks** Agent cho khách.\n\nĐăng nhập để:\n✅ Agent Mode không giới hạn\n✅ Chat không giới hạn\n✅ Lưu lịch sử & Memory";
          return saveAIMessageAndRespond(id, errorMessage, res);
        }

        // Tăng counter cho guest
        if (isGuest) {
          req.session.agentTaskCount = (req.session.agentTaskCount || 0) + 1;
        }

        if (!IS_OPENCODE_AVAILABLE) {
            const errorMessage = "⛔ **Lỗi hệ thống:** Không tìm thấy `opencode.exe`. Vui lòng kiểm tra lại đường dẫn cài đặt.";
            return saveAIMessageAndRespond(id, errorMessage, res);
        }

        // Null/empty check cho Agent Mode để tránh spawn process vô nghĩa
        if (!noi_dung || !noi_dung.trim()) {
          const errorMessage = "⚠️ **Lỗi:** Nội dung tin nhắn trống. Vui lòng nhập yêu cầu trước khi chạy Agent Mode.";
          return saveAIMessageAndRespond(id, errorMessage, res);
        }

        const rootDir = path.join(__dirname, '..', '..', '..');

        // Agent Mode luôn chạy qua opencode engine.
        // Chỉ dùng model có prefix "opencode/"; nếu không (người dùng đang chọn Gemini/Claude/...)
        // thì ép về model opencode mặc định để tránh lỗi "model not found".
        const rawModel = (model_name || '').trim();
        const opencodeModel = rawModel.startsWith('opencode/')
          ? rawModel
          : 'opencode/deepseek-v4-flash-free';

        // Sử dụng spawn để chống Shell Injection.
        // Timeout tăng lên 5 phút vì opencode agent thường mất 40-90s để hoàn thành 1 task.
        const agentProcess = spawn(
          OPENCODE_BIN_PATH,
          ['run', noi_dung, '-m', opencodeModel, '--auto'],
          { cwd: rootDir, timeout: 300000, env: NO_COLOR_ENV }
        );

        let stdout = '';
        let stderr = '';
        agentProcess.stdout.on('data', (data) => { stdout += stripAnsi(data.toString()); });
        agentProcess.stderr.on('data', (data) => { stderr += stripAnsi(data.toString()); });

        return agentProcess.on('close', (code) => {
          let cauTraLoiAgent = "";
          if (code !== 0) {
            cauTraLoiAgent = stdout.trim() || stderr.trim() || `[Agent Error] Process exited with code ${code}`;
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

      // Ưu tiên lấy API key:
      // 1. CSDL khoa_api lưu bởi Admin cho đúng provider
      // 2. Client gửi lên (client_api_key)
      // 3. Env var GEMINI_API_KEY (nếu provider là gemini)
      const dbKeyRow = await new Promise((resDb) => {
        db.get("SELECT gia_tri_khoa FROM khoa_api WHERE LOWER(ten_nha_cung_cap) = LOWER(?)", [selectedProvider], (err, r) => resDb(r));
      });
      if (dbKeyRow && dbKeyRow.gia_tri_khoa && dbKeyRow.gia_tri_khoa.trim()) {
        keyToUse = dbKeyRow.gia_tri_khoa.trim();
      } else if (client_api_key && client_api_key.trim()) {
        keyToUse = client_api_key.trim();
      }

      // Fetch base_url from ai_providers table for custom providers
      const providerRow = await new Promise((resProv) => {
        db.get("SELECT base_url FROM ai_providers WHERE ma_nha_cung_cap = ?", [selectedProvider], (err, r) => resProv(r));
      });
      let baseUrl = providerRow && providerRow.base_url ? providerRow.base_url : null;

      if (!keyToUse && selectedProvider === 'gemini' && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
        keyToUse = process.env.GEMINI_API_KEY;
      }

      if (!keyToUse && !['opencode'].includes(selectedProvider)) {
        // Fallback: nếu đã cài opencode.exe, cho phép dùng miễn phí thay vì chặn
        if (IS_OPENCODE_AVAILABLE) {
          selectedProvider = 'opencode';
          selectedModel = 'opencode/deepseek-v4-flash-free';
        } else {
          const fallbackMsg = `Chưa cài đặt API Key cho nhà cung cấp ${selectedProvider.toUpperCase()}. Hãy bấm nút 'Cài đặt hệ thống' ở góc trái để nhập Key và chọn Model!`;
          return saveAIMessageAndRespond(id, fallbackMsg, res);
        }
      }

      // Lấy lịch sử chat: tăng từ 15 lên 30 để giữ ngữ cảnh tốt hơn
      db.all("SELECT vai_tro, noi_dung FROM tin_nhan WHERE ma_hoi_thoai = ? ORDER BY ngay_gui ASC LIMIT 30", [id], async (err, history) => {
         if (err) { saveAIMessageAndRespond(id, '⚠️ Lỗi đọc lịch sử chat.', res); return; }
         history = history || [];
         history.push({ vai_tro: 'user', noi_dung: noi_dung });
         let cauTraLoiAI = "";

        const { user_location } = req.body;
        const now = new Date();
        const nowFormatted = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const locationStr = user_location || 'Hà Nội, Việt Nam';

        const userIdForBrain = req.user ? req.user.id : GUEST_USER_ID;
        const messageText = noi_dung;

        // --- AI REXI BRAIN: tự lưu memory + cập nhật profile (fire-and-forget, không chặn chat) ---
        try {
          const _brainEnt = extractEntities(messageText);
          if (_brainEnt) {
            Promise.resolve(saveMemoryAuto(userIdForBrain, messageText)).catch(() => {});
            Promise.resolve(updateProfileFromMessage(userIdForBrain, _brainEnt)).catch(() => {});
          }
        } catch (e) { /* brain không bao giờ được chặn chat */ }

        // --- AI REXI BRAIN: load memory thông minh (priority + keyword match) + profile ---
        let memoryText = '';
        let profileText = '';
        try {
          const memResult = await loadSmartMemory(userIdForBrain, messageText);
          memoryText = memResult ? memResult.text : '';
        } catch (e) {}
        try {
          const profile = await brain.getProfile(userIdForBrain);
          profileText = profile ? brain.formatToPromptText(profile) : '';
        } catch (e) { /* brain không bao giờ được chặn chat */ }
        if (memoryText) console.log('[Brain] Memory loaded:', memoryText.slice(0, 200));

        const SPECIALTY_PROMPTS = {
          general: 'Bạn là Rexi, Siêu Trợ Lý AI Toàn Năng giúp giải quyết mọi câu hỏi cuộc sống, công việc, văn phòng và phân tích.',
          business: 'Bạn là Chuyên Gia Doanh Nghiệp & Cố Vấn Pháp Lý hàng đầu. Hãy tập trung viết hợp đồng kinh tế, công văn hành chính, kế hoạch tài chính và chiến lược kinh doanh chuyên nghiệp.',
          marketing: 'Bạn là Giám Đốc Marketing & Sáng Tạo Nội Dung Viral. Hãy tập trung viết kịch bản TikTok/Reels triệu view, bài viết SEO, Slogan ấn tượng và kịch bản chốt đơn bán hàng.',
          education: 'Bạn là Giáo Sư & Chuyên Gia Phân Tích Đa Ngành. Hãy tập trung tóm tắt tài liệu, phân tích chuyên sâu, lập lộ trình học tập và giải đáp tri thức.',
          health: 'Bạn là Chuyên Gia Dinh Dưỡng & Huấn Luyện Viên Sức Khỏe. Hãy tập trung lập thực đơn dinh dưỡng, bài tập Gym/Calisthenics và tư vấn tâm lý đời sống.',
          coder: 'Bạn là Senior Software Engineer & System Architect. Tập trung viết code sạch, tối ưu, thiết kế kiến trúc hệ thống và sửa bug.'
        };

        const currentRolePrompt = SPECIALTY_PROMPTS[mode] || SPECIALTY_PROMPTS.general;

        // Load TẤT CẢ skills từ DB và inject vào system prompt
        let skillInstruction = '';
        try {
          const allSkills = await new Promise((resolve) => {
            db.all("SELECT ten_ky_nang, tieu_de, mo_ta FROM ky_nang WHERE trang_thai = 'kich_hoat'", [], (err, rows) => {
              resolve(rows || []);
            });
          });
          
          const skillPrompts = [];
          for (const skill of allSkills) {
            const possiblePaths = [
              // Ưu tiên 1: Skills trong dự án AI REXI
              path.join(__dirname, '..', '..', 'skills', skill.ten_ky_nang, 'SKILL.md'),
              // Ưu tiên 2: Skills của opencode
              path.join(process.env.USERPROFILE || process.env.HOME, '.agents', 'skills', skill.ten_ky_nang, 'SKILL.md'),
              // Ưu tiên 3: Skills của Gemini
              path.join(process.env.USERPROFILE || process.env.HOME, '.gemini', 'config', 'skills', skill.ten_ky_nang, 'SKILL.md')
            ];
            let skillContent = null;
            for (const p of possiblePaths) {
              if (fs.existsSync(p)) {
                try {
                  skillContent = fs.readFileSync(p, 'utf8');
                  break;
                } catch (e) {}
              }
            }
            if (skillContent) {
              // Giới hạn mỗi skill prompt tối đa 1200 chars để tránh system prompt quá dài
              const trimmedSkill = skillContent.replace(/\s+/g, ' ').trim();
              skillPrompts.push(`🎯 **${skill.tieu_de}** (${skill.ten_ky_nang}):\n${trimmedSkill.substring(0, 1200)}`);
            } else {
              skillPrompts.push(`🎯 **${skill.tieu_de}**: ${skill.mo_ta}`);
            }
          }
          
          if (skillPrompts.length > 0) {
            // Giới hạn tối đa 5 skills trong system prompt để tránh quá dài
            const MAX_SKILLS_IN_PROMPT = 5;
            const trimmedSkillPrompts = skillPrompts.length > MAX_SKILLS_IN_PROMPT
              ? skillPrompts.slice(0, MAX_SKILLS_IN_PROMPT)
              : skillPrompts;
            if (skillPrompts.length > MAX_SKILLS_IN_PROMPT) {
              trimmedSkillPrompts.push(`... và ${skillPrompts.length - MAX_SKILLS_IN_PROMPT} skills khác đã được kích hoạt.`);
            }
            skillInstruction = `\n\n📚 **KỸ NĂNG AGENT CỦA REXI:**\n` + trimmedSkillPrompts.join('\n\n---\n\n');
          }
        } catch (skillErr) {
          console.log('[Skill] Lỗi load skills:', skillErr.message);
        }

        let systemPrompt = `${currentRolePrompt} Bây giờ là ${nowFormatted} (Giờ Việt Nam). Vị trí địa lý ước tính của người dùng: ${locationStr}.
${profileText || ''
}
BỘ NHỚ DÀI HẠN VỀ NGƯỜI DÙNG & QUY TẮC CỦA REXI:
${memoryText || '- Người dùng thích làm việc chuyên nghiệp, nội dung ngắn gọn, súc tích, thực tế và chính xác.'}

- NGUYÊN TẮC QUAN TRỌNG: Không lặp lại các câu miễn trừ trách nhiệm. Hãy trả lời thẳng vấn đề, tự nhiên, thân thiện, chu đáo và nâng cao trải nghiệm người dùng đến tận răng.${skillInstruction}`;

        // Giới hạn tổng độ dài system prompt để tránh vượt context limit model
        const MAX_SYSTEM_PROMPT = 6000;
        if (systemPrompt.length > MAX_SYSTEM_PROMPT) {
          systemPrompt = systemPrompt.substring(0, MAX_SYSTEM_PROMPT) + '\n\n[...đã cắt ngắn system prompt để phù hợp context limit...]';
        }

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
            
            // CHỈ gửi thinkingConfig khi user chọn thinking_level = 'deep'.
            // KHÔNG gửi thinkingBudget: 0 — một số model Gemini mới (3.x)
            // trả lỗi 400 INVALID_ARGUMENT khi nhận thinkingBudget = 0.
            const genConfig = {};
            if (thinking_level === 'deep') {
              genConfig.thinkingConfig = { thinkingBudget: 8192 };
            }

            try {
              const result = await model.generateContent({ contents, systemInstruction: systemPrompt, generationConfig: genConfig });
              cauTraLoiAI = result.response.text();
            } catch (errGen) {
              if (IS_OPENCODE_AVAILABLE) {
                const rootDir = path.join(__dirname, '..', '..', '..');
                await new Promise((resOp) => {
                  const fallbackProcess = spawn(
                    OPENCODE_BIN_PATH,
                    ['run', noi_dung, '--auto'],
                    { cwd: rootDir, timeout: 20000, env: NO_COLOR_ENV }
                  );
                  let stdout = '';
                  fallbackProcess.stdout.on('data', data => { stdout += stripAnsi(data.toString()); });
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

          } else if (['openai', 'deepseek', 'groq', 'github', 'custom'].includes(selectedProvider)) {
            let endpoint = "https://api.openai.com/v1/chat/completions";
            if (selectedProvider === 'deepseek') endpoint = "https://api.deepseek.com/chat/completions";
            else if (selectedProvider === 'groq') endpoint = "https://api.groq.com/openai/v1/chat/completions";
            else if (selectedProvider === 'github') endpoint = "https://models.github.ai/inference/chat/completions";
            else if (selectedProvider === 'custom') {
              const cleanedBase = (baseUrl || "https://openrouter.ai/api/v1").replace(/\/+$/, '');
              endpoint = cleanedBase.endsWith('/chat/completions') ? cleanedBase : `${cleanedBase}/chat/completions`;
            } else if (baseUrl) {
              endpoint = baseUrl + "/chat/completions";
            }

            const formattedMessages = [
              { role: "system", content: systemPrompt },
              ...history.map(h => ({
                role: h.vai_tro === 'user' ? 'user' : 'assistant',
                content: h.noi_dung
              }))
            ];

            const fetchHeaders = {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Authorization': `Bearer ${keyToUse}`
            };

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: fetchHeaders,
              body: JSON.stringify({
                model: selectedModel,
                messages: formattedMessages,
                temperature: 0.7,
                max_tokens: 1024
              }),
              signal: AbortSignal.timeout(30000)
            });

            const data = await response.json();
            if (data.choices && data.choices.length > 0) {
              const msg = data.choices[0].message;
              // Reasoning models (e.g. BazaarLink deepseek-v4-flash:free) có thể trả content rỗng
              // nhưng nội dung thật nằm trong field reasoning/reasoning_details
              cauTraLoiAI = msg.content || msg.reasoning || (msg.reasoning_details && msg.reasoning_details.length > 0 ? msg.reasoning_details.map(r => r.text).filter(Boolean).join('\n') : '') || '';
              if (!cauTraLoiAI) {
                cauTraLoiAI = `Phản hồi (chỉ reasoning): ` + JSON.stringify(data).substring(0, 500);
              }
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
              const isAgentMode = execution_mode === 'agent';
              
              await new Promise((resolve) => {
                const args = ['run', noi_dung, '-m', opencodeModel];
                if (isAgentMode) args.push('--auto');
                
                const opencodeProcess = spawn(
                  OPENCODE_BIN_PATH,
                  args,
                  { cwd: rootDir, timeout: 300000, env: NO_COLOR_ENV }
                );
                let stdout = '';
                opencodeProcess.stdout.on('data', data => { stdout += stripAnsi(data.toString()); });
                opencodeProcess.on('close', () => {
                  const cleanOut = stdout.replace(/\[Agent Error\]/g, '').trim();
                  if (cleanOut && cleanOut.length > 0) {
                    cauTraLoiAI = cleanOut;
                  } else {
                    cauTraLoiAI = `[OpenCode] Đã thực thi xong. Xem kết quả ở phía trên.`;
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

// ========== STREAMING HELPERS (dùng chung cho route stream) ==========
// Tách logic lấy API key / fallback provider ra khỏi route để tái sử dụng
async function resolveProviderAndKey(req, provider, model_name, client_api_key) {
  let selectedProvider = provider || 'gemini';
  let selectedModel = model_name || 'gemini-1.5-flash';
  let keyToUse = null;
  let baseUrl = null;

  // Lấy API key từ CSDL khoa_api của Admin trước
  const dbKeyRow = await new Promise((resDb) => {
    db.get("SELECT gia_tri_khoa FROM khoa_api WHERE LOWER(ten_nha_cung_cap) = LOWER(?)", [selectedProvider], (err, r) => resDb(r));
  });
  if (dbKeyRow && dbKeyRow.gia_tri_khoa && dbKeyRow.gia_tri_khoa.trim()) {
    keyToUse = dbKeyRow.gia_tri_khoa.trim();
  } else if (client_api_key && client_api_key.trim()) {
    keyToUse = client_api_key.trim();
  }

  // Fetch base_url from ai_providers table for custom providers
  const providerRow = await new Promise((resProv) => {
    db.get("SELECT base_url FROM ai_providers WHERE ma_nha_cung_cap = ?", [selectedProvider], (err, r) => resProv(r));
  });
  if (providerRow && providerRow.base_url) baseUrl = providerRow.base_url;

  if (!keyToUse && selectedProvider === 'gemini' && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
    keyToUse = process.env.GEMINI_API_KEY;
  }

  if (!keyToUse && !['opencode'].includes(selectedProvider)) {
    if (IS_OPENCODE_AVAILABLE) {
      selectedProvider = 'opencode';
      selectedModel = 'opencode/deepseek-v4-flash-free';
    } else {
      return { error: `Chưa cài đặt API Key cho nhà cung cấp ${selectedProvider.toUpperCase()}. Hãy bấm nút 'Cài đặt hệ thống' ở góc trái để nhập Key và chọn Model!` };
    }
  }

  return { selectedProvider, selectedModel, keyToUse, baseUrl };
}

// Tách logic build system prompt (lịch sử, memory, role, skills) ra khỏi route
async function buildChatContext(req, id, mode, noi_dung, user_location) {
  const history = await new Promise((resolve) => {
    db.all("SELECT vai_tro, noi_dung FROM tin_nhan WHERE ma_hoi_thoai = ? ORDER BY ngay_gui ASC LIMIT 30", [id], (err, rows) => resolve(rows || []));
  });
  history.push({ vai_tro: 'user', noi_dung });

  const now = new Date();
  const nowFormatted = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const locationStr = user_location || 'Hà Nội, Việt Nam';

  const memoryRows = await new Promise((resMem) => {
    db.all("SELECT noi_dung FROM bo_nho_dai_han WHERE ma_nguoi_dung = ? ORDER BY do_uu_tien DESC LIMIT 5", [req.user ? req.user.id : GUEST_USER_ID], (err, r) => resMem(r || []));
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

  let skillInstruction = '';
  try {
    const allSkills = await new Promise((resolve) => {
      db.all("SELECT ten_ky_nang, tieu_de, mo_ta FROM ky_nang WHERE trang_thai = 'kich_hoat'", [], (err, rows) => resolve(rows || []));
    });
    const skillPrompts = [];
    for (const skill of allSkills) {
      const possiblePaths = [
        path.join(__dirname, '..', '..', 'skills', skill.ten_ky_nang, 'SKILL.md'),
        path.join(process.env.USERPROFILE || process.env.HOME, '.agents', 'skills', skill.ten_ky_nang, 'SKILL.md'),
        path.join(process.env.USERPROFILE || process.env.HOME, '.gemini', 'config', 'skills', skill.ten_ky_nang, 'SKILL.md')
      ];
      let skillContent = null;
      for (const p of possiblePaths) { if (fs.existsSync(p)) { try { skillContent = fs.readFileSync(p, 'utf8'); break; } catch (e) {} } }
      if (skillContent) {
        const trimmedSkill = skillContent.replace(/\s+/g, ' ').trim();
        skillPrompts.push(`🎯 **${skill.tieu_de}** (${skill.ten_ky_nang}):\n${trimmedSkill.substring(0, 1200)}`);
      } else {
        skillPrompts.push(`🎯 **${skill.tieu_de}**: ${skill.mo_ta}`);
      }
    }
    if (skillPrompts.length > 0) {
      const MAX_SKILLS_IN_PROMPT = 5;
      const trimmedSkillPrompts = skillPrompts.length > MAX_SKILLS_IN_PROMPT ? skillPrompts.slice(0, MAX_SKILLS_IN_PROMPT) : skillPrompts;
      if (skillPrompts.length > MAX_SKILLS_IN_PROMPT) trimmedSkillPrompts.push(`... và ${skillPrompts.length - MAX_SKILLS_IN_PROMPT} skills khác đã được kích hoạt.`);
      skillInstruction = `\n\n📚 **KỸ NĂNG AGENT CỦA REXI:**\n` + trimmedSkillPrompts.join('\n\n---\n\n');
    }
  } catch (skillErr) {
    console.log('[Skill] Lỗi load skills:', skillErr.message);
  }

  let systemPrompt = `${currentRolePrompt} Bây giờ là ${nowFormatted} (Giờ Việt Nam). Vị trí địa lý ước tính của người dùng: ${locationStr}.

BỘ NHỚ DÀI HẠN VỀ NGƯỜI DÙNG & QUY TẮC CỦA REXI:
${memoryText || '- Người dùng thích làm việc chuyên nghiệp, nội dung ngắn gọn, súc tích, thực tế và chính xác.'}

- NGUYÊN TẮC QUAN TRỌNG: Không lặp lại các câu miễn trừ trách nhiệm. Hãy trả lời thẳng vấn đề, tự nhiên, thân thiện, chu đáo và nâng cao trải nghiệm người dùng đến tận răng.${skillInstruction}`;

  const MAX_SYSTEM_PROMPT = 6000;
  if (systemPrompt.length > MAX_SYSTEM_PROMPT) {
    systemPrompt = systemPrompt.substring(0, MAX_SYSTEM_PROMPT) + '\n\n[...đã cắt ngắn system prompt để phù hợp context limit...]';
  }

  return { history, systemPrompt };
}

// ========== STREAMING ENDPOINT (SSE) — token theo thời gian thực ==========
// Frontend gọi route này thay vì route cũ để nhận phản hồi từng phần (cả Chat & Agent)
router.post('/conversations/:id/messages/stream', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return guestMiddleware(req, res, next);
  return authMiddleware(req, res, next);
}, async (req, res) => {
  const { id } = req.params;
  const { vai_tro, noi_dung, provider, client_api_key, model_name, base_url, mode, execution_mode, thinking_level, user_location } = req.body;

  // Headers SSE — tắt buffering ở mọi tầng (Express, proxy, nginx)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const sendSSE = (obj) => { try { res.write(`data: ${JSON.stringify(obj)}\n\n`); } catch (e) {} };
  const endStream = () => { try { res.end(); } catch (e) {} };

  // Lưu tin nhắn user vào DB
  const maTinNhanUser = crypto.randomUUID();
  await new Promise((resolve) => {
    db.run("INSERT INTO tin_nhan (ma_tin_nhan, ma_hoi_thoai, vai_tro, noi_dung) VALUES (?, ?, ?, ?)", [maTinNhanUser, id, vai_tro, noi_dung], () => resolve());
  });

  // FIX GUEST LIMIT: tăng messageCount cho khách khi gửi tin thành công qua stream
  // (trước đây chỉ tăng ở route non-stream /messages nên khách chat được vô hạn)
  if (!req.user && req.session) {
    req.session.messageCount = (req.session.messageCount || 0) + 1;
  }

  // Cập nhật tiêu đề cuộc trò chuyện nếu còn mặc định
  db.get("SELECT tieu_de FROM cuoc_hoi_thoai WHERE ma_hoi_thoai = ?", [id], (err, convRow) => {
    if (convRow && (convRow.tieu_de === 'Trò chuyện mới' || !convRow.tieu_de)) {
      const newTitle = taoTieuDeThongMinh(noi_dung);
      db.run("UPDATE cuoc_hoi_thoai SET tieu_de = ?, ngay_cap_nhat = CURRENT_TIMESTAMP WHERE ma_hoi_thoai = ?", [newTitle, id]);
    } else {
      db.run("UPDATE cuoc_hoi_thoai SET ngay_cap_nhat = CURRENT_TIMESTAMP WHERE ma_hoi_thoai = ?", [id]);
    }
  });

  // ---------- AGENT MODE (stream stdout của opencode) ----------
  if (execution_mode === 'agent') {
    const isGuest = !req.user;
    if (isGuest && req.session.agentTaskCount >= 3) {
      sendSSE({ type: 'error', message: "🔒 **Đã hết lượt Agent Mode miễn phí!**\n\nBạn đã sử dụng hết **3 tasks** Agent cho khách.\n\nĐăng nhập để:\n✅ Agent Mode không giới hạn\n✅ Chat không giới hạn\n✅ Lưu lịch sử & Memory" });
      return endStream();
    }
    if (isGuest) {
      req.session.agentTaskCount = (req.session.agentTaskCount || 0) + 1;
      if (typeof req.session.save === 'function') req.session.save(() => {});
    }
    if (!IS_OPENCODE_AVAILABLE) {
      sendSSE({ type: 'error', message: "⛔ **Lỗi hệ thống:** Không tìm thấy `opencode.exe`. Vui lòng kiểm tra lại đường dẫn cài đặt." });
      return endStream();
    }
    if (!noi_dung || !noi_dung.trim()) {
      sendSSE({ type: 'error', message: "⚠️ **Lỗi:** Nội dung tin nhắn trống. Vui lòng nhập yêu cầu trước khi chạy Agent Mode." });
      return endStream();
    }

    const rootDir = path.join(__dirname, '..', '..', '..');
    const rawModel = (model_name || '').trim();
    const opencodeModel = rawModel.startsWith('opencode/') ? rawModel : 'opencode/deepseek-v4-flash-free';

    sendSSE({ type: 'status', message: '🤖 Đang khởi động Agent (opencode)... Vui lòng đợi, agent có thể mất 40s–5 phút tùy tác vụ.' });

    const agentProcess = spawn(OPENCODE_BIN_PATH, ['run', noi_dung, '-m', opencodeModel, '--auto'], { cwd: rootDir, timeout: 300000, env: NO_COLOR_ENV });
    let stdout = '';
    let stderr = '';
    const cleaner = new AnsiStreamCleaner();
    agentProcess.stdout.on('data', (data) => { const cleaned = cleaner.push(data.toString()); if (cleaned) { stdout += cleaned; sendSSE({ type: 'token', text: cleaned }); } });
    agentProcess.stderr.on('data', (data) => { stderr += stripAnsi(data.toString()); });
    agentProcess.on('error', () => { sendSSE({ type: 'error', message: 'Lỗi khởi động Agent process.' }); endStream(); });
    agentProcess.on('close', (code) => {
      const flushed = cleaner.flush();
      if (flushed) stdout += flushed;
      let finalText;
      if (code !== 0) { finalText = stdout.trim() || stderr.trim() || `[Agent Error] Process exited with code ${code}`; }
      else { finalText = stdout.trim() || "Tôi đã tự động thực thi các câu lệnh và cập nhật tệp tin thành công cho bạn."; }
      const maTinNhanAI = crypto.randomUUID();
      db.run("INSERT INTO tin_nhan (ma_tin_nhan, ma_hoi_thoai, vai_tro, noi_dung) VALUES (?, ?, 'assistant', ?)", [maTinNhanAI, id, finalText], () => {
        sendSSE({ type: 'done', ma_tin_nhan: maTinNhanAI, noi_dung: finalText });
        endStream();
      });
    });
    // Client ngắt kết nối → kill agent
    req.on('close', () => { try { if (!agentProcess.killed) agentProcess.kill(); } catch (e) {} });
    return;
  }

  // ---------- CHAT MODE (stream theo provider) ----------
  (async () => {
    let fullText = '';
    try {
      const resolved = await resolveProviderAndKey(req, provider, model_name, client_api_key);
      if (resolved.error) { sendSSE({ type: 'error', message: resolved.error }); return endStream(); }
      const { selectedProvider, selectedModel, keyToUse, baseUrl } = resolved;
      const { history, systemPrompt } = await buildChatContext(req, id, mode, noi_dung, user_location);
      if (selectedProvider === 'gemini') {
        const tempGenAI = new GoogleGenerativeAI(keyToUse);
        let model;
        try { model = tempGenAI.getGenerativeModel({ model: selectedModel || 'gemini-2.5-flash' }); }
        catch (e) { model = tempGenAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); }
        const contents = history.map(h => ({ role: h.vai_tro === 'user' ? 'user' : 'model', parts: [{ text: h.noi_dung }] }));
        // CHỈ gửi thinkingConfig khi thinking_level = 'deep' (xem ghi chú BUG 400 INVALID_ARGUMENT)
        const genConfig = thinking_level === 'deep' ? { thinkingConfig: { thinkingBudget: 8192 } } : {};
        const stream = await model.generateContentStream({ contents, systemInstruction: systemPrompt, generationConfig: genConfig });
        for await (const chunk of stream.stream) {
          const t = chunk.text();
          if (t) { fullText += t; sendSSE({ type: 'token', text: t }); }
        }
      } else if (['openai', 'deepseek', 'groq', 'github', 'custom'].includes(selectedProvider)) {
        let endpoint = "https://api.openai.com/v1/chat/completions";
        if (selectedProvider === 'deepseek') endpoint = "https://api.deepseek.com/chat/completions";
        if (selectedProvider === 'groq') endpoint = "https://api.groq.com/openai/v1/chat/completions";
        if (selectedProvider === 'github') endpoint = "https://models.github.ai/inference/chat/completions";
        if (selectedProvider === 'custom') {
          const cleanedBase = (baseUrl || "https://openrouter.ai/api/v1").replace(/\/+$/, '');
          endpoint = cleanedBase.endsWith('/chat/completions') ? cleanedBase : `${cleanedBase}/chat/completions`;
        } else if (baseUrl) {
          endpoint = baseUrl + "/chat/completions";
        }
        const formattedMessages = [{ role: "system", content: systemPrompt }, ...history.map(h => ({ role: h.vai_tro === 'user' ? 'user' : 'assistant', content: h.noi_dung }))];
        const fetchHeaders = {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/event-stream, application/json, */*',
          'Authorization': `Bearer ${keyToUse}`
        };
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: fetchHeaders,
          body: JSON.stringify({ model: selectedModel, messages: formattedMessages, temperature: 0.7, stream: true }),
          signal: AbortSignal.timeout(35000)
        });
        if (!response.ok || !response.body) {
          const errData = await response.json().catch(() => ({}));
          const statusText = response.status === 504 ? '504 Gateway Timeout (Server nhà cung cấp bị nghẽn/quá tải). Vui lòng đổi sang model khác như Gemini/Groq.' : response.status;
          sendSSE({ type: 'error', message: `Lỗi từ ${selectedProvider.toUpperCase()}: ${errData.error?.message || statusText}` });
          return endStream();
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop();
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) { fullText += delta; sendSSE({ type: 'token', text: delta }); }
            } catch (e) {}
          }
        }
      } else {
        if (selectedProvider === 'claude') {
          const claudeBody = { model: selectedModel || 'claude-3-5-sonnet-20241022', max_tokens: thinking_level === 'deep' ? 16384 : 4096, system: systemPrompt, messages: history.map(h => ({ role: h.vai_tro === 'user' ? 'user' : 'assistant', content: h.noi_dung })), stream: true };
          if (thinking_level === 'deep') claudeBody.thinking = { type: 'enabled', budget_tokens: 10000 };
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': keyToUse, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify(claudeBody)
          });
          if (!response.ok || !response.body) {
            const errData = await response.json().catch(() => ({}));
            sendSSE({ type: 'error', message: `Lỗi từ Claude: ${errData.error?.message || response.status}` });
            return endStream();
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const events = buf.split('\n\n');
            buf = events.pop();
            for (const evt of events) {
              const dataLine = evt.split('\n').find(l => l.startsWith('data: '));
              if (!dataLine) continue;
              try {
                const parsed = JSON.parse(dataLine.slice(6));
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  fullText += parsed.delta.text;
                  sendSSE({ type: 'token', text: parsed.delta.text });
                }
              } catch (e) {}
            }
          }
        } else if (selectedProvider === 'opencode') {
          if (!IS_OPENCODE_AVAILABLE) { sendSSE({ type: 'error', message: "⛔ **Lỗi hệ thống:** Không tìm thấy `opencode.exe`." }); return endStream(); }
          const opencodeModel = selectedModel && selectedModel !== 'opencode-default' ? selectedModel : 'opencode/deepseek-v4-flash-free';
          const rootDir = path.join(__dirname, '..', '..', '..');
          await new Promise((resolve) => {
            const proc = spawn(OPENCODE_BIN_PATH, ['run', noi_dung, '-m', opencodeModel], { cwd: rootDir, timeout: 300000, env: NO_COLOR_ENV });
            let out = '';
            const cleaner = new AnsiStreamCleaner();
            proc.stdout.on('data', (d) => { const t = cleaner.push(d.toString()); if (t) { out += t; sendSSE({ type: 'token', text: t }); } });
            proc.on('error', () => { fullText = 'Lỗi khởi động opencode.'; resolve(); });
            proc.on('close', () => { const f = cleaner.flush(); if (f) out += f; fullText = out.replace(/\[Agent Error\]/g, '').trim() || `[OpenCode] Đã thực thi xong. Xem kết quả ở phía trên.`; resolve(); });
            req.on('close', () => { try { if (!proc.killed) proc.kill(); } catch (e) {} });
          });
        }
      }
      if (!fullText) fullText = '[Không có phản hồi từ AI]';
      const cleanFullText = cleanAIThinkingProcess(fullText);
      const maTinNhanAI = crypto.randomUUID();
      db.run("INSERT INTO tin_nhan (ma_tin_nhan, ma_hoi_thoai, vai_tro, noi_dung) VALUES (?, ?, 'assistant', ?)", [maTinNhanAI, id, cleanFullText], () => {
        sendSSE({ type: 'done', ma_tin_nhan: maTinNhanAI, noi_dung: cleanFullText });
        endStream();
      });
    } catch (apiErr) {
      console.error('[Stream] Error:', apiErr.message);
      sendSSE({ type: 'error', message: `Lỗi kết nối AI: ${apiErr.message}` });
      endStream();
    }
  })();
});

// Long Term Memory APIs
router.get('/memory', authMiddleware, (req, res) => {
  db.all("SELECT * FROM bo_nho_dai_han WHERE ma_nguoi_dung = ? ORDER BY do_uu_tien DESC, ngay_tao DESC", [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/memory', authMiddleware, (req, res) => {
  const { loai, noi_dung, do_uu_tien } = req.body;
  if (!noi_dung) return res.status(400).json({ error: 'Nội dung bộ nhớ không được trống' });
  const maBoNho = 'mem_' + Date.now();
  db.run(
    "INSERT INTO bo_nho_dai_han (ma_bo_nho, ma_nguoi_dung, loai, noi_dung, do_uu_tien) VALUES (?, ?, ?, ?, ?)",
    [maBoNho, req.user.id, loai || 'thong_tin_user', noi_dung.trim(), do_uu_tien || 5],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, ma_bo_nho: maBoNho, loai, noi_dung });
    }
  );
});

router.delete('/memory/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM bo_nho_dai_han WHERE ma_bo_nho = ? AND ma_nguoi_dung = ?", [id, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id });
  });
});

// Exec API - Cho user đã đăng nhập (yêu cầu confirm header để tránh exec vô tình)
router.post('/exec', authMiddleware, (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Thiếu câu lệnh execution' });

  // BẮT BUỘC: Chỉ admin mới được exec
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '⛔ Exec API chỉ dành cho Admin.' });
  }

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
router.get('/git/status', authMiddleware, (req, res) => {
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

router.get('/git/diff', authMiddleware, (req, res) => {
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
