# Cấu Trúc Database Chi Tiết (Detailed Database Schema) - TrendFit

Dưới đây là thiết kế chi tiết các bảng trong database (PostgreSQL trên Supabase) để phục vụ cho việc lưu trữ thông tin khách hàng, phân tích AI và tạo lộ trình tập luyện/dinh dưỡng.

---

## 1. Bảng `profiles` (Thông tin chi tiết khách hàng)
Bảng này liên kết 1-1 với bảng `users` (mặc định của Supabase Auth) để lưu trữ các chỉ số cơ thể và mục tiêu.

| Tên trường (Field) | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `uuid` | Khóa chính, tham chiếu từ `auth.users.id` |
| `full_name` | `text` | Họ và tên đầy đủ |
| `gender` | `text` | Giới tính (Male, Female, Other) |
| `birthday` | `date` | Ngày sinh (để tính tuổi) |
| `height` | `float` | Chiều cao (cm) |
| `weight` | `float` | Cân nặng hiện tại (kg) |
| `target_weight` | `float` | Cân nặng mục tiêu (kg) |
| `chest` | `float` | Số đo vòng 1 (cm) |
| `waist` | `float` | Số đo vòng 2 (cm) |
| `hips` | `float` | Số đo vòng 3 (cm) |
| `activity_level` | `text` | Mức độ vận động (Sedentary, Lightly Active, Moderately Active, Very Active) |
| `fitness_goal` | `text` | Mục tiêu (Weight Loss, Muscle Gain, Endurance, Flexibility) |
| `health_condition` | `text` | Tình trạng sức khỏe/Y tế (Chấn thương, bệnh lý...) |
| `allergies` | `text` | Di ứng thực phẩm |
| `diet_preference` | `text` | Chế độ ăn ưu tiên (Vegan, Keto, Paleo, Normal...) |
| `daily_water_goal` | `float` | Mục tiêu nước uống mỗi ngày (Lít) - Mặc định tính theo cân nặng |
| `created_at` | `timestamp` | Thời gian tạo profile |
| `updated_at` | `timestamp` | Thời gian cập nhật gần nhất |

---

## 2. Bảng `daily_logs` (Nhật ký hàng ngày)
Lưu trữ thông tin thực tế người dùng nạp vào để AI phân tích.

| Tên trường (Field) | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `uuid` | Khóa chính |
| `user_id` | `uuid` | Tham chiếu tới `profiles.id` |
| `log_date` | `date` | Ngày ghi nhận nhật ký |
| `water_intake` | `float` | Lượng nước đã uống (Lít) |
| `calories_consumed`| `integer` | Tổng calo nạp vào |
| `calories_burned` | `integer` | Tổng calo tiêu thụ qua vận động |
| `mood` | `text` | Tâm trạng (Hào hứng, Mệt mỏi, Bình thường...) |
| `sleep_hours` | `float` | Số giờ ngủ |

---

## 3. Bảng `exercise_plans` (Kế hoạch bài tập do AI tạo)

| Tên trường (Field) | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `uuid` | Khóa chính |
| `user_id` | `uuid` | Tham chiếu tới `profiles.id` |
| `ai_analysis` | `text` | Nhận xét/Phân tích từ AI dựa trên profile |
| `plan_data` | `jsonb` | Chứa danh sách bài tập, số set, số rep (Định dạng JSON) |
| `start_date` | `date` | Ngày bắt đầu lộ trình |
| `end_date` | `date` | Ngày kết thúc lộ trình dự kiến |
| `status` | `text` | Trạng thái (Active, Completed, Cancelled) |

---

## 4. Bảng `nutrition_plans` (Thực đơn dinh dưỡng do AI tạo)

| Tên trường (Field) | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `uuid` | Khóa chính |
| `user_id` | `uuid` | Tham chiếu tới `profiles.id` |
| `meal_data` | `jsonb` | Thực đơn chi tiết các bữa trong ngày (Sáng, Trưa, Chiều, Tối) |
| `total_calories` | `integer` | Mục tiêu calo mỗi ngày AI đề xuất |
| `protein_ratio` | `float` | Tỷ lệ đạm (%) |
| `carbs_ratio` | `float` | Tỷ lệ tinh bột (%) |
| `fat_ratio` | `float` | Tỷ lệ chất béo (%) |

---

## 5. SQL Code để tạo bảng nhanh trong Supabase (SQL Editor)

```sql
-- 1. Tạo bảng profiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  gender TEXT,
  birthday DATE,
  height FLOAT,
  weight FLOAT,
  target_weight FLOAT,
  chest FLOAT,
  waist FLOAT,
  hips FLOAT,
  activity_level TEXT,
  fitness_goal TEXT,
  health_condition TEXT,
  allergies TEXT,
  diet_preference TEXT,
  daily_water_goal FLOAT DEFAULT 2.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tạo bảng daily_logs
CREATE TABLE daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  log_date DATE DEFAULT CURRENT_DATE,
  water_intake FLOAT DEFAULT 0,
  calories_consumed INTEGER DEFAULT 0,
  calories_burned INTEGER DEFAULT 0,
  mood TEXT,
  sleep_hours FLOAT,
  UNIQUE(user_id, log_date)
);

-- 3. Tạo bảng exercise_plans
CREATE TABLE exercise_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ai_analysis TEXT,
  plan_data JSONB,
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active'
);

-- 4. Tạo bảng nutrition_plans
CREATE TABLE nutrition_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  meal_data JSONB,
  total_calories INTEGER,
  protein_ratio FLOAT,
  carbs_ratio FLOAT,
  fat_ratio FLOAT
);
```
