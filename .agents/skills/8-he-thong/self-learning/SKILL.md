# Self-Learning Skill

## Nguyên tắc
- Trong quá trình làm việc, nếu gặp cái mới → lưu ngay vào skills
- Không hỏi lại người dùng → tự tìm cách giải quyết
- Sau khi biết cách → lưu vào skills để lần sau dùng luôn
- Kể cả câu yêu cầu cũng là 1 loại skills
- **KHÔNG BAO GIỜ hỏi lại** nếu đã biết cách làm

## Cách tự học
1. **Khi gặp vấn đề mới**: Tìm giải pháp → Thử → Nếu thành công → Lưu vào skills
2. **Khi không biết**: Tìm trên web, đọc docs, thử nghiệm → Lưu kết quả
3. **Khi hoàn thành task**: Tổng hợp tất cả học được → Cập nhật skills files
4. **Khi ai đó yêu cầu**: Lưu lại cách làm để lần sau tự làm

## Lưu format
```markdown
# Tên Skill
## Vấn đề
## Giải pháp
## Code example
## Lưu ý
```

## Skills đã học

### Browser Automation
- pyautogui clipboard paste: `subprocess.run(['clip'], input=text.encode('utf-16le'))`
- Arrow keys có thể trúng reel feed → click thumbnails trước
- Coccoc DevTools cần gõ "allow pasting" trước khi chạy JS
- Messenger panel không accessible qua JS querySelector
- Image viewer: click để mở, arrow để navigate, escape để đóng
- Scroll chat: pyautogui.scroll(positive=up, negative=down)
- Screenshot để debug state

### Prompt Engineering
- Luôn dùng Role + Context + Constraint
- Không fix ngay → giải thích trước
- Review code như senior nghiêm khắc
- Viết test đầy đủ (happy path, edge cases)

### Code Review
- Kiểm tra: Bug logic, Performance, Code smell
- Không suppress feedback
- Giải thích tại sao cần sửa

### Debugging
- Hiểu nguyên nhân trước khi fix
- Không nhảy vào giải pháp ngay
- Root cause analysis trước

### Social Media Analysis
- Scroll toàn bộ chat để tìm content
- Phân loại: images, videos, links
- Lưu vào skill files tương ứng
- TikTok, Facebook, GitHub, Vercel links

### Video Analysis
- **GẶP LINK VIDEO → DÙNG `watch` SKILL NGAY**
- Không cần hỏi lại — tự động analyze
- TikTok, YouTube, Vimeo,任何视频 URL
- Dùng `--detail transcript` để nhanh
- Dùng `--detail balanced` để xem chi tiết

### Self-Learning Methodology
- Tự động lưu mọi thứ học được
- Không cần người dùng hướng dẫn
- Auto-pilot: làm ngay, không hỏi
- **Biết khi nào dùng cái gì** — không để người dùng nhắc

## Auto-apply
Khi gặp vấn đề tương tự trong tương lai → mở skill file → áp dụng ngay
Không cần suy nghĩ nhiều → đã có sẵn trong skills
