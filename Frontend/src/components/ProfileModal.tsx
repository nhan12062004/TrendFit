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
import { useTranslation } from 'react-i18next';

interface ProfileModalProps {
  onComplete?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ProfileModal({ onComplete, isOpen, onClose }: ProfileModalProps) {
  const { user, refreshProfile } = useAuth();
  const { t } = useTranslation();
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
            <span className="text-[9px] font-bold text-[#a3e635] uppercase tracking-[3px]">{t('survey.ai_system')}</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-text-primary text-white">
            {isEditing ? t('survey.edit_title') : t('survey.common_profile_title', { defaultValue: 'Hồ sơ sức khỏe của bạn' })}
          </h2>
          <p className="text-[11px] text-text-secondary">
            {isEditing 
              ? t('survey.subtitle_1') + ' ' + t('survey.subtitle_highlight') + ' ' + t('survey.subtitle_2')
              : t('survey.view_subtitle')}
          </p>

          {/* Close & Edit Buttons */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-white hover:text-[#a3e635] transition-colors group pr-2"
              >
                <PencilLine className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase hidden sm:block">{t('survey.buttons.edit')}</span>
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
               <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-white">{t('survey.required_note')}</p>
            </div>
          )}
          <fieldset disabled={!isEditing} className="space-y-10 disabled:opacity-90">
            {/* Section 1: Thông tin cá nhân */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 border-l-4 border-[#a3e635] pl-4">
                <User className="w-5 h-5 text-[#a3e635]" />
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight text-white">{t('survey.sections.demographics')}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.full_name')} <span className="text-red-500">*</span></label>
                  <input required name="full_name" value={formData.full_name} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.full_name ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635] text-white disabled:bg-bg-tertiary/20 disabled:border-transparent`} placeholder={t('survey.placeholders.full_name')} />
                </div>
                <div className="space-y-1.5 opacity-70">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.email_auto')} <span className="text-red-500">*</span></label>
                  <input readOnly type="email" name="email" value={formData.email} className="w-full bg-bg-tertiary/50 border border-border-primary rounded-xl py-2 px-3 text-sm outline-none cursor-not-allowed text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.phone')} <span className="text-red-500">*</span></label>
                  <input required type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.phone ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635] text-white disabled:bg-bg-tertiary/20 disabled:border-transparent`} placeholder={t('survey.placeholders.phone')} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.birthday')} <span className="text-red-500">*</span></label>
                  <input required type="date" name="birthday" value={formData.birthday} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.birthday ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635] text-white disabled:bg-bg-tertiary/20 disabled:border-transparent`} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.gender')} <span className="text-red-500">*</span></label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.gender ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635] text-white disabled:bg-bg-tertiary/20 disabled:border-transparent disabled:appearance-none`}>
                    <option value="Nam">{t('survey.options.gender.male')}</option>
                    <option value="Nữ">{t('survey.options.gender.female')}</option>
                    <option value="Khác">{t('survey.options.gender.other')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.job')}</label>
                  <input name="job" value={formData.job} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635] text-white disabled:bg-bg-tertiary/20 disabled:border-transparent" placeholder={t('survey.placeholders.job')} />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3 border-l-4 border-blue-400 pl-4">
                <Ruler className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight text-white">{t('survey.sections.body_metrics')}</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.height')} <span className="text-red-500">*</span></label>
                  <input required type="number" name="height" value={formData.height} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.height ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-blue-400 text-white`} placeholder="175" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.weight')} <span className="text-red-500">*</span></label>
                  <input required type="number" name="weight" value={formData.weight} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.weight ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-blue-400 text-white`} placeholder="70" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.target_weight')} <span className="text-red-500">*</span></label>
                  <input required type="number" name="target_weight" value={formData.target_weight} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.target_weight ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-blue-400 text-white`} placeholder="65" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.body_fat')}</label>
                  <input type="number" name="body_fat" value={formData.body_fat} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-blue-400 text-white" placeholder="15" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 bg-bg-tertiary/30 p-4 rounded-2xl border border-border-primary/50">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-tertiary uppercase text-center block">{t('survey.labels.chest')}</label>
                  <input type="number" name="chest" value={formData.chest} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-lg py-1.5 px-2 text-center text-xs outline-none focus:border-blue-400 text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-tertiary uppercase text-center block">{t('survey.labels.waist')}</label>
                  <input type="number" name="waist" value={formData.waist} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-lg py-1.5 px-2 text-center text-xs outline-none focus:border-blue-400 text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-text-tertiary uppercase text-center block">{t('survey.labels.hips')}</label>
                  <input type="number" name="hips" value={formData.hips} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-lg py-1.5 px-2 text-center text-xs outline-none focus:border-blue-400 text-white" />
                </div>
                <div className="space-y-1 flex flex-col justify-center items-center">
                  <label className="text-[9px] font-bold text-[#a3e635] uppercase text-center block">{t('survey.labels.bmi')}</label>
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
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight text-white">{t('survey.sections.nutrition')}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.diet_preference')}</label>
                  <select name="diet_preference" value={formData.diet_preference} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500 text-white">
                    <option value="Bình thường">{t('survey.options.diet.normal')}</option>
                    <option value="Ăn chay (Có thể ăn chay)">{t('survey.options.diet.vegetarian')}</option>
                    <option value="Ăn nhiều đạm (High Protein)">{t('survey.options.diet.high_protein')}</option>
                    <option value="Keto / Low Carb">{t('survey.options.diet.keto')}</option>
                    <option value="Eat Clean">{t('survey.options.diet.eat_clean')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.cooking_ability')}</label>
                  <select name="cooking_ability" value={formData.cooking_ability} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500 text-white">
                    <option value="Tự nấu 100%">{t('survey.options.cooking.self')}</option>
                    <option value="Ăn ngoài quán">{t('survey.options.cooking.out')}</option>
                    <option value="Tự nấu tối, ăn ngoài trưa">{t('survey.options.cooking.mixed')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.meals_per_day')}</label>
                  <select name="meals_per_day" value={formData.meals_per_day} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500 text-white">
                    <option value="2">{t('survey.options.meals.2')}</option>
                    <option value="3">{t('survey.options.meals.3')}</option>
                    <option value="4">{t('survey.options.meals.4')}</option>
                    <option value="5">{t('survey.options.meals.5')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.water_goal')}</label>
                  <div className="relative">
                    <Droplet className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-400" />
                    <input type="number" step="0.1" name="daily_water_goal" value={formData.daily_water_goal} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 text-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.budget')}</label>
                  <select name="budget_level" value={formData.budget_level} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500 text-white">
                    <option value="Sinh viên (Rẻ, Tiết kiệm)">{t('survey.options.budget.student')}</option>
                    <option value="Trung bình (Cơ bản)">{t('survey.options.budget.normal')}</option>
                    <option value="Cao cấp (Đủ loại thực phẩm)">{t('survey.options.budget.premium')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.current_diet')}</label>
                  <input name="current_diet" value={formData.current_diet} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500 text-white" placeholder={t('survey.placeholders.current_diet')} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.allergies')}</label>
                  <input name="allergies" value={formData.allergies} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500 text-white" placeholder={t('survey.placeholders.allergies')} />
                </div>
              </div>
            </section>

            {/* Section 4: Tình trạng y tế */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4">
                <Stethoscope className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight text-white">{t('survey.sections.health')}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.smoke_drink')}</label>
                  <select name="smoke_drink" value={formData.smoke_drink} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-red-500 text-white">
                    <option value="Không bao giờ">{t('survey.options.smoke_drink.never')}</option>
                    <option value="Thỉnh thoảng">{t('survey.options.smoke_drink.sometimes')}</option>
                    <option value="Thường xuyên">{t('survey.options.smoke_drink.frequently')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.medications')}</label>
                  <input name="medications" value={formData.medications} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-red-500 text-white" placeholder={t('survey.placeholders.medications')} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.health_condition')}</label>
                  <textarea name="health_condition" value={formData.health_condition} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 px-4 h-24 text-sm outline-none focus:border-red-500 text-white" placeholder={t('survey.placeholders.health_condition')} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.injuries')}</label>
                  <textarea name="injuries" value={formData.injuries} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 px-4 h-24 text-sm outline-none focus:border-red-500 text-white" placeholder={t('survey.placeholders.injuries')} />
                </div>
              </div>

              <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl">
                <p className="text-[10px] text-red-400 font-medium leading-relaxed italic">
                  {t('survey.notes.health_warning')}
                </p>
              </div>
            </section>

            {/* Section 5: Kinh nghiệm & Thói quen vận động */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 border-l-4 border-orange-500 pl-4">
                <Zap className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight text-white">{t('survey.sections.experience')}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.work_nature')}</label>
                  <select name="work_nature" value={formData.work_nature} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white">
                    <option value="Ngồi văn phòng nhiều (Sedentary)">{t('survey.options.work.sedentary')}</option>
                    <option value="Di chuyển nhẹ nhàng">{t('survey.options.work.light')}</option>
                    <option value="Vận động liên tục (Lao động tay chân)">{t('survey.options.work.active')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.workout_location')}</label>
                  <select name="workout_location" value={formData.workout_location} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white">
                    <option value="Phòng Gym chuyên nghiệp">{t('survey.options.location.gym')}</option>
                    <option value="Tập tại nhà (Home Workout)">{t('survey.options.location.home')}</option>
                    <option value="Công viên / Ngoài trời">{t('survey.options.location.outdoor')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.experience_level')}</label>
                  <select name="experience_level" value={formData.experience_level} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white">
                    <option value="Người mới hoàn toàn">{t('survey.options.experience.newbie')}</option>
                    <option value="Dưới 6 tháng">{t('survey.options.experience.under_6m')}</option>
                    <option value="6 tháng - 2 năm">{t('survey.options.experience.6m_2y')}</option>
                    <option value="Trên 2 năm">{t('survey.options.experience.over_2y')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.activity_level')}</label>
                  <select name="activity_level" value={formData.activity_level} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white">
                    <option value="Chưa tập luyện">{t('survey.options.activity.none')}</option>
                    <option value="1-2 buổi/tuần">{t('survey.options.activity.1_2')}</option>
                    <option value="3-4 buổi/tuần">{t('survey.options.activity.3_4')}</option>
                    <option value="Trên 5 buổi/tuần">{t('survey.options.activity.5_plus')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.workout_duration')}</label>
                  <input type="number" name="workout_duration" value={formData.workout_duration} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white" placeholder="45" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.equipment')}</label>
                  <select name="equipment_available" value={formData.equipment_available} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white">
                    <option value="Đầy đủ tạ & máy móc (Gym)">{t('survey.options.equipment.gym')}</option>
                    <option value="Tạ đơn (Dumbbells) & Thảm">{t('survey.options.equipment.dumbbells')}</option>
                    <option value="Dây kháng lực (Resistance Bands)">{t('survey.options.equipment.bands')}</option>
                    <option value="Không dụng cụ (Calisthenics)">{t('survey.options.equipment.bodyweight')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.sleep_hours')}</label>
                  <select name="sleep_hours" value={formData.sleep_hours} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white">
                    <option value="4">{t('survey.options.sleep_h.under_5')}</option>
                    <option value="6">{t('survey.options.sleep_h.5_6')}</option>
                    <option value="7">{t('survey.options.sleep_h.7_8')}</option>
                    <option value="9">{t('survey.options.sleep_h.over_8')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.sleep_quality')}</label>
                  <select name="sleep_quality" value={formData.sleep_quality} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500 text-white">
                    <option value="Rất tốt (Sâu giấc, tỉnh táo)">{t('survey.options.sleep_q.excellent')}</option>
                    <option value="Bình thường (Hay thức giấc)">{t('survey.options.sleep_q.normal')}</option>
                    <option value="Kém (Khó ngủ, mệt mỏi)">{t('survey.options.sleep_q.poor')}</option>
                  </select>
                </div>
              </div>

              <div className="bg-orange-500/5 border border-orange-500/20 p-3 rounded-xl flex gap-3 items-center">
                <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                <p className="text-[9px] text-text-tertiary uppercase tracking-wider font-bold leading-relaxed text-white">
                  {t('survey.notes.sleep_tip')}
                </p>
              </div>
            </section>

            {/* Section 6: Tâm lý & Động lực AI */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 border-l-4 border-purple-500 pl-4">
                <Heart className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight text-white">{t('survey.sections.psychology')}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.stress_level')}</label>
                  <select name="stress_level" value={formData.stress_level} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-purple-500 text-white">
                    <option value="Thấp - Cuộc sống thoải mái">{t('survey.options.stress.low')}</option>
                    <option value="Trung bình - Áp lực công việc nhẹ">{t('survey.options.stress.medium')}</option>
                    <option value="Cao - Thường xuyên căng thẳng">{t('survey.options.stress.high')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.motivation')}</label>
                  <input name="motivation" value={formData.motivation} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-purple-500 text-white" placeholder={t('survey.placeholders.motivation')} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{t('survey.labels.expectations')}</label>
                <textarea name="expectations" value={formData.expectations} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 px-4 h-20 text-sm outline-none focus:border-purple-500 text-white" placeholder={t('survey.placeholders.expectations')} />
              </div>
            </section>
            <div className="bg-[#a3e635]/5 border border-[#a3e635]/20 p-4 rounded-2xl flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#a3e635] shrink-0" />
              <p className="text-[10px] text-text-secondary leading-relaxed uppercase tracking-wider text-white">
                {t('survey.notes.confirmation')}
              </p>
            </div>
        </fieldset>
      </form>

        {/* Footer */}
        <div className="p-4 md:p-5 border-t border-border-primary bg-bg-tertiary/50 backdrop-blur-xl flex justify-between items-center">
          <div className="hidden sm:block">
            <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-[2px]">TrendFit Precision Profile</span>
          </div>
          {isEditing ? (
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 sm:flex-none border border-border-primary text-text-secondary hover:text-white font-bold py-2.5 px-8 rounded-xl hover:bg-white/5 transition-all text-sm"
              >
                {t('survey.buttons.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 sm:flex-none bg-[#a3e635] text-black font-black py-2.5 px-8 rounded-xl hover:bg-[#bef264] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{t('survey.buttons.update')} <Zap className="w-4 h-4" /></>}
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full sm:w-auto bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-2.5 px-8 rounded-xl transition-all text-sm"
            >
              {t('survey.buttons.close')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
