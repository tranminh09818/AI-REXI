# SKILLS_USAGE.md - Hướng Dẫn Tự Động Dùng Skills

> **QUAN TRỌNG:** Khi đọc file này, tôi sẽ tự động dùng skill phù hợp khi người dùng yêu cầu.

---

## 🎬 VIDEO & MEDIA

| Người dùng nói | Skill tự động dùng | Cách dùng |
|----------------|---------------------|-----------|
| "Xem video này" / "Video nói gì" | `claude-video` | `python scripts/watch.py <URL>` |
| "Tải video" / "Download video" | `yt-dlp` | `yt-dlp <URL>` |
| "Phân tích video" / "Video có nội dung gì" | `claude-video` | Tải + transcript + tóm tắt |
| "Chuyển video thành text" | `claude-video` | Lấy transcript tự động |

---

## 📄 OFFICE & DOCUMENTS

| Người dùng nói | Skill tự động dùng | Cách dùng |
|----------------|---------------------|-----------|
| "Tạo PPT" / "Tạo slide" / "Tạo presentation" | `pptx` hoặc `PPT-MASTER` | Tạo PowerPoint từ prompt |
| "Tạo Word" / "Tạo báo cáo" | `officecli-docx` | Tạo file .docx |
| "Tạo Excel" / "Tạo bảng tính" | `officecli` | Tạo file .xlsx |
| "Đọc file Office" / "Phân tích file này" | `officecli` | Đọc và phân tích nội dung |
| "Sửa file PPT" / "Chỉnh slide" | `pptx` | Sửa file PowerPoint |
| "Tạo bài báo học thuật" | `officecli-academic-paper` | Định dạng APA, IEEE... |

---

## 🎨 DESIGN & UI

| Người dùng nói | Skill tự động dùng | Cách dùng |
|----------------|---------------------|-----------|
| "Thiết kế slide đẹp" | `ppt-visual` hoặc `elite-powerpoint-designer` | Thiết kế chuyên nghiệp |
| "Chuyển ảnh thành code" | Web search | Tìm tool UI to Code |
| "Tạo giao diện" / "Thiết kế UI" | `ppt-visual` | Thiết kế visual |

---

## 🌐 BROWSER & WEB

| Người dùng nói | Skill tự động dùng | Cách dùng |
|----------------|---------------------|-----------|
| "Mở website" / "Vào trang này" | `browser-use` | Điều khiển trình duyệt |
| "Chụp màn hình" / "Screenshot" | `screenshot` | Chụp ảnh màn hình |
| "Tìm thông tin" / "Search" | Web search | Tìm kiếm trên web |
| "Scraping data" / "Lấy data từ web" | `browser-use` | Thu thập dữ liệu |

---

## 🖥️ COMPUTER & SYSTEM

| Người dùng nói | Skill tự động dùng | Cách dùng |
|----------------|---------------------|-----------|
| "Chạy lệnh" / "Thực thi command" | `computer-use` | Chạy terminal |
| "Xóa file" / "Dọn rác" | `danger-zone` | ⚠️ Cẩn thận! |
| "Cài phần mềm" / "Install" | `computer-use` | Cài đặt tool |

---

## 🔧 DEVELOPMENT & CODE

| Người dùng nói | Skill tự động dùng | Cách dùng |
|----------------|---------------------|-----------|
| "Review code" / "Kiểm tra code" | `code-review` | Phân tích code |
| "Tìm lỗi" / "Debug" | `code-review` | Tìm bug |
| "Viết code" / "Code function này" | Viết code trực tiếp | Tạo code mới |

---

## 🛡️ SECURITY

| Người dùng nói | Skill tự động dùng | Cách dùng |
|----------------|---------------------|-----------|
| "Kiểm tra bảo mật" / "Security review" | `prompt-jailbreak` | Phân tích lỗ hổng |
| "Jailbreak prompt" / "Thử prompt" | `prompt-jailbreak` | Kỹ thuật prompt |

---

## 🌐 NETWORK

| Người dùng nói | Skill tự động dùng | Cách dùng |
|----------------|---------------------|-----------|
| "Kết nối server" / "SSH" | `ssh` | Kết nối SSH |
| "Remote server" / "Máy chủ" | `ssh` | Quản lý server |

---

## 📱 AUTOMATION TOOLS

| Người dùng nói | Tool tự động dùng | Cách dùng |
|----------------|-------------------|-----------|
| "Tạo Gmail hàng loạt" | `Gmail Creator Pro` | ⚠️ Vi phạm ToS |
| "Tải video TikTok" | `tiktok-downloader` | Tải video |
| "Tải video YouTube" | `VidBee` hoặc `yt-dlp` | Tải video |

---

## 🤖 AI AGENT FRAMEWORKS

| Người dùng nói | Tool tự động dùng | Cách dùng |
|----------------|-------------------|-----------|
| "Phối hợp nhiều agent" | `Omnigent` | Framework Python |
| "Tạo AI Agent" | `Google AI Agent Kit` | Xây agent local |
| "Nhớ ngữ cảnh" | `Claude-Mem` | Lưu memory phiên |

---

## 📊 SKILL COLLECTIONS

| Người dùng nói | Tool tự động dùng | Cách dùng |
|----------------|-------------------|-----------|
| "Tìm skill" / "Có skill nào" | `SKILLS_LIST.md` | Đọc danh sách |
| "Thêm skill mới" | GitHub search | Tìm và thêm |
| "Tìm 1000+ skills" | `awesome-agent-skills` | Kho skills lớn |

---

## 🔍 TREND & DATA

| Người dùng nói | Tool tự động dùng | Cách dùng |
|----------------|-------------------|-----------|
| "Trend gì đang hot" | Web search | Quét Reddit/YouTube/TikTok |
| "Phân tích thị trường" | Web search + data analysis | Thu thập và phân tích |
| "Xu hướng 30 ngày" | Web search | Tìm trend |

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **LUÔN hỏi xác nhận** trước khi dùng tool nguy hiểm (`danger-zone`)
2. **KIỂM TRA** skill có sẵn trong `.agents/skills/` trước khi dùng
3. **TÌM TRÊN GITHUB** nếu skill chưa có
4. **KHÔNG tự động** cài phần mềm mà không hỏi người dùng
5. **Ưu tiên** tool đã có sẵn trong system trước khi tìm tool mới

---

## 🎯 QUY TẮC HOẠT ĐỘNG

```
Khi nhận yêu cầu từ người dùng:
1. Đọc yêu cầu
2. Tìm skill phù hợp trong file này
3. Nếu có skill → Tự động dùng
4. Nếu không có → Tìm trên GitHub
5. Hỏi xác nhận nếu cần
6. Thực hiện và báo kết quả
```

---

**File này giúp tôi tự động dùng skill mà KHÔNG cần bạn nhắc!** 🚀