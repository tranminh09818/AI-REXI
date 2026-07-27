/**
 * AI REXI - Teencode & Prompt Normalizer Middleware
 * Standardizes informal Vietnamese shortcuts, teencode, and common typos
 * before passing prompts to AI models (Gemini, Ollama, OpenCode).
 */

const TEENCODE_MAP = {
  'tư vấn giùm t': 'Hãy tư vấn giúp tôi',
  'tu van gium t': 'Hãy tư vấn giúp tôi',
  'tư vấn giúp t': 'Hãy tư vấn giúp tôi',
  'fix lỗi này coi': 'Hãy sửa lỗi này giúp tôi',
  'fix loi nay coi': 'Hãy sửa lỗi này giúp tôi',
  'chay build di': 'Hãy chạy câu lệnh build',
  'chạy build đi': 'Hãy chạy câu lệnh build',
  'code ho cai form': 'Hãy viết giúp tôi form',
  'code hộ cái form': 'Hãy viết giúp tôi form',
  'sđt': 'số điện thoại',
  'sdt': 'số điện thoại',
  'cmt': 'bình luận',
  'sp': 'sản phẩm',
  'ko': 'không',
  'k0': 'không',
  'k': 'không',
  'đk': 'được',
  'dk': 'được',
  'dc': 'được',
  'đc': 'được',
  'h': 'hiện tại',
  't': 'tôi',
  'm': 'bạn',
  'r': 'rồi',
  'z': 'vậy',
  'v': 'vậy',
  'ngta': 'người ta',
  'bây h': 'bây giờ',
  'bay h': 'bây giờ',
  'khi nào': 'khi nào',
  'dự án': 'dự án',
  'db': 'cơ sở dữ liệu',
  'csdl': 'cơ sở dữ liệu',
  'api': 'API',
  'config': 'cấu hình'
};

function normalizePrompt(text) {
  if (!text || typeof text !== 'string') return text;

  let normalized = text;

  // 1. Match multi-word phrase replacements
  for (const [pattern, replacement] of Object.entries(TEENCODE_MAP)) {
    if (pattern.includes(' ')) {
      const regex = new RegExp(pattern.replace(/([.*+?^${}()|[\]\\])/g, '\\$1'), 'gi');
      normalized = normalized.replace(regex, replacement);
    }
  }

  // 2. Match single word tokens with boundary checks
  const tokens = normalized.split(/(\s+)/);
  const resultTokens = tokens.map(token => {
    const lower = token.toLowerCase();
    if (TEENCODE_MAP[lower] && !lower.includes(' ')) {
      return TEENCODE_MAP[lower];
    }
    return token;
  });

  return resultTokens.join('');
}

function promptNormalizerMiddleware(req, res, next) {
  if (req.body && req.body.noi_dung) {
    req.body.noi_dung_goc = req.body.noi_dung;
    req.body.noi_dung = normalizePrompt(req.body.noi_dung);
  }
  if (req.body && req.body.prompt) {
    req.body.prompt_goc = req.body.prompt;
    req.body.prompt = normalizePrompt(req.body.prompt);
  }
  next();
}

module.exports = {
  normalizePrompt,
  promptNormalizerMiddleware
};
