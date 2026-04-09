import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, CheckCircle2, Circle, Clock, Trash2, 
  Plus, Search, Loader2, Target, Flame,
  CheckCircle, Play, Info, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { estimateExerciseKcalRealistic } from './utils/kcal';

interface SessionExercise {
  id: string;
  exercise_id: string;
  name: string;
  gif_url: string;
  sets: number;
  reps: string;
  weight_kg: number;
  rest_seconds: number;
  order_index: number;
  is_completed: boolean;
  exercises?: {
    name?: string;
    gif_url?: string;
    target_muscle?: string;
    body_part?: string;
  } | null;
}

interface ExerciseLibraryItem {
  id: string;
  name: string;
  body_part: string;
  target_muscle: string;
  gif_url: string;
}

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

const getVietnamDayIndex = (date = new Date()): number => {
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIMEZONE,
    weekday: 'short'
  }).format(date);
  const mapping: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6
  };
  return mapping[dayName] ?? 0;
};

const getWeekStartKey = (baseDate: Date): string => {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const normalizeGifUrl = (value: unknown): string => {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return `https://${url.slice(7)}`;
  return url;
};

const isWeekStartColumnError = (error: any): boolean => {
  const msg = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return msg.includes('week_start_date') || details.includes('week_start_date');
};

const pickLatestPlan = (plans: any[] | null | undefined) => {
  if (!plans || plans.length === 0) return null;
  return [...plans].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
    if (bTime !== aTime) return bTime - aTime;
    return String(b.id || '').localeCompare(String(a.id || ''));
  })[0];
};

export default function Exercises() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSavingExercise, setIsSavingExercise] = useState(false);
  const [search, setSearch] = useState('');
  const [library, setLibrary] = useState<ExerciseLibraryItem[]>([]);
  const [vnToday, setVnToday] = useState(() => getVietnamDateKey());
  const [userWeightKg, setUserWeightKg] = useState(70);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseLibraryItem | null>(null);
  const [draftSets, setDraftSets] = useState(3);
  const [draftReps, setDraftReps] = useState('12');
  const [draftKgInput, setDraftKgInput] = useState('20');
  const [draftKcal, setDraftKcal] = useState(50);

  const currentDayIdx = getVietnamDayIndex();

  useEffect(() => {
    const id = window.setInterval(() => {
      const nextVnToday = getVietnamDateKey();
      setVnToday(prev => (prev === nextVnToday ? prev : nextVnToday));
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (user) loadSession();
  }, [user, vnToday]);

  useEffect(() => {
    const loadWeight = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('body_metrics')
        .select('weight')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setUserWeightKg(Math.max(45, Number(data?.weight || 70)));
    };
    loadWeight();
  }, [user]);

  useEffect(() => {
    if (!selectedExercise) return;
    const kcal = estimateExerciseKcalRealistic({
      exercise: selectedExercise,
      sets: draftSets,
      repsText: draftReps,
      externalLoadKg: Number(draftKgInput) || 0,
      userWeightKg
    });
    setDraftKcal(kcal);
  }, [selectedExercise, draftSets, draftReps, draftKgInput, userWeightKg]);

  const loadSession = async () => {
    setIsLoading(true);
    try {
      // 1. Check if session already exists for today
      const { data: existingSession } = await supabase
        .from('daily_exercise_sessions')
        .select(`
          *,
          exercises:exercise_id (name, gif_url, target_muscle, body_part)
        `)
        .eq('user_id', user?.id)
        .eq('log_date', vnToday)
        .order('order_index');

      if (existingSession && existingSession.length > 0) {
        setSession(existingSession.map(s => ({
          ...s,
          name: (s.exercises as any)?.name || 'Exercise',
          gif_url: normalizeGifUrl((s.exercises as any)?.gif_url)
        })));
      } else {
        // 2. No session today. Try to clone from weekly plan
        await clonePlanToToday();
      }

      // 3. Load library for "Add" feature
      const { data: libData } = await supabase.from('exercises').select('*').limit(100);
      if (libData) {
        setLibrary(
          libData.map((item: any) => ({
            ...item,
            gif_url: normalizeGifUrl(item?.gif_url ?? item?.gifUrl ?? item?.image_url ?? item?.imageUrl ?? item?.gif)
          }))
        );
      }

    } catch (e) {
      console.error('Error loading session:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const clonePlanToToday = async () => {
    const weekStartKey = getWeekStartKey(new Date(`${vnToday}T00:00:00`));
    let plan: any = null;
    const byWeek = await supabase
      .from('weekly_plans')
      .select('id')
      .eq('user_id', user?.id)
      .eq('week_start_date', weekStartKey)
      .maybeSingle();

    if (byWeek.error && isWeekStartColumnError(byWeek.error)) {
      const fallback = await supabase
        .from('weekly_plans')
        .select('id')
        .eq('user_id', user?.id)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      plan = fallback.data;
    } else {
      plan = byWeek.data;
    }

    if (plan) {
      const { data: planExercises } = await supabase
        .from('weekly_plan_exercises')
        .select('*')
        .eq('weekly_plan_id', plan.id)
        .eq('day_of_week', currentDayIdx);

      if (planExercises && planExercises.length > 0 && !planExercises[0].is_rest_day) {
        const sessionItems = planExercises.map((p, idx) => ({
          user_id: user?.id,
          log_date: vnToday,
          exercise_id: p.exercise_id,
          sets: p.sets,
          reps: p.reps,
          weight_kg: p.weight_kg,
          rest_seconds: p.rest_seconds,
          order_index: idx,
          is_completed: false
        }));

        const { data: inserted, error } = await supabase
          .from('daily_exercise_sessions')
          .insert(sessionItems)
          .select(`
            *,
            exercises:exercise_id (name, gif_url, target_muscle, body_part)
          `);

        if (inserted) {
          setSession(inserted.map(s => ({
            ...s,
            name: (s.exercises as any)?.name || 'Exercise',
            gif_url: normalizeGifUrl((s.exercises as any)?.gif_url)
          })));
        }
      }
    }
  };

  const toggleComplete = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setSession(prev => prev.map(s => s.id === id ? { ...s, is_completed: newStatus } : s));
    
    await supabase
      .from('daily_exercise_sessions')
      .update({ is_completed: newStatus })
      .eq('id', id);
  };

  const deleteExercise = async (id: string) => {
    if (!confirm(t('common.confirm_delete', 'Are you sure?'))) return;
    const removedItem = session.find(s => s.id === id);
    setSession(prev => prev.filter(s => s.id !== id));

    await supabase.from('daily_exercise_sessions').delete().eq('id', id);

    // Keep Workout Creator in sync: remove one matching exercise
    // from weekly_plan_exercises of current VN week/day.
    if (removedItem?.exercise_id && user?.id) {
      const weekStartKey = getWeekStartKey(new Date(`${vnToday}T00:00:00`));
      let weeklyPlanId: string | null = null;

      const byWeek = await supabase
        .from('weekly_plans')
        .select('id, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartKey)
        .limit(20);

      if (byWeek.error && isWeekStartColumnError(byWeek.error)) {
        const fallback = await supabase
          .from('weekly_plans')
          .select('id, created_at, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        weeklyPlanId = fallback.data?.id || null;
      } else if (byWeek.error) {
        weeklyPlanId = null;
      } else {
        weeklyPlanId = pickLatestPlan(byWeek.data)?.id || null;
      }

      if (weeklyPlanId) {
        const toDelete = await supabase
          .from('weekly_plan_exercises')
          .select('id')
          .eq('weekly_plan_id', weeklyPlanId)
          .eq('day_of_week', currentDayIdx)
          .eq('exercise_id', removedItem.exercise_id)
          .order('order_index', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (toDelete.data?.id) {
          await supabase.from('weekly_plan_exercises').delete().eq('id', toDelete.data.id);
        }
      }
    }
  };

  const addExerciseToToday = async (ex: ExerciseLibraryItem) => {
    setSelectedExercise(ex);
    setDraftSets(3);
    setDraftReps('12');
    setDraftKgInput('20');
    setDraftKcal(50);
  };

  const saveExerciseFromPopup = async () => {
    if (!user || !selectedExercise) return;
    setIsSavingExercise(true);
    try {
      const cleanSets = Math.max(1, Number(draftSets) || 1);
      const cleanReps = String(draftReps || '12').trim() || '12';
      const cleanKg = Math.max(0, Number(draftKgInput) || 0);
      const cleanKcal = estimateExerciseKcalRealistic({
        exercise: selectedExercise,
        sets: cleanSets,
        repsText: cleanReps,
        externalLoadKg: cleanKg,
        userWeightKg,
        restSeconds: 60
      });

      // Save today's exercise session
      const { data, error } = await supabase
        .from('daily_exercise_sessions')
        .insert({
          user_id: user.id,
          log_date: vnToday,
          exercise_id: selectedExercise.id,
          sets: cleanSets,
          reps: cleanReps,
          weight_kg: cleanKg,
          rest_seconds: 60,
          order_index: session.length,
          is_completed: false
        })
        .select(`
          *,
        exercises:exercise_id (name, gif_url, target_muscle, body_part)
        `)
        .single();
      if (error) throw error;

      // Keep kcal from popup in daily progress summary
      const progress = await supabase
        .from('daily_progress_logs')
        .select('calories_burned')
        .eq('user_id', user.id)
        .eq('log_date', vnToday)
        .maybeSingle();
      if (progress.error) throw progress.error;
      const nextBurned = (progress.data?.calories_burned || 0) + cleanKcal;
      const upsertProgress = await supabase
        .from('daily_progress_logs')
        .upsert(
          { user_id: user.id, log_date: vnToday, calories_burned: nextBurned },
          { onConflict: 'user_id,log_date' }
        );
      if (upsertProgress.error) throw upsertProgress.error;

      // Sync to Workout Creator (weekly plan of current week/day)
      const weekStartKey = getWeekStartKey(new Date(`${vnToday}T00:00:00`));
      let weeklyPlanId: string | null = null;
      const byWeek = await supabase
        .from('weekly_plans')
        .select('id, created_at, updated_at')
        .eq('user_id', user.id)
        .eq('week_start_date', weekStartKey)
        .limit(20);

      if (byWeek.error && isWeekStartColumnError(byWeek.error)) {
        const fallbackPlan = await supabase
          .from('weekly_plans')
          .select('id, created_at, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (fallbackPlan.error) throw fallbackPlan.error;
        weeklyPlanId = fallbackPlan.data?.id || null;
      } else if (byWeek.error) {
        throw byWeek.error;
      } else {
        weeklyPlanId = pickLatestPlan(byWeek.data)?.id || null;
      }

      if (!weeklyPlanId) {
        const create = await supabase
          .from('weekly_plans')
          .insert({
            user_id: user.id,
            name: 'Workout Creator',
            week_start_date: weekStartKey
          })
          .select('id')
          .single();
        if (create.error && isWeekStartColumnError(create.error)) {
          const createFallback = await supabase
            .from('weekly_plans')
            .insert({
              user_id: user.id,
              name: 'Workout Creator'
            })
            .select('id')
            .single();
          if (createFallback.error) throw createFallback.error;
          weeklyPlanId = createFallback.data.id;
        } else if (create.error) {
          throw create.error;
        } else {
          weeklyPlanId = create.data.id;
        }
      }

      const orderRes = await supabase
        .from('weekly_plan_exercises')
        .select('order_index')
        .eq('weekly_plan_id', weeklyPlanId)
        .eq('day_of_week', currentDayIdx)
        .order('order_index', { ascending: false })
        .limit(1);
      if (orderRes.error) throw orderRes.error;
      const nextOrder = (orderRes.data?.[0]?.order_index ?? -1) + 1;

      const addToCreator = await supabase
        .from('weekly_plan_exercises')
        .insert({
          weekly_plan_id: weeklyPlanId,
          day_of_week: currentDayIdx,
          exercise_id: selectedExercise.id,
          sets: cleanSets,
          reps: cleanReps,
          weight_kg: cleanKg,
          rest_seconds: 60,
          order_index: nextOrder,
          is_rest_day: false
        });
      if (addToCreator.error) throw addToCreator.error;

      if (data) {
        setSession(prev => [...prev, {
          ...data,
          name: (data.exercises as any)?.name || 'Exercise',
          gif_url: normalizeGifUrl((data.exercises as any)?.gif_url)
        }]);
      }
      setIsAdding(false);
      setSelectedExercise(null);
      alert(t('sidebar.exercise_added_today'));
    } catch (e: any) {
      alert((t('common.error', 'Lỗi') + ': ') + (e?.message || 'Save exercise failed'));
    } finally {
      setIsSavingExercise(false);
    }
  };

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#a3e635]" /></div>;

  return (
    <div className="h-[calc(100vh-72px-2rem)] md:h-[calc(100vh-80px-3rem)] min-h-0 max-w-5xl mx-auto w-full flex flex-col gap-4 md:gap-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-text-primary uppercase flex items-center gap-2">
            <Dumbbell className="w-8 h-8 text-[#a3e635]" />
            {t('sidebar.exercises_tracker', 'Exercises Tracker')}
          </h1>
          <p className="text-sm text-text-tertiary mt-1 font-medium">
            {new Intl.DateTimeFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
              timeZone: VIETNAM_TIMEZONE,
              weekday: 'long',
              day: 'numeric',
              month: 'long'
            }).format(new Date())}
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto px-6 py-2.5 rounded-xl text-sm font-black bg-[#a3e635] text-black hover:bg-[#bef264] transition-all"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            {t('common.add_new', 'Thêm mới')}
          </span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <motion.div
          key="today"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 h-full overflow-y-auto custom-scrollbar pr-1"
        >
            {session.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {session.map((ex) => {
                  const displayKcal = estimateExerciseKcalRealistic({
                    exercise: {
                      target_muscle: (ex as any).exercises?.target_muscle || '',
                      body_part: (ex as any).exercises?.body_part || ''
                    },
                    sets: ex.sets,
                    repsText: ex.reps,
                    externalLoadKg: Number(ex.weight_kg || 0),
                    userWeightKg,
                    restSeconds: ex.rest_seconds
                  });
                  return (
                    <div key={ex.id} className="bg-bg-secondary border border-border-primary rounded-2xl p-2.5 sm:p-4 group hover:border-border-secondary transition-colors">
                      <div className="sm:hidden">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleComplete(ex.id, ex.is_completed)}
                            className={`text-text-tertiary hover:text-text-primary transition-colors ${ex.is_completed ? 'text-[#a3e635]' : ''}`}
                          >
                            {ex.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                          </button>
                          <h3 className={`text-sm font-bold uppercase truncate flex-1 ${ex.is_completed ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>{ex.name}</h3>
                          <button
                            onClick={() => deleteExercise(ex.id)}
                            className="p-1.5 text-text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>

                        <div className="mt-2 flex items-start gap-2.5">
                          <div className="w-12 h-12 rounded-xl bg-bg-tertiary overflow-hidden border border-border-primary shrink-0 flex items-center justify-center">
                            <Dumbbell className="w-5 h-5 text-text-tertiary" />
                          </div>
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{t('workout_builder.sets')}</span>
                              <div className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm text-text-primary font-bold">{ex.sets}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{t('workout_builder.reps')}</span>
                              <div className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm text-text-primary font-bold">{ex.reps}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">KG</span>
                              <div className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm text-text-primary font-bold">{ex.weight_kg}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">REST (S)</span>
                              <div className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm text-text-primary font-bold">{ex.rest_seconds}</div>
                            </div>
                            <div className="flex flex-col gap-1 col-span-2">
                              <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">KCAL</span>
                              <div className="h-[34px] rounded-lg bg-[#a3e635]/10 border border-[#a3e635]/30 text-[#a3e635] flex items-center justify-center">
                                <span className="text-xs font-black tabular-nums">{displayKcal}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="hidden sm:flex sm:items-center gap-4">
                        <button
                          onClick={() => toggleComplete(ex.id, ex.is_completed)}
                          className={`text-text-tertiary hover:text-text-primary transition-colors ${ex.is_completed ? 'text-[#a3e635]' : ''}`}
                        >
                          {ex.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                        <div className="w-16 h-16 rounded-xl bg-bg-tertiary overflow-hidden border border-border-primary shrink-0 flex items-center justify-center">
                          <Dumbbell className="w-6 h-6 text-text-tertiary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-bold uppercase truncate ${ex.is_completed ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>{ex.name}</h3>
                          <div className="flex flex-wrap gap-4 mt-2.5">
                            <div className="flex flex-col gap-1"><span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{t('workout_builder.sets')}</span><div className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-16 text-text-primary font-bold">{ex.sets}</div></div>
                            <div className="flex flex-col gap-1"><span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{t('workout_builder.reps')}</span><div className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-16 text-text-primary font-bold">{ex.reps}</div></div>
                            <div className="flex flex-col gap-1"><span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">KG</span><div className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-16 text-text-primary font-bold">{ex.weight_kg}</div></div>
                            <div className="flex flex-col gap-1"><span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">REST (S)</span><div className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-16 text-text-primary font-bold">{ex.rest_seconds}</div></div>
                            <div className="flex flex-col gap-1 ml-auto"><span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">KCAL</span><div className="h-[34px] min-w-[76px] px-2 rounded-lg bg-[#a3e635]/10 border border-[#a3e635]/30 text-[#a3e635] flex items-center justify-center"><span className="text-xs font-black tabular-nums">{displayKcal}</span></div></div>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteExercise(ex.id)}
                          className="p-2 text-text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Session Summary Card */}
                <div className="mt-8 bg-bg-secondary border border-border-primary rounded-3xl p-6 relative overflow-hidden group hover:border-[#a3e635] transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#a3e635]/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-[#a3e635]/10 transition-all"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <h4 className="text-sm font-bold text-text-tertiary uppercase tracking-widest mb-1">{t('dashboard.weekly_summary')}</h4>
                      <p className="text-2xl font-black text-text-primary">
                        {session.filter(s => s.is_completed).length} / {session.length}
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">{t('dashboard.exercise', 'Bài tập')} {t('sidebar.connected', 'đã xong')}</p>
                    </div>
                    <div className="relative w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--bg-tertiary)" strokeWidth="3.5" />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#a3e635"
                          strokeWidth="3.5"
                          strokeDashoffset="0"
                          strokeDasharray={`${(session.filter(s => s.is_completed).length / session.length) * 100}, 100`}
                          className="transition-all duration-[1000ms] ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-[#a3e635]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-bg-tertiary/20 border-2 border-dashed border-border-primary rounded-[40px] p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-20 h-20 bg-bg-secondary rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-border-primary group hover:border-[#a3e635] transition-all">
                  <AlertCircle className="w-10 h-10 text-text-tertiary group-hover:text-[#a3e635] transition-all" />
                </div>
                <h3 className="text-2xl font-black text-text-primary mb-2 uppercase tracking-tight">{t('sidebar.no_schedule_today')}</h3>
                <p className="text-text-tertiary max-w-sm mb-8 leading-relaxed">
                  {t('workout_builder.empty_day')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="px-8 py-3 bg-[#a3e635] text-black rounded-2xl font-black uppercase text-sm hover:scale-105 transition-all shadow-lg shadow-[#a3e635]/20"
                  >
                    {t('common.add_new')}
                  </button>
                  <button 
                    onClick={() => navigate('/workout-builder')}
                    className="px-8 py-3 bg-bg-secondary border border-border-primary text-text-primary rounded-2xl font-black uppercase text-sm hover:bg-bg-quaternary transition-all"
                  >
                    {t('workout_builder.title')}
                  </button>
                </div>
              </div>
            )}
        </motion.div>
      </div>

      <AnimatePresence>
        {isAdding ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 md:p-8"
            onClick={() => setIsAdding(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="bg-bg-secondary border border-border-primary rounded-[28px] p-4 md:p-6 h-full max-w-5xl mx-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
                <h3 className="text-base md:text-lg font-black uppercase tracking-wide text-text-primary">
                  {t('common.add_new', 'Thêm mới')}
                </h3>
                <button
                  onClick={() => setIsAdding(false)}
                  className="w-9 h-9 rounded-xl bg-bg-tertiary border border-border-primary text-text-secondary hover:text-text-primary text-xl leading-none"
                  aria-label="Close add exercise popup"
                >
                  ×
                </button>
              </div>

              <div className="relative mb-4 md:mb-6 shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                <input
                  type="text"
                  placeholder={t('sidebar.search_exercises')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-primary rounded-2xl py-4 pl-12 pr-6 text-sm focus:border-[#a3e635] outline-none transition-all font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                {library.filter(ex => ex.name.toLowerCase().includes(search.toLowerCase())).map((ex) => (
                  <div
                    key={ex.id}
                    className={`bg-bg-tertiary border rounded-2xl p-4 flex items-center gap-4 group transition-all cursor-pointer ${
                      selectedExercise?.id === ex.id
                        ? 'border-[#a3e635] ring-1 ring-[#a3e635]/40'
                        : 'border-border-primary hover:border-[#a3e635]'
                    }`}
                    onClick={() => addExerciseToToday(ex)}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-bg-secondary shrink-0">
                      <img src={ex.gif_url} alt={ex.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-text-primary uppercase truncate group-hover:text-[#a3e635] transition-colors">{ex.name}</h4>
                      <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest mt-1">{ex.target_muscle}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center text-text-tertiary group-hover:bg-[#a3e635] group-hover:text-black transition-all">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-border-primary pt-4 shrink-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Sets</span>
                    <input
                      type="number"
                      min={1}
                      value={draftSets}
                      onChange={(e) => setDraftSets(parseInt(e.target.value || '1', 10))}
                      className="bg-bg-tertiary border border-border-primary rounded-xl px-3 py-2 text-sm text-text-primary focus:border-[#a3e635] outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Reps</span>
                    <input
                      type="text"
                      value={draftReps}
                      onChange={(e) => setDraftReps(e.target.value)}
                      className="bg-bg-tertiary border border-border-primary rounded-xl px-3 py-2 text-sm text-text-primary focus:border-[#a3e635] outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">KG</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={draftKgInput}
                      onChange={(e) => {
                        const raw = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
                        const [intPartRaw = '', ...decimalParts] = raw.split('.');
                        const intPart = intPartRaw.replace(/^0+(?=\d)/, '');
                        const decimalPart = decimalParts.join('');
                        const normalized = decimalParts.length > 0
                          ? `${intPart || '0'}.${decimalPart}`
                          : intPart;
                        setDraftKgInput(normalized);
                      }}
                      className="bg-bg-tertiary border border-border-primary rounded-xl px-3 py-2 text-sm text-text-primary focus:border-[#a3e635] outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">KCAL</span>
                    <input
                      type="number"
                      value={draftKcal}
                      readOnly
                      className="bg-bg-tertiary border border-border-primary rounded-xl px-3 py-2 text-sm text-[#a3e635] font-bold focus:border-[#a3e635] outline-none"
                    />
                  </label>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-text-tertiary truncate">
                    {selectedExercise ? `Selected: ${selectedExercise.name}` : 'Select an exercise to continue'}
                  </p>
                  <button
                    onClick={saveExerciseFromPopup}
                    disabled={!selectedExercise || isSavingExercise}
                    className="h-10 px-5 rounded-xl bg-[#a3e635] text-black font-black text-xs md:text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#bef264] transition-all"
                  >
                    {isSavingExercise ? 'Saving...' : 'Save exercise'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
