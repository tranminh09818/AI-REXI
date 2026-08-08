/**
 * AI REXI BRAIN — MEMORY SERVICE (Phase 2: Memory Layer)
 *
 * Quản lý "bộ nhớ dài hạn" cho từng người dùng trong bảng `bo_nho_dai_han`.
 * KHÔNG dùng LLM để ghi nhớ — chạy hoàn toàn local, tiết kiệm quota:
 *
 *  - saveMemory: lưu 1 memory có phân loại + ưu tiên
 *  - saveMemoryAuto: tự trích xuất entity từ tin nhắn → lưu dạng ngữ nghĩa
 *  - updateMemory: cập nhật/merge khi phát hiện memory tương đồng
 *  - deleteMemory: xoá
 *  - loadSmartMemory: load top-K memory phù hợp context (priority + keyword)
 *  - getMemoryStats: thống kê để UI hiển thị
 *
 * Adapter: callback-based (get/all/run). Promisify bên trong.
 */

const { extractEntities } = require('../nlp/entity-extractor');
const { extractKeywords } = require('../nlp/tokenizer-utils');
const { isDuplicateMemory, similarity } = require('./memory-similarity');

const db = require('../../../config/db');

const MAX_MEMORY_PER_USER = 200; // giới hạn an toàn
const HIGH_PRIORITY = 7;          // memory quan trọng luôn load
const CONTEXT_MATCH_LIMIT = 3;    // số memory keyword-match tối đa
const OVERALL_LIMIT = 8;          // tổng memory đưa vào system prompt

// ─── PROMISE HELPERS ────────────────────────────────────────────
function run(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.run(sql, params, function(err) { if (err) return reject(err); resolve({ changes: this ? this.changes : 0, lastID: this && this.lastID }); })
  );
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
}
function all(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || [])));
}

// ─── TYPE CLASSIFICATION ────────────────────────────────────────
// Trả về { loai, do_uu_tien } cho 1 memory

const TYPE_RULES = [
  { match: (e) => e.name && e.phone, loai: 'thong_tin_user', prio: 10 },      // ID cá nhân đầy đủ
  { match: (e) => e.phone || e.email, loai: 'thong_tin_user', prio: 9 },      // liên hệ
  { match: (e) => e.name, loai: 'thong_tin_user', prio: 9 },                  // tên
  { match: (e) => e.birthYear, loai: 'thong_tin_user', prio: 8 },             // sinh nhật
  { match: (e) => e.job, loai: 'cong_viec', prio: 8 },                        // nghề nghiệp
  { match: (e) => e.company, loai: 'cong_viec', prio: 7 },                    // công ty
  { match: (e) => e.location, loai: 'dia_diem', prio: 7 },                    // nơi ở
  { match: (e) => (e.preferences || []).length, loai: 'so_thich', prio: 6 },          // sở thích
  { match: (e) => (e.dislikes || []).length, loai: 'khong_thich', prio: 6 },          // ghét
  { match: (e) => (e.dates || []).length, loai: 'su_kien', prio: 6 },                 // hẹn/lịch
  { match: (e) => (e.facts || []).length, loai: 'thong_tin', prio: 5 },               // thông tin khác
];

function classify(text, entities) {
  for (const r of TYPE_RULES) {
    if (r.match(entities)) return { loai: r.loai, do_uu_tien: r.prio };
  }
  // nhận diện keyword "quan trọng" (user tự yêu cầu nhớ)
  const flat = (text || '').toLowerCase();
  const important = ['quan trọng', 'ghi nhớ', 'lưu ý', 'nhớ giúp', 'remember', 'important', 'note', 'đừng quên'];
  if (important.some(k => flat.includes(k))) return { loai: 'quan_trong', do_uu_tien: 8 };
  // trả về chung
  return { loai: 'thong_tin', do_uu_tien: 3 };
}

// ─── SAVE (dedup) ───────────────────────────────────────────────
// Kiểm tra trùng với memory hiện có cùng loại; nếu trùng → merge/update

async function findSimilarExisting(userId, loai, content) {
  const rows = await all(
    "SELECT ma_bo_nho, noi_dung FROM bo_nho_dai_han WHERE ma_nguoi_dung = ? AND loai = ?",
    [userId, loai]
  );
  for (const row of rows) {
    if (isDuplicateMemory(row.noi_dung, content)) return row;
  }
  return null;
}

async function saveMemory(userId, { loai, noi_dung, do_uu_tien = 5, nguon = 'manual' }) {
  if (!userId || !noi_dung) return null;
  noi_dung = String(noi_dung).trim();
  if (noi_dung.length < 2) return null;

  // giới hạn số memory/user
  const count = await get("SELECT COUNT(*) AS c FROM bo_nho_dai_han WHERE ma_nguoi_dung = ?", [userId]);
  if (count && count.c >= MAX_MEMORY_PER_USER) {
    await run("DELETE FROM bo_nho_dai_han WHERE ma_nguoi_dung = ? AND ma_bo_nho IN (SELECT ma_bo_nho FROM bo_nho_dai_han WHERE ma_nguoi_dung = ? ORDER BY do_uu_tien ASC, ngay_tao DESC LIMIT 1)", [userId, userId]);
  }

  const existing = await findSimilarExisting(userId, loai, noi_dung);
  if (existing) {
    // merge: giữ nội dung mới hơn, tăng ưu tiên
    const merged = existing.noi_dung.includes(noi_dung) ? existing.noi_dung : noi_dung;
    await run(
      "UPDATE bo_nho_dai_han SET noi_dung = ?, do_uu_tien = CASE WHEN do_uu_tien > ? THEN do_uu_tien ELSE ? END, ngay_tao = CURRENT_TIMESTAMP WHERE ma_bo_nho = ?",
      [merged, do_uu_tien, do_uu_tien, existing.ma_bo_nho]
    );
    return { action: 'updated', id: existing.ma_bo_nho };
  }

  const maBoNho = 'm' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  await run(
    "INSERT INTO bo_nho_dai_han (ma_bo_nho, ma_nguoi_dung, loai, noi_dung, do_uu_tien) VALUES (?, ?, ?, ?, ?)",
    [maBoNho, userId, loai, noi_dung, do_uu_tien]
  );
  return { action: 'saved', id: maBoNho };
}

// Lưu tự động từ tin nhắn — extract entity → build nội dung ngữ nghĩa → save
async function saveMemoryAuto(userId, text) {
  if (!userId || !text) return null;
  const entities = extractEntities(text);

  let content = '';
  if (entities.name) content += `Tên người dùng là ${entities.name}. `;
  if (entities.phone) content += `Số điện thoại: ${entities.phone}. `;
  if (entities.email) content += `Email: ${entities.email}. `;
  if (entities.job) content += `Nghề nghiệp: ${entities.job}. `;
  if (entities.company) content += `Làm tại công ty ${entities.company}. `;
  if (entities.location) content += `Địa điểm: ${entities.location}. `;
  if (entities.preferences.length) content += `Sở thích: ${entities.preferences.join(', ')}. `;
  if (entities.dislikes.length) content += `Không thích: ${entities.dislikes.join(', ')}. `;
  if (entities.facts.length) content += `Thông tin: ${entities.facts.join(', ')}. `;

  if (!content.trim()) return null; // không có thông tin đáng nhớ

  const { loai, do_uu_tien } = classify(text, entities);
  const result = await saveMemory(userId, {
    loai, noi_dung: content.trim(), do_uu_tien, nguon: 'auto'
  });

  return result ? { ...result, entities } : null;
}

// ─── UPDATE ─────────────────────────────────────────────────────
async function updateMemory(userId, maBoNho, noiDungMoi) {
  if (!maBoNho || !noiDungMoi) return false;
  const res = await run(
    "UPDATE bo_nho_dai_han SET noi_dung = ?, ngay_tao = CURRENT_TIMESTAMP WHERE ma_bo_nho = ? AND ma_nguoi_dung = ?",
    [noiDungMoi, maBoNho, userId]
  );
  return res.changes > 0;
}

// ─── DELETE ─────────────────────────────────────────────────────
async function deleteMemory(userId, maBoNho) {
  if (!maBoNho) return false;
  const res = await run("DELETE FROM bo_nho_dai_han WHERE ma_bo_nho = ? AND ma_nguoi_dung = ?", [maBoNho, userId]);
  return res.changes > 0;
}

async function listMemories(userId) {
  return all(
    "SELECT ma_bo_nho, loai, noi_dung, do_uu_tien, ngay_tao FROM bo_nho_dai_han WHERE ma_nguoi_dung = ? ORDER BY do_uu_tien DESC, ngay_tao DESC",
    [userId]
  );
}

// ─── SMART LOAD ─────────────────────────────────────────────────
// Load memory ưu tiên cao + memory liên quan từ khoá tin nhắn hiện tại
async function loadSmartMemory(userId, currentMessage = '') {
  if (!userId) return { text: '', memories: [] };
  try {
    const high = await all(
      "SELECT ma_bo_nho, loai, noi_dung, do_uu_tien FROM bo_nho_dai_han WHERE ma_nguoi_dung = ? AND do_uu_tien >= ? ORDER BY do_uu_tien DESC LIMIT ?",
      [userId, HIGH_PRIORITY, OVERALL_LIMIT]
    );
    const memories = high.slice();

    if (currentMessage) {
      const keywords = extractKeywords(currentMessage, 6);
      if (keywords.length) {
        const conds = keywords.map(() => "noi_dung LIKE ?").join(' OR ');
        const ctx = await all(
          `SELECT ma_bo_nho, loai, noi_dung, do_uu_tien FROM bo_nho_dai_han WHERE ma_nguoi_dung = ? AND (${conds}) ORDER BY do_uu_tien DESC LIMIT ?`,
          [userId, ...keywords.map(k => `%${k}%`), CONTEXT_MATCH_LIMIT]
        );
        for (const m of ctx) {
          if (!memories.some(x => x.ma_bo_nho === m.ma_bo_nho)) memories.push(m);
        }
      }
    }

    const sliced = memories.slice(0, OVERALL_LIMIT);
    const text = sliced.length
      ? '\n\n🧠 BỘ NHỚ VỀ NGƯỜI DÙNG:\n' + sliced.map(m => `- [${m.loai}] ${m.noi_dung}`).join('\n')
      : '';
    return { text, memories: sliced };
  } catch (e) {
    console.error('[Brain][Memory] loadSmartMemory error:', e.message);
    return { text: '', memories: [] };
  }
}

// ─── STATS ──────────────────────────────────────────────────────
async function getMemoryStats(userId) {
  try {
    const rows = await all(
      "SELECT loai, COUNT(*) AS count FROM bo_nho_dai_han WHERE ma_nguoi_dung = ? GROUP BY loai",
      [userId]
    );
    const total = rows.reduce((s, r) => s + r.count, 0);
    const byType = {};
    for (const r of rows) byType[r.loai] = r.count;
    return { total, byType };
  } catch (e) {
    return { total: 0, byType: {} };
  }
}

module.exports = {
  saveMemory,
  saveMemoryAuto,
  updateMemory,
  deleteMemory,
  listMemories,
  loadSmartMemory,
  getMemoryStats,
  classify,
  similarity,
};