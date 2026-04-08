import React, { useState, useEffect } from 'react';
import { 
  X, Save, User, Scale, Activity, Heart, Calendar, Target, Clock, Droplet, Moon, 
  Search, Apple, Stethoscope, Zap, Sparkles, Briefcase, GraduationCap, Dumbbell, MapPin,
  Smile, Flame
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Section 1: Thông tin cá nhân
    full_name: '',
    birthday: '',
    gender: 'Nam',
    job: '',
    
    // Section 2: Chỉ số cơ thể
    height: 0,
    weight: 0,
    target_weight: 0,
    body_fat: 0,
    chest: 0,
    waist: 0,
    hips: 0,
    
    // Section 3: Lifestyle
    activity_level: 'Vừa phải (Tập luyện 3-5 ngày/tuần)',
    fitness_goal: 'Giảm cân',
    workout_time: 'Sáng sớm',
    workout_duration: 45,
    experience_level: 'Người mới',
    work_nature: 'Ngồi văn phòng nhiều',
    workout_location: 'Phòng Gym chuyên nghiệp',
    equipment_available: 'Đầy đủ tạ & máy móc',
    
    // Section 4: Dinh dưỡng & Y tế
    diet_preference: 'Bình thường',
    daily_water_goal: 2.5,
    meals_per_day: 3,
    cooking_ability: 'Tự nấu 100%',
    budget_level: 'Trung bình',
    current_diet: '',
    allergies: '',
    health_condition: '',
    injuries: '',
    medications: '',
    smoke_drink: 'Không',
    
    // Section 5: Lối sống
    sleep_hours: 7,
    sleep_quality: 'Tốt',
    stress_level: 'Thấp',
    expectations: '',
    motivation: ''
  });

  useEffect(() => {
    async function loadFullProfile() {
      if (!user || !isOpen) return;
      setLoading(true);
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
            full_name: p.data.full_name || '',
            birthday: p.data.birthday || '',
            gender: p.data.gender || 'Nam',
            job: p.data.job || '',
            height: b.data?.height || 0,
            weight: b.data?.weight || 0,
            target_weight: b.data?.target_weight || 0,
            body_fat: b.data?.body_fat || 0,
            chest: b.data?.chest || 0,
            waist: b.data?.waist || 0,
            hips: b.data?.hips || 0,
            activity_level: l.data?.activity_level || prev.activity_level,
            fitness_goal: l.data?.fitness_goal || prev.fitness_goal,
            diet_preference: l.data?.diet_preference || prev.diet_preference,
            cooking_ability: l.data?.cooking_ability || prev.cooking_ability,
            budget_level: l.data?.budget_level || prev.budget_level,
            current_diet: l.data?.current_diet || '',
            workout_location: l.data?.workout_location || prev.workout_location,
            workout_time: l.data?.workout_time || prev.workout_time,
            workout_duration: l.data?.workout_duration || prev.workout_duration,
            equipment_available: l.data?.equipment_available || prev.equipment_available,
            experience_level: l.data?.experience_level || prev.experience_level,
            daily_water_goal: l.data?.daily_water_goal || prev.daily_water_goal,
            health_condition: h.data?.health_condition || '',
            injuries: h.data?.injuries || '',
            medications: h.data?.medications || '',
            smoke_drink: h.data?.smoke_drink || 'Không',
            stress_level: h.data?.stress_level || 'Thấp',
            sleep_hours: h.data?.sleep_hours || 7,
            expectations: l.data?.expectations || '',
            motivation: l.data?.motivation || ''
          }));
        }
      } catch (e) {
        console.error('Error loading full profile:', e);
      } finally {
        setLoading(false);
      }
    }
    loadFullProfile();
  }, [user, isOpen]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await Promise.all([
        supabase.from('profiles').update({
          full_name: formData.full_name,
          gender: formData.gender,
          birthday: formData.birthday,
          job: formData.job,
          updated_at: new Date().toISOString()
        }).eq('id', user.id),
        
        supabase.from('body_metrics').insert({
          user_id: user.id,
          height: formData.height,
          weight: formData.weight,
          body_fat: formData.body_fat,
          chest: formData.chest,
          waist: formData.waist,
          hips: formData.hips
        }),

        supabase.from('lifestyle_settings').upsert({
          user_id: user.id,
          activity_level: formData.activity_level,
          fitness_goal: formData.fitness_goal,
          diet_preference: formData.diet_preference,
          cooking_ability: formData.cooking_ability,
          budget_level: formData.budget_level,
          current_diet: formData.current_diet,
          workout_location: formData.workout_location,
          workout_time: formData.workout_time,
          workout_duration: formData.workout_duration,
          equipment_available: formData.equipment_available,
          experience_level: formData.experience_level,
          daily_water_goal: formData.daily_water_goal,
          motivation: formData.motivation,
          expectations: formData.expectations,
          updated_at: new Date().toISOString()
        }),

        supabase.from('health_conditions').upsert({
          user_id: user.id,
          health_condition: formData.health_condition,
          injuries: formData.injuries,
          medications: formData.medications,
          smoke_drink: formData.smoke_drink,
          stress_level: formData.stress_level,
          sleep_hours: formData.sleep_hours,
          updated_at: new Date().toISOString()
        })
      ]);
      alert('Hồ sơ sức khỏe đã được cập nhật!');
      onClose();
      window.location.reload();
    } catch (e) {
      alert('Lỗi khi lưu dữ liệu!');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const bmi = (formData.height > 0 && formData.weight > 0) 
    ? (formData.weight / ((formData.height/100) ** 2)).toFixed(1) 
    : '0';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative bg-bg-secondary w-full max-w-6xl max-h-[95vh] overflow-hidden rounded-[3rem] border border-border-primary shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300">
        
        {/* Header - Kiểu Dashboard Thuần AI */}
        <div className="p-8 border-b border-border-primary bg-bg-tertiary/40 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[2rem] bg-[#a3e635]/10 flex items-center justify-center text-[#a3e635] shadow-inner">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Hồ sơ sức khỏe toàn diện</h2>
              <p className="text-sm text-text-tertiary font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                Dữ liệu nền tảng cho <span className="text-[#a3e635]">TrendFit AI Engine</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end px-6 border-r border-border-primary">
              <span className="text-[10px] font-black text-text-tertiary uppercase mb-1">Chỉ số BMI AI</span>
              <span className="text-2xl font-black text-[#a3e635]">{bmi}</span>
            </div>
            <button onClick={onClose} className="w-12 h-12 bg-bg-tertiary rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors text-text-tertiary">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Bọc nội dung Scrollable */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* CỘT 1: NHÂN KHẨU & THỂ HÌNH */}
            <div className="space-y-10">
              <section>
                <h3 className="flex items-center gap-3 text-[#a3e635] font-black uppercase tracking-widest text-xs mb-8 underline decoration-2 underline-offset-8">
                   <User className="w-4 h-4" /> 1. Định danh & Đặc điểm
                </h3>
                <div className="space-y-5">
                  <div className="bg-bg-tertiary/30 p-5 rounded-3xl border border-border-primary focus-within:border-[#a3e635] transition-all">
                    <label className="block text-[10px] font-black text-text-tertiary uppercase mb-2">Tên người dùng</label>
                    <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full bg-transparent border-none p-0 text-white font-bold text-lg focus:ring-0" />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-bg-tertiary/30 p-5 rounded-3xl border border-border-primary text-center">
                      <label className="block text-[10px] font-black text-text-tertiary uppercase mb-2">Ngày sinh</label>
                      <input type="date" value={formData.birthday} onChange={e => setFormData({...formData, birthday: e.target.value})} className="w-full bg-transparent border-none p-0 text-white font-bold text-sm focus:ring-0 text-center" />
                    </div>
                    <div className="bg-bg-tertiary/30 p-5 rounded-3xl border border-border-primary text-center">
                      <label className="block text-[10px] font-black text-text-tertiary uppercase mb-2">Giới tính</label>
                      <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full bg-transparent border-none p-0 text-white font-bold text-sm focus:ring-0 appearance-none text-center">
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>
                  <div className="bg-bg-tertiary/30 p-5 rounded-3xl border border-border-primary">
                    <label className="block text-[10px] font-black text-text-tertiary uppercase mb-2">Nghề nghiệp</label>
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-4 h-4 text-text-tertiary" />
                      <input type="text" value={formData.job} onChange={e => setFormData({...formData, job: e.target.value})} className="w-full bg-transparent border-none p-0 text-white font-bold focus:ring-0" placeholder="Chưa nhập..." />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="flex items-center gap-3 text-blue-400 font-black uppercase tracking-widest text-xs mb-8 underline decoration-2 underline-offset-8">
                   <Scale className="w-4 h-4" /> 2. Chỉ số cơ thể thực tế
                </h3>
                <div className="grid grid-cols-2 gap-5 mb-5">
                  <div className="bg-bg-tertiary/30 p-6 rounded-3xl border border-border-primary text-center relative overflow-hidden group">
                    <label className="block text-[10px] font-black text-text-tertiary uppercase mb-1">Cân nặng (kg)</label>
                    <input type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: parseFloat(e.target.value)})} className="w-full bg-transparent border-none p-0 text-white font-black text-3xl focus:ring-0 text-center" />
                    <div className="absolute right-0 bottom-0 p-2 opacity-5"> <Scale className="w-12 h-12" /> </div>
                  </div>
                  <div className="bg-bg-tertiary/30 p-6 rounded-3xl border border-border-primary text-center relative overflow-hidden group">
                    <label className="block text-[10px] font-black text-text-tertiary uppercase mb-1">Chiều cao (cm)</label>
                    <input type="number" value={formData.height} onChange={e => setFormData({...formData, height: parseFloat(e.target.value)})} className="w-full bg-transparent border-none p-0 text-white font-black text-3xl focus:ring-0 text-center" />
                  </div>
                </div>
                <div className="bg-bg-tertiary/30 p-6 rounded-[2.5rem] border border-border-primary grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <label className="block text-[8px] font-black text-text-tertiary uppercase mb-1">Vòng ngực</label>
                    <input type="number" value={formData.chest} onChange={e => setFormData({...formData, chest: parseFloat(e.target.value)})} className="w-full bg-transparent border-none p-0 text-white font-black text-xl focus:ring-0 text-center" />
                  </div>
                  <div className="text-center">
                    <label className="block text-[8px] font-black text-text-tertiary uppercase mb-1">Vòng bụng</label>
                    <input type="number" value={formData.waist} onChange={e => setFormData({...formData, waist: parseFloat(e.target.value)})} className="w-full bg-transparent border-none p-0 text-white font-black text-xl focus:ring-0 text-center" />
                  </div>
                  <div className="text-center">
                    <label className="block text-[8px] font-black text-text-tertiary uppercase mb-1">Vòng mông</label>
                    <input type="number" value={formData.hips} onChange={e => setFormData({...formData, hips: parseFloat(e.target.value)})} className="w-full bg-transparent border-none p-0 text-white font-black text-xl focus:ring-0 text-center" />
                  </div>
                </div>
              </section>
            </div>

            {/* CỘT 2: DINH DƯỠNG & Y TẾ */}
            <div className="space-y-10">
              <section>
                <h3 className="flex items-center gap-3 text-emerald-400 font-black uppercase tracking-widest text-xs mb-8 underline decoration-2 underline-offset-8">
                   <Apple className="w-4 h-4" /> 3. Dinh dưỡng & Thói quen ăn
                </h3>
                <div className="space-y-5">
                  <div className="bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/20">
                    <label className="block text-[10px] font-black text-emerald-400 uppercase mb-3">Chế độ ăn ưu tiên</label>
                    <select value={formData.diet_preference} onChange={e => setFormData({...formData, diet_preference: e.target.value})} className="w-full bg-transparent border-none p-0 text-white font-black text-xl focus:ring-0 appearance-none">
                      <option>Bình thường</option>
                      <option>Ăn chay (Có thể ăn chay)</option>
                      <option>Ăn nhiều đạm (High Protein)</option>
                      <option>Keto / Low Carb</option>
                      <option>Eat Clean</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-bg-tertiary/30 p-5 rounded-3xl border border-border-primary">
                      <label className="block text-[10px] font-black text-text-tertiary uppercase mb-2">Số bữa ăn/ngày</label>
                      <input type="number" value={formData.meals_per_day} onChange={e => setFormData({...formData, meals_per_day: parseInt(e.target.value)})} className="w-full bg-transparent border-none p-0 text-white font-black text-xl focus:ring-0" />
                    </div>
                    <div className="bg-bg-tertiary/30 p-5 rounded-3xl border border-border-primary">
                      <label className="block text-[10px] font-black text-text-tertiary uppercase mb-2">Lít nước/ngày</label>
                      <input type="number" step="0.1" value={formData.daily_water_goal} onChange={e => setFormData({...formData, daily_water_goal: parseFloat(e.target.value)})} className="w-full bg-transparent border-none p-0 text-white font-black text-xl focus:ring-0" />
                    </div>
                  </div>
                  <div className="bg-bg-tertiary/30 p-5 rounded-3xl border border-border-primary">
                    <label className="block text-[10px] font-black text-text-tertiary uppercase mb-2">Dị ứng & Kiêng kỵ</label>
                    <input type="text" value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} className="w-full bg-transparent border-none p-0 text-white font-bold focus:ring-0" placeholder="Vd: Hải sản, Sữa..." />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="flex items-center gap-3 text-red-400 font-black uppercase tracking-widest text-xs mb-8 underline decoration-2 underline-offset-8">
                   <Stethoscope className="w-4 h-4" /> 4. Trạng thái Sức khỏe (Bắt buộc)
                </h3>
                <div className="space-y-4">
                  <div className="bg-red-500/5 p-5 rounded-3xl border border-red-500/20">
                    <label className="block text-[10px] font-black text-red-400 uppercase mb-2">Bệnh nền (Tim mạch, Tiểu đường...)</label>
                    <textarea value={formData.health_condition} onChange={e => setFormData({...formData, health_condition: e.target.value})} className="w-full bg-transparent border-none p-0 text-white text-sm font-medium focus:ring-0 min-h-[60px] resize-none" placeholder="Nếu không có, hãy để trống..." />
                  </div>
                  <div className="bg-red-500/5 p-5 rounded-3xl border border-red-500/20">
                    <label className="block text-[10px] font-black text-red-400 uppercase mb-2">Chấn thương cũ (Lưng, gối...)</label>
                    <textarea value={formData.injuries} onChange={e => setFormData({...formData, injuries: e.target.value})} className="w-full bg-transparent border-none p-0 text-white text-sm font-medium focus:ring-0 min-h-[60px] resize-none" placeholder="Vd: Đau cột sống..." />
                  </div>
                  <div className="bg-bg-tertiary/30 p-5 rounded-3xl border border-border-primary flex items-center justify-between">
                    <label className="text-[10px] font-black text-text-tertiary uppercase">Khói thuốc / Rượu bia</label>
                    <select value={formData.smoke_drink} onChange={e => setFormData({...formData, smoke_drink: e.target.value})} className="bg-transparent border-none p-0 text-white font-bold text-sm focus:ring-0 appearance-none text-right">
                      <option>Không bao giờ</option>
                      <option>Thỉnh thoảng</option>
                      <option>Thường xuyên</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>

            {/* CỘT 3: VẬN ĐỘNG & TÂM LÝ AI */}
            <div className="space-y-10">
              <section>
                <h3 className="flex items-center gap-3 text-orange-400 font-black uppercase tracking-widest text-xs mb-8 underline decoration-2 underline-offset-8">
                   <Zap className="w-4 h-4" /> 5. Kinh nghiệm & Thói quen
                </h3>
                <div className="space-y-5">
                  <div className="bg-bg-tertiary/30 p-5 rounded-3xl border border-border-primary">
                    <label className="block text-[10px] font-black text-text-tertiary uppercase mb-2">Địa điểm tập</label>
                    <select value={formData.workout_location} onChange={e => setFormData({...formData, workout_location: e.target.value})} className="w-full bg-transparent border-none p-0 text-white font-bold text-sm focus:ring-0 appearance-none">
                      <option>Phòng Gym chuyên nghiệp</option>
                      <option>Tập tại nhà (Home Workout)</option>
                      <option>Ngoài trời / Công viên</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-bg-tertiary/30 p-5 rounded-3xl border border-border-primary">
                      <label className="block text-[10px] font-black text-text-tertiary uppercase mb-2">Phút / Buổi</label>
                      <input type="number" value={formData.workout_duration} onChange={e => setFormData({...formData, workout_duration: parseInt(e.target.value)})} className="w-full bg-transparent border-none p-0 text-white font-black text-xl focus:ring-0" />
                    </div>
                    <div className="bg-bg-tertiary/30 p-5 rounded-3xl border border-border-primary">
                      <label className="block text-[10px] font-black text-text-tertiary uppercase mb-2">Giờ ngủ / Đêm</label>
                      <input type="number" value={formData.sleep_hours} onChange={e => setFormData({...formData, sleep_hours: parseInt(e.target.value)})} className="w-full bg-transparent border-none p-0 text-white font-black text-xl focus:ring-0" />
                    </div>
                  </div>
                  <div className="bg-orange-500/5 p-6 rounded-[2rem] border border-orange-500/20">
                    <label className="block text-[10px] font-black text-orange-400 uppercase mb-3 text-center">Dụng cụ hiện có</label>
                    <div className="flex items-center gap-3 justify-center text-white font-black text-lg">
                      <Dumbbell className="w-5 h-5 text-orange-400" />
                      <select value={formData.equipment_available} onChange={e => setFormData({...formData, equipment_available: e.target.value})} className="bg-transparent border-none p-0 text-white font-black text-sm focus:ring-0 appearance-none">
                        <option>Đầy đủ tạ & máy móc (Gym)</option>
                        <option>Tạ đơn & Thảm</option>
                        <option>Dây kháng lực</option>
                        <option>Không dụng cụ</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="flex items-center gap-3 text-purple-400 font-black uppercase tracking-widest text-xs mb-8 underline decoration-2 underline-offset-8">
                   <Smile className="w-4 h-4" /> 6. Phân tích Tâm lý AI
                </h3>
                <div className="space-y-4">
                  <div className="bg-purple-500/5 p-5 rounded-3xl border border-purple-500/20">
                    <label className="block text-[10px] font-black text-purple-400 uppercase mb-2">Động lực lớn nhất</label>
                    <input type="text" value={formData.motivation} onChange={e => setFormData({...formData, motivation: e.target.value})} className="w-full bg-transparent border-none p-0 text-white text-sm font-bold focus:ring-0" placeholder="Vd: Để mặc đẹp, Khỏe mạnh..." />
                  </div>
                  <div className="bg-purple-500/5 p-5 rounded-3xl border border-purple-500/20">
                    <label className="block text-[10px] font-black text-purple-400 uppercase mb-2">Mong muốn riêng gửi AI</label>
                    <textarea value={formData.expectations} onChange={e => setFormData({...formData, expectations: e.target.value})} className="w-full bg-transparent border-none p-0 text-white text-sm font-medium focus:ring-0 min-h-[100px] resize-none" placeholder="Tôi không thích ăn rau, tôi muốn giảm mỡ bụng..." />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-border-primary bg-bg-tertiary/60 backdrop-blur-3xl flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-[#a3e635] rounded-full animate-pulse shadow-[0_0_15px_#a3e635]"></div>
              <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Dữ liệu sẵn sàng cho AI Optimization</span>
           </div>
           <div className="flex items-center gap-4">
              <button onClick={onClose} className="px-10 py-4 rounded-2xl bg-bg-tertiary text-text-secondary font-black uppercase text-xs tracking-widest hover:bg-white/5 transition-all">Hủy (Escape)</button>
              <button 
                onClick={handleSave} 
                disabled={loading}
                className="px-12 py-4 rounded-2xl bg-[#a3e635] text-black font-black uppercase text-xs tracking-widest hover:bg-[#bef264] transition-all flex items-center gap-3 shadow-2xl shadow-[#a3e635]/30 disabled:opacity-50 group"
              >
                {loading ? 'Đang lưu' : (
                  <>
                    <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Cập nhật toàn bộ AI Profile
                  </>
                )}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
