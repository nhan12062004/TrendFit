import { Moon, Droplet, Dumbbell, Utensils, Timer, TrendingUp, Scale, Ruler, Clock, Brain, Target, Trophy, Blocks } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AnimatedNumber from './components/AnimatedNumber';
import { useAuth } from './contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useTranslation } from 'react-i18next';

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

export default function RightPanel() {
  const { user, isLoggedIn, refreshTick } = useAuth();
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState({
    weight: 0,
    height: 0,
    age: 0,
    gender: 'male',
    activity_level: 'moderate',
    goal: 'maintenance',
    water_goal: 0,
    sleep_hours: 0
  });

  const [consumedKcal, setConsumedKcal] = useState(0);
  const [actualWater, setActualWater] = useState(0);
  const [todayWorkouts, setTodayWorkouts] = useState<any[]>([]);
  const [sleepHours, setSleepHours] = useState({ actual: 0, target: 0 });
  const [aiTargetKcal, setAiTargetKcal] = useState<number | null>(null);

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
    async function fetchMetrics() {
      if (!user) return;
      try {
        const { data: profile } = await supabase.from('profiles').select('birthday, gender').eq('id', user.id).maybeSingle();
        const { data: body } = await supabase.from('body_metrics').select('weight, height').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
        const { data: lifestyle } = await supabase.from('lifestyle_settings').select('daily_water_goal, activity_level, fitness_goal').eq('user_id', user.id).maybeSingle();
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
          if (sleepStr.includes('-')) {
            targetSleep = parseInt(sleepStr.split('-')[1]) || 7;
          } else {
            targetSleep = parseInt(sleepStr) || 7;
          }
        }

        const targetWater = lifestyle?.daily_water_goal || 2.5;

        if (log) {
          setConsumedKcal(log.calories_consumed || 0);
          setActualWater(log.water_intake_ml ? log.water_intake_ml / 1000 : 0);
          setSleepHours({
            actual: log.sleep_hours || 0,
            target: targetSleep
          });
        } else {
          setConsumedKcal(0);
          setActualWater(0);
          setSleepHours({
            actual: 0,
            target: targetSleep
          });
        }

        const { data: nutritionPlan } = await supabase
          .from('nutrition_plans')
          .select('total_calories')
          .eq('user_id', user.id)
          .maybeSingle();

        if (nutritionPlan) {
          setAiTargetKcal(nutritionPlan.total_calories);
        }

        // Today's plan should prioritize real daily sessions
        const { data: todaySessions } = await supabase
          .from('daily_exercise_sessions')
          .select(`
            id,
            sets,
            reps,
            weight_kg,
            rest_seconds,
            is_completed,
            exercises:exercise_id (name, gif_url)
          `)
          .eq('user_id', user.id)
          .eq('log_date', today)
          .order('order_index', { ascending: true });

        if (todaySessions && todaySessions.length > 0) {
          const mapped = todaySessions.map((s: any) => {
            const exerciseName = (s.exercises as any)?.name || 'Exercise';
            const gif = (s.exercises as any)?.gif_url || '';
            return {
              img: gif,
              title: exerciseName,
              desc: `${s.sets || 0} sets • ${s.reps || '-'} reps • ${s.weight_kg || 0} kg`,
              progress: s.is_completed ? 100 : 0
            };
          });
          setTodayWorkouts(mapped);

          // Real burned kcal from completed exercises today (sync with Exercises)
          const userWeight = Number(body?.weight || 70);
          const estimatedKcal = todaySessions
            .filter((s: any) => !!s.is_completed)
            .reduce((sum: number, s: any) => sum + estimateExerciseKcal(s, userWeight), 0);
          setConsumedKcal(estimatedKcal);
        } else {
          // Keep Today's Plan consistent with Exercises page only
          setTodayWorkouts([]);
          setConsumedKcal(0);
        }

        let age = 0;
        if (profile?.birthday) {
          age = new Date().getFullYear() - new Date(profile.birthday).getFullYear();
        }

        setMetrics({
          weight: body?.weight || 0,
          height: body?.height || 0,
          age: age || 0,
          gender: profile?.gender || 'male',
          activity_level: lifestyle?.activity_level || 'moderate',
          goal: lifestyle?.fitness_goal || 'maintenance',
          water_goal: targetWater,
          sleep_hours: targetSleep
        });
      } catch (e) {
        console.error('Error fetching metrics/workouts:', e);
      }
    }
    
    if (isLoggedIn) {
      fetchMetrics();
    } else {
      // Reset everything when not logged in
      setMetrics({
        weight: 0, height: 0, age: 0, gender: 'male',
        activity_level: 'moderate', goal: 'maintenance',
        water_goal: 0, sleep_hours: 0
      });
      setConsumedKcal(0);
      setActualWater(0);
      setTodayWorkouts([]);
      setSleepHours({ actual: 0, target: 0 });
      setAiTargetKcal(null);
    }
  }, [user, isLoggedIn, refreshTick]);

  const targetKcal = aiTargetKcal || 0;
  const remainingKcal = targetKcal > 0 ? targetKcal - consumedKcal : 0;
  const progressPercent = targetKcal > 0 ? (consumedKcal / targetKcal) * 100 : 0;

  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6 scrollbar-hide">
      {/* Metrics Row */}
      <div className="bg-bg-secondary rounded-2xl p-4 md:p-6 border border-border-primary grid grid-cols-3">
        <div className="text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center mb-2 text-text-secondary"><Scale className="w-4 h-4" /></div>
          <span className="block text-lg font-bold text-[#a3e635]">
            <AnimatedNumber value={metrics.weight} /> kg
          </span>
          <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-tight">{t('right_panel.weight')}</span>
        </div>
        <div className="text-center flex flex-col items-center justify-center border-x border-border-primary">
          <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center mb-2 text-text-secondary"><Ruler className="w-4 h-4" /></div>
          <span className="block text-lg font-bold text-[#a3e635]">
            <AnimatedNumber value={metrics.height} /> cm
          </span>
          <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-tight">{t('right_panel.height')}</span>
        </div>
        <div className="text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center mb-2 text-text-secondary"><Clock className="w-4 h-4" /></div>
          <span className="block text-lg font-bold text-[#a3e635]">
            <AnimatedNumber value={metrics.age} /> {t('right_panel.years_old')}
          </span>
          <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-tight">{t('right_panel.age')}</span>
        </div>
      </div>

      {/* Calories Progress */}
      <div className="bg-bg-secondary rounded-2xl p-4 md:p-6 border border-border-primary">
        <div className="flex justify-between items-center mb-4">
          <div className="text-center">
            <span className="block text-lg font-bold text-text-primary">
              <AnimatedNumber value={consumedKcal} /> kcal
            </span>
            <span className="text-[10px] text-text-tertiary">{t('right_panel.calories_consumed')}</span>
          </div>
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 36 36" className="w-full h-full">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--bg-tertiary)" strokeWidth="3" />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#a3e635"
                strokeWidth="3"
                strokeDashoffset="0"
                strokeDasharray={`${progressPercent}, 100`}
                className="transition-all duration-[1000ms] ease-out drop-shadow-[0_0_8px_rgba(163,230,53,0.3)]"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-text-primary leading-none">
                <AnimatedNumber value={targetKcal} />
              </span>
              <span className="text-[8px] text-text-tertiary uppercase font-bold tracking-widest mt-1">{t('right_panel.goal')}</span>
            </div>
          </div>
          <div className="text-center">
            <span className="block text-lg font-bold text-text-primary">
              <AnimatedNumber value={remainingKcal > 0 ? remainingKcal : 0} /> kcal
            </span>
            <span className="text-[10px] text-text-tertiary font-medium">{t('right_panel.remaining')}</span>
          </div>
        </div>
        <div className="flex justify-between mt-6 px-2">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#a3e635]"></div><span className="text-[10px] text-text-secondary font-bold">P-{Math.round(targetKcal * 0.3 / 4)}g</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-[10px] text-text-secondary font-bold">C-{Math.round(targetKcal * 0.4 / 4)}g</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#ff5e00]"></div><span className="text-[10px] text-text-secondary font-bold">F-{Math.round(targetKcal * 0.3 / 9)}g</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Sleep Progress */}
        <div className="bg-bg-secondary rounded-2xl p-4 border border-border-primary flex flex-col items-center justify-center transition-all hover:bg-bg-tertiary/20">
          <div className="flex items-center gap-2 mb-3 w-full">
            <Moon className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-text-secondary">{t('right_panel.sleep')}</span>
          </div>
          <div className="relative w-16 h-16 mb-2">
            <svg viewBox="0 0 36 36" className="w-full h-full">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--bg-tertiary)" strokeWidth="4" />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#a855f7"
                strokeWidth="4"
                strokeDasharray={`${sleepHours.target > 0 ? (sleepHours.actual / sleepHours.target) * 100 : 0}, 100`}
                className="transition-all duration-[1000ms] ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-text-primary">
                <AnimatedNumber value={sleepHours.actual} />/{sleepHours.target}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-widest">{t('right_panel.sleep_hours')}</span>
        </div>

        {/* Water Progress */}
        <div className="bg-bg-secondary rounded-2xl p-4 border border-border-primary flex flex-col items-center justify-center transition-all hover:bg-bg-tertiary/20">
          <div className="flex items-center gap-2 mb-3 w-full">
            <Droplet className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium text-text-secondary">{t('right_panel.water')}</span>
          </div>
          <div className="relative w-16 h-16 mb-2">
            <svg viewBox="0 0 36 36" className="w-full h-full">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--bg-tertiary)" strokeWidth="4" />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#60a5fa"
                strokeWidth="4"
                strokeDasharray={`${metrics.water_goal > 0 ? (actualWater / metrics.water_goal) * 100 : 0}, 100`}
                className="transition-all duration-[1000ms] ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-text-primary">
                <AnimatedNumber value={actualWater} />/{metrics.water_goal}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-widest">{t('right_panel.liters_unit')}</span>
        </div>
      </div>

      {/* Today's Plan */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-text-primary mb-4">{t('right_panel.todays_plan')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
          {todayWorkouts.length > 0 ? (
            todayWorkouts.map((plan, i) => (
              <div key={i} className="bg-bg-secondary rounded-xl p-3 border border-border-primary flex items-center gap-3 group hover:border-[#a3e635] transition-colors cursor-pointer" onClick={() => navigate('/exercises')}>
                <img src={plan.img} alt={plan.title} className="w-12 h-12 rounded-lg object-cover" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-text-primary">{plan.title}</h4>
                  <p className="text-[10px] text-text-tertiary tracking-tight line-clamp-1">{plan.desc}</p>
                  <div className="mt-2 h-1 w-full bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#a3e635]/30 group-hover:bg-[#a3e635] transition-all duration-[1500ms] ease-out"
                      style={{ width: `${plan.progress}%` }}
                    ></div>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#a3e635]">{plan.progress}%</span>
              </div>
            ))
          ) : (
            <div className="bg-bg-tertiary/20 rounded-2xl p-6 border border-dashed border-border-primary text-center">
              <Brain className="w-8 h-8 text-text-tertiary mx-auto mb-2 opacity-20" />
              <p className="text-xs text-text-tertiary">{t('right_panel.no_roadmap_today')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - Expanded */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-text-primary mb-4">{t('right_panel.quick_actions')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3">
          <button onClick={() => navigate('/smart-planner')} className="bg-bg-secondary border border-border-primary hover:border-orange-500 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors group">
            <Brain className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-text-secondary uppercase">{t('sidebar.ai_planner')}</span>
          </button>
          <button onClick={() => navigate('/exercises')} className="bg-bg-secondary border border-border-primary hover:border-[#a3e635] rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors group">
            <Dumbbell className="w-5 h-5 text-[#a3e635] group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-text-secondary uppercase">{t('sidebar.exercises')}</span>
          </button>
          <button onClick={() => navigate('/diet-plan')} className="bg-bg-secondary border border-border-primary hover:border-[#ff5e00] rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors group">
            <Utensils className="w-5 h-5 text-[#ff5e00] group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-text-secondary uppercase">{t('sidebar.diet')}</span>
          </button>
          <button onClick={() => navigate('/progress')} className="bg-bg-secondary border border-border-primary hover:border-purple-400 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors group">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-tight">{t('sidebar.progress')}</span>
          </button>
          <button onClick={() => navigate('/goals')} className="bg-bg-secondary border border-border-primary hover:border-blue-400 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors group">
            <Target className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-text-secondary uppercase">{t('sidebar.goals')}</span>
          </button>
          <button onClick={() => navigate('/achievements')} className="bg-bg-secondary border border-border-primary hover:border-yellow-500 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors group">
            <Trophy className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-text-secondary uppercase">{t('sidebar.achievements')}</span>
          </button>
          <button onClick={() => navigate('/workout-builder')} className="bg-bg-secondary border border-border-primary hover:border-cyan-400 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors group">
            <Blocks className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-text-secondary uppercase">{t('sidebar.creator')}</span>
          </button>
          <button onClick={() => navigate('/workout-timer')} className="bg-bg-secondary border border-border-primary hover:border-red-400 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors group">
            <Timer className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-text-secondary uppercase">{t('sidebar.timer')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
