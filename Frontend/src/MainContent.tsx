import { Heart, Flame, Activity, ArrowRight, Dumbbell, Utensils, Droplet, Moon, Clock, Play, ChevronRight, CalendarDays, Check, Zap, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import AnimatedNumber from './components/AnimatedNumber';
import { useAuth } from './contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useOutletContext } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

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

const getVietnamWeekRange = (date = new Date()) => {
  const todayKey = getVietnamDateKey(date);
  const todayDate = new Date(`${todayKey}T00:00:00`);
  const day = todayDate.getDay(); // Sun=0 ... Sat=6
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(todayDate);
  weekStart.setDate(todayDate.getDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return {
    weekStartKey: getVietnamDateKey(weekStart),
    weekEndKey: getVietnamDateKey(weekEnd)
  };
};

const addDaysToDateKey = (dateKey: string, days: number): string => {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  return getVietnamDateKey(d);
};

const calculateWorkoutStreak = (completedDateKeys: string[], todayKey: string): number => {
  const completedSet = new Set(completedDateKeys);
  let streak = 0;
  let cursor = todayKey;

  // If today has no completed workout, streak starts from yesterday.
  if (!completedSet.has(cursor)) {
    cursor = addDaysToDateKey(cursor, -1);
  }

  while (completedSet.has(cursor)) {
    streak += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }

  return streak;
};

const getDateKeyList = (startKey: string, days: number): string[] => {
  return Array.from({ length: days }, (_, i) => addDaysToDateKey(startKey, i));
};

const buildSparklinePath = (values: number[]): string => {
  const width = 100;
  const height = 30;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  const points = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  if (points.length <= 1) return `M0,${height / 2} L${width},${height / 2}`;

  let d = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const cp1x = prev.x + (curr.x - prev.x) * 0.35;
    const cp1y = prev.y;
    const cp2x = prev.x + (curr.x - prev.x) * 0.65;
    const cp2y = curr.y;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${curr.x.toFixed(2)},${curr.y.toFixed(2)}`;
  }
  return d;
};


export default function MainContent() {
  const { onProfileClick } = useOutletContext<{ onProfileClick: () => void }>();
  const navigate = useNavigate();
  const { user, isLoggedIn, refreshTick, profile } = useAuth();
const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    workout_duration: 0,
    calories_burned: 0,
    remaining_workouts: 0,
    streak_days: 1
  });
  const [weeklyStats, setWeeklyStats] = useState({
    total_workouts: 0,
    total_calories: 0,
    total_minutes: 0,
    streak: 1
  });
  const [weeklyTrend, setWeeklyTrend] = useState({
    workouts: [0, 0, 0, 0, 0, 0, 0],
    calories: [0, 0, 0, 0, 0, 0, 0],
    minutes: [0, 0, 0, 0, 0, 0, 0]
  });
  const [liveTick, setLiveTick] = useState(0);
  const [todayExercises, setTodayExercises] = useState<any[]>([]);
  const [todayMeals, setTodayMeals] = useState<{type: string, label: string, foods: string, kcal: number}[]>([]);
  const [totalMealKcal, setTotalMealKcal] = useState(0);
  const [dailyProgress, setDailyProgress] = useState({
    caloriesConsumed: 0, calorieTarget: 0,
    workoutMinutes: 0, workoutTarget: 20,
    waterIntake: 0, waterGoal: 2.5,
    sleepActual: 0, sleepTarget: 7
  });
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  const [weeklySchedule, setWeeklySchedule] = useState<{day: string, date: string, type: string, duration: number, completed: boolean, isToday: boolean, isRest: boolean}[]>([]);
  const [last7DaysWeight, setLast7DaysWeight] = useState<{day: string, value: number}[]>([]);

  const parseReps = (reps: string | null | undefined): number => {
    if (!reps) return 10;
    const nums = String(reps).match(/\d+/g)?.map(Number).filter(n => !Number.isNaN(n)) || [];
    if (nums.length === 0) return 10;
    if (nums.length === 1) return nums[0];
    return Math.round((nums[0] + nums[nums.length - 1]) / 2);
  };

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

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const today = new Date();
        const todayStr = getVietnamDateKey(today);
        const { weekStartKey, weekEndKey } = getVietnamWeekRange(today);
        
        // 1. Lấy dữ liệu ngày hôm nay
        const [lifestyleRes, progressLogRes, latestBodyRes, todaySessionsRes, completedDaysRes, healthRes] = await Promise.all([
          supabase.from('lifestyle_settings').select('workout_duration, weekly_workouts, daily_water_goal, target_calories').eq('user_id', user.id).maybeSingle(),
          supabase.from('daily_progress_logs').select('calories_burned, workout_duration, water_intake_ml, sleep_hours, calories_consumed').eq('user_id', user.id).eq('log_date', todayStr).maybeSingle(),
          supabase.from('body_metrics').select('weight').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('daily_exercise_sessions').select('sets, reps, weight_kg, rest_seconds, is_completed, exercises:exercise_id(name, gif_url, instructions)').eq('user_id', user.id).eq('log_date', todayStr).order('order_index', { ascending: true }),
          supabase
            .from('daily_exercise_sessions')
            .select('log_date')
            .eq('user_id', user.id)
            .eq('is_completed', true)
            .order('log_date', { ascending: false })
            .limit(180),
          supabase.from('health_conditions').select('sleep_hours').eq('user_id', user.id).maybeSingle(),
        ]);

        const userWeight = Number(latestBodyRes.data?.weight || 70);
        const todaySessions = todaySessionsRes.data || [];
        const completedSessions = todaySessions.filter((s: any) => !!s.is_completed);
        const estimatedCaloriesFromSessions = completedSessions.reduce(
          (sum: number, item: any) => sum + estimateExerciseKcal(item, userWeight),
          0
        );

        if (lifestyleRes.data || todaySessions.length > 0) {
          setStats(prev => ({
            ...prev,
            workout_duration: Math.round(completedSessions.length * 8),
            calories_burned: estimatedCaloriesFromSessions,
            remaining_workouts: todaySessions.length
          }));
        }

        // Today's exercise details
        if (todaySessions.length > 0) {
          setTodayExercises(todaySessions.map((s: any) => ({
            name: (s.exercises as any)?.name || 'Bài tập',
            img: (s.exercises as any)?.gif_url || '',
            instructions: (s.exercises as any)?.instructions || [],
            sets: s.sets || 0,
            reps: s.reps || '-',
            weight_kg: s.weight_kg || 0,
            is_completed: !!s.is_completed,
            kcal: estimateExerciseKcal(s, userWeight)
          })));
        } else {
          setTodayExercises([]);
        }

        // Daily progress
        let sleepTarget = 7;
        if (healthRes.data?.sleep_hours) {
          const sh = String(healthRes.data.sleep_hours);
          sleepTarget = sh.includes('-') ? parseInt(sh.split('-')[1]) || 7 : parseInt(sh) || 7;
        }
        const waterGoal = lifestyleRes.data?.daily_water_goal || 2.5;
        const calorieTarget = lifestyleRes.data?.target_calories || 0;
        const workoutTarget = lifestyleRes.data?.workout_duration || 20;

        setDailyProgress({
          caloriesConsumed: estimatedCaloriesFromSessions,
          calorieTarget: Number(calorieTarget),
          workoutMinutes: Math.round(completedSessions.length * 8),
          workoutTarget: Number(workoutTarget),
          waterIntake: progressLogRes.data?.water_intake_ml ? progressLogRes.data.water_intake_ml / 1000 : 0,
          waterGoal: Number(waterGoal),
          sleepActual: progressLogRes.data?.sleep_hours || 0,
          sleepTarget: sleepTarget
        });

        // Completed days for streak calendar
        const completedDateKeys = Array.from(
          new Set((completedDaysRes.data || []).map((row: any) => String(row.log_date || '')).filter(Boolean))
        );
        setCompletedDays(new Set(completedDateKeys));

        const dayOfWeek = new Date(todayStr + 'T00:00:00').getDay();
        const todayDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
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
            .select('calories, quantity, meal_type, foods:food_id(name, calories)')
            .eq('food_plan_id', plans[0].id)
            .eq('day_of_week', todayDayOfWeek);

          if (foodItems && foodItems.length > 0) {
            const mealMap: Record<string, {label: string, foods: string[], kcal: number}> = {
              breakfast: { label: 'Bữa sáng', foods: [], kcal: 0 },
              lunch: { label: 'Bữa trưa', foods: [], kcal: 0 },
              dinner: { label: 'Bữa tối', foods: [], kcal: 0 },
              snack: { label: 'Bữa phụ', foods: [], kcal: 0 }
            };
            foodItems.forEach((item: any) => {
              const type = item.meal_type || 'breakfast';
              const qty = Number(item.quantity || 1);
              const kcal = Number(item.calories || (item.foods as any)?.calories || 0) * qty;
              const name = (item.foods as any)?.name || 'Món ăn';
              if (!mealMap[type]) mealMap[type] = { label: type, foods: [], kcal: 0 };
              mealMap[type].foods.push(name);
              mealMap[type].kcal += kcal;
            });
            const meals = Object.entries(mealMap)
              .filter(([, v]) => v.foods.length > 0)
              .map(([type, v]) => ({ type, label: v.label, foods: v.foods.join(', '), kcal: Math.round(v.kcal) }));
            setTodayMeals(meals);
            setTotalMealKcal(Math.round(meals.reduce((s, m) => s + m.kcal, 0)));
          } else {
            setTodayMeals([]);
            setTotalMealKcal(0);
          }
        } else {
          setTodayMeals([]);
          setTotalMealKcal(0);
        }

        // 2. Lấy dữ liệu tuần hiện tại cho Tổng hợp hàng tuần
        const [{ data: weeklyLogs }, { data: weeklySessions }] = await Promise.all([
          supabase
          .from('daily_progress_logs')
          .select('calories_burned, workout_duration, log_date')
          .eq('user_id', user.id)
          .gte('log_date', weekStartKey)
          .lte('log_date', weekEndKey),
          supabase
          .from('daily_exercise_sessions')
          .select('sets, reps, weight_kg, rest_seconds, is_completed, log_date, exercises:exercise_id(name, body_part)')
          .eq('user_id', user.id)
          .gte('log_date', weekStartKey)
          .lte('log_date', weekEndKey)
        ]);

        const totalCaloriesFromLogs = (weeklyLogs || []).reduce((sum, log) => sum + (log.calories_burned || 0), 0);
        const totalCaloriesFromSessions = (weeklySessions || [])
          .filter((item: any) => !!item.is_completed)
          .reduce((sum: number, item: any) => sum + estimateExerciseKcal(item, userWeight), 0);

        const completedWorkouts = (weeklySessions || []).filter((item: any) => !!item.is_completed).length;
        const totalCalories = totalCaloriesFromLogs > 0 ? totalCaloriesFromLogs : totalCaloriesFromSessions;
        const totalMinutes = completedWorkouts * 8;
        const weeklyCompletedKeys = Array.from(
          new Set((completedDaysRes.data || []).map((row: any) => String(row.log_date || '')).filter(Boolean))
        );
        const streakDays = calculateWorkoutStreak(weeklyCompletedKeys, todayStr);

        const weekKeys = getDateKeyList(weekStartKey, 7);
        const workoutByDay: Record<string, number> = {};
        const caloriesByDay: Record<string, number> = {};
        const minutesByDay: Record<string, number> = {};

        (weeklySessions || []).forEach((s: any) => {
          const key = String(s.log_date || '');
          workoutByDay[key] = (workoutByDay[key] || 0) + 1;
          if (s.is_completed) {
            const kcal = estimateExerciseKcal(s, userWeight);
            caloriesByDay[key] = (caloriesByDay[key] || 0) + kcal;
            minutesByDay[key] = (minutesByDay[key] || 0) + 8;
          }
        });

        (weeklyLogs || []).forEach((log: any) => {
          const key = String(log.log_date || '');
          if (Number(log.calories_burned || 0) > 0) caloriesByDay[key] = Number(log.calories_burned || 0);
          if (Number(log.workout_duration || 0) > 0) minutesByDay[key] = Number(log.workout_duration || 0);
        });

        setWeeklyTrend({
          workouts: weekKeys.map((k) => workoutByDay[k] || 0),
          calories: weekKeys.map((k) => caloriesByDay[k] || 0),
          minutes: weekKeys.map((k) => minutesByDay[k] || 0)
        });

        setWeeklyStats({
          total_workouts: completedWorkouts,
          total_calories: totalCalories,
          total_minutes: totalMinutes,
          streak: streakDays
        });

        // 3. Build weekly schedule for "Lịch tập tuần này"
        const dayLabels = ['T2','T3','T4','T5','T6','T7','CN'];
        const schedule = weekKeys.map((dateKey, idx) => {
          const sessionsForDay = (weeklySessions || []).filter((s: any) => String(s.log_date || '') === dateKey);
          const sessionCount = sessionsForDay.length;
          const completedCount = sessionsForDay.filter((s: any) => !!s.is_completed).length;
          const durationMin = sessionCount * 8;
          // Determine workout type from body_part or exercise name
          let workoutType = 'Nghỉ ngơi';
          let isRest = sessionCount === 0;
          if (sessionCount > 0) {
            const bodyParts = sessionsForDay.map((s: any) => (s.exercises as any)?.body_part || '').filter(Boolean);
            const uniqueParts = [...new Set(bodyParts)];
            if (uniqueParts.length === 0) workoutType = 'Tập luyện';
            else if (uniqueParts.length >= 3) workoutType = 'Full Body';
            else workoutType = uniqueParts.slice(0, 2).map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' & ');
          }
          const dateObj = new Date(`${dateKey}T00:00:00`);
          const dayNum = String(dateObj.getDate()).padStart(2, '0');
          const monthNum = String(dateObj.getMonth() + 1).padStart(2, '0');
          return {
            day: dayLabels[idx],
            date: `${dayNum}/${monthNum}`,
            type: workoutType,
            duration: durationMin,
            completed: completedCount > 0 && completedCount === sessionCount,
            isToday: dateKey === todayStr,
            isRest
          };
        });
        setWeeklySchedule(schedule);

        // 4. Fetch last 7 days weight for "Tiến độ 7 ngày"
        const todayDateObj = new Date(`${todayStr}T00:00:00`);
        const sevenDaysAgoDate = new Date(todayDateObj);
        sevenDaysAgoDate.setDate(todayDateObj.getDate() - 6);
        const sevenDaysAgoKey = getVietnamDateKey(sevenDaysAgoDate);
        const { data: weightLogs } = await supabase
          .from('body_metrics')
          .select('weight, created_at')
          .eq('user_id', user.id)
          .gte('created_at', `${sevenDaysAgoKey}T00:00:00`)
          .order('created_at', { ascending: true });

        const last7Keys = getDateKeyList(sevenDaysAgoKey, 7);
        const weightByDay: Record<string, number> = {};
        (weightLogs || []).forEach((w: any) => {
          const wDate = new Date(w.created_at);
          const wKey = getVietnamDateKey(wDate);
          weightByDay[wKey] = Number(w.weight || 0);
        });
        // Fill gaps with latest known weight
        let lastKnown = Number(latestBodyRes.data?.weight || 0);
        const weightData = last7Keys.map((k, idx) => {
          if (weightByDay[k]) lastKnown = weightByDay[k];
          const dateObj = new Date(`${k}T00:00:00`);
          return { day: dayLabels[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1], value: lastKnown };
        });
        setLast7DaysWeight(weightData);
      } catch (e) { 
        console.error(e); 
      } finally {
        setLoading(false);
      }
    }
    if (isLoggedIn) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user, isLoggedIn, refreshTick, profile, liveTick]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const id = window.setInterval(() => {
      // trigger refetch in near real-time cadence
      setLiveTick(prev => prev + 1);
    }, 15000);
    return () => window.clearInterval(id);
  }, [isLoggedIn]);

  // Removed internal LoadingScreen as it's now handled by Overview.tsx
  // if (loading) return <LoadingScreen />;

  const rawName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Thành viên";
  const nameParts = rawName.trim().split(/\s+/);
  const userName = nameParts.length > 1 
    ? `${nameParts[nameParts.length - 1]} ${nameParts[0]}` 
    : rawName;

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden bg-bg-secondary h-[220px] md:h-[260px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://wpkbzssdipqtbmthvgvx.supabase.co/storage/v1/object/public/media-assets/banners/banner.jpg" 
            alt="Workout" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
        </div>
        
        <div className="relative z-10 p-6 md:p-8 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
            <div className="max-w-4xl">
              <h2 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-extrabold text-white leading-[1.1] mb-2 uppercase tracking-tighter">
                {`CHÀO MỪNG ${userName} ĐẾN VỚI`} <span className="text-[#a3e635]">TRENDFIT AI</span> -<br className="hidden sm:block" />
                {"DỮ LIỆU CỦA BẠN, THÀNH CÔNG CỦA BẠN."}
              </h2>
              <p className="text-[9px] sm:text-xs md:text-sm text-white/80 mb-4 max-w-lg">
                {`Hôm nay AI đã sẵn sàng lộ trình tập luyện ${stats.workout_duration} phút cho bạn.`}
              </p>
              <button 
                onClick={onProfileClick}
                className="text-[#a3e635] font-bold flex items-center gap-1 hover:text-[#bef264] transition-colors group uppercase tracking-widest text-[8px] sm:text-[9px] md:text-[10px]"
              >
                {"Xem chi tiết hồ sơ"} < ArrowRight className="w-2 h-2 sm:w-3 sm:h-3 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 shrink-0">
              <div className="w-2 h-2 rounded-full bg-[#a3e635] animate-pulse"></div>
              <span className="text-sm font-medium text-white">{"Buổi tập trực tuyến"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Kế hoạch hôm nay */}
      {(() => {
        const now = new Date();
        const vnDateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' });
        const featuredExercise = todayExercises[0];
        const totalExerciseKcal = todayExercises.reduce((s, e) => s + (e.kcal || 0), 0);
        const todayKey = getVietnamDateKey();
        const todayDate = new Date(`${todayKey}T00:00:00`);
        const dayOfWeek = todayDate.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStartDate = new Date(todayDate);
        weekStartDate.setDate(todayDate.getDate() + diffToMonday);
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStartDate);
          d.setDate(weekStartDate.getDate() + i);
          return { key: getVietnamDateKey(d), label: ['T2','T3','T4','T5','T6','T7','CN'][i], isToday: getVietnamDateKey(d) === todayKey };
        });

        const ProgressRing = ({ value, max, color, label, unit }: { value: number; max: number; color: string; label: string; unit: string }) => {
          const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
          return (
            <div className="flex flex-col items-center gap-1">
              <div className="relative w-14 h-14 md:w-16 md:h-16">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--bg-tertiary)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
                    strokeDasharray={`${pct} 100`} className="transition-all duration-700 ease-out"
                    style={{ filter: `drop-shadow(0 0 4px ${color}40)` }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] md:text-xs font-bold text-text-primary leading-none">{typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}</span>
                  <span className="text-[7px] text-text-tertiary font-bold">/ {typeof max === 'number' && max % 1 !== 0 ? max.toFixed(1) : max}</span>
                </div>
              </div>
              <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-wider">{unit}</span>
              <span className="text-[7px] md:text-[8px] font-bold text-text-tertiary">{label}</span>
            </div>
          );
        };

        return (
          <div className="bg-bg-secondary rounded-xl border border-border-primary p-3 md:p-4 flex flex-col gap-3 md:gap-4 h-[320px] md:h-[350px]">
            <div className="flex items-center gap-3">
              <h3 className="text-base md:text-lg font-bold text-text-primary">Kế hoạch hôm nay</h3>
              <div className="flex items-center gap-1.5 text-text-tertiary">
                <CalendarDays className="w-4 h-4" />
                <span className="text-xs font-medium capitalize">{vnDateStr}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 flex-1 min-h-0">
              {/* Column 1: Bài tập hôm nay */}
              <div className="bg-bg-tertiary/40 rounded-xl border border-border-primary/50 p-4 md:p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-[#8b5cf6]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8b5cf6]">Bài tập hôm nay</span>
                  </div>
                  {featuredExercise && (
                    <div className="flex items-center gap-1.5 bg-[#ff5e00]/10 px-2.5 py-1 rounded-full border border-[#ff5e00]/20">
                      <Flame className="w-3.5 h-3.5 text-[#ff5e00]" />
                      <span className="text-xs font-bold text-[#ff5e00]">{totalExerciseKcal} kcal</span>
                    </div>
                  )}
                </div>

                {featuredExercise ? (
                  <div className="flex flex-col gap-4 flex-1">
                    <div>
                      <h4 className="text-base font-bold text-text-primary mb-2">{featuredExercise.name}</h4>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">{stats.workout_duration} phút</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <Activity className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">Trung bình</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-4 flex-1">
                      {todayExercises.length > 0 && (
                        <ol className="flex-1 space-y-2.5">
                          {todayExercises.slice(0, 4).map((ex, i) => (
                            <li key={i} className="flex items-center gap-3 text-xs text-text-primary font-medium">
                              <span className="w-5 h-5 rounded-full bg-bg-tertiary flex items-center justify-center text-[10px] font-bold text-text-secondary shrink-0">{i + 1}</span>
                              <span className="flex-1 truncate">{ex.name}</span>
                              {ex.is_completed && <Check className="w-3.5 h-3.5 text-[#a3e635] shrink-0" />}
                            </li>
                          ))}
                          {todayExercises.length > 4 && (
                            <li className="text-xs text-text-tertiary pl-8 font-medium">+{todayExercises.length - 4} bài khác</li>
                          )}
                        </ol>
                      )}

                      {featuredExercise.img && (
                        <div className="w-full lg:w-32 xl:w-40 h-32 lg:h-auto rounded-xl overflow-hidden shrink-0 border border-border-primary">
                          <img src={featuredExercise.img} alt={featuredExercise.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-auto pt-2">
                      <button onClick={() => navigate('/exercises')} className="flex-1 h-11 bg-[#a3e635] text-black rounded-xl text-sm font-bold hover:bg-[#bef264] transition-colors">Bắt đầu tập</button>
                      <button onClick={() => navigate('/exercises')} className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-black hover:bg-gray-100 transition-colors">
                        <Play className="w-5 h-5 fill-current" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
                    <Dumbbell className="w-10 h-10 text-text-tertiary opacity-20 mb-3" />
                    <p className="text-sm text-text-tertiary font-medium">Chưa có lịch tập hôm nay</p>
                    <button onClick={() => navigate('/smart-planner')} className="mt-3 text-xs text-[#a3e635] font-bold hover:underline">Tạo lịch tập với AI →</button>
                  </div>
                )}
              </div>

              {/* Column 2: Thực đơn hôm nay */}
              <div className="bg-bg-tertiary/40 rounded-xl border border-border-primary/50 p-4 md:p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-orange-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Thực đơn hôm nay</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#a3e635]/10 px-2.5 py-1 rounded-full border border-[#a3e635]/20">
                    <Utensils className="w-3.5 h-3.5 text-[#a3e635]" />
                    <span className="text-xs font-bold text-[#a3e635]">{totalMealKcal.toLocaleString()} kcal</span>
                  </div>
                </div>

                {todayMeals.length > 0 ? (
                  <div className="flex flex-col gap-4 flex-1">
                    <div className="space-y-3">
                      {todayMeals.map((meal, i) => (
                        <div key={i} className="flex items-start gap-3 bg-bg-tertiary/30 p-3 rounded-xl border border-border-primary/50">
                          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                            {meal.type === 'breakfast' && <span className="text-xl">🥣</span>}
                            {meal.type === 'lunch' && <span className="text-xl">🥗</span>}
                            {meal.type === 'dinner' && <span className="text-xl">🍲</span>}
                            {meal.type === 'snack' && <span className="text-xl">🍎</span>}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center h-10">
                            <h5 className="text-sm font-bold text-text-primary leading-tight">{meal.label}</h5>
                            <p className="text-xs text-text-tertiary truncate leading-tight mt-0.5">{meal.foods}</p>
                          </div>
                          <div className="h-10 flex items-center">
                            <span className="text-xs font-medium text-text-secondary whitespace-nowrap">{meal.kcal} kcal</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => navigate('/diet-plan')} className="w-full h-11 rounded-xl border border-border-primary text-sm font-bold text-text-secondary hover:border-[#a3e635] hover:text-[#a3e635] transition-colors flex items-center justify-center gap-1.5 mt-auto">
                      Xem chi tiết thực đơn <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
                    <Utensils className="w-10 h-10 text-text-tertiary opacity-20 mb-3" />
                    <p className="text-sm text-text-tertiary font-medium">Chưa có thực đơn hôm nay</p>
                    <button onClick={() => navigate('/diet-plan')} className="mt-3 text-xs text-[#a3e635] font-bold hover:underline">Lập thực đơn →</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {/* Lịch tập tuần này */}
      <div className="bg-bg-secondary rounded-xl p-4 md:p-5 border border-border-primary h-[280px] flex flex-col justify-between">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-[#a3e635]" />
          <h3 className="text-sm md:text-base font-bold text-text-primary">Lịch tập tuần này</h3>
        </div>
        <div className="grid grid-cols-7 gap-1.5 md:gap-2 flex-1">
          {weeklySchedule.map((day, i) => (
            <div 
              key={i} 
              className={`relative rounded-xl p-2 md:p-3 flex flex-col items-center justify-between gap-1 md:gap-1.5 border transition-all ${
                day.isToday 
                  ? 'bg-[#a3e635]/10 border-[#a3e635]/40' 
                  : 'bg-bg-tertiary/30 border-border-primary/30 hover:border-border-primary/60'
              }`}
            >
              <span className={`text-[10px] md:text-xs font-bold ${
                day.isToday ? 'text-[#a3e635]' : 'text-text-primary'
              }`}>{day.day}</span>
              <span className="text-[8px] md:text-[9px] text-text-tertiary">{day.date}</span>
              
              {day.isRest ? (
                <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-bg-tertiary/50 flex items-center justify-center my-0.5 md:my-1">
                  <Moon className="w-3.5 h-3.5 md:w-4 md:h-4 text-text-tertiary" />
                </div>
              ) : (
                <div className={`w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center my-0.5 md:my-1 ${
                  day.completed 
                    ? 'bg-[#a3e635]/20' 
                    : day.isToday 
                      ? 'bg-blue-500/20' 
                      : 'bg-purple-500/10'
                }`}>
                  {day.completed ? (
                    <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#a3e635]" />
                  ) : (
                    <Dumbbell className={`w-3.5 h-3.5 md:w-4 md:h-4 ${
                      day.isToday ? 'text-blue-400' : 'text-purple-400'
                    }`} />
                  )}
                </div>
              )}
              
              <span className={`text-[7px] md:text-[9px] font-bold text-center leading-tight line-clamp-1 ${
                day.isRest ? 'text-text-tertiary italic' : 'text-text-secondary'
              }`}>{day.type}</span>
              
              {!day.isRest && (
                <span className="text-[7px] md:text-[8px] text-text-tertiary">{day.duration} phút</span>
              )}
              
              {!day.isRest && (
                <div className="flex items-center gap-0.5">
                  {day.completed ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a3e635]"></div>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary/30"></div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
