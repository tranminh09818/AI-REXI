const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// ========== TOOL REGISTRY ==========
// ThÃªm tool má»›i chá»‰ cáº§n thÃªm 1 object vÃ o Ä‘Ã¢y, AI tá»± hiá»ƒu vÃ  dÃ¹ng!
const TOOL_REGISTRY = [
  {
    name: 'browser_navigate',
    description: 'Má»Ÿ trÃ¬nh duyá»‡t Ä‘áº¿n URL báº¥t ká»³. DÃ¹ng Ä‘á»ƒ xem web, YouTube, TikTok, TV online, opencut edit video...',
    parameters: { type: 'object', properties: { url: { type: 'string', description: 'URL cáº§n má»Ÿ' } }, required: ['url'] }
  },
  {
    name: 'browser_click',
    description: 'Click chuá»™t táº¡i vá»‹ trÃ­ (x,y) trÃªn trang web',
    parameters: { type: 'object', properties: { x: { type: 'number', description: 'Tá»a Ä‘á»™ X' }, y: { type: 'number', description: 'Tá»a Ä‘á»™ Y' } }, required: ['x', 'y'] }
  },
  {
    name: 'browser_type',
    description: 'GÃµ text vÃ o Ã´ input trÃªn web',
    parameters: { type: 'object', properties: { text: { type: 'string', description: 'Ná»™i dung cáº§n gÃµ' } }, required: ['text'] }
  },
  {
    name: 'browser_act',
    description: 'DÃ¹ng AI thá»±c hiá»‡n hÃ nh Ä‘á»™ng phá»©c táº¡p trÃªn web (click nÃºt, Ä‘iá»n form, Ä‘á»c ná»™i dung...)',
    parameters: { type: 'object', properties: { instruction: { type: 'string', description: 'MÃ´ táº£ hÃ nh Ä‘á»™ng cáº§n lÃ m' } }, required: ['instruction'] }
  },
  {
    name: 'browser_screenshot',
    description: 'Chá»¥p mÃ n hÃ¬nh browser Ä‘á»ƒ kiá»ƒm tra káº¿t quáº£',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'process_word',
    description: 'Äá»c/xá»­ lÃ½ file Word (.docx). DÃ¹ng Ä‘á»ƒ phÃ¢n tÃ­ch, chá»‰nh sá»­a vÄƒn báº£n',
    parameters: { type: 'object', properties: { filePath: { type: 'string', description: 'ÄÆ°á»ng dáº«n file Word' }, instruction: { type: 'string', description: 'Cáº§n lÃ m gÃ¬ vá»›i file?' } }, required: ['filePath', 'instruction'] }
  },
  {
    name: 'create_word',
    description: 'Táº¡o file Word má»›i vá»›i ná»™i dung chá»‰ Ä‘á»‹nh',
    parameters: { type: 'object', properties: { content: { type: 'string', description: 'Ná»™i dung file' }, outputPath: { type: 'string', description: 'ÄÆ°á»ng dáº«n lÆ°u file' } }, required: ['content', 'outputPath'] }
  },
  {
    name: 'execute_command',
    description: 'Cháº¡y lá»‡nh terminal/CMD. DÃ¹ng Ä‘á»ƒ cháº¡y script, build code, cÃ i Ä‘áº·t...',
    parameters: { type: 'object', properties: { command: { type: 'string', description: 'CÃ¢u lá»‡nh cáº§n cháº¡y' } }, required: ['command'] }
  },
  {
    name: 'search_web',
    description: 'TÃ¬m kiáº¿m thÃ´ng tin trÃªn internet',
    parameters: { type: 'object', properties: { query: { type: 'string', description: 'Tá»« khÃ³a tÃ¬m kiáº¿m' } }, required: ['query'] }
  },
  {
    name: 'web_analyze',
    description: 'Phan tich website tu URL: doc noi dung, chup screenshot, danh gia SEO, design, toc do. Dung khi user muon danh gia 1 website.',
    parameters: { type: 'object', properties: { url: { type: 'string', description: 'URL website can phan tich' } }, required: ['url'] }
  },
  {
    name: 'text_to_speech',
    description: 'Táº¡o giá»ng Ä‘á»c tá»« vÄƒn báº£n, tráº£ vá» file audio',
    parameters: { type: 'object', properties: { text: { type: 'string', description: 'Ná»™i dung cáº§n Ä‘á»c' }, voice: { type: 'string', description: 'Giá»ng Ä‘á»c (vi-VN-HoaiMyNeural, vi-VN-NamMinhNeural...)', default: 'vi-VN-HoaiMyNeural' } }, required: ['text'] }
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
      if (!browserStream.page) return { error: 'Browser chua mo' };
      const buf = await browserStream.page.screenshot({ type: 'jpeg', quality: 70 });
      return { screenshot: 'data:image/jpeg;base64,' + buf.toString('base64') };
    case 'process_word': {
      const content = fs.readFileSync(args.filePath, 'utf-8');
      const result = await callAI('Xu ly: ' + args.instruction + '\n\nNoi dung:\n' + content);
      if (args.savePath && result && !result.startsWith('Loi AI:')) {
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
      return new Promise(r => exec(args.command, { timeout: 30000 }, (e, o, e2) => r({ success: !e, stdout: (o||'').trim(), stderr: (e2||'').trim() })));
    case 'search_web': {
      const resp = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(args.query), { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await resp.text();
      const matches = [...html.matchAll(/class="result__snippet[^"]*">([\s\S]*?)<\/a>/g)];
      return { results: matches.slice(0, 5).map(m => m[1].replace(/<[^>]+>/g, '').trim()) };
    }
    case 'web_analyze': {
      const url = args.url;
      if (!url) return { error: 'Thieu URL' };
      if (!browserStream.browser) await browserStream.launch();
      const page = browserStream.page || (await browserStream.browser.newPage());
      const startTime = Date.now();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        const loadTime = Date.now() - startTime;
        const title = await page.title();
        const metaDesc = await page.$eval('meta[name="description"]', el => el.content).catch(() => '(khong co)');
        const metaKeywords = await page.$eval('meta[name="keywords"]', el => el.content).catch(() => '(khong co)');
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
            seo: h1Count > 0 && metaDesc !== '(khong co)' ? 'Tot' : 'Can cai thien',
            speed: loadTime < 2000 ? 'Nhanh' : loadTime < 5000 ? 'Trung binh' : 'Cham',
            accessibility: imgNoAlt === 0 ? 'Tot' : 'Co ' + imgNoAlt + ' anh thieu alt'
          }
        };
      } catch (err) {
        return { error: 'Loi phan tich: ' + err.message };
      }
    }
    case 'text_to_speech': {
      const outFile = path.join(__dirname, '..', '..', 'temp', 'tts_' + Date.now() + '.mp3');
      return new Promise(r => exec('edge-tts --voice ' + (args.voice||'vi-VN-HoaiMyNeural') + ' --text "' + args.text.replace(/"/g,'\\"') + '" --write-media "' + outFile + '"', { timeout: 30000 }, e => r(e ? { error: e.message } : { success: true, audioFile: outFile })));
    }
    default:
      return { error: "Tool '" + toolName + "' chua duoc implement" };
  }
}

// ========== CALL AI ==========
async function callAI(prompt, m) {
  const { spawn } = require('child_process');
  const OPENCODE_BIN = process.env.OPENCODE_BIN_PATH || path.join(process.env.USERPROFILE || '', '.opencode', 'bin', 'opencode.exe');
  const model = m || 'omniroute/auto/best-coding';

  // Thử OpenCode binary trước (miễn phí)
  if (fs.existsSync(OPENCODE_BIN)) {
    return new Promise((resolve) => {
      const proc = spawn(OPENCODE_BIN, ['run', prompt, '--auto', '--model', model], {
        timeout: 30000,
        env: { ...process.env, LANG: 'en_US.UTF-8' }
      });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', d => stdout += d);
      proc.stderr.on('data', d => stderr += d);
      proc.on('close', () => resolve(stdout.trim() || stderr.trim() || 'Loi AI: Khong co phan hoi.'));
      proc.on('error', () => resolve('Loi AI: Khong tim thay OpenCode binary.'));
    });
  }

  return 'Loi AI: Chua cai dat OpenCode. Vui long cai dat de su dung tinh nang AI.';
}

module.exports = { executeTool, TOOL_REGISTRY, callAI };

