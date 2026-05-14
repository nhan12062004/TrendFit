import { Search, Moon, Sun, Bell, Menu, LogIn, Dumbbell, Utensils, Home, Timer, Blocks, Brain, ChevronRight, X, Loader2, Flame } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

function normalizeViet(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
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

const addDaysToDateKey = (dateKey: string, days: number): string => {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  return getVietnamDateKey(d);
};

const calculateWorkoutStreak = (completedDateKeys: string[], todayKey: string): number => {
  const completedSet = new Set(completedDateKeys);
  let streak = 0;
  let cursor = todayKey;

  if (!completedSet.has(cursor)) {
    cursor = addDaysToDateKey(cursor, -1);
  }

  while (completedSet.has(cursor)) {
    streak += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }

  return streak;
};

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'exercise' | 'diet' | 'page' | 'workout';
  href: string;
}

type PageIcon = 'home' | 'brain' | 'dumbbell' | 'utensils' | 'timer' | 'blocks';

const STATIC_PAGES: (SearchResult & { pageIcon: PageIcon; badge?: string })[] = [
  { id: 'overview',        title: 'Tổng quan',          subtitle: 'Trang chủ & thống kê',   type: 'page', href: '/overview',        pageIcon: 'home' },
  { id: 'smart-planner',  title: 'Lập kế hoạch AI',    subtitle: 'AI tự động lên lịch',    type: 'page', href: '/smart-planner',  pageIcon: 'brain',    badge: 'Mới' },
  { id: 'exercises',      title: 'Bài tập',             subtitle: 'Lịch tập hôm nay',       type: 'page', href: '/exercises',       pageIcon: 'dumbbell' },
  { id: 'diet-plan',      title: 'Chế độ ăn',           subtitle: 'Thực đơn & calo',        type: 'page', href: '/diet-plan',       pageIcon: 'utensils' },
  { id: 'workout-timer',  title: 'Đồng hồ bấm giờ',    subtitle: 'Timer & đếm ngược',      type: 'page', href: '/workout-timer',   pageIcon: 'timer' },
  { id: 'workout-builder',title: 'Tạo bài tập',         subtitle: 'Tạo kế hoạch tuần',     type: 'page', href: '/workout-builder',  pageIcon: 'blocks' },
];

const PAGE_ICON_MAP: Record<PageIcon, { Icon: React.ElementType; bg: string; color: string }> = {
  home:      { Icon: Home,     bg: 'bg-[#a3e635]/10', color: 'text-[#a3e635]' },
  brain:     { Icon: Brain,    bg: 'bg-orange-500/10', color: 'text-orange-400' },
  dumbbell:  { Icon: Dumbbell, bg: 'bg-[#a3e635]/10', color: 'text-[#a3e635]' },
  utensils:  { Icon: Utensils, bg: 'bg-blue-500/10',  color: 'text-blue-400' },
  timer:     { Icon: Timer,    bg: 'bg-purple-500/10', color: 'text-purple-400' },
  blocks:    { Icon: Blocks,   bg: 'bg-pink-500/10',   color: 'text-pink-400' },
};

function ResultIcon({ type, pageIcon }: { type: string; pageIcon?: PageIcon }) {
  const base = 'w-8 h-8 rounded-xl flex items-center justify-center shrink-0';

  if (type === 'exercise') return <div className={`${base} bg-[#a3e635]/10`}><Dumbbell className="w-4 h-4 text-[#a3e635]" /></div>;
  if (type === 'diet')     return <div className={`${base} bg-blue-500/10`}><Utensils className="w-4 h-4 text-blue-400" /></div>;

  if (pageIcon && PAGE_ICON_MAP[pageIcon]) {
    const { Icon, bg, color } = PAGE_ICON_MAP[pageIcon];
    return <div className={`${base} ${bg}`}><Icon className={`w-4 h-4 ${color}`} /></div>;
  }
  return <div className={`${base} bg-bg-tertiary`}><Home className="w-4 h-4 text-text-secondary" /></div>;
}

export default function TopBar({ onMenuClick, onProfileClick }: { onMenuClick?: () => void, onProfileClick?: () => void }) {
  const [isLightMode, setIsLightMode] = useState(false);
  const { isLoggedIn, openAuthModal, user, profile } = useAuth();
  const navigate = useNavigate();

  const rawName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Thành viên";
  const nameParts = rawName.trim().split(/\s+/);
  const userName = nameParts.length > 1
    ? `${nameParts[nameParts.length - 1]} ${nameParts[0]}`
    : rawName;
  const userInitial = nameParts[nameParts.length - 1]?.charAt(0).toUpperCase() || rawName.charAt(0).toUpperCase() || '?';


  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLightMode]);

  useEffect(() => {
    const fetchStreak = async () => {
      if (!isLoggedIn || !user) {
        setStreakDays(0);
        return;
      }
      const today = getVietnamDateKey();
      const { data: completedDays } = await supabase
        .from('daily_exercise_sessions')
        .select('log_date')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('log_date', { ascending: false })
        .limit(180);

      if (completedDays) {
        const completedDateKeys = Array.from(
          new Set(completedDays.map((row: any) => String(row.log_date || '')).filter(Boolean))
        );
        setStreakDays(calculateWorkoutStreak(completedDateKeys, today));
      } else {
        setStreakDays(0);
      }
    };
    fetchStreak();
  }, [isLoggedIn, user]);


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    setIsOpen(true);
    setActiveIndex(-1);

    try {
      const lower = normalizeViet(trimmed);

      // 1. Static pages (hỗ trợ tìm không dấu)
      const pageResults = STATIC_PAGES.filter(p =>
        normalizeViet(p.title).includes(lower) ||
        normalizeViet(p.subtitle).includes(lower)
      );

      // 2. Exercises from DB
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id, name, target_muscle, body_part')
        .ilike('name', `%${trimmed}%`)
        .limit(6);

      const exerciseResults: SearchResult[] = (exercises || []).map((ex: any) => ({
        id: `ex-${ex.id}`,
        title: ex.name,
        subtitle: [ex.target_muscle, ex.body_part].filter(Boolean).join(' • '),
        type: 'exercise' as const,
        href: '/exercises',
      }));

      setResults([...pageResults, ...exerciseResults]);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(val), 280);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[activeIndex] ?? results[0];
      if (item) navigateToResult(item);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const navigateToResult = (item: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    navigate(item.href);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const showSuggestions = !query.trim() && isOpen;

  return (
    <header className="h-[72px] md:h-20 px-4 md:px-8 flex items-center justify-between border-b border-border-primary bg-bg-primary sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <button className="lg:hidden text-text-secondary hover:text-text-primary transition-colors" onClick={onMenuClick}>
          <Menu className="w-6 h-6" />
        </button>


        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm kiếm bài tập, thực đơn,..."
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.trim() && results.length > 0) setIsOpen(true);
              else if (!query.trim()) setIsOpen(true);
            }}
            className="w-full bg-bg-secondary border border-border-primary rounded-full py-3 pl-12 pr-10 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-[#a3e635] transition-colors"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary animate-spin" />
          )}
          {!isSearching && query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}


          {isOpen && (
            <div
              ref={dropdownRef}
              className="absolute top-full mt-2 left-0 right-0 bg-bg-secondary border border-border-primary rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50"
              style={{ backdropFilter: 'blur(12px)' }}
            >

              {query.trim() ? (
                results.length > 0 ? (
                  <div className="py-2 max-h-80 overflow-y-auto custom-scrollbar">

                    {results.filter(r => r.type === 'page').length > 0 && (
                      <>
                        <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Trang</p>
                        {results.filter(r => r.type === 'page').map((item, i) => {
                          const globalIdx = results.indexOf(item);
                          return (
                            <button
                              key={item.id}
                              onClick={() => navigateToResult(item)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-tertiary transition-colors group ${activeIndex === globalIdx ? 'bg-bg-tertiary' : ''}`}
                            >
                              <ResultIcon type={item.type} pageIcon={(item as any).pageIcon} />
                              <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-semibold text-text-primary truncate group-hover:text-[#a3e635] transition-colors">{item.title}</p>
                                <p className="text-xs text-text-tertiary truncate">{item.subtitle}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                          );
                        })}
                      </>
                    )}

                    {results.filter(r => r.type === 'exercise').length > 0 && (
                      <>
                        <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-text-tertiary border-t border-border-primary mt-1">Bài tập</p>
                        {results.filter(r => r.type === 'exercise').map((item) => {
                          const globalIdx = results.indexOf(item);
                          return (
                            <button
                              key={item.id}
                              onClick={() => navigateToResult(item)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-tertiary transition-colors group ${activeIndex === globalIdx ? 'bg-bg-tertiary' : ''}`}
                            >
                              <ResultIcon type={item.type} />
                              <div className="flex-1 text-left min-w-0">
                                <p className="text-sm font-semibold text-text-primary truncate group-hover:text-[#a3e635] transition-colors">{item.title}</p>
                                <p className="text-xs text-text-tertiary truncate">{item.subtitle}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                ) : !isSearching ? (
                  <div className="py-8 text-center">
                    <Search className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                    <p className="text-sm text-text-tertiary">Không tìm thấy kết quả cho "<span className="text-text-secondary font-medium">{query}</span>"</p>
                  </div>
                ) : null
              ) : (

                <div className="py-2">
                  <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-text-tertiary">Truy cập nhanh</p>
                    {STATIC_PAGES.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigateToResult(item)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-tertiary transition-colors group"
                    >
                      <ResultIcon type={item.type} pageIcon={item.pageIcon} />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate group-hover:text-[#a3e635] transition-colors">{item.title}</p>
                        <p className="text-xs text-text-tertiary truncate">{item.subtitle}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black bg-orange-500 text-white">{item.badge}</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              )}


              <div className="border-t border-border-primary px-3 py-2 flex items-center gap-3">
                <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                  <kbd className="bg-bg-tertiary border border-border-secondary rounded px-1 py-0.5 text-[9px] font-mono">↑↓</kbd> điều hướng
                </span>
                <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                  <kbd className="bg-bg-tertiary border border-border-secondary rounded px-1 py-0.5 text-[9px] font-mono">↵</kbd> chọn
                </span>
                <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                  <kbd className="bg-bg-tertiary border border-border-secondary rounded px-1 py-0.5 text-[9px] font-mono">Esc</kbd> đóng
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">

        <button
          onClick={() => setIsLightMode(!isLightMode)}
          className="text-text-secondary hover:text-text-primary transition-colors hidden sm:block"
        >
          {isLightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="text-text-secondary hover:text-text-primary transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-[#a3e635] rounded-full"></span>
        </button>



        {isLoggedIn ? (
          <div className="flex items-center gap-3 cursor-pointer group" onClick={onProfileClick}>
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-semibold text-text-primary group-hover:text-[#a3e635] transition-colors leading-tight">{userName}</span>
              <span className="text-[10px] text-text-tertiary flex items-center gap-1 font-medium mt-0.5">
                <Flame className="w-3 h-3 text-[#ff5e00]" /> {streakDays} ngày liên tiếp
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#a3e635] flex items-center justify-center text-black font-bold text-sm shadow-lg shadow-[#a3e635]/20 group-hover:scale-105 transition-transform">
              {userInitial}
            </div>
          </div>
        ) : (
          <button
            onClick={() => openAuthModal()}
            className="bg-[#a3e635] text-black px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-[#bef264] transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {"Đăng nhập"}
          </button>
        )}
      </div>
    </header>
  );
}
