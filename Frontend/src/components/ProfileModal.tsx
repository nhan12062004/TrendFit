import React, { useState } from 'react';
import {
  User,
  Ruler,
  Target,
  Activity,
  Apple,
  Droplet,
  CheckCircle2,
  Loader2,
  Sparkles,
  Zap,
  Clock,
  Heart,
  Stethoscope,
  X,
  PencilLine
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
interface ProfileModalProps {
  onComplete?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ProfileModal({ onComplete, isOpen, onClose }: ProfileModalProps) {
  const { user, refreshProfile } = useAuth();
const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    // Section 1: Thông tin cá nhân
    full_name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: '',
    gender: 'Nam',
    birthday: '',
    job: '',

    // Section 2: Chỉ số cơ thể
    height: '',
    weight: '',
    target_weight: '',
    body_fat: '',
    chest: '',
    waist: '',
    hips: '',
    // BMI sẽ được tính tự động, không cần trong state input
    activity_level: 'Vừa phải (Tập luyện 3-5 ngày/tuần)',
    fitness_goal: 'Giảm cân',
    workout_time: 'Sáng sớm',
    workout_duration: '45',
    experience_level: 'Người mới',
    work_nature: 'Ngồi văn phòng nhiều',
    workout_location: 'Phòng Gym chuyên nghiệp',
    equipment_available: 'Đầy đủ tạ & máy móc',

    // Section 4: Chế độ ăn & Sức khỏe
    diet_preference: 'Bình thường',
    daily_water_goal: '2.5',
    meals_per_day: '3',
    cooking_ability: 'Tự nấu 100%',
    budget_level: 'Trung bình',
    current_diet: '',
    allergies: '',
    health_condition: '',
    injuries: '',
    medications: '',
    smoke_drink: 'Không',

    // Section 5: Lối sống & Tâm lý
    sleep_hours: '7',
    sleep_quality: 'Tốt',
    mood: 'Bình thường',
    stress_level: 'Thấp',
    expectations: '',
    motivation: ''
  });

  const BMI = (formData.height && formData.weight)
    ? (() => {
      const h = parseFloat(formData.height);
      const w = parseFloat(formData.weight);
      if (!h || !w || h <= 0 || w <= 0) return '0';
      return (w / ((h / 100) ** 2)).toFixed(1);
    })()
    : '0';

  React.useEffect(() => {
    if (isOpen) setIsEditing(false);
    async function loadCurrentData() {
      if (!user || !isOpen) return;
      try {
        const [p, b, l, h] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('body_metrics').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('lifestyle_settings').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('health_conditions').select('*').eq('user_id', user.id).maybeSingle()
        ]);

        if (p.data) {
          setFormData(prev => ({
            ...prev,
            full_name: p.data.full_name || prev.full_name,
            phone: p.data.phone || '',
            gender: p.data.gender || 'Nam',
            birthday: p.data.birthday || '',
            job: p.data.job || '',
            height: b.data?.height?.toString() || prev.height,
            weight: b.data?.weight?.toString() || prev.weight,
            target_weight: b.data?.target_weight?.toString() || prev.target_weight,
            body_fat: b.data?.body_fat?.toString() || prev.body_fat,
            chest: b.data?.chest?.toString() || prev.chest,
            waist: b.data?.waist?.toString() || prev.waist,
            hips: b.data?.hips?.toString() || prev.hips,
            activity_level: l.data?.activity_level || prev.activity_level,
            fitness_goal: l.data?.fitness_goal || prev.fitness_goal,
            diet_preference: l.data?.diet_preference || prev.diet_preference,
            cooking_ability: l.data?.cooking_ability || prev.cooking_ability,
            budget_level: l.data?.budget_level || prev.budget_level,
            current_diet: l.data?.current_diet || '',
            workout_location: l.data?.workout_location || prev.workout_location,
            workout_time: l.data?.workout_time || prev.workout_time,
            workout_duration: l.data?.workout_duration?.toString() || prev.workout_duration,
            equipment_available: l.data?.equipment_available || prev.equipment_available,
            experience_level: l.data?.experience_level || prev.experience_level,
            daily_water_goal: l.data?.daily_water_goal?.toString() || prev.daily_water_goal,
            health_condition: h.data?.health_condition || '',
            injuries: h.data?.injuries || '',
            medications: h.data?.medications || '',
            smoke_drink: h.data?.smoke_drink || 'Không',
            stress_level: h.data?.stress_level || 'Thấp',
            sleep_hours: h.data?.sleep_hours?.toString() || prev.sleep_hours,
            expectations: l.data?.expectations || '',
            motivation: l.data?.motivation || ''
          }));
        }
      } catch (e) {
        console.error('Error preload:', e);
      }
    }
    loadCurrentData();
  }, [user, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitted(true);
    if (!formData.full_name || !formData.phone || !formData.birthday || !formData.gender || !formData.height || formData.height === '0' || !formData.weight || formData.weight === '0' || !formData.target_weight || formData.target_weight === '0') {
      return;
    }
    setLoading(true);

    try {
      // 1. Cập nhật hoặc Tạo mới Profile (Thông tin cơ bản)
      const profilePromise = supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          gender: formData.gender,
          birthday: formData.birthday || null,
          job: formData.job,
          updated_at: new Date().toISOString()
        });

      // 2. Lưu số đo cơ thể đầy đủ
      const bodyMetricsPromise = supabase
        .from('body_metrics')
        .insert({
          user_id: user.id,
          height: parseFloat(formData.height) || 0,
          weight: parseFloat(formData.weight) || 0,
          target_weight: parseFloat(formData.target_weight) || 0,
          body_fat: formData.body_fat ? parseFloat(formData.body_fat) : null,
          chest: formData.chest ? parseFloat(formData.chest) : null,
          waist: formData.waist ? parseFloat(formData.waist) : null,
          hips: formData.hips ? parseFloat(formData.hips) : null
        });

      // 3. Cập nhật Lối sống & Thói quen toàn diện
      const lifestylePromise = supabase
        .from('lifestyle_settings')
        .upsert({
          user_id: user.id,
          activity_level: formData.activity_level,
          fitness_goal: formData.fitness_goal,
          diet_preference: formData.diet_preference,
          cooking_ability: formData.cooking_ability,
          budget_level: formData.budget_level,
          current_diet: formData.current_diet,
          workout_location: formData.workout_location,
          workout_time: formData.workout_time,
          workout_duration: parseInt(formData.workout_duration) || 0,
          equipment_available: formData.equipment_available,
          experience_level: formData.experience_level,
          daily_water_goal: parseFloat(formData.daily_water_goal) || 2.0,
          motivation: formData.motivation,
          expectations: formData.expectations,
          updated_at: new Date().toISOString()
        });

      // 4. Cập nhật Tình trạng Y tế chi tiết
      const healthPromise = supabase
        .from('health_conditions')
        .upsert({
          user_id: user.id,
          health_condition: formData.health_condition,
          injuries: formData.injuries,
          medications: formData.medications,
          smoke_drink: formData.smoke_drink,
          stress_level: formData.stress_level,
          sleep_quality: formData.sleep_quality,
          sleep_hours: parseFloat(formData.sleep_hours) || 7,
          updated_at: new Date().toISOString()
        });


      // 1. ĐẢM BẢO Profile tồn tại trước (Sequential to avoid FK errors)
      const { error: pError } = await profilePromise;
      if (pError) throw pError;
      
      // 2. Chạy các lệnh còn lại (Concurrent ok now)
      const results = await Promise.all([
        bodyMetricsPromise,
        lifestylePromise,
        healthPromise
      ]);

      // In chi tiết lỗi (nếu có) ra console để debug
      results.forEach((res, index) => {
        if (res.error) {
          console.error(`Error in promise ${index}:`, res.error);
        }
      });

      // Kiểm tra lỗi từ bất kỳ bảng nào
      const firstError = results.find(res => res.error)?.error;
      if (firstError) {
        throw firstError;
      }

      await refreshProfile();
      setIsEditing(false);
      if (onComplete) onComplete();
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Error saving multi-table profile:', err);
      alert(`Lỗi hệ thống: ${err?.message || err?.details || 'Thông tin không hợp lệ'}. Vui lòng check Console (F12)`);
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen && !onComplete) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-4xl bg-bg-secondary border border-border-primary rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in duration-300">

        {/* Header */}
        <div className="p-4 md:p-5 border-b border-border-primary bg-bg-tertiary/50 backdrop-blur-xl relative">
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles className="w-4 h-4 text-[#a3e635] animate-pulse" />
            <span className="text-[9px] font-bold text-[#a3e635] uppercase tracking-[3px]">{"Hệ thống phân tích AI"}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-text-primary text-white">
            {isEditing ? "Chỉnh sửa hồ sơ sức khỏe" : `Hồ sơ sức khỏe của bạn`}
          </h2>
          <p className="text-[11px] text-text-secondary">
            {isEditing 
              ? "Thông tin càng chi tiết, AI sẽ tạo kế hoạch tập luyện và thực đơn" + ' ' + "chính xác tuyệt đối" + ' ' + "cho bạn."
              : "Dưới đây là tóm tắt các chỉ số hiện tại được AI đồng bộ từ dữ liệu của bạn."}
          </p>

          {/* Close & Edit Buttons */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-white hover:text-[#a3e635] transition-colors group pr-2"
              >
                <PencilLine className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase hidden sm:block">{"Chỉnh sửa"}</span>
              </button>
            )}
            {isOpen && onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition-all text-text-tertiary hover:text-white group"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* View / Edit Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-10 custom-scrollbar">
          {isEditing && (
            <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg mb-4 text-center">
               <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-white">{"Lưu ý: Các trường có dấu * là bắt buộc phải điền"}</p>
            </div>
          )}
          <fieldset disabled={!isEditing} className="space-y-10 disabled:opacity-90">
            {/* Section 1: Thông tin cá nhân */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 border-l-4 border-[#a3e635] pl-4">
                <User className="w-5 h-5 text-[#a3e635]" />
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight text-white">{"1. Nhân khẩu học & Nghề nghiệp"}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Họ và tên"} <span className="text-red-500">*</span></label>
                  <input required name="full_name" value={formData.full_name} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.full_name ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635] text-white disabled:bg-bg-tertiary/20 disabled:border-transparent`} placeholder={"Nguyễn Văn A"} />
                  {isSubmitted && !formData.full_name && <p className="text-red-500 text-[10px] mt-1 font-medium">Vui lòng nhập họ và tên</p>}
                </div>
                <div className="space-y-1.5 opacity-70">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Email (Tự điền)"} <span className="text-red-500">*</span></label>
                  <input readOnly type="email" name="email" value={formData.email} className="w-full bg-bg-tertiary/50 border border-border-primary rounded-xl py-2 px-3 text-sm outline-none cursor-not-allowed text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Số điện thoại"} <span className="text-red-500">*</span></label>
                  <input required type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.phone ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635] text-white disabled:bg-bg-tertiary/20 disabled:border-transparent`} placeholder={"090 123 4567"} />
                  {isSubmitted && !formData.phone && <p className="text-red-500 text-[10px] mt-1 font-medium">Vui lòng nhập số điện thoại</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Ngày sinh"} <span className="text-red-500">*</span></label>
                  <input required type="date" name="birthday" value={formData.birthday} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.birthday ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635] text-white disabled:bg-bg-tertiary/20 disabled:border-transparent`} />
                  {isSubmitted && !formData.birthday && <p className="text-red-500 text-[10px] mt-1 font-medium">Vui lòng chọn ngày sinh</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Giới tính"} <span className="text-red-500">*</span></label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.gender ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635] text-white disabled:bg-bg-tertiary/20 disabled:border-transparent disabled:appearance-none`}>
                    <option value="Nam">{"Nam"}</option>
                    <option value="Nữ">{"Nữ"}</option>
                    <option value="Khác">{"Khác"}</option>
                  </select>
                  {isSubmitted && !formData.gender && <p className="text-red-500 text-[10px] mt-1 font-medium">Vui lòng chọn giới tính</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Công việc hiện tại"}</label>
                  <input name="job" value={formData.job} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635] text-white disabled:bg-bg-tertiary/20 disabled:border-transparent" placeholder={"Vd: Văn phòng, Tự do..."} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3 border-l-4 border-blue-400 pl-4">
                <Ruler className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight text-white">{"2. Chỉ số cơ thể & Thành phần mỡ"}</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Chiều cao (cm)"} <span className="text-red-500">*</span></label>
                  <input required type="number" name="height" value={formData.height} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && (!formData.height || formData.height === '0') ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-blue-400 text-white`} placeholder="175" />
                  {isSubmitted && (!formData.height || formData.height === '0') && <p className="text-red-500 text-[10px] mt-1 font-medium">Vui lòng nhập chiều cao</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Cân nặng (kg)"} <span className="text-red-500">*</span></label>
                  <input required type="number" name="weight" value={formData.weight} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && (!formData.weight || formData.weight === '0') ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-blue-400 text-white`} placeholder="70" />
                  {isSubmitted && (!formData.weight || formData.weight === '0') && <p className="text-red-500 text-[10px] mt-1 font-medium">Vui lòng nhập cân nặng</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Cân nặng đích (kg)"} <span className="text-red-500">*</span></label>
                  <input required type="number" name="target_weight" value={formData.target_weight} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && (!formData.target_weight || formData.target_weight === '0') ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-blue-400 text-white`} placeholder="65" />
                  {isSubmitted && (!formData.target_weight || formData.target_weight === '0') && <p className="text-red-500 text-[10px] mt-1 font-medium">Vui lòng nhập cân nặng đích</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"% Mỡ cơ thể (nếu biết)"}</label>
                  <input type="number" name="body_fat" value={formData.body_fat} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-blue-400 text-white" placeholder="15" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 bg-bg-tertiary/30 p-4 rounded-2xl border border-border-primary/50">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-tertiary uppercase text-center block">{"Vòng ngực"}</label>
                  <input type="number" name="chest" value={formData.chest} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-lg py-1.5 px-2 text-center text-xs outline-none focus:border-blue-400 text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-tertiary uppercase text-center block">{"Vòng bụng"}</label>
                  <input type="number" name="waist" value={formData.waist} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-lg py-1.5 px-2 text-center text-xs outline-none focus:border-blue-400 text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-tertiary uppercase text-center block">{"Vòng mông"}</label>
                  <input type="number" name="hips" value={formData.hips} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-lg py-1.5 px-2 text-center text-xs outline-none focus:border-blue-400 text-white" />
                </div>
                <div className="space-y-1 flex flex-col justify-center items-center">
                  <label className="text-[9px] font-bold text-[#a3e635] uppercase text-center block">{"Chỉ số BMI"}</label>
                  <div className="w-full bg-[#a3e635]/10 border border-[#a3e635]/30 rounded-lg py-1.5 px-2 text-center text-xs font-bold text-[#a3e635]">
                    {BMI}
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Dinh dưỡng */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 border-l-4 border-emerald-500 pl-4">
                <Apple className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight text-white">{"3. Chế độ dinh dưỡng & Ăn uống"}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Chế độ ăn & Sở thích"}</label>
                  <select name="diet_preference" value={formData.diet_preference} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500 text-white">
                    <option value="Bình thường">{"Bình thường"}</option>
                    <option value="Ăn chay (Có thể ăn chay)">{"Ăn chay (Có thể ăn chay)"}</option>
                    <option value="Ăn nhiều đạm (High Protein)">{"Ăn nhiều đạm (High Protein)"}</option>
                    <option value="Keto / Low Carb">{"Keto / Low Carb"}</option>
                    <option value="Eat Clean">{"Eat Clean"}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Khả năng nấu nướng"}</label>
                  <select name="cooking_ability" value={formData.cooking_ability} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500 text-white">
                    <option value="Tự nấu 100%">{"Tự nấu 100%"}</option>
                    <option value="Ăn ngoài quán">{"Ăn ngoài quán"}</option>
                    <option value="Tự nấu tối, ăn ngoài trưa">{"Tự nấu tối, ăn ngoài trưa"}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Số bữa ăn/ngày"}</label>
                  <select name="meals_per_day" value={formData.meals_per_day} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500 text-white">
                    <option value="2">{"2 bữa"}</option>
                    <option value="3">{"3 bữa chính"}</option>
                    <option value="4">{"3 bữa chính + 1 bữa phụ"}</option>
                    <option value="5">{"5 bữa nhỏ/ngày"}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Mục tiêu uống nước (L/ngày)"}</label>
                  <div className="relative">
                    <Droplet className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400" />
                    <input type="number" step="0.1" name="daily_water_goal" value={formData.daily_water_goal} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 text-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Ngân sách ăn uống"}</label>
                  <select name="budget_level" value={formData.budget_level} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500 text-white">
                    <option value="Sinh viên (Rẻ, Tiết kiệm)">{"Sinh viên (Rẻ, Tiết kiệm)"}</option>
                    <option value="Trung bình (Cơ bản)">{"Trung bình (Cơ bản)"}</option>
                    <option value="Cao cấp (Đủ loại thực phẩm)">{"Cao cấp (Đủ loại thực phẩm)"}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Thực đơn hiện tại"}</label>
                  <input name="current_diet" value={formData.current_diet} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500 text-white" placeholder={"Vd: Sáng bún, trưa cơm tiệm, tối cơm nhà..."} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Dị ứng / Kiêng kỵ (Blacklist)"}</label>
                  <input name="allergies" value={formData.allergies} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500 text-white" placeholder={"Vd: Hải sản, Sữa bò (Lactose), Đậu phộng..."} />
                </div>
              </div>
            </section>

            {/* Section 4: Tình trạng y tế */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4">
                <Stethoscope className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight text-white">{"4. Tình trạng sức khỏe & Y tế"}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Khói thuốc & Rượu bia"}</label>
                  <select name="smoke_drink" value={formData.smoke_drink} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-red-500 text-white">
                    <option value="Không bao giờ">{"Không bao giờ"}</option>
                    <option value="Thỉnh thoảng">{"Thỉnh thoảng"}</option>
                    <option value="Thường xuyên">{"Thường xuyên"}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Các loại thuốc đang sử dụng"}</label>
                  <input name="medications" value={formData.medications} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-red-500 text-white" placeholder={"Vd: Thuốc huyết áp, tiểu đường..."} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Bệnh nền"}</label>
                  <textarea name="health_condition" value={formData.health_condition} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 px-4 h-24 text-sm outline-none focus:border-red-500 text-white" placeholder={"Vd: Cao huyết áp, Tiểu đường tuýp 2..."} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Chấn thương cũ"}</label>
                  <textarea name="injuries" value={formData.injuries} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 px-4 h-24 text-sm outline-none focus:border-red-500 text-white" placeholder={"Vd: Thoát vị đĩa đệm, Đau đầu gối..."} />
                </div>
              </div>

              <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl">
                <p className="text-[10px] text-red-400 font-medium leading-relaxed italic">
                  {"* Lưu ý: Nếu bạn có bệnh nền nặng, hãy tham khảo ý kiến bác sĩ trước khi bắt đầu bất kỳ lộ trình tập luyện cường độ cao nào. AI sẽ dựa trên thông tin này để giới hạn nhịp tim và áp lực lên khớp."}
                </p>
              </div>
            </section>

            {/* Section 5: Kinh nghiệm & Thói quen vận động */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 border-l-4 border-orange-500 pl-4">
                <Zap className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight text-white">{"5. Kinh nghiệm & Thói quen vận động"}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Tính chất công việc"}</label>
                  <select name="work_nature" value={formData.work_nature} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white">
                    <option value="Ngồi văn phòng nhiều (Sedentary)">{"Ngồi văn phòng nhiều (Sedentary)"}</option>
                    <option value="Di chuyển nhẹ nhàng">{"Di chuyển nhẹ nhàng"}</option>
                    <option value="Vận động liên tục (Lao động tay chân)">{"Vận động liên tục (Lao động tay chân)"}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Địa điểm tập luyện"}</label>
                  <select name="workout_location" value={formData.workout_location} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white">
                    <option value="Phòng Gym chuyên nghiệp">{"Phòng Gym chuyên nghiệp"}</option>
                    <option value="Tập tại nhà (Home Workout)">{"Tập tại nhà (Home Workout)"}</option>
                    <option value="Công viên / Ngoài trời">{"Công viên / Ngoài trời"}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Kinh nghiệm tập"}</label>
                  <select name="experience_level" value={formData.experience_level} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white">
                    <option value="Người mới hoàn toàn">{"Người mới hoàn toàn"}</option>
                    <option value="Dưới 6 tháng">{"Dưới 6 tháng"}</option>
                    <option value="6 tháng - 2 năm">{"6 tháng - 2 năm"}</option>
                    <option value="Trên 2 năm">{"Trên 2 năm"}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Tần suất tập hiện tại"}</label>
                  <select name="activity_level" value={formData.activity_level} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white">
                    <option value="Chưa tập luyện">{"Chưa tập luyện"}</option>
                    <option value="1-2 buổi/tuần">{"1-2 buổi/tuần"}</option>
                    <option value="3-4 buổi/tuần">{"3-4 buổi/tuần"}</option>
                    <option value="Trên 5 buổi/tuần">{"Trên 5 buổi/tuần"}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Thời lượng/buổi (phút)"}</label>
                  <input type="number" name="workout_duration" value={formData.workout_duration} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white" placeholder="45" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Dụng cụ sẵn có"}</label>
                  <select name="equipment_available" value={formData.equipment_available} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white">
                    <option value="Đầy đủ tạ & máy móc (Gym)">{"Đầy đủ tạ & máy móc (Gym)"}</option>
                    <option value="Tạ đơn (Dumbbells) & Thảm">{"Tạ đơn (Dumbbells) & Thảm"}</option>
                    <option value="Dây kháng lực (Resistance Bands)">{"Dây kháng lực (Resistance Bands)"}</option>
                    <option value="Không dụng cụ (Calisthenics)">{"Không dụng cụ (Calisthenics)"}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Số giờ ngủ/ngày"}</label>
                  <select name="sleep_hours" value={formData.sleep_hours} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white">
                    <option value="4">{"Dưới 5 giờ"}</option>
                    <option value="6">{"5-6 giờ"}</option>
                    <option value="7">{"7-8 giờ"}</option>
                    <option value="9">{"Trên 8 giờ"}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Chất lượng giấc ngủ"}</label>
                  <select name="sleep_quality" value={formData.sleep_quality} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white">
                    <option value="Rất tốt (Sâu giấc, tỉnh táo)">{"Rất tốt (Sâu giấc, tỉnh táo)"}</option>
                    <option value="Bình thường (Hay thức giấc)">{"Bình thường (Hay thức giấc)"}</option>
                    <option value="Kém (Khó ngủ, mệt mỏi)">{"Kém (Khó ngủ, mệt mỏi)"}</option>
                  </select>
                </div>
              </div>

              <div className="bg-orange-500/5 border border-orange-500/20 p-3 rounded-xl flex gap-3 items-center">
                <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                <p className="text-[9px] text-text-tertiary uppercase tracking-wider font-bold leading-relaxed text-white">
                  {"Giấc ngủ ảnh hưởng 80% quá trình phục hồi. AI sẽ cân đối bài tập dựa trên khả năng hồi phục của bạn."}
                </p>
              </div>
            </section>

            {/* Section 6: Tâm lý & Động lực AI */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 border-l-4 border-purple-500 pl-4">
                <Heart className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight text-white">{"6. Tâm lý & Động lực AI"}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Mức độ Stress hàng ngày"}</label>
                  <select name="stress_level" value={formData.stress_level} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-purple-500 text-white">
                    <option value="Thấp - Cuộc sống thoải mái">{"Thấp - Cuộc sống thoải mái"}</option>
                    <option value="Trung bình - Áp lực công việc nhẹ">{"Trung bình - Áp lực công việc nhẹ"}</option>
                    <option value="Cao - Thường xuyên căng thẳng">{"Cao - Thường xuyên căng thẳng"}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Động lực lớn nhất của bạn"}</label>
                  <input name="motivation" value={formData.motivation} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-purple-500 text-white" placeholder={"Vd: Để mặc quần áo đẹp, Cải thiện sức khỏe..."} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Thông điệp gửi AI (Yêu cầu riêng biệt)"}</label>
                <textarea name="expectations" value={formData.expectations} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 px-4 h-20 text-sm outline-none focus:border-purple-500 text-white" placeholder={"Tôi muốn tập trung vào phần mông, tôi không thích ăn rau cải..."} />
              </div>
            </section>
            <div className="bg-[#a3e635]/5 border border-[#a3e635]/20 p-4 rounded-2xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#a3e635] shrink-0" />
              <p className="text-[10px] text-text-secondary leading-relaxed uppercase tracking-wider text-white">
                {"Xác nhận: Thông tin này sẽ được mã hóa và gửi tới TrendFit AI Engine. Dữ liệu này là cơ sở để chúng tôi cá nhân hóa 100% lộ trình của bạn."}
              </p>
            </div>
        </fieldset>
      </form>

        {/* Footer */}
        <div className="p-4 md:p-5 border-t border-border-primary bg-bg-tertiary/50 backdrop-blur-xl flex justify-between items-center">
          <div className="hidden sm:block">
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-[2px]">TrendFit AI Precision Profile</span>
          </div>
          {isEditing ? (
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 sm:flex-none border border-border-primary text-text-secondary hover:text-white font-bold py-2.5 px-8 rounded-xl hover:bg-white/5 transition-all text-sm"
              >
                {"HỦY"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 sm:flex-none bg-[#a3e635] text-black font-black py-2.5 px-8 rounded-xl hover:bg-[#bef264] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{"CẬP NHẬT HỒ SƠ"} <Zap className="w-4 h-4" /></>}
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full sm:w-auto bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-2.5 px-8 rounded-xl transition-all text-sm"
            >
              {"ĐÓNG"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
