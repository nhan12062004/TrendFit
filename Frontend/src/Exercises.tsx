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
}

interface ExerciseLibraryItem {
  id: string;
  name: string;
  body_part: string;
  target_muscle: string;
  gif_url: string;
}

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

export default function Exercises() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [library, setLibrary] = useState<ExerciseLibraryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'library'>('today');

  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = (new Date().getDay() + 6) % 7; // Map Sun=0 to Mon=0 logic (approx, adjusting to my 0=Mon logic)
  // Actually, new Date().getDay() returns 0 for Sunday.
  // My DAYS array: 0=Mon, 1=Tue... 6=Sun.
  const currentDayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  useEffect(() => {
    if (user) loadSession();
  }, [user]);

  const loadSession = async () => {
    setIsLoading(true);
    try {
      // 1. Check if session already exists for today
      const { data: existingSession } = await supabase
        .from('daily_exercise_sessions')
        .select(`
          *,
          exercises:exercise_id (name, gif_url)
        `)
        .eq('user_id', user?.id)
        .eq('log_date', today)
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
    const weekStartKey = getWeekStartKey(new Date(today));
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
          log_date: today,
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
            exercises:exercise_id (name, gif_url)
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
    setSession(prev => prev.filter(s => s.id !== id));
    await supabase.from('daily_exercise_sessions').delete().eq('id', id);
  };

  const addExerciseToToday = async (ex: ExerciseLibraryItem) => {
    const newItem = {
      user_id: user?.id,
      log_date: today,
      exercise_id: ex.id,
      sets: 3,
      reps: '12',
      weight_kg: 0,
      rest_seconds: 60,
      order_index: session.length,
      is_completed: false
    };

    const { data, error } = await supabase
      .from('daily_exercise_sessions')
      .insert(newItem)
      .select(`
        *,
        exercises:exercise_id (name, gif_url)
      `)
      .single();

    if (data) {
      setSession(prev => [...prev, {
        ...data,
        name: (data.exercises as any)?.name || 'Exercise',
        gif_url: normalizeGifUrl((data.exercises as any)?.gif_url)
      }]);
      setActiveTab('today');
      alert(t('sidebar.exercise_added_today'));
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
            {t('sidebar.today_routine')}
          </h1>
          <p className="text-sm text-text-tertiary mt-1 font-medium">{new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>

        <div className="flex items-center gap-2 bg-bg-secondary p-1 rounded-2xl border border-border-primary">
          <button 
            onClick={() => setActiveTab('today')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'today' ? 'bg-[#a3e635] text-black' : 'text-text-tertiary hover:text-text-primary'}`}
          >
            {t('common.today', 'Hôm nay')}
          </button>
          <button 
            onClick={() => setActiveTab('library')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'library' ? 'bg-[#a3e635] text-black' : 'text-text-tertiary hover:text-text-primary'}`}
          >
            {t('common.add_new', 'Thêm mới')}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
      <AnimatePresence mode="wait">
        {activeTab === 'today' ? (
          <motion.div 
            key="today"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 h-full overflow-y-auto custom-scrollbar pr-1"
          >
            {session.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {session.map((ex) => (
                  <div 
                    key={ex.id}
                    className={`bg-bg-secondary border rounded-3xl p-4 md:p-6 transition-all duration-500 ease-out group hover:border-[#a3e635]/50 ${
                      ex.is_completed ? 'border-[#a3e635]/20 bg-[#a3e635]/5' : 'border-border-primary'
                    }`}
                  >
                    <div className="flex items-center gap-4 md:gap-6">
                      <button 
                        onClick={() => toggleComplete(ex.id, ex.is_completed)}
                        className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center transition-all duration-300 ${
                          ex.is_completed ? 'text-[#a3e635]' : 'text-text-tertiary'
                        }`}
                      >
                        {ex.is_completed ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
                      </button>

                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-bg-tertiary overflow-hidden shrink-0 border border-border-primary">
                        <img src={ex.gif_url} alt={ex.name} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={`text-base md:text-lg font-black uppercase transition-all ${ex.is_completed ? 'text-text-tertiary line-through' : 'text-text-primary'}`}>
                          {ex.name}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-tertiary font-black uppercase tracking-widest">{t('workout_builder.sets')}</span>
                            <span className="text-sm font-bold text-text-primary">{ex.sets}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-tertiary font-black uppercase tracking-widest">{t('workout_builder.reps')}</span>
                            <span className="text-sm font-bold text-text-primary">{ex.reps}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-text-tertiary font-black uppercase tracking-widest">{t('workout_builder.weight')}</span>
                            <span className="text-sm font-bold text-[#a3e635]">{ex.weight_kg} kg</span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => deleteExercise(ex.id)}
                        className="p-2 text-text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all h-fit"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}

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
                    onClick={() => setActiveTab('library')}
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
        ) : (
          <motion.div 
            key="library"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4 h-full overflow-hidden"
          >
            <div className="bg-bg-secondary border border-border-primary rounded-[32px] p-4 md:p-6 h-full min-h-0 flex flex-col">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2">
                {library.filter(ex => ex.name.toLowerCase().includes(search.toLowerCase())).map((ex) => (
                  <div 
                    key={ex.id}
                    className="bg-bg-tertiary border border-border-primary rounded-2xl p-4 flex items-center gap-4 group hover:border-[#a3e635] transition-all cursor-pointer"
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
