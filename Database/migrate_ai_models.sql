-- Migration: thêm bảng quản lý AI Models & Providers cho AI Rexi
-- Chạy script này nếu DB chưa có bảng ai_models và ai_providers

CREATE TABLE IF NOT EXISTS ai_providers (
    ma_nha_cung_cap TEXT PRIMARY KEY,
    ten_hien_thi TEXT NOT NULL,
    base_url TEXT,
    can_api_key INTEGER DEFAULT 1,
    placeholder TEXT,
    thu_tu INTEGER DEFAULT 0,
    kich_hoat INTEGER DEFAULT 1,
    ngay_tao TEXT DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_models (
    ma_model TEXT PRIMARY KEY,
    ma_nha_cung_cap TEXT NOT NULL,
    ten_hien_thi TEXT NOT NULL,
    loai TEXT DEFAULT 'free',
    thu_tu_hien_thi INTEGER DEFAULT 0,
    kich_hoat INTEGER DEFAULT 1,
    ngay_tao TEXT DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ma_nha_cung_cap) REFERENCES ai_providers(ma_nha_cung_cap)
);

INSERT OR IGNORE INTO ai_providers (ma_nha_cung_cap, ten_hien_thi, base_url, can_api_key, placeholder, thu_tu)
VALUES
  ('gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta', 1, 'AIzaSy...', 1),
  ('openai', 'OpenAI GPT', 'https://api.openai.com/v1', 1, 'sk-proj-...', 2),
  ('claude', 'Anthropic Claude', 'https://api.anthropic.com', 1, 'sk-ant-...', 3),
  ('deepseek', 'DeepSeek AI', 'https://api.deepseek.com', 1, 'sk-...', 4),
  ('groq', 'Groq Cloud', 'https://api.groq.com/openai/v1', 1, 'gsk_...', 5),
  ('github', 'GitHub Models', 'https://models.github.ai/inference', 1, 'gh_...', 6),
  ('ollama', 'Ollama Local', 'http://localhost:11434/v1', 0, 'http://localhost:11434', 7),
  ('opencode', 'OpenCode Agent', 'http://localhost:8080/v1', 0, 'Internal Engine', 8),
  ('freellmapi', 'Free LLM API', 'http://localhost:8080/v1', 0, 'http://localhost:8080/v1', 9),
  ('custom', 'Custom OpenAI-compatible', '', 1, 'https://openrouter.ai/api/v1', 10);
