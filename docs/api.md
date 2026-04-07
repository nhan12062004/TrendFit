# Tham khảo API (API Reference)

Tài liệu này cung cấp danh sách các API Endpoint mà Backend cung cấp để Frontend có thể tương tác.

> **Lưu ý:** Base URL cho môi trường dev local thường là `http://localhost:5000/api/v1`

## 1. Authentication (Xác thực)

### 1.1. Đăng ký người dùng mới
- **URL**: `/auth/register`
- **Method**: `POST`
- **Mô tả**: Đăng ký một tài khoản mới trên hệ thống.
- **Body Request**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "name": "Nguyễn Văn A"
  }
  ```
- **Response Trả Về (Thành công - 201)**:
  ```json
  {
    "message": "Đăng ký thành công",
    "token": "eyJhbGciOiJIUzI1NiIsInR..."
  }
  ```

### 1.2. Đăng nhập
- **URL**: `/auth/login`
- **Method**: `POST`
- **Mô tả**: Đăng nhập và nhận JWT Token.

---

## 2. Quản lý Tập luyện (Ví dụ cấu trúc)

### 2.1 Lấy danh sách kế hoạch tập
- **URL**: `/workouts`
- **Method**: `GET`
- **Headers**:
  - `Authorization: Bearer <your_jwt_token>`
- **Mô tả**: Trả về danh sách các kế hoạch bài tập do người dùng quản lý.
