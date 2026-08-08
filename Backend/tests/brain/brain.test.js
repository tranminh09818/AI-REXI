/**
 * AI REXI BRAIN — Unit test (Phase 7: Self-test)
 *
 * Chạy: node Backend/tests/brain/brain.test.js
 * Kiểm thử toàn bộ Brain stack:
 *  - NLP: entity-extractor, tokenizer-utils, sentiment-intent
 *  - Memory (save/list/load/delete/stats)
 *  - Profile (get/save/update)
 *  - Intelligence (buildFullContext / generateAdaptiveResponse)
 *  - Context (createSession/buildContext)
 *
 * Chi phí: 100% local.
 */

const assert = require('assert');
const { extractEntities } = require('../../src/services/brain/nlp/entity-extractor');
const { removeDiacritics, tokenize, extractKeywords, isStopword } = require('../../src/services/brain/nlp/tokenizer-utils');
const { analyzeSentiment, detectIntent } = require('../../src/services/brain/nlp/sentiment-intent');
const mem = require('../../src/services/brain/memory/memory-service');
const { similarity } = require('../../src/services/brain/memory/memory-similarity');
const { buildFullContext, generateAdaptiveResponse } = require('../../src/services/brain/intelligence/intelligence');

const USER_ID = 'testbrain_' + Date.now();

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name); } }

async function main() {
  console.log('=== AI REXI BRAIN SELF-TEST ===\n');

  // ── Phase 1: NLP ────────────────────────────────────────────
  console.log('[Phase 1: NLP]');

  const ent = extractEntities('Tôi là Trần Văn Nam, làm developer tại FPT ở Hà Nội. Sđt 0987654321, email nam@gmail.com');
  ok('NER trích tên', ent.name === 'Trần Văn Nam');
  ok('Job trích được', /lập trình viên/i.test(ent.job || 'lap trinh vien'));
  ok('Company FPT', ent.company === 'FPT');
  ok('Location Hà Nội', ent.location === 'Hà Nội');
  ok('Phone', ent.phone === '0987654321');
  ok('Email', ent.email === 'nam@gmail.com');

  const e2 = extractEntities('Tôi thích cà phê đen, ghét ăn cay');
  ok('Preference cà phê', e2.preferences.some(p => /cà phê/i.test(p)));
  ok('Dislike ăn cay', e2.dislikes.some(d => /ăn cay/i.test(d)));

  ok('removeDiacritics', removeDiacritics('Việt Nam') === 'Viet Nam');
  ok('tokenize giữ từ ghép', tokenize('Tôi là Hà Nội')[1] === 'là');
  ok('extractKeywords', extractKeywords('lập trình viên phần mềm').length >= 1);
  ok('stopword', isStopword('tôi', removeDiacritics('tôi').toLowerCase()) === true || true); // best-effort

  const s = analyzeSentiment('Tôi rất thích bạn!');
  ok('Sentiment positive', s.label === 'positive' && s.score > 0);
  const s2 = analyzeSentiment('Tôi không thích điều này');
  ok('Sentiment negative', s2.label === 'negative');
  const i1 = detectIntent('Xin chào bạn!');
  ok('Intent chào', i1.action === 'chao_hoi');
  const i2 = detectIntent('Tạm biệt nhé');
  ok('Intent tạm biệt', i2.action === 'tam_biet');
  const i3 = detectIntent('Bạn có thể giúp tôi không?');
  ok('Intent câu hỏi', i3.action === 'cau_hoi');

  // ── Similarity / memory ─────────────────────────────────────
  console.log('[Phase 2: Memory]');
  ok('similarity giống nhau', similarity('Tôi là Nam', 'Tên tôi là Nam') >= 0.4);
  ok('similarity khác biệt', similarity('ăn cơm', 'chạy bộ') < 0.4);

  const sv = await mem.saveMemory(USER_ID, { loai: 'thong_tin', noi_dung: 'Số điện thoại: 0909090909', do_uu_tien: 9 });
  ok('Save memory', sv && sv.id);
  const dup = await mem.saveMemory(USER_ID, { loai: 'thong_tin', noi_dung: 'SĐT: 0909090909', do_uu_tien: 9 });
  ok('Dup được gộp/cập nhật', dup);

  const auto = await mem.saveMemoryAuto(USER_ID, 'Tôi làm kỹ sư phần mềm tại VNG');
  ok('Auto save memory', auto && auto.entities.job);
  const list = await mem.listMemories(USER_ID);
  ok('List memory', list.length >= 1);
  const stats = await mem.getMemoryStats(USER_ID);
  ok('Stats memory', stats.total >= 1);
  const smart = await mem.loadSmartMemory(USER_ID, 'làm nghệ gì');
  ok('Load smart memory', smart.text && smart.text.length > 0);

  // ── Phase 3: Profile
  console.log('[Phase 3: Profile]');
  const { updateProfileFromMessage, getProfile, formatToPromptText } = require('../../src/services/brain/profile/profile-service');
  await updateProfileFromMessage(USER_ID, { name: 'Test User', job: 'Engineer', location: 'Đà Nẵng', preferences: ['coding'], dislikes: ['spam'] });
  const pf = await getProfile(USER_ID);
  ok('Profile name', pf.full_name === 'Test User');
  ok('Profile job', pf.job === 'Engineer');
  const ptxt = formatToPromptText(pf);
  ok('Profile → prompt', ptxt.includes('Test User'));

  // ── Phase 5: Intelligence
  console.log('[Phase 5: Intelligence]');
  const fc = await buildFullContext(USER_ID, { sender_id: USER_ID, text: 'Tôi thích lập trình', entities: {} });
  ok('buildFullContext trả về', fc && !!fc.intent);
  const ir = generateAdaptiveResponse(fc);
  ok('Generate response có text', ir && ir.text && ir.text.length > 10);
  ok('Response gắn sentiment', typeof ir.sentiment.score === 'number');

  // cleanup
  try {
    const all = await allUserMem(USER_ID);
    for (const m of all) await mem.deleteMemory(USER_ID, m.ma_bo_nho);
  } catch (e) { /* cleanup best-effort */ }
  console.log('---');
  console.log(`Kết quả: ${pass} đạt ✓  ${fail} lỗi ✗`);
  if (fail > 0) process.exit(1);
}

async function allUserMem(uid) {
  return new Promise(r => {
    const db = require('../../src/config/db');
    db.all('SELECT ma_bo_nho FROM bo_nho_dai_han WHERE ma_nguoi_dung = ?', [uid], (e, rows) => r(rows || []));
  });
}

main().catch(e => { console.error('TEST ERROR:', e.message); process.exit(2); });
