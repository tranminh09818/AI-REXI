# QUY ĐỊNH TỰ KIỂM TRA VÀ XÁC MINH BẰNG CHỨNG THỰC TẾ (STRICT SELF-VERIFICATION & PROOF RULE)

## 1. NGUYÊN TẮC CỐT LÕI
- **Mọi kết quả công việc phải có minh chứng thực tế rõ ràng**: Không bao giờ được phép tuyên bố hoàn thành task, sửa lỗi thành công hay thay đổi UI/UX nếu chưa tự mình chạy lệnh kiểm thử (build, test, log, screenshot) và xác minh kết quả.
- **Tự động lặp lại (Self-Correction Loop)**: Nếu kết quả tự kiểm tra phát hiện lỗi (UI hỏng, lệnh build fail, trắng trang, runtime error), Agent BẮT BUỘC phải tự động phân tích nguyên nhân và thực hiện lại cho đến khi CHÍNH XÁC 100% thì mới báo lại cho User.

## 2. QUY TRÌNH THỰC THI BẮT BUỘC FOR AGENT
1. **Thực thi thay đổi**: Sửa code hoặc thực hiện thao tác.
2. **Tự nghiệm thu (Self-Verification)**:
   - Chạy lệnh build/test (VD: `npm run build`, `node ...`) để đảm bảo không rách JSX, không lỗi cú pháp.
   - Kiểm tra log lỗi chi tiết nếu có bất kỳ cảnh báo runtime nào.
3. **Đánh giá khách quan (Self-Assessment)**:
   - Tự hỏi: *"Kết quả hiện tại đã đúng 100% so với yêu cầu của User chưa? Màn hình có bị hỏng hay trắng trang không?"*
   - Nếu chưa đúng hoặc phát hiện bất thường -> **TỰ ĐỘNG SỬA LẠI NGAY** (Lặp lại bước 1-3).
4. **Cung cấp minh chứng (Proof & Evidence)**:
   - Trả lời User kèm theo bằng chứng cụ thể: Kết quả terminal build thành công, chi tiết thay đổi hoặc mô tả kết quả tự kiểm tra.
