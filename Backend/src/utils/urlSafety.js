/**
 * URL SAFETY UTILITIES - chống SSRF
 * Dùng chung cho các route thực hiện fetch tới URL do client cung cấp
 */

// Kiểm tra hostname có thuộc mạng nội bộ / private / reserved hay không
function isPrivateHostname(hostname) {
  if (!hostname) return true;
  const h = String(hostname).toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (h === 'localhost' || h === '::1' || h === '::' || h === '0.0.0.0') return true;
  if (h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.lan')) return true;

  // IPv6-mapped IPv4 (::ffff:x.x.x.x)
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateHostname(mapped[1]);

  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const p = ipv4.slice(1).map(Number);
    if (p.some(x => x > 255)) return true; // IPv4 không hợp lệ
    const [a, b, c] = p;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;            // link-local / metadata cloud
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;  // CGNAT
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 192 && b === 0 && c === 0) return true;
    if (a >= 224) return true;                          // multicast & reserved
    return false;
  }
  // Còn lại: hostname là domain - cho phép
  return false;
}

// Kiểm tra toàn bộ URL: protocol hợp lệ + không trỏ nội bộ
function assertPublicUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return { ok: false, reason: 'URL không hợp lệ' };
  let parsed;
  try { parsed = new URL(rawUrl); } catch { return { ok: false, reason: 'URL không hợp lệ' }; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return { ok: false, reason: 'Chỉ cho phép http/https' };
  if (isPrivateHostname(parsed.hostname)) return { ok: false, reason: 'Không cho phép kết nối tới địa chỉ nội bộ' };
  return { ok: true };
}

module.exports = { isPrivateHostname, assertPublicUrl };
