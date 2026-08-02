// Lazy-load: CHỈ require khi thực sự cần, tiết kiệm ~300-500MB RAM
let chromium = null;
const WebSocket = require('ws');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

function getChromium() {
  if (!chromium) {
    console.log('[BrowserStream] Lazy-loading Playwright chromium...');
    chromium = require('playwright').chromium;
  }
  return chromium;
}

class BrowserStreamService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.cdpSession = null;
    this.wss = null;
    this.clients = new Set();
    this.frameInterval = null;
    this.stagehand = null;
    this._autoCloseTimer = null;
    this._frameSkipCounter = 0;
  }

  setWSS(wss) {
    this.wss = wss;
    console.log('[BrowserStream] setWSS called, path:', wss.options?.path || 'default');
    this.wss.on('connection', (ws, req) => {
      console.log('[WS] Client connected! URL:', req?.url, 'Total:', this.clients.size + 1);
      this.clients.add(ws);
      this._resetAutoClose();

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('[WS] Client disconnected. Total:', this.clients.size);
        // Auto-close browser nếu không còn client sau 60s
        if (this.clients.size === 0) {
          this._scheduleAutoClose();
        }
      });
      
      ws.on('message', async (data) => {
        try {
          const msg = JSON.parse(data);
          await this.handleMessage(msg, ws);
        } catch (e) {
          console.error('WS message error:', e);
        }
      });

      // Send initial frame immediately when client connects
      if (this.page) {
        this.page.screenshot({ type: 'jpeg', quality: 40 }).then(screenshot => {
          const frameData = `data:image/jpeg;base64,${screenshot.toString('base64')}`;
          const message = JSON.stringify({ type: 'frame', data: frameData });
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
            console.log('[WS] Sent initial frame to new client');
          }
        }).catch(e => console.error('[WS] Initial frame error:', e.message));
      }
    });

    // Capture frames at ~2fps (was 30fps — 93% reduction in CPU/GC pressure)
    if (this.frameInterval) clearInterval(this.frameInterval);
    this.frameInterval = setInterval(async () => {
      if (!this.page || this.clients.size === 0) return;

      try {
        let screenshot;
        // CDP session hoạt động ổn định hơn page.screenshot() với headless-shell
        if (this.cdpSession) {
          try {
            const result = await this.cdpSession.send('Page.captureScreenshot', { format: 'jpeg', quality: 40 });
            screenshot = Buffer.from(result.data, 'base64');
          } catch (cdpErr) {
            // Fallback sang page.screenshot() nếu CDP fail
            screenshot = await this.page.screenshot({ type: 'jpeg', quality: 40 });
          }
        } else {
          screenshot = await this.page.screenshot({ type: 'jpeg', quality: 40 });
        }

        const frameData = `data:image/jpeg;base64,${screenshot.toString('base64')}`;
        const message = JSON.stringify({ type: 'frame', data: frameData });

        let sent = 0;
        this.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
            sent++;
          }
        });
        // Log mỗi 10 frame thay vì mỗi frame
        this._frameSkipCounter++;
        if (this._frameSkipCounter >= 10) {
          if (sent > 0) console.log(`[FrameCapture] Sent frames to ${sent} clients (every 5s)`);
          this._frameSkipCounter = 0;
        }
      } catch (e) {
        console.error('[FrameCapture] Error:', e.message);
      }
    }, 500); // 2fps thay vì 30fps
    console.log('[BrowserStream] frameInterval started (2fps mode — RAM optimized)');
  }

  _scheduleAutoClose() {
    if (this._autoCloseTimer) clearTimeout(this._autoCloseTimer);
    this._autoCloseTimer = setTimeout(async () => {
      if (this.clients.size === 0 && this.browser) {
        console.log('[BrowserStream] Auto-closing browser — no clients for 60s');
        await this.close();
      }
    }, 60000); // 60s
  }

  _resetAutoClose() {
    if (this._autoCloseTimer) {
      clearTimeout(this._autoCloseTimer);
      this._autoCloseTimer = null;
    }
  }

  async handleMessage(msg, ws) {
    if (!this.page) return;
    
    switch (msg.type) {
      case 'click':
        await this.page.mouse.click(msg.x, msg.y);
        break;
      case 'type':
        await this.page.keyboard.type(msg.text);
        break;
      case 'key':
        await this.page.keyboard.press(msg.key);
        break;
      case 'scroll':
        await this.page.mouse.wheel(msg.deltaX || 0, msg.deltaY || 0);
        break;
      case 'navigate':
        await this.page.goto(msg.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        break;
    }
  }

  async launch(options = {}) {
    console.log('[BrowserStream] launch() called, browser exists:', !!this.browser, 'url:', options.url);
    if (this.browser) return { success: true };

    try {
      console.log('[BrowserStream] Launching chromium (bundled, headless — KHÔNG mở cửa sổ Chrome thật)...');
      const pw = getChromium();
      // Dùng Chromium đi kèm Playwright (KHÔNG dùng channel:'chrome')
      // → chạy 100% headless, không mở cửa sổ Chrome thật, không xung đột profile user, nhẹ hơn.
      this.browser = await pw.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--metrics-recording-only',
          '--mute-audio',
          '--window-size=1280,720',
          '--js-flags=--max-old-space-size=256',
        ],
      }).catch(async (e) => {
        // Fallback: launch tối giản nếu bộ args đầy đủ fail (vd: arg không hỗ trợ)
        console.log('[BrowserStream] Default launch failed, retrying minimal:', e.message);
        return await pw.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1280,720'],
        });
      });

      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
      });

      this.page = await context.newPage();
      console.log('[BrowserStream] Page created, this.page:', !!this.page);

      // CDP session for frame capture
      this.cdpSession = await this.page.context().newCDPSession(this.page);
      console.log('[BrowserStream] CDP session created');

      await this.cdpSession.send('Page.enable');
      // Bỏ Animation.enable — không cần, tiết kiệm memory
    } catch (e) {
      console.error('[BrowserStream] Launch failed:', e.message);
      this.browser = null;
      this.page = null;
      this.cdpSession = null;
      throw new Error('Không thể khởi động Chrome: ' + e.message);
    }

    // KHÔNG init Stagehand ở đây nữa — lazy init khi cần act()

    // Navigate to initial page
    if (options.url) {
      try {
        await this.page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } catch (e) {
        console.log('[BrowserStream] Initial navigation failed:', e.message);
      }
    }

    return { success: true };
  }

  // Lazy init Stagehand — chỉ khi thực sự cần act()
  async _ensureStagehand() {
    if (this.stagehand) return this.stagehand;
    try {
      const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || '';
      if (!apiKey) return null;
      
      console.log('[BrowserStream] Lazy-loading Stagehand...');
      const { Stagehand } = require('@browserbasehq/stagehand');
      this.stagehand = new Stagehand({
        env: 'LOCAL',
        modelName: 'gpt-4o-mini',
        modelClientOptions: { apiKey },
        enableCaching: true,
        verbose: false,
        domSettleTimeoutMs: 5000,
      });
      await this.stagehand.init();
      this.stagehand.page = this.page;
      return this.stagehand;
    } catch (e) {
      console.log('[Stagehand] Init failed, AI actions will use basic Playwright:', e.message);
      this.stagehand = null;
      return null;
    }
  }

  async navigate(url) {
    if (!this.page) {
      await this.launch({ url });
      return { success: true, url: this.page ? this.page.url() : url };
    }
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    return { success: true, url: this.page.url() };
  }

  async act(instruction) {
    if (!this.page) await this.launch();
    
    // Lazy init Stagehand chỉ khi cần
    const sh = await this._ensureStagehand();
    if (sh) {
      try {
        const result = await sh.act(instruction);
        return { success: true, result };
      } catch (e) {
        console.error('[Stagehand act] Error:', e.message);
        return { success: false, error: e.message };
      }
    }
    
    // Fallback to basic Playwright
    try {
      await this.page.evaluate(instruction);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async click(x, y) {
    if (!this.page) await this.launch();
    await this.page.mouse.click(x, y);
    return { success: true };
  }

  async type(text) {
    if (!this.page) await this.launch();
    await this.page.keyboard.type(text);
    return { success: true };
  }

  async key(key) {
    if (!this.page) await this.launch();
    await this.page.keyboard.press(key);
    return { success: true };
  }

  async scroll(deltaX, deltaY) {
    if (!this.page) await this.launch();
    await this.page.mouse.wheel(deltaX, deltaY);
    return { success: true };
  }

  async close() {
    if (this._autoCloseTimer) {
      clearTimeout(this._autoCloseTimer);
      this._autoCloseTimer = null;
    }
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
    // Mỗi bước độc lập — 1 bước fail không chặn bước sau (tránh browser kẹt không đóng được → "toggle lỗi")
    if (this.cdpSession) {
      try { await this.cdpSession.detach(); } catch (e) { console.log('[close] cdp detach:', e.message); }
      this.cdpSession = null;
    }
    if (this.stagehand) {
      try { await this.stagehand.close(); } catch (e) { console.log('[close] stagehand:', e.message); }
      this.stagehand = null;
    }
    if (this.page) {
      try { await this.page.close(); } catch (e) { console.log('[close] page:', e.message); }
      this.page = null;
    }
    if (this.browser) {
      try { await this.browser.close(); } catch (e) { console.log('[close] browser:', e.message); }
      this.browser = null;
    }
    this.clients.forEach(c => { try { c.close(); } catch (e) {} });
    this.clients.clear();

    // Force-kill any zombie chrome-headless-shell / chromium processes
    // (browser.close() đôi khi không kill hết trên Windows)
    try {
      await execPromise('taskkill /F /IM chrome-headless-shell.exe 2>nul & taskkill /F /IM chromium.exe 2>nul & taskkill /F /IM chrome.exe 2>nul');
      console.log('[BrowserStream] Force-killed any remaining browser processes');
    } catch (e) {
      // Ignore — nếu không có process nào thì taskkill vẫn lỗi, không sao
    }

    console.log('[BrowserStream] Closed — RAM freed');
  }

  getStatus() {
    return {
      running: !!this.browser,
      url: this.page?.url() || null,
      clients: this.clients.size,
      stagehand: !!this.stagehand,
    };
  }
}

module.exports = new BrowserStreamService();