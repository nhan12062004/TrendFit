# Cấu Trúc Database (Database Schema)

Dưới đây là thiết kế sơ bộ các bảng/collections trong Cơ sở dữ liệu của dự án TrendFit. Tùy thuộc vào việc lựa chọn database (PostgreSQL, MySQL hay MongoDB), định dạng chi tiết có thể khác một chút.

## 1. Bảng `Users`
Lưu trữ thông tin người dùng.

| Field (Trường) | Type (Kiểu) | Description (Mô tả) |
| -------------- | ----------- | ------------------- |
| `id`           | UUID/String | Khóa chính (Primary Key) |
| `email`        | String      | Email người dùng (Unique) |
| `password`     | String      | Mật khẩu (đã được băm/hashed) |
| `name`         | String      | Tên người dùng |
| `created_at`   | DateTime    | Ngày tạo tài khoản |

## 2. Bảng `Workouts` (Kế hoạch tập luyện)
Lưu trữ các bài tập mà người dùng đã tạo hoặc tham chiếu.

| Field (Trường) | Type (Kiểu) | Description (Mô tả) |
| -------------- | ----------- | ------------------- |
| `id`           | UUID/String | Khóa chính |
| `user_id`      | UUID/String | Khóa ngoại (Foreign Key) liên kết với bảng `Users` |
| `title`        | String      | Tên kế hoạch (Ví dụ: Tập ngực ngày 1) |
| `difficulty`   | String      | Độ khó (Beginner, Intermediate, Advanced) |
| `created_at`   | DateTime    | Ngày tạo |

*(Ghi chú: Bạn có thể cập nhật thêm thông tin thực tế khi backend bắt đầu kết nối với Database)*
