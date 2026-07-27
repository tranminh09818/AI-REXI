USE AI_REXI;
GO

-- Seed danh sách 45 Kỹ Năng / Skills của AI Agent
IF NOT EXISTS (SELECT 1 FROM ky_nang WHERE ma_ky_nang = 's1')
BEGIN
    INSERT INTO ky_nang (ma_ky_nang, ten_ky_nang, tieu_de, mo_ta, trang_thai) VALUES
    ('s1', 'ponytail', N'Chế độ tối giản', N'Tự động rút gọn code, ưu tiên thư viện lõi.', 'kich_hoat'),
    ('s2', 'windows-interactive-screenshot', N'Chụp ảnh màn hình (Legacy)', N'Agent chụp màn hình máy tính thông qua Scheduled Tasks.', 'kich_hoat'),
    ('s3', 'web-browser', N'Duyệt Web', N'Tìm kiếm thông tin thời gian thực.', 'kich_hoat'),
    ('s4', '1-thiet-ke', N'Thiết Kế & UI/UX (22 skills)', N'Thiết kế giao diện, design system, brand identity, frontend visual.', 'kich_hoat'),
    ('s5', 'accessibility', N'Kiểm Thử Truy Cập', N'Đảm bảo website thân thiện WCAG.', 'kich_hoat'),
    ('s6', 'brand-identity', N'Nhận Diện Thương Hiệu', N'Xây dựng bộ nhận diện thương hiệu.', 'kich_hoat'),
    ('s7', 'design-system', N'Hệ Thống Design', N'Tạo và quản lý Design System.', 'kich_hoat'),
    ('s8', 'image-to-code', N'Ảnh → Code', N'Chuyển đổi Figma/PSD sang React/Tailwind.', 'kich_hoat'),
    ('s9', 'hallmark', N'UI Design Hallmark', N'Thiết kế UI tránh phong cách AI-generated.', 'kich_hoat'),
    ('s10', '2-ai', N'AI & Agent (9 skills)', N'AI agents, RAG, browser automation, prompt engineering.', 'kich_hoat'),
    ('s11', 'browser-use', N'Điều Khiển Browser', N'Tự động hóa Chrome CDP: scraping, test, screenshot.', 'kich_hoat'),
    ('s12', 'computer-vision-opencv', N'Thị Giác Máy Tính', N'Xử lý ảnh/video OpenCV, PyTorch.', 'kich_hoat'),
    ('s13', 'free-llm-apis', N'API LLM Miễn Phí', N'Google, Groq, GitHub, NVIDIA, OpenRouter APIs.', 'kich_hoat'),
    ('s14', 'llava', N'LLaVA Vision AI', N'Mô hình đa phương thức phân tích hình ảnh.', 'kich_hoat'),
    ('s15', 'omniroute', N'AI Gateway', N'Cổng kết nối đa provider AI, auto-fallback.', 'kich_hoat'),
    ('s16', 'prompt-jailbreak', N'Prompt Jailbreak', N'Kỹ thuật AI prompt engineering nâng cao.', 'kich_hoat'),
    ('s17', 'prompt-jailbreak-universal', N'Prompt Jailbreak Universal', N'Prompt jailbreak đa nền tảng LLM.', 'kich_hoat'),
    ('s18', '3-phat-trien', N'Phát Triển (6 skills)', N'Backend patterns, API, code analysis, SEO.', 'kich_hoat'),
    ('s19', 'code-review', N'Review Code', N'Phân tích code: cấu trúc, bảo mật, best practices.', 'kich_hoat'),
    ('s20', 'codeql', N'Bảo Mật Code', N'Quét lỗ hổng bảo mật CodeQL.', 'kich_hoat'),
    ('s21', '4-kiem-thu', N'Kiểm Thử (2 skills)', N'E2E testing Playwright, TestCafe.', 'kich_hoat'),
    ('s22', 'playwright-e2e', N'Playwright E2E', N'Test tự động đầu cuối.', 'kich_hoat'),
    ('s23', 'screen-reader-testing', N'Screen Reader Test', N'Test VoiceOver, NVDA, JAWS.', 'kich_hoat'),
    ('s24', '5-van-phong', N'Văn Phòng (3 skills)', N'DOCX, PDF, design documentation.', 'kich_hoat'),
    ('s25', 'docx-master', N'DOCX Master', N'Tạo và chỉnh sửa file Word.', 'kich_hoat'),
    ('s26', 'stirling-pdf', N'Xử Lý PDF', N'Chuyển đổi, nén, merge PDF.', 'kich_hoat'),
    ('s27', '6-tien-ich', N'Tiện Ích (3 skills)', N'Deploy, code gen, repo ingestion.', 'kich_hoat'),
    ('s28', 'auto-deploy', N'Auto Deploy', N'Tự động deploy dự án.', 'kich_hoat'),
    ('s29', 'repo-ingest', N'Repo Ingest', N'Đọc và tổng hợp toàn bộ repository.', 'kich_hoat'),
    ('s30', '7-mang', N'Mạng & Domain (2 skills)', N'IPTV streaming, free domain services.', 'kich_hoat'),
    ('s31', 'free-domain', N'Domain Miễn Phí', N'Cấu hình domain miễn phí.', 'kich_hoat'),
    ('s32', 'iptv-stream', N'IPTV Streaming', N'Quản lý luồng IPTV.', 'kich_hoat'),
    ('s33', '8-he-thong', N'Hệ Thống (1 skill)', N'Quy tắc làm việc, cấu hình agent.', 'kich_hoat'),
    ('s34', 'system-rules', N'Quy Tắc Hệ Thống', N'Cấu hình và quy tắc hệ thống.', 'kich_hoat'),
    ('s35', 'computer-use', N'Điều Khiển Máy Tính', N'Thao tác ứng dụng desktop qua Orca CLI.', 'kich_hoat'),
    ('s36', 'glmv-grounding', N'GLM-V Grounding', N'Định vị tọa độ và bounding box hình ảnh.', 'kich_hoat'),
    ('s37', 'vision-analysis', N'Phân Tích Hình Ảnh', N'MiniMax vision MCP tool cho OCR, mô tả ảnh.', 'kich_hoat'),
    ('s38', 'ssh', N'Kết Nối SSH', N'Quản lý SSH connection, key, SCP file transfer.', 'kich_hoat'),
    ('s39', 'elite-powerpoint-designer', N'Thiết Kế PowerPoint Đỉnh Cao', N'Tạo slide deck PowerPoint chuyên nghiệp.', 'kich_hoat'),
    ('s40', 'ppt-visual', N'Visual Slide Presentation', N'Thiết kế concept hình ảnh và slide layout.', 'kich_hoat'),
    ('s41', 'pptx', N'Xử Lý File PPTX', N'Tạo, đọc, sửa, gộp file PowerPoint .pptx.', 'kich_hoat'),
    ('s42', 'ponytail-audit', N'Audit Mã Nguồn Ponytail', N'Quét toàn bộ repo tìm code thừa, over-engineering.', 'kich_hoat'),
    ('s43', 'ponytail-debt', N'Sổ Nợ Code Ponytail', N'Tổng hợp các ghi chú ponytail: comment trong repo.', 'kich_hoat'),
    ('s44', 'ponytail-gain', N'Bảng Điểm Ponytail', N'Hiển thị đo lường hiệu quả giảm thiểu code.', 'kich_hoat'),
    ('s45', 'ponytail-help', N'Trợ Giúp Ponytail', N'Thẻ tra cứu nhanh lệnh và chế độ ponytail.', 'kich_hoat');
END
GO

PRINT 'Seeded 45 skills successfully!';
GO
