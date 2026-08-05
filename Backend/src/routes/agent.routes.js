const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth.middleware');
const { executeTool, TOOL_REGISTRY, callAI } = require('../services/agentService');

// FIX SECURITY: agent routes thực thi lệnh/browser/file -> bắt buộc admin (trước đây không auth = RCE)
router.use(authMiddleware);
router.use(adminMiddleware);

// ========== AGENT TOOL CHAT API ==========
// Đây là API cho AI Agent tự động gọi tools, tự kiểm tra, tự sửa lỗi

router.post('/chat', async (req, res) => {
  try {
    const { message, model } = req.body;
    if (!message) return res.status(400).json({ error: 'Thiếu message' });

    res.json({ success: true, message: 'Agent đang xử lý...' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== DANH SÁCH TOOLS ==========
router.get('/tools', (req, res) => {
  res.json({ tools: TOOL_REGISTRY.map(t => ({ name: t.name, description: t.description })) });
});

// ========== THỰC THI 1 TOOL ==========
router.post('/execute', async (req, res) => {
  try {
    const { tool, args } = req.body;
    if (!tool) return res.status(400).json({ error: 'Thiếu tên tool' });
    const result = await executeTool(tool, args || {});
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== PROCESS FILE ==========
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const upload = multer({ dest: path.join(__dirname, '..', '..', 'temp') });

router.post('/process-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Chưa upload file' });
    const { instruction } = req.body;
    
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    let result;

    if (ext === '.docx' || ext === '.doc') {
      result = await executeTool('process_word', { filePath, instruction: instruction || 'Phân tích nội dung file này' });
    } else {
      const content = fs.readFileSync(filePath, 'utf-8');
      result = { result: await callAI(instruction + '\n\nNội dung file:\n' + content) };
    }

    // Dọn file tạm
    try { fs.unlinkSync(filePath); } catch {}
    
    res.json({ success: true, result: result.result || result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== WEB ANALYZE ==========
router.post('/web-analyze', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'Thiếu URL' });
    const result = await executeTool('web_analyze', { url });
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;