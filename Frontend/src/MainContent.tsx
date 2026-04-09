import { Heart, Flame, Activity, ArrowRight, Dumbbell } from 'lucide-react';
import AnimatedNumber from './components/AnimatedNumber';
import { useAuth } from './contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useTranslation } from 'react-i18next';

import { useOutletContext } from 'react-router-dom';


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

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // 1. Lấy dữ liệu ngày hôm nay
        const [lifestyleRes, progressLogRes] = await Promise.all([
          supabase.from('lifestyle_settings').select('workout_duration, weekly_workouts').eq('user_id', user.id).maybeSingle(),
          supabase.from('daily_progress_logs').select('calories_burned, workout_duration').eq('user_id', user.id).eq('log_date', todayStr).maybeSingle()
        ]);

        if (lifestyleRes.data) {
          setStats(prev => ({
            ...prev,
            workout_duration: progressLogRes.data?.workout_duration || 0,
            calories_burned: progressLogRes.data?.calories_burned ?? 0,
            remaining_workouts: lifestyleRes.data?.weekly_workouts || 0
          }));
        }

        // 2. Lấy dữ liệu 7 ngày gần nhất cho Tổng hợp hàng tuần
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        const { data: weeklyLogs } = await supabase
          .from('daily_progress_logs')
          .select('calories_burned, workout_duration, log_date')
          .eq('user_id', user.id)
          .gte('log_date', sevenDaysAgoStr)
          .lte('log_date', todayStr);

        if (weeklyLogs && weeklyLogs.length > 0) {
          const totalCalories = weeklyLogs.reduce((sum, log) => sum + (log.calories_burned || 0), 0);
          const totalMinutes = weeklyLogs.reduce((sum, log) => sum + (log.workout_duration || 0), 0);
          const completedWorkouts = weeklyLogs.filter(log => (log.workout_duration || 0) > 0).length;

          setWeeklyStats({
            total_workouts: completedWorkouts,
            total_calories: totalCalories,
            total_minutes: totalMinutes,
            streak: profile?.streak_days || 1
          });
        }
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
  }, [user, isLoggedIn, refreshTick, profile]);

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
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-bg-secondary rounded-2xl p-6 border border-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-text-secondary">{t('dashboard.remaining_workouts')}</span>
            </div>
            <span className="text-text-tertiary">...</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-bold text-text-primary">{stats.remaining_workouts}</span>
              <span className="text-sm text-text-tertiary ml-1">{t('dashboard.workouts_unit')}</span>
            </div>
            <svg className="w-24 h-8" viewBox="0 0 100 30">
              <path d="M0,15 Q10,5 20,15 T40,15 T60,5 80,25 T100,15" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-2xl p-6 border border-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#ff5e00]" />
              <span className="text-sm font-medium text-text-secondary">{t('dashboard.calories_burned')}</span>
            </div>
            <span className="text-text-tertiary">...</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-bold text-text-primary">
                <AnimatedNumber value={stats.calories_burned} />
              </span>
              <span className="text-sm text-text-tertiary ml-1">Kcal</span>
            </div>
            <svg className="w-24 h-8" viewBox="0 0 100 30">
              <path d="M0,25 Q15,5 30,20 T60,10 T90,25 T100,15" fill="none" stroke="#ff5e00" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-2xl p-6 border border-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#a3e635]" />
              <span className="text-sm font-medium text-text-secondary">{t('dashboard.exercise')}</span>
            </div>
            <span className="text-text-tertiary">...</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-bold text-text-primary">
                <AnimatedNumber value={stats.workout_duration} />
              </span>
              <span className="text-sm text-text-tertiary ml-1">{t('dashboard.minutes_unit')}</span>
            </div>
            <svg className="w-24 h-8" viewBox="0 0 100 30">
              <path d="M0,15 Q20,25 40,10 T70,20 T100,5" fill="none" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" />
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
        <div className="grid grid-cols-3 gap-6">
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
        <div className="grid grid-cols-4 gap-4">
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
        <div className="grid grid-cols-4 gap-4 text-center divide-x divide-border-primary">
          <div>
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
          <div>
            <p className="text-3xl font-bold text-[#ec4899] mb-1">
              <AnimatedNumber value={weeklyStats.streak} />
            </p>
            <p className="text-xs text-text-tertiary font-medium">{t('dashboard.streak')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
