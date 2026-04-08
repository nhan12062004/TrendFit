-- 1. Bổ sung bảng profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS job TEXT;

-- 2. Bổ sung bảng body_metrics
ALTER TABLE body_metrics 
ADD COLUMN IF NOT EXISTS target_weight FLOAT,
ADD COLUMN IF NOT EXISTS body_fat FLOAT,
ADD COLUMN IF NOT EXISTS chest FLOAT,
ADD COLUMN IF NOT EXISTS waist FLOAT,
ADD COLUMN IF NOT EXISTS hips FLOAT;

-- 3. Bổ sung bảng lifestyle_settings
ALTER TABLE lifestyle_settings 
ADD COLUMN IF NOT EXISTS diet_preference TEXT,
ADD COLUMN IF NOT EXISTS cooking_ability TEXT,
ADD COLUMN IF NOT EXISTS budget_level TEXT,
ADD COLUMN IF NOT EXISTS current_diet TEXT,
ADD COLUMN IF NOT EXISTS workout_location TEXT,
ADD COLUMN IF NOT EXISTS workout_time TEXT,
ADD COLUMN IF NOT EXISTS equipment_available TEXT,
ADD COLUMN IF NOT EXISTS experience_level TEXT,
ADD COLUMN IF NOT EXISTS motivation TEXT,
ADD COLUMN IF NOT EXISTS expectations TEXT;

-- 4. Bổ sung bảng health_conditions
ALTER TABLE health_conditions 
ADD COLUMN IF NOT EXISTS health_condition TEXT,
ADD COLUMN IF NOT EXISTS injuries TEXT,
ADD COLUMN IF NOT EXISTS medications TEXT,
ADD COLUMN IF NOT EXISTS smoke_drink TEXT,
ADD COLUMN IF NOT EXISTS stress_level TEXT,
ADD COLUMN IF NOT EXISTS sleep_quality TEXT;
