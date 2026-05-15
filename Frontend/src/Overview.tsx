import { useState, useEffect } from 'react';
import MainContent from './MainContent';
import LoadingScreen from './components/LoadingScreen';
import { useAuth } from './contexts/AuthContext';
import { Moon, Droplet, Dumbbell, Utensils, Timer, Scale, Ruler, Clock, Brain, Blocks, Weight, User, ChevronRight, ChevronDown, Zap, Flame, Check, Activity, TrendingDown, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedNumber from './components/AnimatedNumber';
import { supabase } from './lib/supabase';
const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

const getDatePartsInTimeZone = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value || '1970';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  return { year, month, day };
};

const getVietnamDateKey = (date = new Date()): string => {
  const { year, month, day } = getDatePartsInTimeZone(date, VIETNAM_TIMEZONE);
  return `${year}-${month}-${day}`;
};

const parseReps = (reps: string | null | undefined): number => {
  if (!reps) return 10;
  const nums = String(reps).match(/\d+/g)?.map(Number).filter(n => !Number.isNaN(n)) || [];
  if (nums.length === 0) return 10;
  if (nums.length === 1) return nums[0];
  return Math.round((nums[0] + nums[nums.length - 1]) / 2);
};

const FireIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.87a.75.75 0 00-1.151-.081A9.98 9.98 0 002.25 12c0 5.385 4.365 9.75 9.75 9.75s9.75-4.365 9.75-9.75a9.98 9.98 0 00-3.247-5.119.75.75 0 00-1.151.081 7.547 7.547 0 01-1.705 1.458 9.742 9.742 0 003.539-6.177zM12 15a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
  </svg>
);

const WaterIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.6 2.4a.75.75 0 00-1.2 0 14.973 14.973 0 00-6.334 11.597 7.5 7.5 0 0015 0 14.973 14.973 0 00-6.334-11.597zM12 16.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
  </svg>
);

const WorkoutIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M13.5 5.25a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM8.818 10.428l-2.038.544a.75.75 0 11-.387-1.45l2.038-.544c.484-.129 1.01.07 1.258.513l1.821 3.254L13.75 9.75a2.25 2.25 0 013.182 3.182l-2.5 2.5a.75.75 0 01-1.06 0l-1.56-1.56-1.428 2.545v4.333a.75.75 0 01-1.5 0v-4.833a.75.75 0 01.104-.383l1.815-3.236-1.985-1.884z" />
  </svg>
);

const SleepIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
  </svg>
);

const estimateExerciseKcal = (
  item: { sets?: number | null; reps?: string | null; weight_kg?: number | null; rest_seconds?: number | null },
  userWeightKg: number
): number => {
  const sets = Math.max(1, Number(item.sets || 0));
  const reps = Math.max(1, parseReps(item.reps));
  const rest = Math.max(0, Number(item.rest_seconds || 0));
  const weightKg = Math.max(0, Number(item.weight_kg || 0));
  const workSeconds = sets * reps * 2.8;
  const restSeconds = Math.max(0, sets - 1) * rest;
  const durationMinutes = Math.max(1, (workSeconds + restSeconds) / 60);
  const met = weightKg > 0 ? 6.0 : 5.0;
  const kcal = (met * 3.5 * Math.max(45, userWeightKg) / 200) * durationMinutes;
  return Math.round(Math.min(250, Math.max(8, kcal)));
};

function RightPanelContent() {
  const { user, isLoggedIn, refreshTick } = useAuth();
const navigate = useNavigate();

  const [metrics, setMetrics] = useState({
    weight: 0, height: 0, age: 0, gender: 'male',
    activity_level: 'moderate', goal: 'maintenance',
    water_goal: 0, sleep_hours: 0
  });
  const [consumedKcal, setConsumedKcal] = useState(0);
  const [actualWater, setActualWater] = useState(0);
  const [todayWorkouts, setTodayWorkouts] = useState<any[]>([]);
  const [sleepHours, setSleepHours] = useState({ actual: 0, target: 0 });
  const [aiTargetKcal, setAiTargetKcal] = useState<number | null>(null);
  const [dietMacros, setDietMacros] = useState({ p: 0, c: 0, f: 0 });
  const [streakDays, setStreakDays] = useState(0);
  const [completedDayKeys, setCompletedDayKeys] = useState<Set<string>>(new Set());
  const [last7DaysWeight, setLast7DaysWeight] = useState<{day: string, value: number}[]>([]);
  const [last7DaysKcal, setLast7DaysKcal] = useState<{day: string, value: number}[]>([]);
  const [chartMetric, setChartMetric] = useState<'weight' | 'kcal'>('weight');
  const [isChartMetricDropdownOpen, setIsChartMetricDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchMetrics() {
      if (!user) return;
      try {
        const { data: profile } = await supabase.from('profiles').select('birthday, gender').eq('id', user.id).maybeSingle();
        const { data: body } = await supabase.from('body_metrics').select('weight, height').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
        const { data: lifestyle } = await supabase.from('lifestyle_settings').select('daily_water_goal, activity_level, fitness_goal, target_calories').eq('user_id', user.id).maybeSingle();
        const { data: health } = await supabase.from('health_conditions').select('sleep_hours').eq('user_id', user.id).maybeSingle();

        const today = getVietnamDateKey();
        const { data: log } = await supabase
          .from('daily_progress_logs')
          .select('calories_consumed, calories_burned, water_intake_ml, sleep_hours')
          .eq('user_id', user.id)
          .eq('log_date', today)
          .maybeSingle();

        let targetSleep = 7;
        if (health?.sleep_hours) {
          const sleepStr = String(health.sleep_hours);
          targetSleep = sleepStr.includes('-') ? parseInt(sleepStr.split('-')[1]) || 7 : parseInt(sleepStr) || 7;
        }

        const targetWater = lifestyle?.daily_water_goal || 2.5;

        if (log) {
          setActualWater(log.water_intake_ml ? log.water_intake_ml / 1000 : 0);
          setSleepHours({ actual: log.sleep_hours || 0, target: targetSleep });
          setConsumedKcal(log.calories_consumed || 0);
        } else {
          setActualWater(0);
          setSleepHours({ actual: 0, target: targetSleep });
          setConsumedKcal(0);
        }

        // Diet plan totals
        const d = new Date(today);
        const dayOfWeek = d.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(d);
        weekStart.setDate(weekStart.getDate() + diff);
        const weekStartKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
        const todayDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        let totalDietKcal = 0, totalDietProtein = 0, totalDietCarbs = 0, totalDietFat = 0;

        const { data: plans } = await supabase
          .from('weekly_food_plans')
          .select('id')
          .eq('user_id', user.id)
          .eq('week_start_date', weekStartKey)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (plans && plans.length > 0) {
          const { data: foodItems } = await supabase
            .from('weekly_food_items')
            .select('calories, protein, carbs, fat, quantity, foods(calories, protein, carbs, fat)')
            .eq('food_plan_id', plans[0].id)
            .eq('day_of_week', todayDayOfWeek);

          if (foodItems && foodItems.length > 0) {
            foodItems.forEach((item: any) => {
              const qty = Number(item.quantity || 1);
              totalDietKcal += Number(item.calories || item.foods?.calories || 0) * qty;
              totalDietProtein += Number(item.protein || item.foods?.protein || 0) * qty;
              totalDietCarbs += Number(item.carbs || item.foods?.carbs || 0) * qty;
              totalDietFat += Number(item.fat || item.foods?.fat || 0) * qty;
            });
          }
        }

        const dbTargetKcal = lifestyle?.target_calories || Math.round(totalDietKcal) || 0;
        setAiTargetKcal(dbTargetKcal);
        setDietMacros({ p: Math.round(totalDietProtein), c: Math.round(totalDietCarbs), f: Math.round(totalDietFat) });

        // Today's workouts
        const { data: todaySessions } = await supabase
          .from('daily_exercise_sessions')
          .select('id, sets, reps, weight_kg, rest_seconds, is_completed, exercises:exercise_id (name, gif_url)')
          .eq('user_id', user.id)
          .eq('log_date', today)
          .order('order_index', { ascending: true });

        const userWeight = Number(body?.weight || 70);

        if (todaySessions && todaySessions.length > 0) {
          setTodayWorkouts(todaySessions.map((s: any) => ({
            img: (s.exercises as any)?.gif_url || '',
            title: (s.exercises as any)?.name || 'Bài tập',
            desc: `${s.sets || 0} hiệp • ${s.reps || '-'} lần • ${s.weight_kg || 0} kg`,
            progress: s.is_completed ? 100 : 0
          })));
        } else {
          setTodayWorkouts([]);
        }

        // Streak calculation
        const { data: completedSessions } = await supabase
          .from('daily_exercise_sessions')
          .select('log_date')
          .eq('user_id', user.id)
          .eq('is_completed', true)
          .order('log_date', { ascending: false })
          .limit(180);

        const allCompletedKeys = Array.from(
          new Set((completedSessions || []).map((r: any) => String(r.log_date || '')).filter(Boolean))
        );
        setCompletedDayKeys(new Set(allCompletedKeys));

        // Calculate streak
        let streak = 0;
        let cursor = today;
        if (!allCompletedKeys.includes(cursor)) {
          const d = new Date(`${cursor}T00:00:00`);
          d.setDate(d.getDate() - 1);
          cursor = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }
        while (allCompletedKeys.includes(cursor)) {
          streak++;
          const d = new Date(`${cursor}T00:00:00`);
          d.setDate(d.getDate() - 1);
          cursor = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }
        setStreakDays(streak);

        // Fetch last 7 days weight
        // Fetch weight for current week (Monday to Sunday)
        const todayDateObj = new Date(`${today}T00:00:00`);
        const todayDow = todayDateObj.getDay();
        const diffToMon = todayDow === 0 ? -6 : 1 - todayDow;
        const weekMonday = new Date(todayDateObj);
        weekMonday.setDate(todayDateObj.getDate() + diffToMon);
        const weekMondayKey = getVietnamDateKey(weekMonday);

        const { data: weightLogs } = await supabase
          .from('body_metrics')
          .select('weight, created_at')
          .eq('user_id', user.id)
          .gte('created_at', `${weekMondayKey}T00:00:00`)
          .order('created_at', { ascending: true });

        const dayLabels = ['T2','T3','T4','T5','T6','T7','CN'];
        const weekKeys = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekMonday);
          d.setDate(weekMonday.getDate() + i);
          return getVietnamDateKey(d);
        });
        const weightByDay: Record<string, number> = {};
        (weightLogs || []).forEach((w: any) => {
          const wDate = new Date(w.created_at);
          const wKey = getVietnamDateKey(wDate);
          weightByDay[wKey] = Number(w.weight || 0);
        });
        let lastKnown = Number(body?.weight || 0);
        const weightData = weekKeys.map((k, idx) => {
          if (weightByDay[k]) lastKnown = weightByDay[k];
          return { day: dayLabels[idx], value: lastKnown };
        });
        setLast7DaysWeight(weightData);

        // Fetch last 7 days calories
        const { data: kcalLogs } = await supabase
          .from('daily_progress_logs')
          .select('calories_burned, log_date')
          .eq('user_id', user.id)
          .gte('log_date', weekMondayKey)
          .lte('log_date', getVietnamDateKey(todayDateObj))
          .order('log_date', { ascending: true });

        const kcalByDay: Record<string, number> = {};
        (kcalLogs || []).forEach((log: any) => {
          kcalByDay[log.log_date] = Number(log.calories_burned || 0);
        });
        const kcalData = weekKeys.map((k, idx) => ({
          day: dayLabels[idx],
          value: kcalByDay[k] || 0
        }));
        setLast7DaysKcal(kcalData);

        let age = 0;
        if (profile?.birthday) {
          age = new Date().getFullYear() - new Date(profile.birthday).getFullYear();
        }

        setMetrics({
          weight: body?.weight || 0, height: body?.height || 0,
          age: age || 0, gender: profile?.gender || 'male',
          activity_level: lifestyle?.activity_level || 'moderate',
          goal: lifestyle?.fitness_goal || 'maintenance',
          water_goal: targetWater, sleep_hours: targetSleep
        });
      } catch (e) {
        console.error('Error fetching metrics/workouts:', e);
      }
    }

    if (isLoggedIn) {
      fetchMetrics();
    } else {
      setMetrics({ weight: 0, height: 0, age: 0, gender: 'male', activity_level: 'moderate', goal: 'maintenance', water_goal: 0, sleep_hours: 0 });
      setConsumedKcal(0);
      setActualWater(0);
      setTodayWorkouts([]);
      setSleepHours({ actual: 0, target: 0 });
      setAiTargetKcal(null);
      setDietMacros({ p: 0, c: 0, f: 0 });
    }
  }, [user, isLoggedIn, refreshTick]);

  const heightM = metrics.height / 100;
  const bmi = heightM > 0 && metrics.weight > 0 ? metrics.weight / (heightM * heightM) : 0;
  let bmiLabel = 'Chưa rõ';
  let bmiColor = 'border-text-tertiary text-text-tertiary';
  let bmiBgColor = 'bg-text-tertiary';
  let bmiMessage = 'Hãy cập nhật chỉ số để xem đánh giá.';
  
  if (bmi > 0) {
    const targetWeight = 22 * heightM * heightM;
    if (bmi < 18.5) {
      bmiLabel = 'Thiếu cân';
      bmiColor = 'border-blue-500 text-blue-500';
      bmiBgColor = 'bg-blue-500';
      const diff = targetWeight - metrics.weight;
      bmiMessage = `Bạn cần tăng ${diff.toFixed(1)} kg để đạt mức cân nặng lý tưởng.`;
    } else if (bmi < 25) {
      bmiLabel = 'Bình thường';
      bmiColor = 'border-[#a3e635] text-[#a3e635]';
      bmiBgColor = 'bg-[#a3e635]';
      bmiMessage = 'Tuyệt vời! Cân nặng của bạn đang ở mức lý tưởng.';
    } else if (bmi < 30) {
      bmiLabel = 'Thừa cân';
      bmiColor = 'border-orange-500 text-orange-500 bg-orange-500/10';
      bmiBgColor = 'bg-orange-500';
      const diff = metrics.weight - targetWeight;
      bmiMessage = `Bạn cần giảm ${Math.round(diff)} kg để đạt mức cân nặng lý tưởng.`;
    } else {
      bmiLabel = 'Thừa cân'; // Changed from Béo phì to avoid harsh wording
      bmiColor = 'border-red-500 text-red-500 bg-red-500/10';
      bmiBgColor = 'bg-red-500';
      const diff = metrics.weight - targetWeight;
      bmiMessage = `Bạn cần giảm ${Math.round(diff)} kg để đạt mức cân nặng lý tưởng.`;
    }
  }

  // To match the screenshot where the bar is light green up to the current point:
  const bmiPercent = Math.min(100, Math.max(0, (bmi / 40) * 100));

  const targetKcal = aiTargetKcal || 0;
  const remainingKcal = targetKcal > 0 ? targetKcal - consumedKcal : 0;
  const progressPercent = targetKcal > 0 ? (consumedKcal / targetKcal) * 100 : 0;

  return (
    <div className="flex flex-col gap-4 md:gap-5 scrollbar-hide">
      {/* Metrics Row */}
      <div className="bg-bg-secondary rounded-xl p-4 md:p-5 border border-border-primary flex flex-col justify-between h-[220px] md:h-[260px]">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-text-primary">Chỉ số cơ thể</h3>
          <span className="text-xs text-text-tertiary">Cập nhật gần đây</span>
        </div>
        
        <div className="grid grid-cols-3 gap-1 md:gap-2 divide-x divide-border-primary">
          {/* Weight */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 relative">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md"></div>
              <Weight className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400 relative z-10" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm md:text-base font-bold text-text-primary leading-tight whitespace-nowrap"><AnimatedNumber value={metrics.weight} /> <span className="text-xs font-medium">kg</span></span>
              <span className="text-[10px] md:text-xs text-text-secondary whitespace-nowrap">Cân nặng</span>
            </div>
          </div>
          
          {/* Height */}
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md"></div>
              <Ruler className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400 relative z-10" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm md:text-base font-bold text-text-primary leading-tight whitespace-nowrap"><AnimatedNumber value={metrics.height} /> <span className="text-xs font-medium">cm</span></span>
              <span className="text-[10px] md:text-xs text-text-secondary whitespace-nowrap">Chiều cao</span>
            </div>
          </div>
          
          {/* Age */}
          <div className="flex items-center justify-center gap-2 pl-1">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 relative">
              <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-md"></div>
              <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-400 relative z-10" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm md:text-base font-bold text-text-primary leading-tight whitespace-nowrap"><AnimatedNumber value={metrics.age} /> <span className="text-xs font-medium">tuổi</span></span>
              <span className="text-[10px] md:text-xs text-text-secondary whitespace-nowrap">Tuổi</span>
            </div>
          </div>
        </div>

        {/* BMI Section */}
        <div className="pt-2">
          <div className="flex items-end justify-between mb-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">BMI</span>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-text-primary">{bmi > 0 ? bmi.toFixed(1) : '--'}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${bmiColor}`}>{bmiLabel}</span>
              </div>
            </div>
          </div>
          
          <div className="w-full h-1 bg-bg-tertiary rounded-full overflow-hidden mb-3 relative">
            <div className="h-full bg-[#a3e635] rounded-full" style={{ width: `${bmiPercent}%` }}></div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] md:text-xs text-text-secondary">{bmiMessage}</span>
            <button className="text-[10px] text-[#a3e635] font-bold flex items-center gap-1 hover:text-[#bef264] shrink-0">
              Xem chi tiết <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Tiến độ hôm nay */}
      <div className="bg-bg-secondary rounded-xl p-4 md:p-5 border border-border-primary flex flex-col h-[320px] md:h-[350px]">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-text-primary">Tiến độ hôm nay</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { value: consumedKcal, max: aiTargetKcal || 2000, color: '#a3e635', label: 'Calo đã nạp', unit: 'kcal', icon: FireIcon },
            { value: actualWater, max: metrics.water_goal || 2.5, color: '#3b82f6', label: 'Nước uống', unit: 'L', icon: WaterIcon },
            { value: Math.round(todayWorkouts.filter(w => w.progress === 100).length * 8), max: Math.max(30, todayWorkouts.length * 8), color: '#a3e635', label: 'Phút tập luyện', unit: 'phút', icon: WorkoutIcon },
            { value: sleepHours.actual, max: sleepHours.target || 7, color: '#a855f7', label: 'Giấc ngủ', unit: 'giờ', icon: SleepIcon },
          ].map((item, i) => {
            const pct = item.max > 0 ? Math.min(100, (item.value / item.max) * 100) : 0;
            return (
              <div key={i} className="bg-bg-tertiary/40 rounded-2xl p-3 flex flex-col gap-3 border border-border-primary/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.color}15` }}>
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] md:text-xs text-text-tertiary truncate">{item.label}</span>
                    <div className="flex items-baseline gap-1 mt-0.5 truncate">
                      <span className="text-sm md:text-base font-bold text-text-primary">
                        {typeof item.value === 'number' && item.value % 1 !== 0 ? item.value.toFixed(1) : item.value}
                      </span>
                      <span className="text-[9px] md:text-[10px] text-text-tertiary">
                        / {typeof item.max === 'number' && item.max % 1 !== 0 ? item.max.toFixed(1) : item.max} {item.unit}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: item.color, filter: `drop-shadow(0 0 6px ${item.color}60)` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex-1 min-h-0"></div>
        <div className="text-center mb-3 mt-auto">
          <div className="flex items-center justify-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-[#ff5e00]" />
            <span className="text-[10px] text-text-tertiary font-medium">{streakDays} chuỗi ngày liên tiếp</span>
          </div>
        </div>

        {(() => {
          const todayKey = getVietnamDateKey();
          const todayDate = new Date(`${todayKey}T00:00:00`);
          const dow = todayDate.getDay();
          const diffMon = dow === 0 ? -6 : 1 - dow;
          const weekStart = new Date(todayDate);
          weekStart.setDate(todayDate.getDate() + diffMon);
          const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            const k = getVietnamDateKey(d);
            return { key: k, label: ['T2','T3','T4','T5','T6','T7','CN'][i], isToday: k === todayKey };
          });
          return (
            <div className="flex justify-center gap-1.5">
              {weekDays.map((d) => {
                const done = completedDayKeys.has(d.key);
                return (
                  <div key={d.key} className="flex flex-col items-center gap-1">
                    <span className="text-[8px] font-bold text-text-tertiary">{d.label}</span>
                    <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[8px] font-bold transition-all ${
                      d.isToday
                        ? 'bg-[#a3e635] text-black ring-2 ring-[#a3e635]/30'
                        : done
                          ? 'bg-[#a3e635]/20 text-[#a3e635]'
                          : 'bg-bg-tertiary text-text-tertiary'
                    }`}>
                      {done || d.isToday ? <Check className="w-3 h-3" /> : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Tiến độ 7 ngày */}
      {last7DaysWeight.length > 0 && last7DaysWeight.some(w => w.value > 0) && (
        <div className="bg-bg-secondary rounded-xl p-4 md:p-5 border border-border-primary h-[280px] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#a3e635]" />
              <h3 className="text-sm font-bold text-text-primary">Tiến độ 7 ngày</h3>
            </div>
            <div className="relative">
              <button 
                onClick={() => setIsChartMetricDropdownOpen(!isChartMetricDropdownOpen)}
                className="flex items-center gap-1 bg-[#a3e635] text-black text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-transform active:scale-95"
              >
                {chartMetric === 'weight' ? 'Cân nặng' : 'Calo'}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {isChartMetricDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 bg-bg-secondary border border-border-primary rounded-xl shadow-lg overflow-hidden z-20 w-28 py-1">
                  <button 
                    onClick={() => { setChartMetric('weight'); setIsChartMetricDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-bg-tertiary transition-colors ${chartMetric === 'weight' ? 'text-[#a3e635]' : 'text-text-primary'}`}
                  >
                    Cân nặng
                  </button>
                  <button 
                    onClick={() => { setChartMetric('kcal'); setIsChartMetricDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-bg-tertiary transition-colors ${chartMetric === 'kcal' ? 'text-[#a3e635]' : 'text-text-primary'}`}
                  >
                    Calo
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {(() => {
            const chartData = chartMetric === 'weight' ? last7DaysWeight : last7DaysKcal;
            if (chartData.length === 0) return null;
            const currentVal = chartData[chartData.length - 1]?.value || 0;
            const firstVal = chartData[0]?.value || 0;
            const diff = currentVal - firstVal;
            const diffSign = diff > 0 ? '+' : '';
            const isGood = chartMetric === 'weight' ? diff < 0 : diff > 0;
            
            const displayVal = chartMetric === 'weight' 
              ? currentVal 
              : chartData.reduce((sum, item) => sum + item.value, 0);
            
            return (
              <div className="flex items-end gap-2 mb-4">
                <span className="text-2xl font-extrabold text-text-primary leading-none">
                  {chartMetric === 'weight' ? parseFloat(displayVal.toFixed(1)) : Math.round(displayVal).toLocaleString()}
                </span>
                <span className="text-xs text-text-tertiary font-medium mb-0.5">{chartMetric === 'weight' ? 'kg' : 'kcal'}</span>
                {diff !== 0 && (
                  <div className={`flex items-center gap-1 mb-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isGood ? 'bg-[#a3e635]/10 text-[#a3e635]' : 'bg-orange-500/10 text-orange-400'
                  }`}>
                    {diff < 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                    {diffSign}{chartMetric === 'weight' ? Math.abs(diff).toFixed(1) : Math.round(Math.abs(diff)).toLocaleString()} {chartMetric === 'weight' ? 'kg' : 'kcal'}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="relative h-44">
            {(() => {
              const chartData = chartMetric === 'weight' ? last7DaysWeight : last7DaysKcal;
              const values = chartData.map(w => w.value);
              const activeValues = values.filter(v => v > 0);
              if (activeValues.length === 0 && chartMetric === 'weight') return null;
              
              const displayVal = chartMetric === 'weight' 
                ? (chartData[chartData.length - 1]?.value || 0)
                : chartData.reduce((sum, item) => sum + item.value, 0);
              
              const dataMin = Math.min(...activeValues, 0);
              const dataMax = Math.max(...activeValues, 100);
              const dataRange = dataMax - dataMin;
              
              // For calories, we might want a different scale
              let minVal: number, maxVal: number;
              if (chartMetric === 'weight') {
                const latest = activeValues[activeValues.length - 1] || 70;
                const base = Math.round(latest);
                minVal = base - 2;
                maxVal = base + 2;
                
                // Ensure all points fit and keep integer boundaries
                activeValues.forEach(v => {
                  if (v < minVal) minVal = Math.floor(v) - 1;
                  if (v > maxVal) maxVal = Math.ceil(v) + 1;
                });

                // Ensure the range is a multiple of 4 so gridCount=4 gives integer steps
                let diff = maxVal - minVal;
                if (diff % 4 !== 0) {
                  maxVal += (4 - (diff % 4));
                }
              } else {
                minVal = 0;
                maxVal = Math.max(500, dataMax * 1.2);
              }
              const range = maxVal - minVal || 1;
              
              const svgW = 280;
              const svgH = 140;
              const labelW = 24;
              const padTop = 10;
              const padBot = 24;
              const padLeft = labelW + 6;
              const padRight = 10;
              const usableW = svgW - padLeft - padRight;
              const usableH = svgH - padTop - padBot;

              const points = chartData.map((w, idx) => {
                const x = padLeft + (chartData.length > 1 ? (idx / (chartData.length - 1)) * usableW : usableW / 2);
                const y = padTop + usableH - ((w.value - minVal) / range) * usableH;
                return { x, y, val: w.value };
              });

              let pathD = `M${points[0].x},${points[0].y}`;
              for (let idx = 1; idx < points.length; idx++) {
                const prev = points[idx - 1];
                const curr = points[idx];
                const cp1x = prev.x + (curr.x - prev.x) * 0.4;
                const cp2x = prev.x + (curr.x - prev.x) * 0.6;
                pathD += ` C${cp1x},${prev.y} ${cp2x},${curr.y} ${curr.x},${curr.y}`;
              }

              const fillD = pathD + ` L${points[points.length-1].x},${svgH - padBot} L${points[0].x},${svgH - padBot} Z`;

              const gridCount = 4;
              const step = range / gridCount;
              const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
                const val = minVal + step * i;
                const y = padTop + usableH - ((val - minVal) / range) * usableH;
                let label = '';
                if (chartMetric === 'weight') {
                   label = Math.round(val).toString();
                } else {
                   label = val >= 1000 ? (val/1000).toFixed(1) + 'k' : Math.round(val).toString();
                }
                return { y, label };
              });

              return (
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradRight" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#a3e635" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#a3e635" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines + Y-axis labels */}
                  {gridLines.map((g, i) => (
                    <g key={i}>
                      <line x1={padLeft} x2={svgW - padRight} y1={g.y} y2={g.y} stroke="var(--border-primary)" strokeWidth="0.3" strokeDasharray="2,2" opacity="0.3" />
                      <text x={labelW - 4} y={g.y} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="var(--text-tertiary)" fontFamily="inherit">{g.label}</text>
                    </g>
                  ))}
                  {/* Fill */}
                  <path d={fillD} fill="url(#chartGradRight)" />
                  {/* Line */}
                  <path d={pathD} fill="none" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ filter: 'drop-shadow(0 0 3px rgba(163,230,53,0.3))' }} />
                  {/* Dots */}
                  {points.map((p, i) => {
                    const currentDow = new Date().getDay();
                    const isToday = i === (currentDow === 0 ? 6 : currentDow - 1);
                    return (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="2.5" fill="#a3e635" />
                        <circle cx={p.x} cy={p.y} r="1" fill="var(--bg-secondary)" />
                        {isToday && (
                          <>
                            <circle cx={p.x} cy={p.y} r="5" fill="#a3e635" opacity="0.15" />
                            <circle cx={p.x} cy={p.y} r="3.5" fill="#a3e635" />
                            <circle cx={p.x} cy={p.y} r="1.5" fill="var(--bg-secondary)" />
                            <rect x={p.x - 16} y={p.y - 16} width="32" height="12" rx="3" fill="#a3e635" />
                            <text x={p.x} y={p.y - 7.5} textAnchor="middle" fontSize="8" fontWeight="bold" fill="#000">
                              {chartMetric === 'weight' ? parseFloat(p.val.toFixed(1)) : Math.round(displayVal)}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}
                  {/* X-axis labels */}
                  {chartData.map((w, i) => {
                    const x = padLeft + (chartData.length > 1 ? (i / (chartData.length - 1)) * usableW : usableW / 2);
                    return (
                      <text key={i} x={x} y={svgH - 9} textAnchor="middle" fontSize="9" fill="var(--text-tertiary)" fontFamily="inherit">{w.day}</text>
                    );
                  })}
                </svg>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}

export default function Overview() {
  const { refreshTick } = useAuth();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex-1 flex flex-col gap-4 md:gap-5 min-w-0 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row gap-4 md:gap-5 min-w-0">
        <div className="flex-1 min-w-0">
          <MainContent />
        </div>
        <div className="w-full xl:w-[400px] shrink-0">
          <RightPanelContent />
        </div>
      </div>

      {/* Featured Course */}
      <div className="bg-bg-secondary rounded-xl p-4 md:p-5 border border-border-primary">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-text-primary">{"Khóa học nổi bật"}</h3>
          <a href="#" className="text-sm font-medium text-[#a3e635] flex items-center gap-1">
            {"Xem tất cả"} < ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { id: "nang-ta", title: "Nâng tạ", level: "Nâng cao", img: 'https://wpkbzssdipqtbmthvgvx.supabase.co/storage/v1/object/public/media-assets/course/weight-lifting.jpg' },
            { id: "phat-trien-co-bap", title: "Phát triển cơ bắp", level: "Trung cấp", img: 'https://wpkbzssdipqtbmthvgvx.supabase.co/storage/v1/object/public/media-assets/course/muscle-training.jpg' },
            { id: "crossfit", title: "CrossFit", level: "Mọi cấp độ", img: 'https://wpkbzssdipqtbmthvgvx.supabase.co/storage/v1/object/public/media-assets/course/cross-fit.jpg' },
            { id: "cardio-dot-mo", title: "Cardio Đốt Mỡ", level: "Dễ", img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop' }
          ].map((course, i) => (
            <div key={i} onClick={() => navigate(`/course/${course.id}`)} className="group relative rounded-xl overflow-hidden h-48 cursor-pointer">
              <img src={course.img} alt={course.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <div className="flex justify-end">
                  <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                    {course.level}
                  </span>
                </div>
                <div className="flex justify-start">
                  <span className="bg-[#a3e635] text-black text-xs font-bold px-3 py-1.5 rounded-lg">{course.title}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
