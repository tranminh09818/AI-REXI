// utils/stripAnsi.js
// Loại bỏ mã ANSI escape (màu, cursor, OSC, v.v.) khỏi output của process.
// Mục đích: tránh việc mã màu (ví dụ ESC[35m) hiện thành "[[35m..." rác trong chat UI
// khi output của opencode/agent/PowerShell (Write-Host -ForegroundColor) bị đẩy thẳng ra chat.

'use strict';

// CSI: ESC [ (params 0x30-0x3F) (intermediate 0x20-0x2F)* final 0x40-0x7E
const RE_CSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
// OSC: ESC ] ... (BEL | ESC \)
const RE_OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
// Escape 2 ký tự: ESC = , ESC > , ESC c , ESC 7 , ESC 8 ...
const RE_ESC2 = /\x1b[=>c78DMEH]/g;
// Charset designate: ESC ( B , ESC ) 0 ...
const RE_CHARSET = /\x1b[()*+]./g;
// Các control char thừa (trừ \t \n \r). 0x1b (ESC) nằm trong dải này nên cũng bị xoá nếu sót.
const RE_CTRL = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

function stripAnsi(input) {
  if (input == null) return input;
  return String(input)
    .replace(RE_OSC, '')
    .replace(RE_CSI, '')
    .replace(RE_ESC2, '')
    .replace(RE_CHARSET, '')
    .replace(RE_CTRL, '');
}

// Bộ lọc cho stream: an toàn khi một escape bị cắt ngang giữa 2 chunk.
// Giữ lại phần escape chưa hoàn chỉnh ở cuối buffer, xử lý tiếp ở chunk sau.
class AnsiStreamCleaner {
  constructor() { this._pending = ''; }

  push(chunk) {
    let buf = this._pending + String(chunk == null ? '' : chunk);
    const lastEsc = buf.lastIndexOf('\x1b');
    if (lastEsc === -1) {
      this._pending = '';
      return stripAnsi(buf);
    }
    const tail = buf.slice(lastEsc);
    let complete = false;
    if (tail.length >= 2) {
      const c1 = tail[1];
      if (c1 === '[') {
        complete = /[\x40-\x7e]/.test(tail.slice(2)); // có byte final CSI
      } else if (c1 === ']') {
        const rest = tail.slice(2);
        complete = rest.includes('\x07') || rest.includes('\x1b\\'); // có BEL hoặc ST
      } else if ('()*+'.includes(c1)) {
        complete = tail.length >= 3; // ESC ( B cần 3 ký tự
      } else {
        complete = true; // ESC + 1 ký tự đơn đã đủ
      }
    }
    if (complete) {
      this._pending = '';
      return stripAnsi(buf);
    }
    this._pending = tail;
    return stripAnsi(buf.slice(0, lastEsc));
  }

  flush() {
    const rest = this._pending;
    this._pending = '';
    return stripAnsi(rest);
  }
}

module.exports = { stripAnsi, AnsiStreamCleaner };
