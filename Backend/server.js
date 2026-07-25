const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const dbPath = path.join(__dirname, '..', 'Database', 'tro_ly_ai.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Lỗi kết nối cơ sở dữ liệu SQLite:', err.message);
  } else {
    console.log('Đã kết nối thành công với cơ sở dữ liệu SQLite tại ' + dbPath);
    db.run("PRAGMA foreign_keys = ON;");
    taoUserMauNeuChuaCo();
  }
});

function taoUserMauNeuChuaCo() {
  const maUser = "u1111111-1111-1111-1111-111111111111";
  const maThuMuc = "w2222222-2222-2222-2222-222222222222";

  db.get("SELECT ma_nguoi_dung FROM nguoi_dung WHERE ma_nguoi_dung = ?", [maUser], (err, row) => {
    if (!row) {
      db.run(`
        INSERT INTO nguoi_dung (ma_nguoi_dung, email, mat_khau_ma_hoa, ten_day_du, cai_dat_ca_nhan) 
        VALUES (?, 'user@rexi.ai', 'hashed_pass', 'Người Dùng Thử Nghiệm', '{}')
      `, [maUser], (err) => {
        if (!err) {
          db.run(`
            INSERT INTO thu_muc_du_an (ma_thu_muc, ma_nguoi_dung, ten_thu_muc, duong_dan_may_tinh)
            VALUES (?, ?, 'AI REXI Project', 'D:\\AI REXI')
          `, [maThuMuc, maUser]);

          const skillsList = [
            ["s1", "ponytail", "Chế độ tối giản", "Tự động rút gọn code, ưu tiên thư viện lõi.", "kich_hoat"],
            ["s2", "windows-interactive-screenshot", "Chụp ảnh màn hình", "Agent chụp màn hình máy tính thông qua Scheduled Tasks.", "kich_hoat"],
            ["s3", "web-browser", "Duyệt Web", "Tìm kiếm thông tin thời gian thực.", "kich_hoat"]
          ];
          skillsList.forEach(s => {
            db.run("INSERT OR IGNORE INTO ky_nang (ma_ky_nang, ten_ky_nang, tieu_de, mo_ta, trang_thai) VALUES (?, ?, ?, ?, ?)", s);
          });
        }
      });
    }
  });
}

// -------------------------------------------------------------
// WORKSPACE FILE APIS
// -------------------------------------------------------------

app.get('/api/workspace/files', (req, res) => {
  const rootDir = path.join(__dirname, '..');
  
  function scanDir(dirPath, relativeDir = '') {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = [];

    for (const item of items) {
      if (item.name === 'node_modules' || item.name === '.git' || item.name === 'dist') continue;
      
      const itemRelPath = path.join(relativeDir, item.name);
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        result.push({
          name: item.name,
          path: itemRelPath,
          type: 'folder',
          children: scanDir(fullPath, itemRelPath)
        });
      } else {
        result.push({
          name: item.name,
          path: itemRelPath,
          type: 'file'
        });
      }
    }
    return result;
  }

  try {
    const fileTree = scanDir(rootDir);
    res.json(fileTree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workspace/file-content', (req, res) => {
  const relPath = req.query.path;
  if (!relPath) return res.status(400).json({ error: 'Missing file path' });

  const rootDir = path.join(__dirname, '..');
  const fullPath = path.join(rootDir, relPath);

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ path: relPath, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspace/file-content', (req, res) => {
  const { path: relPath, content } = req.body;
  if (!relPath) return res.status(400).json({ error: 'Missing file path' });

  const rootDir = path.join(__dirname, '..');
  const fullPath = path.join(rootDir, relPath);

  try {
    fs.writeFileSync(fullPath, content, 'utf-8');
    res.json({ success: true, path: relPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// UNIVERSAL MULTI-PROVIDER AI CHAT ENGINE
// -------------------------------------------------------------

app.get('/api/conversations', (req, res) => {
  db.all("SELECT * FROM cuoc_hoi_thoai ORDER BY ngay_cap_nhat DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/conversations', (req, res) => {
  const { tieu_de, ten_mo_hinh_ai } = req.body;
  const maHoiThoai = crypto.randomUUID();
  const maUser = "u1111111-1111-1111-1111-111111111111";
  const maThuMuc = "w2222222-2222-2222-2222-222222222222";

  const sql = `
    INSERT INTO cuoc_hoi_thoai (ma_hoi_thoai, ma_nguoi_dung, ma_thu_muc, tieu_de, ten_mo_hinh_ai, trang_thai)
    VALUES (?, ?, ?, ?, ?, 'dang_mo')
  `;
  db.run(sql, [maHoiThoai, maUser, maThuMuc, tieu_de || 'Trò chuyện mới', ten_mo_hinh_ai || 'Gemini 3.5 Flash'], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ma_hoi_thoai: maHoiThoai, tieu_de: tieu_de || 'Trò chuyện mới', ten_mo_hinh_ai: ten_mo_hinh_ai || 'Gemini 3.5 Flash' });
  });
});

app.delete('/api/conversations/:id', (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM cuoc_hoi_thoai WHERE ma_hoi_thoai = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id });
  });
});

app.get('/api/conversations/:id/messages', (req, res) => {
  const { id } = req.params;
  db.all("SELECT * FROM tin_nhan WHERE ma_hoi_thoai = ? ORDER BY ngay_gui ASC", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Hàm tự động sinh Tiêu đề thông minh từ nội dung câu hỏi đầu tiên
function taoTieuDeThongMinh(noiDungUser) {
  if (!noiDungUser) return "Trò chuyện mới";
  // Lấy dòng đầu tiên, bỏ các ký tự đặc biệt
  let clean = noiDungUser.split('\n')[0].replace(/[#*`!_\[\]()]/g, '').trim();
  if (clean.length > 35) {
    clean = clean.substring(0, 35) + "...";
  }
  return clean || "Trò chuyện mới";
}

app.post('/api/conversations/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { vai_tro, noi_dung, provider, client_api_key, model_name, base_url, mode } = req.body;

  const maTinNhanUser = crypto.randomUUID();
  
  db.run(
    "INSERT INTO tin_nhan (ma_tin_nhan, ma_hoi_thoai, vai_tro, noi_dung) VALUES (?, ?, ?, ?)",
    [maTinNhanUser, id, vai_tro, noi_dung],
    async (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // TỰ ĐỘNG ĐỔI TIÊU ĐỀ NẾU VẪN LÀ "Trò chuyện mới"
      db.get("SELECT tieu_de FROM cuoc_hoi_thoai WHERE ma_hoi_thoai = ?", [id], (err, convRow) => {
        if (convRow && (convRow.tieu_de === 'Trò chuyện mới' || !convRow.tieu_de)) {
          const newTitle = taoTieuDeThongMinh(noi_dung);
          db.run("UPDATE cuoc_hoi_thoai SET tieu_de = ?, ngay_cap_nhat = CURRENT_TIMESTAMP WHERE ma_hoi_thoai = ?", [newTitle, id]);
        } else {
          db.run("UPDATE cuoc_hoi_thoai SET ngay_cap_nhat = CURRENT_TIMESTAMP WHERE ma_hoi_thoai = ?", [id]);
        }
      });

      const keyToUse = client_api_key || process.env.GEMINI_API_KEY;
      const selectedProvider = provider || 'gemini';
      const selectedModel = model_name || 'gemini-1.5-flash';

      if (!keyToUse && selectedProvider !== 'ollama') {
        const fallbackMsg = `Chưa cài đặt API Key cho nhà cung cấp ${selectedProvider.toUpperCase()}. Hãy bấm nút 'Cài đặt hệ thống' ở góc trái để nhập Key và chọn Model!`;
        return saveAIMessageAndRespond(id, fallbackMsg, res);
      }

      db.all("SELECT vai_tro, noi_dung FROM tin_nhan WHERE ma_hoi_thoai = ? ORDER BY ngay_gui ASC LIMIT 15", [id], async (err, history) => {
        let cauTraLoiAI = "";

        let systemPrompt = "Bạn là Rexi, trợ lý AI lập trình chuyên nghiệp.";
        if (mode === 'architect') systemPrompt += " Hãy tập trung thiết kế kiến trúc hệ thống và vẽ sơ đồ CSDL.";
        if (mode === 'bug-hunter') systemPrompt += " Hãy tập trung tìm lỗi bảo mật, rò rỉ bộ nhớ và sửa bug.";

        try {
          if (selectedProvider === 'gemini') {
            const tempGenAI = new GoogleGenerativeAI(keyToUse);
            const model = tempGenAI.getGenerativeModel({ model: selectedModel });
            const contents = history.map(h => ({
              role: h.vai_tro === 'user' ? 'user' : 'model',
              parts: [{ text: h.noi_dung }]
            }));
            const result = await model.generateContent({ contents, systemInstruction: systemPrompt });
            cauTraLoiAI = result.response.text();

          } else if (selectedProvider === 'openai' || selectedProvider === 'deepseek' || selectedProvider === 'groq' || selectedProvider === 'ollama') {
            let endpoint = "https://api.openai.com/v1/chat/completions";
            if (selectedProvider === 'deepseek') endpoint = "https://api.deepseek.com/chat/completions";
            if (selectedProvider === 'groq') endpoint = "https://api.groq.com/openai/v1/chat/completions";
            if (selectedProvider === 'ollama') endpoint = (base_url || "http://localhost:11434") + "/v1/chat/completions";
            if (base_url && selectedProvider !== 'ollama') endpoint = base_url + "/chat/completions";

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
              cauTraLoiAI = `Phản hồi không hợp lệ từ ${selectedProvider.toUpperCase()}: ` + JSON.stringify(data);
            }

          } else if (selectedProvider === 'claude') {
            const response = await fetch("https://api.anthropic.com/v1/messages", {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': keyToUse,
                'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify({
                model: selectedModel || 'claude-3-5-sonnet-20241022',
                max_tokens: 4096,
                system: systemPrompt,
                messages: history.map(h => ({
                  role: h.vai_tro === 'user' ? 'user' : 'assistant',
                  content: h.noi_dung
                }))
              })
            });
            const data = await response.json();
            if (data.content && data.content.length > 0) {
              cauTraLoiAI = data.content[0].text;
            } else {
              cauTraLoiAI = `Lỗi từ Claude: ` + (data.error?.message || JSON.stringify(data));
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

app.get('/api/skills', (req, res) => {
  db.all("SELECT * FROM ky_nang WHERE trang_thai = 'kich_hoat'", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Backend API Đa Mô Hình của AI Rexi đang chạy tại http://localhost:${PORT}`);
});
