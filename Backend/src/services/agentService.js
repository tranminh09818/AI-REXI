const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { stripAnsi } = require('../utils/stripAnsi');

// ========== TOOL REGISTRY ==========
// Thêm tool mới chỉ cần thêm 1 object vào đây, AI tự hiểu và dùng!
const TOOL_REGISTRY = [
  {
    name: 'browser_navigate',
    description: 'Mở trình duyệt đến URL bất kỳ. Dùng để xem web, YouTube, TikTok, TV online, opencut edit video...',
    parameters: { type: 'object', properties: { url: { type: 'string', description: 'URL cần mở' } }, required: ['url'] }
  },
  {
    name: 'browser_click',
    description: 'Click chuột tại vị trí (x,y) trên trang web',
    parameters: { type: 'object', properties: { x: { type: 'number', description: 'Tọa độ X' }, y: { type: 'number', description: 'Tọa độ Y' } }, required: ['x', 'y'] }
  },
  {
    name: 'browser_type',
    description: 'Gõ text vào ô input trên web',
    parameters: { type: 'object', properties: { text: { type: 'string', description: 'Nội dung cần gõ' } }, required: ['text'] }
  },
  {
    name: 'browser_act',
    description: 'Dùng AI thực hiện hành động phức tạp trên web (click nút, điền form, đọc nội dung...)',
    parameters: { type: 'object', properties: { instruction: { type: 'string', description: 'Mô tả hành động cần làm' } }, required: ['instruction'] }
  },
  {
    name: 'browser_screenshot',
    description: 'Chụp màn hình browser để kiểm tra kết quả',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'process_word',
    description: 'Đọc/xử lý file Word (.docx). Dùng để phân tích, chỉnh sửa văn bản',
    parameters: { type: 'object', properties: { filePath: { type: 'string', description: 'Đường dẫn file Word' }, instruction: { type: 'string', description: 'Cần làm gì với file?' } }, required: ['filePath', 'instruction'] }
  },
  {
    name: 'create_word',
    description: 'Tạo file Word mới với nội dung chỉ định',
    parameters: { type: 'object', properties: { content: { type: 'string', description: 'Nội dung file' }, outputPath: { type: 'string', description: 'Đường dẫn lưu file' } }, required: ['content', 'outputPath'] }
  },
  {
    name: 'execute_command',
    description: 'Chạy lệnh terminal/CMD. Dùng để chạy script, build code, cài đặt...',
    parameters: { type: 'object', properties: { command: { type: 'string', description: 'Câu lệnh cần chạy' } }, required: ['command'] }
  },
  {
    name: 'search_web',
    description: 'Tìm kiếm thông tin trên internet',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Từ khóa tìm kiếm' } }, required: ['query'] }
  },
  {
    name: 'web_analyze',
    description: 'Phân tích website từ URL: đọc nội dung, chụp screenshot, đánh giá SEO, design, tốc độ. Dùng khi user muốn đánh giá 1 website.',
    parameters: { type: 'object', properties: { url: { type: 'string', description: 'URL website cần phân tích' } }, required: ['url'] }
  },
  {
    name: 'text_to_speech',
    description: 'Tạo giọng nói tiếng Việt từ văn bản, trả về file audio. Hỗ trợ 10 giọng nói (Nam/Nữ, Bắc/Nam), điều chỉnh tốc độ và cao độ.',
    parameters: { type: 'object', properties: { 
      text: { type: 'string', description: 'Nội dung cần đọc' }, 
      voice: { type: 'string', description: 'Giọng đọc: vi-VN-HoaiMyNeural (Nữ/Bắc), vi-VN-NamMinhNeural (Nam/Nam), vi-VN-DuyAnhNeural (Nam/Bắc), vi-VN-ThuyMinhNeural (Nữ/Nam)...', default: 'vi-VN-HoaiMyNeural' },
      rate: { type: 'string', description: 'Tốc độ: +20% hoặc -10%', default: '+0%' },
      pitch: { type: 'string', description: 'Cao độ giọng: +10% hoặc -5%', default: '+0%' }
    }, required: ['text'] }
  }
];

// ========== EXECUTE TOOL ==========
const browserStream = require('./browserStream');
const { Document, Packer, Paragraph } = require('docx');

async function executeTool(toolName, args) {
  console.log('[Agent] Tool: ' + toolName, JSON.stringify(args));
  switch (toolName) {
    case 'browser_navigate':
      if (!browserStream.browser) await browserStream.launch();
      return await browserStream.navigate(args.url);
    case 'browser_click':
      return await browserStream.click(args.x, args.y);
    case 'browser_type':
      return await browserStream.type(args.text);
    case 'browser_act':
      if (!browserStream.browser) await browserStream.launch();
      return await browserStream.act(args.instruction);
    case 'browser_screenshot':
      if (!browserStream.page) return { error: 'Browser chưa mở' };
      const buf = await browserStream.page.screenshot({ type: 'jpeg', quality: 70 });
      return { screenshot: 'data:image/jpeg;base64,' + buf.toString('base64') };
    case 'process_word': {
      const content = fs.readFileSync(args.filePath, 'utf-8');
      const result = await callAI('Xử lý: ' + args.instruction + '\n\nNội dung:\n' + content);
      if (args.savePath && result && !result.startsWith('Lỗi AI:')) {
        fs.writeFileSync(args.savePath, result, 'utf-8');
        return { result, savedTo: args.savePath };
      }
      return { result };
    }
    case 'create_word': {
      const d = new Document({ sections: [{ children: args.content.split('\n').map(l => new Paragraph({ text: l })) }] });
      const buffer = await Packer.toBuffer(d);
      const outputDir = path.dirname(args.outputPath);
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(args.outputPath, buffer);
      return { success: true, path: args.outputPath, size: buffer.length };
    }
    case 'execute_command':
      return new Promise(r => exec(args.command, { timeout: 30000, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', TERM: 'dumb' } }, (e, o, e2) => r({ success: !e, stdout: stripAnsi((o||'')).trim(), stderr: stripAnsi((e2||'')).trim() })));
    case 'search_web': {
      const resp = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(args.query), { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await resp.text();
      const matches = [...html.matchAll(/class="result__snippet[^"]*">([\s\S]*?)<\/a>/g)];
      return { results: matches.slice(0, 5).map(m => m[1].replace(/<[^>]+>/g, '').trim()) };
    }
    case 'web_analyze': {
      const url = args.url;
      if (!url) return { error: 'Thiếu URL' };
      if (!browserStream.browser) await browserStream.launch();
      const page = browserStream.page || (await browserStream.browser.newPage());
      const startTime = Date.now();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const loadTime = Date.now() - startTime;
        const title = await page.title();
        const metaDesc = await page.$eval('meta[name="description"]', el => el.content).catch(() => '(không có)');
        const metaKeywords = await page.$eval('meta[name="keywords"]', el => el.content).catch(() => '(không có)');
        const h1Count = await page.$$eval('h1', els => els.length);
        const h2Count = await page.$$eval('h2', els => els.length);
        const imgNoAlt = await page.$$eval('img:not([alt]), img[alt=""]', els => els.length);
        const totalImages = await page.$$eval('img', els => els.length);
        const links = await page.$$eval('a[href]', els => els.length);
        const bodyText = await page.$eval('body', el => el.innerText.substring(0, 3000));
        const buf = await page.screenshot({ type: 'jpeg', quality: 70, fullPage: false });
        const screenshot = 'data:image/jpeg;base64,' + buf.toString('base64');
        const htmlSize = await page.content().then(c => c.length);
        return {
          title, metaDesc, metaKeywords, h1Count, h2Count,
          imgNoAlt, totalImages, links, loadTime, htmlSize,
          bodyText, screenshot,
          score: {
            seo: h1Count > 0 && metaDesc !== '(không có)' ? 'Tốt' : 'Cần cải thiện',
            speed: loadTime < 2000 ? 'Nhanh' : loadTime < 5000 ? 'Trung bình' : 'Chậm',
            accessibility: imgNoAlt === 0 ? 'Tốt' : 'Có ' + imgNoAlt + ' ảnh thiếu alt'
          }
        };
      } catch (err) {
        return { error: 'Lỗi phân tích: ' + err.message };
      }
    }
    case 'text_to_speech': {
      const VALID_TTS_VOICES = [
        'vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural', 'vi-VN-DuyAnhNeural',
        'vi-VN-HaSanhNeural', 'vi-VN-MinhAnhNeural', 'vi-VN-ThuyMinhNeural',
        'vi-VN-ThiTuyetNeural', 'vi-VN-VanHanhNeural', 'vi-VN-VanMinhNeural',
        'vi-VN-CaoVietNeural'
      ];
      const voiceName = VALID_TTS_VOICES.includes(args.voice) ? args.voice : 'vi-VN-HoaiMyNeural';
      const validRate = args.rate && /^[+-]\d+%$/.test(args.rate) ? args.rate : '+0%';
      const validPitch = args.pitch && /^[+-]\d+%$/.test(args.pitch) ? args.pitch : '+0%';
      const cleanedText = (args.text || '').replace(/"/g, '\\"').substring(0, 1000);
      if (!cleanedText.trim()) return { error: 'Văn bản trống' };
      const outFile = path.join(__dirname, '..', '..', 'temp', 'tts_' + Date.now() + '.mp3');
      const os = require('os');
      const isWin = os.platform() === 'win32';
      return new Promise(r => {
        const spawn = require('child_process').spawn;
        const cmd = isWin ? 'powershell' : 'python3';
        const baseArgs = isWin
          ? ['-Command', `python -m edge_tts --voice "${voiceName}" --text "${cleanedText}" --rate "${validRate}" --pitch "${validPitch}" --write-media "${outFile}"`]
          : ['-m', 'edge_tts', '--voice', voiceName, '--text', cleanedText, '--rate', validRate, '--pitch', validPitch, '--write-media', outFile];
        const proc = spawn(cmd, baseArgs, { timeout: 30000 });
        let stderr = '';
        proc.stderr.on('data', d => { stderr += d.toString(); });
        proc.on('close', code => r(code === 0 ? { success: true, audioFile: outFile, voice: voiceName } : { error: `TTS failed (code ${code}): ${stderr}` }));
        proc.on('error', err => r({ error: err.message }));
      });
    }
    default:
      return { error: "Tool '" + toolName + "' chưa được implement" };
  }
}

// ========== CALL AI ==========
async function callAI(prompt, m) {
  const { spawn } = require('child_process');
  const OPENCODE_BIN = process.env.OPENCODE_BIN_PATH || path.join(process.env.USERPROFILE || '', '.opencode', 'bin', 'opencode.exe');
  const model = m || 'opencode/deepseek-v4-flash-free';

  // Thử OpenCode binary trước (miễn phí)
  if (fs.existsSync(OPENCODE_BIN)) {
    return new Promise((resolve) => {
      const proc = spawn(OPENCODE_BIN, ['run', prompt, '--auto', '--model', model], {
        timeout: 30000,
        env: { ...process.env, LANG: 'en_US.UTF-8', NO_COLOR: '1', FORCE_COLOR: '0', TERM: 'dumb', CLICOLOR: '0', CLICOLOR_FORCE: '0' }
      });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', d => { stdout += stripAnsi(d.toString()); });
      proc.stderr.on('data', d => { stderr += stripAnsi(d.toString()); });
      proc.on('close', () => resolve(stdout.trim() || stderr.trim() || 'Lỗi AI: Không có phản hồi.'));
      proc.on('error', () => resolve('Lỗi AI: Không tìm thấy OpenCode binary.'));
    });
  }

  return 'Lỗi AI: Chưa cài đặt OpenCode. Vui lòng cài đặt để sử dụng tính năng AI.';
}

module.exports = { executeTool, TOOL_REGISTRY, callAI };

