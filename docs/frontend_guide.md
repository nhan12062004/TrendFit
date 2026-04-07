# Hướng dẫn viết code Frontend

Tài liệu này lưu trữ các quy tắc chung dành cho việc phát triển code ở thư mục `/Frontend` nhằm duy trì tính đồng nhất của dự án.

## 1. Cấu trúc thư mục (Folder Structure)

```text
src/
├── assets/       # Chứa các file tĩnh như hình ảnh, SVG, fonts...
├── components/   # Các UI Component dùng chung (Button, Input, Card...)
├── contexts/     # Các React Context để quản lý state toàn cầu (VD: AuthContext)
├── hooks/        # Các Custom Hooks dùng chung nhằm xử lý logic
├── pages/        # Các Component đóng vai trò đại diện cho 1 trang đầy đủ (Home, Dashboard...)
├── services/     # Chứa logic gọi API tới Backend
├── types/        # Định nghĩa kiểu dữ liệu (Types/Interfaces) nếu dùng TypeScript
└── utils/        # Các hàm tiện ích logic (VD: formatDate, calcBMI...)
```

## 2. Quy ước đặt tên (Naming Conventions)

- **Components / Pages**: Sử dụng `PascalCase` (Ví dụ: `AuthContext.tsx`, `UserProfile.tsx`).
- **Hàm & Biến (Functions & Variables)**: Sử dụng `camelCase` (Ví dụ: `handleLogin`, `fetchData`).
- **Tên File Hook**: Bắt đầu bằng chữ `use` (Ví dụ: `useAuth.ts`, `useFetch.ts`).
- **Hằng số (Constants)**: Sử dụng `UPPER_SNAKE_CASE` (Ví dụ: `MAX_ITEMS = 10;`).

## 3. Styling với Tailwind CSS

- Dùng các tiện ích (utility classes) trực tiếp trên `className`.
- Hạn chế viết custom CSS tĩnh trừ khi thực sự cần thiết, nếu có cần bọc trong `@layer components` hoặc tương tự để duy trì tính dễ quản lý.
