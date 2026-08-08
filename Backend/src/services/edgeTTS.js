/**
 * edgeTTS.js — Edge TTS Thuần Node.js (WebSocket trực tiếp tới Microsoft Edge TTS)
 * Không cần cài Python/pip, hoạt động trên mọi môi trường (local + Render).
 * Dùng chung cho: /api/services/tts (trang chủ) và Agent Mode tool text_to_speech.
 *
 * FIX 2026-08:
 *  - Microsoft chặn handshake cũ (401) — yêu cầu token mới
 *    (TrustedClientToken 6A5AA1D4EAFF...) + Sec-MS-GEC (SHA256 của Windows file time
 *    ticks làm tròn 5 phút + token) + Sec-MS-GEC-Version + Origin/UA mới.
 *  - Format X-Timestamp phải khớp chính xác edge_tts (rany2/edge-tts):
 *      + config: X-Timestamp:<"%a %b %d %Y %H:%M:%S GMT+0000 (Coordinated Universal Time)">  (KHÔNG có Z)
 *      + ssml:   X-Timestamp:<ISO-8601 có mili-giây>Z                                        (có Z)
 *    Sai format → server nhận handshake nhưng KHÔNG trả audio.
 *  - perMessageDeflate: false (khớp test đã chứng minh hoạt động).
 */
const WebSocket = require('ws');
const crypto = require('crypto');

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const SEC_MS_GEC_VERSION = '1-143.0.3650.75';
const WIN_EPOCH = 11644473600n; // Unix → Windows file time epoch (1601-01-01)

// Sec-MS-GEC: SHA256( ticks + token ) uppercased.
// ticks = (unix_seconds + WIN_EPOCH) làm tròn xuống 5 phút, ×10^7 (100-ns intervals).
// Dùng BigInt vì giá trị ~1.3e17 vượt độ chính xác an toàn của JS number (2^53).
function generateSecMsGec() {
  let ticks = BigInt(Math.floor(Date.now() / 1000));
  ticks += WIN_EPOCH;
  ticks -= ticks % 300n;
  ticks *= 10000000n;
  const strToHash = ticks.toString() + TRUSTED_CLIENT_TOKEN;
  return crypto.createHash('sha256').update(strToHash, 'ascii').digest('hex').toUpperCase();
}

function connectId() {
  return crypto.randomUUID().replace(/-/g, '');
}

function pad(n, w) { return String(n).padStart(w || 2, '0'); }

// "%a %b %d %Y %H:%M:%S GMT+0000 (Coordinated Universal Time)" — dùng cho speech.config (KHÔNG Z)
function dateToString() {
  const d = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${days[d.getUTCDay()]} ${months[d.getUTCMonth()]} ${pad(d.getUTCDate())} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} GMT+0000 (Coordinated Universal Time)`;
}

// "YYYY-MM-DDTHH:MM:SS.mmm" — dùng cho ssml (thêm Z ở ngoài)
function isoTimestamp() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)}`;
}

/**
 * Tổng hợp giọng nói qua WebSocket tới Microsoft Edge TTS.
 * @param {string} voiceName  VD: 'vi-VN-HoaiMyNeural'
 * @param {string} text       Văn bản cần đọc
 * @param {string} rate       VD: '+0%'
 * @param {string} pitch      VD: '+0Hz'
 * @returns {Promise<Buffer>} Buffer audio MP3
 */
function generateEdgeTTSNode(voiceName, text, rate = '+0%', pitch = '+0Hz') {
  return new Promise((resolve, reject) => {
    const requestId = connectId();
    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1`
      + `?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`
      + `&ConnectionId=${connectId()}`
      + `&Sec-MS-GEC=${generateSecMsGec()}`
      + `&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;

    const ws = new WebSocket(wsUrl, {
      perMessageDeflate: false,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
        'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'Pragma': 'no-cache',
        'Cache-Control': 'no-cache',
        'Sec-WebSocket-Version': '13',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': `muid=${crypto.randomBytes(16).toString('hex').toUpperCase()};`,
      }
    });

    const audioBuffers = [];
    let isFinished = false;

    const timer = setTimeout(() => {
      if (!isFinished) {
        isFinished = true;
        try { ws.close(); } catch(e) {}
        if (audioBuffers.length > 0) resolve(Buffer.concat(audioBuffers));
        else reject(new Error('Edge TTS WebSocket timeout'));
      }
    }, 30000);

    ws.on('open', () => {
      const configMsg = `X-Timestamp:${dateToString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
      ws.send(configMsg);

      const escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      const ssmlMsg = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${isoTimestamp()}Z\r\nPath:ssml\r\n\r\n<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='vi-VN'><voice name='${voiceName}'><prosody pitch='${pitch}' rate='${rate}'>${escapedText}</prosody></voice></speak>`;
      ws.send(ssmlMsg);
    });

    ws.on('message', (data, isBinary) => {
      if (isFinished) return;

      if (isBinary) {
        // Khung binary (format 2026): "\x00\x80X-RequestId:<id>\r\nContent-Type:audio/mpeg\r\nX-StreamId:<sid>\r\nPath:audio\r\n<mp3 bytes>"
        // Audio nằm NGAY SAU "Path:audio\r\n" — KHÔNG có \r\n\r\n ngăn cách (đã verify thực tế).
        const audioMarker = Buffer.from('Path:audio\r\n');
        const idx = data.indexOf(audioMarker);
        if (idx !== -1) {
          audioBuffers.push(data.subarray(idx + audioMarker.length));
        }
      } else {
        const textMsg = data.toString('utf8');
        if (textMsg.includes('Path:turn.end')) {
          isFinished = true;
          clearTimeout(timer);
          try { ws.close(); } catch(e) {}
          if (audioBuffers.length > 0) resolve(Buffer.concat(audioBuffers));
          else reject(new Error('No audio chunks received'));
        }
      }
    });

    ws.on('error', (err) => {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timer);
        if (audioBuffers.length > 0) resolve(Buffer.concat(audioBuffers));
        else reject(err);
      }
    });

    ws.on('close', () => {
      if (!isFinished) {
        isFinished = true;
        clearTimeout(timer);
        if (audioBuffers.length > 0) resolve(Buffer.concat(audioBuffers));
        else reject(new Error('WebSocket closed unexpectedly'));
      }
    });
  });
}

module.exports = { generateEdgeTTSNode };
