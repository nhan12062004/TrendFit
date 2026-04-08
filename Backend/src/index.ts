import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Import client Supabase ta vừa tạo
import { supabase } from './config/supabase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Cấu hình CORS linh hoạt cho production
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://trendfit.vercel.app'] // Thay bằng domain Vercel của bạn khi có
    : '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Root route - Quan trọng để Render kiểm tra tình trạng server
app.get('/', (req, res) => {
  res.json({ 
    status: "ok", 
    message: "TrendFit API is live!",
    timestamp: new Date().toISOString()
  });
});

// Route hiển thị danh sách người dùng
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase.from('Users').select('*');

    if (error) {
      console.error("Lỗi từ Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: "Kết nối thành công!", data: data });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
