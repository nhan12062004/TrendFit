import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Import client Supabase ta vừa tạo
import { supabase } from './config/supabase';
import { initTelegramBot } from './telegramBot';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

// Route xử lý việc sử dụng Gemini AI để tạo kế hoạch
app.post('/api/generate-plan', async (req, res) => {
  try {
    const { prompt, userId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Nội dung yêu cầu (prompt) không được để trống.' });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'Thiếu GROQ_API_KEY trong cấu hình server.' });
    }

    let userContext = ``;

    // Nếu frontend truyền userId lên, tiến hành lấy dữ liệu chi tiết của người dùng
    if (userId) {
      const [profile, bodyMetrics, lifestyle, health] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('body_metrics').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('lifestyle_settings').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('health_conditions').select('*').eq('user_id', userId).maybeSingle()
      ]);

      userContext = `
Thông tin cực kỳ chi tiết của người dùng cần được cá nhân hóa:
1. Thông tin cơ bản: ${profile.data?.full_name || 'Không rõ'} | Giới tính: ${profile.data?.gender || 'Không rõ'} | Tuổi/Năm sinh: ${profile.data?.birthday || 'Không rõ'}
2. Chỉ số cơ thể & Vóc dáng: Cân nặng hiện tại: ${bodyMetrics.data?.weight || '?'} kg | Chiều cao: ${bodyMetrics.data?.height || '?'} cm | Mục tiêu muốn đạt: ${bodyMetrics.data?.target_weight || '?'} kg.
   Vòng ngực: ${bodyMetrics.data?.chest || '?'} cm | Vòng eo: ${bodyMetrics.data?.waist || '?'} cm | Vòng mông: ${bodyMetrics.data?.hips || '?'} cm | Tỷ lệ mỡ (Body Fat): ${bodyMetrics.data?.body_fat || '?'}%.
3. Lối sống & Thói quen tập luyện:
   - Mong muốn/Mục tiêu: ${lifestyle.data?.fitness_goal || 'Tập luyện nâng cao sức khỏe'}.
   - Trình độ tập: ${lifestyle.data?.experience_level || 'Không rõ'} | Mức vận động: ${lifestyle.data?.activity_level || 'Không rõ'}.
   - Địa điểm tập: ${lifestyle.data?.workout_location || 'Không rõ'} | Dụng cụ có sẵn: ${lifestyle.data?.equipment_available || 'Không rõ'}.
   - Thời gian rảnh mỗi buổi: ${lifestyle.data?.workout_duration || '?'} phút | Hay tập lúc: ${lifestyle.data?.workout_time || 'Bất kỳ'}.
4. Dinh dưỡng:
   - Chế độ ăn ưu tiên: ${lifestyle.data?.diet_preference || 'Bình thường'} | Chế độ ăn hiện tại: ${lifestyle.data?.current_diet || 'Không rõ'}.
   - Khả năng tự nấu ăn: ${lifestyle.data?.cooking_ability || 'Không rõ'} | Tài chính (Budget): ${lifestyle.data?.budget_level || 'Bình thường'}.
   - Mục tiêu nước uống: ${lifestyle.data?.daily_water_goal || 2} lít/ngày.
   - Dị ứng thực phẩm: ${health.data?.allergies || 'Không có'}.
5. Y tế & Tinh thần:
   - Bệnh lý nền: ${health.data?.health_condition || 'Hoàn toàn khỏe mạnh'}.
   - Chấn thương: ${health.data?.injuries || 'Không bị chấn thương'}.
   - Đang dùng thuốc: ${health.data?.medications || 'Không'}.
   - Thói quen hút thuốc/uống rượu: ${health.data?.smoke_drink || 'Không'}.
   - Mức độ stress: ${health.data?.stress_level || 'Bình thường'} | Giấc ngủ trung bình: ${health.data?.sleep_hours || 7} tiếng/ngày.

Đây là đầy đủ hồ sơ của người dùng lấy trực tiếp từ Database hệ thống (dựa theo form khảo sát họ đã điền). Hãy dùng các thông tin này như một chuyên gia để lập kế hoạch chi tiết, chính xác 100% phù hợp với túi tiền, bệnh lý, và số đo của họ:

Hãy dựa vào các thông tin cá nhân cực kỳ chi tiết trên để lập kế hoạch hoặc trả lời yêu cầu sau một cách chính xác và phù hợp thể trạng nhất:
`;
    }

    const finalPrompt = userContext + "\nYêu cầu của người dùng: " + prompt;

    // Thay thế Gemini bằng Groq (Llama 3 70B)
    const apiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: finalPrompt }]
      })
    });

    const result = await apiResponse.json();
    if (result.error) throw new Error(result.error.message);
    const text = result.choices[0].message.content;

    res.json({ success: true, data: text });
  } catch (error: any) {
    console.error('Lỗi khi gọi Gemini AI:', error.message);
    res.status(500).json({ error: 'Đã có lỗi xảy ra khi gọi AI.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
