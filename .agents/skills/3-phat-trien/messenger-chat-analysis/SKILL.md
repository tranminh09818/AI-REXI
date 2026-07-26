# Messenger Chat Analysis Skill

## Mục đích
Phân tích nội dung chat Messenger để trích xuất kiến thức, skills, và links hữu ích.

## Cách thực hiện
1. Scroll toàn bộ chat từ đầu đến cuối
2. Identifi all images, videos, links
3. Xem từng nội dung → Trích xuất kiến thức
4. Lưu vào skill files tương ứng

## Tools sử dụng
- `pyautogui` + clipboard paste cho Coccoc browser
- Screenshot để debug state
- Keyboard arrows để navigate images

## Phân loại nội dung

### Hình ảnh
- Ảnh có text → OCR → Trích xuất kiến thức
- Ảnh có code → Lưu code examples
- Ảnh có diagram → Lưu design patterns

### Links
- GitHub repos → Lưu vào relevant skills
- Facebook groups → Lưu vào community resources
- Articles/docs → Tóm tắt và lưu

### Videos
- Tutorial videos → Trích xuất key points
- Demo videos → Lưu steps

## Skills từ chat với Trần Hoàng Mi

### CODE4LIFE (12 topics)
1. System Design
2. Data Modeling
3. API Design
4. Performance Optimization
5. Caching Strategy
6. Async Processing
7. Distributed Systems
8. Debugging
9. Code Quality
10. DevOps
11. Security
12. Technical Communication

### Prompt Engineering (6 rules)
1. Đừng sửa ngay — giải thích trước
2. Review như senior khắt khe
3. Doc code & viết test
4. Hỏi trước code sau
5. Mỗi prompt tốt đều có 3 phần
6. 5 prompt lưu ngay

### GitHub Resources
- https://github.com/vudown/antigravity-kit

### Facebook Communities
- J2TEAM
- Codex VN
- Spider AI News

## Auto-update
Sau mỗi session chat → kiểm tra có nội dung mới không → cập nhật skills
