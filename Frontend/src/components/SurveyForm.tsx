import React, { useState } from 'react';
import {
  User,
  Ruler,
  Apple,
  Stethoscope,
  Heart,
  Droplet,
  CheckCircle2,
  Loader2,
  Sparkles,
  Zap,
  Clock,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

interface SurveyFormProps {
  onComplete: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const TOTAL_STEPS = 6;
/** Nhãn ngắn trên thanh bước (theo mockup) */
const STEP_NAV_LABELS = [
  'Thông tin cá nhân',
  'Chỉ số cơ thể',
  'Chế độ dinh dưỡng',
  'Tình trạng sức khỏe',
  'Thói quen vận động',
  'Xác nhận & hoàn tất'
];

type StepIcon = React.ComponentType<{ className?: string }>;

interface StepSurveyCardProps {
  icon: StepIcon;
  iconWrapClass: string;
  iconClass: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function StepSurveyCard({ icon: Icon, iconWrapClass, iconClass, title, subtitle, children }: StepSurveyCardProps) {
  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-border-primary bg-bg-tertiary/30 p-4 md:p-5 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconWrapClass}`}>
            <Icon className={iconClass} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-base font-black uppercase tracking-tight text-text-primary md:text-lg">{title}</h3>
            <p className="text-[11px] leading-relaxed text-text-secondary md:text-xs">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

// Body fat reference data
const BODY_FAT_REFS = {
  Nam: [
    { range: '3-4%', label: 'Cực kỳ săn nét', color: '#22d3ee', desc: 'Thi đấu thể hình, rất ít mỡ', emoji: 'trophy' },
    { range: '5-7%', label: 'Săn nét vượt trội', color: '#a3e635', desc: 'Cơ bắp nổi cuồn cuộn, mạch máu rõ', emoji: 'muscle' },
    { range: '8-10%', label: 'Săn chắc', color: '#facc15', desc: 'Thấy rõ 6 múi, rất fit', emoji: 'check' },
    { range: '14-15%', label: 'Thể hình cân đối', color: '#fb923c', desc: 'Dáng chuẩn, hơi thấy cơ bụng', emoji: 'star' },
    { range: '20-22%', label: 'Mỡ vừa phải', color: '#f97316', desc: 'Vóc dáng bình thường', emoji: 'warn' },
    { range: '30-32%', label: 'Mỡ nhiều', color: '#ef4444', desc: 'Thừa cân, cần giảm mỡ', emoji: 'alert' },
  ],
  Nu: [
    { range: '10-12%', label: 'Cực kỳ săn nét', color: '#22d3ee', desc: 'Thi đấu thể hình, rất ít mỡ', emoji: 'trophy' },
    { range: '15-17%', label: 'Săn nét vượt trội', color: '#a3e635', desc: 'Cơ bắp lộ rõ, vóc dáng athletic', emoji: 'muscle' },
    { range: '20-22%', label: 'Săn chắc', color: '#facc15', desc: 'Dáng chuẩn fitness, eo thon', emoji: 'check' },
    { range: '25-27%', label: 'Thể hình cân đối', color: '#fb923c', desc: 'Vóc dáng bình thường, khỏe mạnh', emoji: 'star' },
    { range: '30-32%', label: 'Mỡ vừa phải', color: '#f97316', desc: 'Hơi đầy đặn', emoji: 'warn' },
    { range: '40-42%', label: 'Mỡ nhiều', color: '#ef4444', desc: 'Thừa cân, cần giảm mỡ', emoji: 'alert' },
  ],
};
const MID_VALUES: Record<string, string> = {
  "3-4%": "3.5", "5-7%": "6", "8-10%": "9", "14-15%": "14.5", "20-22%": "21", "30-32%": "31",
  "10-12%": "11", "15-17%": "16", "25-27%": "26", "40-42%": "41"
};
function BodyFatRefButton({ gender, onSelect }: { gender: string; onSelect: (val: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const refs = gender === "Nam" ? BODY_FAT_REFS.Nam : BODY_FAT_REFS.Nu;
  const EMOJIS: Record<string, string> = { trophy: "🏆", muscle: "💪", check: "✅", star: "✨", warn: "⚠️", alert: "🚨" };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full text-[9px] text-blue-400/70 hover:text-blue-400 text-center transition-all underline underline-offset-2">
        Ảnh minh họa
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative bg-bg-secondary border border-border-primary rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-base font-black text-text-primary">📊 Ước tính % Mỡ cơ thể</h4>
                <p className="text-[10px] text-text-tertiary mt-0.5">Chọn mức gần nhất với vóc dáng ({gender})</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-text-tertiary hover:text-white p-1"><X className="w-5 h-5" /></button>
            </div>
            <img
              src={
                gender === 'Nam'
                  ? 'https://wpkbzssdipqtbmthvgvx.supabase.co/storage/v1/object/public/media-assets/body_fat_reference/body_fat_male.png'
                  : 'https://wpkbzssdipqtbmthvgvx.supabase.co/storage/v1/object/public/media-assets/body_fat_reference/body_fat_female.png'
              }
              alt={`Body fat reference ${gender}`}
              className="w-full rounded-2xl border border-border-primary object-cover"
            />
            <div className="grid grid-cols-1 gap-2">
              {refs.map(ref => (
                <button key={ref.range} type="button" onClick={() => { onSelect(MID_VALUES[ref.range] || "20"); setOpen(false); }} className="flex items-center gap-3 w-full p-3 rounded-xl border border-border-primary hover:border-blue-400/60 bg-bg-tertiary/50 hover:bg-bg-tertiary transition-all text-left group">
                  <span className="text-xl">{EMOJIS[ref.emoji] || ref.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black" style={{ color: ref.color }}>{ref.range}</span>
                      <span className="text-xs font-bold text-text-primary">{ref.label}</span>
                    </div>
                    <p className="text-[10px] text-text-tertiary">{ref.desc}</p>
                  </div>
                  <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">Chọn →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


export default function SurveyForm({ onComplete, isOpen, onClose }: SurveyFormProps) {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  // ... rest of state stays same for now as they are values sent to DB
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
    neck: '',
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
      if (!h || !w || h <= 0 || w <= 0) return '';
      return (w / ((h / 100) ** 2)).toFixed(1);
    })()
    : '';

  // US Navy Body Fat Method
  const computedBodyFat = (() => {
    const h = parseFloat(formData.height);
    const neck = parseFloat(formData.neck);
    const waist = parseFloat(formData.waist);
    const hips = parseFloat(formData.hips);
    if (!h || !neck || !waist || h <= 0 || neck <= 0 || waist <= 0) return null;
    if (formData.gender === 'Nam') {
      if (waist <= neck) return null;
      const bf = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(h) + 36.76;
      return Math.max(0, Math.min(60, bf)).toFixed(1);
    } else {
      if (!hips || hips <= 0) return null;
      if ((waist + hips) <= neck) return null;
      const bf = 163.205 * Math.log10(waist + hips - neck) - 97.684 * Math.log10(h) - 78.387;
      return Math.max(0, Math.min(60, bf)).toFixed(1);
    }
  })();

  React.useEffect(() => {
    async function loadCurrentData() {
      if (!user || !isOpen) return;
      setIsPreloading(true);
      try {
        const [p, b, l, h] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('body_metrics').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('lifestyle_settings').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('health_conditions').select('*').eq('user_id', user.id).maybeSingle()
        ]);
        // ... (data update logic remains same)
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
            neck: (b.data?.neck && b.data.neck !== 0) ? b.data.neck.toString() : '',
            chest: (b.data?.chest && b.data.chest !== 0) ? b.data.chest.toString() : '',
            waist: (b.data?.waist && b.data.waist !== 0) ? b.data.waist.toString() : '',
            hips: (b.data?.hips && b.data.hips !== 0) ? b.data.hips.toString() : '',
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
      } finally {
        setIsPreloading(false);
      }
    }
    loadCurrentData();
  }, [user, isOpen]);

  React.useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setIsSubmitted(false);
    }
  }, [isOpen]);

  const getFirstInvalidStep = (): number | null => {
    if (!formData.full_name || !formData.phone || !formData.birthday || !formData.gender) return 1;
    if (
      !formData.height ||
      formData.height === '0' ||
      !formData.weight ||
      formData.weight === '0' ||
      !formData.target_weight ||
      formData.target_weight === '0'
    ) {
      return 2;
    }
    return null;
  };

  const goNext = () => {
    setIsSubmitted(true);
    if (currentStep === 1) {
      if (!formData.full_name || !formData.phone || !formData.birthday || !formData.gender) return;
    }
    if (currentStep === 2) {
      if (
        !formData.height ||
        formData.height === '0' ||
        !formData.weight ||
        formData.weight === '0' ||
        !formData.target_weight ||
        formData.target_weight === '0'
      ) {
        return;
      }
    }
    setIsSubmitted(false);
    if (currentStep < TOTAL_STEPS) setCurrentStep(s => s + 1);
  };

  const goPrev = () => {
    setIsSubmitted(false);
    setCurrentStep(s => Math.max(1, s - 1));
  };

  if (isPreloading || loading) {
    return (
      <div className="fixed inset-0 z-[70]">
        <LoadingScreen />
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (currentStep < TOTAL_STEPS) {
      goNext();
      return;
    }
    setIsSubmitted(true);
    const invalidStep = getFirstInvalidStep();
    if (invalidStep !== null) {
      setCurrentStep(invalidStep);
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
          body_fat: computedBodyFat ? parseFloat(computedBodyFat) : (formData.body_fat ? parseFloat(formData.body_fat) : null),
          neck: formData.neck ? parseFloat(formData.neck) : null,
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
      onComplete();
    } catch (err: any) {
      console.error('Error saving multi-table profile:', err);
      alert(`Lỗi hệ thống: ${err?.message || err?.details || 'Thông tin không hợp lệ'}. Vui lòng check Console (F12)`);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Modal Content */}
      <div className="relative w-full max-w-4xl bg-bg-secondary border border-border-primary rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in duration-300">

        {/* Close Button (Only for Profile Editing) */}
        {isOpen && onClose && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-[70] p-2 hover:bg-white/10 rounded-xl transition-all text-text-tertiary hover:text-white group bg-bg-tertiary/50 backdrop-blur-md"
          >
            <X className="w-6 h-6" />
          </button>
        )}

        {/* Header */}
        {currentStep === 1 && (
          <div className="px-4 pt-6 pb-0 md:px-8 md:pt-7 md:pb-0 relative z-10">
            <h2 className="text-2xl md:text-3xl font-black text-text-primary leading-tight pr-12">
              {isOpen ? "Chỉnh sửa hồ sơ sức khỏe 👋" : "Chào mừng đến với TrendFit AI 👋"}
            </h2>
            <p className="text-sm md:text-base text-text-secondary mt-2 pr-12">
              {isOpen 
                ? "Cập nhật thông tin của bạn để AI có thể điều chỉnh kế hoạch tập luyện và thực đơn phù hợp hơn." 
                : "Tôi sẽ hỏi bạn vài thông tin để tạo kế hoạch tập luyện và thực đơn cá nhân hóa."}
            </p>
          </div>
        )}

        {/* Step progress — vòng tròn + đường nối */}
        <div className="px-4 pt-4 pb-2 md:px-8 md:pt-5 md:pb-2 bg-bg-secondary/80">
          <div className="rounded-2xl border border-border-primary bg-bg-tertiary/30 px-3 py-4 md:px-5 md:py-5">
            <div className="-mx-1 overflow-x-auto pb-1 md:mx-0 md:overflow-visible">
            <div className="flex w-full min-w-[520px] md:min-w-0">
              {STEP_NAV_LABELS.map((label, idx) => {
                const n = idx + 1;
                const active = n === currentStep;
                return (
                  <div key={n} className="flex min-w-0 flex-1 flex-col items-stretch">
                    <div className="flex items-center">
                      {idx > 0 ? (
                        <div
                          className={`h-0.5 flex-1 rounded-full transition-colors ${currentStep > idx ? 'bg-[#a3e635]/80' : 'bg-border-primary/50'}`}
                          aria-hidden
                        />
                      ) : (
                        <div className="flex-1" aria-hidden />
                      )}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors md:h-9 md:w-9 md:text-sm ${active ? 'bg-[#a3e635] text-black shadow-[0_0_12px_rgba(163,230,53,0.35)]' : 'border border-border-primary bg-bg-secondary text-text-primary'}`}
                        aria-current={active ? 'step' : undefined}
                      >
                        {n}
                      </div>
                      {idx < TOTAL_STEPS - 1 ? (
                        <div
                          className={`h-0.5 flex-1 rounded-full transition-colors ${currentStep > n ? 'bg-[#a3e635]/80' : 'bg-border-primary/50'}`}
                          aria-hidden
                        />
                      ) : (
                        <div className="flex-1" aria-hidden />
                      )}
                    </div>
                    <p
                      className={`mt-2 text-center text-[8px] font-bold leading-tight md:text-[10px] ${active ? 'text-[#a3e635]' : 'text-text-tertiary'}`}
                    >
                      {label}
                    </p>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form id="survey-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 md:px-8 pt-2 pb-5 md:pt-3 md:pb-7 space-y-8 custom-scrollbar">
          {/* Section 1: Thông tin cá nhân */}
          {currentStep === 1 && (
          <StepSurveyCard
            icon={User}
            iconWrapClass="bg-[#a3e635]/15 ring-2 ring-[#a3e635]/40"
            iconClass="h-6 w-6 text-[#a3e635]"
            title={"1. Thông tin cá nhân"}
            subtitle={"Thông tin cơ bản giúp AI hiểu rõ hơn về bạn."}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-5 md:gap-x-5 md:gap-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Họ và tên"} <span className="text-red-500">*</span></label>
                <input required name="full_name" value={formData.full_name} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.full_name ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635]`} placeholder={"Nguyễn Văn A"} />
                {isSubmitted && !formData.full_name && <p className="text-red-500 text-[10px] mt-1 font-medium">Vui lòng nhập họ và tên</p>}
              </div>
              <div className="space-y-1.5 opacity-70">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Email (Tự điền)"} <span className="text-red-500">*</span></label>
                <input readOnly type="email" name="email" value={formData.email} className="w-full bg-bg-tertiary/50 border border-border-primary rounded-xl py-2 px-3 text-sm outline-none cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Số điện thoại"} <span className="text-red-500">*</span></label>
                <input required type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.phone ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635]`} placeholder={"090 123 4567"} />
                {isSubmitted && !formData.phone && <p className="text-red-500 text-[10px] mt-1 font-medium">Vui lòng nhập số điện thoại</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-5 md:gap-x-5 md:gap-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Ngày sinh"} <span className="text-red-500">*</span></label>
                <input required type="date" name="birthday" value={formData.birthday} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.birthday ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635]`} />
                {isSubmitted && !formData.birthday && <p className="text-red-500 text-[10px] mt-1 font-medium">Vui lòng chọn ngày sinh</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Giới tính"} <span className="text-red-500">*</span></label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && !formData.gender ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635]`}>
                  <option value="Nam">{"Nam"}</option>
                  <option value="Nữ">{"Nữ"}</option>
                  <option value="Khác">{"Khác"}</option>
                </select>
                {isSubmitted && !formData.gender && <p className="text-red-500 text-[10px] mt-1 font-medium">Vui lòng chọn giới tính</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Công việc hiện tại"}</label>
                <input name="job" value={formData.job} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-[#a3e635]" placeholder={"Vd: Văn phòng, Tự do..."} />
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl">
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-red-400/95 leading-relaxed">
                {"* Lưu ý: Các trường có dấu * là bắt buộc phải điền"}
              </p>
            </div>
          </StepSurveyCard>
          )}

          {/* Section 2: Chỉ số cơ thể nâng cao */}
          {currentStep === 2 && (
          <StepSurveyCard
            icon={Ruler}
            iconWrapClass="bg-blue-400/15 ring-2 ring-blue-400/40"
            iconClass="h-6 w-6 text-blue-400"
            title={"2. Chỉ số cơ thể"}
            subtitle={"Nhập chiều cao, cân nặng và số đo để AI tính BMI và gợi ý cường độ tập phù hợp."}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Chiều cao (cm)"} <span className="text-red-500">*</span></label>
                <input required type="number" name="height" value={formData.height} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && (!formData.height || formData.height === '0') ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-blue-400`} placeholder="0" />
                {isSubmitted && (!formData.height || formData.height === '0') && <p className="text-red-500 text-[10px] mt-1 font-medium">Vui lòng nhập chiều cao</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Cân nặng (kg)"} <span className="text-red-500">*</span></label>
                <input required type="number" name="weight" value={formData.weight} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && (!formData.weight || formData.weight === '0') ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-blue-400`} placeholder="0" />
                {isSubmitted && (!formData.weight || formData.weight === '0') && <p className="text-red-500 text-[10px] mt-1 font-medium">Vui lòng nhập cân nặng</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Cân nặng đích (kg)"} <span className="text-red-500">*</span></label>
                <input required type="number" name="target_weight" value={formData.target_weight} onChange={handleInputChange} className={`w-full bg-bg-tertiary border ${isSubmitted && (!formData.target_weight || formData.target_weight === '0') ? 'border-red-500 animate-pulse' : 'border-border-primary'} rounded-xl py-2 px-3 text-sm outline-none focus:border-blue-400`} placeholder="0" />
                {isSubmitted && (!formData.target_weight || formData.target_weight === '0') && <p className="text-red-500 text-[10px] mt-1 font-medium">Vui lòng nhập cân nặng đích</p>}
              </div>
              <div className="space-y-1.5 flex flex-col justify-center items-center">
                <label className="text-[10px] font-bold text-[#a3e635] uppercase text-center block">{"Chỉ số BMI"}</label>
                <div className="w-full bg-[#a3e635]/10 border border-[#a3e635]/30 rounded-lg py-1.5 px-2 text-center text-sm font-black text-[#a3e635] min-h-[32px] flex items-center justify-center">
                  {BMI}
                </div>
              </div>
            </div>
            {/* Hàng 2: Số đo vòng — hiển thị theo giới tính */}
            <div className="grid grid-cols-4 gap-4 bg-bg-tertiary/30 p-4 rounded-2xl border border-border-primary/50">
              {/* Vòng cổ — cả hai giới */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-tertiary uppercase text-center block">Vòng cổ (cm)</label>
                <input type="number" name="neck" value={formData.neck} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-lg py-1.5 px-2 text-center text-xs outline-none focus:border-blue-400" placeholder="0" />
              </div>

              {/* Vòng bụng — cả hai giới */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-tertiary uppercase text-center block">Vòng bụng (cm)</label>
                <input type="number" name="waist" value={formData.waist} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-lg py-1.5 px-2 text-center text-xs outline-none focus:border-blue-400" placeholder="0" />
              </div>

              {/* Nam: Vòng ngực / Nữ: Vòng mông */}
              {formData.gender === 'Nam' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase text-center block">Vòng ngực (cm)</label>
                  <input type="number" name="chest" value={formData.chest} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-lg py-1.5 px-2 text-center text-xs outline-none focus:border-blue-400" placeholder="0" />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-tertiary uppercase text-center block">Vòng mông (cm)</label>
                  <input type="number" name="hips" value={formData.hips} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-lg py-1.5 px-2 text-center text-xs outline-none focus:border-blue-400" placeholder="0" />
                </div>
              )}

              {/* % Mỡ cơ thể — hiển thị kết quả tính hoặc nhập tay */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-tertiary uppercase text-center block">% Mỡ cơ thể</label>
                {computedBodyFat ? (
                  <div className="relative">
                    <div className="w-full bg-blue-400/10 border border-blue-400/40 rounded-lg py-1.5 px-2 text-center text-sm font-black text-blue-400 min-h-[28px] flex items-center justify-center">
                      {computedBodyFat}%
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, body_fat: computedBodyFat ?? '' }))}
                      className="mt-1 w-full text-[8px] text-blue-400/70 hover:text-blue-400 text-center transition-all"
                    >
                      ↧ Lưu vào hồ sơ
                    </button>
                  </div>
                ) : (
                  <input
                    type="number"
                    name="body_fat"
                    value={formData.body_fat}
                    onChange={handleInputChange}
                    className="w-full bg-bg-tertiary border border-border-primary rounded-lg py-1.5 px-2 text-center text-xs outline-none focus:border-blue-400"
                    placeholder="0"
                  />
                )}
                <BodyFatRefButton gender={formData.gender} onSelect={(val) => setFormData(prev => ({ ...prev, body_fat: val }))} />
              </div>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl">
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-red-400/95 leading-relaxed">
                {"* Lưu ý: Các trường có dấu * là bắt buộc phải điền"}
              </p>
            </div>
          </StepSurveyCard>
          )}

          {/* Section 3: Dinh dưỡng */}
          {currentStep === 3 && (
          <StepSurveyCard
            icon={Apple}
            iconWrapClass="bg-emerald-500/15 ring-2 ring-emerald-500/40"
            iconClass="h-6 w-6 text-emerald-500"
            title={"3. Chế độ dinh dưỡng"}
            subtitle={"Thói quen ăn uống giúp AI xây thực đơn phù hợp ngân sách và sở thích của bạn."}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Chế độ ăn & Sở thích"}</label>
                <select name="diet_preference" value={formData.diet_preference} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500">
                  <option value="Bình thường">{"Bình thường"}</option>
                  <option value="Ăn chay (Có thể ăn chay)">{"Ăn chay (Có thể ăn chay)"}</option>
                  <option value="Ăn nhiều đạm (High Protein)">{"Ăn nhiều đạm (High Protein)"}</option>
                  <option value="Keto / Low Carb">{"Keto / Low Carb"}</option>
                  <option value="Eat Clean">{"Eat Clean"}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Khả năng nấu nướng"}</label>
                <select name="cooking_ability" value={formData.cooking_ability} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500">
                  <option value="Tự nấu 100%">{"Tự nấu 100%"}</option>
                  <option value="Ăn ngoài quán">{"Ăn ngoài quán"}</option>
                  <option value="Tự nấu tối, ăn ngoài trưa">{"Tự nấu tối, ăn ngoài trưa"}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Số bữa ăn/ngày"}</label>
                <select name="meals_per_day" value={formData.meals_per_day} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500">
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
                  <input type="number" step="0.1" name="daily_water_goal" value={formData.daily_water_goal} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Ngân sách ăn uống"}</label>
                <select name="budget_level" value={formData.budget_level} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500">
                  <option value="Sinh viên (Rẻ, Tiết kiệm)">{"Sinh viên (Rẻ, Tiết kiệm)"}</option>
                  <option value="Trung bình (Cơ bản)">{"Trung bình (Cơ bản)"}</option>
                  <option value="Cao cấp (Đủ loại thực phẩm)">{"Cao cấp (Đủ loại thực phẩm)"}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Thực đơn hiện tại"}</label>
                <input name="current_diet" value={formData.current_diet} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500" placeholder={"Vd: Sáng bún, trưa cơm tiệm, tối cơm nhà..."} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Dị ứng / Kiêng kỵ (Blacklist)"}</label>
                <input name="allergies" value={formData.allergies} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-emerald-500" placeholder={"Vd: Hải sản, Sữa bò (Lactose), Đậu phộng..."} />
              </div>
            </div>
          </StepSurveyCard>
          )}

          {/* Section 4: Tình trạng y tế */}
          {currentStep === 4 && (
          <StepSurveyCard
            icon={Stethoscope}
            iconWrapClass="bg-red-500/15 ring-2 ring-red-500/40"
            iconClass="h-6 w-6 text-red-500"
            title={"4. Tình trạng sức khỏe"}
            subtitle={"Thông tin y tế giúp AI điều chỉnh bài tập an toàn với tình trạng của bạn."}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Khói thuốc & Rượu bia"}</label>
                <select name="smoke_drink" value={formData.smoke_drink} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-red-500">
                  <option value="Không bao giờ">{"Không bao giờ"}</option>
                  <option value="Thỉnh thoảng">{"Thỉnh thoảng"}</option>
                  <option value="Thường xuyên">{"Thường xuyên"}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Các loại thuốc đang sử dụng"}</label>
                <input name="medications" value={formData.medications} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-red-500" placeholder={"Vd: Thuốc huyết áp, tiểu đường..."} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Bệnh nền"}</label>
                <textarea name="health_condition" value={formData.health_condition} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 px-4 h-24 text-sm outline-none focus:border-red-500" placeholder={"Vd: Cao huyết áp, Tiểu đường tuýp 2..."} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Chấn thương cũ"}</label>
                <textarea name="injuries" value={formData.injuries} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 px-4 h-24 text-sm outline-none focus:border-red-500" placeholder={"Vd: Thoát vị đĩa đệm, Đau đầu gối..."} />
              </div>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl">
              <p className="text-[10px] text-red-400 font-medium leading-relaxed italic">
                {"* Lưu ý: Nếu bạn có bệnh nền nặng, hãy tham khảo ý kiến bác sĩ trước khi bắt đầu bất kỳ lộ trình tập luyện cường độ cao nào. AI sẽ dựa trên thông tin này để giới hạn nhịp tim và áp lực lên khớp."}
              </p>
            </div>
          </StepSurveyCard>
          )}

          {/* Section 5: Tập luyện & giấc ngủ */}
          {currentStep === 5 && (
          <StepSurveyCard
            icon={Zap}
            iconWrapClass="bg-orange-500/15 ring-2 ring-orange-500/40"
            iconClass="h-6 w-6 text-orange-500"
            title={"5. Thói quen vận động"}
            subtitle={"Mô tả công việc, tập luyện và giấc ngủ để AI cân bằng tải tập và phục hồi."}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Tính chất công việc"}</label>
                <select name="work_nature" value={formData.work_nature} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500">
                  <option value="Ngồi văn phòng nhiều (Sedentary)">{"Ngồi văn phòng nhiều (Sedentary)"}</option>
                  <option value="Di chuyển nhẹ nhàng">{"Di chuyển nhẹ nhàng"}</option>
                  <option value="Vận động liên tục (Lao động tay chân)">{"Vận động liên tục (Lao động tay chân)"}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Địa điểm tập luyện"}</label>
                <select name="workout_location" value={formData.workout_location} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500">
                  <option value="Phòng Gym chuyên nghiệp">{"Phòng Gym chuyên nghiệp"}</option>
                  <option value="Tập tại nhà (Home Workout)">{"Tập tại nhà (Home Workout)"}</option>
                  <option value="Công viên / Ngoài trời">{"Công viên / Ngoài trời"}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Kinh nghiệm tập"}</label>
                <select name="experience_level" value={formData.experience_level} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500">
                  <option value="Người mới hoàn toàn">{"Người mới hoàn toàn"}</option>
                  <option value="Dưới 6 tháng">{"Dưới 6 tháng"}</option>
                  <option value="6 tháng - 2 năm">{"6 tháng - 2 năm"}</option>
                  <option value="Trên 2 năm">{"Trên 2 năm"}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Tần suất tập hiện tại"}</label>
                <select name="activity_level" value={formData.activity_level} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500">
                  <option value="Chưa tập luyện">{"Chưa tập luyện"}</option>
                  <option value="1-2 buổi/tuần">{"1-2 buổi/tuần"}</option>
                  <option value="3-4 buổi/tuần">{"3-4 buổi/tuần"}</option>
                  <option value="Trên 5 buổi/tuần">{"Trên 5 buổi/tuần"}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Thời lượng/buổi (phút)"}</label>
                <input type="number" name="workout_duration" value={formData.workout_duration} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500" placeholder="45" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Dụng cụ sẵn có"}</label>
                <select name="equipment_available" value={formData.equipment_available} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500">
                  <option value="Đầy đủ tạ & máy móc (Gym)">{"Đầy đủ tạ & máy móc (Gym)"}</option>
                  <option value="Tạ đơn (Dumbbells) & Thảm">{"Tạ đơn (Dumbbells) & Thảm"}</option>
                  <option value="Dây kháng lực (Resistance Bands)">{"Dây kháng lực (Resistance Bands)"}</option>
                  <option value="Không dụng cụ (Calisthenics)">{"Không dụng cụ (Calisthenics)"}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Số giờ ngủ/ngày"}</label>
                <select name="sleep_hours" value={formData.sleep_hours} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500">
                  <option value="4">{"Dưới 5 giờ"}</option>
                  <option value="6">{"5-6 giờ"}</option>
                  <option value="7">{"7-8 giờ"}</option>
                  <option value="9">{"Trên 8 giờ"}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Chất lượng giấc ngủ"}</label>
                <select name="sleep_quality" value={formData.sleep_quality} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-orange-500">
                  <option value="Rất tốt (Sâu giấc, tỉnh táo)">{"Rất tốt (Sâu giấc, tỉnh táo)"}</option>
                  <option value="Bình thường (Hay thức giấc)">{"Bình thường (Hay thức giấc)"}</option>
                  <option value="Kém (Khó ngủ, mệt mỏi)">{"Kém (Khó ngủ, mệt mỏi)"}</option>
                </select>
              </div>
            </div>

            <div className="bg-orange-500/5 border border-orange-500/20 p-3 rounded-xl flex gap-3 items-center">
              <Clock className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-[9px] text-text-tertiary uppercase tracking-wider font-bold leading-relaxed">
                {"Giấc ngủ ảnh hưởng 80% quá trình phục hồi. AI sẽ cân đối bài tập dựa trên khả năng hồi phục của bạn."}
              </p>
            </div>
          </StepSurveyCard>
          )}

          {/* Section 6: Tâm lý & động lực + xác nhận */}
          {currentStep === 6 && (
          <StepSurveyCard
            icon={Heart}
            iconWrapClass="bg-purple-500/15 ring-2 ring-purple-500/40"
            iconClass="h-6 w-6 text-purple-400"
            title={"6. Xác nhận & hoàn tất"}
            subtitle={"Chia sẻ tâm lý và mong muốn, sau đó xác nhận để gửi hồ sơ tới TrendFit AI."}
          >
            <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Mức độ Stress hàng ngày"}</label>
                <select name="stress_level" value={formData.stress_level} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-purple-500">
                  <option value="Thấp - Cuộc sống thoải mái">{"Thấp - Cuộc sống thoải mái"}</option>
                  <option value="Trung bình - Áp lực công việc nhẹ">{"Trung bình - Áp lực công việc nhẹ"}</option>
                  <option value="Cao - Thường xuyên căng thẳng">{"Cao - Thường xuyên căng thẳng"}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Động lực lớn nhất của bạn"}</label>
                <input name="motivation" value={formData.motivation} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 px-3 text-sm outline-none focus:border-purple-500" placeholder={"Vd: Để mặc quần áo đẹp, Cải thiện sức khỏe..."} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{"Thông điệp gửi AI (Yêu cầu riêng biệt)"}</label>
              <textarea name="expectations" value={formData.expectations} onChange={handleInputChange} className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 px-4 h-20 text-sm outline-none focus:border-purple-500" placeholder={"Tôi muốn tập trung vào phần mông, tôi không thích ăn rau cải..."} />
            </div>

          <div className="bg-[#a3e635]/5 border border-[#a3e635]/20 p-4 rounded-2xl flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#a3e635] shrink-0" />
            <p className="text-[10px] text-text-secondary leading-relaxed uppercase tracking-wider">
              {"Xác nhận: Thông tin này sẽ được mã hóa và gửi tới TrendFit AI Engine. Dữ liệu này là cơ sở để chúng tôi cá nhân hóa 100% lộ trình của bạn."}
            </p>
          </div>
            </div>
          </StepSurveyCard>
          )}
        </form>

        {/* Footer */}
        <div className="px-4 py-4 md:px-6 md:py-5 border-t border-border-primary bg-bg-tertiary/50 backdrop-blur-xl flex flex-col sm:flex-row gap-4 sm:gap-6 justify-between items-stretch sm:items-center">
          <div className="flex flex-1 min-w-0 items-center order-2 sm:order-1 sm:pr-4">
            <p className="text-sm font-black tracking-tight leading-snug">
              <span className="text-text-secondary font-bold">
                {"Thông tin càng chi tiết, AI sẽ tạo kế hoạch tập luyện và thực đơn "}
              </span>
              <span className="text-text-secondary font-bold">{"càng chính xác."}</span>
            </p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:ml-auto order-1 sm:order-2 shrink-0">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={goPrev}
                disabled={loading}
                className="w-full sm:w-auto py-2.5 px-5 rounded-xl border border-border-primary text-text-primary font-bold text-sm hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Quay lại
              </button>
            )}
            {currentStep < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                disabled={loading}
                className="w-full sm:w-auto bg-[#a3e635] text-black font-black py-2.5 px-8 rounded-xl hover:bg-[#bef264] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 text-sm"
              >
                Tiếp theo
                <ChevronRight className="w-4 h-4 text-black" />
              </button>
            ) : (
              <button
                type="submit"
                form="survey-form"
                disabled={loading}
                className="w-full sm:w-auto bg-[#a3e635] text-black font-black py-2.5 px-8 rounded-xl hover:bg-[#bef264] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isOpen ? "CẬP NHẬT HỒ SƠ" : "KÍCH HOẠT LỘ TRÌNH AI"}
                    <Zap className="w-4 h-4 text-black" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
