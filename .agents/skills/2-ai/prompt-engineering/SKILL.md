# Prompt Engineering Skills

## Mục đích
Tổng hợp các kỹ năng prompt engineering và coding best practices từ các hình ảnh chia sẻ trong Messenger chat với Trần Hoàng Mi.

## 6 PROMPT RULES (Từ bộ ảnh thứ 2)

### 1. ĐỪNG SỬA NGAY — GIẢI THÍCH TRƯỚC
- Không fix bug ngay lập tức
- Phải giải thích nguyên nhân gốc rễ trước
- Sau đó mới đưa ra giải pháp
- **Luôn always**: Hiểu vấn đề → Giải thích → Fix

### 2. REVIEW NHƯ SENIOR KHÁT KHE
- Review code như senior nghiêm khắc
- Kiểm tra: Bug logic, Performance, Code smell
- Không suppress feedback — always open to criticism
- Focus vào: Đọc hiểu code, tìm edge cases, đề xuất cải thiện

### 3. DOC CODE & VIẾT TEST
- Giải thích code cho người khác hiểu
- Viết unit test đầy đủ (happy path, edge cases, invalid input)
- Combo này tiết kiệm 2-3 giờ debugging cho cả team

### 4. HỎI TRƯỚC CODE SAU
- Làm rõ yêu cầu TRƯỚC KHI bắt đầu code
- Xác định: "Tôi cần làm gì? Có yêu cầu gì đặc biệt?"
- Không code khi chưa hiểu rõ yêu cầu
- **Luôn always**: Clarify first. Code second.

### 5. MỖI PROMPT TỐT ĐỀU CÓ 3 PHẦN
```
Role + Context + Constraint = Perfect Prompt
```
- **Vai trò (Role)**: Bạn đang đóng vai gì? (senior dev, tech lead, security expert...)
- **Ngữ cảnh (Context)**: Vấn đề là gì? Code base nào? Technology stack?
- **Ràng buộc (Constraint)**: Yêu cầu cụ thể? Format output? Giới hạn?

### 6. 5 PROMPT LƯU NGAY
Các prompt template hữu ích cần lưu lại:

**1. Prompt giải thích code:**
```
Role: Senior Developer
Context: Tôi có đoạn code [mô tả]
Constraint: Giải thích từng dòng, tại sao dùng cách này, có thể cải thiện gì không?
```

**2. Prompt review code:**
```
Role: Code Reviewer nghiêm khắc
Context: Code base [tên project], sử dụng [language/framework]
Constraint: Kiểm tra bug logic, performance, code smell. Không suppress feedback.
```

**3. Prompt viết test:**
```
Role: QA Engineer
Context: Function [tên function] làm [mô tả]
Constraint: Viết test cho happy path, edge cases, invalid input. Dùng [jest/pytest/etc].
```

**4. Prompt debug:**
```
Role: Debug Specialist
Context: Lỗi [error message], xảy ra khi [điều kiện]
Constraint: Giải thích nguyên nhân trước, sau đó提出 giải pháp. Không fix ngay.
```

**5. Prompt refactor:**
```
Role: Senior Developer
Context: Code [mô tả code hiện tại]
Constraint: Refactor theo SOLID, giữ nguyên functionality, thêm comments.
```

## 12 SOFTWARE ENGINEERING TOPICS (Từ bộ ảnh thứ 1 - CODE4LIFE)

### 1. System Design
- Thiết kế hệ thống scalable
- Load balancing, caching, database sharding
- Microservices vs Monolith

### 2. Data Modeling
- Thiết kế database schema
- Normalization, indexing
- Relationship modeling

### 3. API Design
- RESTful API principles
- API versioning
- Error handling standards

### 4. Performance Optimization
- Profiling và bottleneck identification
- Memory optimization
- CPU optimization

### 5. Caching Strategy
- Redis/Memcached implementation
- Cache invalidation patterns
- CDN caching

### 6. Async Processing
- Message queues (RabbitMQ, Kafka)
- Background jobs
- Event-driven architecture

### 7. Distributed Systems
- CAP theorem
- Consistency patterns
- Fault tolerance

### 8. Debugging
- Systematic debugging approach
- Logging và monitoring
- Root cause analysis

### 9. Code Quality
- Clean code principles
- SOLID principles
- Code review best practices

### 10. DevOps
- CI/CD pipelines
- Infrastructure as Code
- Container orchestration

### 11. Security
- OWASP Top 10
- Authentication/Authorization
- Data encryption

### 12. Technical Communication
- Writing technical docs
- Presenting technical concepts
- Knowledge sharing

## LINKS QUAN TRỌNG
- GitHub: https://github.com/vudown/antigravity-kit
- Facebook Groups: J2TEAM, Codex VN, Spider AI News

## CÁCH SỬ DỤNG
Khi được yêu cầu:
1. **Debug**: Luôn giải thích nguyên nhân trước khi fix
2. **Review code**: Áp dụng tiêu chuẩn senior developer
3. **Viết test**: Bao gồm happy path, edge cases, invalid input
4. **Tạo prompt**: Sử dụng cấu trúc Role + Context + Constraint
5. **Học hỏi**: Tham gia các group Facebook để cập nhật kiến thức mới
