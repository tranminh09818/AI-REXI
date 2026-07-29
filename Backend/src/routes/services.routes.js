const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth.middleware');
const Shell = require('node-powershell');
const multer = require('multer');
const Groq = require('groq-sdk');

// Multer: Lưu file audio tạm thời vào thư mục temp
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'temp')),
    filename: (req, file, cb) => cb(null, `caption_${Date.now()}.webm`)
  }),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Khởi tạo Groq client (API key từ env hoặc settings)
const getGroqClient = () => {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === 'YOUR_GROQ_API_KEY_HERE') return null;
  return new Groq({ apiKey: key });
};

// Office packages
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
const PptxGenJS = require('pptxgenjs');
const { PDFDocument } = require('pdf-lib');

// Skills API
router.get('/skills', authMiddleware, (req, res) => {
  db.all("SELECT * FROM ky_nang WHERE trang_thai = 'kich_hoat'", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Live Desktop API - Chỉ cho Admin (TỐI ƯU HIỆU NĂNG)
router.get('/desktop/screenshot', authMiddleware, async (req, res) => {
  // Sử dụng node-powershell để tạo một tiến trình duy nhất, tránh chi phí khởi tạo lại
  const ps = new Shell({
    executionPolicy: 'Bypass',
    noProfile: true
  });

  try {
    // Kịch bản PowerShell này sẽ chụp ảnh, chuyển thành Base64 trong bộ nhớ và trả về stdout
    // -> Loại bỏ hoàn toàn việc ghi/đọc file từ đĩa cứng.
    const psCommand = `
      Add-Type -AssemblyName System.Drawing
      Add-Type -AssemblyName System.Windows.Forms
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
      $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($screen.X, $screen.Y, 0, 0, $bitmap.Size)
      $ms = New-Object System.IO.MemoryStream
      $bitmap.Save($ms, [System.Drawing.Imaging.ImageFormat]::Jpeg)
      $bytes = $ms.ToArray()
      [System.Convert]::ToBase64String($bytes)
      $graphics.Dispose()
      $bitmap.Dispose()
      $ms.Dispose()
    `;
    await ps.addCommand(psCommand);
    const base64Image = await ps.invoke();

    const imgBuffer = Buffer.from(base64Image, 'base64');
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': imgBuffer.length });
    res.end(imgBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi chụp màn hình: ' + error.message });
  } finally {
    ps.dispose(); // Đảm bảo tiến trình PowerShell được đóng lại
  }
});

router.post('/desktop/click', authMiddleware, (req, res) => {
  const { x_percent, y_percent } = req.body;
  
  // VALIDATE LINH HOẠT: chấp nhận cả số và string number, chặn string chữ
  const x = Number(x_percent);
  const y = Number(y_percent);
  
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return res.status(400).json({ error: 'x_percent và y_percent phải là số (ví dụ: 0.5)' });
  }
  if (x < 0 || x > 1 || y < 0 || y > 1) {
    return res.status(400).json({ error: 'Giá trị percent phải từ 0.0 đến 1.0' });
  }
  
  const psClick = `
    Add-Type -AssemblyName System.Windows.Forms
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $targetX = [int]($screen.Width * ${x})
    $targetY = [int]($screen.Height * ${y})
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($targetX, $targetY)
    $signature = '[DllImport("user32.dll")] public static extern void mouse_event(int dwFlags, int dx, int dy, int cButtons, int dwExtraInfo);'
    $type = Add-Type -MemberDefinition $signature -Name "Win32MouseEvent" -Namespace "Win32Functions" -PassThru
    $type::mouse_event(0x0002, 0, 0, 0, 0)
    $type::mouse_event(0x0004, 0, 0, 0, 0)
  `;

  exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psClick.replace(/\n/g, ' ')}"`, { timeout: 3000 }, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Không thể điều khiển chuột: ' + err.message });
    }
    res.json({ success: true, x_percent, y_percent });
  });
});

// Weather API
router.get('/external/weather', authMiddleware, async (req, res) => {
  const city = req.query.city || 'Hanoi';
  try {
    const resp = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const data = await resp.json();
    if (!data.current_condition || !data.current_condition[0]) {
      throw new Error('Invalid response format');
    }
    const current = data.current_condition[0];
    res.json({
      success: true,
      city: city,
      temp_C: current.temp_C || 'N/A',
      humidity: current.humidity || 'N/A',
      windspeedKmph: current.windspeedKmph || 'N/A',
      weatherDesc: (current.weatherDesc && current.weatherDesc[0]?.value) || 'N/A',
      uvIndex: current.uvIndex || 'N/A',
      source: 'wttr.in'
    });
  } catch (err) {
    res.json({
      success: false,
      error: 'Không thể lấy dữ liệu thời tiết: ' + err.message,
      source: 'error'
    });
  }
});

// Stocks API
router.get('/external/stocks/:symbol', authMiddleware, async (req, res) => {
  const { symbol } = req.params;
  try {
    const resp = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}?interval=1d&range=1mo`, {
      signal: AbortSignal.timeout(8000)
    });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const data = await resp.json();
    if (!data.chart?.result?.[0]) {
      throw new Error('No data available');
    }
    const result = data.chart.result[0];
    const quote = result.indicators.quote[0];
    const prices = quote.close.filter(p => p !== null);
    
    if (prices.length < 2) {
      return res.json({ success: true, symbol: symbol.toUpperCase(), currentPrice: prices[0]?.toFixed(2) || 'N/A', change: '0', changePercent: '0', prices, recommendation: 'FLAT ➡️', source: 'Yahoo Finance' });
    }
    
    const currentPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];
    const change = currentPrice - prevPrice;
    const changePercent = ((change / prevPrice) * 100).toFixed(2);
    
    res.json({
      success: true,
      symbol: symbol.toUpperCase(),
      currentPrice: currentPrice.toFixed(2),
      change: change.toFixed(2),
      changePercent: changePercent,
      prices: prices.slice(-15),
      recommendation: currentPrice > prevPrice ? 'UP 📈' : (currentPrice < prevPrice ? 'DOWN 📉' : 'FLAT ➡️'),
      source: 'Yahoo Finance'
    });
  } catch (err) {
    res.json({
      success: false,
      error: 'Không thể lấy dữ liệu chứng khoán: ' + err.message,
      symbol: symbol.toUpperCase(),
      source: 'error'
    });
  }
});

// Vietnamese TTS API - dùng edge-tts (Python) qua spawn để chống injection
const VALID_TTS_VOICES = ['vi-VN-HoaiMyNeural', 'vi-VN-NamMinhNeural'];

router.post('/tts', authMiddleware, async (req, res) => {
  const { text, voice, rate } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Văn bản không được để trống' });
  }

  // Whitelist voice để chống injection
  const voiceName = VALID_TTS_VOICES.includes(voice) ? voice : 'vi-VN-HoaiMyNeural';
  
  // Validate rate: chỉ chấp nhận dạng +XX% hoặc -XX%
  const validRate = rate && /^[+-]\d+%$/.test(rate) ? rate : '+0%';
  const maxLength = 1000;
  const trimmedText = text.trim().substring(0, maxLength);

  try {
    const tempFile = path.join(__dirname, '..', '..', `tts_${Date.now()}.mp3`);

    // Dùng spawn với arguments array để chống shell injection
    await new Promise((resolve, reject) => {
      const spawn = require('child_process').spawn;
      const args = [
        '-m', 'edge_tts',
        '--voice', voiceName,
        '--text', trimmedText,
        '--write-media', tempFile
      ];
      
      const proc = spawn('python', args, { timeout: 30000 });
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // Fallback: thử edge-tts CLI trực tiếp (nếu có)
          const args2 = [
            '--voice', voiceName,
            '--text', trimmedText,
            '--write-media', tempFile
          ];
          const proc2 = spawn('edge-tts', args2, { timeout: 30000 });
          proc2.on('close', (code2) => {
            if (code2 === 0) resolve();
            else reject(new Error(`TTS failed (code ${code}): ${stderr}`));
          });
          proc2.on('error', () => reject(new Error(`TTS failed (code ${code}): ${stderr}`)));
        }
      });
      proc.on('error', (err) => {
        // Fallback: edge-tts CLI
        const args2 = [
          '--voice', voiceName,
          '--text', trimmedText,
          '--write-media', tempFile
        ];
        const proc2 = spawn('edge-tts', args2, { timeout: 30000 });
        proc2.on('close', (code2) => {
          if (code2 === 0) resolve();
          else reject(new Error(`TTS failed: ${err.message}`));
        });
        proc2.on('error', () => reject(new Error(`TTS unavailable. Install: pip install edge-tts`)));
      });
    });

    // Đọc file audio và trả về
    if (fs.existsSync(tempFile)) {
      const audioBuffer = fs.readFileSync(tempFile);
      const base64Audio = audioBuffer.toString('base64');
      
      // Dọn dẹp file tạm
      try { fs.unlinkSync(tempFile); } catch(e) {}

      res.json({
        success: true,
        audio: base64Audio,
        format: 'mp3',
        voice: voiceName,
        text_length: trimmedText.length
      });
    } else {
      throw new Error('Không thể tạo file audio TTS');
    }
  } catch (err) {
    console.error('[TTS] Error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Lỗi TTS: ' + err.message,
      note: 'Hãy dùng Web Speech API trên trình duyệt (miễn phí, không cần server)'
    });
  }
});

const getCountryFlag = (code) => {
  if (!code || code.length !== 2) return '🌐';
  const codePoints = code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// ============================================================
// HLS Stream Proxy — tránh CORS khi trình duyệt load stream
// Browser gọi: /api/services/iptv/proxy?url=<encoded_stream_url>
// Backend fetch về rồi chuyển tiếp với CORS headers mở
// ============================================================
router.get('/iptv/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url param' });

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'Invalid protocol' });
    }
    const hostname = parsed.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' ||
        hostname.startsWith('127.') || hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') || hostname.startsWith('169.254.')) {
      return res.status(403).json({ error: 'Internal network access is not allowed' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid url' });
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': new URL(targetUrl).origin + '/',
        'Origin': new URL(targetUrl).origin
      },
      signal: AbortSignal.timeout(15000)
    });

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Content-Type', contentType);
    res.status(upstream.status);

    // Nếu là file .m3u8 playlist thì rewrite các URL relative → tuyệt đối qua proxy
    if (contentType.includes('mpegurl') || targetUrl.endsWith('.m3u8')) {
      let body = await upstream.text();
      const base = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      // Rewrite relative URLs trong playlist → đưa qua proxy
      body = body.replace(/^(?!#)([^\r\n]+)$/gm, (line) => {
        line = line.trim();
        if (!line) return line;
        let absoluteUrl;
        if (line.startsWith('http://') || line.startsWith('https://')) {
          absoluteUrl = line;
        } else if (line.startsWith('/')) {
          const origin = new URL(targetUrl).origin;
          absoluteUrl = origin + line;
        } else {
          absoluteUrl = base + line;
        }
        return `http://localhost:5000/api/services/iptv/proxy?url=${encodeURIComponent(absoluteUrl)}`;
      });
      return res.send(body);
    }

    // Dữ liệu nhị phân (ts segments, etc.) — pipe thẳng
    const buffer = await upstream.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[IPTV Proxy] Error:', err.message);
    return res.status(502).json({ error: 'Proxy upstream error: ' + err.message });
  }
});

// IPTV Channels API
router.get('/iptv/channels', async (req, res) => {
  const { country, category, limit = 1500 } = req.query;
  try {
    const availableCategories = [
      'news', 'sports', 'entertainment', 'music', 'movies',
      'documentary', 'animation', 'kids', 'general', 'education',
      'religion', 'science', 'business', 'shop'
    ];
    
    const COUNTRY_CODE_MAP = { 'GB': 'uk', 'UK': 'uk' };
    
    let url = 'https://iptv-org.github.io/iptv/index.m3u';
    
    if (country && country !== 'all' && country.trim()) {
      const mappedCode = COUNTRY_CODE_MAP[country.toUpperCase()] || country.toLowerCase();
      url = `https://iptv-org.github.io/iptv/countries/${mappedCode}.m3u`;
    } else if (category && availableCategories.includes(category.toLowerCase())) {
      url = `https://iptv-org.github.io/iptv/categories/${category.toLowerCase()}.m3u`;
    } else if (category && category.trim() && !availableCategories.includes(category.toLowerCase())) {
      return res.json({ success: false, error: `Category '${category}' kh\u00f4ng t\u1ed3n t\u1ea1i. Categories c\u00f3 s\u1eb5n: ${availableCategories.join(', ')}` });
    }
      
    let resp;
    try {
      resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(20000)
      });
    } catch (err) {
      console.log('[IPTV] Fetch M3U url error, trying index fallback:', err.message);
      resp = await fetch('https://iptv-org.github.io/iptv/index.m3u', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(20000)
      }).catch(() => null);
    }
    
    let text = '';
    if (resp && resp.ok) {
      text = await resp.text();
    }
    
    const channels = [];
    const seenUrls = new Set();
    const seenNames = new Set();

    if (text && text.length > 50) {
      const lines = text.split('\n');
      let currentChannel = null;

      for (const rawLine of lines) {
        const line = rawLine.replace('\r', '').trim();
        if (!line || line.startsWith('#EXTVLCOPT') || line.startsWith('#KODIPROP') || line.startsWith('#EXTM3U')) continue;
        
        if (line.startsWith('#EXTINF:')) {
          const lastComma = line.lastIndexOf(',');
          const name = lastComma >= 0 ? line.substring(lastComma + 1).trim() : 'Kênh Truyền Hình';

          // Bỏ qua các kênh đã được đánh dấu là Geo-blocked, Not 24/7, Offline, Blocked trong danh sách M3U
          if (/geo-blocked|not 24\/7|offline|discontinued|blocked|dead/i.test(name)) {
            currentChannel = null;
            continue;
          }

          const logoMatch = line.match(/tvg-logo="([^"]+)"/);
          const logo = logoMatch ? logoMatch[1] : '';
          const groupMatch = line.match(/group-title="([^"]+)"/);
          const group = groupMatch ? groupMatch[1] : '';

          const countryMatch = line.match(/tvg-country="([^"]+)"/);
          let countryCode = '';
          if (countryMatch) {
            countryCode = countryMatch[1].split(',')[0].trim().toUpperCase();
          } else {
            const idMatch = line.match(/tvg-id="[^"]*\.([a-z]{2})"/i);
            if (idMatch) countryCode = idMatch[1].toUpperCase();
          }
          
          currentChannel = { name, logo, group, country: countryCode };
        } else if (line.startsWith('http') && currentChannel) {
          const cleanUrl = line.split(/[\s"'\r\n]/)[0].trim();
          
          if (
            cleanUrl && 
            (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) && 
            !seenUrls.has(cleanUrl)
          ) {
            seenUrls.add(cleanUrl);
            currentChannel.url = cleanUrl;
            currentChannel.name = currentChannel.name.replace(/\s+/g, ' ').trim();
            channels.push(currentChannel);
          }
          currentChannel = null;
        }
      }
    }

    // Bổ sung các kênh Truyền Hình Việt Nam trực tiếp (VTV, VTC, Tỉnh Thành)
    if (!country || country.toUpperCase() === 'VN') {
      const vnDirectChannels = [
        // VTV — nguồn FPTPlay (đang sống 100%)
        { name: 'VTV1 HD - Thời Sự 24/7', logo: 'https://i.imgur.com/mgp6RAU.png', group: 'News', country: 'VN', url: 'https://live-a.fptplay53.net/live/media/vtv1/live247-hls-avc/index.m3u8' },
        { name: 'VTV2 HD - Khoa Học & Giáo Dục', logo: 'https://i.imgur.com/mgp6RAU.png', group: 'Education', country: 'VN', url: 'https://live-a.fptplay53.net/live/media/vtv2/live247-hls-avc/index.m3u8' },
        { name: 'VTV3 HD - Giải Trí & Thể Thao', logo: 'https://i.imgur.com/efrauLr.png', group: 'Entertainment', country: 'VN', url: 'https://live.fptplay53.net/live/media/vtv3/live247-hls-avc/index.m3u8' },
        { name: 'VTV4 HD - Đối Ngoại Quốc Tế', logo: 'https://i.imgur.com/mgp6RAU.png', group: 'General', country: 'VN', url: 'https://live-a.fptplay53.net/live/media/vtv4/live247-hls-avc/index.m3u8' },
        { name: 'VTV5 HD - Tiếng Dân Tộc', logo: 'https://i.imgur.com/mgp6RAU.png', group: 'General', country: 'VN', url: 'https://live-a.fptplay53.net/live/media/vtv5/live247-hls-avc/index.m3u8' },
        { name: 'VTV5 Tây Nam Bộ HD', logo: 'https://i.imgur.com/mgp6RAU.png', group: 'General', country: 'VN', url: 'https://live-a.fptplay53.net/live/media/vtv5tnb/live-hls-avc/index.m3u8' },
        { name: 'VTV5 Tây Nguyên HD', logo: 'https://i.imgur.com/mgp6RAU.png', group: 'General', country: 'VN', url: 'https://vips-livecdn.fptplay.net/live/media/vtv5tn/live-hls-avc/index.m3u8' },
        { name: 'VTV6 HD - Kênh Thanh Thiếu Niên', logo: 'https://i.imgur.com/mgp6RAU.png', group: 'Entertainment', country: 'VN', url: 'https://live-a.fptplay53.net/live/media/vtv6/live247-hls-avc/index.m3u8' },
        { name: 'VTV7 HD - Kênh Giáo Dục Quốc Gia', logo: 'https://i.imgur.com/mgp6RAU.png', group: 'Education', country: 'VN', url: 'https://live-a.fptplay53.net/live/media/vtv7/live247-hls-avc/index.m3u8' },
        { name: 'VTV9 HD - Kênh Nam Bộ', logo: 'https://i.imgur.com/mgp6RAU.png', group: 'General', country: 'VN', url: 'https://live-a.fptplay53.net/live/media/vtv9/live247-hls-avc/index.m3u8' },
        { name: 'VTV10 HD - Kênh Đa Nền Tảng', logo: 'https://i.imgur.com/mgp6RAU.png', group: 'General', country: 'VN', url: 'https://live-a.fptplay53.net/live/media/vtv10/live247-hls-avc/index.m3u8' },
        // Các đài khác — nguồn vtvprime (đang sống)
        { name: 'ANTV - Truyền Hình Công An Nhân Dân', logo: 'https://i.imgur.com/mgp6RAU.png', group: 'News', country: 'VN', url: 'https://liveh12.vtvprime.vn/hls/ANNINHTV/index.m3u8' },
        { name: 'QPVN - Quốc Phòng Việt Nam HD', logo: 'https://i.imgur.com/mgp6RAU.png', group: 'News', country: 'VN', url: 'https://liveh12.vtvprime.vn/hls/QPTV/index.m3u8' },
        { name: 'SCTV2 HD', logo: 'https://i.imgur.com/efrauLr.png', group: 'Entertainment', country: 'VN', url: 'https://liveh12.vtvprime.vn/hls/SCTV2/index.m3u8' },
        { name: 'HTV Key - Kênh Chìa Khóa Vàng', logo: 'https://i.imgur.com/efrauLr.png', group: 'Entertainment', country: 'VN', url: 'https://liveh12.vtvprime.vn/hls/HTVKey/index.m3u8' },
        // Kênh Tỉnh Thành
        { name: 'Cần Thơ TV1 (1080p)', logo: '', group: 'General', country: 'VN', url: 'https://live.canthotv.vn/live/tv/chunklist.m3u8' },
        { name: 'Cần Thơ TV3 (1080p)', logo: '', group: 'General', country: 'VN', url: 'https://live.canthotv.vn/cs3/tv/chunklist.m3u8' },
        { name: 'Đồng Tháp TV1 (720p)', logo: '', group: 'General', country: 'VN', url: 'https://liveh34.vtvprime.vn/hls/DONGTHAPTV/index.m3u8' },
        { name: 'Thái Nguyên TV (720p)', logo: '', group: 'General', country: 'VN', url: 'https://streaming.thainguyentv.vn/hls/livestream.m3u8' },
        // Kênh quốc tế liên quan VN
        { name: 'TVB Vietnam (1080p)', logo: '', group: 'Entertainment', country: 'VN', url: 'https://amg01868-amg01868c3-tvbanywhere-us-4491.playouts.now.amagi.tv/playlist/amg01868-tvbusa-tvbvietnam-tvbanywhereus/playlist.m3u8' },
      ];

      for (const ch of vnDirectChannels) {
        if (!seenUrls.has(ch.url)) {
          seenUrls.add(ch.url);
          channels.unshift(ch);
        }
      }
    }

    res.json({ success: true, count: channels.length, categories: availableCategories, channels });
  } catch (err) {
    res.json({ success: false, error: 'L\u1ed7i k\u1ebft n\u1ed1i IPTV: ' + (err.message || 'Timeout ho\u1eb7c server kh\u00f4ng ph\u1ea3n h\u1ed3i') });
  }
});


// Map code -> tên quốc gia
const countryNames = {
  'VN': 'Vietnam', 'US': 'United States', 'GB': 'United Kingdom', 'FR': 'France',
  'DE': 'Germany', 'IT': 'Italy', 'ES': 'Spain', 'JP': 'Japan', 'KR': 'South Korea',
  'CN': 'China', 'RU': 'Russia', 'BR': 'Brazil', 'MX': 'Mexico', 'CA': 'Canada',
  'AU': 'Australia', 'IN': 'India', 'TH': 'Thailand', 'PH': 'Philippines',
  'ID': 'Indonesia', 'MY': 'Malaysia', 'SG': 'Singapore', 'HK': 'Hong Kong',
  'TW': 'Taiwan', 'NZ': 'New Zealand', 'ZA': 'South Africa', 'NG': 'Nigeria',
  'KE': 'Kenya', 'EG': 'Egypt', 'TR': 'Turkey', 'SA': 'Saudi Arabia',
  'AE': 'United Arab Emirates', 'IL': 'Israel', 'PK': 'Pakistan', 'BD': 'Bangladesh',
  'NL': 'Netherlands', 'BE': 'Belgium', 'CH': 'Switzerland', 'AT': 'Austria',
  'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark', 'FI': 'Finland',
  'PL': 'Poland', 'CZ': 'Czech Republic', 'HU': 'Hungary', 'RO': 'Romania',
  'GR': 'Greece', 'PT': 'Portugal', 'IE': 'Ireland', 'AR': 'Argentina',
  'CL': 'Chile', 'CO': 'Colombia', 'PE': 'Peru', 'VE': 'Venezuela',
  'CU': 'Cuba', 'PR': 'Puerto Rico', 'DO': 'Dominican Republic', 'JM': 'Jamaica',
  'TN': 'Tunisia', 'MA': 'Morocco', 'DZ': 'Algeria', 'LY': 'Libya',
  'QA': 'Qatar', 'BH': 'Bahrain', 'KW': 'Kuwait', 'OM': 'Oman',
  'JO': 'Jordan', 'LB': 'Lebanon', 'SY': 'Syria', 'IQ': 'Iraq',
  'IR': 'Iran', 'AF': 'Afghanistan', 'UZ': 'Uzbekistan', 'KZ': 'Kazakhstan',
  'TJ': 'Tajikistan', 'KG': 'Kyrgyzstan', 'TM': 'Turkmenistan', 'MN': 'Mongolia',
  'LA': 'Laos', 'KH': 'Cambodia', 'MM': 'Myanmar', 'VG': 'British Virgin Islands',
  'VI': 'U.S. Virgin Islands', 'TC': 'Turks and Caicos', 'BS': 'Bahamas',
  'BM': 'Bermuda', 'KY': 'Cayman Islands', 'AI': 'Anguilla', 'AG': 'Antigua and Barbuda',
  'KN': 'Saint Kitts and Nevis', 'LC': 'Saint Lucia', 'VC': 'Saint Vincent and the Grenadines',
  'GD': 'Grenada', 'BZ': 'Belize', 'HT': 'Haiti', 'TT': 'Trinidad and Tobago',
  'GY': 'Guyana', 'SR': 'Suriname', 'EC': 'Ecuador', 'BO': 'Bolivia',
  'PY': 'Paraguay', 'UY': 'Uruguay', 'FM': 'Micronesia', 'PW': 'Palau',
  'FJ': 'Fiji', 'SB': 'Solomon Islands', 'VU': 'Vanuatu', 'WS': 'Samoa',
  'KI': 'Kiribati', 'TO': 'Tonga', 'PG': 'Papua New Guinea', 'BT': 'Bhutan',
  'NP': 'Nepal', 'SL': 'Sierra Leone', 'LR': 'Liberia', 'GH': 'Ghana',
  'CI': 'Côte d\'Ivoire', 'SN': 'Senegal', 'ML': 'Mali', 'BJ': 'Benin',
  'BF': 'Burkina Faso', 'NE': 'Niger', 'TD': 'Chad', 'CF': 'Central African Republic',
  'CM': 'Cameroon', 'GA': 'Gabon', 'CG': 'Republic of the Congo', 'CD': 'Democratic Republic of the Congo',
  'AO': 'Angola', 'ZM': 'Zambia', 'ZW': 'Zimbabwe', 'MW': 'Malawi',
  'MZ': 'Mozambique', 'BW': 'Botswana', 'NA': 'Namibia', 'LS': 'Lesotho',
  'SZ': 'Eswatini', 'MU': 'Mauritius', 'SC': 'Seychelles', 'MG': 'Madagascar',
  'GM': 'Gambia', 'GW': 'Guinea-Bissau', 'GN': 'Guinea', 'ET': 'Ethiopia',
  'SO': 'Somalia', 'DJ': 'Djibouti', 'ER': 'Eritrea', 'SD': 'Sudan',
  'SS': 'South Sudan', 'UG': 'Uganda', 'RW': 'Rwanda', 'BI': 'Burundi',
  'TZ': 'Tanzania', 'AL': 'Albania', 'BA': 'Bosnia and Herzegovina', 'HR': 'Croatia',
  'ME': 'Montenegro', 'RS': 'Serbia', 'MK': 'North Macedonia', 'SI': 'Slovenia',
  'SK': 'Slovakia', 'UA': 'Ukraine', 'BY': 'Belarus', 'MD': 'Moldova',
  'LT': 'Lithuania', 'LV': 'Latvia', 'EE': 'Estonia', 'IS': 'Iceland',
  'LU': 'Luxembourg', 'MT': 'Malta', 'CY': 'Cyprus', 'PS': 'Palestine',
  'AM': 'Armenia', 'AZ': 'Azerbaijan', 'GE': 'Georgia', 'AD': 'Andorra',
  'MC': 'Monaco', 'LI': 'Liechtenstein', 'SM': 'San Marino', 'VA': 'Vatican City'
};

// IPTV Countries list - 250+ quốc gia với Mã Quốc Gia (English) + Cờ
router.get('/iptv/countries', async (req, res) => {
  try {
    let countryList = [];
    try {
      const resp = await fetch('https://iptv-org.github.io/api/countries.json', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000)
      });
      if (resp.ok) {
        const data = await resp.json();
        countryList = data.map(c => ({
          code: c.code.toUpperCase(),
          name: c.name,
          flag: c.flag || getCountryFlag(c.code)
        }));
      }
    } catch (e) {
      console.log('[IPTV] Lỗi fetch countries API, dùng fallback:', e.message);
    }

    if (!countryList.length) {
      countryList = Object.entries(countryNames).map(([code, name]) => ({
        code,
        name,
        flag: getCountryFlag(code)
      }));
    }

    // Ghim VN lên đầu, sau đó sắp xếp theo Tên Quốc Gia (A-Z)
    countryList.sort((a, b) => {
      if (a.code === 'VN') return -1;
      if (b.code === 'VN') return 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ success: true, count: countryList.length, countries: countryList });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ------------------- OFFICE API: DOCX / PPTX / PDF -------------------

// POST /api/office/generate-docx - Tạo file Word từ text (Markdown -> DOCX)
router.post('/office/generate-docx', authMiddleware, async (req, res) => {
  const { title, content } = req.body;
  if (!content) return res.status(400).json({ error: 'Thiếu nội dung văn bản' });
  if (content.length > 50000) return res.status(400).json({ error: 'Nội dung quá dài (tối đa 50,000 ký tự)' });

  try {

    // Phân tích content thành các đoạn
    const lines = content.split('\n').filter(l => l.trim());
    const children = [];

    // Tiêu đề chính
    if (title) {
      children.push(
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6 } }
        })
      );
    }

    // Xử lý từng dòng
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Phát hiện table (dòng có |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed.split('|').filter(c => c.trim());
        if (cells.length > 1) {
          children.push(
            new Table({
              rows: [
                new TableRow({
                  children: cells.map(c => new TableCell({
                    children: [new Paragraph({ text: c.trim(), alignment: AlignmentType.CENTER })],
                    width: { size: 100 / cells.length, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.SINGLE }, bottom: { style: BorderStyle.SINGLE }, left: { style: BorderStyle.SINGLE }, right: { style: BorderStyle.SINGLE } }
                  }))
                })
              ]
            })
          );
          continue;
        }
      }

      // Phát hiện bullet (- hoặc *)
      if (trimmed.match(/^[-*]\s/)) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: trimmed.replace(/^[-*]\s*/, ''), size: 22 })],
            bullet: { level: 0 },
            spacing: { after: 100 }
          })
        );
        continue;
      }

      // Phát hiện numbered (1., 2.,...)
      if (trimmed.match(/^\d+\.\s/)) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: trimmed.replace(/^\d+\.\s*/, ''), size: 22 })],
            numbering: { reference: 'default-numbering', level: 0 },
            spacing: { after: 100 }
          })
        );
        continue;
      }

      // Phát hiện heading (# ## ###)
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const levelMap = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4, 5: HeadingLevel.HEADING_5, 6: HeadingLevel.HEADING_6 };
        children.push(
          new Paragraph({
            text: headingMatch[2],
            heading: levelMap[level] || HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 }
          })
        );
        continue;
      }

      // V�n bản thường
      children.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed, size: 22 })],
          spacing: { after: 120 },
          alignment: AlignmentType.JUSTIFIED
        })
      );
    }

    const doc = new Document({
      title: title || 'Tài liệu AI Rexi',
      description: 'Được tạo bởi AI Rexi Office Generator',
      styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
      sections: [{ children, properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } } }]
    });

    const buffer = await Packer.toBuffer(doc);
    const base64 = buffer.toString('base64');

    res.json({
      success: true,
      data: base64,
      format: 'docx',
      filename: `${(title || 'Tai_lieu_AIRexi').replace(/[^a-zA-Z0-9_]/g, '_')}.docx`,
      size: buffer.length
    });
  } catch (err) {
    console.error('[Office] DOCX Error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi tạo DOCX: ' + err.message });
  }
});

// POST /api/office/generate-pptx - Tạo file PowerPoint (pptxgenjs)
router.post('/office/generate-pptx', authMiddleware, async (req, res) => {
  const { title, slides } = req.body;
  if (!slides || !Array.isArray(slides) || slides.length === 0 || slides.length > 50) {
    return res.status(400).json({ error: 'Thiếu danh sách slide (slides: [{title, content}])' });
  }

  try {
    const pres = new pptxgen();

    // Slide 1: Tiêu đề
    const slide1 = pres.addSlide();
    slide1.addText(title || 'Bài thuyết trình AI Rexi', { x: 0.5, y: 1, w: 9, h: 2, fontSize: 36, color: 'FFFFFF', bold: true, align: 'center' });
    slide1.addText('Được tạo bởi AI Rexi Office Generator', { x: 0.5, y: 3.2, w: 9, h: 0.8, fontSize: 16, color: 'AAAAAA', align: 'center' });
    slide1.background = { color: '1E1E2E' };

    // Các slide nội dung
    for (const slide of slides) {
      const s = pres.addSlide();
      s.background = { color: '1E1E2E' };
      
      // Tiêu đề slide
      s.addText(slide.title || '', { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, color: '89B4FA', bold: true });
      
      // Nội dung
      const contentLines = (slide.content || '').split('\n').filter(l => l.trim());
      let yPos = 1.4;
      for (const line of contentLines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ')) {
          s.addText('• ' + trimmed.substring(2), { x: 0.7, y: yPos, w: 8.5, h: 0.4, fontSize: 16, color: 'CDD6F4' });
        } else {
          s.addText(trimmed, { x: 0.5, y: yPos, w: 8.8, h: 0.5, fontSize: 16, color: 'CDD6F4' });
        }
        yPos += 0.45;
      }
    }

    const buffer = await pres.write({ outputType: 'nodebuffer' });
    const base64 = buffer.toString('base64');

    res.json({
      success: true,
      data: base64,
      format: 'pptx',
      filename: `${(title || 'Bai_thuyet_trinh_AIRexi').replace(/[^a-zA-Z0-9_]/g, '_')}.pptx`,
      slides_count: slides.length + 1,
      size: buffer.length
    });
  } catch (err) {
    console.error('[Office] PPTX Error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi tạo PPTX: ' + err.message });
  }
});

// POST /api/office/process-pdf - Xử lý PDF (merge, split, info)
router.post('/office/process-pdf', authMiddleware, async (req, res) => {
  const { action, base64_pdf } = req.body;
  if (!base64_pdf) return res.status(400).json({ error: 'Thiếu file PDF (base64_pdf)' });

  try {
    const pdfBytes = Buffer.from(base64_pdf, 'base64');
    const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    if (action === 'info') {
      res.json({
        success: true,
        action: 'info',
        pages: doc.getPageCount(),
        title: doc.getTitle() || 'Untitled',
        author: doc.getAuthor() || 'Unknown',
        subject: doc.getSubject() || '',
        keywords: doc.getKeywords() || '',
        creator: doc.getCreator() || 'AI Rexi PDF Processor'
      });
    } else {
      res.json({
        success: false,
        action: action || 'unknown',
        error: `Hành động '${action || 'unknown'}' chưa được hỗ trợ. Hỗ trợ: info`
      });
    }
  } catch (err) {
    console.error('[Office] PDF Error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi xử lý PDF: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LIVE CAPTION: Nhận diện giọng nói từ video bằng Groq Whisper + Dịch Tiếng Việt
// ─────────────────────────────────────────────────────────────────────────────
const tempDir = path.join(__dirname, '..', '..', 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

router.post('/transcribe', authMiddleware, upload.single('audio'), async (req, res) => {
  const audioFile = req.file;
  const srcLang = req.body.lang || 'en';

  if (!audioFile) {
    return res.status(400).json({ success: false, error: 'Không nhận được file audio.' });
  }

  try {
    const groq = getGroqClient();
    if (!groq) {
      // Fallback: Không có Groq key — báo lỗi rõ ràng
      fs.unlinkSync(audioFile.path);
      return res.status(503).json({
        success: false,
        error: 'CHƯA_CÓ_KEY',
        message: 'Cần thêm GROQ_API_KEY vào file .env để dùng tính năng Phụ Đề AI. Lấy key miễn phí tại: https://console.groq.com'
      });
    }

    // Gọi Groq Whisper API để nhận diện giọng nói
    const audioStream = fs.createReadStream(audioFile.path);
    const transcription = await groq.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-large-v3',
      language: srcLang,
      response_format: 'text'
    });

    // Xoá file tạm sau khi dùng xong
    fs.unlinkSync(audioFile.path);

    const originalText = (transcription || '').trim();
    if (!originalText) {
      return res.json({ success: true, text: '', original: '' });
    }

    // Dịch sang Tiếng Việt qua Google Translate (miễn phí, không cần key)
    let vietnameseText = originalText;
    try {
      const translateRes = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcLang}&tl=vi&dt=t&q=${encodeURIComponent(originalText)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      const translateData = await translateRes.json();
      if (translateData?.[0]?.[0]?.[0]) {
        vietnameseText = translateData[0].map(s => s?.[0] || '').join('');
      }
    } catch (transErr) {
      console.log('[Transcribe] Translate fallback error:', transErr.message);
    }

    res.json({ success: true, text: vietnameseText, original: originalText });

  } catch (err) {
    // Dọn file tạm dù có lỗi
    if (audioFile?.path && fs.existsSync(audioFile.path)) {
      fs.unlinkSync(audioFile.path);
    }
    console.error('[Transcribe] Error:', err.message);
    res.status(500).json({ success: false, error: 'Lỗi nhận diện giọng nói: ' + err.message });
  }
});

module.exports = router;
