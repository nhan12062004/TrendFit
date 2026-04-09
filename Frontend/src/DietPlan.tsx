import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Trash2, Plus, Save, Loader2, ChevronLeft, ChevronRight, Utensils, Coffee, Sun, Moon as MoonIcon, Cookie, X, Flame, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DndContext, useDraggable, useDroppable, closestCenter, pointerWithin, DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';

// --- Types ---
interface Food {
  id: string;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_unit: string;
  image_url: string;
}

interface PlanFood {
  tempId: string;
  food_id: string;
  name: string;
  image_url: string;
  category: string;
  meal_type: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  is_rest_day: boolean;
}

// --- Constants ---
const DAYS = [
  { id: 0, label_vi: 'T2', full_vi: 'Thứ 2', label_en: 'MON', full_en: 'Monday' },
  { id: 1, label_vi: 'T3', full_vi: 'Thứ 3', label_en: 'TUE', full_en: 'Tuesday' },
  { id: 2, label_vi: 'T4', full_vi: 'Thứ 4', label_en: 'WED', full_en: 'Wednesday' },
  { id: 3, label_vi: 'T5', full_vi: 'Thứ 5', label_en: 'THU', full_en: 'Thursday' },
  { id: 4, label_vi: 'T6', full_vi: 'Thứ 6', label_en: 'FRI', full_en: 'Friday' },
  { id: 5, label_vi: 'T7', full_vi: 'Thứ 7', label_en: 'SAT', full_en: 'Saturday' },
  { id: 6, label_vi: 'CN', full_vi: 'Chủ Nhật', label_en: 'SUN', full_en: 'Sunday' },
];

const MEAL_TYPES = [
  { id: 'breakfast', label_vi: 'Bữa sáng', label_en: 'Breakfast', icon: Coffee, color: '#f59e0b', bgLight: 'rgba(245,158,11,0.08)' },
  { id: 'lunch', label_vi: 'Bữa trưa', label_en: 'Lunch', icon: Sun, color: '#22c55e', bgLight: 'rgba(34,197,94,0.08)' },
  { id: 'dinner', label_vi: 'Bữa tối', label_en: 'Dinner', icon: MoonIcon, color: '#818cf8', bgLight: 'rgba(129,140,248,0.08)' },
  { id: 'snack', label_vi: 'Bữa phụ', label_en: 'Snack', icon: Cookie, color: '#fb923c', bgLight: 'rgba(251,146,60,0.08)' },
];

const FOOD_CATEGORIES = ['Protein', 'Carbs', 'Veggies', 'Fruit', 'Dairy', 'Snack'];

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

// --- Helpers ---
const getDatePartsInTimeZone = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return { year: parts.find(p => p.type === 'year')?.value || '1970', month: parts.find(p => p.type === 'month')?.value || '01', day: parts.find(p => p.type === 'day')?.value || '01' };
};
const getVietnamDateKey = (date = new Date()): string => { const { year, month, day } = getDatePartsInTimeZone(date, VIETNAM_TIMEZONE); return `${year}-${month}-${day}`; };
const getVietnamTodayDate = (): Date => new Date(`${getVietnamDateKey()}T00:00:00`);
const getWeekStart = (baseDate: Date): Date => { const d = new Date(baseDate); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); d.setHours(0, 0, 0, 0); return d; };
const toDateKey = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDaysHelper = (date: Date, days: number): Date => { const n = new Date(date); n.setDate(n.getDate() + days); return n; };
const getTodayDayIndex = (): number => {
  const d = new Intl.DateTimeFormat('en-US', { timeZone: VIETNAM_TIMEZONE, weekday: 'short' }).format(new Date());
  return { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[d] ?? 0;
};
const pickLatestPlan = (plans: any[] | null) => {
  if (!plans?.length) return null;
  return [...plans].sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())[0];
};

// --- Sub Components ---
const NutrientRing = ({ value, target, label, color, unit }: { value: number; target?: number; label: string; color: string; unit: string }) => {
  const pct = target && target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14 sm:w-[68px] sm:h-[68px]">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--bg-tertiary)" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={`${pct} 100`} className="transition-all duration-700 ease-out"
            style={{ filter: `drop-shadow(0 0 4px ${color}40)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs sm:text-sm font-black text-text-primary leading-none tabular-nums">{value}</span>
          <span className="text-[7px] text-text-tertiary font-bold uppercase">{unit}</span>
        </div>
      </div>
      <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-text-tertiary">{label}</span>
    </div>
  );
};

const FoodThumb = ({ src, alt }: { src?: string; alt: string }) => {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [src]);
  const url = String(src || '').trim();
  if (!url || err) return <div className="w-full h-full bg-bg-quaternary flex items-center justify-center text-text-tertiary"><Utensils className="w-4 h-4" /></div>;
  return <img src={url} alt={alt} loading="lazy" className="w-full h-full object-cover" onError={() => setErr(true)} referrerPolicy="no-referrer" />;
};

// --- Add New Food Modal ---
const AddNewFoodModal = ({ isOpen, onClose, currentLang, onCreated }: {
  isOpen: boolean; onClose: () => void; currentLang: string; onCreated: (food: Food) => void;
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Protein');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [servingUnit, setServingUnit] = useState('100g');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('foods').insert({
        name: name.trim(), category, calories: Number(calories) || 0,
        protein: Number(protein) || 0, carbs: Number(carbs) || 0, fat: Number(fat) || 0,
        serving_unit: servingUnit
      }).select('*').single();
      if (error) throw error;
      onCreated({
        id: data.id, name: data.name, category: data.category || '',
        calories: Number(data.calories || 0), protein: Number(data.protein || 0),
        carbs: Number(data.carbs || 0), fat: Number(data.fat || 0),
        serving_unit: data.serving_unit || '100g', image_url: data.image_url || ''
      });
      setName(''); setCalories(''); setProtein(''); setCarbs(''); setFat('');
      onClose();
    } catch (e: any) { alert('Error: ' + e.message); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-bg-secondary border border-border-primary rounded-2xl p-5 mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-text-primary">{currentLang === 'vi' ? 'Thêm món mới' : 'Add New Food'}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center text-text-tertiary hover:text-text-primary"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{currentLang === 'vi' ? 'Tên món' : 'Food name'}</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Ức gà áp chảo"
              className="w-full mt-1 bg-bg-tertiary border border-border-primary rounded-xl py-2.5 px-3 text-sm focus:border-[#a3e635] outline-none text-text-primary" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{currentLang === 'vi' ? 'Danh mục' : 'Category'}</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full mt-1 bg-bg-tertiary border border-border-primary rounded-xl py-2.5 px-3 text-sm focus:border-[#a3e635] outline-none text-text-primary">
                {FOOD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{currentLang === 'vi' ? 'Đơn vị' : 'Serving'}</label>
              <input value={servingUnit} onChange={e => setServingUnit(e.target.value)}
                className="w-full mt-1 bg-bg-tertiary border border-border-primary rounded-xl py-2.5 px-3 text-sm focus:border-[#a3e635] outline-none text-text-primary" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] font-bold text-text-tertiary uppercase">Kcal</label>
              <input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="0"
                className="w-full mt-1 bg-bg-tertiary border border-border-primary rounded-xl py-2 px-2 text-sm text-center focus:border-[#a3e635] outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-blue-400 uppercase">P (g)</label>
              <input type="number" value={protein} onChange={e => setProtein(e.target.value)} placeholder="0"
                className="w-full mt-1 bg-bg-tertiary border border-border-primary rounded-xl py-2 px-2 text-sm text-center focus:border-blue-400 outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-amber-400 uppercase">C (g)</label>
              <input type="number" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="0"
                className="w-full mt-1 bg-bg-tertiary border border-border-primary rounded-xl py-2 px-2 text-sm text-center focus:border-amber-400 outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-orange-400 uppercase">F (g)</label>
              <input type="number" value={fat} onChange={e => setFat(e.target.value)} placeholder="0"
                className="w-full mt-1 bg-bg-tertiary border border-border-primary rounded-xl py-2 px-2 text-sm text-center focus:border-orange-400 outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="w-full h-10 flex items-center justify-center gap-2 bg-[#a3e635] text-black rounded-xl text-sm font-black hover:bg-[#bef264] transition-all disabled:opacity-50 mt-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {currentLang === 'vi' ? 'Tạo món ăn' : 'Create Food'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Meal Section ---
const MealSection = ({ mealType, items, currentLang, onAdd, onDelete, onUpdateQty }: {
  mealType: typeof MEAL_TYPES[0]; items: PlanFood[]; currentLang: string;
  onAdd: () => void; onDelete: (id: string) => void; onUpdateQty: (id: string, qty: number) => void;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `droppable-${mealType.id}`,
    data: { mealType: mealType.id }
  });
  const Icon = mealType.icon;
  const totalCal = items.reduce((s, i) => s + Math.round(i.calories * i.quantity), 0);

  return (
    <div ref={setNodeRef} className={`bg-bg-secondary border rounded-2xl overflow-hidden transition-all duration-200 ${isOver ? 'border-[#a3e635] ring-1 ring-inset ring-[#a3e635] bg-[#a3e635]/10' : 'border-border-primary'}`}>
      <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: items.length > 0 ? '1px solid var(--border-primary)' : 'none' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: mealType.bgLight }}>
            <Icon className="w-3.5 h-3.5" style={{ color: mealType.color }} />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary">{currentLang === 'vi' ? mealType.label_vi : mealType.label_en}</h4>
            {items.length > 0 && <span className="text-[9px] text-text-tertiary">{items.length} {currentLang === 'vi' ? 'món' : 'items'} • {totalCal} kcal</span>}
          </div>
        </div>
        <button onClick={onAdd} className="h-7 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all border"
          style={{ borderColor: `${mealType.color}40`, backgroundColor: mealType.bgLight, color: mealType.color }}>
          <Plus className="w-3 h-3" /> {currentLang === 'vi' ? 'Thêm' : 'Add'}
        </button>
      </div>
      {items.length > 0 && (
        <div className="p-1.5 space-y-1">
          {items.map(item => {
            const cal = Math.round(item.calories * item.quantity);
            return (
              <div key={item.tempId} className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-bg-quaternary overflow-hidden shrink-0"><FoodThumb src={item.image_url} alt={item.name} /></div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-[11px] font-bold text-text-primary truncate">{item.name}</h5>
                  <div className="flex gap-1.5 text-[8px] text-text-tertiary">
                    <span className="text-[#a3e635] font-bold">{cal}kcal</span>
                    <span>P:{Math.round(item.protein * item.quantity * 10) / 10}g</span>
                    <span>C:{Math.round(item.carbs * item.quantity * 10) / 10}g</span>
                    <span>F:{Math.round(item.fat * item.quantity * 10) / 10}g</span>
                  </div>
                </div>
                <input type="number" value={item.quantity === 0 ? '' : item.quantity}
                  onChange={e => onUpdateQty(item.tempId, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  step="0.5" min="0.5"
                  className="w-11 bg-bg-quaternary border border-border-primary rounded-lg px-1 py-0.5 text-[11px] text-center focus:border-[#a3e635] outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                <button onClick={() => onDelete(item.tempId)} className="p-1 text-text-tertiary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- Food Library Item (Draggable) ---
const FoodLibraryItem = ({ food, onAdd }: { food: Food; onAdd: (f: Food) => void }) => {
  const dragId = `food-library-${food.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { type: 'food', food }
  });
  const style = { opacity: isDragging ? 0.4 : 1, touchAction: 'none' };

  return (
    <motion.div ref={setNodeRef} style={style} {...listeners} {...attributes}
      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
      className="w-full bg-bg-tertiary/50 border border-border-primary rounded-xl px-2.5 py-2 flex items-center gap-2 group hover:border-[#a3e635] transition-all text-left relative z-10 cursor-grab active:cursor-grabbing">
      <div className="w-9 h-9 rounded-lg bg-bg-quaternary overflow-hidden shrink-0 pointer-events-none"><FoodThumb src={food.image_url} alt={food.name} /></div>
      <div className="flex-1 min-w-0 pointer-events-none">
        <h4 className="text-[11px] font-bold text-text-primary truncate">{food.name}</h4>
        <div className="flex gap-1.5 text-[8px] text-text-tertiary">
          <span className="text-[#a3e635] font-bold">{food.calories}kcal</span>
          <span>P:{food.protein}g</span>
          <span>C:{food.carbs}g</span>
          <span>F:{food.fat}g</span>
        </div>
      </div>
      <button type="button" onClick={(e) => { e.stopPropagation(); onAdd(food); }} className="w-6 h-6 rounded-full bg-bg-quaternary flex items-center justify-center text-text-tertiary hover:bg-[#a3e635] hover:text-black transition-colors shrink-0 pointer-events-auto">
        <Plus className="w-3 h-3" />
      </button>
    </motion.div>
  );
};

// ===== MAIN COMPONENT =====
export default function DietPlan() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const currentLang = i18n.language;

  const [foods, setFoods] = useState<Food[]>([]);
  const [selectedDayId, setSelectedDayId] = useState(getTodayDayIndex());
  const [weeklyPlan, setWeeklyPlan] = useState<Record<number, PlanFood[]>>({});
  const [restDays, setRestDays] = useState<Record<number, boolean>>({});
  const [planId, setPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('Diet Plan');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => getWeekStart(getVietnamTodayDate()));
  const [targetCalories, setTargetCalories] = useState(0);
  const [activeDrag, setActiveDrag] = useState<Food | null>(null);
  const [isMobileLibraryOpen, setIsMobileLibraryOpen] = useState(false);

  // Food library
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [activeMealType, setActiveMealType] = useState('breakfast');

  // Modals
  const [addFoodModalOpen, setAddFoodModalOpen] = useState(false);

  const dayRefs = React.useRef<Map<number, HTMLButtonElement>>(new Map());

  const selectedWeekKey = useMemo(() => toDateKey(selectedWeekStart), [selectedWeekStart]);
  const selectedWeekLabel = useMemo(() => {
    const end = addDaysHelper(selectedWeekStart, 6);
    return `${selectedWeekStart.toLocaleDateString(currentLang, { day: '2-digit', month: '2-digit' })} — ${end.toLocaleDateString(currentLang, { day: '2-digit', month: '2-digit' })}`;
  }, [selectedWeekStart, currentLang]);
  const isCurrentWeek = useMemo(() => selectedWeekKey === toDateKey(getWeekStart(getVietnamTodayDate())), [selectedWeekKey]);
  const todayKey = useMemo(() => getVietnamDateKey(), [selectedWeekKey]);

  const goPrevWeek = () => setSelectedWeekStart(prev => getWeekStart(addDaysHelper(prev, -7)));
  const goNextWeek = () => setSelectedWeekStart(prev => getWeekStart(addDaysHelper(prev, 7)));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { if (isCurrentWeek) setSelectedDayId(getTodayDayIndex()); }, [isCurrentWeek, selectedWeekKey]);

  React.useEffect(() => {
    const target = dayRefs.current.get(selectedDayId);
    if (!isLoading && target) {
      const timer = setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }), 100);
      return () => clearTimeout(timer);
    }
  }, [selectedDayId, selectedWeekKey, isLoading]);

  // Fetch foods
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('foods').select('*').order('name');
        if (data) setFoods(data.map((f: any) => ({
          id: f.id, name: f.name || '', category: f.category || '', calories: Number(f.calories || 0),
          protein: Number(f.protein || 0), carbs: Number(f.carbs || 0), fat: Number(f.fat || 0),
          serving_unit: f.serving_unit || '100g', image_url: f.image_url || ''
        })));
      } catch (e) { console.error(e); }
    })();
  }, []);

  // Fetch target calories
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase.from('lifestyle_settings').select('target_calories').eq('user_id', user.id).maybeSingle();
        if (data?.target_calories) setTargetCalories(Number(data.target_calories));
      } catch (e) { console.error(e); }
    })();
  }, [user]);

  // Fetch weekly plan
  useEffect(() => {
    (async () => {
      try {
        let np: string | null = null, nn = 'Diet Plan';
        let nw: Record<number, PlanFood[]> = {}, nr: Record<number, boolean> = {};
        if (user) {
          const { data: plans, error } = await supabase.from('weekly_food_plans').select('*').eq('user_id', user.id).eq('week_start_date', selectedWeekKey).limit(20);
          if (error) throw error;
          const plan = pickLatestPlan(plans);
          if (plan) {
            np = plan.id; nn = plan.name || 'Diet Plan';
            const { data: items } = await supabase
              .from('weekly_food_items')
              .select('*, foods:food_id (name, image_url, category, calories, protein, carbs, fat, serving_unit)')
              .eq('food_plan_id', plan.id).order('order_index');
            if (items) items.forEach((item: any) => {
              const day = item.day_of_week;
              if (!nw[day]) nw[day] = [];
              const j = item.foods || {}; const d = foods.find(f => f.id === item.food_id);
              nw[day].push({
                tempId: item.id, food_id: item.food_id,
                name: j?.name || d?.name || 'Food', image_url: j?.image_url || d?.image_url || '',
                category: j?.category || d?.category || '', meal_type: item.meal_type || 'breakfast',
                quantity: Number(item.quantity || 1), calories: Number(j?.calories || d?.calories || item.calories || 0),
                protein: Number(j?.protein || d?.protein || item.protein || 0), carbs: Number(j?.carbs || d?.carbs || item.carbs || 0),
                fat: Number(j?.fat || d?.fat || item.fat || 0), is_rest_day: item.is_rest_day
              });
              if (item.is_rest_day) nr[day] = true;
            });
          }
        }
        setPlanId(np); setPlanName(nn); setWeeklyPlan(nw); setRestDays(nr);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    })();
  }, [user, selectedWeekKey, foods]);

  // Derived
  const filteredFoods = useMemo(() => foods.filter(f => {
    const ms = f.name.toLowerCase().includes(search.toLowerCase());
    const mc = filterCat === 'all' || f.category.toLowerCase() === filterCat.toLowerCase();
    return ms && mc;
  }), [foods, search, filterCat]);

  const dayItems = weeklyPlan[selectedDayId] || [];
  const dayNutritionRaw = useMemo(() => dayItems.reduce((acc, i) => ({
    calories: acc.calories + i.calories * i.quantity,
    protein: acc.protein + i.protein * i.quantity,
    carbs: acc.carbs + i.carbs * i.quantity,
    fat: acc.fat + i.fat * i.quantity,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [dayItems]);

  const dayNutrition = useMemo(() => ({
    calories: Math.round(dayNutritionRaw.calories),
    protein: Math.round(dayNutritionRaw.protein * 10) / 10,
    carbs: Math.round(dayNutritionRaw.carbs * 10) / 10,
    fat: Math.round(dayNutritionRaw.fat * 10) / 10,
  }), [dayNutritionRaw]);

  // Actions
  const addFoodToPlan = useCallback((food: Food) => {
    setWeeklyPlan(prev => ({
      ...prev,
      [selectedDayId]: [...(prev[selectedDayId] || []), {
        tempId: Math.random().toString(36).substr(2, 9),
        food_id: food.id, name: food.name, image_url: food.image_url, category: food.category,
        meal_type: activeMealType, quantity: 1, calories: food.calories, protein: food.protein,
        carbs: food.carbs, fat: food.fat, is_rest_day: false
      }]
    }));
    setRestDays(prev => ({ ...prev, [selectedDayId]: false }));
    setIsMobileLibraryOpen(false); // Close library on mobile after adding
  }, [selectedDayId, activeMealType]);

  const deleteFood = (tempId: string) => setWeeklyPlan(prev => ({
    ...prev, [selectedDayId]: (prev[selectedDayId] || []).filter(i => i.tempId !== tempId)
  }));

  const updateFoodQty = (tempId: string, qty: number) => setWeeklyPlan(prev => ({
    ...prev, [selectedDayId]: (prev[selectedDayId] || []).map(i => i.tempId === tempId ? { ...i, quantity: qty } : i)
  }));

  const savePlan = async () => {
    if (!user) return alert('Vui lòng đăng nhập!');
    setIsSaving(true);
    try {
      let pid = planId;
      if (!pid) {
        const { data: ep } = await supabase.from('weekly_food_plans').select('*').eq('user_id', user.id).eq('week_start_date', selectedWeekKey).limit(20);
        const existing = pickLatestPlan(ep); if (existing?.id) pid = existing.id;
      }
      if (!pid) {
        const { data: np, error } = await supabase.from('weekly_food_plans').insert({ user_id: user.id, name: planName, week_start_date: selectedWeekKey }).select('id').single();
        if (error) throw error; pid = np.id;
      } else {
        const { error } = await supabase.from('weekly_food_plans').update({ name: planName, week_start_date: selectedWeekKey, updated_at: new Date().toISOString() }).eq('id', pid);
        if (error) throw error;
      }
      setPlanId(pid);
      await supabase.from('weekly_food_items').delete().eq('food_plan_id', pid);
      const all: any[] = [];
      DAYS.forEach(({ id: dayIdx }) => {
        const df = weeklyPlan[dayIdx] || [];
        if (restDays[dayIdx]) {
          all.push({ food_plan_id: pid, day_of_week: dayIdx, meal_type: 'breakfast', is_rest_day: true, order_index: 0 });
        } else {
          df.forEach((item, idx) => all.push({
            food_plan_id: pid, day_of_week: dayIdx, meal_type: item.meal_type, food_id: item.food_id,
            quantity: item.quantity, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat, order_index: idx
          }));
        }
      });
      if (all.length > 0) { const { error } = await supabase.from('weekly_food_items').insert(all); if (error) throw error; }
      alert(currentLang === 'vi' ? 'Đã lưu thành công!' : 'Saved successfully!');
    } catch (e: any) { alert('Error: ' + e.message); }
    finally { setIsSaving(false); }
  };

  const handleDragStart = (event: any) => {
    const food = event.active.data.current?.food as Food;
    if (food) setActiveDrag(food);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;
    const food = active.data.current?.food as Food;
    const mealTypeId = over.data.current?.mealType as string;
    if (food && mealTypeId) {
      setWeeklyPlan(prev => ({
        ...prev,
        [selectedDayId]: [...(prev[selectedDayId] || []), {
          tempId: Math.random().toString(36).substr(2, 9),
          food_id: food.id, name: food.name, image_url: food.image_url, category: food.category,
          meal_type: mealTypeId, quantity: 1, calories: food.calories, protein: food.protein,
          carbs: food.carbs, fat: food.fat, is_rest_day: false
        }]
      }));
      setRestDays(prev => ({ ...prev, [selectedDayId]: false }));
    }
  };

  const handleNewFoodCreated = (food: Food) => { setFoods(prev => [...prev, food].sort((a, b) => a.name.localeCompare(b.name))); };

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#a3e635]" /></div>;

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDrag(null)}>
      <div className="flex-1 w-full h-auto md:h-[calc(100vh-80px-3rem)] overflow-visible md:overflow-hidden min-h-0">
        <div className="h-full flex flex-col min-h-0 gap-3">

          {/* ========== TOP BAR ========== */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#a3e635]/10 text-[#a3e635] flex items-center justify-center shrink-0"><Utensils className="w-4 h-4" /></div>
              <input type="text" value={planName} onChange={e => setPlanName(e.target.value)}
                className="text-lg sm:text-xl font-black text-text-primary bg-transparent border-none outline-none focus:ring-0 p-0 w-full sm:w-auto" placeholder="Diet Plan" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setSelectedWeekStart(getWeekStart(getVietnamTodayDate()))} disabled={isCurrentWeek}
                className={`h-7 px-2 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${isCurrentWeek ? 'border-border-primary bg-bg-tertiary text-text-tertiary cursor-not-allowed opacity-60' : 'border-[#a3e635]/30 bg-[#a3e635]/10 text-[#a3e635] hover:bg-[#a3e635]/20'}`}>
                {currentLang === 'vi' ? 'Tuần này' : 'This week'}
              </button>
              <button onClick={goPrevWeek} className="h-7 w-7 rounded-lg border border-border-primary bg-bg-tertiary text-text-secondary hover:text-text-primary flex items-center justify-center"><ChevronLeft className="w-3.5 h-3.5" /></button>
              <div className="h-7 rounded-lg border border-border-primary bg-bg-tertiary px-2 flex items-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-text-secondary uppercase tracking-wide whitespace-nowrap">{selectedWeekLabel}</span>
              </div>
              <button onClick={goNextWeek} className="h-7 w-7 rounded-lg border border-border-primary bg-bg-tertiary text-text-secondary hover:text-text-primary flex items-center justify-center"><ChevronRight className="w-3.5 h-3.5" /></button>
              <button onClick={savePlan} disabled={isSaving}
                className="h-7 px-3 flex items-center gap-1.5 bg-[#a3e635] text-black rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-[#bef264] transition-all disabled:opacity-50">
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
              </button>
            </div>
          </div>

          {/* ========== 2-COLUMN LAYOUT ========== */}
          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)] gap-4 min-h-0 pb-6 md:pb-0">

            {/* ===== RIGHT: Schedule ===== */}
            <div className="flex flex-col gap-3 min-h-0 overflow-y-auto md:overflow-y-auto custom-scrollbar order-2 md:order-last">

              {/* Nutrition Summary */}
              <div className="bg-bg-secondary border border-border-primary rounded-2xl p-3 sm:p-4 shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-3.5 h-3.5 text-[#a3e635]" />
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">
                    {currentLang === 'vi' ? `Dinh dưỡng — ${DAYS[selectedDayId].full_vi}` : `Nutrition — ${DAYS[selectedDayId].full_en}`}
                  </h3>
                </div>
                <div className="flex items-center justify-around">
                  <NutrientRing value={dayNutrition.calories} target={targetCalories || undefined} label="Calories" color="#a3e635" unit="kcal" />
                  <NutrientRing value={dayNutrition.protein} target={targetCalories ? Math.round(targetCalories * 0.3 / 4) : undefined} label="Protein" color="#60a5fa" unit="g" />
                  <NutrientRing value={dayNutrition.carbs} target={targetCalories ? Math.round(targetCalories * 0.4 / 4) : undefined} label="Carbs" color="#fbbf24" unit="g" />
                  <NutrientRing value={dayNutrition.fat} target={targetCalories ? Math.round(targetCalories * 0.3 / 9) : undefined} label="Fat" color="#fb923c" unit="g" />
                </div>
              </div>

              {/* Day Selector */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scroll-smooth snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-0">
                {DAYS.map(day => {
                  const dayDate = addDaysHelper(selectedWeekStart, day.id);
                  const isToday = toDateKey(dayDate) === todayKey;
                  const count = (weeklyPlan[day.id] || []).length;
                  const isSel = selectedDayId === day.id;
                  return (
                    <button key={day.id}
                      ref={el => { if (el) dayRefs.current.set(day.id, el); else dayRefs.current.delete(day.id); }}
                      onClick={() => setSelectedDayId(day.id)}
                      className={`flex-1 min-w-[48px] py-2 rounded-xl border transition-all flex flex-col items-center gap-0.5 snap-center ${
                        isSel ? 'bg-[#a3e635] text-black border-[#a3e635] shadow-lg shadow-[#a3e635]/20'
                          : isToday ? 'bg-bg-secondary text-text-secondary border-[#a3e635]/40'
                            : 'bg-bg-secondary text-text-secondary border-border-primary hover:border-border-secondary'
                      }`}>
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${isSel ? 'text-black' : 'text-text-tertiary'}`}>
                        {currentLang === 'vi' ? day.label_vi : day.label_en}
                      </span>
                      <span className={`text-[8px] font-bold ${isSel ? 'text-black/60' : isToday ? 'text-[#a3e635]' : 'text-text-tertiary'}`}>
                        {dayDate.toLocaleDateString(currentLang, { day: '2-digit', month: '2-digit' })}
                      </span>
                      <span className={`text-[7px] font-bold ${isSel ? 'text-black/50' : 'text-text-tertiary'}`}>
                        {restDays[day.id] ? '💤' : count > 0 ? `${count} 🍽️` : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Meal Sections */}
              {restDays[selectedDayId] ? (
                <div className="flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mb-3"><MoonIcon className="w-8 h-8 text-purple-500" /></div>
                  <h3 className="text-lg font-black text-text-primary mb-1 uppercase">{currentLang === 'vi' ? 'Ngày nghỉ' : 'Rest Day'}</h3>
                  <button onClick={() => setRestDays(prev => ({ ...prev, [selectedDayId]: false }))} className="mt-3 text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors">
                    {currentLang === 'vi' ? 'Bắt đầu lên thực đơn' : 'Start planning'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {MEAL_TYPES.map(meal => (
                    <MealSection key={meal.id} mealType={meal}
                      items={dayItems.filter(i => i.meal_type === meal.id)} currentLang={currentLang}
                      onAdd={() => { setActiveMealType(meal.id); setIsMobileLibraryOpen(true); }} onDelete={deleteFood} onUpdateQty={updateFoodQty} />
                  ))}
                </div>
              )}
            </div>

            {/* ===== Mobile Overlay ===== */}
            {isMobileLibraryOpen && (
              <div className="fixed inset-0 bg-black/60 z-40 md:hidden animate-in fade-in" onClick={() => setIsMobileLibraryOpen(false)} />
            )}

            {/* ===== LEFT: Food Library ===== */}
            <aside className={`bg-bg-secondary border border-border-primary flex-col overflow-hidden min-h-0 order-1 md:order-first z-50 md:z-0 transition-transform duration-300 md:transition-none
              fixed md:relative bottom-3 md:bottom-0 left-3 right-3 md:left-0 md:right-0 h-[85vh] md:h-auto rounded-3xl md:rounded-2xl w-auto md:w-full
              hidden md:flex
              ${isMobileLibraryOpen ? '!flex translate-y-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]' : 'translate-y-full md:translate-y-0'}`}>
              {/* Library Header */}
              <div className="p-3 border-b border-border-primary shrink-0">
                {/* Mobile Close Indicator */}
                <div className="w-12 h-1.5 bg-border-primary rounded-full mx-auto mb-3 md:hidden" onClick={() => setIsMobileLibraryOpen(false)} />
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-text-tertiary">
                    {currentLang === 'vi' ? 'Thư viện thức ăn' : 'Food Library'}
                  </h3>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setAddFoodModalOpen(true)}
                      className="h-6 px-2 rounded-lg bg-[#a3e635]/10 border border-[#a3e635]/30 text-[#a3e635] text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 hover:bg-[#a3e635]/20 transition-colors">
                      <PlusCircle className="w-3 h-3" /> {currentLang === 'vi' ? 'Tạo mới' : 'New'}
                    </button>
                    <button onClick={() => setIsMobileLibraryOpen(false)} className="md:hidden w-6 h-6 rounded-full bg-bg-tertiary flex items-center justify-center text-text-tertiary">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                  <input type="text" placeholder={currentLang === 'vi' ? 'Tìm món ăn...' : 'Search...'} value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-bg-tertiary border border-border-primary rounded-lg py-1.5 pl-8 pr-3 text-xs focus:border-[#a3e635] outline-none text-text-primary" />
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <button onClick={() => setFilterCat('all')} className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider transition-all ${filterCat === 'all' ? 'bg-[#a3e635] text-black' : 'bg-bg-tertiary text-text-tertiary hover:text-text-primary'}`}>
                    {currentLang === 'vi' ? 'Tất cả' : 'All'}
                  </button>
                  {FOOD_CATEGORIES.map(c => (
                    <button key={c} onClick={() => setFilterCat(c)} className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider transition-all ${filterCat === c ? 'bg-[#a3e635] text-black' : 'bg-bg-tertiary text-text-tertiary hover:text-text-primary'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food List */}
              <div className="flex-1 overflow-y-auto mb:max-h-none p-2 custom-scrollbar space-y-1.5 min-h-0">
                {filteredFoods.map(food => (
                  <FoodLibraryItem key={food.id} food={food} onAdd={addFoodToPlan} />
                ))}
                {filteredFoods.length === 0 && (
                  <div className="text-center py-6 text-text-tertiary">
                    <Utensils className="w-6 h-6 mx-auto mb-2 opacity-20" />
                    <p className="text-[10px]">{currentLang === 'vi' ? 'Không tìm thấy' : 'Not found'}</p>
                  </div>
                )}
              </div>
            </aside>

          </div>
        </div>
      </div>

      {/* Add New Food Modal */}
      <AddNewFoodModal isOpen={addFoodModalOpen} onClose={() => setAddFoodModalOpen(false)} currentLang={currentLang} onCreated={handleNewFoodCreated} />

      <DragOverlay>
        {activeDrag ? (
          <div className="bg-bg-secondary border border-[#a3e635]/60 rounded-xl p-3 flex items-center gap-3 shadow-2xl w-[260px]">
            <div className="w-10 h-10 rounded-lg bg-bg-quaternary overflow-hidden shrink-0">
              <FoodThumb src={activeDrag.image_url} alt={activeDrag.name} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-text-tertiary uppercase font-bold text-[#a3e635]">Drag to add</p>
              <p className="text-sm font-bold text-text-primary truncate">{activeDrag.name}</p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
