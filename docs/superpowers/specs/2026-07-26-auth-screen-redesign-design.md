# Thiết kế Giao diện Đăng nhập / Đăng ký - Phong cách Sử Việt Hoàng Gia

## 1. Mục tiêu
Nâng cấp toàn bộ giao diện màn hình `src/app/auth.tsx` của ứng dụng **Lịch Sử Việt Nam** lên chuẩn thiết kế cao cấp, mang đậm bản sắc Lịch sử Việt Nam (Đỏ son - Vàng đồng - Giấy cổ) kết hợp với trải nghiệm người dùng hiện đại (Modern UX).

## 2. Chi tiết thiết kế (Option 1: Sử Việt Hoàng Gia)

### A. Header & Branding
- **Logo Badge:**
  - Hình tròn bo góc nổi 3D với viền kép Vàng đồng (`borderStrong`).
  - Icon Ngôi sao / Lá cờ Sử Việt phát sáng với hiệu ứng `primaryBright` & `shadowColor`.
- **Tiêu đề ứng dụng:**
  - Font chữ đậm nổi bật "Lịch Sử Việt Nam" màu Đỏ son (`colors.primary`).
  - Dòng subtitle: *"Hành trình khám phá 4.000 năm Lịch sử Việt Nam"*.
- **Badge tính năng:**
  - Các chip điểm nhấn nhỏ: *"4.000 Năm Lịch Sử" • "Tri Thức & Trò Chơi" • "Miễn Phí"*.

### B. Segmented Tab Switcher (Đăng nhập / Đăng ký)
- Thanh tab dạng Pill bo tròn nguyên khối (`BORDER_RADIUS.full`).
- Tab active được highlight với màu Đỏ son (`colors.primary`), chữ màu `colors.onPrimary`, kèm bóng đổ nhẹ.
- Chuyển chế độ mượt mà giữa **Đăng nhập**, **Đăng ký**, và **Quên mật khẩu**.

### C. Form Card & Input Controls
- Thẻ Card chứa Form có nền `colors.surface`, viền `colors.border`, bo góc 24px với bóng đổ cao cấp (`HTML_SHADOWS.cardLarge`).
- **Ô nhập liệu (Inputs):**
  - Đóng gói trong wrapper có icon minh họa bên trái (mail, lock, person, shield).
  - Trạng thái khi focus: Đổi màu viền sang Vàng đồng phát sáng (`colors.secondary`), tạo cảm giác tương tác phản hồi tức thì.
  - Nút Ẩn/Hiện mật khẩu trực quan.
- **Trạng thái thông báo lỗi (Error Banner):**
  - Hiển thị banner cảnh báo tinh tế ngay trên form thay vì chỉ bật Alert popup.

### D. Nút Thao Tác (Action Buttons & Links)
- **Nút bấm chính (CTA):** Dùng `Button` component với màu primary phát sáng, shadow button 3D (`HTML_SHADOWS.button`), icon động báo trạng thái loading.
- **Link Quên mật khẩu & Quay lại:** Sắp xếp hợp lý, chuẩn độ tương phản và diện tích chạm (`hitSlop`).
- **Nút xem thử (Guest Mode):** Cho phép truy cập vào ứng dụng xem thử không cần đăng nhập ngay.

## 3. Kế hoạch triển khai
1. Cập nhật `src/app/auth.tsx` với cấu trúc JSX & Style mới.
2. Thêm state quản lý `focusedInput` để xử lý hiệu ứng highlight khi gõ.
3. Thêm banner thông báo lỗi và tính năng Guest Mode.
4. Kiểm tra hiển thị mượt mà trên cả 2 chế độ Light & Dark theme.
