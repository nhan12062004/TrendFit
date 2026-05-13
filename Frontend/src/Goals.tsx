import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Scale, Flame, Droplet, Dumbbell, Save, Activity, RefreshCcw, CheckCircle2, TrendingUp, Plus, Clock, Zap, X } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import AnimatedNumber from './components/AnimatedNumber';

interface CustomGoal {
  id: string;
  name: string;
  target: number;
  unit: string;
}

export default function Goals() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // States for goals
  const [currentWeight, setCurrentWeight] = useState(0);
  const [targetWeight, setTargetWeight] = useState(0);
  const [fitnessGoal, setFitnessGoal] = useState('maintenance');
  const [waterGoal, setWaterGoal] = useState(2.0);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState(3);
  const [workoutDuration, setWorkoutDuration] = useState(60);
  const [caloriesBurnTarget, setCaloriesBurnTarget] = useState(500);

  // Custom Goals State
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [customGoals, setCustomGoals] = useState<CustomGoal[]>([]);
  const [newGoalForm, setNewGoalForm] = useState({ name: '', target: 0, unit: '' });

  const [metricsId, setMetricsId] = useState<number | null>(null);
  const [lifestyleId, setLifestyleId] = useState<number | null>(null);

  // Today's progress for Goals Completed feature
  const [todayProgress, setTodayProgress] = useState({
    water: 0,
    duration: 0,
    caloriesBurned: 0
  });

  useEffect(() => {
    if (!user) return;
    async function loadGoals() {
      try {
        const { data: bodyData } = await supabase
          .from('body_metrics')
          .select('id, weight, target_weight')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bodyData) {
          setMetricsId(bodyData.id);
          setCurrentWeight(bodyData.weight || 0);
          setTargetWeight(bodyData.target_weight || bodyData.weight || 0);
        }

        const { data: lifeData } = await supabase
          .from('lifestyle_settings')
          .select('id, fitness_goal, daily_water_goal, weekly_workouts, workout_duration, calories_burn_goal')
          .eq('user_id', user!.id)
          .maybeSingle();

        if (lifeData) {
          setLifestyleId(lifeData.id);
          setFitnessGoal(lifeData.fitness_goal || 'maintenance');
          setWaterGoal(lifeData.daily_water_goal || 2.0);
          setWeeklyWorkouts(lifeData.weekly_workouts || 3);
          setWorkoutDuration(lifeData.workout_duration || 60);
          if (lifeData.calories_burn_goal) setCaloriesBurnTarget(lifeData.calories_burn_goal);
        }

        const { data: customData } = await supabase
          .from('goals')
          .select('id, name, target_value, unit')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: true });

        if (customData) {
          setCustomGoals(customData.map(d => ({
            id: d.id,
            name: d.name,
            target: d.target_value,
            unit: d.unit || ''
          })));
        }

        // Fetch today's progress to calculate "Goals Completed"
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: logData } = await supabase
          .from('daily_progress_logs')
          .select('water_intake_ml, workout_duration, calories_burned')
          .eq('user_id', user!.id)
          .eq('log_date', todayStr)
          .maybeSingle();
        
        if (logData) {
          setTodayProgress({
            water: (logData.water_intake_ml || 0) / 1000,
            duration: logData.workout_duration || 0,
            caloriesBurned: logData.calories_burned || 0
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadGoals();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSuccessMsg('');
    try {
      if (metricsId) {
        await supabase.from('body_metrics')
          .update({ target_weight: targetWeight })
          .eq('id', metricsId);
      } else {
        await supabase.from('body_metrics')
          .insert({ user_id: user.id, weight: currentWeight, target_weight: targetWeight });
      }

      if (lifestyleId) {
        await supabase.from('lifestyle_settings')
          .update({
            fitness_goal: fitnessGoal,
            daily_water_goal: waterGoal,
            weekly_workouts: weeklyWorkouts,
            workout_duration: workoutDuration,
            calories_burn_goal: caloriesBurnTarget
          })
          .eq('id', lifestyleId);
      } else {
        await supabase.from('lifestyle_settings')
          .insert({
            user_id: user.id,
            fitness_goal: fitnessGoal,
            daily_water_goal: waterGoal,
            weekly_workouts: weeklyWorkouts,
            workout_duration: workoutDuration,
            calories_burn_goal: caloriesBurnTarget
          });
      }

      setSuccessMsg(t('goals.saved_successfully', 'Lưu mục tiêu thành công!'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getWeightProgress = () => {
    if (currentWeight === 0 || targetWeight === 0) return 0;
    if (targetWeight < currentWeight) {
      const diff = Math.abs(currentWeight - targetWeight);
      if (diff > 20) return 20;
      if (diff === 0) return 100;
      return Math.max(0, 100 - (diff / 20) * 100);
    } 
    if (targetWeight > currentWeight) {
      const diff = Math.abs(currentWeight - targetWeight);
      if (diff > 20) return 20;
      if (diff === 0) return 100;
      return Math.max(0, 100 - (diff / 20) * 100);
    }
    return 100;
  };

  const completedCount = [
    todayProgress.water >= waterGoal,
    todayProgress.duration >= workoutDuration,
    todayProgress.caloriesBurned >= caloriesBurnTarget
  ].filter(Boolean).length;
  
  const totalDailyGoals = 3;
  const overallProgress = (completedCount / totalDailyGoals) * 100;

  const goalOptions = [
    { id: 'lose_weight', label: t('setup.goal.lose_weight', 'Giảm cân'), icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500' },
    { id: 'build_muscle', label: t('setup.goal.build_muscle', 'Tăng cơ'), icon: Dumbbell, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500' },
    { id: 'maintenance', label: t('setup.goal.maintenance', 'Duy trì vóc dáng'), icon: Activity, color: 'text-[#a3e635]', bg: 'bg-[#a3e635]/10', border: 'border-[#a3e635]' },
    { id: 'improve_health', label: t('setup.goal.improve_health', 'Cải thiện sức khỏe'), icon: RefreshCcw, color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500' }
  ];

  const handleAddCustomGoal = async () => {
    if (!newGoalForm.name.trim() || newGoalForm.target <= 0) return;
    
    // Optimistic UI update combined with DB push
    const tempId = Math.random().toString(36).substr(2, 9);
    setCustomGoals(prev => [...prev, {
      id: tempId,
      name: newGoalForm.name,
      target: newGoalForm.target,
      unit: newGoalForm.unit.trim()
    }]);

    setNewGoalForm({ name: '', target: 0, unit: '' });
    setShowAddGoalModal(false);

    const { data } = await supabase.from('goals').insert({
      user_id: user!.id,
      name: newGoalForm.name,
      target_value: newGoalForm.target,
      unit: newGoalForm.unit.trim()
    }).select().single();

    if (data) {
      setCustomGoals(prev => prev.map(g => g.id === tempId ? { ...g, id: data.id } : g));
    }
  };

  const removeCustomGoal = async (id: string) => {
    setCustomGoals(prev => prev.filter(g => g.id !== id));
    await supabase.from('goals').delete().eq('id', id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Target className="w-8 h-8 text-[#a3e635] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Target className="w-6 h-6 text-[#ff5e00]" />
            {t('sidebar.goals', 'Mục tiêu')}
          </h1>
          <p className="text-xs text-text-tertiary mt-1">{t('goals.subtitle', 'Thiết lập và theo dõi lộ trình của bạn')}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowAddGoalModal(true)}
            className="flex-1 md:flex-none bg-bg-tertiary hover:bg-white/10 text-text-primary px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('common.add_goal', 'Add Goal')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 md:flex-none bg-[#a3e635] hover:bg-[#bef264] text-black px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? t('common.saving', 'Đang lưu...') : t('common.save', 'Lưu thay đổi')}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 bg-[#a3e635]/20 border border-[#a3e635] text-[#a3e635] px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-in fade-in zoom-in duration-300">
          <CheckCircle2 className="w-4 h-4" />
          {successMsg}
        </div>
      )}

      {/* Top Banner: Goals Completed Progress */}
      <div className="bg-bg-secondary rounded-2xl py-4 px-6 border border-border-primary mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-auto flex-shrink-0">
            <h2 className="text-sm font-bold text-text-primary mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#a3e635]" />
              {t('goals.today_progress', 'Tiến độ mục tiêu hôm nay')}
            </h2>
            <p className="text-xs text-text-tertiary">{t('goals.completed_text', 'Hoàn thành')} <span className="font-bold text-[#a3e635]">{completedCount}/{totalDailyGoals}</span> {t('goals.daily_target_unit', 'mục tiêu ngày.')}</p>
          </div>
          <div className="w-full md:flex-1 md:ml-8 flex items-center gap-4">
            <div className="flex-1 h-2.5 bg-bg-tertiary rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-[#a3e635] to-orange-500 transition-all duration-1000"
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
            <span className="text-xl font-bold text-text-primary w-12 text-right">{Math.round(overallProgress)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Main Fitness Goal */}
          <div className="bg-bg-secondary rounded-2xl p-6 border border-border-primary">
            <h2 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#a3e635]" />
              {t('goals.main_objective', 'Mục Tiêu Chính')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {goalOptions.map(option => {
                const Icon = option.icon;
                const isSelected = fitnessGoal === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setFitnessGoal(option.id)}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                      isSelected ? `${option.border} ${option.bg} text-text-primary scale-[1.02]` : 'border-border-primary bg-bg-tertiary/20 text-text-secondary hover:border-text-tertiary'
                    }`}
                  >
                    <Icon className={`w-8 h-8 ${isSelected ? option.color : 'text-text-tertiary'}`} />
                    <span className="text-[11px] sm:text-xs font-bold text-center">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weight Goal */}
          <div className="bg-bg-secondary rounded-2xl p-6 border border-border-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#ff5e00]/5 rounded-bl-full -z-0"></div>
            <div className="relative z-10">
              <h2 className="text-sm font-bold text-text-primary mb-6 flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#ff5e00]" />
                {t('goals.weight_target', 'Mục Tiêu Cân Nặng')}
              </h2>
              
              <div className="flex items-center justify-between mb-2">
                <div className="text-center w-1/3">
                  <p className="text-xs text-text-tertiary mb-1">{t('goals.current', 'Hiện tại')}</p>
                  <p className="text-3xl font-bold text-text-primary">{currentWeight} <span className="text-sm font-normal text-text-tertiary">kg</span></p>
                </div>
                
                <div className="flex-1 px-6 text-center">
                  <div className="h-2.5 bg-bg-tertiary rounded-full overflow-hidden mb-2 relative">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-[#a3e635] transition-all duration-1000"
                      style={{ width: `${getWeightProgress()}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-text-tertiary font-medium">{t('goals.difference', 'Khác biệt')} {Math.abs(currentWeight - targetWeight).toFixed(1)} kg</span>
                </div>
                
                <div className="text-center w-1/3">
                  <p className="text-xs text-text-tertiary mb-1">{t('goals.target', 'Mục tiêu')}</p>
                  <div className="relative inline-block">
                    <input 
                      type="number" 
                      value={targetWeight}
                      onChange={(e) => setTargetWeight(Number(e.target.value))}
                      className="w-20 bg-transparent text-3xl font-bold text-[#a3e635] text-center border-b-2 border-dashed border-[#a3e635]/50 focus:border-[#a3e635] outline-none transition-colors"
                    />
                    <span className="text-sm font-normal text-text-tertiary absolute -right-6 bottom-1.5">kg</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          
          {/* Daily Activity Goals */}
          <div className="bg-bg-secondary rounded-2xl p-6 border border-border-primary">
            <h2 className="text-sm font-bold text-text-primary mb-6 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              {t('goals.activity_targets', 'Mục Tiêu Chỉ Số Vận Động')}
            </h2>

            <div className="flex flex-col gap-8">
              {/* Weekly Workouts */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-text-secondary flex items-center gap-2"><Dumbbell className="w-4 h-4 text-[#a3e635]" /> {t('goals.weekly_workouts', 'Tần suất tập')}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#a3e635]">{weeklyWorkouts}</span>
                    <span className="text-xs text-text-tertiary">{t('goals.sessions_per_week', 'buổi/tuần')}</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="1" max="7" step="1" 
                  value={weeklyWorkouts} 
                  onChange={(e) => setWeeklyWorkouts(Number(e.target.value))}
                  className="w-full accent-[#a3e635] h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-2 px-1">
                  <span className="text-[10px] text-text-tertiary">1 {t('goals.session', 'buổi')}</span>
                  <span className="text-[10px] text-text-tertiary">7 {t('goals.session', 'buổi')}</span>
                </div>
              </div>
              {/* Workout Duration */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-text-secondary flex items-center gap-2"><Clock className="w-4 h-4 text-purple-400" /> {t('goals.workout_duration', 'Thời gian tập (Phút)')}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-purple-400">{workoutDuration}</span>
                    <span className="text-xs text-text-tertiary">{t('goals.minutes_per_day', 'phút/ngày')}</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="15" max="150" step="5" 
                  value={workoutDuration} 
                  onChange={(e) => setWorkoutDuration(Number(e.target.value))}
                  className="w-full accent-purple-400 h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-2 px-1">
                  <span className="text-[10px] text-text-tertiary">15m</span>
                  <span className="text-[10px] text-text-tertiary">150m</span>
                </div>
              </div>

              {/* Calories Burned Target */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-text-secondary flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> {t('goals.calories_burn', 'Năng lượng đốt (Kcal)')}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-orange-500">{caloriesBurnTarget}</span>
                    <span className="text-xs text-text-tertiary">{t('goals.kcal_per_day', 'kcal/ngày')}</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="100" max="2000" step="50" 
                  value={caloriesBurnTarget} 
                  onChange={(e) => setCaloriesBurnTarget(Number(e.target.value))}
                  className="w-full accent-orange-500 h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between mt-2 px-1">
                  <span className="text-[10px] text-text-tertiary">100 kcal</span>
                  <span className="text-[10px] text-text-tertiary">2000 kcal</span>
                </div>
              </div>
              {/* Custom Goals List */}
              {customGoals.map(goal => (
                <div key={goal.id} className="relative group">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-text-secondary flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-400" /> {goal.name}
                    </span>
                    <div className="flex items-baseline gap-1 pr-6">
                      <span className="text-2xl font-bold text-purple-400">{goal.target}</span>
                      <span className="text-xs text-text-tertiary">{goal.unit}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-bg-tertiary rounded-lg overflow-hidden">
                    <div className="h-full bg-purple-400/50 w-0"></div>
                  </div>
                  <button 
                    onClick={() => removeCustomGoal(goal.id)}
                    className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-400 hover:bg-red-400/10 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Add Custom Goal Modal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-bg-secondary w-full max-w-sm rounded-3xl border border-border-primary p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-text-primary mb-4">{t('goals.add_custom_goal', 'Thêm mục tiêu phụ')}</h3>
            
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs text-text-secondary mb-1 block">{t('goals.goal_name_label', 'Tên mục tiêu (VD: Đọc sách)')}</label>
                <input 
                  type="text" 
                  value={newGoalForm.name}
                  onChange={e => setNewGoalForm(prev => ({...prev, name: e.target.value}))}
                  className="w-full bg-bg-primary border border-border-primary rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-[#a3e635] transition-colors"
                  placeholder={t('goals.enter_name', 'Nhập tên...')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">{t('goals.target_value', 'Chỉ tiêu')}</label>
                  <input 
                    type="number" 
                    value={newGoalForm.target || ''}
                    onChange={e => setNewGoalForm(prev => ({...prev, target: Number(e.target.value)}))}
                    className="w-full bg-bg-primary border border-border-primary rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-[#a3e635] transition-colors"
                    placeholder={t('goals.example_30', 'VD: 30')}
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">{t('goals.unit', 'Đơn vị')}</label>
                  <input 
                    type="text" 
                    value={newGoalForm.unit}
                    onChange={e => setNewGoalForm(prev => ({...prev, unit: e.target.value}))}
                    className="w-full bg-bg-primary border border-border-primary rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-[#a3e635] transition-colors"
                    placeholder={t('goals.example_page', 'VD: trang')}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => setShowAddGoalModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-bg-tertiary text-text-primary text-sm hover:bg-white/10 transition-colors"
                >
                  {t('common.cancel', 'Hủy')}
                </button>
                <button 
                  onClick={handleAddCustomGoal}
                  className="flex-1 px-4 py-3 rounded-xl font-bold bg-[#a3e635] text-black text-sm hover:bg-[#bef264] transition-colors"
                >
                  {t('common.create', 'Tạo mới')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
