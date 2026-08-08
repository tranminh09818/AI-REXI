/**
 * Script seed toàn bộ skills vào database (v2)
 * Chạy: node scripts/seed_skills.js
 * 
 * QUAN TRỌNG: Giữ nguyên s1=ponytail, s2=screenshot, s3=web-browser (legacy)
 * để tránh xung đột ID với DB hiện tại.
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'Database', 'tro_ly_ai.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Lỗi kết nối DB:', err.message);
    process.exit(1);
  }
  console.log('Đã kết nối DB tại:', dbPath);
  seedSkills();
});

function seedSkills() {
  // GIỮ NGUYÊN s1=ponytail, s2=screenshot, s3=web-browser (legacy) để tránh duplicate
  const skillsList = [
    // Legacy skills (giữ nguyên ID cũ để tránh conflict DB)
    ["s1", "ponytail", "Chế độ tối giản", "Tự động rút gọn code, ưu tiên thư viện lõi.", "kich_hoat"],
    ["s2", "windows-interactive-screenshot", "Chụp ảnh màn hình (Legacy)", "Agent chụp màn hình máy tính thông qua Scheduled Tasks.", "kich_hoat"],
    ["s3", "web-browser", "Duyệt Web", "Tìm kiếm thông tin thời gian thực.", "kich_hoat"],
    
    // 🎨 THIẾT KẾ & UI/UX
    ["s4", "1-thiet-ke", "Thiết Kế & UI/UX (22 skills)", "Thiết kế giao diện, design system, brand identity, frontend visual.", "kich_hoat"],
    ["s5", "accessibility", "Kiểm Thử Truy Cập", "Đảm bảo website thân thiện WCAG.", "kich_hoat"],
    ["s6", "brand-identity", "Nhận Diện Thương Hiệu", "Xây dựng bộ nhận diện thương hiệu.", "kich_hoat"],
    ["s7", "design-system", "Hệ Thống Design", "Tạo và quản lý Design System.", "kich_hoat"],
    ["s8", "image-to-code", "Ảnh → Code", "Chuyển đổi Figma/PSD sang React/Tailwind.", "kich_hoat"],
    ["s9", "hallmark", "UI Design Hallmark", "Thiết kế UI tránh phong cách AI-generated.", "kich_hoat"],
    
    // 🤖 AI & AGENTS
    ["s10", "2-ai", "AI & Agent (9 skills)", "AI agents, RAG, browser automation, prompt engineering.", "kich_hoat"],
    ["s11", "browser-use", "Điều Khiển Browser", "Tự động hóa Chrome CDP: scraping, test, screenshot.", "kich_hoat"],
    ["s12", "computer-vision-opencv", "Thị Giác Máy Tính", "Xử lý ảnh/video OpenCV, PyTorch.", "kich_hoat"],
    ["s13", "free-llm-apis", "API LLM Miễn Phí", "Google, Groq, GitHub, NVIDIA, OpenRouter APIs.", "kich_hoat"],
    ["s14", "llava", "LLaVA Vision AI", "Mô hình đa phương thức phân tích hình ảnh.", "kich_hoat"],
    ["s15", "tokenrouter", "TokenRouter", "API Gateway 300+ provider AI, auto-fallback.", "kich_hoat"],
    ["s16", "prompt-jailbreak", "Prompt Jailbreak", "Kỹ thuật AI prompt engineering nâng cao.", "kich_hoat"],
    ["s17", "prompt-jailbreak-universal", "Prompt Jailbreak Universal", "Prompt jailbreak đa nền tảng LLM.", "kich_hoat"],
    
    // 💻 PHÁT TRIỂN
    ["s18", "3-phat-trien", "Phát Triển (6 skills)", "Backend patterns, API, code analysis, SEO.", "kich_hoat"],
    ["s19", "code-review", "Review Code", "Phân tích code: cấu trúc, bảo mật, best practices.", "kich_hoat"],
    ["s20", "codeql", "Bảo Mật Code", "Quét lỗ hổng bảo mật CodeQL.", "kich_hoat"],
    
    // 🧪 KIỂM THỬ
    ["s21", "4-kiem-thu", "Kiểm Thử (2 skills)", "E2E testing Playwright, TestCafe.", "kich_hoat"],
    ["s22", "playwright-e2e", "Playwright E2E", "Test tự động đầu cuối.", "kich_hoat"],
    ["s23", "screen-reader-testing", "Screen Reader Test", "Test VoiceOver, NVDA, JAWS.", "kich_hoat"],
    
    // 📄 VĂN PHÒNG
    ["s24", "5-van-phong", "Văn Phòng (3 skills)", "DOCX, PDF, design documentation.", "kich_hoat"],
    ["s25", "docx-master", "DOCX Master", "Tạo và chỉnh sửa file Word.", "kich_hoat"],
    ["s26", "stirling-pdf", "Xử Lý PDF", "Chuyển đổi, nén, merge PDF.", "kich_hoat"],
    ["s27", "pptx", "PowerPoint", "Tạo, đọc, chỉnh sửa file .pptx.", "kich_hoat"],
    ["s28", "ppt-visual", "Thiết Kế Slide", "Design layout, đồ họa PowerPoint.", "kich_hoat"],
    ["s29", "elite-powerpoint-designer", "PowerPoint Elite", "Slide chất lượng Apple/Microsoft.", "kich_hoat"],
    
    // 🛠 TIỆN ÍCH
    ["s30", "6-tien-ich", "Tiện Ích (4 skills)", "Deploy, code generation, repo ingestion.", "kich_hoat"],
    ["s31", "deploy-to-vercel", "Deploy Vercel", "Triển khai Next.js/React lên Vercel.", "kich_hoat"],
    ["s32", "gitingest", "Phân Tích Repo", "Đọc và phân tích repository code.", "kich_hoat"],
    
    // 🌐 MẠNG & IPTV
    ["s33", "7-mang", "Mạng & Domain (3 skills)", "IPTV, free domain, social media.", "kich_hoat"],
    ["s34", "iptv-channels", "IPTV Channels", "Xem TV trực tuyến: M3U, EPG, hàng ngàn kênh.", "kich_hoat"],
    ["s35", "iptv-global", "IPTV Global", "Kênh truyền hình quốc tế toàn cầu.", "kich_hoat"],
    ["s36", "freedomain", "Tên Miền Miễn Phí", "Đăng ký .eu.org, .tk, .ml miễn phí.", "kich_hoat"],
    
    // ⚙️ HỆ THỐNG
    ["s37", "8-he-thong", "Hệ Thống (3 skills)", "Quy tắc làm việc, auto-pilot, self-learning.", "kich_hoat"],
    ["s38", "computer-use", "Điều Khiển Máy Tính", "Tương tác desktop: click, type, scroll.", "kich_hoat"],
    ["s39", "ssh", "SSH Remote", "Kết nối server từ xa, chuyển file SCP.", "kich_hoat"],
    
    // 🖥 ĐA PHƯƠNG TIỆN
    ["s40", "screenshot", "Chụp Màn Hình Desktop", "Chụp ảnh màn hình Windows.", "kich_hoat"],
    ["s41", "vietnamese-tts", "Giọng Đọc Tiếng Việt (TTS)", "Chuyển văn bản thành giọng nói tiếng Việt.", "kich_hoat"],
    ["s42", "vision-analysis", "Phân Tích Hình Ảnh", "Mô tả và trích xuất thông tin từ ảnh.", "kich_hoat"],
    ["s43", "watch", "Tải & Phân Tích Video", "Tải video, trích xuất khung hình, transcript.", "kich_hoat"],
    ["s44", "claude-video", "Claude Video Analysis", "Phân tích video với Claude AI.", "kich_hoat"],
    ["s45", "glmv-grounding", "GLM-V Grounding", "Bounding-box, theo dõi đối tượng.", "kich_hoat"],
  ];

  let total = 0;
  let pending = skillsList.length;
  
  skillsList.forEach(s => {
    db.run(
      "INSERT OR IGNORE INTO ky_nang (ma_ky_nang, ten_ky_nang, tieu_de, mo_ta, trang_thai) VALUES (?, ?, ?, ?, ?)",
      s,
      function(err) {
        if (err) {
          console.error('Lỗi insert skill', s[1], ':', err.message);
        } else if (this.changes > 0) {
          total++;
        }
        pending--;
        if (pending === 0) {
          db.get("SELECT COUNT(*) as total FROM ky_nang", [], (err, row) => {
            console.log(`\n✅ Đã seed xong! Tổng số skills trong DB: ${row.total}`);
            console.log(`   - Thêm mới: ${total}`);
            console.log(`   - Đã tồn tại: ${skillsList.length - total}`);
            db.close();
          });
        }
      }
    );
  });
}
