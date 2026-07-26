# Skill: watch

## Mô tả
Skill dùng để tải video (URL/local), trích xuất khung hình, transcript, và phân tích nội dung video bằng AI.

## Chức năng chính
- Tải video từ URL (YouTube, Vimeo, v.v.) bằng `yt-dlp`.
- Trích xuất khung hình tự động bằng `ffmpeg`.
- Lấy transcript từ phụ đề (hoặc dùng Whisper API nếu không có phụ đề).
- Phân tích nội dung video (gửi cho LLM phân tích chi tiết).

## Cách dùng
```bash
skill watch "https://www.youtube.com/watch?v=..."
```
→ Tôi sẽ tải video, trích xuất dữ liệu, và trả lời câu hỏi về nội dung video.

## Yêu cầu hệ thống
- **yt-dlp**: Để tải video
- **ffmpeg**: Để trích xuất khung hình
- **Kết nối internet**: Để tải video từ URL

## Cài đặt công cụ phụ trợ

### 1. Cài yt-dlp (tải video)
```bash
pip install yt-dlp
```

### 2. Cài ffmpeg (trích xuất khung hình)
#### Trên Windows:
```bash
winget install ffmpeg
```
Hoặc tải từ: https://ffmpeg.org/download.html

#### Trên macOS:
```bash
brew install ffmpeg
```

#### Trên Linux:
```bash
sudo apt install ffmpeg  # Debian/Ubuntu
sudo dnf install ffmpeg  # Fedora
```

## Ví dụ sử dụng
```bash
skill watch "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```
→ Tôi sẽ tải video, trích xuất khung hình, transcript, và phân tích nội dung.

## Lưu ý
- Video tải về sẽ được lưu tạm trong thư mục `C:\Users\84916\.agents\skills\watch\temp\`
- Sau khi phân tích xong, video sẽ được xóa tự động.
- Dung lượng video giới hạn: dưới 50MB (để tránh quá tải).