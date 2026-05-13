import React, { useState, useEffect, useMemo } from 'react';
import { Search, GripVertical, Trash2, Moon, Plus, Save, Info, Loader2, Calendar, Brain, ImageOff, ChevronLeft, ChevronRight, Blocks, X, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';
import { estimateExerciseKcalRealistic } from './utils/kcal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// === Types ===
interface Exercise {
  id: string;
  name: string;
  body_part: string;
  target_muscle: string;
  gif_url: string;
  equipment: string;
}

interface PlanExercise {
  tempId: string; // Unique for UI
  exercise_id: string;
  name: string;
  gif_url: string;
  target_muscle?: string;
  sets: number;
  reps: number;
  weight_kg: number;
  rest_seconds: number;
  kcal: number;
  is_rest_day: boolean;
}

interface DraggingPreview {
  type: 'library' | 'plan';
  name: string;
  gif_url: string;
}

const DAYS = [
  { id: 0, label_vi: 'Thứ 2' },
  { id: 1, label_vi: 'Thứ 3' },
  { id: 2, label_vi: 'Thứ 4' },
  { id: 3, label_vi: 'Thứ 5' },
  { id: 4, label_vi: 'Thứ 6' },
  { id: 5, label_vi: 'Thứ 7' },
  { id: 6, label_vi: 'Chủ Nhật' },
];

const MUSCLE_GROUPS = [
  'chest', 'back', 'legs', 'shoulders', 'arms', 'abs', 'cardio'
];
const WORKOUT_CREATOR_LABEL_EN = 'Workout Creator';
const WORKOUT_CREATOR_LABEL_VI = 'Tạo bài tập';
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

const getVietnamTodayDate = (): Date => {
  const key = getVietnamDateKey();
  return new Date(`${key}T00:00:00`);
};

const getWeekStart = (baseDate: Date): Date => {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday-based week
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getTodayDayIndex = (): number => {
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: VIETNAM_TIMEZONE,
    weekday: 'short'
  }).format(new Date());
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

const pickLatestPlan = (plans: any[] | null | undefined) => {
  if (!plans || plans.length === 0) return null;
  return [...plans].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
    if (bTime !== aTime) return bTime - aTime;
    return String(b.id || '').localeCompare(String(a.id || ''));
  })[0];
};

const isWeekStartColumnError = (error: any): boolean => {
  const msg = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return msg.includes('week_start_date') || details.includes('week_start_date');
};

const isKcalColumnError = (error: any): boolean => {
  const msg = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  return msg.includes('kcal') || details.includes('kcal');
};

const resolveGifUrl = (row: any): string => {
  const raw =
    row?.gif_url ??
    row?.gifUrl ??
    row?.image_url ??
    row?.imageUrl ??
    row?.gif ??
    '';

  const url = String(raw || '').trim();
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return `https://${url.slice(7)}`;
  return url;
};

const normalizeExerciseRow = (row: any): Exercise => ({
  id: String(row?.id ?? ''),
  name: String(row?.name ?? ''),
  body_part: String(row?.body_part ?? row?.bodyPart ?? ''),
  target_muscle: String(row?.target_muscle ?? row?.targetMuscle ?? ''),
  gif_url: resolveGifUrl(row),
  equipment: String(row?.equipment ?? '')
});

// === Components ===
const ExerciseThumb = ({ src, alt }: { src?: string; alt: string }) => {
  const candidates = useMemo(() => {
    const primary = String(src || '').trim();
    if (!primary) return [];

    const normalized = primary.startsWith('http://') ? `https://${primary.slice(7)}` : primary;
    const urlWithoutProtocol = normalized.replace(/^https?:\/\//, '');
    const proxy = `https://images.weserv.nl/?url=${encodeURIComponent(urlWithoutProtocol)}`;

    return [normalized, proxy];
  }, [src]);

  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [src]);

  const currentSrc = candidates[candidateIndex];
  const hasError = !currentSrc;

  if (hasError) {
    return (
      <div className="w-full h-full bg-bg-quaternary flex items-center justify-center text-text-tertiary">
        <ImageOff className="w-5 h-5" />
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      className="w-full h-full object-cover"
      onError={() => {
        if (candidateIndex < candidates.length - 1) {
          setCandidateIndex(candidateIndex + 1);
        } else {
          setCandidateIndex(candidates.length);
        }
      }}
      referrerPolicy="no-referrer"
    />
  );
};

const LibraryItem = ({
  exercise,
  onAdd
}: {
  exercise: Exercise;
  onAdd: (ex: Exercise) => void;
}) => {
  const dragId = `library-${exercise.id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-bg-tertiary border border-border-primary rounded-xl p-3 flex items-center gap-3 group hover:border-[#a3e635] transition-all cursor-grab active:cursor-grabbing"
      onClick={() => onAdd(exercise)}
    >
      <div className="w-12 h-12 rounded-lg bg-bg-quaternary overflow-hidden shrink-0">
        <ExerciseThumb src={exercise.gif_url} alt={exercise.name} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-text-primary truncate uppercase">{exercise.name}</h4>
        <p className="text-[10px] text-text-tertiary uppercase font-medium">{exercise.target_muscle}</p>
      </div>
      <button className="w-8 h-8 rounded-full bg-bg-quaternary flex items-center justify-center text-text-tertiary group-hover:bg-[#a3e635] group-hover:text-black transition-colors">
        <Plus className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

const SortableRoutineItem = ({
  item,
  onDelete,
  onUpdate
}: {
  item: PlanExercise,
  onDelete: (tempId: string) => void,
  onUpdate: (tempId: string, updates: Partial<PlanExercise>, shouldRecalc?: boolean) => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.tempId });
const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.3 : 1
  };

  return (
    <div ref={setNodeRef} style={style} className="relative mb-3">
      <div className="bg-bg-secondary border border-border-primary rounded-2xl p-3 sm:p-4 group hover:border-border-secondary transition-colors">
        {/* Mobile Layout */}
        <div className="sm:hidden">
          <div className="flex items-center gap-2 mb-3">
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-text-tertiary hover:text-text-primary shrink-0">
              <GripVertical className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-bold text-text-primary uppercase truncate flex-1">{item.name}</h3>
            <button
              onClick={() => onDelete(item.tempId)}
              className="p-1.5 text-text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
            >
              <Trash2 className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-12 h-12 rounded-xl bg-bg-tertiary overflow-hidden border border-border-primary shrink-0">
              <ExerciseThumb src={item.gif_url} alt={item.name} />
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{"Hiệp"}</span>
                <input
                  type="number"
                  value={item.sets === 0 ? '' : item.sets}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onUpdate(item.tempId, { sets: raw === '' ? 0 : parseInt(raw, 10) || 0 }, false);
                  }}
                  onBlur={() => onUpdate(item.tempId, {}, true)}
                  placeholder="0"
                  className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-full focus:border-[#a3e635] outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{"Lần"}</span>
                <input
                  type="number"
                  value={item.reps === 0 ? '' : item.reps}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onUpdate(item.tempId, { reps: raw === '' ? 0 : parseInt(raw, 10) || 0 }, false);
                  }}
                  onBlur={() => onUpdate(item.tempId, {}, true)}
                  placeholder="0"
                  className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-full focus:border-[#a3e635] outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{"KG"}</span>
                <input
                  type="number"
                  value={item.weight_kg === 0 ? '' : item.weight_kg}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onUpdate(item.tempId, { weight_kg: raw === '' ? 0 : parseFloat(raw) || 0 }, false);
                  }}
                  onBlur={() => onUpdate(item.tempId, {}, true)}
                  placeholder="0"
                  className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-full focus:border-[#a3e635] outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{"Nghỉ (s)"}</span>
                <input
                  type="number"
                  value={item.rest_seconds === 0 ? '' : item.rest_seconds}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onUpdate(item.tempId, { rest_seconds: raw === '' ? 0 : parseInt(raw, 10) || 0 }, false);
                  }}
                  onBlur={() => onUpdate(item.tempId, {}, true)}
                  placeholder="0"
                  className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-full focus:border-[#a3e635] outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2 mt-1">
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">KCAL</span>
                <div className="h-9 rounded-lg bg-[#a3e635]/10 border border-[#a3e635]/30 text-[#a3e635] flex items-center justify-center transition-none shadow-sm">
                  <span className="text-xs font-black tabular-nums transition-none">{Math.round(item.kcal || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex sm:items-center gap-4">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-text-tertiary hover:text-text-primary">
            <GripVertical className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-xl bg-bg-tertiary overflow-hidden border border-border-primary shrink-0">
            <ExerciseThumb src={item.gif_url} alt={item.name} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-text-primary uppercase truncate">{item.name}</h3>

            <div className="sm:flex sm:flex-wrap gap-4 mt-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{"Hiệp"}</span>
                <input
                  type="number"
                  value={item.sets === 0 ? '' : item.sets}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onUpdate(item.tempId, { sets: raw === '' ? 0 : parseInt(raw, 10) || 0 }, false);
                  }}
                  onBlur={() => onUpdate(item.tempId, {}, true)}
                  placeholder="0"
                  className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-16 focus:border-[#a3e635] outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{"Lần"}</span>
                <input
                  type="number"
                  value={item.reps === 0 ? '' : item.reps}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onUpdate(item.tempId, { reps: raw === '' ? 0 : parseInt(raw, 10) || 0 }, false);
                  }}
                  onBlur={() => onUpdate(item.tempId, {}, true)}
                  placeholder="0"
                  className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-16 focus:border-[#a3e635] outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{"KG"}</span>
                <input
                  type="number"
                  value={item.weight_kg === 0 ? '' : item.weight_kg}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onUpdate(item.tempId, { weight_kg: raw === '' ? 0 : parseFloat(raw) || 0 }, false);
                  }}
                  onBlur={() => onUpdate(item.tempId, {}, true)}
                  placeholder="0"
                  className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-16 focus:border-[#a3e635] outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{"Nghỉ (s)"}</span>
                <input
                  type="number"
                  value={item.rest_seconds === 0 ? '' : item.rest_seconds}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onUpdate(item.tempId, { rest_seconds: raw === '' ? 0 : parseInt(raw, 10) || 0 }, false);
                  }}
                  onBlur={() => onUpdate(item.tempId, {}, true)}
                  placeholder="0"
                  className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-16 focus:border-[#a3e635] outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex flex-col gap-1 sm:ml-auto">
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">KCAL</span>
                <div className="h-[34px] min-w-[76px] px-2 rounded-lg bg-[#a3e635]/10 border border-[#a3e635]/30 text-[#a3e635] flex items-center justify-center transition-none">
                  <span className="text-xs font-black tabular-nums transition-none">{Math.round(item.kcal || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onDelete(item.tempId)}
            className="p-2 text-text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const DayDropZone = ({
  children,
  isActive
}: {
  children: React.ReactNode;
  isActive: boolean;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'day-dropzone'
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-full rounded-2xl transition-all ${isOver || isActive ? 'ring-2 ring-[#a3e635]/60 bg-[#a3e635]/5' : ''}`}
    >
      {children}
    </div>
  );
};

export default function WorkoutBuilder() {
  const { user } = useAuth();
const workoutCreatorLabel = WORKOUT_CREATOR_LABEL_VI;

  // State
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [filterMuscle, setFilterMuscle] = useState('all');
  const [selectedDayId, setSelectedDayId] = useState(getTodayDayIndex());
  const [weeklyPlan, setWeeklyPlan] = useState<Record<number, PlanExercise[]>>({});
  const [restDays, setRestDays] = useState<Record<number, boolean>>({});
  const [planId, setPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDrag, setActiveDrag] = useState<DraggingPreview | null>(null);
  const [isMobileLibraryOpen, setIsMobileLibraryOpen] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => getWeekStart(getVietnamTodayDate()));
  const [supportsWeekStartDate, setSupportsWeekStartDate] = useState(true);
  const [supportsKcalColumn, setSupportsKcalColumn] = useState(true);
  const [userWeightKg, setUserWeightKg] = useState(70);
  const [isWeightReady, setIsWeightReady] = useState(false);

  const dayRefs = React.useRef<Map<number, HTMLButtonElement>>(new Map());

  const selectedWeekKey = useMemo(() => toDateKey(selectedWeekStart), [selectedWeekStart]);
  const selectedWeekLabel = useMemo(() => {
    const end = new Date(selectedWeekStart);
    end.setDate(selectedWeekStart.getDate() + 6);
    return `${selectedWeekStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
  }, [selectedWeekStart]);
  const isCurrentWeek = useMemo(() => selectedWeekKey === toDateKey(getWeekStart(getVietnamTodayDate())), [selectedWeekKey]);
  const todayKey = useMemo(() => getVietnamDateKey(), [selectedWeekKey]);

  useEffect(() => {
    // Update immediately on language switch for default label names,
    // instead of waiting for async plan re-fetch.
    setPlanName((prev) => {
      const normalized = String(prev || '').trim();
      if (
        !normalized ||
        normalized === WORKOUT_CREATOR_LABEL_EN ||
        normalized === WORKOUT_CREATOR_LABEL_VI ||
        normalized.toLowerCase() === 'workout creator'
      ) {
        return workoutCreatorLabel;
      }
      return prev;
    });
  }, [workoutCreatorLabel]);

  const goPrevWeek = () => {
    setSelectedWeekStart(prev => getWeekStart(addDays(prev, -7)));
  };

  const goNextWeek = () => {
    setSelectedWeekStart(prev => getWeekStart(addDays(prev, 7)));
  };

  useEffect(() => {
    if (isCurrentWeek) {
      setSelectedDayId(getTodayDayIndex());
    }
  }, [isCurrentWeek, selectedWeekKey]);

  React.useEffect(() => {
    const target = dayRefs.current.get(selectedDayId);
    if (!isLoading && target) {
      const timer = setTimeout(() => {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedDayId, selectedWeekKey, isLoading]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load exercise library once
  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const { data: exData } = await supabase.from('exercises').select('*').limit(300);
        const normalizedExercises = (exData || []).map(normalizeExerciseRow).filter(ex => ex.id && ex.name);
        if (normalizedExercises.length > 0) setExercises(normalizedExercises);
      } catch (e) {
        console.error('Error fetching library:', e);
      }
    };
    fetchLibrary();
  }, []);

  useEffect(() => {
    const fetchUserWeight = async () => {
      if (!user) {
        setIsWeightReady(true);
        return;
      }
      const { data } = await supabase
        .from('body_metrics')
        .select('weight')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setUserWeightKg(Math.max(45, Number(data?.weight || 70)));
      setIsWeightReady(true);
    };
    fetchUserWeight();
  }, [user]);

  // Load selected week plan silently (no full-page spinner)
  useEffect(() => {
    const fetchWeekPlan = async () => {
      if (!isWeightReady) return;
      try {
        let nextPlanId: string | null = null;
        let nextPlanName = workoutCreatorLabel;
        let nextWeeklyPlan: Record<number, PlanExercise[]> = {};
        let nextRestDays: Record<number, boolean> = {};

        if (user) {
          let plansData: any[] | null = null;
          let planData: any = null;

          if (supportsWeekStartDate) {
            const { data, error } = await supabase
              .from('weekly_plans')
              .select('*')
              .eq('user_id', user.id)
              .eq('week_start_date', selectedWeekKey)
              .limit(20);
            if (error && isWeekStartColumnError(error)) {
              setSupportsWeekStartDate(false);
              const fallback = await supabase
                .from('weekly_plans')
                .select('*')
                .eq('user_id', user.id)
                .limit(20);
              if (fallback.error) throw fallback.error;
              plansData = fallback.data;
            } else if (error) {
              throw error;
            } else {
              plansData = data;
            }
          } else {
            const { data, error } = await supabase
              .from('weekly_plans')
              .select('*')
              .eq('user_id', user.id)
              .limit(20);
            if (error) throw error;
            plansData = data;
          }

          planData = pickLatestPlan(plansData);

          if (planData) {
            nextPlanId = planData.id;
            const rawPlanName = String(planData.name || '').trim();
            nextPlanName =
              !rawPlanName ||
                rawPlanName === WORKOUT_CREATOR_LABEL_EN ||
                rawPlanName === WORKOUT_CREATOR_LABEL_VI ||
                rawPlanName.toLowerCase() === 'workout creator'
                ? workoutCreatorLabel
                : rawPlanName;

            const { data: items } = await supabase
              .from('weekly_plan_exercises')
              .select(`
                *,
                exercises:exercise_id (name, gif_url, target_muscle, body_part)
              `)
              .eq('weekly_plan_id', planData.id)
              .order('order_index');

            if (items) {
              const grouped: Record<number, PlanExercise[]> = {};
              const rest: Record<number, boolean> = {};

              items.forEach(item => {
                const day = item.day_of_week;
                if (!grouped[day]) grouped[day] = [];

                const joined = (item as any).exercises || {};
                const detail = exercises.find(e => e.id === item.exercise_id);
                const resolvedName = joined?.name || detail?.name || 'Exercise';
                const resolvedGif = resolveGifUrl({ gif_url: joined?.gif_url || detail?.gif_url || '' });
                const resolvedTarget = String(joined?.target_muscle || detail?.target_muscle || '');
                const resolvedBodyPart = String(joined?.body_part || detail?.body_part || '');

                if (item.is_rest_day) {
                  rest[day] = true;
                } else {
                  grouped[day].push({
                    tempId: item.id,
                    exercise_id: item.exercise_id,
                    name: resolvedName,
                    gif_url: resolvedGif,
                    target_muscle: resolvedTarget,
                    sets: item.sets,
                    reps: parseInt(String(item.reps ?? 0), 10) || 0,
                    weight_kg: item.weight_kg,
                    rest_seconds: item.rest_seconds,
                    kcal: Number(item.kcal ?? estimateExerciseKcalRealistic({
                      exercise: {
                        target_muscle: resolvedTarget,
                        body_part: resolvedBodyPart
                      },
                      sets: item.sets,
                      repsText: String(parseInt(String(item.reps ?? 0), 10) || 0),
                      externalLoadKg: Number(item.weight_kg || 0),
                      userWeightKg,
                      restSeconds: Number(item.rest_seconds || 60)
                    })),
                    is_rest_day: false
                  });
                }
              });

              nextWeeklyPlan = grouped;
              nextRestDays = rest;
            }
          }
        }

        setPlanId(nextPlanId);
        setPlanName(nextPlanName);
        setWeeklyPlan(nextWeeklyPlan);
        setRestDays(nextRestDays);
      } catch (e) {
        console.error('Error fetching week plan:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWeekPlan();
  }, [user, selectedWeekKey, userWeightKg, isWeightReady]);

  // Derived Library
  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
      const matchMuscle = filterMuscle === 'all' || ex.target_muscle.toLocaleLowerCase().includes(filterMuscle);
      return matchSearch && matchMuscle;
    });
  }, [exercises, search, filterMuscle]);

  // Actions
  const addExercise = (ex: Exercise) => {
    const kcal = estimateExerciseKcalRealistic({
      exercise: { target_muscle: ex.target_muscle, body_part: ex.body_part },
      sets: 3,
      repsText: '12',
      externalLoadKg: 20,
      userWeightKg,
      restSeconds: 60
    });
    const newEx: PlanExercise = {
      tempId: Math.random().toString(36).substr(2, 9),
      exercise_id: ex.id,
      name: ex.name,
      gif_url: ex.gif_url,
      target_muscle: ex.target_muscle,
      sets: 3,
      reps: 12,
      weight_kg: 20,
      rest_seconds: 60,
      kcal,
      is_rest_day: false
    };

    setWeeklyPlan(prev => ({
      ...prev,
      [selectedDayId]: [...(prev[selectedDayId] || []), newEx]
    }));
    setRestDays(prev => ({ ...prev, [selectedDayId]: false }));
  };

  const deleteExercise = (tempId: string) => {
    setWeeklyPlan(prev => ({
      ...prev,
      [selectedDayId]: prev[selectedDayId].filter(i => i.tempId !== tempId)
    }));
  };

  const updateExercise = (tempId: string, updates: Partial<PlanExercise>, shouldRecalc = true) => {
    setWeeklyPlan(prev => ({
      ...prev,
      [selectedDayId]: prev[selectedDayId].map(i => {
        if (i.tempId !== tempId) return i;
        const merged = { ...i, ...updates };
        if (!shouldRecalc) return merged;
        return {
          ...merged,
          kcal: estimateExerciseKcalRealistic({
            exercise: { target_muscle: merged.target_muscle },
            sets: merged.sets,
            repsText: String(merged.reps),
            externalLoadKg: merged.weight_kg,
            userWeightKg,
            restSeconds: merged.rest_seconds
          })
        };
      })
    }));
  };

  const toggleRestDay = () => {
    const newState = !restDays[selectedDayId];
    setRestDays(prev => ({ ...prev, [selectedDayId]: newState }));
    setWeeklyPlan(prev => ({ ...prev, [selectedDayId]: [] })); // Luôn clear dữ liệu cũ khi đổi trạng thái
  };

  const addExerciseToDay = (ex: Exercise, dayId: number) => {
    const kcal = estimateExerciseKcalRealistic({
      exercise: { target_muscle: ex.target_muscle, body_part: ex.body_part },
      sets: 3,
      repsText: '12',
      externalLoadKg: 20,
      userWeightKg,
      restSeconds: 60
    });
    const newEx: PlanExercise = {
      tempId: Math.random().toString(36).slice(2, 11),
      exercise_id: ex.id,
      name: ex.name,
      gif_url: ex.gif_url,
      target_muscle: ex.target_muscle,
      sets: 3,
      reps: 12,
      weight_kg: 20,
      rest_seconds: 60,
      kcal,
      is_rest_day: false
    };

    setWeeklyPlan(prev => ({
      ...prev,
      [dayId]: [...(prev[dayId] || []), newEx]
    }));
    setRestDays(prev => ({ ...prev, [dayId]: false }));
    setIsMobileLibraryOpen(false); // Close library on mobile after adding
  };

  const handleDragStart = (event: any) => {
    const activeId = String(event.active.id);

    if (activeId.startsWith('library-')) {
      const exId = activeId.replace('library-', '');
      const ex = exercises.find(item => item.id === exId);
      if (ex) {
        setActiveDrag({
          type: 'library',
          name: ex.name,
          gif_url: ex.gif_url
        });
      }
      return;
    }

    if (activeId.startsWith('plan-')) {
      const itemId = activeId.replace('plan-', '');
      const item = (weeklyPlan[selectedDayId] || []).find(ex => ex.tempId === itemId);
      if (item) {
        setActiveDrag({
          type: 'plan',
          name: item.name,
          gif_url: item.gif_url
        });
      }
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith('library-') && (overId === 'day-dropzone' || overId.startsWith('plan-'))) {
      const exId = activeId.replace('library-', '');
      const found = exercises.find(ex => ex.id === exId);
      if (found) addExerciseToDay(found, selectedDayId);
      return;
    }

    if (activeId.startsWith('plan-') && overId.startsWith('plan-') && activeId !== overId) {
      const fromId = activeId.replace('plan-', '');
      const toId = overId.replace('plan-', '');
      const currentItems = weeklyPlan[selectedDayId] || [];
      const oldIndex = currentItems.findIndex(i => i.tempId === fromId);
      const newIndex = currentItems.findIndex(i => i.tempId === toId);
      if (oldIndex === -1 || newIndex === -1) return;

      setWeeklyPlan(prev => ({
        ...prev,
        [selectedDayId]: arrayMove(currentItems, oldIndex, newIndex)
      }));
    }
  };

  const savePlan = async () => {
    if (!user) return alert('Vui lòng đăng nhập!');
    setIsSaving(true);

    try {
      let currentPlanId = planId;

      // 1) Ensure weekly plan exists for selected week
      if (!currentPlanId) {
        let existingPlans: any[] | null = null;
        if (supportsWeekStartDate) {
          const byWeek = await supabase
            .from('weekly_plans')
            .select('*')
            .eq('user_id', user.id)
            .eq('week_start_date', selectedWeekKey)
            .limit(20);
          if (byWeek.error && isWeekStartColumnError(byWeek.error)) {
            setSupportsWeekStartDate(false);
            const fallback = await supabase
              .from('weekly_plans')
              .select('*')
              .eq('user_id', user.id)
              .limit(20);
            if (fallback.error) throw fallback.error;
            existingPlans = fallback.data;
          } else if (byWeek.error) {
            throw byWeek.error;
          } else {
            existingPlans = byWeek.data;
          }
        } else {
          const fallback = await supabase
            .from('weekly_plans')
            .select('*')
            .eq('user_id', user.id)
            .limit(20);
          if (fallback.error) throw fallback.error;
          existingPlans = fallback.data;
        }
        const existingPlan = pickLatestPlan(existingPlans as any[]);
        if (existingPlan?.id) currentPlanId = existingPlan.id;
      }

      // 2) Create or update weekly plan record
      if (!currentPlanId) {
        const payload: any = {
          user_id: user.id,
          name: planName
        };
        if (supportsWeekStartDate) payload.week_start_date = selectedWeekKey;

        const planInsert = await supabase
          .from('weekly_plans')
          .insert(payload)
          .select('id')
          .single();

        if (planInsert.error && isWeekStartColumnError(planInsert.error)) {
          setSupportsWeekStartDate(false);
          const retryInsert = await supabase
            .from('weekly_plans')
            .insert({
              user_id: user.id,
              name: planName
            })
            .select('id')
            .single();
          if (retryInsert.error) throw retryInsert.error;
          currentPlanId = retryInsert.data.id;
        } else if (planInsert.error) {
          throw planInsert.error;
        } else {
          currentPlanId = planInsert.data.id;
        }
      } else {
        const updatePayload: any = {
          name: planName
        };
        if (supportsWeekStartDate) updatePayload.week_start_date = selectedWeekKey;

        const planUpdate = await supabase
          .from('weekly_plans')
          .update(updatePayload)
          .eq('id', currentPlanId);

        if (planUpdate.error && isWeekStartColumnError(planUpdate.error)) {
          setSupportsWeekStartDate(false);
          const retryUpdate = await supabase
            .from('weekly_plans')
            .update({
              name: planName
            })
            .eq('id', currentPlanId);
          if (retryUpdate.error) throw retryUpdate.error;
        } else if (planUpdate.error) {
          throw planUpdate.error;
        }
      }

      setPlanId(currentPlanId);

      // 3) Clear old items for this plan
      const { error: clearItemsError } = await supabase
        .from('weekly_plan_exercises')
        .delete()
        .eq('weekly_plan_id', currentPlanId);
      if (clearItemsError) throw clearItemsError;

      // 4) Insert latest items
      const allItems: any[] = [];
      DAYS.forEach(({ id: dayIdx }) => {
        const dayItems = weeklyPlan[dayIdx] || [];

        if (restDays[dayIdx]) {
          allItems.push({
            weekly_plan_id: currentPlanId,
            day_of_week: dayIdx,
            is_rest_day: true,
            order_index: 0
          });
        } else {
          dayItems.forEach((item, idx) => {
            const row: any = {
              weekly_plan_id: currentPlanId,
              day_of_week: dayIdx,
              exercise_id: item.exercise_id,
              sets: item.sets,
              reps: String(item.reps),
              weight_kg: item.weight_kg,
              rest_seconds: item.rest_seconds,
              order_index: idx
            };
            if (supportsKcalColumn) row.kcal = Number(item.kcal || 0);
            allItems.push(row);
          });
        }
      });

      if (allItems.length > 0) {
        const firstInsert = await supabase.from('weekly_plan_exercises').insert(allItems);
        if (firstInsert.error && isKcalColumnError(firstInsert.error)) {
          setSupportsKcalColumn(false);
          const fallbackItems = allItems.map(({ kcal, ...rest }) => rest);
          const retryInsert = await supabase.from('weekly_plan_exercises').insert(fallbackItems);
          if (retryInsert.error) throw retryInsert.error;
        } else if (firstInsert.error) {
          throw firstInsert.error;
        }
      }

      // 4.1) Sync Workout Creator => Exercises (today only, VN timezone)
      // Keep today's daily_exercise_sessions consistent with today's plan after Save.
      if (isCurrentWeek) {
        const vnTodayKey = getVietnamDateKey();
        const todayDayIdx = getTodayDayIndex();
        const todayItems = (weeklyPlan[todayDayIdx] || []).filter(item => !item.is_rest_day);

        const { error: clearTodaySessionsError } = await supabase
          .from('daily_exercise_sessions')
          .delete()
          .eq('user_id', user.id)
          .eq('log_date', vnTodayKey);
        if (clearTodaySessionsError) throw clearTodaySessionsError;

        if (!restDays[todayDayIdx] && todayItems.length > 0) {
          const sessionRows = todayItems.map((item, idx) => ({
            user_id: user.id,
            log_date: vnTodayKey,
            exercise_id: item.exercise_id,
            sets: item.sets,
            reps: String(item.reps),
            weight_kg: item.weight_kg,
            rest_seconds: item.rest_seconds,
            order_index: idx,
            is_completed: false
          }));

          const { error: insertTodaySessionsError } = await supabase
            .from('daily_exercise_sessions')
            .insert(sessionRows);
          if (insertTodaySessionsError) throw insertTodaySessionsError;
        }
      }

      // 5) Refresh day summary and items from DB right after save
      const { data: savedItems, error: refreshError } = await supabase
        .from('weekly_plan_exercises')
        .select(`
          *,
          exercises:exercise_id (name, gif_url, target_muscle, body_part)
        `)
        .eq('weekly_plan_id', currentPlanId)
        .order('order_index');
      if (refreshError) throw refreshError;

      const grouped: Record<number, PlanExercise[]> = {};
      const rest: Record<number, boolean> = {};

      (savedItems || []).forEach(item => {
        const day = item.day_of_week;
        if (!grouped[day]) grouped[day] = [];

        const joined = (item as any).exercises || {};
        const detail = exercises.find(e => e.id === item.exercise_id);
        const resolvedName = joined?.name || detail?.name || 'Exercise';
        const resolvedGif = resolveGifUrl({ gif_url: joined?.gif_url || detail?.gif_url || '' });
        const resolvedTarget = String(joined?.target_muscle || detail?.target_muscle || '');
        const resolvedBodyPart = String(joined?.body_part || detail?.body_part || '');
        grouped[day].push({
          tempId: item.id,
          exercise_id: item.exercise_id,
          name: resolvedName,
          gif_url: resolvedGif,
          target_muscle: resolvedTarget,
          sets: item.sets,
          reps: parseInt(String(item.reps ?? 0), 10) || 0,
          weight_kg: item.weight_kg,
          rest_seconds: item.rest_seconds,
          kcal: Number(item.kcal ?? estimateExerciseKcalRealistic({
            exercise: {
              target_muscle: resolvedTarget,
              body_part: resolvedBodyPart
            },
            sets: item.sets,
            repsText: String(parseInt(String(item.reps ?? 0), 10) || 0),
            externalLoadKg: Number(item.weight_kg || 0),
            userWeightKg,
            restSeconds: Number(item.rest_seconds || 60)
          })),
          is_rest_day: item.is_rest_day
        });

        if (item.is_rest_day) rest[day] = true;
      });

      setWeeklyPlan(grouped);
      setRestDays(rest);

      alert("Đã lưu lịch tập thành công!");
    } catch (e: any) {
      alert('Lỗi khi lưu: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#a3e635]" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 w-full h-auto md:h-[calc(100vh-80px-3rem)] overflow-visible md:overflow-hidden min-h-0">
        <div className="h-full flex flex-col min-h-0 gap-3 md:gap-4">

          {/* ========== TOP BAR ========== */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#a3e635]/10 text-[#a3e635] flex items-center justify-center shrink-0">
                <Blocks className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className="text-lg sm:text-xl font-black text-text-primary bg-transparent border-none outline-none focus:ring-0 p-0 w-full sm:w-auto"
                placeholder={workoutCreatorLabel}
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedWeekStart(getWeekStart(getVietnamTodayDate()))}
                disabled={isCurrentWeek}
                className={`h-7 px-2 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${isCurrentWeek
                  ? 'border-border-primary bg-bg-tertiary text-text-tertiary cursor-not-allowed opacity-60'
                  : 'border-[#a3e635]/30 bg-[#a3e635]/10 text-[#a3e635] hover:bg-[#a3e635]/20'
                  }`}
              >
                Tuần này
              </button>
              <button onClick={goPrevWeek} className="h-7 w-7 rounded-lg border border-border-primary bg-bg-tertiary text-text-secondary hover:text-text-primary flex items-center justify-center">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="h-7 rounded-lg border border-border-primary bg-bg-tertiary px-2 flex items-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-text-secondary uppercase tracking-wide whitespace-nowrap">
                  {selectedWeekLabel}
                </span>
              </div>
              <button onClick={goNextWeek} className="h-7 w-7 rounded-lg border border-border-primary bg-bg-tertiary text-text-secondary hover:text-text-primary flex items-center justify-center">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={savePlan}
                disabled={isSaving}
                className="h-7 px-3 flex items-center gap-1.5 bg-[#a3e635] text-black rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-[#bef264] transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} {"Lưu thay đổi"}
              </button>
            </div>
          </div>

          {/* ========== 2-COLUMN LAYOUT ========== */}
          <div className="flex-1 w-full grid min-h-0 gap-3 md:gap-4 grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)] pb-6 md:pb-0">
            {/* ===== Mobile Overlay ===== */}
            {isMobileLibraryOpen && (
              <div className="fixed inset-0 bg-black/60 z-40 md:hidden animate-in fade-in" onClick={() => setIsMobileLibraryOpen(false)} />
            )}

            {/* ===== LEFT: Exercise Library ===== */}
            <aside className={`bg-bg-secondary border border-border-primary flex-col overflow-hidden min-h-0 order-1 md:order-first z-50 md:z-0 transition-transform duration-300 md:transition-none
              fixed md:relative bottom-3 md:bottom-0 left-3 right-3 md:left-0 md:right-0 h-[85vh] md:h-auto rounded-3xl md:rounded-3xl w-auto md:w-full
              hidden md:flex
              ${isMobileLibraryOpen ? '!flex translate-y-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]' : 'translate-y-full md:translate-y-0'}`}>
              <div className="p-3 border-b border-border-primary shrink-0 relative">
                {/* Mobile Close Indicator */}
                <div className="w-12 h-1.5 bg-border-primary rounded-full mx-auto mb-3 md:hidden cursor-pointer" onClick={() => setIsMobileLibraryOpen(false)} />
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-text-tertiary">
                    {"Thư viện bài tập"}
                  </h3>
                  <button onClick={() => setIsMobileLibraryOpen(false)} className="md:hidden w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-text-tertiary">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder={"Tìm kiếm bài tập..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 pl-10 pr-4 text-sm focus:border-[#a3e635] outline-none transition-all text-text-primary"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <button
                    onClick={() => setFilterMuscle('all')}
                    className={`text-[9px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider transition-all ${filterMuscle === 'all' ? 'bg-[#a3e635] text-black' : 'bg-bg-tertiary text-text-tertiary hover:text-text-primary'}`}
                  >
                    Tất cả
                  </button>
                  {MUSCLE_GROUPS.map(m => (
                    <button
                      key={m}
                      onClick={() => setFilterMuscle(m)}
                      className={`text-[9px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider transition-all ${filterMuscle === m ? 'bg-[#a3e635] text-black' : 'bg-bg-tertiary text-text-tertiary hover:text-text-primary'}`}
                    >
                      {{ chest: 'Ngực', back: 'Lưng', legs: 'Chân', shoulders: 'Vai', arms: 'Tay', abs: 'Cơ bụng', cardio: 'Tim mạch' }[m] || m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto lg:max-h-none p-3 md:p-4 pb-8 md:pb-3 custom-scrollbar space-y-3 min-h-0">
                {filteredExercises.map(ex => (
                  <LibraryItem key={ex.id} exercise={ex} onAdd={addExercise} />
                ))}
              </div>
            </aside>

            <section className="flex bg-bg-secondary border border-border-primary rounded-3xl flex-col overflow-visible lg:overflow-hidden min-h-0 order-2 md:order-last">
              <div className="p-3 md:p-4 border-b border-border-primary shrink-0">
                <div className="mb-3">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-text-tertiary">
                    Lịch theo tuần
                  </h3>
                </div>

                <div className="flex md:grid md:grid-cols-4 xl:grid-cols-7 gap-2 overflow-x-auto md:overflow-visible pb-1 md:pb-0 scroll-smooth snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {DAYS.map(day => (
                    (() => {
                      const dayDate = addDays(selectedWeekStart, day.id);
                      const dayDateKey = toDateKey(dayDate);
                      const isToday = dayDateKey === todayKey;
                      return (
                        <button
                          key={day.id}
                          ref={el => {
                            if (el) dayRefs.current.set(day.id, el);
                            else dayRefs.current.delete(day.id);
                          }}
                          onClick={() => setSelectedDayId(day.id)}
                          className={`min-w-[88px] md:min-w-0 w-full px-2.5 md:px-3 py-2 rounded-2xl border transition-all text-left snap-center ${selectedDayId === day.id
                            ? 'bg-[#a3e635] text-black border-[#a3e635]'
                            : 'bg-bg-secondary text-text-secondary border-border-primary hover:border-border-secondary'
                            }`}
                        >
                          <span className={`text-xs font-black uppercase tracking-widest ${selectedDayId === day.id ? 'text-black' : 'text-text-tertiary'}`}>
                            {day.label_vi}
                          </span>
                          <div className={`text-[10px] font-bold mt-0.5 ${selectedDayId === day.id ? 'text-black/70' : isToday ? 'text-[#a3e635]' : 'text-text-tertiary'}`}>
                            {dayDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </div>
                          <div className="mt-1 text-[9px] font-black uppercase">
                            {restDays[day.id] ? "Ngày nghỉ" : `${weeklyPlan[day.id]?.length || 0} ${"Luyện tập"}`}
                          </div>
                        </button>
                      );
                    })()
                  ))}
                </div>
              </div>

              <div className="p-3 md:p-4 border-b border-border-primary grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#a3e635]/10 flex items-center justify-center text-[#a3e635]">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h2 className="text-base md:text-lg font-black text-text-primary tracking-tight truncate">
                    {DAYS[selectedDayId].label_vi}
                  </h2>
                </div>

                <div className="flex items-center gap-2 justify-end flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  <button
                    onClick={toggleRestDay}
                    className={`h-9 flex-1 sm:flex-none sm:w-[110px] min-w-[120px] sm:min-w-0 flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${restDays[selectedDayId]
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-bg-tertiary text-text-tertiary border border-border-primary hover:text-text-primary'
                      }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span className="truncate">{"Ngày nghỉ"}</span>
                  </button>
                  <button
                    onClick={() => setIsMobileLibraryOpen(true)}
                    className="h-9 flex-1 sm:flex-none sm:w-[110px] min-w-[120px] sm:min-w-0 flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all bg-[#a3e635]/10 text-[#a3e635] border border-[#a3e635]/30 hover:bg-[#a3e635]/20 md:hidden"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span className="truncate">Thêm mới</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 pb-3 custom-scrollbar min-h-0">
                <DayDropZone isActive={!!activeDrag}>
                  {restDays[selectedDayId] ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
                        <Moon className="w-8 h-8 text-purple-500" />
                      </div>
                      <h3 className="text-lg font-black text-text-primary mb-1 uppercase">{"Ngày nghỉ"}</h3>
                      <button
                        onClick={toggleRestDay}
                        className="mt-3 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        {"Quản lý bài tập"}
                      </button>
                    </div>
                  ) : (weeklyPlan[selectedDayId]?.length || 0) > 0 ? (
                    <>
                      <SortableContext
                        items={(weeklyPlan[selectedDayId] || []).map(i => `plan-${i.tempId}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        {(weeklyPlan[selectedDayId] || []).map((item) => (
                          <SortableRoutineItem
                            key={item.tempId}
                            item={{ ...item, tempId: `plan-${item.tempId}` }}
                            onDelete={(id) => deleteExercise(id.replace('plan-', ''))}
                            onUpdate={(id, update, shouldRecalc) => updateExercise(id.replace('plan-', ''), update, shouldRecalc)}
                          />
                        ))}
                      </SortableContext>
                    </>
                  ) : (
                    <div className="min-h-[200px] h-full flex flex-col items-center justify-center border-2 border-dashed border-border-primary rounded-2xl text-center" onClick={() => setIsMobileLibraryOpen(true)}>
                      <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4 transition-transform">
                        <Brain className="w-8 h-8 text-text-tertiary" />
                      </div>
                      <p className="text-sm text-text-tertiary max-w-[240px] px-4">{"Ngày này chưa có bài tập nào. Hãy kéo thả từ thư viện!"}</p>
                    </div>
                  )}
                </DayDropZone>
              </div>
            </section>
          </div>
        </div>
      </div>
      <DragOverlay>
        {activeDrag ? (
          <div className="bg-bg-secondary border border-[#a3e635]/60 rounded-xl p-3 flex items-center gap-3 shadow-2xl w-[260px]">
            <div className="w-12 h-12 rounded-lg bg-bg-quaternary overflow-hidden shrink-0">
              <ExerciseThumb src={activeDrag.gif_url} alt={activeDrag.name} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-text-tertiary uppercase font-bold">
                {activeDrag.type === 'library' ? "Thêm mới" : "Quản lý bài tập"}
              </p>
              <p className="text-sm font-bold text-text-primary uppercase truncate">{activeDrag.name}</p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
