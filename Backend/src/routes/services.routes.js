const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const db = require('../config/db');

// Skills API
router.get('/skills', (req, res) => {
  db.all("SELECT * FROM ky_nang WHERE trang_thai = 'kich_hoat'", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Live Desktop API
router.get('/desktop/screenshot', (req, res) => {
  const tempImgPath = path.join(__dirname, '..', '..', 'temp_screen.jpg');
  
  const psScript = `
    Add-Type -AssemblyName System.Windows.Forms,System.Drawing
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap $screen.Width, $screen.Height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($screen.X, $screen.Y, 0, 0, $bitmap.Size)
    $bitmap.Save("${tempImgPath.replace(/\\/g, '\\\\')}", [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $graphics.Dispose()
    $bitmap.Dispose()
  `;

  exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, ' ')}"`, { timeout: 3000 }, (err) => {
    if (fs.existsSync(tempImgPath)) {
      res.sendFile(tempImgPath);
    } else {
      res.status(500).send('Lỗi chụp màn hình');
    }
  });
});

router.post('/desktop/click', (req, res) => {
  const { x_percent, y_percent } = req.body;
  
  // VALIDATE: chỉ chấp nhận số từ 0.0 đến 1.0
  if (typeof x_percent !== 'number' || typeof y_percent !== 'number') {
    return res.status(400).json({ error: 'x_percent và y_percent phải là số' });
  }
  if (x_percent < 0 || x_percent > 1 || y_percent < 0 || y_percent > 1) {
    return res.status(400).json({ error: 'Giá trị percent phải từ 0.0 đến 1.0' });
  }
  
  const psClick = `
    Add-Type -AssemblyName System.Windows.Forms
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $targetX = [int]($screen.Width * ${x_percent})
    $targetY = [int]($screen.Height * ${y_percent})
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
router.get('/external/weather', async (req, res) => {
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
router.get('/external/stocks/:symbol', async (req, res) => {
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

// IPTV Channels API
router.get('/iptv/channels', async (req, res) => {
  const { country, category } = req.query;
  try {
    const availableCategories = [
      'news', 'sports', 'entertainment', 'music', 'movies',
      'documentary', 'animation', 'kids', 'general', 'education',
      'religion', 'science', 'business', 'shop'
    ];
    
    let url = 'https://iptv-org.github.io/iptv/index.m3u';
    if (category && availableCategories.includes(category.toLowerCase())) {
      url = `https://iptv-org.github.io/iptv/categories/${category.toLowerCase()}.m3u`;
    } else if (category && !availableCategories.includes(category.toLowerCase())) {
      return res.json({ success: false, error: `Category '${category}' không tồn tại. Categories có sẵn: ${availableCategories.join(', ')}` });
    } else if (country && country !== 'all') {
      url = `https://iptv-org.github.io/iptv/countries/${country.toLowerCase()}.m3u`;
    }
      
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(15000)
    });
    
    if (!resp.ok) {
      return res.json({ success: false, error: `IPTV source trả về lỗi HTTP ${resp.status}` });
    }
    
    const text = await resp.text();
    if (!text || text.length < 50) {
      return res.json({ success: false, error: 'Nguồn IPTV trả về dữ liệu rỗng hoặc không hợp lệ' });
    }
    
    const channels = [];
    const lines = text.split('\n');
    let currentChannel = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      
      // Bỏ qua dòng trống, comment, VLC options, KODI properties
      if (!line || line.startsWith('#EXTVLCOPT') || line.startsWith('#KODIPROP') || line.startsWith('#EXTM3U')) {
        continue;
      }
      
      if (line.startsWith('#EXTINF:')) {
        // Parse tên kênh: lấy phần sau dấu phẩy cuối cùng
        const lastComma = line.lastIndexOf(',');
        const name = lastComma >= 0 ? line.substring(lastComma + 1).trim() : 'Kênh Truyền Hình';
        
        // Parse logo
        const logoMatch = line.match(/tvg-logo="([^"]+)"/);
        const logo = logoMatch ? logoMatch[1] : '';
        
        // Parse group-title (category con)
        const groupMatch = line.match(/group-title="([^"]+)"/);
        const group = groupMatch ? groupMatch[1] : '';
        
        currentChannel = { name, logo, group };
      } else if (line.startsWith('http') && currentChannel) {
        // Đây là URL stream
        // Làm sạch URL - loại bỏ các ký tự đặc biệt
        const cleanUrl = line.split(/[\s"']/)[0];
        if (cleanUrl && (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://'))) {
          currentChannel.url = cleanUrl;
          currentChannel.name = currentChannel.name
            .replace(/\s+/g, ' ')
            .replace(/tvg-logo="[^"]*"/g, '')
            .replace(/group-title="[^"]*"/g, '')
            .trim();
          channels.push(currentChannel);
        }
        currentChannel = null;
      } else if (line && !line.startsWith('#') && currentChannel && line.match(/^[a-zA-Z]/)) {
        // URL không bắt đầu bằng http (relative URL)
        currentChannel.url = line;
        channels.push(currentChannel);
        currentChannel = null;
      }
    }

    res.json({ success: true, count: channels.length, categories: availableCategories, channels: channels.slice(0, 80) });
  } catch (err) {
    res.json({ success: false, error: 'Lỗi kết nối IPTV: ' + (err.message || 'Timeout hoặc server không phản hồi') });
  }
});

// IPTV Countries list
router.get('/iptv/countries', async (req, res) => {
  try {
    const resp = await fetch('https://iptv-org.github.io/iptv/index.m3u', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000)
    });
    const text = await resp.text();
    
    const countries = new Set();
    const lines = text.split('\n');
    for (const line of lines) {
      const match = line.match(/tvg-country="([^"]+)"/);
      if (match) countries.add(match[1]);
    }
    
    const countryList = Array.from(countries).sort();
    res.json({ success: true, count: countryList.length, countries: countryList });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
