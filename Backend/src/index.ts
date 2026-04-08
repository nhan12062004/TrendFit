import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Import client Supabase ta vừa tạo
import { supabase } from './config/supabase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Đây là Route mới thêm vào để hiển thị danh sách người dùng từ Supabase 
// (Giả sử bạn đã tạo bảng 'Users' trên trang web điều khiển của Supabase)
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
  console.log('Server is running on port ' + PORT);
});
