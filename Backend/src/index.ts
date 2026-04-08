import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Import client Supabase ta vừa tạo
import { supabase } from './config/supabase';
import { initTelegramBot } from './telegramBot';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Khởi chạy Telegram Bot
initTelegramBot();

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

// Route hiển thị danh sách profile (thay cho Users vì Users không tồn tại)
app.get('/api/profiles', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('*');

    if (error) {
      console.error("Lỗi từ Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: "Kết nối thành công!", data: data });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route dự kiến cho Gemini AI (Sẽ hoàn thiện khi có API Key)
app.post('/api/generate-plan', async (req, res) => {
  res.json({ message: "Route này sẽ dùng Gemini AI để tạo kế hoạch tập luyện!" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
