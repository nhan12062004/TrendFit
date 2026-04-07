# Kiến trúc dự án (Architecture)

Tài liệu mô tả luồng hoạt động và sự tương tác giữa các phần mềm trong dự án TrendFit.

## Tổng quan mô hình Client - Server

Dự án sử dụng kiến trúc hoàn toàn tách biệt (Decoupled Architecture) giữa Frontend và Backend.

### 1. Frontend (Client)
- **Công nghệ**: React, Vite, TailwindCSS.
- **Nhiệm vụ**: Chịu trách nhiệm hiển thị giao diện, nhận các tương tác từ người dùng (click, nhập form) và hiển thị dữ liệu một cách mượt mà.
- **Kết nối Backend**: Thông qua các HTTP Requests (sử dụng `fetch` API hoặc `axios`) gửi đến các endpoints của Backend.

### 2. Backend (Server)
- **Công nghệ**: Node.js, Express.js, TypeScript.
- **Nhiệm vụ**: Nhận yêu cầu (Request) từ Frontend, xử lý nghiệp vụ, giao tiếp với Database để đọc/ghi dữ liệu, sau đó trả về phản hồi (thường là định dạng JSON).
- **Thiết kế**: Theo chuẩn thiết kế RESTful API. Tương lai có thể áp dụng thêm kiến trúc MVC (Model - View - Controller).

## Sơ đồ luồng xử lý (Data Flow)

1. Người dùng thao tác trên trình duyệt (Ví dụ: Bấm đăng nhập).
2. React App gọi một hàm Fetch gửi Request kèm Username/Password tới API `http://locahost:5000/api/auth/login`.
3. Express Server nhận Request, kiểm tra trong Database.
4. Express Server trả về JSON chứa JWT Token (nếu đúng thông tin).
5. React App lưu Token này (vào Local Storage hoặc Cookies) và chuyển hướng tới Dashboard thành công. 

*(Ghi chú: Bạn có thể sử dụng Mermaid JS để vẽ biểu đồ kiến trúc tại đây trong tương lai)*
