import { Heart, Flame, Activity, ArrowRight, Dumbbell } from 'lucide-react';
import AnimatedNumber from './components/AnimatedNumber';
import { useAuth } from './contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useTranslation } from 'react-i18next';

import { useOutletContext } from 'react-router-dom';

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
  const { user, isLoggedIn, refreshTick, profile } = useAuth();
  const { t } = useTranslation();
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
        const [lifestyleRes, progressLogRes, latestBodyRes, todaySessionsRes, completedDaysRes] = await Promise.all([
          supabase.from('lifestyle_settings').select('workout_duration, weekly_workouts').eq('user_id', user.id).maybeSingle(),
          supabase.from('daily_progress_logs').select('calories_burned, workout_duration').eq('user_id', user.id).eq('log_date', todayStr).maybeSingle(),
          supabase.from('body_metrics').select('weight').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('daily_exercise_sessions').select('sets, reps, weight_kg, rest_seconds, is_completed').eq('user_id', user.id).eq('log_date', todayStr),
          supabase
            .from('daily_exercise_sessions')
            .select('log_date')
            .eq('user_id', user.id)
            .eq('is_completed', true)
            .order('log_date', { ascending: false })
            .limit(180)
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
            // Keep these cards consistent with Exercises page (today sessions only)
            workout_duration: Math.round(completedSessions.length * 8),
            calories_burned: estimatedCaloriesFromSessions,
            remaining_workouts: todaySessions.length
          }));
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
          .select('sets, reps, weight_kg, rest_seconds, is_completed, log_date')
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
        const completedDateKeys = Array.from(
          new Set((completedDaysRes.data || []).map((row: any) => String(row.log_date || '')).filter(Boolean))
        );
        const streakDays = calculateWorkoutStreak(completedDateKeys, todayStr);

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

  const rawName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('common.member', 'Thành viên');
  const nameParts = rawName.trim().split(/\s+/);
  const userName = nameParts.length > 1 
    ? `${nameParts[nameParts.length - 1]} ${nameParts[0]}` 
    : rawName;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-bg-secondary h-[220px] md:h-[260px] flex items-center">
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
                {t('dashboard.welcome_title', { name: userName })} <span className="text-[#a3e635]">TRENDFIT AI</span> -<br className="hidden sm:block" />
                {t('dashboard.welcome_subtitle')}
              </h2>
              <p className="text-[9px] sm:text-xs md:text-sm text-white/80 mb-4 max-w-lg">
                {t('dashboard.ai_ready', { minutes: stats.workout_duration })}
              </p>
              <button 
                onClick={onProfileClick}
                className="text-[#a3e635] font-bold flex items-center gap-1 hover:text-[#bef264] transition-colors group uppercase tracking-widest text-[8px] sm:text-[9px] md:text-[10px]"
              >
                {t('dashboard.view_profile')} < ArrowRight className="w-2 h-2 sm:w-3 sm:h-3 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 shrink-0">
              <div className="w-2 h-2 rounded-full bg-[#a3e635] animate-pulse"></div>
              <span className="text-sm font-medium text-white">{t('dashboard.online_session')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-bg-secondary rounded-2xl p-4 md:p-6 border border-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-text-secondary">{t('dashboard.remaining_workouts')}</span>
            </div>
            <span className="text-text-tertiary">...</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-bold text-text-primary">{stats.remaining_workouts}</span>
              <span className="text-[10px] md:text-sm text-text-tertiary font-medium">{t('dashboard.workouts_unit')}</span>
            </div>
            <svg className="w-16 md:w-24 h-8" viewBox="0 0 100 30">
              <path d={buildSparklinePath(weeklyTrend.workouts)} fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-2xl p-4 md:p-6 border border-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#ff5e00]" />
              <span className="text-sm font-medium text-text-secondary">{t('dashboard.calories_burned')}</span>
            </div>
            <span className="text-text-tertiary">...</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-bold text-text-primary">
                <AnimatedNumber value={stats.calories_burned} />
              </span>
              <span className="text-[10px] md:text-sm text-text-tertiary font-medium">Kcal</span>
            </div>
            <svg className="w-16 md:w-24 h-8" viewBox="0 0 100 30">
              <path d={buildSparklinePath(weeklyTrend.calories)} fill="none" stroke="#ff5e00" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-2xl p-4 md:p-6 border border-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#a3e635]" />
              <span className="text-sm font-medium text-text-secondary">{t('dashboard.exercise')}</span>
            </div>
            <span className="text-text-tertiary">...</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-2xl md:text-3xl font-bold text-text-primary">
                <AnimatedNumber value={stats.workout_duration} />
              </span>
              <span className="text-[10px] md:text-sm text-text-tertiary font-medium">{t('dashboard.minutes_unit')}</span>
            </div>
            <svg className="w-16 md:w-24 h-8" viewBox="0 0 100 30">
              <path d={buildSparklinePath(weeklyTrend.minutes)} fill="none" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Featured Course */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-text-primary">{t('dashboard.featured_courses')}</h3>
          <a href="#" className="text-sm font-medium text-[#a3e635] flex items-center gap-1 hover:underline">
            {t('dashboard.view_all')} < ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[
            { title: t('courses.weightlifting', 'Nâng tạ'), level: t('levels.advanced', 'Nâng cao'), img: 'https://wpkbzssdipqtbmthvgvx.supabase.co/storage/v1/object/public/media-assets/course/weight-lifting.jpg' },
            { title: t('courses.muscle_growth', 'Phát triển cơ bắp'), level: t('levels.intermediate', 'Trung cấp'), img: 'https://wpkbzssdipqtbmthvgvx.supabase.co/storage/v1/object/public/media-assets/course/muscle-training.jpg' },
            { title: t('courses.crossfit', 'CrossFit'), level: t('levels.all', 'Mọi cấp độ'), img: 'https://wpkbzssdipqtbmthvgvx.supabase.co/storage/v1/object/public/media-assets/course/cross-fit.jpg' }
          ].map((course, i) => (
            <div key={i} className="group relative rounded-2xl overflow-hidden h-48 cursor-pointer">
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

      {/* Services */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-text-primary">{t('dashboard.services')}</h3>
          <a href="#" className="text-sm font-medium text-[#a3e635] flex items-center gap-1 hover:underline">
            {t('dashboard.view_all')} < ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: t('services.workout_program', 'CHƯƠNG TRÌNH TẬP LUYỆN'), img: 'https://wpkbzssdipqtbmthvgvx.supabase.co/storage/v1/object/public/media-assets/Services/WORKOUT%20PROGRAM.jpg' },
            { title: t('services.nutrition_plan', 'KẾ HOẠCH DINH DƯỠNG'), img: 'https://wpkbzssdipqtbmthvgvx.supabase.co/storage/v1/object/public/media-assets/Services/NUTRITION%20PLAN.jpg' },
            { title: t('services.practice_time', 'THỜI GIAN THỰC HÀNH'), img: 'https://wpkbzssdipqtbmthvgvx.supabase.co/storage/v1/object/public/media-assets/Services/PRACTICE%20TIME.jpg' },
            { title: t('services.diet_program', 'CHƯƠNG TRÌNH ĂN KIÊNG'), img: 'https://wpkbzssdipqtbmthvgvx.supabase.co/storage/v1/object/public/media-assets/Services/DIET%20PROGRAM.jpg' }
          ].map((service, i) => (
            <div key={i} className="bg-bg-secondary rounded-2xl overflow-hidden border border-border-primary cursor-pointer hover:border-[#a3e635] transition-colors">
              <div className="h-32 overflow-hidden">
                <img src={service.img} alt={service.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] font-bold text-text-secondary tracking-wider">{service.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="bg-bg-secondary rounded-2xl p-6 border border-border-primary">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-[#a3e635]" />
          <h3 className="text-lg font-bold text-text-primary">{t('dashboard.weekly_summary')}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="py-2 md:py-0">
            <p className="text-3xl font-bold text-[#a3e635] mb-1">
              <AnimatedNumber value={weeklyStats.total_workouts} />
            </p>
            <p className="text-xs text-text-tertiary font-medium">{t('dashboard.total_workouts')}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#ff5e00] mb-1">
              <AnimatedNumber value={weeklyStats.total_calories} />
            </p>
            <p className="text-xs text-text-tertiary font-medium">{t('dashboard.total_calories')}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#06b6d4] mb-1">
              <AnimatedNumber value={weeklyStats.total_minutes} />
            </p>
            <p className="text-xs text-text-tertiary font-medium">{t('dashboard.total_minutes')}</p>
          </div>
          <div className="py-2 md:py-0">
            <p className="text-2xl md:text-3xl font-bold text-[#ec4899] mb-1">
              <AnimatedNumber value={weeklyStats.streak} />
            </p>
            <p className="text-xs text-text-tertiary font-medium">{t('dashboard.streak')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
