/**
 * Script seed toàn bộ skills từ Backend/scripts/seed_skills.js vào SQL Server
 */
const sql = require('mssql/msnodesqlv8');

const config = {
  connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=.\\SQLEXPRESS;Database=AI_REXI;Trusted_Connection=yes;'
};

const skillsList = [
  ["s1", "ponytail", "Chế độ tối giản", "Tự động rút gọn code, ưu tiên thư viện lõi.", "kich_hoat"],
  ["s2", "windows-interactive-screenshot", "Chụp ảnh màn hình (Legacy)", "Agent chụp màn hình máy tính thông qua Scheduled Tasks.", "kich_hoat"],
  ["s3", "web-browser", "Duyệt Web", "Tìm kiếm thông tin thời gian thực.", "kich_hoat"],
  ["s4", "1-thiet-ke", "Thiết Kế & UI/UX (22 skills)", "Thiết kế giao diện, design system, brand identity, frontend visual.", "kich_hoat"],
  ["s5", "accessibility", "Kiểm Thử Truy Cập", "Đảm bảo website thân thiện WCAG.", "kich_hoat"],
  ["s6", "brand-identity", "Nhận Diện Thương Hiệu", "Xây dựng bộ nhận diện thương hiệu.", "kich_hoat"],
  ["s7", "design-system", "Hệ Thống Design", "Tạo và quản lý Design System.", "kich_hoat"],
  ["s8", "image-to-code", "Ảnh → Code", "Chuyển đổi Figma/PSD sang React/Tailwind.", "kich_hoat"],
  ["s9", "hallmark", "UI Design Hallmark", "Thiết kế UI tránh phong cách AI-generated.", "kich_hoat"],
  ["s10", "2-ai", "AI & Agent (9 skills)", "AI agents, RAG, browser automation, prompt engineering.", "kich_hoat"],
  ["s11", "browser-use", "Điều Khiển Browser", "Tự động hóa Chrome CDP: scraping, test, screenshot.", "kich_hoat"],
  ["s12", "computer-vision-opencv", "Thị Giác Máy Tính", "Xử lý ảnh/video OpenCV, PyTorch.", "kich_hoat"],
  ["s13", "free-llm-apis", "API LLM Miễn Phí", "Google, Groq, GitHub, NVIDIA, OpenRouter APIs.", "kich_hoat"],
  ["s14", "llava", "LLaVA Vision AI", "Mô hình đa phương thức phân tích hình ảnh.", "kich_hoat"],
  ["s15", "tokenrouter", "TokenRouter", "API Gateway 300+ provider AI, auto-fallback.", "kich_hoat"],
  ["s16", "prompt-jailbreak", "Prompt Jailbreak", "Kỹ thuật AI prompt engineering nâng cao.", "kich_hoat"],
  ["s17", "prompt-jailbreak-universal", "Prompt Jailbreak Universal", "Prompt jailbreak đa nền tảng LLM.", "kich_hoat"],
  ["s18", "3-phat-trien", "Phát Triển (6 skills)", "Backend patterns, API, code analysis, SEO.", "kich_hoat"],
  ["s19", "code-review", "Review Code", "Phân tích code: cấu trúc, bảo mật, best practices.", "kich_hoat"],
  ["s20", "codeql", "Bảo Mật Code", "Quét lỗ hổng bảo mật CodeQL.", "kich_hoat"],
  ["s21", "4-kiem-thu", "Kiểm Thử (2 skills)", "E2E testing Playwright, TestCafe.", "kich_hoat"],
  ["s22", "playwright-e2e", "Playwright E2E", "Test tự động đầu cuối.", "kich_hoat"],
  ["s23", "screen-reader-testing", "Screen Reader Test", "Test VoiceOver, NVDA, JAWS.", "kich_hoat"],
  ["s24", "5-van-phong", "Văn Phòng (3 skills)", "DOCX, PDF, design documentation.", "kich_hoat"],
  ["s25", "docx-master", "DOCX Master", "Tạo và chỉnh sửa file Word.", "kich_hoat"],
  ["s26", "stirling-pdf", "Xử Lý PDF", "Chuyển đổi, nén, merge PDF.", "kich_hoat"],
  ["s27", "6-tien-ich", "Tiện Ích (3 skills)", "Deploy, code gen, repo ingestion.", "kich_hoat"],
  ["s28", "auto-deploy", "Auto Deploy", "Tự động deploy dự án.", "kich_hoat"],
  ["s29", "repo-ingest", "Repo Ingest", "Đọc và tổng hợp toàn bộ repository.", "kich_hoat"],
  ["s30", "7-mang", "Mạng & Domain (2 skills)", "IPTV streaming, free domain services.", "kich_hoat"],
  ["s31", "free-domain", "Domain Miễn Phí", "Cấu hình domain miễn phí.", "kich_hoat"],
  ["s32", "iptv-stream", "IPTV Streaming", "Quản lý luồng IPTV.", "kich_hoat"],
  ["s33", "8-he-thong", "Hệ Thống (1 skill)", "Quy tắc làm việc, cấu hình agent.", "kich_hoat"],
  ["s34", "system-rules", "Quy Tắc Hệ Thống", "Cấu hình và quy tắc hệ thống.", "kich_hoat"],
  ["s35", "computer-use", "Điều Khiển Máy Tính", "Thao tác ứng dụng desktop qua Orca CLI.", "kich_hoat"],
  ["s36", "glmv-grounding", "GLM-V Grounding", "Định vị tọa độ và bounding box hình ảnh.", "kich_hoat"],
  ["s37", "vision-analysis", "Phân Tích Hình Ảnh", "MiniMax vision MCP tool cho OCR, mô tả ảnh.", "kich_hoat"],
  ["s38", "ssh", "Kết Nối SSH", "Quản lý SSH connection, key, SCP file transfer.", "kich_hoat"],
  ["s39", "elite-powerpoint-designer", "Thiết Kế PowerPoint Đỉnh Cao", "Tạo slide deck PowerPoint chuyên nghiệp.", "kich_hoat"],
  ["s40", "ppt-visual", "Visual Slide Presentation", "Thiết kế concept hình ảnh và slide layout.", "kich_hoat"],
  ["s41", "pptx", "Xử Lý File PPTX", "Tạo, đọc, sửa, gộp file PowerPoint .pptx.", "kich_hoat"],
  ["s42", "ponytail-audit", "Audit Mã Nguồn Ponytail", "Quét toàn bộ repo tìm code thừa, over-engineering.", "kich_hoat"],
  ["s43", "ponytail-debt", "Sổ Nợ Code Ponytail", "Tổng hợp các ghi chú ponytail: comment trong repo.", "kich_hoat"],
  ["s44", "ponytail-gain", "Bảng Điểm Ponytail", "Hiển thị đo lường hiệu quả giảm thiểu code.", "kich_hoat"],
  ["s45", "ponytail-help", "Trợ Giúp Ponytail", "Thẻ tra cứu nhanh lệnh và chế độ ponytail.", "kich_hoat"]
];

async function seedSqlServer() {
  try {
    const pool = await sql.connect(config);
    console.log('Connected to SQL Server AI_REXI');

    for (const item of skillsList) {
      const [ma_ky_nang, ten_ky_nang, tieu_de, mo_ta, trang_thai] = item;
      await pool.request()
        .input('ma', sql.NVarChar(64), ma_ky_nang)
        .input('ten', sql.NVarChar(255), ten_ky_nang)
        .input('tieu_de', sql.NVarChar(255), tieu_de)
        .input('mo_ta', sql.NVarChar(sql.MAX), mo_ta)
        .input('trang_thai', sql.NVarChar(20), trang_thai)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM ky_nang WHERE ma_ky_nang = @ma)
          BEGIN
            INSERT INTO ky_nang (ma_ky_nang, ten_ky_nang, tieu_de, mo_ta, trang_thai)
            VALUES (@ma, @ten, @tieu_de, @mo_ta, @trang_thai);
          END
        `);
    }
    console.log(`Successfully seeded ${skillsList.length} skills into SQL Server AI_REXI!`);
    await pool.close();
  } catch (err) {
    console.error('Error seeding SQL Server:', err);
  }
}

seedSqlServer();
