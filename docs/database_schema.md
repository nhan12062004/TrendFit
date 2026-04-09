# Cấu Trúc Database Chi Tiết (Detailed Database Schema) - TrendFit

Tài liệu này mô tả chi tiết toàn bộ cấu trúc cơ sở dữ liệu của dự án TrendFit trên Supabase, bao gồm 9 bảng chính phục vụ cho hệ thống phân tích sức khỏe AI.

---

## 1. Nhóm Bảng Người Dùng (User & Profile)

### 1.1. Bảng `profiles`
Lưu trữ thông tin định danh và liên lạc cơ bản.
| Tên trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `uuid` | Khóa chính, tham chiếu từ `auth.users` |
| `full_name` | `text` | Họ và tên người dùng |
| `email` | `text` | Địa chỉ email |
| `phone` | `text` | Số điện thoại liên lạc |
| `gender` | `text` | Giới tính (Nam/Nữ/Khác) |
| `birthday` | `date` | Ngày tháng năm sinh |
| `job` | `text` | Nghề nghiệp hiện tại |
| `role` | `text` | Vai trò (mặc định là 'user') |
| `telegram_chat_id` | `text` | ID để gửi tin nhắn qua Bot Telegram |
| `created_at` | `timestamptz` | Thời điểm tạo tài khoản |
| `updated_at` | `timestamptz` | Thời điểm cập nhật cuối cùng |

### 1.2. Bảng `body_metrics`
Lưu trữ các chỉ số hình thể của người dùng theo thời gian.
| Tên trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `uuid` | Khóa chính |
| `user_id` | `uuid` | Khóa ngoại tham chiếu tới `profiles.id` |
| `height` | `numeric` | Chiều cao (cm) |
| `weight` | `numeric` | Cân nặng hiện tại (kg) |
| `target_weight` | `float8` | Cân nặng mục tiêu (kg) |
| `body_fat` | `float8` | Khối lượng mỡ (kg - nếu có) |
| `body_fat_percentage` | `numeric` | % Mỡ cơ thể |
| `chest` | `float8` | Số đo vòng ngực (cm) |
| `waist` | `float8` | Số đo vòng eo (cm) |
| `hips` | `float8` | Số đo vòng mông (cm) |
| `created_at` | `timestamptz` | Thời điểm ghi nhận số đo |

---

## 2. Nhóm Bảng Lối Sống & Sức Khỏe

### 2.1. Bảng `lifestyle_settings`
Cấu hình thói quen và sở thích tập luyện.
| Tên trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `user_id` | `uuid` | Khóa chính & Khóa ngoại tới `profiles.id` |
| `fitness_goal` | `varchar` | Mục tiêu (Giảm cân, Tăng cơ...) |
| `activity_level` | `varchar` | Tần suất vận động hiện tại |
| `diet_preference` | `text` | Chế độ ăn (Keto, Chay, Bình thường...) |
| `workout_location` | `text` | Địa điểm tập (Gym, Home, Công viên) |
| `equipment_available`| `text` | Dụng cụ đang có sẵn |
| `daily_water_goal` | `numeric` | Mục tiêu nước uống (Lít/ngày) |
| `workout_duration` | `int4` | Thời gian tập mong muốn mỗi buổi |
| `weekly_workouts` | `int4` | Số buổi tập mỗi tuần |
| `experience_level` | `text` | Trình độ (Beginner, Intermediate...) |
| `motivation` | `text` | Động lực chính |
| `expectations` | `text` | Mong đợi riêng gửi cho AI |

### 2.2. Bảng `health_conditions`
Tình trạng y tế và sức khỏe đặc biệt.
| Tên trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `user_id` | `uuid` | Khóa chính & Khóa ngoại tới `profiles.id` |
| `health_condition` | `text` | Các bệnh lý nền (tim mạch, tiểu đường...) |
| `medical_history` | `text` | Tiền sử bệnh lý |
| `injuries` | `text` | Chấn thương cũ/hiện tại |
| `medications` | `text` | Các loại thuốc đang dùng |
| `smoke_drink` | `text` | Thói quen hút thuốc/rượu bia |
| `stress_level` | `text` | Mức độ căng thẳng |
| `sleep_quality` | `text` | Chất lượng giấc ngủ |
| `sleep_hours` | `numeric` | Số giờ ngủ trung bình |

---

## 3. Nhóm Bảng Dữ Liệu & Nhật Ký

### 3.1. Bảng `exercises`
Thư viện bài tập được đồng bộ từ API.
| Tên trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `text` | Mã bài tập (Khóa chính) |
| `name` | `text` | Tên bài tập |
| `body_part` | `text` | Bộ phận cơ thể tác động |
| `equipment` | `text` | Dụng cụ yêu cầu |
| `target_muscle` | `text` | Nhóm cơ đích |
| `gif_url` | `text` | Link ảnh động minh họa |
| `instructions` | `text[]` | Danh sách các bước thực hiện (Mảng) |

### 3.2. Bảng `daily_progress_logs`
Nhật ký vận động và dinh dưỡng thực tế hàng ngày.
| Tên trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `uuid` | Khóa chính |
| `user_id` | `uuid` | Khóa ngoại tới `profiles.id` |
| `log_date` | `date` | Ngày ghi nhận nhật ký |
| `water_intake_ml` | `int4` | Lượng nước thực tế đã uống (ml) |
| `calories_consumed` | `int4` | Calo nạp vào |
| `calories_burned` | `int4` | Calo tiêu thụ qua tập luyện |
| `workout_duration` | `int4` | Số phút tập luyện thực tế |
| `sleep_hours` | `float8` | Số giờ ngủ đêm hôm đó |

---

## 4. Nhóm Bảng AI & Phản Hồi

### 4.1. Bảng `ai_recommendations`
Các kết quả phân tích và lộ trình do AI tạo ra.
| Tên trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `uuid` | Khóa chính |
| `user_id` | `uuid` | Khóa ngoại tới `profiles.id` |
| `plan_type` | `varchar` | Loại lộ trình (Workout/Nutrition) |
| `recommendation_content`| `jsonb` | Nội dung chi tiết bài tập/thực đơn (JSON) |
| `status` | `varchar` | Trạng thái (active/completed) |

### 4.2. Bảng `nutrition_plans`
Thông tin chi tiết về kế hoạch dinh dưỡng do AI tính toán.
| Tên trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `uuid` | Khóa chính |
| `user_id` | `uuid` | Khóa ngoại tới `profiles.id` |
| `total_calories` | `int4` | Mục tiêu calo mỗi ngày AI đề xuất |
| `protein_ratio` | `float8` | Tỷ lệ Đạm đề xuất |
| `fat_ratio` | `float8` | Tỷ lệ Chất béo đề xuất |
| `carbs_ratio` | `float8` | Tỷ lệ Tinh bột đề xuất |
| `meal_data` | `jsonb` | Dữ liệu bữa ăn chi tiết (JSON) |

### 4.3. Bảng `workout_feedback`
Phản hồi của người dùng về hiệu quả các đề xuất.
| Tên trường | Kiểu dữ liệu | Mô tả |
| :--- | :--- | :--- |
| `id` | `uuid` | Khóa chính |
| `user_id` | `uuid` | Khóa ngoại tới `profiles.id` |
| `recommendation_id` | `uuid` | Khóa ngoại tới `ai_recommendations.id` |
| `rating` | `int4` | Đánh giá sao (1-5) |
| `comment` | `text` | Ý kiến đóng góp |

---

## 5. SQL Source Code từ Project Thực Tế

```sql
-- 1. Table: profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  full_name text,
  email text,
  phone text,
  gender text,
  birthday date,
  job text,
  role text DEFAULT 'user'::text,
  telegram_chat_id text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Table: body_metrics
CREATE TABLE public.body_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  height numeric,
  weight numeric,
  target_weight float8,
  body_fat float8,
  body_fat_percentage numeric,
  chest float8,
  waist float8,
  hips float8,
  created_at timestamptz DEFAULT now()
);

-- 3. Table: lifestyle_settings
CREATE TABLE public.lifestyle_settings (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  fitness_goal varchar,
  activity_level varchar,
  diet_preference text,
  cooking_ability text,
  budget_level text,
  current_diet text,
  workout_location text,
  workout_time text,
  workout_duration int4,
  weekly_workouts int4,
  equipment_available text,
  experience_level text,
  daily_water_goal numeric,
  motivation text,
  expectations text,
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- 4. Table: health_conditions
CREATE TABLE public.health_conditions (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  health_condition text,
  medical_history text,
  injuries text,
  medications text,
  smoke_drink text,
  stress_level text,
  sleep_quality text,
  sleep_hours numeric,
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- 5. Table: exercises
CREATE TABLE public.exercises (
  id text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  body_part text,
  equipment text,
  target_muscle text,
  gif_url text,
  instructions text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Table: daily_progress_logs
CREATE TABLE public.daily_progress_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date date DEFAULT CURRENT_DATE,
  water_intake_ml int4 DEFAULT 0,
  calories_consumed int4 DEFAULT 0,
  calories_burned int4 DEFAULT 0,
  workout_duration int4 DEFAULT 0,
  sleep_hours float8 DEFAULT 0,
  UNIQUE(user_id, log_date)
);

-- 7. Table: ai_recommendations
CREATE TABLE public.ai_recommendations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_type varchar,
  recommendation_content jsonb,
  status varchar DEFAULT 'active'::character varying,
  created_at timestamptz DEFAULT now()
);

-- 8. Table: nutrition_plans
CREATE TABLE public.nutrition_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_calories int4,
  protein_ratio float8,
  fat_ratio float8,
  carbs_ratio float8,
  meal_data jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Table: workout_feedback
CREATE TABLE public.workout_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  recommendation_id uuid REFERENCES public.ai_recommendations(id) ON DELETE CASCADE,
  rating int4,
  comment text,
  created_at timestamptz DEFAULT now()
);
```
