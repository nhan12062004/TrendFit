<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
  <h1>💪 TrendFit</h1>
  <p>Ứng dụng quản lý và theo dõi thể hình hiện đại được xây dựng theo kiến trúc Full-stack.</p>
</div>

## ✨ Tính Năng Nổi Bật
- **Dashboard Giao Diện Người Dùng:** Giao diện chuyên nghiệp, mượt mà được xây dựng trên React, Vite và Tailwind CSS.
- **Backend API:** Máy chủ API bảo mật với Express và TypeScript giúp quản lý các chức năng như kế hoạch tập luyện, bài tập, và xác thực người dùng.

## 📁 Cấu Trúc Dự Án

TrendFit được phân vùng rõ ràng thành hai thư mục chính để dễ quản lý và mở rộng:

- `/Frontend`: Chứa toàn bộ giao diện React (sử dụng Vite và thư viện TailwindCSS).
- `/Backend`: Máy chủ cài đặt các API bằng Node.js (Express.js) và TypeScript.

## 🛠️ Công Nghệ Sử Dụng

**Frontend (Giao diện):**
- [React](https://reactjs.org/) (v19)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) (v4)
- [Lucide React](https://lucide.dev/) (Bộ biểu tượng)
- [React Router DOM](https://reactrouter.com/) (Điều hướng)

**Backend (Máy chủ):**
- [Node.js](https://nodejs.org/)
- [Express.js](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)

## 🚀 Hướng Dẫn Cài Đặt

Làm theo các bước sau để sao chép dự án và chạy trực tiếp trên máy tính của bạn.

### Yêu Cầu Máy Tính
Hãy đảm bảo máy tính của bạn đã cài đặt [Node.js](https://nodejs.org/) (Khuyên dùng phiên bản 18 trở lên).

### 1. Cài đặt thư viện

**Vào thư mục Frontend và cài đặt:**
```bash
cd Frontend
npm install
```

**Vào thư mục Backend và cài đặt:**
```bash
cd ../Backend
npm install
```

### 2. Thiết lập Biến Môi Trường (.env)

- Tạo một file `.env` nằm trong thẻ mục **Frontend** (bạn có thể copy nội dung từ file `.env.example` ngoài cùng). Lưu ý: mọi biến môi trường được dùng cho Frontend bắt buộc phải bắt đầu bằng chữ `VITE_` (VD: `VITE_GEMINI_API_KEY=ma_so_bi_mat_cua_ban`).
- Tạo một file `.env` riêng biệt nằm trong thư mục **Backend** để chứa các biến cấu hình phía máy chủ (như mã kết nối Database, khóa bảo mật JWT).

### 3. Chạy Ứng Dụng (Chạy Local)

Để khởi chạy dự án, bạn sẽ cần mở hai cửa sổ (tab) Terminal riêng biệt.

**Terminal 1 (Chạy Giao Diện Frontend):**
```bash
cd Frontend
npm run dev
```
👉 Giao diện web sẽ được mở tại: `http://localhost:5173`

**Terminal 2 (Chạy Máy Chủ Backend):**
```bash
cd Backend
npm run dev
```
👉 Máy chủ API sẽ lắng nghe tại: `http://localhost:5000`

## 📝 Bản Quyền
Dự án được phân phối dưới chứng chỉ MIT.
