import React, { useState, useEffect, useMemo } from 'react';
import { Search, GripVertical, Trash2, Moon, Plus, Save, Info, Loader2, Calendar, Brain, ImageOff, ChevronLeft, ChevronRight, Blocks } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';
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

// --- Types ---
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
  sets: number;
  reps: number;
  weight_kg: number;
  rest_seconds: number;
  is_rest_day: boolean;
}

interface DraggingPreview {
  type: 'library' | 'plan';
  name: string;
  gif_url: string;
}

const DAYS = [
  { id: 0, label_vi: 'Thứ 2', label_en: 'Monday' },
  { id: 1, label_vi: 'Thứ 3', label_en: 'Tuesday' },
  { id: 2, label_vi: 'Thứ 4', label_en: 'Wednesday' },
  { id: 3, label_vi: 'Thứ 5', label_en: 'Thursday' },
  { id: 4, label_vi: 'Thứ 6', label_en: 'Friday' },
  { id: 5, label_vi: 'Thứ 7', label_en: 'Saturday' },
  { id: 6, label_vi: 'Chủ Nhật', label_en: 'Sunday' },
];

const MUSCLE_GROUPS = [
  'chest', 'back', 'legs', 'shoulders', 'arms', 'abs', 'cardio'
];

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
  const jsDay = new Date().getDay(); // Sun=0 ... Sat=6
  return jsDay === 0 ? 6 : jsDay - 1; // Mon=0 ... Sun=6
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

// --- Components ---
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
  onUpdate: (tempId: string, updates: Partial<PlanExercise>) => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.tempId });
  const { t } = useTranslation();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.3 : 1
  };

  return (
    <div ref={setNodeRef} style={style} className="relative mb-3">
      <div className="bg-bg-secondary border border-border-primary rounded-2xl p-3 sm:p-4 group hover:border-border-secondary transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-text-tertiary hover:text-text-primary">
            <GripVertical className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-xl bg-bg-tertiary overflow-hidden border border-border-primary shrink-0">
            <ExerciseThumb src={item.gif_url} alt={item.name} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-text-primary uppercase truncate">{item.name}</h3>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 mt-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{t('workout_builder.sets')}</span>
                <input
                  type="number"
                  value={item.sets === 0 ? '' : item.sets}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onUpdate(item.tempId, { sets: raw === '' ? 0 : parseInt(raw, 10) || 0 });
                  }}
                  placeholder="0"
                  className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-full sm:w-16 focus:border-[#a3e635] outline-none text-text-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{t('workout_builder.reps')}</span>
                <input
                  type="number"
                  value={item.reps === 0 ? '' : item.reps}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onUpdate(item.tempId, { reps: raw === '' ? 0 : parseInt(raw, 10) || 0 });
                  }}
                  placeholder="0"
                  className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-full sm:w-16 focus:border-[#a3e635] outline-none text-text-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{t('workout_builder.weight')}</span>
                <input
                  type="number"
                  value={item.weight_kg === 0 ? '' : item.weight_kg}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onUpdate(item.tempId, { weight_kg: raw === '' ? 0 : parseFloat(raw) || 0 });
                  }}
                  placeholder="0"
                  className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-full sm:w-16 focus:border-[#a3e635] outline-none text-text-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">{t('workout_builder.rest')}</span>
                <input
                  type="number"
                  value={item.rest_seconds === 0 ? '' : item.rest_seconds}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onUpdate(item.tempId, { rest_seconds: raw === '' ? 0 : parseInt(raw, 10) || 0 });
                  }}
                  placeholder="0"
                  className="bg-bg-tertiary border border-border-primary rounded-lg px-2 py-1 text-sm w-full sm:w-16 focus:border-[#a3e635] outline-none text-text-primary"
                />
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
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

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
  const [mobileView, setMobileView] = useState<'plan' | 'library'>('plan');
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [supportsWeekStartDate, setSupportsWeekStartDate] = useState(true);

  const selectedWeekKey = useMemo(() => toDateKey(selectedWeekStart), [selectedWeekStart]);
  const selectedWeekLabel = useMemo(() => {
    const end = new Date(selectedWeekStart);
    end.setDate(selectedWeekStart.getDate() + 6);
    return `${selectedWeekStart.toLocaleDateString(currentLang, { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString(currentLang, { day: '2-digit', month: '2-digit' })}`;
  }, [selectedWeekStart, currentLang]);
  const isCurrentWeek = useMemo(() => selectedWeekKey === toDateKey(getWeekStart(new Date())), [selectedWeekKey]);
  const todayKey = useMemo(() => toDateKey(new Date()), []);

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

  // Load selected week plan silently (no full-page spinner)
  useEffect(() => {
    const fetchWeekPlan = async () => {
      try {
        let nextPlanId: string | null = null;
        let nextPlanName = t('sidebar.creator', 'Tạo bài tập');
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
            nextPlanName =
              !planData.name || planData.name === 'Workout Creator'
                ? t('sidebar.creator', 'Tạo bài tập')
                : planData.name;

            const { data: items } = await supabase
              .from('weekly_plan_exercises')
              .select('*')
              .eq('weekly_plan_id', planData.id)
              .order('order_index');

            if (items) {
              const grouped: Record<number, PlanExercise[]> = {};
              const rest: Record<number, boolean> = {};

              items.forEach(item => {
                const day = item.day_of_week;
                if (!grouped[day]) grouped[day] = [];

                const detail = exercises.find(e => e.id === item.exercise_id);

                grouped[day].push({
                  tempId: item.id,
                  exercise_id: item.exercise_id,
                  name: detail?.name || 'Exercise',
                  gif_url: detail?.gif_url || '',
                  sets: item.sets,
                  reps: parseInt(String(item.reps ?? 0), 10) || 0,
                  weight_kg: item.weight_kg,
                  rest_seconds: item.rest_seconds,
                  is_rest_day: item.is_rest_day
                });

                if (item.is_rest_day) rest[day] = true;
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
  }, [user, selectedWeekKey, exercises, t]);

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
    const newEx: PlanExercise = {
      tempId: Math.random().toString(36).substr(2, 9),
      exercise_id: ex.id,
      name: ex.name,
      gif_url: ex.gif_url,
      sets: 3,
      reps: 12,
      weight_kg: 20,
      rest_seconds: 60,
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

  const updateExercise = (tempId: string, updates: Partial<PlanExercise>) => {
    setWeeklyPlan(prev => ({
      ...prev,
      [selectedDayId]: prev[selectedDayId].map(i => i.tempId === tempId ? { ...i, ...updates } : i)
    }));
  };

  const toggleRestDay = () => {
    const newState = !restDays[selectedDayId];
    setRestDays(prev => ({ ...prev, [selectedDayId]: newState }));
    if (newState) {
      setWeeklyPlan(prev => ({ ...prev, [selectedDayId]: [] }));
    }
  };

  const addExerciseToDay = (ex: Exercise, dayId: number) => {
    const newEx: PlanExercise = {
      tempId: Math.random().toString(36).slice(2, 11),
      exercise_id: ex.id,
      name: ex.name,
      gif_url: ex.gif_url,
      sets: 3,
      reps: 12,
      weight_kg: 20,
      rest_seconds: 60,
      is_rest_day: false
    };

    setWeeklyPlan(prev => ({
      ...prev,
      [dayId]: [...(prev[dayId] || []), newEx]
    }));
    setRestDays(prev => ({ ...prev, [dayId]: false }));
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
            allItems.push({
              weekly_plan_id: currentPlanId,
              day_of_week: dayIdx,
              exercise_id: item.exercise_id,
              sets: item.sets,
              reps: String(item.reps),
              weight_kg: item.weight_kg,
              rest_seconds: item.rest_seconds,
              order_index: idx
            });
          });
        }
      });

      if (allItems.length > 0) {
        const { error: insertError } = await supabase.from('weekly_plan_exercises').insert(allItems);
        if (insertError) throw insertError;
      }

      // 5) Refresh day summary and items from DB right after save
      const { data: savedItems, error: refreshError } = await supabase
        .from('weekly_plan_exercises')
        .select('*')
        .eq('weekly_plan_id', currentPlanId)
        .order('order_index');
      if (refreshError) throw refreshError;

      const grouped: Record<number, PlanExercise[]> = {};
      const rest: Record<number, boolean> = {};

      (savedItems || []).forEach(item => {
        const day = item.day_of_week;
        if (!grouped[day]) grouped[day] = [];

        const detail = exercises.find(e => e.id === item.exercise_id);
        grouped[day].push({
          tempId: item.id,
          exercise_id: item.exercise_id,
          name: detail?.name || 'Exercise',
          gif_url: detail?.gif_url || '',
          sets: item.sets,
          reps: parseInt(String(item.reps ?? 0), 10) || 0,
          weight_kg: item.weight_kg,
          rest_seconds: item.rest_seconds,
          is_rest_day: item.is_rest_day
        });

        if (item.is_rest_day) rest[day] = true;
      });

      setWeeklyPlan(grouped);
      setRestDays(rest);

      alert(t('workout_builder.save_success'));
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
      <div className="h-[calc(100vh-72px-2rem)] md:h-[calc(100vh-80px-3rem)] overflow-hidden min-h-0">
        <div className="h-full flex flex-col min-h-0 gap-3 lg:gap-4">
          <div className="lg:hidden bg-bg-secondary border border-border-primary rounded-2xl p-2 flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMobileView('plan')}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${mobileView === 'plan' ? 'bg-[#a3e635] text-black' : 'text-text-tertiary bg-bg-tertiary'}`}
            >
              {t('workout_builder.manage_routine', 'Lịch tập')}
            </button>
            <button
              onClick={() => setMobileView('library')}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${mobileView === 'library' ? 'bg-[#a3e635] text-black' : 'text-text-tertiary bg-bg-tertiary'}`}
            >
              {t('sidebar.exercises', 'Thư viện')}
            </button>
          </div>

          <div className="grid h-full min-h-0 gap-3 lg:gap-4 grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)]">
          <aside className={`${mobileView === 'library' ? 'flex' : 'hidden'} md:flex bg-bg-secondary border border-border-primary rounded-3xl flex-col overflow-hidden min-h-0`}>
            <div className="p-4 border-b border-border-primary shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#a3e635]/10 text-[#a3e635] flex items-center justify-center shrink-0">
                  <Blocks className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="text-xl md:text-2xl font-black text-text-primary bg-transparent border-none outline-none focus:ring-0 w-full p-0"
                  placeholder={t('sidebar.creator')}
                />
              </div>
              <div className="flex items-center gap-2 text-text-tertiary mt-2">
                <Info className="w-3.5 h-3.5 text-[#a3e635]" />
                <p className="text-[10px] font-bold uppercase tracking-widest">{t('sidebar.drag_drop_hint', 'Kéo thả để thêm bài tập')}</p>
              </div>
            </div>

            <div className="p-3 md:p-4 border-b border-border-primary space-y-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder={t('sidebar.search_exercises')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-2 pl-10 pr-4 text-sm focus:border-[#a3e635] outline-none transition-all text-text-primary"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilterMuscle('all')}
                  className={`text-[9px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider transition-all ${filterMuscle === 'all' ? 'bg-[#a3e635] text-black' : 'bg-bg-tertiary text-text-tertiary hover:text-text-primary'}`}
                >
                  {t('common.all', 'Tất cả')}
                </button>
                {MUSCLE_GROUPS.map(m => (
                  <button
                    key={m}
                    onClick={() => setFilterMuscle(m)}
                    className={`text-[9px] px-2 py-1 rounded-lg font-bold uppercase tracking-wider transition-all ${filterMuscle === m ? 'bg-[#a3e635] text-black' : 'bg-bg-tertiary text-text-tertiary hover:text-text-primary'}`}
                  >
                    {t(`sidebar.muscle_groups.${m}`, m)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 md:p-4 pb-24 custom-scrollbar space-y-3 min-h-0">
              {filteredExercises.map(ex => (
                <LibraryItem key={ex.id} exercise={ex} onAdd={addExercise} />
              ))}
            </div>
          </aside>

          <section className={`${mobileView === 'plan' ? 'flex' : 'hidden'} md:flex bg-bg-secondary border border-border-primary rounded-3xl flex-col overflow-hidden min-h-0`}>
            <div className="p-3 md:p-4 border-b border-border-primary shrink-0">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-text-tertiary">
                  {currentLang === 'vi' ? 'Lịch theo tuần' : 'Weekly schedule'}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedWeekStart(getWeekStart(new Date()))}
                    disabled={isCurrentWeek}
                    className={`h-8 px-2.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all ${isCurrentWeek
                      ? 'border-border-primary bg-bg-tertiary text-text-tertiary cursor-not-allowed opacity-60'
                      : 'border-[#a3e635]/30 bg-[#a3e635]/10 text-[#a3e635] hover:bg-[#a3e635]/20'
                      }`}
                  >
                    {currentLang === 'vi' ? 'Tuần hiện tại' : 'Current week'}
                  </button>
                  <button
                    onClick={goPrevWeek}
                    className="h-8 w-8 rounded-lg border border-border-primary bg-bg-tertiary text-text-secondary hover:text-text-primary flex items-center justify-center"
                    aria-label="Previous week"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="h-8 rounded-lg border border-border-primary bg-bg-tertiary px-3 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wide whitespace-nowrap">
                      {selectedWeekLabel}
                    </span>
                  </div>
                  <button
                    onClick={goNextWeek}
                    className="h-8 w-8 rounded-lg border border-border-primary bg-bg-tertiary text-text-secondary hover:text-text-primary flex items-center justify-center"
                    aria-label="Next week"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex md:grid md:grid-cols-4 xl:grid-cols-7 gap-2 overflow-x-auto md:overflow-visible custom-scrollbar pb-1 md:pb-0">
                {DAYS.map(day => (
                  (() => {
                    const dayDate = addDays(selectedWeekStart, day.id);
                    const dayDateKey = toDateKey(dayDate);
                    const isToday = dayDateKey === todayKey;
                    return (
                  <button
                    key={day.id}
                    onClick={() => setSelectedDayId(day.id)}
                    className={`min-w-[92px] md:min-w-0 w-full px-2.5 md:px-3 py-2 rounded-2xl border transition-all text-left ${selectedDayId === day.id
                      ? 'bg-[#a3e635] text-black border-[#a3e635]'
                      : 'bg-bg-secondary text-text-secondary border-border-primary hover:border-border-secondary'
                      }`}
                  >
                    <span className={`text-xs font-black uppercase tracking-widest ${selectedDayId === day.id ? 'text-black' : 'text-text-tertiary'}`}>
                      {currentLang === 'vi' ? day.label_vi : day.label_en}
                    </span>
                    <div className={`text-[10px] font-bold mt-0.5 ${selectedDayId === day.id ? 'text-black/70' : isToday ? 'text-[#a3e635]' : 'text-text-tertiary'}`}>
                      {dayDate.toLocaleDateString(currentLang, { day: '2-digit', month: '2-digit' })}
                    </div>
                    <div className="mt-1 text-[9px] font-black uppercase">
                      {restDays[day.id] ? t('sidebar.rest_day') : `${weeklyPlan[day.id]?.length || 0} ${t('dashboard.exercise', 'Bài tập')}`}
                    </div>
                  </button>
                    );
                  })()
                ))}
              </div>
            </div>

            <div className="p-3 md:p-4 border-b border-border-primary grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#a3e635]/10 flex items-center justify-center text-[#a3e635]">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-base md:text-lg font-black text-text-primary tracking-tight truncate">
                  {currentLang === 'vi' ? DAYS[selectedDayId].label_vi : DAYS[selectedDayId].label_en}
                </h2>
              </div>

              <div className="flex items-center gap-2 justify-end flex-nowrap w-[420px] max-w-full">
                <button
                  onClick={toggleRestDay}
                  className={`h-9 w-[110px] flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${restDays[selectedDayId]
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-bg-tertiary text-text-tertiary border border-border-primary hover:text-text-primary'
                    }`}
                >
                  <Moon className="w-4 h-4" />
                  <span className="hidden sm:inline truncate">{t('sidebar.rest_day')}</span>
                </button>
                <button
                  onClick={savePlan}
                  disabled={isSaving}
                  className="h-9 w-[130px] flex items-center justify-center gap-2 px-4 md:px-5 py-2 bg-[#a3e635] text-black rounded-xl text-xs md:text-sm font-black hover:bg-[#bef264] transition-all disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span className="hidden sm:inline truncate">Save</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 pb-24 custom-scrollbar min-h-0">
              <DayDropZone isActive={!!activeDrag}>
                {restDays[selectedDayId] ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                      <Moon className="w-10 h-10 text-purple-500" />
                    </div>
                    <h3 className="text-xl font-black text-text-primary mb-2 uppercase">{t('sidebar.rest_day')}</h3>
                    <button
                      onClick={toggleRestDay}
                      className="mt-6 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {t('workout_builder.manage_routine', 'Chuyển sang chế độ tập luyện')}
                    </button>
                  </div>
                ) : (weeklyPlan[selectedDayId]?.length || 0) > 0 ? (
                  <SortableContext
                    items={(weeklyPlan[selectedDayId] || []).map(i => `plan-${i.tempId}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {(weeklyPlan[selectedDayId] || []).map((item) => (
                      <SortableRoutineItem
                        key={item.tempId}
                        item={{ ...item, tempId: `plan-${item.tempId}` }}
                        onDelete={(id) => deleteExercise(id.replace('plan-', ''))}
                        onUpdate={(id, update) => updateExercise(id.replace('plan-', ''), update)}
                      />
                    ))}
                  </SortableContext>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border-primary rounded-2xl text-center group">
                    <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Brain className="w-8 h-8 text-text-tertiary" />
                    </div>
                    <p className="text-sm text-text-tertiary max-w-[240px]">{t('workout_builder.empty_day')}</p>
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
                {activeDrag.type === 'library' ? t('common.add_new', 'Thêm mới') : t('workout_builder.manage_routine')}
              </p>
              <p className="text-sm font-bold text-text-primary uppercase truncate">{activeDrag.name}</p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
