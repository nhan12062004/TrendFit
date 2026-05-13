import { useEffect, useMemo, useState } from 'react';
import { Play, Pause, RotateCcw, SkipForward, CheckCircle2, Minus, Plus, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';

interface SessionItem {
  id: string;
  exercise_id: string;
  sets: number;
  reps: string;
  weight_kg: number;
  rest_seconds: number;
  order_index: number;
  is_completed: boolean;
  exercises?: {
    name?: string;
    gif_url?: string;
  } | null;
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

const formatSeconds = (seconds: number): string => {
  const safe = Math.max(0, seconds);
  const mm = Math.floor(safe / 60).toString().padStart(2, '0');
  const ss = (safe % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

export default function WorkoutTimer() {
  const { user } = useAuth();
const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<SessionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [vnToday, setVnToday] = useState(() => getVietnamDateKey());

  const current = items[currentIndex];
  const nextItems = items.slice(currentIndex + 1, currentIndex + 4);

  useEffect(() => {
    const id = window.setInterval(() => {
      const nextDay = getVietnamDateKey();
      setVnToday(prev => (prev === nextDay ? prev : nextDay));
    }, 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabase
        .from('daily_exercise_sessions')
        .select(`
          *,
          exercises:exercise_id (name, gif_url)
        `)
        .eq('user_id', user.id)
        .eq('log_date', vnToday)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Failed to load timer sessions:', error);
      } else {
        const sessionData = (data as SessionItem[]) || [];
        setItems(sessionData);
        const firstIncomplete = sessionData.findIndex(i => !i.is_completed);
        const startIndex = firstIncomplete >= 0 ? firstIncomplete : 0;
        setCurrentIndex(startIndex);
        setSecondsLeft(sessionData[startIndex]?.rest_seconds || 60);
      }
      setIsLoading(false);
    };
    load();
  }, [user, vnToday]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(async () => {
      const { data, error } = await supabase
        .from('daily_exercise_sessions')
        .select(`
          *,
          exercises:exercise_id (name, gif_url)
        `)
        .eq('user_id', user.id)
        .eq('log_date', vnToday)
        .order('order_index', { ascending: true });
      if (!error && data) {
        setItems(data as SessionItem[]);
      }
    }, 10000);
    return () => window.clearInterval(id);
  }, [user, vnToday]);

  useEffect(() => {
    setIsRunning(false);
    setSecondsLeft(current?.rest_seconds || 60);
  }, [current?.id, current?.rest_seconds]);

  useEffect(() => {
    if (!isRunning) return;
    const resetValue = Math.max(1, current?.rest_seconds || 60);
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          return resetValue;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, current?.rest_seconds]);

  const completedCount = useMemo(() => items.filter(i => i.is_completed).length, [items]);

  const markCurrentDone = async () => {
    if (!current) return;
    const { error } = await supabase
      .from('daily_exercise_sessions')
      .update({ is_completed: true })
      .eq('id', current.id);
    if (error) {
      console.error('Failed to complete exercise:', error);
      return;
    }
    setItems(prev => prev.map(i => (i.id === current.id ? { ...i, is_completed: true } : i)));
    setIsRunning(false);
    if (currentIndex < items.length - 1) setCurrentIndex(currentIndex + 1);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#a3e635]" />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-text-tertiary">
          <p className="font-bold uppercase">{"Hôm nay không có lịch tập nào."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-72px-2rem)] md:h-[calc(100vh-80px-3rem)] min-h-0 max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 overflow-hidden">
      <section className="bg-bg-secondary border border-border-primary rounded-3xl p-5 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">{"Đồng hồ bấm giờ"}</h1>
          <span className="text-xs text-text-tertiary font-bold uppercase">{completedCount}/{items.length} {"hoàn thành"}</span>
        </div>

        <div className="flex-1 min-h-0 flex flex-col items-center justify-center">
          <div className="w-56 h-56 rounded-full border-8 border-[#a3e635]/20 flex items-center justify-center mb-6">
            <span className="text-5xl font-black text-[#a3e635] tabular-nums">{formatSeconds(secondsLeft)}</span>
          </div>

          <h2 className="text-lg md:text-xl font-black uppercase text-center">{current.exercises?.name || "Bài tập"}</h2>
          <p className="text-sm text-text-tertiary mt-2">
            {current.sets} {"Hiệp"} • {current.reps} {"Lần"} • {current.weight_kg} {"KG"} • {current.rest_seconds}s {"Nghỉ (s)"}
          </p>

          <div className="mt-6 flex items-center gap-2">
            <button
              onClick={() => setSecondsLeft(prev => Math.max(0, prev - 10))}
              className="w-10 h-10 rounded-xl bg-bg-tertiary border border-border-primary text-text-secondary hover:text-text-primary flex items-center justify-center"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsRunning(r => !r)}
              className="px-5 h-10 rounded-xl bg-[#a3e635] text-black font-black text-sm flex items-center gap-2"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? "Tạm dừng" : "Bắt đầu"}
            </button>
            <button
              onClick={() => setSecondsLeft(prev => prev + 15)}
              className="w-10 h-10 rounded-xl bg-bg-tertiary border border-border-primary text-text-secondary hover:text-text-primary flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setSecondsLeft(current.rest_seconds || 60)}
              className="px-4 h-9 rounded-xl bg-bg-tertiary border border-border-primary text-text-secondary text-xs font-bold uppercase flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              {"Đặt lại"}
            </button>
            <button
              onClick={() => setCurrentIndex(i => Math.min(items.length - 1, i + 1))}
              className="px-4 h-9 rounded-xl bg-bg-tertiary border border-border-primary text-text-secondary text-xs font-bold uppercase flex items-center gap-2"
            >
              <SkipForward className="w-4 h-4" />
              {"Bỏ qua"}
            </button>
            <button
              onClick={markCurrentDone}
              className="px-4 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {"Xong"}
            </button>
          </div>
        </div>
      </section>

      <aside className="bg-bg-secondary border border-border-primary rounded-3xl p-4 overflow-y-auto custom-scrollbar min-h-0">
        <h3 className="text-xs font-black uppercase text-text-tertiary tracking-widest mb-3">{"Tiếp theo"}</h3>
        <div className="space-y-3">
          {nextItems.length > 0 ? nextItems.map(item => (
            <div key={item.id} className="bg-bg-tertiary border border-border-primary rounded-2xl p-3">
              <p className="text-sm font-bold uppercase text-text-primary">{item.exercises?.name || "Bài tập"}</p>
              <p className="text-[11px] text-text-tertiary mt-1">{item.sets} x {item.reps} • {item.weight_kg} kg</p>
            </div>
          )) : (
            <p className="text-sm text-text-tertiary">{"Không còn bài tập nào"}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
